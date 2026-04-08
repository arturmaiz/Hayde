'use strict';

// ─── Configuration ────────────────────────────────────────────────────────────
const CFG = {
  SIZE:      4,
  SWIPE_MIN: 30,
  LS_BEST:   'flambe_best',
  WIN_LEVEL: 12,   // level 12 = 4096

  TILES: [
    null, // index 0 unused
    { emoji:'🥚',  name:'Raw Egg',          bg:'#F5F0DC', fg:'#5a4a2a' },
    { emoji:'🍳',  name:'Fried Egg',         bg:'#FADA5E', fg:'#6a4a00' },
    { emoji:'🥞',  name:'Sad Pancake',       bg:'#E8A87C', fg:'#5a2a00' },
    { emoji:'🌮',  name:'Confused Taco',     bg:'#F4A261', fg:'#fff'    },
    { emoji:'🍔',  name:'Angry Burger',      bg:'#E76F51', fg:'#fff'    },
    { emoji:'🌶️', name:'Cursed Chili',      bg:'#D62828', fg:'#fff'    },
    { emoji:'🍜',  name:'Unhinged Ramen',    bg:'#9B2226', fg:'#fff'    },
    { emoji:'🦞',  name:'Screaming Lobster', bg:'#AE2012', fg:'#fff'    },
    { emoji:'🔥',  name:'Fire Surprise',     bg:'#CA6702', fg:'#fff'    },
    { emoji:'💥',  name:'Kitchen Explosion', bg:'#BB3E03', fg:'#fff'    },
    { emoji:'🌋',  name:'Volcanic Feast',    bg:'#9B1D20', fg:'#ffd700' },
    { emoji:'🏆',  name:'ULTIMATE FLAMBÉ',   bg:'#6A0572', fg:'#ffd700' },
  ],
};

// ─── Grid Logic (pure functions) ──────────────────────────────────────────────

function emptyGrid() {
  return Array.from({ length: CFG.SIZE }, () => Array(CFG.SIZE).fill(0));
}

function cloneGrid(g) { return g.map(r => [...r]); }

function gridsEqual(a, b) {
  for (let r = 0; r < CFG.SIZE; r++)
    for (let c = 0; c < CFG.SIZE; c++)
      if (a[r][c] !== b[r][c]) return false;
  return true;
}

// Slide+merge a single row leftward; returns { row, score, mergedAt[] }
function compressRow(row) {
  const non = row.filter(v => v !== 0);
  let score = 0;
  const mergedAt = [];
  let i = 0;
  while (i < non.length) {
    if (i + 1 < non.length && non[i] === non[i + 1]) {
      non[i] += 1;  // level up
      score += Math.pow(2, non[i]);
      non.splice(i + 1, 1);
      mergedAt.push(i);
    }
    i++;
  }
  while (non.length < CFG.SIZE) non.push(0);
  return { row: non, score, mergedAt };
}

function transpose(g) {
  return g[0].map((_, c) => g.map(r => r[c]));
}

function reverseRows(g) { return g.map(r => [...r].reverse()); }

function slideLeft(grid) {
  let score = 0;
  const mergedPositions = [];
  const newGrid = grid.map((row, ri) => {
    const { row: nr, score: s, mergedAt } = compressRow(row);
    score += s;
    mergedAt.forEach(ci => mergedPositions.push({ r: ri, c: ci }));
    return nr;
  });
  return { newGrid, score, mergedPositions, changed: !gridsEqual(grid, newGrid) };
}

function slideRight(grid) {
  const r = reverseRows(grid);
  const { newGrid, score, mergedPositions, changed } = slideLeft(r);
  return {
    newGrid: reverseRows(newGrid),
    score, changed,
    mergedPositions: mergedPositions.map(({ r, c }) => ({ r, c: CFG.SIZE - 1 - c })),
  };
}

function slideUp(grid) {
  const t = transpose(grid);
  const { newGrid, score, mergedPositions, changed } = slideLeft(t);
  return {
    newGrid: transpose(newGrid),
    score, changed,
    mergedPositions: mergedPositions.map(({ r, c }) => ({ r: c, c: r })),
  };
}

function slideDown(grid) {
  const t = transpose(grid);
  const r = reverseRows(t);
  const { newGrid, score, mergedPositions, changed } = slideLeft(r);
  const unrev = reverseRows(newGrid);
  return {
    newGrid: transpose(unrev),
    score, changed,
    mergedPositions: mergedPositions.map(({ r: pr, c }) => ({
      r: CFG.SIZE - 1 - c,
      c: pr,
    })),
  };
}

function spawnTile(grid) {
  const empty = [];
  for (let r = 0; r < CFG.SIZE; r++)
    for (let c = 0; c < CFG.SIZE; c++)
      if (grid[r][c] === 0) empty.push({ r, c });
  if (!empty.length) return null;
  const pos = empty[Math.floor(Math.random() * empty.length)];
  grid[pos.r][pos.c] = Math.random() < 0.9 ? 1 : 2;
  return pos;
}

