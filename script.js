'use strict';

/* ============================================================
   EASY TWEAKS
   ============================================================
   These constants control every tuneable aspect of the game.
   ============================================================ */
const CFG = {
  // ── Physics ──────────────────────────────────────────────
  GRAVITY:     2400,    // px/s²   — higher = heavier feel
  JUMP_FORCE:  -800,    // px/s    — more negative = higher jump

  // ── Scroll speed ─────────────────────────────────────────
  SPEED_START:  300,    // px/s   initial scroll speed
  SPEED_INC:     12,    // px/s   added per second of play
  SPEED_MAX:    750,    // px/s   cap

  // ── Obstacle timing ──────────────────────────────────────
  GAP_MIN:      1.0,    // seconds minimum gap between obstacles
  GAP_MAX:      2.6,    // seconds maximum gap

  // ── Player geometry ──────────────────────────────────────
  PL_W:          32,    // px width
  PL_H:          46,    // px height
  PL_X:          90,    // fixed left offset

  // ── World ────────────────────────────────────────────────
  GROUND_H:      68,    // px  height of ground strip from bottom

  // ── Colors (any CSS color string) ────────────────────────
  COL_PLAYER:   '#63dcdc',
  COL_OBSTACLE: '#ff7070',
};

/* ============================================================
   CANVAS
   ============================================================ */
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
let W = 0, H = 0;   // live canvas dimensions

/** Fit canvas to viewport preserving a ~2.6 : 1 aspect ratio. */
function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const RATIO = 900 / 350;   // reference aspect

  let w = Math.min(vw, 900);
  let h = Math.round(w / RATIO);

  if (h > vh) { h = vh; w = Math.round(h * RATIO); }

  W = canvas.width  = w;
  H = canvas.height = h;
}

/* ============================================================
   UTILITY
   ============================================================ */

/** Trace a rounded-rectangle path (no fill / stroke applied). */
function rrect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

/* ============================================================
   AUDIO  — Web Audio API (no files needed)
   ============================================================ */
let AC = null;

function getAC() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  return AC;
}

/** Play a simple synthesised tone */
function tone(freq, dur, type = 'sine', vol = 0.18) {
  try {
    const ac = getAC();
    const o  = ac.createOscillator();
    const g  = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime);
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur);
  } catch (e) { /* silently ignore if audio blocked */ }
}

/** Two-tone sweep */
function sweep(f1, f2, dur, type = 'sine', vol = 0.18) {
  try {
    const ac = getAC();
    const o  = ac.createOscillator();
    const g  = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, ac.currentTime);
    o.frequency.linearRampToValueAtTime(f2, ac.currentTime + dur);
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur);
  } catch (e) { /* ignore */ }
}

function snd(name) {
  switch (name) {
    case 'jump':
      // Bright boing — quick up-sweep
      sweep(220, 520, 0.12, 'sine', 0.2);
      sweep(180, 400, 0.15, 'triangle', 0.08);
      break;
    case 'land':
      // Soft thud
      sweep(120, 60, 0.08, 'sine', 0.15);
      tone(80, 0.06, 'triangle', 0.1);
      break;
    case 'die':
      // Descending wah-wah
      sweep(440, 110, 0.4, 'sawtooth', 0.15);
      setTimeout(() => sweep(220, 55, 0.3, 'sawtooth', 0.1), 200);
      break;
    case 'milestone':
      // Ascending fanfare
      [0, 80, 160, 240].forEach((delay, i) => {
        const notes = [523, 659, 784, 1047];
        setTimeout(() => tone(notes[i], 0.18, 'sine', 0.2), delay);
      });
      break;
  }
}

/* ============================================================
   MOTIVATION TOASTS
   ============================================================ */
const TOASTS = [
  { score: 30,  msg: '🔥 Not bad for a beginner!' },
  { score: 60,  msg: '💪 You great motherf***er!' },
  { score: 100, msg: '🚀 UNSTOPPABLE!!' },
  { score: 150, msg: '😤 The groceries FEAR you!' },
  { score: 200, msg: '👑 LEGEND MODE ACTIVATED' },
  { score: 300, msg: '🥳 ARE YOU EVEN HUMAN?!' },
  { score: 500, msg: '🛒💨 FASTEST SHOPPER ALIVE!' },
];
let lastToastScore = 0;
let toastTimer     = null;
const toastEl      = () => document.getElementById('toast');

