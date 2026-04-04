'use strict';
/* ============================================================
   HAYDE — Supermarket Runner
   Temple Run-inspired · Supermarket Cart · Apple Design
   ============================================================ */

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

  // Collectibles - much more variety
  ITEMS: [
    '🍎','🍞','🥛','🧀','🍌','🥚','🥫','🧃','🍊','🫐','🍋','🥕','🫙','🥩',
    '🍕','🍔','🌮','🍜','🍣','🍩','🍫','🍬','🥐','🍿','🥜','🍇','🍓',
    '🫒','🥦','🥔','🧁','🍦','🥗','🥟','🥪','🧆','🥘','🍲','🥧','🥞',
    '🫔','🥙','🌯','🥡','🍱','🍛','🍝','🥓','🍗','🥩','🧇','🫓'
  ],

  // Hazard food items (shown on dangerous obstacles)
  HAZARD_ITEMS: ['🍄','🧪','🐡','🦠','☢️','🤢','💀','🤮','🧟','🫢'],

  // Level visual themes (sky1, sky2, gridRGB, glowRGB, nosRGB)
  LEVEL_THEMES: [
    { name:'Deep Space',   sky1:'#030306', sky2:'#07071a', grid:[90,110,255],  glow:[0,113,227],   nos:[0,212,255]  },
    { name:'Nano Banana',  sky1:'#0a0800', sky2:'#181200', grid:[255,200,0],   glow:[220,160,0],   nos:[255,230,0]  },
    { name:'Matrix',       sky1:'#020c02', sky2:'#041204', grid:[0,220,80],    glow:[0,180,60],    nos:[0,255,120]  },
    { name:'Vaporwave',    sky1:'#0a0210', sky2:'#180430', grid:[220,60,255],  glow:[160,0,240],   nos:[255,0,200]  },
    { name:'Danger Zone',  sky1:'#0a0202', sky2:'#180404', grid:[255,60,60],   glow:[220,0,0],     nos:[255,80,0]   },
    { name:'Ocean Deep',   sky1:'#000a0c', sky2:'#001520', grid:[0,200,220],   glow:[0,150,200],   nos:[0,230,255]  },
    { name:'Sunset',       sky1:'#0c0502', sky2:'#1a0a04', grid:[255,130,30],  glow:[220,80,0],    nos:[255,160,0]  },
    { name:'Toxic',        sky1:'#020a02', sky2:'#041404', grid:[100,255,50],  glow:[80,220,0],    nos:[150,255,0]  },
  ],
};


// ── Audio ────────────────────────────────────────────────────
class AudioSystem {
  constructor() {
    this.ctx = null;
  }