function isGameOver(grid) {
  for (let r = 0; r < CFG.SIZE; r++)
    for (let c = 0; c < CFG.SIZE; c++) {
      if (grid[r][c] === 0) return false;
      if (c < CFG.SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < CFG.SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
    }
  return true;
}

function hasWon(grid) {
  return grid.some(r => r.some(v => v >= CFG.WIN_LEVEL));
}

function maxTile(grid) {
  let m = 0;
  grid.forEach(r => r.forEach(v => { if (v > m) m = v; }));
  return m;
}

// ─── Audio ────────────────────────────────────────────────────────────────────
const Audio = (() => {
  let ctx, master, sfx, voices = 0;
  const MAX_V = 10;

  function boot() {
    if (ctx) return;
    try {
      ctx    = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
      sfx    = ctx.createGain(); sfx.gain.value    = 0.6; sfx.connect(master);
    } catch (_) {}
  }

  function resume() { ctx?.state === 'suspended' && ctx.resume(); }

  function tone(freqs, type, dur, vol) {
    if (!ctx) return;
    freqs.forEach((f, i) => {
      if (voices >= MAX_V) return;
      voices++;
      try {
        const t   = ctx.currentTime + i * 0.05;
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.connect(g); g.connect(sfx);
        osc.type = type;
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.start(t); osc.stop(t + dur + 0.02);
        osc.onended = () => { voices = Math.max(0, voices - 1); };
      } catch (_) { voices = Math.max(0, voices - 1); }
    });
  }

  return {
    boot, resume,
    slide()      { tone([180, 140],              'triangle', 0.10, 0.18); },
    merge(tier)  {
      if      (tier >= 12) tone([440,660,880,1100], 'sine',     0.30, 0.40);
      else if (tier >= 9)  tone([440,660,880],       'sine',     0.22, 0.35);
      else if (tier >= 6)  tone([660,880],            'sine',     0.16, 0.28);
      else                 tone([660],                'sine',     0.12, 0.22);
    },
    gameOver()   { tone([220,160,110,80], 'sawtooth', 0.30, 0.40); },
  };
})();

// ─── Game State ───────────────────────────────────────────────────────────────
const State = {
  grid:      emptyGrid(),
  score:     0,
  best:      0,
  gameOver:  false,
  won:       false,
  keepGoing: false,
  busy:      false,
  cellSize:  0,
  gap:       0,
  padding:   0,

  init() {
    this.best = parseInt(localStorage.getItem(CFG.LS_BEST) || '0', 10);
    this.newGame();
  },

  newGame() {
    this.grid      = emptyGrid();
    this.score     = 0;
    this.gameOver  = false;
    this.won       = false;
    this.keepGoing = false;
    this.busy      = false;
    spawnTile(this.grid);
    spawnTile(this.grid);
  },

  addScore(n) {
    this.score += n;
    if (this.score > this.best) {
      this.best = this.score;
      try { localStorage.setItem(CFG.LS_BEST, String(this.best)); } catch (_) {}
    }
  },
};

// ─── Renderer ─────────────────────────────────────────────────────────────────
const Renderer = {
  gridEl:  null,
  tileEls: new Map(), // key: "r,c" → element
  idSeq:   0,

  init() {
    this.gridEl = document.getElementById('grid');
    // Create 16 empty cell slots
    this.gridEl.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      this.gridEl.appendChild(cell);
    }
    this.resize();
  },

  resize() {
    const wrap = document.getElementById('grid-wrap');
    const w    = wrap.clientWidth;
    const gap  = Math.round(w * 0.028);
    const pad  = Math.round(w * 0.028);
    const cell = Math.floor((w - pad * 2 - gap * (CFG.SIZE - 1)) / CFG.SIZE);
    State.cellSize = cell;
    State.gap      = gap;
    State.padding  = pad;
    this.gridEl.style.gap     = gap + 'px';
    this.gridEl.style.padding = pad + 'px';
    // Resize existing tiles
    this.tileEls.forEach(el => this._sizeTile(el));
  },

  _pos(r, c) {
    const { cellSize, gap, padding } = State;
    return {
      left: padding + c * (cellSize + gap),
      top:  padding + r * (cellSize + gap),
    };
  },

  _sizeTile(el) {
    const { cellSize } = State;
    el.style.width  = cellSize + 'px';
    el.style.height = cellSize + 'px';
    const emojiEl = el.querySelector('.tile-emoji');
    const nameEl  = el.querySelector('.tile-name');
    if (emojiEl) emojiEl.style.fontSize = Math.round(cellSize * 0.38) + 'px';
    if (nameEl)  nameEl.style.fontSize  = Math.round(cellSize * 0.115) + 'px';
  },

  _makeTile(level, r, c) {
    const d   = CFG.TILES[level];
    const el  = document.createElement('div');
    const pos = this._pos(r, c);
    el.className = 'tile tile-new';
    el.style.backgroundColor = d.bg;
    el.style.left = pos.left + 'px';
    el.style.top  = pos.top  + 'px';
    if (level >= 12) el.classList.add('tile-ultimate');
    else if (level >= 9) el.classList.add('tile-hot');
    el.innerHTML = `
      <span class="tile-emoji">${d.emoji}</span>
      <span class="tile-name" style="color:${d.fg}">${d.name}</span>`;
    this._sizeTile(el);
    this.gridEl.appendChild(el);
    return el;
  },

  // Full re-render from scratch
  fullRender() {
    // Remove old tiles
    this.tileEls.forEach(el => el.remove());
    this.tileEls.clear();
    this.idSeq = 0;
    for (let r = 0; r < CFG.SIZE; r++)
      for (let c = 0; c < CFG.SIZE; c++) {
        const v = State.grid[r][c];
        if (v) {
          const el = this._makeTile(v, r, c);
          el.classList.remove('tile-new');
          this.tileEls.set(`${r},${c}`, el);
        }
      }
  },

  // Animate a move result
  applyMove(prevGrid, newGrid, mergedPositions, spawnedPos) {
    // Build a lookup of where each tile ended up
    // For simplicity: remove all tiles, re-add from newGrid,
    // mark spawn as new, mark merged positions as merged.
    this.tileEls.forEach(el => el.remove());
    this.tileEls.clear();

    const mergedSet = new Set(mergedPositions.map(p => `${p.r},${p.c}`));

    for (let r = 0; r < CFG.SIZE; r++) {
      for (let c = 0; c < CFG.SIZE; c++) {
        const v = newGrid[r][c];
        if (!v) continue;
        const key = `${r},${c}`;
        const el  = this._makeTile(v, r, c);
        el.classList.remove('tile-new');

        if (spawnedPos && spawnedPos.r === r && spawnedPos.c === c) {
          el.classList.add('tile-new');
        } else if (mergedSet.has(key)) {
          el.classList.add('tile-merged');
        }
        this.tileEls.set(key, el);
      }
    }
  },
};

