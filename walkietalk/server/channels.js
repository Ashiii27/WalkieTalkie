/**
 * In-memory channel state management for the WalkieTalk signaling server.
 *
 * We track, for every connected socket, which channel it currently occupies
 * and its callsign. Channel membership uses Socket.io rooms keyed
 * `channel:${number}`, but we keep a parallel Map so we can quickly answer
 * "who is on channel N?" and clean up on disconnect.
 */

class ChannelRegistry {
  constructor() {
    /** socketId -> { channelNumber, callsign } */
    this.socketState = new Map();
    /** channelNumber -> Map<socketId, callsign> */
    this.channels = new Map();
  }

  static roomKey(channelNumber) {
    return `channel:${channelNumber}`;
  }

  /** Add a socket to a channel, returning the previous channel (if any). */
  join(socketId, channelNumber, callsign) {
    const previous = this.socketState.get(socketId);
    if (previous && previous.channelNumber !== channelNumber) {
      this.leave(socketId, previous.channelNumber);
    }

    this.socketState.set(socketId, { channelNumber, callsign });

    if (!this.channels.has(channelNumber)) {
      this.channels.set(channelNumber, new Map());
    }
    this.channels.get(channelNumber).set(socketId, callsign);

    return previous ? previous.channelNumber : null;
  }

  /** Remove a socket from a channel. */
  leave(socketId, channelNumber) {
    const members = this.channels.get(channelNumber);
    if (members) {
      members.delete(socketId);
      if (members.size === 0) {
        this.channels.delete(channelNumber);
      }
    }
    const state = this.socketState.get(socketId);
    if (state && state.channelNumber === channelNumber) {
      this.socketState.delete(socketId);
    }
  }

  /** Remove a socket entirely (on disconnect). Returns its last channel. */
  remove(socketId) {
    const state = this.socketState.get(socketId);
    if (!state) return null;
    this.leave(socketId, state.channelNumber);
    return state.channelNumber;
  }

  getState(socketId) {
    return this.socketState.get(socketId) || null;
  }

  getCallsign(socketId) {
    const state = this.socketState.get(socketId);
    return state ? state.callsign : null;
  }

  /** List of { socketId, callsign } on a channel. */
  getUsers(channelNumber) {
    const members = this.channels.get(channelNumber);
    if (!members) return [];
    return Array.from(members.entries()).map(([socketId, callsign]) => ({
      socketId,
      callsign,
    }));
  }

  channelCount(channelNumber) {
    const members = this.channels.get(channelNumber);
    return members ? members.size : 0;
  }
}

module.exports = { ChannelRegistry };
