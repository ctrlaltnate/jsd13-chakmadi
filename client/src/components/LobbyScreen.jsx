import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { socketService } from '../services/socket';
import { soundService } from '../services/sound';

const AVATARS_ICON = ['🥊', '⚔️', '🥷', '🧙‍♂️', '🤖', '🏴‍☠️'];

export default function LobbyScreen({
  players = [],
  isHost = false,
  roundDuration = 25,
  currentSocketId = null,
  localIp = 'localhost',
  onLeaveGame = null
}) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  // Construct join URL
  const origin = window.location.origin;
  const networkOrigin = localIp && localIp !== 'localhost' && window.location.hostname === 'localhost'
    ? `${window.location.protocol}//${localIp}:${window.location.port}`
    : origin;

  useEffect(() => {
    QRCode.toDataURL(networkOrigin, {
      width: 280,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR Error:', err));
  }, [networkOrigin]);

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(networkOrigin);
      } else {
        const input = document.createElement('input');
        input.value = networkOrigin;
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

        {/* Shareable Link & QR Code Quick Action */}
        <div className="mt-4 p-2.5 sm:p-3 bg-[#060810] border-2 border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-center sm:text-left flex-1 min-w-0 w-full">
            <span className="font-ui text-xs text-gray-300 font-bold block">
              ลิงก์สำหรับแชร์ให้เพื่อนเข้าเล่นผ่านมือถือ:
            </span>
            <code className="text-xs sm:text-sm font-mono text-emerald-400 font-bold truncate block select-all">
              {networkOrigin}
            </code>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm font-ui font-extrabold pixel-btn pixel-btn-green text-white cursor-pointer"
            >
              {copied ? 'คัดลอกแล้ว! ✅' : 'คัดลอกลิงก์'}
            </button>
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm font-ui font-extrabold pixel-btn pixel-btn-gold text-black cursor-pointer"
            >
              📱 เปิด QR CODE
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs">
          <div className="pixel-card p-5 bg-[#121626] text-center max-w-xs sm:max-w-sm w-full border-4 border-[#475569]">
            <h3 className="font-arcade text-sm text-white mb-2">
              SCAN TO JOIN (สแกนเพื่อเข้าเล่น)
            </h3>
            <p className="font-ui text-xs text-yellow-300 font-bold mb-3">
              ใช้กล้องมือถือส่องเพื่อเข้าเป็นคอนโทรลเลอร์
            </p>
            {qrDataUrl ? (
              <div className="inline-block p-2.5 bg-white border-4 border-black">
                <img src={qrDataUrl} alt="Join Game QR" className="w-52 h-52 sm:w-60 sm:h-60 mx-auto image-pixelated" />
              </div>
            ) : (
              <div className="w-52 h-52 bg-gray-800 flex items-center justify-center font-ui text-white">
                กำลังสร้าง QR...
              </div>
            )}
            <p className="font-mono text-xs text-white font-bold mt-2 truncate bg-black/50 p-1">
              {networkOrigin}
            </p>
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="mt-3 w-full py-2.5 pixel-btn text-sm font-ui font-extrabold cursor-pointer"
            >
              ปิด (CLOSE)
            </button>
          </div>
        </div>
      )}

      {/* Host Controls Section */}
      <div className="pixel-card p-3 sm:p-4 bg-[#141829]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-gray-700 pb-2 mb-3">
          <div>
            <h3 className="font-arcade text-xs sm:text-sm text-white">
              {isHost ? '👑 HOST CONTROLS (ควบคุมการแข่งขัน)' : '👥 TOURNAMENT SETTINGS (การตั้งค่า)'}
            </h3>
            <p className="font-ui text-xs text-yellow-300 font-bold">
              {isHost
                ? 'ตั้งเวลาแต่ละรอบ และจำลองบอทเพื่อทดสอบระบบได้ที่นี่'
                : 'รอโฮสต์กดเริ่มการแข่งขัน...'}
            </p>
          </div>

          {!isHost && (
            <button
              type="button"
              onClick={() => socketService.claimHost()}
              className="px-2.5 py-1 text-xs font-ui font-bold pixel-btn cursor-pointer"
            >
              ขอสิทธิ์โฮสต์ (CLAIM HOST)
            </button>
          )}
        </div>

        {/* Round Duration Selector: 60s, 120s, 180s */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="font-ui text-sm font-extrabold text-white">เวลาต่อรอบ:</span>
          {[60, 120, 180].map((sec) => (
            <button
              key={sec}
              type="button"
              disabled={!isHost}
              onClick={() => {
                soundService.playPull();
                socketService.setRoundDuration(sec);
              }}
              className={`px-3 py-1 text-xs sm:text-sm font-ui font-extrabold pixel-btn ${
                roundDuration === sec ? 'pixel-btn-gold text-black' : ''
              } ${!isHost ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {sec} วิ ({sec / 60} นาที)
            </button>
          ))}
        </div>

        {/* Test Bots Tool (To test up to 50+ players easily!) */}
        {isHost && (
          <div className="p-2.5 sm:p-3 bg-[#080b14] border-2 border-dashed border-gray-600 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-ui text-xs sm:text-sm font-extrabold text-yellow-300">
                🤖 เพิ่มผู้เล่นจำลอง (TEST BOTS สำหรับทดสอบ):
              </span>
              <button
                type="button"
                onClick={() => {
                  soundService.playPull();
                  socketService.clearBots();
                }}
                className="text-xs font-ui font-bold text-red-400 hover:text-red-300 underline cursor-pointer"
              >
                ลบบอททั้งหมด
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  soundService.playPull();
                  socketService.addBots(5);
                }}
                className="px-2.5 py-1 text-xs font-ui font-bold pixel-btn cursor-pointer"
              >
                +5 บอท
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playPull();
                  socketService.addBots(10);
                }}
                className="px-2.5 py-1 text-xs font-ui font-bold pixel-btn cursor-pointer"
              >
                +10 บอท
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playPull();
                  socketService.addBots(20);
                }}
                className="px-2.5 py-1 text-xs font-ui font-bold pixel-btn cursor-pointer"
              >
                +20 บอท
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playPull();
                  socketService.addBots(40);
                }}
                className="px-2.5 py-1 text-xs font-ui font-extrabold pixel-btn pixel-btn-gold text-black cursor-pointer"
              >
                เติมเต็ม 40+ คน!
              </button>
            </div>
          </div>
        )}

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
              รายชื่อผู้เล่นที่เชื่อมต่ออยู่
            </span>
            <span className="px-2 py-0.5 bg-yellow-400 text-black text-xs font-ui font-extrabold rounded-none">
              {players.length} คน
            </span>
          </div>
          <span className="font-ui text-xs sm:text-sm text-gray-300 font-bold">
            รองรับสูงสุด 64 คน
          </span>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
          {players.map((p) => {
            const isMe = p.id === currentSocketId;
            return (
              <div
                key={p.id}
                className={`p-2 border-2 flex items-center gap-2 text-left truncate ${
                  isMe
                    ? 'border-yellow-400 bg-yellow-950/70 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                    : 'border-gray-700 bg-gray-900/60'
                }`}
              >
                <span className="text-xl sm:text-2xl shrink-0">
                  {AVATARS_ICON[p.avatar] || '🥊'}
                </span>
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
