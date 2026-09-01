import React, { useEffect } from 'react';
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
  onLeaveGame = null
}) {
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

  return (
    <div className="w-full max-w-xl mx-auto p-5 sm:p-7 bg-[#141828] border-4 border-yellow-400 pixel-card text-center select-none space-y-4 shadow-2xl">
      {/* 8-bit Trophy Shield Badge from Assets */}
      <div className="flex justify-center my-1">
        <img
          src={badgeImg}
          alt="Winner Tug-of-War Trophy Badge"
          className="w-44 sm:w-56 h-auto drop-shadow-[0_0_25px_rgba(234,179,8,0.8)] animate-bounce"
        />
      </div>

      <div>
        <div className="inline-block px-3 py-1 bg-yellow-400 text-black font-ui text-xs font-extrabold uppercase mb-2 pixel-border">
          TOURNAMENT CHAMPION • ผู้ชนะเลิศทัวร์นาเมนต์
        </div>
        <h1 className="text-3xl sm:text-5xl font-arcade text-white pixel-text-shadow text-glow-gold">
          ULTIMATE CHAMPION!
        </h1>
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
      <div className="pt-2 border-t-2 border-gray-700 space-y-2">
        {isHost ? (
          <button
            type="button"
            onClick={() => {
              soundService.playVictory();
              socketService.resetTournament();
            }}
            className="w-full py-3.5 sm:py-4 pixel-btn pixel-btn-gold text-black text-sm sm:text-base font-arcade font-extrabold cursor-pointer tracking-wider"
          >
            🔄 กลับสู่ล็อบบี้ / แข่งรอบใหม่ (NEW TOURNAMENT)
          </button>
        ) : (
          <div className="p-3 bg-gray-900 font-ui text-sm text-yellow-300 font-bold">
            กำลังรอให้โฮสต์เริ่มทัวร์นาเมนต์ใหม่...
          </div>
        )}

        {onLeaveGame && (
          <button
            type="button"
            onClick={onLeaveGame}
            className="px-4 py-2 pixel-btn pixel-btn-red text-white text-xs font-ui font-extrabold cursor-pointer"
          >
            🚪 ออกจากเกม (LEAVE GAME)
          </button>
        )}
      </div>
    </div>
  );
}
