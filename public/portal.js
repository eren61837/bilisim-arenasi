// portal.js - Ultra High-End Cyber Arcade Gaming Portal Client
(function() {
  'use strict';

  // Eski admin yetki kalıntılarını temizle
  localStorage.removeItem('portal_is_admin');

  // Global state reference (declared before IIFE to prevent TDZ ReferenceError)
  let state = null;

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
    const modalProfile = document.getElementById('modal-user-profile');
    if (!modal) return;

    // Tabs & Panels
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const panelLogin = document.getElementById('auth-panel-login');
    const panelRegister = document.getElementById('auth-panel-register');

    function switchAuthTab(activeTab) {
      [tabLogin, tabRegister].forEach(t => {
        if (!t) return;
        t.style.background = 'transparent';
        t.style.color = '#aaa';
        t.classList.remove('active');
      });
      [panelLogin, panelRegister].forEach(p => {
        if (p) p.style.display = 'none';
      });

      if (activeTab === 'login') {
        if (tabLogin) { tabLogin.style.background = '#00e676'; tabLogin.style.color = '#000'; tabLogin.classList.add('active'); }
        if (panelLogin) panelLogin.style.display = 'block';
        document.getElementById('login-identifier-input')?.focus();
      } else if (activeTab === 'register') {
        if (tabRegister) { tabRegister.style.background = '#ff9800'; tabRegister.style.color = '#000'; tabRegister.classList.add('active'); }
        if (panelRegister) panelRegister.style.display = 'block';
        document.getElementById('reg-username-input')?.focus();
      }
    }

    tabLogin?.addEventListener('click', () => switchAuthTab('login'));
    tabRegister?.addEventListener('click', () => switchAuthTab('register'));

    document.getElementById('link-go-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('register');
    });
    document.getElementById('link-go-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('login');
    });

    // Success login helper
    function onAuthSuccess(username, token, isRegistered) {
      localStorage.setItem('portal_username', username);
      localStorage.setItem('portal_game_username', username);
      if (token) localStorage.setItem('session_token', token);
      localStorage.setItem('portal_is_registered', isRegistered ? 'true' : 'false');
      sessionStorage.setItem('portal_session_authenticated', 'true');

      modal.classList.add('hidden');
      modal.style.display = 'none';
      modal.setAttribute('style', 'display: none !important;');

      const elUser = document.getElementById('portal-username');
      if (elUser) elUser.textContent = username;
      if (state) {
        state.username = username;
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({ type: 'set_username', username }));
        }
      }
    }

    // Force authentication on each new page visit/refresh as requested by admin
    const isSessionDone = sessionStorage.getItem('portal_session_authenticated') === 'true';
    if (isSessionDone && existing && existing.length >= 2 && !isNameProfane(existing)) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
      modal.setAttribute('style', 'display: none !important;');
    } else {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
      modal.setAttribute('style', 'display: flex !important;');
      switchAuthTab('login');
      if (existing && inputLoginId) inputLoginId.value = existing;
    }

    // 1. Guest Start
    const inputGuest = document.getElementById('welcome-name-input');
    const btnGuest = document.getElementById('welcome-start-btn');
    const errGuest = document.getElementById('welcome-name-error');

    function saveGuestUsername() {
      const val = (inputGuest ? inputGuest.value : '').trim().replace(/[<>"'&]/g, '');
      if (!val || val.length < 2) {
        if (errGuest) { errGuest.style.display = 'block'; errGuest.textContent = 'En az 2 karakter gir! (Zorunlu)'; }
        return;
      }
      if (val.length > 20) {
        if (errGuest) { errGuest.style.display = 'block'; errGuest.textContent = 'En fazla 20 karakter!'; }
        return;
      }
      if (isNameProfane(val)) {
        if (errGuest) { errGuest.style.display = 'block'; errGuest.textContent = 'Uygunsuz kelime içeremez! Düzgün bir isim gir. 🚫'; }
        return;
      }
      if (errGuest) errGuest.style.display = 'none';
      onAuthSuccess(val, null, false);
    }

    window.submitPortalWelcome = saveGuestUsername;
    btnGuest?.addEventListener('click', saveGuestUsername);
    inputGuest?.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveGuestUsername(); });

    // 2. Login submit
    const inputLoginId = document.getElementById('login-identifier-input');
    const inputLoginPw = document.getElementById('login-password-input');
    const btnLogin = document.getElementById('login-submit-btn');
    const errLogin = document.getElementById('login-error');

    async function submitLogin() {
      const id = (inputLoginId?.value || '').trim();
      const pw = (inputLoginPw?.value || '').trim();
      if (!id || !pw) {
        if (errLogin) { errLogin.style.display = 'block'; errLogin.textContent = 'Kullanıcı adı ve şifre gir!'; }
        return;
      }
      if (errLogin) errLogin.style.display = 'none';
      btnLogin.disabled = true;
      btnLogin.textContent = 'GİRİŞ YAPILIYOR...';

      let hcaptchaToken = '';
      try {
        if (typeof hcaptcha !== 'undefined') {
          hcaptchaToken = hcaptcha.getResponse();
        }
      } catch (_) {}

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: id, password: pw, 'h-captcha-response': hcaptchaToken })
        });
        const data = await res.json();
        if (!res.ok) {
          if (errLogin) { errLogin.style.display = 'block'; errLogin.textContent = data.error || 'Giriş başarısız!'; }
          btnLogin.disabled = false;
          btnLogin.textContent = 'GİRİŞ YAP ⚡';
          return;
        }
        onAuthSuccess(data.user.username, data.token, true);
      } catch (err) {
        if (errLogin) { errLogin.style.display = 'block'; errLogin.textContent = 'Sunucuya bağlanılamadı!'; }
      } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = 'GİRİŞ YAP ⚡';
      }
    }

    btnLogin?.addEventListener('click', submitLogin);
    inputLoginPw?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitLogin(); });

    // 3. Register submit
    const inputRegUser = document.getElementById('reg-username-input');
    const inputRegPw = document.getElementById('reg-password-input');
    const btnReg = document.getElementById('reg-submit-btn');
    const errReg = document.getElementById('reg-error');

    async function submitRegister() {
      const user = (inputRegUser?.value || '').trim().replace(/[<>"'&]/g, '');
      const pw = (inputRegPw?.value || '').trim();
      if (!user || user.length < 2) {
        if (errReg) { errReg.style.display = 'block'; errReg.textContent = 'Kullanıcı adı en az 2 karakter olmalı!'; }
        return;
      }
      if (isNameProfane(user)) {
        if (errReg) { errReg.style.display = 'block'; errReg.textContent = 'Uygunsuz kelime içeremez!'; }
        return;
      }
      if (!pw || pw.length < 3) {
        if (errReg) { errReg.style.display = 'block'; errReg.textContent = 'Şifre en az 3 karakter olmalı!'; }
        return;
      }
      if (errReg) errReg.style.display = 'none';
      btnReg.disabled = true;
      btnReg.textContent = 'HESAP OLUŞTURULUYOR...';

      let hcaptchaToken = '';
      try {
        if (typeof hcaptcha !== 'undefined') {
          hcaptchaToken = hcaptcha.getResponse();
        }
      } catch (_) {}

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pw, 'h-captcha-response': hcaptchaToken })
        });
        const data = await res.json();
        if (!res.ok) {
          if (errReg) { errReg.style.display = 'block'; errReg.textContent = data.error || 'Kayıt başarısız!'; }
          btnReg.disabled = false;
          btnReg.textContent = 'HESAP OLUŞTUR 🛡️';
          return;
        }
        onAuthSuccess(data.user.username, data.token, true);
      } catch (err) {
        if (errReg) { errReg.style.display = 'block'; errReg.textContent = 'Sunucuya bağlanılamadı!'; }
      } finally {
        btnReg.disabled = false;
        btnReg.textContent = 'HESAP OLUŞTUR 🛡️';
      }
    }

    btnReg?.addEventListener('click', submitRegister);
    inputRegPw?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitRegister(); });

    // 4. User Profile & Logout
    const btnUserProfile = document.getElementById('btn-user-profile');
    btnUserProfile?.addEventListener('click', (e) => {
      e.stopPropagation();
      const curUser = localStorage.getItem('portal_username') || 'Oyuncu';
      const isReg = localStorage.getItem('portal_is_registered') === 'true';
      const dName = document.getElementById('prof-display-name');
      const bType = document.getElementById('prof-badge-type');
      if (dName) dName.textContent = curUser;
      if (bType) {
        bType.textContent = isReg ? '⭐ Kayıtlı Üye (Güvenli)' : '🟢 Hesaplı Oyuncu';
        bType.style.color = '#ffd54f';
        bType.style.borderColor = '#ffd54f';
      }
      if (modalProfile) modalProfile.style.display = 'flex';
    });

    document.getElementById('btn-prof-close')?.addEventListener('click', () => {
      if (modalProfile) modalProfile.style.display = 'none';
    });

    document.getElementById('btn-prof-rename')?.addEventListener('click', () => {
      if (modalProfile) modalProfile.style.display = 'none';
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.setAttribute('style', 'display: flex !important;');
        switchAuthTab('register');
      }
    });

    document.getElementById('btn-header-auth')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.setAttribute('style', 'display: flex !important;');
        switchAuthTab('login');
      }
    });

    document.getElementById('btn-prof-logout')?.addEventListener('click', async () => {
      try { await fetch('/api/logout', { method: 'POST' }); } catch (_) {}
      localStorage.removeItem('portal_username');
      localStorage.removeItem('portal_game_username');
      localStorage.removeItem('session_token');
      localStorage.removeItem('portal_is_registered');
      if (modalProfile) modalProfile.style.display = 'none';
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.setAttribute('style', 'display: flex !important;');
        switchAuthTab('login');
      }
    });
  })();

  // State
  state = {
    username: localStorage.getItem('portal_username') || 'Kral_' + Math.floor(100 + Math.random() * 900),
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

  // Admin panel completely removed for security


  // Random Game Button
  const btnRandom = document.getElementById('btn-random-game');

  // Initial UI state
  if (elUsername) elUsername.textContent = state.username;


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
          updateCount('count-minecraft', data.games.minecraft || data.games.eaglercraft);
          updateCount('count-kafatopu', data.games.kafatopu);
          updateCount('count-sos', data.games.sos);
          updateCount('count-geometrydash', data.games.geometrydash);
          updateCount('count-survivor', data.games.survivor);
          updateCount('count-diep', data.games.diep || data.games.deeeep);
          updateCount('count-zombs', data.games.zombs);
          updateCount('count-slope', data.games.slope);
          updateCount('count-hook', data.games.hook);
          updateCount('count-dino', data.games.dino);
          updateCount('count-sumo', data.games.sumo);
          updateCount('count-stickwar', data.games.stickwar);
          updateCount('count-racing', data.games.racing);
          updateCount('count-subway', data.games.subway);
          updateCount('count-gartic', data.games.gartic);
          updateCount('count-python', data.games.python);

          // 👑 DYNAMIC POPULARITY SORTING (Seçkin oyunlar)
          const gameEntries = [
            { id: 'count-python', count: data.games.python || 0, name: 'Python & Pygame' },
            { id: 'count-racing', count: data.games.racing || 0, name: 'Bilişim GP Yarış' },
            { id: 'count-slope', count: data.games.slope || 0, name: 'Slope 3D Neon' },
            { id: 'count-hook', count: data.games.hook || 0, name: 'Stickman Hook' },
            { id: 'count-subway', count: data.games.subway || 0, name: 'Subway Surfers' },
            { id: 'count-gartic', count: data.games.gartic || 0, name: 'Gartic.io & Çizim' },
            { id: 'count-cs16', count: data.games.cs16 || 0, name: 'Counter-Strike 1.6' },
            { id: 'count-stickwar', count: data.games.stickwar || 0, name: 'Stick War: Legacy' },
            { id: 'count-minecraft', count: (data.games.minecraft || data.games.eaglercraft || 0), name: 'Minecraft 3D & Eagler' },
            { id: 'count-sumo', count: data.games.sumo || 0, name: 'Ahmet Hakan: Kutu Sumo' },
            { id: 'count-kafatopu', count: data.games.kafatopu || 0, name: 'Kafa Topu: Beyaz Saray' },
            { id: 'count-sos', count: data.games.sos || 0, name: 'SOS Arenası (10x10 & 25x24)' },
            { id: 'count-geometrydash', count: data.games.geometrydash || 0, name: 'Geometry Neon Dash' },
            { id: 'count-survivor', count: data.games.survivor || 0, name: 'Vampire Survivors RPG' },
            { id: 'count-diep', count: (data.games.diep || data.games.deeeep || 0), name: 'Diep.io Tank Arenası' },
            { id: 'count-zombs', count: data.games.zombs || 0, name: 'Zombs.io Kule Savunması' },
            { id: 'count-redmatch', count: data.games.redmatch || 0, name: 'Redmatch 3D Arena' },
            { id: 'count-dino', count: data.games.dino || 0, name: 'Chrome Cyber Dino Runner' }
          ];

          gameEntries.sort((a, b) => b.count - a.count);
          const topGame = gameEntries[0];

          // 1. Update hero live popularity trend bar
          const heroTrend = document.getElementById('hero-live-trend');
          if (heroTrend && topGame) {
            heroTrend.innerHTML = `🔥 <span style="color:#ffd700;font-weight:900;">ŞU AN ZİRVEDE:</span> <b>${topGame.name}</b> (${topGame.count} Kişi Arenada)`;
          }

          // 2. Prepend top game card to the first position of the grid
          const gamesGrid = document.querySelector('.games-grid');
          if (gamesGrid && topGame) {
            const badgeEl = document.getElementById(topGame.id);
            const cardEl = badgeEl?.closest('.game-card');
            if (cardEl && gamesGrid.firstElementChild !== cardEl) {
              gamesGrid.prepend(cardEl);
            }
            // Remove previous ribbon
            document.querySelectorAll('.top-popular-badge').forEach(r => r.remove());
            // Add glowing top popular ribbon
            const thumb = cardEl?.querySelector('.game-thumb');
            if (thumb && !thumb.querySelector('.top-popular-badge')) {
              const ribbon = document.createElement('div');
              ribbon.className = 'top-popular-badge';
              ribbon.innerHTML = `👑 #1 EN ÇOK OYNANAN • ${topGame.count} OYUNCU 🔥`;
              thumb.prepend(ribbon);
            }
          }
        }
      }
    } catch (_) {}
  }

  function updateCount(elemId, count) {
    const el = document.getElementById(elemId);
    if (el) el.textContent = `🟢 ${count || 0} Oyuncu`;
  }

  fetchStats();
  // Optimized stats interval: every 15s when active, skipped if WS connected
  setInterval(() => {
    if (document.hidden) return;
    if (state && state.ws && state.ws.readyState === WebSocket.OPEN) return;
    fetchStats();
  }, 15000);

  // Live Server Ping & Status Indicator
  async function checkServerPing() {
    if (document.hidden) return;
    const pingEl = document.getElementById('ping-text');
    const indicatorEl = document.querySelector('.status-indicator-ping');
    if (!pingEl) return;
    const t0 = performance.now();
    try {
      const res = await fetch('/api/latest-announcement', { method: 'GET', cache: 'no-store' });
      const pingMs = Math.round(performance.now() - t0);
      if (res.ok) {
        pingEl.textContent = `⚡ ${pingMs}ms • Render Aktif`;
        if (indicatorEl) indicatorEl.style.background = '#00e676';
      }
    } catch (_) {
      pingEl.textContent = `⚠️ Çevrimdışı / Yeniden Bağlanıyor`;
      if (indicatorEl) indicatorEl.style.background = '#ff5252';
    }
  }
  checkServerPing();
  setInterval(checkServerPing, 15000);

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


  // ⛔ ADMIN PANELİ GÜVENLİK NEDENİYLE KALDIRILDI


  // 5. Random Game Button Roulette (Tüm 21 arena oyunu arasından adil rastgele seçim)
  if (btnRandom) {
    btnRandom.addEventListener('click', () => {
      AudioEngine.playDing();
      const games = [
        { path: '/cs16', name: 'CS 1.6 Web 3D 🔫' },
        { path: '/minecraft', name: 'Minecraft Eaglercraft ⛏️' },
        { path: '/slope', name: 'Slope 3D Neon 🌐' },
        { path: '/hook', name: 'Stickman Hook 🪝' },
        { path: '/diep', name: 'Diep.io Tank MMO 🛡️' },
        { path: '/zombs', name: 'Zombs.io Kule Savunması 🧟' },
        { path: '/survivor', name: 'Zindan Avcısı RPG ⚔️' },
        { path: '/kafatopu', name: 'Kafa Topu Beyaz Saray ⚽' },
        { path: '/sos', name: 'SOS Arenası 🅂🅾🅂' },
        { path: '/geometrydash', name: 'Geometry Neon Dash ⚡' },
        { path: '/dino', name: 'Chrome Cyber Dino HD 🦖' },
        { path: '/sumo', name: 'Ahmet Hakan Kutu Sumo 🥊' },
        { path: '/stickwar', name: 'Stick War: Legacy & SW2 ⚔️' },
        { path: '/racing', name: 'Bilişim GP Çok Oyunculu 🏎️' },
        { path: '/subway', name: 'Subway Surfers Web 🏃' },
        { path: '/gartic', name: 'Gartic & Skribbl Çizim 🎨' },
        { path: '/python', name: 'Python & Pygame Arenası 🐍' },
        { path: '/tetris', name: 'Cyber Tetris Neon HD 🧱' },
        { path: '/flappy', name: 'Flappy Cyber Bird 🐦' },
        { path: '/papermap', name: 'PaperMap.io Fetih 🗺️' },
        { path: '/tank', name: 'Tank Savaşı 2D 🎯' }
      ];
      btnRandom.textContent = '🎲 SEÇİLİYOR...';
      let count = 0;
      const iv = setInterval(() => {
        count++;
        const g = games[Math.floor(Math.random() * games.length)];
        btnRandom.textContent = '🎲 ' + g.name;
        if (count > 8) {
          clearInterval(iv);
          const chosen = games[Math.floor(Math.random() * games.length)];
          btnRandom.textContent = '🚀 ' + chosen.name + ' BAŞLATILIYOR!';
          setTimeout(() => { window.location.href = chosen.path; }, 400);
        }
      }, 90);
    });
  }

  // 6. Instant Search & Category Filter System
  const searchInput = document.getElementById('game-search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const catButtons = document.querySelectorAll('.btn-cat-tab');
  const gameCards = document.querySelectorAll('.game-card');

  let activeCategory = 'all';
  let searchQuery = '';

  function applyFilters() {
    let visibleCount = 0;
    const query = searchQuery.toLowerCase().trim();

    gameCards.forEach(card => {
      const cat = (card.dataset.category || '').toLowerCase();
      const cats = cat.split(/\s+/);
      const matchesCat = (activeCategory === 'all' || cats.includes(activeCategory) || cat === activeCategory);

      let matchesSearch = true;
      if (query) {
        const title = (card.querySelector('.game-title')?.textContent || '').toLowerCase();
        const desc = (card.querySelector('.game-desc')?.textContent || '').toLowerCase();
        const tags = (card.querySelector('.game-tags')?.textContent || '').toLowerCase();
        const badge = (card.querySelector('.genre-tag-floating')?.textContent || '').toLowerCase();
        matchesSearch = title.includes(query) || desc.includes(query) || tags.includes(query) || badge.includes(query);
      }

      if (matchesCat && matchesSearch) {
        card.style.display = 'flex';
        card.style.animation = 'cardPopIn 0.25s ease';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    let noResultsEl = document.getElementById('_no_search_results');
    if (visibleCount === 0) {
      if (!noResultsEl) {
        noResultsEl = document.createElement('div');
        noResultsEl.id = '_no_search_results';
        noResultsEl.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: rgba(16,22,36,0.6); border: 1px dashed rgba(0,219,255,0.3); border-radius: 16px; margin: 20px 0; color: #fff;';
        noResultsEl.innerHTML = `
          <div style="font-size: 42px; margin-bottom: 10px;">🔍</div>
          <h3 style="font-size: 18px; margin-bottom: 6px; color: #00dbff;">Aradığınız Kriterde Oyun Bulunamadı</h3>
          <p style="font-size: 13px; color: #888; margin-bottom: 16px;">Farklı bir arama terimi deneyebilir veya filtreleri temizleyebilirsiniz.</p>
          <button id="_btn_reset_filters" style="background: linear-gradient(135deg, #00dbff, #0077ff); color: #000; border: none; padding: 8px 20px; border-radius: 8px; font-weight: 800; font-size: 13px; cursor: pointer;">Tüm Oyunları Göster 🔥</button>
        `;
        if (gamesGrid) gamesGrid.appendChild(noResultsEl);
        document.getElementById('_btn_reset_filters')?.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          searchQuery = '';
          if (btnClearSearch) btnClearSearch.style.display = 'none';
          activeCategory = 'all';
          catButtons.forEach(b => {
            if (b.dataset.filter === 'all') b.classList.add('active');
            else b.classList.remove('active');
          });
          applyFilters();
        });
      }
      noResultsEl.style.display = 'block';
    } else if (noResultsEl) {
      noResultsEl.style.display = 'none';
    }
  }

  // Debounced instant search (60ms debounce for 60FPS smoothness)
  let searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      if (btnClearSearch) btnClearSearch.style.display = searchQuery ? 'block' : 'none';
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 60);
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      btnClearSearch.style.display = 'none';
      applyFilters();
    });
  }

  // Global '/' and 'Ctrl+K' search shortcut & Escape to clear
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    const isTyping = (tag === 'input' || tag === 'textarea');

    if (e.key === 'Escape') {
      if (document.activeElement === searchInput) {
        if (searchInput.value) {
          searchInput.value = '';
          searchQuery = '';
          if (btnClearSearch) btnClearSearch.style.display = 'none';
          applyFilters();
        }
        searchInput.blur();
      }
      return;
    }

    if (!isTyping && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      AudioEngine.playClick();
      catButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.filter || 'all';
      applyFilters();
    });
  });

  // Dynamic Category Count Badges
  function updateCategoryCounts() {
    catButtons.forEach(btn => {
      const f = btn.dataset.filter;
      let count = 0;
      gameCards.forEach(c => {
        const cat = (c.dataset.category || '').toLowerCase();
        if (f === 'all' || cat.split(/\s+/).includes(f) || cat === f) count++;
      });
      const badge = btn.querySelector('.cat-count');
      if (badge) badge.textContent = count;
    });
  }
  updateCategoryCounts();

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
  function ensureWS() {
    if (!state.ws || state.ws.readyState === WebSocket.CLOSED || state.ws.readyState === WebSocket.CLOSING) {
      initWS();
    }
  }

  function initWS() {
    if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}`);
    state.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: 'lobby' }));
      ws.send(JSON.stringify({ type: 'portal_get_chat' }));
      if (state.username) {
        ws.send(JSON.stringify({ type: 'player_announce', username: state.username }));
      }
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      let data; try { data = JSON.parse(ev.data); } catch (_) { return; }

      if (data.type === 'player_join_announcement') {
        showPlayerJoinBanner(data.text || (`🎮 ${data.username} az önce aramıza katıldı ve oyunlara başladı!`));
      }
      else if (data.type === 'portal_chat' || data.type === 'portal_chat_msg') {
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
      else if (data.type === 'portal_announcement' || data.type === 'admin_announcement') {
        if (window._showPortalAnnouncement) {
          window._showPortalAnnouncement(data.text || data.message || '', data.author || '👑 Admin', data.id);
        }
      }
      else if (data.type === 'online' && data.counts) {
        if (elOnlineTotal) elOnlineTotal.textContent = data.counts.total || 0;
        if (data.counts.rooms) {
          for (const [roomId, count] of Object.entries(data.counts.rooms)) {
            updateCount(`count-${roomId}`, count);
          }
        }
      }
      else if (data.type === 'portal_error') {
        alert(data.message || 'Yetkisiz işlem!');
      }
    };

    ws.onerror = () => {
      try { ws.close(); } catch (_) {}
    };

    ws.onclose = () => setTimeout(ensureWS, 2000);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      ensureWS();
      fetchStats();
    }
  });
  window.addEventListener('focus', () => {
    ensureWS();
    fetchStats();
  });

  function showPlayerJoinBanner(text) {
    let container = document.getElementById('player-join-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'player-join-toast-container';
      container.className = 'player-join-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'player-join-toast';
    toast.innerHTML = `<span class="toast-pulse">🟢</span> <span class="toast-text">${esc(text)}</span>`;
    container.appendChild(toast);
    try { AudioEngine.playDing(); } catch (_) {}
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
    }, 4500);
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
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = chatInput.value.trim();
      if (!msg) return;

      chatInput.value = '';

      let sent = false;
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        try {
          state.ws.send(JSON.stringify({
            type: 'portal_chat',
            username: state.username,
            msg
          }));
          sent = true;
        } catch (_) {}
      }

      if (!sent) {
        try {
          await fetch('/api/portal-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: state.username,
              msg
            })
          });
        } catch (_) {}
        ensureWS();
      }
    });
  }

  // Quick Emoji Reactions
  document.querySelectorAll('.btn-chat-emoji').forEach(btn => {
    btn.addEventListener('click', () => {
      AudioEngine.playClick();
      const emoji = btn.dataset.emoji;
      if (chatInput && emoji) {
        chatInput.value = (chatInput.value ? chatInput.value + ' ' : '') + emoji;
        chatInput.focus();
      }
    });
  });

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

    // Reduced to 12 particles for ultra-low CPU and battery usage
    const COUNT = 12;
    const particles = [];
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * cvs.width,
        y: Math.random() * cvs.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 1.5 + Math.random() * 1.2
      });
    }

    let mousePos = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
      mousePos.x = e.clientX;
      mousePos.y = e.clientY;
    });

    // 30fps cap: don't run at 60fps unnecessarily (saves ~75% CPU)
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

        // Connect lines only within 55px (minimal O(N) operations)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 55) {
            cx.beginPath();
            cx.moveTo(p.x, p.y);
            cx.lineTo(p2.x, p2.y);
            cx.strokeStyle = `rgba(0, 219, 255, ${0.15 * (1 - dist / 55)})`;
            cx.lineWidth = 0.7;
            cx.stroke();
          }
        }
      }
    }
    requestAnimationFrame(loop);
  }

  // 10. REALISTIC HUMAN UPDATE POPUP (Her girişte gösterilir, samimi öğrenci diliyle)
  function showUpdateNotification() {
    setTimeout(() => {
      const el = document.createElement('div');
      el.id = 'update-dev-popup';
      el.style.cssText = [
        'position: fixed', 'bottom: 24px', 'right: 24px', 'max-width: 380px', 'width: 90%',
        'background: linear-gradient(145deg, #131b26, #0c1219)',
        'border: 2px solid #00dbff', 'border-radius: 16px', 'padding: 18px 20px',
        'box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(0,219,255,0.25)',
        'z-index: 99999', 'font-family: -apple-system, BlinkMacSystemFont, sans-serif',
        'transition: opacity 0.3s, transform 0.3s'
      ].join(';');

      el.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:22px;">⚡</span>
            <div>
              <div style="font-weight:900; font-size:14px; color:#00dbff; letter-spacing:0.5px;">erencix • YENİ GÜNCELLEME</div>
              <div style="font-size:11px; color:#888;">az önce paylaşıldı</div>
            </div>
          </div>
          <button id="btn-close-upd" style="background:transparent; border:none; color:#888; font-size:18px; cursor:pointer; padding:2px 6px;">✕</button>
        </div>
        <p style="font-size:13px; color:#ddd; line-height:1.55; margin:0 0 14px 0; word-break:break-word;">
          beyler sa dev guncellemeler geldi: Python &amp; Pygame web arenası eklendi Main.py kodunu canlı gorup degistirebiliosunuz, tum oyunlara yildizli puanlama sistemi geldi herkes oy verebilio ortalama puan gozukuo, stick war da okcular artik kiliclilarin tam arkasina gecip siraya dizilio, dusman AI orduyu toplayip dalga dalga saldirio, 2v2 ittifak savasi ve kaleye sigin modu geldi birlikler arkadaki dev kaleye siginio okcular surlardan indirio, bide bilisim gp drift yarisi geldi hadi ii oyunlar 🔥
        </p>
        <div style="display:flex; justify-content:flex-end;">
          <button id="btn-ack-upd" style="background:linear-gradient(135deg, #00dbff, #0050a0); border:none; color:#000; font-weight:800; font-size:12px; padding:7px 16px; border-radius:8px; cursor:pointer; box-shadow:0 0 12px rgba(0,219,255,0.3);">
            eyw kral kapat 👍
          </button>
        </div>
      `;

      document.body.appendChild(el);

      const close = () => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(15px)';
        setTimeout(() => el.remove(), 300);
      };

      document.getElementById('btn-close-upd')?.addEventListener('click', close);
      document.getElementById('btn-ack-upd')?.addEventListener('click', close);
    }, 1400);
  }

  // 11. GAME RATINGS SYSTEM (1-5 YILDIZ & ORTALAMA PUAN)
  function initGameRatings() {
    const modal = document.getElementById('modal-rate-game');
    const modalTitle = document.getElementById('rate-modal-title');
    const starsRow = document.getElementById('rate-stars-row');
    const feedback = document.getElementById('rate-feedback');
    const btnCancel = document.getElementById('btn-cancel-rating');

    let activeGameId = null;
    let selectedRating = 0;

    // Attach badges to cards
    const cards = document.querySelectorAll('.game-card');
    cards.forEach(card => {
      const href = card.getAttribute('href') || '';
      const gameId = href.replace(/^\//, '').split('?')[0].toLowerCase();
      if (!gameId) return;

      const titleRow = card.querySelector('.game-title-row');
      if (!titleRow) return;

      let badge = card.querySelector('.game-rating-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'game-rating-badge';
        badge.setAttribute('data-game-id', gameId);
        badge.innerHTML = `<span class="rate-star-icon">⭐</span> <span class="rate-avg">--</span> <span class="rate-count">(-- oy)</span> <span class="rate-btn-hint">Puan Ver</span>`;
        titleRow.parentNode.insertBefore(badge, titleRow.nextSibling);
      }

      badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openRatingModal(gameId, card.querySelector('.game-title')?.textContent || gameId);
      });
    });

    // Fetch live ratings
    fetch('/api/game-ratings')
      .then(r => r.json())
      .then(data => {
        if (data && data.ratings) updateBadgesUI(data.ratings);
      })
      .catch(() => {});

    function updateBadgesUI(ratings) {
      document.querySelectorAll('.game-rating-badge').forEach(badge => {
        const gid = badge.getAttribute('data-game-id');
        const info = ratings && ratings[gid];
        const avgEl = badge.querySelector('.rate-avg');
        const countEl = badge.querySelector('.rate-count');
        if (info && info.count > 0) {
          if (avgEl) avgEl.textContent = Number(info.avg).toFixed(1);
          if (countEl) countEl.textContent = `(${info.count} oy)`;
        } else {
          if (avgEl) avgEl.textContent = 'Yeni';
          if (countEl) countEl.textContent = '(Puan Ver)';
        }
      });
    }

    window.openRatingModal = openRatingModal;
    function openRatingModal(gameId, gameTitle) {
      if (!modal) return;
      activeGameId = gameId;
      selectedRating = parseInt(localStorage.getItem('my_rating_' + gameId) || '0', 10);
      if (modalTitle) modalTitle.textContent = `${gameTitle} • Puan Ver`;
      if (feedback) feedback.textContent = selectedRating > 0 ? `Daha önce ${selectedRating} yıldız vermiştin.` : '';
      highlightStars(selectedRating);
      modal.style.display = 'flex';
    }

    function highlightStars(rating, isHover = false) {
      if (!starsRow) return;
      const stars = starsRow.querySelectorAll('.star-btn');
      stars.forEach((btn, idx) => {
        const starVal = idx + 1;
        if (isHover) {
          btn.classList.toggle('hovered', starVal <= rating);
        } else {
          btn.classList.remove('hovered');
          btn.classList.toggle('active', starVal <= rating);
        }
      });
    }

    if (starsRow) {
      const stars = starsRow.querySelectorAll('.star-btn');
      stars.forEach(btn => {
        const starVal = parseInt(btn.getAttribute('data-star'), 10);
        btn.addEventListener('mouseenter', () => highlightStars(starVal, true));
        btn.addEventListener('mouseleave', () => highlightStars(selectedRating, false));
        btn.addEventListener('click', () => submitRating(starVal));
      });
    }

    function submitRating(stars) {
      if (!activeGameId) return;
      selectedRating = stars;
      localStorage.setItem('my_rating_' + activeGameId, String(stars));
      highlightStars(stars, false);
      if (feedback) feedback.textContent = `⭐ ${stars} yıldız gönderiliyor...`;

      fetch('/api/rate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: activeGameId,
          rating: stars,
          username: state.username || 'Misafir'
        })
      })
      .then(r => r.json())
      .then(res => {
        if (res && res.success) {
          if (feedback) feedback.textContent = `✅ Teşekkürler! Puanın kaydedildi (Yeni Ortalama: ${res.newAvg} ⭐)`;
          if (res.ratings) updateBadgesUI(res.ratings);
          try { AudioEngine.playDing(); } catch(_) {}
          setTimeout(() => {
            if (modal) modal.style.display = 'none';
          }, 1100);
        }
      })
      .catch(() => {
        if (feedback) feedback.textContent = 'Bağlantı hatası!';
      });
    }

    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
      });
    }
  }

  initCyberCanvas();
  initWS();
  initGameRatings();
  showUpdateNotification();

})();

// PATCH NOTES BUTTON LOGIC
document.addEventListener('DOMContentLoaded', () => {
    const shareGroup = document.querySelector('.share-links-group');
    if (shareGroup) {
        const btn = document.createElement('button');
        btn.innerHTML = '?? G�NCELLEME NOTLARI';
        btn.style.cssText = 'background:#00e5ff; color:#000; font-weight:900; margin-right:15px; padding:6px 14px; font-size:13px; border:none; border-radius:8px; cursor:pointer; box-shadow:0 0 10px rgba(0,229,255,0.4);';
        btn.onclick = () => {
            const modal = document.getElementById('modal-patch-notes');
            if (modal) modal.style.display = 'flex';
        };
        shareGroup.prepend(btn);
    }
});
