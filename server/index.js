import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Low-latency tuned Socket.io server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  perMessageDeflate: false, // Disabling deflate prevents compression latency on high-frequency packets
  pingInterval: 10000,
  pingTimeout: 5000
});

const PORT = process.env.PORT || 3001;

// Helper to get local IP address for sharing QR code in local network
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

// Bot names pool
const BOT_NAMES = [
  'PixelPete', 'ChiptuneChad', 'ByteBrawler', 'MegaMario', 'RetroRyu',
  'BitBaron', 'NeonNinja', 'GlitchGamer', 'ArcadeAce', 'SynthSamurai',
  'VoxelViper', 'RasterRex', 'SpriteSally', 'LaserLink', 'TurboToby',
  'CyberClaw', 'QuantumQuinn', 'MatrixMike', 'EchoEddie', 'SonicStan',
  'PixelPuncher', 'HexHunter', 'CircuitCarl', 'WarpWendy', 'BitBuster',
  'PixelPaladin', 'RetroRanger', 'ByteBlaster', 'JoyStickJoe', 'PowerPixel'
];

class Player {
  constructor(id, name, isBot = false, avatar = 0) {
    this.id = id;
    this.name = name;
    this.team = null; // 'red' | 'blue' | null
    this.status = 'active'; // 'active' | 'eliminated' | 'spectator'
    this.avatar = avatar;
    this.roundPulls = 0;
    this.totalPulls = 0;
    this.isBot = isBot;
    this.lastPullTime = 0;
    this.combo = 0;
    this.botPullInterval = 140 + Math.floor(Math.random() * 80);
    this.nextBotPullTime = 0;
  }
}

// MULTI-ROOM TOURNAMENT SYSTEM
class Room {
  constructor(id) {
    this.id = id;
    this.status = 'LOBBY'; // 'LOBBY' | 'ROUND_STARTING' | 'ROUND_ACTIVE' | 'ROUND_ELIMINATION' | 'CHAMPIONSHIP'
    this.roundNumber = 1;
    this.totalRounds = 0;
    this.roundDuration = 60; // seconds
    this.roundStartTime = 0;
    this.roundEndTime = 0;
    this.countdownStartTime = 0;
    this.ropePos = 0; // -100 (Red win) to +100 (Blue win)
    this.teamRedScore = 0;
    this.teamBlueScore = 0;
    this.teamRedPulls = 0;
    this.teamBluePulls = 0;
    this.players = {}; // socketId -> Player
    this.hostSocketId = null;
    this.eliminatedThisRound = [];
    this.survivorsThisRound = [];
    this.winnerTeam = null;
    this.champion = null;
    this.lastActivity = Date.now();
  }

  getTeamCounts() {
    const redCount = Object.values(this.players).filter(p => p.status === 'active' && p.team === 'red').length;
    const blueCount = Object.values(this.players).filter(p => p.status === 'active' && p.team === 'blue').length;
    return {
      red: Math.max(1, redCount),
      blue: Math.max(1, blueCount),
      actualRed: redCount,
      actualBlue: blueCount
    };
  }

  updateWeightedScores() {
    const counts = this.getTeamCounts();
    this.teamRedScore = Number((this.teamRedPulls / counts.red).toFixed(1));
    this.teamBlueScore = Number((this.teamBluePulls / counts.blue).toFixed(1));
  }

