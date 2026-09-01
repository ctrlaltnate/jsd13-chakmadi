import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { socketService } from '../services/socket';
import { soundService } from '../services/sound';

const AVATARS_ICON = ['🥊', '⚔️', '🥷', '🧙‍♂️', '🤖', '🏴‍☠️'];

export default function LobbyScreen({
  roomId = 'MAIN',
  players = [],
  isHost = false,
  roundDuration = 60,
  currentSocketId = null,
  localIp = 'localhost',
  onLeaveGame = null,
  onSwitchRoom = null,
  onCreateRoom = null
}) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showEnlargeQr, setShowEnlargeQr] = useState(false);
  const [customRoomInput, setCustomRoomInput] = useState('');
  const [showJoinRoomInput, setShowJoinRoomInput] = useState(false);

  // Construct full shareable invite URL with room parameter
  const origin = window.location.origin;
  const baseUrl = localIp && localIp !== 'localhost' && window.location.hostname === 'localhost'
    ? `${window.location.protocol}//${localIp}:${window.location.port}`
    : origin;

  const roomInviteUrl = `${baseUrl}/?room=${encodeURIComponent(roomId)}`;

  // Automatically generate QR Code whenever roomInviteUrl changes
  useEffect(() => {
    QRCode.toDataURL(roomInviteUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR Error:', err));
  }, [roomInviteUrl]);

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(roomInviteUrl);
      } else {
        const input = document.createElement('input');
        input.value = roomInviteUrl;
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
      alert('ต้องมีผู้เล่นอย่างน้อย 2 คน! คุณสามารถกดปุ่มเพิ่มบอทจำลองเพื่อทดสอบได้ทันที');
      return;
    }
    soundService.playVictory();
    socketService.startTournament();
  };

  const handleSubmitJoinRoom = (e) => {
    e.preventDefault();
    const clean = customRoomInput.trim().toUpperCase();
    if (!clean) return;
    if (onSwitchRoom) {
      onSwitchRoom(clean);
    }
    setShowJoinRoomInput(false);
    setCustomRoomInput('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 sm:space-y-4 select-none">
      {/* Lobby Hero Header */}
      <div className="pixel-card p-4 sm:p-5 text-center bg-[#101322]">
        <div className="inline-block px-3 py-1 bg-amber-400 text-black font-ui text-xs sm:text-sm font-extrabold uppercase mb-2 pixel-border">
          ห้องรวมพล • MULTIPLAYER TOURNAMENT LOBBY
        </div>
        <h1 className="text-2xl sm:text-4xl font-arcade text-white mb-1 pixel-text-shadow leading-tight">
          CROWD TUG-OF-WAR
        </h1>
        <p className="font-ui text-base sm:text-lg text-yellow-300 font-bold">
          PHYSICS EDITION • ทัวร์นาเมนต์ชักเย่อคัดออก 50+ คน
        </p>

        {/* AUTOMATIC ROOM INVITE & QR CODE SECTION */}
        <div className="mt-4 p-3.5 bg-[#060810] border-3 border-yellow-500/80 pixel-card-gold text-left">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left Column: Room Code, Share Link & Actions */}
            <div className="flex-1 w-full space-y-2.5">
              {/* Room Code Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-yellow-600/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔑</span>
                  <div>
                    <span className="text-[10px] sm:text-xs font-ui text-yellow-200 uppercase font-bold block">
                      รหัสห้องแข่งขัน (ROOM CODE):
                    </span>
                    <span className="font-arcade text-lg sm:text-2xl text-white tracking-wider pixel-text-shadow">
                      #{roomId}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {onCreateRoom && (
                    <button
                      type="button"
                      onClick={onCreateRoom}
                      title="สุ่มสร้างห้องใหม่"
                      className="px-2.5 py-1.5 text-xs font-ui font-extrabold pixel-btn pixel-btn-gold text-black cursor-pointer"
                    >
                      🎲 สร้างห้องใหม่
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowJoinRoomInput(!showJoinRoomInput)}
                    title="พิมพ์รหัสห้องเพื่อย้ายห้อง"
                    className="px-2.5 py-1.5 text-xs font-ui font-extrabold pixel-btn text-white cursor-pointer"
                  >
                    🚪 ย้ายห้อง
                  </button>
                </div>
              </div>

              {/* Join Custom Room Input */}
              {showJoinRoomInput && (
                <form onSubmit={handleSubmitJoinRoom} className="flex items-center gap-1.5 p-2 bg-[#121626] border border-yellow-400">
                  <input
                    type="text"
                    value={customRoomInput}
                    onChange={(e) => setCustomRoomInput(e.target.value)}
                    placeholder="พิมพ์รหัสห้อง เช่น WAR-1234"
                    maxLength={12}
                    className="flex-1 px-2 py-1 bg-black border border-gray-600 text-white font-ui font-bold text-xs uppercase outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-emerald-600 text-white text-xs font-ui font-bold pixel-btn cursor-pointer"
                  >
                    เข้าห้อง
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJoinRoomInput(false)}
                    className="px-2 py-1 bg-gray-700 text-white text-xs pixel-btn cursor-pointer"
                  >
                    ✕
                  </button>
                </form>
              )}

              {/* Shareable Link Box */}
              <div>
                <span className="font-ui text-xs text-gray-200 font-bold block mb-1">
                  🔗 ลิงก์เชิญเพื่อน (คลิกแล้วเข้าห้องนี้ทันที):
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={roomInviteUrl}
                    onClick={(e) => e.target.select()}
                    className="flex-1 px-2.5 py-1.5 bg-[#0a0d16] border border-gray-600 text-emerald-400 font-mono text-xs truncate select-all cursor-text outline-none font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 text-xs sm:text-sm font-ui font-extrabold pixel-btn pixel-btn-green text-white cursor-pointer shrink-0"
                  >
                    {copied ? 'คัดลอกแล้ว! ✅' : '📋 คัดลอกลิงก์'}
                  </button>
                </div>
              </div>

              <p className="font-ui text-xs text-yellow-300 font-bold">
                💡 ส่งลิงก์หรือให้เพื่อนสแกน QR Code เพื่อเปิดมือถือเข้ามาดึงเชือกพร้อมกันได้เลย!
              </p>
            </div>

            {/* Right Column: AUTOMATIC VISIBLE QR CODE */}
            <div className="flex flex-col items-center justify-center shrink-0 p-2 bg-[#121626] border-2 border-yellow-400">
              <span className="font-ui text-[11px] text-white font-extrabold mb-1">
                📱 สแกน QR เข้าห้องนี้
              </span>
              {qrDataUrl ? (
                <div
                  onClick={() => setShowEnlargeQr(true)}
                  className="p-1.5 bg-white border-2 border-black cursor-pointer hover:scale-105 transition-transform shadow-md"
                  title="คลิกเพื่อขยาย QR Code"
                >
                  <img
                    src={qrDataUrl}
                    alt="Room Invite QR"
                    className="w-32 h-32 sm:w-36 sm:h-36 image-pixelated block"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 bg-gray-800 flex items-center justify-center font-ui text-xs text-white">
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
              SCAN TO JOIN ROOM #{roomId}
            </h3>
            <p className="font-ui text-xs text-yellow-300 font-bold mb-3">
              ใช้กล้องมือถือสแกนเพื่อเข้าห้องแข่งขันนี้ทันที!
            </p>
            {qrDataUrl && (
              <div className="inline-block p-3 bg-white border-4 border-black">
                <img src={qrDataUrl} alt="Join Game QR" className="w-60 h-60 mx-auto image-pixelated" />
              </div>
            )}
            <p className="font-mono text-xs text-emerald-400 font-bold mt-2 truncate bg-black/70 p-1.5 border border-gray-700">
              {roomInviteUrl}
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
            ⚙️ ตั้งค่าการแข่งขัน & ตัวช่วยทดสอบ
          </span>
          <span className="font-arcade text-xs text-yellow-400">
            {isHost ? '👑 คุณคือโฮสต์ (HOST)' : 'ผู้เล่นทั่วไป'}
          </span>
        </div>

        {/* Round Duration Controls */}
        <div className="mb-4">
          <label className="block font-ui text-xs sm:text-sm text-gray-300 font-bold mb-1.5">
            ⏱️ เวลาแข่งขันต่อรอบ (ROUND TIMER):
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {[60, 120, 180].map((sec) => (
              <button
                key={sec}
                type="button"
                disabled={!isHost}
                onClick={() => socketService.setRoundDuration(sec)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-arcade pixel-btn cursor-pointer ${
                  roundDuration === sec
                    ? 'pixel-btn-gold text-black'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                } ${!isHost ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {sec} วิ ({sec}s)
              </button>
            ))}
            {!isHost && (
              <span className="text-xs font-ui text-gray-400 italic">
                (เฉพาะโฮสต์ที่ปรับเวลาได้)
              </span>
            )}
          </div>
        </div>

        {/* Bot Simulation Injector */}
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

        {/* Start Tournament Button */}
        {isHost ? (
          <button
            type="button"
            onClick={handleStartTournament}
            className="w-full py-3.5 sm:py-4 pixel-btn pixel-btn-gold text-black text-sm sm:text-base font-arcade font-extrabold tracking-wider cursor-pointer shadow-lg"
          >
            START TOURNAMENT (เริ่มการแข่งขัน: {players.length} คน) ▶
          </button>
        ) : (
          <div className="p-3 text-center bg-[#080b14] font-ui text-sm sm:text-base text-yellow-300 font-extrabold animate-pulse">
            ⏳ กำลังรอให้โฮสต์กดเริ่มการแข่งขัน...
          </div>
        )}
      </div>

      {/* Connected Players Roster Grid */}
      <div className="pixel-card p-3 sm:p-4 bg-[#101424]">
        <div className="flex items-center justify-between border-b-2 border-gray-700 pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-ui text-sm sm:text-base font-extrabold text-white">
              รายชื่อผู้เล่นในห้อง #{roomId}
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
                className={`p-2 border flex items-center gap-2 ${
                  isMe
                    ? 'border-yellow-400 bg-yellow-950/60 shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                    : 'border-gray-700 bg-gray-900/60'
                }`}
              >
                <span className="text-xl sm:text-2xl">{AVATARS_ICON[p.avatar] || '🥊'}</span>
                <div className="truncate">
                  <div
                    className={`font-ui text-xs sm:text-sm truncate font-bold ${
                      isMe ? 'text-yellow-300' : 'text-white'
                    }`}
                  >
                    {p.name}
                  </div>
                  <div className="font-ui text-[11px] text-gray-300">
                    {isMe ? '★ ตัวคุณ' : p.isBot ? '🤖 บอท' : 'นักสู้'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leave Lobby Button */}
        {onLeaveGame && (
          <div className="pt-3 text-center border-t border-gray-800 mt-3">
            <button
              type="button"
              onClick={onLeaveGame}
              className="px-4 py-2 text-xs sm:text-sm font-ui font-extrabold pixel-btn pixel-btn-red text-white cursor-pointer"
            >
              🚪 ออกจากห้องแข่งขัน (LEAVE LOBBY)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
