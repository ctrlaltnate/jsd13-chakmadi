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
    }, 500);

    return () => clearInterval(interval);
  }, [countdownStartTime]);

  const isRed = playerTeam === 'red';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none">
      <div className="pixel-card p-6 sm:p-10 text-center max-w-md w-full animate-bounce">
        <div className="inline-block px-3 py-1 mb-3 bg-yellow-400 text-black font-pixel text-xs font-bold uppercase pixel-border">
          ROUND STARTING!
        </div>

        <div className="my-4">
          <div className="font-retro text-xl text-gray-300 mb-2">
            YOU ARE ON:
          </div>
          <div
            className={`font-pixel text-2xl sm:text-3xl font-extrabold uppercase ${
              isRed ? 'text-red-400 text-glow-red' : 'text-blue-400 text-glow-blue'
            }`}
          >
            {playerTeam ? `TEAM ${playerTeam}` : 'ASSIGNED'}
          </div>
        </div>

        <div className="my-6">
          <span className="font-pixel text-6xl sm:text-8xl text-yellow-400 text-glow-gold">
            {secondsLeft > 0 ? secondsLeft : 'PULL!'}
          </span>
        </div>

        <p className="font-retro text-lg text-amber-300">
          PREPARE YOUR FINGERS!
        </p>
      </div>
    </div>
  );
}