  getPublicState() {
    const counts = this.getTeamCounts();
    return {
      roomId: this.id,
      status: this.status,
      roundNumber: this.roundNumber,
      roundDuration: this.roundDuration,
      roundStartTime: this.roundStartTime,
      roundEndTime: this.roundEndTime,
      countdownStartTime: this.countdownStartTime,
      ropePos: this.ropePos,
      teamRedScore: this.teamRedScore,
      teamBlueScore: this.teamBlueScore,
      teamRedPulls: this.teamRedPulls,
      teamBluePulls: this.teamBluePulls,
      teamRedCount: counts.actualRed,
      teamBlueCount: counts.actualBlue,
      players: Object.values(this.players).map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        status: p.status,
        avatar: p.avatar,
        roundPulls: p.roundPulls,
        totalPulls: p.totalPulls,
        isBot: p.isBot
      })),
      hostSocketId: this.hostSocketId,
      eliminatedThisRound: this.eliminatedThisRound,
      survivorsThisRound: this.survivorsThisRound,
      winnerTeam: this.winnerTeam,
      champion: this.champion,
      serverTime: Date.now(),
      localIp
    };
  }

  broadcastState() {
    io.to(this.id).emit('game_state', this.getPublicState());
  }

  // Split active survivors randomly into Team Red and Team Blue
  assignTeams() {
    const activePlayers = Object.values(this.players).filter(p => p.status === 'active');
    
    // Shuffle active players Fisher-Yates
    for (let i = activePlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activePlayers[i], activePlayers[j]] = [activePlayers[j], activePlayers[i]];
    }

    // Assign half to Red, half to Blue
    activePlayers.forEach((p, idx) => {
      p.team = idx % 2 === 0 ? 'red' : 'blue';
      p.roundPulls = 0;
    });

    // Keep spectators / eliminated players teamless
    Object.values(this.players).forEach(p => {
      if (p.status !== 'active') {
        p.team = null;
        p.roundPulls = 0;
      }
    });
  }

  startRound() {
    const activePlayers = Object.values(this.players).filter(p => p.status === 'active');
    if (activePlayers.length < 2) {
      return;
    }

    this.assignTeams();

    this.status = 'ROUND_STARTING';
    this.ropePos = 0;
    this.teamRedScore = 0;
    this.teamBlueScore = 0;
    this.teamRedPulls = 0;
    this.teamBluePulls = 0;
    this.winnerTeam = null;
    this.eliminatedThisRound = [];
    this.survivorsThisRound = [];
    this.countdownStartTime = Date.now();

    this.broadcastState();

    // 3-second countdown before live pull
    setTimeout(() => {
      if (this.status !== 'ROUND_STARTING') return;

      this.status = 'ROUND_ACTIVE';
      this.roundStartTime = Date.now();
      this.roundEndTime = this.roundStartTime + (this.roundDuration * 1000);

      // Initialize bot pull timers
      const now = Date.now();
      Object.values(this.players).forEach(p => {
        if (p.isBot && p.status === 'active') {
          p.nextBotPullTime = now + 100 + Math.random() * 300;
        }
      });

      this.broadcastState();
    }, 3000);
  }

  endRound(reason = 'time_up') {
    if (this.status !== 'ROUND_ACTIVE') return;

    let winner = null;
    if (this.ropePos < -0.1) {
      winner = 'red';
    } else if (this.ropePos > 0.1) {
      winner = 'blue';
    } else {
      if (this.teamRedScore > this.teamBlueScore) {
        winner = 'red';
      } else if (this.teamBlueScore > this.teamRedScore) {
        winner = 'blue';
      } else {
        winner = Math.random() < 0.5 ? 'red' : 'blue';
      }
    }

    this.winnerTeam = winner;
    this.status = 'ROUND_ELIMINATION';

    const eliminated = [];
    const survivors = [];

    Object.values(this.players).forEach(p => {
      if (p.status === 'active') {
        if (p.team === winner) {
          survivors.push({ id: p.id, name: p.name, avatar: p.avatar, isBot: p.isBot });
        } else {
          p.status = 'eliminated';
          eliminated.push({ id: p.id, name: p.name, avatar: p.avatar, isBot: p.isBot });
        }
      }
    });

    this.eliminatedThisRound = eliminated;
    this.survivorsThisRound = survivors;

    const remainingActive = Object.values(this.players).filter(p => p.status === 'active');

    // Championship check
    if (remainingActive.length === 1) {
      this.status = 'CHAMPIONSHIP';
      this.champion = remainingActive[0];
      this.broadcastState();
      return;
    } else if (remainingActive.length === 0) {
      this.status = 'CHAMPIONSHIP';
      this.champion = survivors[0] || null;
      this.broadcastState();
      return;
    }

    this.broadcastState();

    // Auto-advance to next round after 6s countdown
    setTimeout(() => {
      if (this.status === 'ROUND_ELIMINATION') {
        this.roundNumber += 1;
        this.startRound();
      }
    }, 6000);
  }

  handlePull(socketId, timestamp = Date.now()) {
    const player = this.players[socketId];
    if (!player || player.status !== 'active' || this.status !== 'ROUND_ACTIVE') {
      return { success: false, reason: 'inactive' };
    }

    const now = typeof timestamp === 'number' && timestamp > 0 ? timestamp : Date.now();
    // Anti-double-dip guard: reject simultaneous duplicate triggers (< 45ms) from Space + Click spam
    if (now - player.lastPullTime < 45) {
      return {
        success: false,
        reason: 'double_tap_ignored',
        combo: player.combo,
        team: player.team,
        roundPulls: player.roundPulls,
        totalPulls: player.totalPulls
      };
    }

    player.lastPullTime = now;
    player.roundPulls += 1;
    player.totalPulls += 1;
    player.combo = Math.min(50, (player.combo || 0) + 1);

    if (player.team === 'red') {
      this.teamRedPulls += 1;
    } else if (player.team === 'blue') {
      this.teamBluePulls += 1;
    }
    this.updateWeightedScores();

    return {
      success: true,
      combo: player.combo,
      team: player.team,
      roundPulls: player.roundPulls,
      totalPulls: player.totalPulls
    };
  }
}

