import React, { useState, useEffect } from 'react';
import { socketService } from '../services/socket';
import { soundService } from '../services/sound';

const AVATARS = [
  { id: 0, name: 'Boxer (นักมวย)', icon: '🥊' },
  { id: 1, name: 'Diva (สาวสวย)', icon: '💁‍♀️' },
  { id: 2, name: 'Monkey (ลิงจ๋อ)', icon: '🐒' },
  { id: 3, name: 'Wizard (จอมเวทย์)', icon: '🧙‍♂️' },
  { id: 4, name: 'Robot (หุ่นยนต์)', icon: '🤖' },
  { id: 5, name: 'Llama (ลามะ)', icon: '🦙' }
];

export default function JoinModal({
  isOpen,
  onJoined,
  initialName = '',
  initialAvatar = 0,
  isEditing = false,
  onClose = null
}) {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [error, setError] = useState('');

  // Sync state whenever modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      const savedName = initialName || localStorage.getItem('tug_player_name') || '';
      const savedAvatar = typeof initialAvatar === 'number'
        ? initialAvatar
        : parseInt(localStorage.getItem('tug_player_avatar') || '0', 10);

      setName(savedName);
      setSelectedAvatar(savedAvatar);
      setError('');
    }
  }, [isOpen, initialName, initialAvatar]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('กรุณาพิมพ์ชื่อของคุณก่อน');
      soundService.playWarning();
      return;
    }
    if (cleanName.length > 14) {
      setError('ชื่อยาวเกินไป (สูงสุด 14 ตัวอักษร)');
      soundService.playWarning();
      return;
    }

    soundService.playVictory();

    if (isEditing) {
      socketService.updateProfile(cleanName, selectedAvatar);
    } else {
      socketService.joinGame(cleanName, selectedAvatar);
    }

    localStorage.setItem('tug_player_name', cleanName);
    localStorage.setItem('tug_player_avatar', selectedAvatar);

    if (onJoined) {
      onJoined({ name: cleanName, avatar: selectedAvatar });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xs">
      <div className="relative pixel-card w-full max-w-sm sm:max-w-md p-5 sm:p-6 bg-[#121626] text-center border-4 border-[#475569] shadow-2xl">
        {/* Close Button for Edit Mode */}
        {isEditing && onClose && (
          <button
            type="button"
            onClick={onClose}
            title="ปิดหน้าต่าง"
            className="absolute top-3 right-3 text-gray-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        )}

        {/* Retro Header Tag */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="px-2.5 py-1 bg-amber-400 text-black text-xs font-bold uppercase tracking-wider pixel-border">
            {isEditing ? 'PROFILE SETUP • แก้ไขโปรไฟล์' : 'INSERT COIN • พร้อมลงแข่ง'}
          </div>
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-arcade text-white pixel-text-shadow mb-1">
          {isEditing ? 'EDIT FIGHTER' : 'PLAYER SELECT'}
        </h2>
        <p className="font-ui text-sm sm:text-base text-yellow-300 font-bold mb-5 tracking-wide">
          {isEditing
            ? 'เลือกอวาตาร์และพิมพ์ชื่อใหม่ของคุณได้ตามต้องการ'
            : 'เลือกตัวละครและพิมพ์ชื่อของคุณเพื่อเข้าสู่สนามแข่งขัน!'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Avatar Selector (Cosmetic profile icon) */}
          <div>
            <label className="block text-xs font-arcade text-white mb-1.5">
              SELECT AVATAR / เลือกอวาตาร์ตัวละคร:
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(av.id);
                    soundService.playPull();
                  }}
                  className={`p-2 text-2xl sm:text-3xl transition-transform flex flex-col items-center justify-center cursor-pointer border-2 ${
                    selectedAvatar === av.id
                      ? 'border-yellow-400 bg-yellow-500/20 scale-110 shadow-[0_0_12px_rgba(250,204,21,0.8)]'
                      : 'border-gray-700 bg-gray-800/80 hover:border-gray-500'
                  }`}
                  title={av.name}
                >
                  <span>{av.icon}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center mt-1.5 text-xs font-ui">
              <span className="text-gray-300">อวาตาร์ที่เลือก:</span>
              <span className="text-yellow-400 font-bold font-arcade text-[10px]">
                {AVATARS[selectedAvatar].name.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-ui mt-0.5">
              * อวาตาร์เป็นเพียงรูปโปรไฟล์ ไม่มีผลต่อพลังดึง ทุกคนมีพลังเท่ากัน 100%
            </p>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-arcade text-white mb-1.5">
              FIGHTER NAME / ชื่อของคุณ:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="พิมพ์ชื่อของคุณ (สูงสุด 14 ตัว)..."
              maxLength={14}
              autoFocus
              className="w-full px-3 py-2 bg-[#090c14] border-2 border-gray-600 focus:border-yellow-400 text-white font-ui font-bold text-sm outline-hidden tracking-wide transition-colors shadow-inner"
            />
            {error && (
              <p className="text-red-400 text-xs font-bold mt-1 font-ui">
                {error}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 sm:py-4 text-base font-arcade pixel-btn pixel-btn-gold text-black font-extrabold tracking-wider cursor-pointer shadow-lg mt-2 hover:scale-101 transition-transform"
          >
            {isEditing ? '💾 บันทึกข้อมูล (SAVE PROFILE)' : 'READY TO PULL! (เข้าสู่สนามแข่ง)'}
          </button>
        </form>
      </div>
    </div>
  );
}
