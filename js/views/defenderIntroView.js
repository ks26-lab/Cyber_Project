/**
 * GRIDSEC — Grid Defender: Cinematic Storytelling & Entry Experience
 * 
 * Five Narrative Scenes:
 * 1. Regional Power Systems (5 Regional Electricity Boards: NR, WR, SR, ER, NER)
 * 2. Regional Interconnection (HVDC back-to-back links, wheeling, transmission capacity limits)
 * 3. The Unified National Synchronous Grid (Chronological milestones leading to 31 Dec 2013 Raichur-Solapur sync)
 * 4. The Risks of Interconnection (Loop flow, conductor thermal overloads, FDIA vs. physical outages, critical consumers)
 * 5. Your Mission ("Understand the grid. Detect the threat. Protect the power." -> Enter Grid Defender)
 * 
 * Controls & Features:
 * - Narration Audio (Web Speech Synthesis) with Mute/Unmute toggle
 * - Pause / Resume control
 * - Readable subtitles/captions always visible independently of audio
 * - Scene progress stepper (clickable Scene 1-5 indicators)
 * - Prominent "Skip Intro" button
 * - Seamless handoff to existing playable Grid Defender game with clean session state
 * - Reduced-motion accessibility support
 */

window.DefenderIntroView = {
  state: {
    currentScene: 1,
    isPlaying: true,
    isMuted: false,
    sceneTimer: null,
    speechActive: false,
    hasSpeechSupport: 'speechSynthesis' in window
  },

  scenes: [
    {
      id: 1,
      badge: "SCENE 1 / 5",
      title: "Regional Power Systems",
      subtitle: "The Five Regional Electricity Systems of India",
      narrative: "Imagine a country where electricity systems developed across different regions. Each region relied on its generation resources and transmission infrastructure to supply homes, industries and essential services.",
      pedagogicalConcept: "Regional generation mix (Himalayan Hydro, Central Coal, Coastal Nuclear, Desert Solar), high-voltage transmission, and isolated regional balancing.",
      durationMs: 14000,
      highlightRegions: ['NR', 'WR', 'SR', 'ER', 'NER'],
      activeCorridors: 'intra_regional',
      consumerImpacts: [
        { icon: 'fa-hospital', name: 'Hospitals', detail: 'Critical ICU & life-support power' },
        { icon: 'fa-train', name: 'Railways', detail: '25 kV AC traction sub-stations' },
        { icon: 'fa-industry', name: 'Industries', detail: 'Heavy manufacturing & smelters' },
        { icon: 'fa-house', name: 'Homes', detail: 'Urban & rural community distribution' }
      ]
    },
    {
      id: 2,
      badge: "SCENE 2 / 5",
      title: "Regional Interconnection",
      subtitle: "HVDC Corridors & Inter-Regional Electricity Wheeling",
      narrative: "As demand grew, transmission links increasingly enabled electricity exchanges between regions. Interconnection created new opportunities to balance supply and demand across a wider area.",
      pedagogicalConcept: "Asynchronous HVDC back-to-back links (Vindhyachal, Chandrapur, Gazuwaka, Sasaram) and transmission capacity constraints (thermal ampacity & stability limits).",
      durationMs: 14000,
      highlightRegions: ['NR', 'WR', 'SR', 'ER', 'NER'],
      activeCorridors: 'inter_regional_early',
      callout: "Transmission Capacity Limit: Conductor thermal rating (I²R) and transient stability strictly govern how much electricity a corridor can safely carry."
    },
    {
      id: 3,
      badge: "SCENE 3 / 5",
      title: "The Unified National Synchronous Grid",
      subtitle: "December 2013 Milestone: One Nation, One Grid, One Frequency (50 Hz)",
      narrative: "India's regional power systems became interconnected progressively over decades. In December 2013, the Southern Grid was synchronously interconnected with the rest of the Indian grid, marking a major milestone in the unified national synchronous grid.",
      pedagogicalConcept: "Milestones: Oct 1991 (ER-NER) → Mar 2003 (ER-WR) → Aug 2006 (NR-Central NEW Grid) → 31 Dec 2013 (Raichur-Solapur 765 kV synchronous link to Southern Grid).",
      durationMs: 15000,
      highlightRegions: ['NR', 'WR', 'SR', 'ER', 'NER'],
      activeCorridors: 'unified_national',
      milestoneDate: "31 DECEMBER 2013 · RAICHUR–SOLAPUR 765 kV",
      callout: "One Nation, One Grid, One Frequency: All 5 regions now operate synchronously at exactly 50.00 Hz, forming one of the largest synchronous electrical machines on Earth."
    },
    {
      id: 4,
      badge: "SCENE 4 / 5",
      title: "The Risks of Interconnection",
      subtitle: "Loop Flows, Cascading Overloads, and Cyber-Physical Threats",
      narrative: "Interconnection helps electricity move where it is needed, but disturbances can propagate through connected infrastructure. Operators must manage equipment failures, changing power flows, overloads and threats to control systems.",
      pedagogicalConcept: "N-1 contingency loop flow redistribution, conductor thermal sag, and telemetry deception (False Data Injection vs. physical breaker actuation).",
      durationMs: 15000,
      highlightRegions: ['NR', 'WR', 'SR', 'ER', 'NER'],
      activeCorridors: 'stressed_contingency',
      isIllustrativeScenario: true,
      callout: "Distinguish Threat Realities: Orange = Spoofed Telemetry (Physical plant normal, residual r = ||z - Hx|| exposed); Red = Actual Physical Outage (Circuit breaker opened)."
    },
    {
      id: 5,
      badge: "SCENE 5 / 5",
      title: "Your Mission",
      subtitle: "Grid Defender Tactical Command",
      narrative: "Now, you take control. Learn how the grid works, investigate incidents, make operating decisions and protect electricity supply.",
      pedagogicalConcept: "Interactive 5-level defense across AC power-flow physics, Dijkstra route discovery, thermal limits, and cyber telemetry verification.",
      durationMs: 999999, // Final scene stays until user clicks
      highlightRegions: ['NR', 'WR', 'SR', 'ER', 'NER'],
      activeCorridors: 'unified_national',
      isMissionScreen: true
    }
  ],

  render: function(app) {
    const s = this.state;
    const scene = this.scenes[s.currentScene - 1];

    return `
      <div class="view-container" style="padding:0.5rem 0;">
        <div class="defender-intro-wrapper">
          
          <!-- 1. Top Control-Room Bar -->
          <div class="intro-topbar">
            <!-- Brand & Scene Title -->
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <div style="background:#064e3b; border:1px solid #059669; border-radius:6px; padding:0.35rem 0.65rem; display:flex; align-items:center; gap:0.4rem;">
                <i class="fa-solid fa-shield-halved" style="color:#34d399; font-size:0.95rem;"></i>
                <strong style="color:#a7f3d0; font-size:0.8rem; letter-spacing:0.04em;">GRID DEFENDER</strong>
              </div>
              <div>
                <span class="badge badge-neutral" style="font-size:0.65rem; background:#1e293b; color:#94a3b8; border:1px solid #334155;">
                  ${scene.badge}
                </span>
                <span style="font-size:0.78rem; font-weight:700; color:#f8fafc; margin-left:6px;" id="introSceneTitleText">
                  ${scene.title}
                </span>
              </div>
            </div>

            <!-- Scene Stepper Indicator (Clickable Dots) -->
            <div class="intro-scene-stepper" role="tablist" aria-label="Scene Navigation">
              ${this.scenes.map((sc, idx) => `
                <div class="intro-scene-dot ${s.currentScene === sc.id ? 'active' : (s.currentScene > sc.id ? 'completed' : '')}"
                     onclick="window.DefenderIntroView.goToScene(${sc.id})"
                     title="${sc.title}"
                     role="button"
                     tabindex="0"
                     aria-label="Go to ${sc.title}">
                  ${sc.id}: ${sc.id === 1 ? 'Regional' : (sc.id === 2 ? 'Links' : (sc.id === 3 ? 'One Grid' : (sc.id === 4 ? 'Risks' : 'Mission')))}
                </div>
              `).join('')}
            </div>

            <!-- Playback & Audio Controls -->
            <div style="display:flex; align-items:center; gap:0.45rem;">
              <button class="btn btn-secondary btn-sm" onclick="window.DefenderIntroView.togglePlayPause()" style="background:#1e293b; color:#f8fafc; border:1px solid #334155; font-size:0.72rem;" title="${s.isPlaying ? 'Pause Story' : 'Resume Story'}">
                <i class="fa-solid ${s.isPlaying ? 'fa-pause' : 'fa-play'}" id="introPlayPauseIcon"></i>
                <span id="introPlayPauseText" style="margin-left:3px;">${s.isPlaying ? 'Pause' : 'Resume'}</span>
              </button>

              <button class="btn btn-secondary btn-sm" onclick="window.DefenderIntroView.toggleMute()" style="background:#1e293b; color:#f8fafc; border:1px solid #334155; font-size:0.72rem;" title="${s.isMuted ? 'Unmute Audio Narration' : 'Mute Audio Narration'}">
                <i class="fa-solid ${s.isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}" id="introMuteIcon" style="${s.isMuted ? 'color:#ef4444;' : 'color:#38bdf8;'}"></i>
                <span id="introMuteText" style="margin-left:3px;">${s.isMuted ? 'Muted' : 'Audio ON'}</span>
              </button>

              <button class="btn btn-secondary btn-sm" onclick="window.DefenderIntroView.enterGame()" style="background:#b91c1c; color:#ffffff; border:1px solid #ef4444; font-weight:700; font-size:0.72rem;" title="Skip Introduction and Enter Game">
                <i class="fa-solid fa-forward-step"></i> Skip Intro
              </button>
            </div>
          </div>

          <!-- 2. Central Cinematic Viewport (Map + Narrative Briefing) -->
          <div class="intro-viewport">
            
            <!-- Left: Interactive Animated SVG Transmission Map of India -->
            <div class="intro-map-canvas-container" id="introMapContainer">
              ${this.renderSvgMap(scene)}
            </div>

            <!-- Right: Dynamic Narrative Card & Historical Context -->
            <div style="display:flex; flex-direction:column; justify-content:space-between; gap:0.75rem;">
              
              <!-- Card: Scenario & Engineering Analysis -->
              <div style="background:rgba(15,23,42,0.85); border:1px solid #1e293b; border-radius:8px; padding:1rem; backdrop-filter:blur(6px);">
                
                <!-- Character-Driven Storytelling Stage -->
                ${this.renderCharacterStage(scene)}

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                  <span style="font-size:0.7rem; font-weight:800; text-transform:uppercase; color:#38bdf8; letter-spacing:0.04em;">
                    <i class="fa-solid fa-bolt-lightning"></i> National Power Engineering System
                  </span>
                  ${scene.isIllustrativeScenario ? `
                    <span class="badge" style="background:#450a0a; color:#fca5a5; border:1px solid #ef4444; font-size:0.65rem;">
                      <i class="fa-solid fa-triangle-exclamation"></i> Illustrative Scenario
                    </span>
                  ` : `
                    <span class="badge" style="background:#064e3b; color:#a7f3d0; border:1px solid #059669; font-size:0.65rem;">
                      <i class="fa-solid fa-check"></i> Verified Grid Architecture
                    </span>
                  `}
                </div>

                <h3 style="margin:0 0 0.4rem 0; font-size:1.1rem; color:#f8fafc; font-weight:800;">
                  ${scene.subtitle}
                </h3>

                <div style="font-size:0.8rem; color:#cbd5e1; line-height:1.55; margin-bottom:0.85rem;">
                  ${scene.narrative}
                </div>

                <!-- Concept Callout -->
                <div style="background:#0b1324; border-left:3px solid #0284c7; border-radius:4px; padding:0.65rem 0.75rem; margin-bottom:0.75rem;">
                  <div style="font-size:0.68rem; font-weight:800; text-transform:uppercase; color:#38bdf8; margin-bottom:2px;">
                    <i class="fa-solid fa-graduation-cap"></i> Power System Learning Objective:
                  </div>
                  <div style="font-size:0.75rem; color:#e2e8f0; line-height:1.45;">
                    ${scene.pedagogicalConcept}
                  </div>
                </div>

                <!-- Callout Banner if scene defines it -->
                ${scene.callout ? `
                  <div style="background:${scene.id === 4 ? '#450a0a' : '#052e16'}; border:1px solid ${scene.id === 4 ? '#ef4444' : '#16a34a'}; border-radius:6px; padding:0.6rem 0.75rem; font-size:0.73rem; color:${scene.id === 4 ? '#fecaca' : '#bbf7d0'}; line-height:1.4;">
                    <i class="fa-solid ${scene.id === 4 ? 'fa-triangle-exclamation' : 'fa-award'}"></i>
                    <strong>${scene.id === 4 ? 'Contingency Notice:' : 'Historical Milestone:'}</strong> ${scene.callout}
                  </div>
                ` : ''}

                <!-- Consumer Impacts in Scene 1 & Scene 4 -->
                ${(scene.id === 1 || scene.id === 4) ? `
                  <div style="margin-top:0.85rem; border-top:1px dashed #334155; padding-top:0.65rem;">
                    <div style="font-size:0.68rem; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:0.4rem;">
                      Connected Essential Public Services:
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.45rem;">
                      <div style="background:#0f172a; border:1px solid #1e293b; border-radius:4px; padding:4px 6px; font-size:0.7rem; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-hospital" style="color:#ef4444;"></i>
                        <div><strong>Hospitals</strong><div style="font-size:0.62rem; color:#94a3b8;">ICU &amp; surgical bays</div></div>
                      </div>
                      <div style="background:#0f172a; border:1px solid #1e293b; border-radius:4px; padding:4px 6px; font-size:0.7rem; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-train" style="color:#38bdf8;"></i>
                        <div><strong>Railways</strong><div style="font-size:0.62rem; color:#94a3b8;">25 kV electric traction</div></div>
                      </div>
                      <div style="background:#0f172a; border:1px solid #1e293b; border-radius:4px; padding:4px 6px; font-size:0.7rem; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-industry" style="color:#fbbf24;"></i>
                        <div><strong>Industries</strong><div style="font-size:0.62rem; color:#94a3b8;">Manufacturing &amp; refineries</div></div>
                      </div>
                      <div style="background:#0f172a; border:1px solid #1e293b; border-radius:4px; padding:4px 6px; font-size:0.7rem; display:flex; align-items:center; gap:6px;">
                        <i class="fa-solid fa-house" style="color:#4ade80;"></i>
                        <div><strong>Homes</strong><div style="font-size:0.62rem; color:#94a3b8;">1.4B national citizens</div></div>
                      </div>
                    </div>
                  </div>
                ` : ''}

              </div>

              <!-- Scene 5 Mission Briefing Card -->
              ${scene.isMissionScreen ? `
                <div style="background:linear-gradient(135deg, rgba(6,78,59,0.95) 0%, rgba(15,23,42,0.95) 100%); border:1px solid #059669; border-radius:8px; padding:1.15rem; box-shadow:0 10px 25px rgba(5,150,105,0.25);">
                  <div style="text-align:center; margin-bottom:0.85rem;">
                    <div style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:#6ee7b7; font-weight:800;">
                      GRIDSEC NATIONAL GRID COMMAND
                    </div>
                    <h2 style="margin:0.2rem 0; font-size:1.35rem; color:#ffffff; font-weight:900; letter-spacing:0.02em;">
                      GRID DEFENDER
                    </h2>
                    <div style="font-size:0.82rem; color:#e2e8f0; font-style:italic;">
                      "Understand the grid. Detect the threat. Protect the power."
                    </div>
                  </div>

                  <!-- 5 Progressive Levels Preview List -->
                  <div style="font-size:0.72rem; background:rgba(0,0,0,0.3); border-radius:6px; padding:0.6rem 0.85rem; margin-bottom:1rem; display:flex; flex-direction:column; gap:4px;">
                    <div><strong style="color:#34d399;">Level 1:</strong> Keep the Lights On (Demand Surge &amp; Redispatch)</div>
                    <div><strong style="color:#38bdf8;">Level 2:</strong> Broken Transmission Line (Dijkstra Bypass &amp; AC Feasibility)</div>
                    <div><strong style="color:#fbbf24;">Level 3:</strong> Prevent the Cascade (Thermal Capacity &amp; Load Shedding)</div>
                    <div><strong style="color:#f87171;">Level 4:</strong> Cyberattack (Breaker Tampering vs. False Data Injection)</div>
                    <div><strong style="color:#c084fc;">Level 5:</strong> National Grid Resilience (6-Turn Multi-Threat Defense)</div>
                  </div>

                  <!-- Prominent Mission Action Buttons -->
                  <div style="display:flex; flex-direction:column; gap:0.5rem;">
                    <button class="btn btn-primary intro-enter-btn-glow" onclick="window.DefenderIntroView.enterGame()" style="padding:0.8rem; font-size:0.92rem; justify-content:center; cursor:pointer;">
                      <i class="fa-solid fa-play"></i> ENTER GRID DEFENDER
                    </button>
                    <button class="btn btn-secondary" onclick="window.DefenderIntroView.startIntro()" style="background:#1e293b; color:#cbd5e1; border:1px solid #334155; font-size:0.75rem; justify-content:center;">
                      <i class="fa-solid fa-rotate-left"></i> Replay Story from Scene 1
                    </button>
                  </div>
                </div>
              ` : `
                <!-- Navigation Between Scenes 1-4 -->
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(15,23,42,0.85); border:1px solid #1e293b; border-radius:6px; padding:0.65rem 0.85rem;">
                  <button class="btn btn-secondary btn-sm" onclick="window.DefenderIntroView.prevScene()" ${s.currentScene === 1 ? 'disabled style="opacity:0.4;"' : ''}>
                    <i class="fa-solid fa-chevron-left"></i> Previous
                  </button>

                  <span style="font-size:0.75rem; color:#94a3b8; font-family:var(--font-mono);">
                    Scene ${s.currentScene} of 5
                  </span>

                  <button class="btn btn-primary btn-sm" onclick="window.DefenderIntroView.nextScene()" style="background:#0284c7; border-color:#38bdf8; font-weight:700;">
                    Next Scene <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              `}

            </div>

          </div>

          <!-- 3. Bottom Subtitle / Caption Ticker -->
          <div class="intro-caption-bar">
            <div style="font-size:0.75rem; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em; white-space:nowrap;">
              <i class="fa-solid fa-closed-captioning"></i> Subtitles:
            </div>
            <div class="intro-caption-text" id="introSubtitleText">
              ${scene.narrative}
            </div>
            <div style="font-size:0.7rem; color:#64748b; font-family:var(--font-mono); white-space:nowrap;">
              [Press <strong>Space</strong> to Pause · <strong>Esc</strong> to Skip]
            </div>
          </div>

        </div>
      </div>
    `;
  },

  // Render High-Resolution SVG Transmission Map of India
  renderCharacterStage: function(scene) {
    if (!window.getCharacterImgHtml) return '';
    if (scene.id === 1) {
      return `
        <div class="intro-character-stage">
          <div class="intro-char-hero-img-box operator-hero">
            ${window.getCharacterImgHtml('operator', 'char-hero-img', 'width:100%; height:100%; object-fit:cover; object-position:65% 25%;')}
          </div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:4px;">
              <span class="badge" style="background:#064e3b; color:#a7f3d0; border:1px solid #059669; font-size:0.68rem; font-weight:800;">
                <i class="fa-solid fa-user-shield"></i> GRID OPERATOR &middot; MENTOR
              </span>
            </div>
            <div style="font-size:0.82rem; color:#f8fafc; font-style:italic; line-height:1.45;">
              "Before we defend the grid, we need to understand it. Every connection, substation and transmission corridor plays a role."
            </div>
          </div>
        </div>
      `;
    } else if (scene.id === 2 || scene.id === 3) {
      return `
        <div class="intro-character-stage">
          <div class="intro-char-hero-img-box operator-hero">
            ${window.getCharacterImgHtml('operator', 'char-hero-img', 'width:100%; height:100%; object-fit:cover; object-position:65% 25%;')}
          </div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:4px;">
              <span class="badge" style="background:#064e3b; color:#a7f3d0; border:1px solid #059669; font-size:0.68rem; font-weight:800;">
                <i class="fa-solid fa-user-shield"></i> GRID OPERATOR &middot; MENTOR
              </span>
            </div>
            <div style="font-size:0.82rem; color:#f8fafc; font-style:italic; line-height:1.45;">
              "As regional networks connected, power began flowing synchronously across the nation. Today, 50.00 Hz binds the entire subcontinent into a unified machine."
            </div>
          </div>
        </div>
      `;
    } else if (scene.id === 4) {
      return `
        <div class="intro-character-stage" style="border-color:#ef4444; background:rgba(23,10,10,0.92);">
          <div class="intro-char-hero-img-box hacker-hero">
            ${window.getCharacterImgHtml('hacker', 'char-hero-img', 'width:100%; height:100%; object-fit:contain; padding:4px;')}
          </div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:4px;">
              <span class="badge" style="background:#450a0a; color:#fca5a5; border:1px solid #ef4444; font-size:0.68rem; font-weight:800;">
                <i class="fa-solid fa-user-ninja"></i> CYBER ADVERSARY &middot; ANTAGONIST
              </span>
            </div>
            <div style="font-size:0.82rem; color:#fecaca; font-style:italic; line-height:1.45;">
              "An interconnected grid is powerful. But what happens when an important connection fails — or the information operators rely on becomes unreliable?"
            </div>
          </div>
        </div>
      `;
    } else if (scene.id === 5) {
      return `
        <div class="intro-character-stage">
          <div class="intro-char-hero-img-box operator-hero">
            ${window.getCharacterImgHtml('operator', 'char-hero-img', 'width:100%; height:100%; object-fit:cover; object-position:65% 25%;')}
          </div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:4px;">
              <span class="badge" style="background:#064e3b; color:#a7f3d0; border:1px solid #059669; font-size:0.68rem; font-weight:800;">
                <i class="fa-solid fa-user-shield"></i> GRID OPERATOR &middot; MENTOR
              </span>
            </div>
            <div style="font-size:0.82rem; color:#f8fafc; font-style:italic; line-height:1.45;">
              "That's why we investigate the network, understand its structure and verify the consequences before making decisions. Understand the Grid. Master the Algorithms. Protect the Power."
            </div>
          </div>
        </div>
      `;
    }
    return '';
  },

  renderSvgMap: function(scene) {
    const isScene1 = scene.id === 1;
    const isScene2 = scene.id === 2;
    const isScene3 = scene.id === 3;
    const isScene4 = scene.id === 4;
    const isScene5 = scene.id === 5;

    // Projected Major Indian Substation Coordinates (SVG ViewBox 0 0 800 680)
    // Formula: x = 80 + (lon - 68)/30 * 640; y = 40 + (37 - lat)/30 * 620
    const hubs = {
      // Northern Region (NR)
      salal: { x: 225, y: 120, name: 'Salal Hydro', region: 'NR', type: 'hydro' },
      bhadla: { x: 165, y: 236, name: 'Bhadla Solar', region: 'NR', type: 'solar' },
      delhi: { x: 276, y: 214, name: 'Delhi NCR Hub', region: 'NR', type: 'substation' },
      agra: { x: 293, y: 242, name: 'Agra 765kV', region: 'NR', type: 'substation' },
      rihand: { x: 395, y: 308, name: 'Rihand Super Thermal', region: 'NR', type: 'thermal' },

      // Western Region (WR)
      vindhyachal: { x: 393, y: 306, name: 'Vindhyachal HVDC', region: 'WR', type: 'hvdc' },
      korba: { x: 393, y: 344, name: 'Korba/Raigarh Hub', region: 'WR', type: 'thermal' },
      mumbai: { x: 182, y: 412, name: 'Mumbai Substation', region: 'WR', type: 'substation' },
      solapur: { x: 249, y: 439, name: 'Solapur 765kV', region: 'WR', type: 'substation' },

      // Southern Region (SR)
      raichur: { x: 278, y: 470, name: 'Raichur 765kV', region: 'SR', type: 'substation' },
      ramagundam: { x: 325, y: 418, name: 'Ramagundam Thermal', region: 'SR', type: 'thermal' },
      bengaluru: { x: 283, y: 538, name: 'Bengaluru Feeder', region: 'SR', type: 'substation' },
      chennai: { x: 340, y: 536, name: 'Chennai Super Hub', region: 'SR', type: 'substation' },
      kudankulam: { x: 287, y: 635, name: 'Kudankulam Nuclear', region: 'SR', type: 'nuclear' },

      // Eastern Region (ER)
      rourkela: { x: 438, y: 346, name: 'Rourkela 400kV', region: 'ER', type: 'substation' },
      talcher: { x: 447, y: 372, name: 'Talcher STPS', region: 'ER', type: 'thermal' },
      kolkata: { x: 513, y: 340, name: 'Kolkata Grid Hub', region: 'ER', type: 'substation' },
      sasaram: { x: 422, y: 289, name: 'Sasaram HVDC', region: 'ER', type: 'hvdc' },

      // North-Eastern Region (NER)
      bongaigaon: { x: 560, y: 256, name: 'Bongaigaon Hub', region: 'NER', type: 'substation' },
      guwahati: { x: 586, y: 265, name: 'Guwahati Substation', region: 'NER', type: 'substation' }
    };

    return `
      <svg class="intro-svg-map" viewBox="0 0 800 680" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Regional Glow Filters -->
          <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glowOrange" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Base Silhouette of India -->
        <g id="indiaSilhouette" opacity="0.6">
          <!-- Approximate Boundary Contour -->
          <polygon points="
            225,80 250,90 280,110 320,130 310,170 300,210 370,260 410,270 470,270 540,240 590,230 630,240 640,270 600,290 550,290 510,330 470,390 440,430 380,500 350,560 300,640 280,640 250,580 230,500 190,450 160,420 150,370 140,300 130,270 150,240 180,210 200,160 220,110
          " fill="#080e1a" stroke="#1e293b" stroke-width="1.5" />
        </g>

        <!-- 5 Region Colored Overlays (Scene 1-5 progressive illumination) -->
        <g id="regionsLayer">
          <!-- 1. Northern Region (NR) -->
          <polygon points="140,270 180,210 200,160 225,80 280,110 320,130 370,260 300,260 170,270"
                   fill="#0284c7" fill-opacity="${isScene1 ? '0.18' : '0.12'}" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="4,4" />
          <text x="230" y="180" fill="#38bdf8" font-size="11" font-weight="800" letter-spacing="1">NORTHERN REGION (NR)</text>

          <!-- 2. Western Region (WR) -->
          <polygon points="140,270 300,260 395,308 393,390 270,440 180,430 150,370"
                   fill="#ea580c" fill-opacity="${isScene1 ? '0.18' : '0.12'}" stroke="#fb923c" stroke-width="1.2" stroke-dasharray="4,4" />
          <text x="210" y="360" fill="#fb923c" font-size="11" font-weight="800" letter-spacing="1">WESTERN REGION (WR)</text>

          <!-- 3. Southern Region (SR) -->
          <polygon points="180,430 270,440 393,420 370,530 300,640 250,580 200,500"
                   fill="#16a34a" fill-opacity="${isScene1 ? '0.18' : '0.12'}" stroke="#4ade80" stroke-width="1.2" stroke-dasharray="4,4" />
          <text x="240" y="550" fill="#4ade80" font-size="11" font-weight="800" letter-spacing="1">SOUTHERN REGION (SR)</text>

          <!-- 4. Eastern Region (ER) -->
          <polygon points="370,260 470,270 520,340 450,420 393,344 395,308"
                   fill="#7c3aed" fill-opacity="${isScene1 ? '0.18' : '0.12'}" stroke="#a78bfa" stroke-width="1.2" stroke-dasharray="4,4" />
          <text x="430" y="325" fill="#a78bfa" font-size="11" font-weight="800" letter-spacing="1">EASTERN (ER)</text>

          <!-- 5. North-Eastern Region (NER) -->
          <polygon points="540,240 640,240 630,290 560,290 540,260"
                   fill="#db2777" fill-opacity="${isScene1 ? '0.18' : '0.12'}" stroke="#f472b6" stroke-width="1.2" stroke-dasharray="4,4" />
          <text x="560" y="235" fill="#f472b6" font-size="10" font-weight="800" letter-spacing="1">NER</text>
        </g>

        <!-- Intra-Regional Transmission Corridors (Scene 1+) -->
        <g id="intraCorridors" stroke="#0284c7" stroke-width="2" opacity="0.8">
          <!-- NR Internal -->
          <line x1="${hubs.salal.x}" y1="${hubs.salal.y}" x2="${hubs.delhi.x}" y2="${hubs.delhi.y}" class="corridor-pulse-active" />
          <line x1="${hubs.bhadla.x}" y1="${hubs.bhadla.y}" x2="${hubs.delhi.x}" y2="${hubs.delhi.y}" class="corridor-pulse-active" />
          <line x1="${hubs.delhi.x}" y1="${hubs.delhi.y}" x2="${hubs.agra.x}" y2="${hubs.agra.y}" class="corridor-pulse-active" />
          <line x1="${hubs.agra.x}" y1="${hubs.agra.y}" x2="${hubs.rihand.x}" y2="${hubs.rihand.y}" class="corridor-pulse-active" />

          <!-- WR Internal -->
          <line x1="${hubs.vindhyachal.x}" y1="${hubs.vindhyachal.y}" x2="${hubs.korba.x}" y2="${hubs.korba.y}" stroke="#ea580c" class="corridor-pulse-active" />
          <line x1="${hubs.korba.x}" y1="${hubs.korba.y}" x2="${hubs.mumbai.x}" y2="${hubs.mumbai.y}" stroke="#ea580c" class="corridor-pulse-active" />
          <line x1="${hubs.mumbai.x}" y1="${hubs.mumbai.y}" x2="${hubs.solapur.x}" y2="${hubs.solapur.y}" stroke="#ea580c" class="corridor-pulse-active" />

          <!-- SR Internal -->
          <line x1="${hubs.ramagundam.x}" y1="${hubs.ramagundam.y}" x2="${hubs.chennai.x}" y2="${hubs.chennai.y}" stroke="#16a34a" class="corridor-pulse-active" />
          <line x1="${hubs.chennai.x}" y1="${hubs.chennai.y}" x2="${hubs.bengaluru.x}" y2="${hubs.bengaluru.y}" stroke="#16a34a" class="corridor-pulse-active" />
          <line x1="${hubs.bengaluru.x}" y1="${hubs.bengaluru.y}" x2="${hubs.kudankulam.x}" y2="${hubs.kudankulam.y}" stroke="#16a34a" class="corridor-pulse-active" />
          <line x1="${hubs.ramagundam.x}" y1="${hubs.ramagundam.y}" x2="${hubs.raichur.x}" y2="${hubs.raichur.y}" stroke="#16a34a" class="corridor-pulse-active" />

          <!-- ER Internal -->
          <line x1="${hubs.sasaram.x}" y1="${hubs.sasaram.y}" x2="${hubs.talcher.x}" y2="${hubs.talcher.y}" stroke="#a78bfa" class="corridor-pulse-active" />
          <line x1="${hubs.talcher.x}" y1="${hubs.talcher.y}" x2="${hubs.kolkata.x}" y2="${hubs.kolkata.y}" stroke="#a78bfa" class="corridor-pulse-active" />
          <line x1="${hubs.rourkela.x}" y1="${hubs.rourkela.y}" x2="${hubs.kolkata.x}" y2="${hubs.kolkata.y}" stroke="#a78bfa" class="corridor-pulse-active" />

          <!-- NER Internal -->
          <line x1="${hubs.bongaigaon.x}" y1="${hubs.bongaigaon.y}" x2="${hubs.guwahati.x}" y2="${hubs.guwahati.y}" stroke="#f472b6" class="corridor-pulse-active" />
        </g>

        <!-- Inter-Regional Early Corridors (Scene 2+) -->
        ${!isScene1 ? `
          <g id="interRegionalCorridors" stroke="#38bdf8" stroke-width="2.8" opacity="0.95">
            <!-- WR-NR (Vindhyachal HVDC) -->
            <line x1="${hubs.rihand.x}" y1="${hubs.rihand.y}" x2="${hubs.vindhyachal.x}" y2="${hubs.vindhyachal.y}" stroke="#38bdf8" class="corridor-pulse-fast" />
            <!-- ER-WR (Rourkela - Raipur) -->
            <line x1="${hubs.rourkela.x}" y1="${hubs.rourkela.y}" x2="${hubs.korba.x}" y2="${hubs.korba.y}" stroke="#38bdf8" class="corridor-pulse-fast" />
            <!-- ER-NER (Malda - Bongaigaon) -->
            <line x1="${hubs.kolkata.x}" y1="${hubs.kolkata.y}" x2="${hubs.bongaigaon.x}" y2="${hubs.bongaigaon.y}" stroke="#f472b6" class="corridor-pulse-fast" />
            <!-- ER-NR (Sasaram HVDC) -->
            <line x1="${hubs.sasaram.x}" y1="${hubs.sasaram.y}" x2="${hubs.agra.x}" y2="${hubs.agra.y}" stroke="#38bdf8" class="corridor-pulse-fast" />
          </g>
        ` : ''}

        <!-- Scene 3 Milestone Highlight: The Raichur-Solapur 765 kV Synchronous Interconnection -->
        ${(isScene3 || isScene5) ? `
          <g id="solapurRaichurSyncMilestone">
            <!-- Pulsing Synchronous Corridor -->
            <line x1="${hubs.solapur.x}" y1="${hubs.solapur.y}" x2="${hubs.raichur.x}" y2="${hubs.raichur.y}"
                  stroke="#22c55e" stroke-width="5" filter="url(#glowCyan)" class="corridor-pulse-fast" />
            <!-- Synchronous Connection Rings -->
            <circle cx="263" cy="454" r="8" fill="none" stroke="#22c55e" stroke-width="2" class="node-pulse-ring" />
            <!-- Badge Label -->
            <rect x="200" y="480" width="165" height="20" rx="4" fill="#064e3b" stroke="#22c55e" stroke-width="1" />
            <text x="282" y="494" fill="#a7f3d0" font-size="9" font-weight="800" text-anchor="middle">
              31 DEC 2013 · 765 kV RAICHUR–SOLAPUR
            </text>
          </g>
        ` : ''}

        <!-- Scene 4 Threats & Overloads -->
        ${isScene4 ? `
          <g id="scene4Threats">
            <!-- Tripped Line (LINE-1-2 between Delhi & Agra) -->
            <line x1="${hubs.delhi.x}" y1="${hubs.delhi.y}" x2="${hubs.agra.x}" y2="${hubs.agra.y}"
                  stroke="#ef4444" stroke-width="4" stroke-dasharray="8,6" opacity="0.9" />
            <circle cx="284" cy="228" r="9" fill="#7f1d1d" stroke="#ef4444" stroke-width="2" />
            <text x="284" y="232" fill="#fff" font-size="9" font-weight="900" text-anchor="middle">✕</text>
            <text x="284" y="210" fill="#fca5a5" font-size="9" font-weight="800" text-anchor="middle">
              CORRIDOR TRIPPED
            </text>

            <!-- Overloaded Parallel Branch (Korba -> Mumbai Loop) -->
            <line x1="${hubs.korba.x}" y1="${hubs.korba.y}" x2="${hubs.mumbai.x}" y2="${hubs.mumbai.y}"
                  stroke="#be123c" stroke-width="5" class="corridor-overload-pulse" />
            <rect x="240" y="380" width="130" height="18" rx="3" fill="#4c0519" stroke="#be123c" />
            <text x="305" y="393" fill="#fecdd3" font-size="8.5" font-weight="800" text-anchor="middle">
              OVERLOAD: 132.6% (LOOP FLOW)
            </text>

            <!-- Suspicious Measurement (FDIA on Solapur SCADA) -->
            <circle cx="${hubs.solapur.x}" cy="${hubs.solapur.y}" r="12" fill="#ffedd5" stroke="#ea580c" stroke-width="3" filter="url(#glowOrange)" />
            <text x="${hubs.solapur.x}" y="${hubs.solapur.y - 16}" fill="#fb923c" font-size="8.5" font-weight="800" text-anchor="middle">
              ⚠️ SUSPICIOUS TELEMETRY (FDIA)
            </text>
          </g>
        ` : ''}

        <!-- Substation & Generator Nodes -->
        <g id="substationNodes">
          ${Object.values(hubs).map(h => {
            const isThermal = h.type === 'thermal';
            const isHydro = h.type === 'hydro';
            const isNuclear = h.type === 'nuclear';
            const isSolar = h.type === 'solar';
            const isHvdc = h.type === 'hvdc';

            let fillColor = '#ffffff';
            let strokeColor = '#38bdf8';
            if (isThermal) { fillColor = '#ffedd5'; strokeColor = '#ea580c'; }
            else if (isHydro) { fillColor = '#ccfbf1'; strokeColor = '#0d9488'; }
            else if (isNuclear) { fillColor = '#dcfce7'; strokeColor = '#16a34a'; }
            else if (isSolar) { fillColor = '#fef3c7'; strokeColor = '#d97706'; }
            else if (isHvdc) { fillColor = '#f1f5f9'; strokeColor = '#64748b'; }

            return `
              <g class="substation-node-group" transform="translate(${h.x}, ${h.y})">
                <circle cx="0" cy="0" r="4.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" />
                <text x="0" y="-8" fill="#e2e8f0" font-size="8.5" font-weight="600" text-anchor="middle">
                  ${h.name}
                </text>
              </g>
            `;
          }).join('')}
        </g>

        <!-- Frequency Meter on Scene 3 & 5 (50.00 Hz Synchronous Indicator) -->
        ${(isScene3 || isScene5) ? `
          <g id="nationalSyncBadge" transform="translate(620, 40)">
            <rect x="0" y="0" width="155" height="52" rx="6" fill="#091222" stroke="#059669" stroke-width="1.5" />
            <text x="77" y="18" fill="#34d399" font-size="8.5" font-weight="800" text-anchor="middle" letter-spacing="1">
              NATIONAL SYNCHRONOUS
            </text>
            <text x="77" y="40" fill="#ffffff" font-size="18" font-family="'JetBrains Mono', monospace" font-weight="800" text-anchor="middle">
              50.000 Hz
            </text>
          </g>
        ` : ''}

        <!-- Scale & Provenance Label -->
        <g transform="translate(20, 650)">
          <text x="0" y="0" fill="#64748b" font-size="9" font-family="Inter, sans-serif">
            GRIDSEC Indian National Synchronous Grid · Sources: Ministry of Power, CEA &amp; Grid-India
          </text>
        </g>
      </svg>
    `;
  },

  // --------------------------------------------------------------------------
  // CONTROLLER & STORY TIMELINE ENGINE
  // --------------------------------------------------------------------------
  init: function() {
    this.setupKeyboardListeners();
    this.goToScene(1);
  },

  goToScene: function(sceneIndex) {
    this.clearTimers();
    this.cancelSpeech();

    if (sceneIndex < 1) sceneIndex = 1;
    if (sceneIndex > 5) sceneIndex = 5;

    this.state.currentScene = sceneIndex;
    const scene = this.scenes[sceneIndex - 1];

    // Refresh Viewport
    const viewport = document.getElementById('socMainViewport');
    if (viewport) {
      viewport.innerHTML = this.render(window.app || {});
    }

    // Speak Narration if not muted
    this.speak(scene.narrative);

    // Auto-advance if playing and not on last scene
    if (this.state.isPlaying && sceneIndex < 5) {
      this.state.sceneTimer = setTimeout(() => {
        if (this.state.isPlaying && this.state.currentScene === sceneIndex) {
          this.nextScene();
        }
      }, scene.durationMs);
    }
  },

  nextScene: function() {
    if (this.state.currentScene < 5) {
      this.goToScene(this.state.currentScene + 1);
    } else {
      this.enterGame();
    }
  },

  prevScene: function() {
    if (this.state.currentScene > 1) {
      this.goToScene(this.state.currentScene - 1);
    }
  },

  togglePlayPause: function() {
    this.state.isPlaying = !this.state.isPlaying;
    if (!this.state.isPlaying) {
      this.clearTimers();
      this.pauseSpeech();
    } else {
      this.resumeSpeech();
      const scene = this.scenes[this.state.currentScene - 1];
      if (this.state.currentScene < 5) {
        this.state.sceneTimer = setTimeout(() => {
          this.nextScene();
        }, 8000);
      }
    }

    const icon = document.getElementById('introPlayPauseIcon');
    const text = document.getElementById('introPlayPauseText');
    if (icon) icon.className = `fa-solid ${this.state.isPlaying ? 'fa-pause' : 'fa-play'}`;
    if (text) text.textContent = this.state.isPlaying ? 'Pause' : 'Resume';
  },

  toggleMute: function() {
    this.state.isMuted = !this.state.isMuted;
    if (this.state.isMuted) {
      this.cancelSpeech();
    } else {
      const scene = this.scenes[this.state.currentScene - 1];
      this.speak(scene.narrative);
    }

    const icon = document.getElementById('introMuteIcon');
    const text = document.getElementById('introMuteText');
    if (icon) {
      icon.className = `fa-solid ${this.state.isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`;
      icon.style.color = this.state.isMuted ? '#ef4444' : '#38bdf8';
    }
    if (text) text.textContent = this.state.isMuted ? 'Muted' : 'Audio ON';
  },

  startIntro: function() {
    this.state.isPlaying = true;
    this.goToScene(1);
  },

  // Transition to Playable Grid Defender Game
  enterGame: function() {
    this.cleanup();

    // Mark intro seen in session storage
    try {
      sessionStorage.setItem('gridsec_defender_intro_seen', 'true');
    } catch (e) {}

    // Navigate cleanly to defender game
    if (window.app && typeof window.app.navigate === 'function') {
      window.app.navigate('defender');
      // Ensure clean state reset
      setTimeout(() => {
        if (window.DefenderView && typeof window.DefenderView.resetLevel === 'function') {
          window.DefenderView.resetLevel();
        }
      }, 60);
    }
  },

  // --------------------------------------------------------------------------
  // SPEECH SYNTHESIS & SUBTITLES
  // --------------------------------------------------------------------------
  speak: function(text) {
    if (this.state.isMuted || !this.state.hasSpeechSupport) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      // Pick natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        this.state.speechActive = false;
      };
      utterance.onerror = () => {
        this.state.speechActive = false;
      };

      this.state.speechActive = true;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[Grid Defender Intro] Speech synthesis bypassed:', err);
    }
  },

  pauseSpeech: function() {
    if (this.state.hasSpeechSupport && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  },

  resumeSpeech: function() {
    if (this.state.hasSpeechSupport && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  },

  cancelSpeech: function() {
    if (this.state.hasSpeechSupport) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    this.state.speechActive = false;
  },

  clearTimers: function() {
    if (this.state.sceneTimer) {
      clearTimeout(this.state.sceneTimer);
      this.state.sceneTimer = null;
    }
  },

  setupKeyboardListeners: function() {
    this._keyHandler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.nextScene();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.prevScene();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        this.enterGame();
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  },

  cleanup: function() {
    this.clearTimers();
    this.cancelSpeech();
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }
};
