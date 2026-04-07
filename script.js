'use strict';
/* ============================================================
   HAYDE — Israeli Supermarket Runner
   Temple Run-inspired · Supermarket Cart · Israeli Theme
   ============================================================ */

// ── Capacitor Native Bootstrap ──────────────────────────────
(async () => {
  if (!window.Capacitor?.isNativePlatform()) return;
  try {
    const { StatusBar } = Capacitor.Plugins;
    await StatusBar.hide();
  } catch (_) {}
  try {
    const { ScreenOrientation } = Capacitor.Plugins;
    await ScreenOrientation.lock({ orientation: 'landscape' });
  } catch (_) {}
})();

// ── Wake Lock Helper ────────────────────────────────────────
const WakeLock = {
  _lock: null,
  async acquire() {
    try {
      if ('wakeLock' in navigator) {
        this._lock = await navigator.wakeLock.request('screen');
      }
    } catch (_) {}
  },
  async release() {
    try {
      if (this._lock) { await this._lock.release(); this._lock = null; }
    } catch (_) {}
  },
};

// ── Haptics Helper ──────────────────────────────────────────
const HapticsHelper = {
  _cap() { return window.Capacitor?.isNativePlatform() ? Capacitor.Plugins.Haptics : null; },
  async impact(style) {
    try { await this._cap()?.impact({ style }); } catch (_) {}
  },
  async notification(type) {
    try { await this._cap()?.notification({ type }); } catch (_) {}
  },
  async selection() {
    try { await this._cap()?.selectionStart(); await this._cap()?.selectionEnd(); } catch (_) {}
  },
  light()   { this.impact('Light'); },
  medium()  { this.impact('Medium'); },
  heavy()   { this.impact('Heavy'); },
  success() { this.notification('Success'); },
  error()   { this.notification('Error'); },
  click()   { this.selection(); },
};

// ── Polyfill: roundRect ──────────────────────────────────────
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const radius = Array.isArray(r) ? (r[0] || 0) : (r || 0);
    const rx = Math.min(radius, w / 2);
    const ry = Math.min(radius, h / 2);
    this.moveTo(x + rx, y);
    this.lineTo(x + w - rx, y);
    this.quadraticCurveTo(x + w, y, x + w, y + ry);
    this.lineTo(x + w, y + h - ry);
    this.quadraticCurveTo(x + w, y + h, x + w - rx, y + h);
    this.lineTo(x + rx, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - ry);
    this.lineTo(x, y + ry);
    this.quadraticCurveTo(x, y, x + rx, y);
    this.closePath();
    return this;
  };
}

// ── Utilities ────────────────────────────────────────────────
const lerp   = (a, b, t) => a + (b - a) * t;
const clamp  = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const rnd    = (lo, hi) => Math.random() * (hi - lo) + lo;
const rndInt = (lo, hi) => Math.floor(rnd(lo, hi + 1));
const TAU    = Math.PI * 2;

// ── Config ───────────────────────────────────────────────────
const CFG = {
  // Track perspective (ratios of canvas dimensions)
  VP_Y:        0.21,   // vanishing-point Y
  NEAR_Y:      0.925,  // near-edge Y
  NEAR_HALF:   0.42,   // half-width at near edge  (× canvas W)
  FAR_HALF:    0.032,  // half-width at vanishing   (× canvas W)

  // Player
  PLAYER_D:    0.86,   // depth in track (0=far, 1=near)
  LANE_LERP:   9,      // lane interpolation speed (per second)
  JUMP_DUR:    0.50,   // seconds
  JUMP_PEAK:   0.115,  // fraction of canvas H
  SLIDE_DUR:   0.44,   // seconds

  // Speed / difficulty
  SPEED_INIT:  0.27,   // depth units / second
  SPEED_MAX:   1.60,
  SPEED_INC:   0.009,  // per second of play

  // Spawning
  SPAWN_INIT:  0.42,   // spawns per second
  SPAWN_MAX:   1.50,
  SPAWN_INC:   0.013,
  HAZ_INIT:    0.22,   // hazard fraction
  HAZ_MAX:     0.52,

  // Scoring
  SCORE_DIST:  9,      // points/second (× speed factor)
  SCORE_ITEM:  15,

  // Nitrous
  NOS_MAX:     100,
  NOS_CHARGE:  14,     // per collect
  NOS_DRAIN:   30,     // per second active
  NOS_MIN:     38,     // minimum charge to fire
  NOS_SPEED:   1.85,   // speed multiplier while active
  NOS_SCORE:   3,      // extra score multiplier active

  // Sparks
  SPARK_MIN:   2,
  SPARK_MAX:   18,

  // Collectibles — Israeli supermarket staples
  ITEMS: [
    '🥑','🥙','🧆','🫓','🫒','🥒','🍅','🥕','🍋','🍊','🍇','🍉','🌽',
    '🥚','🧀','🥛','🍞','🥖','🥐','🫘','🥜','🍯','🫙','🧃','🍎',
    '🍌','🍓','🥦','🥔','🧁','🍦','🥗','🥪','🍕','🥩','🍗','🍝',
    '🫔','🌯','🥘','🍲','🧇','🥞','🍩','🍫','🍬','🍿','🥫','🫐',
    '🧄','🌶️','🫑','🥬','🧅','🫚','🧈','🥝'
  ],

  // Hazard items (skulls only)
  HAZARD_ITEMS: ['☠️','☠️','☠️','💀','☠️','☠️','💀','☠️'],

  // Israeli supermarket specials — bonus collectibles (1+1 deals, club cards, etc.)
  SPECIAL_ITEMS: ['🏷️','⭐','🪙','💎','🎁','🎫'],
  SCORE_SPECIAL: 60,    // bonus score for specials
  NOS_SPECIAL:   40,    // NOS charge for specials
  SPECIAL_CHANCE: 0.10, // 10% of collectibles are specials

  // Level visual themes — Israeli supermarket inspired (vibrant & distinct)
  LEVEL_THEMES: [
    { name:'Shufersal',          sky1:'#0f0a02', sky2:'#2a1c08', grid:[255,200,60],  glow:[255,160,30],  nos:[255,220,0],   flair:'stars',   track1:'#14100a', track2:'#1e1808' },
    { name:'Rami Levy',          sky1:'#021208', sky2:'#083018', grid:[50,255,120],   glow:[30,220,80],   nos:[80,255,140],  flair:'dots',    track1:'#081408', track2:'#0c200c' },
    { name:'Osher Ad',           sky1:'#10041a', sky2:'#220a38', grid:[200,100,255],  glow:[160,60,240],  nos:[220,80,255],  flair:'aurora',  track1:'#120a18', track2:'#1a0e28' },
    { name:'Yochananof',         sky1:'#140410', sky2:'#2a0818', grid:[255,70,120],   glow:[240,40,80],   nos:[255,100,140], flair:'embers',  track1:'#140808', track2:'#200c0c' },
    { name:'Victory',            sky1:'#020814', sky2:'#061228', grid:[80,160,255],   glow:[40,120,240],  nos:[80,180,255],  flair:'sparks',  track1:'#080c18', track2:'#0c1028' },
    { name:'Mega',               sky1:'#140c02', sky2:'#281808', grid:[255,180,40],   glow:[240,140,0],   nos:[255,200,20],  flair:'rays',    track1:'#161008', track2:'#22180c' },
    { name:'Tiv Taam',           sky1:'#021414', sky2:'#043030', grid:[0,240,220],    glow:[0,200,180],   nos:[0,255,240],   flair:'bubbles', track1:'#081414', track2:'#0c2020' },
    { name:'Machsanei Hashuk',   sky1:'#121202', sky2:'#282808', grid:[220,220,80],   glow:[180,180,30],  nos:[240,240,0],   flair:'flares',  track1:'#141408', track2:'#20200c' },
    { name:'Shuk HaCarmel',      sky1:'#140804', sky2:'#301408', grid:[255,120,60],   glow:[240,80,30],   nos:[255,140,80],  flair:'embers',  track1:'#181008', track2:'#28180c' },
    { name:'AM:PM',              sky1:'#04080f', sky2:'#081020', grid:[100,200,255],  glow:[60,160,240],  nos:[120,220,255], flair:'stars',   track1:'#060c14', track2:'#0a1020' },
    { name:'Super-Pharm',        sky1:'#080214', sky2:'#140430', grid:[160,80,255],   glow:[120,40,220],  nos:[180,100,255], flair:'aurora',  track1:'#0c0818', track2:'#140c28' },
    { name:'Yellow',             sky1:'#14140a', sky2:'#2a2a10', grid:[255,255,100],  glow:[220,220,40],  nos:[255,255,60],  flair:'flares',  track1:'#141408', track2:'#22220c' },
  ],
};


// ── Audio ────────────────────────────────────────────────────
//
// Architecture:
//   Sources (oscillators / noise) → SFX submix → Master bus → destination
//                   Voice (SpeechSynthesis) ──────────────────────────────
//
// Mobile voice limit: MAX_VOICES simultaneous oscillator notes.
// Fade-in of FADE_IN seconds on every oscillator prevents clicks/pops.
//
class AudioSystem {
  // ── Mixing levels (dB targets from audio-systems skill) ──────
  // SFX bus: -6 dB  →  gain ≈ 0.50
  // Voice:   -3 dB  →  handled by SpeechSynthesis volume = 1.0
  // Master:  -3 dB  →  gain ≈ 0.71
  static MAX_VOICES = 16;   // mobile voice limit
  static FADE_IN    = 0.005; // 5 ms fade-in to kill clicks

