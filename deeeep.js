// deeeep.js - Deeeep.io Client Engine
(function() {
  'use strict';

  const state = {
    username: localStorage.getItem('portal_username') || 'Denizci_' + Math.floor(100 + Math.random() * 900),
    isAdmin: localStorage.getItem('portal_is_admin') === 'true',
    ws: null,
    myId: null,
    alive: false,
    x: 2000,
    y: 800,
    angle: 0,
    targetAngle: 0,
    tier: 1,
    hp: 100,
    maxHp: 100,
    exp: 0,
    oxygen: 100,
    pressure: 100,
    boostCharges: 2,
    score: 0,
    worldW: 4000,
    worldH: 2400,
    cam: { x: 2000, y: 800 },
    mouse: { x: innerWidth / 2, y: innerHeight / 2 },
    players: [],
    foods: [],
    leaderboard: [],
    tiers: [],
    bubbles: []
  };

  const canvas = document.getElementById('deeeep-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Create ambient ocean bubbles
  for (let i = 0; i < 70; i++) {
    state.bubbles.push({
      x: Math.random() * 4000,
      y: 400 + Math.random() * 2000,
      r: 2 + Math.random() * 5,
      speed: 0.8 + Math.random() * 1.5,
      wobble: Math.random() * Math.PI * 2
    });
  }

  // Audio Synthesizer
  const DeepAudio = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.ctx = new AudioContext();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    boost() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.2);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.2);
      } catch (_) {}
    },
    bite() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.12);
      } catch (_) {}
    },
    evolve() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.09);
          gain.gain.setValueAtTime(0.2, now + i * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.09 + 0.18);
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.start(now + i * 0.09); osc.stop(now + i * 0.09 + 0.18);
        });
      } catch (_) {}
    }
  };

  // Play button
  document.getElementById('btn-play-deeeep').addEventListener('click', () => {
    DeepAudio.init();
    document.getElementById('deeeep-modal').classList.add('hidden');
    joinGame();
  });

  document.getElementById('btn-respawn-deeeep').addEventListener('click', () => {
    document.getElementById('deeeep-death').classList.add('hidden');
    joinGame();
  });

  // Inputs
  window.addEventListener('mousemove', (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
  });

  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) tryBoost();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      tryBoost();
    }
  });

  function tryBoost() {
    if (!state.alive || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    DeepAudio.boost();
    state.ws.send(JSON.stringify({ type: 'deeeep_boost' }));
  }

  // WebSocket Connection
  function initWS() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}`);
    state.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: 'deeeep' }));
      if (state.isAdmin) ws.send(JSON.stringify({ type: 'admin_auth', password: 'erencix201124' }));
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      let data; try { data = JSON.parse(ev.data); } catch (_) { return; }

      if (data.type === 'deeeep_joined') {
        state.myId = data.id;
        state.x = data.x;
        state.y = data.y;
        state.cam.x = data.x;
        state.cam.y = data.y;
        state.tier = data.tier;
        state.tiers = data.tiers || [];
        state.worldW = data.worldW;
        state.worldH = data.worldH;
        state.alive = true;
        updateHUDTier();
      }
      else if (data.type === 'deeeep_tick') {
        state.players = data.players || [];
        state.foods = data.foods || [];
        state.leaderboard = data.leaderboard || [];

        const me = state.players.find(p => p.id === state.myId);
        if (me) {
          state.hp = me.hp;
          state.maxHp = me.maxHp;
          state.oxygen = me.oxygen;
          state.pressure = me.pressure;
          state.exp = me.exp;
          state.score = me.score;
          state.boostCharges = me.boostCharges;
          state.cam.x = me.x;
          state.cam.y = me.y;
          state.tier = me.tier;

          updateVitalsUI();
        }

        // Leaderboard
        const lb = document.getElementById('deeeep-lb-list');
        if (lb) {
          lb.innerHTML = state.leaderboard.map((item, idx) =>
            `<li class="${item.username === state.username ? 'me' : ''}">
              <span>${idx + 1}. ${esc(item.username.replace('🤖 ', ''))} (${esc(item.tierName || '')})</span>
              <strong>${item.score}</strong>
            </li>`
          ).join('');
        }
      }
      else if (data.type === 'deeeep_evolved') {
        state.tier = data.tier;
        DeepAudio.evolve();
        updateHUDTier();
        showEvolutionBanner(data.tierInfo);
      }
      else if (data.type === 'deeeep_dead') {
        state.alive = false;
        document.getElementById('deeeep-death').classList.remove('hidden');
        document.getElementById('death-killer-text').textContent = `${esc(data.killer || 'Bir yırtıcı')} tarafından avlandın!`;
        document.getElementById('death-score-val').textContent = state.score;
      }
      else if (data.type === 'deeeep_kill_feed') {
        addKillFeed(data.killer, data.killerTier, data.victim, data.victimTier);
      }
      else if (data.type === 'portal_announcement') {
        if (window._showPortalAnnouncement) window._showPortalAnnouncement(data.text || data.message || '');
      }
    };

    ws.onclose = () => setTimeout(initWS, 2000);
  }

  function joinGame() {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'deeeep_join',
        username: state.username
      }));
    }
  }

  function updateHUDTier() {
    if (!state.tiers || !state.tiers[state.tier - 1]) return;
    const t = state.tiers[state.tier - 1];
    const emojiEl = document.getElementById('hud-animal-emoji');
    const nameEl = document.getElementById('hud-animal-name');
    const tierEl = document.getElementById('hud-animal-tier');
    if (emojiEl) emojiEl.textContent = t.emoji;
    if (nameEl) nameEl.textContent = t.name;
    if (tierEl) tierEl.textContent = 'Tier ' + t.tier;
  }

  function updateVitalsUI() {
    // HP
    const barHp = document.getElementById('bar-hp');
    const valHp = document.getElementById('val-hp');
    const hpPct = Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100));
    if (barHp) barHp.style.width = hpPct + '%';
    if (valHp) valHp.textContent = `${Math.ceil(state.hp)}/${state.maxHp}`;

    // EXP
    const tInfo = state.tiers[state.tier - 1];
    const nextExp = tInfo ? tInfo.nextExp : 100;
    const barExp = document.getElementById('bar-exp');
    const valExp = document.getElementById('val-exp');
    const expPct = Math.max(0, Math.min(100, (state.exp / nextExp) * 100));
    if (barExp) barExp.style.width = expPct + '%';
    if (valExp) valExp.textContent = `${state.exp}/${nextExp}`;

    // Oxygen
    const barO2 = document.getElementById('bar-oxygen');
    if (barO2) barO2.style.width = state.oxygen + '%';

    // Pressure
    const barPress = document.getElementById('bar-pressure');
    if (barPress) {
      barPress.style.width = state.pressure + '%';
      barPress.style.background = state.pressure < 40 ? '#ff1744' : '#e040fb';
    }

    // Boost Pills
    const pills = document.querySelectorAll('.boost-dot');
    pills.forEach((p, idx) => {
      if (idx < Math.floor(state.boostCharges)) p.classList.add('active');
      else p.classList.remove('active');
    });

    // Score
    const scEl = document.getElementById('hud-score');
    if (scEl) scEl.textContent = state.score;

    // Depth indicator on meter
    const dInd = document.getElementById('depth-indicator');
    if (dInd) {
      const depthRatio = Math.max(0, Math.min(1, state.cam.y / state.worldH));
      dInd.style.top = (depthRatio * 180) + 'px';
      if (tInfo) dInd.textContent = tInfo.emoji;
    }
  }

  function showEvolutionBanner(tInfo) {
    const banner = document.getElementById('evolution-banner');
    const emoji = document.getElementById('evo-emoji');
    const name = document.getElementById('evo-name');
    const desc = document.getElementById('evo-desc');
    if (emoji) emoji.textContent = tInfo.emoji;
    if (name) name.textContent = tInfo.name.toUpperCase();
    if (desc) desc.textContent = tInfo.desc;
    if (banner) {
      banner.style.display = 'flex';
      setTimeout(() => { banner.style.display = 'none'; }, 3500);
    }
  }

  function addKillFeed(killer, kTier, victim, vTier) {
    const feed = document.getElementById('deeeep-kill-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'dkf-item';
    const kEmoji = state.tiers[kTier - 1]?.emoji || '🐟';
    const vEmoji = state.tiers[vTier - 1]?.emoji || '🐟';
    item.innerHTML = `<strong>${kEmoji} ${esc(killer)}</strong> yuttu ➔ ${vEmoji} ${esc(victim)}`;
    feed.insertBefore(item, feed.firstChild);
    setTimeout(() => item.remove(), 4000);
    while (feed.children.length > 5) feed.lastChild.remove();
  }

  // Network send loop
  let lastSend = 0;
  function sendMove() {
    if (!state.alive || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (now - lastSend < 33) return;
    lastSend = now;

    const dx = state.mouse.x - canvas.width / 2;
    const dy = state.mouse.y - canvas.height / 2;
    state.targetAngle = Math.atan2(dy, dx);

    state.ws.send(JSON.stringify({
      type: 'deeeep_move',
      angle: state.targetAngle
    }));
  }

  // Render Engine
  function render() {
    requestAnimationFrame(render);
    sendMove();

    const W = canvas.width, H = canvas.height;
    const ox = W / 2 - state.cam.x;
    const oy = H / 2 - state.cam.y;

    // 1. Dynamic Ocean Background Gradients (Air -> Reef -> Deep Abyss)
    const bgGrad = ctx.createLinearGradient(0, oy, 0, oy + state.worldH);
    bgGrad.addColorStop(0.0, '#b3e5fc'); // Air / Sky
    bgGrad.addColorStop(0.12, '#81d4fa'); // Water surface line
    bgGrad.addColorStop(0.15, '#0288d1'); // Sunlit tropical ocean
    bgGrad.addColorStop(0.55, '#01579b'); // Deep twilight ocean
    bgGrad.addColorStop(0.75, '#002147'); // Abyss midnight
    bgGrad.addColorStop(1.0, '#000814'); // Trenches / Ocean floor

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Sun Rays on Surface (Y: 0..600)
    if (state.cam.y < 900) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.25 - state.cam.y / 3600);
      const rayGrad = ctx.createLinearGradient(0, oy, 0, oy + 700);
      rayGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
      rayGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = rayGrad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Surface Waves line (Y = 320)
    const waveY = 320 + oy;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ox, waveY);
    ctx.lineTo(ox + state.worldW, waveY);
    ctx.stroke();

    // Floating Islands on Surface
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(ox + 400, waveY - 30, 260, 30);
    ctx.fillRect(ox + 1800, waveY - 30, 340, 30);
    ctx.fillRect(ox + 3000, waveY - 30, 280, 30);

    // Ocean Boundaries
    ctx.strokeStyle = 'rgba(255,68,68,0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(ox, oy, state.worldW, state.worldH);

    // Ambient Bubbles
    for (const b of state.bubbles) {
      b.y -= b.speed;
      b.wobble += 0.05;
      if (b.y < 350) b.y = 2300;
      const bx = b.x + Math.sin(b.wobble) * 10 + ox;
      const by = b.y + oy;
      if (bx < -20 || bx > W + 20 || by < -20 || by > H + 20) continue;

      ctx.beginPath();
      ctx.arc(bx, by, b.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();
    }

    // Foods (Plankton, Lava, Meat)
    for (const f of state.foods) {
      const fx = f.x + ox;
      const fy = f.y + oy;
      if (fx < -20 || fx > W + 20 || fy < -20 || fy > H + 20) continue;

      ctx.beginPath();
      ctx.arc(fx, fy, f.r, 0, Math.PI * 2);
      ctx.fillStyle = f.color;
      if (f.type === 'lava' || f.type === 'meat') {
        ctx.shadowBlur = f.r * 2.5;
        ctx.shadowColor = f.color;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Players & Animals
    for (const p of state.players) {
      const px = p.x + ox;
      const py = p.y + oy;
      if (px < -60 || px > W + 60 || py < -60 || py > H + 60) continue;

      const isMe = p.id === state.myId;
      const tInfo = state.tiers[p.tier - 1] || { name: 'Balık', emoji: '🐟' };
      const bodyRadius = 18 + p.tier * 2.8;

      ctx.save();
      ctx.translate(px, py);

      // Boost Aura / Trail
      if (p.isBoosting) {
        ctx.beginPath();
        ctx.arc(0, 0, bodyRadius + 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00e5ff';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.rotate(p.angle);

      // Animal Body (Round stylized oval)
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyRadius * 1.2, bodyRadius, 0, 0, Math.PI * 2);
      ctx.fillStyle = isMe ? '#00e5ff' : '#4fc3f7';
      if (p.tier >= 6) ctx.fillStyle = '#78909c'; // Shark gray
      if (p.tier === 8) ctx.fillStyle = '#8e24aa'; // Kraken purple
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tail fin
      ctx.beginPath();
      ctx.moveTo(-bodyRadius * 1.2, 0);
      ctx.lineTo(-bodyRadius * 1.8, -bodyRadius * 0.6);
      ctx.lineTo(-bodyRadius * 1.8, bodyRadius * 0.6);
      ctx.closePath();
      ctx.fillStyle = isMe ? '#00b0ff' : '#0288d1';
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(bodyRadius * 0.5, -bodyRadius * 0.45, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bodyRadius * 0.5, bodyRadius * 0.45, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(bodyRadius * 0.65, -bodyRadius * 0.45, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bodyRadius * 0.65, bodyRadius * 0.45, 2.5, 0, Math.PI * 2); ctx.fill();

      // Animal Emoji Icon in center
      ctx.rotate(-p.angle);
      ctx.font = `${bodyRadius * 1.1}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tInfo.emoji, 0, 0);

      // Name & Tier label
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 4; ctx.shadowColor = '#000';
      const label = `${isMe ? '▶ ' : ''}${p.username.replace('🤖 ', '')} [T${p.tier}]`;
      ctx.fillText(label, 0, -bodyRadius - 14);

      // Mini Health Bar above player
      const miniBarW = 36;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-miniBarW / 2, -bodyRadius - 8, miniBarW, 4);
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(-miniBarW / 2, -bodyRadius - 8, miniBarW * (p.hp / p.maxHp), 4);
      ctx.shadowBlur = 0;

      ctx.restore();
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
  }

  initWS();
  render();

})();
