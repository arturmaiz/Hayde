import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const BEST_SCORE_KEY = '@flambe:bestScore';
const { width, height } = Dimensions.get('window');

const FOOD_EMOJIS = ['🥚', '🍳', '🥞', '🌮', '🍔', '🌶️', '🍜', '🔥', '💥', '🏆'];

function FloatingEmoji({ emoji, delay }: { emoji: string; delay: number }) {
  const y = useRef(new Animated.Value(height + 40)).current;
  const x = useRef(new Animated.Value(Math.random() * width)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = () => {
      y.setValue(height + 40);
      x.setValue(Math.random() * (width - 40));
      opacity.setValue(0);
      rot.setValue(Math.random() * 40 - 20);
      Animated.parallel([
        Animated.timing(y, { toValue: -40, duration: 4000 + Math.random() * 3000, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.6, duration: 500, useNativeDriver: true }),
          Animated.delay(2500),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]).start(() => anim());
    };
    const t = setTimeout(anim, delay);
    return () => clearTimeout(t);
  }, []);

  const rotate = rot.interpolate({ inputRange: [-20, 20], outputRange: ['-20deg', '20deg'] });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        fontSize: 28 + Math.random() * 20,
        opacity,
        transform: [{ translateY: y }, { translateX: x }, { rotate }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

interface Props {
  onStartGame: () => void;
}

export default function MenuScreen({ onStartGame }: Props) {
  const [bestScore, setBestScore] = useState(0);
  const titleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(BEST_SCORE_KEY).then(val => {
      if (val) setBestScore(parseInt(val, 10));
    });
    // Pulsing title animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(titleScale, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(titleScale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Floating food background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {FOOD_EMOJIS.map((e, i) => (
          <FloatingEmoji key={i} emoji={e} delay={i * 400} />
        ))}
      </View>

      <View style={styles.container}>
        {/* Title */}
        <Animated.View style={{ transform: [{ scale: titleScale }], alignItems: 'center' }}>
          <Text style={styles.titleEmoji}>🔥</Text>
          <Text style={styles.title}>Flambé</Text>
          <Text style={styles.tagline}>Merge & Cook</Text>
        </Animated.View>

        {/* Description */}
        <View style={styles.descBox}>
          <Text style={styles.desc}>
            Swipe to merge matching dishes.{'\n'}
            Combine ingredients into the{'\n'}
            <Text style={styles.descHighlight}>🏆 ULTIMATE FLAMBÉ</Text>
          </Text>
        </View>

        {/* Best Score */}
        {bestScore > 0 && (
          <View style={styles.bestBox}>
            <Text style={styles.bestLabel}>BEST SCORE</Text>
            <Text style={styles.bestValue}>{bestScore.toLocaleString()}</Text>
          </View>
        )}

        {/* Start Button */}
        <TouchableOpacity style={styles.startBtn} onPress={onStartGame} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>Start Cooking! 🍳</Text>
        </TouchableOpacity>

        {/* Tier preview */}
        <View style={styles.tierRow}>
          {['🥚','🍳','🥞','→','🔥','💥','🏆'].map((e, i) => (
            <Text key={i} style={styles.tierEmoji}>{e}</Text>
          ))}
        </View>
        <Text style={styles.tierHint}>12 tiers of delicious chaos</Text>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  titleEmoji: {
    fontSize: 64,
    marginBottom: 4,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: '#ff6b1a',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#c9833a',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  descBox: {
    backgroundColor: '#2d1a00',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  desc: {
    color: '#c9833a',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
  },
  descHighlight: {
    color: '#ffd700',
    fontWeight: '900',
  },
  bestBox: {
    alignItems: 'center',
  },
  bestLabel: {
    color: '#c9833a',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  bestValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  startBtn: {
    backgroundColor: '#e76f00',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 48,
    shadowColor: '#ff6b1a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    marginTop: 4,
  },
  tierEmoji: {
    fontSize: 22,
  },
  tierHint: {
    color: '#5a3a1a',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: -8,
  },
});
