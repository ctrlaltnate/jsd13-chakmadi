import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Helper to get local IP address for sharing QR code
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

// TOURNAMENT & GAME STATE
const gameState = {
  status: 'LOBBY', // 'LOBBY' | 'ROUND_STARTING' | 'ROUND_ACTIVE' | 'ROUND_ELIMINATION' | 'CHAMPIONSHIP'
  roundNumber: 1,
  totalRounds: 0,
  roundDuration: 25, // seconds
  roundStartTime: 0,
  roundEndTime: 0,
  countdownStartTime: 0,
  ropePos: 0, // -100 (Red win) to +100 (Blue win)
  ropeVelocity: 0,
  teamRedScore: 0,
  teamBlueScore: 0,
  teamRedPulls: 0,
  teamBluePulls: 0,
  players: {}, // socketId -> Player
  hostSocketId: null,
  eliminatedThisRound: [],
  survivorsThisRound: [],
  winnerTeam: null,
  champion: null,
  history: []
};

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
    this.name = name || (isBot ? 'Bot' : 'Player');
    this.isBot = isBot;
    this.avatar = avatar;
    this.team = null; // 'red' | 'blue' | null
    this.status = 'active'; // 'active' | 'eliminated' | 'spectator'
    this.totalPulls = 0;
    this.roundPulls = 0;
    this.lastPullTime = 0;
    this.flaggedClicks = 0;
    this.penaltyUntil = 0;
    this.combo = 0;
    this.botPullInterval = 140 + Math.floor(Math.random() * 80); // 140ms - 220ms
    this.nextBotPullTime = 0;
  }
}

// Broadcast clean state to all clients
function getPublicState() {
  return {
    status: gameState.status,
    roundNumber: gameState.roundNumber,
    roundDuration: gameState.roundDuration,
    roundStartTime: gameState.roundStartTime,
    roundEndTime: gameState.roundEndTime,
    countdownStartTime: gameState.countdownStartTime,
    ropePos: gameState.ropePos,
    teamRedScore: gameState.teamRedScore,
    teamBlueScore: gameState.teamBlueScore,
    teamRedPulls: gameState.teamRedPulls,
    teamBluePulls: gameState.teamBluePulls,
    players: Object.values(gameState.players).map(p => ({
      id: p.id,
      name: p.name,
      team: p.team,
      status: p.status,
      avatar: p.avatar,
      roundPulls: p.roundPulls,
      totalPulls: p.totalPulls,
      isBot: p.isBot
    })),
    hostSocketId: gameState.hostSocketId,
    eliminatedThisRound: gameState.eliminatedThisRound,
    survivorsThisRound: gameState.survivorsThisRound,
    winnerTeam: gameState.winnerTeam,
    champion: gameState.champion,
    serverTime: Date.now(),
    localIp
  };
}

function broadcastState() {
  io.emit('game_state', getPublicState());
}

// Split active survivors randomly into Team Red and Team Blue
function assignTeams() {
  const activePlayers = Object.values(gameState.players).filter(p => p.status === 'active');
  
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
  Object.values(gameState.players).forEach(p => {
    if (p.status !== 'active') {
      p.team = null;
      p.roundPulls = 0;
    }
  });
}

// Start a tournament round
function startRound() {
  const activePlayers = Object.values(gameState.players).filter(p => p.status === 'active');
  if (activePlayers.length < 2) {
    console.log('Not enough active players to start round');
    return;
  }

  assignTeams();

  gameState.status = 'ROUND_STARTING';
  gameState.ropePos = 0;
  gameState.ropeVelocity = 0;
  gameState.teamRedScore = 0;
  gameState.teamBlueScore = 0;
  gameState.teamRedPulls = 0;
  gameState.teamBluePulls = 0;
  gameState.winnerTeam = null;
  gameState.eliminatedThisRound = [];
  gameState.survivorsThisRound = [];
  gameState.countdownStartTime = Date.now();

  broadcastState();

  // 3-second countdown before live pull
  setTimeout(() => {
    if (gameState.status !== 'ROUND_STARTING') return;

    gameState.status = 'ROUND_ACTIVE';
    gameState.roundStartTime = Date.now();
    gameState.roundEndTime = gameState.roundStartTime + (gameState.roundDuration * 1000);

    // Initialize bot pull timers
    const now = Date.now();
    Object.values(gameState.players).forEach(p => {
      if (p.isBot && p.status === 'active') {
        p.nextBotPullTime = now + 100 + Math.random() * 300;
      }
    });

    broadcastState();
  }, 3000);
}

