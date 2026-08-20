/**
 * Cyber Strike: Neon Vanguard - Web Audio Synthesizer Engine
 * 100% Procedural Audio & Music (No external asset files needed!)
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sfxVolume = 0.7;
    this.musicVolume = 0.4;
    this.muted = false;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.beatCount = 0;
    this.tempo = 128; // BPM
    this.scale = [110, 130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66]; // A minor pentatonic / synth scale
    this.bassNotes = [55, 65.41, 73.42, 49.0]; // A, C, D, G
    this.bossMode = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted && this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicPlaying = false;
    } else if (!muted && !this.musicPlaying) {
      this.startMusic();
    }
  }

  setSFXVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
  }

  // --- SOUND EFFECTS ---

  playBlaster(isPlayer = true) {
    if (this.muted || !this.ctx || this.sfxVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isPlayer ? 'sawtooth' : 'triangle';
      const startFreq = isPlayer ? 880 : 540;
      const endFreq = isPlayer ? 180 : 120;

      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.12);

      gain.gain.setValueAtTime(this.sfxVolume * (isPlayer ? 0.25 : 0.15), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.12);
    } catch (e) {}
  }

  playShotgun() {
    if (this.muted || !this.ctx || this.sfxVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      // Combine noise and low punch
      this.playNoise(0.18, 1200, 200, 0.4);
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.18);
      gain.gain.setValueAtTime(this.sfxVolume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch (e) {}
  }

  playRailgun() {
    if (this.muted || !this.ctx || this.sfxVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.35);
      
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(600, t);
      osc2.frequency.exponentialRampToValueAtTime(100, t + 0.35);

      gain.gain.setValueAtTime(this.sfxVolume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc2.start(t);
      osc.stop(t + 0.35);
      osc2.stop(t + 0.35);
    } catch (e) {}
  }

  playMissileLaunch() {
    if (this.muted || !this.ctx || this.sfxVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(800, t + 0.15);
      gain.gain.setValueAtTime(this.sfxVolume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {}
  }

  playExplosion(isLarge = false) {
    if (this.muted || !this.ctx || this.sfxVolume <= 0) return;
    try {
      const dur = isLarge ? 0.6 : 0.28;
      this.playNoise(dur, isLarge ? 400 : 800, 60, isLarge ? 0.6 : 0.35);

      // Low frequency sub-bass thump
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isLarge ? 120 : 180, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + dur);
      gain.gain.setValueAtTime(this.sfxVolume * (isLarge ? 0.5 : 0.3), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch (e) {}
  }

  playDash() {
    if (this.muted || !this.ctx || this.sfxVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.18);
      gain.gain.setValueAtTime(this.sfxVolume * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch (e) {}
  }

  playShieldHit() {
    if (this.muted || !this.ctx || this.sfxVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.linearRampToValueAtTime(400, t + 0.1);
      gain.gain.setValueAtTime(this.sfxVolume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) {}
  }

  playPlayerHit() {
    if (this.muted || !this.ctx || this.sfxVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(60, t + 0.2);
      gain.gain.setValueAtTime(this.sfxVolume * 0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch (e) {}
  }

  playPowerup() {
    if (this.muted || !this.ctx || this.sfxVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);
        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(this.sfxVolume * 0.2, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.12);
      });
    } catch (e) {}
  }

  playOverdriveNova() {
    if (this.muted || !this.ctx || this.sfxVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      this.playNoise(1.2, 2000, 80, 0.5);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.5);
      osc.frequency.exponentialRampToValueAtTime(55, t + 1.2);
      gain.gain.setValueAtTime(this.sfxVolume * 0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    } catch (e) {}
  }

  playBossAlarm() {
    if (this.muted || !this.ctx || this.sfxVolume <= 0) return;
    try {
      const t = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(700, t + i * 0.25);
        osc.frequency.linearRampToValueAtTime(450, t + i * 0.25 + 0.2);
        gain.gain.setValueAtTime(this.sfxVolume * 0.35, t + i * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.25);
        osc.stop(t + i * 0.25 + 0.2);
      }
    } catch (e) {}
  }

  // --- NOISE GENERATOR (Explosions & Impact) ---
  playNoise(duration, filterStart, filterEnd, vol) {
    if (!this.ctx || this.muted) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const t = this.ctx.currentTime;
    filter.frequency.setValueAtTime(filterStart, t);
    filter.frequency.exponentialRampToValueAtTime(filterEnd, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.sfxVolume * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + duration);
  }

  // --- DYNAMIC RETRO SYNTHWAVE MUSIC GENERATOR ---
  startMusic() {
    this.init();
    if (this.musicPlaying || this.muted) return;
    this.musicPlaying = true;
    this.beatCount = 0;

    const stepDuration = (60 / this.tempo) / 4; // 16th notes

    const tick = () => {
      if (!this.musicPlaying || this.muted || this.musicVolume <= 0) return;
      const t = this.ctx.currentTime;
      const step = this.beatCount % 16;
      const bar = Math.floor(this.beatCount / 16) % 4;

      // Kick Drum on beats 0, 4, 8, 12 (4 on the floor)
      if (step % 4 === 0) {
        this.playKick(t);
      }

      // Snare / Clap on beats 4, 12
      if (step === 4 || step === 12) {
        this.playSnare(t);
      }

      // Hi-Hat on every off-beat 2, 6, 10, 14 or 16ths in boss mode
      if (step % 2 === 0 || this.bossMode) {
        this.playHiHat(t, step % 4 === 2 ? 0.08 : 0.04);
      }

      // Rolling Synth Bassline (16th notes)
      const currentRoot = this.bassNotes[bar];
      const bassFreq = (step % 2 === 0) ? currentRoot : currentRoot * 2;
      this.playBassNote(t, bassFreq, stepDuration * 0.85);

      // Lead Synth Arpeggiator
      if (step % 2 === 0 || this.bossMode) {
        const noteIdx = (step + (bar * 2)) % this.scale.length;
        const leadFreq = this.scale[noteIdx] * (this.bossMode ? 2 : 1.5);
        this.playLeadNote(t, leadFreq, stepDuration * 0.7);
      }

      this.beatCount++;
    };

    this.musicTimer = setInterval(tick, stepDuration * 1000);
  }

  playKick(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    gain.gain.setValueAtTime(this.musicVolume * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  playSnare(t) {
    const dur = 0.12;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.musicVolume * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + dur);
  }

  playHiHat(t, dur) {
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.musicVolume * 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + dur);
  }

  playBassNote(t, freq, dur) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.bossMode ? 800 : 500, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + dur);

    gain.gain.setValueAtTime(this.musicVolume * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  }

  playLeadNote(t, freq, dur) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + dur);

    gain.gain.setValueAtTime(this.musicVolume * 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  }

  setBossMode(enabled) {
    this.bossMode = enabled;
    this.tempo = enabled ? 142 : 128;
    if (this.musicPlaying) {
      clearInterval(this.musicTimer);
      this.musicPlaying = false;
      this.startMusic();
    }
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicPlaying = false;
  }
}

export const soundEngine = new SoundEngine();
