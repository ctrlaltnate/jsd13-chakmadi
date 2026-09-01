import React from 'react';

export default function WelcomeScreen({ onCreateRoom, onOpenJoinModal }) {
  return (
    <div className="w-full max-w-lg mx-auto p-4 sm:p-6 bg-[#101426] border-4 border-[#334155] pixel-card text-center space-y-5 my-auto shadow-2xl">
      {/* Title & Banner */}
      <div className="space-y-1">
        <div className="inline-block px-3 py-1 bg-yellow-400 text-black font-arcade text-xs uppercase pixel-border">
          8-BIT RETRO MULTIPLAYER
        </div>
        <h1 className="font-arcade text-2xl sm:text-3xl text-white pixel-text-shadow mt-2">
          CROWD TUG-OF-WAR
        </h1>
        <p className="font-ui text-sm sm:text-base text-yellow-300 font-bold">
          สงครามชักเย่อคนหมู่มากแบบเรียลไทม์ 🔴 ทีมแดง vs 🔵 ทีมน้ำเงิน
        </p>
      </div>

      {/* Main Action Hub */}
      <div className="space-y-3 pt-2">
        {/* CREATE ROOM BUTTON */}
        <button
          type="button"
          onClick={onCreateRoom}
          className="w-full py-4 sm:py-5 pixel-btn pixel-btn-gold text-black text-base sm:text-lg font-arcade font-extrabold tracking-wider flex flex-col items-center justify-center gap-1 cursor-pointer shadow-lg hover:scale-102 transition-transform"
        >
          <div className="flex items-center gap-2">
            <span>➕</span>
            <span>สร้างห้องแข่งขัน (CREATE ROOM)</span>
          </div>
          <span className="text-xs font-ui text-gray-900 font-extrabold uppercase">
            รับรหัสห้อง 6 ตัว (JSD+เลข 3 ตัว) และเป็นหัวห้อง (HOST)
          </span>
        </button>

        {/* JOIN ROOM BUTTON */}
        <button
          type="button"
          onClick={onOpenJoinModal}
          className="w-full py-3.5 sm:py-4 pixel-btn pixel-btn-blue text-white text-sm sm:text-base font-arcade font-extrabold tracking-wider flex flex-col items-center justify-center gap-1 cursor-pointer shadow-md hover:scale-102 transition-transform"
        >
          <div className="flex items-center gap-2">
            <span>🔑</span>
            <span>กดเข้าห้อง (JOIN WITH CODE)</span>
          </div>
          <span className="text-xs font-ui text-blue-200 font-bold">
            กรอกรหัสห้อง 6 ตัว หรือวางลิงก์เชิญของเพื่อน
          </span>
        </button>
      </div>

      {/* Features preview badge */}
      <div className="pt-3 border-t border-gray-800 grid grid-cols-3 gap-2 font-ui text-[11px] text-gray-300">
        <div className="p-1.5 bg-[#090b14] border border-gray-800">
          ⚡ 20Hz Real-Time
        </div>
        <div className="p-1.5 bg-[#090b14] border border-gray-800">
          📱 รองรับมือถือ 100%
        </div>
        <div className="p-1.5 bg-[#090b14] border border-gray-800">
          🛡️ ระบบป้องกันโกง
        </div>
      </div>
    </div>
  );
}
