import React, { useState } from 'react';

const AVATARS_ICON = ['🥊', '💁‍♀️', '🐒', '🧙‍♂️', '🤖', '🦙'];

// Single-team panel used for desktop left/right sidebar columns
export function TeamPanel({ team = 'red', players = [], currentSocketId = null, className = '' }) {
  const isRed = team === 'red';
  const teamPlayers = players.filter((p) => p.team === team && p.status === 'active');

  return (
    <div
      className={`p-3 flex flex-col h-full min-h-[380px] max-h-[580px] ${isRed ? 'pixel-card-red' : 'pixel-card-blue'
        } ${className}`}
    >
      <div className={`flex items-center justify-between border-b-2 pb-2 mb-2 ${isRed ? 'border-red-800/80' : 'border-blue-800/80'}`}>
        <div className="flex items-center gap-1.5">
          <span className={`w-3 h-3 inline-block pixel-border ${isRed ? 'bg-red-500' : 'bg-blue-500'}`}></span>
          <span className="font-ui text-base font-extrabold text-white">
            {isRed ? '🔴 TEAM RED' : '🔵 TEAM BLUE'} ({teamPlayers.length} คน)
          </span>
        </div>
        <span className={`font-ui text-xs font-bold ${isRed ? 'text-red-200' : 'text-blue-200'}`}>
          ดึง (PULLS)
        </span>
      </div>

      {/* Scrollable Player Roster */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {teamPlayers.length === 0 ? (
          <div className="text-center font-ui text-sm text-gray-400 py-6">ไม่มีผู้เล่นในทีมนี้</div>
        ) : (
          teamPlayers.map((p) => {
            const isMe = p.id === currentSocketId;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between px-2.5 py-1.5 text-xs border ${isMe
                    ? 'border-yellow-400 bg-yellow-950/80 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                    : isRed
                      ? 'border-red-900/80 bg-red-950/40'
                      : 'border-blue-900/80 bg-blue-950/40'
                  }`}
              >
                <div className="flex items-center gap-2 truncate mr-2">
                  <span className="text-base sm:text-lg">
                    {AVATARS_ICON[p.avatar] || '🥊'}
                  </span>
                  <span
                    className={`font-ui text-sm truncate font-bold ${isMe ? 'text-yellow-300' : 'text-white'
                      }`}
                  >
                    {p.name} {isMe && '★ (คุณ)'}
                  </span>
                  {p.isBot && (
                    <span className={`text-[9px] font-ui text-white font-extrabold px-1 py-0.2 uppercase ${isRed ? 'bg-red-900' : 'bg-blue-900'}`}>
                      BOT
                    </span>
                  )}
                </div>
                <span className="font-ui text-sm text-yellow-300 shrink-0 font-extrabold">
                  {p.roundPulls || 0}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Combined / Tabbed Roster for mobile view
export default function TeamRosters({
  players = [],
  currentSocketId = null
}) {
  const [activeTab, setActiveTab] = useState('all');

  const redTeam = players.filter((p) => p.team === 'red' && p.status === 'active');
  const blueTeam = players.filter((p) => p.team === 'blue' && p.status === 'active');

  return (
    <div className="my-2">
      {/* Mobile Tab Switcher */}
      <div className="flex sm:hidden gap-1 mb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1 text-xs font-ui font-extrabold pixel-btn ${activeTab === 'all' ? 'pixel-btn-gold text-black' : ''}`}
        >
          ทั้งหมด (ALL)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('red')}
          className={`flex-1 py-1 text-xs font-ui font-extrabold pixel-btn ${activeTab === 'red' ? 'pixel-btn-red text-white' : ''}`}
        >
          🔴 RED ({redTeam.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('blue')}
          className={`flex-1 py-1 text-xs font-ui font-extrabold pixel-btn ${activeTab === 'blue' ? 'pixel-btn-blue text-white' : ''}`}
        >
          🔵 BLUE ({blueTeam.length})
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {/* TEAM RED PANEL */}
        <div
          className={`pixel-card-red p-2.5 sm:p-3 flex flex-col h-36 sm:h-48 ${activeTab === 'blue' ? 'hidden sm:flex' : 'flex'
            }`}
        >
          <div className="flex items-center justify-between border-b-2 border-red-800/80 pb-1 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-red-500 inline-block pixel-border"></span>
              <span className="font-ui text-sm sm:text-base font-extrabold text-white">
                🔴 TEAM RED ({redTeam.length} คน)
              </span>
            </div>
            <span className="font-ui text-xs font-bold text-red-200">ดึง (PULLS)</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {redTeam.length === 0 ? (
              <div className="text-center font-ui text-sm text-gray-400 py-4">ไม่มีผู้เล่นในทีมนี้</div>
            ) : (
              redTeam.map((p) => {
                const isMe = p.id === currentSocketId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-2 py-1 text-xs border ${isMe
                        ? 'border-yellow-400 bg-yellow-950/80 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                        : 'border-red-900/80 bg-red-950/40'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 truncate mr-2">
                      <span className="text-base">
                        {AVATARS_ICON[p.avatar] || '🥊'}
                      </span>
                      <span
                        className={`font-ui text-sm truncate font-bold ${isMe ? 'text-yellow-300' : 'text-white'
                          }`}
                      >
                        {p.name} {isMe && '★ (คุณ)'}
                      </span>
                      {p.isBot && (
                        <span className="text-[9px] font-ui bg-red-900 text-white font-extrabold px-1 py-0.2 uppercase">
                          BOT
                        </span>
                      )}
                    </div>
                    <span className="font-ui text-sm text-yellow-300 shrink-0 font-extrabold">
                      {p.roundPulls || 0}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TEAM BLUE PANEL */}
        <div
          className={`pixel-card-blue p-2.5 sm:p-3 flex flex-col h-36 sm:h-48 ${activeTab === 'red' ? 'hidden sm:flex' : 'flex'
            }`}
        >
          <div className="flex items-center justify-between border-b-2 border-blue-800/80 pb-1 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-blue-500 inline-block pixel-border"></span>
              <span className="font-ui text-sm sm:text-base font-extrabold text-white">
                🔵 TEAM BLUE ({blueTeam.length} คน)
              </span>
            </div>
            <span className="font-ui text-xs font-bold text-blue-200">ดึง (PULLS)</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {blueTeam.length === 0 ? (
              <div className="text-center font-ui text-sm text-gray-400 py-4">ไม่มีผู้เล่นในทีมนี้</div>
            ) : (
              blueTeam.map((p) => {
                const isMe = p.id === currentSocketId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-2 py-1 text-xs border ${isMe
                        ? 'border-yellow-400 bg-yellow-950/80 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                        : 'border-blue-900/80 bg-blue-950/40'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 truncate mr-2">
                      <span className="text-base">
                        {AVATARS_ICON[p.avatar] || '⚔️'}
                      </span>
                      <span
                        className={`font-ui text-sm truncate font-bold ${isMe ? 'text-yellow-300' : 'text-white'
                          }`}
                      >
                        {p.name} {isMe && '★ (คุณ)'}
                      </span>
                      {p.isBot && (
                        <span className="text-[9px] font-ui bg-blue-900 text-white font-extrabold px-1 py-0.2 uppercase">
                          BOT
                        </span>
                      )}
                    </div>
                    <span className="font-ui text-sm text-yellow-300 shrink-0 font-extrabold">
                      {p.roundPulls || 0}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