// Complete round and perform elimination
function endRound(reason = 'time_up') {
  if (gameState.status !== 'ROUND_ACTIVE') return;

  // Determine winner:
  // ropePos < 0 -> Red wins; ropePos > 0 -> Blue wins.
  // If exactly 0, higher pull count wins.
  let winner = null;
  if (gameState.ropePos < -0.1) {
    winner = 'red';
  } else if (gameState.ropePos > 0.1) {
    winner = 'blue';
  } else {
    if (gameState.teamRedPulls > gameState.teamBluePulls) {
      winner = 'red';
    } else if (gameState.teamBluePulls > gameState.teamRedPulls) {
      winner = 'blue';
    } else {
      // Rare absolute tie -> coin flip
      winner = Math.random() < 0.5 ? 'red' : 'blue';
    }
  }

  gameState.winnerTeam = winner;
  gameState.status = 'ROUND_ELIMINATION';

  const eliminated = [];
  const survivors = [];

  Object.values(gameState.players).forEach(p => {
    if (p.status === 'active') {
      if (p.team === winner) {
        survivors.push({ id: p.id, name: p.name, avatar: p.avatar, isBot: p.isBot });
      } else {
        p.status = 'eliminated';
        eliminated.push({ id: p.id, name: p.name, avatar: p.avatar, isBot: p.isBot });
      }
    }
  });

  gameState.eliminatedThisRound = eliminated;
  gameState.survivorsThisRound = survivors;

  // Check if tournament is finished
  const remainingActive = Object.values(gameState.players).filter(p => p.status === 'active');

  broadcastState();

  // If 1 player remaining -> we have a champion!
  if (remainingActive.length === 1) {
    setTimeout(() => {
      gameState.status = 'CHAMPIONSHIP';
      gameState.champion = remainingActive[0];
      broadcastState();
    }, 5000);
  } else if (remainingActive.length === 0) {
    // Should not happen, but safe fallback
    gameState.status = 'LOBBY';
    broadcastState();
  } else {
    // Advance to next round automatically after 6 seconds
    setTimeout(() => {
      if (gameState.status === 'ROUND_ELIMINATION') {
        gameState.roundNumber += 1;
        startRound();
      }
    }, 6000);
  }
}

// 20Hz Server authoritative physics and bot simulation loop
setInterval(() => {
  const now = Date.now();

  if (gameState.status === 'ROUND_ACTIVE') {
    // 1. Process Bots
    Object.values(gameState.players).forEach(p => {
      if (p.isBot && p.status === 'active' && now >= p.nextBotPullTime) {
        handlePull(p.id, now);
        p.nextBotPullTime = now + p.botPullInterval + (Math.random() * 40 - 20);
      }
    });

    // 2. Physics computation for rope
    // Net force toward Red (negative) or Blue (positive)
    // Rope target delta
    const pullDiff = gameState.teamBluePulls - gameState.teamRedPulls;
    // Base displacement mapped to -100 to +100
    // Dynamic spring physics with inertia
    const activeCount = Object.values(gameState.players).filter(p => p.status === 'active').length || 2;
    const forcePerPull = 100 / Math.max(8, activeCount * 12);
    const targetPos = Math.max(-100, Math.min(100, pullDiff * forcePerPull));

    // Smooth toward targetPos with spring interpolation
    gameState.ropePos += (targetPos - gameState.ropePos) * 0.15;

    // Check KO (Knockout if rope pulled past -98 or +98)
    if (gameState.ropePos <= -98) {
      gameState.ropePos = -100;
      endRound('knockout_red');
      return;
    } else if (gameState.ropePos >= 98) {
      gameState.ropePos = 100;
      endRound('knockout_blue');
      return;
    }

    // Check Time Up
    if (now >= gameState.roundEndTime) {
      endRound('time_up');
      return;
    }

    // High-frequency sync during active match
    io.emit('physics_tick', {
      ropePos: gameState.ropePos,
      teamRedScore: gameState.teamRedScore,
      teamBlueScore: gameState.teamBlueScore,
      teamRedPulls: gameState.teamRedPulls,
      teamBluePulls: gameState.teamBluePulls,
      serverTime: now
    });
  }
}, 50); // 20 FPS physics loop

// Handle player pull action with anti-bot rate-limiting (< 100ms)
function handlePull(socketId, timestamp = Date.now()) {
  const player = gameState.players[socketId];
  if (!player || player.status !== 'active' || gameState.status !== 'ROUND_ACTIVE') {
    return { success: false, reason: 'inactive' };
  }

  // Anti-bot check: clicks faster than 100ms interval are flagged/ignored
  const delta = timestamp - player.lastPullTime;
  if (player.lastPullTime > 0 && delta < 100) {
    player.flaggedClicks += 1;
    player.combo = 0;
    // brief penalty if repeatedly spamming
    if (player.flaggedClicks > 3) {
      player.penaltyUntil = timestamp + 500;
    }
    return {
      success: false,
      reason: 'anti_bot_throttled',
      delta,
      flagged: true
    };
  }

  if (timestamp < player.penaltyUntil) {
    return {
      success: false,
      reason: 'penalty_cooldown'
    };
  }

  // Valid pull!
  player.lastPullTime = timestamp;
  player.roundPulls += 1;
  player.totalPulls += 1;
  player.combo = Math.min(10, (player.combo || 0) + 1);

  if (player.team === 'red') {
    gameState.teamRedPulls += 1;
    gameState.teamRedScore += 10;
  } else if (player.team === 'blue') {
    gameState.teamBluePulls += 1;
    gameState.teamBlueScore += 10;
  }

  return {
    success: true,
    combo: player.combo,
    team: player.team,
    roundPulls: player.roundPulls
  };
}

