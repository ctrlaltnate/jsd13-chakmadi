import React, { useState, useEffect } from 'react';
import { soundService } from '../services/sound';
import badgeImg from '../assets/badge.png';

const AVATARS_ICON = ['🥊', '💁‍♀️', '🐒', '🧙‍♂️', '🤖', '🦙'];

export default function RoundSummaryScreen({
  roundNumber = 1,
  winnerTeam = 'red',
  eliminated = [],
  survivors = [],
  currentSocketId = null,
  onLeaveGame = null
}) {
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    soundService.playElimination();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const isRedWinner = winnerTeam === 'red';
  const nextIsFinal = survivors.length === 2;
  const isMeEliminated = eliminated.some((p) => p.id === currentSocketId);
  const isMeSurvivor = survivors.some((p) => p.id === currentSocketId);

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-[#121626] border-4 border-[#475569] pixel-card text-center select-none space-y-4 shadow-2xl">
      {/* Trophy Badge Display */}
      <div className="flex justify-center my-1">
        <img
          src={badgeImg}
          alt="Winner Trophy Badge"
          className="w-40 sm:w-52 h-auto object-contain max-w-full drop-shadow-[0_0_15px_rgba(234,179,8,0.6)] animate-pulse"
        />
      </div>

      {/* Top Knockout Banner */}
      <div>
        <div className="inline-block px-3 py-1 bg-red-600 text-white font-arcade text-xs uppercase mb-2 pixel-border">
          ROUND {roundNumber} COMPLETE! (จบรอบที่ {roundNumber})
        </div>
        
        <h2
          className={`text-2xl sm:text-4xl font-arcade mb-1 pixel-text-shadow ${
            isRedWinner ? 'text-glow-red' : 'text-glow-blue'
          }`}
        >
          {isRedWinner ? '🏆 TEAM RED WINS! (ทีมแดงชนะ)' : '🏆 TEAM BLUE WINS! (ทีมน้ำเงินชนะ)'}
        </h2>
        <p className="font-ui text-sm sm:text-base text-yellow-300 font-extrabold">
          ทีมที่ชนะได้ผ่านเข้ารอบต่อไป ทีมที่แพ้ถูกคัดออก!
        </p>
      </div>

      {/* Countdown to next round */}
      <div className="p-2.5 sm:p-3 bg-[#060812] border-2 border-yellow-400 inline-block px-6">
        <span className="font-ui text-xs sm:text-sm text-white font-bold block">
          {nextIsFinal ? '🔥 เตรียมตัวเข้าสู่รอบ 1v1 FINAL ชิงชนะเลิศใน:' : 'รอบต่อไปจะเริ่มขึ้นใน:'}
        </span>
        <span className="font-arcade text-2xl sm:text-3xl text-yellow-400 animate-pulse">
          {countdown}s
        </span>
      </div>

      {/* Eliminated Player Options & Notice */}
      {isMeEliminated && (
        <div className="p-3 bg-[#261014] border-2 border-red-500 pixel-card text-center">
          <div className="font-ui text-sm font-extrabold text-red-300 mb-2">
            💀 คุณถูกคัดออกในรอบนี้! คุณสามารถเลือกอยู่ชมและส่งเสียงเชียร์ต่อ หรือออกจากเกมได้
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-1.5 bg-gray-800 border border-gray-600 text-xs font-ui font-extrabold text-white">
              👀 คุณยังอยู่ชมต่อในโหมดผู้ชม (Spectator)
            </span>
            {onLeaveGame && (
              <button
                type="button"
                onClick={onLeaveGame}
                className="px-3 py-1.5 pixel-btn pixel-btn-red text-white text-xs font-ui font-extrabold cursor-pointer"
              >
                🚪 ออกจากเกม (LEAVE)
              </button>
            )}
          </div>
        </div>
      )}

      {isMeSurvivor && (
        <div className="p-2.5 bg-emerald-950/80 border-2 border-emerald-400 font-ui text-sm font-extrabold text-emerald-300">
          🎉 ยินดีด้วย! คุณรอดชีวิตและได้ผ่านเข้าสู่รอบถัดไป!
        </div>
      )}

      {/* Side-by-Side: Survivors vs Eliminated */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {/* SURVIVORS PANEL */}
        <div className="p-2.5 sm:p-3 bg-[#0c2415] border-2 border-emerald-500">
          <div className="flex items-center justify-between border-b border-emerald-700 pb-1 mb-2">
            <span className="font-ui text-sm font-extrabold text-white">
              ✅ ผู้รอดชีวิตเข้ารอบ ({survivors.length} คน)
            </span>
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
            {survivors.map((p) => {
              const isMe = p.id === currentSocketId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-2 py-1 text-xs border ${
                    isMe
                      ? 'border-yellow-400 bg-yellow-950/80 text-yellow-300 font-bold'
                      : 'border-emerald-900 bg-emerald-950/60 text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{AVATARS_ICON[p.avatar] || '🥊'}</span>
                    <span className="font-ui text-xs sm:text-sm font-bold truncate">
                      {p.name} {isMe && '★ (คุณ)'}
                    </span>
                  </div>
                  <span className="font-ui text-[10px] bg-emerald-700 text-white font-bold px-1.5 py-0.5">
                    เข้ารอบ
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ELIMINATED PANEL */}
        <div className="p-2.5 sm:p-3 bg-[#240c11] border-2 border-red-500">
          <div className="flex items-center justify-between border-b border-red-700 pb-1 mb-2">
            <span className="font-ui text-sm font-extrabold text-white">
              💀 ถูกคัดออก ({eliminated.length} คน)
            </span>
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
            {eliminated.map((p) => {
              const isMe = p.id === currentSocketId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-2 py-1 text-xs border opacity-75 ${
                    isMe
                      ? 'border-red-400 bg-red-950 text-red-200'
                      : 'border-red-900 bg-red-950/40 text-gray-300 line-through'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{AVATARS_ICON[p.avatar] || '🥊'}</span>
                    <span className="font-ui text-xs sm:text-sm font-bold truncate">
                      {p.name} {isMe && '(คุณ)'}
                    </span>
                  </div>
                  <span className="font-arcade text-[8px] bg-red-800 text-white px-1.5 py-0.5">
                    K.O.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
