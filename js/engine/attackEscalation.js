/**
 * GRIDSEC Grid Defender — Real-Time Attack Escalation Engine
 * 
 * Implements 4-Stage Scripted Cyber-Physical Attacks:
 * Stage 1: Reconnaissance (20s, amber badge, data quality dip)
 * Stage 2: Access (20s, manual override badge, hacker dialogue)
 * Stage 3: Execution (breaker trips / overload / FDIA)
 * Stage 4: Impact (cascade / outage / asset loss)
 */

window.AttackEscalationEngine = {
  state: {
    active: false,
    paused: false,
    currentAttack: null,
    stage: 0, // 0: None, 1: Recon, 2: Access, 3: Execution, 4: Impact
    stageTimeRemaining: 0,
    stageDuration: 20,
    intervalId: null,
    targetAsset: null,
    attackType: null, // 'TRIP', 'FDIA', 'CASCADE'
    difficulty: 'normal' // easy (1.5x time), normal (1.0x), hard (0.7x)
  },

  difficultyMultipliers: {
    easy: 1.5,
    normal: 1.0,
    hard: 0.75
  },

  init: function(onStageChangeCallback, onAttackTriggerCallback) {
    this.onStageChange = onStageChangeCallback || null;
    this.onAttackTrigger = onAttackTriggerCallback || null;
  },

  startAttack: function(config) {
    this.stopAttack();

    const mult = this.difficultyMultipliers[this.state.difficulty] || 1.0;
    const baseDuration = (config.stageDuration || 20) * mult;

    this.state.active = true;
    this.state.paused = false;
    this.state.currentAttack = config;
    this.state.targetAsset = config.targetAsset;
    this.state.targetId = config.targetId || null;
    this.state.attackType = config.attackType || 'TRIP';
    this.state.stage = 1;
    this.state.stageDuration = baseDuration;
    this.state.stageTimeRemaining = baseDuration;

    if (window.SoundEngine) {
      window.SoundEngine.play('alert');
    }

    this.notifyStage();
    this.startTimer();
  },

  startTimer: function() {
    if (this.state.intervalId) clearInterval(this.state.intervalId);

    this.state.intervalId = setInterval(() => {
      if (this.state.paused || !this.state.active) return;

      this.state.stageTimeRemaining -= 1;
      this.updateHud();

      if (this.state.stageTimeRemaining <= 0) {
        this.advanceStage();
      }
    }, 1000);
  },

  advanceStage: function() {
    if (this.state.stage === 1) {
      this.state.stage = 2;
      this.state.stageTimeRemaining = this.state.stageDuration;
      if (window.SoundEngine) window.SoundEngine.play('alert');
      this.notifyStage();
    } else if (this.state.stage === 2) {
      this.state.stage = 3;
      this.state.stageTimeRemaining = this.state.stageDuration;
      if (window.SoundEngine) window.SoundEngine.play('alarm');
      this.triggerExecution();
      this.notifyStage();
    } else if (this.state.stage === 3) {
      this.state.stage = 4;
      this.state.stageTimeRemaining = 0;
      if (window.SoundEngine) window.SoundEngine.play('fail');
      this.triggerImpact();
      this.notifyStage();
      this.stopAttack(false); // Stop interval but retain state
    }
  },

  neutralizeAttack: function(spentDp) {
    if (!this.state.active) return false;

    const preventedStage = this.state.stage;
    this.stopAttack();

    if (window.SoundEngine) {
      window.SoundEngine.play('success');
    }

    if (window.DefenderView && typeof window.DefenderView.logEvent === 'function') {
      window.DefenderView.logEvent(
        `[CYBER DEFENCE] Attack on ${this.state.targetAsset || 'grid asset'} successfully neutralized at Stage ${preventedStage}!`,
        'success'
      );
    }

    return true;
  },

  triggerExecution: function() {
    if (this.onAttackTrigger) {
      this.onAttackTrigger({
        stage: 3,
        type: this.state.attackType,
        target: this.state.targetAsset,
        targetId: this.state.targetId
      });
    }

    if (window.DefenderView && typeof window.DefenderView.logEvent === 'function') {
      window.DefenderView.logEvent(
        `[CRITICAL ALERT] Adversary reached STAGE 3 (EXECUTION) on ${this.state.targetAsset}! Breaker tripped!`,
        'danger'
      );
    }
  },

  triggerImpact: function() {
    if (this.onAttackTrigger) {
      this.onAttackTrigger({
        stage: 4,
        type: this.state.attackType,
        target: this.state.targetAsset
      });
    }

    if (window.DefenderView && typeof window.DefenderView.logEvent === 'function') {
      window.DefenderView.logEvent(
        `[BLACKOUT WARNING] STAGE 4 (IMPACT) - Cascading collapse triggered from uncontained breach at ${this.state.targetAsset}!`,
        'danger'
      );
    }
  },

  pause: function() {
    this.state.paused = true;
  },

  resume: function() {
    this.state.paused = false;
  },

  stopAttack: function(fullReset = true) {
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
      this.state.intervalId = null;
    }
    if (fullReset) {
      this.state.active = false;
      this.state.paused = false;
      this.state.currentAttack = null;
      this.state.stage = 0;
      this.state.stageTimeRemaining = 0;
      this.state.targetAsset = null;
    }
    this.updateHud();
  },

  notifyStage: function() {
    if (this.onStageChange) {
      this.onStageChange(this.getAttackInfo());
    }
    this.updateHud();
  },

  getAttackInfo: function() {
    return {
      active: this.state.active,
      stage: this.state.stage,
      timeRemaining: this.state.stageTimeRemaining,
      targetAsset: this.state.targetAsset,
      attackType: this.state.attackType,
      stageName: this.getStageName(this.state.stage)
    };
  },

  getStageName: function(stage) {
    switch (stage) {
      case 1: return 'Reconnaissance';
      case 2: return 'Access / Override';
      case 3: return 'Execution / Trip';
      case 4: return 'Impact / Collapse';
      default: return 'Normal Operations';
    }
  },

  updateHud: function() {
    const banner = document.getElementById('rtAttackBanner');
    if (!banner) return;

    if (!this.state.active || this.state.stage === 0) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'flex';
    banner.className = `rt-attack-banner stage-${this.state.stage}`;

    const stageLabel = document.getElementById('rtAttackStageLabel');
    if (stageLabel) {
      stageLabel.textContent = `STAGE ${this.state.stage}: ${this.getStageName(this.state.stage).toUpperCase()}`;
    }

    const timerLabel = document.getElementById('rtAttackTimer');
    if (timerLabel) {
      timerLabel.textContent = `${this.state.stageTimeRemaining}s`;
    }

    const targetLabel = document.getElementById('rtAttackTarget');
    if (targetLabel) {
      targetLabel.textContent = this.state.targetAsset ? `Target: ${this.state.targetAsset}` : '';
    }

    const progressBar = document.getElementById('rtAttackProgressBar');
    if (progressBar) {
      const pct = Math.max(0, Math.min(100, (this.state.stageTimeRemaining / this.state.stageDuration) * 100));
      progressBar.style.width = `${pct}%`;
    }
  }
};
