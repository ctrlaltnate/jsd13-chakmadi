import React, { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket';
import { soundService } from '../services/sound';

export default function PullController({
  playerStatus = 'active', // 'active' | 'eliminated' | 'spectator'
  playerTeam = 'red', // 'red' | 'blue' | null
  roundActive = false
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [btnShake, setBtnShake] = useState(false);
  const [popups, setPopups] = useState([]);
  const [combo, setCombo] = useState(0);

  // Guard against holding down (No Hold-to-Pull!)
  const isPointerDownRef = useRef(false);
  const isSpaceDownRef = useRef(false);

  // Central pull trigger function
  const executePull = useCallback(() => {
    if (!roundActive || playerStatus !== 'active') {
      return;
    }

    // Button visual press and local button shake (screen does NOT shake)
    setIsPressed(true);
    setBtnShake(true);
    setTimeout(() => setIsPressed(false), 80);
    setTimeout(() => setBtnShake(false), 160);

    // Mobile Haptics
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch (err) {}
    }

    // Audio sfx
    soundService.playPull();

    // Increment combo
    setCombo((prev) => Math.min(50, prev + 1));

    // Floating popup particle
    const popupId = Date.now() + Math.random();
    const randomX = (Math.random() - 0.5) * 110;
    const newPopup = {
      id: popupId,
      x: randomX,
      text: '+1 PULL!'
    };
    setPopups((prev) => [...prev.slice(-8), newPopup]);
    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== popupId));
    }, 600);

    // Emit pull to server
    socketService.pull();
  }, [roundActive, playerStatus, onTriggerShake]);

  // Pointer Down (Click / Tap) - Requires releasing before pulling again
  const handlePointerDown = (e) => {
    if (e) {
      e.preventDefault();
    }
    if (isPointerDownRef.current) {
      return; // Prevent hold-to-pull
    }
    isPointerDownRef.current = true;
    executePull();
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  // Keyboard Spacebar Listener (Strictly rejects holding / e.repeat)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();

        // STRICT NO-HOLD: Reject auto-repeated keydown events
        if (e.repeat || isSpaceDownRef.current) {
          return;
        }

        isSpaceDownRef.current = true;
        executePull();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        isSpaceDownRef.current = false;
      }
    };

    // Global pointer up listener to reset pointer state even if released outside button
    const handleWindowPointerUp = () => {
      isPointerDownRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('touchend', handleWindowPointerUp);
    window.addEventListener('mouseup', handleWindowPointerUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('touchend', handleWindowPointerUp);
      window.removeEventListener('mouseup', handleWindowPointerUp);
    };
  }, [executePull]);

  // Handle cheer for spectators / eliminated players
  const handleCheer = (team, emote) => {
    soundService.playCheer();
    socketService.cheer(team, emote);
  };

  // If Spectator or Eliminated -> Provide Cheering Controls
  if (playerStatus !== 'active') {
    return (
      <div className="w-full max-w-md mx-auto p-4 bg-[#121626] border-3 border-amber-500 pixel-card text-center my-2">
        <div className="inline-block px-3 py-1 mb-2 bg-red-600 text-white font-arcade text-xs uppercase pixel-border">
          {playerStatus === 'eliminated' ? '💀 คุณถูกคัดออกแล้ว (ELIMINATED)' : '👀 โหมดผู้ชม (SPECTATOR)'}
        </div>
        <p className="font-ui text-base text-white font-bold mb-3">
          ร่วมส่งแรงใจเชียร์ทีมที่คุณต้องการให้ชนะ!
        </p>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => handleCheer('red', '🔥')}
            className="py-3.5 pixel-btn pixel-btn-red text-white text-sm font-ui font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>🔥</span> เชียร์ทีมแดง (RED)
          </button>
          <button
            type="button"
            onClick={() => handleCheer('blue', '⚡')}
            className="py-3.5 pixel-btn pixel-btn-blue text-white text-sm font-ui font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>⚡</span> เชียร์ทีมน้ำเงิน (BLUE)
          </button>
        </div>
      </div>
    );
  }

  // Active Player PULL Controller
  const teamColorText = playerTeam === 'red' ? 'text-red-400' : 'text-blue-400';

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center py-2 px-2 select-none">
      {/* Combo / Rhythm Indicator */}
      <div className="h-6 mb-1 text-center font-ui text-sm sm:text-base font-extrabold">
        {combo >= 3 ? (
          <span className="text-yellow-300 animate-pulse pixel-text-shadow">
            ⚡ COMBO x{combo}! รัวนิ้วเร็วเต็มพิกัด!
          </span>
        ) : (
          <span className="text-white">
            กดปุ่ม <strong className="text-yellow-400 font-arcade">[SPACE]</strong> หรือ <strong className="text-yellow-400 font-arcade">คลิก</strong> (ห้ามกดค้าง)
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
              className="absolute font-ui text-base sm:text-lg text-yellow-300 font-extrabold whitespace-nowrap animate-float-pop pixel-text-shadow pointer-events-none"
              style={{ left: `${p.x}px` }}
            >
              {p.text}
            </div>
          ))}
        </div>

        {/* GIANT 8-BIT RETRO PULL BUTTON */}
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          disabled={!roundActive}
          className={`w-full max-w-sm h-28 sm:h-32 pixel-pull-btn text-2xl sm:text-3xl font-arcade flex flex-col items-center justify-center gap-1 ${
            isPressed ? 'pressed' : ''
          } ${btnShake ? 'btn-shake' : ''} ${!roundActive ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2 text-white pixel-text-shadow">
            <span>💥</span>
            <span>PULL! (ดึง!)</span>
            <span>💥</span>
          </div>
          <span className="text-xs sm:text-sm font-ui text-yellow-200 font-extrabold uppercase tracking-wide">
            {roundActive ? `กด SPACE หรือ แตะรัวๆ (ทีม ${playerTeam?.toUpperCase()})` : 'รอสัญญาณเริ่ม'}
          </span>
        </button>
      </div>

      {/* Controls Hint & Anti-Hold Rule */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 font-ui text-xs sm:text-sm font-bold text-white text-center">
        <span>ทีม: <strong className={`${teamColorText} font-extrabold`}>{playerTeam ? `TEAM ${playerTeam.toUpperCase()}` : 'กำลังสุ่มทีม...'}</strong></span>
        <span>•</span>
        <span className="text-yellow-300">⌨️ กดปุ่ม Spacebar ได้</span>
        <span>•</span>
        <span className="text-red-300 font-extrabold">🚫 ไม่สามารถกดค้างได้</span>
      </div>
    </div>
  );
}
