import React, { useState, useEffect } from 'react';
import { soundService } from '../services/sound';

export default function RoundStartingModal({ countdownStartTime, playerTeam }) {
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    soundService.playBeep(false);

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - countdownStartTime) / 1000);
      const remaining = Math.max(0, 3 - elapsed);
      setSecondsLeft(remaining);

      if (remaining > 0) {
        soundService.playBeep(false);
      } else {
        soundService.playBeep(true);
        clearInterval(interval);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [countdownStartTime]);

  const isRed = playerTeam === 'red';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs select-none">
      <div className="pixel-card p-6 sm:p-8 text-center max-w-sm w-full animate-bounce border-4 border-yellow-400 bg-[#101424]">
        <div className="inline-block px-3 py-1 mb-2 bg-yellow-400 text-black font-ui text-xs font-extrabold uppercase pixel-border">
          ROUND STARTING! (กำลังเริ่มการแข่งขัน)
        </div>

        <div className="my-2">
          <div className="font-ui text-sm text-gray-300 font-bold mb-1">
            คุณได้รับมอบหมายให้อยู่:
          </div>
          <div
            className={`font-arcade text-2xl sm:text-3xl font-extrabold uppercase ${
              isRed ? 'text-glow-red' : 'text-glow-blue'
            }`}
          >
            {playerTeam ? `TEAM ${playerTeam}` : 'ASSIGNING...'}
          </div>
        </div>

        <div className="my-4">
          <span className="font-arcade text-6xl sm:text-8xl text-white pixel-text-shadow">
            {secondsLeft > 0 ? secondsLeft : 'PULL!'}
          </span>
        </div>

        <p className="font-ui text-base text-yellow-300 font-extrabold">
          เตรียมรัวนิ้วดึงเชือกให้เต็มที่!
        </p>
      </div>
    </div>
  );
}
