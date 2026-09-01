import React, { useState, useEffect } from 'react';
import { socketService } from '../services/socket';
import { soundService } from '../services/sound';

export default function Scoreboard({
  roundNumber = 1,
  survivorCount = 2,
  teamRedScore = 0,
  teamBlueScore = 0,
  teamRedPulls = 0,
  teamBluePulls = 0,
  ropePos = 0,
  roundStartTime = 0,
  roundEndTime = 0,
  status = 'ROUND_ACTIVE'
}) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (status !== 'ROUND_ACTIVE' || !roundEndTime) {
      return;
    }

    let lastSec = -1;
    const interval = setInterval(() => {
      const now = socketService.getSyncedServerTime();
      const remainingMs = Math.max(0, roundEndTime - now);
      const remainingSec = Math.ceil(remainingMs / 1000);
      setTimeLeft(remainingSec);

      // Play beeps for final 5 seconds
      if (remainingSec <= 5 && remainingSec > 0 && remainingSec !== lastSec) {
        soundService.playBeep(remainingSec === 1);
        lastSec = remainingSec;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [status, roundEndTime]);

  // Format round title
  let roundBadge = `ROUND ${roundNumber}`;
  if (survivorCount === 2) {
    roundBadge = '🔥 FINAL 1v1 SHOWDOWN 🔥';
  } else if (survivorCount === 4) {
    roundBadge = '⚔️ SEMIFINALS (4 SURVIVORS)';
  } else if (survivorCount <= 8) {
    roundBadge = `🏆 QUARTERFINALS (${survivorCount} SURVIVORS)`;
  } else {
    roundBadge = `ROUND ${roundNumber} • ${survivorCount} PLAYERS`;
  }

  // Calculate rope percentage for the meter (-100 to +100 mapped to 0% to 100%)
  const ropePercent = Math.min(100, Math.max(0, ((ropePos + 100) / 200) * 100));

  return (
    <div className="w-full bg-[#121522] border-4 border-[#3b4261] pixel-card p-3 sm:p-4 mb-4">
      {/* Top Banner: Round Title & Tournament Stage */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-gray-800 pb-2 mb-3">
        <div className="px-3 py-1 bg-amber-500 text-black font-pixel text-[10px] sm:text-xs font-bold tracking-wider pixel-border">
          {roundBadge}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-retro text-base text-gray-400">SERVER CLOCK SYNC:</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
          <span className="font-retro text-emerald-400 text-sm">{socketService.getLatency()}ms</span>
        </div>
      </div>

      {/* Main Score & Timer Grid */}
      <div className="grid grid-cols-3 items-center text-center gap-2">
        {/* TEAM RED */}
        <div className="pixel-card-red p-2 sm:p-3">
          <div className="font-pixel text-[10px] sm:text-xs text-red-300 font-bold mb-1">
            TEAM RED
          </div>
          <div className="font-pixel text-xl sm:text-3xl text-red-400 text-glow-red">
            {teamRedScore}
          </div>
          <div className="font-retro text-sm text-red-300 mt-1">
            {teamRedPulls} PULLS
          </div>
        </div>

        {/* TIMER */}
        <div className="flex flex-col items-center justify-center p-2 bg-[#090b12] border-2 border-gray-700">
          <div className="font-retro text-xs sm:text-sm text-gray-400 tracking-wider">
            TIME LEFT
          </div>
          <div
            className={`font-pixel text-2xl sm:text-4xl my-1 transition-colors ${
              timeLeft <= 5 && timeLeft > 0
                ? 'text-red-500 animate-pulse text-glow-red'
                : 'text-yellow-400'
            }`}
          >
            {status === 'ROUND_STARTING' ? 'READY' : `${timeLeft}s`}
          </div>
          <div className="font-retro text-xs text-amber-400">
            {status === 'ROUND_ACTIVE' ? 'TAP FAST!' : 'STANDBY'}
          </div>
        </div>

        {/* TEAM BLUE */}
        <div className="pixel-card-blue p-2 sm:p-3">
          <div className="font-pixel text-[10px] sm:text-xs text-blue-300 font-bold mb-1">
            TEAM BLUE
          </div>
          <div className="font-pixel text-xl sm:text-3xl text-blue-400 text-glow-blue">
            {teamBlueScore}
          </div>
          <div className="font-retro text-sm text-blue-300 mt-1">
            {teamBluePulls} PULLS
          </div>
        </div>
      </div>

      {/* Momentum / Tug Meter */}
      <div className="mt-3">
        <div className="flex justify-between text-[9px] sm:text-[10px] font-pixel text-gray-400 mb-1">
          <span className="text-red-400">RED ADVANTAGE</span>
          <span className="text-yellow-400">CENTER TENSION</span>
          <span className="text-blue-400">BLUE ADVANTAGE</span>
        </div>
        <div className="relative w-full h-4 bg-gray-900 border-2 border-gray-700 overflow-hidden">
          {/* Center line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-yellow-400 z-10 -translate-x-1/2"></div>
          
          {/* Dynamic Tug Fill */}
          <div
            className="h-full transition-all duration-75"
            style={{
              width: `${ropePercent}%`,
              background: ropePercent < 50 
                ? 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)' 
                : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
