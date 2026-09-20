import { useCallback, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { AppSocket } from '../lib/socket';
import { SoundManager } from '../lib/sounds';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface UsePTTOptions {
  socket: AppSocket;
  channelNumber: number;
  callsign: string;
  unmuteMic: () => void;
  muteMic: () => void;
  /** disable PTT (e.g. mic denied or offline) */
  disabled?: boolean;
  /** Called locally when a transmission completes (for optimistic log UI). */
  onTransmission?: (entry: {
    callsign: string;
    channelNumber: number;
    durationSeconds: number;
  }) => void;
}

export interface UsePTTResult {
  isTransmitting: boolean;
  locked: boolean;
  pressIn: () => void;
  pressOut: () => void;
}

const LOCK_MS = 300;

/**
 * Handles the push-to-talk gesture lifecycle: haptics, click/tone sounds,
 * mic open/close, socket ptt-start/ptt-end broadcasts, transmission logging,
 * and a 300ms debounce lock to prevent double presses.
 */
export function usePTT({
  socket,
  channelNumber,
  callsign,
  unmuteMic,
  muteMic,
  disabled = false,
  onTransmission,
}: UsePTTOptions): UsePTTResult {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const startedAtRef = useRef<number>(0);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logTransmission = useCallback(
    async (durationSeconds: number) => {
      onTransmission?.({ callsign, channelNumber, durationSeconds });
      if (!isSupabaseConfigured) return;
      try {
        await supabase.from('transmission_logs').insert({
          channel_number: channelNumber,
          callsign,
          duration_seconds: durationSeconds,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ptt] failed to log transmission', err);
      }
    },
    [callsign, channelNumber, onTransmission]
  );

  const pressIn = useCallback(() => {
    if (disabled || locked || isTransmitting) return;
    setIsTransmitting(true);
    startedAtRef.current = Date.now();

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignore
    }
    SoundManager.playClick();
    try {
      unmuteMic();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[ptt] unmuteMic failed', err);
    }
    socket.emit('ptt-start', { channelNumber, callsign });
  }, [disabled, locked, isTransmitting, unmuteMic, socket, channelNumber, callsign]);

  const pressOut = useCallback(() => {
    if (!isTransmitting) return;
    setIsTransmitting(false);

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    try {
      muteMic();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[ptt] muteMic failed', err);
    }
    socket.emit('ptt-end', { channelNumber, callsign });

    const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    void logTransmission(duration);

    // Debounce: lock button briefly to prevent double taps.
    setLocked(true);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => setLocked(false), LOCK_MS);
  }, [isTransmitting, muteMic, socket, channelNumber, callsign, logTransmission]);

  return { isTransmitting, locked, pressIn, pressOut };
}

export default usePTT;
