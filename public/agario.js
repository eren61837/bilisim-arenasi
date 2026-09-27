// agario.js - Multiplayer Agar.io Web Client Engine
(function() {
  'use strict';

  const WORLD_WIDTH = 2600;
  const WORLD_HEIGHT = 2600;

  const state = {
    username: localStorage.getItem('portal_username') || 'Hücre_' + Math.floor(100 + Math.random() * 900),
    isAdmin: localStorage.getItem('portal_is_admin') === 'true',
    ws: null,
    myId: null,
    alive: false,

    // Camera & Transform
    camera: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: 1.0 },
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },

    // Game data from server
    players: [],
    foods: [],
    viruses: [],
    ejected: [],
    leaderboard: []
  };

  // DOM Elements
  const canvas = document.getElementById('agar-canvas');
  const ctx = canvas.getContext('2d');
  const elMass = document.getElementById('agar-mass-val');
  const elLbList = document.getElementById('agar-lb-list');
  const modal = document.getElementById('agar-modal');
  const inNick = document.getElementById('agar-nickname');
  const btnPlay = document.getElementById('btn-play-agar');
  const adminControls = document.getElementById('agar-admin-controls');
  const btnAdminMass = document.getElementById('btn-admin-add-mass');

  inNick.value = state.username;
  if (state.isAdmin && adminControls) adminControls.classList.remove('hidden');

  if (btnAdminMass) {
    btnAdminMass.addEventListener('click', () => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'admin_agario_mass' }));
      }
    });
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Mouse Listener
  window.addEventListener('mousemove', (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;

    if (state.alive && state.ws && state.ws.readyState === WebSocket.OPEN) {
      // Convert screen mouse to world coordinates
      const worldX = state.camera.x + (e.clientX - canvas.width / 2) / state.camera.zoom;
      const worldY = state.camera.y + (e.clientY - canvas.height / 2) / state.camera.zoom;
      state.ws.send(JSON.stringify({ type: 'agario_target', x: worldX, y: worldY }));
    }
  });

  // Keys: Space (Split) & W (Eject Mass)
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (state.alive && state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'agario_split' }));
      }
    }
    if (e.code === 'KeyW') {
      if (state.alive && state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'agario_eject' }));
      }
    }
  });

  btnPlay.addEventListener('click', () => {
    const val = inNick.value.trim() || state.username;
    state.username = val;
    localStorage.setItem('portal_username', val);

    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'agario_join', username: val }));
    }
    modal.classList.add('hidden');
    state.alive = true;
  });

  // 60 FPS RENDER LOOP
  function render() {
    requestAnimationFrame(render);

    // 1. Find my player and update camera
    let myPlayer = state.players.find(p => p.id === state.myId);
    let totalMass = 0;

    if (myPlayer && myPlayer.cells && myPlayer.cells.length > 0) {
      let sumX = 0, sumY = 0;
      for (const c of myPlayer.cells) {
        sumX += c.x;
        sumY += c.y;
        totalMass += c.mass;
      }
      const targetCamX = sumX / myPlayer.cells.length;
      const targetCamY = sumY / myPlayer.cells.length;

      // Smooth camera interpolation
      state.camera.x += (targetCamX - state.camera.x) * 0.1;
      state.camera.y += (targetCamY - state.camera.y) * 0.1;

      // Dynamic zoom based on mass
      const targetZoom = Math.max(0.45, Math.min(1.2, 1.0 / Math.pow(totalMass / 30, 0.2)));
      state.camera.zoom += (targetZoom - state.camera.zoom) * 0.05;

      elMass.textContent = totalMass;
    }

    // 2. Clear Screen
    ctx.fillStyle = '#11141c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Center camera
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(state.camera.zoom, state.camera.zoom);
    ctx.translate(-state.camera.x, -state.camera.y);

    // 3. Draw Grid Lines
    ctx.strokeStyle = '#1e2433';
    ctx.lineWidth = 1;
    const gridSize = 45;
    const startX = Math.floor((state.camera.x - canvas.width / state.camera.zoom) / gridSize) * gridSize;
    const endX = Math.ceil((state.camera.x + canvas.width / state.camera.zoom) / gridSize) * gridSize;
    const startY = Math.floor((state.camera.y - canvas.height / state.camera.zoom) / gridSize) * gridSize;
    const endY = Math.ceil((state.camera.y + canvas.height / state.camera.zoom) / gridSize) * gridSize;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y);
    }
    ctx.stroke();

    // 4. Draw World Boundaries
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 5. Draw Food Dots
    for (const f of state.foods) {
      ctx.fillStyle = f.c || '#00e5ff';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Draw Ejected Mass Pellets
    for (const ej of state.ejected) {
      ctx.fillStyle = ej.color || '#fff';
      ctx.beginPath();
      ctx.arc(ej.x, ej.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 7. Draw Viruses (Green Spiky Balls)
    for (const v of state.viruses) {
      drawVirus(ctx, v.x, v.y, v.r);
    }

    // 8. Draw Player Cells
    // Sort players by mass so smaller cells draw under larger cells
    for (const p of state.players) {
      for (const cell of p.cells) {
        drawCell(ctx, cell, p.color || '#00dbff', p.username, p.id === state.myId);
      }
    }

    ctx.restore();
  }

  // Draw Spiky Virus
  function drawVirus(context, x, y, radius) {
    context.fillStyle = '#33d133';
    context.strokeStyle = '#249c24';
    context.lineWidth = 4;
    context.beginPath();
    const spikes = 18;
    for (let i = 0; i < spikes; i++) {
      const angle = (i / spikes) * Math.PI * 2;
      const r = (i % 2 === 0) ? radius : radius - 5;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    context.stroke();
  }

  // Draw Player Cell with Text & Border
  function drawCell(context, cell, color, username, isMe) {
    context.save();

    // Body
    context.fillStyle = color;
    context.beginPath();
    context.arc(cell.x, cell.y, cell.r, 0, Math.PI * 2);
    context.fill();

    // Outer Darker Border
    context.strokeStyle = isMe ? '#ffffff' : 'rgba(0,0,0,0.25)';
    context.lineWidth = isMe ? 3 : 2.5;
    context.stroke();

    // Name & Mass Text
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const fontSize = Math.max(10, Math.min(26, cell.r / 3));
    context.font = `bold ${fontSize}px sans-serif`;
    context.fillText(username, cell.x, cell.y - (cell.r > 30 ? 5 : 0));

    if (cell.r > 30) {
      context.font = `${Math.max(9, fontSize * 0.7)}px sans-serif`;
      context.fillStyle = 'rgba(255,255,255,0.85)';
      context.fillText(cell.mass, cell.x, cell.y + fontSize);
    }

    context.restore();
  }

  // WebSocket Connection
  function initWS() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    state.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: 'agario' }));
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      let data;
      try { data = JSON.parse(event.data); } catch (_) { return; }

      if (data.type === 'agario_joined') {
        state.myId = data.id;
        state.camera.x = data.x;
        state.camera.y = data.y;
      }
      else if (data.type === 'agario_tick') {
        state.players = data.players || [];
        state.foods = data.foods || [];
        state.viruses = data.viruses || [];
        state.ejected = data.ejected || [];

        // Update Leaderboard
        if (data.leaderboard && elLbList) {
          elLbList.innerHTML = data.leaderboard.map((item, idx) =>
            `<li>${idx + 1}. ${escapeHtml(item.username)} (${item.score})</li>`
          ).join('');
        }
      }
      if (data.type === 'agario_died') {
        state.alive = false;
        alert(`💀 ${data.killer || 'Bir rakip'} tarafından yutuldun!`);
        modal.classList.remove('hidden');
      }
      else if (data.type === 'portal_announcement') {
        if (window._showPortalAnnouncement) window._showPortalAnnouncement(data.text || data.message || '');
      }
      else if (data.type === 'portal_announcement') {
        showAnnouncement(data.text || data.message || '');
      }
    };

    ws.onclose = () => {
      setTimeout(initWS, 2000);
    };
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>'"]/g, t => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[t] || t));
  }

  initWS();
  render();

})();
