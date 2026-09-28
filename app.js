// app.js - 1:1 Pixelplace.io Canvas & Client Engine
// Matches the exact DOM structure, events, palette layout, and WebSocket protocol

(function() {
  'use strict';

  // 1. PALETTE DEFINITIONS (Pixelplace 34 Classic Colors)
  const PALETTE = [
    "#FFFFFF", "#C4C4C4", "#888888", "#222222", "#FFA7D1", "#E50000",
    "#E59500", "#A06A42", "#E5D900", "#94E044", "#02BE01", "#00D3DD",
    "#0083C7", "#0000EA", "#CF6EE4", "#820080", "#FFDFCC", "#555555",
    "#000000", "#EC08EC", "#6B0000", "#FF3904", "#633C1F", "#51E119",
    "#006600", "#36BAFF", "#044BFF", "#FBFF5B", "#98FB98", "#FF755F",
    "#5100FF", "#003638", "#B5E8EE", "#E30A17"
  ];

  const PALETTE_RGB = PALETTE.map(hex => {
    const num = parseInt(hex.slice(1), 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  });

  // 2. STATE
  const state = {
    room: 'world',
    roomMeta: { w: 2048, h: 1024, cooldownMs: 0, isBotAllowed: true },
    paintableMask: null,
    selectedColor: 18, // Default Black (#000000)
    showDrawingTags: localStorage.getItem('pixelplace_show_tags') === 'true', // Kapalı varsayılan
    showShields: localStorage.getItem('pixelplace_show_shields') === 'true', // Bot alanları gizli varsayılan
    showCursorPreview: localStorage.getItem('pixelplace_show_cursor') !== 'false', // İmleç önizleme
    user: (() => {
      try {
        // Try pixelplace_user first, then fall back to portal_username (global name)
        const u = localStorage.getItem('pixelplace_user');
        if (u) return JSON.parse(u);
        const portalName = localStorage.getItem('portal_username');
        if (portalName && portalName.length >= 2) {
          const userData = { username: portalName };
          localStorage.setItem('pixelplace_user', JSON.stringify(userData));
          return userData;
        }
        return null;
      } catch (_) { return null; }
    })(),
    token: localStorage.getItem('pixelplace_token') || null,

    // Transform State (Pan & Zoom)
    pan: { x: 0, y: 0 },
    scale: 1.0,
    minZoom: 0.2,
    maxZoom: 45.0,
    isRightDragging: false,
    dragStart: { x: 0, y: 0 },
    lockedPosition: false,

    // Continuous Painting (Left Click Hold & Spacebar Hold)
    isLeftMouseDown: false,
    isSpaceDown: false,
    lastPaintPos: null,
    lastPaintTime: 0, // Throttle timer for smooth continuous drawing (çok hızlı koymayı engeller)

    // Board hover coordinates
    hover: { x: 0, y: 0 },

    // Cooldown
    cooldownEnd: 0,
    cooldownTimer: null,

    // Turnstile tokens
    captchaTokens: { login: null, register: null },

    // Picking Coordinates for Bot / Area Protection
    pickingBotCoords: false,
    pickingProtectArea: false
  };

  // 3. DOM ELEMENTS
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const canvasContainer = document.getElementById('canvas-container');
  const canvasZoom = document.getElementById('canvas-zoom');
  const canvasMove = document.getElementById('canvas-move');
  const pixelCursor = document.getElementById('pixel-cursor');
  const coordinatesEl = document.getElementById('coordinates');
  const zoomValEl = document.getElementById('header-zoom-val');

  let imgData = null;

  // PIXEL AUTHORSHIP & LIVE INDICATOR (PixelPlace Signature Real-Time Presence)
  const pixelAuthors = new Map(); // key: 'x,y' -> { u: 'username', t: timestamp }
  setInterval(() => {
    const cutoff = Date.now() - 10000;
    for (const [key, val] of pixelAuthors.entries()) {
      if (val.t < cutoff) pixelAuthors.delete(key);
    }
  }, 10000);
  let liveTagCount = 0;
  function triggerLiveTag(x, y, username) {
    if (!state.showDrawingTags || !username || liveTagCount >= 10) return;
    const scr = toScreen(x, y);
    if (scr.x < 20 || scr.x > window.innerWidth - 40 || scr.y < 40 || scr.y > window.innerHeight - 40) return;

    liveTagCount++;
    const containerBox = canvasContainer.getBoundingClientRect();
    const tag = document.createElement('div');
    tag.className = 'live-pixel-tag';
    tag.style.left = `${scr.x - containerBox.left}px`;
    tag.style.top = `${scr.y - containerBox.top}px`;
    tag.innerHTML = `✏️ ${escapeHtml(username)}`;
    canvasContainer.appendChild(tag);
    setTimeout(() => {
      tag.remove();
      liveTagCount = Math.max(0, liveTagCount - 1);
    }, 1200);
  }

  // 4. AUDIO SYNTHESIZER
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    lastPopTime: 0,
    playPop() {
      try {
        this.init();
        if (!this.ctx) return;
        const nowMs = performance.now();
        if (nowMs - this.lastPopTime < 30) return; // limit rapid clicks to 33 sounds/sec
        this.lastPopTime = nowMs;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(960, now + 0.05);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      } catch (_) {}
    },
    playChime() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } catch (_) {}
    },
    playDeny() {
      try {
        this.init();
        if (!this.ctx) return;
        const nowMs = performance.now();
        if (nowMs - this.lastPopTime < 120) return;
        this.lastPopTime = nowMs;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (_) {}
    }
  };

  // 5. WEBSOCKET CONNECTION
  let ws = null;
  let wsReconnectTimer = null;

  function initWebSocket() {
    if (ws) {
      ws.close();
      ws = null;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('[PixelPlace] WebSocket Connected!');
      if (state.token || state.user) {
        ws.send(JSON.stringify({
          type: 'auth',
          token: state.token,
          username: state.user ? state.user.username : undefined
        }));
      }
      ws.send(JSON.stringify({ type: 'join', room: state.room }));
    };

    ws.onmessage = (event) => {
      // 1. Binary Canvas Buffer (Support both ArrayBuffer and Blob)
      if (event.data instanceof Blob) {
        event.data.arrayBuffer().then(buf => {
          loadCanvasBuffer(new Uint8Array(buf));
        }).catch(() => {});
        return;
      }
      if (event.data instanceof ArrayBuffer) {
        const u8 = new Uint8Array(event.data);
        loadCanvasBuffer(u8);
        return;
      }

      // 2. String packets (Supports Socket.IO 42["p",...] and raw JSON)
      let msgStr = event.data;
      if (typeof msgStr === 'string' && msgStr.startsWith('42[')) {
        try {
          const parsed = JSON.parse(msgStr.slice(2));
          handleSocketIoPacket(parsed[0], parsed[1]);
          return;
        } catch (_) {}
      }

      let msg;
      try {
        msg = JSON.parse(msgStr);
      } catch (_) {
        return;
      }

      if (msg.type === 'connected' || msg.type === 'room_changed') {
        state.room = msg.room;
        updateRoomUI(msg.room, msg.w, msg.h, msg.cooldownMs, msg.isBotAllowed);
        if (msg.type === 'room_changed') centerCanvas();
        if (window.ProtectionManager) window.ProtectionManager.fetchZones();
      }
      else if (msg.type === 'p') {
        applyPixel(msg.x, msg.y, msg.c);
        if (msg.u) {
          pixelAuthors.set(`${msg.x},${msg.y}`, { u: msg.u, t: Date.now() });
          triggerLiveTag(msg.x, msg.y, msg.u);
        }
      }
      else if (msg.type === 'batch_p') {
        const u = msg.u || 'Bot';
        const now = Date.now();
        for (const [x, y, c] of msg.pixels) {
          applyPixel(x, y, c, false);
          pixelAuthors.set(`${x},${y}`, { u, t: now });
        }
        ctx.putImageData(imgData, 0, 0);
        if (msg.pixels.length > 0) {
          const midP = msg.pixels[Math.floor(msg.pixels.length / 2)];
          triggerLiveTag(midP[0], midP[1], u);
        }
      }
      else if (msg.type === 'zone_protected') {
        if (window.ProtectionManager) window.ProtectionManager.onZoneProtected(msg.zone);
      }
      else if (msg.type === 'zone_unprotected') {
        if (window.ProtectionManager) window.ProtectionManager.onZoneUnprotected(msg.id);
      }
      else if (msg.type === 'portal_announcement') {
        const banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:linear-gradient(90deg,#d50000,#ff6d00,#d50000);color:#fff;padding:12px;font-size:15px;font-weight:800;text-align:center;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.8);';
        banner.innerHTML = `📢 [YÖNETİCİ DUYURUSU - ${escapeHtml(msg.author || 'Admin')}]: ${escapeHtml(msg.text)} <button style="background:rgba(0,0,0,0.4);border:1px solid #fff;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;margin-left:10px;" onclick="this.parentElement.remove()">✕</button>`;
        document.body.prepend(banner);
        setTimeout(() => { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 15000);
      }
      else if (msg.type === 'online') {
        const count = msg.counts ? msg.counts.total : 1;
        document.getElementById('online-users-count').textContent = `${count} online`;
      }
      else if (msg.type === 'chat') {
        appendChatMessage(msg.u, msg.msg, msg.t);
        AudioEngine.playChime();
      }
      else if (msg.type === 'auth_required') {
        openAuthModal('⚠️ Piksel basmak için lütfen önce bir isim girin!');
        showToast(msg.msg || 'Piksel basmak için giriş yapmalısınız!', 'warn');
      }
      else if (msg.type === 'cooldown_wait') {
        startCooldownTimer(msg.waitMs);
      }
      else if (msg.type === 'pixel_rejected') {
        showToast(msg.msg || 'Bu piksel basılamaz!', 'warn');
        AudioEngine.playDeny();
      }
      else if (msg.type === 'admin_bot_status' && msg.config) {
        if (typeof updateAdminBotUI === 'function') updateAdminBotUI(msg.config);
      }
      else if (msg.type === 'auth_ok') {
        state.user = msg.user;
        updateUserUI();
        showToast(`Welcome back, ${msg.user.username}!`);
      }
    };

    ws.onclose = () => {
      clearTimeout(wsReconnectTimer);
      wsReconnectTimer = setTimeout(initWebSocket, 2000);
    };
  }

  function handleSocketIoPacket(event, params) {
    if (event === 'p' && Array.isArray(params)) {
      applyPixel(params[0], params[1], params[2]);
    }
  }

  // 6. CANVAS RENDERING & BUFFER
  function loadCanvasBuffer(u8) {
    const w = state.roomMeta.w;
    const h = state.roomMeta.h;
    canvas.width = w;
    canvas.height = h;

    imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (let i = 0; i < u8.length; i++) {
      const colorId = u8[i];
      const rgb = PALETTE_RGB[colorId] || [0, 0, 0];
      const idx = i * 4;
      data[idx] = rgb[0];
      data[idx + 1] = rgb[1];
      data[idx + 2] = rgb[2];
      data[idx + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    centerCanvas();
  }

  function applyPixel(x, y, colorId, redraw = true) {
    const w = state.roomMeta.w;
    const h = state.roomMeta.h;
    if (x < 0 || x >= w || y < 0 || y >= h || !imgData) return;

    const rgb = PALETTE_RGB[colorId] || [0, 0, 0];
    const idx = (y * w + x) * 4;
    imgData.data[idx] = rgb[0];
    imgData.data[idx + 1] = rgb[1];
    imgData.data[idx + 2] = rgb[2];
    imgData.data[idx + 3] = 255;

    if (redraw) {
      ctx.fillStyle = PALETTE[colorId] || '#000';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // 7. TRANSFORM ENGINE (1:1 Pixelplace Zoom & Pan)
  function updateTransform() {
    canvasMove.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px)`;
    canvasZoom.style.transform = `scale(${state.scale})`;
    zoomValEl.textContent = `${Math.round(state.scale * 100)}%`;
    updateReticule();
  }

  function centerCanvas() {
    const containerBox = canvasContainer ? canvasContainer.getBoundingClientRect() : null;
    const cw = (containerBox && containerBox.width > 50) ? containerBox.width : (window.innerWidth || 1920);
    const ch = (containerBox && containerBox.height > 50) ? containerBox.height : (window.innerHeight || 1080);
    const mw = state.roomMeta.w || 2048;
    const mh = state.roomMeta.h || 1024;

    const scaleX = (cw * 0.92) / mw;
    const scaleY = (ch * 0.92) / mh;
    state.scale = Math.max(0.2, Math.min(scaleX, scaleY, 1.5));

    // Proper center in canvas coordinates (since canvasMove is inside scale(state.scale))
    state.pan.x = Math.round((cw / state.scale - mw) / 2);
    state.pan.y = Math.round((ch / state.scale - mh) / 2);

    updateTransform();
  }

  function fromScreen(screenX, screenY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.floor((screenX - rect.left) / state.scale),
      y: Math.floor((screenY - rect.top) / state.scale)
    };
  }

  function toScreen(boardX, boardY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (boardX * state.scale) + rect.left,
      y: (boardY * state.scale) + rect.top
    };
  }

  function updateReticule() {
    if (!state.showCursorPreview) {
      pixelCursor.style.display = 'none';
      return;
    }
    const { x, y } = state.hover;
    if (x < 0 || x >= state.roomMeta.w || y < 0 || y >= state.roomMeta.h) {
      pixelCursor.style.display = 'none';
      return;
    }
    const scr = toScreen(x, y);
    const containerBox = canvasContainer.getBoundingClientRect();
    const relX = scr.x - containerBox.left;
    const relY = scr.y - containerBox.top;

    pixelCursor.style.left = `${relX}px`;
    pixelCursor.style.top = `${relY}px`;
    pixelCursor.style.width = `${Math.max(1, state.scale)}px`;
    pixelCursor.style.height = `${Math.max(1, state.scale)}px`;
    pixelCursor.style.backgroundColor = PALETTE[state.selectedColor] || '#000';
    pixelCursor.style.display = 'block';

    const isOcean = state.paintableMask && !state.paintableMask[y * state.roomMeta.w + x];

    let authorHtml = '';
    if (state.showDrawingTags) {
      const author = pixelAuthors.get(`${x},${y}`);
      if (author && (Date.now() - author.t) < 8000) {
        const secAgo = Math.max(1, Math.round((Date.now() - author.t) / 1000));
        authorHtml = ` <span style="background:rgba(0,240,255,0.18);border:1px solid #00f0ff;border-radius:4px;padding:2px 7px;color:#00f0ff;font-weight:bold;margin-left:6px;font-size:11px;">✏️ Çizen: ${escapeHtml(author.u)} (${secAgo}s önce)</span>`;
      }
    }

    if (isOcean) {
      pixelCursor.style.outline = '2px solid #ff3d00';
      pixelCursor.style.boxShadow = '0 0 8px rgba(255, 61, 0, 0.7)';
      coordinatesEl.innerHTML = `(${x}, ${y})${authorHtml}`;
    } else {
      pixelCursor.style.outline = '1px solid rgba(255,255,255,0.9)';
      pixelCursor.style.boxShadow = '0 0 4px rgba(0,0,0,0.8)';
      coordinatesEl.innerHTML = `(${x}, ${y})${authorHtml}`;
    }
  }

  // Disable context menu on canvas viewport to enable authentic Right-Click Drag panning
  window.addEventListener('contextmenu', (e) => {
    if (e.target.closest('#canvas-container') || e.target.closest('.canvas-move') || e.target === canvas) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });

  // Bresenham's line algorithm for smooth continuous painting with no gaps
  function drawLine(x0, y0, x1, y1, callback) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let cx = x0, cy = y0;

    while (true) {
      callback(cx, cy);
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
    }
  }

  // 8. INPUT LISTENERS
  // KURAL 1: SOL CLICKLE ASLA HARİTA HAREKET ETTİRİLMEZ! (Sadece piksel basar ve basılı tutup gezdirince çizer)
  // KURAL 2: SAĞ TIK (ve orta tık) haritayı kaydırır
  // KURAL 3: BOŞLUK (SPACEBAR) tuşuna basılı tutup fare gezdirilince de elindeki rengi çizer
  canvasContainer.addEventListener('mousedown', (e) => {
    // SAĞ TIK (button 2) veya ORTA TIK (button 1) -> SADECE HARİTAYI KAYDIRIR!
    if (e.button === 2 || e.button === 1) {
      if (state.lockedPosition) return;
      state.isRightDragging = true;
      state.dragStart.x = e.clientX;
      state.dragStart.y = e.clientY;
      canvasContainer.style.cursor = 'grabbing';
      document.body.style.cursor = 'grabbing';
      return;
    }

    // SOL TIK (button 0) -> KOORDİNAT SEÇİM MODUNDAYSA
    if (e.button === 0 && (state.pickingBotCoords || state.pickingProtectArea)) {
      const pt = fromScreen(e.clientX, e.clientY);
      if (state.pickingBotCoords && window.BotStudio) {
        window.BotStudio.setTargetCoords(pt.x, pt.y);
      } else if (state.pickingProtectArea && window.ProtectionManager) {
        window.ProtectionManager.setPickedCoords(pt.x, pt.y);
      }
      return;
    }

    // SOL TIK (button 0) -> ASLA HAREKET ETTİRMEZ! SADECE PİKSEL BASAR VE ÇİZER!
    if (e.button === 0) {
      state.isLeftMouseDown = true;
      const pt = fromScreen(e.clientX, e.clientY);
      state.lastPaintPos = { x: pt.x, y: pt.y };
      attemptPlacePixel(pt.x, pt.y, true);
    }
  });

  window.addEventListener('mousemove', (e) => {
    const pt = fromScreen(e.clientX, e.clientY);
    state.hover.x = pt.x;
    state.hover.y = pt.y;

    // 1. SAĞ TIKLA HARİTAYI KAYDIRMA
    if (state.isRightDragging && !state.lockedPosition) {
      const dx = e.clientX - state.dragStart.x;
      const dy = e.clientY - state.dragStart.y;
      state.pan.x += dx / state.scale;
      state.pan.y += dy / state.scale;
      state.dragStart.x = e.clientX;
      state.dragStart.y = e.clientY;
      updateTransform();
      return;
    }

    // 2. SOL TIK BASILI TUTUP GEZDİRİNCE VEYA BOŞLUK TUŞU BASILIYKEN ÇİZME!
    if (state.isLeftMouseDown || state.isSpaceDown) {
      if (state.lastPaintPos) {
        drawLine(state.lastPaintPos.x, state.lastPaintPos.y, pt.x, pt.y, (px, py) => {
          attemptPlacePixel(px, py, false);
        });
      } else {
        attemptPlacePixel(pt.x, pt.y, false);
      }
      state.lastPaintPos = { x: pt.x, y: pt.y };
    }

    updateReticule();
  });

  window.addEventListener('mouseup', (e) => {
    // Sağ tık bırakıldı
    if (e.button === 2 || e.button === 1) {
      state.isRightDragging = false;
      canvasContainer.style.cursor = 'crosshair';
      document.body.style.cursor = '';
    }
    // Sol tık bırakıldı
    if (e.button === 0) {
      state.isLeftMouseDown = false;
      state.lastPaintPos = null;
    }
  });

  // BOŞLUK (SPACEBAR) TUŞUNA BASINCA VEYA BASILI TUTUP FAREYİ HAREKET ETTİRİNCE ÇİZME
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!state.isSpaceDown) {
        state.isSpaceDown = true;
        state.lastPaintPos = { x: state.hover.x, y: state.hover.y };
        attemptPlacePixel(state.hover.x, state.hover.y, true);
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      state.isSpaceDown = false;
      state.lastPaintPos = null;
    }
  });

  window.addEventListener('blur', () => {
    state.isRightDragging = false;
    state.isLeftMouseDown = false;
    state.isSpaceDown = false;
    state.lastPaintPos = null;
    canvasContainer.style.cursor = 'crosshair';
    document.body.style.cursor = '';
  });

  // Smooth Zoom Centered on Mouse Cursor
  canvasContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const oldScale = state.scale;

    const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
    const newScale = Math.max(state.minZoom, Math.min(state.maxZoom, oldScale * zoomFactor));

    if (newScale !== oldScale) {
      const containerBox = canvasContainer.getBoundingClientRect();
      const dx = e.clientX - containerBox.left - (containerBox.width / 2);
      const dy = e.clientY - containerBox.top - (containerBox.height / 2);

      state.pan.x -= dx / oldScale;
      state.pan.x += dx / newScale;
      state.pan.y -= dy / oldScale;
      state.pan.y += dy / newScale;

      state.scale = newScale;
      updateTransform();
    }
  }, { passive: false });

  // 9. PIXEL PLACEMENT
  function attemptPlacePixel(x, y, showToastNotice = true) {
    if (x < 0 || x >= state.roomMeta.w || y < 0 || y >= state.roomMeta.h) return;

    // GİRİŞ KONTROLÜ (Giriş yapmadan / isim belirlemeden piksel basılamaz!)
    if (!state.user) {
      openAuthModal('⚠️ Piksel basmak için lütfen bir kullanıcı adı belirleyin!');
      if (showToastNotice) {
        showToast('⚠️ Piksel basmak için lütfen önce bir isim girin!', 'warn');
      }
      return;
    }

    // 1. DENİZ KONTROLÜ: Denizler ve Okyanuslar BOYANAMAZ!
    if (state.paintableMask && !state.paintableMask[y * state.roomMeta.w + x]) {
      if (showToastNotice) {
        showToast('🌊 Deniz ve okyanuslar boyanamaz! Sadece karalara piksel koyabilirsiniz.', 'warn');
        AudioEngine.playDeny();
      }
      return;
    }

    const colorId = state.selectedColor;

    // Eğer o piksel zaten bu renkteyse tekrar yollama (Aşırı paket yükünü engeller)
    if (imgData) {
      const w = state.roomMeta.w;
      const idx = (y * w + x) * 4;
      const targetRgb = PALETTE_RGB[colorId];
      if (targetRgb &&
          imgData.data[idx] === targetRgb[0] &&
          imgData.data[idx + 1] === targetRgb[1] &&
          imgData.data[idx + 2] === targetRgb[2]) {
        return;
      }
    }

    // 2. ÇOK HIZLI KOYMASINLAR (Çizim Hızı Sınırlayıcı - Throttling, Cooldown Kilidi DEĞİL)
    // Tek tıklamalarda anında basar (0ms). Sürükleyerek çizerken ise saniyede ~20 piksel akıcı hız limiti (50ms aralık) uygular.
    const now = performance.now();
    if (!showToastNotice && (now - state.lastPaintTime < 50)) {
      return;
    }
    state.lastPaintTime = now;

    // Optimistic local update
    applyPixel(x, y, colorId);
    pixelAuthors.set(`${x},${y}`, { u: state.user ? state.user.username : 'Sen', t: Date.now() });
    AudioEngine.playPop();

    // Send in both standard JSON and Pixelplace Socket.IO 42 format
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'p', x, y, c: colorId }));
    }
  }

  function startCooldownTimer(durationMs) {
    const timerBadge = document.getElementById('timer');
    const timerText = document.getElementById('timer-text');
    if (!timerBadge || !timerText) return;
    timerBadge.className = 'timer-badge ready';
    timerBadge.style.borderColor = '#00e676';
    timerBadge.style.color = '#00e676';
    timerText.textContent = '⚡ 0s';
  }

  // 10. PALETTE RENDERING (Pixelplace 1:1 #palette-buttons > a)
  function renderPalette() {
    const bottomDock = document.getElementById('palette-buttons');
    const sidePalette = document.getElementById('sidebar-palette');
    bottomDock.innerHTML = '';
    sidePalette.innerHTML = '';

    PALETTE.forEach((hex, idx) => {
      // Bottom Dock Anchor
      const a = document.createElement('a');
      a.setAttribute('data-id', idx);
      a.setAttribute('title', hex);
      a.style.backgroundColor = hex;
      if (idx === state.selectedColor) a.className = 'selected';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        selectColor(idx);
      });
      bottomDock.appendChild(a);

      // Sidebar Swatch
      const btn = document.createElement('div');
      btn.className = 'palette-btn' + (idx === state.selectedColor ? ' selected' : '');
      btn.style.backgroundColor = hex;
      btn.title = `${hex} (#${idx})`;
      btn.addEventListener('click', () => selectColor(idx));
      sidePalette.appendChild(btn);
    });
  }

  function selectColor(idx) {
    state.selectedColor = idx;
    // Update bottom dock
    document.querySelectorAll('#palette-buttons > a').forEach(el => {
      el.classList.toggle('selected', parseInt(el.getAttribute('data-id'), 10) === idx);
    });
    // Update sidebar palette
    document.querySelectorAll('.palette-btn').forEach((el, i) => {
      el.classList.toggle('selected', i === idx);
    });
    updateReticule();
  }

  // 11. ROOM SELECTOR
  function updateRoomUI(roomId, w, h, cooldownMs, isBotAllowed) {
    state.roomMeta = { w, h, cooldownMs, isBotAllowed };
    fetchPaintableMask(roomId);
    const titles = {
      world: '🌍 Pixels World',
      turkey: '🇹🇷 Türkiye Haritası'
    };
    const cvText = document.getElementById('canvas-name-text');
    if (cvText) cvText.textContent = titles[roomId] || roomId;

    const timerBadge = document.getElementById('timer');
    const timerText = document.getElementById('timer-text');
    if (timerBadge && timerText) {
      timerBadge.className = 'timer-badge ready';
      timerBadge.style.borderColor = '#00e676';
      timerBadge.style.color = '#00e676';
      timerText.textContent = '⚡ 0s';
    }

    document.querySelectorAll('.cd-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-room') === roomId);
    });
  }

  // Dropdown toggle
  const canvasDropdownBtn = document.getElementById('canvas-dropdown-btn');
  const canvasDropdownMenu = document.getElementById('canvas-dropdown-menu');
  if (canvasDropdownBtn && canvasDropdownMenu) {
    canvasDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      canvasDropdownMenu.classList.toggle('hidden');
    });
    window.addEventListener('click', () => canvasDropdownMenu.classList.add('hidden'));
  }

  document.querySelectorAll('.cd-item').forEach(item => {
    item.addEventListener('click', () => {
      const room = item.getAttribute('data-room');
      if (canvasDropdownMenu) canvasDropdownMenu.classList.add('hidden');
      if (room !== state.room && ws && ws.readyState === WebSocket.OPEN) {
        showToast(`Switching to: ${room}...`);
        ws.send(JSON.stringify({ type: 'join', room }));
      }
    });
  });

  // 12. SIDEBAR CONTROLS
  const sidebarContainer = document.getElementById('sidebar-container');
  const sidebarTrigger = document.getElementById('sidebar-trigger');
  const sidebarTriggerIcon = document.getElementById('sidebar-trigger-icon');

  if (sidebarTrigger && sidebarContainer) {
    sidebarTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      sidebarContainer.classList.toggle('collapsed');
      if (sidebarTriggerIcon) {
        sidebarTriggerIcon.textContent = sidebarContainer.classList.contains('collapsed') ? '▶' : '◀';
      }
    });
  }

  document.getElementById('lock-canvas')?.addEventListener('change', (e) => {
    state.lockedPosition = e.target.checked;
  });
  document.getElementById('btn-reset-view')?.addEventListener('click', (e) => {
    e.preventDefault();
    centerCanvas();
  });
  document.getElementById('btn-download-canvas')?.addEventListener('click', (e) => {
    e.preventDefault();
    const link = document.createElement('a');
    link.download = `pixelplace_${state.room}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // Drawing Tags Toggle Handlers (Header button & Sidebar checkbox)
  function setDrawingTagsVisible(visible) {
    state.showDrawingTags = !!visible;
    localStorage.setItem('pixelplace_show_tags', state.showDrawingTags ? 'true' : 'false');
    const hdrBtn = document.getElementById('btn-toggle-tags');
    if (hdrBtn) {
      hdrBtn.textContent = state.showDrawingTags ? '🏷️ Çizen İsimleri: AÇIK' : '🏷️ Çizen İsimleri: KAPALI';
      hdrBtn.classList.toggle('active', state.showDrawingTags);
    }
    const sideCheck = document.getElementById('toggle-drawing-tags');
    if (sideCheck) {
      sideCheck.checked = state.showDrawingTags;
    }
    if (!state.showDrawingTags) {
      document.querySelectorAll('.canvas-live-tag').forEach(el => el.remove());
    }
    updateHoverCoordinates();
  }

  document.getElementById('btn-toggle-tags')?.addEventListener('click', (e) => {
    e.preventDefault();
    setDrawingTagsVisible(!state.showDrawingTags);
    showToast(state.showDrawingTags ? '🏷️ Çizen isimleri açıldı.' : '🏷️ Çizen isimleri gizlendi.');
  });
  document.getElementById('toggle-drawing-tags')?.addEventListener('change', (e) => {
    setDrawingTagsVisible(e.target.checked);
  });

  // Shields (Bot Alanları) Toggle
  function setShieldsVisible(visible) {
    state.showShields = !!visible;
    localStorage.setItem('pixelplace_show_shields', state.showShields ? 'true' : 'false');
    const sideCheck = document.getElementById('toggle-shield-markers');
    if (sideCheck) sideCheck.checked = state.showShields;
    if (window.ProtectionManager) window.ProtectionManager.renderCanvasShields();
    showToast(state.showShields ? '🛡️ Koruma alanları çerçeveleri gösteriliyor.' : '🛡️ Koruma alanları çerçeveleri gizlendi.');
  }

  document.getElementById('toggle-shield-markers')?.addEventListener('change', (e) => {
    setShieldsVisible(e.target.checked);
  });

  // Cursor Preview Toggle
  function setCursorPreviewVisible(visible) {
    state.showCursorPreview = !!visible;
    localStorage.setItem('pixelplace_show_cursor', state.showCursorPreview ? 'true' : 'false');
    const sideCheck = document.getElementById('toggle-cursor-preview');
    if (sideCheck) sideCheck.checked = state.showCursorPreview;
    updateReticule();
    showToast(state.showCursorPreview ? '🎯 Çizim imleci açıldı.' : '🎯 Çizim imleci gizlendi.');
  }

  document.getElementById('toggle-cursor-preview')?.addEventListener('change', (e) => {
    setCursorPreviewVisible(e.target.checked);
  });

  // Initial sync
  setDrawingTagsVisible(state.showDrawingTags);
  const initialShieldCheck = document.getElementById('toggle-shield-markers');
  if (initialShieldCheck) initialShieldCheck.checked = state.showShields;
  const initialCursorCheck = document.getElementById('toggle-cursor-preview');
  if (initialCursorCheck) initialCursorCheck.checked = state.showCursorPreview;

  // 13. CHAT (#tchat)
  const tchat = document.getElementById('tchat');
  const btnToggleChat = document.getElementById('btn-toggle-tchat');
  const tchatClose = document.getElementById('tchat-close');
  const chatChannelContent = document.getElementById('chat-channel-content');
  const tchatForm = document.getElementById('tchat-form');
  const tchatInput = document.getElementById('tchat-input-field');

  btnToggleChat?.addEventListener('click', () => tchat?.classList.toggle('hidden'));
  tchatClose?.addEventListener('click', () => tchat?.classList.add('hidden'));

  tchatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = tchatInput ? tchatInput.value.trim() : '';
    if (!text) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chat', msg: text }));
      if (tchatInput) tchatInput.value = '';
    }
  });

  function appendChatMessage(username, message, timestamp) {
    const line = document.createElement('div');
    line.className = 'chat-line';
    const timeStr = new Date(timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    line.innerHTML = `<span class="cl-time">${timeStr}</span><span class="cl-user">${escapeHtml(username)}:</span><span>${escapeHtml(message)}</span>`;
    chatChannelContent.appendChild(line);
    chatChannelContent.scrollTop = chatChannelContent.scrollHeight;
  }

  // 14. AUTH MODALS & USERNAME-ONLY LOGIN (1:1 PIXELPLACE)
  const modalLogin = document.getElementById('modal-login');
  const btnCloseAuth = document.getElementById('btn-close-auth-modal');
  const formQuickAuth = document.getElementById('form-quick-auth');
  const inQuickUsername = document.getElementById('in-quick-username');
  const authErr = document.getElementById('auth-err');

  function openAuthModal(hintText = '') {
    modalLogin.classList.remove('hidden');
    if (authErr) {
      if (hintText) {
        authErr.textContent = hintText;
        authErr.classList.remove('hidden');
      } else {
        authErr.classList.add('hidden');
      }
    }
    setTimeout(() => {
      if (inQuickUsername) inQuickUsername.focus();
    }, 100);
  }
  window.openAuthModal = openAuthModal;

  document.querySelectorAll('.trigger-modal-auth').forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal();
    });
  });

  if (btnCloseAuth) {
    btnCloseAuth.addEventListener('click', () => modalLogin.classList.add('hidden'));
  }

  window.verifyTurnstile = function(type) {
    const el = document.getElementById(`cf-${type}-sim`);
    if (el) {
      el.classList.add('verified');
      state.captchaTokens[type] = 'cf_verified_' + Math.random().toString(36).slice(2);
      showToast('🛡️ Cloudflare Doğrulaması Başarılı!');
    }
  };

  // Quick Auth (Username Only) Submission
  if (formQuickAuth) {
    formQuickAuth.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawName = inQuickUsername.value.trim();
      if (!rawName) return;

      authErr.classList.add('hidden');
      const submitBtn = document.getElementById('btn-submit-quick-auth');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'GİRİŞ YAPILIYOR...';
      }

      try {
        const res = await fetch('/api/quick-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: rawName,
            captchaToken: state.captchaTokens.login
          })
        });
        const data = await res.json();
        if (!res.ok) {
          authErr.textContent = data.error || 'Giriş yapılamadı.';
          authErr.classList.remove('hidden');
          return;
        }

        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('pixelplace_token', data.token);
        localStorage.setItem('pixelplace_user', JSON.stringify(data.user));
        localStorage.setItem('portal_username', data.user.username);
        localStorage.setItem('portal_game_username', data.user.username);

        modalLogin.classList.add('hidden');
        updateUserUI();
        AudioEngine.playChime();
        showToast(`🎉 Hoş geldin, ${data.user.username}! Artık tuvalde piksel basabilirsin.`);

        // Authenticate WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'auth', token: data.token, username: data.user.username }));
        }

        // If user was hovering on canvas, immediately place pixel!
        if (state.hover && state.hover.x >= 0 && state.hover.x < state.roomMeta.w && state.hover.y >= 0 && state.hover.y < state.roomMeta.h) {
          attemptPlacePixel(state.hover.x, state.hover.y, false);
        }
      } catch (_) {
        authErr.textContent = 'Sunucu bağlantı hatası!';
        authErr.classList.remove('hidden');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'OYNA VE PİKSEL BAS';
        }
      }
    });
  }

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch (_) {}
    localStorage.removeItem('pixelplace_token');
    localStorage.removeItem('pixelplace_user');
    state.token = null;
    state.user = null;
    updateUserUI();
    showToast('Çıkış yapıldı. Piksel basmak için tekrar bir isim belirlemelisin.');
  });

  function updateUserUI() {
    const authHdr = document.getElementById('auth-buttons-header');
    const profileHdr = document.getElementById('user-profile-header');
    const sideAuth = document.getElementById('sidebar-auth-block');

    if (state.user) {
      if (authHdr) authHdr.classList.add('hidden');
      if (profileHdr) profileHdr.classList.remove('hidden');
      document.getElementById('u-username').textContent = state.user.username;
      document.getElementById('u-pixels').textContent = `${(state.user.pixels_placed || 0).toLocaleString()} px`;
      if (sideAuth) {
        sideAuth.innerHTML = `
          <div style="padding:4px 0;">
            <div style="font-size:13px;color:#00dbff;font-weight:bold;">👤 ${escapeHtml(state.user.username)}</div>
            <div style="font-size:11px;color:#ffd54f;margin:2px 0;">⚡ ${(state.user.pixels_placed || 0).toLocaleString()} piksel</div>
            <a href="#" id="side-logout-btn" style="font-size:11px;color:#ff5252;text-decoration:none;">[Çıkış Yap]</a>
          </div>
        `;
        document.getElementById('side-logout-btn')?.addEventListener('click', (e) => {
          e.preventDefault();
          document.getElementById('btn-logout').click();
        });
      }
    } else {
      if (authHdr) authHdr.classList.remove('hidden');
      if (profileHdr) profileHdr.classList.add('hidden');
      if (sideAuth) {
        sideAuth.innerHTML = `<a class="button trigger-modal-auth btn-signup-side" href="#" onclick="window.openAuthModal(); return false;">👤 İsim Seç / Oyna</a>`;
      }
    }

    // Toggle admin bot link in sidebar
    const isAdmin = (state.user && state.user.role === 'admin') || localStorage.getItem('portal_is_admin') === 'true';
    const sideAdminBtn = document.getElementById('btn-sidebar-admin-bot');
    if (sideAdminBtn) {
      sideAdminBtn.classList.toggle('hidden', !isAdmin);
    }
  }

  async function checkAuthSession() {
    const savedUser = localStorage.getItem('pixelplace_user');
    if (savedUser) {
      try {
        state.user = JSON.parse(savedUser);
        updateUserUI();
      } catch (_) {}
    }
    if (!state.token) {
      if (state.user && state.user.username) {
        try {
          const res = await fetch('/api/quick-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: state.user.username, captchaToken: 'auto_pass' })
          });
          const d = await res.json();
          if (d.success && d.token) {
            state.token = d.token;
            state.user = d.user;
            localStorage.setItem('pixelplace_token', d.token);
            localStorage.setItem('pixelplace_user', JSON.stringify(d.user));
            updateUserUI();
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'auth', token: d.token, username: d.user.username }));
            }
          }
        } catch (_) {}
      }
      return;
    }
    try {
      const res = await fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const data = await res.json();
      if (data.authenticated && data.user) {
        state.user = data.user;
        localStorage.setItem('pixelplace_user', JSON.stringify(data.user));
        updateUserUI();
      }
    } catch (_) {}
  }

  // 15. OFFICIAL BOT & AREA PROTECTION SYSTEM
  const modalBot = document.getElementById('modal-bot');
  document.getElementById('btn-toggle-bot-info')?.addEventListener('click', () => {
    modalBot.classList.remove('hidden');
    if (window.ProtectionManager) window.ProtectionManager.fetchZones();
    fetchAdminBotConfig();
  });
  document.getElementById('btn-close-bot-info')?.addEventListener('click', () => modalBot.classList.add('hidden'));

  document.getElementById('btn-sidebar-admin-bot')?.addEventListener('click', (e) => {
    e.preventDefault();
    modalBot.classList.remove('hidden');
    document.querySelectorAll('.bot-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.bot-tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelector('.bot-tab-btn[data-tab="tab-official-bot"]')?.classList.add('active');
    document.getElementById('tab-official-bot')?.classList.remove('hidden');
    fetchAdminBotConfig();
  });

  function updateAdminBotUI(cfg) {
    if (!cfg) return;
    const btnToggle = document.getElementById('admin-bot-toggle-btn');
    if (btnToggle) {
      btnToggle.textContent = cfg.enabled ? '🟢 AKTİF' : '🔴 DURDURULDU';
      btnToggle.style.background = cfg.enabled ? '#00e676' : '#ff1744';
      btnToggle.style.color = cfg.enabled ? '#000' : '#fff';
    }
    const speedSel = document.getElementById('admin-bot-speed-sel');
    if (speedSel && cfg.repairSpeedMs) {
      speedSel.value = String(cfg.repairSpeedMs);
    }
    const btnDoodle = document.getElementById('admin-bot-doodle-btn');
    if (btnDoodle) {
      btnDoodle.textContent = cfg.doodlesEnabled ? '🎨 AÇIK' : '🚫 KAPALI';
      btnDoodle.style.background = cfg.doodlesEnabled ? '#00e5ff' : '#757575';
      btnDoodle.style.color = cfg.doodlesEnabled ? '#000' : '#fff';
    }
  }

  async function fetchAdminBotConfig() {
    try {
      const res = await fetch('/api/admin/bot-config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) updateAdminBotUI(data.config);
      }
    } catch (_) {}
  }

  // Official Admin Bot Control Button Listeners
  document.getElementById('admin-bot-toggle-btn')?.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'admin_bot_cmd', action: 'toggle' }));
    }
  });
  document.getElementById('admin-bot-speed-sel')?.addEventListener('change', (e) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'admin_bot_cmd', action: 'speed', speedMs: parseInt(e.target.value, 10) }));
    }
  });
  document.getElementById('admin-bot-doodle-btn')?.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'admin_bot_cmd', action: 'doodle_toggle' }));
    }
  });
  document.getElementById('admin-bot-repaint-btn')?.addEventListener('click', () => {
    if (confirm('Tüm 20 ülkenin bayrak piksellerini sıfırlayıp yeniden çizmek istediğinize emin misiniz?')) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'admin_bot_cmd', action: 'repaint_countries' }));
      }
    }
  });

  // Helper: Closest Color in 34-color Pixelplace Palette
  function findClosestColor(r, g, b) {
    let minDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < PALETTE_RGB.length; i++) {
      const [pr, pg, pb] = PALETTE_RGB[i];
      const dr = r - pr;
      const dg = g - pg;
      const db = b - pb;
      // Weighted perception distance: 2*R^2 + 4*G^2 + 3*B^2
      const dist = dr * dr * 2 + dg * dg * 4 + db * db * 3;
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  const BotStudio = {
    currentPreset: 'trflag',
    artWidth: 32,
    artHeight: 20,
    matrix: [],
    targetX: 1000,
    targetY: 500,
    isRunning: false,
    timerId: null,
    ghostEl: null,

    init() {
      // Setup tabs
      document.querySelectorAll('.bot-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.bot-tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.bot-tab-content').forEach(c => c.classList.add('hidden'));
          btn.classList.add('active');
          const targetId = btn.getAttribute('data-tab');
          document.getElementById(targetId)?.classList.remove('hidden');
          if (targetId === 'tab-protect') {
            ProtectionManager.fetchZones();
          }
        });
      });

      // Presets buttons
      document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const preset = btn.getAttribute('data-preset');
          this.loadPreset(preset);
        });
      });

      // File upload
      const fileInput = document.getElementById('bot-file-input');
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) this.loadFile(file);
        });
      }

      // Max width selector
      document.getElementById('bot-max-width')?.addEventListener('change', () => {
        if (this.currentPreset) {
          this.loadPreset(this.currentPreset);
        }
      });

      // Coordinate inputs
      const inX = document.getElementById('bot-target-x');
      const inY = document.getElementById('bot-target-y');
      inX?.addEventListener('input', () => {
        this.targetX = parseInt(inX.value, 10) || 0;
        this.updateGhost();
      });
      inY?.addEventListener('input', () => {
        this.targetY = parseInt(inY.value, 10) || 0;
        this.updateGhost();
      });

      // Coordinate pick button
      document.getElementById('btn-pick-bot-coord')?.addEventListener('click', () => {
        this.startPickCoords();
      });

      // Start / Stop buttons
      document.getElementById('btn-start-bot')?.addEventListener('click', () => {
        this.start();
      });
      document.getElementById('btn-stop-bot')?.addEventListener('click', () => {
        this.stop();
      });

      // Load initial preset
      this.loadPreset('trflag');
    },

    startPickCoords() {
      state.pickingBotCoords = true;
      state.pickingProtectArea = false;
      const btn = document.getElementById('btn-pick-bot-coord');
      if (btn) {
        btn.classList.add('picking');
        btn.textContent = '🎯 Tuvale Tıkla...';
      }
      modalBot.classList.add('hidden');
      showToast('📍 Botun başlayacağı yeri seçmek için haritada bir noktaya tıklayın!', 'info');
    },

    setTargetCoords(x, y) {
      state.pickingBotCoords = false;
      this.targetX = Math.max(0, Math.min(x, state.roomMeta.w - this.artWidth));
      this.targetY = Math.max(0, Math.min(y, state.roomMeta.h - this.artHeight));

      const inX = document.getElementById('bot-target-x');
      const inY = document.getElementById('bot-target-y');
      if (inX) inX.value = this.targetX;
      if (inY) inY.value = this.targetY;

      const btn = document.getElementById('btn-pick-bot-coord');
      if (btn) {
        btn.classList.remove('picking');
        btn.textContent = '📍 Haritadan Seç';
      }

      this.updateGhost();
      modalBot.classList.remove('hidden');
      showToast(`🎯 Başlangıç Koordinatı Belirlendi: (${this.targetX}, ${this.targetY})`);
    },

    quantizeImageData(srcCtx, w, h) {
      const img = srcCtx.getImageData(0, 0, w, h);
      const data = img.data;
      const matrix = new Int16Array(w * h);

      for (let i = 0; i < w * h; i++) {
        const offset = i * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const a = data[offset + 3];

        if (a < 64) {
          matrix[i] = -1; // Transparent
        } else {
          matrix[i] = findClosestColor(r, g, b);
        }
      }
      return matrix;
    },

    updatePreview() {
      const previewCanvas = document.getElementById('bot-preview-canvas');
      if (!previewCanvas) return;
      previewCanvas.width = this.artWidth;
      previewCanvas.height = this.artHeight;
      const pCtx = previewCanvas.getContext('2d');
      const imgDataObj = pCtx.createImageData(this.artWidth, this.artHeight);
      let validPixels = 0;

      for (let i = 0; i < this.artWidth * this.artHeight; i++) {
        const cId = this.matrix[i];
        const offset = i * 4;
        if (cId === -1) {
          imgDataObj.data[offset] = 0;
          imgDataObj.data[offset + 1] = 0;
          imgDataObj.data[offset + 2] = 0;
          imgDataObj.data[offset + 3] = 0;
        } else {
          validPixels++;
          const rgb = PALETTE_RGB[cId] || [0, 0, 0];
          imgDataObj.data[offset] = rgb[0];
          imgDataObj.data[offset + 1] = rgb[1];
          imgDataObj.data[offset + 2] = rgb[2];
          imgDataObj.data[offset + 3] = 255;
        }
      }
      pCtx.putImageData(imgDataObj, 0, 0);

      const infoEl = document.getElementById('bot-preview-info');
      if (infoEl) {
        infoEl.textContent = `${this.artWidth} x ${this.artHeight} px (${validPixels} px)`;
      }

      this.updateGhost();
    },

    updateGhost() {
      if (!this.ghostEl) {
        this.ghostEl = document.createElement('div');
        this.ghostEl.className = 'canvas-ghost-preview';
        canvasMove.appendChild(this.ghostEl);
      }
      this.ghostEl.style.left = `${this.targetX}px`;
      this.ghostEl.style.top = `${this.targetY}px`;
      this.ghostEl.style.width = `${this.artWidth}px`;
      this.ghostEl.style.height = `${this.artHeight}px`;
    },

    loadPreset(presetName) {
      this.currentPreset = presetName;
      const offCanvas = document.createElement('canvas');
      const offCtx = offCanvas.getContext('2d');

      if (presetName === 'trflag') {
        const w = 32, h = 20;
        offCanvas.width = w;
        offCanvas.height = h;
        // Turkish Red background
        offCtx.fillStyle = '#E30A17';
        offCtx.fillRect(0, 0, w, h);

        // White crescent base
        offCtx.fillStyle = '#FFFFFF';
        offCtx.beginPath();
        offCtx.arc(12, 10, 6, 0, Math.PI * 2);
        offCtx.fill();

        // Carve inner crescent with red
        offCtx.fillStyle = '#E30A17';
        offCtx.beginPath();
        offCtx.arc(14, 10, 4.8, 0, Math.PI * 2);
        offCtx.fill();

        // White 5-pointed star
        offCtx.fillStyle = '#FFFFFF';
        drawStar(offCtx, 19.5, 10, 5, 3.2, 1.4);

        this.artWidth = w;
        this.artHeight = h;
      }
      else if (presetName === 'crescent') {
        const w = 24, h = 24;
        offCanvas.width = w;
        offCanvas.height = h;
        offCtx.clearRect(0, 0, w, h);
        offCtx.fillStyle = '#FFFFFF';
        offCtx.beginPath();
        offCtx.arc(10, 12, 9, 0, Math.PI * 2);
        offCtx.fill();
        offCtx.globalCompositeOperation = 'destination-out';
        offCtx.beginPath();
        offCtx.arc(13.5, 12, 7.5, 0, Math.PI * 2);
        offCtx.fill();
        offCtx.globalCompositeOperation = 'source-over';
        drawStar(offCtx, 18, 12, 5, 4, 1.8);

        this.artWidth = w;
        this.artHeight = h;
      }
      else if (presetName === 'amongus') {
        const w = 16, h = 20;
        offCanvas.width = w;
        offCanvas.height = h;
        offCtx.clearRect(0, 0, w, h);
        offCtx.fillStyle = '#E50000';
        offCtx.fillRect(4, 2, 8, 14);
        offCtx.fillRect(2, 6, 2, 8); // backpack
        offCtx.fillRect(4, 16, 3, 3); // left leg
        offCtx.fillRect(9, 16, 3, 3); // right leg
        // Outline black
        offCtx.strokeStyle = '#000000';
        offCtx.lineWidth = 1;
        offCtx.strokeRect(3.5, 1.5, 9, 15);
        // Visor cyan
        offCtx.fillStyle = '#36BAFF';
        offCtx.fillRect(7, 5, 6, 4);
        offCtx.fillStyle = '#FFFFFF';
        offCtx.fillRect(9, 6, 2, 1); // shine

        this.artWidth = w;
        this.artHeight = h;
      }
      else if (presetName === 'sword') {
        const w = 16, h = 16;
        offCanvas.width = w;
        offCanvas.height = h;
        offCtx.clearRect(0, 0, w, h);
        offCtx.fillStyle = '#00D3DD';
        for (let i = 0; i < 9; i++) {
          offCtx.fillRect(6 + i, 1 + i, 1, 1);
          offCtx.fillRect(7 + i, 0 + i, 1, 1);
        }
        offCtx.fillStyle = '#0083C7';
        for (let i = 0; i < 8; i++) {
          offCtx.fillRect(5 + i, 2 + i, 1, 1);
        }
        // Guard & Handle
        offCtx.fillStyle = '#633C1F';
        offCtx.fillRect(3, 11, 2, 2);
        offCtx.fillRect(2, 12, 2, 2);
        offCtx.fillStyle = '#A06A42';
        offCtx.fillRect(1, 13, 2, 2);

        this.artWidth = w;
        this.artHeight = h;
      }
      else if (presetName === 'heart') {
        const w = 16, h = 16;
        offCanvas.width = w;
        offCanvas.height = h;
        offCtx.clearRect(0, 0, w, h);
        offCtx.fillStyle = '#E50000';
        offCtx.beginPath();
        offCtx.moveTo(8, 14);
        offCtx.bezierCurveTo(2, 9, 0, 4, 4, 2);
        offCtx.bezierCurveTo(7, 0, 8, 3, 8, 4);
        offCtx.bezierCurveTo(8, 3, 9, 0, 12, 2);
        offCtx.bezierCurveTo(16, 4, 14, 9, 8, 14);
        offCtx.fill();
        offCtx.fillStyle = '#FFA7D1';
        offCtx.fillRect(4, 4, 2, 2);

        this.artWidth = w;
        this.artHeight = h;
      }
      else if (presetName === 'crown') {
        const w = 20, h = 14;
        offCanvas.width = w;
        offCanvas.height = h;
        offCtx.clearRect(0, 0, w, h);
        offCtx.fillStyle = '#E5D900';
        offCtx.fillRect(2, 10, 16, 3);
        offCtx.fillRect(2, 4, 3, 6);
        offCtx.fillRect(8, 2, 4, 8);
        offCtx.fillRect(15, 4, 3, 6);
        offCtx.fillStyle = '#E50000';
        offCtx.fillRect(9, 4, 2, 2);
        offCtx.fillStyle = '#0083C7';
        offCtx.fillRect(3, 6, 1, 1);
        offCtx.fillRect(16, 6, 1, 1);

        this.artWidth = w;
        this.artHeight = h;
      }

      this.matrix = this.quantizeImageData(offCtx, this.artWidth, this.artHeight);
      this.updatePreview();
    },

    loadFile(file) {
      this.currentPreset = null;
      document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = parseInt(document.getElementById('bot-max-width')?.value || '64', 10);
          let w = img.width;
          let h = img.height;
          if (w > maxDim) {
            h = Math.round(h * (maxDim / w));
            w = maxDim;
          }
          if (h > maxDim) {
            w = Math.round(w * (maxDim / h));
            h = maxDim;
          }
          w = Math.max(4, Math.min(256, w));
          h = Math.max(4, Math.min(256, h));

          const offCanvas = document.createElement('canvas');
          offCanvas.width = w;
          offCanvas.height = h;
          const offCtx = offCanvas.getContext('2d');
          offCtx.drawImage(img, 0, 0, w, h);

          this.artWidth = w;
          this.artHeight = h;
          this.matrix = this.quantizeImageData(offCtx, w, h);
          this.updatePreview();
          showToast(`🖼️ Resim uyarlandı: ${w}x${h} piksel!`);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    async start() {
      if (this.isRunning) return;

      if (!state.user) {
        openAuthModal('⚠️ Bot çalıştırmak için lütfen önce bir isim belirleyin!');
        return;
      }

      // Check auto protect
      const autoProtCheck = document.getElementById('bot-auto-protect-check');
      if (autoProtCheck && autoProtCheck.checked) {
        const zoneName = this.currentPreset ? `Bot Sanatı (${this.currentPreset})` : 'Bot Sanatı';
        ProtectionManager.createZone(this.targetX, this.targetY, this.artWidth, this.artHeight, zoneName, false);
      }

      this.isRunning = true;
      document.getElementById('btn-start-bot')?.classList.add('hidden');
      document.getElementById('btn-stop-bot')?.classList.remove('hidden');

      const progressBox = document.getElementById('bot-progress-box');
      const progressFill = document.getElementById('bot-progress-fill');
      const progressCount = document.getElementById('bot-progress-count');
      const statusText = document.getElementById('bot-status-text');
      progressBox?.classList.remove('hidden');

      const speedMs = parseInt(document.getElementById('bot-speed-select')?.value || '20', 10);

      // Collect pixels to paint
      const queue = [];
      for (let y = 0; y < this.artHeight; y++) {
        for (let x = 0; x < this.artWidth; x++) {
          const colorId = this.matrix[y * this.artWidth + x];
          if (colorId === -1) continue; // transparent
          const bx = this.targetX + x;
          const by = this.targetY + y;
          if (bx < 0 || bx >= state.roomMeta.w || by < 0 || by >= state.roomMeta.h) continue;

          // Deniz kontrolü (Deniz boyanamaz!)
          if (state.paintableMask && !state.paintableMask[by * state.roomMeta.w + bx]) continue;

          queue.push({ x: bx, y: by, c: colorId });
        }
      }

      const total = queue.length;
      let placed = 0;

      const tick = () => {
        if (!this.isRunning) return;

        // In 0ms speed, process multiple pixels per tick for super fast execution
        const batchSize = speedMs === 0 ? 8 : 1;

        for (let b = 0; b < batchSize; b++) {
          if (queue.length === 0) break;
          const px = queue.shift();
          placed++;

          // Only paint if not already identical color
          const w = state.roomMeta.w;
          const idx = (px.y * w + px.x) * 4;
          const targetRgb = PALETTE_RGB[px.c];
          let isSame = false;
          if (imgData && targetRgb) {
            isSame = (imgData.data[idx] === targetRgb[0] &&
                      imgData.data[idx + 1] === targetRgb[1] &&
                      imgData.data[idx + 2] === targetRgb[2]);
          }

          if (!isSame) {
            applyPixel(px.x, px.y, px.c);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'p', x: px.x, y: px.y, c: px.c }));
            }
          }
        }

        // Update progress UI
        const pct = total > 0 ? Math.round((placed / total) * 100) : 100;
        if (progressFill) progressFill.style.width = `${pct}%`;
        if (progressCount) progressCount.textContent = `${placed} / ${total} (%${pct})`;
        if (statusText) statusText.textContent = `Çiziliyor... (%${pct})`;

        if (queue.length > 0) {
          if (speedMs === 0) {
            this.timerId = requestAnimationFrame(tick);
          } else {
            this.timerId = setTimeout(tick, speedMs);
          }
        } else {
          this.finish();
        }
      };

      tick();
    },

    stop() {
      this.isRunning = false;
      if (this.timerId) {
        clearTimeout(this.timerId);
        cancelAnimationFrame(this.timerId);
        this.timerId = null;
      }
      document.getElementById('btn-start-bot')?.classList.remove('hidden');
      document.getElementById('btn-stop-bot')?.classList.add('hidden');
      const statusText = document.getElementById('bot-status-text');
      if (statusText) statusText.textContent = 'Durduruldu';
      showToast('Bot durduruldu.');
    },

    finish() {
      this.isRunning = false;
      document.getElementById('btn-start-bot')?.classList.remove('hidden');
      document.getElementById('btn-stop-bot')?.classList.add('hidden');
      const statusText = document.getElementById('bot-status-text');
      if (statusText) statusText.textContent = 'Tamamlandı! 🎉';
      AudioEngine.playChime();
      showToast('🎉 Bot çizimi başarıyla tamamladı!');
    }
  };
  window.BotStudio = BotStudio;

  // 16. PROTECTION MANAGER & DEFENDER
  const ProtectionManager = {
    zones: [],
    shieldElements: [],

    init() {
      // Pick area on canvas
      document.getElementById('btn-pick-protect-area')?.addEventListener('click', () => {
        state.pickingProtectArea = true;
        state.pickingBotCoords = false;
        const btn = document.getElementById('btn-pick-protect-area');
        if (btn) {
          btn.classList.add('picking');
          btn.textContent = '🎯 Tuvale Tıkla...';
        }
        modalBot.classList.add('hidden');
        showToast('📍 Korunacak alanın sol üst köşesini seçmek için tuvale tıklayın!');
      });

      // Submit zone form
      document.getElementById('btn-submit-protect-zone')?.addEventListener('click', () => {
        const name = document.getElementById('prot-zone-name')?.value.trim() || 'Korumalı Alan';
        const x = parseInt(document.getElementById('prot-x')?.value, 10) || 0;
        const y = parseInt(document.getElementById('prot-y')?.value, 10) || 0;
        const w = parseInt(document.getElementById('prot-w')?.value, 10) || 32;
        const h = parseInt(document.getElementById('prot-h')?.value, 10) || 32;
        this.createZone(x, y, w, h, name, true);
      });
    },

    setPickedCoords(x, y) {
      state.pickingProtectArea = false;
      const inX = document.getElementById('prot-x');
      const inY = document.getElementById('prot-y');
      if (inX) inX.value = x;
      if (inY) inY.value = y;

      const btn = document.getElementById('btn-pick-protect-area');
      if (btn) {
        btn.classList.remove('picking');
        btn.textContent = '📍 Haritadan Seç';
      }
      modalBot.classList.remove('hidden');
      showToast(`📍 Koruma Alanı Koordinatı Seçildi: (${x}, ${y})`);
    },

    async fetchZones() {
      try {
        const res = await fetch(`/api/protected-zones?room=${state.room}`);
        if (res.ok) {
          const data = await res.json();
          this.zones = data.zones || [];
          this.renderZonesList();
          this.renderCanvasShields();
        }
      } catch (_) {}
    },

    async createZone(x, y, w, h, name, notifyUser = true) {
      if (!state.user) {
        openAuthModal('⚠️ Alan koruması eklemek için lütfen bir kullanıcı adı belirleyin!');
        return;
      }
      try {
        const res = await fetch('/api/protect-zone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {})
          },
          body: JSON.stringify({
            room: state.room,
            name: name || 'Korumalı Alan',
            x, y, w, h
          })
        });
        const data = await res.json();
        if (!res.ok) {
          if (notifyUser) showToast(`❌ Koruma hatası: ${data.error}`, 'warn');
          return;
        }
        if (notifyUser) {
          showToast(`🛡️ "${name}" başarıyla korumaya alındı!`);
          AudioEngine.playChime();
        }
        this.fetchZones();
      } catch (_) {
        if (notifyUser) showToast('Sunucu bağlantı hatası!', 'warn');
      }
    },

    async deleteZone(id) {
      try {
        const res = await fetch('/api/protect-zone', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {})
          },
          body: JSON.stringify({ id })
        });
        if (res.ok) {
          showToast('🛡️ Koruma kaldırıldı.');
          this.fetchZones();
        }
      } catch (_) {}
    },

    onZoneProtected(zone) {
      if (zone.room === state.room) {
        this.zones = this.zones.filter(z => z.id !== zone.id);
        this.zones.push(zone);
        this.renderZonesList();
        this.renderCanvasShields();
      }
    },

    onZoneUnprotected(zoneId) {
      this.zones = this.zones.filter(z => z.id !== zoneId);
      this.renderZonesList();
      this.renderCanvasShields();
    },

    renderZonesList() {
      const container = document.getElementById('protect-zones-list');
      if (!container) return;
      container.innerHTML = '';

      if (this.zones.length === 0) {
        container.innerHTML = '<div class="protect-empty-msg">Bu haritada henüz korunan alan yok.</div>';
        return;
      }

      this.zones.forEach(z => {
        const card = document.createElement('div');
        card.className = 'protect-zone-card';
        const isOwner = state.user && (state.user.id === z.user_id || state.user.role === 'admin');

        card.innerHTML = `
          <div class="pzc-info">
            <span class="pzc-name">🛡️ ${escapeHtml(z.name)}</span>
            <span class="pzc-coords">Konum: (${z.x}, ${z.y}) | Boyut: ${z.w}x${z.h} px | Sahip: @${escapeHtml(z.username || 'Bilinmiyor')}</span>
          </div>
          <div class="pzc-actions">
            <button class="btn-pzc jump" title="Bu alana git">📍 Git</button>
            ${isOwner ? '<button class="btn-pzc delete" title="Korumayı kaldır">🗑️ Sil</button>' : ''}
          </div>
        `;

        card.querySelector('.btn-pzc.jump')?.addEventListener('click', () => {
          this.jumpToZone(z);
        });

        if (isOwner) {
          card.querySelector('.btn-pzc.delete')?.addEventListener('click', () => {
            if (confirm(`"${z.name}" alanının korumasını kaldırmak istediğinize emin misiniz?`)) {
              this.deleteZone(z.id);
            }
          });
        }

        container.appendChild(card);
      });
    },

    renderCanvasShields() {
      this.shieldElements.forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      this.shieldElements = [];

      // Bot alanlarını varsayılan olarak gizle
      if (!state.showShields) return;

      this.zones.forEach(z => {
        const marker = document.createElement('div');
        marker.className = 'canvas-shield-marker';
        marker.style.left = `${z.x}px`;
        marker.style.top = `${z.y}px`;
        marker.style.width = `${z.w}px`;
        marker.style.height = `${z.h}px`;

        const label = document.createElement('div');
        label.className = 'canvas-shield-label';
        label.textContent = `🛡️ ${z.name} (@${z.username})`;
        marker.appendChild(label);

        canvasMove.appendChild(marker);
        this.shieldElements.push(marker);
      });
    },

    jumpToZone(z) {
      modalBot.classList.add('hidden');
      const containerBox = canvasContainer.getBoundingClientRect();
      const centerX = z.x + (z.w / 2);
      const centerY = z.y + (z.h / 2);
      state.scale = Math.max(1.5, Math.min(6.0, (containerBox.width / (z.w * 1.5))));
      state.pan.x = (containerBox.width / 2) / state.scale - centerX;
      state.pan.y = (containerBox.height / 2) / state.scale - centerY;
      updateTransform();
      showToast(`📍 Korumalı alana gidildi: ${z.name}`);
    }
  };
  window.ProtectionManager = ProtectionManager;

  // Zoom Buttons
  document.getElementById('btn-zoom-in')?.addEventListener('click', (e) => {
    e.preventDefault();
    state.scale = Math.min(state.maxZoom, state.scale * 1.4);
    updateTransform();
  });
  document.getElementById('btn-zoom-out')?.addEventListener('click', (e) => {
    e.preventDefault();
    state.scale = Math.max(state.minZoom, state.scale * 0.7);
    updateTransform();
  });

  // 16. UTILITIES
  function escapeHtml(str) {
    return String(str).replace(/[&<>'"]/g, t => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[t] || t));
  }

  function showToast(text, type = 'info') {
    const wrap = document.getElementById('toast-wrapper');
    const t = document.createElement('div');
    t.className = 'toast-msg';
    t.textContent = text;
    if (type === 'warn') t.style.borderColor = '#ff1744';
    wrap.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
  }

  async function fetchInitialCanvas() {
    try {
      const res = await fetch(`/api/canvas?room=${state.room}`);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        if (ab.byteLength > 0) {
          loadCanvasBuffer(new Uint8Array(ab));
        }
      }
    } catch (_) {}
  }

  async function fetchPaintableMask(room = state.room) {
    try {
      const res = await fetch(`/api/paintable-mask?room=${room}`);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        if (ab.byteLength > 0) {
          state.paintableMask = new Uint8Array(ab);
          console.log(`[PixelPlace] Paintable mask loaded for [${room}] (${ab.byteLength} bytes)`);
          updateReticule();
        }
      }
    } catch (_) {}
  }

  // 17. BOOT
  window.addEventListener('resize', () => {
    updateTransform();
  });

  renderPalette();
  updateUserUI();
  checkAuthSession();
  fetchInitialCanvas();
  fetchPaintableMask();
  initWebSocket();
  BotStudio.init();
  ProtectionManager.init();

})();

