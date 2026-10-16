/**
 * GRIDSEC Warm Editorial Landing Page Controller & SCADA Topology Sandbox
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeroCanvasSandbox();
  initLiveLogFeed();
  initStatsCounter();
  initLandingClock();
});

function initLandingClock() {
  const clockEl = document.getElementById('landingLiveClock');
  if (!clockEl) return;
  const update = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${hours}:${mins}:${secs} IST`;
  };
  update();
  setInterval(update, 1000);
}

/* ==========================================================================
   1. Hero Canvas Sandbox (Warm Editorial Palette)
   ========================================================================== */
function initHeroCanvasSandbox() {
  const canvas = document.getElementById('landingPreviewCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  function resizeCanvas() {
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth || 500;
      canvas.height = parent.clientHeight || 350;
    }
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const nodes = [
    { id: 'GEN-01', label: 'Hydro Dam', type: 'plant', x: 0.15, y: 0.25, status: 'healthy' },
    { id: 'GEN-02', label: 'Nuclear Unit', type: 'plant', x: 0.15, y: 0.75, status: 'healthy' },
    { id: 'SUB-01', label: 'North 765kV', type: 'substation', x: 0.38, y: 0.35, status: 'healthy' },
    { id: 'SUB-042', label: 'Raigarh Hub', type: 'substation', x: 0.50, y: 0.65, status: 'healthy' },
    { id: 'NODE-18', label: 'Central Inter-tie', type: 'switch', x: 0.65, y: 0.40, status: 'healthy' },
    { id: 'SUB-51', label: 'Metro Gateway', type: 'substation', x: 0.82, y: 0.30, status: 'healthy' },
    { id: 'CRIT-01', label: 'Critical Load', type: 'critical', x: 0.88, y: 0.75, status: 'healthy' }
  ];

  const links = [
    { from: 'GEN-01', to: 'SUB-01', active: true, alternate: false },
    { from: 'GEN-02', to: 'SUB-042', active: true, alternate: false },
    { from: 'SUB-01', to: 'NODE-18', active: true, alternate: false },
    { from: 'SUB-042', to: 'NODE-18', active: true, alternate: false },
    { from: 'NODE-18', to: 'SUB-51', active: true, alternate: false },
    { from: 'SUB-51', to: 'CRIT-01', active: true, alternate: false },
    { from: 'SUB-01', to: 'SUB-51', active: false, alternate: true }
  ];

  let particles = [];
  for (let i = 0; i < 20; i++) {
    particles.push({
      linkIndex: Math.floor(Math.random() * (links.length - 1)),
      progress: Math.random(),
      speed: 0.005 + Math.random() * 0.004
    });
  }

  let attackState = 'normal';

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;

    // Draw Links
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.from);
      const target = nodes.find(n => n.id === link.to);
      if (!source || !target) return;

      const x1 = source.x * w;
      const y1 = source.y * h;
      const x2 = target.x * w;
      const y2 = target.y * h;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (link.alternate && attackState === 'rerouted') {
        ctx.strokeStyle = '#166534';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
      } else if (source.status === 'compromised' || target.status === 'compromised') {
        ctx.strokeStyle = '#fecaca';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
      } else if (!link.active) {
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
      } else {
        ctx.strokeStyle = '#d6d3d1';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw Particles
    particles.forEach(p => {
      const link = links[p.linkIndex];
      if (!link) return;
      const source = nodes.find(n => n.id === link.from);
      const target = nodes.find(n => n.id === link.to);
      if (!source || !target) return;

      if (!link.active && !(link.alternate && attackState === 'rerouted')) return;
      if (source.status === 'compromised' || target.status === 'compromised') return;

      p.progress += p.speed;
      if (p.progress >= 1) p.progress = 0;

      const px = (source.x + (target.x - source.x) * p.progress) * w;
      const py = (source.y + (target.y - source.y) * p.progress) * h;

      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = (link.alternate && attackState === 'rerouted') ? '#166534' : '#1c1917';
      ctx.fill();
    });

    // Draw Nodes
    nodes.forEach(node => {
      const nx = node.x * w;
      const ny = node.y * h;

      ctx.beginPath();
      ctx.arc(nx, ny, 10, 0, Math.PI * 2);

      if (node.status === 'compromised') {
        ctx.fillStyle = '#fee2e2';
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 2.5;
      } else if (node.status === 'isolated') {
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 2;
      }
      ctx.fill();
      ctx.stroke();

      // Node label
      ctx.fillStyle = '#1c1917';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, nx, ny + 20);
    });

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);

  // Controls
  const btnAttack = document.getElementById('demoBtnAttack');
  const btnReroute = document.getElementById('demoBtnReroute');
  const btnReset = document.getElementById('demoBtnReset');

  if (btnAttack) {
    btnAttack.addEventListener('click', () => {
      attackState = 'attacked';
      const target = nodes.find(n => n.id === 'SUB-042');
      if (target) target.status = 'compromised';

      const healthVal = document.getElementById('demoHealthVal');
      if (healthVal) {
        healthVal.textContent = '84.2%';
        healthVal.style.color = '#b91c1c';
      }

      addLogEntry('CRITICAL: DNP3 direct-operate breaker trip injection on Raigarh Hub', 'critical');
      addLogEntry('Power transfer drop detected across Eastern-Western inter-tie', 'warn');
    });
  }

  if (btnReroute) {
    btnReroute.addEventListener('click', () => {
      attackState = 'rerouted';
      const target = nodes.find(n => n.id === 'SUB-042');
      if (target) target.status = 'isolated';

      const healthVal = document.getElementById('demoHealthVal');
      if (healthVal) {
        healthVal.textContent = '99.4%';
        healthVal.style.color = '#166534';
      }

      addLogEntry('Dijkstra algorithm activated: GEN-01 → SUB-01 → SUB-51', 'heal');
      addLogEntry('Raigarh Hub quarantined. Critical load restored to 100% nominal.', 'heal');
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      attackState = 'normal';
      nodes.forEach(n => n.status = 'healthy');
      
      const healthVal = document.getElementById('demoHealthVal');
      if (healthVal) {
        healthVal.textContent = '99.8%';
        healthVal.style.color = '#1c1917';
      }

      addLogEntry('Grid topology restored to baseline nominal state', 'heal');
    });
  }
}