  // ── Sound bank: all SFX definitions in one place ─────────────
  static BANKS = {
    jump:      { freqs: [340, 520],            type: 'sine',     dur: 0.14, vol: 0.36 },
    land:      { freqs: [130],                 type: 'triangle', dur: 0.10, vol: 0.44 },
    collect:   { freqs: [660, 880],            type: 'sine',     dur: 0.11, vol: 0.36 },
    die:       { freqs: [220, 140, 90],        type: 'sawtooth', dur: 0.30, vol: 0.76 },
    nos:       { freqs: [440, 660, 880, 1100], type: 'square',   dur: 0.08, vol: 0.24 },
    levelUp:   { freqs: [400, 520, 660, 880],  type: 'sine',     dur: 0.18, vol: 0.40 },
    slide:     { freqs: [200, 160, 120],       type: 'sawtooth', dur: 0.18, vol: 0.30 },
    nearMiss:  { freqs: [400, 350, 280],       type: 'triangle', dur: 0.12, vol: 0.30 },
    nosEmpty:  { freqs: [300, 200, 120],       type: 'sawtooth', dur: 0.20, vol: 0.36 },
    combo:     { freqs: [660, 880, 1100, 1320],type: 'sine',     dur: 0.10, vol: 0.44 },
    collectV:  [
      { freqs: [660, 880, 1100],       type: 'sine',     dur: 0.11, vol: 0.32 },
      { freqs: [523, 659, 784],        type: 'sine',     dur: 0.10, vol: 0.36 },
      { freqs: [880, 660],             type: 'triangle', dur: 0.08, vol: 0.40 },
      { freqs: [440, 550, 660, 880],   type: 'sine',     dur: 0.07, vol: 0.30 },
      { freqs: [1047, 1319],           type: 'sine',     dur: 0.09, vol: 0.34 },
    ],
  };

  // ── Voice bank: spoken phrases ────────────────────────────────
  static VOICE_STYLES = [
    { rate: 1.0, pitch: 0.5 },
    { rate: 1.3, pitch: 1.8 },
    { rate: 0.9, pitch: 0.3 },
    { rate: 1.5, pitch: 1.5 },
    { rate: 0.8, pitch: 1.0 },
    { rate: 1.2, pitch: 2.0 },
    { rate: 1.1, pitch: 0.7 },
    { rate: 1.4, pitch: 1.2 },
  ];

  static MOTIVATE_PHRASES = [
    'Yalla habibi!', 'Keep going!', 'You are amazing!', 'Sababa!',
    'Kol hakavod!', 'What a legend!', 'Faster faster!', 'Ma kore achi!',
    'Incredible!', 'You are on fire!', 'Supermarket champion!', 'Beast mode!',
    'Unbelievable!', 'So fast!', 'Cannot stop you!', 'Level up baby!',
    'Mashallah!', 'Walla walla!', 'Achi sheli!', 'You rock!',
  ];

  static COMBO_PHRASES = [
    'Yalla!', 'Sababa!', 'Combo!', 'Amazing!', 'Incredible!',
    'On fire!', 'Legendary!', 'Unstoppable!', 'HAYDE HAYDE HAYDE!',
  ];

  static MOTIVATE_FANFARES = [
    [262, 330, 392, 523, 659, 784],
    [294, 370, 440, 587, 740, 880],
    [330, 415, 494, 659, 831, 988],
    [349, 440, 523, 698, 880, 1047],
    [392, 494, 587, 784, 988, 1175],
  ];

  constructor() {
    this.ctx        = null;
    this._master    = null; // master gain node
    this._sfxBus    = null; // SFX submix
    this._voices    = 0;    // active oscillator voice count
  }

  // ── Lifecycle ─────────────────────────────────────────────────
  boot() {
    if (this.ctx) return;
    try {
      this.ctx     = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this.ctx.createGain();
      this._master.gain.value = 0.71; // -3 dB master
      this._master.connect(this.ctx.destination);

      this._sfxBus = this.ctx.createGain();
      this._sfxBus.gain.value = 0.50; // -6 dB SFX submix
      this._sfxBus.connect(this._master);
    } catch (_) {}
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // ── Core oscillator engine ────────────────────────────────────
  // Each note is staggered by 60 ms, fades in 5 ms then decays.
  // Routes through SFX submix → master → destination.
  _tone(freqs, type = 'sine', dur = 0.15, vol = 0.22) {
    if (!this.ctx || !this._sfxBus) return;
    const { FADE_IN, MAX_VOICES } = AudioSystem;
    freqs.forEach((f, i) => {
      if (this._voices >= MAX_VOICES) return; // voice limit
      this._voices++;
      try {
        const t    = this.ctx.currentTime + i * 0.06;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this._sfxBus);
        osc.type = type;
        osc.frequency.setValueAtTime(f, t);
        // 5 ms fade-in → sustain → exponential decay (no clicks)
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vol, t + FADE_IN);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.start(t);
        osc.stop(t + dur + 0.01);
        osc.onended = () => { this._voices = Math.max(0, this._voices - 1); };
      } catch (_) { this._voices = Math.max(0, this._voices - 1); }
    });
  }

  // ── Play a sound bank entry by key ───────────────────────────
  _play(key) {
    const b = AudioSystem.BANKS[key];
    if (b) this._tone(b.freqs, b.type, b.dur, b.vol);
  }

  // ── SpeechSynthesis voice ─────────────────────────────────────
  _speak(text, rate = 1.0, pitch = 1.0) {
    try {
      if (!('speechSynthesis' in window)) return;
      const u    = new SpeechSynthesisUtterance(text);
      u.rate     = rate;
      u.pitch    = pitch;
      u.volume   = 1.0;
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) u.voice = voices[rndInt(0, voices.length - 1)];
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (_) {}
  }

  // ── Public SFX API ────────────────────────────────────────────
  jump()    { this._play('jump'); }
  land()    { this._play('land'); }
  collect() { this._play('collect'); }
  die()     { this._play('die'); }
  nos()     { this._play('nos'); }
  levelUp() { this._play('levelUp'); }
  slide()   { this._play('slide'); }
  nearMiss(){ this._play('nearMiss'); }
  nosEmpty(){ this._play('nosEmpty'); }
  combo()   { this._play('combo'); }

  collectRandom() {
    const variants = AudioSystem.BANKS.collectV;
    const b = variants[rndInt(0, variants.length - 1)];
    this._tone(b.freqs, b.type, b.dur, b.vol);
  }

  // ── Motivational milestone fanfare + spoken phrase ────────────
  motivate(level) {
    const phrases = AudioSystem.MOTIVATE_PHRASES;
    this._speak(
      phrases[rndInt(0, phrases.length - 1)],
      AudioSystem.VOICE_STYLES[level % AudioSystem.VOICE_STYLES.length].rate,
      AudioSystem.VOICE_STYLES[level % AudioSystem.VOICE_STYLES.length].pitch,
    );

    const fanfares = AudioSystem.MOTIVATE_FANFARES;
    const seq      = fanfares[level % fanfares.length];
    seq.forEach((f, i) => {
      if (this._voices >= AudioSystem.MAX_VOICES) return;
      this._voices++;
      try {
        const t    = this.ctx.currentTime + i * 0.09;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this._sfxBus);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.36, t + AudioSystem.FADE_IN);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.26);
        osc.onended = () => { this._voices = Math.max(0, this._voices - 1); };
      } catch (_) { this._voices = Math.max(0, this._voices - 1); }
    });
  }

  // ── "Hayde!" collision shout ──────────────────────────────────
  hayde() {
    this._speak('Haaaaydeee!', 1.3, 1.0);
    this._haydesynth();
  }

  _haydesynth() {
    if (!this.ctx || !this._sfxBus) return;
    try {
      const ac  = this.ctx;
      const now = ac.currentTime;
      const { FADE_IN } = AudioSystem;

      // Aspirated noise burst ("H")
      const nbuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.07), ac.sampleRate);
      const nd   = nbuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const nsrc  = ac.createBufferSource();
      nsrc.buffer = nbuf;
      const nfilt = ac.createBiquadFilter();
      nfilt.type  = 'bandpass'; nfilt.frequency.value = 2200; nfilt.Q.value = 0.8;
      const ngain = ac.createGain();
      ngain.gain.setValueAtTime(0.0001, now);
      ngain.gain.linearRampToValueAtTime(0.24, now + FADE_IN);
      ngain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      nsrc.connect(nfilt); nfilt.connect(ngain); ngain.connect(this._sfxBus);
      nsrc.start(now); nsrc.stop(now + 0.08);

      // Synth undertone (speech is primary, keep this subtle)
      const osc = ac.createOscillator();
      osc.type  = 'sawtooth';
      osc.frequency.setValueAtTime(260, now + 0.05);
      osc.frequency.linearRampToValueAtTime(350, now + 0.55);
      osc.frequency.setValueAtTime(240, now + 0.65);
      osc.frequency.linearRampToValueAtTime(460, now + 0.78);
      osc.frequency.linearRampToValueAtTime(480, now + 1.15);
      const f1 = ac.createBiquadFilter();
      f1.type  = 'bandpass'; f1.Q.value = 4;
      f1.frequency.setValueAtTime(780, now + 0.05);
      f1.frequency.linearRampToValueAtTime(300, now + 0.75);
      const mg = ac.createGain();
      mg.gain.setValueAtTime(0.0001, now);
      mg.gain.linearRampToValueAtTime(0.18, now + 0.08);
      mg.gain.exponentialRampToValueAtTime(0.0001, now + 1.20);
      osc.connect(f1); f1.connect(mg); mg.connect(this._sfxBus);
      osc.start(now + 0.05); osc.stop(now + 1.22);
    } catch (_) {}
  }

  // ── Item collect shout ────────────────────────────────────────
  haydeCollect() {
    this._speak('Hayde!', 1.6, rnd(0.8, 1.4));
    this._tone([660, 880], 'sine', 0.10, 0.24);
  }

  // ── Escalating combo shout ────────────────────────────────────
  comboSound(level) {
    const phrases = AudioSystem.COMBO_PHRASES;
    const idx     = Math.min(level - 1, phrases.length - 1);
    this._speak(phrases[idx], 1.2 + level * 0.1, 0.7 + level * 0.15);
    const base  = 440 + level * 80;
    const freqs = Array.from({ length: Math.min(level + 2, 8) }, (_, i) => base + i * 110);
    this._tone(freqs, 'sine', 0.08, 0.30 + level * 0.04);
  }

  // ── NOS activation ───────────────────────────────────────────
  haydeNOS() {
    this._speak('HAAAAYYYDEEEEE!', 1.0, 0.6);
    this._tone([440, 660, 880, 1100], 'square', 0.08, 0.24);
    if (!this.ctx || !this._sfxBus) return;
    try {
      const ac  = this.ctx;
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      osc.type  = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.5);
      const mg = ac.createGain();
      mg.gain.setValueAtTime(0.0001, now);
      mg.gain.linearRampToValueAtTime(0.25, now + AudioSystem.FADE_IN);
      mg.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc.connect(mg); mg.connect(this._sfxBus);
      osc.start(now); osc.stop(now + 0.65);
    } catch (_) {}
  }
}


