// dino.js - Chrome Cyber T-Rex Runner HD
// Authentic offline dinosaur runner with day/night transitions, audio and cyber graphics
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
    jump() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.1);
      } catch(_) {}
    },
    score() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1174, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.2);
      } catch(_) {}
    },
    crash() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.25);
      } catch(_) {}
    }
  };

  const canvas = document.getElementById('dino-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score-val');
  const highScoreEl = document.getElementById('high-score-val');
  const overlay = document.getElementById('dino-overlay');
  const startBtn = document.getElementById('btn-dino-start');

  canvas.width = 1000;
  canvas.height = 380;
  const GROUND_Y = 310;

  let state = {
    running: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('dino_highscore') || '0', 10),
    speed: 8,
    isNight: false,
    nightTimer: 0
  };

  highScoreEl.textContent = state.highScore.toString().padStart(5, '0');

  // Dino Player
  const dino = {
    x: 90,
    y: GROUND_Y - 48,
    w: 44,
    h: 48,
    vy: 0,
    gravity: 0.85,
    jumpForce: -14.5,
    isGrounded: true,
    isDucking: false,
    legStep: 0
  };

  let obstacles = [];
  let clouds = [];
  let groundOffset = 0;
  let spawnTimer = 0;

  function initClouds() {
    clouds = [];
    for (let i = 0; i < 4; i++) {
      clouds.push({
        x: Math.random() * canvas.width,
        y: 40 + Math.random() * 90,
        speed: 0.5 + Math.random() * 0.8
      });
    }
  }

  function spawnObstacle() {
    const isPtero = state.score > 250 && Math.random() < 0.35;
    if (isPtero) {
      // Pterodactyl at 3 flight levels: low, mid, high
      const levels = [GROUND_Y - 30, GROUND_Y - 65, GROUND_Y - 95];
      const y = levels[Math.floor(Math.random() * levels.length)];
      obstacles.push({
        type: 'ptero',
        x: canvas.width + 40,
        y,
        w: 42,
        h: 30,
        frame: 0
      });
    } else {
      // Cactus
      const count = Math.random() < 0.4 ? 2 : (Math.random() < 0.15 ? 3 : 1);
      const isLarge = Math.random() < 0.4;
      const w = count * (isLarge ? 22 : 16);
      const h = isLarge ? 52 : 38;
      obstacles.push({
        type: 'cactus',
        x: canvas.width + 40,
        y: GROUND_Y - h,
        w,
        h,
        count,
        isLarge
      });
    }
  }

  function handleJump() {
    if (!state.running) {
      startGame();
      return;
    }
    if (dino.isGrounded && !dino.isDucking) {
      dino.vy = dino.jumpForce;
      dino.isGrounded = false;
      Sfx.jump();
    }
  }

  function startGame() {
    state.running = true;
    state.score = 0;
    state.speed = 8;
    state.isNight = false;
    obstacles = [];
    dino.y = GROUND_Y - 48;
    dino.vy = 0;
    dino.isGrounded = true;
    dino.isDucking = false;
    spawnTimer = 60;
    initClouds();
    overlay.style.display = 'none';
  }

  function gameOver() {
    state.running = false;
    Sfx.crash();
    if (state.score > state.highScore) {
      state.highScore = Math.floor(state.score);
      localStorage.setItem('dino_highscore', state.highScore.toString());
      highScoreEl.textContent = state.highScore.toString().padStart(5, '0');
    }
    overlay.style.display = 'flex';
    document.getElementById('overlay-title').textContent = '💥 OYUN BİTTİ!';
    document.getElementById('overlay-sub').textContent = `Skorun: ${Math.floor(state.score)} | Tekrar oynamak için tıkla`;
    startBtn.textContent = 'YENİDEN BAŞLA 🔄';
  }

  // --- INPUT LISTENERS ---
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      handleJump();
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      if (dino.isGrounded) {
        dino.isDucking = true;
        dino.h = 28;
        dino.y = GROUND_Y - 28;
      } else {
        dino.vy += 8; // Fast drop
      }
    }
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      dino.isDucking = false;
      dino.h = 48;
      dino.y = GROUND_Y - 48;
    }
  });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    handleJump();
  }, { passive: false });

  if (startBtn) startBtn.addEventListener('click', startGame);

  // --- UPDATE ENGINE ---
  function update() {
    if (!state.running) return;

    // Score & Speed
    state.score += 0.15;
    scoreEl.textContent = Math.floor(state.score).toString().padStart(5, '0');

    if (Math.floor(state.score) > 0 && Math.floor(state.score) % 100 === 0 && Math.floor(state.score) % 1 === 0) {
      if (!state.milestoneSoundPlayed) {
        Sfx.score();
        state.milestoneSoundPlayed = true;
      }
    } else {
      state.milestoneSoundPlayed = false;
    }

    // Day/Night Cycle (every 700 points)
    state.isNight = Math.floor(state.score / 700) % 2 === 1;

    // Speed scales with score
    state.speed = 8 + Math.min(10, Math.floor(state.score / 200) * 0.8);

    // Dino Physics
    dino.vy += dino.gravity;
    dino.y += dino.vy;

    const floorY = GROUND_Y - dino.h;
    if (dino.y >= floorY) {
      dino.y = floorY;
      dino.vy = 0;
      dino.isGrounded = true;
    }

    dino.legStep += 0.25;

    // Ground scroll
    groundOffset = (groundOffset + state.speed) % 30;

    // Clouds
    clouds.forEach(c => {
      c.x -= c.speed;
      if (c.x < -60) c.x = canvas.width + 40;
    });

    // Spawn Obstacles
    spawnTimer--;
    if (spawnTimer <= 0) {
      spawnObstacle();
      const minGap = Math.max(45, 95 - Math.floor(state.speed * 2));
      spawnTimer = minGap + Math.floor(Math.random() * 45);
    }

    // Update Obstacles & Collision
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= state.speed;

      if (o.type === 'ptero') {
        o.frame = (o.frame + 0.12) % 2;
      }

      // Hitbox check
      const margin = 6;
      if (
        dino.x + dino.w - margin > o.x + margin &&
        dino.x + margin < o.x + o.w - margin &&
        dino.y + dino.h - margin > o.y + margin &&
        dino.y + margin < o.y + o.h - margin
      ) {
        gameOver();
        return;
      }

      if (o.x < -60) obstacles.splice(i, 1);
    }
  }

  // --- DRAW ENGINE ---
  function draw() {
    // Background color
    ctx.fillStyle = state.isNight ? '#0b0f19' : '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Neon Clouds
    ctx.fillStyle = state.isNight ? '#1e293b' : '#374151';
    clouds.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
      ctx.arc(c.x + 12, c.y - 6, 18, 0, Math.PI * 2);
      ctx.arc(c.x + 28, c.y, 12, 0, Math.PI * 2);
      ctx.fill();
    });

    // Moon / Sun
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width - 120, 60, 22, 0, Math.PI * 2);
    ctx.fillStyle = state.isNight ? '#e2e8f0' : '#fbbf24';
    ctx.shadowColor = state.isNight ? '#94a3b8' : '#f59e0b';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.restore();

    // Ground line
    ctx.strokeStyle = state.isNight ? '#38bdf8' : '#00e676';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = state.isNight ? '#38bdf8' : '#00e676';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // Ground details (dunes / bumps)
    ctx.lineWidth = 1;
    for (let x = -groundOffset; x < canvas.width; x += 30) {
      if ((x * 7) % 5 === 0) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y + 4);
        ctx.lineTo(x + 12, GROUND_Y + 4);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    // Draw Obstacles
    obstacles.forEach(o => {
      if (o.type === 'cactus') {
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        ctx.shadowBlur = 0;
      } else {
        // Pterodactyl
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y + 14);
        ctx.lineTo(o.x + o.w, o.y + 14);
        const wingY = Math.floor(o.frame) === 0 ? o.y : o.y + 28;
        ctx.lineTo(o.x + 18, wingY);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw Cyber Dino
    ctx.save();
    ctx.translate(dino.x, dino.y);

    const dinoColor = state.isNight ? '#38bdf8' : '#00e676';
    ctx.fillStyle = dinoColor;
    ctx.shadowColor = dinoColor;
    ctx.shadowBlur = 10;

    if (dino.isDucking) {
      // Ducking Dino
      ctx.fillRect(0, 10, 48, 18); // Body
      ctx.fillRect(40, 6, 14, 10); // Head
      // Eye
      ctx.fillStyle = '#000';
      ctx.fillRect(48, 8, 3, 3);
      // Legs
      ctx.fillStyle = dinoColor;
      const legOffset = Math.floor(dino.legStep) % 2 === 0 ? 3 : -3;
      ctx.fillRect(10 + legOffset, 24, 6, 6);
      ctx.fillRect(28 - legOffset, 24, 6, 6);
    } else {
      // Standing Dino
      ctx.fillRect(10, 14, 24, 24); // Body
      ctx.fillRect(22, 0, 18, 16);  // Head
      ctx.fillRect(34, 10, 8, 4);   // Snout
      ctx.fillRect(0, 20, 10, 10);  // Tail

      // Eye
      ctx.fillStyle = '#000';
      ctx.fillRect(32, 4, 3, 3);

      // Legs
      ctx.fillStyle = dinoColor;
      if (dino.isGrounded) {
        const step = Math.floor(dino.legStep) % 2;
        ctx.fillRect(12, 38, 4, step === 0 ? 10 : 6);
        ctx.fillRect(24, 38, 4, step === 1 ? 10 : 6);
      } else {
        ctx.fillRect(14, 38, 4, 8);
        ctx.fillRect(22, 38, 4, 8);
      }
    }
    ctx.restore();
  }

  // --- LOOP ---
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  initClouds();
  requestAnimationFrame(loop);

})();
