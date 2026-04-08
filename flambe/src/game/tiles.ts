export interface TileData {
  emoji: string;
  name: string;
  color: string;
  textColor: string;
}

// level → tile visual data. Level 1 = value 2, level 12 = value 4096
export const TILES: Record<number, TileData> = {
  1:  { emoji: '🥚',   name: 'Raw Egg',            color: '#F5F0DC', textColor: '#5a4a2a' },
  2:  { emoji: '🍳',   name: 'Fried Egg',           color: '#FADA5E', textColor: '#6a4a00' },
  3:  { emoji: '🥞',   name: 'Sad Pancake',         color: '#E8A87C', textColor: '#6a3000' },
  4:  { emoji: '🌮',   name: 'Confused Taco',       color: '#F4A261', textColor: '#ffffff' },
  5:  { emoji: '🍔',   name: 'Angry Burger',        color: '#E76F51', textColor: '#ffffff' },
  6:  { emoji: '🌶️',  name: 'Cursed Chili',        color: '#D62828', textColor: '#ffffff' },
  7:  { emoji: '🍜',   name: 'Unhinged Ramen',      color: '#9B2226', textColor: '#ffffff' },
  8:  { emoji: '🦞',   name: 'Screaming Lobster',   color: '#AE2012', textColor: '#ffffff' },
  9:  { emoji: '🔥',   name: 'Fire Surprise',       color: '#CA6702', textColor: '#ffffff' },
  10: { emoji: '💥',   name: 'Kitchen Explosion',   color: '#BB3E03', textColor: '#ffffff' },
  11: { emoji: '🌋',   name: 'Volcanic Feast',      color: '#9B1D20', textColor: '#ffd700' },
  12: { emoji: '🏆',   name: 'ULTIMATE FLAMBÉ',     color: '#6A0572', textColor: '#ffd700' },
};

export function getTileData(level: number): TileData {
  return TILES[level] ?? TILES[12];
}

export function levelToValue(level: number): number {
  return Math.pow(2, level);
}

export const MAX_LEVEL = 12;
export const WIN_LEVEL = 12;