// ── Particles ────────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, life, size, color, kind) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = this.maxLife = life;
    this.size = size;
    this.color = color; // string color or emoji
    this.kind  = kind;  // 'spark' | 'nos' | 'collect' | 'flash'
    this.dead  = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.kind === 'spark') this.vy += 900 * dt;
    if (this.kind === 'nos')   this.vy += 200 * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    if (this.dead) return;
    const t = clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = t;

    if (this.kind === 'collect') {
      const s = this.size * (0.6 + t * 0.8);
      ctx.font = `${s}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.color, this.x, this.y);
    } else {
      ctx.fillStyle = this.color;
      ctx.shadowBlur  = this.size * 2.5;
      ctx.shadowColor = this.color;
      const s = this.size * (0.4 + t * 0.6);
      ctx.fillRect(this.x - s * 0.5, this.y - s * 0.5, s, s);
    }
    ctx.restore();
  }
}

class Particles {
  constructor() { this.list = []; }

  sparks(x, y, count, speedMult = 1, colors = ['#ffffff','#d0d8e8','#a8b8cc']) {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + rnd(-0.45, 0.45);
      const speed = rnd(90, 260) * speedMult;
      this.list.push(new Particle(
        x + rnd(-10, 10), y + rnd(-4, 4),
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - rnd(40, 140),
        rnd(0.20, 0.60), rnd(2, 5),
        colors[rndInt(0, colors.length - 1)], 'spark'
      ));
    }
  }

  nosTrail(x, y) {
    const cols = ['#00d4ff','#0071e3','#bf5af2','#fff'];
    for (let i = 0; i < 5; i++) {
      this.list.push(new Particle(
        x + rnd(-14, 14), y + rnd(-5, 5),
        rnd(-70, 70), rnd(-90, 50),
        rnd(0.14, 0.38), rnd(3, 9),
        cols[rndInt(0, cols.length - 1)], 'nos'
      ));
    }
  }

  collectPop(x, y, emoji) {
    this.list.push(new Particle(x, y, rnd(-20, 20), -130,
      0.65, 26, emoji, 'collect'));
  }

  update(dt) {
    for (const p of this.list) p.update(dt);
    this.list = this.list.filter(p => !p.dead);
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.list) p.draw(ctx);
    ctx.restore();
  }

  clear() { this.list = []; }
}


// ── Input ────────────────────────────────────────────────────
class Input {
  constructor() {
    this.swipeCbs = {};
    this.tapCbs   = [];
    this._ts = null;
    this.SWIPE_MIN  = 28; // px
    this.TAP_MAX_D  = 16;
    this.TAP_MAX_MS = 240;
  }

  onSwipe(dir, cb) { this.swipeCbs[dir] = cb; }
  onTap(cb)        { this.tapCbs.push(cb); }

  init() {
    const opts = { passive: false };
    document.addEventListener('touchstart', e => this._tStart(e), opts);
    document.addEventListener('touchend',   e => this._tEnd(e),   opts);
    document.addEventListener('keydown',    e => this._key(e));
  }

  _tStart(e) {
    // Let the browser handle taps on interactive elements (buttons, links)
    // so that synthetic click events still fire on them.
    if (e.target.closest('button, a, [role="button"]')) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    this._ts = { x: t.clientX, y: t.clientY, ms: Date.now() };
  }

  _tEnd(e) {
    if (!this._ts) return;  // _tStart was skipped (interactive element tap)
    e.preventDefault();
    const t  = e.changedTouches[0];
    const dx = t.clientX - this._ts.x;
    const dy = t.clientY - this._ts.y;
    const ms = Date.now() - this._ts.ms;
    const d  = Math.hypot(dx, dy);
    this._ts = null;

    if (d < this.TAP_MAX_D && ms < this.TAP_MAX_MS) {
      this.tapCbs.forEach(cb => cb({ x: t.clientX, y: t.clientY }));
      return;
    }
    if (d < this.SWIPE_MIN) return;
    this._fire(Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down'  : 'up'));
  }

  _key(e) {
    const map = {
      ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down',
      ' ':'up', KeyA:'left', KeyD:'right', KeyW:'up', KeyS:'down',
    };
    const dir = map[e.code] || map[e.key];
    if (dir) { e.preventDefault(); this._fire(dir); }
  }

  _fire(dir) {
    if (this.swipeCbs[dir]) this.swipeCbs[dir]();
  }
}


// ── Track (pseudo-3D perspective) ────────────────────────────
class Track {
  constructor() {
    this.floorT = 0; // scrolling floor offset
    this._flairT = 0;
    // Pre-generate star/dot positions for sky decorations
    this._flairPts = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.9,
      r: Math.random() * 1.8 + 0.5,
      phase: Math.random() * TAU,
      speed: Math.random() * 0.6 + 0.2,
    }));
  }

  // Project (lane: -1|0|1, depth: 0-1) → screen {x, y, scale}
  // cw/ch = logical canvas size
  project(lane, depth, cw, ch) {
    const vpY   = ch * CFG.VP_Y;
    const nearY = ch * CFG.NEAR_Y;
    const nearH = cw * CFG.NEAR_HALF;
    const farH  = cw * CFG.FAR_HALF;
    const halfW = lerp(farH, nearH, depth);
    return {
      x:     cw * 0.5 + lane * halfW * 0.668,
      y:     lerp(vpY, nearY, depth),
      scale: halfW / nearH,
    };
  }

  draw(ctx, cw, ch, dt, speed, nosActive, theme, level) {
    // Fall back to default Deep Space theme if none provided
    const th = theme || CFG.LEVEL_THEMES[0];
    const cx    = cw * 0.5;
    const vpY   = ch * CFG.VP_Y;
    const nearY = ch * CFG.NEAR_Y;
    const nearH = cw * CFG.NEAR_HALF;
    const farH  = cw * CFG.FAR_HALF;

    this._flairT += dt;

    // ── Sky / ceiling ───────────────────────────────────────
    const skyGrad = ctx.createLinearGradient(0, 0, 0, vpY * 1.8);
    skyGrad.addColorStop(0, th.sky1);
    skyGrad.addColorStop(1, th.sky2);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, ch);

    // ── Level-specific sky decorations ─────────────────────
    this._drawSkyFlair(ctx, cw, ch, vpY, th, speed);

    // Ambient NOS glow in background
    if (nosActive) {
      const [nr, ng, nb] = th.nos;
      const g = ctx.createRadialGradient(cx, vpY, 0, cx, vpY, cw * 0.55);
      g.addColorStop(0, `rgba(${nr},${ng},${nb},0.07)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
    }

    // ── Ceiling strip lights ────────────────────────────────
    this._ceilingLights(ctx, cw, ch, cx, vpY);

    // ── Track surface ───────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - farH, vpY);
    ctx.lineTo(cx + farH, vpY);
    ctx.lineTo(cx + nearH, nearY);
    ctx.lineTo(cx - nearH, nearY);
    ctx.closePath();
    const trkGrad = ctx.createLinearGradient(0, vpY, 0, nearY);
    const t1 = th.track1 || '#0e0a06';
    const t2 = th.track2 || '#1a1510';
    trkGrad.addColorStop(0,   t1);
    trkGrad.addColorStop(0.4, t2);
    trkGrad.addColorStop(1,   t2);
    ctx.fillStyle = trkGrad;
    ctx.fill();
    ctx.restore();

    // ── Scrolling floor grid ────────────────────────────────
    this.floorT = (this.floorT + speed * 0.85 * dt) % 1;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - farH, vpY);
    ctx.lineTo(cx + farH, vpY);
    ctx.lineTo(cx + nearH, nearY);
    ctx.lineTo(cx - nearH, nearY);
    ctx.closePath();
    ctx.clip();

    const lines = 18;
    const [gr, gg, gb] = th.grid;
    const [nr2, ng2, nb2] = th.nos;
    for (let i = 0; i < lines; i++) {
      const t = ((i / lines) + this.floorT) % 1;
      const te = Math.pow(t, 2.2);
      const y  = lerp(vpY, nearY, te);
      const hw = lerp(farH, nearH, te);
      ctx.beginPath();
      ctx.moveTo(cx - hw, y);
      ctx.lineTo(cx + hw, y);
      const a = t * 0.38 * (nosActive ? 1.6 : 1);
      ctx.strokeStyle = nosActive
        ? `rgba(${nr2},${ng2},${nb2},${a})`
        : `rgba(${gr},${gg},${gb},${a})`;
      ctx.lineWidth = Math.max(0.5, t * 1.8);
      ctx.stroke();
    }
    ctx.restore();

    // ── Lane dividers ───────────────────────────────────────
    const [glr, glg, glb] = th.glow;
    const dividers = [-1, -0.334, 0.334, 1];
    ctx.save();
    for (let i = 0; i < dividers.length; i++) {
      const lp    = dividers[i];
      const isEdge = (i === 0 || i === dividers.length - 1);
      const x0 = cx + lp * farH;
      const x1 = cx + lp * nearH;
      const g = ctx.createLinearGradient(0, vpY, 0, nearY);
      const alpha = isEdge ? [0.12, 0.60] : [0.04, 0.28];
      g.addColorStop(0, `rgba(${glr},${glg},${glb},${alpha[0]})`);
      g.addColorStop(1, `rgba(${glr},${glg},${glb},${alpha[1]})`);
      ctx.beginPath();
      ctx.moveTo(x0, vpY);
      ctx.lineTo(x1, nearY);
      ctx.strokeStyle = g;
      ctx.lineWidth   = isEdge ? 2 : 1;
      ctx.stroke();
    }
    ctx.restore();

    // ── Side shelves silhouette ─────────────────────────────
    this._shelves(ctx, cw, ch, cx, vpY, nearY, nearH);

    // ── Edge glow ───────────────────────────────────────────
    const edgeW = nearH * 0.28;
    const elG = ctx.createLinearGradient(cx - nearH, 0, cx - nearH + edgeW, 0);
    elG.addColorStop(0, `rgba(${glr},${glg},${glb},0.10)`);
    elG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = elG;
    ctx.fillRect(cx - nearH, vpY, edgeW, nearY - vpY);

    const erG = ctx.createLinearGradient(cx + nearH, 0, cx + nearH - edgeW, 0);
    erG.addColorStop(0, `rgba(${glr},${glg},${glb},0.10)`);
    erG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = erG;
    ctx.fillRect(cx + nearH - edgeW, vpY, edgeW, nearY - vpY);

    // ── Speed lines during NOS ──────────────────────────────
    if (nosActive) this._speedLines(ctx, cw, ch, cx, vpY, th);

    // ── Below track ─────────────────────────────────────────
    ctx.fillStyle = '#0a0804';
    ctx.fillRect(0, nearY, cw, ch - nearY);
  }

  _ceilingLights(ctx, cw, ch, cx, vpY) {
    // Two perspective light strips running to vanishing point
    ctx.save();
    ctx.globalAlpha = 0.18;
    const lx = [cx - cw * 0.12, cx + cw * 0.12];
    lx.forEach(x => {
      const g = ctx.createLinearGradient(x, 0, cx, vpY);
      g.addColorStop(0, 'rgba(255,240,200,0.5)');
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(cx, vpY);
      ctx.stroke();
    });
    ctx.restore();
  }

  _shelves(ctx, cw, ch, cx, vpY, nearY, nearH) {
    // Dark rectangular shelf silhouettes on each side
    ctx.save();
    ctx.globalAlpha = 0.60;
    ctx.fillStyle = '#0a0806';
    // Left side
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cx - nearH, nearY);
    ctx.lineTo(cx - nearH, vpY);
    ctx.lineTo(0, 0);
    ctx.fill();
    // Right side
    ctx.beginPath();
    ctx.moveTo(cw, 0);
    ctx.lineTo(cx + nearH, vpY);
    ctx.lineTo(cx + nearH, nearY);
    ctx.lineTo(cw, 0);
    ctx.fill();

    // Subtle shelf horizontal bands on the left wall
    ctx.globalAlpha = 0.12;
    const shelfCols = 5;
    for (let i = 0; i < shelfCols; i++) {
      const fy = vpY + (i / shelfCols) * (nearY - vpY);
      const fw = cx - lerp(cw * CFG.FAR_HALF, nearH, i / shelfCols);
      ctx.fillStyle = 'rgba(220,200,160,0.9)';
      ctx.fillRect(0, fy - 1.5, fw, 2.5);
      ctx.fillRect(cx + lerp(cw * CFG.FAR_HALF, nearH, i / shelfCols), fy - 1.5, cw - cx - lerp(cw * CFG.FAR_HALF, nearH, i / shelfCols), 2.5);
    }
    ctx.restore();
  }

  _speedLines(ctx, cw, ch, cx, vpY, theme) {
    const th = theme || CFG.LEVEL_THEMES[0];
    const [nr, ng, nb] = th.nos;
    ctx.save();
    ctx.globalAlpha = 0.12;
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a   = (i / n) * TAU;
      const len = rnd(cw * 0.15, cw * 0.45);
      const r0  = cw * 0.04;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, vpY + Math.sin(a) * r0 * 0.4);
      ctx.lineTo(cx + Math.cos(a) * len, vpY + Math.sin(a) * len * 0.5);
      ctx.strokeStyle = `rgb(${nr},${ng},${nb})`;
      ctx.lineWidth   = rnd(0.5, 1.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawSkyFlair(ctx, cw, ch, vpY, th, speed) {
    if (!th.flair) return;
    const t = this._flairT;
    const [gr, gg, gb] = th.grid;
    const [nr, ng, nb] = th.nos;

    ctx.save();
    // Clip to sky area
    ctx.beginPath();
    ctx.rect(0, 0, cw, vpY * 1.35);
    ctx.clip();

    switch (th.flair) {
      case 'stars': {
        // Twinkling stars
        for (const p of this._flairPts) {
          const bri = 0.4 + Math.sin(t * p.speed + p.phase) * 0.35;
          ctx.globalAlpha = bri * 0.7;
          ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
          ctx.beginPath();
          ctx.arc(p.x * cw, p.y * vpY, p.r, 0, TAU);
          ctx.fill();
        }
        break;
      }
      case 'dots': {
        // Floating dots (fresh produce vibe)
        for (const p of this._flairPts.slice(0, 18)) {
          const fy = ((p.y + t * p.speed * 0.04) % 1) * vpY;
          const bri = 0.3 + Math.sin(t * 1.2 + p.phase) * 0.2;
          ctx.globalAlpha = bri * 0.55;
          ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
          ctx.beginPath();
          ctx.arc(p.x * cw, fy, p.r * 1.4, 0, TAU);
          ctx.fill();
        }
        break;
      }
      case 'aurora': {
        // Sweeping aurora bands
        for (let i = 0; i < 3; i++) {
          const y0 = vpY * (0.2 + i * 0.25 + Math.sin(t * 0.4 + i * 1.2) * 0.1);
          const grad = ctx.createLinearGradient(0, y0, cw, y0 + 30);
          grad.addColorStop(0,   `rgba(${nr},${ng},${nb},0)`);
          grad.addColorStop(0.3, `rgba(${nr},${ng},${nb},0.09)`);
          grad.addColorStop(0.7, `rgba(${gr},${gg},${gb},0.07)`);
          grad.addColorStop(1,   `rgba(${nr},${ng},${nb},0)`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, y0, cw, 30 + Math.sin(t * 0.5 + i) * 10);
        }
        break;
      }
      case 'embers': {
        // Rising embers
        for (const p of this._flairPts.slice(0, 20)) {
          const fy = vpY * (1 - ((p.y + t * p.speed * 0.06) % 1));
          const bri = 0.3 + Math.sin(t * 2 + p.phase) * 0.25;
          ctx.globalAlpha = bri * 0.65;
          ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
          ctx.beginPath();
          ctx.arc(p.x * cw + Math.sin(t * p.speed + p.phase) * 8, fy, p.r * 0.9, 0, TAU);
          ctx.fill();
        }
        break;
      }
      case 'sparks': {
        // Sharp star sparks
        for (const p of this._flairPts.slice(0, 16)) {
          const bri = Math.max(0, Math.sin(t * p.speed * 3 + p.phase));
          ctx.globalAlpha = bri * 0.7;
          const sx = p.x * cw;
          const sy = p.y * vpY;
          const sr = p.r * 2;
          ctx.strokeStyle = `rgb(${nr},${ng},${nb})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx - sr, sy); ctx.lineTo(sx + sr, sy);
          ctx.moveTo(sx, sy - sr); ctx.lineTo(sx, sy + sr);
          ctx.stroke();
        }
        break;
      }
      case 'rays': {
        // Sunray/neon rays from vanishing point
        const cx2 = cw * 0.5;
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI - Math.PI * 0.5 + Math.sin(t * 0.25 + i * 0.6) * 0.06;
          const len   = cw * 0.7;
          const bri   = 0.04 + Math.sin(t * 0.5 + i) * 0.02;
          ctx.globalAlpha = bri;
          ctx.strokeStyle = `rgb(${gr},${gg},${gb})`;
          ctx.lineWidth   = 4 + Math.sin(t + i) * 2;
          ctx.beginPath();
          ctx.moveTo(cx2, vpY * 0.5);
          ctx.lineTo(cx2 + Math.cos(angle) * len, vpY * 0.5 + Math.sin(angle) * len * 0.6);
          ctx.stroke();
        }
        break;
      }
      case 'bubbles': {
        // Floating translucent bubbles
        for (const p of this._flairPts.slice(0, 14)) {
          const fy = vpY * (1 - ((p.y + t * p.speed * 0.05) % 1));
          const bri = 0.15 + Math.sin(t * p.speed + p.phase) * 0.1;
          ctx.globalAlpha = bri;
          ctx.strokeStyle = `rgb(${nr},${ng},${nb})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x * cw, fy, p.r * 3.5, 0, TAU);
          ctx.stroke();
        }
        break;
      }
      case 'flares': {
        // Lens flare glints
        for (const p of this._flairPts.slice(0, 12)) {
          const bri = Math.max(0, Math.sin(t * p.speed * 1.5 + p.phase)) * 0.5;
          if (bri < 0.05) continue;
          ctx.globalAlpha = bri;
          const fx = p.x * cw;
          const fy = p.y * vpY;
          const g  = ctx.createRadialGradient(fx, fy, 0, fx, fy, p.r * 8);
          g.addColorStop(0,   `rgb(${gr},${gg},${gb})`);
          g.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(fx, fy, p.r * 8, 0, TAU); ctx.fill();
        }
        break;
      }
    }

    ctx.restore();
  }
}


