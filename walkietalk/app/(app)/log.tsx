import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { TransmissionLog, type TransmissionEntry } from '../../components/TransmissionLog';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useLocalLog } from '../../hooks/useLocalLog';

interface DbLogRow {
  id: string;
  channel_number: number;
  callsign: string;
  duration_seconds: number | null;
  transmitted_at: string;
}

export default function LogScreen() {
  const router = useRouter();
  const localEntries = useLocalLog((s) => s.entries);
  const [remoteEntries, setRemoteEntries] = useState<TransmissionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase not configured — showing this session only.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('transmission_logs')
        .select('id, channel_number, callsign, duration_seconds, transmitted_at')
        .order('transmitted_at', { ascending: false })
        .limit(100);
      if (dbError) throw dbError;
      const mapped: TransmissionEntry[] = (data as DbLogRow[]).map((row) => ({
        id: row.id,
        callsign: row.callsign,
        channelNumber: row.channel_number,
        durationSeconds: row.duration_seconds,
        transmittedAt: row.transmitted_at,
        kind: 'voice',
      }));
      setRemoteEntries(mapped);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load transmission logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh on focus.
  useFocusEffect(
    useCallback(() => {
      void fetchLogs();
    }, [fetchLogs])
  );

  // Merge remote (persisted) + local (this session) logs, dedup-ish by id.
  const merged: TransmissionEntry[] = [...localEntries, ...remoteEntries].sort(
    (a, b) => new Date(b.transmittedAt).getTime() - new Date(a.transmittedAt).getTime()
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>◀ BACK</Text>
        </Pressable>
        <Text style={styles.title}>LOG</Text>
        <Pressable onPress={fetchLogs} style={styles.backBtn}>
          <Text style={styles.backText}>↻</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchLogs}
            tintColor={colors.displayText}
          />
        }
      >
        {loading && merged.length === 0 ? (
          <ActivityIndicator color={colors.displayText} style={{ marginTop: 40 }} />
        ) : (
          <TransmissionLog
            entries={merged}
            emptyText="NO TRANSMISSIONS ON RECORD"
          />
        )}
      </ScrollView>
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
    paddingVertical: spacing.sm,
  },
  backBtn: {
    borderWidth: 1.5,
    borderColor: colors.bodyLight,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.body,
    minWidth: 48,
    alignItems: 'center',
  },
  backText: {
    fontFamily: fonts.mono,
    color: colors.textDim,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 24,
    letterSpacing: 4,
    fontWeight: '700',
    textShadowColor: colors.displayGlow,
    textShadowRadius: 10,
  },
  error: {
    fontFamily: fonts.mono,
    color: colors.warning,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  panel: {
    flex: 1,
    backgroundColor: colors.panel,
    borderTopWidth: 2,
    borderColor: colors.panelBorder,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.md,
  },
  panelContent: {
    padding: spacing.md,
  },
});
