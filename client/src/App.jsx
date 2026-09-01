import React, { useState, useEffect, useRef } from 'react';
import { socketService } from './services/socket';
import { soundService } from './services/sound';
import JoinModal from './components/JoinModal';
import LobbyScreen from './components/LobbyScreen';
import Scoreboard from './components/Scoreboard';
import TugCanvas from './components/TugCanvas';
import TeamRosters from './components/TeamRosters';
import PullController from './components/PullController';
import RoundStartingModal from './components/RoundStartingModal';
import RoundSummaryScreen from './components/RoundSummaryScreen';
import ChampionScreen from './components/ChampionScreen';

export default function App() {
  const [gameState, setGameState] = useState({
    status: 'LOBBY',
    roundNumber: 1,
    roundDuration: 25,
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
    eliminatedThisRound: [],
    survivorsThisRound: [],
    winnerTeam: null,
    champion: null,
    localIp: 'localhost'
  });

  const [currentSocketId, setCurrentSocketId] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [bgmActive, setBgmActive] = useState(false);
  const [scanlines, setScanlines] = useState(true);
  const [screenShake, setScreenShake] = useState(false);
  const [cheerParticles, setCheerParticles] = useState([]);

  // Socket event listeners
  useEffect(() => {
    const socket = socketService.socket;

    socket.on('connect', () => {
      setCurrentSocketId(socket.id);
      // Check saved session
      const savedName = localStorage.getItem('tug_player_name');
      const savedAvatar = parseInt(localStorage.getItem('tug_player_avatar') || '0', 10);
      if (savedName) {
        setPlayerName(savedName);
        setPlayerAvatar(savedAvatar);
        socketService.joinGame(savedName, savedAvatar);
        setHasJoined(true);
      } else {
        setShowJoinModal(true);
      }
    });

    socket.on('game_state', (state) => {
      setGameState(state);
    });

    socket.on('physics_tick', (tick) => {
      setGameState((prev) => ({
        ...prev,
        ropePos: tick.ropePos,
        teamRedScore: tick.teamRedScore,
        teamBlueScore: tick.teamBlueScore,
        teamRedPulls: tick.teamRedPulls,
        teamBluePulls: tick.teamBluePulls
      }));
    });

    socket.on('join_confirmed', ({ player }) => {
      if (player) {
        setPlayerName(player.name);
        setPlayerAvatar(player.avatar);
        setHasJoined(true);
        setShowJoinModal(false);
      }
    });

    socket.on('cheer_event', ({ team, emote, from }) => {
      // Spawn floating cheer particle on the canvas
      const particleId = Date.now() + Math.random();
      const x = team === 'red' ? 120 + Math.random() * 100 : 580 + Math.random() * 100;
      const y = 140 + Math.random() * 60;
      setCheerParticles((prev) => [...prev.slice(-12), { id: particleId, x, y, emote, from }]);
      setTimeout(() => {
        setCheerParticles((prev) => prev.filter((p) => p.id !== particleId));
      }, 2000);
    });

    return () => {
      socket.off('connect');
      socket.off('game_state');
      socket.off('physics_tick');
      socket.off('join_confirmed');
      socket.off('cheer_event');
    };
  }, []);

  // Screen shake trigger
  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 260);
  };

  // Sound toggles
  const handleToggleMute = () => {
    const muted = soundService.toggleMute();
    setIsMuted(muted);
    if (muted) setBgmActive(false);
  };

  const handleToggleBGM = () => {
    if (bgmActive) {
      soundService.stopBGM();
      setBgmActive(false);
    } else {
      soundService.startBGM();
      setBgmActive(true);
    }
  };

  // Find current player info
  const myPlayer = gameState.players.find((p) => p.id === currentSocketId);
  const isHost = gameState.hostSocketId === currentSocketId;
  const activeSurvivors = gameState.players.filter((p) => p.status === 'active');

  return (
    <div className={`relative min-h-screen bg-[#090b13] text-gray-100 flex flex-col justify-between ${screenShake ? 'shake' : ''}`}>
      {/* CRT Scanline Overlay */}
      {scanlines && <div className="fixed inset-0 scanlines pointer-events-none z-50"></div>}

      {/* Top Retro Marquee Bar */}
      <header className="sticky top-0 z-40 bg-[#121626]/95 backdrop-blur-xs border-b-4 border-[#3b4261] px-3 py-2 select-none shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          {/* Title & Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl animate-pulse">🥊</span>
            <div>
              <div className="font-pixel text-[11px] sm:text-xs text-yellow-400 tracking-wider">
                CROWD TUG-OF-WAR
              </div>
              <div className="font-retro text-xs text-gray-400">
                PHYSICS EDITION
              </div>
            </div>
          </div>

          {/* Player Badge & Audio/Visual Toggles */}
          <div className="flex items-center gap-2">
            {myPlayer && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-gray-900 border border-gray-700 text-xs font-pixel text-yellow-300">
                <span>⭐</span>
                <span className="truncate max-w-[100px]">{myPlayer.name}</span>
                {myPlayer.team && (
                  <span className={`px-1 py-0.5 text-[8px] uppercase ${myPlayer.team === 'red' ? 'bg-red-800 text-red-100' : 'bg-blue-800 text-blue-100'}`}>
                    {myPlayer.team}
                  </span>
                )}
              </div>
            )}

            {/* CRT Toggle */}
            <button
              type="button"
              onClick={() => setScanlines(!scanlines)}
              title="Toggle CRT Scanline Effect"
              className={`px-2 py-1 text-[10px] font-pixel pixel-btn cursor-pointer ${scanlines ? 'pixel-btn-gold text-black' : ''}`}
            >
              CRT
            </button>

            {/* Sound Mute Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              title="Toggle Sound Effects"
              className={`px-2 py-1 text-[10px] font-pixel pixel-btn cursor-pointer ${isMuted ? 'opacity-50' : 'pixel-btn-green'}`}
            >
              {isMuted ? '🔇 MUTE' : '🔊 SFX'}
            </button>

            {/* BGM Toggle */}
            <button
              type="button"
              onClick={handleToggleBGM}
              title="Toggle 8-Bit Chiptune Music"
              className={`px-2 py-1 text-[10px] font-pixel pixel-btn cursor-pointer ${bgmActive ? 'pixel-btn-gold text-black' : ''}`}
            >
              🎵 BGM
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-4 flex flex-col justify-center">
        {/* LOBBY STATE */}
        {gameState.status === 'LOBBY' && (
          <LobbyScreen
            players={gameState.players}
            isHost={isHost}
            roundDuration={gameState.roundDuration}
            currentSocketId={currentSocketId}
            localIp={gameState.localIp}
          />
        )}

        {/* ROUND STARTING (3...2...1 Countdown Overlay) */}
        {gameState.status === 'ROUND_STARTING' && (
          <>
            <Scoreboard
              roundNumber={gameState.roundNumber}
              survivorCount={activeSurvivors.length}
              teamRedScore={0}
              teamBlueScore={0}
              teamRedPulls={0}
              teamBluePulls={0}
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

        {/* ROUND ACTIVE STATE */}
        {gameState.status === 'ROUND_ACTIVE' && (
          <div className="space-y-2">
            <Scoreboard
              roundNumber={gameState.roundNumber}
              survivorCount={activeSurvivors.length}
              teamRedScore={gameState.teamRedScore}
              teamBlueScore={gameState.teamBlueScore}
              teamRedPulls={gameState.teamRedPulls}
              teamBluePulls={gameState.teamBluePulls}
              ropePos={gameState.ropePos}
              roundStartTime={gameState.roundStartTime}
              roundEndTime={gameState.roundEndTime}
              status="ROUND_ACTIVE"
            />

            <TugCanvas
              ropePos={gameState.ropePos}
              teamRedCount={gameState.players.filter((p) => p.team === 'red').length}
              teamBlueCount={gameState.players.filter((p) => p.team === 'blue').length}
              winnerTeam={null}
              cheerParticles={cheerParticles}
            />

            <TeamRosters
              players={gameState.players}
              currentSocketId={currentSocketId}
            />

            <PullController
              playerStatus={myPlayer?.status || 'spectator'}
              playerTeam={myPlayer?.team}
              roundActive={true}
              onTriggerShake={triggerShake}
            />
          </div>
        )}

        {/* ROUND ELIMINATION / KNOCKOUT SUMMARY */}
        {gameState.status === 'ROUND_ELIMINATION' && (
          <RoundSummaryScreen
            roundNumber={gameState.roundNumber}
            winnerTeam={gameState.winnerTeam}
            eliminated={gameState.eliminatedThisRound}
            survivors={gameState.survivorsThisRound}
            currentSocketId={currentSocketId}
          />
        )}

        {/* CHAMPIONSHIP SHOWDOWN / TROPHY */}
        {gameState.status === 'CHAMPIONSHIP' && (
          <ChampionScreen
            champion={gameState.champion}
            players={gameState.players}
            isHost={isHost}
            currentSocketId={currentSocketId}
          />
        )}
      </main>

      {/* Footer info bar */}
      <footer className="bg-[#0b0e18] border-t-2 border-gray-800 py-2 px-4 text-center font-retro text-xs sm:text-sm text-gray-500">
        <span>8-BIT CROWD TUG-OF-WAR • REAL-TIME WEBSOCKET TIME SYNCHRONIZATION • ANTI-AUTOCLICKER PROTECTED</span>
      </footer>

      {/* Player Join Name Modal */}
      <JoinModal
        isOpen={showJoinModal && !hasJoined}
        onJoined={({ name, avatar }) => {
          setPlayerName(name);
          setPlayerAvatar(avatar);
          setHasJoined(true);
          setShowJoinModal(false);
        }}
      />
    </div>
  );
}