// ── Player (Cart) ────────────────────────────────────────────
class Player {
  constructor() {
    this.lane    = 0;   // target lane: -1 | 0 | 1
    this.laneT   = 0;   // interpolated
    this.jumpT   = 0;   // 0=ground, sin(π*t)=arc
    this.jumpAge = 0;
    this.jumping = false;
    this.slideAge = 0;
    this.sliding  = false;
    this.dead      = false;
    this.deathAge  = 0;
    this.collected = []; // emojis in cart (last 4 shown)
    this.laneVel   = 0;  // for lean effect
  }

  moveLeft()  { if (this.lane > -1 && !this.dead) { this.laneVel = -1; this.lane--; return true; } return false; }
  moveRight() { if (this.lane <  1 && !this.dead) { this.laneVel =  1; this.lane++; return true; } return false; }

  jump() {
    if (!this.jumping && !this.dead) {
      this.jumping = true; this.jumpAge = 0; return true;
    }
    return false;
  }

  slide() {
    if (!this.sliding && !this.jumping && !this.dead) {
      this.sliding = true; this.slideAge = 0; return true;
    }
    return false;
  }

  collect(emoji) {
    this.collected.push(emoji);
    if (this.collected.length > 4) this.collected.shift();
  }

  die() { this.dead = true; this.deathAge = 0; }

