// portal.js - Ultra High-End Cyber Arcade Gaming Portal Client
(function() {
  'use strict';

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

    const isBanned = existing && isNameProfane(existing);
    const hasValidAuth = (localStorage.getItem('portal_is_registered') === 'true' || localStorage.getItem('session_token')) && existing && existing.length >= 2 && !isBanned;

    if (hasValidAuth) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
      modal.setAttribute('style', 'display: none !important;');
    } else {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
      modal.setAttribute('style', 'display: flex !important;');
      switchAuthTab('login');
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

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: id, password: pw })
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

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pw })
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
          updateCount('count-minecraft', data.games.minecraft || data.games.eaglercraft);
          updateCount('count-kafatopu', data.games.kafatopu);
          updateCount('count-sos', data.games.sos);
          updateCount('count-geometrydash', data.games.geometrydash);
          updateCount('count-survivor', data.games.survivor);
          updateCount('count-diep', data.games.diep || data.games.deeeep);
          updateCount('count-zombs', data.games.zombs);
          updateCount('count-redmatch', data.games.redmatch);
          updateCount('count-dino', data.games.dino);
          updateCount('count-sumo', data.games.sumo);
          updateCount('count-stickwar', data.games.stickwar);
          updateCount('count-racing', data.games.racing);
          updateCount('count-subway', data.games.subway);
          updateCount('count-temple', data.games.templerun);
          updateCount('count-gartic', data.games.gartic);

          // 👑 DYNAMIC POPULARITY SORTING (Seçkin oyunlar)
          const gameEntries = [
            { id: 'count-racing', count: data.games.racing || 0, name: 'Bilişim GP Yarış' },
            { id: 'count-subway', count: data.games.subway || 0, name: 'Subway Surfers' },
            { id: 'count-temple', count: data.games.templerun || 0, name: 'Temple Run 2' },
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
      if (!state.isAdmin) {
        if (modalAdminAuth) modalAdminAuth.classList.remove('hidden');
        if (inAdminPass) {
          inAdminPass.value = '';
          inAdminPass.focus();
        }
        return;
      }
      if (modalAnnounce) modalAnnounce.classList.remove('hidden');
      if (inAnnounceText) {
        inAnnounceText.value = '';
        inAnnounceText.focus();
      }
    });
  }
  if (btnCancelAnnounce) btnCancelAnnounce.addEventListener('click', () => {
    if (modalAnnounce) modalAnnounce.classList.add('hidden');
  });

  if (btnSendAnnounce) {
    btnSendAnnounce.addEventListener('click', () => {
      if (!state.isAdmin) {
        alert('❌ Yalnızca yetkili yönetici (admin) duyuru gönderebilir!');
        if (modalAnnounce) modalAnnounce.classList.add('hidden');
        return;
      }
      const text = inAnnounceText ? inAnnounceText.value.trim() : '';
      if (text) {
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({
            type: 'admin_announcement',
            text,
            author: state.username
          }));
        }
        if (modalAnnounce) modalAnnounce.classList.add('hidden');
      }
    });
  }

  // 5. Random Game Button Roulette (Sadece 11 seçkin oyun arasından seçer)
  if (btnRandom) {
    btnRandom.addEventListener('click', () => {
      AudioEngine.playDing();
      const games = [
        { path: '/cs16', name: 'CS 1.6' },
        { path: '/stickwar', name: 'STICK WAR: LEGACY' },
        { path: '/minecraft', name: 'MINECRAFT 3D' },
        { path: '/kafatopu', name: 'KAFA TOPU' },
        { path: '/sos', name: 'SOS ARENASI' },
        { path: '/geometrydash', name: 'GEOMETRY DASH' },
        { path: '/survivor', name: 'VAMPIRE SURVIVORS' },
        { path: '/diep', name: 'DIEP.IO' },
        { path: '/zombs', name: 'ZOMBS.IO' },
        { path: '/redmatch', name: 'REDMATCH 3D' },
        { path: '/dino', name: 'CHROME DINO HD' },
        { path: '/sumo', name: 'AHMET HAKAN SUMO' }
      ];
      btnRandom.textContent = '🎲 SEÇİLİYOR...';
      let count = 0;
      const iv = setInterval(() => {
        count++;
        const g = games[Math.floor(Math.random() * games.length)];
        btnRandom.textContent = '🎲 ' + g.name;
        if (count > 6) {
          clearInterval(iv);
          const chosen = games[Math.floor(Math.random() * games.length)];
          btnRandom.textContent = '🚀 ' + chosen.name + ' BAŞLATILIYOR!';
          setTimeout(() => { window.location.href = chosen.path; }, 400);
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
        const cat = card.dataset.category || '';
        const cats = cat.split(/\s+/);
        if (filter === 'all' || cats.includes(filter) || cat === filter) {
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
      if (state.username) {
        ws.send(JSON.stringify({ type: 'player_announce', username: state.username }));
      }
      if (state.isAdmin) {
        ws.send(JSON.stringify({ type: 'admin_auth', password: 'erencix201124' }));
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
      else if (data.type === 'portal_announcement') {
        if (window._showPortalAnnouncement) window._showPortalAnnouncement(data.text || data.message || '');
      }
      else if (data.type === 'portal_error') {
        alert(data.message || 'Yetkisiz işlem!');
      }
    };

    ws.onclose = () => setTimeout(initWS, 2500);
  }

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
          beyler sa yeni guncellemeleri getirdim deeep io yerine diep io yu ekledim tanklar cok sariyo stat fln yukseltionuz zombs io da geldi onur baran la eyup kizilderenn istedikleri loading screene yazildi bide pixelplace deki isim koyma ve giremmeme bugunu duzelttim artik direk girip boyaniyo lag fln da kalmadi hadi ii oyunlar
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

  initCyberCanvas();
  initWS();
  showUpdateNotification();

})();
