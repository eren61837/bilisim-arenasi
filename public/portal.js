// portal.js - Ultra High-End Cyber Arcade Gaming Portal Client
(function() {
  'use strict';

  // ====================================================================
  // GLOBAL FIRST-VISIT USERNAME PICKER (runs before everything else)
  // ====================================================================
  // ====================================================================
  // GLOBAL FIRST-VISIT USERNAME PICKER (runs before everything else)
  // ====================================================================
  function isNameProfane(name) {
    if (!name) return false;
    const lower = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Exact short bad words checked with boundaries so common words like Ahmet, Hamza, Gamer are NOT blocked!
    const shortBadRegex = /(?:^|[^a-z0-9])(am|sik|oc|got|pic|bok|aq|amk|ass|sex|mal|ibne)(?:$|[^a-z0-9])/i;
    if (shortBadRegex.test(lower)) return true;

    // Unambiguous longer swear words
    const longBad = [
      'orospu', 'sikerim', 'sikeyim', 'yarrak', 'yarak', 'kahpe', 'pezevenk', 'tasak', 'gerizekali',
      'amina', 'fuck', 'shit', 'bitch', 'porn', 'pussy', 'nigger', 'nigga', 'dick', 'cock', 'piç'
    ];
    for (const bad of longBad) {
      if (lower.includes(bad)) return true;
    }
    return false;
  }

  (function() {
    const existing = localStorage.getItem('portal_username');
    const modal = document.getElementById('modal-welcome');
    if (!modal) return;

    const isBanned = existing && isNameProfane(existing);
    const isDefaultAuto = existing && (existing.startsWith('Kral_') || existing.startsWith('Misafir_'));

    if (existing && existing.length >= 2 && !isBanned && !isDefaultAuto) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
      if (!localStorage.getItem('pixelplace_user')) {
        localStorage.setItem('pixelplace_user', JSON.stringify({ username: existing }));
      }
      return;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    const input = document.getElementById('welcome-name-input');
    const btn = document.getElementById('welcome-start-btn');
    const err = document.getElementById('welcome-name-error');
    if (input) setTimeout(() => input.focus(), 150);

    function saveWelcomeUsername() {
      const val = (input ? input.value : '').trim().replace(/[<>"'&]/g, '');
      if (!val || val.length < 2) {
        if (err) { err.style.display = 'block'; err.textContent = 'En az 2 karakter gir! (Zorunlu)'; }
        return;
      }
      if (val.length > 20) {
        if (err) { err.style.display = 'block'; err.textContent = 'En fazla 20 karakter!'; }
        return;
      }
      if (isNameProfane(val)) {
        if (err) { err.style.display = 'block'; err.textContent = 'Uygunsuz / absürt kelime içeremez! Düzgün bir isim gir. 🚫'; }
        return;
      }
      if (err) err.style.display = 'none';
      localStorage.setItem('portal_username', val);
      localStorage.setItem('portal_game_username', val);
      localStorage.setItem('pixelplace_user', JSON.stringify({ username: val }));
      
      modal.classList.add('hidden');
      modal.style.display = 'none';
      modal.setAttribute('style', 'display: none !important;');

      const elUser = document.getElementById('portal-username');
      if (elUser) elUser.textContent = val;
      if (typeof state !== 'undefined' && state) {
        state.username = val;
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({ type: 'set_username', username: val }));
        }
      }
    }

    window.submitPortalWelcome = saveWelcomeUsername;
    if (btn) btn.addEventListener('click', saveWelcomeUsername);
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveWelcomeUsername(); });
  })();

  // State
  const state = {
    username: localStorage.getItem('portal_username') || 'Kral_' + Math.floor(100 + Math.random() * 900),
    isAdmin: localStorage.getItem('portal_is_admin') === 'true',
    lanIp: window.location.hostname,
    ws: null
  };

  // Sound Synthesizer
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    playClick() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.05);
      } catch (_) {}
    },
    playDing() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.3);
      } catch (_) {}
    }
  };

  // DOM Elements
  const elUsername = document.getElementById('portal-username');
  const elOnlineTotal = document.getElementById('online-total');
  const elLanUrl = document.getElementById('lan-url');
  const btnCopyLan = document.getElementById('btn-copy-lan');
  const btnCopyOnline = document.getElementById('btn-copy-online');
  const btnChangeName = document.getElementById('btn-change-name');
  const modalName = document.getElementById('modal-name');
  const inNewName = document.getElementById('in-new-name');
  const btnSaveName = document.getElementById('btn-save-name');
  const btnCancelName = document.getElementById('btn-cancel-name');

  // Chat Elements
  const chatMessages = document.getElementById('portal-chat-messages');
  const chatForm = document.getElementById('portal-chat-form');
  const chatInput = document.getElementById('portal-chat-input');

  // Admin Elements
  const btnOpenAdmin = document.getElementById('btn-open-admin');
  const adminBar = document.getElementById('portal-admin-bar');
  const modalAdminAuth = document.getElementById('modal-admin-auth');
  const inAdminPass = document.getElementById('in-admin-pass');
  const btnSubmitAdminAuth = document.getElementById('btn-submit-admin-auth');
  const btnCancelAdminAuth = document.getElementById('btn-cancel-admin-auth');
  const btnAdminClearChat = document.getElementById('btn-admin-clear-chat');
  const btnAdminAnnounce = document.getElementById('btn-admin-announce');
  const modalAnnounce = document.getElementById('modal-announce');
  const inAnnounceText = document.getElementById('in-announce-text');
  const btnSendAnnounce = document.getElementById('btn-send-announce');
  const btnCancelAnnounce = document.getElementById('btn-cancel-announce');

  // Random Game Button
  const btnRandom = document.getElementById('btn-random-game');

  // Initial UI state
  if (elUsername) elUsername.textContent = state.username;
  updateAdminUI();

  // 1. Fetch Server Stats & Active Player Counts
  async function fetchStats() {
    try {
      const res = await fetch('/api/portal-stats');
      if (res.ok) {
        const data = await res.json();
        if (data.lanIp && elLanUrl) {
          state.lanIp = data.lanIp;
          elLanUrl.textContent = `http://${data.lanIp}`;
        }
        const elOnlineUrl = document.getElementById('online-url');
        if (elOnlineUrl) {
          if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.startsWith('192.168.')) {
            elOnlineUrl.textContent = window.location.origin;
          } else {
            elOnlineUrl.textContent = 'https://planets-camping-vip-systematic.trycloudflare.com';
          }
        }
        if (elOnlineTotal && data.onlineTotal !== undefined) {
          elOnlineTotal.textContent = data.onlineTotal;
        }
        // Update game cards player counts
        if (data.games) {
          updateCount('count-cs16', data.games.cs16);
          updateCount('count-deeeep', data.games.deeeep);
          updateCount('count-tank', data.games.tank);
          updateCount('count-slither', data.games.slither);
          updateCount('count-pixelplace', data.games.pixelplace);
          updateCount('count-agario', data.games.agario);
          updateCount('count-xox', data.games.xox);
          updateCount('count-minecraft', data.games.minecraft);
          updateCount('count-survivor', data.games.survivor);
          updateCount('count-trollparkur', data.games.trollparkur);
          updateCount('count-geometrydash', data.games.geometrydash);
          updateCount('count-miner', data.games.miner);
          updateCount('count-sos', data.games.sos);
          updateCount('count-kafatopu', data.games.kafatopu);
        }
      }
    } catch (_) {}
  }

  function updateCount(elemId, count) {
    const el = document.getElementById(elemId);
    if (el) el.textContent = `🟢 ${count || 0} Oyuncu`;
  }

  fetchStats();
  setInterval(fetchStats, 3000);

  // 2. Copy Link Handlers
  if (btnCopyLan) {
    btnCopyLan.addEventListener('click', () => {
      AudioEngine.playClick();
      const url = elLanUrl.textContent;
      navigator.clipboard.writeText(url).then(() => {
        btnCopyLan.textContent = '✅';
        setTimeout(() => { btnCopyLan.textContent = '📋 Kopyala'; }, 2000);
      });
    });
  }

  if (btnCopyOnline) {
    btnCopyOnline.addEventListener('click', () => {
      AudioEngine.playClick();
      const url = document.getElementById('online-url')?.textContent || 'https://erencix-portal.loca.lt';
      navigator.clipboard.writeText(url).then(() => {
        btnCopyOnline.textContent = '✅';
        setTimeout(() => { btnCopyOnline.textContent = '📋 Kopyala'; }, 2000);
      });
    });
  }

  // 3. Change Name Modal
  document.getElementById('btn-user-profile')?.addEventListener('click', openRenameModal);
  if (btnChangeName) btnChangeName.addEventListener('click', (e) => { e.stopPropagation(); openRenameModal(); });

  function openRenameModal() {
    AudioEngine.playClick();
    if (inNewName) inNewName.value = state.username;
    if (modalName) modalName.classList.remove('hidden');
    inNewName?.focus();
  }

  if (btnCancelName) btnCancelName.addEventListener('click', () => modalName.classList.add('hidden'));

  if (btnSaveName) {
    btnSaveName.addEventListener('click', () => {
      AudioEngine.playClick();
      const val = inNewName.value.trim();
      if (val && val.length >= 2 && val.length <= 20) {
        const BANNED_WORDS = ['sik','orospu','oç','göt','yarrak','piç','fuck','shit','bitch','sikerim','amk','amına','bok','salak','aptal','kahpe','gerizekalı','sex','porn','pussy','dick','cock','nigga','admin','administrator','moderator','system','null','undefined','script'];
        const lowerVal = val.toLowerCase();
        if (BANNED_WORDS.some(w => lowerVal.includes(w))) {
          alert('Bu isim kullanılamaz! Düzgün bir isim gir. 🚫');
          return;
        }
        state.username = val;
        localStorage.setItem('portal_username', val);
        localStorage.setItem('pixelplace_user', JSON.stringify({ username: val }));
        if (elUsername) elUsername.textContent = val;
        modalName.classList.add('hidden');
      }
    });
  }

  // 4. Admin UI & Handlers
  function updateAdminUI() {
    if (state.isAdmin) {
      if (adminBar) adminBar.classList.remove('hidden');
      if (btnOpenAdmin) btnOpenAdmin.textContent = '👑 Admin Aktif';
    } else {
      if (adminBar) adminBar.classList.add('hidden');
      if (btnOpenAdmin) btnOpenAdmin.textContent = '🔑 Admin';
    }
  }

  if (btnOpenAdmin) {
    btnOpenAdmin.addEventListener('click', () => {
      AudioEngine.playClick();
      if (state.isAdmin) {
        adminBar.classList.toggle('hidden');
      } else {
        modalAdminAuth.classList.remove('hidden');
        inAdminPass.value = '';
        inAdminPass.focus();
      }
    });
  }

  if (btnCancelAdminAuth) btnCancelAdminAuth.addEventListener('click', () => modalAdminAuth.classList.add('hidden'));

  if (btnSubmitAdminAuth) {
    btnSubmitAdminAuth.addEventListener('click', () => {
      AudioEngine.playClick();
      const pass = inAdminPass.value.trim();
      if (pass === 'erencix201124') {
        state.isAdmin = true;
        localStorage.setItem('portal_is_admin', 'true');
        modalAdminAuth.classList.add('hidden');
        updateAdminUI();
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({ type: 'admin_auth', password: pass }));
        }
      } else {
        alert('❌ Hatalı admin şifresi!');
      }
    });
  }

  if (btnAdminClearChat) {
    btnAdminClearChat.addEventListener('click', () => {
      if (confirm('Tüm sohbet geçmişi silinsin mi?')) {
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({ type: 'admin_clear_chat' }));
        }
      }
    });
  }

  if (btnAdminAnnounce) {
    btnAdminAnnounce.addEventListener('click', () => {
      modalAnnounce.classList.remove('hidden');
      inAnnounceText.value = '';
      inAnnounceText.focus();
    });
  }
  if (btnCancelAnnounce) btnCancelAnnounce.addEventListener('click', () => modalAnnounce.classList.add('hidden'));

  if (btnSendAnnounce) {
    btnSendAnnounce.addEventListener('click', () => {
      const text = inAnnounceText.value.trim();
      if (text) {
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({
            type: 'admin_announcement',
            text,
            author: state.username
          }));
        }
        modalAnnounce.classList.add('hidden');
      }
    });
  }

  // 5. Random Game Button Roulette
  if (btnRandom) {
    btnRandom.addEventListener('click', () => {
      AudioEngine.playDing();
      const games = ['/cs16', '/deeeep', '/tank', '/slither', '/pixelplace', '/agario', '/xox', '/minecraft', '/survivor', '/miner'];
      btnRandom.textContent = '🎲 SEÇİLİYOR...';
      let count = 0;
      const iv = setInterval(() => {
        count++;
        btnRandom.textContent = '🎲 ' + games[Math.floor(Math.random() * games.length)].replace('/', '').toUpperCase();
        if (count > 6) {
          clearInterval(iv);
          const chosen = games[Math.floor(Math.random() * games.length)];
          btnRandom.textContent = '🚀 BAĞLANILIYOR!';
          setTimeout(() => { window.location.href = chosen; }, 400);
        }
      }, 100);
    });
  }

  // 6. Category Filter Tabs
  const catButtons = document.querySelectorAll('.btn-cat-tab');
  const gameCards = document.querySelectorAll('.game-card');

  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      AudioEngine.playClick();
      catButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      gameCards.forEach(card => {
        const cat = card.dataset.category;
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
          card.style.animation = 'cardPopIn 0.3s ease';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // 7. 3D Card Hover Perspective Tracking
  gameCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -7;
      const rotateY = ((x - centerX) / centerX) * 7;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale3d(1.02, 1.02, 1.02)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // 8. WebSocket for Live Classroom Chat & Announcements
  function initWS() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}`);
    state.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: 'lobby' }));
      ws.send(JSON.stringify({ type: 'portal_get_chat' }));
      if (state.isAdmin) {
        ws.send(JSON.stringify({ type: 'admin_auth', password: 'erencix201124' }));
      }
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      let data; try { data = JSON.parse(ev.data); } catch (_) { return; }

      if (data.type === 'portal_chat' || data.type === 'portal_chat_msg') {
        const item = data.item || data;
        const author = item.username || item.u || data.u || 'Misafir';
        const msg = item.message || item.msg || data.msg || '';
        const time = item.created_at || item.t || data.t || Date.now();
        appendChatMessage(author, msg, time);
        AudioEngine.playDing();
      }
      else if (data.type === 'portal_chat_history') {
        if (chatMessages) chatMessages.innerHTML = '';
        if (Array.isArray(data.history)) {
          data.history.forEach(item => {
            const author = item.username || item.u || 'Misafir';
            const msg = item.message || item.msg || '';
            const time = item.created_at || item.t || Date.now();
            appendChatMessage(author, msg, time);
          });
        }
      }
      else if (data.type === 'portal_chat_cleared') {
        if (chatMessages) {
          chatMessages.innerHTML = `<div class="portal-chat-line" style="color:#ff5252; text-align:center; font-style:italic;">${esc(data.message || 'Sohbet temizlendi')}</div>`;
        }
      }
      else if (data.type === 'portal_announcement') {
        if (window._showPortalAnnouncement) window._showPortalAnnouncement(data.text || data.message || '');
      }
    };

    ws.onclose = () => setTimeout(initWS, 2500);
  }

  function appendChatMessage(author, text, time) {
    if (!chatMessages) return;
    const line = document.createElement('div');
    line.className = 'portal-chat-line';

    const timeStr = time ? new Date(time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
    const isMe = author === state.username;

    line.innerHTML = `
      <strong class="chat-author" style="${isMe ? 'color:var(--green);' : ''}">${esc(author)}:</strong>
      <span class="chat-text">${esc(text)}</span>
      <span class="chat-time">${timeStr}</span>
    `;

    chatMessages.appendChild(line);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = chatInput.value.trim();
      if (msg && state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'portal_chat',
          username: state.username,
          msg
        }));
        chatInput.value = '';
      }
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
  }

  // 9. Interactive Cyber Constellation Background Canvas (OPTIMIZED for school PCs)
  function initCyberCanvas() {
    const cvs = document.getElementById('bg-canvas');
    if (!cvs) return;
    const cx = cvs.getContext('2d');

    function onResize() {
      cvs.width = window.innerWidth;
      cvs.height = window.innerHeight;
    }
    window.addEventListener('resize', onResize);
    onResize();

    // Reduced from 45 to 20 particles
    const COUNT = 20;
    const particles = [];
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * cvs.width,
        y: Math.random() * cvs.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 1.5 + Math.random() * 1.5
      });
    }

    let mousePos = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
      mousePos.x = e.clientX;
      mousePos.y = e.clientY;
    });

    // 30fps cap: don't run at 60fps unnecessarily (saves ~50% CPU)
    let lastFrame = 0;
    function loop(now) {
      requestAnimationFrame(loop);
      if (now - lastFrame < 33) return; // 33ms = ~30fps
      lastFrame = now;

      cx.clearRect(0, 0, cvs.width, cvs.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > cvs.width) p.vx *= -1;
        if (p.y < 0 || p.y > cvs.height) p.vy *= -1;

        // Draw particle
        cx.beginPath();
        cx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        cx.fillStyle = 'rgba(0, 219, 255, 0.45)';
        cx.fill();

        // Connect lines only within 70px (reduced from 120px)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy); // faster than hypot
          if (dist < 70) {
            cx.beginPath();
            cx.moveTo(p.x, p.y);
            cx.lineTo(p2.x, p2.y);
            cx.strokeStyle = `rgba(0, 219, 255, ${0.15 * (1 - dist / 70)})`;
            cx.lineWidth = 0.7;
            cx.stroke();
          }
        }
      }
    }
    requestAnimationFrame(loop);
  }

  initCyberCanvas();
  initWS();

})();
