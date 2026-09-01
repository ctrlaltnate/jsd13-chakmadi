import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { socketService } from '../services/socket';
import { soundService } from '../services/sound';

const AVATARS_ICON = ['🥊', '⚔️', '🥷', '🧙‍♂️', '🤖', '🏴‍☠️'];

export default function LobbyScreen({
  players = [],
  isHost = false,
  roundDuration = 25,
  currentSocketId = null,
  localIp = 'localhost'
}) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  // Construct join URL
  const origin = window.location.origin;
  // If host is running on localhost, suggest network IP if available
  const networkOrigin = localIp && localIp !== 'localhost' && window.location.hostname === 'localhost'
    ? `${window.location.protocol}//${localIp}:${window.location.port}`
    : origin;

  useEffect(() => {
    QRCode.toDataURL(networkOrigin, {
      width: 260,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#fde047'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR Error:', err));
  }, [networkOrigin]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(networkOrigin);
    setCopied(true);
    soundService.playCheer();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartTournament = () => {
    if (players.length < 2) {
      soundService.playWarning();
      alert('NEED AT LEAST 2 PLAYERS! ADD SOME TEST BOTS OR INVITE FRIENDS!');
      return;
    }
    soundService.playVictory();
    socketService.startTournament();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 select-none">
      {/* Lobby Hero Header */}
      <div className="pixel-card p-4 sm:p-6 text-center bg-[#131726]">
        <div className="inline-block px-3 py-1 bg-amber-400 text-black font-pixel text-[10px] sm:text-xs font-bold uppercase mb-3 pixel-border">
          MULTIPLAYER TOURNAMENT LOBBY
        </div>
        <h1 className="text-2xl sm:text-4xl font-pixel text-yellow-400 mb-2 pixel-text-shadow leading-tight">
          CROWD TUG-OF-WAR
        </h1>
        <p className="font-retro text-lg sm:text-xl text-gray-300">
          PHYSICS EDITION • 50+ PLAYER ELIMINATION BRACKET
        </p>

        {/* Shareable Link & QR Code Quick Action */}
        <div className="mt-5 p-3 bg-[#0a0d16] border-2 border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div className="text-left flex-1 min-w-[200px]">
            <span className="font-retro text-sm text-gray-400 block">SHAREABLE INVITE LINK:</span>
            <code className="text-xs font-mono text-emerald-400 truncate block">
              {networkOrigin}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 text-xs font-pixel pixel-btn pixel-btn-green cursor-pointer"
            >
              {copied ? 'COPIED! ✅' : 'COPY LINK'}
            </button>
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="px-3 py-2 text-xs font-pixel pixel-btn pixel-btn-gold cursor-pointer"
            >
              📱 SHOW QR
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="pixel-card p-6 bg-[#161a29] text-center max-w-sm w-full">
            <h3 className="font-pixel text-sm text-yellow-400 mb-3">
              SCAN TO JOIN ON PHONE
            </h3>
            {qrDataUrl ? (
              <div className="inline-block p-3 bg-yellow-400 border-4 border-black">
                <img src={qrDataUrl} alt="Join Game QR" className="w-56 h-56 mx-auto image-pixelated" />
              </div>
            ) : (
              <div className="w-56 h-56 bg-gray-800 flex items-center justify-center font-retro text-gray-400">
                GENERATING...
              </div>
            )}
            <p className="font-retro text-base text-gray-300 mt-3 truncate">
              {networkOrigin}
            </p>
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="mt-4 w-full py-2 pixel-btn text-xs font-pixel cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Host Controls Section */}
      <div className="pixel-card p-4 bg-[#181d2f]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-gray-700 pb-3 mb-4">
          <div>
            <h3 className="font-pixel text-xs sm:text-sm text-yellow-400">
              {isHost ? '👑 HOST CONTROLS' : '👥 TOURNAMENT SETTINGS'}
            </h3>
            <p className="font-retro text-sm text-gray-400">
              {isHost
                ? 'CONFIGURE ROUND & SIMULATE PLAYERS'
                : 'WAITING FOR HOST TO START THE MATCH...'}
            </p>
          </div>

          {/* Claim Host if unassigned */}
          {!isHost && (
            <button
              type="button"
              onClick={() => socketService.claimHost()}
              className="px-2 py-1 text-[10px] font-pixel pixel-btn cursor-pointer"
            >
              CLAIM HOST
            </button>
          )}
        </div>

        {/* Round Duration Selector */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="font-pixel text-xs text-gray-300">ROUND TIMER:</span>
          {[15, 25, 40].map((sec) => (
            <button
              key={sec}
              type="button"
              disabled={!isHost}
              onClick={() => {
                soundService.playPull();
                socketService.setRoundDuration(sec);
              }}
              className={`px-3 py-1.5 text-xs font-pixel pixel-btn ${
                roundDuration === sec ? 'pixel-btn-gold text-black' : ''
              } ${!isHost ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {sec}s
            </button>
          ))}
        </div>

        {/* Test Bots Tool (to test 50+ players solo!) */}
        {isHost && (
          <div className="p-3 bg-[#0d101c] border-2 border-dashed border-gray-700 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-pixel text-[10px] text-amber-400">
                🤖 QUICK TEST BOTS (SIMULATE CROWD):
              </span>
              <button
                type="button"
                onClick={() => {
                  soundService.playPull();
                  socketService.clearBots();
                }}
                className="text-[9px] font-pixel text-red-400 hover:underline cursor-pointer"
              >
                CLEAR ALL BOTS
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  soundService.playPull();
                  socketService.addBots(5);
                }}
                className="px-2.5 py-1 text-[10px] font-pixel pixel-btn cursor-pointer"
              >
                +5 BOTS
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playPull();
                  socketService.addBots(10);
                }}
                className="px-2.5 py-1 text-[10px] font-pixel pixel-btn cursor-pointer"
              >
                +10 BOTS
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playPull();
                  socketService.addBots(20);
                }}
                className="px-2.5 py-1 text-[10px] font-pixel pixel-btn cursor-pointer"
              >
                +20 BOTS
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playPull();
                  socketService.addBots(40);
                }}
                className="px-2.5 py-1 text-[10px] font-pixel pixel-btn pixel-btn-gold text-black cursor-pointer"
              >
                FILL 40+ CROWD!
              </button>
            </div>
          </div>
        )}

        {/* Big Start Tournament Button */}
        {isHost ? (
          <button
            type="button"
            onClick={handleStartTournament}
            className="w-full py-4 pixel-btn pixel-btn-gold text-black text-sm sm:text-base font-pixel tracking-widest cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.5)]"
          >
            START TOURNAMENT ({players.length} PLAYERS) ▶
          </button>
        ) : (
          <div className="p-3 text-center bg-gray-900 font-pixel text-xs text-yellow-400 animate-pulse">
            WAITING FOR HOST TO START TOURNAMENT...
          </div>
        )}
      </div>

      {/* Real-time Connected Players Grid */}
      <div className="pixel-card p-4 bg-[#141828]">
        <div className="flex items-center justify-between border-b-2 border-gray-700 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xs text-yellow-400">
              CONNECTED PLAYERS
            </span>
            <span className="px-2 py-0.5 bg-yellow-500 text-black text-[10px] font-pixel font-bold">
              {players.length}
            </span>
          </div>
          <span className="font-retro text-base text-gray-400">
            CAPACITY: 64 FIGHTERS
          </span>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
          {players.map((p) => {
            const isMe = p.id === currentSocketId;
            return (
              <div
                key={p.id}
                className={`p-2 border-2 flex items-center gap-2 text-left truncate ${
                  isMe
                    ? 'border-yellow-400 bg-yellow-950/60 shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                    : 'border-gray-700 bg-gray-800/40'
                }`}
              >
                <span className="text-xl shrink-0">
                  {AVATARS_ICON[p.avatar] || '🥊'}
                </span>
                <div className="truncate">
                  <div
                    className={`font-pixel text-[10px] truncate ${
                      isMe ? 'text-yellow-300 font-bold' : 'text-gray-200'
                    }`}
                  >
                    {p.name}
                  </div>
                  <div className="font-retro text-xs text-gray-400">
                    {isMe ? '⭐ YOU' : p.isBot ? '🤖 BOT' : 'FIGHTER'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
