// tank.js - Tank Savaşı 2D Client Engine
(function() {
  'use strict';

  const COLORS = ['#00e676', '#ff1744', '#00e5ff', '#ffea00', '#d500f9', '#ff9100'];

  const state = {
    username: localStorage.getItem('portal_username') || 'Tankçı_' + Math.floor(100 + Math.random() * 900),
    isAdmin: localStorage.getItem('portal_is_admin') === 'true',
    ws: null,
    myId: null,
    color: COLORS[0],
    alive: false,
    x: 100,
    y: 100,
    angle: 0,
    turretAngle: 0,
    speed: 0,
    score: 0,
    kills: 0,
    walls: [],
    tanks: [],
    bullets: [],
    crates: [],
    keys: { w: false, a: false, s: false, d: false, space: false },
    mouse: { x: 600, y: 400 },
    lastShoot: 0
  };

  const canvas = document.getElementById('tank-canvas');
  const ctx = canvas.getContext('2d');
  canvas.setAttribute('tabindex', '0');
  canvas.focus();

  // Simple Web Audio Sound Effects
  const SoundFX = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.ctx = new AudioContext();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    shoot() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } catch (_) {}
    },
    bounce() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } catch (_) {}
    },
    explode() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } catch (_) {}
    }
  };

  // Color picker UI
  const colorContainer = document.getElementById('tank-color-options');
  COLORS.forEach((c, idx) => {
    const dot = document.createElement('div');
    dot.className = 'tank-color-dot' + (idx === 0 ? ' selected' : '');
    dot.style.background = c;
    dot.addEventListener('click', () => {
      document.querySelectorAll('.tank-color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      state.color = c;
    });
    colorContainer.appendChild(dot);
  });

  // Start button
  document.getElementById('btn-play-tank').addEventListener('click', () => {
    SoundFX.init();
    document.getElementById('tank-modal').classList.add('hidden');
    joinTankGame();
  });

  // Controls input
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'KeyW'].includes(e.code)) state.keys.w = true;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) state.keys.a = true;
    if (['ArrowDown', 'KeyS'].includes(e.code)) state.keys.s = true;
    if (['ArrowRight', 'KeyD'].includes(e.code)) state.keys.d = true;
    if (e.code === 'Space') {
      e.preventDefault();
      tryShoot();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (['ArrowUp', 'KeyW'].includes(e.code)) state.keys.w = false;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) state.keys.a = false;
    if (['ArrowDown', 'KeyS'].includes(e.code)) state.keys.s = false;
    if (['ArrowRight', 'KeyD'].includes(e.code)) state.keys.d = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    state.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) tryShoot();
  });

  // FIX: canvas focus so keyboard events always work
  canvas.setAttribute('tabindex', '0');
  canvas.style.outline = 'none';
  canvas.addEventListener('click', () => canvas.focus());

  // MOBILE TOUCH D-PAD
  (function setupTouchControls() {
    const dpad = document.createElement('div');
    dpad.id = 'tank-dpad';
    dpad.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:1000;display:grid;grid-template-columns:52px 52px 52px;grid-template-rows:52px 52px;gap:4px;user-select:none;touch-action:none;';
    const fireBtn = document.createElement('button');
    fireBtn.textContent = '\ud83d\udd25';
    fireBtn.style.cssText = 'position:fixed;bottom:30px;right:30px;z-index:1000;width:70px;height:70px;border-radius:50%;border:3px solid #ff1744;background:rgba(255,23,68,0.85);color:#fff;font-size:28px;cursor:pointer;touch-action:none;user-select:none;box-shadow:0 0 20px rgba(255,23,68,0.6);';
    const btnData = [
      { key: 'w', label: '\u25b2', col: 2, row: 1 },
      { key: 'a', label: '\u25c4', col: 1, row: 2 },
      { key: 's', label: '\u25bc', col: 2, row: 2 },
      { key: 'd', label: '\u25ba', col: 3, row: 2 },
    ];
    btnData.forEach(function(b) {
      var btn = document.createElement('button');
      btn.textContent = b.label;
      btn.style.cssText = 'grid-column:' + b.col + ';grid-row:' + b.row + ';background:rgba(0,230,118,0.2);border:2px solid #00e676;color:#00e676;font-size:20px;border-radius:8px;cursor:pointer;touch-action:none;user-select:none;width:52px;height:52px;';
      btn.addEventListener('touchstart', function(e){ e.preventDefault(); state.keys[b.key]=true; }, {passive:false});
      btn.addEventListener('touchend', function(e){ e.preventDefault(); state.keys[b.key]=false; }, {passive:false});
      btn.addEventListener('mousedown', function(){ state.keys[b.key]=true; });
      btn.addEventListener('mouseup', function(){ state.keys[b.key]=false; });
      dpad.appendChild(btn);
    });
    fireBtn.addEventListener('touchstart', function(e){ e.preventDefault(); tryShoot(); }, {passive:false});
    fireBtn.addEventListener('mousedown', function(){ tryShoot(); });
    document.body.appendChild(dpad);
    document.body.appendChild(fireBtn);
  })();

  // Juice & Visual FX: Particles & Tread Marks
  const tankParticles = [];
  function spawnTankSparks(x, y, color = '#ff9100', count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 4.0;
      tankParticles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: 2 + Math.random() * 2.5,
        life: 1.0,
        decay: 0.04 + Math.random() * 0.03
      });
    }
  }

  const tracks = [];
  let trackCounter = 0;

  function tryShoot() {
    if (!state.alive) return;
    const now = Date.now();
    if (now - state.lastShoot < 350) return;
    state.lastShoot = now;
    SoundFX.shoot();

    // Muzzle blast sparks
    const tipX = state.x + Math.cos(state.turretAngle) * 26;
    const tipY = state.y + Math.sin(state.turretAngle) * 26;
    spawnTankSparks(tipX, tipY, '#ffe600', 6);

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'tank_shoot' }));
    }
  }

  // WebSocket Connection
  function initWS() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}`);
    state.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: 'tank' }));
      if (state.isAdmin) ws.send(JSON.stringify({ type: 'admin_auth', password: 'erencix201124' }));
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      let data; try { data = JSON.parse(ev.data); } catch (_) { return; }

      if (data.type === 'tank_joined') {
        state.myId = data.id;
        state.x = data.x;
        state.y = data.y;
        state.angle = data.angle;
        state.walls = data.walls || [];
        state.alive = true;
      }
      else if (data.type === 'tank_spawn_shield') {
        // Show spawn shield for 3 seconds
        state.invulTimer = Date.now() + (data.duration || 3000);
        const hud = document.getElementById('hud-powerup');
        const icon = document.getElementById('hud-powerup-icon');
        const text = document.getElementById('hud-powerup-text');
        if (hud && icon && text) {
          hud.style.display = 'flex';
          icon.textContent = '🛡️';
          text.textContent = 'SPAWN KALKANI';
          setTimeout(() => { if (hud) hud.style.display = 'none'; }, 3000);
        }
      }
      else if (data.type === 'tank_tick') {
        state.tanks = data.tanks || [];
        state.bullets = data.bullets || [];
        state.crates = data.crates || [];

        // Find self
        const me = state.tanks.find(t => t.id === state.myId);
        if (me) {
          state.score = me.score;
          const scEl = document.getElementById('hud-score');
          if (scEl) scEl.textContent = me.score;

          // Powerup badge
          const puBadge = document.getElementById('hud-powerup');
          const puText = document.getElementById('hud-powerup-text');
          const puIcon = document.getElementById('hud-powerup-icon');
          if (me.powerup) {
            puBadge.style.display = 'flex';
            if (me.powerup === 'shotgun') { puIcon.textContent = '💥'; puText.textContent = 'POMPALI'; }
            else if (me.powerup === 'shield') { puIcon.textContent = '🛡️'; puText.textContent = 'KALKAN'; }
            else { puIcon.textContent = '⚡'; puText.textContent = me.powerup.toUpperCase(); }
          } else {
            puBadge.style.display = 'none';
          }
        }

        // Leaderboard
        const lb = document.getElementById('tank-lb-list');
        if (lb && data.leaderboard) {
          lb.innerHTML = data.leaderboard.map((item, idx) =>
            `<li class="${item.username === state.username ? 'me' : ''}">
              <span>${idx + 1}. ${esc(item.username.replace('🤖 ', ''))}</span>
              <strong>${item.score}</strong>
            </li>`
          ).join('');
        }
      }
      else if (data.type === 'tank_dead') {
        state.alive = false;
        SoundFX.explode();
        spawnTankSparks(state.x, state.y, '#ff3d00', 35);
        spawnTankSparks(state.x, state.y, '#ffea00', 20);
        const dModal = document.getElementById('tank-death');
        const msg = document.getElementById('tank-death-msg');
        if (msg) msg.textContent = `${esc(data.killer || 'Bir düşman')} tarafından vuruldun!`;
        if (dModal) dModal.classList.remove('hidden');
      }
      else if (data.type === 'tank_respawn') {
        state.alive = true;
        state.x = data.x;
        state.y = data.y;
        state.angle = data.angle;
        const dModal = document.getElementById('tank-death');
        if (dModal) dModal.classList.add('hidden');
      }
      else if (data.type === 'tank_kill_feed') {
        addKillFeed(data.killer, data.victim);
      }
      else if (data.type === 'portal_announcement') {
        if (window._showPortalAnnouncement) window._showPortalAnnouncement(data.text || data.message || '');
      }
    };

    ws.onclose = () => setTimeout(initWS, 2000);
  }

  function joinTankGame() {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({
        type: 'tank_join',
        username: state.username,
        color: state.color
      }));
    }
  }

  function addKillFeed(killer, victim) {
    const kf = document.getElementById('tank-kill-feed');
    if (!kf) return;
    const item = document.createElement('div');
    item.className = 'tkf-item';
    item.innerHTML = `<strong>${esc(killer)}</strong> 💥 ${esc(victim)}`;
    kf.insertBefore(item, kf.firstChild);
    setTimeout(() => item.remove(), 4000);
    while (kf.children.length > 5) kf.lastChild.remove();
  }

  // Client Simulation (Movement & Physics)
  let lastSend = 0;
  function update() {
    if (state.alive) {
      // Rotation
      if (state.keys.a) state.angle -= 0.055;
      if (state.keys.d) state.angle += 0.055;

      // Forward / Backward
      let moveSpeed = 0;
      if (state.keys.w) moveSpeed = 3.2;
      if (state.keys.s) moveSpeed = -2.2;

      if (moveSpeed !== 0) {
        const nx = state.x + Math.cos(state.angle) * moveSpeed;
        const ny = state.y + Math.sin(state.angle) * moveSpeed;

        // Wall collision check
        let collides = false;
        if (nx < 30 || nx > 1170 || ny < 30 || ny > 770) collides = true;
        for (const w of state.walls) {
          if (distToSegment({ x: nx, y: ny }, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }) < 22) {
            collides = true;
            break;
          }
        }
        if (!collides) {
          state.x = nx;
          state.y = ny;

          // Track tread marks
          trackCounter++;
          if (trackCounter % 4 === 0) {
            tracks.push({ x: state.x, y: state.y, angle: state.angle, life: 1.0 });
            if (tracks.length > 90) tracks.shift();
          }
        }
      }

      // Turret aim at mouse
      state.turretAngle = Math.atan2(state.mouse.y - state.y, state.mouse.x - state.x);

      // Send position 30fps
      const now = Date.now();
      if (now - lastSend > 33 && state.ws && state.ws.readyState === WebSocket.OPEN) {
        lastSend = now;
        state.ws.send(JSON.stringify({
          type: 'tank_move',
          x: state.x,
          y: state.y,
          angle: state.angle,
          turretAngle: state.turretAngle
        }));
      }
    }
  }

  // Render Loop
  function draw() {
    requestAnimationFrame(draw);
    update();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Fading tank tread marks on ground
    for (let i = tracks.length - 1; i >= 0; i--) {
      const tr = tracks[i];
      tr.life -= 0.0035;
      if (tr.life <= 0) { tracks.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.rotate(tr.angle);
      ctx.fillStyle = `rgba(0, 0, 0, ${tr.life * 0.22})`;
      ctx.fillRect(-14, -14, 28, 4);
      ctx.fillRect(-14, 10, 28, 4);
      ctx.restore();
    }

    // Walls (Maze)
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 230, 118, 0.5)';
    for (const w of state.walls) {
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Powerup Crates
    for (const c of state.crates) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = '#ff9100';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff9100';
      ctx.fillRect(-12, -12, 24, 24);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -12, 24, 24);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 1);
      ctx.restore();
    }

    // Bullets (Seken Mermiler!)
    for (const b of state.bullets) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = b.color || '#fff';
      ctx.shadowBlur = 12;
      ctx.shadowColor = b.color || '#fff';
      ctx.fill();
      ctx.restore();
    }

    // Tanks
    const allTanks = state.tanks;
    for (const t of allTanks) {
      const isMe = t.id === state.myId;
      const x = isMe ? state.x : t.x;
      const y = isMe ? state.y : t.y;
      const angle = isMe ? state.angle : t.angle;
      const turretAngle = isMe ? state.turretAngle : t.turretAngle;

      ctx.save();
      ctx.translate(x, y);

      // Shield Aura
      if (t.hasShield) {
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00e5ff';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Tank Body
      ctx.rotate(angle);

      // Tracks
      ctx.fillStyle = '#1a1f2c';
      ctx.fillRect(-18, -16, 36, 6);
      ctx.fillRect(-18, 10, 36, 6);

      // Chassis
      ctx.fillStyle = t.color;
      ctx.shadowBlur = isMe ? 12 : 6;
      ctx.shadowColor = t.color;
      ctx.fillRect(-14, -10, 28, 20);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(-14, -10, 28, 20);
      ctx.shadowBlur = 0;

      ctx.rotate(-angle); // Reset for turret

      // Rotating Turret
      ctx.rotate(turretAngle);

      // Cannon Barrel
      ctx.fillStyle = '#ddd';
      ctx.fillRect(0, -3.5, 24, 7);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, -3.5, 24, 7);

      // Turret Head
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#222';
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // Username tag
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#000';
      ctx.fillText((isMe ? '▶ ' : '') + t.username.replace('🤖 ', ''), x, y - 24);
      ctx.shadowBlur = 0;
    }

    // Spark & explosion particles
    for (let i = tankParticles.length - 1; i >= 0; i--) {
      const p = tankParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) { tankParticles.splice(i, 1); continue; }
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fill();
      ctx.restore();
    }
  }

  function distToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  function esc(s) {
    return String(s).replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
  }

  initWS();
  draw();

})();
