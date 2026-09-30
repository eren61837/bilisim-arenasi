// overlay-back.js
// Universal overlay: Bottom-right Game Controls HUD + Universal ESC Menu & Announcement System
(function () {
  'use strict';

  // ⛔ KAYNAK KODU KORUMASI
  (function() {
    // Sağ tık engeli
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    });

    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U engeli
    document.addEventListener('keydown', function(e) {
      // F12
      if (e.keyCode === 123) { e.preventDefault(); return false; }
      // Ctrl+Shift+I / J / C (DevTools)
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
        e.preventDefault(); return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && !e.shiftKey && e.keyCode === 85) {
        e.preventDefault(); return false;
      }
      // Ctrl+S (Save page)
      if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault(); return false;
      }
    });

    // DevTools detection (boyut farkı yöntemi)
    let devToolsOpen = false;
    const threshold = 160;
    setInterval(function() {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          // Geliştirici araçları açık uyarısı göster
          const w = document.createElement('div');
          w.id = 'devtools-warning';
          w.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.97);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ff1744;font-family:monospace;font-size:24px;font-weight:900;text-align:center;';
          w.innerHTML = '<div style="font-size:64px">⛔</div><div>GELİŞTİRİCİ ARAÇLARI TESPİT EDİLDİ</div><div style="font-size:14px;color:#aaa;margin-top:12px">Bu site kaynak kod görüntülemeye karşı korumalıdır.</div><div style="font-size:14px;color:#aaa">Geliştirici araçlarını kapatıp sayfayı yenileyin.</div>';
          document.body.appendChild(w);
        }
      } else {
        devToolsOpen = false;
        const w = document.getElementById('devtools-warning');
        if (w) w.remove();
      }
    }, 1000);
  })();

  /* ── Universal Real-Time Announcement System with Cross-Tab Sync ── */
  const annChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('bilisim_portal_announcements') : null;
  const displayedAnnouncements = new Set();

  window._showPortalAnnouncement = function (msg, author, id, isInternalSync) {
    if (!msg) return;
    const cleanMsg = String(msg).trim();
    if (!cleanMsg) return;

    const annKey = (id || (cleanMsg + '_' + (author || ''))).toString();
    if (displayedAnnouncements.has(annKey)) return;
    displayedAnnouncements.add(annKey);
    if (displayedAnnouncements.size > 50) {
      const first = displayedAnnouncements.values().next().value;
      displayedAnnouncements.delete(first);
    }

    // Cross-tab broadcast so ANY other tab on this machine receives it in 0.1ms
    if (!isInternalSync) {
      try {
        const payload = { id: annKey, text: cleanMsg, author: author || '👑 Admin', ts: Date.now() };
        if (annChannel) annChannel.postMessage(payload);
        localStorage.setItem('portal_latest_announcement', JSON.stringify(payload));
      } catch (_) {}
    }

    const existing = document.getElementById('_portal_active_ann');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = '_portal_active_ann';
    el.style.cssText = [
      'position:fixed', 'top:10px', 'left:50%', 'transform:translateX(-50%)',
      'background:linear-gradient(135deg,rgba(180,0,0,0.96),rgba(120,0,0,0.98))',
      'color:#fff', 'padding:10px 18px', 'border-radius:10px',
      'font-size:clamp(12px, 1.5vw, 15px)', 'font-weight:bold',
      'font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'z-index:9999999', 'border:2px solid #ff4444',
      'max-width:min(92vw, 560px)', 'max-height:70vh', 'overflow-y:auto',
      'box-shadow:0 8px 32px rgba(0,0,0,0.85), 0 0 25px rgba(255,0,0,0.5)',
      'animation:portalAnnIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      'word-break:break-word', 'overflow-wrap:anywhere', 'white-space:pre-wrap',
      'display:flex', 'flex-direction:column', 'gap:6px', 'box-sizing:border-box'
    ].join(';');

    if (!document.getElementById('_ann_style')) {
      const s = document.createElement('style');
      s.id = '_ann_style';
      s.textContent = `@keyframes portalAnnIn{from{opacity:0;transform:translateX(-50%) scale(0.85)}to{opacity:1;transform:translateX(-50%) scale(1)}}`;
      document.head.appendChild(s);
    }

    const sender = author || '👑 Admin';
    el.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; width:100%; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:5px; gap:10px;">
        <span style="font-size:12px; color:#ffd700; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:6px;">
          📢 DUYURU (${sender})
        </span>
        <button id="_btn_close_ann" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.4); color:#fff; border-radius:50%; width:24px; height:24px; font-size:12px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
      </div>
      <div style="font-size:clamp(13px, 1.8vw, 15px); line-height:1.45; text-align:left; max-width:100%;">${cleanMsg}</div>
    `;
    document.body.appendChild(el);

    const closeBtn = el.querySelector('#_btn_close_ann');
    if (closeBtn) closeBtn.onclick = () => { el.remove(); };

    setTimeout(() => {
      if (el.parentNode) {
        el.style.transition = 'opacity 0.4s';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 400);
      }
    }, 14000);

    // Modern Double-Chime Synth
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o1 = ac.createOscillator();
      const o2 = ac.createOscillator();
      const g = ac.createGain();
      o1.type = 'sine'; o1.frequency.setValueAtTime(587.33, ac.currentTime); // D5
      o2.type = 'sine'; o2.frequency.setValueAtTime(880.00, ac.currentTime + 0.12); // A5
      g.gain.setValueAtTime(0.25, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
      o1.connect(g); o2.connect(g); g.connect(ac.destination);
      o1.start(ac.currentTime); o1.stop(ac.currentTime + 0.3);
      o2.start(ac.currentTime + 0.12); o2.stop(ac.currentTime + 0.6);
    } catch (_) {}
  };

  // Cross-tab sync listeners
  if (annChannel) {
    annChannel.onmessage = (ev) => {
      const d = ev.data;
      if (d && d.text) {
        window._showPortalAnnouncement(d.text, d.author, d.id, true);
      }
    };
  }
  window.addEventListener('storage', (e) => {
    if (e.key === 'portal_latest_announcement' && e.newValue) {
      try {
        const d = JSON.parse(e.newValue);
        if (d && d.text && (Date.now() - (d.ts || 0) < 60000)) {
          window._showPortalAnnouncement(d.text, d.author, d.id, true);
        }
      } catch (_) {}
    }
  });

  // Polling fallback to ensure 100% receipt even if WS is disconnected
  async function pollLatestAnnouncement() {
    if (document.hidden) return;
    try {
      const res = await fetch('/api/latest-announcement');
      if (res.ok) {
        const data = await res.json();
        if (data && data.announcement && data.announcement.text) {
          const ann = data.announcement;
          if (Date.now() - (ann.timestamp || 0) < 60000) {
            window._showPortalAnnouncement(ann.text || ann.message, ann.author, ann.id, true);
          }
        }
      }
    } catch (_) {}
  }
  setInterval(pollLatestAnnouncement, 10000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) pollLatestAnnouncement();
  });

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
      },
      'tetris': {
        name: 'Cyber Tetris Neon',
        icon: '🧱',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: '← / → veya A / D', d: 'Bloğu Sağa/Sola Taşı' },
          { k: '↑ veya W', d: 'Bloğu Döndür' },
          { k: '↓ veya S', d: 'Yumuşak Düşüş (Soft Drop)' },
          { k: 'SPACE', d: 'Anında Bırak (Hard Drop)' },
          { k: 'C veya HOLD', d: 'Bloğu Sakla (Hold Piece)' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'flappy': {
        name: 'Flappy Cyber Bird',
        icon: '🐦',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'SPACE / SOL TIK', d: 'Kanat Çırp & Havalan' },
          { k: 'BORULAR', d: 'Aralarından Geç & Skor Yap' },
          { k: 'GÖRÜNÜM', d: 'Cyber, Phoenix, Mecha, Gold' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'python': {
        name: 'Python & Pygame Arenası',
        icon: '🐍',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'W A S D / OKLAR', d: 'Yılan / Gemi Hareketi' },
          { k: 'SPACE', d: 'Lazer Ateşi / Zıplama' },
          { k: 'KOD EDİTÖRÜ', d: 'Canlı Python Kodunu Değiştir' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'gartic': {
        name: 'Gartic.io & Çizim',
        icon: '🎨',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'MOUSE / DOKUNMATİK', d: 'Tuvale Çizim Yap' },
          { k: 'RENK PALETİ', d: 'Fırça ve Renk Seç' },
          { k: 'METİN KUTUSU', d: 'Çizimi En Hızlı Tahmin Et' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'papermap': {
        name: 'PaperMap.io Fetih',
        icon: '🗺️',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'MOUSE / W A S D', d: 'Karakteri Sür & Alan Genişlet' },
          { k: 'ÇİZGİ (TRAIL)', d: 'Kendi üssüne dönerek kapat' },
          { k: 'DİKKAT', d: 'Çizgini düşmanlar kesmesin!' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'stickwar': {
        name: 'Stick War: Legacy',
        icon: '⚔️',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: '1 - 7', d: 'Madenci / Kılıç / Okçu / Mızrak / Büyücü / Dev' },
          { k: 'Z / X / C', d: 'Savun / Saldır / Kaleye Sığın' },
          { k: 'R / T / Y', d: 'Öfke / Şifa / Göktaşı Büyüleri' },
          { k: 'U / M', d: 'Demirci Cephaneliği / Haritayı Aç-Kapa' },
          { k: 'A / D / SPACE', d: 'Asker Seçilince Manuel Savaş & Vur' },
          { k: 'H', d: 'Bu Tuş Kılavuzunu Gizle / Aç' }
        ]
      },
      'subway': {
        name: 'Subway Surfers Web',
        icon: '🏃',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: '← / → veya A / D', d: 'Sağa / Sola Şerit Değiştir' },
          { k: '↑ veya W / SPACE', d: 'Trenlerin Üzerine Zıpla' },
          { k: '↓ veya S', d: 'Engellerin Altından Kay' },
          { k: 'ÇİFT TIK / SPACE', d: 'Uçan Kaykayı (Hoverboard) Aç' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'racing': {
        name: 'Bilişim GP Yarış',
        icon: '🏎️',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'W / ↑', d: 'Gazı Kökle & Hızlan' },
          { k: 'S / ↓', d: 'Fren & Geri Vites' },
          { k: 'A / D veya ← / →', d: 'Direksiyon & Viraj' },
          { k: 'SPACE', d: 'El Freni & Keskin Drift' },
          { k: 'SHIFT / N', d: 'Nitro Roketi Ateşle' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'sumo': {
        name: 'Ahmet Hakan Kutu Sumo',
        icon: '🥊',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'O1: A / D & W', d: '1. Oyuncu Hareket & Zıplama' },
          { k: 'O1: SPACE / S', d: 'Yumruk & Şarjlı Süper Yumruk' },
          { k: 'O2: OKLAR', d: '2. Oyuncu Hareket & Zıpla' },
          { k: 'O2: ENTER / AŞAĞI', d: 'Yumruk & Nakavt Duruşu' },
          { k: 'HEDEF', d: 'Rakibi Masadan & Ringden Aşağı Uçur!' }
        ]
      },
      'dino': {
        name: 'Chrome Cyber Dino HD',
        icon: '🦖',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'SPACE / ↑', d: 'Kaktüslerin Üzerinden Zıpla' },
          { k: '↓ / S', d: 'Pterodaktillerin Altından Eğil' },
          { k: 'SKOR', d: 'Gece / Gündüz Siber Neon Döngüsü' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'geometrydash': {
        name: 'Geometry Dash Neon',
        icon: '⚡',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'SPACE / SOL TIK / ↑', d: 'Dikenlerin Üzerinden Zıpla' },
          { k: 'RİTİM', d: 'Müziğin Ritmini Yakala' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'redmatch': {
        name: 'Redmatch 2 Siber FPS',
        icon: '🎯',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'W A S D', d: 'Hareket & Kayma' },
          { k: 'SPACE', d: 'Zıpla & Çift Zıpla' },
          { k: 'SOL TIK', d: 'Ateş Et' },
          { k: 'SAĞ TIK', d: 'Dürbün Aç' },
          { k: 'R', d: 'Mermi Doldur' },
          { k: 'ESC', d: 'Menü' }
        ]
      },
      'eaglercraft': {
        name: 'Minecraft Eaglercraft Web',
        icon: '🧱',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'W A S D', d: 'Yürü & Koş' },
          { k: 'SPACE', d: 'Zıpla' },
          { k: 'SOL TIK', d: 'Blok Kır / Saldır' },
          { k: 'SAĞ TIK', d: 'Blok Yerleştir / Kullan' },
          { k: 'E', d: 'Envanter' },
          { k: '1 - 9', d: 'Eşya Seç' },
          { k: 'ESC', d: 'Menü & Fareyi Bırak' }
        ]
      },
      'trollparkur': {
        name: 'Troll Parkur Macera',
        icon: '🧗',
        bottom: '16px',
        right: '16px',
        keys: [
          { k: 'A / D veya ← / →', d: 'İlerle' },
          { k: 'SPACE / W / ↑', d: 'Zıpla' },
          { k: 'DİKKAT', d: 'Troll Tuzaklara Basma!' },
          { k: 'ESC', d: 'Menü' }
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

    const savedCollapse = localStorage.getItem('_portal_controls_collapsed_' + cfg.name);
    const isSmallScreen = window.innerHeight <= 800 || window.innerWidth <= 1100;
    const isCollapsed = savedCollapse !== null ? savedCollapse === 'true' : isSmallScreen;
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
          <div class="_gch_title">${cfg.icon} ${cfg.name} TUŞLARI <span style="font-size:9px; opacity:0.7;">[H]</span></div>
          <button class="_gch_toggle_btn" id="_gch_btn" title="Gizle/Göster (H Tuşu)">${isCollapsed ? '➕ AÇ' : '➖'}</button>
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

    // Press 'H' anywhere to toggle controls HUD
    window.addEventListener('keydown', (e) => {
      if (e.key && e.key.toLowerCase() === 'h') {
        const tag = document.activeElement?.tagName;
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
          toggleHUD();
        }
      }
    });
  }

  // Ensure DOM is ready before injecting controls HUD
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initControlsHUD);
  } else {
    initControlsHUD();
  }

  /* ── 2. FLOATING UNIVERSAL ESC MENU ── */
  if (!window.location.pathname.includes('cs16')) {
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

    const hasTopNav = !!document.querySelector('.sw-top-bar, .top-hud, .sw-brand, header, .pixel-top-bar');
    const fabTop = hasTopNav ? 'auto' : '8px';
    const fabBottom = hasTopNav ? '14px' : 'auto';

    const fab = document.createElement('button');
    fab.id = '_fab_back';
    fab.title = 'Menü / Çıkış (ESC)';
    fab.style.cssText = [
      'position:fixed', 'left:8px', `top:${fabTop}`, `bottom:${fabBottom}`, 'z-index:777777',
      'background:rgba(0,0,0,0.65)', 'color:#ffcc44',
      'border:1px solid rgba(255,204,68,0.4)', 'border-radius:50%',
      'width:36px', 'height:36px', 'font-size:16px',
      'cursor:pointer', 'display:flex', 'align-items:center', 'justify-content:center',
      'backdrop-filter:blur(4px)', 'transition:all 0.15s',
      'pointer-events:all', 'box-shadow:0 2px 10px rgba(0,0,0,0.5)'
    ].join(';');
    fab.textContent = '☰';
    fab.addEventListener('click', openMenu);
    fab.addEventListener('mouseenter', () => { fab.style.background = 'rgba(255,204,68,0.25)'; fab.style.transform = 'scale(1.1)'; });
    fab.addEventListener('mouseleave', () => { fab.style.background = 'rgba(0,0,0,0.65)'; fab.style.transform = 'scale(1)'; });
    document.body.appendChild(fab);

    // Universal anti-overflow and screen-fit across ALL games
    if (!document.getElementById('_portal_universal_screen_fix')) {
      const gStyle = document.createElement('style');
      gStyle.id = '_portal_universal_screen_fix';
      gStyle.textContent = `
        html, body {
          width: 100vw;
          max-width: 100vw;
          height: 100vh;
          max-height: 100vh;
          margin: 0;
          padding: 0;
          overflow: hidden !important;
          box-sizing: border-box;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }
        canvas {
          max-width: 100vw;
        }
      `;
      document.head.appendChild(gStyle);
    }

    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && !menuOpen) {
        const blocker = document.getElementById('cs-blocker');
        if (blocker && !blocker.classList.contains('hidden')) return;
      }
    });
  }

  /* ── 3. UNIVERSAL EXIT RATING MODAL (PORTALE GİDERKEN GERÇEK KULLANICI PUANLAMASI) ── */
  (function initExitRatingSystem() {
    const pName = window.location.pathname.toLowerCase();
    if (pName === '/' || pName === '/index.html' || pName === '') return;

    const GAME_KEYS = [
      'cs16', 'minecraft', 'eaglercraft', 'survivor', 'racing', 'stickwar',
      'slope', 'hook', 'kafatopu', 'sos', 'geometrydash', 'diep', 'tank',
      'zombs', 'sumo', 'dino', 'gartic', 'subway', 'python', 'pygame',
      'trollparkur', 'miner', 'xox', 'deeeep', 'slither', 'agario', 'pixelplace'
    ];
    const currentKey = GAME_KEYS.find(k => pName.includes(k)) || 'game';

    let modal = document.getElementById('_portal_exit_rating_modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = '_portal_exit_rating_modal';
      modal.style.cssText = [
        'display:none', 'position:fixed', 'inset:0',
        'background:rgba(5,9,16,0.92)', 'backdrop-filter:blur(10px)',
        '-webkit-backdrop-filter:blur(10px)', 'z-index:9999999',
        'align-items:center', 'justify-content:center', 'padding:16px',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
      ].join(';');

      modal.innerHTML = `
        <div style="background:linear-gradient(135deg,#0d131f,#162032);border:2px solid #00e5ff;border-radius:18px;max-width:440px;width:100%;padding:28px 24px;text-align:center;box-shadow:0 12px 50px rgba(0,0,0,0.85),0 0 30px rgba(0,229,255,0.25);animation:portalAnnIn 0.25s ease;">
          <div style="font-size:48px;line-height:1;margin-bottom:12px;">⭐</div>
          <h2 style="font-size:22px;font-weight:900;color:#fff;margin:0 0 8px;letter-spacing:0.5px;">Oyundan Çıkılıyor</h2>
          <p style="font-size:13.5px;color:#a0aec0;margin:0 0 20px;line-height:1.5;">Arenaya dönmeden önce bu oyuna 1-5 arası kaç yıldız verirsin?</p>
          
          <div id="_exit_stars_container" style="display:flex;justify-content:center;gap:10px;margin-bottom:24px;">
            <button class="_exit_star_btn" data-star="1" style="background:none;border:none;font-size:36px;cursor:pointer;color:#4a5568;transition:transform 0.15s,color 0.15s;padding:2px;">★</button>
            <button class="_exit_star_btn" data-star="2" style="background:none;border:none;font-size:36px;cursor:pointer;color:#4a5568;transition:transform 0.15s,color 0.15s;padding:2px;">★</button>
            <button class="_exit_star_btn" data-star="3" style="background:none;border:none;font-size:36px;cursor:pointer;color:#4a5568;transition:transform 0.15s,color 0.15s;padding:2px;">★</button>
            <button class="_exit_star_btn" data-star="4" style="background:none;border:none;font-size:36px;cursor:pointer;color:#4a5568;transition:transform 0.15s,color 0.15s;padding:2px;">★</button>
            <button class="_exit_star_btn" data-star="5" style="background:none;border:none;font-size:36px;cursor:pointer;color:#4a5568;transition:transform 0.15s,color 0.15s;padding:2px;">★</button>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            <button id="_btn_submit_exit_rate" style="background:linear-gradient(135deg,#00e5ff,#0077b6);color:#000;border:none;padding:12px;border-radius:10px;font-size:15px;font-weight:900;cursor:pointer;transition:transform 0.15s;letter-spacing:0.5px;">PUAN VER VE ARENAYA GİT 🚀</button>
            <div style="display:flex;gap:10px;">
              <button id="_btn_skip_exit_rate" style="flex:1;background:rgba(255,255,255,0.06);color:#a0aec0;border:1px solid #4a5568;padding:10px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;">Geç (Puan Verme)</button>
              <button id="_btn_cancel_exit_modal" style="flex:1;background:transparent;color:#718096;border:1px solid #2d3748;padding:10px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;">Oyuna Dön</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      let chosenRating = 5;
      const starBtns = modal.querySelectorAll('._exit_star_btn');

      function highlightExitStars(num) {
        starBtns.forEach((b, i) => {
          const val = i + 1;
          b.style.color = val <= num ? '#ffd700' : '#4a5568';
          b.style.transform = val <= num ? 'scale(1.15)' : 'scale(1)';
        });
      }
      highlightExitStars(5);

      starBtns.forEach(b => {
        b.addEventListener('mouseenter', () => {
          highlightExitStars(parseInt(b.dataset.star, 10));
        });
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          chosenRating = parseInt(b.dataset.star, 10);
          highlightExitStars(chosenRating);
        });
      });
      modal.querySelector('#_exit_stars_container').addEventListener('mouseleave', () => {
        highlightExitStars(chosenRating);
      });

      let pendingTargetUrl = '/';

      function proceedToExit() {
        modal.style.display = 'none';
        window.location.href = pendingTargetUrl;
      }

      modal.querySelector('#_btn_submit_exit_rate').addEventListener('click', async () => {
        const u = localStorage.getItem('portal_username') || 'Misafir';
        localStorage.setItem('my_rating_' + currentKey, String(chosenRating));
        try {
          await fetch('/api/rate-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId: currentKey,
              rating: chosenRating,
              username: u
            })
          });
        } catch (_) {}
        proceedToExit();
      });

      modal.querySelector('#_btn_skip_exit_rate').addEventListener('click', () => {
        proceedToExit();
      });

      modal.querySelector('#_btn_cancel_exit_modal').addEventListener('click', () => {
        modal.style.display = 'none';
      });

      function handleExitClick(e) {
        const target = e.currentTarget || e.target;
        const href = target.getAttribute('href') || '/';
        const alreadyRated = localStorage.getItem('my_rating_' + currentKey);
        if (!alreadyRated) {
          e.preventDefault();
          e.stopPropagation();
          pendingTargetUrl = href;
          modal.style.display = 'flex';
          return false;
        }
      }

      function attachExitHandlers() {
        const exitSelectors = [
          '#_esc_portal',
          'a[href="/"]',
          'a[href="/index.html"]',
          '.btn-back-portal',
          '.btn-racing-nav[href="/"]',
          '.btn-sw-nav',
          '.btn-menu-exit',
          '.btn-sw-secondary',
          '.btn-back'
        ];
        document.querySelectorAll(exitSelectors.join(',')).forEach(el => {
          if (!el._hasExitHandler) {
            el._hasExitHandler = true;
            el.addEventListener('click', handleExitClick);
          }
        });
      }

      attachExitHandlers();
      setTimeout(attachExitHandlers, 1000);
      setTimeout(attachExitHandlers, 3000);
    }
  })();

  /* ── 4. IN-GAME LIVE PLAYER COUNT BADGE & UNIVERSAL PRESENCE ── */
  /* ── 4. IN-GAME LIVE PLAYER COUNT BADGE & UNIVERSAL REAL-TIME PRESENCE ── */
  (function initPresenceAndBadge() {
    const pName = window.location.pathname.toLowerCase();
    const GAME_KEYS = [
      'cs16', 'minecraft', 'eaglercraft', 'survivor', 'racing', 'stickwar',
      'slope', 'hook', 'kafatopu', 'sos', 'geometrydash', 'diep', 'tank',
      'zombs', 'sumo', 'dino', 'gartic', 'subway', 'python', 'pygame',
      'trollparkur', 'miner', 'xox', 'deeeep', 'slither', 'agario', 'pixelplace',
      'tetris', 'flappy', 'redmatch', 'templerun', 'papermap'
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

    // Connect persistent presence & announcement WebSocket with auto-reconnect & heartbeat
    let presenceWS = null;
    let reconnectDelay = 1000;
    let keepAliveIv = null;

    function connectPresenceWS() {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        presenceWS = new WebSocket(`${proto}//${window.location.host}`);
        window._presenceWS = presenceWS;

        presenceWS.onopen = () => {
          reconnectDelay = 1000;
          presenceWS.send(JSON.stringify({ type: 'join', room: currentKey }));
          // Heartbeat to prevent Render 55s timeout
          if (keepAliveIv) clearInterval(keepAliveIv);
          keepAliveIv = setInterval(() => {
            if (presenceWS && presenceWS.readyState === WebSocket.OPEN) {
              presenceWS.send('ping');
            }
          }, 25000);
        };

        presenceWS.onmessage = (ev) => {
          if (typeof ev.data !== 'string') return;
          try {
            const d = JSON.parse(ev.data);
            if (d.type === 'online' && d.counts && d.counts.rooms) {
              const c = d.counts.rooms[currentKey] || 1;
              updateBadge(c);
            }
            if (d.type === 'admin_announcement' || d.type === 'portal_announcement') {
              window._showPortalAnnouncement(d.text || d.message, d.author, d.id);
            }
          } catch (_) {}
        };

        presenceWS.onclose = () => {
          if (keepAliveIv) clearInterval(keepAliveIv);
          setTimeout(connectPresenceWS, reconnectDelay);
          reconnectDelay = Math.min(10000, reconnectDelay * 1.5);
        };

        presenceWS.onerror = () => {
          try { presenceWS.close(); } catch (_) {}
        };
      } catch (_) {}
    }

    connectPresenceWS();

    // Universal WebSocket interceptor: any native game socket will also route announcements!
    try {
      const origAddEventListener = WebSocket.prototype.addEventListener;
      WebSocket.prototype.addEventListener = function(type, listener, options) {
        if (type === 'message' && typeof listener === 'function') {
          const wrapped = function(event) {
            try {
              if (typeof event.data === 'string') {
                const d = JSON.parse(event.data);
                if (d && (d.type === 'admin_announcement' || d.type === 'portal_announcement')) {
                  window._showPortalAnnouncement(d.text || d.message, d.author, d.id);
                }
              }
            } catch (_) {}
            return listener.apply(this, arguments);
          };
          return origAddEventListener.call(this, type, wrapped, options);
        }
        return origAddEventListener.apply(this, arguments);
      };
    } catch (_) {}

    // Throttled stats polling only if WS is disconnected, and paused when tab is hidden
    async function syncStats() {
      if (document.hidden) return;
      if (presenceWS && presenceWS.readyState === WebSocket.OPEN) return; // WS already receives live counts!
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
    setInterval(syncStats, 15000);
  })();

})();
