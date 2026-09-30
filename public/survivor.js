// survivor.js - Zindan Avcısı (Vampire Survivors RPG Grinder)
(function() {
  'use strict';

  // --- AUDIO SYNTHESIZER ---
  const _rawSfx = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.1) {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(gainVal, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
      } catch (_) {}
    },
    gem() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.08);
      } catch (_) {}
    },
    slash() {
      this.playTone(320, 'sawtooth', 0.08, 0.08);
    },
    fireball() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.25);
      } catch (_) {}
    },
    lightning() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.3);
      } catch (_) {}
    },
    hit() {
      this.playTone(140, 'square', 0.12, 0.15);
    },
    levelup() {
      try {
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, High C
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            this.playTone(freq, 'sine', 0.2, 0.12);
          }, idx * 70);
        });
      } catch (_) {}
    },
    bossAlarm() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.3);
        osc.frequency.linearRampToValueAtTime(150, now + 0.6);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.6);
      } catch (_) {}
    },
    chest() {
      try {
        this.init();
        if (!this.ctx) return;
        const notes = [440, 554, 659, 880, 1108];
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            this.playTone(freq, 'triangle', 0.25, 0.15);
          }, idx * 60);
        });
      } catch (_) {}
    },
    victory() {
      try {
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            this.playTone(freq, 'triangle', 0.35, 0.2);
          }, idx * 90);
        });
      } catch (_) {}
    },
    magic() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(1180, now + 0.14);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.14);
      } catch (_) {}
    },
    fire() {
      this.fireball();
    },
    warning() {
      try {
        this.init();
        if (!this.ctx) return;
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            this.bossAlarm();
          }, i * 220);
        }
      } catch (_) {}
    }
  };

  // Safe Proxy so no unknown Sfx call ever crashes the game loop
  const Sfx = new Proxy(_rawSfx, {
    get(target, prop) {
      if (prop in target) {
        return typeof target[prop] === 'function' ? target[prop].bind(target) : target[prop];
      }
      return () => {};
    }
  });

  // --- GOTHIC SYNTHWAVE BGM GENERATOR (CASTLEVANIA / VAMPIRE SURVIVORS) ---
  const SurvivorBGM = {
    ctx: null,
    isPlaying: false,
    intervalId: null,
    step: 0,
    bassline: [146.83, 146.83, 174.61, 196.00, 146.83, 146.83, 130.81, 138.59],
    melody: [587.33, 698.46, 880.00, 1046.50, 987.77, 880.00, 830.61, 880.00],
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    },
    start() {
      this.init();
      if (!this.ctx || this.isPlaying) return;
      this.isPlaying = true;
      this.step = 0;
      this.intervalId = setInterval(() => this.tick(), 175);
      this.updateButton(true);
    },
    stop() {
      this.isPlaying = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.updateButton(false);
    },
    toggle() {
      if (this.isPlaying) this.stop();
      else this.start();
    },
    updateButton(active) {
      const btn = document.getElementById('btn-toggle-bgm');
      if (btn) {
        btn.innerHTML = active ? '<span>🎵</span>' : '<span>🔇</span>';
        btn.style.color = active ? '#00e5ff' : '#757575';
      }
    },
    tick() {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      const bNote = this.bassline[this.step % this.bassline.length];
      const mNote = this.melody[Math.floor(this.step / 2) % this.melody.length];

      try {
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(bNote, now);
        gain1.gain.setValueAtTime(0.035, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc1.connect(gain1); gain1.connect(this.ctx.destination);
        osc1.start(now); osc1.stop(now + 0.16);

        if (this.step % 2 === 0) {
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(mNote, now);
          gain2.gain.setValueAtTime(0.03, now);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc2.connect(gain2); gain2.connect(this.ctx.destination);
          osc2.start(now); osc2.stop(now + 0.3);
        }
      } catch (_) {}

      this.step++;
    }
  };

  // --- PERSISTENT STORAGE (DEMİRCİ VE KALICI GELİŞTİRMELER) ---
  const FORGE_CONFIG = [
    { id: 'maxHp', name: 'Demir Beden', icon: '💖', desc: 'Maksimum Canı +25 artırır', maxRank: 10, baseCost: 100, costMult: 1.8, valPerRank: 25 },
    { id: 'baseDmg', name: 'Usta Kılıç', icon: '⚔️', desc: 'Tüm silahların hasarını %12 artırır', maxRank: 10, baseCost: 150, costMult: 1.8, valPerRank: 0.12 },
    { id: 'armor', name: 'Çelik Zırh', icon: '🛡️', desc: 'Alınan tüm hasarı %5 azaltır', maxRank: 8, baseCost: 120, costMult: 1.9, valPerRank: 0.05 },
    { id: 'speed', name: 'Yıldırım Çizmesi', icon: '⚡', desc: 'Hareket hızını %8 artırır', maxRank: 8, baseCost: 100, costMult: 1.7, valPerRank: 0.08 },
    { id: 'greed', name: 'Altın Avcısı', icon: '🪙', desc: 'Kazanılan altını %25 artırır', maxRank: 10, baseCost: 80, costMult: 1.6, valPerRank: 0.25 },
    { id: 'growth', name: 'Büyü Hırsı', icon: '🔮', desc: 'Kazanılan tecrübe puanını (XP) %20 artırır', maxRank: 10, baseCost: 100, costMult: 1.7, valPerRank: 0.20 },
    { id: 'revive', name: 'Zümrüt Diriliş', icon: '🔄', desc: 'Öldüğünde anında %50 canla dirilirsin', maxRank: 3, baseCost: 500, costMult: 3.0, valPerRank: 1 },
    { id: 'crit', name: 'Kritik Ustalığı', icon: '💥', desc: 'Kritik vuruş şansını %8 artırır', maxRank: 5, baseCost: 200, costMult: 2.2, valPerRank: 0.08 }
  ];

  function loadForge() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem('survivor_forge_upgrades') || '{}');
    } catch (_) {}
    FORGE_CONFIG.forEach(item => {
      if (typeof saved[item.id] !== 'number') saved[item.id] = 0;
    });
    return saved;
  }

  function saveForge(data) {
    localStorage.setItem('survivor_forge_upgrades', JSON.stringify(data));
  }

  let persistentGold = parseInt(localStorage.getItem('survivor_gold_balance') || '0', 10);
  let forgeRanks = loadForge();

  function saveGold() {
    localStorage.setItem('survivor_gold_balance', persistentGold.toString());
  }

  // --- UPGRADE POOL DEFINITIONS (LEVEL UP CARDS) ---
  const UPGRADE_POOL = [
    {
      id: 'swords',
      name: 'Döner Bıçaklar',
      icon: '🗡️',
      type: 'weapon',
      typeName: 'Silah',
      desc: 'Etrafında hızla dönen ve düşmanları biçen büyülü kılıçlar.',
      maxLvl: 7,
      getPreview: lvl => lvl === 0 ? 'Yeni Silah: 1 Dönen Kılıç' : `Kılıç Sayısı ve Hasar Artışı (+Seviye ${lvl + 1})`
    },
    {
      id: 'fireball',
      name: 'Ateş Topu',
      icon: '🔥',
      type: 'weapon',
      typeName: 'Silah',
      desc: 'En yakın yaratık kümesine patlayıcı alev fırlatır.',
      maxLvl: 7,
      getPreview: lvl => lvl === 0 ? 'Yeni Silah: Alev Patlaması' : `Daha çok alev & geniş patlama alanı`
    },
    {
      id: 'lightning',
      name: 'Gök Gürültüsü',
      icon: '⚡',
      type: 'weapon',
      typeName: 'Silah',
      desc: 'Gökyüzünden rastgele düşmanlara yüksek hasarlı şimşekler indirir.',
      maxLvl: 7,
      getPreview: lvl => lvl === 0 ? 'Yeni Silah: Yıldırım Çarpması' : `Daha sık yıldırım ve zincirleme vuruş`
    },
    {
      id: 'frostnova',
      name: 'Buz Halkası',
      icon: '❄️',
      type: 'magic',
      typeName: 'Büyü',
      desc: 'Periyodik olarak etraftaki tüm canavarları dondurup yavaşlatır.',
      maxLvl: 5,
      getPreview: lvl => lvl === 0 ? 'Yeni Büyü: Donma Dalgası' : `Genişleyen menzil ve ekstra buz hasarı`
    },
    {
      id: 'holyaura',
      name: 'Işık Halesi',
      icon: '✨',
      type: 'magic',
      typeName: 'Büyü',
      desc: 'Kahramanın çevresinde sürekli kutsal ışık hasarı verir.',
      maxLvl: 6,
      getPreview: lvl => lvl === 0 ? 'Yeni Büyü: Kutsal Çember' : `Büyüyen çember ve saniyede daha çok vuruş`
    },
    {
      id: 'magnet',
      name: 'Cevher Mıknatısı',
      icon: '🧲',
      type: 'passive',
      typeName: 'Pasif',
      desc: 'XP taşlarını ve altınları çok daha uzaktan otomatik çeker.',
      maxLvl: 5,
      getPreview: lvl => `Çekim Menzili +%50`
    },
    {
      id: 'swiftboots',
      name: 'Çeviklik Çizmeleri',
      icon: '👟',
      type: 'passive',
      typeName: 'Pasif',
      desc: 'Koşma ve manevra hızını kalıcı olarak artırır.',
      maxLvl: 5,
      getPreview: lvl => `Hareket Hızı +%15`
    },
    {
      id: 'vitality',
      name: 'Yenilenme İksiri',
      icon: '💖',
      type: 'passive',
      typeName: 'Pasif',
      desc: 'Zamanla kendi kendine canını yeniler.',
      maxLvl: 5,
      getPreview: lvl => `Saniyede +${lvl + 1} Can Yenilenmesi`
    },
    {
      id: 'might',
      name: 'Dev Gücü',
      icon: '💪',
      type: 'passive',
      typeName: 'Pasif',
      desc: 'Tüm silahların vurduğu taban hasarı doğrudan yükseltir.',
      maxLvl: 5,
      getPreview: lvl => `Tüm Hasarlar +%20`
    },
    {
      id: 'blackhole',
      name: 'Kozmik Kara Delik',
      icon: '🕳️',
      type: 'magic',
      typeName: 'Büyü',
      desc: 'Düşmanları içine çeken ve parçalayan yerçekimi girdabı açar.',
      maxLvl: 6,
      getPreview: lvl => lvl === 0 ? 'Yeni Büyü: Çekim Girdabı' : `Girdap Boyutu & Sürekli Hasar (+Seviye ${lvl + 1})`
    },
    {
      id: 'meteor',
      name: 'Kıyamet Göktaşı',
      icon: '☄️',
      type: 'weapon',
      typeName: 'Silah',
      desc: 'Gökyüzünden devasa yanan meteorlar düşürerek alanı yakar.',
      maxLvl: 6,
      getPreview: lvl => lvl === 0 ? 'Yeni Silah: Yanan Göktaşı' : `Ekstra Göktaşı & Patlama Alanı (+Seviye ${lvl + 1})`
    },
    {
      id: 'chaindaggers',
      name: 'Gölge Hançerleri',
      icon: '🗡️',
      type: 'weapon',
      typeName: 'Silah',
      desc: 'Düşmanlar arasında seken ve delen süper hızlı bıçaklar fırlatır.',
      maxLvl: 6,
      getPreview: lvl => lvl === 0 ? 'Yeni Silah: Seken Hançer' : `Daha çok hançer ve sekme sayısı (+Seviye ${lvl + 1})`
    },
    {
      id: 'toxiccloud',
      name: 'Zehirli Sis',
      icon: '🧪',
      type: 'magic',
      typeName: 'Büyü',
      desc: 'Kahramanın arkasında genişleyen ve temas edenleri eriten zehir bulutu bırakır.',
      maxLvl: 5,
      getPreview: lvl => lvl === 0 ? 'Yeni Büyü: Zehir Sis Dalgası' : `Bulut Yarıçapı & Zehir Hasarı Artışı (+Seviye ${lvl + 1})`
    },
    {
      id: 'scythe',
      name: 'Azrail Tırpanı',
      icon: '💀',
      type: 'weapon',
      typeName: 'Silah',
      desc: 'Düşman sürülerini biçip geçen devasa ruh tırpanı sallar.',
      maxLvl: 6,
      getPreview: lvl => lvl === 0 ? 'Yeni Silah: Geniş Biçme Tırpanı' : `Devasa Menzil & Kritik Biçme Hasarı (+Seviye ${lvl + 1})`
    },
    {
      id: 'shieldbubble',
      name: 'İlahi Bariyer',
      icon: '🛡️',
      type: 'passive',
      typeName: 'Kalkan',
      desc: 'Gelen hasarları emen ve kırıldığında patlayarak düşmanları iten koruyucu küre.',
      maxLvl: 5,
      getPreview: lvl => `Kalkan Kapasitesi +${(lvl + 1) * 75} HP`
    },
    {
      id: 'timestop',
      name: 'Zaman Bükücü',
      icon: '⏳',
      type: 'magic',
      typeName: 'Büyü',
      desc: 'Periyodik olarak zamanı dondurur; tüm düşmanlar 3 saniye hareketsiz kalır!',
      maxLvl: 5,
      getPreview: lvl => lvl === 0 ? 'Yeni Büyü: Zamanı Dondur' : `Daha sık zaman donması & +1s Süre`
    },
    {
      id: 'bloodvamp',
      name: 'Vampir Dişi',
      icon: '🩸',
      type: 'passive',
      typeName: 'Pasif',
      desc: 'Öldürdüğün düşmanların ruhunu emerek canını yenilemeni sağlar.',
      maxLvl: 5,
      getPreview: lvl => `Her 8 Öldürmede +${lvl + 2} Can Çalma`
    }
  ];

  // --- STAGES & CHAPTERS CONFIGURATION ---
  const STAGES = [
    {
      id: 1,
      name: 'Terk Edilmiş Mezarlık',
      sub: 'Zombi ve İskelet Ordusu',
      icon: '🪦',
      bossTime: 75,
      swarmTime: 50,
      boss: { name: 'Kemik Lordu (Giant Skeleton King)', hp: 2200, radius: 34, color: '#22c55e', speed: 1.8, gold: 750, type: 'skeleton_king' },
      theme: { bg: '#080e0a', tile: 'rgba(34, 197, 94, 0.05)', grid: 'rgba(34, 197, 94, 0.1)', particle: '#22c55e' },
      mult: { hp: 1.0, speed: 1.0, dmg: 1.0 },
      desc: 'Lanetli mezar taşları ve yürüyen iskeletler. Kemik Lordu intikam için bekliyor!'
    },
    {
      id: 2,
      name: 'Drakula Şatosu',
      sub: 'Kan Emici Yarasalar & Vampirler',
      icon: '🏰',
      bossTime: 95,
      swarmTime: 70,
      boss: { name: 'Vampir Kont Drakula', hp: 5500, radius: 38, color: '#dc2626', speed: 2.2, gold: 1500, type: 'dracula' },
      theme: { bg: '#120509', tile: 'rgba(220, 38, 38, 0.05)', grid: 'rgba(220, 38, 38, 0.12)', particle: '#dc2626' },
      mult: { hp: 1.45, speed: 1.15, dmg: 1.25 },
      desc: 'Gotik mermerler ve kırmızı şamdanlar. Kont Drakula kanına susadı!'
    },
    {
      id: 3,
      name: 'Cehennem Çukuru',
      sub: 'Ateş Zebanileri ve Lav Devleri',
      icon: '🌋',
      bossTime: 120,
      swarmTime: 95,
      boss: { name: 'Cehennem Zebanisi (Cerberus)', hp: 11000, radius: 42, color: '#ea580c', speed: 2.5, gold: 3000, type: 'cerberus' },
      theme: { bg: '#140803', tile: 'rgba(234, 88, 12, 0.06)', grid: 'rgba(234, 88, 12, 0.14)', particle: '#f97316' },
      mult: { hp: 2.1, speed: 1.3, dmg: 1.6 },
      desc: 'Kavurucu lav nehirleri ve cehennem alevleri. Üç başlı canavar Cerberus uyanıyor!'
    },
    {
      id: 4,
      name: 'Kadim Boşluk (Void)',
      sub: 'Kozmik Karanlık & Kadim Azrail',
      icon: '🌌',
      bossTime: 150,
      swarmTime: 125,
      boss: { name: 'Kadim Azrail (The Grim Reaper)', hp: 24000, radius: 48, color: '#7c3aed', speed: 2.8, gold: 8000, type: 'reaper' },
      theme: { bg: '#070513', tile: 'rgba(124, 58, 237, 0.06)', grid: 'rgba(124, 58, 237, 0.15)', particle: '#a855f7' },
      mult: { hp: 3.0, speed: 1.45, dmg: 2.0 },
      desc: 'Uzayın derinliklerindeki kozmik karanlık. Ölümün efendisi Kadim Azrail seni bekliyor!'
    }
  ];

  let unlockedStage = parseInt(localStorage.getItem('survivor_unlocked_stage') || '1', 10);

  function getCurrentStage() {
    return STAGES.find(s => s.id === state.currentStageId) || STAGES[0];
  }

  // --- GAME STATE ---
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const state = {
    running: false,
    paused: false,
    time: 0, // seconds
    kills: 0,
    goldEarned: 0,
    camera: { x: 0, y: 0 },
    keys: {},
    screenShake: 0,
    activeBoss: null,
    currentStageId: 1,
    stageCleared: false,
    swarmSpawned: false,
    bossSpawned: false,
    selectedCharId: 'antonio'
  };

  // 5 BALANCED VAMPIRE SURVIVORS HEROES
  const CHARACTERS = [
    {
      id: 'antonio',
      name: 'Antonio Belpaese',
      title: 'Kadim Kılıç Ustası',
      avatar: '🗡️',
      color: '#00e5ff',
      hpBonus: 25,
      speedBonus: 1.0,
      mightBonus: 0.15,
      startingWeapon: 'swords',
      extraSkills: { swords: 1 },
      desc: '+25 Can, +15% Fiziksel Hasar. Dönen kutsal kılıçlarla savaşa başlar.'
    },
    {
      id: 'imelda',
      name: 'Imelda Belpaese',
      title: 'Arkan Büyücüsü',
      avatar: '🪄',
      color: '#bf5af2',
      hpBonus: 0,
      speedBonus: 1.05,
      mightBonus: 0.1,
      startingWeapon: 'fireball',
      extraSkills: { fireball: 1, magnet: 1 },
      desc: '+30% XP Mıknatıs Alanı, +10% Büyü Hasarı. Patlayan alev toplarıyla başlar.'
    },
    {
      id: 'pasqualina',
      name: 'Pasqualina',
      title: 'Yıldırım Nişancısı',
      avatar: '⚡',
      color: '#ffd700',
      hpBonus: 10,
      speedBonus: 1.25,
      mightBonus: 0.05,
      startingWeapon: 'lightning',
      extraSkills: { lightning: 1, swiftboots: 1 },
      desc: '+25% Hareket Hızı, Seri Dash. Gök gürültüsü ve yıldırım çağırır.'
    },
    {
      id: 'gennaro',
      name: 'Gennaro Belpaese',
      title: 'Gölge Suikastçisi',
      avatar: '🗡️💨',
      color: '#ff3366',
      hpBonus: 15,
      speedBonus: 1.15,
      mightBonus: 0.20,
      startingWeapon: 'chaindaggers',
      extraSkills: { chaindaggers: 1, toxiccloud: 1 },
      desc: '+20% Kritik Güç, Ekstra Mermi. Seken hançerler ve zehir bulutu saçar.'
    },
    {
      id: 'arcanist',
      name: 'Kozmik Arcanist',
      title: 'Boyut Lordu',
      avatar: '🌌',
      color: '#00e676',
      hpBonus: 20,
      speedBonus: 1.0,
      mightBonus: 0.15,
      startingWeapon: 'blackhole',
      extraSkills: { blackhole: 1, holyaura: 1 },
      desc: '+40% Alan Büyüklüğü, Can Çalma. Kozmik karadelik ve kutsal ışık halkası yayar.'
    }
  ];

  // Player
  const player = {
    username: localStorage.getItem('portal_username') || 'Savaşçı',
    x: 0,
    y: 0,
    radius: 18,
    color: '#00e5ff',
    hp: 100,
    maxHp: 100,
    speed: 3.5,
    facing: 0, // radians
    dashCd: 0,
    dashDuration: 0,
    invulnTimer: 0,
    level: 1,
    xp: 0,
    xpNeeded: 10,
    revivesLeft: 0,
    skills: {
      swords: 1,
      fireball: 0,
      lightning: 0,
      frostnova: 0,
      holyaura: 0,
      magnet: 0,
      swiftboots: 0,
      vitality: 0,
      might: 0,
      blackhole: 0,
      meteor: 0,
      chaindaggers: 0,
      toxiccloud: 0,
      scythe: 0,
      shieldbubble: 0,
      timestop: 0,
      bloodvamp: 0
    },
    // Timers
    fireballTimer: 0,
    lightningTimer: 0,
    frostnovaTimer: 0,
    holyauraTimer: 0,
    regenTimer: 0,
    blackholeTimer: 0,
    meteorTimer: 0,
    chaindaggersTimer: 0,
    toxiccloudTimer: 0,
    scytheTimer: 0,
    timestopTimer: 0,
    shieldCurrentHp: 0,
    shieldBreakCooldown: 0,
    shieldRechargeDelay: 0,
    shieldBroken: false,
    activeWeaponSlot: 0,
    weaponCooldowns: [0, 0, 0, 0],
    weaponMaxCooldowns: [0.50, 0.35, 0.95, 2.6]
  };

  // Entities
  let enemies = [];
  let projectiles = [];
  let gems = [];
  let particles = [];
  let floatTexts = [];

  // --- DOM REFERENCES ---
  const hudLevel = document.getElementById('hud-level');
  const hudHp = document.getElementById('hud-hp');
  const hudGold = document.getElementById('hud-gold');
  const hudTimer = document.getElementById('hud-timer');
  const hudKills = document.getElementById('hud-kills');
  const xpBarFill = document.getElementById('xp-bar-fill');
  const skillsDock = document.getElementById('skills-dock');
  const bossBarWrap = document.getElementById('boss-bar-wrap');
  const bossName = document.getElementById('boss-name');
  const bossHpText = document.getElementById('boss-hp-text');
  const bossBarFill = document.getElementById('boss-bar-fill');

  const modalLevelup = document.getElementById('modal-levelup');
  const levelupCardsGrid = document.getElementById('levelup-cards-grid');
  const modalBlacksmith = document.getElementById('modal-blacksmith');
  const forgeItemsList = document.getElementById('forge-items-list');
  const forgeGoldDisplay = document.getElementById('forge-gold-display');
  const btnOpenForge = document.getElementById('btn-open-forge');
  const btnCloseForge = document.getElementById('btn-close-forge');
  const btnPauseGame = document.getElementById('btn-pause-game');

  const modalGameover = document.getElementById('modal-gameover');
  const gameoverTitle = document.getElementById('gameover-title');
  const gameoverSubtitle = document.getElementById('gameover-subtitle');
  const goStatTime = document.getElementById('go-stat-time');
  const goStatKills = document.getElementById('go-stat-kills');
  const goStatGold = document.getElementById('go-stat-gold');
  const goStatLevel = document.getElementById('go-stat-level');
  const btnGoRestart = document.getElementById('btn-go-restart');
  const btnGoForge = document.getElementById('btn-go-forge');

  // Stage & Dash DOM references
  const hudStageName = document.getElementById('hud-stage-name');
  const hudDashCd = document.getElementById('hud-dash-cd');
  const btnOpenStages = document.getElementById('btn-open-stages');
  const modalStages = document.getElementById('modal-stages');
  const stagesGrid = document.getElementById('stages-grid');
  const btnCloseStages = document.getElementById('btn-close-stages');
  const modalStageClear = document.getElementById('modal-stage-clear');
  const scDesc = document.getElementById('sc-desc');
  const btnScNext = document.getElementById('btn-sc-next');
  const btnScContinue = document.getElementById('btn-sc-continue');
  const swarmWarning = document.getElementById('swarm-warning');

  function renderStagesModal() {
    if (!stagesGrid) return;
    stagesGrid.innerHTML = '';
    STAGES.forEach(s => {
      const isUnlocked = s.id <= unlockedStage;
      const isSelected = s.id === state.currentStageId;
      const card = document.createElement('div');
      card.className = `stage-card ${isSelected ? 'stage-active' : ''} ${!isUnlocked ? 'stage-locked' : ''}`;
      card.innerHTML = `
        <div class="stage-card-icon">${s.icon}</div>
        <div class="stage-card-info">
          <div class="stage-card-title">${s.name}</div>
          <div class="stage-card-sub">${s.sub}</div>
          <div class="stage-card-desc">${s.desc}</div>
          <div class="stage-card-boss">👑 Boss: <strong>${s.boss.name}</strong> (${s.bossTime}sn)</div>
        </div>
        <div class="stage-card-badge">
          ${isSelected ? 'SEÇİLİ' : (isUnlocked ? 'OYNA' : '🔒 KİLİTLİ')}
        </div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          closeStagesModal();
          startRun(s.id);
        });
      }
      stagesGrid.appendChild(card);
    });
  }

  function openStagesModal() {
    renderStagesModal();
    if (modalStages) modalStages.style.display = 'flex';
    if (state.running) state.paused = true;
  }

  function closeStagesModal() {
    if (modalStages) modalStages.style.display = 'none';
    if (state.running) state.paused = false;
  }

  // Input Listeners & Mouse Tracking
  let mouseWorldX = 0, mouseWorldY = 0, isMouseDown = false;

  window.addEventListener('mousemove', e => {
    mouseWorldX = e.clientX + camera.x;
    mouseWorldY = e.clientY + camera.y;
  });

  window.addEventListener('mousedown', e => {
    if (e.button === 0) {
      isMouseDown = true;
      triggerActiveWeapon();
    }
  });

  window.addEventListener('mouseup', e => {
    if (e.button === 0) isMouseDown = false;
  });

  function switchWeapon(slot) {
    if (slot < 0 || slot > 3) return;
    player.activeWeaponSlot = slot;
    document.querySelectorAll('.hotbar-slot').forEach(s => s.classList.remove('active'));
    document.getElementById('slot-' + slot)?.classList.add('active');
    Sfx.slash();
    const names = ['Kutsal Kılıç ⚔️', 'Sihir Asası 🪄', 'Cehennem Alevi 🔥', 'Kozmik Karadelik 🌌'];
    addFloatText(player.x, player.y - 45, names[slot], '#ffd700', 16);
  }

  document.querySelectorAll('.hotbar-slot').forEach(slotEl => {
    slotEl.addEventListener('click', () => {
      const idx = parseInt(slotEl.dataset.slot);
      switchWeapon(idx);
    });
  });

  window.addEventListener('wheel', e => {
    if (e.deltaY > 0) {
      switchWeapon((player.activeWeaponSlot + 1) % 4);
    } else if (e.deltaY < 0) {
      switchWeapon((player.activeWeaponSlot - 1 + 4) % 4);
    }
  }, { passive: true });

  window.addEventListener('keydown', e => {
    // 1. If stage clear victory modal is active, 1/Enter advances, 2 continues endless
    if (modalStageClear && (modalStageClear.classList.contains('active') || modalStageClear.style.display === 'flex')) {
      if (e.key === '1' || e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (btnScNext && btnScNext.style.display !== 'none') {
          btnScNext.click();
        } else if (btnScContinue) {
          btnScContinue.click();
        }
        return;
      }
      if (e.key === '2' && btnScContinue) {
        e.preventDefault();
        btnScContinue.click();
        return;
      }
    }

    // 2. If level-up modal is active, keys 1, 2, 3 immediately select cards
    if (modalLevelup && modalLevelup.classList.contains('active') && modalLevelup.style.display !== 'none') {
      const cards = levelupCardsGrid ? levelupCardsGrid.children : [];
      if (e.key === '1' && cards[0]) {
        e.preventDefault();
        cards[0].click();
        return;
      }
      if (e.key === '2' && cards[1]) {
        e.preventDefault();
        cards[1].click();
        return;
      }
      if (e.key === '3' && cards[2]) {
        e.preventDefault();
        cards[2].click();
        return;
      }
    }

    // If game over modal is active, Enter, Space or R restarts
    if (modalGameover && modalGameover.classList.contains('active')) {
      if (e.key === 'Enter' || e.code === 'Space' || e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (btnGoRestart) btnGoRestart.click();
        return;
      }
    }

    state.keys[e.key.toLowerCase()] = true;
    if (e.code === 'Space' || e.key === ' ') {
      tryDash();
    } else if (e.key === '1') {
      switchWeapon(0);
    } else if (e.key === '2') {
      switchWeapon(1);
    } else if (e.key === '3') {
      switchWeapon(2);
    } else if (e.key === '4') {
      switchWeapon(3);
    } else if (e.key.toLowerCase() === 'q') {
      switchWeapon((player.activeWeaponSlot - 1 + 4) % 4);
    } else if (e.key.toLowerCase() === 'e') {
      switchWeapon((player.activeWeaponSlot + 1) % 4);
    }
  });

  window.addEventListener('keyup', e => {
    state.keys[e.key.toLowerCase()] = false;
  });

  function triggerActiveWeapon() {
    if (!state.running || state.paused || player.hp <= 0) return;
    const slot = player.activeWeaponSlot;
    if (player.weaponCooldowns[slot] > 0) return;

    player.weaponCooldowns[slot] = player.weaponMaxCooldowns[slot];
    const forgeDmgCfg = FORGE_CONFIG.find(c => c.id === 'baseDmg');
    const baseDmgMult = (1 + (forgeRanks.baseDmg * (forgeDmgCfg ? forgeDmgCfg.valPerRank : 0.1))) * (1 + (player.skills.might || 0) * 0.2);

    let targetX = mouseWorldX;
    let targetY = mouseWorldY;
    if (targetX === 0 && targetY === 0) {
      const nearest = getNearestEnemy();
      targetX = nearest ? nearest.x : player.x + (player.facingRight ? 200 : -200);
      targetY = nearest ? nearest.y : player.y;
    }

    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    if (slot === 0) {
      // 1. KUTSAL KILIÇ: Wide golden sweeping crescent
      Sfx.slash();
      state.screenShake = 4;
      projectiles.push({
        type: 'holy_slash',
        x: player.x + dirX * 30,
        y: player.y + dirY * 30,
        vx: dirX * 11,
        vy: dirY * 11,
        radius: 36,
        dmg: Math.round(95 * baseDmgMult),
        life: 22,
        maxLife: 22,
        pierce: 99,
        color: '#ffd700',
        angle: Math.atan2(dirY, dirX)
      });
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: player.x + dirX * 30 + (Math.random() - 0.5) * 20,
          y: player.y + dirY * 30 + (Math.random() - 0.5) * 20,
          vx: dirX * 6 + (Math.random() - 0.5) * 4,
          vy: dirY * 6 + (Math.random() - 0.5) * 4,
          life: 15,
          color: '#ffd700',
          size: 4
        });
      }
    } else if (slot === 1) {
      // 2. SİHİR ASASI: 3 rapid homing arcane bolts
      Sfx.magic();
      for (let i = -1; i <= 1; i++) {
        const spreadAngle = Math.atan2(dirY, dirX) + i * 0.22;
        projectiles.push({
          type: 'arcane_bolt',
          x: player.x,
          y: player.y,
          vx: Math.cos(spreadAngle) * 14,
          vy: Math.sin(spreadAngle) * 14,
          radius: 10,
          dmg: Math.round(52 * baseDmgMult),
          life: 55,
          maxLife: 55,
          pierce: 1,
          color: '#00e5ff',
          homing: true
        });
      }
    } else if (slot === 2) {
      // 3. CEHENNEM ATEŞİ: High-damage exploding fire projectile
      Sfx.fire();
      state.screenShake = 6;
      projectiles.push({
        type: 'inferno_bomb',
        x: player.x,
        y: player.y,
        vx: dirX * 10,
        vy: dirY * 10,
        radius: 16,
        dmg: Math.round(140 * baseDmgMult),
        life: 35,
        maxLife: 35,
        pierce: 1,
        color: '#ff3d00',
        splashRadius: 90
      });
    } else if (slot === 3) {
      // 4. KOZMİK KARADELİK: Pulls in and crushes enemies
      Sfx.bossAlarm();
      state.screenShake = 9;
      projectiles.push({
        type: 'cosmic_vortex',
        x: player.x + dirX * 40,
        y: player.y + dirY * 40,
        vx: dirX * 3.5,
        vy: dirY * 3.5,
        radius: 40,
        dmg: Math.round(65 * baseDmgMult),
        life: 180,
        maxLife: 180,
        pierce: 999,
        color: '#a855f7',
        pullRadius: 220
      });
    }
  }

  function tryDash() {
    if (player.dashCd <= 0 && state.running && !state.paused) {
      player.dashDuration = 10;
      player.dashCd = 90; // 1.5 seconds at 60fps
      Sfx.slash();
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: player.x,
          y: player.y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 20,
          color: '#00e5ff',
          size: 4
        });
      }
    }
  }

  // --- INITIALIZE RUN ---
  function startRun(stageId) {
    if (stageId && typeof stageId === 'number') {
      state.currentStageId = stageId;
    }
    state.running = true;
    state.paused = false;
    state.time = 0;
    state.kills = 0;
    state.goldEarned = 0;
    state.activeBoss = null;
    state.stageCleared = false;
    state.swarmSpawned = false;
    state.bossSpawned = false;
    bossBarWrap.style.display = 'none';

    if (modalStageClear) {
      modalStageClear.classList.remove('active');
      modalStageClear.style.display = 'none';
    }
    if (modalStages) modalStages.style.display = 'none';
    if (swarmWarning) swarmWarning.style.display = 'none';

    const curStage = getCurrentStage();
    if (hudStageName) hudStageName.textContent = `Aşama ${curStage.id}: ${curStage.name}`;

    // Calculate stats from forge upgrades & active character
    const activeChar = CHARACTERS.find(c => c.id === state.selectedCharId) || CHARACTERS[0];
    const hpBonus = forgeRanks.maxHp * FORGE_CONFIG.find(c => c.id === 'maxHp').valPerRank;
    const speedBonus = 1 + (forgeRanks.speed * FORGE_CONFIG.find(c => c.id === 'speed').valPerRank);
    const reviveCount = forgeRanks.revive;

    player.x = 0;
    player.y = 0;
    player.color = activeChar.color || '#00e5ff';
    player.maxHp = 100 + hpBonus + (activeChar.hpBonus || 0);
    player.hp = player.maxHp;
    player.speed = 3.6 * speedBonus * (activeChar.speedBonus || 1.0);
    player.level = 1;
    player.xp = 0;
    player.xpNeeded = 10;
    player.revivesLeft = reviveCount;
    player.dashCd = 0;
    player.dashDuration = 0;
    player.invulnTimer = 0;

    // Reset in-run skills & assign character starter weapons
    for (const key of Object.keys(player.skills)) {
      player.skills[key] = 0;
    }
    if (activeChar.extraSkills) {
      for (const [k, v] of Object.entries(activeChar.extraSkills)) {
        player.skills[k] = v;
      }
    } else {
      player.skills.swords = 1;
    }

    enemies = [];
    projectiles = [];
    gems = [];
    particles = [];
    floatTexts = [];

    updateSkillsDock();
    updateHUD();

    modalGameover.classList.remove('active');
    modalLevelup.classList.remove('active');
    modalBlacksmith.classList.remove('active');
    const mcs = document.getElementById('modal-char-select');
    if (mcs) {
      mcs.classList.remove('active');
      mcs.style.display = 'none';
    }
  }

  // --- SPAWNING SYSTEM (WAVES & PROGRESSION) ---
  const MAX_ENEMIES = 130;
  let spawnTimer = 0;
  function updateSpawning() {
    if (enemies.length >= MAX_ENEMIES) return; // Anti-freeze: prevents enemy overpopulation
    spawnTimer++;
    // Spawn rate increases over time
    const interval = Math.max(14, Math.floor(55 - Math.min(42, state.time / 7)));

    if (spawnTimer >= interval) {
      spawnTimer = 0;
      const count = 1 + Math.floor(state.time / 50);
      for (let i = 0; i < count; i++) {
        spawnRegularEnemy();
      }
    }

    const curStage = getCurrentStage();

    // Swarm alert & wave
    if (state.time >= curStage.swarmTime && !state.swarmSpawned) {
      state.swarmSpawned = true;
      triggerSwarmWave();
    }

    // Boss spawn
    if (state.time >= curStage.bossTime && !state.bossSpawned) {
      state.bossSpawned = true;
      spawnBoss(
        curStage.boss.name,
        curStage.boss.hp,
        curStage.boss.radius,
        curStage.boss.color,
        curStage.boss.speed,
        curStage.boss.gold,
        curStage.boss.type
      );
    }
  }

  function triggerSwarmWave() {
    Sfx.warning();
    state.screenShake = 18;
    if (swarmWarning) {
      swarmWarning.innerHTML = '⚠️ KANLI AY DOĞUYOR! CANAVAR SÜRÜSÜ HÜCUM EDİYOR! ⚠️';
      swarmWarning.style.display = 'block';
      setTimeout(() => {
        if (swarmWarning) swarmWarning.style.display = 'none';
      }, 4500);
    }

    const curStage = getCurrentStage();
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const dist = Math.max(width, height) * 0.65 + (i % 3) * 50;
      const x = player.x + Math.cos(angle) * dist;
      const y = player.y + Math.sin(angle) * dist;
      enemies.push({
        x, y,
        type: 'bat',
        hp: Math.round(15 * curStage.mult.hp),
        maxHp: Math.round(15 * curStage.mult.hp),
        speed: 2.8 * curStage.mult.speed,
        radius: 13,
        color: '#f43f5e',
        xpVal: 2,
        goldChance: 0.35,
        dmg: Math.round(6 * curStage.mult.dmg),
        hitFlash: 0
      });
    }
  }

  function spawnRegularEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(width, height) * 0.65 + Math.random() * 100;
    const x = player.x + Math.cos(angle) * dist;
    const y = player.y + Math.sin(angle) * dist;

    // Rich enemy types based on elapsed time (Yarasalar dengelendi: yavaş ve eğlenceli)
    let type = 'bat';
    let hp = 10 + Math.floor(state.time * 0.4);
    let speed = 1.7; // Yarasalar yavaşlatıldı (eskiden 3.6 idi)
    let radius = 12;
    let color = '#a855f7';
    let xpVal = 1;
    let goldChance = 0.2;
    let dmg = 3;

    const r = Math.random();
    if (state.time > 40 && r < 0.25) {
      type = 'zombie';
      hp = 30 + Math.floor(state.time * 0.7);
      speed = 1.8;
      radius = 15;
      color = '#15803d';
      xpVal = 2;
      goldChance = 0.3;
      dmg = 10;
    } else if (state.time > 80 && r < 0.5) {
      type = 'skeleton';
      hp = 50 + Math.floor(state.time * 0.9);
      speed = 2.1;
      radius = 16;
      color = '#e2e8f0';
      xpVal = 4;
      goldChance = 0.45;
      dmg = 15;
    } else if (state.time > 140 && r < 0.7) {
      type = 'phantom';
      hp = 70 + Math.floor(state.time * 1.1);
      speed = 2.6;
      radius = 17;
      color = '#38bdf8';
      xpVal = 6;
      goldChance = 0.55;
      dmg = 18;
    } else if (state.time > 200 && r < 0.85) {
      type = 'hellhound';
      hp = 110 + Math.floor(state.time * 1.3);
      speed = 3.2;
      radius = 19;
      color = '#ef4444';
      xpVal = 8;
      goldChance = 0.65;
      dmg = 24;
    } else if (state.time > 260) {
      type = 'golem';
      hp = 220 + Math.floor(state.time * 1.8);
      speed = 1.4;
      radius = 24;
      color = '#475569';
      xpVal = 14;
      goldChance = 0.8;
      dmg = 32;
    }

    const curStage = getCurrentStage();
    const mult = curStage.mult;

    // Apply stage multipliers
    hp = Math.round(hp * mult.hp);
    speed = Number((speed * mult.speed).toFixed(2));
    dmg = Math.round(dmg * mult.dmg);

    enemies.push({
      x, y,
      type,
      hp,
      maxHp: hp,
      speed,
      radius,
      color,
      xpVal,
      goldChance,
      dmg,
      hitFlash: 0
    });
  }

  function spawnBoss(name, hp, radius, color, speed, goldVal, bossType = 'skeleton_king') {
    Sfx.bossAlarm();
    state.screenShake = 22;

    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(width, height) * 0.6;
    const x = player.x + Math.cos(angle) * dist;
    const y = player.y + Math.sin(angle) * dist;

    const boss = {
      isBoss: true,
      bossType,
      name,
      x, y,
      hp,
      maxHp: hp,
      radius,
      color,
      speed,
      goldVal,
      xpVal: 150,
      dmg: 35,
      hitFlash: 0,
      specialTimer: 0
    };

    enemies.push(boss);
    state.activeBoss = boss;

    bossBarWrap.style.display = 'flex';
    bossName.textContent = `👑 ${name.toUpperCase()}`;
    bossHpText.textContent = `${hp} / ${hp}`;
    bossBarFill.style.width = '100%';

    addFloatText(player.x, player.y - 40, `⚠️ BOSS ÇIKTI: ${name}!`, '#ff1744', 24);
  }

  // --- WEAPONS AND SPELLS ENGINE ---
  function updatePlayerSkills() {
    const baseDmgMult = (1 + (forgeRanks.baseDmg * FORGE_CONFIG.find(c => c.id === 'baseDmg').valPerRank)) * (1 + player.skills.might * 0.2);

    // 1. Döner Bıçaklar (Swords)
    // Handled in render/collision via continuous rotation

    // 2. Ateş Topu (Fireball)
    if (player.skills.fireball > 0) {
      player.fireballTimer++;
      const cd = Math.max(30, 90 - player.skills.fireball * 8);
      if (player.fireballTimer >= cd) {
        player.fireballTimer = 0;
        shootFireballs(baseDmgMult);
      }
    }

    // 3. Gök Gürültüsü (Lightning)
    if (player.skills.lightning > 0) {
      player.lightningTimer++;
      const cd = Math.max(40, 110 - player.skills.lightning * 10);
      if (player.lightningTimer >= cd) {
        player.lightningTimer = 0;
        castLightning(baseDmgMult);
      }
    }

    // 4. Buz Halkası (Frost Nova)
    if (player.skills.frostnova > 0) {
      player.frostnovaTimer++;
      const cd = Math.max(90, 200 - player.skills.frostnova * 18);
      if (player.frostnovaTimer >= cd) {
        player.frostnovaTimer = 0;
        castFrostNova(baseDmgMult);
      }
    }

    // 5. Işık Halesi (Holy Aura)
    if (player.skills.holyaura > 0) {
      player.holyauraTimer++;
      if (player.holyauraTimer >= 20) {
        player.holyauraTimer = 0;
        pulseHolyAura(baseDmgMult);
      }
    }

    // 6. Pasif Can Yenilenmesi (Vitality)
    if (player.skills.vitality > 0) {
      player.regenTimer++;
      if (player.regenTimer >= 60) { // Every 1s
        player.regenTimer = 0;
        if (player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + player.skills.vitality);
          updateHUD();
        }
      }
    }

    // 7. Kozmik Kara Delik
    if (player.skills.blackhole > 0) {
      player.blackholeTimer++;
      const cd = Math.max(70, 180 - player.skills.blackhole * 16);
      if (player.blackholeTimer >= cd) {
        player.blackholeTimer = 0;
        castBlackHole(baseDmgMult);
      }
    }

    // 8. Kıyamet Göktaşı
    if (player.skills.meteor > 0) {
      player.meteorTimer++;
      const cd = Math.max(50, 140 - player.skills.meteor * 14);
      if (player.meteorTimer >= cd) {
        player.meteorTimer = 0;
        castMeteorStorm(baseDmgMult);
      }
    }

    // 9. Gölge Hançerleri
    if (player.skills.chaindaggers > 0) {
      player.chaindaggersTimer++;
      const cd = Math.max(16, 50 - player.skills.chaindaggers * 5);
      if (player.chaindaggersTimer >= cd) {
        player.chaindaggersTimer = 0;
        throwChainDaggers(baseDmgMult);
      }
    }

    // 10. Zehirli Sis
    if (player.skills.toxiccloud > 0) {
      player.toxiccloudTimer++;
      if (player.toxiccloudTimer >= 35) {
        player.toxiccloudTimer = 0;
        spawnToxicCloud(baseDmgMult);
      }
    }

    // 11. Azrail Tırpanı
    if (player.skills.scythe > 0) {
      player.scytheTimer++;
      const cd = Math.max(45, 120 - player.skills.scythe * 12);
      if (player.scytheTimer >= cd) {
        player.scytheTimer = 0;
        swingDeathScythe(baseDmgMult);
      }
    }

    // 12. Zaman Bükücü
    if (player.skills.timestop > 0) {
      player.timestopTimer++;
      const cd = Math.max(300, 600 - player.skills.timestop * 45);
      if (player.timestopTimer >= cd) {
        player.timestopTimer = 0;
        triggerTimeStop();
      }
    }

    // 13. İlahi Kalkan Şarjı & Kırılma Mekaniği (Shield Fix)
    if (player.skills.shieldbubble > 0) {
      const maxShield = player.skills.shieldbubble * 75;
      if (player.shieldBreakCooldown > 0) {
        player.shieldBreakCooldown -= 1 / 60;
        if (player.shieldBreakCooldown <= 0) {
          player.shieldBreakCooldown = 0;
          player.shieldBroken = false;
          player.shieldCurrentHp = Math.round(maxShield * 0.3);
          addFloatText(player.x, player.y - 35, '🛡️ KALKAN YENİDEN OLUŞTU!', '#00e676', 16);
          try { Sfx.magic(); } catch (_) {}
        }
      } else if (player.shieldRechargeDelay > 0) {
        player.shieldRechargeDelay -= 1 / 60;
      } else if (player.shieldCurrentHp < maxShield) {
        player.shieldCurrentHp = Math.min(maxShield, player.shieldCurrentHp + (15 / 60));
      }
    }

    // 14. Aktif Silah Cooldown Güncellemesi & Otomatik Ateş
    for (let s = 0; s < 4; s++) {
      if (player.weaponCooldowns[s] > 0) {
        player.weaponCooldowns[s] -= 1 / 60;
        const cdElem = document.getElementById('slot-cd-' + s);
        if (cdElem) {
          const pct = Math.max(0, (player.weaponCooldowns[s] / player.weaponMaxCooldowns[s]) * 100);
          cdElem.style.height = `${pct}%`;
        }
      } else {
        const cdElem = document.getElementById('slot-cd-' + s);
        if (cdElem) cdElem.style.height = '0%';
      }
    }

    // Otomatik aktif silah atışı
    if (player.weaponCooldowns[player.activeWeaponSlot] <= 0 && enemies.length > 0) {
      triggerActiveWeapon();
    }
  }

  function shootFireballs(dmgMult) {
    if (enemies.length === 0) return;
    const isEvolved = player.skills.fireball >= 7;
    // Find closest enemies
    const sorted = [...enemies].sort((a, b) => {
      const d1 = (a.x - player.x)**2 + (a.y - player.y)**2;
      const d2 = (b.x - player.x)**2 + (b.y - player.y)**2;
      return d1 - d2;
    });

    const count = isEvolved ? 4 : (1 + Math.floor(player.skills.fireball / 2));
    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      const target = sorted[i];
      const angle = Math.atan2(target.y - player.y, target.x - player.x);
      projectiles.push({
        type: 'fireball',
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * (isEvolved ? 8.5 : 7),
        vy: Math.sin(angle) * (isEvolved ? 8.5 : 7),
        radius: isEvolved ? 22 : (12 + player.skills.fireball * 2),
        damage: Math.round((isEvolved ? 180 : (28 + player.skills.fireball * 14)) * dmgMult),
        splashRadius: isEvolved ? 150 : (60 + player.skills.fireball * 15),
        life: 120,
        color: isEvolved ? '#ff0055' : '#ff3d00'
      });
    }
    if (isEvolved) state.screenShake = 6;
    Sfx.fireball();
  }

  function castLightning(dmgMult) {
    if (enemies.length === 0) return;
    const isEvolved = player.skills.lightning >= 7;
    const strikes = isEvolved ? (4 + player.skills.lightning) : (1 + player.skills.lightning);
    const targets = [];
    for (let i = 0; i < strikes; i++) {
      const e = enemies[Math.floor(Math.random() * enemies.length)];
      if (e && !targets.includes(e)) targets.push(e);
    }

    targets.forEach(t => {
      const dmg = Math.round((isEvolved ? 120 : (45 + player.skills.lightning * 20)) * dmgMult);
      damageEnemy(t, dmg, true);
      Sfx.lightning();
      // Lightning bolt visual effect
      particles.push({
        type: 'lightning_strike',
        x: t.x,
        y: t.y,
        life: 14,
        color: isEvolved ? '#e0e7ff' : '#00e5ff'
      });
    });
    if (isEvolved) state.screenShake = 7;
  }

  function castFrostNova(dmgMult) {
    const isEvolved = player.skills.frostnova >= 5;
    const range = isEvolved ? 550 : (140 + player.skills.frostnova * 25);
    const dmg = Math.round((isEvolved ? 85 : (20 + player.skills.frostnova * 10)) * dmgMult);
    Sfx.playTone(600, 'sine', 0.2, 0.1);

    enemies.forEach(e => {
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist <= range) {
        damageEnemy(e, dmg, false);
        const originalSpeed = e.speed;
        e.speed = isEvolved ? 0 : (e.speed * 0.4);
        setTimeout(() => {
          if (e) e.speed = originalSpeed;
        }, isEvolved ? 2500 : 2000);
      }
    });

    particles.push({
      type: 'frost_ring',
      x: player.x,
      y: player.y,
      radius: 10,
      maxRadius: range,
      life: isEvolved ? 30 : 20
    });
    if (isEvolved) state.screenShake = 6;
  }

  function pulseHolyAura(dmgMult) {
    const isEvolved = player.skills.holyaura >= 6;
    const range = isEvolved ? 180 : (80 + player.skills.holyaura * 18);
    const dmg = Math.round((isEvolved ? 42 : (8 + player.skills.holyaura * 4)) * dmgMult);

    if (isEvolved && player.hp < player.maxHp && Math.random() < 0.25) {
      player.hp = Math.min(player.maxHp, player.hp + 2);
      updateHUD();
    }

    enemies.forEach(e => {
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist <= range) {
        damageEnemy(e, dmg, false);
      }
    });
  }

  function castBlackHole(dmgMult) {
    if (enemies.length === 0) return;
    const isEvolved = player.skills.blackhole >= 6;
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    const bx = target.x + (Math.random() - 0.5) * 60;
    const by = target.y + (Math.random() - 0.5) * 60;
    const pullRadius = isEvolved ? 350 : (160 + player.skills.blackhole * 25);
    const dmg = Math.round((isEvolved ? 35 : (12 + player.skills.blackhole * 4)) * dmgMult);

    projectiles.push({
      type: 'blackhole',
      x: bx,
      y: by,
      vx: 0,
      vy: 0,
      radius: isEvolved ? 36 : (20 + player.skills.blackhole * 2),
      pullRadius,
      damage: dmg,
      splashRadius: pullRadius,
      life: isEvolved ? 180 : 120,
      color: isEvolved ? '#7c4dff' : '#651fff'
    });
    Sfx.playTone(80, 'sawtooth', 0.4, 0.15);
  }

  function castMeteorStorm(dmgMult) {
    if (enemies.length === 0) return;
    const isEvolved = player.skills.meteor >= 6;
    const count = isEvolved ? (4 + player.skills.meteor) : (1 + Math.floor(player.skills.meteor / 2));
    for (let i = 0; i < count; i++) {
      const target = enemies[Math.floor(Math.random() * enemies.length)];
      if (!target) continue;
      setTimeout(() => {
        const mx = target.x + (Math.random() - 0.5) * 100;
        const my = target.y + (Math.random() - 0.5) * 100;
        projectiles.push({
          type: 'meteor',
          x: mx - 80,
          y: my - 300,
          vx: 4,
          vy: 14,
          radius: isEvolved ? 32 : (18 + player.skills.meteor * 2),
          damage: Math.round((isEvolved ? 220 : (60 + player.skills.meteor * 25)) * dmgMult),
          splashRadius: isEvolved ? 200 : (90 + player.skills.meteor * 18),
          life: 30,
          color: isEvolved ? '#ff1744' : '#ff9100'
        });
        Sfx.playTone(120, 'square', 0.25, 0.2);
      }, i * 150);
    }
    state.screenShake = 8;
  }

  function throwChainDaggers(dmgMult) {
    if (enemies.length === 0) return;
    const isEvolved = player.skills.chaindaggers >= 6;
    const count = isEvolved ? 8 : (2 + player.skills.chaindaggers);
    const sorted = [...enemies].sort((a, b) => {
      const d1 = (a.x - player.x)**2 + (a.y - player.y)**2;
      const d2 = (b.x - player.x)**2 + (b.y - player.y)**2;
      return d1 - d2;
    });

    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      const target = sorted[i];
      const angle = Math.atan2(target.y - player.y, target.x - player.x) + (Math.random() - 0.5) * 0.2;
      projectiles.push({
        type: 'chaindagger',
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * (isEvolved ? 15 : 12),
        vy: Math.sin(angle) * (isEvolved ? 15 : 12),
        radius: isEvolved ? 14 : 9,
        damage: Math.round((isEvolved ? 90 : (24 + player.skills.chaindaggers * 10)) * dmgMult),
        splashRadius: 35,
        pierce: isEvolved ? 5 : 2,
        life: 55,
        color: isEvolved ? '#00e5ff' : '#e040fb'
      });
    }
    Sfx.slash();
  }

  function spawnToxicCloud(dmgMult) {
    const isEvolved = player.skills.toxiccloud >= 5;
    const radius = isEvolved ? 160 : (60 + player.skills.toxiccloud * 18);
    const dmg = Math.round((isEvolved ? 45 : (12 + player.skills.toxiccloud * 6)) * dmgMult);
    projectiles.push({
      type: 'toxiccloud',
      x: player.x + (Math.random() - 0.5) * 20,
      y: player.y + (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
      radius,
      damage: dmg,
      splashRadius: radius,
      life: isEvolved ? 160 : 100,
      color: '#00e676'
    });
  }

  function swingDeathScythe(dmgMult) {
    const isEvolved = player.skills.scythe >= 6;
    const count = isEvolved ? 4 : 2;
    const baseAngle = performance.now() / 200;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i * Math.PI * 2 / count);
      projectiles.push({
        type: 'scythe',
        x: player.x,
        y: player.y,
        angle,
        distance: 20,
        maxDist: isEvolved ? 320 : (160 + player.skills.scythe * 22),
        damage: Math.round((isEvolved ? 160 : (45 + player.skills.scythe * 18)) * dmgMult),
        splashRadius: isEvolved ? 70 : 45,
        radius: 24,
        life: isEvolved ? 60 : 45,
        color: isEvolved ? '#d500f9' : '#ffffff'
      });
    }
    Sfx.slash();
    state.screenShake = 5;
  }

  function triggerTimeStop() {
    addFloatText(player.x, player.y - 40, '⏳ ZAMAN DURDU!', '#00e5ff', 24);
    Sfx.playTone(900, 'sine', 0.4, 0.2);
    enemies.forEach(e => {
      const origSpeed = e.speed;
      e.speed = 0;
      setTimeout(() => {
        if (e) e.speed = origSpeed;
      }, 3000);
    });
    for (let i = 0; i < 25; i++) {
      particles.push({
        x: player.x + (Math.random() - 0.5) * 400,
        y: player.y + (Math.random() - 0.5) * 400,
        vx: 0, vy: -1,
        life: 40,
        color: '#00e5ff',
        size: 5
      });
    }
  }

  // --- DAMAGE & ENEMY DEATH ---
  function damageEnemy(e, dmg, isCrit = false) {
    e.hp -= dmg;
    e.hitFlash = 6;

    // Crit calculation
    const critBonus = forgeRanks.crit * FORGE_CONFIG.find(c => c.id === 'crit').valPerRank;
    if (!isCrit && Math.random() < critBonus) {
      dmg = Math.round(dmg * 1.8);
      isCrit = true;
    }

    addFloatText(e.x, e.y - 10, dmg.toString(), isCrit ? '#ffd54f' : '#ffffff', isCrit ? 20 : 14);

    if (e.hp <= 0) {
      killEnemy(e);
    }
  }

  function killEnemy(e) {
    const idx = enemies.indexOf(e);
    if (idx !== -1) enemies.splice(idx, 1);

    state.kills++;
    Sfx.gem();

    // Vampirizm: Belirli öldürmelerde can yenileme
    if (player.skills.bloodvamp > 0 && state.kills % 8 === 0) {
      const heal = player.skills.bloodvamp * 4;
      if (player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + heal);
        addFloatText(player.x, player.y - 30, `+${heal} HP 🩸`, '#ff1744', 18);
        updateHUD();
      }
    }

    // Spawn XP Gem
    const xpBonus = 1 + (forgeRanks.growth * FORGE_CONFIG.find(c => c.id === 'growth').valPerRank);
    gems.push({
      x: e.x,
      y: e.y,
      val: Math.round(e.xpVal * xpBonus),
      color: e.xpVal >= 25 ? '#ffd54f' : (e.xpVal >= 5 ? '#00e676' : '#00b0ff'),
      radius: e.xpVal >= 25 ? 7 : 5
    });

    // Gold drop
    const greedBonus = 1 + (forgeRanks.greed * FORGE_CONFIG.find(c => c.id === 'greed').valPerRank);
    if (e.isBoss) {
      const curStage = getCurrentStage();
      const bossBonusGold = (curStage && curStage.boss && curStage.boss.gold) ? curStage.boss.gold : 1000;
      const g = Math.round(((e.goldVal || 500) + bossBonusGold) * greedBonus);
      state.goldEarned += g;
      persistentGold += g;
      saveGold();
      addFloatText(e.x, e.y - 30, `+${g} 🪙 BÖLÜM ZAFERİ!`, '#ffd54f', 28);
      try { Sfx.victory(); } catch (_) {}
      state.screenShake = 28;
      if (bossBarWrap) bossBarWrap.style.display = 'none';
      state.activeBoss = null;
      state.stageCleared = true;

      // Safely transform alive regular enemies into a capped burst of high-value gems
      const remaining = enemies.filter(en => en && !en.isBoss);
      enemies = [];
      const gemCount = Math.min(20, remaining.length);
      const totalGemXp = remaining.reduce((acc, en) => acc + (en.xpVal || 5), 0);
      const xpPerGem = gemCount > 0 ? Math.round((totalGemXp / gemCount) * xpBonus) : 0;
      for (let i = 0; i < gemCount; i++) {
        const en = remaining[i];
        gems.push({
          x: en.x,
          y: en.y,
          val: xpPerGem || 10,
          color: '#ffd54f',
          radius: 7
        });
      }

      // Unlock next stage
      if (state.currentStageId >= unlockedStage && unlockedStage < 4) {
        unlockedStage = state.currentStageId + 1;
        localStorage.setItem('survivor_unlocked_stage', unlockedStage.toString());
      }

      // Show stage clear modal safely
      setTimeout(() => {
        if (modalStageClear) {
          if (modalLevelup) {
            modalLevelup.classList.remove('active');
            modalLevelup.style.display = 'none';
          }
          isLevelUpActive = false;
          pendingLevelUps = 0;

          const scDescEl = document.getElementById('sc-desc');
          const scRewardEl = document.querySelector('.sc-reward');
          const bossName = (curStage && curStage.boss && curStage.boss.name) ? curStage.boss.name : 'Bölüm Lordu';
          const stageName = curStage ? curStage.name : 'Aşama';
          if (scDescEl) scDescEl.textContent = `${bossName} yerle bir edildi! ${stageName} temizlendi.`;
          if (scRewardEl) scRewardEl.textContent = `🪙 +${g} Altın ve Ebedi Şan Kazanıldı!`;
          if (btnScNext) {
            if (state.currentStageId < 4) {
              btnScNext.textContent = `AŞAMA ${state.currentStageId + 1}'E GEÇ ➡️ [1]`;
              btnScNext.style.display = 'inline-block';
            } else {
              btnScNext.textContent = '👑 TÜM AŞAMALARI TAMAMLADIN! [1]';
              btnScNext.style.display = 'inline-block';
            }
          }
          if (btnScContinue) {
            btnScContinue.textContent = 'Sonsuz Modda Devam Et ⚔️ [2]';
          }
          modalStageClear.style.display = 'flex';
          modalStageClear.classList.add('active');
          state.paused = true;
        }
      }, 1000);
    } else if (Math.random() < e.goldChance) {
      const g = Math.round((2 + Math.floor(Math.random() * 5)) * greedBonus);
      state.goldEarned += g;
      persistentGold += g;
      saveGold();
      addFloatText(e.x, e.y - 20, `+${g} 🪙`, '#ffd54f', 14);
    }

    // Death particles
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: e.x,
        y: e.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 18,
        color: e.color,
        size: 3
      });
    }

    updateHUD();
  }

  // --- XP & LEVEL UP (ROBUST QUEUE & FALLBACKS) ---
  let pendingLevelUps = 0;
  let isLevelUpActive = false;

  function addXP(amount) {
    player.xp += amount;
    while (player.xp >= player.xpNeeded) {
      player.xp -= player.xpNeeded;
      player.level++;
      player.xpNeeded = Math.floor(player.xpNeeded * 1.35) + 5;
      pendingLevelUps++;
    }
    updateHUD();
    checkPendingLevelUps();
  }

  function checkPendingLevelUps() {
    if (pendingLevelUps > 0 && !isLevelUpActive && !state.stageCleared && modalGameover && !modalGameover.classList.contains('active')) {
      pendingLevelUps--;
      triggerLevelUp();
    }
  }

  function triggerLevelUp() {
    isLevelUpActive = true;
    state.paused = true;
    Sfx.levelup();

    // Pick 3 random upgrades from available pool
    const available = UPGRADE_POOL.filter(u => (player.skills[u.id] || 0) < u.maxLvl);
    const chosen = [];
    const poolCopy = [...available];

    while (chosen.length < 3 && poolCopy.length > 0) {
      const randIdx = Math.floor(Math.random() * poolCopy.length);
      chosen.push(poolCopy.splice(randIdx, 1)[0]);
    }

    // Fallback bonus rewards if skills are maxed out (GUARANTEES ALWAYS 3 CARDS FOR KEYS 1, 2, 3!)
    const FALLBACK_REWARDS = [
      {
        id: '_gold_bonus',
        name: 'Hazine Sandığı',
        typeName: 'Altın',
        type: 'utility',
        icon: '🪙',
        desc: 'Anında +350 Altın kazandırır.',
        getPreview: () => '+350 🪙 Altın',
        customAction: () => {
          persistentGold += 350;
          saveGold();
          addFloatText(player.x, player.y - 30, '+350 🪙', '#ffd700', 22);
        }
      },
      {
        id: '_full_heal',
        name: 'Kutsal Şifa',
        typeName: 'Can',
        type: 'defense',
        icon: '❤️',
        desc: 'Canı ve Kalkanı anında %100 doldurur.',
        getPreview: () => '100% CAN + KALKAN',
        customAction: () => {
          player.hp = player.maxHp;
          player.shieldCurrentHp = player.shieldMaxHp;
          addFloatText(player.x, player.y - 30, 'TAM CAN! ❤️', '#00e676', 22);
        }
      },
      {
        id: '_shockwave',
        name: 'Kıyamet Dalgası',
        typeName: 'Saldırı',
        type: 'magic',
        icon: '⚡',
        desc: 'Ekrandaki tüm canavarlara devasa şok hasarı verir.',
        getPreview: () => 'TÜM DÜŞMANLARA 600 HASAR',
        customAction: () => {
          state.screenShake = 16;
          Sfx.lightning();
          const snap = enemies.slice();
          snap.forEach(en => {
            if (en && en.hp > 0) damageEnemy(en, 600, true);
          });
        }
      }
    ];

    let fallbackIdx = 0;
    while (chosen.length < 3 && fallbackIdx < FALLBACK_REWARDS.length) {
      chosen.push(FALLBACK_REWARDS[fallbackIdx++]);
    }

    levelupCardsGrid.innerHTML = '';
    chosen.forEach((upgrade, cardIdx) => {
      const curLvl = player.skills[upgrade.id] || 0;
      const isEvolution = curLvl + 1 === upgrade.maxLvl;
      const card = document.createElement('div');
      card.className = `upgrade-card ${isEvolution ? 'card-evolution' : ''}`;
      card.innerHTML = `
        <div style="position: absolute; top: 12px; right: 14px; background: rgba(0, 219, 255, 0.15); border: 1px solid #00dbff; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 900; color: #00dbff; letter-spacing: 0.5px;">[${cardIdx + 1}]</div>
        <div class="card-icon">${upgrade.icon}</div>
        <div class="card-title">${upgrade.name}</div>
        <div class="card-type ${isEvolution ? 'type-evolution' : 'type-' + upgrade.type}">
          ${isEvolution ? '🔥 EVRİMLEŞME (MAX FORM)' : upgrade.typeName}
        </div>
        <div class="card-desc">${upgrade.desc}</div>
        <div class="card-level-preview">${upgrade.getPreview ? upgrade.getPreview(curLvl) : ''}</div>
      `;

      card.addEventListener('click', () => {
        if (upgrade.customAction) {
          upgrade.customAction();
        } else {
          applyUpgrade(upgrade.id);
        }
        modalLevelup.classList.remove('active');
        modalLevelup.style.display = 'none';
        isLevelUpActive = false;
        if (pendingLevelUps > 0 && !state.stageCleared) {
          setTimeout(checkPendingLevelUps, 150);
        } else {
          state.paused = false;
        }
      });

      levelupCardsGrid.appendChild(card);
    });

    modalLevelup.style.display = 'flex';
    modalLevelup.classList.add('active');
  }

  function applyUpgrade(skillId) {
    player.skills[skillId] = (player.skills[skillId] || 0) + 1;
    // Immediate stat effects
    if (skillId === 'swiftboots') {
      player.speed += 0.45;
    }
    updateSkillsDock();
    updateHUD();
  }

  // --- PLAYER DAMAGE & REVIVE ---
  function hurtPlayer(dmg) {
    if (player.dashDuration > 0 || player.invulnTimer > 0) return; // Invulnerable during dash or recent hit
    player.invulnTimer = 22; // ~360ms i-frame protection window
    const armorCfg = FORGE_CONFIG.find(c => c.id === 'armor');
    const armorReduction = (forgeRanks.armor || 0) * (armorCfg ? armorCfg.valPerRank : 0.05);
    let finalDmg = Math.max(1, Math.round(dmg * (1 - armorReduction)));

    // İlahi Kalkan (Shield Bubble) hasar emilimi
    if (player.skills.shieldbubble > 0 && player.shieldCurrentHp > 0) {
      player.shieldRechargeDelay = 4.0; // 4 saniye darbe gecikmesi
      if (player.shieldCurrentHp >= finalDmg) {
        player.shieldCurrentHp -= finalDmg;
        addFloatText(player.x, player.y - 30, `🛡️ -${finalDmg} (Kalkan: ${Math.round(player.shieldCurrentHp)})`, '#00e5ff', 16);
        Sfx.hit();
        return;
      } else {
        finalDmg -= player.shieldCurrentHp;
        player.shieldCurrentHp = 0;
        player.shieldBroken = true;
        player.shieldBreakCooldown = 12.0; // 12 saniye kalkan bekleme süresi
        addFloatText(player.x, player.y - 35, '💥 KALKAN PARÇALANDI!', '#ff3d00', 20);
        state.screenShake = 12;
        Sfx.bossAlarm();

        // 25 kalkan cam patlama parçacığı
        for (let k = 0; k < 25; k++) {
          const a = Math.random() * Math.PI * 2;
          const spd = Math.random() * 8 + 3;
          particles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            life: 25,
            color: Math.random() < 0.5 ? '#00e5ff' : '#ffffff',
            size: Math.random() * 4 + 2
          });
        }

        enemies.forEach(e => {
          if (Math.hypot(e.x - player.x, e.y - player.y) < 180) {
            damageEnemy(e, 85, true);
          }
        });
      }
    }

    player.hp -= finalDmg;
    state.screenShake = 7;
    Sfx.hit();
    addFloatText(player.x, player.y - 25, `-${finalDmg}`, '#ff3366', 16);
    updateHUD();

    if (player.hp <= 0) {
      if (player.revivesLeft > 0) {
        player.revivesLeft--;
        player.hp = Math.round(player.maxHp * 0.6);
        addFloatText(player.x, player.y - 45, '🔄 DİRİLDİN!', '#00e676', 26);
        Sfx.chest();
        // Blow away nearby enemies on revive
        enemies.forEach(e => {
          const d = Math.hypot(e.x - player.x, e.y - player.y);
          if (d < 250) {
            damageEnemy(e, 80, true);
          }
        });
      } else {
        triggerGameOver();
      }
    }
  }

  function triggerGameOver() {
    state.running = false;
    modalGameover.classList.add('active');

    const m = Math.floor(state.time / 60);
    const s = Math.floor(state.time % 60);
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    goStatTime.textContent = timeStr;
    goStatKills.textContent = state.kills;
    goStatGold.textContent = `+${state.goldEarned} 🪙`;
    goStatLevel.textContent = `LVL ${player.level}`;
  }

  // --- BLACKSMITH (DEMİRCİ) UI ---
  function openBlacksmith() {
    state.paused = true;
    forgeGoldDisplay.textContent = persistentGold;
    forgeItemsList.innerHTML = '';

    FORGE_CONFIG.forEach(item => {
      const curRank = forgeRanks[item.id] || 0;
      const isMax = curRank >= item.maxRank;
      const cost = Math.round(item.baseCost * Math.pow(item.costMult, curRank));

      const el = document.createElement('div');
      el.className = 'forge-item';

      let pips = '';
      for (let i = 0; i < item.maxRank; i++) {
        pips += `<div class="forge-pip ${i < curRank ? 'filled' : ''}"></div>`;
      }

      el.innerHTML = `
        <div class="forge-icon">${item.icon}</div>
        <div class="forge-details">
          <div class="forge-name">${item.name} (${curRank}/${item.maxRank})</div>
          <div class="forge-desc">${item.desc}</div>
          <div class="forge-progress">${pips}</div>
        </div>
        <button class="btn-forge-buy" ${isMax || persistentGold < cost ? 'disabled' : ''}>
          ${isMax ? 'MAKSİMUM' : `<span>🪙 ${cost}</span><span>GELİŞTİR</span>`}
        </button>
      `;

      const btnBuy = el.querySelector('.btn-forge-buy');
      if (!isMax && persistentGold >= cost) {
        btnBuy.addEventListener('click', () => {
          persistentGold -= cost;
          forgeRanks[item.id] = curRank + 1;
          saveForge(forgeRanks);
          saveGold();
          Sfx.chest();
          openBlacksmith(); // Re-render
          updateHUD();
        });
      }

      forgeItemsList.appendChild(el);
    });

    modalBlacksmith.classList.add('active');
  }

  function closeBlacksmith() {
    modalBlacksmith.classList.remove('active');
    if (state.running) state.paused = false;
  }

  // --- UI UPDATERS ---
  function updateHUD() {
    hudLevel.textContent = `LVL ${player.level}`;
    hudHp.textContent = `${Math.max(0, player.hp)} / ${player.maxHp}`;
    hudGold.textContent = persistentGold;
    hudKills.textContent = `${state.kills} Av`;

    const curStage = getCurrentStage();
    if (hudStageName) hudStageName.textContent = `Aşama ${curStage.id}: ${curStage.name}`;

    if (hudDashCd) {
      if (player.dashCd <= 0) {
        hudDashCd.textContent = 'HAZIR';
        hudDashCd.style.color = '#00e5ff';
      } else {
        hudDashCd.textContent = (player.dashCd / 60).toFixed(1) + 's';
        hudDashCd.style.color = '#ff9100';
      }
    }

    const m = Math.floor(state.time / 60);
    const s = Math.floor(state.time % 60);
    hudTimer.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    const xpPercent = Math.min(100, (player.xp / player.xpNeeded) * 100);
    xpBarFill.style.width = `${xpPercent}%`;

    // Boss bar update
    if (state.activeBoss) {
      bossHpText.textContent = `${Math.max(0, state.activeBoss.hp)} / ${state.activeBoss.maxHp}`;
      const pct = Math.max(0, (state.activeBoss.hp / state.activeBoss.maxHp) * 100);
      bossBarFill.style.width = `${pct}%`;
    }
  }

  function updateSkillsDock() {
    skillsDock.innerHTML = '';
    UPGRADE_POOL.forEach(u => {
      const lvl = player.skills[u.id] || 0;
      if (lvl > 0) {
        const slot = document.createElement('div');
        slot.className = 'skill-slot';
        slot.innerHTML = `<span>${u.icon}</span><span class="skill-lvl">L${lvl}</span>`;
        slot.title = `${u.name} (Seviye ${lvl})`;
        skillsDock.appendChild(slot);
      }
    });
  }

  function getNearestEnemy() {
    let nearest = null;
    let minDist = Infinity;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }
    return nearest;
  }

  function addFloatText(x, y, text, color = '#ffffff', size = 16) {
    floatTexts.push({
      x, y,
      text,
      color,
      size,
      life: 40,
      vy: -1.2
    });
  }

  // --- MAIN GAME LOOP ---
  let lastTime = performance.now();
  function gameLoop(now) {
    try {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (state.running && !state.paused) {
      state.time += dt;

      // 1. Player Movement
      let mx = 0, my = 0;
      if (state.keys['w'] || state.keys['arrowup']) my -= 1;
      if (state.keys['s'] || state.keys['arrowdown']) my += 1;
      if (state.keys['a'] || state.keys['arrowleft']) mx -= 1;
      if (state.keys['d'] || state.keys['arrowright']) mx += 1;

      if (mx !== 0 && my !== 0) {
        mx *= 0.7071;
        my *= 0.7071;
      }

      let curSpeed = player.speed;
      if (player.dashDuration > 0) {
        curSpeed *= 2.8;
        player.dashDuration--;
      }
      if (player.dashCd > 0) player.dashCd--;
      if (player.invulnTimer > 0) player.invulnTimer--;

      player.x += mx * curSpeed;
      player.y += my * curSpeed;

      if (mx !== 0 || my !== 0) {
        player.facing = Math.atan2(my, mx);
      }

      // Smooth camera follow
      state.camera.x += (player.x - width / 2 - state.camera.x) * 0.1;
      state.camera.y += (player.y - height / 2 - state.camera.y) * 0.1;

      // 2. Weapons & Skills
      updatePlayerSkills();

      // 3. Spawning
      updateSpawning();

      // 4. Update Enemies (Anti-freeze: capped and cleaned up)
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);

        // Despawn far off-screen non-boss enemies
        if (dist > 2200 && !e.isBoss && e.type !== 'boss') {
          enemies.splice(i, 1);
          continue;
        }

        if (dist > 0) {
          e.x += (dx / dist) * e.speed;
          e.y += (dy / dist) * e.speed;
        }

        if (e.hitFlash > 0) e.hitFlash--;

        // Collision with player
        if (dist < player.radius + e.radius) {
          hurtPlayer(e.dmg || (e.isBoss ? 28 : 8));
        }
      }

      // 5. Update Projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.life--;

        if (p.type === 'holy_slash') {
          p.x += p.vx;
          p.y += p.vy;
          enemies.forEach(e => {
            if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
              damageEnemy(e, p.dmg, true);
              e.x += p.vx * 0.7;
              e.y += p.vy * 0.7;
            }
          });
        } else if (p.type === 'arcane_bolt') {
          if (p.homing && enemies.length > 0) {
            const nearest = getNearestEnemy();
            if (nearest) {
              const hAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
              p.vx += Math.cos(hAngle) * 0.9;
              p.vy += Math.sin(hAngle) * 0.9;
              const spd = Math.hypot(p.vx, p.vy);
              if (spd > 15) { p.vx = (p.vx / spd) * 15; p.vy = (p.vy / spd) * 15; }
            }
          }
          p.x += p.vx;
          p.y += p.vy;
          for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
              damageEnemy(e, p.dmg, false);
              p.life = 0;
              break;
            }
          }
        } else if (p.type === 'inferno_bomb') {
          p.x += p.vx;
          p.y += p.vy;
          let boom = false;
          for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            if (e && Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
              boom = true;
              break;
            }
          }
          if (boom || p.life <= 1) {
            p.life = 0;
            state.screenShake = 6;
            Sfx.fire();
            const bombTargets = enemies.slice();
            bombTargets.forEach(target => {
              if (target && target.hp > 0 && Math.hypot(target.x - p.x, target.y - p.y) < (p.splashRadius || 85)) {
                damageEnemy(target, p.dmg, true);
              }
            });
            for (let k = 0; k < 18; k++) {
              particles.push({
                x: p.x,
                y: p.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 25,
                color: Math.random() < 0.6 ? '#ff3d00' : '#ffd700',
                size: Math.random() * 5 + 3
              });
            }
          }
        } else if (p.type === 'cosmic_vortex') {
          p.x += p.vx * 0.96;
          p.y += p.vy * 0.96;
          const vortexTargets = enemies.slice();
          vortexTargets.forEach(e => {
            if (!e || e.hp <= 0) return;
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < p.pullRadius && d > 10) {
              const pullAngle = Math.atan2(p.y - e.y, p.x - e.x);
              e.x += Math.cos(pullAngle) * 4.0;
              e.y += Math.sin(pullAngle) * 4.0;
              if (p.life % 16 === 0) {
                damageEnemy(e, p.dmg, false);
                e.hitFlash = 3;
              }
            }
          });
          if (p.life === 1) {
            state.screenShake = 10;
            Sfx.bossAlarm();
            const blastTargets = enemies.slice();
            blastTargets.forEach(e => {
              if (e && e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < p.pullRadius) {
                damageEnemy(e, p.dmg * 2.2, true);
              }
            });
            for (let k = 0; k < 30; k++) {
              particles.push({
                x: p.x,
                y: p.y,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 0.5) * 14,
                life: 30,
                color: Math.random() < 0.5 ? '#d500f9' : '#00e5ff',
                size: Math.random() * 6 + 3
              });
            }
          }
        } else if (p.type === 'scythe') {
          p.distance += 4.5;
          p.angle += 0.16;
          p.x = player.x + Math.cos(p.angle) * p.distance;
          p.y = player.y + Math.sin(p.angle) * p.distance;
          if (p.distance >= p.maxDist) p.life = 0;
          enemies.forEach(e => {
            if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
              damageEnemy(e, p.damage, true);
            }
          });
        } else if (p.type === 'blackhole') {
          enemies.forEach(e => {
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < p.pullRadius && d > 10) {
              const pullAngle = Math.atan2(p.y - e.y, p.x - e.x);
              e.x += Math.cos(pullAngle) * 3.5;
              e.y += Math.sin(pullAngle) * 3.5;
              if (p.life % 20 === 0) {
                damageEnemy(e, p.damage, false);
              }
            }
          });
        } else if (p.type === 'toxiccloud') {
          if (p.life % 25 === 0) {
            enemies.forEach(e => {
              if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius + e.radius) {
                damageEnemy(e, p.damage, false);
                e.hitFlash = 4;
              }
            });
          }
        } else {
          // Standard projectiles (fireball, meteor, chaindagger)
          p.x += p.vx;
          p.y += p.vy;

          for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            if (!e) continue;
            const dist = Math.hypot(e.x - p.x, e.y - p.y);
            if (dist < e.radius + p.radius) {
              const splashTargets = enemies.slice();
              splashTargets.forEach(target => {
                if (target && target.hp > 0) {
                  const d = Math.hypot(target.x - p.x, target.y - p.y);
                  if (d <= p.splashRadius) {
                    damageEnemy(target, p.damage, p.type === 'meteor');
                  }
                }
              });

              const sparkCount = p.type === 'meteor' ? 24 : 10;
              for (let k = 0; k < sparkCount; k++) {
                particles.push({
                  x: p.x,
                  y: p.y,
                  vx: (Math.random() - 0.5) * (p.type === 'meteor' ? 12 : 8),
                  vy: (Math.random() - 0.5) * (p.type === 'meteor' ? 12 : 8),
                  life: 25,
                  color: p.color,
                  size: p.type === 'meteor' ? 6 : 4
                });
              }

              if (p.pierce && p.pierce > 1) {
                p.pierce--;
              } else {
                p.life = 0;
                break;
              }
            }
          }
        }

        if (p.life <= 0) projectiles.splice(i, 1);
      }

      // 6. Döner Bıçaklar Collision (Spinning Blades)
      if (player.skills.swords > 0) {
        const swordCount = player.skills.swords;
        const orbitRadius = 60 + player.skills.swords * 6;
        const swordAngleBase = (now / 350);
        const baseDmgMult = (1 + (forgeRanks.baseDmg * FORGE_CONFIG.find(c => c.id === 'baseDmg').valPerRank)) * (1 + player.skills.might * 0.2);
        const dmg = Math.round((14 + player.skills.swords * 6) * baseDmgMult);

        for (let i = 0; i < swordCount; i++) {
          const a = swordAngleBase + (i * Math.PI * 2 / swordCount);
          const sx = player.x + Math.cos(a) * orbitRadius;
          const sy = player.y + Math.sin(a) * orbitRadius;

          const bladeTargets = enemies.slice();
          bladeTargets.forEach(e => {
            if (!e || e.hp <= 0) return;
            const d = Math.hypot(e.x - sx, e.y - sy);
            if (d < e.radius + 15) {
              damageEnemy(e, dmg, false);
              // Small knockback
              e.x += Math.cos(a) * 4;
              e.y += Math.sin(a) * 4;
            }
          });
        }
      }

      // 7. Update XP Gems (Magnet pull)
      const magnetRadius = 70 + (player.skills.magnet * 45);
      for (let i = gems.length - 1; i >= 0; i--) {
        const g = gems[i];
        const dist = Math.hypot(player.x - g.x, player.y - g.y);

        if (dist < magnetRadius) {
          const speed = Math.max(6, 16 - (dist / magnetRadius) * 8);
          g.x += ((player.x - g.x) / dist) * speed;
          g.y += ((player.y - g.y) / dist) * speed;
        }

        if (dist < player.radius + g.radius) {
          addXP(g.val);
          gems.splice(i, 1);
        }
      }

      // 8. Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        if (pt.vx !== undefined) pt.x += pt.vx;
        if (pt.vy !== undefined) pt.y += pt.vy;
        if (pt.radius !== undefined && pt.maxRadius !== undefined) {
          pt.radius += (pt.maxRadius - pt.radius) * 0.15;
        }
        pt.life--;
        if (pt.life <= 0) particles.splice(i, 1);
      }

      // 9. Update Floating Texts
      for (let i = floatTexts.length - 1; i >= 0; i--) {
        const ft = floatTexts[i];
        ft.y += ft.vy;
        ft.life--;
        if (ft.life <= 0) floatTexts.splice(i, 1);
      }

      // Screen shake decay
      if (state.screenShake > 0) state.screenShake *= 0.88;
      if (state.screenShake < 0.2) state.screenShake = 0;

      // Anti-freeze: Cap transient entity arrays
      if (floatTexts.length > 30) floatTexts.splice(0, floatTexts.length - 30);
      if (particles.length > 80) particles.splice(0, particles.length - 80);
      if (gems.length > 130) gems.splice(0, gems.length - 130);

      updateHUD();
    }

    // --- RENDER ---
    render();
    } catch (err) {
      console.warn('Survivor frame recovery:', err);
    }
    requestAnimationFrame(gameLoop);
  }

  function render() {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply Screen Shake
    if (state.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * state.screenShake;
      const shakeY = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // Apply Camera
    ctx.translate(-state.camera.x, -state.camera.y);

    const curStage = getCurrentStage();
    ctx.fillStyle = curStage.theme.bg;
    ctx.fillRect(state.camera.x, state.camera.y, width, height);

    // 1. Draw Dungeon Floor (Grid & Glowing Runes)
    drawDungeonFloor();

    // 2. Draw Holy Aura (if active)
    if (player.skills.holyaura > 0) {
      const auraRadius = 80 + player.skills.holyaura * 18;
      ctx.beginPath();
      ctx.arc(player.x, player.y, auraRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 213, 79, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 213, 79, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Draw XP Gems
    gems.forEach(g => {
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      ctx.fillStyle = g.color;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 4. Draw Enemies & Bosses
    enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.isBoss) {
        // --- EPIC BOSS MODELS ---
        if (e.bossType === 'skeleton_king') {
          // 🦴 Giant Skeleton King
          ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 24;
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.moveTo(-16, -18); ctx.quadraticCurveTo(-30, -38, -18, -44); ctx.quadraticCurveTo(-14, -32, -8, -20);
          ctx.moveTo(16, -18); ctx.quadraticCurveTo(30, -38, 18, -44); ctx.quadraticCurveTo(14, -32, 8, -20);
          ctx.fill();

          ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#f1f5f9';
          ctx.beginPath(); ctx.arc(0, -6, e.radius * 0.75, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(-12, 6, 24, 12);
          for (let t = -10; t <= 10; t += 5) {
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(t - 1, 14, 2, 4);
          }

          // Golden Jeweled Crown
          ctx.fillStyle = '#ffd54f';
          ctx.beginPath();
          ctx.moveTo(-18, -18); ctx.lineTo(-20, -30); ctx.lineTo(-10, -22); ctx.lineTo(0, -34); ctx.lineTo(10, -22); ctx.lineTo(20, -30); ctx.lineTo(18, -18);
          ctx.fill();
          ctx.fillStyle = '#ef4444';
          ctx.beginPath(); ctx.arc(0, -24, 4, 0, Math.PI * 2); ctx.fill();

          // Glowing Green Eyes
          ctx.fillStyle = '#22c55e';
          ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(-8, -8, 5, 0, Math.PI * 2);
          ctx.arc(8, -8, 5, 0, Math.PI * 2);
          ctx.fill();

          // Executioner Greataxe
          const axeSway = Math.sin(performance.now() / 200) * 8;
          ctx.save();
          ctx.translate(e.radius + 12, axeSway);
          ctx.fillStyle = '#78350f'; ctx.fillRect(-3, -24, 6, 48);
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.moveTo(3, -20); ctx.quadraticCurveTo(24, -10, 18, 10); ctx.lineTo(3, 4);
          ctx.fill();
          ctx.restore();
        }
        else if (e.bossType === 'dracula') {
          // 🧛 Lord Dracula
          ctx.shadowColor = '#dc2626'; ctx.shadowBlur = 28;
          const capeFlap = Math.sin(performance.now() / 120) * 6;
          ctx.fillStyle = '#1e1b4b';
          ctx.beginPath();
          ctx.moveTo(-20, -24);
          ctx.quadraticCurveTo(-42 + capeFlap, 10, -34, 40);
          ctx.lineTo(34, 40);
          ctx.quadraticCurveTo(42 - capeFlap, 10, 20, -24);
          ctx.fill();

          ctx.fillStyle = '#b91c1c';
          ctx.beginPath();
          ctx.moveTo(-16, -18);
          ctx.quadraticCurveTo(-30, 10, -24, 34);
          ctx.lineTo(24, 34);
          ctx.quadraticCurveTo(30, 10, 16, -18);
          ctx.fill();

          ctx.fillStyle = '#7f1d1d';
          ctx.beginPath();
          ctx.moveTo(-18, -12); ctx.lineTo(-26, -34); ctx.lineTo(-12, -22); ctx.lineTo(0, -18); ctx.lineTo(12, -22); ctx.lineTo(26, -34); ctx.lineTo(18, -12);
          ctx.fill();

          ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#f8fafc';
          ctx.beginPath(); ctx.arc(0, -6, 16, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(0, -14, 14, Math.PI, Math.PI * 2);
          ctx.lineTo(0, -8);
          ctx.fill();

          ctx.fillStyle = '#ff1744';
          ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 10;
          ctx.fillRect(-6, -8, 4, 3); ctx.fillRect(2, -8, 4, 3);

          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.moveTo(-4, 0); ctx.lineTo(-3, 6); ctx.lineTo(-2, 0);
          ctx.moveTo(2, 0); ctx.lineTo(3, 6); ctx.lineTo(4, 0);
          ctx.fill();

          for (let b = 0; b < 4; b++) {
            const bAng = (performance.now() / 300) + (b * Math.PI / 2);
            const bx = Math.cos(bAng) * 44;
            const by = Math.sin(bAng) * 44;
            ctx.fillStyle = '#4c0519';
            ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
          }
        }
        else if (e.bossType === 'cerberus') {
          // 🐺 Inferno Cerberus
          ctx.shadowColor = '#ea580c'; ctx.shadowBlur = 30;
          ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#450a0a';
          ctx.beginPath(); ctx.arc(0, 4, e.radius * 0.75, 0, Math.PI * 2); ctx.fill();

          const headOffsets = [
            { x: 0, y: -16, ang: 0 },
            { x: -18, y: -8, ang: -0.4 },
            { x: 18, y: -8, ang: 0.4 }
          ];

          headOffsets.forEach(hd => {
            ctx.save();
            ctx.translate(hd.x, hd.y);
            ctx.rotate(hd.ang);
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#450a0a';
            ctx.beginPath();
            ctx.moveTo(-8, -4); ctx.lineTo(-11, -16); ctx.lineTo(-3, -8);
            ctx.moveTo(8, -4); ctx.lineTo(11, -16); ctx.lineTo(3, -8);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#f97316'; ctx.shadowBlur = 8;
            ctx.fillRect(-5, -3, 3, 2); ctx.fillRect(2, -3, 3, 2);
            ctx.fillStyle = '#f97316';
            ctx.fillRect(-2, 4, 4, 3);
            ctx.restore();
          });

          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10;
          for (let s = -18; s <= 18; s += 9) {
            ctx.beginPath();
            ctx.moveTo(s - 3, 14); ctx.lineTo(s, 24); ctx.lineTo(s + 3, 14);
            ctx.fill();
          }
        }
        else {
          // 💀 The Grim Reaper
          ctx.shadowColor = '#7c3aed'; ctx.shadowBlur = 35;
          const shroudWave = Math.sin(performance.now() / 150) * 8;
          ctx.fillStyle = '#090514';
          ctx.beginPath();
          ctx.moveTo(-22, -26);
          ctx.quadraticCurveTo(-46 + shroudWave, 10, -32, 46);
          ctx.lineTo(32, 46);
          ctx.quadraticCurveTo(46 - shroudWave, 10, 22, -26);
          ctx.fill();

          ctx.fillStyle = '#2e1065';
          ctx.beginPath();
          ctx.moveTo(-16, -18);
          ctx.quadraticCurveTo(-26, 12, -18, 38);
          ctx.lineTo(18, 38);
          ctx.quadraticCurveTo(26, 12, 16, -18);
          ctx.fill();

          ctx.fillStyle = '#090514';
          ctx.beginPath(); ctx.arc(0, -14, 18, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#cbd5e1';
          ctx.beginPath(); ctx.arc(0, -12, 11, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(-5, -4, 10, 5);

          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 12;
          ctx.fillRect(-5, -14, 3, 4); ctx.fillRect(2, -14, 3, 4);

          const scytheRot = (performance.now() / 400);
          ctx.save();
          ctx.translate(e.radius + 16, 0);
          ctx.rotate(scytheRot);
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(-3, -35, 6, 70);
          ctx.fillStyle = '#f1f5f9';
          ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3;
          ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.moveTo(0, -35);
          ctx.bezierCurveTo(40, -45, 55, -10, 42, 15);
          ctx.quadraticCurveTo(34, -18, 0, -30);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      else {
        // --- DETAILED REGULAR ENEMY SPRITES ---
        if (e.type === 'bat') {
          const flap = Math.sin(performance.now() / 80) * 8;
          ctx.fillStyle = '#1e1b4b';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-14, -12 + flap, -22, -4 + flap);
          ctx.quadraticCurveTo(-12, 4 + flap, 0, 4);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(14, -12 + flap, 22, -4 + flap);
          ctx.quadraticCurveTo(12, 4 + flap, 0, 4);
          ctx.fill();
          ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#312e81';
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ff1744';
          ctx.fillRect(-3, -2, 2, 2); ctx.fillRect(1, -2, 2, 2);
        }
        else if (e.type === 'skeleton') {
          ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#f1f5f9';
          ctx.beginPath(); ctx.arc(0, -4, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(-5, 3, 10, 6);
          ctx.fillStyle = '#22c55e';
          ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 6;
          ctx.fillRect(-4, -6, 3, 4); ctx.fillRect(1, -6, 3, 4);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-6, 10); ctx.lineTo(6, 10);
          ctx.moveTo(-5, 14); ctx.lineTo(5, 14);
          ctx.stroke();
          ctx.fillStyle = '#94a3b8'; ctx.fillRect(9, -6, 3, 15);
        }
        else if (e.type === 'zombie') {
          ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#15803d';
          ctx.beginPath(); ctx.arc(0, -3, 11, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#991b1b'; ctx.fillRect(-4, 3, 8, 3);
          ctx.fillStyle = '#fef08a'; ctx.fillRect(-4, -5, 3, 3);
          ctx.fillStyle = '#000'; ctx.fillRect(1, -5, 3, 3);
          ctx.fillStyle = '#166534'; ctx.fillRect(-12, 1, 6, 4); ctx.fillRect(6, 1, 6, 4);
        }
        else if (e.type === 'phantom') {
          const wave = Math.sin(performance.now() / 120) * 4;
          ctx.fillStyle = e.hitFlash > 0 ? '#fff' : 'rgba(56, 189, 248, 0.75)';
          ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-10, -2); ctx.quadraticCurveTo(0, 14 + wave, wave, 20); ctx.quadraticCurveTo(10, 14 - wave, 10, -2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#fff';
          ctx.fillRect(-4, -7, 3, 4); ctx.fillRect(1, -7, 3, 4);
        }
        else if (e.type === 'hellhound') {
          ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#450a0a';
          ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#f97316'; ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(-10, -6); ctx.lineTo(-14, -14); ctx.lineTo(-6, -10);
          ctx.lineTo(0, -16); ctx.lineTo(6, -10); ctx.lineTo(14, -14); ctx.lineTo(10, -6);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#fbbf24'; ctx.fillRect(-5, -2, 3, 2); ctx.fillRect(2, -2, 3, 2);
        }
        else {
          // Boulder Golem
          ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#334155';
          ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ea580c'; ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(-e.radius * 0.5, -e.radius * 0.3); ctx.lineTo(0, 0); ctx.lineTo(e.radius * 0.6, e.radius * 0.4);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-e.radius * 0.4, -6, 5, 4); ctx.fillRect(e.radius * 0.15, -6, 5, 4);
        }
      }

      // Enemy Health Bar (if damaged)
      if (e.hp < e.maxHp && !e.isBoss) {
        const barW = e.radius * 2;
        const hpPct = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-barW / 2, -e.radius - 8, barW, 4);
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(-barW / 2, -e.radius - 8, barW * hpPct, 4);
      }

      ctx.restore();
    });

    // 5. Draw Projectiles
    projectiles.forEach(p => {
      ctx.save();
      if (p.type === 'blackhole') {
        // Deep purple swirl with black center
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124, 77, 255, 0.25)';
        ctx.shadowColor = '#651fff';
        ctx.shadowBlur = 20;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#05020a';
        ctx.strokeStyle = '#d500f9';
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'holy_slash') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, -Math.PI / 3, Math.PI / 3, false);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 18;
        ctx.stroke();
      } else if (p.type === 'arcane_bolt') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 14;
        ctx.fill();
      } else if (p.type === 'inferno_bomb') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3d00';
        ctx.shadowColor = '#ff6d00';
        ctx.shadowBlur = 18;
        ctx.fill();
      } else if (p.type === 'cosmic_vortex') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (1 + (180 - p.life) / 360), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124, 77, 255, 0.35)';
        ctx.shadowColor = '#d500f9';
        ctx.shadowBlur = 25;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#05020a';
        ctx.fill();
      } else if (p.type === 'scythe') {
        // Crescent blade
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle + Math.PI / 2);
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, -Math.PI / 2, Math.PI / 2, false);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#e040fb';
        ctx.shadowBlur = 18;
        ctx.fill();
      } else if (p.type === 'toxiccloud') {
        // Poison gas
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 230, 118, 0.22)';
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 15;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 16;
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw Shield Bubble around Player (Kırılma ve Çatlak Görseli)
    if (player.skills.shieldbubble > 0 && player.shieldCurrentHp > 0) {
      const maxShield = player.skills.shieldbubble * 75;
      const hpRatio = player.shieldCurrentHp / maxShield;
      ctx.save();
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 18, 0, Math.PI * 2);
      ctx.strokeStyle = hpRatio > 0.4 ? '#00e5ff' : '#ffea00';
      ctx.lineWidth = hpRatio > 0.4 ? 3 : 2;
      ctx.shadowColor = hpRatio > 0.4 ? '#00e5ff' : '#ff5252';
      ctx.shadowBlur = 16;
      ctx.fillStyle = hpRatio > 0.4 ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 234, 0, 0.15)';
      ctx.fill();
      ctx.stroke();

      // Çatlak çizgileri
      if (hpRatio < 0.6) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(player.x - 12, player.y - 15);
        ctx.lineTo(player.x - 4, player.y - 5);
        ctx.lineTo(player.x + 8, player.y - 12);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 6. Draw Spinning Swords (Döner Bıçaklar)
    if (player.skills.swords > 0) {
      const swordCount = player.skills.swords;
      const orbitRadius = 60 + player.skills.swords * 6;
      const swordAngleBase = (performance.now() / 350);

      for (let i = 0; i < swordCount; i++) {
        const a = swordAngleBase + (i * Math.PI * 2 / swordCount);
        const sx = player.x + Math.cos(a) * orbitRadius;
        const sy = player.y + Math.sin(a) * orbitRadius;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a + Math.PI / 2);

        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(5, 4);
        ctx.lineTo(-5, 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(-7, 4, 14, 3);
        ctx.fillStyle = '#795548';
        ctx.fillRect(-2, 7, 4, 6);

        ctx.restore();
      }
    }

    // 7. Draw Hero Vampire Hunter Player
    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.invulnTimer > 0 && Math.floor(player.invulnTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    if (player.dashDuration > 0) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 25;
    }

    // Flowing Crimson Cape
    const capeWarp = Math.sin(performance.now() / 150) * 5;
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    const backAngle = player.facing + Math.PI;
    const cx1 = Math.cos(backAngle) * 8;
    const cy1 = Math.sin(backAngle) * 8;
    ctx.moveTo(-6, 2);
    ctx.quadraticCurveTo(cx1 * 2 + capeWarp, cy1 * 2 + 10, cx1 * 2.8, cy1 * 2.8 + 14 + capeWarp);
    ctx.lineTo(6, 2);
    ctx.closePath();
    ctx.fill();

    // Paladin Silver Armor Body
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Golden Chest Crest
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(0, 2, 5, 0, Math.PI * 2); ctx.fill();

    // Knight Helmet / Visor with cyan glow
    ctx.fillStyle = '#0f172a';
    const vx = Math.cos(player.facing) * 7;
    const vy = Math.sin(player.facing) * 7;
    ctx.beginPath(); ctx.arc(vx, vy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 10;
    ctx.fillRect(vx - 5, vy - 2, 10, 3);
    ctx.shadowBlur = 0;

    // Held Greatsword
    const hx = Math.cos(player.facing + 0.5) * 20;
    const hy = Math.sin(player.facing + 0.5) * 20;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.stroke();

    // Player Name Tag
    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.fillText(player.username, 0, -player.radius - 8);
    ctx.restore();

    ctx.restore();

    // 8. Draw Particles (Lightning, Frost, Sparks)
    particles.forEach(pt => {
      ctx.save();
      if (pt.type === 'frost_ring') {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 229, 255, ${pt.life / 20})`;
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (pt.type === 'lightning_strike') {
        ctx.strokeStyle = '#fff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y - 400);
        ctx.lineTo(pt.x - 20, pt.y - 200);
        ctx.lineTo(pt.x + 15, pt.y - 100);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.life / 20);
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      }
      ctx.restore();
    });

    // 9. Floating Combat Text
    floatTexts.forEach(ft => {
      ctx.save();
      ctx.font = `bold ${ft.size}px monospace`;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.globalAlpha = Math.max(0, ft.life / 40);
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    ctx.restore();
  }

  function drawDungeonFloor() {
    const curStage = getCurrentStage();
    const tileSize = 64;
    const startX = Math.floor(state.camera.x / tileSize) * tileSize - tileSize;
    const startY = Math.floor(state.camera.y / tileSize) * tileSize - tileSize;
    const endX = startX + width + tileSize * 2;
    const endY = startY + height + tileSize * 2;

    ctx.strokeStyle = curStage.theme.grid;
    ctx.lineWidth = 1;

    for (let x = startX; x < endX; x += tileSize) {
      for (let y = startY; y < endY; y += tileSize) {
        ctx.strokeRect(x, y, tileSize, tileSize);
        // Stage specific floor dots & accents
        if ((x + y) % (tileSize * 4) === 0) {
          ctx.fillStyle = curStage.theme.tile;
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        }
      }
    }
  }

  // --- BUTTON EVENT LISTENERS ---
  btnOpenForge?.addEventListener('click', openBlacksmith);
  btnCloseForge?.addEventListener('click', closeBlacksmith);
  btnOpenStages?.addEventListener('click', openStagesModal);
  btnCloseStages?.addEventListener('click', closeStagesModal);
  btnScNext?.addEventListener('click', () => {
    if (modalStageClear) {
      modalStageClear.classList.remove('active');
      modalStageClear.style.display = 'none';
    }
    const nextId = Math.min(4, state.currentStageId + 1);
    startRun(nextId);
  });
  btnScContinue?.addEventListener('click', () => {
    if (modalStageClear) {
      modalStageClear.classList.remove('active');
      modalStageClear.style.display = 'none';
    }
    state.paused = false;
  });
  btnGoForge?.addEventListener('click', () => {
    modalGameover.classList.remove('active');
    openBlacksmith();
  });
  btnGoRestart?.addEventListener('click', () => startRun());

  btnPauseGame?.addEventListener('click', () => {
    if (state.running) {
      state.paused = !state.paused;
      btnPauseGame.innerHTML = state.paused ? '<span>▶️</span>' : '<span>⏸️</span>';
    }
  });

  // BGM Button Listener
  const btnBgm = document.getElementById('btn-toggle-bgm');
  btnBgm?.addEventListener('click', () => {
    SurvivorBGM.toggle();
  });

  const startBgmOnce = () => {
    SurvivorBGM.start();
    window.removeEventListener('keydown', startBgmOnce);
    window.removeEventListener('click', startBgmOnce);
  };
  window.addEventListener('keydown', startBgmOnce, { once: true });
  window.addEventListener('click', startBgmOnce, { once: true });

  // --- CHARACTER SELECTION CONTROLLER ---
  const modalCharSelect = document.getElementById('modal-char-select');
  const charCardsGrid = document.getElementById('char-cards-grid');
  const btnStartWithChar = document.getElementById('btn-start-with-char');
  const btnGoChar = document.getElementById('btn-go-char');

  function initCharacterSelect() {
    if (!charCardsGrid) return;
    charCardsGrid.innerHTML = '';

    function enterRun() {
      if (modalCharSelect) {
        modalCharSelect.classList.remove('active');
        modalCharSelect.style.display = 'none';
      }
      try {
        SurvivorBGM.start();
      } catch (_) {}
      startRun();
    }

    CHARACTERS.forEach(c => {
      const card = document.createElement('div');
      card.className = `char-card ${c.id === state.selectedCharId ? 'selected' : ''}`;
      card.setAttribute('data-char', c.id);

      const wName = UPGRADE_POOL.find(u => u.id === c.startingWeapon)?.name || 'Kutsal Silah';
      card.innerHTML = `
        <div class="char-avatar">${c.avatar}</div>
        <div class="char-name" style="color:${c.color}">${c.name}</div>
        <div class="char-title">${c.title}</div>
        <div class="char-weapon">
          <span>⚔️</span> Başlangıç: ${wName}
        </div>
        <div class="char-perks">${c.desc}</div>
        <button type="button" class="btn-card-choose">⚔️ SEÇ VE SAVAŞA GİR</button>
      `;

      card.addEventListener('click', (e) => {
        state.selectedCharId = c.id;
        document.querySelectorAll('.char-card').forEach(cd => cd.classList.remove('selected'));
        card.classList.add('selected');
        Sfx.hit();
        if (e.target.closest('.btn-card-choose')) {
          enterRun();
        }
      });

      card.addEventListener('dblclick', () => {
        state.selectedCharId = c.id;
        enterRun();
      });

      charCardsGrid.appendChild(card);
    });

    btnStartWithChar?.addEventListener('click', enterRun);

    window.addEventListener('keydown', (e) => {
      if (modalCharSelect && modalCharSelect.classList.contains('active') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        enterRun();
      }
    });

    btnGoChar?.addEventListener('click', () => {
      if (modalGameover) modalGameover.classList.remove('active');
      if (modalCharSelect) {
        modalCharSelect.style.display = 'flex';
        modalCharSelect.classList.add('active');
      }
    });
  }

  // Initialize character selector
  initCharacterSelect();

  // Show Character Select on start, do NOT start run until hero selected!
  if (modalCharSelect) {
    modalCharSelect.style.display = 'flex';
    modalCharSelect.classList.add('active');
  }
  requestAnimationFrame(gameLoop);

})();