/* ==========================================================================
   2. Live SCADA / PMU Log Feed Helper
   ========================================================================== */
function addLogEntry(text, type = 'heal') {
  const feed = document.getElementById('demoLogFeed');
  if (!feed) return;
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span style="color:#78716c; font-size:0.7rem;">[${time}]</span> ${text}`;
  feed.prepend(entry);
  while (feed.children.length > 5) {
    feed.removeChild(feed.lastChild);
  }
}

function initLiveLogFeed() {
  const events = [
    { text: 'Raigarh–Pugalur ±800kV HVDC telemetry synchronized (5,200 MW transfer WR → SR)', type: 'heal' },
    { text: 'Champa–Kurukshetra ±800kV link nominal: 2,600 MW (WR → NR)', type: 'heal' },
    { text: 'Phasor Measurement Unit PMU sampling rate: 60 fps (National Freq 50.002 Hz)', type: 'heal' },
    { text: 'DNP3 integrity checksum validated for Northern Region 765kV grid', type: 'heal' },
    { text: 'Talcher–Kolar ±500kV HVDC power flow nominal: 2,150 MW (ER → SR)', type: 'heal' },
    { text: 'Modbus TCP rate-limiting active at Wardha 765kV gateway', type: 'warn' }
  ];

  // Seed initial 5 observations
  for (let i = 0; i < 5; i++) {
    addLogEntry(events[i].text, events[i].type);
  }

  let index = 5;
  setInterval(() => {
    const item = events[index % events.length];
    addLogEntry(item.text, item.type);
    index++;
  }, 4500);
}

/* ==========================================================================
   3. Dynamic Stats Counter
   ========================================================================== */
function initStatsCounter() {
  const statElements = document.querySelectorAll('.counter-val');
  statElements.forEach(el => {
    const target = parseFloat(el.getAttribute('data-target') || 0);
    const decimals = parseInt(el.getAttribute('data-decimals') || 0, 10);
    const duration = 1600;
    const startTime = performance.now();

    function update(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = (ease * target).toFixed(decimals);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}
