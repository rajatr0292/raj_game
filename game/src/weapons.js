/**
 * Cyber Strike: Neon Vanguard - Weapons & Projectile Manager
 * Manages player weapons, projectiles, homing missiles, beams, and bullet physics.
 */

import { soundEngine } from './audio.js';

export class Projectile {
  constructor({
    x,
    y,
    vx,
    vy,
    damage = 20,
    radius = 4,
    color = '#00f0ff',
    isPlayer = true,
    pierce = 1,
    ricochet = 0,
    homing = false,
    range = 1200,
    isCrit = false,
    explosiveRadius = 0
  }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.radius = radius;
    this.color = color;
    this.isPlayer = isPlayer;
    this.pierce = pierce;
    this.ricochet = ricochet;
    this.homing = homing;
    this.range = range;
    this.distanceTraveled = 0;
    this.isCrit = isCrit;
    this.explosiveRadius = explosiveRadius;
    this.toRemove = false;
    this.trail = [];
  }

  update(bounds, enemies = []) {
    // Record trail
    this.trail.push({ x: this.x, y: this.y, alpha: 0.8 });
    if (this.trail.length > 5) {
      this.trail.shift();
    }
    for (const t of this.trail) {
      t.alpha -= 0.15;
    }

    // Homing Steering Logic
    if (this.homing && this.isPlayer && enemies.length > 0) {
      let nearest = null;
      let minDist = 450;
      for (const enemy of enemies) {
        if (!enemy.isAlive) continue;
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = enemy;
        }
      }

      if (nearest) {
        const targetAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
        const currentAngle = Math.atan2(this.vy, this.vx);
        let diff = targetAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const turnSpeed = 0.12;
        const newAngle = currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed);
        const speed = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    this.distanceTraveled += Math.hypot(this.vx, this.vy);

    // Screen Bounds & Ricochet
    if (this.ricochet > 0) {
      let bounced = false;
      if (this.x < 0 || this.x > bounds.width) {
        this.vx = -this.vx;
        this.x = Math.max(0, Math.min(bounds.width, this.x));
        bounced = true;
      }
      if (this.y < 0 || this.y > bounds.height) {
        this.vy = -this.vy;
        this.y = Math.max(0, Math.min(bounds.height, this.y));
        bounced = true;
      }
      if (bounced) {
        this.ricochet--;
      }
    } else {
      if (
        this.x < -50 ||
        this.x > bounds.width + 50 ||
        this.y < -50 ||
        this.y > bounds.height + 50 ||
        this.distanceTraveled >= this.range
      ) {
        this.toRemove = true;
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // Draw Trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      if (t.alpha <= 0) continue;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * (0.3 + (i / this.trail.length) * 0.7), 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = Math.max(0, t.alpha * 0.5);
      ctx.fill();
    }

    // Draw Core Bullet
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}

// Laser Beam Effect (for Railgun or Boss Laser)
export class LaserBeam {
  constructor({ startX, startY, endX, endY, color = '#00f0ff', width = 6, duration = 0.25 }) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.color = color;
    this.width = width;
    this.duration = duration;
    this.life = duration;
  }

  update(dt) {
    this.life -= dt;
  }

  get toRemove() {
    return this.life <= 0;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const progress = this.life / this.duration;

    ctx.save();
    ctx.globalAlpha = Math.max(0, progress);

    // Glowing outer beam
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.lineTo(this.endX, this.endY);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width * (0.6 + progress * 0.6);
    ctx.lineCap = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    ctx.stroke();

    // White hot core beam
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.lineTo(this.endX, this.endY);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = this.width * 0.35;
    ctx.stroke();

    ctx.restore();
  }
}

// Weapon Definitions
export const WEAPON_TYPES = {
  PULSE: {
    id: 'PULSE',
    name: 'Pulse Blaster',
    icon: '⚡',
    description: 'Rapid dual plasma bolts with high precision.',
    fireRate: 0.13, // seconds between shots
    speed: 16,
    damage: 22,
    color: '#00f0ff',
    pellets: 2,
    spread: 0.08,
    unlocked: true
  },
  SHOTGUN: {
    id: 'SHOTGUN',
    name: 'Scatter Shotgun',
    icon: '💥',
    description: 'Devastating wide-angle energy blast for close encounters.',
    fireRate: 0.55,
    speed: 13,
    damage: 18,
    color: '#ff007f',
    pellets: 7,
    spread: 0.55,
    unlocked: true
  },
  RAILGUN: {
    id: 'RAILGUN',
    name: 'Photon Railgun',
    icon: '🔮',
    description: 'High-power piercing beam that vaporizes entire enemy lines.',
    fireRate: 0.75,
    speed: 28,
    damage: 95,
    color: '#a855f7',
    pellets: 1,
    spread: 0,
    pierce: 99,
    unlocked: true
  },
  MISSILES: {
    id: 'MISSILES',
    name: 'Swarm Missiles',
    icon: '🚀',
    description: 'Smart self-guided micro-missiles with explosive radius.',
    fireRate: 0.42,
    speed: 9,
    damage: 38,
    color: '#ffe600',
    pellets: 3,
    spread: 0.35,
    homing: true,
    explosiveRadius: 45,
    unlocked: true
  }
};
