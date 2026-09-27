// papermap.js - Territorial Conquest PaperMap Engine
(function() {
  'use strict';

  const COLS = 60;
  const ROWS = 40;
  const CELL_W = 20;
  const CELL_H = 20;

  const state = {
    username: localStorage.getItem('portal_username') || 'Kral_' + Math.floor(100 + Math.random() * 900),
    isAdmin: localStorage.getItem('portal_is_admin') === 'true',
    ws: null,
    myId: null,
    alive: false,
    players: []
  };

  const canvas = document.getElementById('pm-canvas');
  const ctx = canvas.getContext('2d');
  const elCoverage = document.getElementById('pm-coverage');
  const elLbList = document.getElementById('pm-lb-list');
  const modal = document.getElementById('pm-modal');
  const btnPlay = document.getElementById('btn-play-pm');

  // Input Listeners: Arrow Keys & WASD
  window.addEventListener('keydown', (e) => {
    if (!state.alive || !state.ws || state.ws.readyState !== WebSocket.OPEN) return;

    let dx = 0, dy = 0;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') dy = -1;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') dy = 1;
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') dx = -1;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') dx = 1;

    if (dx !== 0 || dy !== 0) {
      e.preventDefault();
      state.ws.send(JSON.stringify({ type: 'papermap_dir', dx, dy }));
    }
  });

  btnPlay.addEventListener('click', () => {
    modal.classList.add('hidden');
    state.alive = true;
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'papermap_join', username: state.username }));
    }
  });

  // Render Loop
  function render() {
    requestAnimationFrame(render);

    // 1. Clear Grid
    ctx.fillStyle = '#141a24';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Grid lines
    ctx.strokeStyle = '#1b2332';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL_W, 0); ctx.lineTo(c * CELL_W, ROWS * CELL_H); ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL_H); ctx.lineTo(COLS * CELL_W, r * CELL_H); ctx.stroke();
    }

    // 3. Render Players & Trails
    for (const p of state.players) {
      // Draw Trails
      ctx.fillStyle = p.color || '#d500f9';
      for (const t of p.trail) {
        ctx.fillRect(t.x * CELL_W + 4, t.y * CELL_H + 4, CELL_W - 8, CELL_H - 8);
      }

      // Draw Head
      const hx = p.x * CELL_W;
      const hy = p.y * CELL_H;

      ctx.fillStyle = p.color || '#fff';
      ctx.fillRect(hx + 1, hy + 1, CELL_W - 2, CELL_H - 2);

      // Cute Eyes on Head
      ctx.fillStyle = '#000';
      ctx.fillRect(hx + 4, hy + 4, 3, 3);
      ctx.fillRect(hx + 12, hy + 4, 3, 3);

      // Name label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.username, hx + CELL_W / 2, hy - 4);
    }

    // Update Coverage for My Player
    const me = state.players.find(p => p.id === state.myId);
    if (me) {
      const pct = Math.round((me.score / (COLS * ROWS)) * 100);
      elCoverage.textContent = `%${pct}`;
    }
  }

  // WebSocket Connection
  function initWS() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    state.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: 'papermap' }));
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      let data;
      try { data = JSON.parse(event.data); } catch (_) { return; }

      if (data.type === 'papermap_joined') {
        state.myId = data.id;
      }
      else if (data.type === 'papermap_tick') {
        state.players = data.players || [];

        // Leaderboard
        if (elLbList && data.players.length > 0) {
          const sorted = [...data.players].sort((a, b) => b.score - a.score).slice(0, 4);
          elLbList.innerHTML = sorted.map((p, i) => `${i + 1}. ${escapeHtml(p.username)} (%${Math.round(p.score / 24)})`).join(' • ');
        }
      }
      else if (data.type === 'papermap_dead') {
        state.alive = false;
        alert(`💀 Elendin: ${data.reason}`);
        modal.classList.remove('hidden');
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
