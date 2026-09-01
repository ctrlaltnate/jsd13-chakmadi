import React, { useState, useEffect } from 'react';
import { socketService } from './services/socket';
import { soundService } from './services/sound';
import JoinModal from './components/JoinModal';
import JoinRoomModal from './components/JoinRoomModal';
import WelcomeScreen from './components/WelcomeScreen';
import LobbyScreen from './components/LobbyScreen';
import Scoreboard from './components/Scoreboard';
import TugCanvas from './components/TugCanvas';
import TeamRosters, { TeamPanel } from './components/TeamRosters';
import PullController from './components/PullController';
import RoundStartingModal from './components/RoundStartingModal';
import RoundSummaryScreen from './components/RoundSummaryScreen';
import ChampionScreen from './components/ChampionScreen';

export default function App() {
  const [gameState, setGameState] = useState({
    status: 'LOBBY',
    roundNumber: 1,
    roundDuration: 60,
    roundStartTime: 0,
    roundEndTime: 0,
    countdownStartTime: 0,
    ropePos: 0,
    teamRedScore: 0,
    teamBlueScore: 0,
    teamRedPulls: 0,
    teamBluePulls: 0,
    players: [],
    hostSocketId: null,
    hostName: '',
    eliminatedThisRound: [],
    survivorsThisRound: [],
    winnerTeam: null,
    champion: null,
    localIp: 'localhost'
  });

  const [currentSocketId, setCurrentSocketId] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [bgmActive, setBgmActive] = useState(true);
  const [scanlines, setScanlines] = useState(false);
  const [cheerParticles, setCheerParticles] = useState([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');

  // 6-Character Room Code Generator: JSD + 3 digits (e.g. JSD123, JSD888)
  const generateJsdCode = () => {
    const digits = Math.floor(100 + Math.random() * 900);
    return `JSD${digits}`;
  };

  // Room Code: from ?room=... or localStorage, or null for first-time arrival
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      return roomParam.toUpperCase().slice(0, 12);
    }
    const savedRoom = localStorage.getItem('tug_room_id');
    if (savedRoom) {
      return savedRoom.toUpperCase().slice(0, 12);
    }
    return null; // When null, visitor sees WelcomeScreen to choose Create or Join Room
  });

  // Keep URL and localStorage in sync with current room code
  useEffect(() => {
    if (roomId) {
      localStorage.setItem('tug_room_id', roomId);
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [roomId]);

  // Switch or Join Room
  const handleSwitchRoom = (newRoomCode) => {
    let cleanRoom = (newRoomCode || '').trim().toUpperCase().slice(0, 12);
    if (!cleanRoom) return;
    if (/^\d{3}$/.test(cleanRoom)) {
      cleanRoom = `JSD${cleanRoom}`;
    }
    setRoomId(cleanRoom);
    soundService.playVictory();
    const savedName = localStorage.getItem('tug_player_name') || playerName;
    const savedAvatar = parseInt(localStorage.getItem('tug_player_avatar') || `${playerAvatar}`, 10);
    if (savedName) {
      socketService.switchRoom(cleanRoom);
      setHasJoined(true);
    } else {
      setShowJoinModal(true);
    }
  };

  // Create Room as Owner (JSD + 3 digits)
  const handleCreateRoom = () => {
    const newRoomCode = generateJsdCode();
    setRoomId(newRoomCode);
    soundService.playVictory();
    const savedName = localStorage.getItem('tug_player_name');
    const savedAvatar = parseInt(localStorage.getItem('tug_player_avatar') || '0', 10);
    if (savedName) {
      socketService.joinGame(savedName, savedAvatar, newRoomCode);
      setHasJoined(true);
      setShowJoinModal(false);
    } else {
      setShowJoinModal(true);
    }
  };

  // Copy Room Link
  const handleCopyRoomLink = () => {
    if (!roomId) return;
    const origin = window.location.origin;
    const shareUrl = `${origin}/?room=${encodeURIComponent(roomId)}`;
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
      }
    } catch (e) {}
    soundService.playCheer();
    alert(`📋 คัดลอกลิงก์ห้อง ${roomId} แล้ว! ส่งต่อให้เพื่อนเข้าเล่นได้ทันที`);
  };

  // Socket event listeners
  useEffect(() => {
    const socket = socketService.socket;

    socket.on('connect', () => {
      setCurrentSocketId(socket.id);
      const savedName = localStorage.getItem('tug_player_name');
      const savedAvatar = parseInt(localStorage.getItem('tug_player_avatar') || '0', 10);
      if (roomId) {
        if (savedName) {
          setPlayerName(savedName);
          setPlayerAvatar(savedAvatar);
          socketService.joinGame(savedName, savedAvatar, roomId);
          setHasJoined(true);
        } else {
          setShowJoinModal(true);
        }
      }
    });

    socket.on('game_state', (state) => {
      setGameState(state);
    });

    socket.on('physics_tick', (tick) => {
      setGameState((prev) => {
        const updatedPlayers = tick.playerPulls
          ? prev.players.map((p) => {
              const pulls = tick.playerPulls[p.id];
              return pulls
                ? { ...p, roundPulls: pulls.roundPulls, totalPulls: pulls.totalPulls }
                : p;
            })
          : prev.players;

        return {
          ...prev,
          ropePos: tick.ropePos,
          teamRedScore: tick.teamRedScore,
          teamBlueScore: tick.teamBlueScore,
          teamRedPulls: tick.teamRedPulls,
          teamBluePulls: tick.teamBluePulls,
          teamRedCount: tick.teamRedCount ?? prev.teamRedCount,
          teamBlueCount: tick.teamBlueCount ?? prev.teamBlueCount,
          players: updatedPlayers
        };
      });
    });

    socket.on('join_confirmed', ({ player, isHost, hostToken, roomId: confirmedRoomId }) => {
      if (player) {
        setPlayerName(player.name);
        setPlayerAvatar(player.avatar);
        setHasJoined(true);
        setShowJoinModal(false);
        if (confirmedRoomId) {
          setRoomId(confirmedRoomId);
        }
        if (isHost && hostToken && confirmedRoomId) {
          localStorage.setItem(`tug_host_token_${confirmedRoomId}`, hostToken);
        }
      }
    });

    socket.on('cheer_event', ({ team, emote, from }) => {
      const particleId = Date.now() + Math.random();
      const x = team === 'red' ? 120 + Math.random() * 100 : 580 + Math.random() * 100;
      const y = 140 + Math.random() * 60;
      setCheerParticles((prev) => [...prev.slice(-15), { id: particleId, x, y, emote }]);
      setTimeout(() => {
        setCheerParticles((prev) => prev.filter((p) => p.id !== particleId));
      }, 1200);
    });

    socket.on('round_started', () => {
      soundService.playVictory();
    });

    socket.on('round_ended', ({ winnerTeam }) => {
      if (winnerTeam) {
        soundService.playVictory();
      }
    });

    return () => {
      socket.off('connect');
      socket.off('game_state');
      socket.off('physics_tick');
      socket.off('join_confirmed');
      socket.off('cheer_event');
      socket.off('round_started');
      socket.off('round_ended');
    };
  }, [roomId]);

  // Audio Toggles
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    soundService.setMuted(nextMute);
  };

  const handleToggleBGM = () => {
    const nextBgm = !bgmActive;
    setBgmActive(nextBgm);
    soundService.setBgmActive(nextBgm);
  };

  // Leave Game
  const handleLeaveGame = () => {
    if (window.confirm('คุณต้องการออกจากเกมหรือไม่? (Are you sure you want to leave the game?)')) {
      soundService.playWarning();
      socketService.leaveGame();
      setHasJoined(false);
      localStorage.removeItem('tug_room_id');
      setRoomId(null);
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Name edit handlers
  const handleStartEditName = () => {
    setEditNameInput(myPlayer?.name || playerName);
    setIsEditingName(true);
  };

  const handleSaveEditName = (e) => {
    if (e) e.preventDefault();
    const clean = editNameInput.trim();
    if (clean) {
      setPlayerName(clean);
      localStorage.setItem('tug_player_name', clean);
      socketService.updateName(clean);
    }
    setIsEditingName(false);
  };

  // Resolve my player object
  const myPlayer = gameState.players.find((p) => p.id === currentSocketId);
  const isHost = currentSocketId && gameState.hostSocketId === currentSocketId;
  const activeSurvivors = gameState.players.filter((p) => p.status === 'active');

  return (
    <div className={`relative ${gameState.status === 'ROUND_ACTIVE' ? 'h-screen h-dvh max-h-screen max-h-dvh overflow-hidden' : 'min-h-screen min-h-dvh'} bg-[#070912] text-white flex flex-col justify-between`}>
      {/* CRT Scanline Overlay */}
      {scanlines && <div className="fixed inset-0 scanlines pointer-events-none z-50"></div>}

      {/* Top Retro Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0f1322]/95 backdrop-blur-xs border-b-2 sm:border-b-3 border-[#334155] px-2.5 sm:px-4 py-1 sm:py-1.5 select-none shadow-md shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => !roomId && setRoomId(null)}>
            <span className="text-xl sm:text-2xl animate-pulse">🥊</span>
            <div>
              <div className="font-arcade text-xs sm:text-sm text-white pixel-text-shadow">
                CROWD TUG-OF-WAR
              </div>
              <div className="font-ui text-[11px] text-yellow-300 font-bold hidden xs:block">
                PHYSICS EDITION
              </div>
            </div>
          </div>

          {/* Action Buttons & Room Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Create Room Button */}
            <button
              type="button"
              onClick={handleCreateRoom}
              title="สร้างห้องแข่งขันใหม่ (Create New Room)"
              className="px-2 py-1 text-xs font-ui font-extrabold pixel-btn pixel-btn-gold text-black cursor-pointer flex items-center gap-1"
            >
              <span>➕</span>
              <span className="hidden xs:inline">สร้างห้อง</span>
            </button>

            {/* Join Room Button */}
            <button
              type="button"
              onClick={() => setShowJoinRoomModal(true)}
              title="กดเข้าห้องด้วยรหัส 6 ตัว (Join Room)"
              className="px-2 py-1 text-xs font-ui font-extrabold pixel-btn pixel-btn-blue text-white cursor-pointer flex items-center gap-1"
            >
              <span>🔑</span>
              <span className="hidden xs:inline">เข้าห้อง</span>
            </button>

            {/* Room Code Badge (Clickable to copy link) */}
            {roomId && (
              <button
                type="button"
                onClick={handleCopyRoomLink}
                className="flex items-center gap-1 px-2 py-1 bg-[#0a0d18] border-2 border-yellow-400 text-xs font-arcade text-yellow-300 shadow-sm cursor-pointer hover:bg-yellow-950/40"
                title="คลิกเพื่อคัดลอกลิงก์ห้องแข่งขัน"
              >
                <span>🔑</span>
                <span>{roomId}</span>
              </button>
            )}

            {/* Player Badge & Audio/Visual Toggles */}
            {myPlayer && (
              isEditingName ? (
                <form onSubmit={handleSaveEditName} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    maxLength={14}
                    autoFocus
                    placeholder="ชื่อใหม่..."
                    className="px-2 py-0.5 bg-[#090c14] border-2 border-yellow-400 text-white font-ui font-extrabold text-xs outline-hidden w-20 sm:w-28 shadow-inner"
                  />
                  <button
                    type="submit"
                    title="บันทึกชื่อ"
                    className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-ui font-extrabold text-xs pixel-btn cursor-pointer"
                  >
                    💾
                  </button>
                </form>
              ) : (
                <div className="hidden md:flex items-center gap-1 px-2 py-0.5 bg-[#171c2f] border border-gray-600 text-xs font-ui font-extrabold text-white">
                  <span>⭐</span>
                  <span className="truncate max-w-[80px] sm:max-w-[110px]">{myPlayer.name}</span>
                  {myPlayer.team && (
                    <span className={`px-1 text-[9px] uppercase font-arcade ${myPlayer.team === 'red' ? 'bg-red-700 text-white' : 'bg-blue-700 text-white'}`}>
                      {myPlayer.team}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleStartEditName}
                    title="แก้ไขชื่อ"
                    className="ml-1 text-yellow-400 hover:text-yellow-300 transition-transform cursor-pointer p-0.5"
                  >
                    ✏️
                  </button>
                </div>
              )
            )}

            {/* SFX Mute Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              title="Toggle Sound Effects"
              className={`px-2 py-1 text-xs font-ui font-extrabold pixel-btn cursor-pointer ${isMuted ? 'opacity-60' : 'pixel-btn-green text-white'}`}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            {/* BGM Toggle */}
            <button
              type="button"
              onClick={handleToggleBGM}
              title="Toggle Music"
              className={`px-2 py-1 text-xs font-ui font-extrabold pixel-btn cursor-pointer ${bgmActive ? 'pixel-btn-gold text-black' : ''}`}
            >
              🎵
            </button>

            {/* Leave Game Button */}
            {hasJoined && (
              <button
                type="button"
                onClick={handleLeaveGame}
                title="ออกจากห้อง (Leave Room)"
                className="px-2 py-1 text-xs font-ui font-extrabold pixel-btn pixel-btn-red text-white cursor-pointer"
              >
                🚪
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 max-w-6xl w-full mx-auto p-1 sm:p-2.5 flex flex-col ${gameState.status === 'ROUND_ACTIVE' ? 'justify-between overflow-hidden' : 'justify-center'}`}>
        {/* FIRST-TIME / WELCOME GATEWAY (If no room chosen yet) */}
        {!roomId && !hasJoined && (
          <WelcomeScreen
            onCreateRoom={handleCreateRoom}
            onOpenJoinModal={() => setShowJoinRoomModal(true)}
          />
        )}

        {/* LOBBY STATE */}
        {roomId && gameState.status === 'LOBBY' && (
          <LobbyScreen
            roomId={roomId}
            players={gameState.players}
            isHost={isHost}
            roundDuration={gameState.roundDuration}
            currentSocketId={currentSocketId}
            localIp={gameState.localIp}
            myPlayer={myPlayer}
            onLeaveGame={handleLeaveGame}
            onSwitchRoom={handleSwitchRoom}
            onCreateRoom={handleCreateRoom}
          />
        )}

        {/* ROUND STARTING (3...2...1 Countdown Overlay) */}
        {roomId && gameState.status === 'ROUND_STARTING' && (
          <>
            <Scoreboard
              roundNumber={gameState.roundNumber}
              survivorCount={activeSurvivors.length}
              teamRedScore={0}
              teamBlueScore={0}
              teamRedPulls={0}
              teamBluePulls={0}
              teamRedCount={gameState.players.filter((p) => p.team === 'red').length}
              teamBlueCount={gameState.players.filter((p) => p.team === 'blue').length}
              ropePos={0}
              status="ROUND_STARTING"
            />
            <TugCanvas
              ropePos={0}
              teamRedCount={gameState.players.filter((p) => p.team === 'red').length}
              teamBlueCount={gameState.players.filter((p) => p.team === 'blue').length}
              winnerTeam={null}
              cheerParticles={cheerParticles}
            />
            <RoundStartingModal
              countdownStartTime={gameState.countdownStartTime}
              playerTeam={myPlayer?.team}
            />
          </>
        )}

        {/* ROUND ACTIVE STATE - 3-Column layout on desktop, perfectly fits screen on mobile */}
        {roomId && gameState.status === 'ROUND_ACTIVE' && (
          <div className="w-full flex flex-col lg:flex-row items-stretch justify-center gap-1.5 lg:gap-3 flex-1 overflow-hidden">
            {/* LEFT SIDEBAR: TEAM RED (DESKTOP) */}
            <div className="hidden lg:block w-56 xl:w-64 shrink-0 overflow-y-auto max-h-[82vh]">
              <TeamPanel
                team="red"
                players={gameState.players}
                currentSocketId={currentSocketId}
              />
            </div>

            {/* CENTER ARENA: SCOREBOARD, CANVAS & CONTROLLER */}
            <div className="flex-1 max-w-2xl w-full mx-auto flex flex-col justify-between py-0.5 space-y-1 overflow-hidden">
              {/* 1. Central Scoreboard with dynamic leader highlight */}
              <Scoreboard
                roundNumber={gameState.roundNumber}
                survivorCount={activeSurvivors.length}
                teamRedScore={gameState.teamRedScore}
                teamBlueScore={gameState.teamBlueScore}
                teamRedPulls={gameState.teamRedPulls}
                teamBluePulls={gameState.teamBluePulls}
                teamRedCount={gameState.teamRedCount || gameState.players.filter((p) => p.team === 'red').length}
                teamBlueCount={gameState.teamBlueCount || gameState.players.filter((p) => p.team === 'blue').length}
                ropePos={gameState.ropePos}
                roundStartTime={gameState.roundStartTime}
                roundEndTime={gameState.roundEndTime}
                status="ROUND_ACTIVE"
              />

              {/* 2. Tug Canvas Arena */}
              <TugCanvas
                ropePos={gameState.ropePos}
                teamRedCount={gameState.players.filter((p) => p.team === 'red').length}
                teamBlueCount={gameState.players.filter((p) => p.team === 'blue').length}
                winnerTeam={null}
                cheerParticles={cheerParticles}
              />

              {/* 3. Giant Pull Controller with Spacebar & local button shake */}
              <PullController
                playerStatus={myPlayer?.status || 'spectator'}
                playerTeam={myPlayer?.team}
                roundActive={true}
                myRoundPulls={myPlayer?.roundPulls || 0}
                myTotalPulls={myPlayer?.totalPulls || 0}
              />
            </div>

            {/* RIGHT SIDEBAR: TEAM BLUE (DESKTOP) */}
            <div className="hidden lg:block w-56 xl:w-64 shrink-0 overflow-y-auto max-h-[82vh]">
              <TeamPanel
                team="blue"
                players={gameState.players}
                currentSocketId={currentSocketId}
              />
            </div>
          </div>
        )}

        {/* ROUND ELIMINATION / KNOCKOUT SUMMARY */}
        {roomId && gameState.status === 'ROUND_ELIMINATION' && (
          <RoundSummaryScreen
            roundNumber={gameState.roundNumber}
            winnerTeam={gameState.winnerTeam}
            eliminated={gameState.eliminatedThisRound}
            survivors={gameState.survivorsThisRound}
            currentSocketId={currentSocketId}
            onLeaveGame={handleLeaveGame}
          />
        )}

        {/* CHAMPIONSHIP SHOWDOWN / TROPHY */}
        {roomId && gameState.status === 'CHAMPIONSHIP' && (
          <ChampionScreen
            champion={gameState.champion}
            players={gameState.players}
            isHost={isHost}
            currentSocketId={currentSocketId}
            onRejoinGame={() => {
              socketService.rejoinGame();
              socketService.resetTournament();
            }}
            onCreateRoom={handleCreateRoom}
            onOpenJoinModal={() => setShowJoinRoomModal(true)}
            onLeaveGame={handleLeaveGame}
          />
        )}
      </main>

      {/* Footer bar (Hidden during active round to fit screen without scrolling) */}
      {gameState.status !== 'ROUND_ACTIVE' && (
        <footer className="bg-[#090b14] border-t border-gray-800 py-1.5 px-3 text-center font-ui text-xs text-white shrink-0">
          <span>🎮 CROWD TUG-OF-WAR • REAL-TIME WEBSOCKET • UNLIMITED SPEED • FAIR PLAY</span>
        </footer>
      )}

      {/* Join Room by Code Modal */}
      <JoinRoomModal
        isOpen={showJoinRoomModal}
        onClose={() => setShowJoinRoomModal(false)}
        onJoinRoom={handleSwitchRoom}
      />

      {/* Player Join Name Modal */}
      <JoinModal
        isOpen={showJoinModal && !hasJoined && Boolean(roomId)}
        roomId={roomId}
        onJoined={({ name, avatar }) => {
          setPlayerName(name);
          setPlayerAvatar(avatar);
          setHasJoined(true);
        }}
      />
    </div>
  );
}
