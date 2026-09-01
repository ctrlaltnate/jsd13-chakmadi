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
  perMessageDeflate: false,
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
    this.status = 'active'; // 'active' | 'eliminated' | 'spectator' | 'waiting_rejoin'
    this.isReady = isBot; // Bots are ready by default; players can toggle ready
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

// UNIFIED MAIN GAME ROOM
class GameRoom {
  constructor() {
    this.status = 'LOBBY'; // 'LOBBY' | 'ROUND_STARTING' | 'ROUND_ACTIVE' | 'ROUND_ELIMINATION' | 'CHAMPIONSHIP'
    this.roundNumber = 1;
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
    this.hostToken = 'ht_' + Math.random().toString(36).substr(2, 9); // Persistent host secret
    this.hostSocketId = null;
    this.hostName = '';
    this.eliminatedThisRound = [];
    this.survivorsThisRound = [];
    this.winnerTeam = null;
    this.champion = null;
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
        isReady: p.id === this.hostSocketId ? true : Boolean(p.isReady),
        avatar: p.avatar,
        roundPulls: p.roundPulls,
        totalPulls: p.totalPulls,
        isBot: p.isBot
      })),
      hostSocketId: this.hostSocketId,
      hostName: this.hostName,
      eliminatedThisRound: this.eliminatedThisRound,
      survivorsThisRound: this.survivorsThisRound,
      winnerTeam: this.winnerTeam,
      champion: this.champion,
      serverTime: Date.now(),
      localIp
    };
  }

  broadcastState() {
    io.emit('game_state', this.getPublicState());
  }

  // Split active survivors randomly into Team Red and Team Blue
  assignTeams() {
    const activePlayers = Object.values(this.players).filter(p => p.status === 'active');
    
    // Shuffle active players Fisher-Yates
    for (let i = activePlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activePlayers[i], activePlayers[j]] = [activePlayers[j], activePlayers[i]];
    }

    // Distribute evenly
    activePlayers.forEach((player, index) => {
      player.team = index % 2 === 0 ? 'red' : 'blue';
      player.roundPulls = 0;
      player.combo = 0;
    });
  }

  startRound() {
    this.assignTeams();
    this.status = 'ROUND_STARTING';
    this.countdownStartTime = Date.now();
    this.ropePos = 0;
    this.teamRedScore = 0;
    this.teamBlueScore = 0;
    this.teamRedPulls = 0;
    this.teamBluePulls = 0;
    this.broadcastState();

    // 3.5 seconds synchronized countdown
    setTimeout(() => {
      if (this.status === 'ROUND_STARTING') {
        this.status = 'ROUND_ACTIVE';
        this.roundStartTime = Date.now();
        this.roundEndTime = this.roundStartTime + (this.roundDuration * 1000);
        
        // Reset next bot pull times
        Object.values(this.players).forEach(p => {
          if (p.isBot && p.status === 'active') {
            p.nextBotPullTime = this.roundStartTime + Math.floor(Math.random() * 200);
          }
        });

        this.broadcastState();
        io.emit('round_started');
      }
    }, 3500);
  }

  endRound(reason = 'time_up') {
    if (this.status !== 'ROUND_ACTIVE') return;

    this.status = 'ROUND_ELIMINATION';
    this.updateWeightedScores();

    let winner = null;
    if (this.teamRedScore > this.teamBlueScore || this.ropePos <= -98) {
      winner = 'red';
    } else if (this.teamBlueScore > this.teamRedScore || this.ropePos >= 98) {
      winner = 'blue';
    } else {
      // Tie breaker: sudden coin flip
      winner = Math.random() < 0.5 ? 'red' : 'blue';
    }

    this.winnerTeam = winner;
    io.emit('round_ended', { winnerTeam: winner, reason });

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

  handlePull(socketId, timestamp = Date.now(), count = 1) {
    const player = this.players[socketId];
    if (!player || player.status !== 'active' || this.status !== 'ROUND_ACTIVE') {
      return { success: false, reason: 'inactive' };
    }

    const now = typeof timestamp === 'number' && timestamp > 0 ? timestamp : Date.now();
    const safeCount = Math.max(1, Math.min(15, parseInt(count, 10) || 1));

    // Anti-double-dip guard (for single micro-tap spam under 45ms)
    if (safeCount === 1 && now - player.lastPullTime < 45) {
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
    player.roundPulls += safeCount;
    player.totalPulls += safeCount;
    player.combo = Math.min(50, (player.combo || 0) + safeCount);

    if (player.team === 'red') {
      this.teamRedPulls += safeCount;
    } else if (player.team === 'blue') {
      this.teamBluePulls += safeCount;
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

// Single Unified Main Room
const mainRoom = new GameRoom();

// Authoritative Physics Loop (Balanced 15Hz = ~66ms)
// 15Hz provides ultra-responsive real-time gameplay while avoiding server and browser network congestion
let tickCount = 0;

setInterval(() => {
  const now = Date.now();
  if (mainRoom.status === 'ROUND_ACTIVE') {
    tickCount++;

    // 1. Process Bots
    Object.values(mainRoom.players).forEach(p => {
      if (p.isBot && p.status === 'active' && now >= p.nextBotPullTime) {
        mainRoom.handlePull(p.id, now, 1);
        p.nextBotPullTime = now + p.botPullInterval + (Math.random() * 40 - 20);
      }
    });

    // 2. Physics computation for rope based on Weighted Average Score
    const counts = mainRoom.getTeamCounts();
    const redAvg = mainRoom.teamRedPulls / counts.red;
    const blueAvg = mainRoom.teamBluePulls / counts.blue;
    const avgDiff = blueAvg - redAvg;
    const targetPos = Math.max(-100, Math.min(100, avgDiff * 6.5));

    mainRoom.ropePos += (targetPos - mainRoom.ropePos) * 0.18;

    // Check Knockout
    if (mainRoom.ropePos <= -98) {
      mainRoom.ropePos = -100;
      mainRoom.endRound('knockout_red');
      return;
    } else if (mainRoom.ropePos >= 98) {
      mainRoom.ropePos = 100;
      mainRoom.endRound('knockout_blue');
      return;
    }

    // Check Time Up
    if (now >= mainRoom.roundEndTime) {
      mainRoom.endRound('time_up');
      return;
    }

    // Tiered Payload Optimization:
    // Global rope and scores broadcast at 15Hz (66ms).
    // Heavy individual player pulls map is broadcast every 3rd tick (~5Hz / 200ms),
    // reducing outbound network payload by 65% while keeping individual leaderboards live!
    let playerPulls = null;
    if (tickCount % 3 === 0) {
      playerPulls = {};
      for (const p of Object.values(mainRoom.players)) {
        if (p.status === 'active') {
          playerPulls[p.id] = { roundPulls: p.roundPulls, totalPulls: p.totalPulls };
        }
      }
    }

    const tickData = {
      ropePos: Number(mainRoom.ropePos.toFixed(2)),
      teamRedScore: mainRoom.teamRedScore,
      teamBlueScore: mainRoom.teamBlueScore,
      teamRedPulls: mainRoom.teamRedPulls,
      teamBluePulls: mainRoom.teamBluePulls,
      teamRedCount: counts.actualRed,
      teamBlueCount: counts.actualBlue,
      serverTime: now
    };

    if (playerPulls) {
      tickData.playerPulls = playerPulls;
    }

    // High-frequency volatile sync to all connected clients
    io.volatile.emit('physics_tick', tickData);
  }
}, 66);

// SOCKET.IO EVENT ROUTING
io.on('connection', (socket) => {
  // Send initial game state upon connection
  socket.emit('game_state', mainRoom.getPublicState());

  // Clock sync request
  socket.on('sync_time', (clientSendTime) => {
    socket.emit('sync_time_reply', {
      clientSendTime,
      serverTime: Date.now()
    });
  });

  // Player joins the game
  socket.on('join_game', ({ name, avatar = 0, hostToken = null }) => {
    const sanitizedName = (name || 'Fighter').trim().slice(0, 14);

    if (mainRoom.players[socket.id]) {
      mainRoom.players[socket.id].name = sanitizedName;
      mainRoom.players[socket.id].avatar = avatar || 0;
    } else {
      const player = new Player(socket.id, sanitizedName, false, avatar || 0);
      if (mainRoom.status !== 'LOBBY') {
        player.status = 'spectator';
      }
      mainRoom.players[socket.id] = player;
    }

    // Persistent host recognition:
    // 1. If client sends matching hostToken -> restore as host!
    // 2. If no active host and no host has registered yet -> first player is host!
    let isHost = false;
    if (hostToken && hostToken === mainRoom.hostToken) {
      mainRoom.hostSocketId = socket.id;
      mainRoom.hostName = sanitizedName;
      isHost = true;
    } else if (!mainRoom.hostSocketId && !mainRoom.hostName) {
      mainRoom.hostSocketId = socket.id;
      mainRoom.hostName = sanitizedName;
      isHost = true;
    } else if (mainRoom.hostSocketId === socket.id) {
      isHost = true;
    }

    socket.emit('join_confirmed', {
      player: mainRoom.players[socket.id],
      isHost,
      hostToken: isHost ? mainRoom.hostToken : null
    });

    mainRoom.broadcastState();
  });

  // Non-host player confirms ready for next round
  socket.on('rejoin_game', () => {
    if (mainRoom.players[socket.id]) {
      mainRoom.players[socket.id].status = 'active';
      mainRoom.players[socket.id].isReady = true;
      mainRoom.players[socket.id].team = null;
      mainRoom.players[socket.id].roundPulls = 0;
      mainRoom.players[socket.id].totalPulls = 0;
      mainRoom.broadcastState();
    }
  });

  // Non-host player toggles ready state in lobby
  socket.on('set_ready', (isReady) => {
    if (mainRoom.players[socket.id]) {
      const current = mainRoom.players[socket.id].isReady;
      const next = typeof isReady === 'boolean' ? isReady : !current;
      mainRoom.players[socket.id].isReady = next;
      if (next) {
        mainRoom.players[socket.id].status = 'active';
      }
      mainRoom.broadcastState();
    }
  });

  // Update Player Profile (Name and/or Avatar)
  socket.on('update_profile', ({ name, avatar }) => {
    if (mainRoom.players[socket.id]) {
      const sanitized = (name || '').trim().slice(0, 14);
      if (sanitized) {
        mainRoom.players[socket.id].name = sanitized;
      }
      if (typeof avatar === 'number') {
        mainRoom.players[socket.id].avatar = avatar;
      }
      mainRoom.broadcastState();
    }
  });

  // Update Player Name
  socket.on('update_name', (newName) => {
    if (mainRoom.players[socket.id]) {
      const sanitized = (newName || '').trim().slice(0, 14);
      if (sanitized) {
        mainRoom.players[socket.id].name = sanitized;
        mainRoom.broadcastState();
      }
    }
  });

  // Pull action (supports both single pull and batched micro-pulls)
  socket.on('pull', (arg1, arg2) => {
    let clientTime = Date.now();
    let count = 1;
    let callback = null;

    if (typeof arg1 === 'object' && arg1 !== null) {
      count = arg1.count || 1;
      clientTime = arg1.timestamp || Date.now();
      if (typeof arg2 === 'function') callback = arg2;
    } else if (typeof arg1 === 'number') {
      clientTime = arg1;
      if (typeof arg2 === 'function') callback = arg2;
    } else if (typeof arg1 === 'function') {
      callback = arg1;
    }

    const result = mainRoom.handlePull(socket.id, clientTime, count);
    if (typeof callback === 'function') {
      callback(result);
    }
  });

  // Spectator cheer
  socket.on('cheer', ({ team, emote }) => {
    io.emit('cheer_event', { team, emote, from: socket.id });
  });

  // Add bots
  socket.on('add_bots', (count = 5) => {
    if (mainRoom.status !== 'LOBBY' || mainRoom.hostSocketId !== socket.id) return;

    const availableNames = [...BOT_NAMES].sort(() => 0.5 - Math.random());
    const existingNames = new Set(Object.values(mainRoom.players).map(p => p.name));
    let added = 0;

    for (const bName of availableNames) {
      if (added >= count) break;
      if (existingNames.has(bName)) continue;
      const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const avatar = Math.floor(Math.random() * 6);
      mainRoom.players[botId] = new Player(botId, bName, true, avatar);
      added++;
    }

    mainRoom.broadcastState();
  });

  // Clear bots
  socket.on('clear_bots', () => {
    if (mainRoom.status !== 'LOBBY' || mainRoom.hostSocketId !== socket.id) return;

    Object.keys(mainRoom.players).forEach(id => {
      if (mainRoom.players[id].isBot) {
        delete mainRoom.players[id];
      }
    });

    mainRoom.broadcastState();
  });

  // Start Tournament
  socket.on('start_tournament', () => {
    if (mainRoom.status === 'LOBBY' && mainRoom.hostSocketId === socket.id) {
      mainRoom.roundNumber = 1;
      mainRoom.champion = null;
      Object.values(mainRoom.players).forEach(p => {
        if (p.status === 'active') {
          p.roundPulls = 0;
          p.totalPulls = 0;
        }
      });
      mainRoom.startRound();
    }
  });

  // Set round duration
  socket.on('set_round_duration', (durationSec) => {
    if (mainRoom.status === 'LOBBY' && mainRoom.hostSocketId === socket.id) {
      mainRoom.roundDuration = Math.max(10, Math.min(300, parseInt(durationSec, 10) || 60));
      mainRoom.broadcastState();
    }
  });

  // Reset tournament (Host only: non-host players confirm with "พร้อมเล่นรอบใหม่")
  socket.on('reset_tournament', () => {
    if (mainRoom.hostSocketId !== socket.id) return;

    mainRoom.status = 'LOBBY';
    mainRoom.roundNumber = 1;
    mainRoom.ropePos = 0;
    mainRoom.teamRedScore = 0;
    mainRoom.teamBlueScore = 0;
    mainRoom.teamRedPulls = 0;
    mainRoom.teamBluePulls = 0;
    mainRoom.winnerTeam = null;
    mainRoom.champion = null;

    Object.values(mainRoom.players).forEach(p => {
      p.roundPulls = 0;
      p.totalPulls = 0;
      p.team = null;
      if (p.id === mainRoom.hostSocketId || p.isBot) {
        p.status = 'active';
        p.isReady = true;
      } else if (p.isReady) {
        p.status = 'active';
      } else {
        p.status = 'waiting_rejoin';
        p.isReady = false;
      }
    });

    mainRoom.broadcastState();
  });

  // Leave Game
  socket.on('leave_game', () => {
    delete mainRoom.players[socket.id];
    if (mainRoom.hostSocketId === socket.id) {
      mainRoom.hostSocketId = null;
    }
    mainRoom.broadcastState();
  });

  // Disconnect
  socket.on('disconnect', () => {
    delete mainRoom.players[socket.id];
    if (mainRoom.hostSocketId === socket.id) {
      mainRoom.hostSocketId = null;
    }
    mainRoom.broadcastState();
  });
});

// REST endpoint for status & network info
app.get('/api/info', (req, res) => {
  res.json({
    status: 'online',
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
  console.log(`🎮 CROWD TUG-OF-WAR SERVER RUNNING (UNIFIED ARENA)`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://${localIp}:${PORT}`);
  console.log(`=============================================`);
});
