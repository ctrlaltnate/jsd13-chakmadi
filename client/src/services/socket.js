import { io } from 'socket.io-client';

// Support separating Frontend on Vercel and Backend on Render:
const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

const socket = io(SERVER_URL || undefined, {
  transports: ['websocket', 'polling'],
  autoConnect: true
});

let serverTimeOffset = 0;
let latency = 0;

// Sync time with server for millisecond-accurate synchronized countdown
function syncClock() {
  const sendTime = Date.now();
  socket.emit('sync_time', sendTime);
}

socket.on('connect', () => {
  console.log('⚡ Connected to game server:', socket.id);
  syncClock();
});

socket.on('sync_time_reply', ({ clientSendTime, serverTime }) => {
  const receiveTime = Date.now();
  const rtt = receiveTime - clientSendTime;
  latency = Math.round(rtt / 2);
  serverTimeOffset = (serverTime + latency) - receiveTime;
});

// Periodic sync every 15s
setInterval(syncClock, 15000);

// Store host token automatically when host confirmation is received
socket.on('join_confirmed', (data) => {
  if (data?.isHost && data?.hostToken) {
    localStorage.setItem('tug_host_token', data.hostToken);
  }
});

export const socketService = {
  socket,

  getSyncedServerTime() {
    return Date.now() + serverTimeOffset;
  },

  getLatency() {
    return latency;
  },

  joinGame(name, avatar = 0) {
    const hostToken = localStorage.getItem('tug_host_token') || null;
    socket.emit('join_game', { name, avatar, hostToken });
  },

  rejoinGame() {
    socket.emit('rejoin_game');
  },

  updateName(name) {
    socket.emit('update_name', name);
  },

  pull(callback) {
    socket.emit('pull', Date.now(), callback);
  },

  cheer(team, emote = '🔥') {
    socket.emit('cheer', { team, emote });
  },

  startTournament() {
    socket.emit('start_tournament');
  },

  setRoundDuration(duration) {
    socket.emit('set_round_duration', duration);
  },

  addBots(count = 10) {
    socket.emit('add_bots', count);
  },

  clearBots() {
    socket.emit('clear_bots');
  },

  resetTournament() {
    socket.emit('reset_tournament');
  },

  leaveGame() {
    socket.emit('leave_game');
  }
};
