import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

interface SpeakerGrilleProps {
  rows?: number;
  cols?: number;
  /** highlight the grille (e.g. while audio is coming through) */
  active?: boolean;
}

/**
 * Speaker-grille aesthetic rendered as a grid of tiny View dots, per spec.
 */
export function SpeakerGrille({ rows = 5, cols = 11, active = false }: SpeakerGrilleProps) {
  return (
    <View style={styles.grille}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: cols }).map((_, c) => (
            <View
              key={c}
              style={[
                styles.dot,
                {
                  backgroundColor: active ? colors.speakerDotLight : colors.speakerDot,
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grille: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    margin: 3,
  },
});

export default SpeakerGrille;
