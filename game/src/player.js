/**
 * Cyber Strike: Neon Vanguard - Player Ship & Control System
 */

import { WEAPON_TYPES, Projectile, LaserBeam } from './weapons.js';
import { soundEngine } from './audio.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 18;
    this.angle = 0;
    this.speed = 5.5;
    this.friction = 0.88;

    // Health & Shields
    this.maxHealth = 100;
    this.health = 100;
    this.maxShield = 100;
    this.shield = 100;
    this.shieldRegenRate = 12; // HP per sec
    this.shieldRegenDelay = 3.0; // Seconds after hit before regen starts
    this.shieldDelayTimer = 0;

    // Overdrive (Ultimate Nova)
    this.maxOverdrive = 100;
    this.overdrive = 0;
    this.overdriveGainMultiplier = 1.0;

    // Dash / Afterburner
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDuration = 0.2;
    this.dashCooldown = 0;
    this.dashCooldownMax = 2.0;
    this.isInvulnerable = false;
    this.dashSpeed = 16;
    this.dashDirX = 0;
    this.dashDirY = 0;

    // Weapons & Combat
    this.weapons = [
      { ...WEAPON_TYPES.PULSE },
      { ...WEAPON_TYPES.SHOTGUN },
      { ...WEAPON_TYPES.RAILGUN },
      { ...WEAPON_TYPES.MISSILES }
    ];
    this.currentWeaponIndex = 0;
    this.fireTimer = 0;
    this.isFiring = false;

    // Stat Multipliers & Roguelite Perks
    this.damageMultiplier = 1.0;
    this.fireRateMultiplier = 1.0;
    this.bulletSpeedMultiplier = 1.0;
    this.critChance = 0.1;
    this.ricochetBonus = 0;
    this.chainLightning = false;
    this.magnetRadius = 120;
    this.coreScoreMultiplier = 1.0;

    // Companion Drones
    this.drones = [];
    this.droneOrbitAngle = 0;

    // Visuals
    this.hitFlash = 0;
    this.thrusterGlow = 0;
  }

  get currentWeapon() {
    return this.weapons[this.currentWeaponIndex];
  }

  selectWeapon(index) {
    if (index >= 0 && index < this.weapons.length) {
      this.currentWeaponIndex = index;
    }
  }

  addDrone() {
    this.drones.push({
      orbitRadius: 45 + this.drones.length * 15,
      fireTimer: Math.random() * 0.5,
      fireRate: 0.6
    });
  }

  dash() {
    if (this.dashCooldown > 0) return;
    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.dashCooldown = this.dashCooldownMax;
    this.isInvulnerable = true;

    // Dash in movement direction or facing direction
    if (Math.hypot(this.vx, this.vy) > 0.5) {
      const len = Math.hypot(this.vx, this.vy);
      this.dashDirX = this.vx / len;
      this.dashDirY = this.vy / len;
    } else {
      this.dashDirX = Math.cos(this.angle);
      this.dashDirY = Math.sin(this.angle);
    }

    soundEngine.playDash();
  }

  takeDamage(amount) {
    if (this.isInvulnerable || this.health <= 0) return 0;

    this.shieldDelayTimer = this.shieldRegenDelay;
    this.hitFlash = 0.15;

    let damageToApply = amount;
    if (this.shield > 0) {
      soundEngine.playShieldHit();
      if (this.shield >= damageToApply) {
        this.shield -= damageToApply;
        damageToApply = 0;
      } else {
        damageToApply -= this.shield;
        this.shield = 0;
        soundEngine.playPlayerHit();
      }
    } else {
      soundEngine.playPlayerHit();
    }

    if (damageToApply > 0) {
      this.health = Math.max(0, this.health - damageToApply);
    }

    return amount;
  }

  heal(healthAmt, shieldAmt) {
    if (healthAmt) this.health = Math.min(this.maxHealth, this.health + healthAmt);
    if (shieldAmt) this.shield = Math.min(this.maxShield, this.shield + shieldAmt);
  }

  addOverdrive(amount) {
    this.overdrive = Math.min(this.maxOverdrive, this.overdrive + amount * this.overdriveGainMultiplier);
  }

  triggerOverdrive(bullets, enemies, particles) {
    if (this.overdrive < this.maxOverdrive) return false;

    this.overdrive = 0;
    soundEngine.playOverdriveNova();

    // Clear all enemy bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (!bullets[i].isPlayer) {
        particles.createExplosion(bullets[i].x, bullets[i].y, '#00ffff', 6, 2, 2);
        bullets.splice(i, 1);
      }
    }

    // Heavy Screen Shockwave
    particles.createShockwave(this.x, this.y, '#00ffff', 800, 0.06, 8);
    particles.createShockwave(this.x, this.y, '#ffe600', 600, 0.04, 5);

    // Damage all enemies
    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);
      const dmg = Math.max(150, 450 - dist * 0.4) * this.damageMultiplier;
      enemy.takeDamage(dmg, true);
      particles.createFloatingText(enemy.x, enemy.y - 10, `OVERDRIVE -${Math.round(dmg)}`, '#ffe600', 20, true);
      particles.createExplosion(enemy.x, enemy.y, '#ff00ff', 20, 5, 4);
    }

    return true;
  }

  update(dt, input, bounds, bullets, particles, enemies) {
    // Cooldown updates
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Dash Action State
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.vx = this.dashDirX * this.dashSpeed;
      this.vy = this.dashDirY * this.dashSpeed;
      particles.createDashGhost(this);
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.isInvulnerable = false;
      }
    } else {
      // Regular WASD / Joystick Movement
      let moveX = 0;
      let moveY = 0;

      if (input.keys['KeyW'] || input.keys['ArrowUp']) moveY -= 1;
      if (input.keys['KeyS'] || input.keys['ArrowDown']) moveY += 1;
      if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
      if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

      // Analog joystick input if present
      if (input.joystick && input.joystick.active) {
        moveX = input.joystick.x;
        moveY = input.joystick.y;
      }

      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY) || 1;
        const normX = moveX / len;
        const normY = moveY / len;
        this.vx += normX * this.speed * 0.28;
        this.vy += normY * this.speed * 0.28;

        // Emit thruster particles
        this.thrusterGlow = 1.0;
        if (Math.random() < 0.6) {
          particles.createThrusterParticle(this.x, this.y, this.angle, '#00f0ff', 3);
        }
      } else {
        this.thrusterGlow *= 0.85;
      }

      this.vx *= this.friction;
      this.vy *= this.friction;
    }

    // Apply Velocity
    this.x += this.vx;
    this.y += this.vy;

    // Arena Clamping
    this.x = Math.max(this.radius, Math.min(bounds.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(bounds.height - this.radius, this.y));

    // Aim Angle
    if (input.aim) {
      this.angle = Math.atan2(input.aim.y - this.y, input.aim.x - this.x);
    }

    // Shield Regeneration
    if (this.shieldDelayTimer > 0) {
      this.shieldDelayTimer -= dt;
    } else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenRate * dt);
    }

    // Primary Weapon Firing
    if ((input.mouseDown || input.keys['Space'] || input.autoFire) && this.fireTimer <= 0) {
      this.fireWeapon(bullets, particles);
    }

    // Companion Drones Update & Auto-Fire
    this.droneOrbitAngle += dt * 2.0;
    this.drones.forEach((drone, idx) => {
      const droneAngle = this.droneOrbitAngle + (idx * Math.PI * 2) / this.drones.length;
      drone.x = this.x + Math.cos(droneAngle) * drone.orbitRadius;
      drone.y = this.y + Math.sin(droneAngle) * drone.orbitRadius;

      drone.fireTimer += dt;
      if (drone.fireTimer >= drone.fireRate && enemies.length > 0) {
        drone.fireTimer = 0;
        // Target closest enemy
        let target = null;
        let minDist = 400;
        for (const e of enemies) {
          if (!e.isAlive) continue;
          const d = Math.hypot(e.x - drone.x, e.y - drone.y);
          if (d < minDist) {
            minDist = d;
            target = e;
          }
        }

        if (target) {
          const aim = Math.atan2(target.y - drone.y, target.x - drone.x);
          bullets.push(
            new Projectile({
              x: drone.x,
              y: drone.y,
              vx: Math.cos(aim) * 14,
              vy: Math.sin(aim) * 14,
              damage: 18 * this.damageMultiplier,
              radius: 3.5,
              color: '#00ff88',
              isPlayer: true
            })
          );
          soundEngine.playBlaster(true);
        }
      }
    });
  }

  fireWeapon(bullets, particles) {
    const w = this.currentWeapon;
    const interval = w.fireRate / this.fireRateMultiplier;
    this.fireTimer = interval;

    const baseDamage = w.damage * this.damageMultiplier;
    const isCrit = Math.random() < this.critChance;
    const finalDamage = isCrit ? baseDamage * 2.5 : baseDamage;
    const speed = w.speed * this.bulletSpeedMultiplier;

    switch (w.id) {
      case 'PULSE': {
        soundEngine.playBlaster(true);
        const offset = 10;
        const leftX = this.x + Math.cos(this.angle + Math.PI / 2) * offset;
        const leftY = this.y + Math.sin(this.angle + Math.PI / 2) * offset;
        const rightX = this.x - Math.cos(this.angle + Math.PI / 2) * offset;
        const rightY = this.y - Math.sin(this.angle + Math.PI / 2) * offset;

        bullets.push(
          new Projectile({
            x: leftX,
            y: leftY,
            vx: Math.cos(this.angle) * speed,
            vy: Math.sin(this.angle) * speed,
            damage: finalDamage,
            radius: 4,
            color: w.color,
            isPlayer: true,
            isCrit,
            ricochet: this.ricochetBonus
          }),
          new Projectile({
            x: rightX,
            y: rightY,
            vx: Math.cos(this.angle) * speed,
            vy: Math.sin(this.angle) * speed,
            damage: finalDamage,
            radius: 4,
            color: w.color,
            isPlayer: true,
            isCrit,
            ricochet: this.ricochetBonus
          })
        );
        break;
      }
      case 'SHOTGUN': {
        soundEngine.playShotgun();
        const count = w.pellets;
        for (let i = 0; i < count; i++) {
          const spreadAngle = this.angle + (i / (count - 1) - 0.5) * w.spread + (Math.random() - 0.5) * 0.1;
          const pSpeed = speed * (0.85 + Math.random() * 0.3);
          bullets.push(
            new Projectile({
              x: this.x + Math.cos(this.angle) * 15,
              y: this.y + Math.sin(this.angle) * 15,
              vx: Math.cos(spreadAngle) * pSpeed,
              vy: Math.sin(spreadAngle) * pSpeed,
              damage: finalDamage,
              radius: 4.5,
              color: w.color,
              isPlayer: true,
              isCrit,
              ricochet: this.ricochetBonus
            })
          );
        }
        // Small recoil kick
        this.vx -= Math.cos(this.angle) * 3;
        this.vy -= Math.sin(this.angle) * 3;
        break;
      }
      case 'RAILGUN': {
        soundEngine.playRailgun();
        bullets.push(
          new Projectile({
            x: this.x + Math.cos(this.angle) * 20,
            y: this.y + Math.sin(this.angle) * 20,
            vx: Math.cos(this.angle) * speed,
            vy: Math.sin(this.angle) * speed,
            damage: finalDamage,
            radius: 6,
            color: w.color,
            isPlayer: true,
            pierce: 99,
            isCrit,
            ricochet: this.ricochetBonus
          })
        );
        particles.createShockwave(this.x, this.y, w.color, 40, 0.08, 3);
        this.vx -= Math.cos(this.angle) * 4;
        this.vy -= Math.sin(this.angle) * 4;
        break;
      }
      case 'MISSILES': {
        soundEngine.playMissileLaunch();
        for (let i = -1; i <= 1; i++) {
          const launchAngle = this.angle + i * 0.3;
          bullets.push(
            new Projectile({
              x: this.x + Math.cos(this.angle + (i * Math.PI) / 2) * 14,
              y: this.y + Math.sin(this.angle + (i * Math.PI) / 2) * 14,
              vx: Math.cos(launchAngle) * speed,
              vy: Math.sin(launchAngle) * speed,
              damage: finalDamage,
              radius: 5,
              color: w.color,
              isPlayer: true,
              homing: true,
              explosiveRadius: 50,
              isCrit
            })
          );
        }
        break;
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // Draw Drones
    this.drones.forEach((drone) => {
      ctx.save();
      ctx.translate(drone.x, drone.y);
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });

    ctx.translate(this.x, this.y);

    // Draw Energy Shield Bubble
    if (this.shield > 0) {
      const shieldRatio = this.shield / this.maxShield;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 + shieldRatio * 0.4})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.stroke();
    }

    ctx.rotate(this.angle);

    // Thruster Flare
    if (this.thrusterGlow > 0.05) {
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.8, -this.radius * 0.4);
      ctx.lineTo(-this.radius * (1.2 + this.thrusterGlow * 0.6), 0);
      ctx.lineTo(-this.radius * 0.8, this.radius * 0.4);
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 15;
      ctx.fill();
    }

    // Ship Hull (Sleek Futuristic Neon Starfighter)
    ctx.beginPath();
    ctx.moveTo(this.radius * 1.3, 0); // Nose tip
    ctx.lineTo(-this.radius * 0.7, -this.radius * 0.85); // Left wingtip
    ctx.lineTo(-this.radius * 0.35, -this.radius * 0.3); // Inner wing joint
    ctx.lineTo(-this.radius * 0.8, 0); // Engine center
    ctx.lineTo(-this.radius * 0.35, this.radius * 0.3); // Inner wing joint
    ctx.lineTo(-this.radius * 0.7, this.radius * 0.85); // Right wingtip
    ctx.closePath();

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#080e1a';
    ctx.fill();

    ctx.strokeStyle = this.isInvulnerable ? '#ffe600' : '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 15;
    ctx.stroke();

    // Cockpit Canopy
    ctx.beginPath();
    ctx.moveTo(this.radius * 0.6, 0);
    ctx.lineTo(-this.radius * 0.1, -this.radius * 0.25);
    ctx.lineTo(-this.radius * 0.3, 0);
    ctx.lineTo(-this.radius * 0.1, this.radius * 0.25);
    ctx.closePath();
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.restore();
  }
}
