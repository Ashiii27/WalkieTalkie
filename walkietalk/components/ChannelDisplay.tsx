import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../constants/theme';
import { SignalBars } from './SignalBars';
import type { ConnectionStatus } from '../hooks/useChannel';

interface ChannelDisplayProps {
  channelNumber: number;
  channelName?: string | null;
  userCount: number;
  status: ConnectionStatus;
  remoteTalker: string | null;
  isTransmitting: boolean;
  battery?: number; // 0..1
}

const statusMeta: Record<ConnectionStatus, { label: string; color: string }> = {
  connected: { label: 'CONNECTED', color: colors.displayText },
  reconnecting: { label: 'RECONNECTING', color: colors.warning },
  offline: { label: 'OFFLINE', color: colors.danger },
};

/** 7-segment-style battery pips. */
function Battery({ level }: { level: number }) {
  const pips = 4;
  const lit = Math.round(level * pips);
  return (
    <View style={styles.battery}>
      <View style={styles.batteryBody}>
        {Array.from({ length: pips }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.batteryPip,
              { backgroundColor: i < lit ? colors.displayText : colors.displayTextDim },
            ]}
          />
        ))}
      </View>
      <View style={styles.batteryCap} />
    </View>
  );
}

/**
 * The upper LCD panel of the radio: channel number in big 7-seg style,
 * signal bars, battery, connection status, active user count and who is
 * currently transmitting.
 */
export function ChannelDisplay({
  channelNumber,
  channelName,
  userCount,
  status,
  remoteTalker,
  isTransmitting,
  battery = 1,
}: ChannelDisplayProps) {
  const meta = statusMeta[status];
  const padded = String(channelNumber).padStart(2, '0');

  const talkLine = isTransmitting
    ? 'YOU ARE TRANSMITTING'
    : remoteTalker
    ? `▶ ${remoteTalker}`
    : '— STANDBY —';

  const talkColor = isTransmitting
    ? colors.danger
    : remoteTalker
    ? colors.accent
    : colors.displayTextDim;

  return (
    <View style={styles.panel}>
      {/* Top status row */}
      <View style={styles.topRow}>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <View style={styles.topRight}>
          <SignalBars active={status === 'connected'} height={22} />
          <View style={{ width: 10 }} />
          <Battery level={battery} />
        </View>
      </View>

      {/* Big channel readout */}
      <View style={styles.channelRow}>
        <View style={styles.chBlock}>
          <Text style={styles.chLabel}>CH</Text>
          <Text style={styles.chNumber}>{padded}</Text>
        </View>
        <View style={styles.chMeta}>
          <Text style={styles.chName} numberOfLines={1}>
            {channelName ? channelName.toUpperCase() : 'OPEN CHANNEL'}
          </Text>
          <Text style={styles.chUsers}>
            {userCount} {userCount === 1 ? 'RADIO' : 'RADIOS'} ONLINE
          </Text>
        </View>
      </View>

      {/* Transmitting indicator */}
      <View style={styles.talkRow}>
        <Text style={[styles.talkText, { color: talkColor }]} numberOfLines={1}>
          {talkLine}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.panelBorder,
    padding: 16,
    shadowColor: colors.displayGlow,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontFamily: fonts.led,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  chBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  chLabel: {
    fontFamily: fonts.led,
    color: colors.displayTextDim,
    fontSize: 20,
    marginRight: 6,
    marginBottom: 10,
    letterSpacing: 2,
  },
  chNumber: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 74,
    fontWeight: '700',
    letterSpacing: 4,
    lineHeight: 78,
    textShadowColor: colors.displayGlow,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  chMeta: {
    flex: 1,
    marginLeft: 16,
    marginBottom: 8,
  },
  chName: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 18,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  chUsers: {
    fontFamily: fonts.mono,
    color: colors.displayTextDim,
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 1,
  },
  talkRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(57,255,20,0.15)',
    paddingTop: 8,
  },
  talkText: {
    fontFamily: fonts.led,
    fontSize: 15,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  battery: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryBody: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.displayTextDim,
    borderRadius: 2,
    padding: 1.5,
    height: 16,
    alignItems: 'center',
  },
  batteryPip: {
    width: 4,
    height: 9,
    marginHorizontal: 0.75,
    borderRadius: 0.5,
  },
  batteryCap: {
    width: 2,
    height: 7,
    backgroundColor: colors.displayTextDim,
    marginLeft: 1,
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },
});

export default ChannelDisplay;