  boot() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {}
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _tone(freqs, type = 'sine', dur = 0.15, vol = 0.22, detuneSeq = []) {
    if (!this.ctx) return;
    freqs.forEach((f, i) => {
      try {
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.06);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.06 + dur);
        osc.start(this.ctx.currentTime + i * 0.06);
        osc.stop(this.ctx.currentTime  + i * 0.06 + dur + 0.01);
      } catch (_) {}
    });
  }

  jump()    { this._tone([340, 520], 'sine',     0.14, 0.18); }
  land()    { this._tone([130],      'triangle', 0.10, 0.22); }
  collect() { this._tone([660, 880], 'sine',     0.11, 0.18); }
  die()     { this._tone([220, 140, 90], 'sawtooth', 0.30, 0.38); }
  nos()     { this._tone([440, 660, 880, 1100], 'square', 0.08, 0.12); }
  levelUp() { this._tone([400, 520, 660, 880], 'sine', 0.18, 0.20); }

  // Random funny collect sounds - cycles through 5 variants
  collectRandom() {
    const v = rndInt(0, 4);
    if (v === 0)      this._tone([660, 880, 1100], 'sine',     0.11, 0.16);
    else if (v === 1) this._tone([523, 659, 784], 'sine',      0.10, 0.18);
    else if (v === 2) this._tone([880, 660], 'triangle',       0.08, 0.20);
    else if (v === 3) this._tone([440, 550, 660, 880], 'sine', 0.07, 0.15);
    else              this._tone([1047, 1319], 'sine',         0.09, 0.17);
  }

  slide() { this._tone([200, 160, 120], 'sawtooth', 0.18, 0.15); }

  // Motivational fanfare - plays at score milestones
  motivate(level) {
    if (!this.ctx) return;
    const seqs = [
      [262, 330, 392, 523, 659, 784],
      [294, 370, 440, 587, 740, 880],
      [330, 415, 494, 659, 831, 988],
    ];
    const seq = seqs[level % seqs.length];
    seq.forEach((f, i) => {
      try {
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        const t = this.ctx.currentTime + i * 0.09;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.26);
      } catch(_) {}
    });
  }

  // Funny "uh oh" sound on near miss
  nearMiss() { this._tone([400, 350, 280], 'triangle', 0.12, 0.15); }

  // NOS depleted sound
  nosEmpty() { this._tone([300, 200, 120], 'sawtooth', 0.20, 0.18); }

  // Combo sound for collecting multiple items quickly
  combo() { this._tone([660, 880, 1100, 1320], 'sine', 0.10, 0.22); }

  // "Haaayyyydeeeeeee!!" — screamed collision shout
  hayde() {
    if (!this.ctx) return;
    try {
      const ac  = this.ctx;
      const now = ac.currentTime;

      // "H" — aspirated noise burst
      const nbuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.07), ac.sampleRate);
      const nd   = nbuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const nsrc = ac.createBufferSource();
      nsrc.buffer = nbuf;
      const nfilt = ac.createBiquadFilter();
      nfilt.type = 'bandpass'; nfilt.frequency.value = 2200; nfilt.Q.value = 0.8;
      const ngain = ac.createGain();
      ngain.gain.setValueAtTime(0.18, now);
      ngain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      nsrc.connect(nfilt); nfilt.connect(ngain); ngain.connect(ac.destination);
      nsrc.start(now); nsrc.stop(now + 0.08);

      // Voice oscillator (sawtooth = rich harmonics like a real voice)
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';

      // Pitch envelope: Haaay (ramps up) → d (brief dip) → eeeeee (soars up, funny)
      osc.frequency.setValueAtTime(260, now + 0.05);
      osc.frequency.linearRampToValueAtTime(310, now + 0.20);  // Haa
      osc.frequency.linearRampToValueAtTime(350, now + 0.55);  // aayyy
      osc.frequency.setValueAtTime(240, now + 0.65);           // d — percussive dip
      osc.frequency.linearRampToValueAtTime(460, now + 0.78);  // ee — big leap
      osc.frequency.linearRampToValueAtTime(620, now + 1.15);  // eeeee soaring up (comedy peak)
      osc.frequency.linearRampToValueAtTime(480, now + 1.55);  // tail off

      // Vibrato LFO (kicks in after "H" for wobbly vocal effect)
      const lfo     = ac.createOscillator();
      const lfoGain = ac.createGain();
      lfo.type = 'sine'; lfo.frequency.value = 5.8;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      lfoGain.gain.setValueAtTime(0, now);
      lfoGain.gain.linearRampToValueAtTime(22, now + 0.30);   // vibrato builds in
      lfoGain.gain.linearRampToValueAtTime(30, now + 0.80);   // goes wild on "eeee"

      // Formant filters to sculpt vowels (aa → ee transition)
      const f1 = ac.createBiquadFilter();
      f1.type = 'bandpass'; f1.Q.value = 4;
      f1.frequency.setValueAtTime(780, now + 0.05);           // "aa" first formant
      f1.frequency.linearRampToValueAtTime(300, now + 0.75);  // → "ee" first formant

      const f2 = ac.createBiquadFilter();
      f2.type = 'bandpass'; f2.Q.value = 7;
      f2.frequency.setValueAtTime(1200, now + 0.05);          // "aa" second formant
      f2.frequency.linearRampToValueAtTime(2500, now + 0.75); // → "ee" second formant

      // Master gain envelope
      const mg = ac.createGain();
      mg.gain.setValueAtTime(0, now);
      mg.gain.linearRampToValueAtTime(0.60, now + 0.08);      // snap attack
      mg.gain.setValueAtTime(0.55, now + 0.62);
      mg.gain.linearRampToValueAtTime(0.50, now + 1.10);
      mg.gain.exponentialRampToValueAtTime(0.001, now + 1.65);

      osc.connect(f1); f1.connect(f2); f2.connect(mg); mg.connect(ac.destination);

      lfo.start(now);       lfo.stop(now + 1.70);
      osc.start(now + 0.05); osc.stop(now + 1.68);
    } catch(_) {}
  }

  // Quick mini "Hayde!" on item collect — short, punchy, cheerful
  haydeCollect() {
    if (!this.ctx) return;
    try {
      const ac  = this.ctx;
      const now = ac.currentTime;

      // Short aspirated "H"
      const nbuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.04), ac.sampleRate);
      const nd   = nbuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const nsrc = ac.createBufferSource();
      nsrc.buffer = nbuf;
      const nfilt = ac.createBiquadFilter();
      nfilt.type = 'bandpass'; nfilt.frequency.value = 2800; nfilt.Q.value = 0.8;
      const ngain = ac.createGain();
      ngain.gain.setValueAtTime(0.14, now);
      ngain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      nsrc.connect(nfilt); nfilt.connect(ngain); ngain.connect(ac.destination);
      nsrc.start(now); nsrc.stop(now + 0.05);

      // Quick vocal sweep — higher pitch, shorter
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now + 0.03);
      osc.frequency.linearRampToValueAtTime(400, now + 0.15);  // Hay
      osc.frequency.setValueAtTime(300, now + 0.22);            // d
      osc.frequency.linearRampToValueAtTime(520, now + 0.35);   // ee!
      osc.frequency.linearRampToValueAtTime(420, now + 0.50);   // tail

      // Light vibrato
      const lfo     = ac.createOscillator();
      const lfoGain = ac.createGain();
      lfo.type = 'sine'; lfo.frequency.value = 6.5;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      lfoGain.gain.setValueAtTime(0, now);
      lfoGain.gain.linearRampToValueAtTime(15, now + 0.20);

      // Formants
      const f1 = ac.createBiquadFilter();
      f1.type = 'bandpass'; f1.Q.value = 3;
      f1.frequency.setValueAtTime(780, now + 0.03);
      f1.frequency.linearRampToValueAtTime(350, now + 0.30);

      const f2 = ac.createBiquadFilter();
      f2.type = 'bandpass'; f2.Q.value = 5;
      f2.frequency.setValueAtTime(1300, now + 0.03);
      f2.frequency.linearRampToValueAtTime(2400, now + 0.30);

      // Gain envelope — punchy and short
      const mg = ac.createGain();
      mg.gain.setValueAtTime(0, now);
      mg.gain.linearRampToValueAtTime(0.40, now + 0.05);
      mg.gain.setValueAtTime(0.35, now + 0.25);
      mg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(f1); f1.connect(f2); f2.connect(mg); mg.connect(ac.destination);
      lfo.start(now);        lfo.stop(now + 0.58);
      osc.start(now + 0.03); osc.stop(now + 0.56);
    } catch(_) {}
  }

  // ULTRA "HAAAYYYYDDDEEEEE!!" on NOS — wild, high-energy, hilarious
  haydeNOS() {
    if (!this.ctx) return;
    try {
      const ac  = this.ctx;
      const now = ac.currentTime;

      // Big breathy "H" burst
      const nbuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.09), ac.sampleRate);
      const nd   = nbuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const nsrc = ac.createBufferSource();
      nsrc.buffer = nbuf;
      const nfilt = ac.createBiquadFilter();
      nfilt.type = 'bandpass'; nfilt.frequency.value = 2600; nfilt.Q.value = 0.6;
      const ngain = ac.createGain();
      ngain.gain.setValueAtTime(0.25, now);
      ngain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      nsrc.connect(nfilt); nfilt.connect(ngain); ngain.connect(ac.destination);
      nsrc.start(now); nsrc.stop(now + 0.10);

      // DUAL oscillators for thick, screaming voice
      const osc1 = ac.createOscillator();
      const osc2 = ac.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'square';  // adds buzzy overlay

      // osc1: main voice — starts high, goes CRAZY high
      osc1.frequency.setValueAtTime(300, now + 0.06);
      osc1.frequency.linearRampToValueAtTime(380, now + 0.18);  // HAA
      osc1.frequency.linearRampToValueAtTime(440, now + 0.45);  // AAYYY
      osc1.frequency.setValueAtTime(280, now + 0.52);            // D — percussive drop
      osc1.frequency.linearRampToValueAtTime(600, now + 0.68);   // EE — rocket up!
      osc1.frequency.linearRampToValueAtTime(880, now + 1.10);   // EEEEEE! soaring screech
      osc1.frequency.linearRampToValueAtTime(660, now + 1.50);   // tail wobble down

      // osc2: harmony, slightly detuned for comedic thickness
      osc2.frequency.setValueAtTime(308, now + 0.06);
      osc2.frequency.linearRampToValueAtTime(388, now + 0.18);
      osc2.frequency.linearRampToValueAtTime(448, now + 0.45);
      osc2.frequency.setValueAtTime(286, now + 0.52);
      osc2.frequency.linearRampToValueAtTime(610, now + 0.68);
      osc2.frequency.linearRampToValueAtTime(892, now + 1.10);
      osc2.frequency.linearRampToValueAtTime(672, now + 1.50);

      // WILD vibrato — fast and wobbly (hilarious)
      const lfo     = ac.createOscillator();
      const lfoG1   = ac.createGain();
      const lfoG2   = ac.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(5, now);
      lfo.frequency.linearRampToValueAtTime(9, now + 0.80);   // vibrato speeds up!
      lfo.frequency.linearRampToValueAtTime(12, now + 1.20);  // goes nuts
      lfo.connect(lfoG1); lfoG1.connect(osc1.frequency);
      lfo.connect(lfoG2); lfoG2.connect(osc2.frequency);
      lfoG1.gain.setValueAtTime(0, now);
      lfoG1.gain.linearRampToValueAtTime(30, now + 0.35);
      lfoG1.gain.linearRampToValueAtTime(55, now + 0.90);     // huge wobble
      lfoG2.gain.setValueAtTime(0, now);
      lfoG2.gain.linearRampToValueAtTime(25, now + 0.35);
      lfoG2.gain.linearRampToValueAtTime(45, now + 0.90);

      // Formant filters — exaggerated vowels
      const f1 = ac.createBiquadFilter();
      f1.type = 'bandpass'; f1.Q.value = 5;
      f1.frequency.setValueAtTime(800, now + 0.06);
      f1.frequency.linearRampToValueAtTime(280, now + 0.70);

      const f2 = ac.createBiquadFilter();
      f2.type = 'bandpass'; f2.Q.value = 8;
      f2.frequency.setValueAtTime(1100, now + 0.06);
      f2.frequency.linearRampToValueAtTime(2800, now + 0.70);

      // Master gain — LOUD and proud
      const mg = ac.createGain();
      mg.gain.setValueAtTime(0, now);
      mg.gain.linearRampToValueAtTime(0.70, now + 0.08);
      mg.gain.setValueAtTime(0.65, now + 0.50);
      mg.gain.linearRampToValueAtTime(0.60, now + 1.10);
      mg.gain.exponentialRampToValueAtTime(0.001, now + 1.65);

      // osc2 gain — slightly quieter for texture
      const mg2 = ac.createGain();
      mg2.gain.setValueAtTime(0, now);
      mg2.gain.linearRampToValueAtTime(0.25, now + 0.08);
      mg2.gain.setValueAtTime(0.22, now + 0.50);
      mg2.gain.exponentialRampToValueAtTime(0.001, now + 1.65);

      osc1.connect(f1); f1.connect(f2); f2.connect(mg); mg.connect(ac.destination);
      osc2.connect(mg2); mg2.connect(ac.destination);

      lfo.start(now);        lfo.stop(now + 1.70);
      osc1.start(now + 0.06); osc1.stop(now + 1.68);
      osc2.start(now + 0.06); osc2.stop(now + 1.68);
    } catch(_) {}
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

  sparks(x, y, count, speedMult = 1, colors = ['#ff9f0a','#ffd60a','#ff6b35']) {
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

  draw(ctx, cw, ch, dt, speed, nosActive, theme) {
    // Fall back to default Deep Space theme if none provided
    const th = theme || CFG.LEVEL_THEMES[0];
    const cx    = cw * 0.5;
    const vpY   = ch * CFG.VP_Y;
    const nearY = ch * CFG.NEAR_Y;
    const nearH = cw * CFG.NEAR_HALF;
    const farH  = cw * CFG.FAR_HALF;

    // ── Sky / ceiling ───────────────────────────────────────
    const skyGrad = ctx.createLinearGradient(0, 0, 0, vpY * 1.8);
    skyGrad.addColorStop(0, th.sky1);
    skyGrad.addColorStop(1, th.sky2);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, ch);

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
    trkGrad.addColorStop(0,   '#08081e');
    trkGrad.addColorStop(0.4, '#0c0c24');
    trkGrad.addColorStop(1,   '#111132');
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
    ctx.fillStyle = '#060610';
    ctx.fillRect(0, nearY, cw, ch - nearY);
  }

  _ceilingLights(ctx, cw, ch, cx, vpY) {
    // Two perspective light strips running to vanishing point
    ctx.save();
    ctx.globalAlpha = 0.18;
    const lx = [cx - cw * 0.12, cx + cw * 0.12];
    lx.forEach(x => {
      const g = ctx.createLinearGradient(x, 0, cx, vpY);
      g.addColorStop(0, 'rgba(200,220,255,0.5)');
      g.addColorStop(1, 'rgba(200,220,255,0)');
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
    ctx.fillStyle = '#08080f';
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
      ctx.fillStyle = 'rgba(180,190,255,0.9)';
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
    const pos   = track.project(this.laneT, CFG.PLAYER_D, cw, ch);
    const bH    = ch * 0.115;
    const bW    = bH * 0.88;
    const slideScale = this.sliding ? 0.52 : 1;
    const cartH = bH * slideScale;
    const cartW = bW;
    const offY  = this.jumpHeight(ch);
    const x     = pos.x;
    const y     = pos.y - offY;

    ctx.save();
    ctx.translate(x, y);

    // Lean on lane change
    const lean = this.laneVel * 0.18;
    ctx.rotate(lean);

    // Squash on landing
    const squash = this.jumping ? 1 : (this.sliding ? 0.55 : 1);

    // Death shake
    if (this.dead && this.deathAge < 0.5) {
      const shake = (1 - this.deathAge * 2) * 7;
      ctx.translate(rnd(-shake, shake), rnd(-shake, shake));
      ctx.globalAlpha = Math.max(0.15, 1 - this.deathAge * 1.6);
    }

    this._drawCart(ctx, cartW, cartH, squash);
    ctx.restore();
  }

  _drawCart(ctx, w, h, squash) {
    const hw = w * 0.5;
    const hh = h * 0.5;

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(0, hh + h * 0.13, w * 0.52, h * 0.08, 0, 0, TAU);
    const sh = ctx.createRadialGradient(0, hh + h * 0.13, 0, 0, hh + h * 0.13, w * 0.52);
    sh.addColorStop(0, 'rgba(0,0,0,0.55)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fill();
    ctx.restore();

    // ── Basket (wire frame style) ─────────────────────────
    const bTop  = -hh * squash;
    const bBot  = hh * squash * 0.55;
    const bLeft = -hw * 0.88;
    const bRgt  =  hw * 0.88;
    const bW    = bRgt - bLeft;
    const bH    = bBot - bTop;

    // Basket fill (subtle tinted)
    ctx.beginPath();
    ctx.roundRect(bLeft, bTop, bW, bH, [5, 5, 3, 3]);
    const basketGrad = ctx.createLinearGradient(bLeft, bTop, bRgt, bBot);
    basketGrad.addColorStop(0, 'rgba(160,175,200,0.18)');
    basketGrad.addColorStop(0.5, 'rgba(140,155,185,0.12)');
    basketGrad.addColorStop(1, 'rgba(100,115,145,0.10)');
    ctx.fillStyle = basketGrad;
    ctx.fill();

    // Wire horizontal bars
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bLeft, bTop, bW, bH, [5, 5, 3, 3]);
    ctx.clip();
    const wireColor = 'rgba(180,195,220,0.55)';
    const wireW = Math.max(0.8, w * 0.018);
    ctx.strokeStyle = wireColor;
    ctx.lineWidth = wireW;
    const hBars = 4;
    for (let i = 0; i <= hBars; i++) {
      const wy = bTop + (bH * i / hBars);
      ctx.beginPath(); ctx.moveTo(bLeft, wy); ctx.lineTo(bRgt, wy); ctx.stroke();
    }
    const vBars = 5;
    for (let i = 0; i <= vBars; i++) {
      const vx = bLeft + (bW * i / vBars);
      ctx.beginPath(); ctx.moveTo(vx, bTop); ctx.lineTo(vx, bBot); ctx.stroke();
    }
    ctx.restore();

    // Basket border frame
    ctx.beginPath();
    ctx.roundRect(bLeft, bTop, bW, bH, [5, 5, 3, 3]);
    ctx.strokeStyle = 'rgba(200,215,240,0.80)';
    ctx.lineWidth = Math.max(1.2, w * 0.025);
    ctx.stroke();

    // Items inside basket
    if (this.collected && this.collected.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bLeft + 2, bTop + 2, bW - 4, bH - 4, 3);
      ctx.clip();
      const show = Math.min(this.collected.length, 3);
      const sz   = Math.min(w * 0.28, 14);
      for (let i = 0; i < show; i++) {
        ctx.font = `${sz}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const ix = bLeft + bW * 0.18 + i * bW * 0.29;
        ctx.fillText(this.collected[this.collected.length - 1 - i], ix, bTop + bH * 0.42);
      }
      ctx.restore();
    }

    // ── Handle bar ────────────────────────────────────────
    const hbY  = bTop - h * 0.095;
    const hbH  = h * 0.085;
    // Handle support posts
    ctx.strokeStyle = 'rgba(190,205,230,0.75)';
    ctx.lineWidth = Math.max(1, w * 0.022);
    [-hw * 0.55, hw * 0.55].forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, bTop);
      ctx.lineTo(px, hbY + hbH * 0.5);
      ctx.stroke();
    });
    // Handle bar grip
    const hbGrad = ctx.createLinearGradient(-hw * 0.6, hbY, -hw * 0.6, hbY + hbH);
    hbGrad.addColorStop(0, '#c8cfe0');
    hbGrad.addColorStop(0.4, '#e8ecf5');
    hbGrad.addColorStop(1, '#8890a8');
    ctx.beginPath();
    ctx.roundRect(-hw * 0.62, hbY, w * 0.62, hbH, 5);
    ctx.fillStyle = hbGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,230,255,0.55)';
    ctx.lineWidth = Math.max(0.8, w * 0.015);
    ctx.stroke();

    // ── Bottom frame / chassis ────────────────────────────
    const chasY = bBot;
    const chasH = h * 0.125;
    ctx.beginPath();
    ctx.roundRect(bLeft * 0.75, chasY, bW * 0.75, chasH, [0, 0, 3, 3]);
    const chasGrad = ctx.createLinearGradient(0, chasY, 0, chasY + chasH);
    chasGrad.addColorStop(0, '#6a7090');
    chasGrad.addColorStop(1, '#3a3e58');
    ctx.fillStyle = chasGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,170,200,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Accent glow stripe
    ctx.save();
    ctx.globalAlpha = 0.45;
    const acG = ctx.createLinearGradient(bLeft, 0, bRgt, 0);
    acG.addColorStop(0,   'rgba(0,113,227,0)');
    acG.addColorStop(0.35,'rgba(0,150,255,0.7)');
    acG.addColorStop(0.65,'rgba(0,150,255,0.7)');
    acG.addColorStop(1,   'rgba(0,113,227,0)');
    ctx.fillStyle = acG;
    ctx.fillRect(bLeft, bBot - h * 0.02, bW, h * 0.025);
    ctx.restore();

    // ── Wheels ────────────────────────────────────────────
    const wheelR = h * 0.105 * squash;
    const wheelY = chasY + chasH + wheelR * 0.55;
    [-hw * 0.52, hw * 0.52].forEach(wx => {
      // Shadow
      ctx.beginPath();
      ctx.ellipse(wx, wheelY + wheelR * 0.25, wheelR * 0.78, wheelR * 0.22, 0, 0, TAU);
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.fill();

      // Tire outer
      const tireG = ctx.createRadialGradient(wx - wheelR * 0.2, wheelY - wheelR * 0.2, 0, wx, wheelY, wheelR);
      tireG.addColorStop(0, '#3a3e58');
      tireG.addColorStop(0.7, '#1e2030');
      tireG.addColorStop(1, '#0e1018');
      ctx.beginPath(); ctx.arc(wx, wheelY, wheelR, 0, TAU);
      ctx.fillStyle = tireG; ctx.fill();

      // Tire rim
      ctx.beginPath(); ctx.arc(wx, wheelY, wheelR, 0, TAU);
      ctx.strokeStyle = 'rgba(100,115,145,0.65)';
      ctx.lineWidth = Math.max(1, wheelR * 0.12);
      ctx.stroke();

      // Hub cap
      const hubR = wheelR * 0.38;
      const hubG = ctx.createRadialGradient(wx - hubR * 0.25, wheelY - hubR * 0.25, 0, wx, wheelY, hubR);
      hubG.addColorStop(0, '#c0c8e0');
      hubG.addColorStop(1, '#6870a0');
      ctx.beginPath(); ctx.arc(wx, wheelY, hubR, 0, TAU);
      ctx.fillStyle = hubG; ctx.fill();

      // Spoke marks
      ctx.strokeStyle = 'rgba(80,90,120,0.60)';
      ctx.lineWidth = Math.max(0.5, wheelR * 0.065);
      for (let s = 0; s < 4; s++) {
        const a = (s / 4) * TAU;
        ctx.beginPath();
        ctx.moveTo(wx + Math.cos(a) * hubR * 0.9, wheelY + Math.sin(a) * hubR * 0.9);
        ctx.lineTo(wx + Math.cos(a) * wheelR * 0.78, wheelY + Math.sin(a) * wheelR * 0.78);
        ctx.stroke();
      }
    });

    // ── Top glass sheen ───────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bLeft, bTop, bW, bH * 0.4, [5, 5, 0, 0]);
    ctx.clip();
    const sheen = ctx.createLinearGradient(bLeft, bTop, bRgt * 0.4, bTop + bH * 0.35);
    sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(bLeft, bTop, bW, bH * 0.4);
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
    const base = 38;
    const s    = pos.scale;
    const size = base * s * 2.2;
    if (size < 4) return;

    const pulse = 1 + Math.sin(this.phase + this.age * 4) * 0.05;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(pulse, pulse);
    this.type === 'collect'
      ? this._drawCollectible(ctx, size)
      : this._drawHazard(ctx, size);
    ctx.restore();
  }

  _drawCollectible(ctx, size) {
    const r = size * 0.5;

    // Outer glow aura
    const halo = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.8);
    halo.addColorStop(0, 'rgba(255,220,50,0.18)');
    halo.addColorStop(0.5, 'rgba(255,200,20,0.08)');
    halo.addColorStop(1, 'rgba(255,180,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, TAU); ctx.fill();

    // Subtle ring
    ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, TAU);
    ctx.strokeStyle = 'rgba(255,220,80,0.45)';
    ctx.lineWidth = Math.max(1, r * 0.10);
    ctx.stroke();

    // Big emoji - the star of the show
    const emojiSize = Math.max(10, r * 1.35);
    ctx.font = `${emojiSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, 0, r * 0.06);
  }

  _drawHazard(ctx, size) {
    const r   = size * 0.5;
    const flk = 0.6 + Math.sin(this.age * 5) * 0.18;

    // Big pulsing danger aura
    const aura = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.0);
    aura.addColorStop(0, `rgba(255,59,48,${flk * 0.28})`);
    aura.addColorStop(0.6, `rgba(255,59,48,${flk * 0.10})`);
    aura.addColorStop(1, 'rgba(255,59,48,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.0, 0, TAU); ctx.fill();

    // Red ring warning border
    ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, TAU);
    ctx.strokeStyle = `rgba(255,59,48,${0.65 + flk * 0.25})`;
    ctx.lineWidth = Math.max(1.5, r * 0.13);
    ctx.stroke();

    // The hazard food emoji (large)
    const emojiSize = Math.max(10, r * 1.25);
    ctx.font = `${emojiSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, 0, r * 0.06);

    // Skull badge overlay (top-right corner)
    const badgeR = r * 0.52;
    const bx = r * 0.55;
    const by = -r * 0.55;

    // Skull badge background
    ctx.beginPath(); ctx.arc(bx, by, badgeR, 0, TAU);
    ctx.fillStyle = 'rgba(180, 0, 0, 0.90)';
    ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, badgeR, 0, TAU);
    ctx.strokeStyle = 'rgba(255, 100, 80, 0.80)';
    ctx.lineWidth = Math.max(0.8, badgeR * 0.12);
    ctx.stroke();

    // Skull emoji in badge
    ctx.font = `${Math.max(6, badgeR * 1.1)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☠️', bx, by + badgeR * 0.06);
  }

  getBox(track, cw, ch) {
    const pos  = track.project(this.lane, this.depth, cw, ch);
    const base = 38;
    const size = base * pos.scale * 2.2 * 0.65; // slightly inset for leniency
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

  _spawn(hazRatio) {
    const lane  = rndInt(-1, 1);
    const isHaz = Math.random() < hazRatio;
    const emoji = isHaz
      ? CFG.HAZARD_ITEMS[rndInt(0, CFG.HAZARD_ITEMS.length - 1)]
      : CFG.ITEMS[rndInt(0, CFG.ITEMS.length - 1)];
    this.items.push(new GameObject(isHaz ? 'hazard' : 'collect', lane, emoji));

    // Sometimes add a second object in a different lane
    if (Math.random() < 0.28) {
      const lanes2 = [-1, 0, 1].filter(l => l !== lane);
      const lane2  = lanes2[rndInt(0, lanes2.length - 1)];
      const isHaz2 = Math.random() < hazRatio * 0.75;
      this.items.push(new GameObject(
        isHaz2 ? 'hazard' : 'collect',
        lane2,
        isHaz2
          ? CFG.HAZARD_ITEMS[rndInt(0, CFG.HAZARD_ITEMS.length - 1)]
          : CFG.ITEMS[rndInt(0, CFG.ITEMS.length - 1)]
      ));
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

      if (obj.type === 'collect') {
        obj.taken = true;
        obj.dead  = true;
        result.collected.push(obj.emoji);
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
    this.nosFill  = document.getElementById('nos-fill');
    this.nosReady = document.getElementById('nos-ready');
  }

  show() { this.el.classList.remove('hud-off'); }
  hide() { this.el.classList.add('hud-off'); }

  setScore(v)    { this.scoreEl.textContent = Math.floor(v); }
  setDist(v)     { this.distEl.textContent  = Math.floor(v) + ' m'; }

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
      menu:     document.getElementById('screen-menu'),
      tutorial: document.getElementById('screen-tutorial'),
      pause:    document.getElementById('screen-pause'),
      gameover: document.getElementById('screen-gameover'),
    };
    this.cur = null;
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
    this.state   = 'MENU'; // MENU | PLAYING | PAUSED | GAMEOVER

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

    // Combo tracking
    this.nosComboCount   = 0;
    this.lastCollectTime = 0;
  }

  init() {
    this.best = parseInt(localStorage.getItem('hayde_best') || '0', 10);
    this._refreshBestUI();

    this._resize();
    this.audio.boot();
    this.input.init();
    this._bindUI();
    this.screens.show('menu');
    this.hud.hide();

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
  _left()  { if (this.state !== 'PLAYING') return; this.audio.resume(); this.player.moveLeft(); }
  _right() { if (this.state !== 'PLAYING') return; this.audio.resume(); this.player.moveRight(); }
  _up()    {
    if (this.state !== 'PLAYING') return;
    this.audio.resume();
    if (this.player.jump()) this.audio.jump();
  }
  _down()  {
    if (this.state !== 'PLAYING') return;
    this.audio.resume();
    if (this.player.slide()) this.audio.slide();
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
    }
  }

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

    this.nosComboCount   = 0;
    this.lastCollectTime = 0;

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
  }

  _pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    document.getElementById('pause-score').textContent = Math.floor(this.score);
    this.screens.show('pause');
  }

  _resume() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.screens.hide();
  }

  _goMenu() {
    this.state = 'MENU';
    this.screens.show('menu');
    this.hud.hide();
    this._refreshBestUI();
  }

  _gameOver() {
    this.state     = 'GAMEOVER';
    this.nosActive = false;
    this.player.die();
    this.audio.die();

    if (this.score > this.best) {
      this.best = Math.floor(this.score);
      localStorage.setItem('hayde_best', this.best);
    }

    document.getElementById('go-score').textContent = Math.floor(this.score);
    document.getElementById('go-dist').textContent  = Math.floor(this.distance) + ' m';
    document.getElementById('go-best').textContent  = this.best;

    setTimeout(() => {
      this.screens.show('gameover');
      this.hud.hide();
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
    if (this.state === 'MENU') {
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
    for (const emoji of collected) {
      const pos = this.track.project(this.player.laneT, CFG.PLAYER_D, this.cw, this.ch);
      this.particles.collectPop(pos.x, pos.y - this.ch * 0.07, emoji);
      this.player.collect(emoji);
      this.score    += CFG.SCORE_ITEM;
      this.nosCharge = clamp(this.nosCharge + CFG.NOS_CHARGE, 0, CFG.NOS_MAX);
      this.audio.haydeCollect();

      // Combo tracking: 3+ items within 2 seconds
      const now = this.elapsed;
      if (now - this.lastCollectTime < 2.0) {
        this.nosComboCount++;
        if (this.nosComboCount >= 3) {
          this.audio.combo();
          this.nosComboCount = 0;
        }
      } else {
        this.nosComboCount = 1;
      }
      this.lastCollectTime = now;
    }
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
          : ['#ff9f0a','#ffd60a','#ff6b35','#ffcc02'];
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
  }

  // ── Render ────────────────────────────────────────────────────
  _render(dt) {
    const ctx = this.ctx;
    const { cw, ch, dpr } = this;

    // Reset transform to DPR scale at start of every frame
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // Determine render speed for track animation
    const effSpeed = (this.state === 'PLAYING' && this.nosActive)
      ? this.speed * CFG.NOS_SPEED
      : this.speed;
    const trackSpeed = (this.state === 'PLAYING') ? effSpeed
      : (this.state === 'MENU' || this.state === 'PAUSED') ? 0.12
      : 0.06; // slow on gameover

    const theme = this._getTheme();
    this.track.draw(ctx, cw, ch, dt, trackSpeed, this.nosActive && this.state === 'PLAYING', theme);

    if (this.state === 'MENU') {
      this._renderMenuIdle(ctx, cw, ch);
      return;
    }

    // Game objects (behind player)
    this.objects.draw(ctx, this.track, cw, ch);

    // Particles (sparks)
    this.particles.draw(ctx);

    // Player cart
    this.player.draw(ctx, this.track, cw, ch);

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
  }

  _renderMenuIdle(ctx, cw, ch) {
    // Subtle animated idle cart in the distance
    const t  = this._idleT;
    const cx = cw * 0.5;
    const cy = ch * 0.62 + Math.sin(t * 1.4) * 6;

    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.translate(cx, cy);
    ctx.scale(3.2, 3.2);
    const tempPlayer = { collected: [], sliding: false, dead: false, deathAge: 0, laneVel: 0, jumpT: 0 };
    Player.prototype._drawCart.call(tempPlayer, ctx, 42, 48, 1);
    ctx.restore();
  }
}

// ── Bootstrap ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});
