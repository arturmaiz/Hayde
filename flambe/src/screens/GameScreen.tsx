import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import GridView from '../components/GridView';
import ScoreBoard from '../components/ScoreBoard';
import { Direction, Grid, initGrid, isGameOver, hasWon, slide } from '../game/logic';
import { WIN_LEVEL } from '../game/tiles';
import { useSwipe } from '../hooks/useSwipe';

const BEST_SCORE_KEY = '@flambe:bestScore';

interface Props {
  onGoMenu: () => void;
}

const { width } = Dimensions.get('window');
const BOARD_PADDING = 16;
const GAP = 8;
const TILE_SIZE = Math.floor((width - BOARD_PADDING * 2 - GAP * 5) / 4);

export default function GameScreen({ onGoMenu }: Props) {
  const [grid, setGrid] = useState<Grid>(() => initGrid());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [newTiles, setNewTiles] = useState<Set<string>>(new Set());
  const [mergedTiles, setMergedTiles] = useState<Set<string>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepGoing, setKeepGoing] = useState(false);
  const swipeEnabled = useRef(true);

  // Load best score on mount
  useEffect(() => {
    AsyncStorage.getItem(BEST_SCORE_KEY).then(val => {
      if (val) setBestScore(parseInt(val, 10));
    });
  }, []);

  // Persist best score whenever score changes
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      AsyncStorage.setItem(BEST_SCORE_KEY, String(score));
    }
  }, [score]);

  const handleSwipe = useCallback(
    (direction: Direction) => {
      if (!swipeEnabled.current) return;
      swipeEnabled.current = false;

      const result = slide(grid, direction);

      if (!result.changed) {
        swipeEnabled.current = true;
        return;
      }

      // Build animation sets
      const merged = new Set<string>(
        result.mergedPositions.map(p => `${p.row},${p.col}`)
      );
      const spawned = new Set<string>();
      if (result.spawnedPosition) {
        spawned.add(`${result.spawnedPosition.row},${result.spawnedPosition.col}`);
      }

      setMergedTiles(merged);
      setNewTiles(spawned);
      setGrid(result.newGrid);
      setScore(prev => prev + result.score);

      // Check win
      if (!keepGoing && hasWon(result.newGrid, WIN_LEVEL)) {
        setWon(true);
      }

      // Check game over
      if (isGameOver(result.newGrid)) {
        setGameOver(true);
      }

      setTimeout(() => {
        setMergedTiles(new Set());
        setNewTiles(new Set());
        swipeEnabled.current = true;
      }, 220);
    },
    [grid, keepGoing]
  );

  const swipeEnabled2 = !gameOver && (!won || keepGoing);
  const panHandlers = useSwipe(handleSwipe, swipeEnabled2);

  const handleNewGame = () => {
    setGrid(initGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepGoing(false);
    setNewTiles(new Set());
    setMergedTiles(new Set());
    swipeEnabled.current = true;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>🔥 Flambé</Text>
            <Text style={styles.subtitle}>Merge & Cook</Text>
          </View>
          <View style={styles.headerRight}>
            <ScoreBoard score={score} bestScore={bestScore} />
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btnSecondary} onPress={onGoMenu}>
            <Text style={styles.btnSecondaryText}>← Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleNewGame}>
            <Text style={styles.btnPrimaryText}>New Game</Text>
          </TouchableOpacity>
        </View>

        {/* Grid */}
        <View {...panHandlers} style={styles.gridWrapper}>
          <GridView
            grid={grid}
            tileSize={TILE_SIZE}
            gap={GAP}
            newTiles={newTiles}
            mergedTiles={mergedTiles}
          />
        </View>

        {/* Hint */}
        <Text style={styles.hint}>Swipe to merge matching dishes</Text>
      </View>

      {/* Game Over Overlay */}
      <Modal transparent visible={gameOver} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>😵‍💫</Text>
            <Text style={styles.overlayTitle}>Kitchen Chaos!</Text>
            <Text style={styles.overlaySubtitle}>The kitchen burned down.</Text>
            <Text style={styles.overlayScore}>Score: {score.toLocaleString()}</Text>
            <TouchableOpacity style={styles.overlayBtn} onPress={handleNewGame}>
              <Text style={styles.overlayBtnText}>Try Again 🔥</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.overlayBtnSecondary} onPress={onGoMenu}>
              <Text style={styles.overlayBtnSecondaryText}>Main Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Win Overlay */}
      <Modal transparent visible={won && !keepGoing} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>🏆🔥</Text>
            <Text style={styles.overlayTitle}>ULTIMATE FLAMBÉ!</Text>
            <Text style={styles.overlaySubtitle}>You reached the legendary dish!</Text>
            <Text style={styles.overlayScore}>Score: {score.toLocaleString()}</Text>
            <TouchableOpacity
              style={styles.overlayBtn}
              onPress={() => setKeepGoing(true)}
            >
              <Text style={styles.overlayBtnText}>Keep Cooking! 🍳</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.overlayBtnSecondary} onPress={handleNewGame}>
              <Text style={styles.overlayBtnSecondaryText}>New Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1a0a00',
  },
  container: {
    flex: 1,
    paddingHorizontal: BOARD_PADDING,
    paddingTop: 8,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ff6b1a',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c9833a',
    letterSpacing: 1,
  },
  headerRight: {
    flex: 1,
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    width: '100%',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#e76f00',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#2d1a00',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#c9833a',
    fontWeight: '700',
    fontSize: 15,
  },
  gridWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: '#5a3a1a',
    fontSize: 12,
    marginTop: 14,
    fontWeight: '600',
  },
  // Overlays
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCard: {
    backgroundColor: '#1a0a00',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: width * 0.82,
    borderWidth: 2,
    borderColor: '#e76f00',
  },
  overlayEmoji: {
    fontSize: 60,
    marginBottom: 8,
  },
  overlayTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ff6b1a',
    textAlign: 'center',
  },
  overlaySubtitle: {
    fontSize: 14,
    color: '#c9833a',
    marginTop: 6,
    textAlign: 'center',
  },
  overlayScore: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginTop: 10,
    marginBottom: 20,
  },
  overlayBtn: {
    backgroundColor: '#e76f00',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  overlayBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 17,
  },
  overlayBtnSecondary: {
    paddingVertical: 10,
  },
  overlayBtnSecondaryText: {
    color: '#c9833a',
    fontWeight: '700',
    fontSize: 14,
  },
});