function showToast(msg) {
  const el = toastEl();
  el.textContent = msg;
  el.classList.remove('hidden');
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 220);
  }, 2200);
  snd('milestone');
  triggerFlash('#ffe94d', 0.22);
}

function checkToasts() {
  for (const t of TOASTS) {
    if (score >= t.score && lastToastScore < t.score) {
      lastToastScore = t.score;
      showToast(t.msg);
      break;
    }
  }
}

function resetToasts() {
  lastToastScore = 0;
  const el = toastEl();
  if (el) { el.classList.remove('show'); el.classList.add('hidden'); }
}

/* ============================================================
   BACKGROUND  (stars + parallax ground marks)
   ============================================================ */
let stars  = [];
let gmarks = [];
let bgT    = 0;    // always-running clock for idle animations

function buildBg() {
  stars  = [];
  gmarks = [];

  const n = Math.max(25, Math.round(W * H / 7500));
  for (let i = 0; i < n; i++) {
    stars.push({
      x:   Math.random() * W,
      y:   Math.random() * (H - CFG.GROUND_H - 8),
      r:   Math.random() * 1.4 + 0.25,
      a:   Math.random() * 0.55 + 0.12,
      par: 0.04 + Math.random() * 0.1,    // parallax factor (0 = fixed)
    });
  }

  for (let i = 0; i < 18; i++) {
    gmarks.push({
      x: Math.random() * W * 1.5,
      y: H - CFG.GROUND_H + 7 + Math.random() * (CFG.GROUND_H - 14),
      w: 20 + Math.random() * 36,
      a: 0.04 + Math.random() * 0.08,
    });
  }
}

/** Scroll background layers by the given speed (px/s). */
function updateBg(dt, spd) {
  bgT += dt;
  for (const s of stars)  { s.x -= spd * s.par * dt; if (s.x < 0) s.x += W; }
  for (const m of gmarks) { m.x -= spd * dt;          if (m.x + m.w < 0) m.x += W + m.w; }
}

