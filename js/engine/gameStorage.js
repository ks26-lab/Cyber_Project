/**
 * GRIDSEC Grid Defender — Game State & Save Persistence Manager
 * Manages player progression, level unlocking, high scores, stars, and user settings.
 */

window.GameStorage = {
  STORAGE_KEY: 'gridsec_defender_save_v1',
  SETTINGS_KEY: 'gridsec_defender_settings_v1',

  defaultState: {
    unlockedLevels: ['1'], // '1', '2', '3', '4A', '4B', '5'
    completedLevels: {},
    highScores: {},
    stars: {},
    lastPlayedLevel: '1',
    hasSeenIntro: false,
    stats: {
      totalPoints: 0,
      totalBreakersReclosed: 0,
      totalFdiaPrevented: 0,
      totalIslandsSaved: 0
    }
  },

  defaultSettings: {
    difficulty: 'normal', // easy, normal, hard
    soundMuted: false,
    soundVolume: 0.5,
    textSize: 'medium', // small, medium, large
    reducedMotion: false,
    colorBlindMode: 'none', // none, deuteranopia, protanopia, high-contrast
    autoShowDialogue: true,
    speechEnabled: false
  },

  loadState: function() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...this.defaultState, ...parsed };
      }
    } catch (e) {
      console.warn('Could not read GameStorage state:', e);
    }
    return { ...this.defaultState };
  },

  saveState: function(state) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not write GameStorage state:', e);
    }
  },

  loadSettings: function() {
    try {
      const raw = localStorage.getItem(this.SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...this.defaultSettings, ...parsed };
      }
    } catch (e) {}
    return { ...this.defaultSettings };
  },

  saveSettings: function(settings) {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
    this.applySettings(settings);
  },

  applySettings: function(settings) {
    const s = settings || this.loadSettings();
    const doc = document.documentElement;

    // Text size
    doc.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
    doc.classList.add(`text-size-${s.textSize || 'medium'}`);

    // Reduced motion
    if (s.reducedMotion) {
      doc.classList.add('reduced-motion');
    } else {
      doc.classList.remove('reduced-motion');
    }

    // Colorblind mode
    doc.classList.remove('cb-deuteranopia', 'cb-protanopia', 'cb-high-contrast');
    if (s.colorBlindMode && s.colorBlindMode !== 'none') {
      doc.classList.add(`cb-${s.colorBlindMode}`);
    }

    // Audio
    if (window.SoundEngine) {
      window.SoundEngine.setMuted(!!s.soundMuted);
      window.SoundEngine.setVolume(s.soundVolume !== undefined ? s.soundVolume : 0.5);
    }
  },

  recordLevelCompletion: function(levelKey, score, stars, stats) {
    const state = this.loadState();
    
    // Level unlock progression order
    const progression = ['1', '2', '3', '4A', '4B', '5'];
    const curIdx = progression.indexOf(levelKey);
    if (curIdx !== -1 && curIdx < progression.length - 1) {
      const nextLvl = progression[curIdx + 1];
      if (!state.unlockedLevels.includes(nextLvl)) {
        state.unlockedLevels.push(nextLvl);
      }
    }

    state.completedLevels[levelKey] = true;
    state.highScores[levelKey] = Math.max(state.highScores[levelKey] || 0, score);
    state.stars[levelKey] = Math.max(state.stars[levelKey] || 0, stars);

    if (stats) {
      if (stats.breakers) state.stats.totalBreakersReclosed += stats.breakers;
      if (stats.fdia) state.stats.totalFdiaPrevented += stats.fdia;
      if (stats.islands) state.stats.totalIslandsSaved += stats.islands;
    }

    state.stats.totalPoints = Object.values(state.highScores).reduce((a, b) => a + b, 0);
    this.saveState(state);
    return state;
  },

  isLevelUnlocked: function(levelKey) {
    const state = this.loadState();
    return state.unlockedLevels.includes(levelKey);
  },

  resetProgress: function() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {}
    return this.defaultState;
  }
};

// Initialize settings on page load
document.addEventListener('DOMContentLoaded', function() {
  window.GameStorage.applySettings();
});
