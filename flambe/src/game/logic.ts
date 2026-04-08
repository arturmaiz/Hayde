export const GRID_SIZE = 4;

export type Grid = number[][]; // 4x4; 0 = empty, otherwise = tile level (1–12)

export interface MoveResult {
  newGrid: Grid;
  score: number;
  changed: boolean;
  mergedPositions: Array<{ row: number; col: number }>;
  spawnedPosition: { row: number; col: number } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function emptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

function transpose(grid: Grid): Grid {
  return grid[0].map((_, colIdx) => grid.map(row => row[colIdx]));
}

function reverseRows(grid: Grid): Grid {
  return grid.map(row => [...row].reverse());
}

// ─── Core row compression (slides left) ─────────────────────────────────────
// Returns merged row, score gained, and which output indices had a merge.
function compressRow(row: number[]): { result: number[]; score: number; mergedAt: number[] } {
  const filtered = row.filter(v => v !== 0);
  const out: number[] = [];
  let score = 0;
  const mergedAt: number[] = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] + 1; // levels add by 1 (level 1+1 → level 2, etc.)
      out.push(merged);
      score += Math.pow(2, merged); // score = value of new tile
      mergedAt.push(out.length - 1);
      i += 2;
    } else {
      out.push(filtered[i]);
      i++;
    }
  }
  while (out.length < GRID_SIZE) out.push(0);
  return { result: out, score, mergedAt };
}

// ─── Directional slides ───────────────────────────────────────────────────────

function slideLeftRaw(grid: Grid): {
  newGrid: Grid;
  score: number;
  mergedPositions: Array<{ row: number; col: number }>;
} {
  let score = 0;
  const mergedPositions: Array<{ row: number; col: number }> = [];
  const newGrid: Grid = grid.map((row, rowIdx) => {
    const { result, score: s, mergedAt } = compressRow(row);
    score += s;
    mergedAt.forEach(col => mergedPositions.push({ row: rowIdx, col }));
    return result;
  });
  return { newGrid, score, mergedPositions };
}

export function slideLeft(grid: Grid): MoveResult {
  const { newGrid, score, mergedPositions } = slideLeftRaw(grid);
  const changed = !gridsEqual(grid, newGrid);
  const spawnedPosition = changed ? spawnTileInGrid(newGrid) : null;
  return { newGrid, score, changed, mergedPositions, spawnedPosition };
}

export function slideRight(grid: Grid): MoveResult {
  const reversed = reverseRows(grid);
  const { newGrid: slidResult, score, mergedPositions: mp } = slideLeftRaw(reversed);
  const newGrid = reverseRows(slidResult);
  // Mirror merged column positions back
  const mergedPositions = mp.map(({ row, col }) => ({ row, col: GRID_SIZE - 1 - col }));
  const changed = !gridsEqual(grid, newGrid);
  const spawnedPosition = changed ? spawnTileInGrid(newGrid) : null;
  return { newGrid, score, changed, mergedPositions, spawnedPosition };
}

export function slideUp(grid: Grid): MoveResult {
  const transposed = transpose(grid);
  const { newGrid: slidResult, score, mergedPositions: mp } = slideLeftRaw(transposed);
  const newGrid = transpose(slidResult);
  // In transposed space: row→col, col→row. After transpose back: row=mp.col, col=mp.row
  const mergedPositions = mp.map(({ row, col }) => ({ row: col, col: row }));
  const changed = !gridsEqual(grid, newGrid);
  const spawnedPosition = changed ? spawnTileInGrid(newGrid) : null;
  return { newGrid, score, changed, mergedPositions, spawnedPosition };
}

export function slideDown(grid: Grid): MoveResult {
  const transposed = transpose(grid);
  const reversed = reverseRows(transposed);
  const { newGrid: slidResult, score, mergedPositions: mp } = slideLeftRaw(reversed);
  const unReversed = reverseRows(slidResult);
  const newGrid = transpose(unReversed);
  const mergedPositions = mp.map(({ row, col }) => ({
    row: GRID_SIZE - 1 - col,
    col: row,
  }));
  const changed = !gridsEqual(grid, newGrid);
  const spawnedPosition = changed ? spawnTileInGrid(newGrid) : null;
  return { newGrid, score, changed, mergedPositions, spawnedPosition };
}

// ─── Tile spawning ───────────────────────────────────────────────────────────

export function spawnTileInGrid(grid: Grid): { row: number; col: number } | null {
  const empty: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) empty.push({ row: r, col: c });
    }
  }
  if (empty.length === 0) return null;
  const pos = empty[Math.floor(Math.random() * empty.length)];
  // 90% chance level 1 (value 2), 10% chance level 2 (value 4)
  grid[pos.row][pos.col] = Math.random() < 0.9 ? 1 : 2;
  return pos;
}

export function initGrid(): Grid {
  const grid = emptyGrid();
  spawnTileInGrid(grid);
  spawnTileInGrid(grid);
  return grid;
}

// ─── Game state checks ────────────────────────────────────────────────────────

function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

export function isGameOver(grid: Grid): boolean {
  // Any empty cell → not over
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) return false;
    }
  }
  // Any adjacent equal cells → not over
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = grid[r][c];
      if (c + 1 < GRID_SIZE && grid[r][c + 1] === v) return false;
      if (r + 1 < GRID_SIZE && grid[r + 1][c] === v) return false;
    }
  }
  return true;
}

export function hasWon(grid: Grid, winLevel: number): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] >= winLevel) return true;
    }
  }
  return false;
}

export type Direction = 'left' | 'right' | 'up' | 'down';

export function slide(grid: Grid, direction: Direction): MoveResult {
  switch (direction) {
    case 'left':  return slideLeft(grid);
    case 'right': return slideRight(grid);
    case 'up':    return slideUp(grid);
    case 'down':  return slideDown(grid);
  }
}