function drawBg() {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H - CFG.GROUND_H);
  sky.addColorStop(0, '#07071a');
  sky.addColorStop(1, '#130d2e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H - CFG.GROUND_H);

  // Stars
  for (const s of stars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle   = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Horizon glow
  const hg = ctx.createLinearGradient(0, H - CFG.GROUND_H - 40, 0, H - CFG.GROUND_H);
  hg.addColorStop(0, 'rgba(99,220,220,0)');
  hg.addColorStop(1, 'rgba(99,220,220,0.07)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, H - CFG.GROUND_H - 40, W, 40);

  // Ground strip
  ctx.fillStyle = '#0c1030';
  ctx.fillRect(0, H - CFG.GROUND_H, W, CFG.GROUND_H);

  // Neon edge line
  const el = ctx.createLinearGradient(0, H - CFG.GROUND_H, 0, H - CFG.GROUND_H + 3);
  el.addColorStop(0, 'rgba(99,220,220,0.85)');
  el.addColorStop(1, 'rgba(99,220,220,0)');
  ctx.fillStyle = el;
  ctx.fillRect(0, H - CFG.GROUND_H, W, 3);

  // Scrolling ground dashes (speed sensation)
  for (const m of gmarks) {
    ctx.globalAlpha = m.a;
    ctx.fillStyle   = '#63dcdc';
    ctx.fillRect(m.x, m.y, m.w, 1);
  }
  ctx.globalAlpha = 1;
}

/* ============================================================
   PLAYER
   ============================================================ */
const player = {
  x:  CFG.PL_X,
  y:  0,
  vy: 0,
  w:  CFG.PL_W,
  h:  CFG.PL_H,
  onGround: false,
  sx: 1,   // squash-stretch scale X
  sy: 1,   // squash-stretch scale Y

  /** Y coordinate of the ground (bottom of player when standing). */
  groundY() { return H - CFG.GROUND_H - this.h; },

  /** Full reset — call on game start and after resize. */
  reset() {
    this.y = this.groundY();
    this.vy = 0;
    this.onGround = true;
    this.sx = this.sy = 1;
  },

  /** Initiate a jump. Ignored if already airborne. */
  jump() {
    if (!this.onGround) return;
    this.vy       = CFG.JUMP_FORCE;
    this.onGround = false;
    // Launch squash: compress horizontal, stretch vertical
    this.sx = 0.78;
    this.sy = 1.28;
    snd('jump');
  },

  update(dt) {
    this.vy += CFG.GRAVITY * dt;
    this.y  += this.vy * dt;

    const floor = this.groundY();
    if (this.y >= floor) {
      if (!this.onGround) {
        // Landing squash: spread horizontal, compress vertical
        this.sx = 1.35;
        this.sy = 0.65;
        snd('land');
      }
      this.y = floor; this.vy = 0; this.onGround = true;
    }

    // Spring scale back towards 1 (squash-stretch recovery)
    const ease = Math.min(dt * 14, 0.9);
    this.sx += (1 - this.sx) * ease;
    this.sy += (1 - this.sy) * ease;
  },

  /**
   * Returns axis-aligned bounding box, optionally inset by `i` px on
   * every side (used for forgiving collision detection).
   */
  box(i = 0) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    return {
      l: cx - (this.w * this.sx) / 2 + i,
      r: cx + (this.w * this.sx) / 2 - i,
      t: cy - (this.h * this.sy) / 2 + i,
      b: cy + (this.h * this.sy) / 2 - i,
    };
  },

  /**
   * Render the player.
   * @param {number} [idleOff=0]  Vertical offset for idle breathing animation.
   */
  draw(idleOff = 0) {
    const cx  = this.x + this.w / 2;
    const cy  = this.y + this.h / 2 + idleOff;
    const dw  = this.w * this.sx;
    const dh  = this.h * this.sy;
    const gY  = H - CFG.GROUND_H;

    // ── Ellipse shadow on ground ──────────────────────────
    const dist    = Math.max(0, gY - (cy + dh / 2));
    const sFactor = Math.max(0, 1 - dist / (H * 0.6));
    ctx.globalAlpha = 0.28 * sFactor;
    ctx.fillStyle   = 'rgba(0,0,50,1)';
    ctx.beginPath();
    ctx.ellipse(cx, gY, dw * 0.52, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Body ─────────────────────────────────────────────
    ctx.save();
    if (!this.onGround) {
      ctx.shadowColor = CFG.COL_PLAYER;
      ctx.shadowBlur  = 22;   // glow when airborne
    }

    const grad = ctx.createLinearGradient(cx - dw / 2, cy - dh / 2, cx + dw / 2, cy + dh / 2);
    grad.addColorStop(0, '#b0f0f0');
    grad.addColorStop(1, CFG.COL_PLAYER);
    ctx.fillStyle = grad;
    rrect(cx - dw / 2, cy - dh / 2, dw, dh, 6);
    ctx.fill();

    // Inner highlight (top-left shine)
    ctx.shadowBlur = 0;
    ctx.fillStyle  = 'rgba(255,255,255,0.22)';
    rrect(cx - dw / 2 + 2, cy - dh / 2 + 2, dw * 0.42, dh * 0.34, 4);
    ctx.fill();

    // Small "eye" detail
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(cx + dw * 0.18, cy - dh * 0.18, dw * 0.09, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },
};

/* ============================================================
   OBSTACLES  — supermarket items drawn with canvas
   ============================================================ */
let obstacles = [];
let obsTimer  = 0;
let nextGap   = 1.5;

// Each type: { key, w, h } — sizes relative to player dimensions
const OBS_TYPES = [
  { key: 'cart'   },   // shopping cart  (wide + tall)
  { key: 'milk'   },   // milk carton    (narrow + tall)
  { key: 'bread'  },   // bread loaf     (wide + short)
  { key: 'cone'   },   // traffic cone   (narrow + medium)
  { key: 'can'    },   // soup can       (small + round-ish)
];

function spawnObs() {
  const type = OBS_TYPES[Math.floor(Math.random() * OBS_TYPES.length)];
  let w, h;
  switch (type.key) {
    case 'cart':  w = CFG.PL_W * 2.2; h = CFG.PL_H * 1.4; break;
    case 'milk':  w = CFG.PL_W * 0.9; h = CFG.PL_H * 1.6; break;
    case 'bread': w = CFG.PL_W * 2.0; h = CFG.PL_H * 0.7; break;
    case 'cone':  w = CFG.PL_W * 0.8; h = CFG.PL_H * 1.2; break;
    case 'can':   w = CFG.PL_W * 0.9; h = CFG.PL_H * 0.9; break;
    default:      w = CFG.PL_W * 1.2; h = CFG.PL_H * 1.0;
  }
  obstacles.push({ x: W + 20, y: H - CFG.GROUND_H - h, w, h, type: type.key });
}

function resetObs() {
  obstacles = [];
  obsTimer  = 0;
  nextGap   = 1.5;
}

function updateObs(dt) {
  for (const o of obstacles) o.x -= speed * dt;
  obstacles = obstacles.filter(o => o.x + o.w > -20);

  obsTimer += dt;
  if (obsTimer >= nextGap) {
    spawnObs();
    obsTimer = 0;
    const t = Math.min((speed - CFG.SPEED_START) / (CFG.SPEED_MAX - CFG.SPEED_START), 1);
    nextGap  = CFG.GAP_MIN
             + (CFG.GAP_MAX - CFG.GAP_MIN) * (1 - t * 0.45)
             + (Math.random() * 0.4 - 0.2);
    nextGap  = Math.max(nextGap, CFG.GAP_MIN);
  }
}

/* --- individual item drawers --- */

function drawCart(x, y, w, h) {
  const s = w / (CFG.PL_W * 2.2);   // scale factor
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth   = 2.5 * s;
  ctx.lineJoin    = 'round';

  // Basket body
  ctx.fillStyle = 'rgba(255,204,0,0.18)';
  ctx.strokeStyle = '#ffcc00';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.15, y);
  ctx.lineTo(x + w * 0.95, y);
  ctx.lineTo(x + w,        y + h * 0.65);
  ctx.lineTo(x + w * 0.05, y + h * 0.65);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Handle
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w * 0.15, y);
  ctx.stroke();

  // Bottom bar
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y + h * 0.65);
  ctx.lineTo(x + w * 0.9, y + h * 0.65);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y + h * 0.65);
  ctx.lineTo(x + w * 0.15, y + h * 0.88);
  ctx.moveTo(x + w * 0.75, y + h * 0.65);
  ctx.lineTo(x + w * 0.85, y + h * 0.88);
  ctx.stroke();

  // Wheels
  ctx.fillStyle = '#ffcc00';
  [[x + w * 0.15, y + h * 0.9], [x + w * 0.85, y + h * 0.9]].forEach(([cx, cy]) => {
    ctx.beginPath(); ctx.arc(cx, cy, 5 * s, 0, Math.PI * 2); ctx.fill();
  });

  // Label
  ctx.fillStyle = '#ffcc00';
  ctx.font = `bold ${Math.round(9 * s)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('🛒', x + w / 2, y + h * 0.45);
}

function drawMilk(x, y, w, h) {
  // Carton body
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#f0f8ff');
  g.addColorStop(1, '#b0d4f1');
  ctx.fillStyle = g;
  rrect(x, y + h * 0.15, w, h * 0.85, 4); ctx.fill();

  // Roof triangle
  ctx.fillStyle = '#d0e8f8';
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.15);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h * 0.15);
  ctx.closePath(); ctx.fill();

  // Label stripe
  ctx.fillStyle = '#3399ff';
  ctx.fillRect(x, y + h * 0.4, w, h * 0.25);

  // Text
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(w * 0.55)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('🥛', x + w / 2, y + h * 0.58);
}

function drawBread(x, y, w, h) {
  // Loaf shape
  ctx.fillStyle = '#d4832a';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.6, w / 2, h * 0.45, 0, Math.PI, 0);
  ctx.fillRect(x, y + h * 0.6, w, h * 0.4);
  ctx.fill();

  ctx.fillStyle = '#e8a050';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.6, w / 2 - 3, h * 0.42, 0, Math.PI, 0);
  ctx.fill();

  // Score lines
  ctx.strokeStyle = '#c0701a';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + w * i / 4, y + h * 0.3);
    ctx.lineTo(x + w * i / 4, y + h * 0.62);
    ctx.stroke();
  }

  ctx.fillStyle = '#d4832a';
  ctx.font = `${Math.round(w * 0.35)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('🍞', x + w / 2, y + h * 0.52);
}