  update(dt) {
    // Lane interpolation
    this.laneT = lerp(this.laneT, this.lane, 1 - Math.pow(0.001, CFG.LANE_LERP * dt));
    // Lean velocity decay
    this.laneVel = lerp(this.laneVel, 0, 1 - Math.pow(0.001, 8 * dt));

    // Jump arc
    if (this.jumping) {
      this.jumpAge += dt;
      this.jumpT = Math.sin(Math.PI * this.jumpAge / CFG.JUMP_DUR);
      if (this.jumpAge >= CFG.JUMP_DUR) {
        this.jumping = false; this.jumpT = 0;
      }
    }

    // Slide
    if (this.sliding) {
      this.slideAge += dt;
      if (this.slideAge >= CFG.SLIDE_DUR) this.sliding = false;
    }

    // Death anim
    if (this.dead) this.deathAge += dt;
  }

  jumpHeight(ch) { return this.jumpT * CFG.JUMP_PEAK * ch; }

  draw(ctx, track, cw, ch) {
    const pos  = track.project(this.laneT, CFG.PLAYER_D, cw, ch);
    const bH   = ch * 0.115;
    const offY = this.jumpHeight(ch);
    const x    = pos.x;
    const y    = pos.y - offY;

    ctx.save();
    ctx.translate(x, y);

    // Lean on lane change
    const lean = this.laneVel * 0.18;
    ctx.rotate(lean);

    // Death shake + fade
    if (this.dead && this.deathAge < 0.5) {
      const shake = (1 - this.deathAge * 2) * 7;
      ctx.translate(rnd(-shake, shake), rnd(-shake, shake));
      ctx.globalAlpha = Math.max(0.15, 1 - this.deathAge * 1.6);
    }

    // Ground shadow
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, bH * 0.1, bH * 0.52, bH * 0.075, 0, 0, TAU);
    const sh = ctx.createRadialGradient(0, bH * 0.1, 0, 0, bH * 0.1, bH * 0.52);
    sh.addColorStop(0, 'rgba(0,0,0,0.50)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fill();
    ctx.restore();

    // 🛒 cart emoji
    const emojiSize = bH * (this.sliding ? 1.1 : 1.75);
    ctx.font = `${emojiSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Squash vertically when sliding
    if (this.sliding) ctx.scale(1, 0.55);
    ctx.fillText('🛒', 0, -bH * 0.32);

    ctx.restore();
  }

  // Returns AABB in screen coords for collision
  getBox(track, cw, ch) {
    const pos  = track.project(this.laneT, CFG.PLAYER_D, cw, ch);
    const bH   = ch * 0.115;
    const bW   = bH * 0.88;
    const sH   = this.sliding ? bH * 0.48 : bH * 0.85;
    const offY = this.jumpHeight(ch);
    return {
      x: pos.x - bW * 0.42,
      y: pos.y - offY - sH,
      w: bW * 0.84,
      h: sH,
    };
  }
}


// ── Game Object (collectible / hazard) ───────────────────────
class GameObject {
  constructor(type, lane, emoji) {
    this.type    = type;  // 'collect' | 'hazard'
    this.lane    = lane;
    this.depth   = 0;
    this.emoji   = emoji;
    this.dead    = false;
    this.taken   = false;
    this.phase   = rnd(0, TAU);
    this.age     = 0;
  }

  update(dt, speed) {
    this.depth += speed * dt;
    this.age   += dt;
    if (this.depth > 1.08) this.dead = true;
  }

  draw(ctx, track, cw, ch) {
    if (this.dead) return;
    const pos  = track.project(this.lane, this.depth, cw, ch);
    const base = 68;
    const s    = pos.scale;
    const size = base * s * 2.8;
    if (size < 4) return;

    const pulse = 1 + Math.sin(this.phase + this.age * 4) * 0.05;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(pulse, pulse);
    if (this.type === 'special')   this._drawSpecial(ctx, size);
    else if (this.type === 'collect') this._drawCollectible(ctx, size);
    else                           this._drawHazard(ctx, size);
    ctx.restore();
  }

  _drawCollectible(ctx, size) {
    const emojiSize = Math.max(18, size * 0.85);
    ctx.font = `${emojiSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Subtle glow behind item
    ctx.save();
    ctx.shadowColor = 'rgba(255,220,100,0.4)';
    ctx.shadowBlur = size * 0.3;
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }

  _drawHazard(ctx, size) {
    const emojiSize = Math.max(18, size * 0.85);
    ctx.font = `${emojiSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Red danger glow
    ctx.save();
    ctx.shadowColor = 'rgba(255,59,48,0.6)';
    ctx.shadowBlur = size * 0.4;
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }

  _drawSpecial(ctx, size) {
    // Spinning golden halo — no tint, just the emoji at full opacity
    const r = size * 0.58;
    const spins = (this.age * 2) % TAU;
    ctx.save();
    ctx.rotate(spins);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const gx = Math.cos(a) * r * 0.72;
      const gy = Math.sin(a) * r * 0.72;
      ctx.fillStyle = '#ffd60a';
      ctx.beginPath();
      ctx.arc(gx, gy, r * 0.12, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    const emojiSize = Math.max(18, size * 0.90);
    ctx.font = `${emojiSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.shadowColor = 'rgba(255,214,10,0.7)';
    ctx.shadowBlur = size * 0.5;
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }

  getBox(track, cw, ch) {
    const pos  = track.project(this.lane, this.depth, cw, ch);
    const base = 68;
    const size = base * pos.scale * 2.8 * 0.55; // slightly inset for leniency
    return { x: pos.x - size * 0.5, y: pos.y - size * 0.5, w: size, h: size };
  }
}

// ── Object Manager ───────────────────────────────────────────
class ObjectManager {
  constructor() {
    this.items    = [];
    this.timer    = 0;
    this.interval = 1 / CFG.SPAWN_INIT;
  }

  reset() {
    this.items    = [];
    this.timer    = 0;
    this.interval = 1 / CFG.SPAWN_INIT;
  }

  update(dt, speed, hazRatio) {
    this.timer += dt;
    if (this.timer >= this.interval) {
      this.timer = 0;
      this._spawn(hazRatio);
    }
    for (const o of this.items) o.update(dt, speed);
    this.items = this.items.filter(o => !o.dead);
  }

  _pickCollectible() {
    if (Math.random() < CFG.SPECIAL_CHANCE) {
      return { emoji: CFG.SPECIAL_ITEMS[rndInt(0, CFG.SPECIAL_ITEMS.length - 1)], type: 'special' };
    }
    return { emoji: CFG.ITEMS[rndInt(0, CFG.ITEMS.length - 1)], type: 'collect' };
  }

  _spawn(hazRatio) {
    const lane  = rndInt(-1, 1);
    const isHaz = Math.random() < hazRatio;
    let emoji, type;
    if (isHaz) {
      emoji = CFG.HAZARD_ITEMS[rndInt(0, CFG.HAZARD_ITEMS.length - 1)];
      type  = 'hazard';
    } else {
      ({ emoji, type } = this._pickCollectible());
    }
    this.items.push(new GameObject(type, lane, emoji));

    // Sometimes add a second object in a different lane
    if (Math.random() < 0.28) {
      const lanes2 = [-1, 0, 1].filter(l => l !== lane);
      const lane2  = lanes2[rndInt(0, lanes2.length - 1)];
      const isHaz2 = Math.random() < hazRatio * 0.75;
      let emoji2, type2;
      if (isHaz2) {
        emoji2 = CFG.HAZARD_ITEMS[rndInt(0, CFG.HAZARD_ITEMS.length - 1)];
        type2  = 'hazard';
      } else {
        ({ emoji: emoji2, type: type2 } = this._pickCollectible());
      }
      this.items.push(new GameObject(type2, lane2, emoji2));
    }
  }

  checkCollisions(player, track, cw, ch) {
    const pBox   = player.getBox(track, cw, ch);
    const result = { collected: [], hit: false };

    for (const obj of this.items) {
      if (obj.dead || obj.taken) continue;
      if (obj.depth < CFG.PLAYER_D - 0.09 || obj.depth > CFG.PLAYER_D + 0.06) continue;

      const oBox = obj.getBox(track, cw, ch);
      if (!this._overlap(pBox, oBox)) continue;

      if (obj.type === 'collect' || obj.type === 'special') {
        obj.taken = true;
        obj.dead  = true;
        result.collected.push({ emoji: obj.emoji, special: obj.type === 'special' });
      } else {
        // Can jump over ground-level hazards
        if (!player.jumping || player.jumpT < 0.35) {
          result.hit = true;
        }
      }
    }
    return result;
  }

  _overlap(a, b) {
    // 20% inset on each box for a forgiving hitbox
    const inset = 0.80;
    const ax = a.x + a.w * (1 - inset) * 0.5, aw = a.w * inset;
    const bx = b.x + b.w * (1 - inset) * 0.5, bw = b.w * inset;
    return ax < bx + bw && ax + aw > bx && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  draw(ctx, track, cw, ch) {
    // Draw far-to-near so nearer objects render on top
    const sorted = this.items.slice().sort((a, b) => a.depth - b.depth);
    for (const o of sorted) o.draw(ctx, track, cw, ch);
  }

  clear() { this.items = []; }
}


// ── HUD controller ───────────────────────────────────────────
class HUD {
  constructor() {
    this.el       = document.getElementById('hud');
    this.scoreEl  = document.getElementById('hud-score');
    this.distEl   = document.getElementById('hud-dist');
    this.levelEl  = document.getElementById('hud-level');
    this.comboEl  = document.getElementById('hud-combo');
    this.nosFill  = document.getElementById('nos-fill');
    this.nosReady = document.getElementById('nos-ready');
    this._lastScore = 0;
    this._popTid    = null;
  }

  show() { this.el.classList.remove('hud-off'); }
  hide() { this.el.classList.add('hud-off'); }

  setScore(v) {
    const s = Math.floor(v);
    this.scoreEl.textContent = s;
    // Pop animation on significant score change
    if (s - this._lastScore >= 10) {
      this.scoreEl.classList.add('score-pop');
      if (this._popTid) clearTimeout(this._popTid);
      this._popTid = setTimeout(() => this.scoreEl.classList.remove('score-pop'), 120);
      this._lastScore = s;
    }
  }
  setDist(v) { this.distEl.textContent = Math.floor(v) + ' m'; }
  setLevel(name) { this.levelEl.textContent = name; }
  setCombo(level, count) {
    if (level > 0) {
      const names = ['', 'x2', 'x3', 'x5', 'x8', 'x10'];
      this.comboEl.textContent = `${names[level]} ${count}`;
      this.comboEl.classList.remove('hud-combo-off');
      this.comboEl.classList.add('hud-combo-on');
    } else {
      this.comboEl.classList.remove('hud-combo-on');
      this.comboEl.classList.add('hud-combo-off');
    }
  }

  setNOS(charge, active) {
    const pct  = clamp(charge, 0, 100);
    this.nosFill.style.width = pct + '%';
    this.nosFill.classList.remove('nos-charged', 'nos-active');
    if (active)       this.nosFill.classList.add('nos-active');
    else if (pct >= 100) this.nosFill.classList.add('nos-charged');

    // Ready hint
    if (pct >= 100 && !active) {
      this.nosReady.classList.remove('nos-ready-off');
      this.nosReady.classList.add('nos-ready-show');
    } else {
      this.nosReady.classList.remove('nos-ready-show');
      if (pct < 98) this.nosReady.classList.add('nos-ready-off');
    }
  }
}

// ── Screen Manager ───────────────────────────────────────────
class Screens {
  constructor() {
    this.map = {
      loading:  document.getElementById('screen-loading'),
      menu:     document.getElementById('screen-menu'),
      tutorial: document.getElementById('screen-tutorial'),
      pause:    document.getElementById('screen-pause'),
      gameover: document.getElementById('screen-gameover'),
    };
    this.cur = 'loading';
  }

  show(name) {
    if (this.cur) this.map[this.cur]?.classList.remove('active');
    this.cur = name || null;
    if (name) this.map[name]?.classList.add('active');
  }

  hide() { this.show(null); }
}

// ── Toast ────────────────────────────────────────────────────
class Toast {
  constructor() {
    this.el   = document.getElementById('toast');
    this.txt  = document.getElementById('toast-text');
    this._tid = null;
  }

  show(msg, ms = 1600) {
    if (this._tid) clearTimeout(this._tid);
    this.txt.textContent = msg;
    this.el.classList.remove('toast-off', 'toast-show');
    void this.el.offsetWidth; // reflow
    this.el.classList.add('toast-show');
    this._tid = setTimeout(() => {
      this.el.classList.remove('toast-show');
      setTimeout(() => this.el.classList.add('toast-off'), 200);
    }, ms);
  }
}


// ── Game ─────────────────────────────────────────────────────
class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx    = this.canvas.getContext('2d');
    this.dpr    = 1;
    this.cw     = 0;
    this.ch     = 0;

    // State
    this.state   = 'LOADING'; // LOADING | MENU | PLAYING | PAUSED | GAMEOVER

    // Systems
    this.track    = new Track();
    this.player   = new Player();
    this.objects  = new ObjectManager();
    this.particles = new Particles();
    this.input    = new Input();
    this.audio    = new AudioSystem();
    this.hud      = new HUD();
    this.screens  = new Screens();
    this.toast    = new Toast();

    // Game vars
    this.score     = 0;
    this.distance  = 0;
    this.speed     = CFG.SPEED_INIT;
    this.spawnRate = CFG.SPAWN_INIT;
    this.hazRatio  = CFG.HAZ_INIT;
    this.nosCharge = 0;
    this.nosActive = false;
    this.elapsed   = 0;
    this.level     = 1;
    this.best      = 0;

    this._lastTime = 0;
    this._sparkAcc = 0;

    // Menu idle anim
    this._idleT = 0;

    // Floating menu particles
    this._menuParticles = Array.from({ length: 20 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.02,
      vy: -Math.random() * 0.03 - 0.01,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.3 + 0.1,
      phase: Math.random() * Math.PI * 2,
    }));

    // Screen effects
    this._shakeT    = 0;   // remaining shake time
    this._shakeAmp  = 0;   // shake amplitude in px
    this._flashT    = 0;   // screen flash timer
    this._flashColor = 'rgba(255,59,48,0.3)';
    this._pulseT    = 0;   // NOS pulse scale timer

    // Combo tracking
    this.comboCount      = 0;
    this.comboLevel      = 0;   // 0=none, 1=x2, 2=x3, 3=x5, etc.
    this.comboTimer      = 0;   // time since last collect
    this.comboMultiplier = 1;
    this.lastCollectTime = 0;
    this.comboDisplayT   = 0;   // animation timer for combo display
    this._itemsCollected = 0;   // total items collected this run
  }

