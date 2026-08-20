/**
 * Cyber Strike: Neon Vanguard - Enemies & Bosses
 * Features smart steering AI, varied archetypes, bullet hell patterns, and multi-phase Boss fights.
 */

import { Projectile, LaserBeam } from './weapons.js';
import { soundEngine } from './audio.js';

export class BaseEnemy {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = options.radius || 16;
    this.maxHealth = options.health || 50;
    this.health = this.maxHealth;
    this.speed = options.speed || 2.2;
    this.color = options.color || '#ff0055';
    this.scoreValue = options.score || 100;
    this.isAlive = true;
    this.hitFlash = 0;
    this.angle = 0;
    this.shootTimer = Math.random() * 1.5;
    this.isBoss = false;
    this.name = options.name || 'Drone';
  }

  takeDamage(amount, isCrit = false) {
    this.health -= amount;
    this.hitFlash = 0.12;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
    }
  }

  update(dt, player, bounds, bullets, particles) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  draw(ctx) {
    // Base render fallback
  }
}

// 1. Drone Swarmer
export class DroneEnemy extends BaseEnemy {
  constructor(x, y) {
    super(x, y, {
      radius: 14,
      health: 35,
      speed: 3.4,
      color: '#ff3366',
      score: 120,
      name: 'Task Drone'
    });
    this.wobble = Math.random() * Math.PI * 2;
  }

