/**
 * Cyber Strike: Neon Vanguard - Roguelite Perks & Drop System
 */

export const PERK_POOL = [
  {
    id: 'plasma_booster',
    title: 'Plasma Accelerant',
    desc: '+25% Projectile Damage & +15% Bullet Velocity',
    icon: '⚡',
    rarity: 'common',
    apply: (player) => {
      player.damageMultiplier *= 1.25;
      player.bulletSpeedMultiplier *= 1.15;
    }
  },
  {
    id: 'rapid_cycler',
    title: 'Hyper-Trigger Mod',
    desc: '+25% Weapon Fire Rate across all weapons',
    icon: '🔥',
    rarity: 'common',
    apply: (player) => {
      player.fireRateMultiplier *= 1.25;
    }
  },
  {
    id: 'nano_shields',
    title: 'Nano-Regen Matrix',
    desc: '+30 Max Shield & Shield Recharges 50% Faster',
    icon: '🛡️',
    rarity: 'uncommon',
    apply: (player) => {
      player.maxShield += 30;
      player.shield = player.maxShield;
      player.shieldRegenRate *= 1.5;
    }
  },
  {
    id: 'kinetic_thruster',
    title: 'Afterburner Injector',
    desc: '+20% Move Speed & Dash Cooldown reduced by 30%',
    icon: '💨',
    rarity: 'common',
    apply: (player) => {
      player.speed *= 1.2;
      player.dashCooldownMax *= 0.7;
    }
  },
  {
    id: 'companion_drone',
    title: 'Orbital Strike Drone',
    desc: 'Deploys an autonomous companion drone firing at nearby threats',
    icon: '🤖',
    rarity: 'rare',
    apply: (player) => {
      player.addDrone();
    }
  },
  {
    id: 'ricochet_coils',
    title: 'Refractive Lens',
    desc: 'All projectiles bounce off arena boundaries 1 additional time',
    icon: '🪞',
    rarity: 'uncommon',
    apply: (player) => {
      player.ricochetBonus += 1;
    }
  },
  {
    id: 'critical_matrix',
    title: 'Quantum Crit Core',
    desc: '+20% Critical Hit Chance (Crits deal 2.5x Damage)',
    icon: '🎯',
    rarity: 'rare',
    apply: (player) => {
      player.critChance += 0.2;
    }
  },
  {
    id: 'chain_lightning',
    title: 'Tesla Arc Node',
    desc: 'Critical hits discharge chain lightning to 2 additional foes',
    icon: '🌩️',
    rarity: 'rare',
    apply: (player) => {
      player.chainLightning = true;
    }
  },
  {
    id: 'magnetic_field',
    title: 'Tractor Beam Surge',
    desc: '+150% Cyber Core Collection Radius and +25% Core Value',
    icon: '🧲',
    rarity: 'common',
    apply: (player) => {
      player.magnetRadius *= 2.5;
      player.coreScoreMultiplier *= 1.25;
    }
  },
  {
    id: 'overdrive_catalyst',
    title: 'Nova Siphon',
    desc: 'Nova Overdrive charges 40% faster from kills',
    icon: '🌟',
    rarity: 'uncommon',
    apply: (player) => {
      player.overdriveGainMultiplier *= 1.4;
    }
  }
];

export class DropItem {
  constructor({ x, y, type = 'CORE', value = 10 }) {
    this.x = x;
    this.y = y;
    this.type = type; // 'CORE', 'SHIELD', 'NUKE', 'OVERDRIVE', 'MULTIPLIER'
    this.value = value;
    this.radius = 8;
    this.pulse = Math.random() * Math.PI * 2;
    this.toRemove = false;
    this.vx = (Math.random() - 0.5) * 3;
    this.vy = (Math.random() - 0.5) * 3;

    // Type settings
    switch (type) {
      case 'CORE':
        this.color = '#00f0ff';
        this.icon = '💎';
        this.radius = 6;
        break;
      case 'SHIELD':
        this.color = '#00ff88';
        this.icon = '🛡️';
        this.radius = 9;
        break;
      case 'NUKE':
        this.color = '#ff0055';
        this.icon = '💣';
        this.radius = 10;
        break;
      case 'OVERDRIVE':
        this.color = '#ffe600';
        this.icon = '⚡';
        this.radius = 9;
        break;
      case 'MULTIPLIER':
        this.color = '#ff00ff';
        this.icon = '⭐';
        this.radius = 9;
        break;
    }
  }

  update(player) {
    this.pulse += 0.08;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.94;
    this.vy *= 0.94;

    // Magnetic Attraction to Player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < player.magnetRadius) {
      const pull = Math.min(12, (1 - dist / player.magnetRadius) * 14 + 3);
      this.vx += (dx / dist) * pull * 0.4;
      this.vy += (dy / dist) * pull * 0.4;
    }
  }

  draw(ctx) {
    ctx.save();
    const scale = 1 + Math.sin(this.pulse) * 0.15;
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);

    // Glow
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fill();

    // Center core
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }
}