  init() {
    this.best = parseInt(localStorage.getItem('hayde_best') || '0', 10);
    this._refreshBestUI();

    this._resize();
    this.audio.boot();
    this.input.init();
    this._bindUI();
    this.screens.show('loading');
    this.hud.hide();

    // Loading screen: tap or auto-transition to menu
    const loadingEl = document.getElementById('screen-loading');
    const goToMenu = () => {
      if (this.state !== 'LOADING') return;
      this.audio.boot();
      this.audio.resume();
      this.state = 'MENU';
      this.screens.show('menu');
    };
    loadingEl.addEventListener('click', goToMenu);
    loadingEl.addEventListener('touchend', (e) => { e.preventDefault(); goToMenu(); }, { passive: false });

    requestAnimationFrame(ts => this._loop(ts));
  }

  // ── UI wiring ───────────────────────────────────────────────
  _bindUI() {
    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      let fired = false;
      const handler = (e) => {
        if (fired) return;
        fired = true;
        e.preventDefault();
        fn();
        setTimeout(() => fired = false, 400);
      };
      el.addEventListener('touchend', handler, { passive: false });
      el.addEventListener('click', handler);
    };

    on('btn-play',       () => this._startGame());
    on('btn-how',        () => this.screens.show('tutorial'));
    on('btn-tut-go',     () => this._startGame());
    on('btn-pause',      () => this._pause());
    on('btn-resume',     () => this._resume());
    on('btn-pause-menu', () => this._goMenu());
    on('btn-restart',    () => this._startGame());
    on('btn-go-menu',    () => this._goMenu());
    on('nos-btn',        () => this._tryNOS());

    this.input.onSwipe('left',  () => this._left());
    this.input.onSwipe('right', () => this._right());
    this.input.onSwipe('up',    () => this._up());
    this.input.onSwipe('down',  () => this._down());
    this.input.onTap(e          => this._tap(e));

