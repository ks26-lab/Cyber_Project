/**
 * GRIDSEC Grid Defender — Synthesized Web Audio Engine
 * Zero external audio files required — 100% offline, self-contained Web Audio API.
 */

window.SoundEngine = {
  ctx: null,
  muted: false,
  volume: 0.5,

  init: function() {
    try {
      const savedMute = localStorage.getItem('gridsec_sound_muted');
      if (savedMute !== null) {
        this.muted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('gridsec_sound_vol');
      if (savedVol !== null) {
        this.volume = parseFloat(savedVol) || 0.5;
      }
    } catch (e) {}
  },

  getContext: function() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  setMuted: function(val) {
    this.muted = !!val;
    try {
      localStorage.setItem('gridsec_sound_muted', this.muted ? 'true' : 'false');
    } catch (e) {}
    this.updateToggleUi();
  },

  toggleMute: function() {
    this.setMuted(!this.muted);
    return this.muted;
  },

  setVolume: function(val) {
    this.volume = Math.max(0, Math.min(1, val));
    try {
      localStorage.setItem('gridsec_sound_vol', this.volume.toString());
    } catch (e) {}
  },

  updateToggleUi: function() {
    const btns = document.querySelectorAll('.sound-toggle-btn');
    btns.forEach(btn => {
      if (this.muted) {
        btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        btn.classList.add('muted');
        btn.title = 'Unmute Sound';
      } else {
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        btn.classList.remove('muted');
        btn.title = 'Mute Sound';
      }
    });
  },

  play: function(type) {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(this.volume * 0.25, now);
      master.connect(ctx.destination);

      switch (type) {
        case 'click': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(master);
          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }

        case 'scan': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(350, now);
          osc.frequency.linearRampToValueAtTime(950, now + 0.12);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(master);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }

        case 'alert': {
          // Double beep
          [0, 0.12].forEach(offset => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(660, now + offset);
            gain.gain.setValueAtTime(0.18, now + offset);
            gain.gain.linearRampToValueAtTime(0.001, now + offset + 0.08);
            osc.connect(gain);
            gain.connect(master);
            osc.start(now + offset);
            osc.stop(now + offset + 0.08);
          });
          break;
        }

        case 'alarm': {
          // Urgent low-high siren pulse
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.linearRampToValueAtTime(840, now + 0.15);
          osc.frequency.linearRampToValueAtTime(420, now + 0.3);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.32);
          osc.connect(gain);
          gain.connect(master);
          osc.start(now);
          osc.stop(now + 0.32);
          break;
        }

        case 'reclose': {
          // Heavy relay switch / surge hum
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.connect(gain);
          gain.connect(master);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }

        case 'success': {
          // Harmonious triad: C5, E5, G5
          [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const start = now + (i * 0.08);
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.25, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
            osc.connect(gain);
            gain.connect(master);
            osc.start(start);
            osc.stop(start + 0.35);
          });
          break;
        }

        case 'fail': {
          // Descending minor chord
          [440, 392, 349.23, 293.66].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            const start = now + (i * 0.12);
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.25, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
            osc.connect(gain);
            gain.connect(master);
            osc.start(start);
            osc.stop(start + 0.25);
          });
          break;
        }
      }
    } catch (err) {
      console.warn('Audio playback suppressed:', err);
    }
  }
};

// Initialize upon first user interaction
window.addEventListener('click', function _initAudioOnFirstClick() {
  window.SoundEngine.init();
  window.SoundEngine.getContext();
  window.removeEventListener('click', _initAudioOnFirstClick);
}, { once: true });
