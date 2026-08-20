/**
 * Cyber Strike: Neon Vanguard - Particle & FX System
 * High-performance canvas particle manager for sci-fi neon combat
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.laserTrails = [];
  }

  reset() {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.laserTrails = [];
  }

  // Neon Spark / Debris Particle
  createExplosion(x, y, color = '#00f0ff', count = 20, speed = 4, size = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = (Math.random() * 0.8 + 0.2) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        color,
        size: (Math.random() * 0.8 + 0.4) * size,
        alpha: 1.0,
        decay: Math.random() * 0.025 + 0.02,
        friction: 0.96,
        glow: true
      });
    }

    // Add a shockwave ring
    this.createShockwave(x, y, color, size * 12, 0.04);
  }

  createSpark(x, y, dirAngle, color = '#ffe600', count = 5) {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.2;
      const angle = dirAngle + spread;
      const vel = Math.random() * 3 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        color,
        size: Math.random() * 2 + 1.5,
        alpha: 1.0,
        decay: Math.random() * 0.05 + 0.03,
        friction: 0.92,
        glow: true
      });
    }
  }

  createThrusterParticle(x, y, angle, color = '#00f0ff', speed = 2) {
    const spread = (Math.random() - 0.5) * 0.4;
    const launchAngle = angle + Math.PI + spread;
    const vel = (Math.random() * 0.5 + 0.8) * speed;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: Math.cos(launchAngle) * vel,
      vy: Math.sin(launchAngle) * vel,
      color,
      size: Math.random() * 2.5 + 1.5,
      alpha: 0.8,
      decay: 0.08,
      friction: 0.95,
      glow: true
    });
  }

  createShockwave(x, y, color = '#00f0ff', maxRadius = 50, speed = 0.05, lineWidth = 3) {
    this.shockwaves.push({
      x,
      y,
      radius: 2,
      maxRadius,
      color,
      alpha: 1.0,
      speed,
      lineWidth
    });
  }

  createFloatingText(x, y, text, color = '#ffffff', size = 16, isCrit = false) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      size: isCrit ? size * 1.4 : size,
      alpha: 1.0,
      vy: -1.5,
      decay: 0.025,
      isCrit
    });
  }

  createDashGhost(player) {
    this.particles.push({
      x: player.x,
      y: player.y,
      angle: player.angle,
      size: player.radius,
      color: '#00f0ff',
      alpha: 0.6,
      decay: 0.08,
      isGhost: true
    });
  }

  update() {
    // Update regular particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.isGhost) {
        p.alpha -= p.decay;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.alpha -= p.decay;
      }
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * sw.speed + 1.5;
      sw.alpha -= sw.speed * 0.7;
      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= ft.decay;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // Render Shockwaves
    for (const sw of this.shockwaves) {
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth;
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.shadowBlur = 12;
      ctx.shadowColor = sw.color;
      ctx.stroke();
    }

    // Render Ghost / Dash Echoes & Particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.isGhost) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        
        // Ship outline
        ctx.beginPath();
        ctx.moveTo(p.size, 0);
        ctx.lineTo(-p.size * 0.8, -p.size * 0.6);
        ctx.lineTo(-p.size * 0.4, 0);
        ctx.lineTo(-p.size * 0.8, p.size * 0.6);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        if (p.glow) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }
    }

    // Render Floating Damage / Combo Text
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `${ft.isCrit ? '900' : 'bold'} ${ft.size}px 'Orbitron', monospace`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = ft.isCrit ? 15 : 8;
      ctx.shadowColor = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }

    ctx.restore();
  }
}
