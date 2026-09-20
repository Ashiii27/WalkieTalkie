import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts } from '../constants/theme';

export interface TransmissionEntry {
  id: string;
  callsign: string;
  channelNumber: number;
  durationSeconds?: number | null;
  transmittedAt: string | number | Date;
  kind?: 'voice' | 'quick';
}

interface TransmissionLogProps {
  entries: TransmissionEntry[];
  /** compact = inline scrolling panel on the radio screen (last 5) */
  compact?: boolean;
  maxItems?: number;
  emptyText?: string;
}

function formatTime(value: string | number | Date): string {
  try {
    const d = new Date(value);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

/**
 * Scrolling transmission log. Used both compactly inside the radio display
 * panel (last 5) and full-screen on the log tab.
 */
export function TransmissionLog({
  entries,
  compact = false,
  maxItems,
  emptyText = 'NO TRAFFIC YET',
}: TransmissionLogProps) {
  const list = maxItems ? entries.slice(0, maxItems) : entries;

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {!compact && <Text style={styles.header}>TRANSMISSION LOG</Text>}
      {list.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        <ScrollView
          style={compact ? styles.compactScroll : undefined}
          contentContainerStyle={compact ? undefined : styles.fullContent}
          showsVerticalScrollIndicator={!compact}
        >
          {list.map((entry) => (
            <View key={entry.id} style={[styles.row, compact && styles.compactRow]}>
              <Text style={styles.time}>{formatTime(entry.transmittedAt)}</Text>
              <Text style={styles.callsign} numberOfLines={1}>
                {entry.callsign}
              </Text>
              <Text style={styles.channel}>CH{String(entry.channelNumber).padStart(2, '0')}</Text>
              <Text style={styles.duration}>
                {entry.kind === 'quick'
                  ? 'QUICK'
                  : entry.durationSeconds != null
                  ? `${entry.durationSeconds}s`
                  : '--'}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  compactContainer: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(57,255,20,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 12,
  },
  compactScroll: {
    maxHeight: 96,
  },
  header: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: '700',
  },
  fullContent: {
    paddingBottom: 24,
  },
  empty: {
    fontFamily: fonts.mono,
    color: colors.displayTextDim,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(57,255,20,0.08)',
  },
  compactRow: {
    paddingVertical: 3,
    borderBottomColor: 'rgba(57,255,20,0.06)',
  },
  time: {
    fontFamily: fonts.mono,
    color: colors.displayTextDim,
    fontSize: 11,
    width: 52,
  },
  callsign: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 12,
    flex: 1,
    letterSpacing: 1,
    fontWeight: '700',
  },
  channel: {
    fontFamily: fonts.mono,
    color: colors.accent,
    fontSize: 11,
    width: 48,
    textAlign: 'right',
  },
  duration: {
    fontFamily: fonts.mono,
    color: colors.displayTextDim,
    fontSize: 11,
    width: 48,
    textAlign: 'right',
  },
});

export default TransmissionLog;
