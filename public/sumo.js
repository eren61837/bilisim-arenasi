// sumo.js - Ahmet Hakan Kutu Sumo Web 60FPS Ragdoll Engine
(function() {
  'use strict';

  // --- AUDIO SYNTHESIZER ---
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.ctx = new AudioContext();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    playTone(freqStart, freqEnd, type, duration, vol = 0.2) {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), now + duration);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
      } catch (_) {}
    },
    playNoise(duration, vol = 0.25) {
      try {
        this.init();
        if (!this.ctx) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        whiteNoise.connect(gain);
        gain.connect(this.ctx.destination);
        whiteNoise.start();
      } catch (_) {}
    },
    punch() { this.playNoise(0.08, 0.3); this.playTone(320, 120, 'square', 0.08, 0.2); },
    hit() { this.playNoise(0.12, 0.4); this.playTone(180, 60, 'triangle', 0.12, 0.3); },
    bigHit() { this.playNoise(0.25, 0.5); this.playTone(140, 40, 'sawtooth', 0.25, 0.45); },
    jump() { this.playTone(220, 520, 'sine', 0.14, 0.25); },
    superBlast() {
      this.playNoise(0.4, 0.6);
      this.playTone(100, 30, 'sawtooth', 0.45, 0.5);
      this.playTone(600, 900, 'square', 0.2, 0.3);
    },
    ko() {
      this.playTone(523.25, 523.25, 'triangle', 0.6, 0.4); // C5
      setTimeout(() => this.playTone(659.25, 659.25, 'triangle', 0.8, 0.4), 180); // E5
      setTimeout(() => this.playTone(783.99, 783.99, 'triangle', 1.0, 0.45), 360); // G5
    }
  };

  // --- CONFIG & CONSTANTS ---
  const W = 640;
  const H = 360;
  const GRAVITY = 780;
  const DT = 1 / 60;
  const SUBSTEPS = 3;

  // Sound & Meme Quotes for Ahmet Hakan
  const AHMET_QUOTES = [
    "SON DAKİKA!",
    "BİR DAKİKA AHMET BEY!",
    "TARAFSIZ BÖLGE!",
    "MASAYA VURURUM!",
    "HADDİNİ BİL!",
    "REKLAMA GİDİYORUZ!",
    "SICAK GELİŞME!",
    "BENİ DİNLEYECEKSİNİZ!"
  ];

  // Canvas Setup
  const canvas = document.getElementById('sumo-canvas');
  const ctx = canvas.getContext('2d');
  function resizeCanvas() {
    canvas.width = W;
    canvas.height = H;
  }
  resizeCanvas();

  // --- STATE ---
  const state = {
    mode: 'local', // 'local', 'ai', 'online'
    map: 'tv', // 'tv', 'klasik', 'buz', 'asansor', 'ruzgar', 'lav'
    gravityMode: 'NORMAL',
    winScore: 3,
    aiDiff: 'NORMAL',
    p1Score: 0,
    p2Score: 0,
    round: 1,
    roundTime: 0,
    shrinkAmount: 0,
    isCountingDown: false,
    countdownVal: 3,
    isKO: false,
    winner: null,
    slowMotion: 1.0,
    ws: null,
    isHost: false,
    particles: [],
    popups: []
  };

  // --- PARTICLE / VERLET PRIMITIVES ---
  class Point {
    constructor(x, y, r = 5, mass = 1.0) {
      this.x = x;
      this.y = y;
      this.px = x;
      this.py = y;
      this.ax = 0;
      this.ay = 0;
      this.r = r;
      this.mass = mass;
      this.grounded = false;
    }
    update(dt, friction = 0.85) {
      const vx = (this.x - this.px) * friction;
      const vy = (this.y - this.py);
      this.px = this.x;
      this.py = this.y;
      this.x += vx + this.ax * dt * dt;
      this.y += vy + this.ay * dt * dt;
      this.ax = 0;
      this.ay = 0;
    }
  }

  class Stick {
    constructor(p1, p2, length, stiffness = 1.0) {
      this.p1 = p1;
      this.p2 = p2;
      this.length = length !== undefined ? length : Math.hypot(p1.x - p2.x, p1.y - p2.y);
      this.stiffness = stiffness;
    }
    update() {
      const dx = this.p2.x - this.p1.x;
      const dy = this.p2.y - this.p1.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const diff = (this.length - dist) / dist * 0.5 * this.stiffness;
      const ox = dx * diff;
      const oy = dy * diff;
      this.p1.x -= ox;
      this.p1.y -= oy;
      this.p2.x += ox;
      this.p2.y += oy;
    }
  }

  // --- RAGDOLL FIGHTER CLASS ---
  class RagdollFighter {
    constructor(x, y, color, isAhmet = false, isP1 = true) {
      this.isAhmet = isAhmet;
      this.isP1 = isP1;
      this.color = color;
      this.facing = isP1 ? 1 : -1;
      this.superMeter = 0;
      this.isBraced = false;
      this.isStunned = 0;
      this.punchCooldown = 0;
      this.punchTimer = 0;
      this.punchPower = 1.0;
      this.chargeTime = 0;
      this.isCharging = false;
      this.ko = false;

      // Construct points
      // Torso quad: tl, tr, br, bl
      const s = 14;
      this.points = {
        head: new Point(x, y - s - 12, 10, 1.2),
        tl: new Point(x - s, y - s, 7, 2.0),
        tr: new Point(x + s, y - s, 7, 2.0),
        bl: new Point(x - s, y + s, 8, 2.5),
        br: new Point(x + s, y + s, 8, 2.5),
        handL: new Point(x - s - 10, y, 7, 1.0),
        handR: new Point(x + s + 10, y, 7, 1.0),
        footL: new Point(x - s * 0.7, y + s + 16, 7, 1.4),
        footR: new Point(x + s * 0.7, y + s + 16, 7, 1.4)
      };

      // Construct sticks
      const p = this.points;
      this.sticks = [
        // Torso Box
        new Stick(p.tl, p.tr),
        new Stick(p.tr, p.br),
        new Stick(p.br, p.bl),
        new Stick(p.bl, p.tl),
        new Stick(p.tl, p.br), // Cross support
        new Stick(p.tr, p.bl), // Cross support

        // Neck
        new Stick(p.head, p.tl),
        new Stick(p.head, p.tr),

        // Arms
        new Stick(p.tl, p.handL, 20),
        new Stick(p.tr, p.handR, 20),

        // Legs
        new Stick(p.bl, p.footL, 22),
        new Stick(p.br, p.footR, 22)
      ];
    }

    get center() {
      const p = this.points;
      return {
        x: (p.tl.x + p.tr.x + p.bl.x + p.br.x) * 0.25,
        y: (p.tl.y + p.tr.y + p.bl.y + p.br.y) * 0.25
      };
    }

    applyControls(ctrl, dt) {
      if (this.ko) return;
      const p = this.points;
      const isGrounded = p.footL.grounded || p.footR.grounded;

      // Handle Stun
      if (this.isStunned > 0) {
        this.isStunned -= dt;
        return;
      }

      // Horizontal Run
      let move = 0;
      if (ctrl.left) move -= 1;
      if (ctrl.right) move += 1;
      if (move !== 0) this.facing = move;

      const runSpeed = 2200 * (this.isBraced ? 0.4 : 1.0);
      for (const key in p) {
        p[key].ax += move * runSpeed;
      }

      // Jump
      if (ctrl.jump && isGrounded) {
        AudioEngine.jump();
        for (const key in p) {
          p[key].ay -= 32000;
        }
        createDust(p.footL.x, p.footL.y);
        createDust(p.footR.x, p.footR.y);
      }

      // Brace / Block (S or Down Arrow)
      this.isBraced = !!ctrl.block;
      if (this.isBraced) {
        // Pull hands in, stiffen torso
        p.handL.ax += (p.tl.x - p.handL.x) * 180;
        p.handR.ax += (p.tr.x - p.handR.x) * 180;
        p.head.ay += 600;
      }

      // Punch & Charge
      if (this.punchCooldown > 0) this.punchCooldown -= dt;
      if (ctrl.punch && !this.isBraced) {
        this.chargeTime += dt;
        this.isCharging = true;
        if (Math.random() < 0.3) {
          createSpark(this.facing === 1 ? p.handR.x : p.handL.x, this.facing === 1 ? p.handR.y : p.handL.y);
        }
      } else {
        if (this.isCharging && this.punchCooldown <= 0) {
          const power = this.chargeTime > 0.4 ? 1.85 : 1.0;
          this.executePunch(power, this.chargeTime > 0.4);
        }
        this.isCharging = false;
        this.chargeTime = 0;
      }

      // Super Power Trigger
      if (ctrl.super && this.superMeter >= 100) {
        this.triggerSuper();
      }

      // Upright Balance Spring (PID controller)
      const topX = (p.tl.x + p.tr.x) * 0.5;
      const topY = (p.tl.y + p.tr.y) * 0.5;
      const botX = (p.bl.x + p.br.x) * 0.5;
      const botY = (p.bl.y + p.br.y) * 0.5;
      const tilt = (topX - botX) / (Math.hypot(topX - botX, topY - botY) || 1);

      const balanceForce = -tilt * 16000;
      p.tl.ax += balanceForce;
      p.tr.ax += balanceForce;
      p.bl.ax -= balanceForce;
      p.br.ax -= balanceForce;
    }

    executePunch(power, isCharged) {
      AudioEngine.punch();
      this.punchCooldown = 0.35;
      this.punchTimer = 0.22;
      this.punchPower = power;

      const p = this.points;
      const leadHand = this.facing === 1 ? p.handR : p.handL;
      leadHand.ax += this.facing * 35000 * power;
      leadHand.ay -= 8000;

      // Body lunge
      for (const k in p) {
        p[k].ax += this.facing * 12000 * power;
      }

      if (isCharged) {
        createPopup(leadHand.x, leadHand.y - 20, "ŞARJLI YUMRUK! ⚡", "#ffd700");
      }
    }

    triggerSuper() {
      this.superMeter = 0;
      AudioEngine.superBlast();

      const c = this.center;
      if (this.isAhmet) {
        // TARAFSIZ BÖLGE MASA VURUŞU
        triggerMemeBanner(AHMET_QUOTES[Math.floor(Math.random() * AHMET_QUOTES.length)]);
        createPopup(c.x, c.y - 30, "TARAFSIZ BÖLGE ŞOKU! 💥", "#ff1744");

        // Radial Shockwave that pushes opponent
        const foe = this.isP1 ? fighterP2 : fighterP1;
        const dx = foe.center.x - c.x;
        const dy = foe.center.y - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const push = 38000;

        for (const k in foe.points) {
          foe.points[k].ax += (dx / d) * push;
          foe.points[k].ay -= 18000;
        }
        foe.isStunned = 0.7;

        for (let i = 0; i < 25; i++) {
          createSpark(c.x, c.y, '#ff1744');
        }
      } else {
        // GÖBEK FIRLATMASI
        triggerMemeBanner("MEGA SUMO FIRLATMASI!");
        createPopup(c.x, c.y - 30, "GÖBEK FIRLATMASI! 🐲", "#2979ff");

        const foe = this.isP1 ? fighterP2 : fighterP1;
        for (const k in this.points) {
          this.points[k].ax += this.facing * 45000;
        }
        for (const k in foe.points) {
          foe.points[k].ax += this.facing * 35000;
          foe.points[k].ay -= 16000;
        }
        foe.isStunned = 0.6;
      }
    }

    updatePhysics(dt, env) {
      const grav = GRAVITY * (state.gravityMode === 'AY' ? 0.5 : (state.gravityMode === 'AGIR' ? 1.4 : 1.0));
      const p = this.points;

      // Apply Gravity & Wind
      for (const k in p) {
        p[k].ay += grav;
        if (state.map === 'ruzgar') {
          p[k].ax += Math.sin(state.roundTime * 1.5) * 600;
        }
        p[k].update(dt, env.friction);
      }

      // Solve Sticks Constraints Multiple Times
      for (let s = 0; s < SUBSTEPS; s++) {
        for (let i = 0; i < this.sticks.length; i++) {
          this.sticks[i].update();
        }
      }

      // Environment & Platform Collisions
      for (const k in p) {
        const pt = p[k];
        pt.grounded = false;

        // Platform Floor Check
        const platY = env.platformY;
        const platL = env.platformLeft;
        const platR = env.platformRight;

        if (pt.y + pt.r >= platY && pt.x >= platL && pt.x <= platR && pt.py <= platY + 12) {
          pt.y = platY - pt.r;
          pt.grounded = true;
          // Friction damping
          pt.px = pt.x - (pt.x - pt.px) * env.friction;
        }

        // Lava border hazard
        if (state.map === 'lav') {
          if (pt.y > platY - 5 && (pt.x < platL || pt.x > platR)) {
            pt.ay -= 30000; // bounce violently upwards
            createSpark(pt.x, pt.y, '#ff3d00');
          }
        }

        // Pit fall KO check
        if (pt.y > H + 50 && !this.ko) {
          this.triggerKO();
        }
      }
    }

    triggerKO() {
      this.ko = true;
      AudioEngine.ko();
      state.isKO = true;
      state.slowMotion = 0.3;
      state.winner = this.isP1 ? 'P2' : 'P1';

      if (this.isP1) {
        state.p2Score++;
        document.getElementById('p2-score').textContent = state.p2Score;
      } else {
        state.p1Score++;
        document.getElementById('p1-score').textContent = state.p1Score;
      }

      setTimeout(() => {
        showKOMenu(state.winner);
      }, 1000);
    }

    render(ctx) {
      const p = this.points;

      // Draw Limbs (Bones)
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = this.color;

      // Torso Fill
      ctx.beginPath();
      ctx.moveTo(p.tl.x, p.tl.y);
      ctx.lineTo(p.tr.x, p.tr.y);
      ctx.lineTo(p.br.x, p.br.y);
      ctx.lineTo(p.bl.x, p.bl.y);
      ctx.closePath();
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Suit Tie & Shirt for Ahmet Hakan
      if (this.isAhmet) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        const midTopX = (p.tl.x + p.tr.x) * 0.5;
        const midTopY = (p.tl.y + p.tr.y) * 0.5;
        ctx.arc(midTopX, midTopY + 4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ff1744'; // Red tie
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(midTopX, midTopY + 2);
        ctx.lineTo(midTopX, midTopY + 14);
        ctx.stroke();
      }

      // Draw Head
      ctx.beginPath();
      ctx.arc(p.head.x, p.head.y, p.head.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
      ctx.stroke();

      // Facial Features
      const lookDir = this.facing;
      const eyeX1 = p.head.x + lookDir * 2;
      const eyeX2 = p.head.x + lookDir * 6;
      const eyeY = p.head.y - 1;

      if (this.isAhmet) {
        // Ahmet Hakan Eyeglasses
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(eyeX1 - 3, eyeY - 3, 5, 5);
        ctx.strokeRect(eyeX2 - 3, eyeY - 3, 5, 5);
        ctx.beginPath();
        ctx.moveTo(eyeX1 + 2, eyeY);
        ctx.lineTo(eyeX2 - 3, eyeY);
        ctx.stroke();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(eyeX1 - 1, eyeY - 1, 2, 2);
        ctx.fillRect(eyeX2 - 1, eyeY - 1, 2, 2);

        // Stern / Intense Eyebrows
        ctx.beginPath();
        ctx.moveTo(eyeX1 - 4, eyeY - 5);
        ctx.lineTo(eyeX1 + 3, eyeY - 3);
        ctx.moveTo(eyeX2 - 3, eyeY - 3);
        ctx.lineTo(eyeX2 + 4, eyeY - 5);
        ctx.stroke();
      } else {
        // Classic Sumo Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(eyeX1, eyeY, 1.8, 0, Math.PI * 2);
        ctx.arc(eyeX2, eyeY, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Sumo Topknot / Hair
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(p.head.x, p.head.y - p.head.r - 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hands & Feet
      ctx.fillStyle = this.color;
      [p.handL, p.handR, p.footL, p.footR].forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Charging Glow Effect
      if (this.isCharging) {
        const glowHand = this.facing === 1 ? p.handR : p.handL;
        ctx.beginPath();
        ctx.arc(glowHand.x, glowHand.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.fill();
      }
    }
  }

  // --- POPUPS & PARTICLES ---
  function createSpark(x, y, color = '#ffeb3b') {
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 180,
      vy: (Math.random() - 0.5) * 180 - 40,
      r: Math.random() * 3 + 2,
      color,
      life: 0.35,
      maxLife: 0.35
    });
  }

  function createDust(x, y) {
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 40,
      vy: -Math.random() * 30,
      r: Math.random() * 4 + 2,
      color: 'rgba(200, 200, 200, 0.6)',
      life: 0.25,
      maxLife: 0.25
    });
  }

  function createPopup(x, y, text, color = '#fff') {
    state.popups.push({
      x, y, text, color,
      vy: -45,
      life: 0.8,
      maxLife: 0.8
    });
  }

  function triggerMemeBanner(text) {
    const el = document.getElementById('meme-banner');
    const txt = document.getElementById('meme-text');
    if (!el || !txt) return;
    txt.textContent = text;
    el.classList.remove('hidden');
    // Force re-animation
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'memePop 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
  }

  // --- FIGHTER INSTANCES ---
  let fighterP1 = new RagdollFighter(W * 0.35, H * 0.55, '#f59e0b', true, true);
  let fighterP2 = new RagdollFighter(W * 0.65, H * 0.55, '#3b82f6', false, false);

  // --- INPUT CONTROLLERS ---
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    AudioEngine.init();

    // Reset & Match hotkeys
    if (e.code === 'KeyR') resetRound();
    if (e.code === 'Enter' && state.isKO) resetRound();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  // Mobile Touch Controls
  const touchState = { left: false, right: false, jump: false, block: false, punch: false, super: false };
  function bindTouch(id, prop) {
    const el = document.getElementById(id);
    if (!el) return;
    const activate = (e) => { e.preventDefault(); touchState[prop] = true; AudioEngine.init(); };
    const deactivate = (e) => { e.preventDefault(); touchState[prop] = false; };
    el.addEventListener('touchstart', activate);
    el.addEventListener('touchend', deactivate);
    el.addEventListener('mousedown', activate);
    el.addEventListener('mouseup', deactivate);
  }
  bindTouch('touch-left', 'left');
  bindTouch('touch-right', 'right');
  bindTouch('touch-jump', 'jump');
  bindTouch('touch-block', 'block');
  bindTouch('touch-punch', 'punch');
  bindTouch('touch-super', 'super');

  // --- GET CONTROLS ---
  function getP1Controls() {
    return {
      left: keys['KeyA'] || touchState.left,
      right: keys['KeyD'] || touchState.right,
      jump: keys['KeyW'] || touchState.jump,
      block: keys['KeyS'] || touchState.block,
      punch: keys['Space'] || touchState.punch,
      super: keys['KeyQ'] || keys['KeyE'] || touchState.super
    };
  }

  function getP2Controls() {
    if (state.mode === 'ai') {
      return getAIControls();
    }
    return {
      left: keys['ArrowLeft'],
      right: keys['ArrowRight'],
      jump: keys['ArrowUp'],
      block: keys['ArrowDown'],
      punch: keys['Enter'] || keys['Numpad0'],
      super: keys['ShiftRight'] || keys['ControlRight']
    };
  }

  // --- AI BEHAVIOR CONTROLLER ---
  let aiTimer = 0;
  let aiState = 'approach';
  function getAIControls() {
    const f1 = fighterP1.center;
    const f2 = fighterP2.center;
    const dist = Math.hypot(f1.x - f2.x, f1.y - f2.y);
    const diff = state.aiDiff;

    aiTimer += DT;
    if (aiTimer > 0.4) {
      aiTimer = 0;
      if (dist < 45) {
        aiState = Math.random() < (diff === 'ZOR' ? 0.75 : 0.5) ? 'punch' : 'block';
      } else {
        aiState = 'approach';
      }
    }

    return {
      left: f1.x < f2.x - 25,
      right: f1.x > f2.x + 25,
      jump: (f1.y < f2.y - 30 || Math.random() < 0.05),
      block: aiState === 'block',
      punch: aiState === 'punch' || (dist < 40 && Math.random() < 0.3),
      super: fighterP2.superMeter >= 100 && dist < 70
    };
  }

  // --- ARENA / ENVIRONMENT DATA ---
  function getEnvironment(time) {
    let platY = H * 0.72;
    let platW = W * 0.62;
    let friction = 0.85;

    // Stage modifications
    if (state.map === 'buz') {
      friction = 0.992; // very slippery
    } else if (state.map === 'asansor') {
      platY += Math.sin(time * 1.5) * 35; // moving platform
    }

    // Platform shrinkage
    const shrink = Math.max(0, state.shrinkAmount);
    const halfW = Math.max(45, (platW * 0.5) - shrink);

    return {
      platformY: platY,
      platformLeft: (W * 0.5) - halfW,
      platformRight: (W * 0.5) + halfW,
      friction
    };
  }

  // --- HIT DETECTION BETWEEN FIGHTERS ---
  function checkCombatCollisions() {
    if (state.isKO) return;

    checkFighterAttack(fighterP1, fighterP2);
    checkFighterAttack(fighterP2, fighterP1);
  }

  function checkFighterAttack(attacker, victim) {
    if (attacker.punchTimer <= 0) return;
    const fist = attacker.facing === 1 ? attacker.points.handR : attacker.points.handL;

    for (const k in victim.points) {
      const target = victim.points[k];
      const dist = Math.hypot(fist.x - target.x, fist.y - target.y);
      if (dist < fist.r + target.r + 6) {
        // Hit confirmed!
        attacker.punchTimer = 0; // consume attack
        const power = attacker.punchPower;

        if (power > 1.2) AudioEngine.bigHit();
        else AudioEngine.hit();

        // Calculate Knockback
        const pushX = attacker.facing * 18000 * power * (victim.isBraced ? 0.35 : 1.0);
        const pushY = -8000 * power;

        for (const pk in victim.points) {
          victim.points[pk].ax += pushX;
          victim.points[pk].ay += pushY;
        }

        // Stun & Meter Gain
        victim.isStunned = victim.isBraced ? 0.1 : (power > 1.2 ? 0.45 : 0.25);
        attacker.superMeter = Math.min(100, attacker.superMeter + (power > 1.2 ? 35 : 18));

        // Popups and Sparks
        const hitX = (fist.x + target.x) * 0.5;
        const hitY = (fist.y + target.y) * 0.5;
        for (let i = 0; i < 8; i++) createSpark(hitX, hitY);

        createPopup(hitX, hitY - 14, power > 1.2 ? "GÜÜÜM! 💥" : "ÇAT! 🥊", power > 1.2 ? "#ffd700" : "#fff");
        break;
      }
    }
  }

  // --- RENDER BACKGROUNDS ---
  function renderEnvironment(ctx, env) {
    const time = state.roundTime;

    // 1. SKY / ROOM
    if (state.map === 'tv') {
      // CNN Türk Studio Theme
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0a0d1a');
      grad.addColorStop(1, '#020308');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Studio Overhead Floodlights
      ctx.fillStyle = 'rgba(0, 219, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(W * 0.2, 0); ctx.lineTo(W * 0.05, env.platformY); ctx.lineTo(W * 0.45, env.platformY); ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 23, 68, 0.08)';
      ctx.beginPath();
      ctx.moveTo(W * 0.8, 0); ctx.lineTo(W * 0.55, env.platformY); ctx.lineTo(W * 0.95, env.platformY); ctx.closePath();
      ctx.fill();

      // Studio Cameras & Screens
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(30, env.platformY - 50, 40, 25);
      ctx.fillRect(45, env.platformY - 25, 10, 45); // Tripod
      ctx.fillRect(W - 70, env.platformY - 50, 40, 25);
      ctx.fillRect(W - 55, env.platformY - 25, 10, 45);

      // News Ticker Banner on background wall
      ctx.fillStyle = 'rgba(255, 23, 68, 0.85)';
      ctx.fillRect(0, 30, W, 22);
      ctx.fillStyle = '#fff';
      ctx.font = '900 11px sans-serif';
      const tickerX = (W - (time * 80) % (W + 300));
      ctx.fillText("🔴 CANLI YAYIN: AHMET HAKAN İLE TARAFSIZ BÖLGE SUMO RAGDOLL ARENASI • SON DAKİKA GELİŞMELERİ GELİYOR!", tickerX, 45);

    } else if (state.map === 'klasik') {
      // Traditional Dojo / Dohyo
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#2b1b17');
      grad.addColorStop(1, '#0e0807');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Red Lanterns
      for (let lx = 60; lx < W; lx += 120) {
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(lx, 40, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(lx - 2, 20, 4, 8);
      }

    } else if (state.map === 'buz') {
      // Ice Mountain
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0c2340');
      grad.addColorStop(1, '#040d18');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Distant Ice Peaks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(0, H); ctx.lineTo(120, 100); ctx.lineTo(240, H);
      ctx.moveTo(200, H); ctx.lineTo(380, 80); ctx.lineTo(540, H);
      ctx.fill();

    } else if (state.map === 'lav') {
      // Lava Cavern
      ctx.fillStyle = '#1a0505';
      ctx.fillRect(0, 0, W, H);

      // Magma glow below
      const lavaGrad = ctx.createLinearGradient(0, H - 40, 0, H);
      lavaGrad.addColorStop(0, '#ff3d00');
      lavaGrad.addColorStop(1, '#ffab00');
      ctx.fillStyle = lavaGrad;
      ctx.fillRect(0, H - 30, W, 30);
    } else {
      // Default Cyber City
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, W, H);
    }

    // 2. THE SUMO PLATFORM
    const plY = env.platformY;
    const plL = env.platformLeft;
    const plR = env.platformRight;
    const plW = plR - plL;

    // Platform Surface
    if (state.map === 'tv') {
      // Modern Glass Studio Table
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(plL, plY, plW, 28);
      ctx.fillStyle = 'rgba(0, 219, 255, 0.4)';
      ctx.fillRect(plL, plY, plW, 3); // Cyan neon edge
    } else if (state.map === 'buz') {
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(plL, plY, plW, 26);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(plL, plY, plW, 4);
    } else if (state.map === 'klasik') {
      // Dohyo Clay & Rope
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(plL, plY, plW, 28);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 4;
      ctx.strokeRect(plL + 8, plY + 2, plW - 16, 20);
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillRect(plL, plY, plW, 28);
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(plL, plY, plW, 4);
    }

    // Danger Edge Warnings if platform is shrinking
    if (state.shrinkAmount > 0) {
      const flash = Math.sin(time * 12) > 0;
      if (flash) {
        ctx.fillStyle = 'rgba(255, 23, 68, 0.7)';
        ctx.fillRect(plL, plY, 8, 28);
        ctx.fillRect(plR - 8, plY, 8, 28);
      }
    }
  }

  // --- RESET & ROUND HANDLING ---
  function resetRound() {
    state.isKO = false;
    state.slowMotion = 1.0;
    state.roundTime = 0;
    state.shrinkAmount = 0;

    const modal = document.getElementById('ko-modal');
    if (modal) modal.classList.add('hidden');

    fighterP1 = new RagdollFighter(W * 0.35, H * 0.55, '#f59e0b', true, true);
    fighterP2 = new RagdollFighter(W * 0.65, H * 0.55, '#3b82f6', false, false);

    // Update Round Counter
    const rEl = document.getElementById('round-indicator');
    if (rEl) rEl.textContent = `TUR ${state.round}`;

    triggerCountdown();
  }

  function triggerCountdown() {
    state.isCountingDown = true;
    state.countdownVal = 3;
    const cdWrap = document.getElementById('countdown-wrap');
    const cdNum = document.getElementById('countdown-num');
    if (cdWrap && cdNum) {
      cdWrap.classList.remove('hidden');
      cdNum.textContent = '3';
      AudioEngine.playTone(400, 400, 'square', 0.1, 0.3);

      const iv = setInterval(() => {
        state.countdownVal--;
        if (state.countdownVal > 0) {
          cdNum.textContent = state.countdownVal;
          AudioEngine.playTone(400, 400, 'square', 0.1, 0.3);
        } else if (state.countdownVal === 0) {
          cdNum.textContent = 'BAŞLA!';
          AudioEngine.playTone(700, 900, 'square', 0.25, 0.4);
        } else {
          clearInterval(iv);
          cdWrap.classList.add('hidden');
          state.isCountingDown = false;
        }
      }, 700);
    }
  }

  function showKOMenu(winner) {
    const modal = document.getElementById('ko-modal');
    const title = document.getElementById('ko-title');
    const sub = document.getElementById('ko-subtitle');
    if (!modal) return;

    modal.classList.remove('hidden');
    if (winner === 'P1') {
      title.textContent = '🏆 AHMET HAKAN KAZANDI!';
      sub.textContent = 'Canlı yayında rakibini stüdyodan nakavtla uçurdu!';
    } else {
      title.textContent = '🏆 RAKİP KAZANDI!';
      sub.textContent = 'Kutu Sumo ustası ringin efendisi oldu!';
    }
  }

  // --- MAIN LOOP ---
  let lastTime = performance.now();
  function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1; // cap delta to prevent tunneling

    dt *= state.slowMotion;
    if (!state.isCountingDown && !state.isKO) {
      state.roundTime += dt;
      // Shrink platform after 22 seconds
      if (state.roundTime > 22) {
        state.shrinkAmount += dt * 8;
      }
    }

    const env = getEnvironment(state.roundTime);

    // Apply Controls
    if (!state.isCountingDown) {
      fighterP1.applyControls(getP1Controls(), dt);
      fighterP2.applyControls(getP2Controls(), dt);
    }

    // Update Physics
    fighterP1.updatePhysics(dt, env);
    fighterP2.updatePhysics(dt, env);

    // Combat
    checkCombatCollisions();

    // Render Canvas
    ctx.clearRect(0, 0, W, H);
    renderEnvironment(ctx, env);

    fighterP1.render(ctx);
    fighterP2.render(ctx);

    // Update & Render Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const part = state.particles[i];
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      if (part.life <= 0) {
        state.particles.splice(i, 1);
      } else {
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.r * (part.life / part.maxLife), 0, Math.PI * 2);
        ctx.fillStyle = part.color;
        ctx.fill();
      }
    }

    // Update & Render Popups
    for (let i = state.popups.length - 1; i >= 0; i--) {
      const pop = state.popups[i];
      pop.life -= dt;
      pop.y += pop.vy * dt;
      if (pop.life <= 0) {
        state.popups.splice(i, 1);
      } else {
        ctx.save();
        ctx.font = '900 13px sans-serif';
        ctx.fillStyle = pop.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(pop.text, pop.x, pop.y);
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      }
    }

    // Update Super Gauges in DOM
    const p1Fill = document.getElementById('p1-super-fill');
    const p2Fill = document.getElementById('p2-super-fill');
    if (p1Fill) p1Fill.style.width = `${fighterP1.superMeter}%`;
    if (p2Fill) p2Fill.style.width = `${fighterP2.superMeter}%`;
  }

  // --- UI LISTENERS & MODALS ---
  document.getElementById('btn-next-round')?.addEventListener('click', () => {
    state.round++;
    resetRound();
  });
  document.getElementById('btn-restart-match')?.addEventListener('click', () => {
    state.round = 1;
    state.p1Score = 0;
    state.p2Score = 0;
    document.getElementById('p1-score').textContent = '0';
    document.getElementById('p2-score').textContent = '0';
    resetRound();
  });
  document.getElementById('btn-choose-map')?.addEventListener('click', () => {
    document.getElementById('settings-modal')?.classList.remove('hidden');
  });

  // Settings Modal Handlers
  document.getElementById('btn-open-settings')?.addEventListener('click', () => {
    document.getElementById('settings-modal')?.classList.remove('hidden');
  });
  document.getElementById('btn-close-settings')?.addEventListener('click', () => {
    document.getElementById('settings-modal')?.classList.add('hidden');
  });

  // Map Selection Cards
  document.querySelectorAll('.map-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.map-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.map = card.dataset.map;
      const mapNames = {
        tv: '📺 CNN TÜRK STÜDYOSU',
        klasik: '⛩️ KLASİK DOHYO',
        buz: '❄️ BUZUL ZİRVESİ',
        asansor: '🛗 GÖKDELEN ASANSÖRÜ',
        ruzgar: '🌪️ RÜZGARLI TEPE',
        lav: '🌋 LAV KRATERİ'
      };
      const nameEl = document.getElementById('current-map-name');
      if (nameEl) nameEl.textContent = mapNames[state.map] || 'ARENA';
    });
  });

  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    state.gravityMode = document.getElementById('sel-gravity')?.value || 'NORMAL';
    state.winScore = parseInt(document.getElementById('sel-rounds')?.value || '3');
    state.aiDiff = document.getElementById('sel-ai-diff')?.value || 'NORMAL';
    document.getElementById('settings-modal')?.classList.add('hidden');
    resetRound();
  });

  // Mode Tabs
  function setMode(newMode) {
    state.mode = newMode;
    ['btn-mode-local', 'btn-mode-ai', 'btn-mode-online'].forEach(id => {
      document.getElementById(id)?.classList.remove('active');
    });
    if (newMode === 'local') document.getElementById('btn-mode-local')?.classList.add('active');
    if (newMode === 'ai') document.getElementById('btn-mode-ai')?.classList.add('active');
    if (newMode === 'online') {
      document.getElementById('btn-mode-online')?.classList.add('active');
      initOnlineWS();
    }
  }
  document.getElementById('btn-mode-local')?.addEventListener('click', () => setMode('local'));
  document.getElementById('btn-mode-ai')?.addEventListener('click', () => setMode('ai'));
  document.getElementById('btn-mode-online')?.addEventListener('click', () => setMode('online'));

  // Fullscreen
  document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Online WebSocket Support
  function initOnlineWS() {
    if (state.ws) return;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}`);
    state.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: 'sumo' }));
      createPopup(W * 0.5, H * 0.4, "ONLINE 1V1 ODASINA BAĞLANILDI!", "#00e676");
    };

    ws.onmessage = (ev) => {
      let data; try { data = JSON.parse(ev.data); } catch (_) { return; }
      if (data.type === 'sumo_sync' && fighterP2) {
        // Sync opponent position
        fighterP2.points.head.x = data.x;
        fighterP2.points.head.y = data.y;
      }
    };
  }

  // Start the game!
  resetRound();
  requestAnimationFrame(gameLoop);
})();
