/**
 * GRIDSEC Grid Defender — Game Shell Controller
 * Complete State Machine and Screen Orchestrator
 */

window.GameShell = {
  currentScreen: 'title',
  activeLevel: '1',

  missions: [
    {
      id: '1',
      title: 'Prologue: Quiet Night',
      badge: 'LEVEL 1',
      desc: 'Probe the baseline 15-node grid topology. Detect healthy power routes to the Hospital and verify generator reachability.',
      algorithms: ['BFS Reachability', 'DFS Path Search'],
      dp: 60,
      difficulty: 'Introductory',
      unlocked: true
    },
    {
      id: '2',
      title: 'Chapter 1: Line Down',
      badge: 'LEVEL 2',
      desc: 'Corridor LINE-SUB1-SUB4 trips under high load. Compute the lowest-impedance alternate route via Dijkstra and verify AC feasibility.',
      algorithms: ['Dijkstra Shortest Path', 'AC Feasibility Check'],
      dp: 80,
      difficulty: 'Normal',
      unlocked: false
    },
    {
      id: '3',
      title: 'Chapter 2: The Weak Point',
      badge: 'LEVEL 3',
      desc: 'An adversary targets critical grid links. Find all articulation points and bridges via Tarjan, prioritize overloads, and prevent blackout.',
      algorithms: ['Tarjan Bridge-Finding', 'Max-Heap Priority Queue', 'DSU Islanding'],
      dp: 100,
      difficulty: 'Tense',
      unlocked: false
    },
    {
      id: '4A',
      title: 'Chapter 3: Unauthorized Trip',
      badge: 'LEVEL 4A',
      desc: 'Corridor LINE-SUB1-SUB4 trips without dispatch authorization. Investigate cause, evaluate feasibility, and restore service safely.',
      algorithms: ['Investigation & Tripped Relay Audit', 'Dijkstra Re-routing'],
      dp: 90,
      difficulty: 'Real-Time Threat',
      unlocked: false
    },
    {
      id: '4B',
      title: 'Chapter 4: Lying Numbers',
      badge: 'LEVEL 4B',
      desc: 'False Data Injection Attack (FDIA) injects fraudulent telemetry at Substation SUB-2. Distinguish real overloads from fake data using Chi-Square state estimation.',
      algorithms: ['Chi-Square Residual Test', 'State Estimation'],
      dp: 90,
      difficulty: 'Deceptive Threat',
      unlocked: false
    },
    {
      id: '5',
      title: 'Chapter 5: National Resilience',
      badge: 'LEVEL 5',
      desc: 'Coordinated simultaneous attack across regional corridors. Multi-stage attack escalation requiring all algorithms under time pressure.',
      algorithms: ['Tarjan', 'Dijkstra', 'DSU', 'Priority Queue', 'FDIA Filter'],
      dp: 140,
      difficulty: 'Expert Defcon 1',
      unlocked: false
    }
  ],

  glossary: [
    { term: 'BFS (Breadth-First Search)', tag: 'DSA', def: 'Explores vertices level-by-level using a FIFO queue. In power grids, identifies unweighted hop distance and verified energisation zones from generators.' },
    { term: 'DFS (Depth-First Search)', tag: 'DSA', def: 'Explores graph depth using recursion/stack. Used in grid protection for cycle detection, loop flow hazards, and island boundary traces.' },
    { term: 'Dijkstra with Min-Heap', tag: 'DSA', def: 'Finds optimal transmission routes minimising electrical reactance/impedance in O((V + E) log V) time.' },
    { term: 'Tarjan’s Bridge-Finding', tag: 'DSA', def: 'Identifies single lines whose failure partitions the grid into disconnected islands in a single O(V + E) DFS pass.' },
    { term: 'DSU (Disjoint Set Union)', tag: 'DSA', def: 'Maintains connected electrical components with near O(1) union and find operations, tracking live islands when lines trip.' },
    { term: 'FDIA (False Data Injection Attack)', tag: 'Cyber-Physical', def: 'A stealth cyberattack where sensor readings are spoofed to mislead grid operators into tripping healthy breakers.' },
    { term: 'State Estimation & Chi-Square', tag: 'Power Physics', def: 'Statistical verification comparing measurement residuals against physical power-flow laws (Kirchhoff’s laws) to detect sensor tampering.' },
    { term: 'SCADA (Supervisory Control and Data Acquisition)', tag: 'Grid Ops', def: 'Industrial control system network allowing remote monitoring and breaker operation across substations.' },
    { term: 'Islanding', tag: 'Grid Ops', def: 'A condition where a portion of the grid becomes isolated from the main synchronous grid, requiring localized frequency and load balancing.' },
    { term: 'Load Shedding', tag: 'Grid Ops', def: 'Deliberate controlled shutdown of non-essential consumers to protect generators and prevent catastrophic total grid collapse.' }
  ],

  init: function() {
    this.bindEvents();
    this.updateMissionSelectGrid();
    this.showScreen('title');

    // Init Attack Escalation
    if (window.AttackEscalationEngine) {
      window.AttackEscalationEngine.init(
        (info) => this.handleAttackStageChange(info),
        (event) => this.handleAttackTrigger(event)
      );
    }
  },

  bindEvents: function() {
    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Escape') {
        if (this.currentScreen === 'game') {
          this.togglePause();
        } else if (this.currentScreen === 'pause' || this.currentScreen === 'settings' || this.currentScreen === 'glossary') {
          this.closeModals();
        }
      } else if (e.code === 'KeyM') {
        if (window.SoundEngine) {
          window.SoundEngine.toggleMute();
        }
      } else if (e.key === '?') {
        this.openGlossary();
      }
    });
  },

  showScreen: function(screenId) {
    this.currentScreen = screenId;
    
    const screens = ['titleScreen', 'missionSelectScreen', 'gameScreen', 'introStoryScreen'];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const target = document.getElementById(`${screenId}Screen`);
    if (target) {
      target.style.display = 'flex';
    }

    if (screenId === 'missionSelect') {
      this.updateMissionSelectGrid();
    }
  },

  startNewGame: function() {
    if (window.SoundEngine) window.SoundEngine.play('click');
    this.loadMission('1');
  },

  resumeGame: function() {
    if (window.SoundEngine) window.SoundEngine.play('click');
    const state = window.GameStorage ? window.GameStorage.loadState() : { lastPlayedLevel: '1' };
    this.loadMission(state.lastPlayedLevel || '1');
  },

  openMissionSelect: function() {
    if (window.SoundEngine) window.SoundEngine.play('click');
    this.showScreen('missionSelect');
  },

  updateMissionSelectGrid: function() {
    const grid = document.getElementById('missionCardsGrid');
    if (!grid) return;

    const storage = window.GameStorage ? window.GameStorage.loadState() : { unlockedLevels: ['1'], highScores: {}, stars: {} };

    grid.innerHTML = this.missions.map(m => {
      const isUnlocked = storage.unlockedLevels ? storage.unlockedLevels.includes(m.id) : (m.id === '1');
      const score = storage.highScores ? (storage.highScores[m.id] || 0) : 0;
      const starCount = storage.stars ? (storage.stars[m.id] || 0) : 0;
      const starsHtml = '★'.repeat(starCount) + '☆'.repeat(3 - starCount);

      return `
        <div class="mission-card ${isUnlocked ? '' : 'locked'}" onclick="${isUnlocked ? `window.GameShell.loadMission('${m.id}')` : ''}">
          <div class="mission-card-top">
            <span class="mission-num-badge">${m.badge}</span>
            <span class="mission-stars">${starsHtml}</span>
          </div>
          <h3>${m.title}</h3>
          <p>${m.desc}</p>
          <div class="mission-dsa-pills">
            ${m.algorithms.map(a => `<span class="dsa-pill">${a}</span>`).join('')}
          </div>
          <div class="mission-card-bottom">
            <span style="color:var(--text-dim); font-size:0.75rem;">Budget: <strong style="color:#10b981;">${m.dp} DP</strong></span>
            <span style="font-family:var(--font-mono); font-size:0.8rem; color:${score > 0 ? '#38bdf8' : 'var(--text-dim)'};">
              ${score > 0 ? `High: ${score} pts` : 'Not Cleared'}
            </span>
          </div>
        </div>
      `;
    }).join('');
  },

  loadMission: function(levelId) {
    if (window.SoundEngine) window.SoundEngine.play('click');
    this.activeLevel = levelId;

    if (window.GameStorage) {
      const state = window.GameStorage.loadState();
      state.lastPlayedLevel = levelId;
      window.GameStorage.saveState(state);
    }

    this.showScreen('game');

    // Update HUD
    const titleEl = document.getElementById('hudMissionTitle');
    if (titleEl) {
      const m = this.missions.find(x => x.id === levelId);
      titleEl.textContent = m ? `${m.badge}: ${m.title}` : `Level ${levelId}`;
    }

    // Embed DefenderView
    const container = document.getElementById('defenderGameMount');
    if (container && window.DefenderView) {
      container.innerHTML = '';
      const gameDom = window.DefenderView.render();
      if (typeof gameDom === 'string') {
        container.innerHTML = gameDom;
      } else if (gameDom instanceof HTMLElement) {
        container.appendChild(gameDom);
      }
      
      // Initialize level in DefenderView
      if (typeof window.DefenderView.selectLevel === 'function') {
        const lvlNum = parseInt(levelId.replace(/[^\d]/g, ''), 10) || 1;
        const subLevel = levelId.includes('A') ? 'A' : (levelId.includes('B') ? 'B' : null);
        window.DefenderView.selectLevel(lvlNum, subLevel);
      }
    }

    // Connect Story dialogue
    this.triggerStoryDialogue('LEVEL_START');

    // Launch scripted real-time attack if applicable
    if (levelId === '4A') {
      if (window.AttackEscalationEngine) {
        window.AttackEscalationEngine.startAttack({
          targetAsset: 'Corridor LINE-SUB1-SUB4 (North Valley Link)',
          targetId: 'LINE-SUB1-SUB4',
          attackType: 'TRIP',
          stageDuration: 20
        });
      }
    } else if (levelId === '4B') {
      if (window.AttackEscalationEngine) {
        window.AttackEscalationEngine.startAttack({
          targetAsset: 'Substation SUB-2 SCADA Telemetry',
          targetId: 'SUB-2',
          attackType: 'FDIA',
          stageDuration: 25
        });
      }
    } else if (levelId === '5') {
      if (window.AttackEscalationEngine) {
        window.AttackEscalationEngine.startAttack({
          targetAsset: 'Corridor LINE-SUB1-SUB2 (Bulk Intertie)',
          targetId: 'LINE-SUB1-SUB2',
          attackType: 'CASCADE',
          stageDuration: 20
        });
      }
    } else {
      if (window.AttackEscalationEngine) {
        window.AttackEscalationEngine.stopAttack();
      }
    }
  },

  triggerStoryDialogue: function(trigger) {
    if (!window.StoryEngine) return;
    const s = (window.DefenderView && window.DefenderView.state) ? window.DefenderView.state : {};
    const d = window.StoryEngine.resolveDialogue(trigger, s);
    if (!d) return;

    const box = document.getElementById('storyDialogueMount');
    if (!box) return;

    const isOp = d.speaker === 'operator';
    box.innerHTML = `
      <div class="dialogue-bubble-box">
        <div class="dialogue-avatar ${isOp ? 'operator' : 'hacker'}">
          <i class="fa-solid ${isOp ? 'fa-user-shield' : 'fa-user-ninja'}"></i>
        </div>
        <div class="dialogue-content">
          <div class="dialogue-speaker ${isOp ? 'operator' : 'hacker'}">
            ${isOp ? 'Asha Rao (Grid Operator)' : 'NullCurrent (Adversary)'}
          </div>
          <div class="dialogue-text">${d.text}</div>
          ${d.actionPrompt ? `<div style="font-size:0.75rem; color:var(--accent-cyan); margin-top:4px;"><i class="fa-solid fa-angle-right"></i> ${d.actionPrompt}</div>` : ''}
        </div>
      </div>
    `;

    if (window.SoundEngine) {
      window.SoundEngine.play(isOp ? 'click' : 'alert');
    }
  },

  handleAttackStageChange: function(info) {
    if (info.stage === 2) {
      this.triggerStoryDialogue('HACKER_ATTACK_STEP');
    }
  },

  handleAttackTrigger: function(event) {
    if (event.stage === 3 && window.DefenderView) {
      if (event.type === 'TRIP') {
        const lineToTrip = event.targetId || 'LINE-SUB1-SUB4';
        window.DefenderView.tripBreaker(lineToTrip, false);
      }
    }
  },

  // Modals & Popups
  togglePause: function() {
    const modal = document.getElementById('pauseModal');
    if (!modal) return;
    const isPaused = modal.style.display === 'flex';
    if (isPaused) {
      modal.style.display = 'none';
      if (window.AttackEscalationEngine) window.AttackEscalationEngine.resume();
    } else {
      modal.style.display = 'flex';
      if (window.AttackEscalationEngine) window.AttackEscalationEngine.pause();
    }
  },

  openSettings: function() {
    if (window.SoundEngine) window.SoundEngine.play('click');
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'flex';
  },

  openGlossary: function() {
    if (window.SoundEngine) window.SoundEngine.play('click');
    const modal = document.getElementById('glossaryModal');
    if (!modal) return;
    modal.style.display = 'flex';
    this.renderGlossary();
  },

  openHowToPlay: function() {
    if (window.SoundEngine) window.SoundEngine.play('click');
    const modal = document.getElementById('howToPlayModal');
    if (modal) modal.style.display = 'flex';
  },

  closeModals: function() {
    const modals = document.querySelectorAll('.game-modal-overlay');
    modals.forEach(m => m.style.display = 'none');
    if (window.AttackEscalationEngine && this.currentScreen === 'game') {
      window.AttackEscalationEngine.resume();
    }
  },

  renderGlossary: function(query = '') {
    const container = document.getElementById('glossaryItemsList');
    if (!container) return;
    const q = query.toLowerCase().trim();

    const filtered = this.glossary.filter(item => 
      item.term.toLowerCase().includes(q) || 
      item.def.toLowerCase().includes(q) || 
      item.tag.toLowerCase().includes(q)
    );

    container.innerHTML = filtered.map(item => `
      <div style="background:var(--bg-card); padding:1rem; border-radius:8px; border:1px solid var(--border-dim); margin-bottom:0.75rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
          <h4 style="color:#fff; font-size:0.95rem;">${item.term}</h4>
          <span class="dsa-pill">${item.tag}</span>
        </div>
        <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.45;">${item.def}</p>
      </div>
    `).join('');
  },

  showDebrief: function(scoreData) {
    const modal = document.getElementById('debriefModal');
    if (!modal) return;

    if (window.SoundEngine) {
      window.SoundEngine.play(scoreData.stars > 0 ? 'success' : 'fail');
    }

    const starsHtml = '★'.repeat(scoreData.stars) + '☆'.repeat(3 - scoreData.stars);
    document.getElementById('debriefStars').innerHTML = starsHtml;
    document.getElementById('debriefTotalScore').textContent = `${scoreData.totalScore} / 1000`;
    document.getElementById('debriefGrade').textContent = `GRADE ${scoreData.grade}`;

    const outcomeEl = document.getElementById('debriefOutcome');
    if (outcomeEl) {
      const outcome = scoreData.outcomeState || (scoreData.totalScore >= 400 ? 'PASSED' : 'FAILED');
      outcomeEl.textContent = outcome;
      if (outcome === 'PASSED') outcomeEl.style.color = '#10b981';
      else if (outcome === 'COMPLETED WITH PENALTY') outcomeEl.style.color = '#f59e0b';
      else if (outcome === 'INCOMPLETE') outcomeEl.style.color = '#38bdf8';
      else outcomeEl.style.color = '#ef4444';
    }

    document.getElementById('scoreBreakdownService').textContent = `${scoreData.breakdown.service} / 400`;
    document.getElementById('scoreBreakdownDiagnosis').textContent = `${scoreData.breakdown.diagnosis} / 250`;
    document.getElementById('scoreBreakdownDp').textContent = `${scoreData.breakdown.dpEfficiency} / 150`;
    document.getElementById('scoreBreakdownSpeed').textContent = `${scoreData.breakdown.speed} / 100`;
    document.getElementById('scoreBreakdownAsset').textContent = `${scoreData.breakdown.assetProtection} / 100`;

    document.getElementById('debriefFeedback').textContent = scoreData.operatorFeedback || 'Mission completed.';

    // Save to storage if passed or completed with penalty
    if (window.GameStorage) {
      const isPass = (scoreData.outcomeState === 'PASSED' || scoreData.outcomeState === 'COMPLETED WITH PENALTY' || scoreData.totalScore >= 400);
      if (isPass) {
        window.GameStorage.recordLevelCompletion(this.activeLevel, scoreData.totalScore, scoreData.stars, scoreData.stats);
      }
    }

    modal.style.display = 'flex';
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.GameShell.init();
});
