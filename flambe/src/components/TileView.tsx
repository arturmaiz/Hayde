import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { getTileData } from '../game/tiles';

interface Props {
  level: number;
  size: number;
  isNew?: boolean;
  isMerged?: boolean;
}

export default function TileView({ level, size, isNew = false, isMerged = false }: Props) {
  const scale = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;

  const data = getTileData(level);
  const isHot = level >= 9;

  // Spawn animation
  useEffect(() => {
    if (isNew) {
      scale.setValue(0);
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isNew]);

  // Merge animation
  useEffect(() => {
    if (isMerged) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 80, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isMerged]);

  // Pulsing glow for hot tiles
  useEffect(() => {
    if (isHot) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isHot]);

  const fontSize = size * 0.38;
  const nameFontSize = size * 0.12;

  return (
    <Animated.View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: data.color,
          borderRadius: size * 0.12,
          transform: [{ scale }],
        },
        isHot && {
          borderWidth: 2,
          borderColor: '#ffd700',
        },
      ]}
    >
      {isHot && (
        <Animated.View
          style={[
            styles.glow,
            {
              borderRadius: size * 0.12,
              opacity: glowOpacity,
              backgroundColor: data.color + '66',
              width: size + 8,
              height: size + 8,
              top: -4,
              left: -4,
            },
          ]}
          pointerEvents="none"
        />
      )}
      <Text style={[styles.emoji, { fontSize }]}>{data.emoji}</Text>
      <Text
        style={[styles.name, { fontSize: nameFontSize, color: data.textColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {data.name}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    zIndex: -1,
  },
  emoji: {
    textAlign: 'center',
    lineHeight: undefined,
  },
  name: {
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 2,
    marginTop: 1,
  },
});