function drawCone(x, y, w, h) {
  // Orange cone
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w,     y + h * 0.85);
  ctx.lineTo(x,         y + h * 0.85);
  ctx.closePath(); ctx.fill();

  // White stripes
  ctx.fillStyle = '#fff';
  [[0.35, 0.12], [0.55, 0.1]].forEach(([pos, bh]) => {
    const sy = y + h * pos;
    const sw = w * (1 - pos) * 0.85;
    ctx.fillRect(x + (w - sw) / 2, sy, sw, h * bh);
  });

  // Base
  ctx.fillStyle = '#333';
  ctx.fillRect(x - 3, y + h * 0.85, w + 6, h * 0.1);

  ctx.font = `${Math.round(w * 0.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('🚧', x + w / 2, y + h * 0.75);
}

function drawCan(x, y, w, h) {
  // Can body
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0,   '#cc2222');
  g.addColorStop(0.4, '#ff4444');
  g.addColorStop(1,   '#cc2222');
  ctx.fillStyle = g;
  rrect(x, y, w, h, w / 2); ctx.fill();

  // Top rim
  ctx.fillStyle = '#aaa';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 3, w / 2 - 1, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(w * 0.3)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('SOUP', x + w / 2, y + h * 0.52);
  ctx.font = `${Math.round(w * 0.45)}px sans-serif`;
  ctx.fillText('🥫', x + w / 2, y + h * 0.78);
}

function drawObs() {
  for (const o of obstacles) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,180,0,0.5)';
    ctx.shadowBlur  = 10;

    switch (o.type) {
      case 'cart':  drawCart(o.x, o.y, o.w, o.h);  break;
      case 'milk':  drawMilk(o.x, o.y, o.w, o.h);  break;
      case 'bread': drawBread(o.x, o.y, o.w, o.h); break;
      case 'cone':  drawCone(o.x, o.y, o.w, o.h);  break;
      case 'can':   drawCan(o.x, o.y, o.w, o.h);   break;
    }
    ctx.restore();
  }
}

/* ============================================================
   COLLISION DETECTION
   ============================================================ */
/** Returns true if the player's (slightly inset) box overlaps any obstacle. */
function collides() {
  const b = player.box(5);   // 5 px inset gives a forgiving hitbox
  for (const o of obstacles) {
    if (b.l < o.x + o.w && b.r > o.x && b.t < o.y + o.h && b.b > o.y)
      return true;
  }
  return false;
}

/* ============================================================
   HUD  (drawn directly on the canvas)
   ============================================================ */
function drawHUD() {
  ctx.save();
  ctx.textBaseline = 'top';

  // Current score (top-left, large)
  ctx.shadowColor = 'rgba(99,220,220,0.6)';
  ctx.shadowBlur  = 14;
  ctx.font        = `bold ${Math.round(H * 0.13)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle   = 'rgba(255,255,255,0.92)';
  ctx.textAlign   = 'left';
  ctx.fillText(
    String(Math.floor(score)).padStart(4, '0'),
    Math.round(W * 0.04),
    Math.round(H * 0.07)
  );

  // Best score (top-right, small)
  ctx.shadowBlur = 0;
  ctx.font       = `${Math.round(H * 0.068)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle  = 'rgba(255,255,255,0.28)';
  ctx.textAlign  = 'right';
  ctx.fillText(`BEST  ${bestScore}`, W - Math.round(W * 0.04), Math.round(H * 0.09));

  ctx.restore();
}

/* ============================================================
   SCREEN FLASH
   ============================================================ */
let flashAlpha = 0;
let flashColor = '#fff';

function triggerFlash(color, alpha = 0.55) {
  flashColor = color;
  flashAlpha = alpha;
}

function drawFlash() {
  if (flashAlpha <= 0) return;
  ctx.globalAlpha = flashAlpha;
  ctx.fillStyle   = flashColor;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  flashAlpha     = Math.max(0, flashAlpha - 0.04);   // fade each frame
}

/* ============================================================
   COMBO COUNTER
   ============================================================ */
let combo        = 0;
let comboDisplay = 0;   // shown value (delayed so it's visible)
let comboTimer   = 0;   // seconds remaining to show combo

function resetCombo() {
  combo        = 0;
  comboDisplay = 0;
  comboTimer   = 0;
}

function updateCombo(dt) {
  if (comboTimer > 0) comboTimer -= dt;

  // Check each obstacle: if it just cleared the player, count a dodge
  for (const o of obstacles) {
    if (!o.dodged && o.x + o.w < CFG.PL_X) {
      o.dodged = true;
      combo++;
      comboDisplay = combo;
      comboTimer   = 1.4;
    }
  }
}

function drawCombo() {
  if (comboDisplay < 2 || comboTimer <= 0) return;
  const fade = Math.min(comboTimer / 0.4, 1);
  ctx.save();
  ctx.globalAlpha  = fade;
  ctx.textBaseline = 'top';
  ctx.textAlign    = 'center';

  const size = Math.round(H * 0.09);
  ctx.font      = `900 ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle = comboDisplay >= 6 ? '#ff4dff'
                : comboDisplay >= 4 ? '#ffcc00'
                :                     '#63dcdc';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur  = 18;
  ctx.fillText(`x${comboDisplay} COMBO`, W / 2, Math.round(H * 0.18));
  ctx.restore();
}

