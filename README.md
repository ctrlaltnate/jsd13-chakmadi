# 🎮 Crowd Tug-of-War: Physics Edition (8-Bit Tournament)

A real-time retro 8-bit multiplayer elimination game built with **React**, **Vite**, **Tailwind CSS**, and **Socket.io**. Supports 2 to 50+ concurrent players who join via a shareable link or dynamic QR code, get split into **Team Red** vs **Team Blue**, and mash the giant **"PULL!"** button to tug the rope.

---

## 🏆 Key Features & Game Flow

### 1. Tournament Elimination Bracket
- **Dynamic Pool Size**: Supports up to 50+ players.
- **Easy Join**: Players join on phones or computers via invite link or QR Code generator.
- **Character Select**: Players enter their name and pick from 6 retro 8-bit avatars (Brawler, Knight, Ninja, Mage, Cyborg, Pirate).
- **Random Split**: In each round, active survivors are randomly partitioned into equal teams (**Team Red** vs **Team Blue**).
- **Elimination**: When the round timer expires (or when a knockout occurs by pulling the rope to maximum threshold), the **losing team is eliminated**.
- **Survivors Advance**: The winning team advances to the next round and is reshuffled again into Red vs Blue.
- **Grand 1v1 Final Showdown**: Repeats until only 2 players remain for the ultimate 1v1 title match!
- **Spectator Mode**: Eliminated players and newcomers can watch the match in real-time and use interactive **"CHEER RED 🔥"** and **"CHEER BLUE ⚡"** buttons to spur teams on with floating arena particles.

### 2. Anti-Bot & Anti-Autoclicker Protection
- **Server-Authoritative Rate Limiting**: Every pull request is checked on the central server against `lastPullTime`.
- **100ms Throttle**: Any click received with an interval `< 100ms` is rejected with `anti_bot_throttled`.
- **Spam Penalty**: Players who continuously spam faster than 100ms have their combo reset to 0 and trigger a cooldown warning.
- **Visual Client Warning**: Client displays a pulsing `"⚠️ ANTI-BOT: TOO FAST! MIN 100ms INTERVAL!"` alert and buzz sound effect.
- **Combo Multiplier**: Rewards rhythmic human tapping (120ms - 250ms cadence) with combo streaks.

### 3. Millisecond-Accurate Time Synchronization
- Client and server exchange high-precision timestamps (`sync_time` / `sync_time_reply`).
- Computes round-trip time ($RTT$) and clock offset:
  $$\text{Offset} = (\text{ServerTime} + \frac{RTT}{2}) - \text{ClientReceiveTime}$$
- Ensures every connected player starts and stops the round at the exact same millisecond.

### 4. Retro 8-Bit Audiovisual Experience
- **Retro Typography**: NES arcade style with Google Fonts (`Press Start 2P`, `VT323`).
- **Dynamic 8-Bit Canvas Physics Arena**:
  - Animated red and blue retro gladiators straining, pulling, and falling over upon defeat.
  - Catenary rope simulation with dynamic tension, sag, dust puffs, and center marker flag.
  - Mud pit / hazard trench in the middle.
- **Synthesized 8-Bit Audio (Pure Web Audio API)**:
  - Punchy square-wave pull creak sound.
  - Arcade countdown beeps (440Hz / 880Hz).
  - Descending 8-bit explosion for eliminations.
  - Classic 7-note victory fanfare arpeggio.
  - Retro chiptune background music loop toggle.
- **Mobile First Controller**: Giant, tactile retro "PULL!" button with depth bevel, mobile haptic vibration (`navigator.vibrate`), spark particles, floating popups, and screen shake.
- **Built-In Crowd Simulator (Test Bots)**: Host can add +5, +10, +20, or 40+ simulated bots with realistic human pull rhythms for instant solo testing of 50-player tournaments.

---

## 🚀 Running the Game

### Quick Start (Both Server & Client)
```bash
# Run server and client simultaneously
node run.js
```

Or run them individually:

#### Start Node.js Server:
```bash
node server/index.js
# Runs on http://localhost:3001
```

#### Start Vite Client:
```bash
cd client
npm run dev
# Runs on http://localhost:5173/ and network IP (e.g. http://192.168.0.x:5173/)
```

### Joining on Mobile Phones
1. Make sure your phone is connected to the same Wi-Fi network as your host computer.
2. In the lobby, click **"📱 SHOW QR"** or scan the QR code displayed on the host screen.
3. Type your player name and pick an avatar.
4. Enjoy real-time crowd tug-of-war!
