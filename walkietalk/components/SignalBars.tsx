import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../constants/theme';

interface SignalBarsProps {
  /** 0-5 fixed strength; when omitted the bars animate/idle automatically. */
  strength?: number;
  /** animate the bars as if actively receiving/scanning */
  active?: boolean;
  color?: string;
  height?: number;
}

const BAR_COUNT = 5;

/**
 * Retro signal-strength meter (1–5 bars). When `active`, the number of lit
 * bars gently fluctuates to feel like a live radio; otherwise it renders the
 * provided fixed `strength`.
 */
export function SignalBars({
  strength,
  active = false,
  color = colors.displayText,
  height = 26,
}: SignalBarsProps) {
  const [autoLevel, setAutoLevel] = useState(4);
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(1))
  ).current;

  // Fluctuate the level while active for a lively meter.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setAutoLevel(3 + Math.floor(Math.random() * 3)); // 3..5
    }, 700);
    return () => clearInterval(id);
  }, [active]);

  const level = strength ?? (active ? autoLevel : 4);

  useEffect(() => {
    anims.forEach((a, i) => {
      Animated.timing(a, {
        toValue: i < level ? 1 : 0.22,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }, [level, anims]);

  return (
    <View style={[styles.row, { height }]}>
      {anims.map((a, i) => {
        const barHeight = 8 + i * ((height - 8) / (BAR_COUNT - 1));
        return (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: color,
                opacity: a,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    width: 5,
    marginHorizontal: 1.5,
    borderRadius: 1,
  },
});

export default SignalBars;
