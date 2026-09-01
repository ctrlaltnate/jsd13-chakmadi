import { io } from 'socket.io-client';

// Determine socket server URL
// In development Vite proxies /socket.io to localhost:3001,
// or if accessed via LAN IP like 192.168.x.x:5173, Vite proxy routes it automatically.
const socket = io({
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
  // Estimate server time at receiveTime
  serverTimeOffset = (serverTime + latency) - receiveTime;
});

// Periodic sync every 15s
setInterval(syncClock, 15000);

export const socketService = {
  socket,

  getSyncedServerTime() {
    return Date.now() + serverTimeOffset;
  },

  getLatency() {
    return latency;
  },

  joinGame(name, avatar = 0) {
    socket.emit('join_game', { name, avatar });
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

  claimHost() {
    socket.emit('claim_host');
  }
};