  update(dt, player, bounds, bullets, particles) {
    super.update(dt, player, bounds, bullets, particles);
    this.wobble += dt * 5;

    // Steer towards player with a slight sinusoidal wobble
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    this.angle = Math.atan2(dy, dx);

    const wobbleOffset = Math.sin(this.wobble) * 0.8;
    const moveAngle = this.angle + wobbleOffset;

    this.vx = Math.cos(moveAngle) * this.speed;
    this.vy = Math.sin(moveAngle) * this.speed;
    this.x += this.vx;
    this.y += this.vy;

    // Occasional close shot
    this.shootTimer += dt;
    if (this.shootTimer > 2.2) {
      this.shootTimer = 0;
      const dist = Math.hypot(dx, dy);
      if (dist < 400) {
        bullets.push(
          new Projectile({
            x: this.x,
            y: this.y,
            vx: Math.cos(this.angle) * 6,
            vy: Math.sin(this.angle) * 6,
            damage: 12,
            radius: 4,
            color: '#ff3366',
            isPlayer: false
          })
        );
        soundEngine.playBlaster(false);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.moveTo(this.radius, 0);
    ctx.lineTo(-this.radius * 0.8, -this.radius * 0.7);
    ctx.lineTo(-this.radius * 0.4, 0);
    ctx.lineTo(-this.radius * 0.8, this.radius * 0.7);
    ctx.closePath();

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}

// 2. Plasma Striker (Ranged Gunship)
export class StrikerEnemy extends BaseEnemy {
  constructor(x, y) {
    super(x, y, {
      radius: 18,
      health: 65,
      speed: 2.2,
      color: '#ff9900',
      score: 250,
      name: 'Task Striker'
    });
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = 0;
  }

  update(dt, player, bounds, bullets, particles) {
    super.update(dt, player, bounds, bullets, particles);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);

    // Maintain optimal distance (~280px) and strafe
    this.strafeTimer += dt;
    if (this.strafeTimer > 3) {
      this.strafeTimer = 0;
      this.strafeDir *= -1;
    }

    let targetDistSpeed = 0;
    if (dist > 320) targetDistSpeed = this.speed;
    else if (dist < 220) targetDistSpeed = -this.speed;

    const strafeAngle = this.angle + (Math.PI / 2) * this.strafeDir;
    this.vx = Math.cos(this.angle) * targetDistSpeed + Math.cos(strafeAngle) * (this.speed * 0.9);
    this.vy = Math.sin(this.angle) * targetDistSpeed + Math.sin(strafeAngle) * (this.speed * 0.9);

    this.x += this.vx;
    this.y += this.vy;

    // Keep inside arena bounds
    this.x = Math.max(30, Math.min(bounds.width - 30, this.x));
    this.y = Math.max(30, Math.min(bounds.height - 30, this.y));

    // Tri-Burst Shooting
    this.shootTimer += dt;
    if (this.shootTimer > 2.0) {
      this.shootTimer = 0;
      for (let i = -1; i <= 1; i++) {
        const spreadAngle = this.angle + i * 0.18;
        bullets.push(
          new Projectile({
            x: this.x,
            y: this.y,
            vx: Math.cos(spreadAngle) * 6.5,
            vy: Math.sin(spreadAngle) * 6.5,
            damage: 14,
            radius: 4.5,
            color: '#ff9900',
            isPlayer: false
          })
        );
      }
      soundEngine.playBlaster(false);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Diamond shaped fighter
    ctx.beginPath();
    ctx.moveTo(this.radius * 1.2, 0);
    ctx.lineTo(0, -this.radius * 0.9);
    ctx.lineTo(-this.radius * 0.8, -this.radius * 0.4);
    ctx.lineTo(-this.radius * 0.5, 0);
    ctx.lineTo(-this.radius * 0.8, this.radius * 0.4);
    ctx.lineTo(0, this.radius * 0.9);
    ctx.closePath();

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

// 3. Heavy Dreadnought (Bullet Hell Tank)
export class DreadnoughtEnemy extends BaseEnemy {
  constructor(x, y) {
    super(x, y, {
      radius: 28,
      health: 220,
      speed: 1.2,
      color: '#a855f7',
      score: 600,
      name: 'Task Dreadnought'
    });
    this.spiralAngle = 0;
  }

  update(dt, player, bounds, bullets, particles) {
    super.update(dt, player, bounds, bullets, particles);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    this.angle = Math.atan2(dy, dx);

    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.x += this.vx;
    this.y += this.vy;

    // Bullet Hell Spiral Attack
    this.spiralAngle += dt * 3.5;
    this.shootTimer += dt;
    if (this.shootTimer > 0.4) {
      this.shootTimer = 0;
      for (let i = 0; i < 4; i++) {
        const fireAngle = this.spiralAngle + (i * Math.PI) / 2;
        bullets.push(
          new Projectile({
            x: this.x,
            y: this.y,
            vx: Math.cos(fireAngle) * 4.5,
            vy: Math.sin(fireAngle) * 4.5,
            damage: 15,
            radius: 5,
            color: '#c084fc',
            isPlayer: false
          })
        );
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Heavy Octagon hull
    ctx.beginPath();
    const sides = 8;
    for (let i = 0; i < sides; i++) {
      const a = (i * Math.PI * 2) / sides;
      const px = Math.cos(a) * this.radius;
      const py = Math.sin(a) * this.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Rotating Energy Core
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff00ff';
    ctx.fill();

    ctx.restore();
  }
}

// 4. Warp Phantom (Sniper)
export class SniperEnemy extends BaseEnemy {
  constructor(x, y) {
    super(x, y, {
      radius: 16,
      health: 80,
      speed: 1.0,
      color: '#00ffff',
      score: 450,
      name: 'Task Sniper'
    });
    this.chargeTimer = 0;
    this.isAiming = false;
    this.aimLaser = null;
    this.teleportTimer = 0;
  }

  update(dt, player, bounds, bullets, particles) {
    super.update(dt, player, bounds, bullets, particles);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    this.angle = Math.atan2(dy, dx);

    this.teleportTimer += dt;
    if (this.teleportTimer > 6.0) {
      this.teleportTimer = 0;
      // Teleport to random boundary location
      particles.createExplosion(this.x, this.y, '#00ffff', 15, 3, 2);
      this.x = 80 + Math.random() * (bounds.width - 160);
      this.y = 80 + Math.random() * (bounds.height - 160);
      particles.createExplosion(this.x, this.y, '#00ffff', 15, 3, 2);
    }

    this.chargeTimer += dt;
    if (this.chargeTimer > 2.5) {
      // Fire hyper-velocity sniper round
      bullets.push(
        new Projectile({
          x: this.x,
          y: this.y,
          vx: Math.cos(this.angle) * 16,
          vy: Math.sin(this.angle) * 16,
          damage: 32,
          radius: 5,
          color: '#00ffff',
          isPlayer: false
        })
      );
      soundEngine.playRailgun();
      this.chargeTimer = 0;
    }
  }

  draw(ctx) {
    ctx.save();

    // Render sniper laser sight while charging
    if (this.chargeTimer > 1.2) {
      const chargeRatio = (this.chargeTimer - 1.2) / 1.3;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(this.angle) * 800, this.y + Math.sin(this.angle) * 800);
      ctx.strokeStyle = `rgba(0, 255, 255, ${chargeRatio * 0.8})`;
      ctx.lineWidth = 1 + chargeRatio * 2;
      ctx.setLineDash([8, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Sniper Triangular Chassis
    ctx.beginPath();
    ctx.moveTo(this.radius * 1.4, 0);
    ctx.lineTo(-this.radius, -this.radius * 0.8);
    ctx.lineTo(-this.radius * 0.3, 0);
    ctx.lineTo(-this.radius, this.radius * 0.8);
    ctx.closePath();

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

// 5. EPIC MULTI-PHASE BOSS: TASK TITAN
export class BossEnemy extends BaseEnemy {
  constructor(x, y, level = 1) {
    super(x, y, {
      radius: 55,
      health: 1200 * (1 + (level - 1) * 0.5),
      speed: 1.5,
      color: '#ff0055',
      score: 5000 * level,
      name: level === 1 ? 'TASK TITAN - MASTER OVERLORD' : 'TASK LEVIATHAN - ULTIMATE BOSS'
    });
    this.isBoss = true;
    this.level = level;
    this.phase = 1;
    this.attackTimer = 0;
    this.attackPattern = 0;
    this.bulletHellAngle = 0;
    this.shieldAngle = 0;
    this.spawnTimer = 0;
  }

  takeDamage(amount, isCrit = false) {
    super.takeDamage(amount, isCrit);

    // Phase Transitions
    const hpRatio = this.health / this.maxHealth;
    if (hpRatio < 0.35 && this.phase < 3) {
      this.phase = 3;
      this.speed = 2.4;
      this.color = '#ff0033';
      soundEngine.playBossAlarm();
    } else if (hpRatio < 0.7 && this.phase < 2) {
      this.phase = 2;
      this.speed = 1.9;
      this.color = '#ff5500';
    }
  }

  update(dt, player, bounds, bullets, particles, enemies) {
    super.update(dt, player, bounds, bullets, particles);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    this.angle = Math.atan2(dy, dx);
    this.shieldAngle += dt * 2.5;

    // Movement: Gentle hovering towards center/player
    const targetX = bounds.width * 0.5 + Math.cos(this.shieldAngle * 0.4) * (bounds.width * 0.25);
    const targetY = bounds.height * 0.3 + Math.sin(this.shieldAngle * 0.4) * (bounds.height * 0.15);
    
    this.vx += (targetX - this.x) * 0.02;
    this.vy += (targetY - this.y) * 0.02;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.x += this.vx;
    this.y += this.vy;

    this.attackTimer += dt;
    this.bulletHellAngle += dt * (this.phase === 3 ? 5.5 : 3.5);

    // Attack System by Phase
    if (this.phase === 1) {
      // Phase 1: Dual Gatling bursts + Radial Rings
      if (this.attackTimer > 0.18) {
        this.attackTimer = 0;
        this.attackPattern++;
        if (this.attackPattern % 4 === 0) {
          // Radial 8-way burst
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI * 2) / 8 + this.bulletHellAngle * 0.3;
            bullets.push(
              new Projectile({
                x: this.x,
                y: this.y,
                vx: Math.cos(a) * 5,
                vy: Math.sin(a) * 5,
                damage: 18,
                radius: 5,
                color: '#ff0055',
                isPlayer: false
              })
            );
          }
        } else {
          // Aimed double shots
          const offset = 25;
          const leftX = this.x + Math.cos(this.angle + Math.PI / 2) * offset;
          const leftY = this.y + Math.sin(this.angle + Math.PI / 2) * offset;
          const rightX = this.x - Math.cos(this.angle + Math.PI / 2) * offset;
          const rightY = this.y - Math.sin(this.angle + Math.PI / 2) * offset;

          bullets.push(
            new Projectile({
              x: leftX,
              y: leftY,
              vx: Math.cos(this.angle) * 7.5,
              vy: Math.sin(this.angle) * 7.5,
              damage: 14,
              radius: 4,
              color: '#ff5500',
              isPlayer: false
            }),
            new Projectile({
              x: rightX,
              y: rightY,
              vx: Math.cos(this.angle) * 7.5,
              vy: Math.sin(this.angle) * 7.5,
              damage: 14,
              radius: 4,
              color: '#ff5500',
              isPlayer: false
            })
          );
        }
      }
    } else if (this.phase === 2) {
      // Phase 2: Bullet hell spiral flowers + minion drones
      if (this.attackTimer > 0.12) {
        this.attackTimer = 0;
        for (let i = 0; i < 3; i++) {
          const a = this.bulletHellAngle + (i * Math.PI * 2) / 3;
          bullets.push(
            new Projectile({
              x: this.x,
              y: this.y,
              vx: Math.cos(a) * 5.8,
              vy: Math.sin(a) * 5.8,
              damage: 16,
              radius: 4.5,
              color: '#ff00ff',
              isPlayer: false
            })
          );
        }
      }

      this.spawnTimer += dt;
      if (this.spawnTimer > 7 && enemies) {
        this.spawnTimer = 0;
        enemies.push(new DroneEnemy(this.x - 60, this.y));
        enemies.push(new DroneEnemy(this.x + 60, this.y));
      }
    } else if (this.phase === 3) {
      // Phase 3 (Enrage): 8-arm spiral storms + rapid aimed barrages
      if (this.attackTimer > 0.09) {
        this.attackTimer = 0;
        for (let i = 0; i < 6; i++) {
          const a = this.bulletHellAngle + (i * Math.PI * 2) / 6;
          bullets.push(
            new Projectile({
              x: this.x,
              y: this.y,
              vx: Math.cos(a) * 6.5,
              vy: Math.sin(a) * 6.5,
              damage: 20,
              radius: 5,
              color: '#ff0033',
              isPlayer: false
            })
          );
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Rotating Energy Shield Orbits
    const shieldCount = this.phase === 3 ? 4 : 3;
    for (let i = 0; i < shieldCount; i++) {
      const a = this.shieldAngle + (i * Math.PI * 2) / shieldCount;
      const ox = Math.cos(a) * (this.radius + 20);
      const oy = Math.sin(a) * (this.radius + 20);
      ctx.beginPath();
      ctx.arc(ox, oy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 12;
      ctx.fill();
    }

    ctx.rotate(this.angle);

    // Massive Fortress Hull
    ctx.beginPath();
    ctx.moveTo(this.radius * 1.3, 0);
    ctx.lineTo(this.radius * 0.4, -this.radius * 0.9);
    ctx.lineTo(-this.radius * 0.8, -this.radius * 1.1);
    ctx.lineTo(-this.radius * 0.6, 0);
    ctx.lineTo(-this.radius * 0.8, this.radius * 1.1);
    ctx.lineTo(this.radius * 0.4, this.radius * 0.9);
    ctx.closePath();

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 25;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Central Pulsing Core
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = this.phase === 3 ? '#ffff00' : '#ff00ff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fill();

    ctx.restore();
  }
}
