import React, { useState } from 'react';

export default function JoinRoomModal({ isOpen, onClose, onJoinRoom }) {
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    let clean = inputCode.trim();

    // Support pasted invite URLs like https://.../?room=JSD123
    if (clean.includes('room=')) {
      const match = clean.match(/room=([A-Za-z0-9_-]+)/i);
      if (match && match[1]) {
        clean = match[1];
      }
    }

    // Strip leading #
    if (clean.startsWith('#')) {
      clean = clean.slice(1);
    }

    // If user just typed 3 digits e.g. "888", auto-prepend "JSD"
    if (/^\d{3}$/.test(clean)) {
      clean = `JSD${clean}`;
    }

    clean = clean.toUpperCase().replace(/[^A-Z0-9_-]/g, '');

    if (!clean || clean.length < 4) {
      setErrorMsg('กรุณากรอกรหัสห้องให้ถูกต้อง (เช่น JSD123)');
      return;
    }

    setErrorMsg('');
    onJoinRoom(clean);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="pixel-card p-5 sm:p-6 bg-[#101426] text-center max-w-sm w-full border-4 border-yellow-400 shadow-2xl">
        <div className="flex items-center justify-between border-b-2 border-gray-700 pb-2 mb-3">
          <span className="font-arcade text-xs text-yellow-300">
            ENTER ROOM CODE
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <h3 className="font-arcade text-base sm:text-lg text-white mb-1">
          🔑 กดเข้าห้องแข่งขัน
        </h3>
        <p className="font-ui text-xs text-gray-300 mb-4">
          พิมพ์รหัสห้อง 6 ตัว (เช่น <strong className="text-yellow-400 font-arcade">JSD888</strong>) หรือวางลิงก์เชิญ
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value.toUpperCase());
                setErrorMsg('');
              }}
              placeholder="เช่น JSD888 หรือ 888"
              maxLength={30}
              autoFocus
              className="w-full px-3 py-2.5 bg-[#080a12] border-3 border-yellow-400 text-yellow-300 font-arcade text-center text-lg sm:text-xl tracking-widest outline-hidden shadow-inner uppercase"
            />
            {errorMsg && (
              <p className="font-ui text-xs text-red-400 font-bold mt-1.5">{errorMsg}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 pixel-btn bg-gray-700 hover:bg-gray-600 text-white font-ui font-extrabold text-xs cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 pixel-btn pixel-btn-gold text-black font-ui font-extrabold text-xs cursor-pointer"
            >
              🚀 เข้าห้อง (JOIN)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