// ─── UI ───────────────────────────────────────────────────────────────────────
const UI = {
  screens: {},
  overlays: {},

  init() {
    this.screens = {
      menu:     document.getElementById('screen-menu'),
      tutorial: document.getElementById('screen-tutorial'),
      game:     document.getElementById('screen-game'),
    };
    this.overlays = {
      gameover: document.getElementById('overlay-gameover'),
      win:      document.getElementById('overlay-win'),
    };
    this._bindButtons();
    this._buildMenuBg();
    this.show('menu');
    this.updateScoreDisplay();
  },

  show(name) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    if (this.screens[name]) this.screens[name].classList.add('active');
  },

  showOverlay(name) {
    Object.values(this.overlays).forEach(o => o.classList.add('hidden'));
    if (this.overlays[name]) this.overlays[name].classList.remove('hidden');
  },

  hideOverlays() {
    Object.values(this.overlays).forEach(o => o.classList.add('hidden'));
  },

  updateScoreDisplay() {
    const scoreEl = document.getElementById('score');
    const bestEl  = document.getElementById('best');
    if (scoreEl) scoreEl.textContent = State.score.toLocaleString();
    if (bestEl)  bestEl.textContent  = State.best.toLocaleString();
  },

  _bindButtons() {
    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchend', e => { e.preventDefault(); Audio.boot(); Audio.resume(); fn(); });
      el.addEventListener('click',    () => { Audio.boot(); Audio.resume(); fn(); });
    };

    on('btn-play',          () => { this.show('game'); });
    on('btn-how',           () => { this.show('tutorial'); });
    on('btn-tut-go',        () => { this.show('game'); });
    on('btn-new',           () => { this._startNewGame(); });
    on('btn-menu-link',     () => { this.hideOverlays(); this.show('menu'); this._updateMenuBest(); });
    on('btn-retry',         () => { this._startNewGame(); });
    on('btn-gameover-menu', () => { this.hideOverlays(); this.show('menu'); this._updateMenuBest(); });
    on('btn-keep-going',    () => { State.keepGoing = true; this.hideOverlays(); });
    on('btn-win-new',       () => { this._startNewGame(); });
  },

  _startNewGame() {
    State.newGame();
    this.hideOverlays();
    this.show('game');
    Renderer.fullRender();
    this.updateScoreDisplay();
  },

  _updateMenuBest() {
    const chip = document.getElementById('menu-best');
    const val  = document.getElementById('menu-best-val');
    if (State.best > 0 && chip && val) {
      val.textContent = State.best.toLocaleString();
      chip.classList.remove('hidden');
    }
  },

  showGameOver(isNewBest) {
    const level = maxTile(State.grid);
    const d     = CFG.TILES[Math.max(1, Math.min(level, 12))];
    document.getElementById('go-score').textContent = State.score.toLocaleString();
    document.getElementById('go-tile').textContent  = (d?.emoji || '🥚') + ' ' + (d?.name || '');
    document.getElementById('go-best').textContent  = State.best.toLocaleString();
    const newBestEl = document.getElementById('go-newbest');
    if (isNewBest) newBestEl.classList.remove('hidden');
    else           newBestEl.classList.add('hidden');
    this.showOverlay('gameover');
  },

  showWin() {
    document.getElementById('win-score').textContent = State.score.toLocaleString();
    this.showOverlay('win');
  },

  _buildMenuBg() {
    const bg     = document.getElementById('menu-bg');
    const emojis = ['🥚','🍳','🥞','🌮','🍔','🌶️','🍜','🦞','🔥','💥','🏆'];
    for (let i = 0; i < 14; i++) {
      const el = document.createElement('span');
      el.className = 'menu-bg-emoji';
      el.textContent = emojis[i % emojis.length];
      const left = 5 + Math.random() * 85;
      const dur  = 4 + Math.random() * 4;
      const delay = Math.random() * 6;
      const rot  = -30 + Math.random() * 60;
      el.style.cssText = `
        left: ${left}%; bottom: -60px;
        font-size: ${20 + Math.random() * 20}px;
        animation-duration: ${dur}s;
        animation-delay: ${delay}s;
        animation-iteration-count: infinite;
        --rot: ${rot}deg;
      `;
      bg.appendChild(el);
    }
  },
};

