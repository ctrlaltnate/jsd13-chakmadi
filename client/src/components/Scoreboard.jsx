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
  let roundBadge = `รอบที่ ${roundNumber} (ROUND ${roundNumber})`;
  if (survivorCount === 2) {
    roundBadge = '🔥 FINAL 1v1 ชิงชนะเลิศ 🔥';
  } else if (survivorCount === 4) {
    roundBadge = '⚔️ รอบ 4 คนสุดท้าย (SEMIFINALS)';
  } else if (survivorCount <= 8) {
    roundBadge = `🏆 รอบ 8 คนสุดท้าย (${survivorCount} SURVIVORS)`;
  } else {
    roundBadge = `ROUND ${roundNumber} • ${survivorCount} PLAYERS`;
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
    <div className="w-full bg-[#0e1220] border-3 border-[#475569] pixel-card p-2 sm:p-3 mb-2 shadow-lg">
      {/* Top Banner: Round Title & Tournament Stage */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-gray-800 pb-1.5 mb-2">
        <div className="px-2.5 py-0.5 bg-amber-400 text-black font-ui text-xs sm:text-sm font-extrabold tracking-wider pixel-border">
          {roundBadge}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-ui">
          <span className="text-gray-300 hidden sm:inline">SYNC PING:</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
          <span className="text-white font-bold">{socketService.getLatency()}ms</span>
        </div>
      </div>

      {/* Central Scoreboard Banner - คะแนนกลางของฝั่งที่นำ */}
      <div className="flex flex-col items-center justify-center p-2.5 bg-[#060810] border-2 border-gray-700 my-1">
        {/* Leading Team Highlight Banner */}
        <div className="mb-2">
          {isRedLeading && (
            <div className="px-3.5 py-1 bg-red-600/90 border-2 border-red-400 font-ui text-xs sm:text-sm font-extrabold text-white text-glow-red pixel-border animate-pulse inline-flex items-center gap-1.5">
              <span>🔴</span>
              <span>ทีมแดง (RED) กำลังนำอยู่ +{scoreDiff} แต้มเฉลี่ย!</span>
            </div>
          )}
          {isBlueLeading && (
            <div className="px-3.5 py-1 bg-blue-600/90 border-2 border-blue-400 font-ui text-xs sm:text-sm font-extrabold text-white text-glow-blue pixel-border animate-pulse inline-flex items-center gap-1.5">
              <span>🔵</span>
              <span>ทีมน้ำเงิน (BLUE) กำลังนำอยู่ +{scoreDiff} แต้มเฉลี่ย!</span>
            </div>
          )}
          {isTied && (
            <div className="px-3.5 py-1 bg-yellow-600/80 border-2 border-yellow-400 font-ui text-xs sm:text-sm font-extrabold text-white pixel-border inline-flex items-center gap-1.5">
              <span>⚖️</span>
              <span>คะแนนเฉลี่ยเท่ากัน! กำลังสูสี!</span>
            </div>
          )}
        </div>

        {/* Unified Center Score & Timer Display */}
        <div className="w-full flex items-center justify-around gap-2 px-2">
          {/* RED SCORE (WEIGHTED AVERAGE) */}
          <div className="text-center flex-1">
            <div className="font-ui text-xs sm:text-sm text-red-300 font-extrabold uppercase">
              🔴 RED ({teamRedCount || 1} คน)
            </div>
            <div className={`font-arcade text-2xl sm:text-4xl ${isRedLeading ? 'text-white text-glow-red' : 'text-gray-300'}`}>
              {redScoreNum.toFixed(1)}
            </div>
            <div className="font-ui text-[11px] text-yellow-300 font-bold">
              แต้มเฉลี่ยต่อคน
            </div>
            <div className="font-ui text-[10px] text-gray-400">
              (รวม {teamRedPulls} ดึง)
            </div>
          </div>

          {/* CENTER COUNTDOWN TIMER */}
          <div className="px-3 py-1.5 bg-[#121629] border-2 border-gray-700 text-center min-w-[90px] sm:min-w-[110px]">
            <div className="font-ui text-[10px] text-gray-300 uppercase font-bold">
              เวลาคงเหลือ
            </div>
            <div
              className={`font-arcade text-xl sm:text-3xl transition-colors ${
                timeLeft <= 5 && timeLeft > 0
                  ? 'text-red-500 animate-pulse text-glow-red'
                  : 'text-white pixel-text-shadow'
              }`}
            >
              {status === 'ROUND_STARTING' ? 'READY' : `${timeLeft}s`}
            </div>
            <div className="font-ui text-[10px] text-amber-300 font-extrabold">
              {status === 'ROUND_ACTIVE' ? '⚡ ดึงให้ไว!' : 'รอสัญญาณ'}
            </div>
          </div>

          {/* BLUE SCORE (WEIGHTED AVERAGE) */}
          <div className="text-center flex-1">
            <div className="font-ui text-xs sm:text-sm text-blue-300 font-extrabold uppercase">
              BLUE ({teamBlueCount || 1} คน) 🔵
            </div>
            <div className={`font-arcade text-2xl sm:text-4xl ${isBlueLeading ? 'text-white text-glow-blue' : 'text-gray-300'}`}>
              {blueScoreNum.toFixed(1)}
            </div>
            <div className="font-ui text-[11px] text-yellow-300 font-bold">
              แต้มเฉลี่ยต่อคน
            </div>
            <div className="font-ui text-[10px] text-gray-400">
              (รวม {teamBluePulls} ดึง)
            </div>
          </div>
        </div>

        {/* Formula notice tag */}
        <div className="mt-1.5 text-[10px] sm:text-[11px] font-ui text-gray-400 text-center">
          ⚖️ ระบบคำนวณแต้มเฉลี่ยต่อคน (ผลรวมกด ÷ จำนวนคน) แฟร์แม้สมาชิกไม่เท่ากัน
        </div>
      </div>

      {/* Momentum / Tug Meter */}
      <div className="mt-2">
        <div className="flex justify-between text-[11px] sm:text-xs font-ui font-extrabold mb-1">
          <span className="text-red-400">◀ แดงได้เปรียบ</span>
          <span className="text-white">จุดกึ่งกลางเชือก</span>
          <span className="text-blue-400">น้ำเงินได้เปรียบ ▶</span>
        </div>
        <div className="relative w-full h-3.5 sm:h-4 bg-gray-950 border-2 border-gray-700 overflow-hidden">
          {/* Center line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-1.5 bg-yellow-400 z-10 -translate-x-1/2"></div>
          
          {/* Dynamic Tug Fill */}
          <div
            className="h-full transition-all duration-75"
            style={{
              width: `${ropePercent}%`,
              background: ropePercent < 50 
                ? 'linear-gradient(90deg, #b91c1c 0%, #ef4444 100%)' 
                : 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
