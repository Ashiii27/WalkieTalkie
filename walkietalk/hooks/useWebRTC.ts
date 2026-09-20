import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  type MediaStream,
} from 'react-native-webrtc';
import type { AppSocket, SignalPayload } from '../lib/socket';
import { SoundManager } from '../lib/sounds';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export type MicPermission = 'granted' | 'denied' | 'undetermined';

export interface UseWebRTCOptions {
  socket: AppSocket;
  channelNumber: number;
  callsign: string;
  /** Only run WebRTC once we actually have a callsign / are ready. */
  enabled?: boolean;
}

export interface UseWebRTCResult {
  micPermission: MicPermission;
  ready: boolean;
  error: string | null;
  remoteStreams: MediaStream[];
  /** Open the local audio track for transmission (PTT press). */
  unmuteMic: () => void;
  /** Close the local audio track (PTT release) + play end tone. */
  muteMic: () => void;
  /** Re-request permission if the user previously denied it. */
  requestPermission: () => Promise<MicPermission>;
}

/**
 * Owns the local mic stream + a mesh of RTCPeerConnections (one per remote
 * peer on the channel). The mic track stays disabled except while PTT is held.
 *
 * Signaling contract (see server/index.js):
 *   - on peer-joined we (the existing peer) create an offer to the newcomer
 *   - webrtc-offer -> create answer
 *   - webrtc-answer -> setRemoteDescription
 *   - ice-candidate -> addIceCandidate
 */
