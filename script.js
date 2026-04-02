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
   SOUND HOOKS
   ============================================================
   Replace the body of snd() with real Web Audio API calls to
   add sound effects.  e.g.:
     const AC = new AudioContext();
     function tone(freq, dur) {
       AC.resume();
       const o = AC.createOscillator();
       const g = AC.createGain();
       o.frequency.value = freq;
       g.gain.setValueAtTime(0.15, AC.currentTime);
       g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
       o.connect(g); g.connect(AC.destination);
       o.start(); o.stop(AC.currentTime + dur);
     }
   ============================================================ */
function snd(/* name: 'jump' | 'land' | 'die' */) {
  // placeholder — wire up AudioContext here
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
   OBSTACLES
   ============================================================ */
let obstacles = [];
let obsTimer  = 0;
let nextGap   = 1.5;   // seconds until first obstacle

function spawnObs() {
  // Two silhouette shapes: tall-narrow pillar or short-wide block
  const tall = Math.random() < 0.5;
  const w = tall
    ? CFG.PL_W * (0.5  + Math.random() * 0.35)    // narrow
    : CFG.PL_W * (1.2  + Math.random() * 0.9);    // wide
  const h = tall
    ? CFG.PL_H * (1.0  + Math.random() * 1.1)     // tall
    : CFG.PL_H * (0.45 + Math.random() * 0.35);   // short

  obstacles.push({ x: W + 20, y: H - CFG.GROUND_H - h, w, h });
}

function resetObs() {
  obstacles = [];
  obsTimer  = 0;
  nextGap   = 1.5;
}

function updateObs(dt) {
  // Scroll left
  for (const o of obstacles) o.x -= speed * dt;
  // Cull off-screen
  obstacles = obstacles.filter(o => o.x + o.w > -20);

  // Spawn next obstacle
  obsTimer += dt;
  if (obsTimer >= nextGap) {
    spawnObs();
    obsTimer = 0;

    // Shrink gap as speed increases (obstacles come faster)
    const t = Math.min((speed - CFG.SPEED_START) / (CFG.SPEED_MAX - CFG.SPEED_START), 1);
    nextGap  = CFG.GAP_MIN
             + (CFG.GAP_MAX - CFG.GAP_MIN) * (1 - t * 0.45)
             + (Math.random() * 0.4 - 0.2);   // ±0.2 s jitter
    nextGap  = Math.max(nextGap, CFG.GAP_MIN);
  }
}

function drawObs() {
  for (const o of obstacles) {
    ctx.save();
    ctx.shadowColor = CFG.COL_OBSTACLE;
    ctx.shadowBlur  = 12;

    const g = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y + o.h);
    g.addColorStop(0, '#ff9898');
    g.addColorStop(1, CFG.COL_OBSTACLE);
    ctx.fillStyle = g;
    rrect(o.x, o.y, o.w, o.h, 4);
    ctx.fill();

    // Top-edge highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle  = 'rgba(255,255,255,0.15)';
    rrect(o.x + 1, o.y + 1, o.w - 2, Math.min(8, o.h * 0.2), 3);
    ctx.fill();

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
   GAME STATE
   ============================================================ */
let state     = 'idle';    // 'idle' | 'playing' | 'dead'
let score     = 0;
let bestScore = +localStorage.getItem('dash_best') || 0;
let speed     = CFG.SPEED_START;
let elapsed   = 0;    // seconds in the current run (drives speed)
let lastTs    = 0;    // previous frame timestamp (ms)

function startGame() {
  score   = 0;
  speed   = CFG.SPEED_START;
  elapsed = 0;
  resetObs();
  player.reset();
  buildBg();
  setScreen('none');
  state = 'playing';
}

function gameOver() {
  if (state !== 'playing') return;
  state = 'dead';
  snd('die');
  document.getElementById('finalScore').textContent = Math.floor(score);
  document.getElementById('finalBest').textContent  = bestScore;
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

    if (collides()) { gameOver(); }
  }

  render();
  requestAnimationFrame(loop);
}

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  ctx.clearRect(0, 0, W, H);

  drawBg();

  // Obstacles (empty on idle, frozen on dead)
  drawObs();

  // Player — idle gets a gentle breathing bob
  player.draw(state === 'idle' ? Math.sin(bgT * 1.8) * 3 : 0);

  // HUD only while playing
  if (state === 'playing') drawHUD();

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

// Unified pointer handler — covers mouse clicks and touch taps
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (state === 'playing') player.jump();
});

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