// SOCKET.IO CONNECTION HANDLING
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Assign first connector as host if none exists
  if (!gameState.hostSocketId) {
    gameState.hostSocketId = socket.id;
  }

  // Clock sync request (for millisecond synchronized countdown)
  socket.on('sync_time', (clientSendTime) => {
    socket.emit('sync_time_reply', {
      clientSendTime,
      serverTime: Date.now()
    });
  });

  // Player joins with name and avatar
  socket.on('join_game', ({ name, avatar }) => {
    const sanitizedName = (name || `Player_${socket.id.slice(0, 4)}`).trim().slice(0, 16);
    
    // Check if player already exists (reconnect)
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].name = sanitizedName;
      gameState.players[socket.id].avatar = avatar || 0;
    } else {
      const player = new Player(socket.id, sanitizedName, false, avatar || 0);
      // If round is currently active, join as spectator until next round
      if (gameState.status !== 'LOBBY') {
        player.status = 'spectator';
      }
      gameState.players[socket.id] = player;
    }

    socket.emit('join_confirmed', {
      player: gameState.players[socket.id],
      isHost: socket.id === gameState.hostSocketId
    });

    broadcastState();
  });

  // Claim or release host role
  socket.on('claim_host', () => {
    gameState.hostSocketId = socket.id;
    broadcastState();
  });

  // Pull button action
  socket.on('pull', (clientTime, callback) => {
    const result = handlePull(socket.id, Date.now());
    if (typeof callback === 'function') {
      callback(result);
    }
  });

  // Cheer emote from spectators
  socket.on('cheer', ({ team, emote }) => {
    io.emit('cheer_event', {
      team,
      emote: emote || '❤️',
      from: gameState.players[socket.id]?.name || 'Spectator'
    });
  });

  // Host starts tournament
  socket.on('start_tournament', () => {
    if (socket.id !== gameState.hostSocketId && Object.keys(gameState.players).length > 0) {
      // allow if only player or is host
      if (socket.id !== gameState.hostSocketId) return;
    }

    // Reset all non-bot players to active
    Object.values(gameState.players).forEach(p => {
      p.status = 'active';
      p.totalPulls = 0;
      p.roundPulls = 0;
    });

    gameState.roundNumber = 1;
    startRound();
  });

  // Host adjusts round duration
  socket.on('set_round_duration', (duration) => {
    if (socket.id === gameState.hostSocketId && duration >= 10 && duration <= 120) {
      gameState.roundDuration = duration;
      broadcastState();
    }
  });

  // Host adds bots for easy 50-player testing
  socket.on('add_bots', (count = 10) => {
    if (socket.id !== gameState.hostSocketId) return;

    const currentCount = Object.keys(gameState.players).length;
    const toAdd = Math.min(count, 64 - currentCount);

    for (let i = 0; i < toAdd; i++) {
      const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nameIndex = Math.floor(Math.random() * BOT_NAMES.length);
      const botName = `${BOT_NAMES[nameIndex]}_${Math.floor(Math.random() * 90 + 10)}`;
      const bot = new Player(botId, botName, true, Math.floor(Math.random() * 6));
      gameState.players[botId] = bot;
    }

    broadcastState();
  });

  // Host clears all bots
  socket.on('clear_bots', () => {
    if (socket.id !== gameState.hostSocketId) return;

    Object.keys(gameState.players).forEach(id => {
      if (gameState.players[id].isBot) {
        delete gameState.players[id];
      }
    });

    broadcastState();
  });

  // Host resets tournament back to lobby
  socket.on('reset_tournament', () => {
    if (socket.id !== gameState.hostSocketId) return;

    gameState.status = 'LOBBY';
    gameState.roundNumber = 1;
    gameState.ropePos = 0;
    gameState.winnerTeam = null;
    gameState.champion = null;
    gameState.eliminatedThisRound = [];
    gameState.survivorsThisRound = [];

    Object.values(gameState.players).forEach(p => {
      p.status = 'active';
      p.team = null;
      p.roundPulls = 0;
      p.totalPulls = 0;
    });

    broadcastState();
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    delete gameState.players[socket.id];

    if (gameState.hostSocketId === socket.id) {
      // Reassign host to next available real player
      const realPlayers = Object.values(gameState.players).filter(p => !p.isBot);
      gameState.hostSocketId = realPlayers.length > 0 ? realPlayers[0].id : null;
    }

    broadcastState();
  });

  // Initial state on connect
  socket.emit('game_state', getPublicState());
});

// REST endpoint for status & network info
app.get('/api/info', (req, res) => {
  res.json({
    status: gameState.status,
    playerCount: Object.keys(gameState.players).length,
    localIp,
    port: PORT
  });
});

server.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🎮 CROWD TUG-OF-WAR SERVER RUNNING`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://${localIp}:${PORT}`);
  console.log(`=============================================`);
});
