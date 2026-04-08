import { useRef } from 'react';
import { PanResponder } from 'react-native';
import { Direction } from '../game/logic';

const SWIPE_THRESHOLD = 30;

export function useSwipe(onSwipe: (direction: Direction) => void, enabled: boolean) {
  const isAnimating = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 5 || Math.abs(dy) > 5,
      onPanResponderRelease: (_, { dx, dy }) => {
        if (!enabled || isAnimating.current) return;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) return;
        let direction: Direction;
        if (absDx > absDy) {
          direction = dx > 0 ? 'right' : 'left';
        } else {
          direction = dy > 0 ? 'down' : 'up';
        }
        isAnimating.current = true;
        onSwipe(direction);
        // Re-enable after animation window
        setTimeout(() => { isAnimating.current = false; }, 220);
      },
    })
  ).current;

  return panResponder.panHandlers;
}