// Global Rooms Map
const rooms = new Map();
const socketToRoom = new Map();

function getOrCreateRoom(rawRoomId = 'MAIN') {
  const cleanId = (rawRoomId || 'MAIN').toString().trim().toUpperCase().slice(0, 12) || 'MAIN';
  if (!rooms.has(cleanId)) {
    rooms.set(cleanId, new Room(cleanId));
  }
  const room = rooms.get(cleanId);
  room.lastActivity = Date.now();
  return room;
}

// Authoritative Physics Loop for all active rooms (20Hz)
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status === 'ROUND_ACTIVE') {
      // 1. Process Bots
      Object.values(room.players).forEach(p => {
        if (p.isBot && p.status === 'active' && now >= p.nextBotPullTime) {
          room.handlePull(p.id, now);
          p.nextBotPullTime = now + p.botPullInterval + (Math.random() * 40 - 20);
        }
      });

      // 2. Physics computation for rope based on Weighted Average Score
      const counts = room.getTeamCounts();
      const redAvg = room.teamRedPulls / counts.red;
      const blueAvg = room.teamBluePulls / counts.blue;
      const avgDiff = blueAvg - redAvg;
      const targetPos = Math.max(-100, Math.min(100, avgDiff * 6.5));

      room.ropePos += (targetPos - room.ropePos) * 0.15;

      // Check Knockout
      if (room.ropePos <= -98) {
        room.ropePos = -100;
        room.endRound('knockout_red');
        continue;
      } else if (room.ropePos >= 98) {
        room.ropePos = 100;
        room.endRound('knockout_blue');
        continue;
      }

      // Check Time Up
      if (now >= room.roundEndTime) {
        room.endRound('time_up');
        continue;
      }

      // Real-time individual player pull tracking
      const playerPulls = {};
      for (const p of Object.values(room.players)) {
        if (p.status === 'active') {
          playerPulls[p.id] = { roundPulls: p.roundPulls, totalPulls: p.totalPulls };
        }
      }

      // High-frequency volatile sync to players in this room only
      io.to(room.id).volatile.emit('physics_tick', {
        ropePos: room.ropePos,
        teamRedScore: room.teamRedScore,
        teamBlueScore: room.teamBlueScore,
        teamRedPulls: room.teamRedPulls,
        teamBluePulls: room.teamBluePulls,
        teamRedCount: counts.actualRed,
        teamBlueCount: counts.actualBlue,
        playerPulls,
        serverTime: now
      });
    }
  }
}, 50);

// Clean up inactive empty rooms every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (roomId !== 'MAIN' && Object.keys(room.players).length === 0 && now - room.lastActivity > 1800000) {
      rooms.delete(roomId);
    }
  }
}, 1800000);

