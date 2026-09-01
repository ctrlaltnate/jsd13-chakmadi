import React, { useState, useEffect } from 'react';
import { socketService } from './services/socket';
import { soundService } from './services/sound';
import JoinModal from './components/JoinModal';
import LobbyScreen from './components/LobbyScreen';
import Scoreboard from './components/Scoreboard';
import TugCanvas from './components/TugCanvas';
import TeamRosters, { TeamPanel } from './components/TeamRosters';
import PullController from './components/PullController';
import RoundStartingModal from './components/RoundStartingModal';
import RoundSummaryScreen from './components/RoundSummaryScreen';
import ChampionScreen from './components/ChampionScreen';

const AVATARS_ICON = ['🥊', '⚔️', '🥷', '🧙‍♂️', '🤖', '🏴‍☠️'];

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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [bgmActive, setBgmActive] = useState(true);
  const [scanlines, setScanlines] = useState(false);
  const [cheerParticles, setCheerParticles] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [dismissChampion, setDismissChampion] = useState(false);

  // Copy Game Invite Link
  const handleCopyInviteLink = () => {
    const shareUrl = window.location.origin;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl);
      }
    } catch (e) {}
    setCopiedLink(true);
    soundService.playCheer();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Reset dismissChampion whenever gameState status changes away from CHAMPIONSHIP
  useEffect(() => {
    if (gameState.status !== 'CHAMPIONSHIP') {
      setDismissChampion(false);
    }
  }, [gameState.status]);

  // Socket event listeners
  useEffect(() => {
    const socket = socketService.socket;

    socket.on('connect', () => {
      setCurrentSocketId(socket.id);
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

    socket.on('join_confirmed', ({ player, isHost, hostToken }) => {
      if (player) {
        setPlayerName(player.name);
        setPlayerAvatar(player.avatar);
        setHasJoined(true);
        setShowJoinModal(false);
        if (isHost && hostToken) {
          localStorage.setItem('tug_host_token', hostToken);
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
  }, []);

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
      setShowJoinModal(true);
    }
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
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl animate-pulse">🥊</span>
            <div>
              <div className="font-arcade text-xs sm:text-sm text-white pixel-text-shadow">
                CROWD TUG-OF-WAR
              </div>
              <div className="font-ui text-[11px] text-yellow-300 font-bold hidden xs:block">
                UNIFIED ARENA
              </div>
            </div>
          </div>

          {/* Action Buttons & Player Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Share Link Button */}
            <button
              type="button"
              onClick={handleCopyInviteLink}
              title="คัดลอกลิงก์เกมให้เพื่อนเข้าเล่น"
              className="px-2.5 py-1 text-xs font-ui font-extrabold pixel-btn pixel-btn-gold text-black cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <span>{copiedLink ? '✅' : '📋'}</span>
              <span className="hidden xs:inline">{copiedLink ? 'คัดลอกแล้ว!' : 'แชร์ลิงก์เกม'}</span>
            </button>

            {/* Player Profile Badge with Avatar and Pencil Edit Button */}
            {myPlayer && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#171c2f] border border-gray-600 text-xs font-ui font-extrabold text-white">
                <span className="text-sm">{AVATARS_ICON[myPlayer.avatar] || '🥊'}</span>
                <span className="truncate max-w-[80px] sm:max-w-[110px]">{myPlayer.name}</span>
                {myPlayer.team && (
                  <span className={`px-1 text-[9px] uppercase font-arcade ${myPlayer.team === 'red' ? 'bg-red-700 text-white' : 'bg-blue-700 text-white'}`}>
                    {myPlayer.team}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  title="แก้ไขชื่อและเปลี่ยนอวาตาร์ตัวละคร"
                  className="ml-1 text-yellow-400 hover:text-yellow-300 transition-transform cursor-pointer p-0.5 hover:scale-120"
                >
                  ✏️
                </button>
              </div>
            )}

            {/* CRT Toggle */}
            <button
              type="button"
              onClick={() => setScanlines(!scanlines)}
              title="Toggle CRT Scanlines"
              className={`px-2 py-1 text-xs font-ui font-extrabold pixel-btn cursor-pointer ${scanlines ? 'pixel-btn-gold text-black' : ''}`}
            >
              CRT
            </button>

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
                title="ออกจากเกม (Leave Game)"
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
        {/* LOBBY STATE (or when ChampionScreen was dismissed by non-host) */}
        {(gameState.status === 'LOBBY' || (gameState.status === 'CHAMPIONSHIP' && dismissChampion)) && (
          <LobbyScreen
            players={gameState.players}
            isHost={isHost}
            roundDuration={gameState.roundDuration}
            currentSocketId={currentSocketId}
            localIp={gameState.localIp}
            myPlayer={myPlayer}
            onLeaveGame={handleLeaveGame}
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
        {gameState.status === 'ROUND_ACTIVE' && (
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
        {gameState.status === 'ROUND_ELIMINATION' && (
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
        {gameState.status === 'CHAMPIONSHIP' && !dismissChampion && (
          <ChampionScreen
            champion={gameState.champion}
            players={gameState.players}
            isHost={isHost}
            currentSocketId={currentSocketId}
            onRejoinGame={() => {
              socketService.rejoinGame();
            }}
            onReturnToLobby={() => {
              setDismissChampion(true);
            }}
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

      {/* Initial Player Join Modal */}
      <JoinModal
        isOpen={showJoinModal && !hasJoined}
        initialName={playerName}
        initialAvatar={playerAvatar}
        isEditing={false}
        onJoined={({ name, avatar }) => {
          setPlayerName(name);
          setPlayerAvatar(avatar);
          setHasJoined(true);
          setShowJoinModal(false);
        }}
      />

      {/* Edit Profile Modal (Opened via pencil button) */}
      <JoinModal
        isOpen={showProfileModal}
        initialName={myPlayer?.name || playerName}
        initialAvatar={myPlayer?.avatar ?? playerAvatar}
        isEditing={true}
        onClose={() => setShowProfileModal(false)}
        onJoined={({ name, avatar }) => {
          setPlayerName(name);
          setPlayerAvatar(avatar);
          setShowProfileModal(false);
        }}
      />
    </div>
  );
}
