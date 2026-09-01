import React, { useState } from 'react';
import { soundService } from '../services/sound';

export default function SettingsModal({
  isOpen,
  onClose,
  isMuted,
  onToggleMute,
  bgmActive,
  onToggleBgm,
  scanlines,
  onToggleScanlines,
  onOpenEditProfile,
  onLeaveGame,
  hasJoined = false
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const shareUrl = window.location.origin;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
    } catch (e) {}
    setCopied(true);
    soundService.playCheer();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs select-none">
      <div className="relative pixel-card w-full max-w-xs sm:max-w-sm p-5 bg-[#121626] text-center border-4 border-yellow-400 shadow-2xl space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          title="ปิดหน้าต่าง"
          className="absolute top-2.5 right-3 text-gray-400 hover:text-white text-xl font-bold p-1 cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="border-b-2 border-gray-700 pb-2">
          <div className="inline-block px-2.5 py-0.5 bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider pixel-border mb-1">
            PREFERENCES
          </div>
          <h2 className="font-arcade text-lg sm:text-xl text-white pixel-text-shadow">
            ⚙️ การตั้งค่าระบบ
          </h2>
        </div>

        {/* Options List */}
        <div className="space-y-2.5 text-left">
          {/* SFX Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-[#090c14] border-2 border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">{isMuted ? '🔇' : '🔊'}</span>
              <div>
                <div className="font-ui text-xs sm:text-sm font-bold text-white">เสียงเอฟเฟกต์ (SFX)</div>
                <div className="font-ui text-[10px] text-gray-400">เสียงดึง ปุ่มกด เสียงชนะ</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleMute}
              className={`px-3 py-1.5 text-xs font-ui font-extrabold pixel-btn cursor-pointer ${
                isMuted ? 'pixel-btn-red text-white' : 'pixel-btn-green text-white'
              }`}
            >
              {isMuted ? 'ปิดอยู่' : 'เปิดอยู่'}
            </button>
          </div>

          {/* BGM Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-[#090c14] border-2 border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎵</span>
              <div>
                <div className="font-ui text-xs sm:text-sm font-bold text-white">เพลงประกอบ (BGM)</div>
                <div className="font-ui text-[10px] text-gray-400">ดนตรี 8-bit เรโทร</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleBgm}
              className={`px-3 py-1.5 text-xs font-ui font-extrabold pixel-btn cursor-pointer ${
                bgmActive ? 'pixel-btn-gold text-black' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {bgmActive ? 'เปิดอยู่' : 'ปิดอยู่'}
            </button>
          </div>

          {/* CRT Scanlines Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-[#090c14] border-2 border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">📺</span>
              <div>
                <div className="font-ui text-xs sm:text-sm font-bold text-white">จอแก้วเรโทร (CRT)</div>
                <div className="font-ui text-[10px] text-gray-400">เส้นสแกนสไตล์ตู้เกม</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleScanlines}
              className={`px-3 py-1.5 text-xs font-ui font-extrabold pixel-btn cursor-pointer ${
                scanlines ? 'pixel-btn-gold text-black' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {scanlines ? 'เปิด' : 'ปิด'}
            </button>
          </div>

          {/* Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-2.5 pixel-btn pixel-btn-blue text-white text-xs sm:text-sm font-ui font-extrabold cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <span>{copied ? '✅' : '📋'}</span>
            <span>{copied ? 'คัดลอกลิงก์เรียบร้อยแล้ว!' : 'คัดลอกลิงก์เกม (COPY LINK)'}</span>
          </button>

          {/* Edit Profile Button */}
          {hasJoined && onOpenEditProfile && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditProfile();
              }}
              className="w-full py-2.5 pixel-btn bg-[#1e293b] hover:bg-[#334155] text-yellow-300 text-xs sm:text-sm font-ui font-extrabold cursor-pointer flex items-center justify-center gap-2 border border-gray-600"
            >
              <span>✏️</span>
              <span>แก้ไขชื่อและเปลี่ยนอวาตาร์</span>
            </button>
          )}

          {/* Leave Game Button */}
          {hasJoined && onLeaveGame && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLeaveGame();
              }}
              className="w-full py-2.5 pixel-btn pixel-btn-red text-white text-xs sm:text-sm font-ui font-extrabold cursor-pointer flex items-center justify-center gap-2 mt-1"
            >
              <span>🚪</span>
              <span>ออกจากเกม (LEAVE GAME)</span>
            </button>
          )}
        </div>

        {/* Close Modal Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 pixel-btn bg-gray-800 text-gray-300 hover:text-white text-xs font-ui font-bold cursor-pointer"
        >
          ปิดหน้าต่าง (CLOSE)
        </button>
      </div>
    </div>
  );
}
