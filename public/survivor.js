// survivor.js - Zindan Avcısı (Vampire Survivors RPG Grinder)
(function() {
  'use strict';

  // --- AUDIO SYNTHESIZER ---
  const Sfx = {
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
    }
  };

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
    }
  ];

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
    activeBoss: null
  };

  // Player
  const player = {
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
      might: 0
    },
    // Timers
    fireballTimer: 0,
    lightningTimer: 0,
    frostnovaTimer: 0,
    holyauraTimer: 0,
    regenTimer: 0
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

  // Input Listeners
  window.addEventListener('keydown', e => {
    state.keys[e.key.toLowerCase()] = true;
    if (e.code === 'Space' || e.key === ' ') {
      tryDash();
    }
  });

  window.addEventListener('keyup', e => {
    state.keys[e.key.toLowerCase()] = false;
  });

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
  function startRun() {
    state.running = true;
    state.paused = false;
    state.time = 0;
    state.kills = 0;
    state.goldEarned = 0;
    state.activeBoss = null;
    bossBarWrap.style.display = 'none';

    // Calculate stats from forge upgrades
    const hpBonus = forgeRanks.maxHp * FORGE_CONFIG.find(c => c.id === 'maxHp').valPerRank;
    const speedBonus = 1 + (forgeRanks.speed * FORGE_CONFIG.find(c => c.id === 'speed').valPerRank);
    const reviveCount = forgeRanks.revive;

    player.x = 0;
    player.y = 0;
    player.maxHp = 100 + hpBonus;
    player.hp = player.maxHp;
    player.speed = 3.6 * speedBonus;
    player.level = 1;
    player.xp = 0;
    player.xpNeeded = 10;
    player.revivesLeft = reviveCount;
    player.dashCd = 0;
    player.dashDuration = 0;
    player.invulnTimer = 0;

    // Reset in-run skills
    for (const key of Object.keys(player.skills)) {
      player.skills[key] = (key === 'swords') ? 1 : 0;
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
  }

  // --- SPAWNING SYSTEM (WAVES & PROGRESSION) ---
  let spawnTimer = 0;
  function updateSpawning() {
    spawnTimer++;
    // Spawn rate increases over time
    const interval = Math.max(15, Math.floor(60 - Math.min(45, state.time / 8)));

    if (spawnTimer >= interval) {
      spawnTimer = 0;
      const count = 1 + Math.floor(state.time / 60);
      for (let i = 0; i < count; i++) {
        spawnRegularEnemy();
      }
    }

    // Boss spawns
    if (Math.floor(state.time) === 60 && !state.boss1Spawned) {
      state.boss1Spawned = true;
      spawnBoss('Kemik Lordu (Giant Skeleton King)', 1800, 32, '#22c55e', 1.8, 600, 'skeleton_king');
    } else if (Math.floor(state.time) === 150 && !state.boss2Spawned) {
      state.boss2Spawned = true;
      spawnBoss('Vampir Kont Drakula', 4200, 36, '#dc2626', 2.2, 1400, 'dracula');
    } else if (Math.floor(state.time) === 270 && !state.boss3Spawned) {
      state.boss3Spawned = true;
      spawnBoss('Cehennem Zebanisi (Cerberus)', 8000, 42, '#f97316', 2.5, 2600, 'cerberus');
    } else if (Math.floor(state.time) === 420 && !state.boss4Spawned) {
      state.boss4Spawned = true;
      spawnBoss('Kadim Azrail (The Grim Reaper)', 16000, 46, '#7c3aed', 2.8, 5000, 'reaper');
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
  }

  function shootFireballs(dmgMult) {
    if (enemies.length === 0) return;
    // Find closest enemies
    const sorted = [...enemies].sort((a, b) => {
      const d1 = (a.x - player.x)**2 + (a.y - player.y)**2;
      const d2 = (b.x - player.x)**2 + (b.y - player.y)**2;
      return d1 - d2;
    });

    const count = 1 + Math.floor(player.skills.fireball / 2);
    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      const target = sorted[i];
      const angle = Math.atan2(target.y - player.y, target.x - player.x);
      projectiles.push({
        type: 'fireball',
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 7,
        vy: Math.sin(angle) * 7,
        radius: 12 + player.skills.fireball * 2,
        damage: Math.round((28 + player.skills.fireball * 14) * dmgMult),
        splashRadius: 60 + player.skills.fireball * 15,
        life: 120,
        color: '#ff3d00'
      });
    }
    Sfx.fireball();
  }

  function castLightning(dmgMult) {
    if (enemies.length === 0) return;
    const strikes = 1 + player.skills.lightning;
    const targets = [];
    for (let i = 0; i < strikes; i++) {
      const e = enemies[Math.floor(Math.random() * enemies.length)];
      if (e && !targets.includes(e)) targets.push(e);
    }

    targets.forEach(t => {
      const dmg = Math.round((45 + player.skills.lightning * 20) * dmgMult);
      damageEnemy(t, dmg, true);
      Sfx.lightning();
      // Lightning bolt visual effect
      particles.push({
        type: 'lightning_strike',
        x: t.x,
        y: t.y,
        life: 12
      });
    });
  }

  function castFrostNova(dmgMult) {
    const range = 140 + player.skills.frostnova * 25;
    const dmg = Math.round((20 + player.skills.frostnova * 10) * dmgMult);
    Sfx.playTone(600, 'sine', 0.2, 0.1);

    enemies.forEach(e => {
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist <= range) {
        damageEnemy(e, dmg, false);
        e.speed *= 0.4;
        setTimeout(() => { e.speed /= 0.4; }, 2000);
      }
    });

    particles.push({
      type: 'frost_ring',
      x: player.x,
      y: player.y,
      radius: 10,
      maxRadius: range,
      life: 20
    });
  }

  function pulseHolyAura(dmgMult) {
    const range = 80 + player.skills.holyaura * 18;
    const dmg = Math.round((8 + player.skills.holyaura * 4) * dmgMult);

    enemies.forEach(e => {
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist <= range) {
        damageEnemy(e, dmg, false);
      }
    });
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
      const g = Math.round(e.goldVal * greedBonus);
      state.goldEarned += g;
      persistentGold += g;
      saveGold();
      addFloatText(e.x, e.y - 30, `+${g} 🪙`, '#ffd54f', 24);
      Sfx.chest();
      state.screenShake = 15;
      bossBarWrap.style.display = 'none';
      state.activeBoss = null;
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

  // --- XP & LEVEL UP ---
  function addXP(amount) {
    player.xp += amount;
    if (player.xp >= player.xpNeeded) {
      player.xp -= player.xpNeeded;
      player.level++;
      player.xpNeeded = Math.floor(player.xpNeeded * 1.35) + 5;
      triggerLevelUp();
    }
    updateHUD();
  }

  function triggerLevelUp() {
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

    levelupCardsGrid.innerHTML = '';
    chosen.forEach(upgrade => {
      const curLvl = player.skills[upgrade.id] || 0;
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="card-icon">${upgrade.icon}</div>
        <div class="card-title">${upgrade.name}</div>
        <div class="card-type type-${upgrade.type}">${upgrade.typeName}</div>
        <div class="card-desc">${upgrade.desc}</div>
        <div class="card-level-preview">${upgrade.getPreview(curLvl)}</div>
      `;

      card.addEventListener('click', () => {
        applyUpgrade(upgrade.id);
        modalLevelup.classList.remove('active');
        state.paused = false;
      });

      levelupCardsGrid.appendChild(card);
    });

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
    const finalDmg = Math.max(1, Math.round(dmg * (1 - armorReduction)));

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

      // 4. Update Enemies
      enemies.forEach(e => {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
          e.x += (dx / dist) * e.speed;
          e.y += (dy / dist) * e.speed;
        }

        if (e.hitFlash > 0) e.hitFlash--;

        // Collision with player
        if (dist < player.radius + e.radius) {
          hurtPlayer(e.dmg || (e.isBoss ? 28 : 8));
        }
      });

      // 5. Update Projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        // Check hits with enemies
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          const dist = Math.hypot(e.x - p.x, e.y - p.y);
          if (dist < e.radius + p.radius) {
            // Splash damage
            enemies.forEach(target => {
              const d = Math.hypot(target.x - p.x, target.y - p.y);
              if (d <= p.splashRadius) {
                damageEnemy(target, p.damage, false);
              }
            });

            // Explosion particles
            for (let k = 0; k < 12; k++) {
              particles.push({
                x: p.x,
                y: p.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 25,
                color: p.color,
                size: 4
              });
            }

            p.life = 0;
            break;
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

          enemies.forEach(e => {
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

      updateHUD();
    }

    // --- RENDER ---
    render();
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
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.restore();
    });

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
    ctx.lineTo(hx + Math.cos(player.facing) * 16, hy + Math.sin(player.facing) * 16);
    ctx.stroke();

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
    const tileSize = 64;
    const startX = Math.floor(state.camera.x / tileSize) * tileSize - tileSize;
    const startY = Math.floor(state.camera.y / tileSize) * tileSize - tileSize;
    const endX = startX + width + tileSize * 2;
    const endY = startY + height + tileSize * 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    for (let x = startX; x < endX; x += tileSize) {
      for (let y = startY; y < endY; y += tileSize) {
        ctx.strokeRect(x, y, tileSize, tileSize);
        // Subtle dungeon stone dots
        if ((x + y) % (tileSize * 4) === 0) {
          ctx.fillStyle = 'rgba(0, 219, 255, 0.03)';
          ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        }
      }
    }
  }

  // --- BUTTON EVENT LISTENERS ---
  btnOpenForge?.addEventListener('click', openBlacksmith);
  btnCloseForge?.addEventListener('click', closeBlacksmith);
  btnGoForge?.addEventListener('click', () => {
    modalGameover.classList.remove('active');
    openBlacksmith();
  });
  btnGoRestart?.addEventListener('click', startRun);

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

  // Start initial run
  startRun();
  requestAnimationFrame(gameLoop);

})();