/* ============================================================
   GAME STATE
   ============================================================ */
let state     = 'idle';    // 'idle' | 'playing' | 'dead'
let score     = 0;
let bestScore = +localStorage.getItem('dash_best') || 0;
let speed     = CFG.SPEED_START;
let elapsed   = 0;    // seconds in the current run (drives speed)
let lastTs    = 0;    // previous frame timestamp (ms)

// Funny game-over messages keyed by what hit you
const DEATH_MSGS = {
  cart:  ['A shopping cart said NO.', 'Demolished by dairy aisle traffic.', 'Cart 1 — You 0.'],
  milk:  ['You got milked. 🥛', 'The milk carton showed no mercy.', 'Lactose intolerant? More like cart intolerant.'],
  bread: ['Bread-bocked.', 'Daily bread: your nemesis.', 'Gluten-free? Nope, gluten-defeated.'],
  cone:  ['Construction: 1. You: 0.', 'Coned! 🚧', 'The cone of shame awaits.'],
  can:   ['Soup got you good. 🥫', 'Campbell\'s wins again.', 'Can-not continue.'],
};

function startGame() {
  score      = 0;
  speed      = CFG.SPEED_START;
  elapsed    = 0;
  flashAlpha = 0;
  resetObs();
  resetToasts();
  resetCombo();
  player.reset();
  buildBg();
  setScreen('none');
  state = 'playing';
}

