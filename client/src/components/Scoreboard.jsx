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
  teamRedCount = 1,
  teamBlueCount = 1,
  ropePos = 0,
  roundStartTime: _roundStartTime = 0,
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
  let roundBadge = `รอบที่ ${roundNumber}`;
  if (survivorCount === 2) {
    roundBadge = '🔥 FINAL 1v1';
  } else if (survivorCount === 4) {
    roundBadge = '⚔️ SEMIFINALS';
  } else if (survivorCount <= 8) {
    roundBadge = `🏆 TOP 8 (${survivorCount} คน)`;
  } else {
    roundBadge = `ROUND ${roundNumber} (${survivorCount} คน)`;
  }

  // Calculate rope percentage for the meter (-100 to +100 mapped to 0% to 100%)
  const ropePercent = Math.min(100, Math.max(0, ((ropePos + 100) / 200) * 100));

  // Determine which team is leading by weighted average score
  const redScoreNum = Number(teamRedScore) || 0;
  const blueScoreNum = Number(teamBlueScore) || 0;
  const scoreDiff = Math.abs(redScoreNum - blueScoreNum).toFixed(1);
  const isRedLeading = redScoreNum > blueScoreNum;
  const isBlueLeading = blueScoreNum > redScoreNum;
  const isTied = redScoreNum === blueScoreNum;

  return (
    <div className="w-full bg-[#0e1220] border-2 sm:border-3 border-[#475569] pixel-card p-1.5 sm:p-2.5 shadow-md select-none shrink-0">
      {/* Top Compact Bar: Round Badge, Timer & Leader Status */}
      <div className="flex items-center justify-between gap-1.5 border-b border-gray-800 pb-1 mb-1">
        <div className="px-2 py-0.5 bg-amber-400 text-black font-ui text-[11px] sm:text-xs font-extrabold tracking-wider pixel-border">
          {roundBadge}
        </div>

        {/* Leading Team Highlight */}
        <div className="text-[11px] sm:text-xs font-ui font-extrabold truncate text-center">
          {isRedLeading && (
            <span className="text-red-400 animate-pulse">🔴 RED นำ +{scoreDiff} แต้ม</span>
          )}
          {isBlueLeading && (
            <span className="text-blue-400 animate-pulse">🔵 BLUE นำ +{scoreDiff} แต้ม</span>
          )}
          {isTied && (
            <span className="text-yellow-300">⚖️ แต้มเฉลี่ยสูสี!</span>
          )}
        </div>

        {/* Center Countdown Timer */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400 font-ui hidden xs:inline">เวลา:</span>
          <span
            className={`font-arcade text-xs sm:text-sm px-2 py-0.5 bg-[#121629] border border-gray-700 ${
              timeLeft <= 5 && timeLeft > 0
                ? 'text-red-500 animate-pulse font-extrabold'
                : 'text-yellow-300'
            }`}
          >
            {status === 'ROUND_STARTING' ? 'READY' : `${timeLeft}s`}
          </span>
        </div>
      </div>

      {/* Unified Score Row: RED Score | Tug Center | BLUE Score */}
      <div className="flex items-center justify-between gap-2 px-1 py-0.5">
        {/* RED SCORE */}
        <div className="text-left flex-1 min-w-0">
          <div className="font-ui text-[11px] sm:text-xs text-red-400 font-extrabold truncate">
            🔴 RED ({teamRedCount || 1}คน)
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`font-arcade text-lg sm:text-2xl ${isRedLeading ? 'text-white text-glow-red font-extrabold' : 'text-gray-300'}`}>
              {redScoreNum.toFixed(1)}
            </span>
            <span className="font-ui text-[9px] sm:text-[10px] text-gray-400">
              แต้มเฉลี่ย
            </span>
          </div>
        </div>

        {/* CENTER TUG OF WAR METER */}
        <div className="flex-[1.5] max-w-[200px] sm:max-w-[240px] px-1">
          <div className="flex justify-between font-arcade text-[9px] text-gray-400 mb-0.5">
            <span className="text-red-400">RED</span>
            <span className="text-blue-400">BLUE</span>
          </div>
          <div className="relative w-full h-3 sm:h-3.5 bg-gray-900 border border-gray-600 overflow-hidden">
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white z-10 opacity-70"></div>
            <div
              className="absolute top-0 bottom-0 w-2.5 sm:w-3 bg-yellow-400 border border-black transition-all duration-100 ease-out z-20 shadow-[0_0_8px_rgba(250,204,21,0.8)]"
              style={{
                left: `${ropePercent}%`,
                transform: 'translateX(-50%)'
              }}
            ></div>
          </div>
        </div>

        {/* BLUE SCORE */}
        <div className="text-right flex-1 min-w-0">
          <div className="font-ui text-[11px] sm:text-xs text-blue-400 font-extrabold truncate">
            BLUE ({teamBlueCount || 1}คน) 🔵
          </div>
          <div className="flex items-baseline justify-end gap-1">
            <span className="font-ui text-[9px] sm:text-[10px] text-gray-400">
              แต้มเฉลี่ย
            </span>
            <span className={`font-arcade text-lg sm:text-2xl ${isBlueLeading ? 'text-white text-glow-blue font-extrabold' : 'text-gray-300'}`}>
              {blueScoreNum.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
