// diep.js - 1:1 Native Diep.io Canvas Game Engine
// High-FPS Canvas MMO Tank Arena with Evolutions, Upgrades, AI Bots, and Shapes
(function() {
  'use strict';

  // --- AUDIO SYNTH ---
  const Sfx = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    shoot(isHeavy = false) {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isHeavy ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(isHeavy ? 120 : 380, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + (isHeavy ? 0.25 : 0.08));
        gain.gain.setValueAtTime(isHeavy ? 0.2 : 0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.25 : 0.08));
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + (isHeavy ? 0.25 : 0.08));
      } catch(_) {}
    },
    pop() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500 + Math.random() * 300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.06);
      } catch(_) {}
    },
    levelup() {
      try {
        this.init();
        if (!this.ctx) return;
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(now); osc.stop(now + 0.15);
          }, idx * 60);
        });
      } catch(_) {}
    }
  };

  // --- ARENA CONSTANTS ---
  const MAP_SIZE = 3600;
  const NEST_RADIUS = 500;
  const CENTER = MAP_SIZE / 2;

  // --- STAT CONFIGURATION ---
  const STAT_CONFIG = [
    { id: 'regen', name: 'Can Yenilenmesi', color: '#ff6666' },
    { id: 'maxHp', name: 'Maksimum Can', color: '#ff66b2' },
    { id: 'bodyDmg', name: 'Gövde Hasarı', color: '#9966ff' },
    { id: 'bulletSpeed', name: 'Mermi Hızı', color: '#6699ff' },
    { id: 'bulletPen', name: 'Delicilik', color: '#ffcc00' },
    { id: 'bulletDmg', name: 'Mermi Hasarı', color: '#ff4d4d' },
    { id: 'reload', name: 'Doldurma Hızı', color: '#66ff66' },
    { id: 'moveSpeed', name: 'Hareket Hızı', color: '#00ffff' }
  ];

  // --- TANK CLASSES DEFINITIONS ---
  const TANK_CLASSES = {
    basic: { name: 'Tank', tier: 1, barrels: [{ angle: 0, length: 36, width: 18, delay: 0 }] },
    // Tier 2 (Level 15)
    twin: { name: 'Twin', tier: 2, barrels: [
      { angle: 0, offset: -8, length: 36, width: 14, delay: 0 },
      { angle: 0, offset: 8, length: 36, width: 14, delay: 0.5 }
    ]},
    sniper: { name: 'Sniper', tier: 2, zoom: 1.25, barrels: [{ angle: 0, length: 50, width: 14, delay: 0, speedMult: 1.4, dmgMult: 1.5, cdMult: 1.6 }] },
    machinegun: { name: 'Machine Gun', tier: 2, barrels: [{ angle: 0, length: 32, width: 26, flare: 12, delay: 0, spread: 0.25, cdMult: 0.5, dmgMult: 0.7 }] },
    flank: { name: 'Flank Guard', tier: 2, barrels: [
      { angle: 0, length: 36, width: 16, delay: 0 },
      { angle: Math.PI, length: 28, width: 16, delay: 0 }
    ]},
    // Tier 3 (Level 30)
    tripleshot: { name: 'Triple Shot', tier: 3, barrels: [
      { angle: 0, length: 36, width: 16, delay: 0 },
      { angle: -0.4, length: 34, width: 16, delay: 0.2 },
      { angle: 0.4, length: 34, width: 16, delay: 0.2 }
    ]},
    destroyer: { name: 'Destroyer', tier: 3, barrels: [{ angle: 0, length: 42, width: 34, delay: 0, heavy: true, bulletRadius: 22, dmgMult: 3.5, speedMult: 0.75, cdMult: 2.2 }] },
    triangle: { name: 'Tri-Angle', tier: 3, barrels: [
      { angle: 0, length: 36, width: 16, delay: 0 },
      { angle: Math.PI - 0.5, length: 24, width: 14, delay: 0, recoilOnly: true },
      { angle: Math.PI + 0.5, length: 24, width: 14, delay: 0, recoilOnly: true }
    ]},
    // Tier 4 (Level 45)
    octotank: { name: 'Octo Tank', tier: 4, barrels: [
      { angle: 0, length: 34, width: 14, delay: 0 },
      { angle: Math.PI / 4, length: 34, width: 14, delay: 0.5 },
      { angle: Math.PI / 2, length: 34, width: 14, delay: 0 },
      { angle: 3 * Math.PI / 4, length: 34, width: 14, delay: 0.5 },
      { angle: Math.PI, length: 34, width: 14, delay: 0 },
      { angle: 5 * Math.PI / 4, length: 34, width: 14, delay: 0.5 },
      { angle: 3 * Math.PI / 2, length: 34, width: 14, delay: 0 },
      { angle: 7 * Math.PI / 4, length: 34, width: 14, delay: 0.5 }
    ]},
    annihilator: { name: 'Annihilator', tier: 4, barrels: [{ angle: 0, length: 48, width: 44, delay: 0, heavy: true, bulletRadius: 30, dmgMult: 5.0, speedMult: 0.8, cdMult: 2.5 }] },
    booster: { name: 'Booster', tier: 4, barrels: [
      { angle: 0, length: 38, width: 16, delay: 0 },
      { angle: Math.PI - 0.45, length: 26, width: 12, delay: 0, recoilOnly: true },
      { angle: Math.PI + 0.45, length: 26, width: 12, delay: 0, recoilOnly: true },
      { angle: Math.PI - 0.7, length: 22, width: 12, delay: 0.3, recoilOnly: true },
      { angle: Math.PI + 0.7, length: 22, width: 12, delay: 0.3, recoilOnly: true }
    ]}
  };

  // --- STATE ---
  const canvas = document.getElementById('diep-canvas');
  const ctx = canvas.getContext('2d');
  const minimapCanvas = document.getElementById('minimap-canvas');
  const mmCtx = minimapCanvas.getContext('2d');

  let width = window.innerWidth;
  let height = window.innerHeight;

  const player = {
    x: CENTER + (Math.random() - 0.5) * 400,
    y: CENTER + (Math.random() - 0.5) * 400,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: 24,
    color: '#00b0ff',
    name: localStorage.getItem('portal_username') || 'Tankçı',
    level: 1,
    score: 0,
    statPoints: 0,
    classId: 'basic',
    hp: 100,
    maxHp: 100,
    stats: { regen: 0, maxHp: 0, bodyDmg: 0, bulletSpeed: 0, bulletPen: 0, bulletDmg: 0, reload: 0, moveSpeed: 0 },
    shootTimer: 0,
    autoFire: false,
    autoSpin: false,
    isDead: false
  };

  const keys = { w: false, a: false, s: false, d: false, isMouseDown: false, mouseX: 0, mouseY: 0 };
  let bullets = [];
  let shapes = [];
  let bots = [];
  let particles = [];

  // --- SHAPE SPAWNER ---
  function spawnShape(forceNest = false) {
    let x, y, type;
    if (forceNest || Math.random() < 0.25) {
      // Pentagon Nest
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * NEST_RADIUS;
      x = CENTER + Math.cos(ang) * dist;
      y = CENTER + Math.sin(ang) * dist;
      type = Math.random() < 0.05 ? 'alpha' : 'pentagon';
    } else {
      x = 50 + Math.random() * (MAP_SIZE - 100);
      y = 50 + Math.random() * (MAP_SIZE - 100);
      const r = Math.random();
      if (r < 0.65) type = 'square';
      else if (r < 0.90) type = 'triangle';
      else type = 'pentagon';
    }

    const configs = {
      square: { sides: 4, radius: 14, hp: 10, xp: 10, color: '#ffe869' },
      triangle: { sides: 3, radius: 18, hp: 30, xp: 25, color: '#fc7677' },
      pentagon: { sides: 5, radius: 26, hp: 100, xp: 130, color: '#768dfc' },
      alpha: { sides: 5, radius: 80, hp: 2500, xp: 3000, color: '#768dfc' }
    };

    const cfg = configs[type];
    shapes.push({
      x, y,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.02,
      type,
      sides: cfg.sides,
      radius: cfg.radius,
      hp: cfg.hp,
      maxHp: cfg.hp,
      xp: cfg.xp,
      color: cfg.color
    });
  }

  // --- BOT SPAWNER ---
  const BOT_NAMES = ['Ares', 'Viper', 'Titan', 'Ghost', 'Predator', 'Blaze', 'Striker', 'Shadow'];
  function spawnBot(id) {
    const classes = ['basic', 'twin', 'sniper', 'machinegun', 'flank', 'tripleshot'];
    const chosenClass = classes[Math.floor(Math.random() * classes.length)];
    return {
      id,
      name: BOT_NAMES[id % BOT_NAMES.length],
      x: 100 + Math.random() * (MAP_SIZE - 200),
      y: 100 + Math.random() * (MAP_SIZE - 200),
      vx: 0,
      vy: 0,
      angle: Math.random() * Math.PI * 2,
      radius: 24,
      color: '#f14e54',
      level: Math.floor(1 + Math.random() * 30),
      score: Math.floor(100 + Math.random() * 8000),
      hp: 120,
      maxHp: 120,
      classId: chosenClass,
      shootTimer: Math.random() * 40,
      targetShape: null
    };
  }

  // --- INITIALIZE GAME ---
  function initGame() {
    shapes = [];
    for (let i = 0; i < 180; i++) spawnShape();
    bots = [];
    for (let i = 0; i < 8; i++) bots.push(spawnBot(i));

    // Stats UI Render
    const statsDock = document.getElementById('stats-dock');
    if (statsDock) {
      statsDock.innerHTML = '';
      STAT_CONFIG.forEach((stat, idx) => {
        const row = document.createElement('div');
        row.className = 'stat-row';
        row.style.setProperty('--pip-color', stat.color);
        row.innerHTML = `
          <button class="btn-stat-plus" data-stat="${stat.id}" id="btn-stat-${stat.id}">+</button>
          <span class="stat-label">${idx + 1}. ${stat.name}</span>
          <div class="stat-pips" id="pips-${stat.id}">
            ${Array.from({ length: 7 }).map(() => '<div class="stat-pip"></div>').join('')}
          </div>
        `;
        statsDock.appendChild(row);
      });

      statsDock.querySelectorAll('.btn-stat-plus').forEach(btn => {
        btn.addEventListener('click', () => {
          const statId = btn.getAttribute('data-stat');
          upgradeStat(statId);
        });
      });
    }

    renderStatsUI();
  }

  // --- STATS UPGRADE LOGIC ---
  function upgradeStat(statId) {
    if (player.statPoints <= 0 || player.stats[statId] >= 7) return;
    player.stats[statId]++;
    player.statPoints--;
    if (statId === 'maxHp') {
      const bonus = player.stats.maxHp * 25;
      player.maxHp = 100 + bonus;
      player.hp = Math.min(player.maxHp, player.hp + 25);
    }
    renderStatsUI();
    Sfx.pop();
  }

  function renderStatsUI() {
    STAT_CONFIG.forEach(stat => {
      const pipsContainer = document.getElementById(`pips-${stat.id}`);
      const btn = document.getElementById(`btn-stat-${stat.id}`);
      const curVal = player.stats[stat.id];
      if (pipsContainer) {
        const pips = pipsContainer.children;
        for (let i = 0; i < 7; i++) {
          pips[i].classList.toggle('filled', i < curVal);
        }
      }
      if (btn) {
        btn.disabled = player.statPoints <= 0 || curVal >= 7;
        btn.style.opacity = (player.statPoints > 0 && curVal < 7) ? '1' : '0.3';
      }
    });

    const dock = document.getElementById('stats-dock');
    if (dock) {
      dock.style.opacity = (player.statPoints > 0 || Object.values(player.stats).some(v => v > 0)) ? '1' : '0.4';
    }

    checkClassEvolutions();
  }

  // --- CLASS EVOLUTION DOCK ---
  function checkClassEvolutions() {
    const classDock = document.getElementById('class-dock');
    if (!classDock) return;
    classDock.innerHTML = '';

    let available = [];
    if (player.level >= 15 && player.classId === 'basic') {
      available = ['twin', 'sniper', 'machinegun', 'flank'];
    } else if (player.level >= 30) {
      if (player.classId === 'twin') available = ['tripleshot'];
      else if (player.classId === 'sniper') available = ['destroyer'];
      else if (player.classId === 'flank') available = ['triangle'];
    } else if (player.level >= 45) {
      if (player.classId === 'tripleshot') available = ['octotank'];
      else if (player.classId === 'destroyer') available = ['annihilator'];
      else if (player.classId === 'triangle') available = ['booster'];
    }

    available.forEach(cid => {
      const c = TANK_CLASSES[cid];
      if (!c) return;
      const card = document.createElement('div');
      card.className = 'class-card';
      card.innerHTML = `
        <div class="class-card-icon">🛡️</div>
        <div class="class-card-name">${c.name}</div>
      `;
      card.addEventListener('click', () => {
        player.classId = cid;
        classDock.innerHTML = '';
        Sfx.levelup();
      });
      classDock.appendChild(card);
    });
  }

  // --- XP & LEVEL PROGRESSION ---
  function addScore(amount) {
    player.score += amount;
    const oldLevel = player.level;
    // Level formula: level = floor(sqrt(score / 35)) + 1
    player.level = Math.min(45, Math.floor(Math.sqrt(player.score / 28)) + 1);

    if (player.level > oldLevel) {
      player.statPoints += (player.level - oldLevel);
      Sfx.levelup();
      renderStatsUI();
    }

    updateHUD();
  }

  function updateHUD() {
    const scoreEl = document.getElementById('hud-score');
    if (scoreEl) scoreEl.textContent = `Skor: ${player.score.toLocaleString()}`;
    const lvlText = document.getElementById('hud-level-text');
    if (lvlText) lvlText.textContent = `Lvl ${player.level} ${TANK_CLASSES[player.classId].name}`;
    const xpFill = document.getElementById('hud-xp-fill');
    if (xpFill) {
      const curLvlScore = (player.level - 1) * (player.level - 1) * 28;
      const nextLvlScore = player.level * player.level * 28;
      const pct = Math.min(100, Math.max(0, ((player.score - curLvlScore) / (nextLvlScore - curLvlScore || 1)) * 100));
      xpFill.style.width = `${pct}%`;
    }
  }

  // --- RESIZE ---
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight - 44;
    canvas.width = width;
    canvas.height = height;
    minimapCanvas.width = 140;
    minimapCanvas.height = 140;
  }
  window.addEventListener('resize', resize);
  resize();

  // --- INPUT LISTENERS ---
  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key === 'w' || e.code === 'ArrowUp') keys.w = true;
    if (key === 'a' || e.code === 'ArrowLeft') keys.a = true;
    if (key === 's' || e.code === 'ArrowDown') keys.s = true;
    if (key === 'd' || e.code === 'ArrowRight') keys.d = true;
    if (e.code === 'Space') keys.isMouseDown = true;
    if (key === 'e') player.autoFire = !player.autoFire;
    if (key === 'c') player.autoSpin = !player.autoSpin;

    // Number keys 1-8 for quick stat upgrades
    const num = parseInt(key, 10);
    if (num >= 1 && num <= 8) {
      upgradeStat(STAT_CONFIG[num - 1].id);
    }
  });

  window.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    if (key === 'w' || e.code === 'ArrowUp') keys.w = false;
    if (key === 'a' || e.code === 'ArrowLeft') keys.a = false;
    if (key === 's' || e.code === 'ArrowDown') keys.s = false;
    if (key === 'd' || e.code === 'ArrowRight') keys.d = false;
    if (e.code === 'Space') keys.isMouseDown = false;
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    keys.mouseX = e.clientX - rect.left;
    keys.mouseY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousedown', e => {
    if (e.button === 0) keys.isMouseDown = true;
  });

  window.addEventListener('mouseup', () => {
    keys.isMouseDown = false;
  });

  // --- BULLET FIRE ENGINE ---
  function fireBarrel(tank, barrel, isPlayer = true) {
    const spread = barrel.spread || 0;
    const finalAngle = tank.angle + barrel.angle + (Math.random() - 0.5) * spread;
    const speedMult = barrel.speedMult || 1;
    const dmgMult = barrel.dmgMult || 1;
    const bulletSpeed = (7 + (isPlayer ? player.stats.bulletSpeed * 1.5 : 4)) * speedMult;
    const radius = barrel.bulletRadius || (isPlayer ? (9 + player.stats.bulletPen * 1.2) : 9);
    const damage = Math.round((14 + (isPlayer ? player.stats.bulletDmg * 8 : 10)) * dmgMult);

    const bx = tank.x + Math.cos(finalAngle) * (barrel.length + 5);
    const by = tank.y + Math.sin(finalAngle) * (barrel.length + 5);

    bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(finalAngle) * bulletSpeed,
      vy: Math.sin(finalAngle) * bulletSpeed,
      radius,
      damage,
      life: 90,
      color: tank.color,
      isPlayer
    });

    // Recoil on tank
    const recoil = barrel.heavy ? 4.5 : 1.5;
    tank.vx -= Math.cos(finalAngle) * recoil;
    tank.vy -= Math.sin(finalAngle) * recoil;

    if (isPlayer) Sfx.shoot(barrel.heavy);
  }

  // --- UPDATE ENGINE ---
  function update() {
    if (player.isDead) return;

    // Movement
    const speed = 2.8 + player.stats.moveSpeed * 0.45;
    if (keys.w) player.vy -= speed * 0.25;
    if (keys.s) player.vy += speed * 0.25;
    if (keys.a) player.vx -= speed * 0.25;
    if (keys.d) player.vx += speed * 0.25;

    player.vx *= 0.92;
    player.vy *= 0.92;
    player.x += player.vx;
    player.y += player.vy;

    // Arena boundary clamp
    player.x = Math.max(player.radius, Math.min(MAP_SIZE - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(MAP_SIZE - player.radius, player.y));

    // Aim Angle
    if (player.autoSpin) {
      player.angle += 0.04;
    } else {
      player.angle = Math.atan2(keys.mouseY - height / 2, keys.mouseX - width / 2);
    }

    // Health Regen
    if (player.stats.regen > 0 && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + 0.03 * player.stats.regen);
    }

    // Shooting
    player.shootTimer++;
    const classDef = TANK_CLASSES[player.classId];
    const reloadSpeed = Math.max(6, 24 - player.stats.reload * 2.2);

    if ((keys.isMouseDown || player.autoFire) && player.shootTimer >= reloadSpeed) {
      player.shootTimer = 0;
      classDef.barrels.forEach(b => {
        if (!b.recoilOnly) fireBarrel(player, b, true);
        else {
          // Thruster particles
          const thrusterAngle = player.angle + b.angle;
          player.vx -= Math.cos(thrusterAngle) * 1.8;
          player.vy -= Math.sin(thrusterAngle) * 1.8;
          particles.push({
            x: player.x + Math.cos(thrusterAngle) * b.length,
            y: player.y + Math.sin(thrusterAngle) * b.length,
            vx: Math.cos(thrusterAngle) * 6,
            vy: Math.sin(thrusterAngle) * 6,
            radius: 5,
            color: '#ff9100',
            life: 14
          });
        }
      });
    }

    // Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      // Shape Hits
      for (let j = shapes.length - 1; j >= 0; j--) {
        const s = shapes[j];
        const dist = Math.hypot(s.x - b.x, s.y - b.y);
        if (dist < s.radius + b.radius) {
          s.hp -= b.damage;
          s.vx += b.vx * 0.15;
          s.vy += b.vy * 0.15;

          // Spark particle
          particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, radius: 3, color: s.color, life: 12 });

          b.life = 0;
          if (s.hp <= 0) {
            shapes.splice(j, 1);
            if (b.isPlayer) addScore(s.xp);
            Sfx.pop();
            spawnShape();
          }
          break;
        }
      }

      // Bot Hits
      if (b.isPlayer) {
        for (let j = bots.length - 1; j >= 0; j--) {
          const bot = bots[j];
          const dist = Math.hypot(bot.x - b.x, bot.y - b.y);
          if (dist < bot.radius + b.radius) {
            bot.hp -= b.damage;
            b.life = 0;
            if (bot.hp <= 0) {
              addScore(bot.score);
              bots.splice(j, 1);
              bots.push(spawnBot(Date.now()));
            }
            break;
          }
        }
      } else {
        // Bot hitting Player
        const dist = Math.hypot(player.x - b.x, player.y - b.y);
        if (dist < player.radius + b.radius) {
          player.hp -= b.damage;
          b.life = 0;
          if (player.hp <= 0) {
            triggerGameOver();
          }
        }
      }

      if (b.life <= 0) bullets.splice(i, 1);
    }

    // Update Shapes
    shapes.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.angle += s.spinSpeed;
      s.vx *= 0.98;
      s.vy *= 0.98;

      // Player body ramming
      const dist = Math.hypot(s.x - player.x, s.y - player.y);
      if (dist < s.radius + player.radius) {
        const bodyDmg = 20 + player.stats.bodyDmg * 15;
        s.hp -= bodyDmg;
        player.hp -= s.hp > 0 ? 12 : 4;
        const pushAngle = Math.atan2(player.y - s.y, player.x - s.x);
        player.vx += Math.cos(pushAngle) * 3;
        player.vy += Math.sin(pushAngle) * 3;

        if (s.hp <= 0) {
          const idx = shapes.indexOf(s);
          if (idx !== -1) shapes.splice(idx, 1);
          addScore(s.xp);
          Sfx.pop();
          spawnShape();
        }
        if (player.hp <= 0) triggerGameOver();
      }
    });

    // Update Bots
    bots.forEach(bot => {
      // Find closest shape or attack player if close
      const distToPlayer = Math.hypot(player.x - bot.x, player.y - bot.y);
      if (distToPlayer < 450) {
        bot.angle = Math.atan2(player.y - bot.y, player.x - bot.x);
        bot.vx += Math.cos(bot.angle) * 0.3;
        bot.vy += Math.sin(bot.angle) * 0.3;
      } else {
        if (!bot.targetShape || Math.random() < 0.02) {
          bot.targetShape = shapes[Math.floor(Math.random() * shapes.length)];
        }
        if (bot.targetShape) {
          bot.angle = Math.atan2(bot.targetShape.y - bot.y, bot.targetShape.x - bot.x);
          bot.vx += Math.cos(bot.angle) * 0.2;
          bot.vy += Math.sin(bot.angle) * 0.2;
        }
      }

      bot.vx *= 0.92;
      bot.vy *= 0.92;
      bot.x += bot.vx;
      bot.y += bot.vy;

      // Bot shooting
      bot.shootTimer++;
      if (bot.shootTimer >= 35) {
        bot.shootTimer = 0;
        const bDef = TANK_CLASSES[bot.classId] || TANK_CLASSES.basic;
        bDef.barrels.forEach(b => {
          if (!b.recoilOnly) fireBarrel(bot, b, false);
        });
      }
    });

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function triggerGameOver() {
    player.isDead = true;
    const modal = document.getElementById('modal-respawn');
    const scoreVal = document.getElementById('respawn-score-val');
    if (scoreVal) scoreVal.textContent = player.score.toLocaleString();
    if (modal) modal.classList.remove('hidden');
  }

  // Respawn Handler
  const btnRespawn = document.getElementById('btn-respawn');
  if (btnRespawn) {
    btnRespawn.addEventListener('click', () => {
      player.hp = player.maxHp;
      player.x = CENTER + (Math.random() - 0.5) * 600;
      player.y = CENTER + (Math.random() - 0.5) * 600;
      player.vx = 0;
      player.vy = 0;
      player.score = Math.floor(player.score * 0.4);
      player.level = Math.max(1, Math.floor(player.level * 0.6));
      player.isDead = false;
      const modal = document.getElementById('modal-respawn');
      if (modal) modal.classList.add('hidden');
      updateHUD();
    });
  }

  // --- DRAW ENGINE ---
  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // Camera follow player
    ctx.translate(width / 2 - player.x, height / 2 - player.y);

    // 1. Arena Background & Grid
    ctx.fillStyle = '#cdcdcd';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Grid lines
    ctx.strokeStyle = '#bcbcbc';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const startX = Math.floor((player.x - width / 2) / gridSize) * gridSize;
    const endX = startX + width + gridSize * 2;
    const startY = Math.floor((player.y - height / 2) / gridSize) * gridSize;
    const endY = startY + height + gridSize * 2;

    ctx.beginPath();
    for (let x = startX; x < endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Pentagon Nest Ring
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, NEST_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(118, 141, 252, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(118, 141, 252, 0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. Draw Shapes
    shapes.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.fillStyle = s.color;
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < s.sides; i++) {
        const a = (i * Math.PI * 2) / s.sides;
        const px = Math.cos(a) * s.radius;
        const py = Math.sin(a) * s.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Shape HP bar if damaged
      if (s.hp < s.maxHp) {
        ctx.rotate(-s.angle);
        ctx.fillStyle = '#444';
        ctx.fillRect(-s.radius, s.radius + 6, s.radius * 2, 5);
        ctx.fillStyle = '#00e676';
        ctx.fillRect(-s.radius, s.radius + 6, (s.radius * 2) * (s.hp / s.maxHp), 5);
      }
      ctx.restore();
    });

    // 3. Draw Bullets
    bullets.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
    });

    // 4. Draw Bots
    bots.forEach(bot => drawTank(bot));

    // 5. Draw Player
    if (!player.isDead) drawTank(player);

    // 6. Draw Particles
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });

    ctx.restore();

    // 7. Draw Minimap & Leaderboard
    drawMinimap();
    drawLeaderboard();
  }

  function drawTank(t) {
    const classDef = TANK_CLASSES[t.classId] || TANK_CLASSES.basic;

    ctx.save();
    ctx.translate(t.x, t.y);

    // Draw Barrels
    classDef.barrels.forEach(b => {
      ctx.save();
      ctx.rotate(t.angle + b.angle);
      const bx = b.offset || 0;
      ctx.fillStyle = '#999';
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2.5;
      ctx.fillRect(bx - b.width / 2, 0, b.width, b.length);
      ctx.strokeRect(bx - b.width / 2, 0, b.width, b.length);
      ctx.restore();
    });

    // Draw Body Circle
    ctx.beginPath();
    ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
    ctx.fillStyle = t.color;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    // Name & HP Bar
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(t.name, 0, -t.radius - 12);
    ctx.shadowBlur = 0;

    // HP Bar
    const barW = t.radius * 2;
    ctx.fillStyle = '#333';
    ctx.fillRect(-barW / 2, t.radius + 8, barW, 6);
    ctx.fillStyle = t.color === '#00b0ff' ? '#00e676' : '#ff3d00';
    ctx.fillRect(-barW / 2, t.radius + 8, barW * Math.max(0, t.hp / t.maxHp), 6);

    ctx.restore();
  }

  function drawMinimap() {
    mmCtx.clearRect(0, 0, 140, 140);
    mmCtx.fillStyle = '#11141a';
    mmCtx.fillRect(0, 0, 140, 140);

    // Center nest indicator
    const nestX = (CENTER / MAP_SIZE) * 140;
    const nestY = (CENTER / MAP_SIZE) * 140;
    const nestR = (NEST_RADIUS / MAP_SIZE) * 140;
    mmCtx.beginPath();
    mmCtx.arc(nestX, nestY, nestR, 0, Math.PI * 2);
    mmCtx.fillStyle = 'rgba(118, 141, 252, 0.25)';
    mmCtx.fill();

    // Bots dots
    bots.forEach(b => {
      const mx = (b.x / MAP_SIZE) * 140;
      const my = (b.y / MAP_SIZE) * 140;
      mmCtx.fillStyle = '#f14e54';
      mmCtx.fillRect(mx - 1.5, my - 1.5, 3, 3);
    });

    // Player dot
    const px = (player.x / MAP_SIZE) * 140;
    const py = (player.y / MAP_SIZE) * 140;
    mmCtx.fillStyle = '#00e676';
    mmCtx.beginPath();
    mmCtx.arc(px, py, 4, 0, Math.PI * 2);
    mmCtx.fill();
  }

  function drawLeaderboard() {
    const lbContainer = document.getElementById('lb-list');
    if (!lbContainer) return;

    const allTanks = [
      { name: player.name, score: player.score, isMe: true },
      ...bots.map(b => ({ name: b.name, score: b.score, isMe: false }))
    ];
    allTanks.sort((a, b) => b.score - a.score);

    lbContainer.innerHTML = allTanks.slice(0, 8).map((t, idx) => `
      <div class="lb-row ${t.isMe ? 'me' : ''}">
        <span>${idx + 1}. ${t.name}</span>
        <span>${t.score.toLocaleString()}</span>
      </div>
    `).join('');
  }

  // --- GAME LOOP ---
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  initGame();
  requestAnimationFrame(loop);

})();
