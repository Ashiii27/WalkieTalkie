import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { CHANNELS, getChannel, type ChannelDef } from '../../constants/channels';
import { useChannelContext } from '../../hooks/ChannelContext';
import { useAuth } from '../../hooks/useAuth';
import { SoundManager } from '../../lib/sounds';

export default function ChannelListScreen() {
  const router = useRouter();
  const { currentChannel, channelCounts, switchChannel, status } = useChannelContext();
  const callsign = useAuth((s) => s.profile?.callsign) ?? 'UNKNOWN';
  const signOut = useAuth((s) => s.signOut);

  const [pendingChannel, setPendingChannel] = useState<ChannelDef | null>(null);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState<string | null>(null);

  const tuned = getChannel(currentChannel);

  const joinChannel = (channel: ChannelDef) => {
    switchChannel(channel.number);
    router.push('/(app)/radio');
  };

  const onSelect = (channel: ChannelDef) => {
    void Haptics.selectionAsync();
    if (channel.isPrivate && channel.number !== currentChannel) {
      setPendingChannel(channel);
      setPasscode('');
      setPassError(null);
      return;
    }
    joinChannel(channel);
  };

  const confirmPasscode = () => {
    if (!pendingChannel) return;
    if (passcode === (pendingChannel.passcode ?? '')) {
      SoundManager.playTuning();
      const ch = pendingChannel;
      setPendingChannel(null);
      joinChannel(ch);
    } else {
      setPassError('Incorrect passcode.');
      SoundManager.playStatic();
    }
  };

  const onSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const renderItem = ({ item }: { item: ChannelDef }) => {
    const count = channelCounts[item.number] ?? 0;
    const isTuned = item.number === currentChannel;
    return (
      <Pressable
        onPress={() => onSelect(item)}
        style={({ pressed }) => [
          styles.channelRow,
          isTuned && styles.channelRowActive,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={styles.chNumBox}>
          <Text style={[styles.chNum, isTuned && styles.chNumActive]}>
            {String(item.number).padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.chInfo}>
          <View style={styles.chNameRow}>
            <Text style={styles.chName} numberOfLines={1}>
              {item.name ? item.name.toUpperCase() : `CHANNEL ${item.number}`}
            </Text>
            {item.isPrivate && <Text style={styles.lock}>🔒</Text>}
          </View>
          <Text style={styles.chStatus}>
            {isTuned ? '● TUNED' : ''}
            {isTuned && count > 0 ? '  ·  ' : ''}
            {count > 0 ? `${count} ONLINE` : isTuned ? '' : 'IDLE'}
          </Text>
        </View>
        <View style={styles.chCountBox}>
          <Text style={[styles.chCount, count > 0 && styles.chCountActive]}>{count}</Text>
          <Text style={styles.chCountLabel}>USERS</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>CHANNELS</Text>
          <Text style={styles.subtitle}>{callsign}</Text>
        </View>
        <Pressable onPress={onSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </Pressable>
      </View>

      {/* Currently tuned banner */}
      <Pressable style={styles.tunedBanner} onPress={() => router.push('/(app)/radio')}>
        <View>
          <Text style={styles.tunedLabel}>NOW TUNED</Text>
          <Text style={styles.tunedName}>
            CH{String(currentChannel).padStart(2, '0')} ·{' '}
            {tuned.name ? tuned.name.toUpperCase() : 'OPEN CHANNEL'}
          </Text>
        </View>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                status === 'connected'
                  ? colors.displayText
                  : status === 'reconnecting'
                  ? colors.warning
                  : colors.danger,
            },
          ]}
        />
        <Text style={styles.tunedGo}>OPEN ▶</Text>
      </Pressable>

      <FlatList
        data={CHANNELS}
        keyExtractor={(item) => String(item.number)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Passcode modal */}
      <Modal
        visible={!!pendingChannel}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingChannel(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              🔒 CH{String(pendingChannel?.number ?? 0).padStart(2, '0')}
            </Text>
            <Text style={styles.modalName}>
              {pendingChannel?.name?.toUpperCase() ?? 'PRIVATE CHANNEL'}
            </Text>
            <Text style={styles.modalLabel}>ENTER PASSCODE</Text>
            <TextInput
              style={styles.modalInput}
              value={passcode}
              onChangeText={(t) => {
                setPasscode(t);
                setPassError(null);
              }}
              placeholder="••••"
              placeholderTextColor={colors.displayTextDim}
              secureTextEntry
              keyboardType="number-pad"
              autoFocus
            />
            {passError ? <Text style={styles.modalError}>{passError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setPendingChannel(null)}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={confirmPasscode}>
                <Text style={styles.modalConfirmText}>JOIN</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 26,
    letterSpacing: 4,
    fontWeight: '700',
    textShadowColor: colors.displayGlow,
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: fonts.mono,
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 4,
  },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: colors.bodyLight,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.body,
  },
  signOutText: {
    fontFamily: fonts.mono,
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  tunedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    borderRadius: radii.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  tunedLabel: {
    fontFamily: fonts.mono,
    color: colors.displayTextDim,
    fontSize: 10,
    letterSpacing: 2,
  },
  tunedName: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 16,
    letterSpacing: 1.5,
    marginTop: 4,
    fontWeight: '700',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 'auto',
    marginRight: 10,
  },
  tunedGo: {
    fontFamily: fonts.led,
    color: colors.accent,
    fontSize: 13,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.body,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.bodyLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  channelRowActive: {
    borderColor: colors.displayText,
    backgroundColor: '#12210f',
  },
  chNumBox: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.bodyDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.bodyLight,
  },
  chNum: {
    fontFamily: fonts.led,
    color: colors.textDim,
    fontSize: 22,
    fontWeight: '700',
  },
  chNumActive: {
    color: colors.displayText,
    textShadowColor: colors.displayGlow,
    textShadowRadius: 8,
  },
  chInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  chNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chName: {
    fontFamily: fonts.led,
    color: colors.textOnDark,
    fontSize: 15,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  lock: {
    marginLeft: 8,
    fontSize: 12,
  },
  chStatus: {
    fontFamily: fonts.mono,
    color: colors.displayTextDim,
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 1,
  },
  chCountBox: {
    alignItems: 'center',
    minWidth: 44,
  },
  chCount: {
    fontFamily: fonts.led,
    color: colors.textDim,
    fontSize: 20,
    fontWeight: '700',
  },
  chCountActive: {
    color: colors.accent,
  },
  chCountLabel: {
    fontFamily: fonts.mono,
    color: colors.muted,
    fontSize: 8,
    letterSpacing: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.body,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: spacing.lg,
  },
  modalTitle: {
    fontFamily: fonts.led,
    color: colors.accent,
    fontSize: 24,
    letterSpacing: 3,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalName: {
    fontFamily: fonts.mono,
    color: colors.textDim,
    fontSize: 13,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 6,
  },
  modalLabel: {
    fontFamily: fonts.mono,
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: spacing.lg,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: colors.panel,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    borderRadius: radii.sm,
    color: colors.displayText,
    fontFamily: fonts.led,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalError: {
    color: colors.danger,
    fontFamily: fonts.mono,
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.bodyLight,
    marginRight: 8,
  },
  modalCancelText: {
    fontFamily: fonts.led,
    color: colors.textDim,
    fontSize: 14,
    letterSpacing: 2,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    marginLeft: 8,
  },
  modalConfirmText: {
    fontFamily: fonts.led,
    color: colors.black,
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: '700',
  },
});
