import React, { useState } from 'react';
import { soundService } from '../services/sound';
import { socketService } from '../services/socket';

const AVATARS = [
  { id: 0, name: 'Brawler', icon: '🥊', color: 'bg-red-500' },
  { id: 1, name: 'Knight', icon: '⚔️', color: 'bg-blue-500' },
  { id: 2, name: 'Ninja', icon: '🥷', color: 'bg-purple-500' },
  { id: 3, name: 'Mage', icon: '🧙‍♂️', color: 'bg-indigo-500' },
  { id: 4, name: 'Cyborg', icon: '🤖', color: 'bg-emerald-500' },
  { id: 5, name: 'Pirate', icon: '🏴‍☠️', color: 'bg-amber-500' }
];

export default function JoinModal({ isOpen, onJoined }) {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('ENTER YOUR NAME!');
      soundService.playWarning();
      return;
    }
    if (cleanName.length > 14) {
      setError('MAX 14 CHARACTERS!');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="pixel-card w-full max-w-md p-6 bg-[#161a29] border-4 border-[#3b4261] text-center animate-scale-in">
        {/* Retro Header */}
        <div className="inline-block px-3 py-1 mb-4 bg-amber-500 text-black text-xs font-bold uppercase tracking-wider pixel-border">
          INSERT COIN TO JOIN
        </div>
        
        <h2 className="text-xl sm:text-2xl font-pixel text-yellow-400 mb-2 pixel-text-shadow">
          PLAYER SELECT
        </h2>
        <p className="font-retro text-lg text-gray-400 mb-6 tracking-wide">
          CHOOSE YOUR FIGHTER & ENTER THE ARENA
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-pixel text-gray-300 mb-3 text-left">
              SELECT AVATAR:
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
                  className={`p-2 rounded-none border-2 text-xl sm:text-2xl transition-all flex flex-col items-center justify-center cursor-pointer ${
                    selectedAvatar === av.id
                      ? 'border-yellow-400 bg-yellow-950/60 scale-110 shadow-[0_0_10px_rgba(250,204,21,0.6)]'
                      : 'border-gray-700 bg-gray-800/80 hover:border-gray-500'
                  }`}
                  title={av.name}
                >
                  <span>{av.icon}</span>
                </button>
              ))}
            </div>
            <p className="text-xs font-retro text-amber-300 mt-2 text-right">
              CLASS: {AVATARS[selectedAvatar].name.toUpperCase()}
            </p>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-pixel text-gray-300 mb-2 text-left">
              PLAYER NAME:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="YOUR_TAG"
              maxLength={14}
              autoFocus
              className="w-full px-4 py-3 bg-[#0a0c14] border-4 border-gray-600 focus:border-yellow-400 text-yellow-300 font-pixel text-sm tracking-wider outline-hidden text-center placeholder-gray-600"
            />
            {error && (
              <p className="text-red-400 font-pixel text-[10px] mt-2 animate-bounce">
                {error}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 text-sm font-pixel pixel-btn pixel-btn-gold text-black font-bold tracking-widest cursor-pointer"
          >
            READY TO PULL!
          </button>
        </form>
      </div>
    </div>
  );
}
