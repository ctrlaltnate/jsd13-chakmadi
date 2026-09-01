import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { socketService } from '../services/socket';
import { soundService } from '../services/sound';
import badgeImg from '../assets/badge.png';

const AVATARS_ICON = ['🥊', '⚔️', '🥷', '🧙‍♂️', '🤖', '🏴‍☠️'];

export default function ChampionScreen({
  champion = null,
  players = [],
  isHost = false,
  currentSocketId = null,
  onRejoinGame = null,
  onReturnToLobby = null,
  onLeaveGame = null
}) {
  const [hasConfirmed, setHasConfirmed] = useState(false);

  useEffect(() => {
    soundService.playVictory();

    const count = 220;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  const isMeChampion = champion && champion.id === currentSocketId;
  const mvp = [...players].sort((a, b) => (b.totalPulls || 0) - (a.totalPulls || 0))[0];

  const handleNonHostRejoin = () => {
    soundService.playVictory();
    socketService.rejoinGame();
    if (onRejoinGame) {
      onRejoinGame();
    }
    setHasConfirmed(true);

    // Auto-transition non-host back to lobby after 1.2s
    setTimeout(() => {
      if (onReturnToLobby) {
        onReturnToLobby();
      }
    }, 1200);
  };

  return (
    <div className="w-full max-w-xl mx-auto p-5 sm:p-7 bg-[#141828] border-4 border-yellow-400 pixel-card text-center select-none space-y-4 shadow-2xl">
      {/* 8-bit Trophy Shield Badge - Preserves original 1.83:1 widescreen aspect ratio */}
      <div className="flex justify-center my-2">
        <img
          src={badgeImg}
          alt="Winner Badge"
          className="w-56 sm:w-72 max-w-full h-auto object-contain image-pixelated animate-bounce filter drop-shadow-[0_0_14px_rgba(250,204,21,0.8)]"
        />
      </div>

      {/* Header Banner */}
      <div>
        <div className="inline-block px-3 py-1 bg-yellow-400 text-black font-arcade text-xs sm:text-sm uppercase pixel-border">
          TOURNAMENT COMPLETE
        </div>
        <h1 className="text-3xl sm:text-4xl font-arcade text-white pixel-text-shadow mt-2 tracking-wide">
          ULTIMATE CHAMPION!
        </h1>
        <p className="font-ui text-sm sm:text-base text-yellow-300 font-bold">
          ผู้ชนะเลิศอันดับ 1 ของการแข่งขันชักเย่อ
        </p>
      </div>

      {/* Champion Highlight Box */}
      <div className="p-4 sm:p-5 bg-[#211a0c] border-4 border-yellow-500 pixel-card-gold text-center space-y-2">
        <div className="text-5xl sm:text-6xl">
          {AVATARS_ICON[champion?.avatar] || '🥊'}
        </div>
        <div className="font-arcade text-xl sm:text-2xl text-white pixel-text-shadow">
          {champion?.name || 'CHAMPION'}
        </div>
        {isMeChampion && (
          <div className="inline-block px-3 py-1 bg-emerald-500 text-white font-ui text-sm font-extrabold animate-pulse">
            ⭐ คุณคือผู้ชนะเลิศอันดับ 1 ของทัวร์นาเมนต์! ⭐
          </div>
        )}
        <div className="font-ui text-sm sm:text-base text-yellow-300 font-bold">
          รอดพ้นทุกการคัดออกและคว้าชัยชนะในรอบ 1v1 Final Showdown!
        </div>
      </div>

      {/* MVP Puller Stats */}
      {mvp && (
        <div className="p-3 bg-[#0a0c16] border-2 border-gray-700 flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">💪</span>
            <div>
              <div className="font-ui text-xs text-gray-300 font-bold">TOURNAMENT MVP (ผู้เล่นที่ดึงมากที่สุด):</div>
              <div className="font-ui text-sm sm:text-base text-white font-extrabold">{mvp.name}</div>
            </div>
          </div>
          <div className="font-ui text-base sm:text-lg text-yellow-300 font-extrabold">
            {mvp.totalPulls || 0} ครั้ง
          </div>
        </div>
      )}

      {/* Rematch & Leave Controls */}
      <div className="pt-2 border-t-2 border-gray-700 space-y-2.5">
        {isHost ? (
          <button
            type="button"
            onClick={() => {
              soundService.playVictory();
              socketService.resetTournament();
            }}
            className="w-full py-3.5 sm:py-4 pixel-btn pixel-btn-gold text-black text-sm sm:text-base font-arcade font-extrabold cursor-pointer tracking-wider shadow-lg"
          >
            🔄 เริ่มการแข่งขันรอบใหม่ (NEW GAME)
          </button>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleNonHostRejoin}
              className={`w-full py-3.5 sm:py-4 pixel-btn text-sm sm:text-base font-arcade font-extrabold cursor-pointer tracking-wider shadow-lg transition-all ${
                hasConfirmed
                  ? 'pixel-btn-green text-white scale-102 shadow-[0_0_15px_rgba(34,197,94,0.5)]'
                  : 'pixel-btn-gold text-black hover:scale-101'
              }`}
            >
              {hasConfirmed
                ? '✅ คุณพร้อมแล้ว! (กำลังพากลับล็อบบี้...)'
                : '🎮 พร้อมเล่นรอบใหม่ (READY FOR NEXT ROUND)'}
            </button>
            <p className="font-ui text-xs text-yellow-300 font-bold">
              {hasConfirmed
                ? 'ยืนยันความพร้อมแล้ว! กำลังพากลับสู่ห้องรวมพลเพื่อรอหัวห้องเริ่มรอบใหม่'
                : 'กดเพื่อยืนยันว่าพร้อมเล่นต่อในรอบถัดไป'}
            </p>

            {onReturnToLobby && (
              <button
                type="button"
                onClick={onReturnToLobby}
                className="w-full py-2.5 pixel-btn bg-[#1a2138] hover:bg-[#253052] text-white text-xs sm:text-sm font-ui font-extrabold cursor-pointer transition-colors"
              >
                🏠 กลับสู่ห้องรวมพลทันที (GO TO LOBBY)
              </button>
            )}
          </div>
        )}

        {onLeaveGame && (
          <button
            type="button"
            onClick={onLeaveGame}
            className="px-4 py-2 pixel-btn pixel-btn-red text-white text-xs font-ui font-extrabold cursor-pointer mt-1"
          >
            🚪 ออกจากเกม (LEAVE GAME)
          </button>
        )}
      </div>
    </div>
  );
}
