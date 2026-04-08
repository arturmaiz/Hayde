import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import GameScreen from './src/screens/GameScreen';
import MenuScreen from './src/screens/MenuScreen';

type Screen = 'menu' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#1a0a00" />
      {screen === 'menu' ? (
        <MenuScreen onStartGame={() => setScreen('game')} />
      ) : (
        <GameScreen onGoMenu={() => setScreen('menu')} />
      )}
    </GestureHandlerRootView>
  );
}