// SOCKET.IO EVENT ROUTING
io.on('connection', (socket) => {
  // Send initial room state upon connection
  const initialRoom = getOrCreateRoom('MAIN');
  socket.emit('game_state', initialRoom.getPublicState());

  // Clock sync request
  socket.on('sync_time', (clientSendTime) => {
    socket.emit('sync_time_reply', {
      clientSendTime,
      serverTime: Date.now()
    });
  });

  // Player joins a room
  socket.on('join_game', ({ name, avatar = 0, roomId = 'MAIN' }) => {
    const room = getOrCreateRoom(roomId);
    
    // Leave previous room if any
    const oldRoomId = socketToRoom.get(socket.id);
    if (oldRoomId && oldRoomId !== room.id && rooms.has(oldRoomId)) {
      const oldRoom = rooms.get(oldRoomId);
      delete oldRoom.players[socket.id];
      socket.leave(oldRoom.id);
      oldRoom.broadcastState();
    }

    socket.join(room.id);
    socketToRoom.set(socket.id, room.id);

    const sanitizedName = (name || 'Fighter').trim().slice(0, 14);

    if (room.players[socket.id]) {
      room.players[socket.id].name = sanitizedName;
      room.players[socket.id].avatar = avatar || 0;
    } else {
      const player = new Player(socket.id, sanitizedName, false, avatar || 0);
      if (room.status !== 'LOBBY') {
        player.status = 'spectator';
      }
      room.players[socket.id] = player;
    }

    // Assign host if none exists
    const activeHost = room.hostSocketId ? io.sockets.sockets.get(room.hostSocketId) : null;
    if (!room.hostSocketId || !activeHost) {
      room.hostSocketId = socket.id;
    }

    socket.emit('join_confirmed', {
      player: room.players[socket.id],
      isHost: socket.id === room.hostSocketId,
      roomId: room.id
    });

    room.broadcastState();
  });

  // Switch or Create Room
  socket.on('switch_room', (newRoomId) => {
    const targetRoom = getOrCreateRoom(newRoomId);
    const currentRoomId = socketToRoom.get(socket.id);
    let existingPlayer = null;

    if (currentRoomId && rooms.has(currentRoomId)) {
      const currentRoom = rooms.get(currentRoomId);
      existingPlayer = currentRoom.players[socket.id];
      delete currentRoom.players[socket.id];
      socket.leave(currentRoom.id);
      currentRoom.broadcastState();
    }

    socket.join(targetRoom.id);
    socketToRoom.set(socket.id, targetRoom.id);

    if (existingPlayer) {
      targetRoom.players[socket.id] = existingPlayer;
    }

    if (!targetRoom.hostSocketId) {
      targetRoom.hostSocketId = socket.id;
    }

    targetRoom.broadcastState();
  });

  // Update Player Name
  socket.on('update_name', (newName) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (room && room.players[socket.id]) {
      const sanitized = (newName || '').trim().slice(0, 14);
      if (sanitized) {
        room.players[socket.id].name = sanitized;
        room.broadcastState();
      }
    }
  });

  // Pull action
  socket.on('pull', (clientTime, callback) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    const result = room.handlePull(socket.id, clientTime);
    if (typeof callback === 'function') {
      callback(result);
    }
  });

  // Spectator cheer
  socket.on('cheer', ({ team, emote }) => {
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      io.to(roomId).emit('cheer_event', { team, emote, from: socket.id });
    }
  });

  // Add bots
  socket.on('add_bots', (count = 5) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || room.status !== 'LOBBY') return;

    const availableNames = [...BOT_NAMES].sort(() => 0.5 - Math.random());
    const existingNames = new Set(Object.values(room.players).map(p => p.name));
    let added = 0;

    for (const bName of availableNames) {
      if (added >= count) break;
      if (existingNames.has(bName)) continue;
      const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const avatar = Math.floor(Math.random() * 6);
      room.players[botId] = new Player(botId, bName, true, avatar);
      added++;
    }

    room.broadcastState();
  });

  // Clear bots
  socket.on('clear_bots', () => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || room.status !== 'LOBBY') return;

    Object.keys(room.players).forEach(id => {
      if (room.players[id].isBot) {
        delete room.players[id];
      }
    });

    room.broadcastState();
  });

  // Start Tournament
  socket.on('start_tournament', () => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (room && room.status === 'LOBBY') {
      room.roundNumber = 1;
      room.champion = null;
      Object.values(room.players).forEach(p => {
        p.status = 'active';
        p.roundPulls = 0;
        p.totalPulls = 0;
      });
      room.startRound();
    }
  });

  // Set round duration
  socket.on('set_round_duration', (durationSec) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (room && room.status === 'LOBBY' && room.hostSocketId === socket.id) {
      room.roundDuration = Math.max(10, Math.min(300, parseInt(durationSec, 10) || 60));
      room.broadcastState();
    }
  });

  // Reset tournament
  socket.on('reset_tournament', () => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (room) {
      room.status = 'LOBBY';
      room.roundNumber = 1;
      room.ropePos = 0;
      room.teamRedScore = 0;
      room.teamBlueScore = 0;
      room.teamRedPulls = 0;
      room.teamBluePulls = 0;
      room.winnerTeam = null;
      room.champion = null;
      Object.values(room.players).forEach(p => {
        p.status = 'active';
        p.team = null;
        p.roundPulls = 0;
        p.totalPulls = 0;
      });
      room.broadcastState();
    }
  });

  // Leave Game
  socket.on('leave_game', () => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (room) {
      delete room.players[socket.id];
      if (room.hostSocketId === socket.id) {
        const realPlayers = Object.values(room.players).filter(p => !p.isBot);
        room.hostSocketId = realPlayers.length > 0 ? realPlayers[0].id : null;
      }
      room.broadcastState();
    }
    socketToRoom.delete(socket.id);
    socket.leave(roomId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (room) {
      delete room.players[socket.id];
      if (room.hostSocketId === socket.id) {
        const realPlayers = Object.values(room.players).filter(p => !p.isBot);
        room.hostSocketId = realPlayers.length > 0 ? realPlayers[0].id : null;
      }
      room.broadcastState();
    }
    socketToRoom.delete(socket.id);
  });
});

// REST endpoint for status & network info
app.get('/api/info', (req, res) => {
  res.json({
    totalRooms: rooms.size,
    localIp,
    port: PORT
  });
});

// Serve static files from compiled React client if dist exists (Production on Render)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../client/dist');

if (fs.existsSync(clientDistPath)) {
  console.log(`Serving static client files from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🎮 CROWD TUG-OF-WAR SERVER RUNNING (MULTI-ROOM)`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://${localIp}:${PORT}`);
  console.log(`=============================================`);
});
