// redmatch.js - Redmatch 2 Web 3D Arena FPS with Grapple Hook & Stat Upgrades
// Developer: Halil Eren | Built with Three.js & Web Audio API
(function() {
  'use strict';

  /* =========================================================
     1. STATE & PLAYER ATTRIBUTES
  ========================================================= */
  const state = {
    username: localStorage.getItem('portal_username') || 'Oyuncu_' + Math.floor(100 + Math.random() * 900),
    hp: 100,
    maxHp: 100,
    kills: 0,
    deaths: 0,
    killPoints: 0,
    isDead: false,

    // Upgrades
    lvlHp: 0,
    lvlSpd: 0,
    lvlJmp: 0,

    // Base Multipliers
    baseSpeed: 16,
    baseJump: 14,
    gravity: 34,

    // Physics
    pos: new THREE.Vector3(0, 2, 20),
    vel: new THREE.Vector3(0, 0, 0),
    pitch: 0,
    yaw: 0,
    onGround: false,
    isLocked: false,
    keys: { w: false, a: false, s: false, d: false, space: false, shift: false },

    // Grapple Hook
    grapple: {
      active: false,
      point: new THREE.Vector3(),
      line: null
    },

    // Weapons
    weapons: {
      rifle:   { name: 'Assault Rifle',  clip: 30, maxClip: 30, dmg: 28,  rate: 110, spread: 0.03, pellets: 1 },
      shotgun: { name: 'Shotgun',        clip: 8,  maxClip: 8,  dmg: 16,  rate: 650, spread: 0.08, pellets: 8 },
      sniper:  { name: 'Sniper Rifle',   clip: 5,  maxClip: 5,  dmg: 115, rate: 1100,spread: 0.001,pellets: 1 },
      double:  { name: 'Double Barrel',  clip: 2,  maxClip: 2,  dmg: 22,  rate: 300, spread: 0.10, pellets: 10 },
      knife:   { name: 'Tactical Blade', clip: 0,  maxClip: 0,  dmg: 65,  rate: 350, spread: 0,    pellets: 1 }
    },
    currentWp: 'rifle',
    lastFireTime: 0,
    isScoped: false,

    // Match settings
    botCount: 4,
    gameSpeedMult: 1.3,
    gravityMult: 1.0,
    mouseSensitivity: parseFloat(localStorage.getItem('rm_mouse_sens')) || 0.0035,

    ws: null
  };

  /* =========================================================
     2. WEB AUDIO SYNTHESIZER
  ========================================================= */
  const RMAudio = {
    ctx: null,
    init() {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    },
    tone(freq, type, dur, vol, ramp) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (ramp) osc.frequency.exponentialRampToValueAtTime(ramp, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    },
    noise(dur = 0.1, vol = 0.3) {
      if (!this.ctx) return;
      const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
    },
    shoot(wp) {
      this.init();
      if (wp === 'rifle') {
        this.tone(260, 'sawtooth', 0.12, 0.45, 40);
        this.noise(0.08, 0.3);
      } else if (wp === 'shotgun') {
        this.tone(140, 'sawtooth', 0.22, 0.6, 30);
        this.noise(0.18, 0.5);
      } else if (wp === 'sniper') {
        this.tone(90, 'sawtooth', 0.35, 0.7, 20);
        this.noise(0.2, 0.6);
      } else if (wp === 'double') {
        this.tone(180, 'sawtooth', 0.2, 0.6, 25);
        this.noise(0.25, 0.6);
      } else {
        this.tone(900, 'sine', 0.1, 0.2, 200);
      }
    },
    grappleLaunch() {
      this.init();
      this.tone(1200, 'triangle', 0.15, 0.3, 300);
      this.tone(350, 'sawtooth', 0.2, 0.2, 700);
    },
    grapplePull() {
      this.init();
      this.tone(180, 'sine', 0.08, 0.15);
    },
    hit() {
      this.init();
      this.tone(1500, 'sine', 0.06, 0.3, 800);
    },
    headshot() {
      this.init();
      this.tone(2200, 'triangle', 0.12, 0.4, 600);
      setTimeout(() => this.tone(2800, 'sine', 0.15, 0.3), 50);
    },
    upgrade() {
      this.init();
      [523, 659, 784, 1046].forEach((f, i) => {
        setTimeout(() => this.tone(f, 'sine', 0.14, 0.25), i * 80);
      });
    },
    jumpPad() {
      this.init();
      this.tone(200, 'sine', 0.35, 0.4, 900);
    }
  };

  /* =========================================================
     3. THREE.JS SCENE SETUP
  ========================================================= */
  const canvas = document.getElementById('rm-canvas');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060912);
  scene.fog = new THREE.FogExp2(0x060912, 0.015);

  const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.rotation.order = 'YXZ';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  // Arena Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const mainSun = new THREE.DirectionalLight(0xff3366, 1.2);
  mainSun.position.set(40, 80, 50);
  mainSun.castShadow = true;
  scene.add(mainSun);

  const cyanLight = new THREE.DirectionalLight(0x00e5ff, 0.6);
  cyanLight.position.set(-50, 40, -40);
  scene.add(cyanLight);

  /* =========================================================
     4. PROCEDURAL ARENA GEOMETRY (Redmatch Aesthetic)
  ========================================================= */
  const colliders = [];
  const jumpPads = [];
  const cabinets = [];

  // Materials
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x121724 });
  const blockMat = new THREE.MeshLambertMaterial({ color: 0x1e2433 });
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x2a3245 });
  const redGlowMat = new THREE.MeshBasicMaterial({ color: 0xff2255 });
  const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const goldGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });

  // 1. Arena Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), floorMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid line accents on ground
  const gridHelper = new THREE.GridHelper(240, 40, 0xff2255, 0x1a233a);
  gridHelper.position.y = 0.02;
  scene.add(gridHelper);

  function addBuilding(x, y, z, w, h, d, color = blockMat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), color);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));

    // Neon edge border on top of building
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.4, d + 0.1), redGlowMat);
    edge.position.set(x, y + h + 0.2, z);
    scene.add(edge);
    return mesh;
  }

  // Arena Outer Walls
  addBuilding(0, 0, -110, 220, 18, 4, pillarMat);
  addBuilding(0, 0, 110, 220, 18, 4, pillarMat);
  addBuilding(-110, 0, 0, 4, 18, 220, pillarMat);
  addBuilding(110, 0, 0, 4, 18, 220, pillarMat);

  // Center High Tower
  addBuilding(0, 0, 0, 24, 16, 24);
  addBuilding(0, 16, 0, 12, 14, 12, pillarMat);

  // Surrounding Buildings & Rooftops
  addBuilding(-45, 0, -45, 20, 12, 20);
  addBuilding(45, 0, -45, 20, 14, 20);
  addBuilding(-45, 0, 45, 22, 10, 22);
  addBuilding(45, 0, 45, 20, 15, 20);

  // Bridges / Walkways
  addBuilding(0, 10, -45, 40, 1.5, 6);
  addBuilding(0, 10, 45, 40, 1.5, 6);
  addBuilding(-45, 8, 0, 6, 1.5, 40);
  addBuilding(45, 8, 0, 6, 1.5, 40);

  // Scattered Parkour Pillars & Boxes
  const pillarCoords = [
    [-20, 0, -20], [20, 0, -20], [-20, 0, 20], [20, 0, 20],
    [-70, 0, -15], [70, 0, 15], [15, 0, -70], [-15, 0, 70]
  ];
  pillarCoords.forEach(([x, y, z]) => {
    addBuilding(x, y, z, 5, 8 + Math.random() * 6, 5, pillarMat);
  });

  // 2. Jump Pads (Fırlatma Rampaları) with Glowing Light Pillars
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
  const padCoords = [
    [0, 0, -25], [0, 0, 25], [-25, 0, 0], [25, 0, 0],
    [-60, 0, -60], [60, 0, 60], [-60, 0, 60], [60, 0, -60]
  ];
  padCoords.forEach(([x, y, z]) => {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.8, 0.4, 16), cyanGlowMat);
    pad.position.set(x, 0.2, z);
    scene.add(pad);

    // Glowing Vertical Beam
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 36, 16), beamMat);
    beam.position.set(x, 18, z);
    scene.add(beam);

    jumpPads.push({ pos: new THREE.Vector3(x, 0.2, z), radius: 3.2, power: 26 });
  });

  // Twinkling Cyber Stars in Sky
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 400; i++) {
    starPos.push((Math.random() - 0.5) * 450, 45 + Math.random() * 80, (Math.random() - 0.5) * 450);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xff3366, size: 1.8, transparent: true, opacity: 0.85 });
  scene.add(new THREE.Points(starGeo, starMat));

  // 3. Upgrade Cabinets (Yükseltme Dolapları / Kiosks)
  const cabCoords = [
    [0, 0, -75], [0, 0, 75], [-75, 0, 0], [75, 0, 0]
  ];
  cabCoords.forEach(([x, y, z]) => {
    const cabGroup = new THREE.Group();
    cabGroup.position.set(x, 0, z);

    // Kiosk Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 4.5, 1.5), pillarMat);
    body.position.y = 2.25;
    cabGroup.add(body);

    // Glowing Screen
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), goldGlowMat);
    screen.position.set(0, 2.5, 0.77);
    cabGroup.add(screen);

    // Rotating Hologram Ring
    const holoRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.08, 8, 24), goldGlowMat);
    holoRing.position.y = 5.2;
    holoRing.rotation.x = Math.PI / 2;
    cabGroup.add(holoRing);

    scene.add(cabGroup);
    colliders.push(new THREE.Box3().setFromObject(cabGroup));
    cabinets.push({ pos: new THREE.Vector3(x, 0, z), ring: holoRing });
  });

  /* =========================================================
     5. PROCEDURAL 3D GUN MODELS (Attached to camera)
  ========================================================= */
  const gunGroup = new THREE.Group();
  camera.add(gunGroup);
  scene.add(camera);

  // Dynamic Muzzle Flash Light
  const muzzleLight = new THREE.PointLight(0xff2255, 0, 18);
  muzzleLight.position.set(0.24, -0.16, -0.85);
  gunGroup.add(muzzleLight);

  const gunDark = new THREE.MeshLambertMaterial({ color: 0x111622 });
  const gunMetal = new THREE.MeshLambertMaterial({ color: 0x222a3a });
  const gunChrome = new THREE.MeshLambertMaterial({ color: 0x90a4ae });
  const gunRed = new THREE.MeshLambertMaterial({ color: 0xff1744 });
  const gunGold = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  const gunCyanGlow = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const gunRedGlow = new THREE.MeshBasicMaterial({ color: 0xff1744 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });

  // 1. Redmatch Assault Rifle (1-to-1 Cyber Tactical)
  function buildRifleModel() {
    const g = new THREE.Group();
    // Lower Receiver & Frame
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.48), gunDark);
    lower.position.set(0.24, -0.19, -0.42); g.add(lower);
    // Upper Receiver (Red Accents)
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.44), gunRed);
    upper.position.set(0.24, -0.13, -0.42); g.add(upper);
    // Top Picatinny Rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.38), gunMetal);
    rail.position.set(0.24, -0.095, -0.42); g.add(rail);
    // Holo Optic Sight
    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.1), gunDark);
    optic.position.set(0.24, -0.065, -0.38); g.add(optic);
    const opticGlass = new THREE.Mesh(new THREE.CircleGeometry(0.018, 8), gunCyanGlow);
    opticGlass.position.set(0.24, -0.065, -0.32); g.add(opticGlass);
    // Fluted Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 8), gunChrome);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0.24, -0.15, -0.76); g.add(barrel);
    // Compensator Muzzle Brake
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.08), gunRed);
    muzzle.position.set(0.24, -0.15, -0.92); g.add(muzzle);
    // Curved Tactical Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.085), gunMetal);
    mag.position.set(0.24, -0.3, -0.36); mag.rotation.x = 0.22; g.add(mag);
    // Pistol Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.06), gunDark);
    grip.position.set(0.24, -0.28, -0.22); grip.rotation.x = -0.3; g.add(grip);
    return g;
  }

  // 2. Redmatch Futuristic Shotgun (1-to-1 Heavy Pump)
  function buildShotgunModel() {
    const g = new THREE.Group();
    // Heavy Receiver
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.36), gunDark);
    body.position.set(0.24, -0.18, -0.32); g.add(body);
    // Chrome Barrel with Heat Shield
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.58, 8), gunChrome);
    b1.rotation.x = Math.PI / 2; b1.position.set(0.24, -0.15, -0.66); g.add(b1);
    // Magazine Tube Under Barrel
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.52, 8), gunMetal);
    tube.rotation.x = Math.PI / 2; tube.position.set(0.24, -0.21, -0.63); g.add(tube);
    // Ribbed Pump Slide
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.085, 0.18), gunRed);
    pump.position.set(0.24, -0.19, -0.58); g.add(pump);
    // Ergonomic Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.25), gunDark);
    stock.position.set(0.24, -0.21, -0.06); g.add(stock);
    g.visible = false;
    return g;
  }

  // 3. Redmatch Sniper Rifle (1-to-1 High-Caliber Cyber Rail)
  function buildSniperModel() {
    const g = new THREE.Group();
    // Heavy Chassis Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.52), gunDark);
    frame.position.set(0.24, -0.18, -0.38); g.add(frame);
    // Extended Fluted Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.95, 8), gunMetal);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0.24, -0.15, -0.92); g.add(barrel);
    // Big Rectangular Muzzle Brake
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.12), gunRed);
    muzzle.position.set(0.24, -0.15, -1.38); g.add(muzzle);
    // High-Power Tactical Scope
    const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 8), gunDark);
    scopeBody.rotation.x = Math.PI / 2; scopeBody.position.set(0.24, -0.08, -0.38); g.add(scopeBody);
    // Cyan Glowing Lenses
    const lensFront = new THREE.Mesh(new THREE.CircleGeometry(0.028, 12), gunCyanGlow);
    lensFront.position.set(0.24, -0.08, -0.54); g.add(lensFront);
    const lensBack = new THREE.Mesh(new THREE.CircleGeometry(0.028, 12), gunCyanGlow);
    lensBack.position.set(0.24, -0.08, -0.22); g.add(lensBack);
    // Skeleton Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 0.38), gunRed);
    stock.position.set(0.24, -0.2, -0.05); g.add(stock);
    g.visible = false;
    return g;
  }

  // 4. Redmatch Double Barrel Shotgun (1-to-1 Sawed-Off)
  function buildDoubleModel() {
    const g = new THREE.Group();
    // Dual Side-by-Side Barrels
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.58, 8), gunChrome);
    b1.rotation.x = Math.PI / 2; b1.position.set(0.21, -0.17, -0.48); g.add(b1);
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.58, 8), gunChrome);
    b2.rotation.x = Math.PI / 2; b2.position.set(0.27, -0.17, -0.48); g.add(b2);
    // Center Rib & Gold Bead Sight
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.015, 0.56), gunMetal);
    rib.position.set(0.24, -0.145, -0.48); g.add(rib);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), gunGold);
    bead.position.set(0.24, -0.135, -0.74); g.add(bead);
    // Polished Walnut Break-Action Stock
    const wood = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.1, 0.34), woodMat);
    wood.position.set(0.24, -0.2, -0.15); g.add(wood);
    g.visible = false;
    return g;
  }

  // 5. Redmatch Tactical Tanto Blade (1-to-1 High-Frequency Knife)
  function buildKnifeModel() {
    const g = new THREE.Group();
    // Carbon Fiber Tanto Blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.07, 0.35), gunDark);
    blade.position.set(0.24, -0.17, -0.42); g.add(blade);
    // Glowing Laser Edge
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.35), gunRedGlow);
    edge.position.set(0.24, -0.13, -0.42); g.add(edge);
    // Gold Spine Detail
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.01, 0.32), gunGold);
    spine.position.set(0.24, -0.205, -0.41); g.add(spine);
    // Tactical Handle Grip
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.16, 8), gunMetal);
    handle.rotation.x = Math.PI / 2; handle.position.set(0.24, -0.18, -0.18); g.add(handle);
    // Pommel Ring
    const pommel = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.008, 6, 12), gunRedGlow);
    pommel.position.set(0.24, -0.18, -0.09); g.add(pommel);
    g.visible = false;
    return g;
  }

  const weaponModels = {
    rifle: buildRifleModel(),
    shotgun: buildShotgunModel(),
    sniper: buildSniperModel(),
    double: buildDoubleModel(),
    knife: buildKnifeModel()
  };
  Object.values(weaponModels).forEach(m => gunGroup.add(m));

  // Grapple Cable Line (Dynamic)
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, linewidth: 3 });
  const grappleLine = new THREE.Line(lineGeo, lineMat);
  grappleLine.visible = false;
  scene.add(grappleLine);

  /* =========================================================
     6. BOT AI ENEMIES (1-to-1 Redmatch Capsule Cyborgs)
  ========================================================= */
  const bots = [];
  const botNames = ['Bot_Vortex', 'Bot_Apex', 'Bot_Shadow', 'Bot_Ghost', 'Bot_Kite', 'Bot_Nova', 'Bot_Strike'];

  function createBot(name) {
    const group = new THREE.Group();

    // Redmatch Capsule Body (Cyan/Red Cyborg)
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2196f3 });
    const darkArmor = new THREE.MeshLambertMaterial({ color: 0x161b22 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const jetMat = new THREE.MeshBasicMaterial({ color: 0xff9100 });

    // 1. Torso Capsule
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.9, 12), bodyMat);
    torso.position.y = 1.0; group.add(torso);
    const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), bodyMat);
    topCap.position.y = 1.45; group.add(topCap);
    const botCap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), bodyMat);
    botCap.position.y = 0.55; group.add(botCap);

    // 2. Glowing Visor Mask
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.22), visorMat);
    visor.position.set(0, 1.35, 0.26); group.add(visor);

    // 3. Cyber Jetpack Thrusters on Back
    const jetpack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.18), darkArmor);
    jetpack.position.set(0, 1.1, -0.32); group.add(jetpack);
    const thrusterL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 8), jetMat);
    thrusterL.position.set(-0.14, 0.8, -0.32); group.add(thrusterL);
    const thrusterR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 8), jetMat);
    thrusterR.position.set(0.14, 0.8, -0.32); group.add(thrusterR);

    // 4. Hand with Rifle Model
    const botGun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.7), darkArmor);
    botGun.position.set(0.45, 0.95, 0.3); group.add(botGun);

    // Initial position on ground level
    const rx = (Math.random() - 0.5) * 160;
    const rz = (Math.random() - 0.5) * 160;
    group.position.set(rx, 0, rz);
    scene.add(group);

    return {
      id: 'bot_' + Math.random().toString(36).substr(2, 6),
      name: name,
      group: group,
      hp: 100,
      maxHp: 100,
      kills: 0,
      targetPos: new THREE.Vector3(rx, 0, rz),
      moveTimer: 0,
      shootTimer: 0,
      velY: 0,
      isDead: false
    };
  }

  function initBots(count) {
    bots.forEach(b => scene.remove(b.group));
    bots.length = 0;
    for (let i = 0; i < count; i++) {
      bots.push(createBot(botNames[i % botNames.length]));
    }
  }
  initBots(state.botCount);

  /* =========================================================
     7. INPUT & POINTER LOCK
  ========================================================= */
  const blocker = document.getElementById('rm-blocker');
  const modalUpgrade = document.getElementById('modal-upgrade');
  const modalSettings = document.getElementById('modal-settings');
  const scopeOverlay = document.getElementById('rm-scope-overlay');
  const hitmarker = document.getElementById('rm-hitmarker');
  const scoreboard = document.getElementById('rm-scoreboard');

  function enterGame() {
    RMAudio.init();
    canvas.requestPointerLock();
  }

  document.getElementById('btn-play-rm')?.addEventListener('click', enterGame);
  canvas?.addEventListener('click', () => {
    if (!state.isLocked && modalUpgrade.style.display !== 'flex' && modalSettings.style.display !== 'flex') {
      enterGame();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    state.isLocked = (document.pointerLockElement === canvas);
    if (state.isLocked) {
      if (blocker) blocker.classList.add('hidden');
      if (modalUpgrade) modalUpgrade.classList.remove('active');
      if (modalSettings) modalSettings.classList.remove('active');
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!state.isLocked || state.isDead) return;
    const rawX = e.movementX || e.mozMovementX || 0;
    const rawY = e.movementY || e.mozMovementY || 0;

    // Ignore massive teleport glitch when locking pointer (> 400px in single frame)
    if (Math.abs(rawX) > 400 || Math.abs(rawY) > 400) return;

    const sens = state.mouseSensitivity || 0.0035;
    state.yaw -= rawX * sens;
    state.pitch -= rawY * sens;
    state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch));
  });

  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.code === 'KeyW') state.keys.w = true;
    if (e.code === 'KeyS') state.keys.s = true;
    if (e.code === 'KeyA') state.keys.a = true;
    if (e.code === 'KeyD') state.keys.d = true;
    if (e.code === 'Space') state.keys.space = true;
    if (e.code === 'ShiftLeft') state.keys.shift = true;

    // Weapon select
    if (e.code === 'Digit1') switchWeapon('rifle');
    if (e.code === 'Digit2') switchWeapon('shotgun');
    if (e.code === 'Digit3') switchWeapon('sniper');
    if (e.code === 'Digit4') switchWeapon('double');
    if (e.code === 'Digit5') switchWeapon('knife');

    // Upgrade cabinet interact
    if (e.code === 'KeyE') {
      checkCabinetInteract();
    }

    // Scoreboard
    if (e.code === 'Tab') {
      e.preventDefault();
      updateScoreboardUI();
      if (scoreboard) scoreboard.classList.add('active');
    }

    // Grapple hook key alternative
    if (e.code === 'KeyF') {
      toggleGrapple();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') state.keys.w = false;
    if (e.code === 'KeyS') state.keys.s = false;
    if (e.code === 'KeyA') state.keys.a = false;
    if (e.code === 'KeyD') state.keys.d = false;
    if (e.code === 'Space') state.keys.space = false;
    if (e.code === 'ShiftLeft') state.keys.shift = false;

    if (e.code === 'Tab') {
      if (scoreboard) scoreboard.classList.remove('active');
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (!state.isLocked || state.isDead) return;
    if (e.button === 0) {
      shootWeapon();
    } else if (e.button === 2) {
      // Right Click: Grapple Hook (or Sniper scope if not grappling)
      if (state.currentWp === 'sniper' && !state.grapple.active) {
        toggleSniperScope();
      } else {
        toggleGrapple();
      }
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button === 2 && state.grapple.active) {
      releaseGrapple();
    }
  });

  // Context menu prevent
  window.addEventListener('contextmenu', e => e.preventDefault());

  /* =========================================================
     8. WEAPONS & SHOOTING
  ========================================================= */
  function switchWeapon(wp) {
    if (!state.weapons[wp]) return;
    state.currentWp = wp;
    state.isScoped = false;
    if (scopeOverlay) scopeOverlay.style.display = 'none';

    // Toggle 3D weapon model visibility
    if (typeof weaponModels !== 'undefined') {
      Object.keys(weaponModels).forEach(k => {
        if (weaponModels[k]) weaponModels[k].visible = (k === wp);
      });
    }

    document.querySelectorAll('.rm-slot').forEach(el => el.classList.remove('active'));
    const slotMap = { rifle: 1, shotgun: 2, sniper: 3, double: 4, knife: 5 };
    const curSlot = document.querySelector(`.rm-slot[data-slot="${slotMap[wp]}"]`);
    if (curSlot) curSlot.classList.add('active');

    const nameEl = document.getElementById('rm-weapon-name');
    if (nameEl) nameEl.textContent = state.weapons[wp].name;

    const ammoEl = document.getElementById('rm-ammo-display');
    if (ammoEl) ammoEl.textContent = `${state.weapons[wp].clip} / ∞`;
  }

  function toggleSniperScope() {
    state.isScoped = !state.isScoped;
    if (scopeOverlay) scopeOverlay.style.display = state.isScoped ? 'flex' : 'none';
    camera.fov = state.isScoped ? 30 : 80;
    camera.updateProjectionMatrix();
  }

  function shootWeapon() {
    const wp = state.weapons[state.currentWp];
    const now = performance.now();
    if (now - state.lastFireTime < wp.rate) return;
    state.lastFireTime = now;

    RMAudio.shoot(state.currentWp);

    // Dynamic Muzzle Flash Light
    if (typeof muzzleLight !== 'undefined' && muzzleLight) {
      muzzleLight.intensity = 4.0;
      setTimeout(() => { if (muzzleLight) muzzleLight.intensity = 0; }, 40);
    }

    // Gun recoil animation
    gunGroup.position.z = 0.08;

    // Raycast for hits
    const raycaster = new THREE.Raycaster();
    const hitBots = [];

    for (let p = 0; p < wp.pellets; p++) {
      const spreadX = (Math.random() - 0.5) * wp.spread * (state.isScoped ? 0.2 : 1);
      const spreadY = (Math.random() - 0.5) * wp.spread * (state.isScoped ? 0.2 : 1);
      raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);

      // Check hit against bots
      bots.forEach(bot => {
        if (bot.isDead) return;
        const intersects = raycaster.intersectObjects(bot.group.children, true);
        if (intersects.length > 0) {
          const hit = intersects[0];
          const isHeadshot = (hit.point.y > bot.group.position.y + 1.55);
          hitBots.push({ bot, isHeadshot });
        }
      });
    }

    if (hitBots.length > 0) {
      // Pick first hit bot
      const target = hitBots[0];
      const damage = target.isHeadshot ? Math.round(wp.dmg * 2.2) : wp.dmg;
      damageBot(target.bot, damage, target.isHeadshot);

      // Hitmarker UI
      if (hitmarker) {
        hitmarker.classList.add('active');
        setTimeout(() => hitmarker.classList.remove('active'), 120);
      }
      if (target.isHeadshot) RMAudio.headshot();
      else RMAudio.hit();
    }
  }

  function damageBot(bot, dmg, isHeadshot) {
    bot.hp -= dmg;
    showFloatingDamage(bot.group.position, dmg, isHeadshot);

    if (bot.hp <= 0 && !bot.isDead) {
      bot.isDead = true;
      state.kills++;
      state.killPoints++;
      updateHUD();

      // Show kill confirmation
      RMAudio.headshot();
      showKillFeed(state.username, bot.name, state.weapons[state.currentWp].name, isHeadshot);

      // Bot death animation & respawn
      bot.group.visible = false;
      setTimeout(() => {
        bot.isDead = false;
        bot.hp = bot.maxHp;
        bot.group.position.set((Math.random() - 0.5) * 160, 2, (Math.random() - 0.5) * 160);
        bot.group.visible = true;
      }, 3500);
    }
  }

  function showFloatingDamage(worldPos, dmg, isHeadshot) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;color:${isHeadshot ? '#ffd54f' : '#ff4444'};font-size:${isHeadshot ? '24px' : '18px'};font-weight:900;font-family:monospace;pointer-events:none;z-index:3000;text-shadow:0 0 8px currentColor;`;
    el.textContent = isHeadshot ? `💀 -${dmg} HEADSHOT!` : `-${dmg}`;
    document.body.appendChild(el);

    // Project world to screen
    const p = worldPos.clone().project(camera);
    const sx = (p.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-(p.y * 0.5) + 0.5) * window.innerHeight;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;

    let op = 1, yOff = 0;
    const iv = setInterval(() => {
      op -= 0.04;
      yOff -= 2;
      el.style.opacity = op;
      el.style.transform = `translate(-50%, ${yOff}px)`;
      if (op <= 0) {
        clearInterval(iv);
        el.remove();
      }
    }, 30);
  }

  function showKillFeed(killer, victim, weapon, headshot) {
    const feed = document.getElementById('rm-kill-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'rm-kf-item';
    item.innerHTML = `<span class="rm-killer">${killer}</span> <span class="rm-weapon">[${weapon}${headshot ? ' 💀' : ''}]</span> <span class="rm-victim">${victim}</span>`;
    feed.prepend(item);
    setTimeout(() => item.remove(), 5000);
  }

  /* =========================================================
     9. GRAPPLE HOOK MECHANIC (Attack on Titan / Redmatch Style)
  ========================================================= */
  function toggleGrapple() {
    if (state.grapple.active) {
      releaseGrapple();
      return;
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    // Filter for valid building/wall/floor surface hit within 110 meters (excluding lines and self)
    const validHit = intersects.find(it => it.distance < 110 && it.object !== grappleLine && !it.object.userData?.isBot);

    if (validHit) {
      state.grapple.active = true;
      state.grapple.point.copy(validHit.point);
      grappleLine.visible = true;
      state.onGround = false;
      RMAudio.grappleLaunch();
    }
  }

  function releaseGrapple() {
    if (state.grapple.active) {
      state.grapple.active = false;
      grappleLine.visible = false;
      // Slingshot momentum boost (preserve and multiply velocity for epic air swings)
      state.vel.multiplyScalar(1.28);
      if (state.vel.y > 0) state.vel.y += 4;
    }
  }

  /* =========================================================
     10. UPGRADE CABINETS & STATS
  ========================================================= */
  function checkCabinetInteract() {
    let nearCabinet = false;
    cabinets.forEach(cab => {
      if (state.pos.distanceTo(cab.pos) < 6.5) nearCabinet = true;
    });

    if (nearCabinet) {
      if (document.exitPointerLock) document.exitPointerLock();
      state.isLocked = false;
      openUpgradeModal();
    }
  }

  function openUpgradeModal() {
    if (!modalUpgrade) return;
    document.getElementById('modal-killpoints-val').textContent = state.killPoints;
    modalUpgrade.classList.add('active');

    // Button states
    ['hp', 'spd', 'jmp'].forEach(t => {
      const btn = document.getElementById(`btn-up-${t}`);
      if (btn) btn.disabled = (state.killPoints < 1);
    });
  }

  function closeUpgradeModal() {
    if (!modalUpgrade) return;
    modalUpgrade.classList.remove('active');
    enterGame();
  }

  document.getElementById('btn-close-upgrade')?.addEventListener('click', closeUpgradeModal);

  document.querySelectorAll('.btn-rm-upgrade').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = btn.dataset.type;
      if (state.killPoints >= 1) {
        state.killPoints--;
        RMAudio.upgrade();

        if (type === 'hp') {
          state.lvlHp++;
          state.maxHp += 25;
          state.hp = state.maxHp; // Full heal on upgrade
        } else if (type === 'spd') {
          state.lvlSpd++;
        } else if (type === 'jmp') {
          state.lvlJmp++;
        }

        updateHUD();
        openUpgradeModal(); // refresh UI
      }
    });
  });

  function updateHUD() {
    document.getElementById('rm-hp-val').textContent = Math.round(state.hp);
    document.getElementById('rm-killpoints-val').textContent = state.killPoints;
    document.getElementById('rm-kills-val').textContent = state.kills;
    document.getElementById('stat-lvl-hp').textContent = state.lvlHp;
    document.getElementById('stat-lvl-spd').textContent = state.lvlSpd;
    document.getElementById('stat-lvl-jmp').textContent = state.lvlJmp;
  }

  /* =========================================================
     11. SETTINGS MODAL
  ========================================================= */
  const btnSettings = document.getElementById('btn-rm-settings');
  btnSettings?.addEventListener('click', () => {
    if (document.exitPointerLock) document.exitPointerLock();
    state.isLocked = false;
    const sensEl = document.getElementById('opt-mouse-sens');
    if (sensEl && state.mouseSensitivity) {
      sensEl.value = String(state.mouseSensitivity);
    }
    if (modalSettings) modalSettings.classList.add('active');
  });

  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    const grav = document.getElementById('opt-gravity').value;
    state.gravityMult = (grav === 'moon') ? 0.25 : (grav === 'low' ? 0.5 : 1.0);

    state.botCount = parseInt(document.getElementById('opt-bots').value) || 4;
    initBots(state.botCount);

    state.gameSpeedMult = parseFloat(document.getElementById('opt-speed').value) || 1.3;

    const sensVal = parseFloat(document.getElementById('opt-mouse-sens')?.value);
    if (!isNaN(sensVal) && sensVal > 0) {
      state.mouseSensitivity = sensVal;
      localStorage.setItem('rm_mouse_sens', sensVal);
    }

    if (modalSettings) modalSettings.classList.remove('active');
    enterGame();
  });

  // Fullscreen
  document.getElementById('btn-rm-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  });

  /* =========================================================
     12. SCOREBOARD
  ========================================================= */
  function updateScoreboardUI() {
    const tbody = document.getElementById('rm-sb-tbody');
    if (!tbody) return;

    const allPlayers = [
      { name: `👑 ${state.username} (Sen)`, kills: state.kills, deaths: state.deaths, kp: state.killPoints, isPlayer: true },
      ...bots.map(b => ({ name: b.name, kills: b.kills, deaths: 0, kp: b.kills, isPlayer: false }))
    ].sort((a, b) => b.kills - a.kills);

    tbody.innerHTML = allPlayers.map(p => `
      <tr style="${p.isPlayer ? 'background:rgba(255,34,85,0.15);font-weight:900;' : ''}">
        <td style="color:${p.isPlayer ? '#00e5ff' : '#ddd'};">${p.name}</td>
        <td style="color:#ffd54f;">${p.kills}</td>
        <td>${p.deaths}</td>
        <td>${p.kp} KP</td>
        <td style="color:#00e676;">${p.isPlayer ? 'Canlı' : 'Bot'}</td>
      </tr>
    `).join('');
  }

  /* =========================================================
     13. MAIN PHYSICS & ANIMATION LOOP
  ========================================================= */
  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Rotate Holographic Rings on Cabinets
    cabinets.forEach(cab => {
      if (cab.ring) cab.ring.rotation.z += dt * 1.5;
    });

    if (!state.isDead) {
      // 1. Move Speed & Jump multipliers
      const speedMult = (1 + state.lvlSpd * 0.18) * state.gameSpeedMult * (state.keys.shift ? 1.4 : 1.0);
      const jumpImpulse = (state.baseJump + state.lvlJmp * 3.2);

      // Movement Vector
      const moveDir = new THREE.Vector3();
      if (state.keys.w) moveDir.z -= 1;
      if (state.keys.s) moveDir.z += 1;
      if (state.keys.a) moveDir.x -= 1;
      if (state.keys.d) moveDir.x += 1;
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);

      // Accelerate / Friction
      const accel = state.onGround ? 65 : 20;
      state.vel.x += moveDir.x * accel * dt * speedMult;
      state.vel.z += moveDir.z * accel * dt * speedMult;

      const friction = (state.onGround && !state.grapple.active) ? 0.86 : 0.985;
      state.vel.x *= friction;
      state.vel.z *= friction;

      // Gravity
      state.vel.y -= state.gravity * state.gravityMult * dt;

      // Jump
      if (state.keys.space && state.onGround) {
        state.vel.y = jumpImpulse;
        state.onGround = false;
        RMAudio.init();
      }

      // 2. Grapple Pull Physics (Elastic spring pull with momentum)
      if (state.grapple.active) {
        const pullVec = state.grapple.point.clone().sub(state.pos);
        const dist = pullVec.length();

        if (dist > 1.8) {
          const pullDir = pullVec.clone().normalize();
          // Dynamic pull force: snappy and powerful (Increased!)
          const pullSpeed = Math.min(Math.max(dist * 6.5, 90), 160);
          state.vel.addScaledVector(pullDir, pullSpeed * dt);

          // Counter gravity and lift player up into the air
          state.vel.y += 48 * dt;
          state.onGround = false;

          // Update 3D Cable line
          const gunTip = camera.position.clone().add(new THREE.Vector3(0.2, -0.2, -0.4).applyEuler(camera.rotation));
          const positions = grappleLine.geometry.attributes.position.array;
          positions[0] = gunTip.x; positions[1] = gunTip.y; positions[2] = gunTip.z;
          positions[3] = state.grapple.point.x; positions[4] = state.grapple.point.y; positions[5] = state.grapple.point.z;
          grappleLine.geometry.attributes.position.needsUpdate = true;
        } else {
          releaseGrapple();
        }
      }

      // 3. Jump Pad Collision Check
      jumpPads.forEach(pad => {
        if (state.pos.distanceTo(pad.pos) < pad.radius && state.pos.y < pad.pos.y + 1.2) {
          state.vel.y = pad.power;
          state.onGround = false;
          RMAudio.jumpPad();
        }
      });

      // 4. Substepped Position Update & Rock-Solid Collision (No Wall Clipping / Tunneling)
      const pRad = 0.55;
      const SUBSTEPS = 6; // Increased substeps for high-speed grapple stability
      const sdt = dt / SUBSTEPS;

      let onColRoof = false;

      for (let step = 0; step < SUBSTEPS; step++) {
        // --- X Axis Movement & Collision ---
        state.pos.x += state.vel.x * sdt;
        for (const col of colliders) {
          const feetY = state.pos.y - 1.6;
          const headY = state.pos.y + 0.2;
          if (feetY < col.max.y && headY > col.min.y) {
            if (state.pos.x + pRad > col.min.x && state.pos.x - pRad < col.max.x &&
                state.pos.z + pRad > col.min.z && state.pos.z - pRad < col.max.z) {
              if (state.vel.x > 0) {
                state.pos.x = col.min.x - pRad;
                state.vel.x = 0;
              } else if (state.vel.x < 0) {
                state.pos.x = col.max.x + pRad;
                state.vel.x = 0;
              }
            }
          }
        }

        // --- Z Axis Movement & Collision ---
        state.pos.z += state.vel.z * sdt;
        for (const col of colliders) {
          const feetY = state.pos.y - 1.6;
          const headY = state.pos.y + 0.2;
          if (feetY < col.max.y && headY > col.min.y) {
            if (state.pos.x + pRad > col.min.x && state.pos.x - pRad < col.max.x &&
                state.pos.z + pRad > col.min.z && state.pos.z - pRad < col.max.z) {
              if (state.vel.z > 0) {
                state.pos.z = col.min.z - pRad;
                state.vel.z = 0;
              } else if (state.vel.z < 0) {
                state.pos.z = col.max.z + pRad;
                state.vel.z = 0;
              }
            }
          }
        }

        // --- Y Axis Movement & Rooftop / Ceiling Collision ---
        state.pos.y += state.vel.y * sdt;
        for (const col of colliders) {
          if (state.pos.x + pRad > col.min.x && state.pos.x - pRad < col.max.x &&
              state.pos.z + pRad > col.min.z && state.pos.z - pRad < col.max.z) {
            const feetY = state.pos.y - 1.6;
            const headY = state.pos.y + 0.2;
            if (feetY < col.max.y && headY > col.min.y) {
                if (state.vel.y < 0) {
                  state.pos.y = col.max.y + 1.6;
                  state.vel.y = 0;
                  state.onGround = true;
                  onColRoof = true;
                } else if (state.vel.y > 0) {
                  state.pos.y = col.min.y - 0.2;
                  state.vel.y = 0;
                }
            }
          }
        }

        // Ground limit
        if (!onColRoof && state.pos.y <= 1.6) {
          state.pos.y = 1.6;
          state.vel.y = 0;
          state.onGround = true;
        }

        // Arena Bound Limits
        state.pos.x = Math.max(-105, Math.min(105, state.pos.x));
        state.pos.z = Math.max(-105, Math.min(105, state.pos.z));
      }

      // Camera Sync
      camera.position.copy(state.pos);
      camera.rotation.y = state.yaw;
      camera.rotation.x = state.pitch;

      // Weapon sway / walking bobbing and recoil recovery
      const horizSpeed = Math.sqrt(state.vel.x * state.vel.x + state.vel.z * state.vel.z);
      if (state.onGround && horizSpeed > 1.5) {
        state.bobTime = (state.bobTime || 0) + dt * Math.min(horizSpeed, 25) * 0.55;
        gunGroup.position.x = Math.sin(state.bobTime) * 0.008;
        gunGroup.position.y = -Math.abs(Math.cos(state.bobTime)) * 0.006;
      } else {
        gunGroup.position.x += (0 - gunGroup.position.x) * dt * 8;
        gunGroup.position.y += (0 - gunGroup.position.y) * dt * 8;
      }
      gunGroup.position.z += (0 - gunGroup.position.z) * dt * 10;

      // Cabinet Proximity Check for HUD Hint
      let nearCab = false;
      cabinets.forEach(cab => {
        if (state.pos.distanceTo(cab.pos) < 6.5) nearCab = true;
      });
      const cabPrompt = document.getElementById('rm-cabinet-prompt');
      if (cabPrompt) cabPrompt.style.display = nearCab ? 'flex' : 'none';
    }

    // 5. Update Bots AI with Gravity, Floor Snapping & Wall Collision
    bots.forEach(bot => {
      if (bot.isDead) return;

      // Gravity and floor height calculation for bot
      bot.velY = (bot.velY || 0) - 34 * dt;
      bot.group.position.y += bot.velY * dt;

      // Check highest roof under bot
      let floorY = 0;
      for (const col of colliders) {
        if (bot.group.position.x >= col.min.x - 0.4 && bot.group.position.x <= col.max.x + 0.4 &&
            bot.group.position.z >= col.min.z - 0.4 && bot.group.position.z <= col.max.z + 0.4) {
          if (col.max.y > floorY && col.max.y <= bot.group.position.y + 1.2) {
            floorY = col.max.y;
          }
        }
      }

      if (bot.group.position.y <= floorY) {
        bot.group.position.y = floorY;
        bot.velY = 0;
      }

      // Roam
      bot.moveTimer -= dt;
      if (bot.moveTimer <= 0) {
        bot.moveTimer = 2.5 + Math.random() * 3;
        bot.targetPos.set((Math.random() - 0.5) * 150, 0, (Math.random() - 0.5) * 150);
      }
      const dir = bot.targetPos.clone().sub(bot.group.position);
      dir.y = 0;
      if (dir.length() > 1) {
        dir.normalize();

        // Check building obstruction before moving
        const nextX = bot.group.position.x + dir.x * 9 * dt;
        const nextZ = bot.group.position.z + dir.z * 9 * dt;
        let blocked = false;

        for (const col of colliders) {
          if (nextX >= col.min.x - 0.5 && nextX <= col.max.x + 0.5 &&
              nextZ >= col.min.z - 0.5 && nextZ <= col.max.z + 0.5 &&
              bot.group.position.y + 0.9 >= col.min.y && bot.group.position.y <= col.max.y - 0.2) {
            blocked = true;
            break;
          }
        }

        if (!blocked) {
          bot.group.position.x = nextX;
          bot.group.position.z = nextZ;
          bot.group.rotation.y = Math.atan2(dir.x, dir.z);
        } else {
          bot.moveTimer = 0; // Pick new direction if blocked
        }
      }

      // Bot shoots at player if nearby
      const distToPlayer = bot.group.position.distanceTo(state.pos);
      if (distToPlayer < 40 && !state.isDead) {
        bot.shootTimer -= dt;
        if (bot.shootTimer <= 0) {
          bot.shootTimer = 1.8 + Math.random() * 1.5;
          // Random chance to hit player
          if (Math.random() < 0.4) {
            state.hp = Math.max(0, state.hp - 18);
            updateHUD();
            if (state.hp <= 0) {
              state.isDead = true;
              state.deaths++;
              showKillFeed(bot.name, state.username, 'Rifle', false);
              setTimeout(() => {
                state.isDead = false;
                state.hp = state.maxHp;
                state.pos.set(0, 2, 20);
                updateHUD();
              }, 3000);
            }
          }
        }
      }
    });

    // Interpolate remote online players
    const nowTime = Date.now();
    remotePlayers.forEach((rp, id) => {
      rp.group.position.lerp(rp.targetPos, 0.25);
      if (nowTime - rp.lastSeen > 8000) {
        scene.remove(rp.group);
        remotePlayers.delete(id);
      }
    });

    renderer.render(scene, camera);
  }

  // --- ONLINE MULTIPLAYER WEBSOCKET ENGINE ---
  const remotePlayers = new Map();
  const myRmId = 'rm_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

  function createRemoteMesh(name) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xff0055 });
    const darkArmor = new THREE.MeshLambertMaterial({ color: 0x161b22 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.9, 12), bodyMat);
    torso.position.y = 1.0; group.add(torso);
    const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), bodyMat);
    topCap.position.y = 1.45; group.add(topCap);
    const botCap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), bodyMat);
    botCap.position.y = 0.55; group.add(botCap);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.22), visorMat);
    visor.position.set(0, 1.35, 0.26); group.add(visor);

    const botGun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.7), darkArmor);
    botGun.position.set(0.45, 0.95, 0.3); group.add(botGun);

    scene.add(group);
    return group;
  }

  function initMultiplayerWS() {
    try {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}`;
      state.ws = new WebSocket(wsUrl);

      state.ws.onopen = () => {
        state.ws.send(JSON.stringify({ type: 'join', room: 'redmatch' }));
        console.log('[Redmatch 3D] Online multiplayer sunucusuna bağlanıldı!');
      };

      state.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'redmatch_remote_player' && data.id !== myRmId) {
            let rp = remotePlayers.get(data.id);
            if (!rp) {
              const mesh = createRemoteMesh(data.username);
              rp = {
                id: data.id,
                username: data.username,
                group: mesh,
                hp: data.hp || 100,
                targetPos: new THREE.Vector3(data.pos.x, data.pos.y, data.pos.z),
                lastSeen: Date.now()
              };
              remotePlayers.set(data.id, rp);
            }
            if (data.pos) rp.targetPos.set(data.pos.x, data.pos.y, data.pos.z);
            if (data.yaw !== undefined) rp.group.rotation.y = data.yaw;
            rp.hp = data.hp || 100;
            rp.lastSeen = Date.now();
          } else if (data.type === 'redmatch_kill_feed') {
            showKillFeed(data.killer, data.victim, data.weapon, data.headshot);
          }
        } catch (_) {}
      };

      // 25Hz Position Broadcast
      setInterval(() => {
        if (state.ws && state.ws.readyState === WebSocket.OPEN && !state.isDead) {
          state.ws.send(JSON.stringify({
            type: 'redmatch_sync',
            id: myRmId,
            username: state.username,
            pos: { x: state.pos.x, y: state.pos.y, z: state.pos.z },
            yaw: state.yaw,
            hp: state.hp,
            weapon: state.currentWp,
            grappling: state.grapple.active
          }));
        }
      }, 40);
    } catch (_) {}
  }

  // Window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Init
  const usernameDisplay = document.getElementById('rm-username-display');
  if (usernameDisplay) usernameDisplay.textContent = state.username;
  updateHUD();
  initMultiplayerWS();
  animate();

})();
