// overlay-back.js
// Universal overlay: Bottom-right Game Controls HUD + Universal ESC Menu & Announcement System
(function () {
  'use strict';

  /* ── Shared announcement handler ── */
  window._showPortalAnnouncement = function (msg, author) {
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed', 'top:70px', 'left:50%', 'transform:translateX(-50%)',
      'background:linear-gradient(135deg,rgba(180,0,0,0.95),rgba(120,0,0,0.95))',
      'color:#fff', 'padding:18px 36px', 'border-radius:10px',
      'font-size:20px', 'font-weight:bold', 'font-family:monospace',
      'z-index:999999', 'text-align:center', 'border:2px solid #ff4444',
      'max-width:85vw', 'box-shadow:0 0 30px rgba(255,0,0,0.5)',
      'animation:portalAnnIn 0.3s ease'
    ].join(';');

    if (!document.getElementById('_ann_style')) {
      const s = document.createElement('style');
      s.id = '_ann_style';
      s.textContent = `@keyframes portalAnnIn{from{opacity:0;transform:translateX(-50%) scale(0.8)}to{opacity:1;transform:translateX(-50%) scale(1)}}`;
      document.head.appendChild(s);
    }

    const sender = author || 'erencix';
    el.innerHTML = `📢 <span style="font-size:15px;opacity:0.9;color:#ffd700;">DUYURU (${sender} tarafından gönderildi)</span><br>${msg}`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity 0.5s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 14000);

    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.3, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      o.connect(g); g.connect(ac.destination);
      o.start(ac.currentTime); o.stop(ac.currentTime + 0.5);
    } catch (_) {}
  };

  /* ── 1. BOTTOM-RIGHT CONTROLS HUD (TÜM OYUNLARDA SAĞ ALTTADIR) ── */
  function initControlsHUD() {
    const path = window.location.pathname.toLowerCase();

    // Map each game to its controls
    const GAME_CONTROLS = {
      'cs16': {
        name: 'CS 1.6 & CS2 3D',
        icon: '🔫',
        bottom: '95px',
        right: '16px',
        keys: [
          { k: 'W A S D', d: 'Hareket & Koşma' },
          { k: 'MOUSE', d: 'Nişan & Sol Tık Ateş' },
          { k: 'SAĞ TIK', d: 'AWP Dürbün / Susturucu' },
          { k: 'R', d: 'Şarjör Doldur' },
          { k: 'B', d: 'Silah Mağazası' },
          { k: 'M', d: 'Takım Değiştir' },
          { k: 'TAB', d: 'Skor Tablosu' },
          { k: '1 - 5', d: 'Tüfek/Tabanca/Bıçak' },
          { k: 'ESC', d: 'Menü & Fareyi Bırak' }
        ]
      },
      'deeeep': {
        name: 'Deeeep.io Evrim',
        icon: '🐟',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'MOUSE', d: 'Yönel & Yüz' },
          { k: 'SOL TIK / SPACE', d: 'Hızlı Boost Isırığı' },
          { k: 'YÜZEY', d: 'Oksijen Yenile' },
          { k: 'DERİN DENİZ', d: 'Basınç & Sıcaklık Dikkat' },
          { k: 'YOSUN/BALIK', d: 'Yiyerek Seviye Atla' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'diep': {
        name: 'Diep.io Tank Arenası',
        icon: '🛡️',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'W A S D', d: 'Tankı Sür & Kaç' },
          { k: 'MOUSE / SOL TIK', d: 'Nişan Al & Ateş Et' },
          { k: 'E', d: 'Otomatik Ateş Aç/Kapat' },
          { k: 'C', d: 'Otomatik Dönüş (Spin)' },
          { k: '1 - 8', d: 'Stat Puanlarını Dağıt' },
          { k: 'ŞEKİLLER', d: 'Kare(+10) Üçgen(+25) Beşgen(+130)' },
          { k: 'EVRİM', d: 'Seviye 15/30/45 Yeni Tanklar' }
        ]
      },
      'tank': {
        name: 'Tank Savaşı 2D',
        icon: '🛡️',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'W A S D / OKLAR', d: 'Gövdeyi Sür' },
          { k: 'MOUSE', d: 'Kuleyi ve Namluyu Çevir' },
          { k: 'SOL TIK / SPACE', d: 'Seken Mermi Ateşle' },
          { k: 'SANDIKLAR', d: 'Lazer / Kalkan / Shotgun' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'slither': {
        name: 'Slither.io Yılan',
        icon: '🐍',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'MOUSE', d: 'Yılanın Başını Yönlendir' },
          { k: 'SOL TIK / SPACE', d: 'Hızlı Boost (Hızlanma)' },
          { k: 'PARILTI YEMLER', d: 'Yutarak Uzunluk Kazan' },
          { k: 'DİKKAT', d: 'Düşman gövdesine çarpma!' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'agario': {
        name: 'Agar.io Hücre',
        icon: '🦠',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'MOUSE', d: 'Hücreyi Hareket Ettir' },
          { k: 'SPACE', d: 'İkiye Bölün (Split Saldırı)' },
          { k: 'W', d: 'Kütle Fırlat (Virüs Besle)' },
          { k: 'VİRÜSLER', d: 'Dikenli Yeşil Daireler' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'pixelplace': {
        name: 'PixelPlace Harita',
        icon: '🎨',
        bottom: '85px',
        right: '16px',
        keys: [
          { k: 'SOL TIK', d: 'Seçili Renkle Piksel Boya' },
          { k: 'SAĞ TIK / SÜRÜKLE', d: 'Dünya Haritasında Gezin' },
          { k: 'TEKERLEK', d: 'Haritayı Yakınlaştır / Uzaklaştır' },
          { k: 'B', d: 'Bot & Çizim Stüdyosu Paneli' },
          { k: 'P', d: 'Alan Koruma (Giriş Yapılınca)' }
        ]
      },
      'xox': {
        name: 'XOX 1v1 Arena',
        icon: '❌',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'SOL TIK', d: 'Kareye Hamle Yap (X veya O)' },
          { k: 'SAYAÇ', d: '15 Saniye Hamle Limiti' },
          { k: 'SAĞ PANEL', d: 'Canlı Sohbet & Yeniden Başlat' }
        ]
      },
      'minecraft': {
        name: 'Minecraft TLauncher',
        icon: '⛏️',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'W A S D', d: 'Yürü & Koş' },
          { k: 'SPACE', d: 'Zıpla' },
          { k: 'SOL TIK', d: 'Blok Kır & Vur' },
          { k: 'SAĞ TIK', d: 'Blok Koy & Etkileşim' },
          { k: 'E', d: 'Envanter' },
          { k: '1 - 9', d: 'Hızlı Eşya Yuvası' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'survivor': {
        name: 'Zindan Avcısı RPG',
        icon: '⚔️',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'W A S D / OKLAR', d: 'Kahramanı Yürüt & Kaç' },
          { k: 'SPACE', d: 'Çevik Takla / Kaçış (Dash)' },
          { k: 'OTOMATİK', d: 'Kılıç & Büyüler Otomatik Vurur' },
          { k: 'XP TAŞLARI', d: 'Mıknatısla Topla & Seviye Atla' },
          { k: 'DEMİRCİ (B)', d: 'Kalıcı Güçlendirmeler' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'miner': {
        name: 'Maden Ustası RPG',
        icon: '⛏️',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'A D / SOL SAĞ', d: 'İlerle & Yana Kaz' },
          { k: 'S / AŞAĞI', d: 'Aşağı Kaz & Del' },
          { k: 'W / YUKARI / SPACE', d: 'Jetpack ile Uç' },
          { k: 'M', d: 'Cevher Pazarı (Yüzeyde)' },
          { k: 'B', d: 'Demirci & Atölye (Yüzeyde)' },
          { k: 'R', d: 'Yakıt Doldur & Tamir Et' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'kafatopu': {
        name: 'Kafa Topu Beyaz Saray',
        icon: '⚽',
        bottom: '48px',
        right: '16px',
        keys: [
          { k: 'O1: W A D', d: 'Oyuncu 1 Hareket & Zıpla' },
          { k: 'O1: N / M', d: 'Alçak / Yüksek Şut' },
          { k: 'O2: OKLAR', d: 'Oyuncu 2 Hareket' },
          { k: 'O2: SOL/SAĞ TIK', d: 'Yüksek / Alçak Şut' },
          { k: 'YAPIMCI', d: 'Made by Yusuf Kaan' }
        ]
      },
      'sos': {
        name: 'SOS Strateji',
        icon: '🅂',
        bottom: '44px',
        right: '16px',
        keys: [
          { k: 'SOL TIK', d: 'Harf Yerleştir (S veya O)' },
          { k: 'S-O-S', d: 'Dizi Yapınca Puan & Tekrar Oyna' },
          { k: 'HARİTA', d: '10x10 veya 25x24 Seç' },
          { k: 'MOD', d: 'Yapay Zeka veya 1v1' },
          { k: 'GELİŞTİRİCİ', d: 'Halil Eren' }
        ]
      },
      'zombs': {
        name: 'Zombs.io Kule Savunması',
        icon: '🧟',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'W A S D', d: 'Karakteri Yürüt' },
          { k: 'SOL TIK / SPACE', d: 'Saldır & Odun/Taş Topla' },
          { k: 'ALTIN KASASI', d: 'Önce Kasayı Koyup Üs Başlat' },
          { k: 'B', d: 'Mağaza & Savunma Kuleleri' },
          { k: 'E', d: 'Tüm Kuleleri Yükselt' },
          { k: 'P', d: 'Parti & Takım Menüsü' },
          { k: 'İSTEYEN', d: 'Onur Baran' },
          { k: 'GELİŞTİRİCİ', d: 'erencix' }
        ]
      },
      'slope': {
        name: 'Slope 3D Neon',
        icon: '🌐',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'A / D veya ← / →', d: 'Topu Sağa/Sola Yönlendir' },
          { k: 'SPACE', d: 'Başlat / Yeniden Dene' },
          { k: 'KIRMIZI BLOK', d: 'Engellerden Kaç' },
          { k: 'YAMAÇLAR', d: 'Rampalardan Uç & Hızlan' }
        ]
      },
      'hook': {
        name: 'Stickman Hook',
        icon: '🪝',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'SPACE / SOL TIK', d: 'Kancayı At ve Sallan' },
          { k: 'TRAMBOLİN', d: 'İleri & Yukarı Zıpla' },
          { k: 'AKROBASİ', d: 'Momentum Yakala & Uç' },
          { k: 'BİTİŞ ÇİZGİSİ', d: 'Bölümü Tamamla' }
        ]
      }
    };

    let cfg = null;
    for (const [key, val] of Object.entries(GAME_CONTROLS)) {
      if (path.includes(key)) {
        cfg = val;
        break;
      }
    }
    // Also match pixelplace root or /room
    if (!cfg && (path.includes('room') || path === '/pixelplace' || path.includes('canvas'))) {
      cfg = GAME_CONTROLS.pixelplace;
    }

    if (!cfg) return; // If on home portal index, don't show

    // Inject CSS for Controls HUD
    if (!document.getElementById('_controls_hud_style')) {
      const style = document.createElement('style');
      style.id = '_controls_hud_style';
      style.textContent = `
        #_game_controls_hud {
          position: fixed;
          z-index: 750000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
          user-select: none;
          pointer-events: auto;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #_game_controls_hud.collapsed ._gch_body {
          display: none;
        }
        #_game_controls_hud.collapsed ._gch_card {
          padding: 6px 12px;
          border-radius: 20px;
        }
        ._gch_card {
          background: rgba(10, 14, 26, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 240, 255, 0.4);
          border-radius: 10px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7), 0 0 16px rgba(0, 240, 255, 0.15);
          color: #fff;
          padding: 10px 14px;
          min-width: 210px;
          max-width: 290px;
        }
        ._gch_header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          cursor: pointer;
        }
        ._gch_title {
          font-size: 12px;
          font-weight: 700;
          color: #00f0ff;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
        }
        ._gch_toggle_btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffcc44;
          border-radius: 4px;
          font-size: 11px;
          padding: 2px 6px;
          cursor: pointer;
          font-family: monospace;
          transition: all 0.15s;
        }
        ._gch_toggle_btn:hover {
          background: rgba(255, 204, 68, 0.3);
          border-color: #ffcc44;
        }
        ._gch_body {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        ._gch_row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 11px;
        }
        ._gch_key {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-bottom: 2px solid rgba(255, 204, 68, 0.6);
          border-radius: 4px;
          padding: 1px 6px;
          font-family: 'Consolas', 'Courier New', monospace;
          font-weight: 700;
          color: #ffcc44;
          font-size: 10px;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }
        ._gch_desc {
          color: #cfd8dc;
          text-align: right;
          font-size: 11px;
        }
      `;
      document.head.appendChild(style);
    }

    const hud = document.createElement('div');
    hud.id = '_game_controls_hud';
    hud.style.bottom = cfg.bottom;
    hud.style.right = cfg.right;

    const isCollapsed = localStorage.getItem('_portal_controls_collapsed_' + cfg.name) === 'true';
    if (isCollapsed) hud.classList.add('collapsed');

    let rowsHtml = '';
    for (const item of cfg.keys) {
      rowsHtml += `
        <div class="_gch_row">
          <span class="_gch_key">${item.k}</span>
          <span class="_gch_desc">${item.d}</span>
        </div>
      `;
    }

    hud.innerHTML = `
      <div class="_gch_card">
        <div class="_gch_header" id="_gch_toggle">
          <div class="_gch_title">${cfg.icon} ${cfg.name} TUŞLARI</div>
          <button class="_gch_toggle_btn" id="_gch_btn" title="Gizle/Göster">${isCollapsed ? '➕ AÇ' : '➖'}</button>
        </div>
        <div class="_gch_body">
          ${rowsHtml}
        </div>
      </div>
    `;

    document.body.appendChild(hud);

    function toggleHUD() {
      const coll = hud.classList.toggle('collapsed');
      const btn = document.getElementById('_gch_btn');
      if (btn) btn.textContent = coll ? '➕ AÇ' : '➖';
      localStorage.setItem('_portal_controls_collapsed_' + cfg.name, coll ? 'true' : 'false');
    }

    document.getElementById('_gch_toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleHUD();
    });
  }

  // Ensure DOM is ready before injecting controls HUD
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initControlsHUD);
  } else {
    initControlsHUD();
  }

  // CS 1.6 has its own dedicated in-game pause menu, so skip universal ESC menu for it
  if (window.location.pathname.includes('cs16')) return;

  /* ── 2. FLOATING UNIVERSAL ESC MENU ── */
  const menu = document.createElement('div');
  menu.id = '_esc_menu';
  menu.style.cssText = [
    'display:none', 'position:fixed', 'inset:0',
    'background:rgba(0,0,0,0.88)', 'z-index:888888',
    'align-items:center', 'justify-content:center', 'flex-direction:column', 'gap:14px'
  ].join(';');
  menu.innerHTML = `
    <div style="color:#ffcc44;font-size:28px;font-weight:bold;font-family:monospace;margin-bottom:4px">⏸ OYUN DURAKLATILDI</div>
    <div style="color:#888;font-size:13px;font-family:monospace;margin-bottom:12px">ESC'ye bas veya aşağıdaki butonlara tıkla</div>
    <button id="_esc_resume" style="background:rgba(255,204,68,0.15);color:#ffcc44;border:2px solid #ffcc44;padding:12px 40px;font-size:16px;font-family:monospace;border-radius:6px;cursor:pointer;transition:all 0.15s;width:240px">▶ DEVAM ET</button>
    <a href="/" id="_esc_portal" style="background:rgba(255,255,255,0.08);color:#ddd;border:2px solid #555;padding:12px 40px;font-size:16px;font-family:monospace;border-radius:6px;cursor:pointer;text-decoration:none;text-align:center;width:240px;box-sizing:border-box">🏠 ANA PORTALE GİT</a>
    <button id="_esc_announce_btn" style="background:rgba(255,68,68,0.12);color:#ff8888;border:2px solid #ff4444;padding:10px 40px;font-size:14px;font-family:monospace;border-radius:6px;cursor:pointer;width:240px;display:none">📢 Admin: Duyuru Gönder</button>
  `;
  document.body.appendChild(menu);

  if (localStorage.getItem('portal_is_admin') === 'true') {
    const ab = document.getElementById('_esc_announce_btn');
    if (ab) ab.style.display = 'block';
  }

  let menuOpen = false;
  function openMenu() {
    menuOpen = true;
    menu.style.display = 'flex';
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function closeMenu() {
    menuOpen = false;
    menu.style.display = 'none';
  }

  document.getElementById('_esc_resume')?.addEventListener('click', closeMenu);

  document.getElementById('_esc_announce_btn')?.addEventListener('click', () => {
    const msg = prompt('Duyuru mesajı:');
    if (msg) {
      const ws = window._activeWS || window.state?.ws;
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'admin_announcement', text: msg, author: localStorage.getItem('portal_username') || 'Admin' }));
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (menuOpen) {
        closeMenu();
      } else {
        const tag = document.activeElement?.tagName;
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
          setTimeout(() => {
            if (!document.pointerLockElement) {
              openMenu();
            }
          }, 80);
        }
      }
    }
  });

  const fab = document.createElement('button');
  fab.id = '_fab_back';
  fab.title = 'Menü / Çıkış';
  fab.style.cssText = [
    'position:fixed', 'top:8px', 'left:8px', 'z-index:777777',
    'background:rgba(0,0,0,0.6)', 'color:#ffcc44',
    'border:1px solid rgba(255,204,68,0.4)', 'border-radius:50%',
    'width:36px', 'height:36px', 'font-size:16px',
    'cursor:pointer', 'display:flex', 'align-items:center', 'justify-content:center',
    'backdrop-filter:blur(4px)', 'transition:all 0.15s',
    'pointer-events:all'
  ].join(';');
  fab.textContent = '☰';
  fab.addEventListener('click', openMenu);
  fab.addEventListener('mouseenter', () => { fab.style.background = 'rgba(255,204,68,0.25)'; fab.style.transform = 'scale(1.1)'; });
  fab.addEventListener('mouseleave', () => { fab.style.background = 'rgba(0,0,0,0.6)'; fab.style.transform = 'scale(1)'; });
  document.body.appendChild(fab);

  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && !menuOpen) {
      const blocker = document.getElementById('cs-blocker');
      if (blocker && !blocker.classList.contains('hidden')) return;
    }
  });

  /* ── 4. IN-GAME LIVE PLAYER COUNT BADGE & UNIVERSAL PRESENCE ── */
  (function initPresenceAndBadge() {
    const pName = window.location.pathname.toLowerCase();
    const GAME_KEYS = [
      'cs16', 'minecraft', 'eaglercraft', 'survivor', 'racing', 'stickwar',
      'slope', 'hook', 'kafatopu', 'sos', 'geometrydash', 'diep', 'tank',
      'zombs', 'sumo', 'dino', 'gartic', 'subway', 'python', 'pygame',
      'trollparkur', 'miner', 'xox', 'deeeep', 'slither', 'agario', 'pixelplace'
    ];
    let currentKey = GAME_KEYS.find(k => pName.includes(k)) || 'game';

    // Top floating live player count badge
    const badge = document.createElement('div');
    badge.id = '_universal_player_badge';
    
    // Position intelligently so it never overlaps existing top bars
    let topOffset = '10px';
    if (document.querySelector('.top-hud') || document.querySelector('.cs-top-bar') || document.querySelector('header')) {
      topOffset = '58px';
    }

    badge.style.cssText = [
      'position:fixed', `top:${topOffset}`, 'right:16px', 'z-index:999990',
      'background:rgba(13,17,23,0.88)', 'color:#00e5ff',
      'border:1px solid rgba(0,229,255,0.45)', 'border-radius:20px',
      'padding:5px 12px', 'font-size:12px', 'font-weight:800',
      'font-family:monospace', 'display:flex', 'align-items:center', 'gap:6px',
      'box-shadow:0 4px 15px rgba(0,0,0,0.6)', 'backdrop-filter:blur(6px)',
      'user-select:none', 'pointer-events:none', 'transition:opacity 0.3s'
    ].join(';');
    badge.innerHTML = '🟢 <span id="_upb_count">1</span> Oyuncu Arenada';
    document.body.appendChild(badge);

    function updateBadge(c) {
      const el = document.getElementById('_upb_count');
      if (el) el.textContent = Math.max(1, c || 1);
    }
    window._updateInGamePlayerCount = updateBadge;

    // Connect presence WebSocket for games without dedicated multiplayer server loop
    let presenceWS = null;
    function connectPresenceWS() {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        presenceWS = new WebSocket(`${proto}//${window.location.host}`);
        window._presenceWS = presenceWS;
        presenceWS.onopen = () => {
          presenceWS.send(JSON.stringify({ type: 'join', room: currentKey }));
        };
        presenceWS.onmessage = (ev) => {
          try {
            const d = JSON.parse(ev.data);
            if (d.type === 'online' && d.counts && d.counts.rooms) {
              const c = d.counts.rooms[currentKey] || 1;
              updateBadge(c);
            }
            if (d.type === 'admin_announcement' || d.type === 'portal_announcement') {
              window._showPortalAnnouncement(d.text || d.message, d.author);
            }
          } catch (_) {}
        };
      } catch (_) {}
    }

    // Delay to let any game native WS initialize first
    setTimeout(() => {
      const existing = window.state?.ws || window._activeWS || window.ws;
      if (!existing || existing.readyState > 1) {
        connectPresenceWS();
      }
    }, 700);

    // Periodic stats fetch for live synchronization
    async function syncStats() {
      try {
        const res = await fetch('/api/portal-stats');
        if (res.ok) {
          const stats = await res.json();
          if (stats.games && stats.games[currentKey] !== undefined) {
            updateBadge(stats.games[currentKey]);
          } else if (stats.onlineTotal !== undefined) {
            updateBadge(Math.max(1, stats.onlineTotal));
          }
        }
      } catch (_) {}
    }
    syncStats();
    setInterval(syncStats, 3000);
  })();

})();
