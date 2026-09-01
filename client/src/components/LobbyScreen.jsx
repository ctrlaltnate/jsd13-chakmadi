import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { socketService } from '../services/socket';
import { soundService } from '../services/sound';

const AVATARS_ICON = ['🥊', '⚔️', '🥷', '🧙‍♂️', '🤖', '🏴‍☠️'];

export default function LobbyScreen({
  players = [],
  isHost = false,
  roundDuration = 60,
  currentSocketId = null,
  localIp = 'localhost',
  myPlayer = null,
  onLeaveGame = null
}) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showEnlargeQr, setShowEnlargeQr] = useState(false);

  // Direct game URL: everyone goes directly to this unified game room
  const origin = window.location.origin;
  const gameInviteUrl = localIp && localIp !== 'localhost' && window.location.hostname === 'localhost'
    ? `${window.location.protocol}//${localIp}:${window.location.port}`
    : origin;

  // Generate QR Code for direct game link
  useEffect(() => {
    QRCode.toDataURL(gameInviteUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR Error:', err));
  }, [gameInviteUrl]);

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(gameInviteUrl);
      } else {
        const input = document.createElement('input');
        input.value = gameInviteUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
    setCopied(true);
    soundService.playCheer();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartTournament = () => {
    if (players.length < 2) {
      soundService.playWarning();
      alert('ต้องมีผู้เล่นอย่างน้อย 2 คน! หัวห้องสามารถกดปุ่มเพิ่มบอทจำลองเพื่อทดสอบได้ทันที');
      return;
    }
    soundService.playVictory();
    socketService.startTournament();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 sm:space-y-4 select-none">
      {/* Non-host Re-join Confirmation Banner */}
      {myPlayer?.status === 'waiting_rejoin' && (
        <div className="p-4 bg-[#1f1708] border-4 border-yellow-400 pixel-card text-center space-y-2 shadow-2xl animate-pulse">
          <div className="text-3xl">🏆</div>
          <div className="font-arcade text-base sm:text-lg text-white pixel-text-shadow">
            การแข่งขันรอบใหม่กำลังจะเริ่ม!
          </div>
          <p className="font-ui text-xs sm:text-sm text-yellow-300 font-bold">
            คุณจบเกมจากรอบที่แล้ว กรุณากดปุ่มด้านล่างเพื่อยืนยันการเข้าร่วมแข่งขันรอบใหม่นี้
          </p>
          <button
            type="button"
            onClick={() => {
              soundService.playVictory();
              socketService.rejoinGame();
            }}
            className="w-full max-w-sm mx-auto py-3.5 pixel-btn pixel-btn-gold text-black font-arcade text-sm sm:text-base font-extrabold cursor-pointer shadow-xl tracking-wider block"
          >
            🎮 พร้อมเล่นรอบใหม่ (CONFIRM READY)
          </button>
        </div>
      )}

      {/* Lobby Hero Header */}
      <div className="pixel-card p-4 sm:p-5 text-center bg-[#101322]">
        <div className="inline-block px-3 py-1 bg-amber-400 text-black font-ui text-xs sm:text-sm font-extrabold uppercase mb-2 pixel-border">
          ห้องรวมพลชักเย่อ • CROWD TUG-OF-WAR ARENA
        </div>
        <h1 className="text-2xl sm:text-4xl font-arcade text-white mb-1 pixel-text-shadow leading-tight">
          CROWD TUG-OF-WAR
        </h1>
        <p className="font-ui text-base sm:text-lg text-yellow-300 font-bold">
          PHYSICS EDITION • ชักเย่อคนหมู่มากแบบเรียลไทม์ 🔴 แดง vs 🔵 น้ำเงิน
        </p>

        {/* INVITE & QR CODE SECTION */}
        <div className="mt-4 p-3.5 bg-[#060810] border-3 border-yellow-500/80 pixel-card-gold text-left">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left Column: Share Link & Actions */}
            <div className="flex-1 w-full space-y-2.5">
              <div className="border-b-2 border-yellow-600/40 pb-2">
                <span className="text-xs font-ui text-yellow-200 uppercase font-bold block">
                  🌐 ลิงก์ชวนเพื่อนเข้าเล่น (INVITE LINK):
                </span>
                <span className="font-mono text-xs sm:text-sm text-emerald-400 font-bold break-all">
                  {gameInviteUrl}
                </span>
              </div>

              {/* Copy Link Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 px-4 pixel-btn pixel-btn-gold text-black text-xs sm:text-sm font-ui font-extrabold cursor-pointer flex items-center justify-center gap-2 shadow-md hover:scale-102 transition-transform"
                >
                  <span>{copied ? '✅' : '📋'}</span>
                  <span>{copied ? 'คัดลอกลิงก์สำเร็จแล้ว!' : 'คัดลอกลิงก์เกม (COPY LINK)'}</span>
                </button>
              </div>

              <p className="font-ui text-xs text-gray-300">
                💡 ส่งลิงก์นี้ให้เพื่อนในแชท หรือเปิดหน้าจอนี้ให้เพื่อนสแกน QR Code เพื่อเข้าสู่สนามแข่งขันได้ทันที!
              </p>
            </div>

            {/* Right Column: Embedded QR Code */}
            <div className="flex flex-col items-center justify-center shrink-0 bg-[#0c101d] p-2.5 border-2 border-gray-700">
              {qrDataUrl ? (
                <div
                  onClick={() => setShowEnlargeQr(true)}
                  className="p-1.5 bg-white border-2 border-yellow-400 cursor-pointer hover:scale-105 transition-transform shadow-md"
                  title="คลิกเพื่อขยาย QR Code เต็มจอ"
                >
                  <img
                    src={qrDataUrl}
                    alt="Game QR Code"
                    className="w-24 h-24 sm:w-28 sm:h-28 image-pixelated block"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center text-xs text-gray-400">
                  กำลังสร้าง QR...
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowEnlargeQr(true)}
                className="mt-1.5 text-[10px] font-ui text-yellow-400 underline font-bold hover:text-yellow-300 cursor-pointer"
              >
                🔍 คลิกเพื่อขยายใหญ่
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Enlarge QR Modal */}
      {showEnlargeQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs">
          <div className="pixel-card p-5 bg-[#121626] text-center max-w-xs sm:max-w-sm w-full border-4 border-yellow-400">
            <h3 className="font-arcade text-sm text-white mb-2">
              SCAN TO JOIN GAME
            </h3>
            <p className="font-ui text-xs text-yellow-300 font-bold mb-3">
              ใช้กล้องมือถือสแกนเพื่อเข้าเล่นสนามนี้ทันที!
            </p>
            {qrDataUrl && (
              <div className="inline-block p-3 bg-white border-4 border-black">
                <img src={qrDataUrl} alt="Game QR" className="w-60 h-60 mx-auto image-pixelated" />
              </div>
            )}
            <p className="font-mono text-xs text-emerald-400 font-bold mt-2 truncate bg-black/70 p-1.5 border border-gray-700">
              {gameInviteUrl}
            </p>
            <button
              type="button"
              onClick={() => setShowEnlargeQr(false)}
              className="mt-3 w-full py-2.5 pixel-btn pixel-btn-gold text-black text-sm font-ui font-extrabold cursor-pointer"
            >
              ปิดหน้าต่าง (CLOSE)
            </button>
          </div>
        </div>
      )}

      {/* Match Setup & Bot Controls Card */}
      <div className="pixel-card p-4 sm:p-5 bg-[#101424]">
        <div className="flex items-center justify-between border-b-2 border-gray-700 pb-2 mb-3">
          <span className="font-ui text-sm sm:text-base font-extrabold text-white">
            ⚙️ การควบคุมการแข่งขัน
          </span>
          <span className="font-arcade text-xs text-yellow-400">
            {isHost ? '👑 คุณคือหัวห้อง (HOST)' : 'ผู้เล่นทั่วไป'}
          </span>
        </div>

        {/* Round Duration Controls (Host Only) */}
        {isHost && (
          <div className="mb-4">
            <label className="block font-ui text-xs sm:text-sm text-gray-300 font-bold mb-1.5">
              ⏱️ เวลาแข่งขันต่อรอบ (ROUND TIMER):
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[60, 120, 180].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => socketService.setRoundDuration(sec)}
                  className={`px-3 py-1.5 text-xs font-ui font-bold pixel-btn cursor-pointer ${
                    roundDuration === sec ? 'pixel-btn-gold text-black' : 'text-gray-300'
                  }`}
                >
                  {sec} วิ ({sec}s)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bot Simulation Injector (Visible only for Host) */}
        {isHost && (
          <div className="mb-4 p-3 bg-[#080b14] border-2 border-gray-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-ui text-xs sm:text-sm text-yellow-300 font-extrabold">
                🤖 เพิ่มบอทจำลองผู้เล่น (สำหรับทดสอบชักเย่อคนหมู่มาก 50+ คน):
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => socketService.addBots(5)}
                className="px-3 py-1.5 text-xs font-ui font-extrabold pixel-btn pixel-btn-blue text-white cursor-pointer"
              >
                +5 บอท
              </button>
              <button
                type="button"
                onClick={() => socketService.addBots(10)}
                className="px-3 py-1.5 text-xs font-ui font-extrabold pixel-btn pixel-btn-blue text-white cursor-pointer"
              >
                +10 บอท
              </button>
              <button
                type="button"
                onClick={() => socketService.addBots(20)}
                className="px-3 py-1.5 text-xs font-ui font-extrabold pixel-btn pixel-btn-blue text-white cursor-pointer"
              >
                +20 บอท
              </button>
              <button
                type="button"
                onClick={() => socketService.clearBots()}
                className="px-3 py-1.5 text-xs font-ui font-extrabold pixel-btn pixel-btn-red text-white cursor-pointer"
              >
                ล้างบอททั้งหมด
              </button>
            </div>
          </div>
        )}

        {/* Start Tournament Button */}
        {isHost ? (
          <button
            type="button"
            onClick={handleStartTournament}
            className="w-full py-3.5 sm:py-4 pixel-btn pixel-btn-gold text-black text-sm sm:text-base font-arcade font-extrabold tracking-wider cursor-pointer shadow-lg hover:scale-101 transition-transform"
          >
            🚀 เริ่มการแข่งขันชักเย่อ (START TOURNAMENT)
          </button>
        ) : (
          <div className="p-3 bg-gray-900 border-2 border-gray-700 text-center font-ui text-xs sm:text-sm text-yellow-300 font-bold">
            ⏳ กำลังรอให้หัวห้อง (Host) กดเริ่มการแข่งขัน... (เตรียมพร้อมลุย!)
          </div>
        )}
      </div>

      {/* Connected Players Roster Grid */}
      <div className="pixel-card p-3 sm:p-4 bg-[#101424]">
        <div className="flex items-center justify-between border-b-2 border-gray-700 pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-ui text-sm sm:text-base font-extrabold text-white">
              รายชื่อผู้เล่นในสนาม
            </span>
            <span className="px-2 py-0.5 bg-yellow-400 text-black text-xs font-ui font-extrabold rounded-none">
              {players.length} คน
            </span>
          </div>
          <span className="font-ui text-xs sm:text-sm text-gray-300 font-bold">
            รองรับสูงสุด 64 คน
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
          {players.map((p) => {
            const isMe = p.id === currentSocketId;
            return (
              <div
                key={p.id}
                className={`p-2 border text-xs flex items-center justify-between transition-colors ${
                  isMe
                    ? 'border-yellow-400 bg-yellow-950/70 shadow-sm'
                    : 'border-gray-800 bg-[#090b14]'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-base">{AVATARS_ICON[p.avatar] || '🥊'}</span>
                  <span
                    className={`font-ui truncate font-bold ${
                      isMe ? 'text-yellow-300' : 'text-gray-200'
                    }`}
                  >
                    {p.name} {isMe && '(คุณ)'}
                  </span>
                </div>
                {p.isBot && (
                  <span className="text-[9px] font-ui bg-gray-700 text-gray-300 px-1 uppercase font-bold shrink-0">
                    BOT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