function gameOver() {
  if (state !== 'playing') return;
  state = 'dead';
  snd('die');
  triggerFlash('#ff2244', 0.5);

  // Find what killed the player
  const b = player.box(5);
  let killer = 'cart';
  for (const o of obstacles) {
    if (b.l < o.x + o.w && b.r > o.x && b.t < o.y + o.h && b.b > o.y) {
      killer = o.type; break;
    }
  }

  // Funny death message
  const msgs = DEATH_MSGS[killer] || DEATH_MSGS.cart;
  const msg  = msgs[Math.floor(Math.random() * msgs.length)];

  // Pick funny title based on score
  const titles = score < 30  ? ['💀 Wiped Out!', '😵 Instant Death', '🛒 Gotcha!']
               : score < 80  ? ['😤 So Close!', '💥 Obliterated!', '🤦 Seriously?']
               : score < 150 ? ['🔥 Not Bad!', '💪 Respectable!', '👏 Decent Run!']
                             : ['👑 Legendary Run!', '🥳 Absolute Unit!', '🚀 Incredible!'];
  const title = titles[Math.floor(Math.random() * titles.length)];

  document.getElementById('overTitle').textContent    = title;
  document.getElementById('overMsg').textContent      = msg;
  document.getElementById('finalScore').textContent   = Math.floor(score);
  document.getElementById('finalBest').textContent    = bestScore;
  setScreen('gameover');
}

