import React from 'react';

const AVATARS_ICON = ['🥊', '⚔️', '🥷', '🧙‍♂️', '🤖', '🏴‍☠️'];

export default function TeamRosters({
  players = [],
  currentSocketId = null
}) {
  const redTeam = players.filter(p => p.team === 'red');
  const blueTeam = players.filter(p => p.team === 'blue');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
      {/* TEAM RED PANEL */}
      <div className="pixel-card-red p-3 flex flex-col h-44 sm:h-52">
        <div className="flex items-center justify-between border-b-2 border-red-800 pb-1 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 inline-block pixel-border"></span>
            <span className="font-pixel text-xs text-red-300">
              TEAM RED ({redTeam.length})
            </span>
          </div>
          <span className="font-retro text-sm text-red-400">PULLS</span>
        </div>

        {/* Scrollable Player List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {redTeam.length === 0 ? (
            <div className="text-center font-retro text-gray-500 py-6">NO PLAYERS</div>
          ) : (
            redTeam.map((p) => {
              const isMe = p.id === currentSocketId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-2 py-1 text-xs border ${
                    isMe
                      ? 'border-yellow-400 bg-yellow-950/70 shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                      : 'border-red-900/60 bg-red-950/30'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span className="text-sm">
                      {AVATARS_ICON[p.avatar] || '🥊'}
                    </span>
                    <span
                      className={`font-pixel text-[10px] truncate ${
                        isMe ? 'text-yellow-300 font-bold' : 'text-red-200'
                      }`}
                    >
                      {p.name} {isMe && '(YOU!)'}
                    </span>
                    {p.isBot && (
                      <span className="text-[8px] bg-red-900 text-red-300 px-1 py-0.5 uppercase">
                        BOT
                      </span>
                    )}
                  </div>
                  <span className="font-retro text-sm text-yellow-400 shrink-0 font-bold">
                    {p.roundPulls || 0}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* TEAM BLUE PANEL */}
      <div className="pixel-card-blue p-3 flex flex-col h-44 sm:h-52">
        <div className="flex items-center justify-between border-b-2 border-blue-800 pb-1 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 inline-block pixel-border"></span>
            <span className="font-pixel text-xs text-blue-300">
              TEAM BLUE ({blueTeam.length})
            </span>
          </div>
          <span className="font-retro text-sm text-blue-400">PULLS</span>
        </div>

        {/* Scrollable Player List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {blueTeam.length === 0 ? (
            <div className="text-center font-retro text-gray-500 py-6">NO PLAYERS</div>
          ) : (
            blueTeam.map((p) => {
              const isMe = p.id === currentSocketId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-2 py-1 text-xs border ${
                    isMe
                      ? 'border-yellow-400 bg-yellow-950/70 shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                      : 'border-blue-900/60 bg-blue-950/30'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span className="text-sm">
                      {AVATARS_ICON[p.avatar] || '⚔️'}
                    </span>
                    <span
                      className={`font-pixel text-[10px] truncate ${
                        isMe ? 'text-yellow-300 font-bold' : 'text-blue-200'
                      }`}
                    >
                      {p.name} {isMe && '(YOU!)'}
                    </span>
                    {p.isBot && (
                      <span className="text-[8px] bg-blue-900 text-blue-300 px-1 py-0.5 uppercase">
                        BOT
                      </span>
                    )}
                  </div>
                  <span className="font-retro text-sm text-yellow-400 shrink-0 font-bold">
                    {p.roundPulls || 0}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