// ─── Input ────────────────────────────────────────────────────────────────────
const Input = (() => {
  let startX, startY;

  function handleSwipe(dx, dy) {
    if (State.busy || State.gameOver) return;
    if (Math.hypot(dx, dy) < CFG.SWIPE_MIN) return;

    Audio.resume();
    const isHoriz = Math.abs(dx) > Math.abs(dy);
    let dir;
    if (isHoriz) dir = dx > 0 ? 'right' : 'left';
    else         dir = dy > 0 ? 'down'  : 'up';

    const prevGrid = cloneGrid(State.grid);
    const { newGrid, score, mergedPositions, changed } =
      dir === 'left'  ? slideLeft(State.grid)  :
      dir === 'right' ? slideRight(State.grid) :
      dir === 'up'    ? slideUp(State.grid)    :
                        slideDown(State.grid);

    if (!changed) return;

    State.busy = true;
    Audio.slide();

    State.grid = newGrid;
    State.addScore(score);
    UI.updateScoreDisplay();

    if (mergedPositions.length > 0) {
      const maxMerge = mergedPositions.reduce((m, p) => Math.max(m, newGrid[p.r][p.c]), 0);
      Audio.merge(maxMerge);
    }

    const spawnedPos = spawnTile(State.grid);
    Renderer.applyMove(prevGrid, State.grid, mergedPositions, spawnedPos);

    // Check win (once)
    if (!State.keepGoing && !State.won && hasWon(State.grid)) {
      State.won = true;
      setTimeout(() => { UI.showWin(); }, 250);
    }
    // Check game over
    else if (isGameOver(State.grid)) {
      State.gameOver = true;
      const wasNewBest = State.score >= State.best && State.score > 0;
      setTimeout(() => {
        Audio.gameOver();
        UI.showGameOver(wasNewBest);
      }, 300);
    }

    setTimeout(() => { State.busy = false; }, 220);
  }

  return {
    init() {
      const wrap = document.getElementById('grid-wrap');
      wrap.addEventListener('touchstart', e => {
        const t = e.changedTouches[0];
        startX = t.clientX; startY = t.clientY;
      }, { passive: true });
      wrap.addEventListener('touchend', e => {
        const t = e.changedTouches[0];
        handleSwipe(t.clientX - startX, t.clientY - startY);
      }, { passive: true });
      // Keyboard support
      document.addEventListener('keydown', e => {
        const map = {
          ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down',
          KeyA:'left', KeyD:'right', KeyW:'up', KeyS:'down',
        };
        if (map[e.code]) { e.preventDefault(); handleSwipe(
          map[e.code]==='left'?-60:map[e.code]==='right'?60:0,
          map[e.code]==='up'?-60:map[e.code]==='down'?60:0
        ); }
      });
    },
  };
})();

// ─── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  State.init();
  Renderer.init();
  Renderer.fullRender();
  UI.init();
  Input.init();

  window.addEventListener('resize', () => {
    Renderer.resize();
    Renderer.fullRender();
  });
});