/* ============================================================
   MAIN LOOP  (requestAnimationFrame)
   ============================================================ */
function loop(ts) {
  // Delta time in seconds; capped at 50 ms to avoid spiral-of-death on tab focus
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs   = ts;

  // Background always scrolls (slower when not playing)
  const bgSpd = state === 'playing' ? speed : CFG.SPEED_START * 0.22;
  updateBg(dt, bgSpd);

  if (state === 'playing') {
    elapsed += dt;
    speed    = Math.min(CFG.SPEED_START + CFG.SPEED_INC * elapsed, CFG.SPEED_MAX);

    player.update(dt);
    updateObs(dt);

    // Score: base 10 pts/s, scaling with speed
    score += dt * (10 + (speed - CFG.SPEED_START) / 30);

    if (score > bestScore) {
      bestScore = Math.floor(score);
      localStorage.setItem('dash_best', bestScore);
    }

    updateCombo(dt);
    checkToasts();
    if (collides()) { gameOver(); }
  }

  render();
  requestAnimationFrame(loop);
}

/* ============================================================
   RENDER
   ============================================================ */
function drawSpeedLines() {
  // Horizontal speed streaks — intensity grows with speed
  const t = Math.min((speed - CFG.SPEED_START) / (CFG.SPEED_MAX - CFG.SPEED_START), 1);
  if (t < 0.15) return;
  const count  = Math.round(t * 12);
  const alpha  = t * 0.18;
  const gndY   = H - CFG.GROUND_H;
  ctx.save();
  ctx.strokeStyle = `rgba(99,220,220,${alpha})`;
  ctx.lineWidth   = 1;
  for (let i = 0; i < count; i++) {
    // Deterministic positions based on bgT so they scroll
    const seed  = (i * 137.5 + bgT * 180) % W;
    const y     = 10 + ((i * 53 + Math.floor(bgT * 3)) % Math.round(gndY - 20));
    const len   = 20 + (i % 4) * 18;
    ctx.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(bgT * 5 + i));
    ctx.beginPath();
    ctx.moveTo(seed, y);
    ctx.lineTo(seed - len, y);
    ctx.stroke();
  }
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, W, H);

  drawBg();

  if (state === 'playing') drawSpeedLines();

  // Obstacles (empty on idle, frozen on dead)
  drawObs();

  // Player — idle gets a gentle breathing bob
  player.draw(state === 'idle' ? Math.sin(bgT * 1.8) * 3 : 0);

  // HUD only while playing
  if (state === 'playing') {
    drawHUD();
    drawCombo();
  }

  // Flash overlay (death = red, milestone = yellow)
  drawFlash();

  // Subtle vignette darkens edges
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.68);
  v.addColorStop(0, 'transparent');
  v.addColorStop(1, 'rgba(0,0,12,0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/* ============================================================
   UI HELPERS
   ============================================================ */
function setScreen(which) {
  document.getElementById('startScreen').classList.toggle('hidden',    which !== 'start');
  document.getElementById('gameOverScreen').classList.toggle('hidden', which !== 'gameover');
}

/* ============================================================
   INPUT
   ============================================================ */
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (state === 'playing') player.jump();
  }
});

// Pointer events cover mouse + touch on all modern browsers
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (state === 'playing') player.jump();
});

// Fallback for browsers without Pointer Events (older mobile WebViews)
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (state === 'playing') player.jump();
}, { passive: false });

/* ============================================================
   INIT
   ============================================================ */
(function init() {
  resize();
  buildBg();
  player.reset();

  // Populate best score on start screen
  document.getElementById('startBest').textContent = bestScore;

  // Button listeners
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('restartBtn').addEventListener('click', startGame);

  // Refit canvas on window resize
  window.addEventListener('resize', () => {
    resize();
    buildBg();
    // Reposition player to new ground; refit obstacle y-positions
    player.reset();
    for (const o of obstacles) o.y = H - CFG.GROUND_H - o.h;
  });

  setScreen('start');
  lastTs = performance.now();
  requestAnimationFrame(loop);
}());
