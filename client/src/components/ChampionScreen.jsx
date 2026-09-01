import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { socketService } from '../services/socket';
import { soundService } from '../services/sound';

const AVATARS_ICON = ['🥊', '⚔️', '🥷', '🧙‍♂️', '🤖', '🏴‍☠️'];

export default function ChampionScreen({
  champion = null,
  players = [],
  isHost = false,
  currentSocketId = null
}) {
  useEffect(() => {
    soundService.playVictory();

    // 8-bit confetti explosion
    const count = 200;
    const defaults = {
      origin: { y: 0.7 }
    };

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

  // Find Tournament MVP (player with highest total pulls)
  const mvp = [...players].sort((a, b) => (b.totalPulls || 0) - (a.totalPulls || 0))[0];

  return (
    <div className="w-full max-w-2xl mx-auto p-6 sm:p-8 bg-[#141828] border-4 border-yellow-400 pixel-card text-center select-none space-y-6">
      {/* 8-bit Trophy Icon */}
      <div className="text-6xl sm:text-7xl animate-bounce">
        👑
      </div>

      <div>
        <div className="inline-block px-4 py-1.5 bg-yellow-400 text-black font-pixel text-xs font-bold uppercase mb-2 pixel-border">
          TOURNAMENT COMPLETE
        </div>
        <h1 className="text-3xl sm:text-5xl font-pixel text-yellow-300 pixel-text-shadow text-glow-gold">
          ULTIMATE CHAMPION!
        </h1>
      </div>

      {/* Champion Highlight Box */}
      <div className="p-6 bg-[#211a0c] border-4 border-yellow-500 pixel-card-gold text-center space-y-3">
        <div className="text-5xl">
          {AVATARS_ICON[champion?.avatar] || '🥊'}
        </div>
        <div className="font-pixel text-xl sm:text-2xl text-yellow-300">
          {champion?.name || 'CHAMPION'}
        </div>
        {isMeChampion && (
          <div className="inline-block px-3 py-1 bg-emerald-500 text-black font-pixel text-xs font-bold animate-pulse">
            ⭐ YOU ARE THE CHAMPION! ⭐
          </div>
        )}
        <div className="font-retro text-lg text-amber-200">
          SURVIVED ALL ROUNDS & WON THE 1v1 FINAL SHOWDOWN!
        </div>
      </div>

      {/* MVP Puller Stats */}
      {mvp && (
        <div className="p-3 bg-[#0e111d] border-2 border-gray-700 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💪</span>
            <div>
              <div className="font-pixel text-[10px] text-gray-400">TOURNAMENT MVP (MOST PULLS):</div>
              <div className="font-pixel text-xs text-yellow-400">{mvp.name}</div>
            </div>
          </div>
          <div className="font-retro text-xl text-yellow-400 font-bold">
            {mvp.totalPulls || 0} TOTAL PULLS
          </div>
        </div>
      )}

      {/* Rematch Controls */}
      <div className="pt-4 border-t-2 border-gray-700">
        {isHost ? (
          <button
            type="button"
            onClick={() => {
              soundService.playVictory();
              socketService.resetTournament();
            }}
            className="w-full py-4 pixel-btn pixel-btn-gold text-black text-sm font-pixel font-bold cursor-pointer tracking-wider"
          >
            🔄 RETURN TO LOBBY / NEW TOURNAMENT
          </button>
        ) : (
          <div className="p-3 bg-gray-900 font-pixel text-xs text-yellow-400">
            WAITING FOR HOST TO START NEW TOURNAMENT...
          </div>
        )}
      </div>
    </div>
  );
}