    window.addEventListener('resize',            () => this._resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this._resize(), 120));

    // Android back button: pause or go to menu instead of closing app
    if (window.Capacitor?.isNativePlatform()) {
      try {
        Capacitor.Plugins.App.addListener('backButton', () => {
          if (this.state === 'PLAYING') this._pause();
          else if (this.state === 'PAUSED') this._goMenu();
          else if (this.state === 'GAMEOVER') this._goMenu();
        });
      } catch (_) {}
    }
  }

  // ── Resize ──────────────────────────────────────────────────
  _resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2× for perf
    this.cw  = window.innerWidth;
    this.ch  = window.innerHeight;
    this.canvas.width  = this.cw * this.dpr;
    this.canvas.height = this.ch * this.dpr;
    this.canvas.style.width  = this.cw + 'px';
    this.canvas.style.height = this.ch + 'px';
  }

  // ── Gameplay actions ─────────────────────────────────────────
  _left()  { if (this.state !== 'PLAYING') return; this.audio.resume(); if (this.player.moveLeft()) HapticsHelper.click(); }
  _right() { if (this.state !== 'PLAYING') return; this.audio.resume(); if (this.player.moveRight()) HapticsHelper.click(); }
  _up()    {
    if (this.state !== 'PLAYING') return;
    this.audio.resume();
    if (this.player.jump()) { this.audio.jump(); HapticsHelper.click(); }
  }
  _down()  {
    if (this.state !== 'PLAYING') return;
    this.audio.resume();
    if (this.player.slide()) { this.audio.slide(); HapticsHelper.click(); }
    this._tryNOS();
  }
  _tap(e) {
    this.audio.resume();
    if (this.state !== 'PLAYING') return;
    // Tap bottom-right corner → NOS
    if (e.x > this.cw * 0.65 && e.y > this.ch * 0.65) this._tryNOS();
  }
  _tryNOS() {
    if (this.state !== 'PLAYING') return;
    if (this.nosCharge >= CFG.NOS_MIN && !this.nosActive) {
      this.nosActive = true;
      this.audio.haydeNOS();
      HapticsHelper.heavy();
      this._pulse();
      this._flash('rgba(0,212,255,0.15)', 0.12);
    }
  }

  // ── Screen effects ──────────────────────────────────────────
  _shake(amp, dur) { this._shakeAmp = amp; this._shakeT = dur; }
  _flash(color, dur) { this._flashColor = color; this._flashT = dur; }
  _pulse() { this._pulseT = 0.2; }

  // ── Theme helper ─────────────────────────────────────────────
  _getTheme() {
    return CFG.LEVEL_THEMES[(this.level - 1) % CFG.LEVEL_THEMES.length];
  }

  // ── State transitions ─────────────────────────────────────────
  _startGame() {
    this.score     = 0;
    this.distance  = 0;
    this.speed     = CFG.SPEED_INIT;
    this.spawnRate = CFG.SPAWN_INIT;
    this.hazRatio  = CFG.HAZ_INIT;
    this.nosCharge = 0;
    this.nosActive = false;
    this.elapsed   = 0;
    this.level     = 1;

    this.comboCount      = 0;
    this.comboLevel      = 0;
    this.comboTimer      = 0;
    this.comboMultiplier = 1;
    this.lastCollectTime = 0;
    this.comboDisplayT   = 0;
    this._itemsCollected = 0;

    this.player   = new Player();
    this.objects.reset();
    this.particles.clear();

    this.screens.hide();
    this.hud.show();
    this.hud.setScore(0);
    this.hud.setDist(0);
    this.hud.setNOS(0, false);
    this.state = 'PLAYING';
    this.audio.resume();
    WakeLock.acquire();
  }

  _pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    WakeLock.release();
    document.getElementById('pause-score').textContent = Math.floor(this.score);
    this.screens.show('pause');
  }

  _resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.screens.hide();
    WakeLock.acquire();
  }

  _goMenu() {
    this.state = 'MENU';
    WakeLock.release();
    this.screens.show('menu');
    this.hud.hide();
    this._refreshBestUI();
  }

  _gameOver() {
    this.state     = 'GAMEOVER';
    this.nosActive = false;
    WakeLock.release();
    this.player.die();
    this.audio.die();
    HapticsHelper.error();
    this._shake(12, 0.5);
    this._flash('rgba(255,59,48,0.35)', 0.18);

    const finalScore = Math.floor(this.score);
    const finalDist  = Math.floor(this.distance);
    const finalLevel = this.level;
    const finalItems = this.player.collected.length > 0 ? this._itemsCollected : 0;
    const isNewBest  = finalScore > this.best;

    if (isNewBest) {
      this.best = finalScore;
      localStorage.setItem('hayde_best', this.best);
    }

    // Reset display values
    const scoreEl = document.getElementById('go-score');
    const distEl  = document.getElementById('go-dist');
    const levelEl = document.getElementById('go-level');
    const itemsEl = document.getElementById('go-items');
    const bestEl  = document.getElementById('go-best');
    const newBestEl = document.getElementById('go-new-best');

    scoreEl.textContent = '0';
    distEl.textContent  = '0 m';
    levelEl.textContent = '1';
    itemsEl.textContent = '0';
    bestEl.textContent  = this.best;
    newBestEl.classList.toggle('go-new-best-off', !isNewBest);

    setTimeout(() => {
      this.screens.show('gameover');
      this.hud.hide();

      // Counting animation
      const duration = 1200;
      const startTime = performance.now();
      const animate = (now) => {
        const t = clamp((now - startTime) / duration, 0, 1);
        const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
        scoreEl.textContent = Math.floor(finalScore * ease);
        distEl.textContent  = Math.floor(finalDist * ease) + ' m';
        levelEl.textContent = Math.floor(1 + (finalLevel - 1) * ease);
        itemsEl.textContent = Math.floor(finalItems * ease);
        if (t < 1) requestAnimationFrame(animate);
        else if (isNewBest) HapticsHelper.success();
      };
      requestAnimationFrame(animate);
    }, 900);
  }

  _refreshBestUI() {
    document.getElementById('menu-best').textContent = this.best;
  }

  // ── Main loop ─────────────────────────────────────────────────
  _loop(ts) {
    if (!this._lastTime) this._lastTime = ts;
    const dt = clamp((ts - this._lastTime) / 1000, 0, 0.05);
    this._lastTime = ts;

    this._update(dt);
    this._render(dt);

    requestAnimationFrame(t => this._loop(t));
  }

  // ── Update ────────────────────────────────────────────────────
  _update(dt) {
    if (this.state === 'GAMEOVER') {
      // Keep player death anim + particles going briefly
      this.player.update(dt);
      this.particles.update(dt);
      return;
    }
    if (this.state === 'MENU' || this.state === 'LOADING') {
      this._idleT += dt;
      return;
    }
    if (this.state !== 'PLAYING') return;

    this.elapsed += dt;

    // ── Progression ──
    const prevLevel   = this.level;
    this.speed     = Math.min(CFG.SPEED_MAX,  CFG.SPEED_INIT  + this.elapsed * CFG.SPEED_INC);
    this.spawnRate = Math.min(CFG.SPAWN_MAX,  CFG.SPAWN_INIT  + this.elapsed * CFG.SPAWN_INC);
    this.hazRatio  = Math.min(CFG.HAZ_MAX,    CFG.HAZ_INIT    + this.elapsed * 0.0018);
    this.objects.interval = 1 / this.spawnRate;
    this.level     = Math.floor(this.elapsed / 12) + 1;
    if (this.level > prevLevel) {
      const theme = this._getTheme();
      this.toast.show(`Level ${this.level} — ${theme.name} 🔥`);
      this.audio.motivate(this.level);
    }

    // ── NOS ──
    const effSpeed = this.nosActive ? this.speed * CFG.NOS_SPEED : this.speed;
    if (this.nosActive) {
      this.nosCharge -= CFG.NOS_DRAIN * dt;
      if (this.nosCharge <= 0) {
        this.nosCharge = 0;
        this.nosActive = false;
        this.audio.nosEmpty();
      }
    }

    // ── Scoring ──
    const speedFactor = effSpeed / CFG.SPEED_INIT;
    this.score    += CFG.SCORE_DIST * speedFactor * (this.nosActive ? CFG.NOS_SCORE : 1) * dt;
    this.distance += effSpeed * 7 * dt;

    // ── Update player ──
    this.player.update(dt);

    // ── Update objects ──
    this.objects.update(dt, effSpeed, this.hazRatio);

    // ── Collisions ──
    const { collected, hit } = this.objects.checkCollisions(this.player, this.track, this.cw, this.ch);
    for (const item of collected) {
      const { emoji, special } = item;
      const pos = this.track.project(this.player.laneT, CFG.PLAYER_D, this.cw, this.ch);
      this.particles.collectPop(pos.x, pos.y - this.ch * 0.07, emoji);
      this.player.collect(emoji);
      this._itemsCollected++;

      // Combo tracking: collecting within 2.5 seconds keeps combo alive
      const now = this.elapsed;
      if (now - this.lastCollectTime < 2.5) {
        this.comboCount++;
      } else {
        this.comboCount = 1;
      }
      this.lastCollectTime = now;

      // Combo levels: 3→x2, 5→x3, 8→x5, 12→x8, 18→x10
      const prevLevel = this.comboLevel;
      if      (this.comboCount >= 18) { this.comboLevel = 5; this.comboMultiplier = 10; }
      else if (this.comboCount >= 12) { this.comboLevel = 4; this.comboMultiplier = 8; }
      else if (this.comboCount >= 8)  { this.comboLevel = 3; this.comboMultiplier = 5; }
      else if (this.comboCount >= 5)  { this.comboLevel = 2; this.comboMultiplier = 3; }
      else if (this.comboCount >= 3)  { this.comboLevel = 1; this.comboMultiplier = 2; }
      else                            { this.comboLevel = 0; this.comboMultiplier = 1; }

      // Trigger combo effects on level-up
      if (this.comboLevel > prevLevel && this.comboLevel > 0) {
        this.audio.comboSound(this.comboLevel);
        HapticsHelper.success();
        const comboFlashColors = ['', 'rgba(255,214,10,0.12)', 'rgba(255,149,0,0.12)', 'rgba(255,59,48,0.12)', 'rgba(191,90,242,0.12)', 'rgba(255,45,85,0.15)'];
        this._flash(comboFlashColors[this.comboLevel] || 'rgba(255,214,10,0.12)', 0.15);
        const comboNames = ['', 'x2 COMBO!', 'x3 SUPER!', 'x5 MEGA!', 'x8 ULTRA!', 'x10 LEGENDARY!'];
        const comboEmojis = ['', '🔥', '💥', '⚡', '🌟', '👑'];
        this.toast.show(`${comboEmojis[this.comboLevel]} ${comboNames[this.comboLevel]} ${comboEmojis[this.comboLevel]}`, 1400);
        this.comboDisplayT = 2.0; // show combo HUD for 2s
        // Bonus sparks burst for combos
        const theme = this._getTheme();
        const [tnr, tng, tnb] = theme.nos;
        const comboCols = [`rgb(${tnr},${tng},${tnb})`, '#ffd60a', '#ff3b30', '#ffffff'];
        this.particles.sparks(pos.x, pos.y - this.ch * 0.1, 12 + this.comboLevel * 6, 1.5, comboCols);
      }

      const scoreGain = special ? CFG.SCORE_SPECIAL : CFG.SCORE_ITEM;
      this.score    += scoreGain * this.comboMultiplier;
      this.nosCharge = clamp(this.nosCharge + (special ? CFG.NOS_SPECIAL : CFG.NOS_CHARGE), 0, CFG.NOS_MAX);

      if (special) {
        this.toast.show(`מבצע! ${emoji} +${CFG.SCORE_SPECIAL * this.comboMultiplier} pts ⭐`, 1200);
        this.audio.levelUp();
        HapticsHelper.medium();
      } else {
        this.audio.haydeCollect();
        HapticsHelper.light();
      }
    }

    // Decay combo timer
    if (this.elapsed - this.lastCollectTime > 2.5 && this.comboCount > 0) {
      this.comboCount = 0;
      this.comboLevel = 0;
      this.comboMultiplier = 1;
    }
    if (this.comboDisplayT > 0) this.comboDisplayT -= dt;
    if (hit) { this.audio.hayde(); this._gameOver(); return; }

    // ── Sparks ──
    this._sparkAcc += dt;
    const sparkInterval = 1 / 28;
    while (this._sparkAcc >= sparkInterval) {
      this._sparkAcc -= sparkInterval;
      const pos     = this.track.project(this.player.laneT, CFG.PLAYER_D, this.cw, this.ch);
      const cartH   = this.ch * 0.115;
      const sx      = pos.x;
      const sy      = pos.y + cartH * 0.46;
      const sf      = clamp((speedFactor - 1) / 4, 0, 1);
      const cnt     = Math.floor(lerp(CFG.SPARK_MIN, CFG.SPARK_MAX, sf));

      if (cnt > 0) {
        const theme = this._getTheme();
        const [tnr, tng, tnb] = theme.nos;
        const nosHex = `#${tnr.toString(16).padStart(2,'0')}${tng.toString(16).padStart(2,'0')}${tnb.toString(16).padStart(2,'0')}`;
        const cols = this.nosActive
          ? [nosHex, '#bf5af2', '#ffffff', `rgb(${tnr},${tng},${tnb})`]
          : ['#ffffff', '#d8e0f0', '#b0c0d8', '#e8ecf8'];
        this.particles.sparks(sx, sy, cnt, this.nosActive ? 1.4 : 1, cols);
      }
      if (this.nosActive) this.particles.nosTrail(sx, sy - cartH * 0.5);
    }

    // ── Particles ──
    this.particles.update(dt);

    // ── HUD ──
    this.hud.setScore(this.score);
    this.hud.setDist(this.distance);
    this.hud.setNOS(this.nosCharge, this.nosActive);
    this.hud.setLevel(this._getTheme().name);
    this.hud.setCombo(this.comboLevel, this.comboCount);
  }

  // ── Render ────────────────────────────────────────────────────
  _render(dt) {
    const ctx = this.ctx;
    const { cw, ch, dpr } = this;

    // Update screen effects timers
    if (this._shakeT > 0) this._shakeT -= dt;
    if (this._flashT > 0) this._flashT -= dt;
    if (this._pulseT > 0) this._pulseT -= dt;

    // Apply screen shake + NOS pulse via canvas transform
    let sx = 0, sy = 0, sc = 1;
    if (this._shakeT > 0) {
      const intensity = this._shakeAmp * (this._shakeT / 0.5);
      sx = (Math.random() - 0.5) * intensity * 2;
      sy = (Math.random() - 0.5) * intensity * 2;
    }
    if (this._pulseT > 0) {
      sc = 1 + 0.02 * (this._pulseT / 0.2);
    }

    // Reset transform with shake + pulse applied
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, sx * dpr + (cw * dpr * (1 - sc) * 0.5), sy * dpr + (ch * dpr * (1 - sc) * 0.5));
    ctx.clearRect(-20, -20, cw + 40, ch + 40);

    // Determine render speed for track animation
    const effSpeed = (this.state === 'PLAYING' && this.nosActive)
      ? this.speed * CFG.NOS_SPEED
      : this.speed;
    const trackSpeed = (this.state === 'PLAYING') ? effSpeed
      : (this.state === 'MENU' || this.state === 'PAUSED' || this.state === 'LOADING') ? 0.12
      : 0.06; // slow on gameover

    const theme = this._getTheme();
    this.track.draw(ctx, cw, ch, dt, trackSpeed, this.nosActive && this.state === 'PLAYING', theme, this.level);

    if (this.state === 'MENU' || this.state === 'LOADING') {
      this._renderMenuIdle(ctx, cw, ch);
      return;
    }

    // Game objects (behind player)
    this.objects.draw(ctx, this.track, cw, ch);

    // Particles (sparks)
    this.particles.draw(ctx);

    // Player cart
    this.player.draw(ctx, this.track, cw, ch);

    // Combo counter display
    if (this.comboLevel > 0 && this.comboDisplayT > 0) {
      const comboAlpha = clamp(this.comboDisplayT / 0.5, 0, 1);
      const comboScale = 1 + Math.sin(this.elapsed * 8) * 0.05;
      const comboNames = ['', 'x2', 'x3', 'x5', 'x8', 'x10'];
      const comboColors = ['', '#ffd60a', '#ff9500', '#ff3b30', '#bf5af2', '#ff2d55'];
      ctx.save();
      ctx.globalAlpha = comboAlpha;
      ctx.translate(cw * 0.5, ch * 0.18);
      ctx.scale(comboScale, comboScale);
      ctx.font = `bold ${Math.min(cw * 0.08, 52)}px ${getComputedStyle(document.body).fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = comboColors[this.comboLevel] || '#ffd60a';
      ctx.shadowColor = comboColors[this.comboLevel] || '#ffd60a';
      ctx.shadowBlur = 20;
      ctx.fillText(`${comboNames[this.comboLevel]} COMBO`, 0, 0);
      ctx.shadowBlur = 0;
      ctx.font = `bold ${Math.min(cw * 0.04, 28)}px ${getComputedStyle(document.body).fontFamily}`;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = comboAlpha * 0.7;
      ctx.fillText(`${this.comboCount} items`, 0, Math.min(cw * 0.06, 38));
      ctx.restore();
    }

    // NOS screen overlay
    if (this.nosActive) {
      const [nr, ng, nb] = theme.nos;
      ctx.fillStyle = `rgba(${nr},${ng},${nb},0.035)`;
      ctx.fillRect(0, 0, cw, ch);
      // Edge vignette in NOS color
      const vg = ctx.createRadialGradient(cw * 0.5, ch * 0.5, ch * 0.2, cw * 0.5, ch * 0.5, ch * 0.85);
      vg.addColorStop(0, `rgba(${nr},${ng},${nb},0)`);
      vg.addColorStop(1, `rgba(${nr},${ng},${nb},0.08)`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, cw, ch);
    }

    // Screen flash overlay (death, combo, NOS)
    if (this._flashT > 0) {
      ctx.save();
      ctx.globalAlpha = this._flashT / 0.2;
      ctx.fillStyle = this._flashColor;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }
  }

  _renderMenuIdle(ctx, cw, ch) {
    const t  = this._idleT;
    const cx = cw * 0.5;

    // Floating ambient particles
    const theme = this._getTheme();
    const [gr, gg, gb] = theme.grid;
    for (const p of this._menuParticles) {
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
      if (p.x < -0.05 || p.x > 1.05) p.x = Math.random();
      const flicker = 0.6 + Math.sin(t * 2 + p.phase) * 0.4;
      ctx.save();
      ctx.globalAlpha = p.alpha * flicker;
      ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
      ctx.shadowBlur = p.size * 3;
      ctx.shadowColor = `rgb(${gr},${gg},${gb})`;
      ctx.beginPath();
      ctx.arc(p.x * cw, p.y * ch, p.size, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Animated idle cart in the distance
    const cy = ch * 0.60 + Math.sin(t * 1.4) * 8;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.translate(cx, cy);
    ctx.font = `${Math.min(cw * 0.25, ch * 0.12)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛒', 0, 0);
    ctx.restore();
  }
}

// ── Bootstrap ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});
