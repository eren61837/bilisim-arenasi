// cs16.js - Counter-Strike 1.6 Web 3D FPS — FULL REWRITE v2.0
// Features: de_dust2 map, hit effects, damage numbers, CS 1.6 crosshair, blood/smoke particles, auto admin panel
(function () {
  'use strict';

  /* =========================================================
     1. GAME STATE
  ========================================================= */
  const state = {
    username: localStorage.getItem('portal_username') || 'Oyuncu_' + Math.floor(100 + Math.random() * 900),
    isAdmin: localStorage.getItem('portal_is_admin') === 'true',
    team: Math.random() < 0.5 ? 'CT' : 'T',
    ws: null,
    myId: null,

    hp: 100,
    ap: 100,
    kills: 0,
    deaths: 0,
    isDead: false,
    isGodmode: false,
    infiniteAmmo: false,
    superSpeed: false,

    weapons: {
      ak47:   { name: 'CV-47 (AK-47)',             slot: 1, clip: 30, maxClip: 30, reserve: 90,  damage: 34, fireRate: 110, spread: 0.03,  range: 80 },
      m4a1:   { name: 'M4A1 (Silenced)',            slot: 2, clip: 30, maxClip: 30, reserve: 90,  damage: 28, fireRate: 90,  spread: 0.02,  range: 90 },
      awp:    { name: 'Magnum Sniper (.338 AWP)',    slot: 3, clip: 10, maxClip: 10, reserve: 30,  damage: 115,fireRate: 1300,spread: 0.001, range: 200},
      deagle: { name: 'Night Hawk (.50C)',           slot: 4, clip: 7,  maxClip: 7,  reserve: 35,  damage: 55, fireRate: 260, spread: 0.025, range: 60 },
      knife:  { name: 'Tactical Knife',              slot: 5, clip: 0,  maxClip: 0,  reserve: 0,   damage: 65, fireRate: 400, spread: 0,     range: 3.5 }
    },
    currentWeaponKey: 'ak47',
    lastFireTime: 0,
    isReloading: false,
    reloadTimer: null,

    isLocked: false,
    keys: { w: false, a: false, s: false, d: false, space: false, shift: false },
    pos: { x: 0, y: 1.6, z: 20 },
    vel: { x: 0, y: 0, z: 0 },
    pitch: 0,
    yaw: 0,
    onGround: true,
    walkTime: 0,

    // Spread recovery
    currentSpread: 0,

    adminPanelVisible: false
  };

  /* =========================================================
     2. AUDIO ENGINE (CS 1.6 authentic sounds via Web Audio)
  ========================================================= */
  const CS_Audio = {
    ctx: null,
    init() {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    },

    noise(duration = 0.1, vol = 0.3) {
      if (!this.ctx) return;
      const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * duration), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
    },

    tone(freq, type, dur, vol, rampFreq) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (rampFreq) osc.frequency.exponentialRampToValueAtTime(rampFreq, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    },

    playGunshot(type = 'ak47') {
      this.init();
      if (!this.ctx) return;
      if (type === 'ak47') {
        this.tone(180, 'sawtooth', 0.18, 0.5, 30);
        this.noise(0.1, 0.4);
      } else if (type === 'm4a1') {
        this.tone(160, 'sawtooth', 0.14, 0.35, 35);
        this.noise(0.07, 0.3);
      } else if (type === 'awp') {
        this.tone(80, 'sawtooth', 0.4, 0.6, 20);
        this.noise(0.15, 0.5);
      } else if (type === 'deagle') {
        this.tone(220, 'sawtooth', 0.22, 0.55, 28);
        this.noise(0.12, 0.45);
      }
    },

    playKnifeSlash() {
      this.init();
      this.tone(800, 'sine', 0.12, 0.18, 150);
      this.noise(0.04, 0.15);
    },

    playReload() {
      this.init();
      if (!this.ctx) return;
      [0, 0.35, 0.7].forEach(offset => {
        setTimeout(() => this.tone(550 + offset * 100, 'triangle', 0.08, 0.14), offset * 1000);
      });
    },

    playHit(headshot = false) {
      this.init();
      if (headshot) {
        this.tone(1800, 'sine', 0.05, 0.3, 400);
      } else {
        this.tone(90, 'square', 0.1, 0.25);
        this.noise(0.05, 0.2);
      }
    },

    playDie() {
      this.init();
      this.tone(200, 'sawtooth', 0.6, 0.4, 60);
    },

    playFootstep() {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
    }
  };

  /* =========================================================
     3. THREE.JS SCENE SETUP
  ========================================================= */
  const canvas = document.getElementById('cs-canvas');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb8a88a);
  scene.fog = new THREE.FogExp2(0xb8a88a, 0.018);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 250);
  camera.rotation.order = 'YXZ';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Lighting — authentic CS 1.6 look
  scene.add(new THREE.AmbientLight(0xfff0d0, 0.55));
  const sun = new THREE.DirectionalLight(0xffe8c0, 1.3);
  sun.position.set(30, 80, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 220;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  scene.add(sun);
  const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
  fillLight.position.set(-30, 20, -20);
  scene.add(fillLight);

  /* =========================================================
     4. TEXTURE FACTORY
  ========================================================= */
  function makeTex(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  const texSand = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c9aa7a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = `rgba(${160 + Math.random() * 60|0},${120 + Math.random() * 60|0},${50 + Math.random() * 40|0},0.35)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1);
    }
  });
  texSand.repeat.set(30, 30);

  const texWall = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b8a06a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a0906a';
    for (let y = 0; y < h; y += 20) {
      const off = (y / 20 % 2 === 0) ? 0 : 30;
      for (let x = -30; x < w + 30; x += 60) {
        ctx.fillRect(x + off, y, 55, 18);
      }
    }
    ctx.fillStyle = '#8a7860';
    for (let y = 0; y < h; y += 20) {
      ctx.fillRect(0, y, w, 2);
      const off = (y / 20 % 2 === 0) ? 0 : 30;
      for (let x = -30; x < w + 30; x += 60) {
        ctx.fillRect(x + off + 55, y, 5, 20);
      }
    }
  });
  texWall.repeat.set(3, 1.5);

  const texConcrete = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#9e9380'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = `rgba(${80 + Math.random() * 60|0},${70 + Math.random() * 50|0},${60 + Math.random() * 40|0},0.4)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 1);
    }
  });
  texConcrete.repeat.set(4, 2);

  const texCrate = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#7a5c3a'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(w - 8, h - 8);
    ctx.moveTo(w - 8, 8); ctx.lineTo(8, h - 8); ctx.stroke();
    ctx.strokeRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? 100 : 140},${Math.random() < 0.5 ? 70 : 100},${40 + Math.random() * 30|0},0.25)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });

  const texMetal = makeTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#606870'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(${180 + Math.random() * 60|0},${180 + Math.random() * 60|0},${180 + Math.random() * 60|0},0.15)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 3 + Math.random() * 8);
    }
  });
  texMetal.repeat.set(2, 2);

  const texRoof = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a08858'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#887040';
    for (let y = 0; y < h; y += 12) ctx.fillRect(0, y, w, 2);
    for (let x = 0; x < w; x += 12) ctx.fillRect(x, 0, 2, h);
  });
  texRoof.repeat.set(5, 5);

  /* =========================================================
     5. BUILD DE_DUST2 MAP
  ========================================================= */
  const colliders = [];
  const wallMat = new THREE.MeshLambertMaterial({ map: texWall });
  const sandMat = new THREE.MeshLambertMaterial({ map: texSand });
  const concreteMat = new THREE.MeshLambertMaterial({ map: texConcrete });
  const crateMat = new THREE.MeshLambertMaterial({ map: texCrate });
  const metalMat = new THREE.MeshLambertMaterial({ map: texMetal });
  const roofMat = new THREE.MeshLambertMaterial({ map: texRoof });

  // Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), sandMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  function addBox(x, y, z, w, h, d, mat = wallMat, castShadow = true, noCollide = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (!noCollide) {
      colliders.push(new THREE.Box3().setFromObject(mesh));
    }
    return mesh;
  }

  function addCrate(x, z, size = 2.2, stack = 1) {
    for (let i = 0; i < stack; i++) {
      const y = size / 2 + i * size;
      addBox(x, y, z, size, size, size, crateMat);
    }
  }

  // ---- OUTER WALLS ----
  addBox(0, 4, -80, 160, 8, 2, wallMat);   // North
  addBox(0, 4, 80, 160, 8, 2, wallMat);    // South
  addBox(-80, 4, 0, 2, 8, 160, wallMat);   // West
  addBox(80, 4, 0, 2, 8, 160, wallMat);    // East

  // ---- T SPAWN (South side) ----
  addBox(0, 3, 65, 30, 6, 4, concreteMat); // T Spawn back wall
  addBox(-15, 3, 55, 4, 6, 24, concreteMat);
  addBox(15, 3, 55, 4, 6, 24, concreteMat);

  // ---- CT SPAWN (North side) ----
  addBox(0, 3, -65, 30, 6, 4, concreteMat);
  addBox(-15, 3, -55, 4, 6, 24, concreteMat);
  addBox(15, 3, -55, 4, 6, 24, concreteMat);

  // ---- LONG A CORRIDOR (West side) ----
  addBox(-60, 4, 0, 2, 8, 80, wallMat);   // Long A outer wall
  addBox(-50, 4, 35, 22, 8, 2, wallMat);  // Long A top
  addBox(-50, 4, -35, 22, 8, 2, wallMat); // Long A bottom
  // Long A door gap (walkable between z -35 and z 35)
  // Long A pit area
  addBox(-65, 2, 0, 10, 4, 50, concreteMat);
  addBox(-42, 3, 20, 2, 6, 30, wallMat);
  addBox(-42, 3, -20, 2, 6, 30, wallMat);

  // ---- SHORT A / CATWALK ----
  addBox(-20, 4, -30, 2, 8, 50, wallMat);
  addBox(-20, 4, 30, 2, 8, 50, wallMat);
  addBox(-20, 3, 0, 38, 6, 2, wallMat); // Mid connection

  // ---- BOMBSITE A ----
  addBox(50, 0.15, -30, 30, 0.3, 30, concreteMat, false, true); // A platform floor overlay
  addBox(50, 4, -50, 20, 8, 2, wallMat);
  addBox(65, 4, -30, 2, 8, 42, wallMat);
  addBox(35, 4, -30, 2, 8, 42, wallMat);
  // Site A crates
  addCrate(55, -45, 2.5, 2);
  addCrate(48, -35, 2.5, 1);
  addCrate(60, -38, 2.2, 2);
  addCrate(42, -48, 2, 1);

  // ---- MID / DOORS ----
  addBox(-8, 4, 0, 2, 8, 30, wallMat);
  addBox(8, 4, 0, 2, 8, 30, wallMat);
  // Mid doors
  addBox(-8, 4, -18, 2, 8, 8, wallMat);
  addBox(8, 4, -18, 2, 8, 8, wallMat);
  addBox(-8, 4, 18, 2, 8, 8, wallMat);
  addBox(8, 4, 18, 2, 8, 8, wallMat);

  // ---- BOMBSITE B ----
  addBox(-50, 0.15, 35, 30, 0.3, 25, concreteMat, false, true);
  addBox(-50, 4, 50, 30, 8, 2, wallMat);
  addBox(-65, 4, 35, 2, 8, 30, wallMat);
  addBox(-35, 4, 35, 2, 8, 30, wallMat);
  // Site B crates
  addCrate(-55, 45, 2.5, 2);
  addCrate(-48, 38, 2.2, 1);
  addCrate(-60, 42, 2, 1);

  // ---- TUNNELS (connecting T spawn to B) ----
  addBox(-30, 4, 55, 2, 8, 50, wallMat);
  addBox(-30, 4, 25, 2, 8, 20, wallMat);

  // ---- ROOF SHELTERS & AWNINGS ----
  addBox(50, 7.5, -30, 32, 0.5, 32, roofMat, false, true);  // A site cover
  addBox(-50, 7.5, 38, 32, 0.5, 28, roofMat, false, true);  // B site cover
  addBox(-20, 6.5, -12, 42, 0.5, 20, roofMat, false, true); // Mid cover

  // ---- ELEVATED PLATFORMS ----
  // Catwalk bridge
  addBox(35, 2, -15, 30, 0.4, 5, concreteMat, false, false);
  addBox(35, 2.2, -15, 30, 0.2, 5, metalMat, false, true); // walkable surface
  addBox(35, 3, -18, 30, 2, 0.3, metalMat, true, true); // railing

  // A ramp
  addBox(25, 1.5, -38, 20, 0.3, 5, concreteMat, false, false);

  // ---- SCATTERED PROPS (for cover) ----
  addCrate(0, -25, 2, 1);
  addCrate(0, 25, 2, 1);
  addCrate(25, 0, 2.5, 2);
  addCrate(-25, 0, 2, 1);
  addCrate(40, -10, 2, 1);
  addCrate(-40, 10, 2, 1);

  // ---- BOMBSITE MARKERS (flat colored pads) ----
  const siteAMat = new THREE.MeshLambertMaterial({ color: 0xffcc44 });
  const siteBMat = new THREE.MeshLambertMaterial({ color: 0xffcc44 });
  const siteA = new THREE.Mesh(new THREE.BoxGeometry(12, 0.05, 12), siteAMat);
  siteA.position.set(50, 0.03, -35); scene.add(siteA);
  const siteB = new THREE.Mesh(new THREE.BoxGeometry(12, 0.05, 12), siteBMat);
  siteB.position.set(-50, 0.03, 42); scene.add(siteB);

  /* =========================================================
     6. PARTICLE SYSTEM (Blood, Smoke, Sparks)
  ========================================================= */
  const particles = [];

  function spawnParticles(x, y, z, type = 'blood', count = 8) {
    for (let i = 0; i < count; i++) {
      const size = type === 'blood' ? 0.04 + Math.random() * 0.06 : 0.06 + Math.random() * 0.1;
      const color = type === 'blood' ? 0xcc0000 : (type === 'smoke' ? 0x888888 : 0xffaa44);
      const geo = new THREE.SphereGeometry(size, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);

      const vel = {
        x: (Math.random() - 0.5) * 3,
        y: Math.random() * 3 + 1,
        z: (Math.random() - 0.5) * 3
      };
      particles.push({ mesh, mat, vel, life: 1.0, type });
    }
  }

  function spawnBulletHole(hitPoint, hitNormal) {
    const geo = new THREE.CircleGeometry(0.05, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(hitPoint).addScaledVector(hitNormal, 0.02);
    mesh.lookAt(hitPoint.clone().addScaledVector(hitNormal, 1));
    scene.add(mesh);
    setTimeout(() => scene.remove(mesh), 30000);
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt * (p.type === 'smoke' ? 0.5 : 2.5);
      p.vel.y -= 8 * dt;
      p.mesh.position.x += p.vel.x * dt;
      p.mesh.position.y += p.vel.y * dt;
      p.mesh.position.z += p.vel.z * dt;
      p.mat.opacity = Math.max(0, p.life);
      if (p.type === 'smoke') p.mesh.scale.addScalar(dt * 0.5);
      if (p.life <= 0) {
        scene.remove(p.mesh);
        particles.splice(i, 1);
      }
    }
  }

  /* =========================================================
     7. DAMAGE NUMBER POPUP
  ========================================================= */
  function showDamageNumber(damage, x, y, z, headshot = false) {
    const el = document.createElement('div');
    el.className = 'dmg-popup' + (headshot ? ' dmg-headshot' : '');
    el.textContent = (headshot ? '💀 ' : '') + damage;
    document.body.appendChild(el);

    // Project 3D position to 2D screen
    function update() {
      const v = new THREE.Vector3(x, y + 2, z);
      v.project(camera);
      const sx = (v.x + 1) / 2 * window.innerWidth;
      const sy = (-v.y + 1) / 2 * window.innerHeight;
      el.style.left = sx + 'px';
      el.style.top = sy + 'px';
    }
    update();

    let opacity = 1, offsetY = 0;
    const anim = setInterval(() => {
      offsetY -= 1.5;
      opacity -= 0.04;
      el.style.transform = `translateX(-50%) translateY(${offsetY}px)`;
      el.style.opacity = opacity;
      if (opacity <= 0) {
        clearInterval(anim);
        el.remove();
      }
    }, 30);
  }

  /* =========================================================
     8. FIRST-PERSON WEAPON MODELS
  ========================================================= */
  const weaponGroup = new THREE.Group();
  camera.add(weaponGroup);
  scene.add(camera);

  const wMeshes = {};

  // AK-47
  function buildAK47() {
    const g = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x5d3a1a });
    const metal = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 8), metal);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, -0.38);
    g.add(barrel);
    // Barrel tip
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), metal);
    tip.rotation.x = Math.PI / 2; tip.position.set(0, 0.01, -0.73);
    g.add(tip);
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.42), wood);
    body.position.set(0, -0.018, -0.12); g.add(body);
    // Top rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.3), metal);
    rail.position.set(0, 0.048, -0.12); g.add(rail);
    // Curved magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.18, 0.065), metal);
    mag.position.set(0, -0.13, -0.1); mag.rotation.x = 0.25; g.add(mag);
    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.095, 0.24), wood);
    stock.position.set(0, -0.048, 0.17); g.add(stock);
    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.05), wood);
    grip.position.set(0, -0.1, 0.06); grip.rotation.x = 0.2; g.add(grip);
    // Gas tube
    const gas = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), wood);
    gas.rotation.x = Math.PI / 2; gas.position.set(0, 0.03, -0.19); g.add(gas);

    g.position.set(0.27, -0.23, -0.5);
    return g;
  }

  // M4A1
  function buildM4A1() {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
    const grip = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.65, 8), mat);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0, -0.35); g.add(barrel);
    // Silencer
    const sil = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), mat);
    sil.rotation.x = Math.PI / 2; sil.position.set(0, 0, -0.72); g.add(sil);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.38), mat);
    body.position.set(0, -0.015, -0.1); g.add(body);
    const mag2 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.055), grip);
    mag2.position.set(0, -0.12, -0.08); g.add(mag2);
    const stock2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.22), mat);
    stock2.position.set(0, -0.045, 0.15); g.add(stock2);
    const gr = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.09, 0.045), grip);
    gr.position.set(0, -0.09, 0.05); gr.rotation.x = 0.2; g.add(gr);
    g.position.set(0.27, -0.23, -0.5);
    g.visible = false;
    return g;
  }

  // AWP
  function buildAWP() {
    const g = new THREE.Group();
    const wood = new THREE.MeshLambertMaterial({ color: 0x5d4a2a });
    const metal = new THREE.MeshLambertMaterial({ color: 0x282828 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.9, 8), metal);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, -0.45); g.add(barrel);
    const body3 = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.5), wood);
    body3.position.set(0, -0.02, -0.1); g.add(body3);
    // Scope
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8), metal);
    scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.065, -0.12); g.add(scope);
    const mag3 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.06), metal);
    mag3.position.set(0, -0.12, -0.08); g.add(mag3);
    const stock3 = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.28), wood);
    stock3.position.set(0, -0.04, 0.2); g.add(stock3);
    g.position.set(0.27, -0.23, -0.5);
    g.visible = false;
    return g;
  }

  // Deagle
  function buildDeagle() {
    const g = new THREE.Group();
    const chrome = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const blk = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.06, 0.32), chrome);
    slide.position.set(0, 0, -0.12); g.add(slide);
    const barrel4 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.15, 8), blk);
    barrel4.rotation.x = Math.PI / 2; barrel4.position.set(0, 0.01, -0.31); g.add(barrel4);
    const grip2 = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.14, 0.075), blk);
    grip2.position.set(0, -0.09, 0.01); grip2.rotation.x = 0.25; g.add(grip2);
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.04, 0.03), blk);
    trigger.position.set(0, -0.04, -0.05); trigger.rotation.x = 0.4; g.add(trigger);
    g.position.set(0.24, -0.2, -0.42);
    g.visible = false;
    return g;
  }

  // Knife
  function buildKnife() {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.055, 0.22), new THREE.MeshLambertMaterial({ color: 0xd0d0d0 }));
    blade.position.set(0, 0, -0.12); g.add(blade);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.045, 0.13), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    handle.position.set(0, 0, 0.04); g.add(handle);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.03, 0.025), new THREE.MeshLambertMaterial({ color: 0x888888 }));
    guard.position.set(0, 0, -0.025); g.add(guard);
    g.position.set(0.24, -0.19, -0.4);
    g.visible = false;
    return g;
  }

  wMeshes.ak47 = buildAK47();
  wMeshes.m4a1 = buildM4A1();
  wMeshes.awp = buildAWP();
  wMeshes.deagle = buildDeagle();
  wMeshes.knife = buildKnife();

  Object.values(wMeshes).forEach(m => weaponGroup.add(m));

  // Muzzle flash
  const muzzleFlashMat = new THREE.MeshBasicMaterial({ color: 0xffee66, transparent: true, opacity: 0 });
  const muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), muzzleFlashMat);
  muzzleFlash.position.set(0, 0.01, -0.75);
  weaponGroup.add(muzzleFlash);
  let muzzleFlashTimer = 0;

  function switchWeapon(key) {
    if (!state.weapons[key]) return;
    if (state.isReloading) cancelReload();
    state.currentWeaponKey = key;
    Object.entries(wMeshes).forEach(([k, m]) => m.visible = (k === key));
    const cur = state.weapons[key];
    document.getElementById('hud-weapon-name').textContent = cur.name;
    state.currentSpread = 0;
    updateAmmoHUD();
  }

  function updateAmmoHUD() {
    const cur = state.weapons[state.currentWeaponKey];
    const clipEl = document.getElementById('hud-ammo-clip');
    const resEl = document.getElementById('hud-ammo-res');
    if (state.currentWeaponKey === 'knife') {
      clipEl.textContent = '–';
      resEl.textContent = '–';
    } else {
      clipEl.textContent = cur.clip;
      resEl.textContent = cur.reserve;
      clipEl.style.color = cur.clip <= 5 ? '#ff4444' : '#ffcc44';
    }
  }

  /* =========================================================
     9. REMOTE PLAYER MESHES
  ========================================================= */
  const remotePlayers = new Map();

  function getOrCreateRemotePlayer(p) {
    if (remotePlayers.has(p.id)) return remotePlayers.get(p.id);

    const g = new THREE.Group();
    const isCT = p.team === 'CT';
    const bodyColor = isCT ? 0x1a5276 : 0x6e2f1a;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.38), new THREE.MeshLambertMaterial({ color: bodyColor }));
    body.position.y = 0.85; g.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), new THREE.MeshLambertMaterial({ color: 0xffd0a0 }));
    head.position.y = 1.58; g.add(head);

    if (isCT) {
      const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.36), new THREE.MeshLambertMaterial({ color: 0x0d3b6e }));
      helmet.position.y = 1.67; g.add(helmet);
    } else {
      const balaclava = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.33, 0.33), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
      balaclava.position.y = 1.58; g.add(balaclava);
    }

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.35), new THREE.MeshLambertMaterial({ color: isCT ? 0x1a3a5c : 0x3d1a0a }));
    legs.position.y = 0.35; g.add(legs);

    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    gun.position.set(0.3, 0.88, -0.3); g.add(gun);

    // Health bar
    const hbBg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 0.02), new THREE.MeshBasicMaterial({ color: 0x330000 }));
    hbBg.position.y = 2.15; g.add(hbBg);
    const hbFill = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0x00cc00 }));
    hbFill.position.y = 2.15; g.add(hbFill);

    scene.add(g);
    const rec = { group: g, head, body, legs, hbFill, id: p.id };
    remotePlayers.set(p.id, rec);
    return rec;
  }

  function updateRemotePlayerHP(rec, hp) {
    const pct = Math.max(0, hp / 100);
    rec.hbFill.scale.x = pct;
    rec.hbFill.position.x = (pct - 1) * 0.4;
    rec.hbFill.material.color.set(pct > 0.5 ? 0x00cc00 : pct > 0.25 ? 0xffaa00 : 0xff2200);
  }

  /* =========================================================
     10. INPUT & POINTER LOCK & MENUS
  ========================================================= */
  const blocker = document.getElementById('cs-blocker');
  const modalTeam = document.getElementById('modal-team-select');
  const modalBuy = document.getElementById('modal-buy-menu');
  const pauseMenu = document.getElementById('cs-pause-menu');
  let footstepTimer = 0;

  function unlockPointerAndShowMenu() {
    state.isLocked = false;
    if (document.pointerLockElement) document.exitPointerLock();
    if (modalTeam.style.display !== 'flex' && modalBuy.style.display !== 'flex') {
      if (pauseMenu) pauseMenu.style.display = 'flex';
    }
  }

  function resumeGame() {
    if (pauseMenu) pauseMenu.style.display = 'none';
    if (modalBuy) modalBuy.style.display = 'none';
    if (modalTeam) modalTeam.style.display = 'none';
    CS_Audio.init();
    if (canvas && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  }

  canvas?.addEventListener('click', () => {
    if (!state.isLocked) resumeGame();
  });

  document.getElementById('btn-cs-menu-open')?.addEventListener('click', () => {
    unlockPointerAndShowMenu();
  });

  document.getElementById('pm-btn-resume')?.addEventListener('click', resumeGame);
  document.getElementById('pm-btn-team')?.addEventListener('click', () => {
    if (pauseMenu) pauseMenu.style.display = 'none';
    showTeamSelect();
  });
  document.getElementById('pm-btn-buy')?.addEventListener('click', () => {
    if (pauseMenu) pauseMenu.style.display = 'none';
    showBuyMenu();
  });
  if (state.isAdmin) {
    const ab = document.getElementById('pm-btn-admin');
    if (ab) {
      ab.style.display = 'block';
      ab.addEventListener('click', () => {
        if (pauseMenu) pauseMenu.style.display = 'none';
        toggleAdminPanel();
      });
    }
  }

  function showTeamSelect() {
    if (document.pointerLockElement) document.exitPointerLock();
    state.isLocked = false;
    if (modalTeam) modalTeam.style.display = 'flex';
  }

  function chooseTeam(team) {
    state.team = team;
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'cs16_select_team', team }));
    }
    if (modalTeam) modalTeam.style.display = 'none';
    resumeGame();
  }

  document.getElementById('btn-select-t')?.addEventListener('click', () => chooseTeam('T'));
  document.getElementById('btn-select-ct')?.addEventListener('click', () => chooseTeam('CT'));
  document.getElementById('btn-select-auto')?.addEventListener('click', () => chooseTeam(Math.random() < 0.5 ? 'CT' : 'T'));

  function showBuyMenu() {
    if (document.pointerLockElement) document.exitPointerLock();
    state.isLocked = false;
    if (modalBuy) {
      modalBuy.style.display = 'flex';
      const moneyEl = document.getElementById('bm-money-text');
      if (moneyEl) moneyEl.textContent = '$' + (state.money || 1600).toLocaleString();
    }
  }

  document.getElementById('btn-close-buy')?.addEventListener('click', () => {
    if (modalBuy) modalBuy.style.display = 'none';
    resumeGame();
  });

  document.querySelectorAll('.btn-buy-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wp = btn.dataset.weapon;
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'cs16_buy', weapon: wp }));
      }
    });
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      state.isLocked = true;
      if (blocker) blocker.classList.add('hidden');
      if (pauseMenu) pauseMenu.style.display = 'none';
      if (modalBuy) modalBuy.style.display = 'none';
      if (modalTeam) modalTeam.style.display = 'none';
      const hint = document.getElementById('cs-click-hint');
      if (hint) hint.style.display = 'none';
    } else {
      state.isLocked = false;
      if (modalTeam.style.display !== 'flex' && modalBuy.style.display !== 'flex') {
        if (pauseMenu) pauseMenu.style.display = 'flex';
        const hint = document.getElementById('cs-click-hint');
        if (hint) hint.style.display = 'none';
      }
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!state.isLocked || state.isDead) return;
    const sens = 0.0022;
    state.yaw -= e.movementX * sens;
    state.pitch -= e.movementY * sens;
    state.pitch = Math.max(-1.4, Math.min(1.4, state.pitch));
    expandCrosshair(2);
  });

  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    // Team select modal keys
    if (modalTeam && modalTeam.style.display === 'flex') {
      if (e.code === 'Digit1') { chooseTeam('T'); return; }
      if (e.code === 'Digit2') { chooseTeam('CT'); return; }
      if (e.code === 'Digit3') { chooseTeam(Math.random() < 0.5 ? 'CT' : 'T'); return; }
      if (e.code === 'Escape') { modalTeam.style.display = 'none'; resumeGame(); return; }
    }

    // Buy menu modal keys
    if (modalBuy && modalBuy.style.display === 'flex') {
      if (e.code === 'Escape' || e.code === 'KeyB') {
        modalBuy.style.display = 'none';
        resumeGame();
        return;
      }
    }

    if (e.code === 'KeyW') state.keys.w = true;
    if (e.code === 'KeyA') state.keys.a = true;
    if (e.code === 'KeyS') state.keys.s = true;
    if (e.code === 'KeyD') state.keys.d = true;
    if (e.code === 'Space') {
      state.keys.space = true;
      if (state.onGround && !state.isDead) {
        state.vel.y = 8;
        state.onGround = false;
      }
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') state.keys.shift = true;
    if (e.code === 'KeyR') reloadWeapon();
    if (e.code === 'Digit1') switchWeapon('ak47');
    if (e.code === 'Digit2') switchWeapon('m4a1');
    if (e.code === 'Digit3') switchWeapon('awp');
    if (e.code === 'Digit4') switchWeapon('deagle');
    if (e.code === 'Digit5') switchWeapon('knife');
    if (e.code === 'Tab') { e.preventDefault(); document.getElementById('cs-scoreboard').classList.remove('hidden'); }
    if (e.code === 'KeyB') { e.preventDefault(); showBuyMenu(); }
    if (e.code === 'KeyM') { e.preventDefault(); showTeamSelect(); }
    if (e.code === 'Escape') {
      e.preventDefault();
      if (state.isLocked) {
        unlockPointerAndShowMenu();
      } else if (pauseMenu && pauseMenu.style.display === 'flex') {
        resumeGame();
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') state.keys.w = false;
    if (e.code === 'KeyA') state.keys.a = false;
    if (e.code === 'KeyS') state.keys.s = false;
    if (e.code === 'KeyD') state.keys.d = false;
    if (e.code === 'Space') state.keys.space = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') state.keys.shift = false;
    if (e.code === 'Tab') document.getElementById('cs-scoreboard').classList.add('hidden');
  });

  document.addEventListener('mousedown', (e) => {
    if (!state.isLocked || state.isDead) return;
    if (e.button === 0) shootWeapon();
    if (e.button === 2) toggleScope();
  });

  document.addEventListener('contextmenu', (e) => e.preventDefault());

  /* =========================================================
     11. SHOOTING & HIT DETECTION
  ========================================================= */
  const raycaster = new THREE.Raycaster();
  let isScoped = false;

  function toggleScope() {
    if (state.currentWeaponKey !== 'awp') return;
    isScoped = !isScoped;
    camera.fov = isScoped ? 20 : 75;
    camera.updateProjectionMatrix();
    document.getElementById('cs-scope-overlay').style.display = isScoped ? 'flex' : 'none';
    document.getElementById('cs-crosshair').style.display = isScoped ? 'none' : 'block';
    weaponGroup.visible = !isScoped;
  }

  function expandCrosshair(amount = 4) {
    state.currentSpread = Math.min(state.currentSpread + amount, 20);
  }

  function shootWeapon() {
    if (state.isReloading) return;
    const cur = state.weapons[state.currentWeaponKey];
    const now = Date.now();
    if (now - state.lastFireTime < cur.fireRate) return;

    if (state.currentWeaponKey !== 'knife' && cur.clip <= 0) {
      reloadWeapon(); return;
    }

    state.lastFireTime = now;

    if (!state.infiniteAmmo && state.currentWeaponKey !== 'knife') {
      cur.clip--;
      updateAmmoHUD();
    }

    // Audio
    if (state.currentWeaponKey === 'knife') CS_Audio.playKnifeSlash();
    else CS_Audio.playGunshot(state.currentWeaponKey);

    // Muzzle flash
    if (state.currentWeaponKey !== 'knife') {
      muzzleFlashMat.opacity = 0.9;
      muzzleFlashTimer = 0.05;
    }

    // Recoil animation
    const recoilY = state.currentWeaponKey === 'awp' ? 0.04 : 0.015;
    weaponGroup.position.z += 0.06;
    weaponGroup.position.y += recoilY;
    state.pitch += state.currentWeaponKey === 'awp' ? 0 : 0.012;

    // Crosshair expand
    expandCrosshair(state.currentWeaponKey === 'awp' ? 0 : 6);

    // Raycast
    const spreadRad = (cur.spread + state.currentSpread * 0.002) * (state.keys.shift ? 0.5 : 1);
    const sx = (Math.random() - 0.5) * spreadRad;
    const sy = (Math.random() - 0.5) * spreadRad;
    raycaster.setFromCamera(new THREE.Vector2(sx, sy), camera);

    const hitObjects = [];
    for (const [id, rec] of remotePlayers.entries()) {
      hitObjects.push({ mesh: rec.head, id, isHead: true });
      hitObjects.push({ mesh: rec.body, id, isHead: false });
      hitObjects.push({ mesh: rec.legs, id, isHead: false });
    }

    const allMeshes = hitObjects.map(h => h.mesh);
    const hits = raycaster.intersectObjects(allMeshes, false);

    if (hits.length > 0) {
      const hit = hits[0];
      const target = hitObjects.find(t => t.mesh === hit.object);
      if (target) {
        CS_Audio.playHit(target.isHead);
        const baseDmg = cur.damage;
        const dmg = target.isHead ? Math.floor(baseDmg * 3.5) : (target.mesh === remotePlayers.get(target.id)?.legs ? Math.floor(baseDmg * 0.75) : baseDmg);
        const hp3d = hit.point;
        spawnParticles(hp3d.x, hp3d.y, hp3d.z, 'blood', target.isHead ? 16 : 10);
        showDamageNumber(dmg, hp3d.x, hp3d.y, hp3d.z, target.isHead);

        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({ type: 'cs16_shoot', targetId: target.id, isHeadshot: target.isHead, weapon: state.currentWeaponKey }));
        }
      }
    } else {
      // Environment hit — bullet hole + sparks
      const envHit = raycaster.intersectObjects(scene.children.filter(c => c.isMesh), false);
      if (envHit.length > 0) {
        const hp3d = envHit[0].point;
        spawnBulletHole(hp3d, envHit[0].face?.normal || new THREE.Vector3(0, 1, 0));
        spawnParticles(hp3d.x, hp3d.y, hp3d.z, 'sparks', 3);
      }
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'cs16_shoot', weapon: state.currentWeaponKey }));
      }
    }

    // Auto reload
    if (cur.clip === 0 && state.currentWeaponKey !== 'knife') reloadWeapon();
  }

  function cancelReload() {
    if (state.reloadTimer) clearTimeout(state.reloadTimer);
    state.isReloading = false;
    const cur = state.weapons[state.currentWeaponKey];
    document.getElementById('hud-weapon-name').textContent = cur.name;
  }

  function reloadWeapon() {
    const cur = state.weapons[state.currentWeaponKey];
    if (state.currentWeaponKey === 'knife' || state.isReloading || cur.clip === cur.maxClip || cur.reserve <= 0) return;

    state.isReloading = true;
    CS_Audio.playReload();
    document.getElementById('hud-weapon-name').textContent = '⟳ ŞARJÖR...';

    // Reload bar
    const reloadBarWrap = document.getElementById('reload-bar-wrap');
    const reloadBar = document.getElementById('reload-bar');
    if (reloadBarWrap) {
      reloadBarWrap.style.display = 'block';
      reloadBar.style.width = '0%';
      let pct = 0;
      const iv = setInterval(() => {
        pct += 100 / (1800 / 50);
        reloadBar.style.width = Math.min(pct, 100) + '%';
        if (pct >= 100) clearInterval(iv);
      }, 50);
    }

    state.reloadTimer = setTimeout(() => {
      const needed = cur.maxClip - cur.clip;
      const take = state.infiniteAmmo ? needed : Math.min(needed, cur.reserve);
      cur.clip += take;
      if (!state.infiniteAmmo) cur.reserve -= take;
      state.isReloading = false;
      document.getElementById('hud-weapon-name').textContent = cur.name;
      if (reloadBarWrap) reloadBarWrap.style.display = 'none';
      updateAmmoHUD();
    }, 1800);
  }

  /* =========================================================
     12. CROSSHAIR (Dynamic CS 1.6 Style)
  ========================================================= */
  let chSize = 8;
  const CH_BASE = 8, CH_MAX = 22;

  function updateCrosshair(dt) {
    // Recover spread
    state.currentSpread = Math.max(0, state.currentSpread - dt * 12);
    const sz = CH_BASE + (state.currentSpread / 20) * (CH_MAX - CH_BASE);
    const ch = document.getElementById('cs-crosshair');
    if (!ch) return;
    ch.style.setProperty('--ch-gap', `${sz}px`);
  }

  function expandCrosshairAnim() {
    const ch = document.getElementById('cs-crosshair');
    if (ch) { ch.classList.add('recoil'); setTimeout(() => ch.classList.remove('recoil'), 100); }
  }

  /* =========================================================
     13. PHYSICS & MOVEMENT
  ========================================================= */
  let lastFrameTime = performance.now();
  let netSendTimer = 0;

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    updateParticles(dt);
    updateCrosshair(dt);

    // Muzzle flash decay
    if (muzzleFlashTimer > 0) {
      muzzleFlashTimer -= dt;
      muzzleFlashMat.opacity = Math.max(0, muzzleFlashTimer * 18);
    }

    if (state.isLocked && !state.isDead) {
      camera.rotation.y = state.yaw;
      camera.rotation.x = state.pitch;

      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
      const moveDir = new THREE.Vector3();

      if (state.keys.w) moveDir.add(forward);
      if (state.keys.s) moveDir.sub(forward);
      if (state.keys.d) moveDir.add(right);
      if (state.keys.a) moveDir.sub(right);

      const moving = moveDir.lengthSq() > 0;
      const spd = state.superSpeed ? 22 : state.keys.shift ? 4.5 : 8.5;

      if (moving) {
        moveDir.normalize();
        state.vel.x = moveDir.x * spd;
        state.vel.z = moveDir.z * spd;
        state.walkTime += dt * 10;

        // Footsteps
        footstepTimer += dt;
        if (footstepTimer > (state.keys.shift ? 0.55 : 0.32)) {
          footstepTimer = 0;
          CS_Audio.playFootstep();
        }

        // Walking spread
        if (state.onGround) expandCrosshair(0.5 * dt * 60);
      } else {
        state.vel.x *= 0.82;
        state.vel.z *= 0.82;
        footstepTimer = 0;
      }

      // Gravity
      state.vel.y -= 20 * dt;

      const nextX = state.pos.x + state.vel.x * dt;
      const nextZ = state.pos.z + state.vel.z * dt;
      const nextY = state.pos.y + state.vel.y * dt;
      const R = 0.4;
      let bX = false, bZ = false;

      for (const box of colliders) {
        const margin = 0.02;
        const xOk = nextX + R > box.min.x - margin && nextX - R < box.max.x + margin;
        const zOk = state.pos.z + R > box.min.z - margin && state.pos.z - R < box.max.z + margin;
        const zOk2 = nextZ + R > box.min.z - margin && nextZ - R < box.max.z + margin;
        const xOk2 = state.pos.x + R > box.min.x - margin && state.pos.x - R < box.max.x + margin;
        const yOk = nextY < box.max.y + margin;
        if (xOk && zOk && yOk) bX = true;
        if (xOk2 && zOk2 && yOk) bZ = true;
      }

      // Map boundary clamp
      if (nextX < -79 || nextX > 79) bX = true;
      if (nextZ < -79 || nextZ > 79) bZ = true;

      if (!bX) state.pos.x = nextX; else state.vel.x = 0;
      if (!bZ) state.pos.z = nextZ; else state.vel.z = 0;

      if (nextY <= 1.6) {
        state.pos.y = 1.6;
        state.vel.y = 0;
        state.onGround = true;
      } else {
        state.pos.y = nextY;
        state.onGround = false;
      }

      camera.position.set(state.pos.x, state.pos.y, state.pos.z);

      // Weapon bob
      const bobX = moving ? Math.cos(state.walkTime) * 0.007 : 0;
      const bobY = moving ? Math.sin(state.walkTime * 2) * 0.005 : 0;
      weaponGroup.position.x = THREE.MathUtils.lerp(weaponGroup.position.x, 0.27 + bobX, dt * 10);
      weaponGroup.position.y = THREE.MathUtils.lerp(weaponGroup.position.y, -0.23 + bobY, dt * 10);
      weaponGroup.position.z = THREE.MathUtils.lerp(weaponGroup.position.z, -0.5, dt * 12);

      // Network send
      netSendTimer += dt;
      if (netSendTimer > 0.05 && state.ws?.readyState === WebSocket.OPEN) {
        netSendTimer = 0;
        state.ws.send(JSON.stringify({ type: 'cs16_move', x: state.pos.x, y: state.pos.y, z: state.pos.z, yaw: state.yaw, pitch: state.pitch, weapon: state.currentWeaponKey }));
      }
    }

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* =========================================================
     14. ADMIN PANEL
  ========================================================= */
  function toggleAdminPanel() {
    state.adminPanelVisible = !state.adminPanelVisible;
    const panel = document.getElementById('cs-admin-panel');
    if (panel) {
      panel.style.display = state.adminPanelVisible ? 'flex' : 'none';
    }
  }

  function initAdminPanel() {
    if (!state.isAdmin) return;
    // Show badge
    const badge = document.getElementById('cs-admin-badge');
    if (badge) badge.classList.remove('hidden');
    // Auto-open panel
    state.adminPanelVisible = true;
    const panel = document.getElementById('cs-admin-panel');
    if (panel) panel.style.display = 'flex';

    const el = id => document.getElementById(id);

    el('cs-btn-godmode')?.addEventListener('click', () => {
      state.isGodmode = !state.isGodmode;
      el('cs-btn-godmode').textContent = `🛡️ Godmode: ${state.isGodmode ? '✅ AÇIK' : '❌ KAPALI'}`;
      el('cs-btn-godmode').style.background = state.isGodmode ? '#006600' : '';
      if (state.ws) state.ws.send(JSON.stringify({ type: 'admin_cs16_godmode' }));
    });

    el('cs-btn-inf-ammo')?.addEventListener('click', () => {
      state.infiniteAmmo = !state.infiniteAmmo;
      el('cs-btn-inf-ammo').textContent = `⚡ Sınırsız Mermi: ${state.infiniteAmmo ? '✅ AÇIK' : '❌ KAPALI'}`;
      el('cs-btn-inf-ammo').style.background = state.infiniteAmmo ? '#006600' : '';
      // Refill current mag
      if (state.infiniteAmmo) {
        const cur = state.weapons[state.currentWeaponKey];
        cur.clip = cur.maxClip;
        cur.reserve = 999;
        updateAmmoHUD();
      }
    });

    el('cs-btn-kill-bots')?.addEventListener('click', () => {
      if (state.ws) state.ws.send(JSON.stringify({ type: 'admin_cs16_kill_bots' }));
      addKillFeed('👑 ADMIN', 'Tüm Botlar', 'console', false);
    });

    el('cs-btn-speed')?.addEventListener('click', () => {
      state.superSpeed = !state.superSpeed;
      el('cs-btn-speed').textContent = `🚀 Süper Hız: ${state.superSpeed ? '✅ AÇIK' : '❌ KAPALI'}`;
      el('cs-btn-speed').style.background = state.superSpeed ? '#006600' : '';
    });

    el('cs-btn-noclip')?.addEventListener('click', () => {
      state.pos.y = 6;
      state.vel.y = 0;
      addKillFeed('👑 ADMIN', 'Noclip ON', 'console', false);
    });

    el('cs-btn-kill-all')?.addEventListener('click', () => {
      if (state.ws) state.ws.send(JSON.stringify({ type: 'admin_cs16_kill_all' }));
      addKillFeed('👑 ADMIN', 'Tüm Oyuncular', 'console', false);
    });

    el('cs-btn-respawn-all')?.addEventListener('click', () => {
      if (state.ws) state.ws.send(JSON.stringify({ type: 'admin_cs16_respawn_all' }));
    });

    el('cs-btn-announce')?.addEventListener('click', () => {
      const msg = prompt('Duyuru metni:');
      if (msg && state.ws) state.ws.send(JSON.stringify({ type: 'admin_announcement', message: msg }));
    });

    el('cs-btn-close-panel')?.addEventListener('click', () => {
      state.adminPanelVisible = false;
      panel.style.display = 'none';
    });
  }

  /* =========================================================
     15. HUD UPDATES
  ========================================================= */
  function updateHPHUD() {
    const el = document.getElementById('hud-hp-val');
    if (!el) return;
    el.textContent = state.hp;
    el.style.color = state.hp <= 25 ? '#ff2222' : state.hp <= 50 ? '#ffaa00' : '#44ff44';
  }

  /* =========================================================
     16. KILL FEED
  ========================================================= */
  function addKillFeed(killer, victim, weapon, headshot) {
    const feed = document.getElementById('cs-kill-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'kf-item' + (headshot ? ' kf-hs' : '');
    item.innerHTML = `
      <span class="kf-killer">${esc(killer)}</span>
      <span class="kf-weapon">[${weapon.toUpperCase()}${headshot ? ' 🎯HS' : ''}]</span>
      <span class="kf-victim">${esc(victim)}</span>
    `;
    feed.insertBefore(item, feed.firstChild);
    setTimeout(() => item.remove(), 5000);
    while (feed.children.length > 6) feed.lastChild.remove();
  }

  /* =========================================================
     17. BUY MENU (B key)
  ========================================================= */
  function showBuyMenu() {
    const existing = document.getElementById('buy-menu-overlay');
    if (existing) { existing.remove(); return; }
    const overlay = document.createElement('div');
    overlay.id = 'buy-menu-overlay';
    overlay.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);border:2px solid #ffcc44;border-radius:8px;padding:24px;min-width:360px;z-index:9000;color:#fff;font-family:monospace';
    overlay.innerHTML = `
      <h3 style="color:#ffcc44;margin:0 0 16px;text-align:center">🛒 SİLAH MAĞAZASI — [B]</h3>
      <div style="display:grid;gap:8px">
        <button class="buy-btn" data-w="ak47"  style="background:#2a1a0a;color:#ffaa44;border:1px solid #ffaa44;padding:10px 16px;cursor:pointer;border-radius:4px;font-size:14px;text-align:left">🔫 [1] CV-47 (AK-47) — Serbest</button>
        <button class="buy-btn" data-w="m4a1"  style="background:#0a1a2a;color:#44aaff;border:1px solid #44aaff;padding:10px 16px;cursor:pointer;border-radius:4px;font-size:14px;text-align:left">🔫 [2] M4A1 Silenced — Serbest</button>
        <button class="buy-btn" data-w="awp"   style="background:#0a2a0a;color:#44ff44;border:1px solid #44ff44;padding:10px 16px;cursor:pointer;border-radius:4px;font-size:14px;text-align:left">🔧 [3] AWP Sniper — Serbest</button>
        <button class="buy-btn" data-w="deagle" style="background:#2a2a0a;color:#ffff44;border:1px solid #ffff44;padding:10px 16px;cursor:pointer;border-radius:4px;font-size:14px;text-align:left">🔫 [4] Desert Eagle — Serbest</button>
        <button class="buy-btn" data-w="knife" style="background:#1a0a0a;color:#ff4444;border:1px solid #ff4444;padding:10px 16px;cursor:pointer;border-radius:4px;font-size:14px;text-align:left">🔪 [5] Bıçak — Serbest</button>
      </div>
      <p style="color:#888;font-size:11px;margin-top:12px;text-align:center">Tıkla seç • [B] veya ESC kapat</p>
    `;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = btn.dataset.w;
        // Refill weapon
        const cur = state.weapons[w];
        cur.clip = cur.maxClip;
        cur.reserve = cur.maxClip * 3;
        switchWeapon(w);
        overlay.remove();
      });
    });
    document.addEventListener('keydown', function closeBuy(e) {
      if (e.code === 'Escape' || e.code === 'KeyB') { overlay.remove(); document.removeEventListener('keydown', closeBuy); }
    });
  }

  /* =========================================================
     18. WEBSOCKET
  ========================================================= */
  function initWS() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}`);
    state.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: 'cs16' }));
      ws.send(JSON.stringify({ type: 'cs16_join', username: state.username, team: state.team }));
      if (state.isAdmin) ws.send(JSON.stringify({ type: 'admin_auth', password: 'erencix201124' }));
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      let data; try { data = JSON.parse(ev.data); } catch (_) { return; }

      if (data.type === 'cs16_joined') {
        state.myId = data.id;
        state.pos.x = data.x; state.pos.z = data.z;
        camera.position.set(data.x, 1.6, data.z);
        state.team = data.team || state.team;
        state.money = data.money || 1600;
        const mel = document.getElementById('cs-money-val'); if (mel) mel.textContent = '$' + state.money.toLocaleString();
        const bmel = document.getElementById('bm-money-text'); if (bmel) bmel.textContent = '$' + state.money.toLocaleString();
        const st = document.getElementById('cs-score-t'); if (st && data.scoreT !== undefined) st.textContent = data.scoreT;
        const sct = document.getElementById('cs-score-ct'); if (sct && data.scoreCT !== undefined) sct.textContent = data.scoreCT;
      }
      else if (data.type === 'cs16_team_assigned') {
        state.team = data.team;
        state.pos.x = data.x; state.pos.z = data.z;
        camera.position.set(data.x, 1.6, data.z);
        if (data.weapon) switchWeapon(data.weapon);
      }
      else if (data.type === 'cs16_money_update') {
        state.money = data.money;
        const mel = document.getElementById('cs-money-val'); if (mel) mel.textContent = '$' + state.money.toLocaleString();
        const bmel = document.getElementById('bm-money-text'); if (bmel) bmel.textContent = '$' + state.money.toLocaleString();
      }
      else if (data.type === 'cs16_buy_success') {
        state.money = data.money;
        const mel = document.getElementById('cs-money-val'); if (mel) mel.textContent = '$' + state.money.toLocaleString();
        const bmel = document.getElementById('bm-money-text'); if (bmel) bmel.textContent = '$' + state.money.toLocaleString();
        switchWeapon(data.weapon);
        const cur = state.weapons[data.weapon];
        if (cur) { cur.clip = cur.maxClip; cur.reserve = cur.maxClip * 3; }
        updateAmmoHUD();
        const mb = document.getElementById('modal-buy-menu');
        if (mb) mb.style.display = 'none';
        resumeGame();
      }
      else if (data.type === 'cs16_buy_failed') {
        alert(data.msg || 'Satın alma başarısız!');
      }
      else if (data.type === 'cs16_round_end') {
        const banner = document.getElementById('round-end-banner');
        const title = document.getElementById('reb-title');
        const desc = document.getElementById('reb-desc');
        if (title) {
          title.textContent = data.winner === 'CT' ? '🏆 COUNTER-TERRÖRİSTLER KAZANDI' : '🏆 TERRÖRİSTLER KAZANDI';
          title.style.color = data.winner === 'CT' ? '#4da6ff' : '#ff4d4d';
        }
        if (desc) desc.textContent = data.reason || '';
        if (banner) banner.style.display = 'flex';
        const st = document.getElementById('cs-score-t'); if (st && data.scoreT !== undefined) st.textContent = data.scoreT;
        const sct = document.getElementById('cs-score-ct'); if (sct && data.scoreCT !== undefined) sct.textContent = data.scoreCT;
      }
      else if (data.type === 'cs16_round_start') {
        const banner = document.getElementById('round-end-banner');
        if (banner) banner.style.display = 'none';
        state.isDead = false;
        state.hp = 100;
        state.ap = 100;
        state.pos.x = data.x; state.pos.z = data.z;
        camera.position.set(data.x, 1.6, data.z);
        updateHPHUD();
        const overlay = document.getElementById('death-overlay');
        if (overlay) overlay.style.display = 'none';
        Object.values(state.weapons).forEach(w => { w.clip = w.maxClip; w.reserve = w.maxClip * 3; });
        updateAmmoHUD();
        const rnum = document.getElementById('cs-round-num');
        if (rnum) rnum.textContent = 'Round ' + data.roundNumber;
        const st = document.getElementById('cs-score-t'); if (st && data.scoreT !== undefined) st.textContent = data.scoreT;
        const sct = document.getElementById('cs-score-ct'); if (sct && data.scoreCT !== undefined) sct.textContent = data.scoreCT;
      }
      else if (data.type === 'cs16_sync') {
        const sb = document.getElementById('sb-tbody');
        let html = '';
        for (const p of data.players) {
          if (p.id === state.myId) {
            if (!state.isGodmode) {
              state.hp = p.hp;
              updateHPHUD();
            }
            state.kills = p.kills || 0;
            state.deaths = p.deaths || 0;
          } else {
            const rec = getOrCreateRemotePlayer(p);
            rec.group.position.set(p.x, 0, p.z);
            rec.group.rotation.y = p.yaw || 0;
            rec.group.visible = p.hp > 0;
            updateRemotePlayerHP(rec, p.hp);
          }
          html += `<tr>
            <td class="${p.team === 'CT' ? 'sb-team-ct' : 'sb-team-t'}">${p.team}</td>
            <td>${esc(p.username)}${p.id === state.myId ? ' 🟢' : ''}</td>
            <td>${p.kills || 0}</td><td>${p.deaths || 0}</td>
            <td>${p.ping || (15 + (p.id % 40))} ms</td></tr>`;
        }
        if (sb) sb.innerHTML = html;

        // Match sync: timer & scores
        const st = document.getElementById('cs-score-t'); if (st && data.scoreT !== undefined) st.textContent = data.scoreT;
        const sct = document.getElementById('cs-score-ct'); if (sct && data.scoreCT !== undefined) sct.textContent = data.scoreCT;
        if (data.roundTime !== undefined) {
          const m = Math.floor(data.roundTime / 60);
          const s = data.roundTime % 60;
          const tm = document.getElementById('cs-timer');
          if (tm) {
            tm.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            tm.style.color = data.roundTime < 25 ? '#ff4444' : '#ffffff';
          }
        }
      }
      else if (data.type === 'cs16_kill_feed') {
        addKillFeed(data.killer, data.victim, data.weapon, data.headshot);
        if (data.victimId === state.myId && !state.isGodmode) {
          state.isDead = true;
          state.hp = 0;
          updateHPHUD();
          CS_Audio.playDie();
          const overlay = document.getElementById('death-overlay');
          if (overlay) { overlay.style.display = 'flex'; }
        }
        if (data.killerId === state.myId) {
          state.kills++;
          showKillConfirm(data.headshot);
        }
      }
      else if (data.type === 'cs16_respawn') {
        state.isDead = false;
        state.hp = 100;
        state.ap = 100;
        state.pos.x = data.x; state.pos.z = data.z;
        camera.position.set(data.x, 1.6, data.z);
        updateHPHUD();
        const overlay = document.getElementById('death-overlay');
        if (overlay) overlay.style.display = 'none';
        Object.values(state.weapons).forEach(w => { w.clip = w.maxClip; w.reserve = w.maxClip * 3; });
        updateAmmoHUD();
      }
      else if (data.type === 'cs16_hit') {
        if (!state.isGodmode) {
          state.hp = Math.max(0, state.hp - data.damage);
          updateHPHUD();
          const flash = document.getElementById('damage-flash');
          if (flash) {
            flash.style.opacity = '0.4';
            setTimeout(() => { flash.style.opacity = '0'; }, 200);
          }
          showHitDirectionIndicator(data.fromX, data.fromZ);
        }
      }
      else if (data.type === 'portal_announcement') {
        showAnnouncement(data.text || data.message || '');
      }
    };

    ws.onclose = () => setTimeout(initWS, 2000);
  }

  function showKillConfirm(headshot) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);color:#ff4444;font-size:28px;font-weight:bold;font-family:monospace;text-shadow:0 0 10px #ff0000;pointer-events:none;z-index:8000;text-align:center';
    el.innerHTML = headshot ? '💀 HEADSHOT!<br><span style="font-size:18px;color:#ffaa00">+KILL</span>' : '⚡ KILL!<br><span style="font-size:18px;color:#ffcc44">+1</span>';
    document.body.appendChild(el);
    let op = 1, oy = 0;
    const iv = setInterval(() => { op -= 0.035; oy -= 1.5; el.style.opacity = op; el.style.transform = `translate(-50%, calc(-50% + ${oy}px))`; if (op <= 0) { clearInterval(iv); el.remove(); } }, 30);
  }

  function showHitDirectionIndicator(fromX, fromZ) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:7500;';
    const angle = Math.atan2(fromX - state.pos.x, fromZ - state.pos.z) - state.yaw;
    // Blood vignette on hit side
    el.style.background = `radial-gradient(ellipse at ${50 + Math.sin(angle) * 40}% ${50 + Math.cos(angle) * 40}%, rgba(255,0,0,0.35) 0%, transparent 70%)`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 350);
  }

  function showAnnouncement(msg) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(200,0,0,0.9);color:#fff;padding:16px 32px;border-radius:8px;font-size:20px;font-weight:bold;font-family:monospace;z-index:99999;text-align:center;border:2px solid #ff4444;max-width:80vw';
    el.textContent = '📢 ' + msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 15000);
  }

  function esc(s) { return String(s).replace(/[&<>'"/]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '/': '&#47;' }[t] || t)); }

  /* =========================================================
     19. ROUND TIMER
  ========================================================= */
  let roundSeconds = 115;
  setInterval(() => {
    roundSeconds--;
    if (roundSeconds < 0) roundSeconds = 115;
    const m = Math.floor(roundSeconds / 60);
    const s = roundSeconds % 60;
    const el = document.getElementById('cs-timer');
    if (el) {
      el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      el.style.color = roundSeconds < 30 ? '#ff4444' : '#ffffff';
    }
  }, 1000);

  /* =========================================================
     20. BOOT
  ========================================================= */
  switchWeapon('ak47');
  updateHPHUD();
  initWS();
  animate();
  initAdminPanel();

  // Engine Mode Switcher (Orijinal CS 1.6 Web vs Bilişim 3D Local Engine)
  const tabCsWasm = document.getElementById('tab-cs-wasm');
  const tabCsLocal = document.getElementById('tab-cs-local');
  const wasmFrame = document.getElementById('cs-wasm-frame');
  const csCanvas = document.getElementById('cs-canvas');
  const csHud = document.querySelector('.cs-hud');
  const csCrosshair = document.getElementById('cs-crosshair');
  const csMatchHeader = document.getElementById('cs-local-header');
  const csMoneyPill = document.getElementById('cs-local-money');
  const csKillFeed = document.getElementById('cs-kill-feed');

  function setEngineMode(mode) {
    if (tabCsWasm) {
      tabCsWasm.classList.toggle('active', mode === 'wasm');
      tabCsWasm.style.background = mode === 'wasm' ? '#00e5ff' : 'transparent';
      tabCsWasm.style.color = mode === 'wasm' ? '#000' : '#bbb';
    }
    if (tabCsLocal) {
      tabCsLocal.classList.toggle('active', mode === 'local');
      tabCsLocal.style.background = mode === 'local' ? '#00e5ff' : 'transparent';
      tabCsLocal.style.color = mode === 'local' ? '#000' : '#bbb';
    }

    if (mode === 'wasm') {
      if (document.exitPointerLock) document.exitPointerLock();
      if (wasmFrame) wasmFrame.style.display = 'block';
      if (csCanvas) csCanvas.style.display = 'none';
      if (csHud) csHud.style.display = 'none';
      if (csCrosshair) csCrosshair.style.display = 'none';
      if (csMatchHeader) csMatchHeader.style.display = 'none';
      if (csMoneyPill) csMoneyPill.style.display = 'none';
      if (csKillFeed) csKillFeed.style.display = 'none';
    } else {
      if (wasmFrame) wasmFrame.style.display = 'none';
      if (csCanvas) csCanvas.style.display = 'block';
      if (csHud) csHud.style.display = 'flex';
      if (csCrosshair) csCrosshair.style.display = 'block';
      if (csMatchHeader) csMatchHeader.style.display = 'flex';
      if (csMoneyPill) csMoneyPill.style.display = 'block';
      if (csKillFeed) csKillFeed.style.display = 'flex';
    }
  }

  tabCsWasm?.addEventListener('click', () => setEngineMode('wasm'));
  tabCsLocal?.addEventListener('click', () => setEngineMode('local'));

  // Fullscreen button
  document.getElementById('btn-cs-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Reload button
  document.getElementById('btn-cs-reload')?.addEventListener('click', () => {
    if (wasmFrame && wasmFrame.style.display !== 'none') {
      wasmFrame.src = wasmFrame.src;
    } else {
      window.location.reload();
    }
  });

  // Set default mode: Canlı de_dust2 Sunucusuna Doğrudan Bağlan!
  setEngineMode('local');

  // Weapon wheel hint
  console.log('%c🔫 CS 1.6 Web FPS v2.0 — ÇALIŞIYOR!', 'color:#ffcc44;font-size:16px;font-weight:bold');
  console.log('%c1=AK47 2=M4A1 3=AWP 4=Deagle 5=Knife B=Mağaza ESC=AdminPanel', 'color:#aaa');

})();
