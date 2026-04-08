import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GRID_SIZE, Grid } from '../game/logic';
import TileView from './TileView';

interface Props {
  grid: Grid;
  tileSize: number;
  gap: number;
  newTiles: Set<string>;    // "row,col" keys for spawn animation
  mergedTiles: Set<string>; // "row,col" keys for merge animation
}

export default function GridView({ grid, tileSize, gap, newTiles, mergedTiles }: Props) {
  const boardSize = GRID_SIZE * tileSize + (GRID_SIZE + 1) * gap;

  return (
    <View
      style={[
        styles.board,
        {
          width: boardSize,
          height: boardSize,
          borderRadius: boardSize * 0.04,
          padding: gap,
          gap: gap,
        },
      ]}
    >
      {grid.map((row, rowIdx) => (
        <View key={rowIdx} style={[styles.row, { gap }]}>
          {row.map((level, colIdx) => (
            <View
              key={colIdx}
              style={[
                styles.cell,
                { width: tileSize, height: tileSize, borderRadius: tileSize * 0.12 },
              ]}
            >
              {level > 0 && (
                <TileView
                  level={level}
                  size={tileSize}
                  isNew={newTiles.has(`${rowIdx},${colIdx}`)}
                  isMerged={mergedTiles.has(`${rowIdx},${colIdx}`)}
                />
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#2d1a00',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    backgroundColor: '#3d2a10',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
