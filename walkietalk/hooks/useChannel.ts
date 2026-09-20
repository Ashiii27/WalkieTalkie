import { useCallback, useEffect, useRef, useState } from 'react';
import {
  connectSocket,
  getSocket,
  type AppSocket,
  type ChannelUser,
} from '../lib/socket';
import { useAuth } from './useAuth';
import { SoundManager } from '../lib/sounds';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

export interface UseChannelResult {
  socket: AppSocket;
  status: ConnectionStatus;
  currentChannel: number;
  users: ChannelUser[];
  /** callsign of whoever is currently transmitting (someone else), or null */
  remoteTalker: string | null;
  /** map of channelNumber -> user count, updated from channel-users events */
  channelCounts: Record<number, number>;
  joinChannel: (channelNumber: number) => void;
  leaveChannel: (channelNumber: number) => void;
  switchChannel: (channelNumber: number) => void;
}

/**
 * Central hook that owns the signaling socket lifecycle, connection status,
 * channel membership and PTT presence. Consumed by the radio + channel screens.
 */
export function useChannel(initialChannel = 1): UseChannelResult {
  const callsign = useAuth((s) => s.profile?.callsign) ?? 'UNKNOWN';
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const [currentChannel, setCurrentChannel] = useState(initialChannel);
  const [users, setUsers] = useState<ChannelUser[]>([]);
  const [remoteTalker, setRemoteTalker] = useState<string | null>(null);
  const [channelCounts, setChannelCounts] = useState<Record<number, number>>({});

  const socketRef = useRef<AppSocket>(getSocket());
  const currentChannelRef = useRef(currentChannel);
  currentChannelRef.current = currentChannel;
  const callsignRef = useRef(callsign);
  callsignRef.current = callsign;

  // --- socket lifecycle & global listeners -------------------------------
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setStatus('connected');
      // (re)join the current channel after (re)connect
      socket.emit('join-channel', {
        channelNumber: currentChannelRef.current,
        callsign: callsignRef.current,
      });
    };
    const onDisconnect = () => setStatus('offline');
    const onReconnectAttempt = () => setStatus('reconnecting');
    const onReconnect = () => setStatus('connected');

    const onChannelUsers = (payload: { channelNumber: number; users: ChannelUser[] }) => {
      setChannelCounts((prev) => ({ ...prev, [payload.channelNumber]: payload.users.length }));
      if (payload.channelNumber === currentChannelRef.current) {
        setUsers(payload.users);
      }
    };

    const onPttStart = (payload: { channelNumber: number; callsign: string; socketId: string }) => {
      if (payload.channelNumber !== currentChannelRef.current) return;
      if (payload.socketId === socket.id) return; // ignore our own echo
      setRemoteTalker(payload.callsign);
      SoundManager.playStatic();
    };

    const onPttEnd = (payload: { channelNumber: number; socketId: string }) => {
      if (payload.channelNumber !== currentChannelRef.current) return;
      if (payload.socketId === socket.id) return;
      setRemoteTalker(null);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);
    socket.on('channel-users', onChannelUsers);
    socket.on('ptt-start', onPttStart);
    socket.on('ptt-end', onPttEnd);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
      socket.off('channel-users', onChannelUsers);
      socket.off('ptt-start', onPttStart);
      socket.off('ptt-end', onPttEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinChannel = useCallback((channelNumber: number) => {
    const socket = socketRef.current;
    socket.emit('join-channel', { channelNumber, callsign: callsignRef.current });
  }, []);

  const leaveChannel = useCallback((channelNumber: number) => {
    const socket = socketRef.current;
    socket.emit('leave-channel', { channelNumber });
  }, []);

  const switchChannel = useCallback(
    (channelNumber: number) => {
      if (channelNumber === currentChannelRef.current) return;
      leaveChannel(currentChannelRef.current);
      setUsers([]);
      setRemoteTalker(null);
      setCurrentChannel(channelNumber);
      currentChannelRef.current = channelNumber;
      joinChannel(channelNumber);
      SoundManager.playTuning();
    },
    [joinChannel, leaveChannel]
  );

  return {
    socket: socketRef.current,
    status,
    currentChannel,
    users,
    remoteTalker,
    channelCounts,
    joinChannel,
    leaveChannel,
    switchChannel,
  };
}

export default useChannel;
