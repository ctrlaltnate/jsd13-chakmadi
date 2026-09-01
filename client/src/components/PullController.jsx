import React, { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket';
import { soundService } from '../services/sound';

export default function PullController({
  playerStatus = 'active', // 'active' | 'eliminated' | 'spectator'
  playerTeam = 'red', // 'red' | 'blue' | null
  roundActive = false,
  myRoundPulls = 0,
  myTotalPulls = 0,
  pullTriggerRef = null
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [btnShake, setBtnShake] = useState(false);
  const [popups, setPopups] = useState([]);
  const [combo, setCombo] = useState(0);
  const [localPulls, setLocalPulls] = useState(0);

  // Sync local optimistic pulls with server authoritative state
  useEffect(() => {
    if (myRoundPulls > localPulls) {
      setLocalPulls(myRoundPulls);
    }
  }, [myRoundPulls, localPulls]);

  // Reset local pulls when round transitions
  useEffect(() => {
    if (!roundActive) {
      setLocalPulls(0);
      setCombo(0);
    }
  }, [roundActive]);

  // Guard against holding down and simultaneous double-input (Space + Click together)
  const isPointerDownRef = useRef(false);
  const isSpaceDownRef = useRef(false);
  const lastInputTimeRef = useRef(0);

  // Micro-batch pull accumulator: groups rapid taps within 50ms into a single packet
  const pendingPullsRef = useRef(0);
  const flushTimerRef = useRef(null);

  const flushPulls = useCallback(() => {
    if (pendingPullsRef.current > 0) {
      const count = pendingPullsRef.current;
      pendingPullsRef.current = 0;
      socketService.pull(count);
    }
    flushTimerRef.current = null;
  }, []);

  // Flush remaining pulls on unmount or when round ends
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushPulls();
      }
    };
  }, [flushPulls]);

  // Central pull trigger function
  const executePull = useCallback(() => {
    if (!roundActive || playerStatus !== 'active') {
      return;
    }

    const now = Date.now();
    // Anti-Double-Dipping: Reject simultaneous inputs faster than 55ms (prevents pressing Space & Click together)
    if (now - lastInputTimeRef.current < 55) {
      return;
    }
    lastInputTimeRef.current = now;

    // Instant optimistic counter increment (0ms response)
    setLocalPulls((prev) => prev + 1);

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

    // Smooth network communication: micro-batch pulls (flush within 50ms)
    pendingPullsRef.current += 1;
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(flushPulls, 50);
    }
  }, [roundActive, playerStatus, flushPulls]);

  // Expose executePull to external callers (e.g. TugCanvas clicks/taps)
  useEffect(() => {
    if (pullTriggerRef) {
      pullTriggerRef.current = executePull;
    }
    return () => {
      if (pullTriggerRef) {
        pullTriggerRef.current = null;
      }
    };
  }, [pullTriggerRef, executePull]);

  // Pointer Down (Click / Tap) - Requires releasing and blocked if Spacebar is pressed
  const handlePointerDown = (e) => {
    if (e) {
      e.preventDefault();
    }
    // Block if pointer is held OR Spacebar is currently pressed
    if (isPointerDownRef.current || isSpaceDownRef.current) {
      return;
    }
    isPointerDownRef.current = true;
    executePull();
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  // Global Spacebar listener (strictly single-tap, blocked if Pointer is pressed)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        // Block if auto-repeat, Space already down, OR Mouse pointer currently pressed
        if (e.repeat || isSpaceDownRef.current || isPointerDownRef.current) {
          return;
        }
        isSpaceDownRef.current = true;
        executePull();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        isSpaceDownRef.current = false;
      }
    };

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
  const displayPulls = Math.max(localPulls, myRoundPulls);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center py-1 px-1 select-none shrink-0">
      {/* Real-Time Personal Pull Score & Combo Badge */}
      <div className="flex items-center justify-between w-full max-w-xs sm:max-w-sm px-1.5 mb-1">
        <div className="font-ui text-xs sm:text-sm text-yellow-300 font-extrabold flex items-center gap-1">
          <span>💪</span>
          <span>แต้มคุณ:</span>
          <span className="font-arcade text-sm sm:text-base text-white px-1.5 py-0.5 bg-[#0a0d18] border border-yellow-400 shadow-sm animate-pulse">
            {displayPulls}
          </span>
          <span className="text-[10px] text-gray-400">ครั้ง</span>
        </div>

        <div className="font-ui text-xs font-bold">
          {combo >= 3 ? (
            <span className="text-amber-400 animate-pulse">⚡ COMBO x{combo}!</span>
          ) : (
            <span className="text-emerald-400">🔥 ดึงรัวๆ</span>
          )}
        </div>
      </div>

      {/* Giant Pull Button Container */}
      <div className="relative w-full flex items-center justify-center">
        {/* Floating popups */}
        <div className="absolute top-0 pointer-events-none z-30">
          {popups.map((p) => (
            <div
              key={p.id}
              className="absolute font-ui text-sm sm:text-base text-yellow-300 font-extrabold whitespace-nowrap animate-float-pop pixel-text-shadow pointer-events-none"
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
          className={`w-full max-w-xs sm:max-w-sm h-16 xs:h-20 sm:h-24 pixel-pull-btn text-lg sm:text-2xl font-arcade flex flex-col items-center justify-center gap-0.5 ${
            isPressed ? 'pressed' : ''
          } ${btnShake ? 'btn-shake' : ''} ${!roundActive ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2 text-white pixel-text-shadow">
            <span>💥</span>
            <span>PULL! (ดึง!)</span>
            <span>💥</span>
          </div>
          <span className="text-[11px] sm:text-xs font-ui text-yellow-200 font-extrabold uppercase tracking-wide">
            {roundActive ? `กด SPACE / แตะปุ่ม หรือคลิกที่สนาม` : 'รอสัญญาณเริ่ม'}
          </span>
        </button>
      </div>

      {/* Controls Hint & Anti-Hold Rule */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 font-ui text-[10px] sm:text-xs font-bold text-white text-center">
        <span>ทีม: <strong className={`${teamColorText} font-extrabold`}>{playerTeam ? `TEAM ${playerTeam.toUpperCase()}` : 'กำลังสุ่มทีม...'}</strong></span>
        <span>•</span>
        <span className="text-yellow-300">🎮 คลิกที่ปุ่ม หรือแตะที่สนามเพื่อดึง</span>
        <span>•</span>
        <span className="text-red-300 font-extrabold">🚫 ห้ามกดค้าง</span>
      </div>
    </div>
  );
}
