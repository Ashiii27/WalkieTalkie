import { io, Socket } from 'socket.io-client';

const SIGNALING_URL = process.env.EXPO_PUBLIC_SIGNALING_SERVER_URL ?? '';

export const isSignalingConfigured = Boolean(SIGNALING_URL);

/**
 * Payload contracts shared with the signaling server (server/index.js).
 */
export interface ChannelUser {
  socketId: string;
  callsign: string;
}

export interface JoinChannelPayload {
  channelNumber: number;
  callsign: string;
}

export interface PTTPayload {
  channelNumber: number;
  callsign: string;
}

export interface SignalPayload {
  channelNumber: number;
  from: string;
  to?: string;
  // WebRTC session description or ICE candidate object.
  data: any;
}

/** Events the server can emit back to a client. */
export interface ServerToClientEvents {
  'channel-users': (payload: { channelNumber: number; users: ChannelUser[] }) => void;
  'ptt-start': (payload: PTTPayload & { socketId: string }) => void;
  'ptt-end': (payload: PTTPayload & { socketId: string }) => void;
  'webrtc-offer': (payload: SignalPayload) => void;
  'webrtc-answer': (payload: SignalPayload) => void;
  'ice-candidate': (payload: SignalPayload) => void;
  'peer-joined': (payload: { socketId: string; callsign: string; channelNumber: number }) => void;
  'peer-left': (payload: { socketId: string; channelNumber: number }) => void;
}

/** Events a client can emit to the server. */
export interface ClientToServerEvents {
  'join-channel': (payload: JoinChannelPayload) => void;
  'leave-channel': (payload: { channelNumber: number }) => void;
  'ptt-start': (payload: PTTPayload) => void;
  'ptt-end': (payload: PTTPayload) => void;
  'webrtc-offer': (payload: SignalPayload) => void;
  'webrtc-answer': (payload: SignalPayload) => void;
  'ice-candidate': (payload: SignalPayload) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/**
 * Lazily create (or return) the shared signaling socket. Reconnection is
 * handled by socket.io with a fixed 5s interval per the spec.
 */
export function getSocket(): AppSocket {
  if (socket) return socket;

  socket = io(SIGNALING_URL || 'http://localhost:3000', {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 5000,
    timeout: 8000,
  });

  return socket;
}

/** Ensure the socket is connected. */
export function connectSocket(): AppSocket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

/** Fully tear down the socket (e.g. on logout). */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export default getSocket;
