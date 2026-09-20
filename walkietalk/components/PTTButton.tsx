import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  Easing,
} from 'react-native';
import { colors, fonts } from '../constants/theme';

export type PTTVisualState = 'idle' | 'active' | 'remote' | 'disabled';

interface PTTButtonProps {
  isTransmitting: boolean;
  /** someone else is talking */
  remoteActive?: boolean;
  disabled?: boolean;
  locked?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  /** hint text shown under the button (e.g. permission/offline reason) */
  hint?: string;
}

/**
 * Large circular push-to-talk button with idle / active / remote visual
 * states, a pulse animation while transmitting, and LED-style labels.
 */
export function PTTButton({
  isTransmitting,
  remoteActive = false,
  disabled = false,
  locked = false,
  onPressIn,
  onPressOut,
  hint,
}: PTTButtonProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const visualState: PTTVisualState = disabled
    ? 'disabled'
    : isTransmitting
    ? 'active'
    : remoteActive
    ? 'remote'
    : 'idle';

  // Pulse animation while transmitting.
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isTransmitting) {
      pulse.setValue(0);
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 650,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      pulse.stopAnimation();
      Animated.timing(pulse, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    return () => {
      loop?.stop();
    };
  }, [isTransmitting, pulse]);

  const handlePressIn = () => {
    if (disabled || locked) return;
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
    onPressIn();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
    onPressOut();
  };

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  const faceColor =
    visualState === 'active'
      ? colors.pttActive
      : visualState === 'remote'
      ? colors.pttRemote
      : colors.pttIdle;

  const label =
    visualState === 'active'
      ? 'TRANSMITTING'
      : visualState === 'remote'
      ? 'RECEIVING'
      : visualState === 'disabled'
      ? 'MIC OFF'
      : 'PUSH TO TALK';

  const labelColor =
    visualState === 'active'
      ? colors.white
      : visualState === 'remote'
      ? colors.body
      : visualState === 'disabled'
      ? colors.muted
      : colors.displayTextDim;

  return (
    <View style={styles.wrap}>
      <View style={styles.buttonContainer}>
        {/* Pulsing glow ring while active */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              backgroundColor: colors.pttActiveGlow,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: faceColor,
                borderColor:
                  visualState === 'active'
                    ? colors.pttActiveGlow
                    : visualState === 'remote'
                    ? colors.accent
                    : colors.bodyLight,
                shadowColor:
                  visualState === 'active' ? colors.pttActiveGlow : colors.black,
                shadowOpacity: visualState === 'active' ? 0.9 : 0.5,
                opacity: disabled ? 0.55 : pressed ? 0.95 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Push to talk"
            accessibilityState={{ disabled, busy: isTransmitting }}
          >
            <View style={styles.innerRing}>
              <Text style={[styles.icon, { color: labelColor }]}>
                {visualState === 'disabled' ? '⊘' : '⏻'}
              </Text>
              <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const SIZE = 190;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  buttonContainer: {
    width: SIZE + 60,
    height: SIZE + 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
  },
  innerRing: {
    width: SIZE - 40,
    height: SIZE - 40,
    borderRadius: (SIZE - 40) / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 46,
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.led,
    fontSize: 15,
    letterSpacing: 2,
    fontWeight: '700',
  },
  hint: {
    marginTop: 14,
    color: colors.warning,
    fontFamily: fonts.mono,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

export default PTTButton;
