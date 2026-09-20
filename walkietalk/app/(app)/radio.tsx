import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { ChannelDisplay } from '../../components/ChannelDisplay';
import { PTTButton } from '../../components/PTTButton';
import { SpeakerGrille } from '../../components/SpeakerGrille';
import { RadioDial } from '../../components/RadioDial';
import { TransmissionLog } from '../../components/TransmissionLog';
import { useChannelContext } from '../../hooks/ChannelContext';
import { useWebRTC } from '../../hooks/useWebRTC';
import { usePTT } from '../../hooks/usePTT';
import { useAuth } from '../../hooks/useAuth';
import { useLocalLog } from '../../hooks/useLocalLog';
import { getChannel, TOTAL_CHANNELS } from '../../constants/channels';
import { SoundManager } from '../../lib/sounds';

const QUICK_ACTIONS: { label: string; phrase: string }[] = [
  { label: '10-4', phrase: 'TEN-FOUR' },
  { label: 'ROGER', phrase: 'ROGER THAT' },
  { label: 'STANDBY', phrase: 'STANDBY' },
];

export default function RadioScreen() {
  const router = useRouter();
  const {
    socket,
    status,
    currentChannel,
    users,
    remoteTalker,
    switchChannel,
  } = useChannelContext();

  const callsign = useAuth((s) => s.profile?.callsign) ?? 'UNKNOWN';
  const addLocalLog = useLocalLog((s) => s.add);
  const logEntries = useLocalLog((s) => s.entries);

  const channelDef = getChannel(currentChannel);

  const webrtc = useWebRTC({
    socket,
    channelNumber: currentChannel,
    callsign,
    enabled: true,
  });

  const micDenied = webrtc.micPermission === 'denied';
  const offline = status === 'offline';
  const pttDisabled = micDenied || offline || !webrtc.ready;

  const ptt = usePTT({
    socket,
    channelNumber: currentChannel,
    callsign,
    unmuteMic: webrtc.unmuteMic,
    muteMic: webrtc.muteMic,
    disabled: pttDisabled,
    onTransmission: (entry) => {
      addLocalLog({
        callsign: entry.callsign,
        channelNumber: entry.channelNumber,
        durationSeconds: entry.durationSeconds,
        kind: 'voice',
      });
    },
  });

  // Log remote talkers into the rolling log.
  useEffect(() => {
    if (remoteTalker) {
      addLocalLog({
        callsign: remoteTalker,
        channelNumber: currentChannel,
        kind: 'voice',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteTalker]);

  const channelLog = useMemo(
    () => logEntries.filter((e) => e.channelNumber === currentChannel),
    [logEntries, currentChannel]
  );

  const onChannelUp = () => {
    if (currentChannel >= TOTAL_CHANNELS) return;
    void Haptics.selectionAsync();
    switchChannel(currentChannel + 1);
  };
  const onChannelDown = () => {
    if (currentChannel <= 1) return;
    void Haptics.selectionAsync();
    switchChannel(currentChannel - 1);
  };

  const onQuickAction = (phrase: string) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    SoundManager.playTone();
    socket.emit('ptt-start', { channelNumber: currentChannel, callsign: `${callsign}: ${phrase}` });
    setTimeout(() => {
      socket.emit('ptt-end', { channelNumber: currentChannel, callsign });
    }, 400);
    addLocalLog({
      callsign: `${callsign} · ${phrase}`,
      channelNumber: currentChannel,
      kind: 'quick',
    });
  };

  const pttHint = micDenied
    ? 'Microphone access denied. Enable it in Settings to transmit.'
    : offline
    ? 'No signal — reconnecting to the network.'
    : !webrtc.ready
    ? 'Preparing radio…'
    : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* No-signal overlay */}
      {offline && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.overlayText}>NO SIGNAL</Text>
          <Text style={styles.overlaySub}>Reconnecting…</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerBar}>
          <Text style={styles.brand}>WALKIETALK</Text>
          <View style={styles.callTag}>
            <Text style={styles.callTagText}>{callsign}</Text>
          </View>
        </View>

        {/* Display panel */}
        <ChannelDisplay
          channelNumber={currentChannel}
          channelName={channelDef.name}
          userCount={users.length}
          status={status}
          remoteTalker={remoteTalker}
          isTransmitting={ptt.isTransmitting}
        />

        {/* Compact scrolling log inside/under panel */}
        <TransmissionLog entries={channelLog} compact maxItems={5} />

        {/* Speaker grille + PTT */}
        <View style={styles.middle}>
          <SpeakerGrille active={!!remoteTalker || ptt.isTransmitting} />
          <PTTButton
            isTransmitting={ptt.isTransmitting}
            remoteActive={!!remoteTalker}
            disabled={pttDisabled}
            locked={ptt.locked}
            onPressIn={ptt.pressIn}
            onPressOut={ptt.pressOut}
            hint={pttHint}
          />
          <SpeakerGrille active={!!remoteTalker || ptt.isTransmitting} />
        </View>

        {/* Channel dial */}
        <View style={styles.dialSection}>
          <RadioDial
            channel={currentChannel}
            min={1}
            max={TOTAL_CHANNELS}
            onUp={onChannelUp}
            onDown={onChannelDown}
          />
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((qa) => (
            <Pressable
              key={qa.label}
              onPress={() => onQuickAction(qa.phrase)}
              disabled={offline}
              style={({ pressed }) => [
                styles.quickBtn,
                { opacity: offline ? 0.4 : pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.quickText}>{qa.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Bottom nav */}
        <View style={styles.navRow}>
          <Pressable
            onPress={() => router.push('/(app)')}
            style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.navIcon}>☰</Text>
            <Text style={styles.navLabel}>CHANNELS</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/log')}
            style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.navIcon}>▤</Text>
            <Text style={styles.navLabel}>LOG</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  brand: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 20,
    letterSpacing: 4,
    fontWeight: '700',
    textShadowColor: colors.displayGlow,
    textShadowRadius: 10,
  },
  callTag: {
    backgroundColor: colors.body,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  callTagText: {
    fontFamily: fonts.led,
    color: colors.accent,
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '700',
  },
  middle: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  dialSection: {
    backgroundColor: colors.body,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.bodyLight,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  quickBtn: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: colors.bodyDark,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  quickText: {
    fontFamily: fonts.led,
    color: colors.accent,
    fontSize: 15,
    letterSpacing: 2,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  navBtn: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: colors.body,
    borderWidth: 1.5,
    borderColor: colors.bodyLight,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  navIcon: {
    color: colors.displayText,
    fontSize: 16,
    marginRight: 8,
  },
  navLabel: {
    fontFamily: fonts.led,
    color: colors.textOnDark,
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  overlayText: {
    fontFamily: fonts.led,
    color: colors.danger,
    fontSize: 40,
    letterSpacing: 6,
    fontWeight: '700',
    textShadowColor: colors.danger,
    textShadowRadius: 14,
  },
  overlaySub: {
    fontFamily: fonts.mono,
    color: colors.textDim,
    fontSize: 14,
    letterSpacing: 2,
    marginTop: 10,
  },
});
