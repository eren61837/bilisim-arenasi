// miner.js - Maden Ustası (Deep Earth Miner & Forge RPG)
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
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + duration);
      } catch (_) {}
    },
    drill() {
      this.playTone(80 + Math.random() * 40, 'sawtooth', 0.05, 0.08);
    },
    jetpack() {
      this.playTone(110 + Math.random() * 20, 'triangle', 0.04, 0.04);
    },
    coin() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12); // E6
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.15);
      } catch (_) {}
    },
    chest() {
      try {
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            this.playTone(freq, 'triangle', 0.2, 0.1);
          }, idx * 60);
        });
      } catch (_) {}
    },
    explode() {
      this.playTone(60, 'sawtooth', 0.35, 0.25);
    },
    alarm() {
      this.playTone(650, 'square', 0.15, 0.1);
    }
  };

  // --- RETRO SYNTHWAVE BGM GENERATOR (WEB AUDIO) ---
  const MinerBGM = {
    ctx: null,
    isPlaying: false,
    intervalId: null,
    step: 0,
    bassline: [110, 110, 130.81, 146.83, 110, 110, 98, 123.47],
    melody: [220, 261.63, 293.66, 329.63, 392.00, 329.63, 293.66, 261.63],
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
      this.intervalId = setInterval(() => this.tick(), 190);
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
      const txt = document.getElementById('bgm-status-text');
      const btn = document.getElementById('btn-toggle-bgm');
      if (txt) txt.textContent = active ? 'Müzik: AÇIK' : 'Müzik: KAPALI';
      if (btn) btn.style.color = active ? 'var(--cyan)' : 'var(--text-muted)';
    },
    tick() {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      const bassNote = this.bassline[this.step % this.bassline.length];
      const melNote = this.melody[Math.floor(this.step / 2) % this.melody.length];

      try {
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(bassNote, now);
        gain1.gain.setValueAtTime(0.04, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.17);

        if (this.step % 2 === 0) {
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(melNote, now);
          gain2.gain.setValueAtTime(0.03, now);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          osc2.connect(gain2);
          gain2.connect(this.ctx.destination);
          osc2.start(now);
          osc2.stop(now + 0.32);
        }
      } catch (_) {}

      this.step++;
    }
  };

  // --- ORE DEFINITIONS ---
  const ORES = {
    coal:      { name: 'Kömür',           icon: '🪨', color: '#374151', value: 18,   weight: 1, minDepth: 10,  maxDepth: 120, chance: 0.12 },
    copper:    { name: 'Bakır',           icon: '🟧', color: '#d97706', value: 45,   weight: 2, minDepth: 30,  maxDepth: 220, chance: 0.10 },
    iron:      { name: 'Demir',           icon: '⚪', color: '#94a3b8', value: 95,   weight: 2, minDepth: 80,  maxDepth: 380, chance: 0.09 },
    silver:    { name: 'Gümüş',           icon: '🥈', color: '#e2e8f0', value: 220,  weight: 3, minDepth: 160, maxDepth: 550, chance: 0.07 },
    gold:      { name: 'Altın',           icon: '🟡', color: '#ffd54f', value: 550,  weight: 3, minDepth: 280, maxDepth: 720, chance: 0.06 },
    ruby:      { name: 'Yakut',           icon: '🔴', color: '#ef4444', value: 1400, weight: 4, minDepth: 420, maxDepth: 850, chance: 0.045 },
    emerald:   { name: 'Zümrüt',          icon: '🟢', color: '#10b981', value: 3200, weight: 4, minDepth: 580, maxDepth: 940, chance: 0.035 },
    diamond:   { name: 'Elmas',           icon: '💎', color: '#00e5ff', value: 7500, weight: 5, minDepth: 720, maxDepth: 1000, chance: 0.025 },
    netherite: { name: 'Antik Netherite', icon: '🟣', color: '#a855f7', value: 25000,weight: 6, minDepth: 860, maxDepth: 1000, chance: 0.015 }
  };

  // --- UPGRADE TIERS CONFIG ---
  const UPGRADES_CONFIG = {
    drill: {
      name: 'Matkap Seviyesi',
      icon: '⛏️',
      desc: 'Sert kayaları parçalama hızı ve delme gücü.',
      tiers: [
        { name: 'Paslı Kazma', power: 1.0, cost: 0 },
        { name: 'Çelik Darbeli Matkap', power: 2.2, cost: 150 },
        { name: 'Titanyum Karbür Uç', power: 4.5, cost: 650 },
        { name: 'Elmas Kesici Bıçak', power: 8.0, cost: 2200 },
        { name: 'Kuantum Lazer Matkap', power: 15.0, cost: 8500 },
        { name: 'Plazma Ayrıştırıcı', power: 30.0, cost: 35000 }
      ]
    },
    cargo: {
      name: 'Kargo / Sırt Çantası',
      icon: '🎒',
      desc: 'Maksimum taşınabilir cevher ağırlık kapasitesi.',
      tiers: [
        { name: 'Bez Torba (25 kg)', maxWeight: 25, cost: 0 },
        { name: 'Güçlendirilmiş Sırt Çantası (60 kg)', maxWeight: 60, cost: 100 },
        { name: 'Çelik Kargo Sandığı (150 kg)', maxWeight: 150, cost: 450 },
        { name: 'Manyetik Kargo Kasası (350 kg)', maxWeight: 350, cost: 1600 },
        { name: 'Nano-Sıkıştırmalı Depo (800 kg)', maxWeight: 800, cost: 6000 },
        { name: 'Kuantum Boyutsal Çanta (2500 kg)', maxWeight: 2500, cost: 25000 }
      ]
    },
    fuelTank: {
      name: 'Jetpack & Yakıt Deposu',
      icon: '⛽',
      desc: 'Daha büyük yakıt haznesi ve daha güçlü roket itişi.',
      tiers: [
        { name: 'Mini Depo (60 L)', maxFuel: 60, thrust: 0.28, cost: 0 },
        { name: 'Basınçlı Depo (120 L)', maxFuel: 120, thrust: 0.32, cost: 120 },
        { name: 'Çift Yakıt Haznesi (250 L)', maxFuel: 250, thrust: 0.36, cost: 500 },
        { name: 'Plazma İticisi (550 L)', maxFuel: 550, thrust: 0.40, cost: 1800 },
        { name: 'İyonik Reaktif Motor (1200 L)', maxFuel: 1200, thrust: 0.45, cost: 7000 },
        { name: 'Antimadde Çekirdeği (3000 L)', maxFuel: 3000, thrust: 0.50, cost: 30000 }
      ]
    },
    hull: {
      name: 'Gövde & Isı Kalkanı',
      icon: '🛡️',
      desc: 'Düşen kayalara, lav sıcaklığına ve darbelere dayanıklılık.',
      tiers: [
        { name: 'Standart Gövde (100 HP)', maxHp: 100, cost: 0 },
        { name: 'Takviyeli Çelik Plaka (220 HP)', maxHp: 220, cost: 120 },
        { name: 'Termal Seramik Kaplama (480 HP)', maxHp: 480, cost: 550 },
        { name: 'Titanyum Zırh Kasası (1000 HP)', maxHp: 1000, cost: 2000 },
        { name: 'Elmas Kompozit Gövde (2200 HP)', maxHp: 2200, cost: 7500 },
        { name: 'Nether Zırhı & Lav Bağışıklığı (5000 HP)', maxHp: 5000, cost: 32000 }
      ]
    },
    radar: {
      name: 'Maden Radarı & Aydınlatma',
      icon: '📡',
      desc: 'Karanlık katmanlarda daha uzağı görme ve değerli cevherleri tespit.',
      tiers: [
        { name: 'Kafalık Feneri (Görüş: 4 Blok)', lightRadius: 160, cost: 0 },
        { name: 'Halojen Projektör (Görüş: 6 Blok)', lightRadius: 240, cost: 150 },
        { name: 'Sismik Algılayıcı (Görüş: 8 Blok)', lightRadius: 320, cost: 600 },
        { name: 'Jeotermal Spektrometre (Görüş: 11 Blok)', lightRadius: 440, cost: 2200 },
        { name: 'Kuantum Yeraltı Radarı (Görüş: 15 Blok)', lightRadius: 600, cost: 9000 }
      ]
    },
    drones: {
      name: 'Oto-Madenci Drone Filosu',
      icon: '🤖',
      desc: 'Sen madendeyken senin için yüzeyde otomatik para toplayan robotlar.',
      tiers: [
        { name: 'Drone Yok (0 Adet)', count: 0, income: 0, cost: 0 },
        { name: '1x Madenci Drone (+20 TL/5s)', count: 1, income: 20, cost: 300 },
        { name: '2x Madenci Drone (+50 TL/5s)', count: 2, income: 50, cost: 900 },
        { name: '3x Madenci Drone (+120 TL/5s)', count: 3, income: 120, cost: 2800 },
        { name: '4x Madenci Drone (+280 TL/5s)', count: 4, income: 280, cost: 8500 },
        { name: '5x Madenci Drone Filosu (+600 TL/5s)', count: 5, income: 600, cost: 25000 }
      ]
    }
  };

  // --- SAVE / LOAD DATA ---
  function loadGame() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem('miner_save_v1'));
    } catch (_) {}

    const defaultUpgrades = { drill: 0, cargo: 0, fuelTank: 0, hull: 0, radar: 0, drones: 0 };
    const defaultInventory = { coal: 0, copper: 0, iron: 0, silver: 0, gold: 0, ruby: 0, emerald: 0, diamond: 0, netherite: 0 };

    if (!saved || typeof saved !== 'object') {
      saved = {
        cash: 50,
        upgrades: defaultUpgrades,
        inventory: defaultInventory,
        deepestDepth: 0,
        totalSold: 0
      };
    } else {
      // Defensive migration: ensure every key exists
      saved.cash = typeof saved.cash === 'number' ? saved.cash : 50;
      saved.upgrades = Object.assign({}, defaultUpgrades, saved.upgrades || {});
      saved.inventory = Object.assign({}, defaultInventory, saved.inventory || {});
      saved.deepestDepth = saved.deepestDepth || 0;
      saved.totalSold = saved.totalSold || 0;
    }
    return saved;
  }

  const saveData = loadGame();

  function persistSave() {
    localStorage.setItem('miner_save_v1', JSON.stringify(saveData));
  }

  // --- WORLD GRID (0m to 1000m) ---
  const COLS = 36;
  const ROWS = 500; // Each row is 2 meters -> 1000m total depth!
  const BLOCK_SIZE = 40; // 40px x 40px
  const WORLD_WIDTH = COLS * BLOCK_SIZE; // 1440px
  const WORLD_HEIGHT = ROWS * BLOCK_SIZE;

  // Grid blocks: null (air) or block object
  const grid = new Array(ROWS);

  function generateWorld() {
    for (let r = 0; r < ROWS; r++) {
      grid[r] = new Array(COLS);
      const depthMeters = Math.round(r * 2);

      for (let c = 0; c < COLS; c++) {
        // Surface rows 0 to 4 are sky / air
        if (r < 5) {
          grid[r][c] = null;
          continue;
        }

        // Determine rock type & base hardness based on depth
        let type = 'dirt';
        let hardness = 1.0;
        let color = '#5d4037';

        if (depthMeters <= 100) {
          type = 'dirt';
          hardness = 1.2;
          color = '#5d4037';
        } else if (depthMeters <= 280) {
          type = 'stone';
          hardness = 2.4;
          color = '#455a64';
        } else if (depthMeters <= 550) {
          type = 'granite';
          hardness = 4.2;
          color = '#37474f';
        } else if (depthMeters <= 820) {
          type = 'obsidian';
          hardness = 7.5;
          color = '#212121';
        } else {
          type = 'netherrack';
          hardness = 12.0;
          color = '#3e1515';
        }

        // Hazard checks: TNT (1%), Lava (below 400m 2%), Chests (0.5%), Caves (air pockets 6%)
        const rand = Math.random();

        if (rand < 0.05 && depthMeters > 50) {
          grid[r][c] = null; // Natural cave
          continue;
        }

        let hazard = null;
        if (rand > 0.985 && depthMeters > 350) {
          hazard = 'lava';
        } else if (rand > 0.978 && depthMeters > 80) {
          hazard = 'tnt';
        } else if (rand > 0.993) {
          hazard = 'chest';
        }

        // Ore generation
        let ore = null;
        if (!hazard) {
          for (const [key, o] of Object.entries(ORES)) {
            if (depthMeters >= o.minDepth && depthMeters <= o.maxDepth) {
              if (Math.random() < o.chance) {
                ore = key;
                break;
              }
            }
          }
        }

        grid[r][c] = {
          type,
          ore,
          hazard,
          hp: hardness,
          maxHp: hardness,
          baseColor: color
        };
      }
    }
  }

  generateWorld();

  // --- PLAYER STATUS ---
  const canvas = document.getElementById('miner-canvas');
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const player = {
    x: WORLD_WIDTH / 2,
    y: 3 * BLOCK_SIZE, // Surface
    w: 32,
    h: 32,
    vx: 0,
    vy: 0,
    fuel: 100,
    hp: 100,
    isDigging: false,
    digCol: -1,
    digRow: -1,
    facing: 1 // 1: right, -1: left
  };

  const camera = { x: 0, y: 0 };
  const keys = {};
  let particles = [];
  let floatTexts = [];
  let screenShake = 0;

  // DOM Elements
  const hudCash = document.getElementById('hud-cash');
  const hudFuelFill = document.getElementById('hud-fuel-fill');
  const hudFuelText = document.getElementById('hud-fuel-text');
  const hudHullFill = document.getElementById('hud-hull-fill');
  const hudHullText = document.getElementById('hud-hull-text');
  const hudDepthText = document.getElementById('hud-depth-text');
  const hudCargoText = document.getElementById('hud-cargo-text');

  const surfacePrompt = document.getElementById('surface-prompt');
  const droneCountText = document.getElementById('drone-count-text');
  const droneIncomeText = document.getElementById('drone-income-text');

  const btnOpenMarket = document.getElementById('btn-open-market');
  const btnOpenForge = document.getElementById('btn-open-forge');
  const btnSurfaceTeleport = document.getElementById('btn-surface-teleport');

  const modalMarket = document.getElementById('modal-market');
  const marketOresGrid = document.getElementById('market-ores-grid');
  const marketTotalValue = document.getElementById('market-total-value');
  const marketCashDisplay = document.getElementById('market-cash-display');
  const btnSellAllOres = document.getElementById('btn-sell-all-ores');
  const btnCloseMarket = document.getElementById('btn-close-market');

  const modalForge = document.getElementById('modal-forge');
  const minerUpgradesGrid = document.getElementById('miner-upgrades-grid');
  const forgeCashDisplay = document.getElementById('forge-cash-display');
  const btnCloseForge = document.getElementById('btn-close-forge');

  const modalRescue = document.getElementById('modal-rescue');
  const rescueCauseText = document.getElementById('rescue-cause-text');
  const rescueCostText = document.getElementById('rescue-cost-text');
  const btnConfirmRescue = document.getElementById('btn-confirm-rescue');

  // Input Listeners
  window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'm' && getPlayerDepthMeters() <= 5) openMarket();
    if (e.key.toLowerCase() === 'b' && getPlayerDepthMeters() <= 5) openForge();
    if (e.key.toLowerCase() === 'r' && getPlayerDepthMeters() <= 5) refillSurfaceStation();
  });

  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });

  // Helper getters (Safe fallbacks for all upgrade tiers)
  function getDrillPower() {
    const t = UPGRADES_CONFIG.drill.tiers[saveData.upgrades?.drill || 0] || UPGRADES_CONFIG.drill.tiers[0];
    return t.power;
  }
  function getMaxCargo() {
    const t = UPGRADES_CONFIG.cargo.tiers[saveData.upgrades?.cargo || 0] || UPGRADES_CONFIG.cargo.tiers[0];
    return t.maxWeight;
  }
  function getMaxFuel() {
    const t = UPGRADES_CONFIG.fuelTank.tiers[saveData.upgrades?.fuelTank || 0] || UPGRADES_CONFIG.fuelTank.tiers[0];
    return t.maxFuel;
  }
  function getThrust() {
    const t = UPGRADES_CONFIG.fuelTank.tiers[saveData.upgrades?.fuelTank || 0] || UPGRADES_CONFIG.fuelTank.tiers[0];
    return t.thrust;
  }
  function getMaxHp() {
    const t = UPGRADES_CONFIG.hull.tiers[saveData.upgrades?.hull || 0] || UPGRADES_CONFIG.hull.tiers[0];
    return t.maxHp;
  }
  function getLightRadius() {
    const t = UPGRADES_CONFIG.radar.tiers[saveData.upgrades?.radar || 0] || UPGRADES_CONFIG.radar.tiers[0];
    return t.lightRadius;
  }
  function getPlayerDepthMeters() {
    const raw = Math.round(((player.y - 4 * BLOCK_SIZE) / BLOCK_SIZE) * 2);
    return Math.max(0, raw);
  }

  function getCargoCurrentWeight() {
    let total = 0;
    for (const [key, count] of Object.entries(saveData.inventory)) {
      if (ORES[key]) total += count * ORES[key].weight;
    }
    return total;
  }

  // Initialize fuel & hp
  player.fuel = getMaxFuel();
  player.hp = getMaxHp();

  // --- AUTOMATED MINING DRONES LOOP ---
  setInterval(() => {
    const droneTier = UPGRADES_CONFIG.drones.tiers[saveData.upgrades.drones];
    if (droneTier.income > 0) {
      saveData.cash += droneTier.income;
      saveData.totalSold += droneTier.income;
      persistSave();
      addFloatText(player.x, player.y - 30, `+${droneTier.income} TL 🤖`, '#00dbff', 15);
      Sfx.coin();
      updateHUD();
    }
  }, 5000);

  // --- SURFACE GAS / REPAIR STATION ---
  function refillSurfaceStation() {
    player.fuel = getMaxFuel();
    player.hp = getMaxHp();
    Sfx.coin();
    addFloatText(player.x, player.y - 40, '⛽ YAKIT VE GÖVDE FULLENDİ!', '#00e676', 20);
    updateHUD();
  }

  // --- RESCUE MECHANIC ---
  function triggerRescue(reason) {
    rescueCauseText.textContent = reason;
    const cost = Math.min(saveData.cash, 60 + Math.round(getPlayerDepthMeters() * 0.4));
    rescueCostText.textContent = `${cost} TL`;

    btnConfirmRescue.onclick = () => {
      saveData.cash = Math.max(0, saveData.cash - cost);
      player.x = WORLD_WIDTH / 2;
      player.y = 3 * BLOCK_SIZE;
      player.vx = 0;
      player.vy = 0;
      player.fuel = getMaxFuel();
      player.hp = getMaxHp();
      persistSave();
      modalRescue.classList.remove('active');
      updateHUD();
      addFloatText(player.x, player.y - 30, '🚁 GÜVENLE YÜZEYE GETİRİLDİN', '#00dbff', 18);
    };

    modalRescue.classList.add('active');
  }

  // --- MAIN SIMULATION LOOP ---
  let lastTime = performance.now();
  function gameLoop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    updatePlayer();
    render();

    requestAnimationFrame(gameLoop);
  }

  function updatePlayer() {
    const depth = getPlayerDepthMeters();
    const isSurface = depth <= 4;

    // Show/hide surface prompt badge
    if (isSurface) {
      surfacePrompt.style.display = 'block';
      // Free auto-refuel at surface
      if (player.fuel < getMaxFuel()) player.fuel = Math.min(getMaxFuel(), player.fuel + 0.5);
      if (player.hp < getMaxHp()) player.hp = Math.min(getMaxHp(), player.hp + 0.5);
    } else {
      surfacePrompt.style.display = 'none';
    }

    // 1. Horizontal Movement & Digging
    let moveX = 0;
    if (keys['a'] || keys['arrowleft']) {
      moveX = -1;
      player.facing = -1;
    }
    if (keys['d'] || keys['arrowright']) {
      moveX = 1;
      player.facing = 1;
    }

    // 2. Jetpack Thrusters
    let isThrusting = false;
    if ((keys['w'] || keys['arrowup'] || keys[' ']) && player.fuel > 0) {
      isThrusting = true;
      player.vy -= getThrust();
      player.fuel = Math.max(0, player.fuel - 0.12);
      Sfx.jetpack();

      // Thrust flame particles
      particles.push({
        x: player.x + (player.facing === 1 ? -6 : 6),
        y: player.y + player.h / 2,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 3 + Math.random() * 2,
        life: 15,
        color: Math.random() > 0.5 ? '#ff9100' : '#ffd54f',
        size: 3
      });
    }

    // Gravity
    player.vy += 0.22;
    if (player.vy > 8) player.vy = 8;

    // Apply horizontal speed
    player.vx = moveX * 3.2;

    // Apply X movement and block collision
    player.x += player.vx;
    handleHorizontalCollision(moveX);

    // Apply Y movement and vertical collision/digging
    player.y += player.vy;
    handleVerticalCollision();

    // Dig downwards if pressing Down
    if (keys['s'] || keys['arrowdown']) {
      tryDigBelow();
    }

    // Check bounds
    if (player.x < 16) player.x = 16;
    if (player.x > WORLD_WIDTH - 16) player.x = WORLD_WIDTH - 16;
    if (player.y < 0) player.y = 0;

    // Track deepest depth record
    if (depth > saveData.deepestDepth) {
      saveData.deepestDepth = depth;
      persistSave();
    }

    // Emergency condition checks
    if (player.hp <= 0) {
      triggerRescue('Kapsülün gövde zırhı tamamen parçalandı!');
    } else if (player.fuel <= 0 && depth > 50 && Math.abs(player.vy) < 0.1) {
      // Out of fuel stuck deep underground
      triggerRescue('Yerin derinliklerinde yakıtın bitti ve mahsur kaldın!');
    }

    // Decay screenshake
    if (screenShake > 0) screenShake *= 0.88;
    if (screenShake < 0.2) screenShake = 0;

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life--;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    // Update Floating texts
    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const ft = floatTexts[i];
      ft.y += ft.vy;
      ft.life--;
      if (ft.life <= 0) floatTexts.splice(i, 1);
    }

    // Smooth Camera Follow
    camera.x += (player.x - width / 2 - camera.x) * 0.1;
    camera.y += (player.y - height / 2 - camera.y) * 0.1;

    // Clamp Camera bounds (Center world on wide screens, clamp otherwise)
    if (width >= WORLD_WIDTH) {
      camera.x = (WORLD_WIDTH - width) / 2;
    } else {
      if (camera.x < 0) camera.x = 0;
      if (camera.x > WORLD_WIDTH - width) camera.x = WORLD_WIDTH - width;
    }
    if (camera.y < 0) camera.y = 0;

    updateHUD();
  }

  // --- COLLISION & DIGGING ENGINE ---
  function handleHorizontalCollision(dir) {
    if (dir === 0) return;

    const checkX = dir > 0 ? player.x + player.w / 2 : player.x - player.w / 2;
    const col = Math.floor(checkX / BLOCK_SIZE);
    const row = Math.floor(player.y / BLOCK_SIZE);

    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      const block = grid[row][col];
      if (block) {
        // Block is blocking player; push player out
        if (dir > 0) player.x = col * BLOCK_SIZE - player.w / 2;
        else player.x = (col + 1) * BLOCK_SIZE + player.w / 2;

        // Drill the block sideways
        drillBlock(row, col);
      }
    }
  }

  function handleVerticalCollision() {
    const col = Math.floor(player.x / BLOCK_SIZE);

    // Falling down
    if (player.vy > 0) {
      const bottomY = player.y + player.h / 2;
      const row = Math.floor(bottomY / BLOCK_SIZE);

      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        const block = grid[row][col];
        if (block) {
          player.y = row * BLOCK_SIZE - player.h / 2;
          // Fall damage if slamming too fast
          if (player.vy > 6.5) {
            const fallDmg = Math.round((player.vy - 6.5) * 15);
            player.hp = Math.max(0, player.hp - fallDmg);
            screenShake = 12;
            Sfx.explode();
            addFloatText(player.x, player.y - 25, `-${fallDmg} HP Sert İniş!`, '#ff1744', 16);
          }
          player.vy = 0;
        }
      }
    }
    // Flying up into a ceiling block
    else if (player.vy < 0) {
      const topY = player.y - player.h / 2;
      const row = Math.floor(topY / BLOCK_SIZE);

      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        const block = grid[row][col];
        if (block) {
          player.y = (row + 1) * BLOCK_SIZE + player.h / 2;
          player.vy = 0;
        }
      }
    }
  }

  function tryDigBelow() {
    const col = Math.floor(player.x / BLOCK_SIZE);
    const row = Math.floor((player.y + player.h / 2 + 6) / BLOCK_SIZE);

    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      if (grid[row][col]) {
        drillBlock(row, col);
      }
    }
  }

  function drillBlock(row, col) {
    const block = grid[row][col];
    if (!block) return;

    const power = getDrillPower();
    block.hp -= power * 0.08;
    player.fuel = Math.max(0, player.fuel - 0.02);
    Sfx.drill();

    // Drilling particles
    particles.push({
      x: (col + 0.5) * BLOCK_SIZE + (Math.random() - 0.5) * 16,
      y: (row + 0.5) * BLOCK_SIZE + (Math.random() - 0.5) * 16,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3,
      life: 12,
      color: block.ore ? ORES[block.ore].color : block.baseColor,
      size: 4
    });

    if (block.hp <= 0) {
      breakBlock(row, col, block);
    }
  }

  function breakBlock(row, col, block) {
    grid[row][col] = null;
    screenShake = 4;

    // Check hazards
    if (block.hazard === 'tnt') {
      triggerTntExplosion(row, col);
      return;
    } else if (block.hazard === 'lava') {
      player.hp = Math.max(0, player.hp - 35);
      screenShake = 15;
      Sfx.alarm();
      addFloatText(player.x, player.y - 30, '🌋 LAV TEMASI! -35 HP', '#ff1744', 20);
      return;
    } else if (block.hazard === 'chest') {
      const reward = 500 + Math.round(getPlayerDepthMeters() * 15 + Math.random() * 800);
      saveData.cash += reward;
      persistSave();
      Sfx.chest();
      screenShake = 10;
      addFloatText((col + 0.5) * BLOCK_SIZE, (row + 0.5) * BLOCK_SIZE, `🎁 KADİM SANDIK: +${reward} TL!`, '#ffd54f', 22);
      return;
    }

    // Collect Ore
    if (block.ore) {
      const oreInfo = ORES[block.ore];
      const curWeight = getCargoCurrentWeight();
      const maxWeight = getMaxCargo();

      if (curWeight + oreInfo.weight <= maxWeight) {
        saveData.inventory[block.ore] = (saveData.inventory[block.ore] || 0) + 1;
        persistSave();
        Sfx.coin();
        addFloatText((col + 0.5) * BLOCK_SIZE, (row + 0.5) * BLOCK_SIZE, `+1 ${oreInfo.icon} ${oreInfo.name}`, oreInfo.color, 16);
      } else {
        Sfx.alarm();
        addFloatText((col + 0.5) * BLOCK_SIZE, (row + 0.5) * BLOCK_SIZE, '🎒 ÇANTA DOLU!', '#ff1744', 18);
      }
    }
  }

  function triggerTntExplosion(centerRow, centerCol) {
    Sfx.explode();
    screenShake = 22;
    addFloatText((centerCol + 0.5) * BLOCK_SIZE, (centerRow + 0.5) * BLOCK_SIZE, '💥 DİNAMİT PATLAMASI!', '#ff9100', 24);

    for (let r = centerRow - 1; r <= centerRow + 1; r++) {
      for (let c = centerCol - 1; c <= centerCol + 1; c++) {
        if (r >= 5 && r < ROWS && c >= 0 && c < COLS) {
          const b = grid[r][c];
          if (b) {
            if (b.ore) {
              saveData.inventory[b.ore] = (saveData.inventory[b.ore] || 0) + 1;
            }
            grid[r][c] = null;
          }
        }
      }
    }
    persistSave();
  }

  // --- RENDER FUNCTION ---
  function render() {
    ctx.save();
    // Fill complete canvas with deep underground space background
    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, width, height);

    if (screenShake > 0) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
    }

    ctx.translate(-camera.x, -camera.y);

    // 1. Draw Surface Sky & Town Buildings
    drawSurface();

    // 2. Draw Visible Underground Blocks
    const startCol = Math.max(0, Math.floor(camera.x / BLOCK_SIZE));
    const endCol = Math.min(COLS - 1, Math.ceil((camera.x + width) / BLOCK_SIZE));
    const startRow = Math.max(5, Math.floor(camera.y / BLOCK_SIZE));
    const endRow = Math.min(ROWS - 1, Math.ceil((camera.y + height) / BLOCK_SIZE));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const block = grid[r][c];
        if (!block) continue;

        const bx = c * BLOCK_SIZE;
        const by = r * BLOCK_SIZE;

        // Base block
        ctx.fillStyle = block.baseColor;
        ctx.fillRect(bx, by, BLOCK_SIZE, BLOCK_SIZE);

        // Grid border
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, BLOCK_SIZE, BLOCK_SIZE);

        // Draw Ore / Hazard contents
        if (block.ore) {
          const o = ORES[block.ore];
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(o.icon, bx + BLOCK_SIZE / 2, by + BLOCK_SIZE / 2);
        } else if (block.hazard === 'tnt') {
          ctx.fillStyle = '#ff1744';
          ctx.fillRect(bx + 6, by + 6, BLOCK_SIZE - 12, BLOCK_SIZE - 12);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('TNT', bx + BLOCK_SIZE / 2, by + BLOCK_SIZE / 2 + 4);
        } else if (block.hazard === 'lava') {
          ctx.fillStyle = '#ff3d00';
          ctx.fillRect(bx, by, BLOCK_SIZE, BLOCK_SIZE);
          ctx.fillStyle = '#ffd600';
          ctx.fillRect(bx + 4, by + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8);
        } else if (block.hazard === 'chest') {
          ctx.font = '22px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🎁', bx + BLOCK_SIZE / 2, by + BLOCK_SIZE / 2);
        }

        // Damage cracks if being dug
        if (block.hp < block.maxHp) {
          const crackPct = 1 - (block.hp / block.maxHp);
          ctx.fillStyle = `rgba(0, 0, 0, ${crackPct * 0.7})`;
          ctx.fillRect(bx, by, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
    }

    // 3. Subterranean Fog of War & Player Headlight
    const depth = getPlayerDepthMeters();
    if (depth > 10) {
      const lightRad = getLightRadius();
      const grad = ctx.createRadialGradient(player.x, player.y, 40, player.x, player.y, lightRad);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.7, 'rgba(5, 7, 13, 0.4)');
      grad.addColorStop(1, 'rgba(5, 7, 13, 0.94)');

      ctx.fillStyle = grad;
      ctx.fillRect(camera.x, camera.y, width, height);
    }

    // 4. Draw Player Capsule / Mech
    drawPlayerMech();

    // 5. Draw Particles
    particles.forEach(pt => {
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    });

    // 6. Draw Floating Texts
    floatTexts.forEach(ft => {
      ctx.save();
      ctx.font = `bold ${ft.size}px monospace`;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.globalAlpha = Math.max(0, ft.life / 35);
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    ctx.restore();
  }

  function drawSurface() {
    // Sky gradient across the entire visible surface
    const skyGrad = ctx.createLinearGradient(0, -1000, 0, 5 * BLOCK_SIZE);
    skyGrad.addColorStop(0, '#0369a1');
    skyGrad.addColorStop(0.6, '#38bdf8');
    skyGrad.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-3000, -2000, WORLD_WIDTH + 6000, 5 * BLOCK_SIZE + 2000);

    // Warm Golden Sun
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(WORLD_WIDTH / 2 - 280, 1.2 * BLOCK_SIZE, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Distant Mountain Ridges
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(-1000, 4.5 * BLOCK_SIZE);
    ctx.lineTo(WORLD_WIDTH * 0.15, 1.6 * BLOCK_SIZE);
    ctx.lineTo(WORLD_WIDTH * 0.45, 4.5 * BLOCK_SIZE);
    ctx.lineTo(WORLD_WIDTH * 0.72, 1.9 * BLOCK_SIZE);
    ctx.lineTo(WORLD_WIDTH + 1000, 4.5 * BLOCK_SIZE);
    ctx.fill();

    // Surface grass line
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(-3000, 4 * BLOCK_SIZE, WORLD_WIDTH + 6000, BLOCK_SIZE);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(-3000, 4.8 * BLOCK_SIZE, WORLD_WIDTH + 6000, 0.2 * BLOCK_SIZE);

    // Town Buildings
    // 1. Cevher Pazarı (Market)
    ctx.fillStyle = '#d97706';
    ctx.fillRect(3 * BLOCK_SIZE, 1.5 * BLOCK_SIZE, 6 * BLOCK_SIZE, 2.5 * BLOCK_SIZE);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏪 CEVHER PAZARI [M]', 6 * BLOCK_SIZE, 3 * BLOCK_SIZE);

    // 2. Demirci & Atölye (Forge)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(14 * BLOCK_SIZE, 1.2 * BLOCK_SIZE, 7 * BLOCK_SIZE, 2.8 * BLOCK_SIZE);
    ctx.fillStyle = '#fff';
    ctx.fillText('🔨 DEMİRCİ & ATÖLYE [B]', 17.5 * BLOCK_SIZE, 3 * BLOCK_SIZE);

    // 3. Yakıt & Tamir İstasyonu (Gas Station)
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(26 * BLOCK_SIZE, 1.8 * BLOCK_SIZE, 6 * BLOCK_SIZE, 2.2 * BLOCK_SIZE);
    ctx.fillStyle = '#fff';
    ctx.fillText('⛽ YAKIT İSTASYONU [R]', 29 * BLOCK_SIZE, 3 * BLOCK_SIZE);
  }

  function drawPlayerMech() {
    ctx.save();
    ctx.translate(player.x, player.y);

    // Capsule Hull (with safe roundRect check)
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-player.w / 2, -player.h / 2, player.w, player.h, 8);
    } else {
      ctx.rect(-player.w / 2, -player.h / 2, player.w, player.h);
    }
    ctx.fill();
    ctx.stroke();

    // Visor / Glass
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(player.facing === 1 ? 2 : -12, -8, 10, 8);

    // Drill Nose
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    if (player.facing === 1) {
      ctx.moveTo(player.w / 2, -4);
      ctx.lineTo(player.w / 2 + 10, 0);
      ctx.lineTo(player.w / 2, 4);
    } else {
      ctx.moveTo(-player.w / 2, -4);
      ctx.lineTo(-player.w / 2 - 10, 0);
      ctx.lineTo(-player.w / 2, 4);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function addFloatText(x, y, text, color = '#ffffff', size = 16) {
    floatTexts.push({
      x, y,
      text,
      color,
      size,
      life: 35,
      vy: -1.0
    });
  }

  // --- HUD UPDATER ---
  function updateHUD() {
    hudCash.textContent = `${saveData.cash.toLocaleString()} TL`;

    const fuelPct = Math.max(0, Math.round((player.fuel / getMaxFuel()) * 100));
    hudFuelFill.style.width = `${fuelPct}%`;
    hudFuelText.textContent = `${fuelPct}%`;

    const hpPct = Math.max(0, Math.round((player.hp / getMaxHp()) * 100));
    hudHullFill.style.width = `${hpPct}%`;
    hudHullText.textContent = `${hpPct}%`;

    hudDepthText.textContent = `${getPlayerDepthMeters()}m`;

    const curCargo = getCargoCurrentWeight();
    const maxCargo = getMaxCargo();
    hudCargoText.textContent = `${curCargo} / ${maxCargo} kg`;

    const droneIdx = (saveData.upgrades && saveData.upgrades.drones) || 0;
    const droneTier = (UPGRADES_CONFIG.drones && UPGRADES_CONFIG.drones.tiers[droneIdx]) || { count: 0, income: 0 };
    if (droneCountText) droneCountText.textContent = `${droneTier.count} Aktif`;
    if (droneIncomeText) droneIncomeText.textContent = `+${droneTier.income} TL / 5s`;
  }

  // --- MARKET MODAL ---
  function openMarket() {
    marketCashDisplay.textContent = `${saveData.cash.toLocaleString()} TL`;
    marketOresGrid.innerHTML = '';
    let totalVal = 0;

    for (const [key, o] of Object.entries(ORES)) {
      const count = saveData.inventory[key] || 0;
      const subtotal = count * o.value;
      totalVal += subtotal;

      const card = document.createElement('div');
      card.className = 'market-ore-card';
      card.innerHTML = `
        <div class="market-ore-name">
          <span>${o.icon}</span>
          <span>${o.name} (${o.value} TL)</span>
        </div>
        <div class="market-ore-count">${count} Adet</div>
      `;
      marketOresGrid.appendChild(card);
    }

    marketTotalValue.textContent = `${totalVal.toLocaleString()} TL`;
    btnSellAllOres.disabled = totalVal === 0;

    btnSellAllOres.onclick = () => {
      if (totalVal > 0) {
        saveData.cash += totalVal;
        saveData.totalSold += totalVal;
        for (const key of Object.keys(saveData.inventory)) {
          saveData.inventory[key] = 0;
        }
        persistSave();
        Sfx.coin();
        addFloatText(player.x, player.y - 40, `+${totalVal} TL KAZANDIN! 💰`, '#ffd54f', 24);
        openMarket(); // re-render
        updateHUD();
      }
    };

    modalMarket.classList.add('active');
  }

  function closeMarket() {
    modalMarket.classList.remove('active');
  }

  // --- FORGE & WORKSHOP MODAL ---
  function openForge() {
    forgeCashDisplay.textContent = `${saveData.cash.toLocaleString()} TL`;
    minerUpgradesGrid.innerHTML = '';

    for (const [catKey, cfg] of Object.entries(UPGRADES_CONFIG)) {
      const curTierIdx = (saveData.upgrades && saveData.upgrades[catKey]) || 0;
      const curTier = cfg.tiers[curTierIdx] || cfg.tiers[0];
      const nextTier = cfg.tiers[curTierIdx + 1];
      const isMax = !nextTier;

      const row = document.createElement('div');
      row.className = 'upgrade-row';

      let pips = '';
      for (let i = 0; i < cfg.tiers.length; i++) {
        pips += `<div class="upgrade-pip ${i <= curTierIdx ? 'filled' : ''}"></div>`;
      }

      row.innerHTML = `
        <div class="upgrade-icon">${cfg.icon}</div>
        <div class="upgrade-info">
          <div class="upgrade-title">${cfg.name} (${curTier.name})</div>
          <div class="upgrade-desc">${cfg.desc}</div>
          <div class="upgrade-pips">${pips}</div>
        </div>
        <button class="btn-buy-upgrade" ${isMax || saveData.cash < nextTier.cost ? 'disabled' : ''}>
          ${isMax ? 'MAKSİMUM' : `<span>💰 ${nextTier.cost.toLocaleString()} TL</span><span>YÜKSELT</span>`}
        </button>
      `;

      const btnBuy = row.querySelector('.btn-buy-upgrade');
      if (!isMax && saveData.cash >= nextTier.cost) {
        btnBuy.addEventListener('click', () => {
          saveData.cash -= nextTier.cost;
          saveData.upgrades[catKey] = curTierIdx + 1;

          // If fuel tank or hull was upgraded, boost capacity immediately
          if (catKey === 'fuelTank') player.fuel = getMaxFuel();
          if (catKey === 'hull') player.hp = getMaxHp();

          persistSave();
          Sfx.chest();
          openForge(); // re-render
          updateHUD();
        });
      }

      minerUpgradesGrid.appendChild(row);
    }

    modalForge.classList.add('active');
  }

  function closeForge() {
    modalForge.classList.remove('active');
  }

  // --- TELEPORT BEACON ---
  btnSurfaceTeleport?.addEventListener('click', () => {
    const depth = getPlayerDepthMeters();
    if (depth <= 5) {
      addFloatText(player.x, player.y - 20, 'Zaten Yüzeydesin!', '#00e5ff', 16);
      return;
    }

    const fee = Math.min(saveData.cash, 100);
    saveData.cash -= fee;
    player.x = WORLD_WIDTH / 2;
    player.y = 3 * BLOCK_SIZE;
    player.vx = 0;
    player.vy = 0;
    persistSave();
    Sfx.chest();
    addFloatText(player.x, player.y - 30, '🚀 YÜZEYE IŞINLANDIN!', '#bf5af2', 20);
    updateHUD();
  });

  // Modal Handlers
  btnOpenMarket?.addEventListener('click', openMarket);
  btnCloseMarket?.addEventListener('click', closeMarket);

  btnOpenForge?.addEventListener('click', openForge);
  btnCloseForge?.addEventListener('click', closeForge);

  // BGM Toggle
  const btnBgm = document.getElementById('btn-toggle-bgm');
  btnBgm?.addEventListener('click', () => {
    MinerBGM.toggle();
  });

  const startBgmOnce = () => {
    MinerBGM.start();
    window.removeEventListener('keydown', startBgmOnce);
    window.removeEventListener('click', startBgmOnce);
  };
  window.addEventListener('keydown', startBgmOnce, { once: true });
  window.addEventListener('click', startBgmOnce, { once: true });

  // Initial HUD update & launch loop
  updateHUD();
  requestAnimationFrame(gameLoop);

})();
