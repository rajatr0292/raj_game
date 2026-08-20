/**
 * Cyber Strike: Neon Vanguard - Main Game Engine
 */

import { Player } from './player.js';
import { DroneEnemy, StrikerEnemy, DreadnoughtEnemy, SniperEnemy, BossEnemy } from './enemies.js';
import { ParticleSystem } from './particles.js';
import { DropItem, PERK_POOL } from './upgrades.js';
import { soundEngine } from './audio.js';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = new ParticleSystem();

    // Game States: 'MENU', 'PLAYING', 'PAUSED', 'LEVEL_UP', 'GAME_OVER', 'VICTORY'
    this.state = 'MENU';
    this.gameMode = 'CAMPAIGN'; // 'CAMPAIGN', 'ENDLESS', 'BOSSRUSH'

    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.drops = [];

    // Wave & Progression
    this.currentWave = 1;
    this.maxWaves = 10;
    this.waveState = 'READY'; // 'READY', 'IN_PROGRESS', 'COMPLETED'
    this.waveSpawnQueue = [];
    this.waveSpawnTimer = 0;
    this.waveTransitionTimer = 0;
    this.activeBoss = null;

    // Score & Multiplier
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('rajat_game_highscore') || localStorage.getItem('neon_vanguard_highscore') || '0', 10);
    this.combo = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
    this.enemiesDefeated = 0;

    // Starfield & Background Grid
    this.stars = [];
    this.initStarfield();

    // Camera & Screen Shake
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Input Handling
    this.input = {
      keys: {},
      aim: { x: 0, y: 0 },
      mouseDown: false,
      autoFire: false,
      joystick: { active: false, x: 0, y: 0 }
    };

    this.lastTime = 0;
    this.setupEventListeners();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  initStarfield() {
    this.stars = [];
    for (let i = 0; i < 160; i++) {
      this.stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 0.8,
        speed: Math.random() * 0.8 + 0.2,
        color: ['#00f0ff', '#ff00ff', '#ffffff', '#7928ca'][Math.floor(Math.random() * 4)],
        alpha: Math.random() * 0.8 + 0.2
      });
    }
  }

  addScreenShake(intensity = 8) {
    this.shakeIntensity = Math.min(30, this.shakeIntensity + intensity);
  }

  startNewGame(mode = 'CAMPAIGN') {
    this.gameMode = mode;
    this.player = new Player(this.width / 2, this.height / 2);
    this.enemies = [];
    this.bullets = [];
    this.drops = [];
    this.particles.reset();

    this.score = 0;
    this.combo = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
    this.enemiesDefeated = 0;
    this.currentWave = mode === 'BOSSRUSH' ? 5 : 1;
    this.activeBoss = null;
    this.state = 'PLAYING';

    soundEngine.init();
    soundEngine.startMusic();
    soundEngine.setBossMode(false);

    this.startWave(this.currentWave);
    this.updateHUD();
    this.hideAllModals();
  }

  startWave(waveNum) {
    this.waveState = 'IN_PROGRESS';
    this.waveSpawnQueue = [];
    this.activeBoss = null;
    soundEngine.setBossMode(false);

    const isBossWave = (waveNum % 5 === 0) || this.gameMode === 'BOSSRUSH';

    if (isBossWave) {
      soundEngine.setBossMode(true);
      soundEngine.playBossAlarm();
      const bossLevel = Math.floor(waveNum / 5);
      const boss = new BossEnemy(this.width / 2, -100, bossLevel);
      this.enemies.push(boss);
      this.activeBoss = boss;
      this.particles.createShockwave(this.width / 2, this.height / 2, '#ff0055', 600, 0.05, 6);
    } else {
      // Build wave spawn queue based on difficulty
      const totalEnemies = 8 + waveNum * 4;
      for (let i = 0; i < totalEnemies; i++) {
        let enemyType = 'DRONE';
        const rand = Math.random();
        if (waveNum >= 2 && rand < 0.35) enemyType = 'STRIKER';
        else if (waveNum >= 3 && rand < 0.6) enemyType = 'SNIPER';
        else if (waveNum >= 4 && rand < 0.8) enemyType = 'DREADNOUGHT';

        this.waveSpawnQueue.push({
          type: enemyType,
          delay: i * (Math.max(0.4, 1.8 - waveNum * 0.1))
        });
      }
    }

    this.waveSpawnTimer = 0;
    this.particles.createFloatingText(
      this.width / 2,
      this.height / 2 - 80,
      isBossWave ? '⚠️ TASK TITAN ENCOUNTER ⚠️' : `TASK WAVE ${waveNum}`,
      isBossWave ? '#ff0055' : '#00f0ff',
      32,
      true
    );
  }

  spawnEnemy(type) {
    // Pick random edge of arena
    let x, y;
    const side = Math.floor(Math.random() * 4);
    const pad = 40;
    if (side === 0) { x = Math.random() * this.width; y = -pad; }
    else if (side === 1) { x = this.width + pad; y = Math.random() * this.height; }
    else if (side === 2) { x = Math.random() * this.width; y = this.height + pad; }
    else { x = -pad; y = Math.random() * this.height; }

    let enemy;
    switch (type) {
      case 'STRIKER': enemy = new StrikerEnemy(x, y); break;
      case 'DREADNOUGHT': enemy = new DreadnoughtEnemy(x, y); break;
      case 'SNIPER': enemy = new SniperEnemy(x, y); break;
      case 'DRONE':
      default:
        enemy = new DroneEnemy(x, y);
        break;
    }
    this.enemies.push(enemy);
  }

  onEnemyKilled(enemy, isCrit) {
    this.enemiesDefeated++;
    this.combo++;
    this.comboTimer = 3.5;
    this.comboMultiplier = Math.min(5.0, 1.0 + Math.floor(this.combo / 4) * 0.5);

    const scoreEarned = Math.round(enemy.scoreValue * this.comboMultiplier);
    this.score += scoreEarned;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('rajat_game_highscore', this.highScore.toString());
    }

    // Sound and explosions
    soundEngine.playExplosion(enemy.isBoss || enemy.radius > 20);
    this.addScreenShake(enemy.isBoss ? 20 : 6);

    this.particles.createExplosion(
      enemy.x,
      enemy.y,
      enemy.color,
      enemy.isBoss ? 80 : 25,
      enemy.isBoss ? 7 : 4,
      enemy.isBoss ? 5 : 3
    );

    this.particles.createFloatingText(
      enemy.x,
      enemy.y,
      `+${scoreEarned}`,
      isCrit ? '#ffe600' : '#00f0ff',
      isCrit ? 18 : 14,
      isCrit
    );

    // Charge Overdrive
    this.player.addOverdrive(enemy.isBoss ? 40 : 8);

    // Drops: Cyber Cores & Powerups
    const coreCount = enemy.isBoss ? 8 : (Math.random() < 0.6 ? 2 : 1);
    for (let i = 0; i < coreCount; i++) {
      this.drops.push(new DropItem({ x: enemy.x, y: enemy.y, type: 'CORE', value: 25 }));
    }

    // Rare drops (Shield repair, EMP Nuke, Overdrive crystal)
    const dropRoll = Math.random();
    if (dropRoll < 0.12) {
      this.drops.push(new DropItem({ x: enemy.x, y: enemy.y, type: 'SHIELD' }));
    } else if (dropRoll < 0.18) {
      this.drops.push(new DropItem({ x: enemy.x, y: enemy.y, type: 'OVERDRIVE' }));
    } else if (dropRoll < 0.22) {
      this.drops.push(new DropItem({ x: enemy.x, y: enemy.y, type: 'NUKE' }));
    }
  }

  showLevelUpModal() {
    this.state = 'LEVEL_UP';

    // Pick 3 random perks from pool
    const shuffled = [...PERK_POOL].sort(() => 0.5 - Math.random());
    const choices = shuffled.slice(0, 3);

    const perkCardsContainer = document.getElementById('perk-cards');
    if (!perkCardsContainer) return;
    perkCardsContainer.innerHTML = '';

    choices.forEach((perk) => {
      const card = document.createElement('div');
      card.className = `perk-card rarity-${perk.rarity}`;
      card.innerHTML = `
        <div class="perk-icon">${perk.icon}</div>
        <div class="perk-title">${perk.title}</div>
        <div class="perk-rarity">${perk.rarity.toUpperCase()}</div>
        <div class="perk-desc">${perk.desc}</div>
      `;
      card.onclick = () => {
        perk.apply(this.player);
        soundEngine.playPowerup();
        this.particles.createFloatingText(this.player.x, this.player.y - 30, `UPGRADE: ${perk.title}!`, '#00ff88', 20, true);
        this.state = 'PLAYING';
        this.hideAllModals();
        this.currentWave++;
        this.startWave(this.currentWave);
      };
      perkCardsContainer.appendChild(card);
    });

    const levelUpModal = document.getElementById('levelup-modal');
    if (levelUpModal) levelUpModal.classList.remove('hidden');
  }

  gameOver() {
    this.state = 'GAME_OVER';
    soundEngine.stopMusic();
    soundEngine.playExplosion(true);
    this.addScreenShake(25);

    const finalScoreEl = document.getElementById('game-over-score');
    const finalWaveEl = document.getElementById('game-over-wave');
    const finalKillsEl = document.getElementById('game-over-kills');
    const highscoreEl = document.getElementById('game-over-highscore');

    if (finalScoreEl) finalScoreEl.innerText = this.score.toLocaleString();
    if (finalWaveEl) finalWaveEl.innerText = this.currentWave.toString();
    if (finalKillsEl) finalKillsEl.innerText = this.enemiesDefeated.toString();
    if (highscoreEl) highscoreEl.innerText = this.highScore.toLocaleString();

    const gameOverModal = document.getElementById('gameover-modal');
    if (gameOverModal) gameOverModal.classList.remove('hidden');
  }

  victory() {
    this.state = 'VICTORY';
    soundEngine.stopMusic();
    soundEngine.playPowerup();

    const victoryScoreEl = document.getElementById('victory-score');
    const victoryHighscoreEl = document.getElementById('victory-highscore');
    if (victoryScoreEl) victoryScoreEl.innerText = this.score.toLocaleString();
    if (victoryHighscoreEl) victoryHighscoreEl.innerText = this.highScore.toLocaleString();

    const victoryModal = document.getElementById('victory-modal');
    if (victoryModal) victoryModal.classList.remove('hidden');
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      const pauseModal = document.getElementById('pause-modal');
      if (pauseModal) pauseModal.classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.hideAllModals();
    }
  }

  hideAllModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach((m) => m.classList.add('hidden'));
  }

  update(dt) {
    // Starfield warp movement
    const starSpeedMultiplier = this.player && this.player.isDashing ? 4.0 : 1.0;
    for (const star of this.stars) {
      star.y += star.speed * starSpeedMultiplier;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }

    if (this.state !== 'PLAYING') return;

    // Screen Shake Decay
    if (this.shakeIntensity > 0) {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
      if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboMultiplier = 1.0;
      }
    }

    const bounds = { width: this.width, height: this.height };

    // Update Player
    this.player.update(dt, this.input, bounds, this.bullets, this.particles, this.enemies);
    if (this.player.health <= 0) {
      this.gameOver();
      return;
    }

    // Wave Spawner
    if (this.waveSpawnQueue.length > 0) {
      this.waveSpawnTimer += dt;
      for (let i = this.waveSpawnQueue.length - 1; i >= 0; i--) {
        if (this.waveSpawnTimer >= this.waveSpawnQueue[i].delay) {
          this.spawnEnemy(this.waveSpawnQueue[i].type);
          this.waveSpawnQueue.splice(i, 1);
        }
      }
    }

    // Check Wave Completion
    if (this.waveSpawnQueue.length === 0 && this.enemies.length === 0 && this.waveState === 'IN_PROGRESS') {
      this.waveState = 'COMPLETED';
      if (this.currentWave >= this.maxWaves && this.gameMode === 'CAMPAIGN') {
        this.victory();
        return;
      }
      setTimeout(() => {
        if (this.state === 'PLAYING') {
          this.showLevelUpModal();
        }
      }, 800);
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.player, bounds, this.bullets, this.particles, this.enemies);

      // Player Collision with Enemy (Ramming)
      const distToPlayer = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (distToPlayer < enemy.radius + this.player.radius) {
        this.player.takeDamage(18);
        enemy.takeDamage(35);
        this.addScreenShake(8);
        this.particles.createExplosion(this.player.x, this.player.y, '#ff0055', 12, 3, 2);
      }

      if (!enemy.isAlive) {
        this.onEnemyKilled(enemy, false);
        this.enemies.splice(i, 1);
      }
    }

    // Update Bullets & Collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(bounds, this.enemies);

      if (b.toRemove) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.isPlayer) {
        // Player bullet hits enemy
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          if (!enemy.isAlive) continue;
          const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
          if (dist < b.radius + enemy.radius) {
            enemy.takeDamage(b.damage, b.isCrit);
            this.particles.createSpark(b.x, b.y, Math.atan2(b.vy, b.vx), b.color, 4);

            // Explosive Area Damage
            if (b.explosiveRadius > 0) {
              soundEngine.playExplosion(false);
              this.particles.createExplosion(b.x, b.y, b.color, 16, 4, 3);
              for (const otherEnemy of this.enemies) {
                if (!otherEnemy.isAlive || otherEnemy === enemy) continue;
                const splashDist = Math.hypot(otherEnemy.x - b.x, otherEnemy.y - b.y);
                if (splashDist < b.explosiveRadius) {
                  otherEnemy.takeDamage(b.damage * 0.75, b.isCrit);
                }
              }
            }

            // Chain Lightning
            if (this.player.chainLightning && b.isCrit) {
              let chainCount = 0;
              for (const chainTarget of this.enemies) {
                if (chainTarget === enemy || !chainTarget.isAlive) continue;
                const cDist = Math.hypot(chainTarget.x - enemy.x, chainTarget.y - enemy.y);
                if (cDist < 250 && chainCount < 2) {
                  chainTarget.takeDamage(b.damage * 0.6);
                  this.particles.createShockwave(chainTarget.x, chainTarget.y, '#00ffff', 25, 0.08, 2);
                  chainCount++;
                }
              }
            }

            b.pierce--;
            if (b.pierce <= 0) {
              b.toRemove = true;
              break;
            }
          }
        }
      } else {
        // Enemy bullet hits player
        const dist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
        if (dist < b.radius + this.player.radius) {
          this.player.takeDamage(b.damage);
          this.addScreenShake(6);
          this.particles.createSpark(b.x, b.y, Math.atan2(b.vy, b.vx), '#ff0055', 6);
          b.toRemove = true;
        }
      }

      if (b.toRemove) {
        this.bullets.splice(i, 1);
      }
    }

    // Update Drops
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.update(this.player);

      const dist = Math.hypot(drop.x - this.player.x, drop.y - this.player.y);
      if (dist < drop.radius + this.player.radius) {
        soundEngine.playPowerup();
        switch (drop.type) {
          case 'CORE':
            this.score += Math.round(drop.value * this.comboMultiplier * this.player.coreScoreMultiplier);
            this.player.addOverdrive(3);
            this.particles.createFloatingText(drop.x, drop.y, `+${drop.value}`, '#00f0ff', 12);
            break;
          case 'SHIELD':
            this.player.heal(0, 35);
            this.particles.createFloatingText(drop.x, drop.y, '+SHIELD', '#00ff88', 14, true);
            break;
          case 'OVERDRIVE':
            this.player.addOverdrive(35);
            this.particles.createFloatingText(drop.x, drop.y, '+OVERDRIVE', '#ffe600', 14, true);
            break;
          case 'NUKE':
            this.triggerNuke();
            break;
        }
        this.drops.splice(i, 1);
      }
    }

    // Update Particles
    this.particles.update();

    // Refresh UI HUD
    this.updateHUD();
  }

  triggerNuke() {
    soundEngine.playOverdriveNova();
    this.addScreenShake(20);
    this.particles.createShockwave(this.width / 2, this.height / 2, '#ff0055', 900, 0.05, 8);
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (!this.bullets[i].isPlayer) this.bullets.splice(i, 1);
    }
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      enemy.takeDamage(enemy.isBoss ? 300 : 999, true);
      this.particles.createExplosion(enemy.x, enemy.y, '#ff0055', 20, 5, 3);
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    // Screen Shake Offset
    this.ctx.translate(this.shakeOffsetX, this.shakeOffsetY);

    // Draw Cyber Starfield & Grid
    this.drawBackground();

    // Draw Drops
    for (const drop of this.drops) {
      drop.draw(this.ctx);
    }

    // Draw Particles & Trails
    this.particles.draw(this.ctx);

    // Draw Bullets
    for (const bullet of this.bullets) {
      bullet.draw(this.ctx);
    }

    // Draw Enemies
    for (const enemy of this.enemies) {
      enemy.draw(this.ctx);
    }

    // Draw Player
    if (this.player && this.player.health > 0) {
      this.player.draw(this.ctx);
    }

    // Draw Boss Health Bar if Active
    if (this.activeBoss && this.activeBoss.isAlive) {
      this.drawBossHUD();
    }

    this.ctx.restore();
  }

  drawBackground() {
    // Subtle Cyber Grid
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    this.ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    // Stars
    for (const star of this.stars) {
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = star.color;
      this.ctx.globalAlpha = star.alpha;
      this.ctx.shadowColor = star.color;
      this.ctx.shadowBlur = 6;
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }

  drawBossHUD() {
    const barW = Math.min(600, this.width * 0.65);
    const barH = 14;
    const barX = (this.width - barW) / 2;
    const barY = 40;

    const hpRatio = Math.max(0, this.activeBoss.health / this.activeBoss.maxHealth);

    this.ctx.save();
    // Boss Name
    this.ctx.font = "bold 16px 'Orbitron', monospace";
    this.ctx.fillStyle = '#ff0055';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#ff0055';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText(`⚡ ${this.activeBoss.name} - PHASE ${this.activeBoss.phase} ⚡`, this.width / 2, barY - 10);

    // Frame
    this.ctx.strokeStyle = '#ff0055';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

    // Fill
    const grad = this.ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#ff0055');
    grad.addColorStop(1, '#ffaa00');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(barX, barY, barW * hpRatio, barH);

    this.ctx.restore();
  }

  updateHUD() {
    if (!this.player) return;

    // Health & Shield Bars
    const hpBar = document.getElementById('hud-health');
    const shieldBar = document.getElementById('hud-shield');
    const hpText = document.getElementById('hud-health-text');
    const shieldText = document.getElementById('hud-shield-text');
    const overdriveBar = document.getElementById('hud-overdrive');
    const overdriveBtn = document.getElementById('btn-overdrive');

    if (hpBar) hpBar.style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;
    if (shieldBar) shieldBar.style.width = `${(this.player.shield / this.player.maxShield) * 100}%`;
    if (hpText) hpText.innerText = `${Math.round(this.player.health)} / ${this.player.maxHealth}`;
    if (shieldText) shieldText.innerText = `${Math.round(this.player.shield)} / ${this.player.maxShield}`;
    if (overdriveBar) overdriveBar.style.width = `${(this.player.overdrive / this.player.maxOverdrive) * 100}%`;

    if (overdriveBtn) {
      if (this.player.overdrive >= this.player.maxOverdrive) {
        overdriveBtn.classList.add('ready');
      } else {
        overdriveBtn.classList.remove('ready');
      }
    }

    // Score & Combo
    const scoreEl = document.getElementById('hud-score');
    const waveEl = document.getElementById('hud-wave');
    const comboEl = document.getElementById('hud-combo');
    if (scoreEl) scoreEl.innerText = this.score.toLocaleString();
    if (waveEl) waveEl.innerText = `TASK WAVE ${this.currentWave}`;
    if (comboEl) {
      if (this.combo > 1) {
        comboEl.innerText = `${this.comboMultiplier.toFixed(1)}x COMBO (${this.combo})`;
        comboEl.style.opacity = '1';
      } else {
        comboEl.style.opacity = '0';
      }
    }

    // Weapon Slots Active State
    const weaponButtons = document.querySelectorAll('.weapon-slot');
    weaponButtons.forEach((btn, idx) => {
      if (idx === this.player.currentWeaponIndex) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Dash Indicator
    const dashEl = document.getElementById('hud-dash');
    if (dashEl) {
      if (this.player.dashCooldown <= 0) {
        dashEl.classList.add('ready');
        dashEl.innerText = 'DASH [SHIFT] : READY';
      } else {
        dashEl.classList.remove('ready');
        dashEl.innerText = `DASH : ${(this.player.dashCooldown).toFixed(1)}s`;
      }
    }
  }

  setupEventListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.input.keys[e.code] = true;

      // Weapon Switching
      if (e.code === 'Digit1') this.player?.selectWeapon(0);
      if (e.code === 'Digit2') this.player?.selectWeapon(1);
      if (e.code === 'Digit3') this.player?.selectWeapon(2);
      if (e.code === 'Digit4') this.player?.selectWeapon(3);

      // Dash
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.player?.dash();
      }

      // Nova Overdrive [F or Q]
      if (e.code === 'KeyF' || e.code === 'KeyQ') {
        this.player?.triggerOverdrive(this.bullets, this.enemies, this.particles);
      }

      // Pause
      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
    });

    // Mouse Aim & Shoot
    window.addEventListener('mousemove', (e) => {
      this.input.aim.x = e.clientX;
      this.input.aim.y = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.input.mouseDown = true;
      } else if (e.button === 2) {
        // Right click dash
        this.player?.dash();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.input.mouseDown = false;
      }
    });

    // Mouse Wheel weapon cycle
    window.addEventListener('wheel', (e) => {
      if (!this.player) return;
      let nextIndex = this.player.currentWeaponIndex + (e.deltaY > 0 ? 1 : -1);
      if (nextIndex < 0) nextIndex = this.player.weapons.length - 1;
      if (nextIndex >= this.player.weapons.length) nextIndex = 0;
      this.player.selectWeapon(nextIndex);
    });

    // Context menu disable for right-click dash
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    requestAnimationFrame((t) => this.loop(t));
  }
}
