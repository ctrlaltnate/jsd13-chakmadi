import React, { useState } from 'react';
import { soundService } from '../services/sound';
import { socketService } from '../services/socket';

const AVATARS = [
  { id: 0, name: 'Brawler', icon: '🥊' },
  { id: 1, name: 'Knight', icon: '⚔️' },
  { id: 2, name: 'Ninja', icon: '🥷' },
  { id: 3, name: 'Mage', icon: '🧙‍♂️' },
  { id: 4, name: 'Cyborg', icon: '🤖' },
  { id: 5, name: 'Pirate', icon: '🏴‍☠️' }
];

export default function JoinModal({ isOpen, onJoined }) {
  const [name, setName] = useState(() => localStorage.getItem('tug_player_name') || '');
  const [selectedAvatar, setSelectedAvatar] = useState(() => parseInt(localStorage.getItem('tug_player_avatar') || '0', 10));
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('กรุณาใส่ชื่อของคุณ! (ENTER YOUR NAME)');
      soundService.playWarning();
      return;
    }
    if (cleanName.length > 14) {
      setError('ชื่อยาวเกินไป (สูงสุด 14 ตัวอักษร)');
      soundService.playWarning();
      return;
    }

    soundService.playVictory();
    socketService.joinGame(cleanName, selectedAvatar);
    localStorage.setItem('tug_player_name', cleanName);
    localStorage.setItem('tug_player_avatar', selectedAvatar);
    onJoined({ name: cleanName, avatar: selectedAvatar });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xs">
      <div className="pixel-card w-full max-w-sm sm:max-w-md p-5 sm:p-6 bg-[#121626] text-center border-4 border-[#475569]">
        {/* Retro Header Tag */}
        <div className="inline-block px-3 py-1 mb-3 bg-amber-400 text-black text-xs font-bold uppercase tracking-wider pixel-border">
          INSERT COIN • พร้อมลงแข่ง
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-arcade text-white pixel-text-shadow mb-1">
          PLAYER SELECT
        </h2>
        <p className="font-ui text-base text-yellow-300 font-bold mb-5 tracking-wide">
          เลือกตัวละครและพิมพ์ชื่อของคุณเพื่อเข้าสู่สังเวียน!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-arcade text-white mb-2">
              SELECT CLASS / เลือกตัวละคร:
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
              <span className="text-gray-300">อาชีพ:</span>
              <span className="text-yellow-400 font-bold font-arcade text-[10px]">
                {AVATARS[selectedAvatar].name.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-arcade text-white mb-1.5">
              PLAYER NAME / ชื่อผู้เล่น:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="พิมพ์ชื่อของคุณที่นี่..."
              maxLength={14}
              autoFocus
              className="w-full px-4 py-3 bg-[#080b14] border-3 border-gray-600 focus:border-yellow-400 text-white font-ui font-bold text-lg tracking-wide outline-hidden text-center placeholder-gray-500 shadow-inner"
            />
            {error && (
              <p className="text-red-400 font-ui font-bold text-xs mt-1 text-center animate-bounce">
                {error}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 sm:py-4 text-base font-arcade pixel-btn pixel-btn-gold text-black font-extrabold tracking-wider cursor-pointer shadow-lg mt-2"
          >
            READY TO PULL! (เข้าเล่น)
          </button>
        </form>
      </div>
    </div>
  );
}
