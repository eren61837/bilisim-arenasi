/* ========================================================================
   🧟 ZOMBS.IO - 100% YEREL, GRAM KASMAYAN OYUN MOTORU (HTML5 CANVAS)
   Bilişim Arenası • Geliştirici: erencix • İsteyen: Onur Baran
======================================================================== */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    },
    playTone(freq, type = 'sine', duration = 0.1, vol = 0.15) {
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    },
    swing() { this.playTone(280, 'triangle', 0.08, 0.1); },
    chop() { this.playTone(180, 'square', 0.09, 0.12); },
    mine() { this.playTone(420, 'square', 0.1, 0.12); },
    build() {
      this.playTone(520, 'sine', 0.08, 0.15);
      setTimeout(() => this.playTone(680, 'sine', 0.1, 0.15), 60);
    },
    shoot() { this.playTone(850, 'sawtooth', 0.08, 0.08); },
    explosion() { this.playTone(90, 'sawtooth', 0.25, 0.25); },
    zombieHit() { this.playTone(140, 'sawtooth', 0.07, 0.12); },
    zombieDie() { this.playTone(110, 'sawtooth', 0.15, 0.18); },
    goldChime() {
      this.playTone(880, 'sine', 0.08, 0.1);
      setTimeout(() => this.playTone(1320, 'sine', 0.12, 0.12), 70);
    },
    waveHorn() {
      this.playTone(220, 'sawtooth', 0.6, 0.2);
      setTimeout(() => this.playTone(180, 'sawtooth', 0.8, 0.25), 400);
    },
    gameOver() {
      this.playTone(260, 'sawtooth', 0.4, 0.25);
      setTimeout(() => this.playTone(200, 'sawtooth', 0.5, 0.25), 300);
      setTimeout(() => this.playTone(130, 'sawtooth', 0.8, 0.3), 650);
    }
  };

  // --- GAME CONSTANTS & STATE ---
  const WORLD_SIZE = 2400;
  const GRID_SIZE = 48;

  const canvas = document.getElementById('zombs-canvas');
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight - 48);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight - 48;
  });

  const state = {
    username: localStorage.getItem('portal_username') || 'Savaşçı',
    wave: 1,
    dayTime: 0,
    isNight: false,
    cycleDuration: 35, // 35s day, 35s night
    cycleTimer: 35,
    score: 0,
    wood: 80,
    stone: 40,
    gold: 50,
    stashPlaced: false,
    selectedTool: 'axe', // 'axe', 'pickaxe', 'spear', 'bow'
    buildMode: false,
    selectedBuilding: 'stash', // 'stash', 'wall', 'stonewall', 'door', 'spike', 'arrow', 'cannon', 'goldmine', 'healer'
    keys: { w: false, a: false, s: false, d: false, space: false },
    mouse: { x: width / 2, y: height / 2, worldX: 0, worldY: 0, down: false },
    isDead: false,
    isShopOpen: false,
    musicPlaying: true
  };

  // Player Object
  const player = {
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    radius: 18,
    speed: 3.8,
    hp: 100,
    maxHp: 100,
    angle: 0,
    swingTimer: 0,
    isSwinging: false,
    pickaxeLevel: 1,
    pickaxePower: 12,
    swordLevel: 0,
    swordDamage: 25,
    lastAttackTime: 0
  };

  // Building Types & Costs
  const BUILDING_TYPES = {
    stash: { name: 'Altın Kasası', icon: '👑', cost: { wood: 0, stone: 0, gold: 0 }, hp: 800, maxHp: 800, range: 0, color: '#ffd700' },
    wall: { name: 'Ahşap Duvar', icon: '🧱', cost: { wood: 15, stone: 0, gold: 0 }, hp: 250, maxHp: 250, range: 0, color: '#8d6e63' },
    stonewall: { name: 'Taş Duvar', icon: '🏛️', cost: { wood: 10, stone: 20, gold: 0 }, hp: 550, maxHp: 550, range: 0, color: '#9e9e9e' },
    door: { name: 'Güvenli Kapı', icon: '🚪', cost: { wood: 25, stone: 10, gold: 0 }, hp: 400, maxHp: 400, isDoor: true, color: '#a1887f' },
    spike: { name: 'Dikenli Duvar', icon: '🌵', cost: { wood: 20, stone: 10, gold: 0 }, hp: 300, maxHp: 300, damage: 15, color: '#e65100' },
    arrow: { name: 'Ok Kulesi', icon: '🏹', cost: { wood: 30, stone: 15, gold: 10 }, hp: 280, maxHp: 280, range: 240, rate: 650, lastFire: 0, color: '#00e5ff' },
    cannon: { name: 'Top Kulesi', icon: '💣', cost: { wood: 45, stone: 40, gold: 25 }, hp: 400, maxHp: 400, range: 280, rate: 1300, lastFire: 0, color: '#ff1744' },
    goldmine: { name: 'Altın Madeni', icon: '💰', cost: { wood: 40, stone: 25, gold: 0 }, hp: 220, maxHp: 220, genRate: 2, lastGen: 0, color: '#ffb300' },
    healer: { name: 'Şifa Çadırı', icon: '💖', cost: { wood: 50, stone: 50, gold: 20 }, hp: 350, maxHp: 350, range: 180, rate: 1000, lastHeal: 0, color: '#e91e63' },
    demolish: { name: 'Yık / Geri Al', icon: '🔨', cost: { wood: 0, stone: 0, gold: 0 }, hp: 0, maxHp: 0, isDemolish: true, color: '#ff4444' }
  };

  // Entities
  let resourceNodes = [];
  let buildings = [];
  let zombies = [];
  let projectiles = [];
  let particles = [];
  let floatingTexts = [];

  // Generate Natural Resource Nodes (Trees & Rocks)
  function initResources() {
    resourceNodes = [];
    for (let i = 0; i < 90; i++) {
      const isTree = Math.random() > 0.4;
      const x = 100 + Math.random() * (WORLD_SIZE - 200);
      const y = 100 + Math.random() * (WORLD_SIZE - 200);
      // Keep spawn center relatively clear
      if (Math.hypot(x - WORLD_SIZE / 2, y - WORLD_SIZE / 2) < 200) continue;

      resourceNodes.push({
        id: i,
        x,
        y,
        radius: isTree ? 22 : 18,
        type: isTree ? 'tree' : 'rock',
        hp: isTree ? 60 : 100,
        maxHp: isTree ? 60 : 100
      });
    }
  }
  initResources();

  // --- AUDIO & MUSIC (Run From Your Demons) ---
  const musicAudio = document.getElementById('audio-zombs-music');
  const btnToggleMusic = document.getElementById('btn-toggle-music');
  let musicStarted = false;

  function initMusic() {
    if (musicAudio && !musicStarted) {
      musicStarted = true;
      musicAudio.volume = state.isNight ? 0.65 : 0.4;
      musicAudio.play().then(() => {
        if (btnToggleMusic) {
          btnToggleMusic.textContent = '🎵 Müzik: Açık';
          btnToggleMusic.style.borderColor = '#00e676';
        }
      }).catch(() => {});
    }
  }

  if (btnToggleMusic) {
    btnToggleMusic.addEventListener('click', () => {
      if (!musicAudio) return;
      if (musicAudio.paused) {
        musicAudio.play().then(() => {
          btnToggleMusic.textContent = '🎵 Müzik: Açık';
          btnToggleMusic.style.borderColor = '#00e676';
        }).catch(() => {});
      } else {
        musicAudio.pause();
        btnToggleMusic.textContent = '🔇 Müzik: Kapalı';
        btnToggleMusic.style.borderColor = '#ff5252';
      }
    });
  }

  // --- TOOL & BUILD MODE SYSTEM ---
  function selectTool(toolName) {
    state.selectedTool = toolName;
    state.buildMode = false;
    const buildHotbar = document.getElementById('zombs-build-hotbar');
    if (buildHotbar) buildHotbar.classList.add('hidden');
    document.querySelectorAll('.tool-slot').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tool') === toolName);
    });
    const btnBuild = document.getElementById('btn-toggle-build');
    if (btnBuild) btnBuild.classList.remove('active');
    AudioEngine.playTone(360, 'sine', 0.05, 0.1);
  }

  function toggleBuildMode(force) {
    state.buildMode = (typeof force === 'boolean') ? force : !state.buildMode;
    const buildHotbar = document.getElementById('zombs-build-hotbar');
    const btnBuild = document.getElementById('btn-toggle-build');
    if (state.buildMode) {
      if (buildHotbar) buildHotbar.classList.remove('hidden');
      if (btnBuild) btnBuild.classList.add('active');
      document.querySelectorAll('.tool-slot').forEach(el => el.classList.remove('active'));
      selectBuilding(state.selectedBuilding || 'stash');
      AudioEngine.playTone(520, 'sine', 0.06, 0.15);
    } else {
      if (buildHotbar) buildHotbar.classList.add('hidden');
      if (btnBuild) btnBuild.classList.remove('active');
      selectTool(state.selectedTool || 'axe');
    }
  }

  // Bind Tool Slots
  document.querySelectorAll('.tool-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
      e.stopPropagation();
      initMusic();
      const t = slot.getAttribute('data-tool');
      selectTool(t);
    });
  });

  const btnToggleBuild = document.getElementById('btn-toggle-build');
  if (btnToggleBuild) {
    btnToggleBuild.addEventListener('click', (e) => {
      e.stopPropagation();
      initMusic();
      toggleBuildMode();
    });
  }

  // --- CONTROLS & INPUT LISTENERS ---
  window.addEventListener('keydown', (e) => {
    initMusic();
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') state.keys.w = true;
    if (code === 'KeyA' || code === 'ArrowLeft') state.keys.a = true;
    if (code === 'KeyS' || code === 'ArrowDown') state.keys.s = true;
    if (code === 'KeyD' || code === 'ArrowRight') state.keys.d = true;
    if (code === 'Space') state.keys.space = true;

    // Tool Hotkeys (1-4)
    if (code === 'Digit1') selectTool('axe');
    if (code === 'Digit2') selectTool('pickaxe');
    if (code === 'Digit3') selectTool('spear');
    if (code === 'Digit4') selectTool('bow');

    // Build Mode Hotkeys (B or 5 toggles build mode)
    if (code === 'KeyB') toggleBuildMode();
    if (code === 'KeyX') {
      if (!state.buildMode) toggleBuildMode(true);
      selectBuilding('demolish');
    }

    if (state.buildMode) {
      if (code === 'Digit5') selectBuilding('stash');
      if (code === 'Digit6') selectBuilding('wall');
      if (code === 'Digit7') selectBuilding('stonewall');
      if (code === 'Digit8') selectBuilding('door');
      if (code === 'Digit9') selectBuilding('spike');
      if (code === 'Digit0') selectBuilding('arrow');
      if (code === 'Minus') selectBuilding('cannon');
      if (code === 'Equal') selectBuilding('goldmine');
      if (code === 'KeyH') selectBuilding('healer');
      if (code === 'KeyX') selectBuilding('demolish');
    }

    if (code === 'Escape') {
      if (state.buildMode) toggleBuildMode(false);
      closeModals();
    }
  });

  window.addEventListener('keyup', (e) => {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') state.keys.w = false;
    if (code === 'KeyA' || code === 'ArrowLeft') state.keys.a = false;
    if (code === 'KeyS' || code === 'ArrowDown') state.keys.s = false;
    if (code === 'KeyD' || code === 'ArrowRight') state.keys.d = false;
    if (code === 'Space') state.keys.space = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = e.clientX - rect.left;
    state.mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener('mousedown', (e) => {
    initMusic();
    AudioEngine.init();
    if (e.button === 0) {
      state.mouse.down = true;
      if (state.buildMode) {
        tryPlaceBuilding();
      } else {
        if (state.selectedTool === 'bow') {
          playerShootBow();
        } else {
          playerAttack();
        }
      }
    } else if (e.button === 2) {
      // Right click: if in build mode, dismantle target building under cursor, or cancel build mode
      if (state.buildMode) {
        const demolished = tryDemolishBuilding();
        if (!demolished) toggleBuildMode(false);
      }
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) state.mouse.down = false;
  });

  // Touch Support for Mobile / Tablet
  let touchStartX = 0, touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    initMusic();
    AudioEngine.init();
    if (e.touches.length > 0) {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      state.mouse.x = t.clientX - rect.left;
      state.mouse.y = t.clientY - rect.top;
      state.mouse.down = true;
      if (state.buildMode) {
        tryPlaceBuilding();
      } else {
        if (state.selectedTool === 'bow') {
          playerShootBow();
        } else {
          playerAttack();
        }
      }
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      state.mouse.x = t.clientX - rect.left;
      state.mouse.y = t.clientY - rect.top;
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      state.keys.a = dx < -20;
      state.keys.d = dx > 20;
      state.keys.w = dy < -20;
      state.keys.s = dy > 20;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    state.mouse.down = false;
    state.keys.w = state.keys.a = state.keys.s = state.keys.d = false;
  });

  // --- UI INTERACTION & HOTBAR ---
  document.querySelectorAll('.hotbar-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
      e.stopPropagation();
      initMusic();
      const bType = slot.getAttribute('data-building');
      selectBuilding(bType);
    });
  });

  function selectBuilding(type) {
    if (!BUILDING_TYPES[type]) return;
    state.selectedBuilding = type;
    document.querySelectorAll('.hotbar-slot').forEach(s => s.classList.remove('active'));
    const activeSlot = document.querySelector(`.hotbar-slot[data-building="${type}"]`);
    if (activeSlot) activeSlot.classList.add('active');
    AudioEngine.playTone(480, 'sine', 0.05, 0.1);
  }

  // Shop Open / Close
  const modalShop = document.getElementById('modal-shop');
  const btnShopOpen = document.getElementById('btn-shop-open');
  const btnShopClose = document.getElementById('btn-shop-close');

  btnShopOpen?.addEventListener('click', toggleShop);
  btnShopClose?.addEventListener('click', toggleShop);

  function toggleShop() {
    state.isShopOpen = !state.isShopOpen;
    if (modalShop) modalShop.classList.toggle('hidden', !state.isShopOpen);
    updateShopButtons();
    AudioEngine.playTone(state.isShopOpen ? 540 : 380, 'sine', 0.08, 0.15);
  }

  function closeModals() {
    state.isShopOpen = false;
    if (modalShop) modalShop.classList.add('hidden');
  }

  // --- BUILDING DEMOLISH & RECYCLE ---
  function tryDemolishBuilding(targetBuilding) {
    if (state.isDead || state.isShopOpen) return false;
    if (!targetBuilding) {
      const mx = state.mouse.worldX;
      const my = state.mouse.worldY;
      targetBuilding = buildings.find(b => Math.hypot(b.x - mx, b.y - my) <= (b.radius || 20) + 16);
    }
    if (!targetBuilding) return false;

    if (targetBuilding.type === 'stash') {
      showToast('⚠️ Altın Kasasını yıkamazsın! Üssün kalbi.');
      return false;
    }

    const bInfo = BUILDING_TYPES[targetBuilding.type];
    const refundWood = Math.floor(((bInfo && bInfo.cost && bInfo.cost.wood) || 0) * 0.7);
    const refundStone = Math.floor(((bInfo && bInfo.cost && bInfo.cost.stone) || 0) * 0.7);
    const refundGold = Math.floor(((bInfo && bInfo.cost && bInfo.cost.gold) || 0) * 0.7);

    state.wood += refundWood;
    state.stone += refundStone;
    state.gold += refundGold;
    updateHUD();

    let refundMsg = '🔨 Yıkıldı!';
    if (refundWood > 0 || refundStone > 0 || refundGold > 0) {
      refundMsg = `+${refundWood}🌲 +${refundStone}🪨` + (refundGold > 0 ? ` +${refundGold}💰` : '');
    }
    spawnFloatingText(refundMsg, targetBuilding.x, targetBuilding.y, '#00ff88');
    spawnParticles(targetBuilding.x, targetBuilding.y, '#ff5252', 16);
    AudioEngine.hit();

    const idx = buildings.indexOf(targetBuilding);
    if (idx !== -1) {
      buildings.splice(idx, 1);
    }
    showToast(`🔨 Yapı yıkıldı (%70 iade)!`);
    return true;
  }

  // --- BUILDING PLACEMENT ---
  function tryPlaceBuilding() {
    if (state.isDead || state.isShopOpen) return;
    if (state.selectedBuilding === 'demolish') {
      tryDemolishBuilding();
      return;
    }
    const bInfo = BUILDING_TYPES[state.selectedBuilding];
    if (!bInfo) return;

    // Must place Stash first!
    if (!state.stashPlaced && state.selectedBuilding !== 'stash') {
      showToast('⚠️ Önce Altın Kasanı (👑) kurmalısın!');
      selectBuilding('stash');
      return;
    }
    if (state.stashPlaced && state.selectedBuilding === 'stash') {
      showToast('ℹ️ Zaten bir Altın Kasan var!');
      selectBuilding('wall');
      return;
    }

    // Check Cost
    if (
      state.wood < bInfo.cost.wood ||
      state.stone < bInfo.cost.stone ||
      state.gold < bInfo.cost.gold
    ) {
      showToast('❌ Yetersiz kaynak!');
      return;
    }

    // Grid Snap (48px)
    const gx = Math.floor(state.mouse.worldX / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gy = Math.floor(state.mouse.worldY / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

    // Check boundary
    if (gx < 60 || gx > WORLD_SIZE - 60 || gy < 60 || gy > WORLD_SIZE - 60) return;

    // Check overlap with other buildings
    for (const b of buildings) {
      if (Math.hypot(b.x - gx, b.y - gy) < 36) {
        showToast('❌ Burası dolu!');
        return;
      }
    }

    // Deduct Cost
    state.wood -= bInfo.cost.wood;
    state.stone -= bInfo.cost.stone;
    state.gold -= bInfo.cost.gold;
    updateHUD();

    // Place
    const newBuilding = {
      id: Date.now() + Math.random(),
      type: state.selectedBuilding,
      x: gx,
      y: gy,
      radius: state.selectedBuilding === 'stash' ? 24 : 20,
      hp: bInfo.hp,
      maxHp: bInfo.maxHp,
      lastFire: 0,
      lastGen: Date.now()
    };
    buildings.push(newBuilding);

    if (state.selectedBuilding === 'stash') {
      state.stashPlaced = true;
      showToast('🏰 Üs Kuruldu! Şimdi duvarlar ve kuleler dik!');
      selectBuilding('wall');
    }

    AudioEngine.build();
    spawnParticles(gx, gy, bInfo.color, 12);
  }

  // --- PARTICLES & FLOATING NUMBERS ---
  function spawnParticles(x, y, color = '#fff', count = 8, spd = 3) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * spd;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * s,
        vy: Math.sin(ang) * s,
        color,
        size: 2 + Math.random() * 3,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.04
      });
    }
  }

  function spawnFloatingText(text, x, y, color = '#ffd700') {
    floatingTexts.push({ text, x, y, vy: -1.2, life: 1.0, color });
  }

  function showToast(msg) {
    const old = document.querySelector('.zombs-toast-banner');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'zombs-toast-banner';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // --- COMBAT & HARVESTING ---
  function playerShootBow() {
    const now = Date.now();
    if (now - player.lastAttackTime < 320) return;
    player.lastAttackTime = now;
    player.isSwinging = true;
    player.swingTimer = 0.22;
    AudioEngine.shoot();

    const bowDmg = 36 + (player.swordLevel * 10);
    projectiles.push({
      x: player.x + Math.cos(player.angle) * 22,
      y: player.y + Math.sin(player.angle) * 22,
      vx: Math.cos(player.angle) * 12.5,
      vy: Math.sin(player.angle) * 12.5,
      damage: bowDmg,
      range: 420,
      traveled: 0,
      type: 'player_arrow'
    });
  }

  function playerAttack() {
    const now = Date.now();
    const isSpear = state.selectedTool === 'spear';
    const isAxe = state.selectedTool === 'axe';
    const isPickaxe = state.selectedTool === 'pickaxe';

    const attackCooldown = isAxe ? 180 : (isSpear ? 300 : 220);
    if (now - player.lastAttackTime < attackCooldown) return;
    player.lastAttackTime = now;
    player.isSwinging = true;
    player.swingTimer = 0.2;
    AudioEngine.swing();

    // Weapon hit area (Increased reach for easier stationary harvesting!)
    const hitDistance = isSpear ? 85 : 60;
    const hitRadius = isSpear ? 30 : 26;
    const hitX = player.x + Math.cos(player.angle) * hitDistance;
    const hitY = player.y + Math.sin(player.angle) * hitDistance;

    // 1. Harvest Resource Nodes
    for (let i = resourceNodes.length - 1; i >= 0; i--) {
      const node = resourceNodes[i];
      if (Math.hypot(node.x - hitX, node.y - hitY) < node.radius + hitRadius) {
        let dmg = player.pickaxePower;
        if (node.type === 'tree') {
          // Axe gives 3.5x wood yield
          if (isAxe) dmg = Math.floor(dmg * 2.5) + 8;
          node.hp -= dmg;
          const gain = isAxe ? Math.floor(dmg * 1.5) + 5 : Math.floor(dmg * 0.8) + 2;
          state.wood += gain;
          state.score += gain;
          spawnFloatingText(`+${gain} 🌲`, node.x, node.y, '#8d6e63');
          AudioEngine.chop();
          spawnParticles(node.x, node.y, '#795548', 6);
        } else {
          // Pickaxe gives 3.5x stone yield + chance of gold
          if (isPickaxe) dmg = Math.floor(dmg * 2.5) + 8;
          node.hp -= dmg;
          const gain = isPickaxe ? Math.floor(dmg * 1.3) + 5 : Math.floor(dmg * 0.6) + 2;
          state.stone += gain;
          state.score += gain * 2;
          spawnFloatingText(`+${gain} 🪨`, node.x, node.y, '#9e9e9e');
          if (isPickaxe && Math.random() > 0.4) {
            state.gold += 2;
            spawnFloatingText('+2 💰', node.x, node.y - 12, '#ffd700');
          }
          AudioEngine.mine();
          spawnParticles(node.x, node.y, '#9e9e9e', 6);
        }
        updateHUD();

        if (node.hp <= 0) {
          resourceNodes.splice(i, 1);
          setTimeout(() => {
            const isTree = Math.random() > 0.4;
            resourceNodes.push({
              id: Date.now(),
              x: 100 + Math.random() * (WORLD_SIZE - 200),
              y: 100 + Math.random() * (WORLD_SIZE - 200),
              radius: isTree ? 22 : 18,
              type: isTree ? 'tree' : 'rock',
              hp: isTree ? 60 : 100,
              maxHp: isTree ? 60 : 100
            });
          }, 25000);
        }
        break;
      }
    }

    // 2. Attack Zombies
    let attackDamage = player.pickaxePower;
    if (isSpear) {
      attackDamage = 55 + (player.swordLevel * 18);
    } else if (isAxe) {
      attackDamage = 32 + (player.swordLevel * 10);
    } else if (isPickaxe) {
      attackDamage = 28 + (player.pickaxeLevel * 8);
    } else if (player.swordLevel > 0) {
      attackDamage = player.swordDamage;
    }

    for (let i = zombies.length - 1; i >= 0; i--) {
      const z = zombies[i];
      if (Math.hypot(z.x - hitX, z.y - hitY) < z.radius + hitRadius + 6) {
        z.hp -= attackDamage;
        AudioEngine.zombieHit();
        spawnParticles(z.x, z.y, '#ff1744', 8);
        spawnFloatingText(`-${attackDamage}`, z.x, z.y - 12, '#ff5252');

        // Knockback (spear has strong knockback)
        const kbAng = Math.atan2(z.y - player.y, z.x - player.x);
        const kbDist = isSpear ? 34 : 16;
        z.x += Math.cos(kbAng) * kbDist;
        z.y += Math.sin(kbAng) * kbDist;

        if (z.hp <= 0) {
          killZombie(z, i);
        }
        break;
      }
    }
  }

  function killZombie(z, idx) {
    zombies.splice(idx, 1);
    AudioEngine.zombieDie();
    const goldDrop = z.isBoss ? 45 : 4 + Math.floor(Math.random() * 5);
    state.gold += goldDrop;
    state.score += z.isBoss ? 250 : 25;
    spawnFloatingText(`+${goldDrop} 💰`, z.x, z.y, '#ffd700');
    AudioEngine.goldChime();
    spawnParticles(z.x, z.y, '#ff1744', 16, 5);
    updateHUD();
  }

  // --- ZOMBIE SPAWNING & AI ---
  function spawnZombieWave() {
    AudioEngine.waveHorn();
    showToast(`🌙 GECE BAŞLADI! DALGA ${state.wave} SALDIRIYOR!`);

    const count = 8 + state.wave * 5;
    const isBossWave = state.wave % 5 === 0;

    for (let i = 0; i < count; i++) {
      // Spawn on outer perimeter
      let zx, zy;
      if (Math.random() > 0.5) {
        zx = Math.random() > 0.5 ? 40 : WORLD_SIZE - 40;
        zy = Math.random() * WORLD_SIZE;
      } else {
        zx = Math.random() * WORLD_SIZE;
        zy = Math.random() > 0.5 ? 40 : WORLD_SIZE - 40;
      }

      const isFast = Math.random() > 0.75;
      const isTank = Math.random() > 0.85;

      zombies.push({
        id: Date.now() + i,
        x: zx,
        y: zy,
        radius: isTank ? 22 : 15,
        speed: isFast ? 2.8 : (isTank ? 1.4 : 2.0),
        hp: (isTank ? 180 : 45) + state.wave * 12,
        maxHp: (isTank ? 180 : 45) + state.wave * 12,
        damage: (isTank ? 18 : 8) + state.wave * 2,
        isBoss: false,
        lastAttack: 0,
        color: isFast ? '#00e676' : (isTank ? '#d50000' : '#4caf50')
      });
    }

    if (isBossWave) {
      zombies.push({
        id: Date.now() + 999,
        x: WORLD_SIZE / 2,
        y: 60,
        radius: 34,
        speed: 1.6,
        hp: 600 + state.wave * 60,
        maxHp: 600 + state.wave * 60,
        damage: 35,
        isBoss: true,
        lastAttack: 0,
        color: '#aa00ff'
      });
      showToast('💀 DİKKAT! MUTANT BOSS ZOMBİ GELDİ!');
    }
  }

  // --- GAME LOOP & SIMULATION ---
  let lastTime = performance.now();

  function update() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (state.isDead) return;

    // 1. Day / Night Cycle Timer
    state.cycleTimer -= dt;
    if (state.cycleTimer <= 0) {
      state.isNight = !state.isNight;
      state.cycleTimer = state.cycleDuration;
      if (state.isNight) {
        spawnZombieWave();
        if (musicAudio && !musicAudio.paused) {
          musicAudio.volume = 0.72; // Intense bass during night!
        }
      } else {
        state.wave++;
        showToast(`☀️ GÜNDÜZ OLDU! Dalga ${state.wave - 1} Tamamlandı!`);
        AudioEngine.goldChime();
        // Wave clear gold bonus
        state.gold += 20 + state.wave * 5;
        updateHUD();
        if (musicAudio && !musicAudio.paused) {
          musicAudio.volume = 0.42;
        }
      }
    }

    // Update Timer UI
    const waveEl = document.getElementById('wave-num');
    const cycleEl = document.getElementById('cycle-status');
    if (waveEl) waveEl.textContent = `DALGA ${state.wave}`;
    if (cycleEl) {
      cycleEl.textContent = state.isNight ? `🌙 GECE (${Math.ceil(state.cycleTimer)}s)` : `☀️ GÜNDÜZ (${Math.ceil(state.cycleTimer)}s)`;
      cycleEl.style.color = state.isNight ? '#ff5252' : '#00e5ff';
    }

    // 2. Player Movement with Wall Collision (Doors allow passage)
    let vx = 0, vy = 0;
    if (state.keys.w) vy -= 1;
    if (state.keys.s) vy += 1;
    if (state.keys.a) vx -= 1;
    if (state.keys.d) vx += 1;
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    const nextX = player.x + vx * player.speed;
    const nextY = player.y + vy * player.speed;
    let canMoveX = true;
    let canMoveY = true;

    for (const b of buildings) {
      if (b.type === 'door') continue; // Player walks freely through safe doors!
      if (Math.hypot(b.x - nextX, b.y - player.y) < b.radius + player.radius - 4) {
        canMoveX = false;
      }
      if (Math.hypot(b.x - player.x, b.y - nextY) < b.radius + player.radius - 4) {
        canMoveY = false;
      }
    }

    if (canMoveX) player.x = nextX;
    if (canMoveY) player.y = nextY;

    // World Bounds
    player.x = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.y));

    // Aim Angle
    state.mouse.worldX = player.x + (state.mouse.x - width / 2);
    state.mouse.worldY = player.y + (state.mouse.y - height / 2);
    player.angle = Math.atan2(state.mouse.worldY - player.y, state.mouse.worldX - player.x);

    // Auto / Click Attack (Disabled in build mode to avoid accidental firing)
    if (state.mouse.down || state.keys.space) {
      if (!state.buildMode) {
        if (state.selectedTool === 'bow') {
          playerShootBow();
        } else {
          playerAttack();
        }
      }
    }

    if (player.swingTimer > 0) player.swingTimer -= dt;

    // 3. Buildings Simulation (Turrets, Gold Mines, Healers)
    const stash = buildings.find(b => b.type === 'stash');
    const targetBaseX = stash ? stash.x : player.x;
    const targetBaseY = stash ? stash.y : player.y;

    buildings.forEach(b => {
      // Gold Mines generate gold
      if (b.type === 'goldmine') {
        if (now - b.lastGen > 1500) {
          b.lastGen = now;
          state.gold += 2;
          state.score += 2;
          spawnFloatingText('+2 💰', b.x, b.y - 10, '#ffd700');
          updateHUD();
        }
      }

      // Healer Tent: heals player when inside 180px radius
      if (b.type === 'healer') {
        if (now - (b.lastHeal || 0) > 1100) {
          b.lastHeal = now;
          const dToPlayer = Math.hypot(player.x - b.x, player.y - b.y);
          if (dToPlayer < 180 && player.hp < player.maxHp) {
            player.hp = Math.min(player.maxHp, player.hp + 12);
            updateHUD();
            spawnFloatingText('+12 💖', player.x, player.y - 14, '#e91e63');
            spawnParticles(player.x, player.y, '#e91e63', 6, 2);
            AudioEngine.playTone(660, 'sine', 0.08, 0.08);
          }
        }
      }

      // Arrow Turret
      if (b.type === 'arrow') {
        if (now - b.lastFire > 650) {
          let closestZ = null, minDist = 250;
          zombies.forEach(z => {
            const d = Math.hypot(z.x - b.x, z.y - b.y);
            if (d < minDist) { minDist = d; closestZ = z; }
          });
          if (closestZ) {
            b.lastFire = now;
            const ang = Math.atan2(closestZ.y - b.y, closestZ.x - b.x);
            projectiles.push({
              x: b.x, y: b.y,
              vx: Math.cos(ang) * 9,
              vy: Math.sin(ang) * 9,
              damage: 22,
              range: 260,
              traveled: 0,
              type: 'arrow'
            });
            AudioEngine.shoot();
          }
        }
      }

      // Cannon Turret
      if (b.type === 'cannon') {
        if (now - b.lastFire > 1400) {
          let closestZ = null, minDist = 280;
          zombies.forEach(z => {
            const d = Math.hypot(z.x - b.x, z.y - b.y);
            if (d < minDist) { minDist = d; closestZ = z; }
          });
          if (closestZ) {
            b.lastFire = now;
            const ang = Math.atan2(closestZ.y - b.y, closestZ.x - b.x);
            projectiles.push({
              x: b.x, y: b.y,
              vx: Math.cos(ang) * 6.5,
              vy: Math.sin(ang) * 6.5,
              damage: 60,
              splashRadius: 65,
              range: 300,
              traveled: 0,
              type: 'cannonball'
            });
            AudioEngine.explosion();
          }
        }
      }
    });

    // 4. Projectiles Update
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.traveled += Math.hypot(p.vx, p.vy);

      let hit = false;
      for (let j = zombies.length - 1; j >= 0; j--) {
        const z = zombies[j];
        if (Math.hypot(z.x - p.x, z.y - p.y) < z.radius + 8) {
          hit = true;
          if (p.type === 'cannonball') {
            // Splash Damage
            spawnParticles(p.x, p.y, '#ff3d00', 18, 5);
            AudioEngine.explosion();
            zombies.forEach((tz, zIndex) => {
              if (Math.hypot(tz.x - p.x, tz.y - p.y) < p.splashRadius) {
                tz.hp -= p.damage;
                spawnFloatingText(`-${p.damage}`, tz.x, tz.y - 12, '#ff1744');
                if (tz.hp <= 0) killZombie(tz, zIndex);
              }
            });
          } else if (p.type === 'player_arrow') {
            z.hp -= p.damage;
            spawnParticles(p.x, p.y, '#ffd700', 6);
            spawnFloatingText(`-${p.damage}`, z.x, z.y - 12, '#ffd700');
            const kb = Math.atan2(p.vy, p.vx);
            z.x += Math.cos(kb) * 16;
            z.y += Math.sin(kb) * 16;
            if (z.hp <= 0) killZombie(z, j);
          } else {
            z.hp -= p.damage;
            spawnParticles(p.x, p.y, '#00e5ff', 5);
            spawnFloatingText(`-${p.damage}`, z.x, z.y - 12, '#00e5ff');
            if (z.hp <= 0) killZombie(z, j);
          }
          break;
        }
      }

      if (hit || p.traveled >= p.range) {
        projectiles.splice(i, 1);
      }
    }

    // 5. Zombie AI & Attacks
    for (let i = zombies.length - 1; i >= 0; i--) {
      const z = zombies[i];

      // Target: Closest between Player and Stash
      let targetX = player.x, targetY = player.y;
      if (stash && Math.hypot(stash.x - z.x, stash.y - z.y) < Math.hypot(player.x - z.x, player.y - z.y)) {
        targetX = stash.x;
        targetY = stash.y;
      }

      const ang = Math.atan2(targetY - z.y, targetX - z.x);
      let moveX = Math.cos(ang) * z.speed;
      let moveY = Math.sin(ang) * z.speed;

      // Check collision with buildings
      let attackingBuilding = null;
      for (const b of buildings) {
        if (Math.hypot(b.x - (z.x + moveX), b.y - (z.y + moveY)) < b.radius + z.radius) {
          attackingBuilding = b;
          moveX = 0;
          moveY = 0;
          break;
        }
      }

      z.x += moveX;
      z.y += moveY;

      // Attack Building
      if (attackingBuilding && now - z.lastAttack > 800) {
        z.lastAttack = now;
        attackingBuilding.hp -= z.damage;
        AudioEngine.zombieHit();
        spawnParticles(attackingBuilding.x, attackingBuilding.y, '#ff5252', 6);
        spawnFloatingText(`-${z.damage}`, attackingBuilding.x, attackingBuilding.y, '#ff1744');

        // Spike wall retaliation
        if (attackingBuilding.type === 'spike') {
          z.hp -= 20;
          spawnFloatingText('-20 🌵', z.x, z.y, '#e65100');
          if (z.hp <= 0) {
            killZombie(z, i);
            continue;
          }
        }

        if (attackingBuilding.hp <= 0) {
          // Destroy building
          const bIndex = buildings.indexOf(attackingBuilding);
          if (bIndex !== -1) buildings.splice(bIndex, 1);
          spawnParticles(attackingBuilding.x, attackingBuilding.y, '#795548', 20, 4);

          if (attackingBuilding.type === 'stash') {
            state.stashPlaced = false;
            triggerGameOver('Altın Kasan zombiler tarafından yok edildi!');
            return;
          }
        }
      }

      // Attack Player
      if (Math.hypot(player.x - z.x, player.y - z.y) < player.radius + z.radius && now - z.lastAttack > 700) {
        z.lastAttack = now;
        player.hp -= z.damage;
        AudioEngine.zombieHit();
        spawnParticles(player.x, player.y, '#ff1744', 8);
        updateHUD();
        if (player.hp <= 0) {
          triggerGameOver('Zombiler seni paramparça etti!');
          return;
        }
      }
    }

    // 6. Particles & Floating Text Updates
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 0.025;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  // --- RENDERING LOOP ---
  function draw() {
    requestAnimationFrame(draw);
    update();

    ctx.clearRect(0, 0, width, height);

    // Camera Offset (Centered on Player)
    const camX = width / 2 - player.x;
    const camY = height / 2 - player.y;

    ctx.save();
    ctx.translate(camX, camY);

    // 1. Grid Ground
    ctx.fillStyle = state.isNight ? '#0b130f' : '#14221a';
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    ctx.strokeStyle = state.isNight ? 'rgba(0, 230, 118, 0.03)' : 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD_SIZE; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_SIZE); ctx.stroke();
    }
    for (let y = 0; y <= WORLD_SIZE; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_SIZE, y); ctx.stroke();
    }

    // World Borders
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // 2. Resource Nodes
    resourceNodes.forEach(node => {
      ctx.save();
      ctx.translate(node.x, node.y);
      if (node.type === 'tree') {
        // Tree Trunk & Leaves
        ctx.fillStyle = '#4e342e';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath(); ctx.arc(0, 0, node.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#388e3c';
        ctx.beginPath(); ctx.arc(-4, -4, node.radius * 0.6, 0, Math.PI * 2); ctx.fill();
      } else {
        // Stone Rock
        ctx.fillStyle = '#616161';
        ctx.beginPath(); ctx.arc(0, 0, node.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9e9e9e';
        ctx.beginPath(); ctx.arc(-3, -3, node.radius * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });

    // 3. Buildings
    buildings.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);

      // Detailed Authentic Zombs.io Vector Rendering
      if (b.type === 'stash') {
        // Gold Stash Core
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = '#f1c40f'; ctx.stroke();
        ctx.fillStyle = '#f39c12';
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(-3, -3, 6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 18; ctx.shadowColor = '#ffd700';
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      } else if (b.type === 'wall' || b.type === 'stonewall') {
        const isStone = b.type === 'stonewall';
        ctx.fillStyle = isStone ? '#7f8c8d' : '#8d6e63';
        ctx.fillRect(-20, -20, 40, 40);
        ctx.fillStyle = isStone ? '#95a5a6' : '#a1887f';
        ctx.fillRect(-16, -16, 32, 32);
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2;
        ctx.strokeRect(-20, -20, 40, 40);
        // Inner detail lines
        ctx.beginPath();
        ctx.moveTo(-20, -20); ctx.lineTo(-16, -16);
        ctx.moveTo(20, -20); ctx.lineTo(16, -16);
        ctx.moveTo(-20, 20); ctx.lineTo(-16, 16);
        ctx.moveTo(20, 20); ctx.lineTo(16, 16);
        ctx.stroke();
      } else if (b.type === 'door') {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-20, -20, 40, 40);
        ctx.fillStyle = '#795548';
        ctx.fillRect(-16, -20, 32, 40);
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 3;
        ctx.strokeRect(-20, -20, 40, 40);
        // Wooden planks
        ctx.beginPath();
        ctx.moveTo(-8, -20); ctx.lineTo(-8, 20);
        ctx.moveTo(8, -20); ctx.lineTo(8, 20);
        ctx.stroke();
        // Door hinges/knob
        ctx.fillStyle = '#9e9e9e';
        ctx.beginPath(); ctx.arc(12, 0, 3, 0, Math.PI * 2); ctx.fill();
      } else if (b.type === 'healer') {
        // Medical Tent
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#bdc3c7'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-4, -12, 8, 24);
        ctx.fillRect(-12, -4, 24, 8);
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.2)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 180, 0, Math.PI * 2); ctx.stroke();
      } else if (b.type === 'spike') {
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(-20, -20, 40, 40);
        ctx.strokeStyle = '#d35400'; ctx.lineWidth = 2; ctx.strokeRect(-20, -20, 40, 40);
        // Spikes
        ctx.fillStyle = '#bdc3c7';
        for (let sx = -12; sx <= 12; sx += 12) {
          for (let sy = -12; sy <= 12; sy += 12) {
            ctx.beginPath();
            ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 6, sy + 6); ctx.lineTo(sx - 6, sy + 6);
            ctx.fill();
            ctx.stroke();
          }
        }
      } else if (b.type === 'arrow') {
        // Arrow Tower Base
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2; ctx.stroke();
        // Crossbow on top
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-14, -4, 28, 8);
        ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 14, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      } else if (b.type === 'cannon') {
        // Cannon Tower Base
        ctx.fillStyle = '#34495e';
        ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 3; ctx.stroke();
        // Big Cannon Barrel
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-8, -20, 16, 20);
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(0, -18, 5, 0, Math.PI * 2); ctx.fill();
        // Red Core
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c0392b';
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      } else if (b.type === 'goldmine') {
        // Gold Mine Rig
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-22, -22, 44, 44);
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 3; ctx.strokeRect(-22, -22, 44, 44);
        ctx.fillStyle = '#3e2723'; // Hole
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        // Gold chunks
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(-5, -5, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, 4, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-4, 6, 3.5, 0, Math.PI * 2); ctx.fill();
      }

      ctx.shadowBlur = 0;

      // Health bar above building if damaged
      if (b.hp < b.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-20, -28, 40, 5);
        ctx.fillStyle = '#00e676';
        ctx.fillRect(-20, -28, (b.hp / b.maxHp) * 40, 5);
      }

      ctx.restore();
    });

    // 4. Building Placement Preview (Ghost Grid Snap - only shown in build mode!)
    if (!state.isDead && !state.isShopOpen && state.buildMode) {
      if (state.selectedBuilding === 'demolish') {
        const hovered = buildings.find(b => Math.hypot(b.x - state.mouse.worldX, b.y - state.mouse.worldY) <= (b.radius || 20) + 16);
        ctx.save();
        if (hovered) {
          ctx.translate(hovered.x, hovered.y);
          ctx.fillStyle = 'rgba(255, 68, 68, 0.35)';
          ctx.strokeStyle = '#ff4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, (hovered.radius || 20) + 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🔨 YIK (%70)', 0, 4);
        } else {
          ctx.translate(state.mouse.worldX, state.mouse.worldY);
          ctx.strokeStyle = '#ff5252';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#ff5252';
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🔨', 0, 6);
        }
        ctx.restore();
      } else {
        const gx = Math.floor(state.mouse.worldX / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const gy = Math.floor(state.mouse.worldY / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.fillStyle = 'rgba(0, 230, 118, 0.35)';
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 2;
        ctx.fillRect(-20, -20, 40, 40);
        ctx.strokeRect(-20, -20, 40, 40);
        ctx.restore();
      }
    }

    // 5. Projectiles
    projectiles.forEach(p => {
      ctx.save();
      if (p.type === 'player_arrow') {
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 10; ctx.shadowColor = '#ffd700';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.type === 'cannonball' ? 6 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = p.type === 'cannonball' ? '#ff3d00' : '#00e5ff';
        ctx.shadowBlur = 8; ctx.shadowColor = ctx.fillStyle;
        ctx.fill();
      }
      ctx.restore();
    });

    // 6. Zombies
    zombies.forEach(z => {
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.beginPath();
      ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
      ctx.fillStyle = z.color;
      ctx.shadowBlur = z.isBoss ? 20 : 6;
      ctx.shadowColor = z.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(4, -4, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, 4, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f00';
      ctx.beginPath(); ctx.arc(5, -4, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, 4, 1.5, 0, Math.PI * 2); ctx.fill();

      // Health Bar
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-16, -z.radius - 8, 32, 4);
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(-16, -z.radius - 8, (z.hp / z.maxHp) * 32, 4);

      ctx.restore();
    });

    // 7. Player Character & Authentic Equipped Weapon
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Hands & Tool Swing Animation
    const swingOffset = player.isSwinging ? Math.sin((0.2 - player.swingTimer) * Math.PI * 5) * 0.85 : 0;
    ctx.save();
    ctx.rotate(swingOffset);

    // Render Equipped Weapon/Tool
    const tool = state.selectedTool;
    if (tool === 'axe') {
      ctx.fillStyle = '#795548'; // Handle
      ctx.fillRect(14, -2, 18, 4);
      ctx.fillStyle = '#cfd8dc'; // Axe head
      ctx.beginPath();
      ctx.arc(28, -4, 7, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    } else if (tool === 'pickaxe') {
      ctx.fillStyle = '#37474f'; // Handle
      ctx.fillRect(14, -2, 18, 4);
      ctx.strokeStyle = '#00e5ff'; // Cyan pick head
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(30, 0, 9, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
    } else if (tool === 'spear') {
      ctx.fillStyle = '#a1887f'; // Long Shaft
      ctx.fillRect(12, -2, 36, 4);
      ctx.fillStyle = '#ffd700'; // Spear tip
      ctx.beginPath();
      ctx.moveTo(48, -6); ctx.lineTo(62, 0); ctx.lineTo(48, 6); ctx.closePath();
      ctx.fill();
    } else if (tool === 'bow') {
      ctx.strokeStyle = '#8d6e63'; // Bow curve
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(22, 0, 14, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.strokeStyle = '#fff'; // Bowstring
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(22, -14); ctx.lineTo(22, 14);
      ctx.stroke();
    } else {
      ctx.fillStyle = player.swordLevel > 0 ? '#00e5ff' : '#ffd700';
      ctx.fillRect(16, -3, 20, 6);
    }
    ctx.restore();

    // Body
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00e676';
    ctx.shadowBlur = 12; ctx.shadowColor = '#00e676';
    ctx.fill();
    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Hands
    ctx.beginPath(); ctx.arc(14, -12, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, 12, 6, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    // Player Name Tag
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 4; ctx.shadowColor = '#000';
    ctx.fillText(state.username, player.x, player.y - 26);
    ctx.shadowBlur = 0;

    // 8. Particles & Floating Numbers
    particles.forEach(p => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fill();
      ctx.restore();
    });

    floatingTexts.forEach(ft => {
      ctx.save();
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    ctx.restore(); // Restore Camera

    // 9. Day / Night Darkness Vignette Overlay
    if (state.isNight) {
      const grad = ctx.createRadialGradient(width / 2, height / 2, 120, width / 2, height / 2, Math.max(width, height) * 0.75);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
      grad.addColorStop(1, 'rgba(5, 10, 8, 0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // --- HUD & STATS UPDATER ---
  function updateHUD() {
    const wEl = document.getElementById('res-wood');
    const sEl = document.getElementById('res-stone');
    const gEl = document.getElementById('res-gold');
    const scEl = document.getElementById('res-score');
    const hpEl = document.getElementById('hp-fill');
    const hpVal = document.getElementById('hp-val');

    if (wEl) wEl.textContent = state.wood;
    if (sEl) sEl.textContent = state.stone;
    if (gEl) gEl.textContent = state.gold;
    if (scEl) scEl.textContent = state.score;

    if (hpEl) hpEl.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
    if (hpVal) hpVal.textContent = `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`;
  }

  // --- SHOP & UPGRADES SYSTEM ---
  function updateShopButtons() {
    const buyPick = document.getElementById('btn-buy-pickaxe');
    const buySword = document.getElementById('btn-buy-sword');
    const buyArmor = document.getElementById('btn-buy-armor');
    const buyHeal = document.getElementById('btn-buy-heal');

    if (buyPick) buyPick.disabled = (state.gold < 50 || player.pickaxeLevel >= 5);
    if (buySword) buySword.disabled = (state.gold < 80 || player.swordLevel >= 5);
    if (buyArmor) buyArmor.disabled = (state.gold < 60);
    if (buyHeal) buyHeal.disabled = (state.gold < 20 || player.hp >= player.maxHp);
  }

  document.getElementById('btn-buy-pickaxe')?.addEventListener('click', () => {
    if (state.gold >= 50 && player.pickaxeLevel < 5) {
      state.gold -= 50;
      player.pickaxeLevel++;
      player.pickaxePower += 10;
      AudioEngine.goldChime();
      showToast(`⛏️ Kazma Seviyesi ${player.pickaxeLevel} Oldu! (+Güç)`);
      updateHUD();
      updateShopButtons();
    }
  });

  document.getElementById('btn-buy-sword')?.addEventListener('click', () => {
    if (state.gold >= 80 && player.swordLevel < 5) {
      state.gold -= 80;
      player.swordLevel++;
      player.swordDamage += 25;
      AudioEngine.goldChime();
      showToast(`⚔️ Kılıç Seviyesi ${player.swordLevel} Oldu! (+Hasar)`);
      updateHUD();
      updateShopButtons();
    }
  });

  document.getElementById('btn-buy-armor')?.addEventListener('click', () => {
    if (state.gold >= 60) {
      state.gold -= 60;
      player.maxHp += 30;
      player.hp = player.maxHp;
      AudioEngine.goldChime();
      showToast(`🛡️ Zırh Yükseltildi! Can: ${player.maxHp}`);
      updateHUD();
      updateShopButtons();
    }
  });

  document.getElementById('btn-buy-heal')?.addEventListener('click', () => {
    if (state.gold >= 20 && player.hp < player.maxHp) {
      state.gold -= 20;
      player.hp = Math.min(player.maxHp, player.hp + 50);
      AudioEngine.goldChime();
      showToast('💖 Can Dolduruldu!');
      updateHUD();
      updateShopButtons();
    }
  });

  // --- GAME OVER & RESTART ---
  function triggerGameOver(reason) {
    state.isDead = true;
    AudioEngine.gameOver();
    const modal = document.getElementById('modal-game-over');
    const msg = document.getElementById('game-over-reason');
    const sc = document.getElementById('game-over-score');
    const wv = document.getElementById('game-over-wave');

    if (msg) msg.textContent = reason;
    if (sc) sc.textContent = `Toplam Skor: ${state.score}`;
    if (wv) wv.textContent = `Ulaşılan Dalga: ${state.wave}`;
    if (modal) modal.classList.remove('hidden');
  }

  document.getElementById('btn-respawn')?.addEventListener('click', () => {
    location.reload();
  });

  document.getElementById('btn-reload')?.addEventListener('click', () => {
    location.reload();
  });

  document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Auto-sync player tag
  const pTag = document.getElementById('zombs-player-tag');
  if (pTag) pTag.textContent = '👤 ' + state.username;

  // Start Loop
  updateHUD();
  draw();

})();
