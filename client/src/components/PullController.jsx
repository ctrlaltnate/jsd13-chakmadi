import React, { useState, useRef } from 'react';
import { socketService } from '../services/socket';
import { soundService } from '../services/sound';

export default function PullController({
  playerStatus = 'active', // 'active' | 'eliminated' | 'spectator'
  playerTeam = 'red', // 'red' | 'blue' | null
  roundActive = false,
  onTriggerShake = () => {}
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [popups, setPopups] = useState([]);
  const [antiBotWarning, setAntiBotWarning] = useState(false);
  const [combo, setCombo] = useState(0);

  const lastClientClickRef = useRef(0);
  const warningTimeoutRef = useRef(null);

  // Handle player pull action
  const handlePullClick = (e) => {
    // Prevent zoom/double-tap delays on mobile
    if (e) {
      e.preventDefault();
    }

    if (!roundActive || playerStatus !== 'active') {
      return;
    }

    const now = performance.now();
    const delta = now - lastClientClickRef.current;

    // Client-side anti-autoclicker / anti-bot debounce check:
    // Clicks faster than 100ms are flagged/ignored!
    if (lastClientClickRef.current > 0 && delta < 100) {
      setAntiBotWarning(true);
      soundService.playWarning();
      setCombo(0);

      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = setTimeout(() => {
        setAntiBotWarning(false);
      }, 1000);

      return; // Ignore spam click
    }

    lastClientClickRef.current = now;

    // Visual button press
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 90);

    // Mobile Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch (err) {}
    }

    // Audio sfx
    soundService.playPull();
    onTriggerShake();

    // Increment combo
    const newCombo = Math.min(10, combo + 1);
    setCombo(newCombo);

    // Floating popup particle
    const popupId = Date.now() + Math.random();
    const randomX = (Math.random() - 0.5) * 80;
    const newPopup = {
      id: popupId,
      x: randomX,
      text: newCombo >= 5 ? `🔥 +1 (x${newCombo})` : '+1 PULL!'
    };
    setPopups((prev) => [...prev.slice(-6), newPopup]);
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== popupId));
    }, 750);

    // Emit to authoritative server
    socketService.pull((res) => {
      if (!res.success) {
        if (res.reason === 'anti_bot_throttled') {
          setAntiBotWarning(true);
          soundService.playWarning();
        }
      }
    });
  };

  // Handle cheer for spectators / eliminated players
  const handleCheer = (team, emote) => {
    soundService.playCheer();
    socketService.cheer(team, emote);
  };

  // If Spectator or Eliminated -> Provide Cheering Controls
  if (playerStatus !== 'active') {
    return (
      <div className="w-full max-w-md mx-auto p-4 bg-[#141824] border-4 border-amber-600/70 pixel-card text-center my-3">
        <div className="inline-block px-3 py-1 mb-2 bg-red-600 text-white font-pixel text-[10px] uppercase pixel-border">
          {playerStatus === 'eliminated' ? '💀 YOU WERE ELIMINATED' : '👀 SPECTATOR MODE'}
        </div>
        <p className="font-retro text-lg text-amber-300 mb-3">
          CHEER YOUR FAVORITE TEAM TO SPUR THEM ON!
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleCheer('red', '🔥')}
            className="py-4 pixel-btn pixel-btn-red text-white text-xs font-pixel flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🔥</span> CHEER RED
          </button>
          <button
            type="button"
            onClick={() => handleCheer('blue', '⚡')}
            className="py-4 pixel-btn pixel-btn-blue text-white text-xs font-pixel flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>⚡</span> CHEER BLUE
          </button>
        </div>
      </div>
    );
  }

  // Active Player PULL Controller
  const teamColorClass = playerTeam === 'red' ? 'text-red-400' : 'text-blue-400';

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center py-2 px-4 select-none">
      {/* Anti-bot warning banner */}
      {antiBotWarning && (
        <div className="mb-2 px-3 py-1.5 bg-red-600 text-white font-pixel text-[10px] sm:text-xs uppercase pixel-border animate-bounce text-center">
          ⚠️ ANTI-BOT: TOO FAST! MIN 100ms INTERVAL!
        </div>
      )}

      {/* Combo Indicator */}
      <div className="h-6 mb-1 text-center font-pixel text-xs">
        {combo >= 3 ? (
          <span className="text-yellow-400 animate-pulse text-glow-gold">
            COMBO x{combo}! TURBO RHYTHM!
          </span>
        ) : (
          <span className="font-retro text-base text-gray-400">
            TAP IN RHYTHM (MIN 100ms)
          </span>
        )}
      </div>

      {/* Giant Pull Button Container */}
      <div className="relative w-full flex items-center justify-center">
        {/* Floating popups */}
        <div className="absolute top-0 pointer-events-none z-30">
          {popups.map((p) => (
            <div
              key={p.id}
              className="absolute font-pixel text-xs sm:text-sm text-yellow-300 font-extrabold whitespace-nowrap animate-float-pop text-glow-gold pointer-events-none"
              style={{ left: `${p.x}px` }}
            >
              {p.text}
            </div>
          ))}
        </div>

        {/* GIANT 8-BIT RETRO PULL BUTTON */}
        <button
          type="button"
          onMouseDown={handlePullClick}
          onTouchStart={handlePullClick}
          disabled={!roundActive}
          className={`w-full max-w-xs h-28 sm:h-32 pixel-pull-btn text-xl sm:text-2xl font-pixel flex flex-col items-center justify-center gap-1 ${
            isPressed ? 'pressed' : ''
          } ${!roundActive ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2">
            <span>💥</span>
            <span>PULL!</span>
            <span>💥</span>
          </div>
          <span className="text-[10px] tracking-normal font-retro text-amber-200 uppercase">
            {roundActive ? `MASH FOR ${playerTeam?.toUpperCase()}!` : 'WAIT FOR START'}
          </span>
        </button>
      </div>

      {/* Status footer */}
      <div className="mt-3 flex items-center gap-3 font-retro text-sm text-gray-400">
        <span>ASSIGNED: <strong className={teamColorClass}>{playerTeam ? `TEAM ${playerTeam.toUpperCase()}` : 'ASSIGNING...'}</strong></span>
        <span>•</span>
        <span>ANTI-BOT: <strong className="text-emerald-400">ACTIVE (100ms)</strong></span>
      </div>
    </div>
  );
}