export function useWebRTC({
  socket,
  channelNumber,
  callsign,
  enabled = true,
}: UseWebRTCOptions): UseWebRTCResult {
  const [micPermission, setMicPermission] = useState<MicPermission>('undetermined');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamMapRef = useRef<Map<string, MediaStream>>(new Map());
  const channelRef = useRef(channelNumber);
  channelRef.current = channelNumber;

  const syncRemoteStreams = useCallback(() => {
    setRemoteStreams(Array.from(remoteStreamMapRef.current.values()));
  }, []);

  // --- audio session + permission + local stream -------------------------
  const requestPermission = useCallback(async (): Promise<MicPermission> => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      const result: MicPermission = perm.granted
        ? 'granted'
        : perm.canAskAgain
        ? 'undetermined'
        : 'denied';
      setMicPermission(result);
      return result;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[webrtc] permission request failed', err);
      setMicPermission('denied');
      return 'denied';
    }
  }, []);

  const configureAudioSession = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[webrtc] audio session config failed', err);
    }
  }, []);

  const ensureLocalStream = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = (await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })) as unknown as MediaStream;
      // Start muted — mic only opens while PTT is held.
      stream.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[webrtc] getUserMedia failed', err);
      setError('Could not access microphone.');
      return null;
    }
  }, []);

  // --- peer connection helpers -------------------------------------------
  const createPeer = useCallback(
    (peerId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Attach local audio track(s).
      const local = localStreamRef.current;
      if (local) {
        local.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, local);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[webrtc] addTrack failed', err);
          }
        });
      }

      // @ts-expect-error react-native-webrtc uses event-handler props
      pc.onicecandidate = (event: any) => {
        if (event?.candidate) {
          const payload: SignalPayload = {
            channelNumber: channelRef.current,
            from: socket.id ?? '',
            to: peerId,
            data: event.candidate,
          };
          socket.emit('ice-candidate', payload);
        }
      };

      // @ts-expect-error react-native-webrtc event-handler prop
      pc.ontrack = (event: any) => {
        const [stream] = event.streams ?? [];
        if (stream) {
          remoteStreamMapRef.current.set(peerId, stream as MediaStream);
          syncRemoteStreams();
        }
      };

      // @ts-expect-error react-native-webrtc event-handler prop
      pc.onconnectionstatechange = () => {
        const state = (pc as any).connectionState;
        if (state === 'failed' || state === 'closed' || state === 'disconnected') {
          // Graceful fallback: drop the dead peer, keep the app alive.
          remoteStreamMapRef.current.delete(peerId);
          syncRemoteStreams();
        }
      };

      peersRef.current.set(peerId, pc);
      return pc;
    },
    [socket, syncRemoteStreams]
  );

  const closePeer = useCallback(
    (peerId: string) => {
      const pc = peersRef.current.get(peerId);
      if (pc) {
        try {
          pc.close();
        } catch {
          // ignore
        }
        peersRef.current.delete(peerId);
      }
      remoteStreamMapRef.current.delete(peerId);
      syncRemoteStreams();
    },
    [syncRemoteStreams]
  );

  const closeAllPeers = useCallback(() => {
    peersRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {
        // ignore
      }
    });
    peersRef.current.clear();
    remoteStreamMapRef.current.clear();
    syncRemoteStreams();
  }, [syncRemoteStreams]);

  // --- bootstrap on mount / when enabled ---------------------------------
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      const perm = await requestPermission();
      if (cancelled) return;
      if (perm !== 'granted') {
        setReady(false);
        return;
      }
      await configureAudioSession();
      const stream = await ensureLocalStream();
      if (cancelled) return;
      if (stream) {
        setError(null);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // --- signaling listeners -----------------------------------------------
  useEffect(() => {
    if (!enabled) return;

    const onPeerJoined = async (payload: {
      socketId: string;
      callsign: string;
      channelNumber: number;
    }) => {
      if (payload.channelNumber !== channelRef.current) return;
      if (payload.socketId === socket.id) return;
      try {
        await ensureLocalStream();
        const pc = createPeer(payload.socketId);
        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', {
          channelNumber: channelRef.current,
          from: socket.id ?? '',
          to: payload.socketId,
          data: offer,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[webrtc] failed to create offer', err);
      }
    };

    const onOffer = async (payload: SignalPayload) => {
      if (payload.channelNumber !== channelRef.current) return;
      if (payload.to && payload.to !== socket.id) return;
      try {
        await ensureLocalStream();
        const pc = createPeer(payload.from);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', {
          channelNumber: channelRef.current,
          from: socket.id ?? '',
          to: payload.from,
          data: answer,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[webrtc] failed to handle offer', err);
      }
    };

    const onAnswer = async (payload: SignalPayload) => {
      if (payload.to && payload.to !== socket.id) return;
      const pc = peersRef.current.get(payload.from);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[webrtc] failed to handle answer', err);
      }
    };

    const onIce = async (payload: SignalPayload) => {
      if (payload.to && payload.to !== socket.id) return;
      const pc = peersRef.current.get(payload.from);
      if (!pc || !payload.data) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.data));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[webrtc] failed to add ICE candidate', err);
      }
    };

    const onPeerLeft = (payload: { socketId: string; channelNumber: number }) => {
      closePeer(payload.socketId);
    };

    socket.on('peer-joined', onPeerJoined);
    socket.on('webrtc-offer', onOffer);
    socket.on('webrtc-answer', onAnswer);
    socket.on('ice-candidate', onIce);
    socket.on('peer-left', onPeerLeft);

    return () => {
      socket.off('peer-joined', onPeerJoined);
      socket.off('webrtc-offer', onOffer);
      socket.off('webrtc-answer', onAnswer);
      socket.off('ice-candidate', onIce);
      socket.off('peer-left', onPeerLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, socket, createPeer, closePeer, ensureLocalStream]);

  // When switching channels, tear down all peers (new mesh will form).
  useEffect(() => {
    closeAllPeers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelNumber]);

  // --- cleanup on unmount ------------------------------------------------
  useEffect(() => {
    return () => {
      closeAllPeers();
      const local = localStreamRef.current;
      if (local) {
        local.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            // ignore
          }
        });
        localStreamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- PTT mic control ---------------------------------------------------
  const unmuteMic = useCallback(() => {
    const local = localStreamRef.current;
    if (!local) return;
    local.getAudioTracks().forEach((t) => {
      t.enabled = true;
    });
  }, []);

  const muteMic = useCallback(() => {
    const local = localStreamRef.current;
    if (local) {
      local.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    }
    SoundManager.playTone();
  }, []);

  // Silence unused import warning on some platforms.
  void Platform;

  return {
    micPermission,
    ready,
    error,
    remoteStreams,
    unmuteMic,
    muteMic,
    requestPermission,
  };
}

export default useWebRTC;
