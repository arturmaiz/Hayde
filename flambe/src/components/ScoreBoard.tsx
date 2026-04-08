import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  score: number;
  bestScore: number;
}

export default function ScoreBoard({ score, bestScore }: Props) {
  return (
    <View style={styles.row}>
      <ScoreBox label="SCORE" value={score} />
      <ScoreBox label="BEST" value={bestScore} />
    </View>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.box}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  box: {
    flex: 1,
    backgroundColor: '#2d1a00',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  label: {
    color: '#c9833a',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  value: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    minWidth: 60,
    textAlign: 'center',
  },
});
