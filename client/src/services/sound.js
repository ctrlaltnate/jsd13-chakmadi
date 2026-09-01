// Pure Web Audio API 8-Bit Chiptune Sound Synthesizer
let audioCtx = null;
let bgmInterval = null;
let isMuted = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const soundService = {
  isMuted() {
    return isMuted;
  },

  toggleMute() {
    isMuted = !isMuted;
    if (isMuted && bgmInterval) {
      this.stopBGM();
    }
    return isMuted;
  },

  setMuted(muted) {
    isMuted = muted;
    if (isMuted && bgmInterval) {
      this.stopBGM();
    }
  },

  // 8-bit Pull / Tug Sound (Thump + low crunch)
  playPull() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  },

  // Countdown Beep (Low: 440Hz, High: 880Hz)
  playBeep(isHigh = false) {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(isHigh ? 880 : 440, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isHigh ? 0.35 : 0.15));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + (isHigh ? 0.35 : 0.15));
    } catch (e) {}
  },

  // Anti-bot flagged / error buzz
  playWarning() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.setValueAtTime(90, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  },

  // Elimination 8-Bit Explosion / Fall
  playElimination() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  },

  // Victory Fanfare Arpeggio
  playVictory() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      const noteLength = 0.12;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * noteLength);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * noteLength);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * noteLength + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * noteLength + noteLength);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * noteLength);
        osc.stop(ctx.currentTime + idx * noteLength + noteLength);
      });
    } catch (e) {}
  },

  // Cheer Bell / Star Ping
  playCheer() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime); // D6
      osc.frequency.setValueAtTime(1760.00, ctx.currentTime + 0.06); // A6

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  },

  // 8-bit Background Music loop
  startBGM() {
    if (isMuted || bgmInterval) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const bassPattern = [130.81, 130.81, 164.81, 196.00, 174.61, 164.81, 146.83, 196.00];
      let step = 0;

      bgmInterval = setInterval(() => {
        if (isMuted) return;
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(bassPattern[step % bassPattern.length], ctx.currentTime);

          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 0.18);
          step++;
        } catch (e) {}
      }, 240);
    } catch (e) {}
  },

  stopBGM() {
    if (bgmInterval) {
      clearInterval(bgmInterval);
      bgmInterval = null;
    }
  }
};
