import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { colors, fonts } from '../constants/theme';

interface RadioDialProps {
  channel: number;
  min?: number;
  max?: number;
  onUp: () => void;
  onDown: () => void;
}

/**
 * Rotary-style channel selector with up/down buttons flanking a dial that
 * rotates as the channel changes. Purely aesthetic rotation + functional
 * increment/decrement.
 */
export function RadioDial({ channel, min = 1, max = 25, onUp, onDown }: RadioDialProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: channel,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [channel, rotation]);

  const spin = rotation.interpolate({
    inputRange: [min, max],
    outputRange: ['0deg', `${(max - min) * 30}deg`],
    extrapolate: 'extend',
  });

  const atMin = channel <= min;
  const atMax = channel >= max;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onDown}
        disabled={atMin}
        style={({ pressed }) => [
          styles.arrowBtn,
          { opacity: atMin ? 0.35 : pressed ? 0.7 : 1 },
        ]}
        accessibilityLabel="Channel down"
      >
        <Text style={styles.arrow}>◀</Text>
        <Text style={styles.arrowLabel}>CH</Text>
      </Pressable>

      <View style={styles.dialWrap}>
        <Animated.View style={[styles.dial, { transform: [{ rotate: spin }] }]}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.tick,
                {
                  transform: [{ rotate: `${i * 30}deg` }, { translateY: -26 }],
                  backgroundColor: i === 0 ? colors.accent : colors.bodyLight,
                },
              ]}
            />
          ))}
          <View style={styles.dialCenter}>
            <Text style={styles.dialText}>{String(channel).padStart(2, '0')}</Text>
          </View>
        </Animated.View>
      </View>

      <Pressable
        onPress={onUp}
        disabled={atMax}
        style={({ pressed }) => [
          styles.arrowBtn,
          { opacity: atMax ? 0.35 : pressed ? 0.7 : 1 },
        ]}
        accessibilityLabel="Channel up"
      >
        <Text style={styles.arrow}>▶</Text>
        <Text style={styles.arrowLabel}>CH</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowBtn: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.body,
    borderWidth: 2,
    borderColor: colors.bodyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
  },
  arrowLabel: {
    color: colors.textDim,
    fontFamily: fonts.led,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 2,
  },
  dialWrap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dial: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.bodyDark,
    borderWidth: 3,
    borderColor: colors.bodyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    width: 3,
    height: 8,
    borderRadius: 1,
  },
  dialCenter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.body,
    borderWidth: 1,
    borderColor: colors.bodyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialText: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default RadioDial;
