/**
 * WalkieTalk signaling server.
 *
 * A thin Socket.io relay that:
 *   - tracks channel membership (channels.js)
 *   - relays WebRTC offer/answer/ICE between peers on the same channel
 *   - broadcasts PTT start/end + channel occupancy
 *
 * Deploy-ready for Railway: reads PORT and CLIENT_ORIGIN from env, binds
 * 0.0.0.0, and exposes a /health endpoint.
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { ChannelRegistry } = require('./channels');

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const registry = new ChannelRegistry();

// --- health / info endpoints ---------------------------------------------
app.get('/', (_req, res) => {
  res.json({
    service: 'walkietalk-signaling',
    status: 'ok',
    channels: registry.channels.size,
    sockets: registry.socketState.size,
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
  // Prefer websocket but allow polling fallback for flaky networks.
  transports: ['websocket', 'polling'],
});

// Emit the current occupancy of a channel to everyone in that room.
function broadcastChannelUsers(channelNumber) {
  io.to(ChannelRegistry.roomKey(channelNumber)).emit('channel-users', {
    channelNumber,
    users: registry.getUsers(channelNumber),
  });
}

io.on('connection', (socket) => {
  // eslint-disable-next-line no-console
  console.log(`[socket] connected: ${socket.id}`);

  // --- join a channel ----------------------------------------------------
  socket.on('join-channel', ({ channelNumber, callsign }) => {
    if (typeof channelNumber !== 'number' || !callsign) return;

    const previousChannel = registry.join(socket.id, channelNumber, callsign);

    // Leave the previous room if switching.
    if (previousChannel != null && previousChannel !== channelNumber) {
      const prevRoom = ChannelRegistry.roomKey(previousChannel);
      socket.leave(prevRoom);
      socket.to(prevRoom).emit('peer-left', {
        socketId: socket.id,
        channelNumber: previousChannel,
      });
      broadcastChannelUsers(previousChannel);
    }

    const room = ChannelRegistry.roomKey(channelNumber);
    socket.join(room);

    // Tell existing peers a newcomer arrived (they will initiate the offer).
    socket.to(room).emit('peer-joined', {
      socketId: socket.id,
      callsign,
      channelNumber,
    });

    // Update occupancy for everyone (including the joiner).
    broadcastChannelUsers(channelNumber);

    // eslint-disable-next-line no-console
    console.log(`[channel] ${callsign} (${socket.id}) joined CH${channelNumber}`);
  });

  // --- leave a channel ---------------------------------------------------
  socket.on('leave-channel', ({ channelNumber }) => {
    if (typeof channelNumber !== 'number') return;
    const room = ChannelRegistry.roomKey(channelNumber);
    socket.leave(room);
    socket.to(room).emit('peer-left', {
      socketId: socket.id,
      channelNumber,
    });
    registry.leave(socket.id, channelNumber);
    broadcastChannelUsers(channelNumber);
  });

  // --- WebRTC signaling relay -------------------------------------------
  // Offer: forward to the specific target peer on the channel.
  socket.on('webrtc-offer', (payload) => {
    const { channelNumber, to } = payload || {};
    if (to) {
      io.to(to).emit('webrtc-offer', { ...payload, from: socket.id });
    } else if (typeof channelNumber === 'number') {
      socket
        .to(ChannelRegistry.roomKey(channelNumber))
        .emit('webrtc-offer', { ...payload, from: socket.id });
    }
  });

  // Answer: forward back to the offerer.
  socket.on('webrtc-answer', (payload) => {
    const { to } = payload || {};
    if (to) {
      io.to(to).emit('webrtc-answer', { ...payload, from: socket.id });
    }
  });

  // ICE candidate: send to a specific peer if provided, else broadcast to room.
  socket.on('ice-candidate', (payload) => {
    const { channelNumber, to } = payload || {};
    if (to) {
      io.to(to).emit('ice-candidate', { ...payload, from: socket.id });
    } else if (typeof channelNumber === 'number') {
      socket
        .to(ChannelRegistry.roomKey(channelNumber))
        .emit('ice-candidate', { ...payload, from: socket.id });
    }
  });

  // --- PTT presence ------------------------------------------------------
  socket.on('ptt-start', ({ channelNumber, callsign }) => {
    if (typeof channelNumber !== 'number') return;
    io.to(ChannelRegistry.roomKey(channelNumber)).emit('ptt-start', {
      channelNumber,
      callsign: callsign || registry.getCallsign(socket.id) || 'UNKNOWN',
      socketId: socket.id,
    });
  });

  socket.on('ptt-end', ({ channelNumber, callsign }) => {
    if (typeof channelNumber !== 'number') return;
    io.to(ChannelRegistry.roomKey(channelNumber)).emit('ptt-end', {
      channelNumber,
      callsign: callsign || registry.getCallsign(socket.id) || 'UNKNOWN',
      socketId: socket.id,
    });
  });

  // --- disconnect --------------------------------------------------------
  socket.on('disconnect', (reason) => {
    const state = registry.getState(socket.id);
    const lastChannel = registry.remove(socket.id);
    if (lastChannel != null) {
      const room = ChannelRegistry.roomKey(lastChannel);
      socket.to(room).emit('peer-left', {
        socketId: socket.id,
        channelNumber: lastChannel,
      });
      broadcastChannelUsers(lastChannel);
    }
    // eslint-disable-next-line no-console
    console.log(
      `[socket] disconnected: ${socket.id}` +
        (state ? ` (${state.callsign} / CH${state.channelNumber})` : '') +
        ` reason=${reason}`
    );
  });
});

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`WalkieTalk signaling server listening on 0.0.0.0:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`CORS origin: ${CLIENT_ORIGIN}`);
});
