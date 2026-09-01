import React, { useState, useEffect } from 'react';
import { soundService } from '../services/sound';

const AVATARS_ICON = ['🥊', '⚔️', '🥷', '🧙‍♂️', '🤖', '🏴‍☠️'];

export default function RoundSummaryScreen({
  roundNumber = 1,
  winnerTeam = 'red',
  eliminated = [],
  survivors = [],
  currentSocketId = null
}) {
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    // Play dramatic round over sound
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

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-[#131625] border-4 border-[#3b4261] pixel-card text-center select-none space-y-6">
      {/* Top Knockout Banner */}
      <div>
        <div className="inline-block px-3 py-1 bg-red-600 text-white font-pixel text-xs uppercase mb-2 pixel-border">
          ROUND {roundNumber} COMPLETE!
        </div>
        
        <h2
          className={`text-2xl sm:text-4xl font-pixel mb-2 pixel-text-shadow ${
            isRedWinner ? 'text-red-400 text-glow-red' : 'text-blue-400 text-glow-blue'
          }`}
        >
          {isRedWinner ? '🏆 TEAM RED WINS!' : '🏆 TEAM BLUE WINS!'}
        </h2>
        <p className="font-retro text-lg sm:text-xl text-yellow-300">
          THE LOSING TEAM HAS BEEN ELIMINATED FROM THE TOURNAMENT
        </p>
      </div>

      {/* Countdown to next round */}
      <div className="p-3 bg-[#0a0c16] border-2 border-yellow-500/60 inline-block px-6">
        <span className="font-retro text-base text-gray-400 block">
          {nextIsFinal ? 'GET READY FOR FINAL 1v1 SHOWDOWN IN:' : 'NEXT ROUND BEGINS IN:'}
        </span>
        <span className="font-pixel text-3xl text-yellow-400 animate-pulse">
          {countdown}s
        </span>
      </div>

      {/* Side-by-Side: Survivors vs Eliminated */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        {/* SURVIVORS PANEL */}
        <div className="p-3 bg-[#0c2415] border-2 border-emerald-500">
          <div className="flex items-center justify-between border-b border-emerald-700 pb-1 mb-2">
            <span className="font-pixel text-xs text-emerald-400">
              ✅ SURVIVORS ADVANCING ({survivors.length})
            </span>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {survivors.map((p) => {
              const isMe = p.id === currentSocketId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-2 py-1 text-xs border ${
                    isMe
                      ? 'border-yellow-400 bg-yellow-950/60 text-yellow-300'
                      : 'border-emerald-900 bg-emerald-950/40 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{AVATARS_ICON[p.avatar] || '🥊'}</span>
                    <span className="font-pixel text-[10px] truncate">
                      {p.name} {isMe && '(YOU!)'}
                    </span>
                  </div>
                  <span className="font-pixel text-[8px] bg-emerald-700 text-white px-1 py-0.5">
                    ADVANCES
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ELIMINATED PANEL */}
        <div className="p-3 bg-[#240c11] border-2 border-red-500">
          <div className="flex items-center justify-between border-b border-red-700 pb-1 mb-2">
            <span className="font-pixel text-xs text-red-400">
              💀 ELIMINATED FIGHTERS ({eliminated.length})
            </span>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {eliminated.map((p) => {
              const isMe = p.id === currentSocketId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-2 py-1 text-xs border opacity-70 ${
                    isMe
                      ? 'border-red-400 bg-red-950 text-red-300'
                      : 'border-red-900 bg-red-950/40 text-red-300 line-through'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{AVATARS_ICON[p.avatar] || '🥊'}</span>
                    <span className="font-pixel text-[10px] truncate">
                      {p.name} {isMe && '(YOU!)'}
                    </span>
                  </div>
                  <span className="font-pixel text-[8px] bg-red-800 text-white px-1 py-0.5">
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
