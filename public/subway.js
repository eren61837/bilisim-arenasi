// Subway Surfers 3D - 100% Self-Hosted WebGL Engine
// Powered by Three.js (Local) + Web Audio API - Zero External Dependencies
(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  const Sound = {
    ctx: null,
    muted: false,
    bgmOscs: [],
    bgmTimer: null,

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    },

    playTone(freq, type, duration, vol = 0.25) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start();
        o.stop(this.ctx.currentTime + duration);
      } catch (_) {}
    },

    coin() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(987, now); // B5
        o.frequency.exponentialRampToValueAtTime(1318, now + 0.12); // E6
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(now);
        o.stop(now + 0.16);
      } catch (_) {}
    },

    jump() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(220, now);
        o.frequency.exponentialRampToValueAtTime(540, now + 0.18);
        g.gain.setValueAtTime(0.25, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(now);
        o.stop(now + 0.2);
      } catch (_) {}
    },

    slide() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.18;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.18);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.3, now);
        g.gain.linearRampToValueAtTime(0.001, now + 0.18);
        noise.connect(filter);
        filter.connect(g);
        g.connect(this.ctx.destination);
        noise.start(now);
      } catch (_) {}
    },

    powerup() {
      if (this.muted) return;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((f, i) => {
        setTimeout(() => this.playTone(f, 'sine', 0.18, 0.25), i * 65);
      });
    },

    hoverboard() {
      if (this.muted) return;
      this.playTone(440, 'sawtooth', 0.35, 0.2);
      setTimeout(() => this.playTone(880, 'sine', 0.25, 0.25), 80);
    },

    crash() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(140, now);
        o.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        g.gain.setValueAtTime(0.45, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(now);
        o.stop(now + 0.45);
      } catch (_) {}
    },

    startBgm() {
      if (this.bgmTimer || this.muted) return;
      const notes = [
        261.6, 329.6, 392.0, 523.3, 392.0, 329.6, 293.7, 349.2,
        440.0, 587.3, 440.0, 349.2, 329.6, 392.0, 493.9, 659.3
      ];
      let step = 0;
      this.bgmTimer = setInterval(() => {
        if (this.muted || !game || !game.running) return;
        const freq = notes[step % notes.length];
        this.playTone(freq, 'triangle', 0.12, 0.04);
        step++;
      }, 150);
    },

    stopBgm() {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
    }
  };

  // --- GAME CONFIG & CONSTANTS ---
  const LANES = [-4.0, 0, 4.0];
  const LANE_LEFT = 0;
  const LANE_MID = 1;
  const LANE_RIGHT = 2;

  const CONFIG = {
    gravity: -42,
    jumpVelocity: 16.5,
    sneakersJumpVelocity: 23,
    slideDuration: 0.8,
    baseSpeed: 28,
    maxSpeed: 52,
    speedAccel: 0.22,
    trackChunkLength: 60,
    activeChunks: 8,
    coinMagnetRadius: 18,
    magnetDuration: 12,
    jetpackDuration: 9,
    hoverboardDuration: 20,
    sneakersDuration: 14,
    multiplierDuration: 15
  };

  // --- GAME STATE ---
  const state = {
    running: false,
    gameOver: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('subway_highscore') || '0', 10),
    coins: 0,
    multiplier: 1,
    multiplierTimer: 0,
    speed: CONFIG.baseSpeed,
    distance: 0,

    // Player position and physics
    lane: LANE_MID,
    targetX: LANES[LANE_MID],
    x: LANES[LANE_MID],
    y: 0,
    vy: 0,
    isJumping: false,
    isRolling: false,
    rollTime: 0,
    onTrainRoof: false,
    trainRoofY: 0,

    // Powerups
    hasHoverboard: false,
    hoverboardTimer: 0,
    hasMagnet: false,
    magnetTimer: 0,
    hasJetpack: false,
    jetpackTimer: 0,
    hasSneakers: false,
    sneakersTimer: 0,

    // Chaser (Inspector & Dog)
    chaserDist: 8, // Normal distance behind
    stumbleCount: 0,
    stumbleTimer: 0
  };

  // --- THREE.JS ENGINE SETUP ---
  let scene, camera, renderer;
  let playerGroup, chaserGroup, hoverboardMesh, jetpackMesh;
  let characterParts = {};
  let trackChunks = [];
  let obstacles = [];
  let coins = [];
  let powerups = [];
  let particles = [];
  let nextChunkZ = 30;

  // DOM elements
  const elScore = document.getElementById('val-score');
  const elCoins = document.getElementById('val-coins');
  const elMulti = document.getElementById('val-multi');
  const elHigh = document.getElementById('val-high');
  const elGameOver = document.getElementById('game-over-modal');
  const elGoScore = document.getElementById('go-score');
  const elGoCoins = document.getElementById('go-coins');
  const elGoHigh = document.getElementById('go-high');
  const elPowerupBar = document.getElementById('powerup-dock');

  // Materials cache
  let mats = {};

  function initThree() {
    const container = document.getElementById('game-container');
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || (window.innerHeight - 80);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101d);
    scene.fog = new THREE.FogExp2(0x0a101d, 0.0075);

    camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 400);
    camera.position.set(0, 6.2, 10.5);
    camera.lookAt(0, 2.8, -12);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Common materials
    mats.trackBed = new THREE.MeshLambertMaterial({ color: 0x21262d });
    mats.rail = new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.85, roughness: 0.25 });
    mats.sleeper = new THREE.MeshLambertMaterial({ color: 0x4e342e });
    mats.goldCoin = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2, emissive: 0xffa000, emissiveIntensity: 0.45 });
    mats.trainBodyRed = new THREE.MeshStandardMaterial({ color: 0xe53935, metalness: 0.3, roughness: 0.35 });
    mats.trainBodyBlue = new THREE.MeshStandardMaterial({ color: 0x1e88e5, metalness: 0.3, roughness: 0.35 });
    mats.trainRoof = new THREE.MeshLambertMaterial({ color: 0x37474f });
    mats.trainWindow = new THREE.MeshStandardMaterial({ color: 0x80d8ff, emissive: 0x0091ea, emissiveIntensity: 0.5 });
    mats.barrierStriped = new THREE.MeshLambertMaterial({ color: 0xffeb3b });
    mats.neonCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    mats.neonPink = new THREE.MeshBasicMaterial({ color: 0xff0077 });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.25);
    dirLight.position.set(25, 45, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    scene.add(dirLight);

    buildPlayerModel();
    buildChaserModel();
    initTracks();

    window.addEventListener('resize', onWindowResize, false);
  }

  function onWindowResize() {
    const container = document.getElementById('game-container');
    if (!container || !camera || !renderer) return;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || (window.innerHeight - 80);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  // --- PLAYER 3D MODEL (Jake Style Low-Poly Runner) ---
  function buildPlayerModel() {
    playerGroup = new THREE.Group();

    // Torso / Hoodie (Cyan / Blue jacket)
    const torsoGeo = new THREE.BoxGeometry(1.2, 1.4, 0.7);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x0088cc, roughness: 0.5 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.6;
    torso.castShadow = true;
    playerGroup.add(torso);
    characterParts.torso = torso;

    // Head with Skin Tone
    const headGeo = new THREE.BoxGeometry(0.75, 0.75, 0.75);
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffcb9a });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 2.7;
    head.castShadow = true;
    playerGroup.add(head);
    characterParts.head = head;

    // Baseball Cap (Red, backwards with visor)
    const capGeo = new THREE.BoxGeometry(0.82, 0.35, 0.85);
    const capMat = new THREE.MeshLambertMaterial({ color: 0xee2222 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 3.0, 0);
    playerGroup.add(cap);

    const visorGeo = new THREE.BoxGeometry(0.7, 0.08, 0.45);
    const visor = new THREE.Mesh(visorGeo, capMat);
    visor.position.set(0, 2.9, 0.55);
    playerGroup.add(visor);

    // Left Arm
    const armGeo = new THREE.BoxGeometry(0.35, 1.1, 0.35);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x0088cc });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.8, 1.5, 0);
    playerGroup.add(leftArm);
    characterParts.leftArm = leftArm;

    // Right Arm
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.8, 1.5, 0);
    playerGroup.add(rightArm);
    characterParts.rightArm = rightArm;

    // Left Leg (Jeans)
    const legGeo = new THREE.BoxGeometry(0.4, 1.1, 0.4);
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1a237e });
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.35, 0.55, 0);
    leftLeg.castShadow = true;
    playerGroup.add(leftLeg);
    characterParts.leftLeg = leftLeg;

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.35, 0.55, 0);
    rightLeg.castShadow = true;
    playerGroup.add(rightLeg);
    characterParts.rightLeg = rightLeg;

    // Red Sneakers
    const shoeGeo = new THREE.BoxGeometry(0.42, 0.28, 0.65);
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0xff1744 });
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.35, 0.14, 0.1);
    playerGroup.add(leftShoe);
    characterParts.leftShoe = leftShoe;

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0.35, 0.14, 0.1);
    playerGroup.add(rightShoe);
    characterParts.rightShoe = rightShoe;

    // Hoverboard (Initially hidden)
    const boardGeo = new THREE.BoxGeometry(1.6, 0.15, 2.6);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b0ff,
      emissiveIntensity: 0.6,
      metalness: 0.8
    });
    hoverboardMesh = new THREE.Mesh(boardGeo, boardMat);
    hoverboardMesh.position.set(0, -0.05, 0);
    hoverboardMesh.visible = false;
    playerGroup.add(hoverboardMesh);

    // Jetpack (Initially hidden)
    const jetpackGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
    const jetpackMat = new THREE.MeshStandardMaterial({
      color: 0xff5722,
      metalness: 0.7,
      roughness: 0.3
    });
    jetpackMesh = new THREE.Mesh(jetpackGeo, jetpackMat);
    jetpackMesh.position.set(0, 1.6, 0.55);
    jetpackMesh.visible = false;
    playerGroup.add(jetpackMesh);

    scene.add(playerGroup);
  }

  // --- CHASER 3D MODEL (Inspector & Dog) ---
  function buildChaserModel() {
    chaserGroup = new THREE.Group();

    // Inspector Body (Brown trenchcoat & hat)
    const coatGeo = new THREE.BoxGeometry(1.5, 2.0, 0.85);
    const coatMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });
    const coat = new THREE.Mesh(coatGeo, coatMat);
    coat.position.set(0, 1.7, 0);
    chaserGroup.add(coat);

    // Head & Cap
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const head = new THREE.Mesh(headGeo, new THREE.MeshLambertMaterial({ color: 0xffcc80 }));
    head.position.set(0, 3.0, 0);
    chaserGroup.add(head);

    const policeCapGeo = new THREE.BoxGeometry(0.9, 0.3, 0.9);
    const policeCap = new THREE.Mesh(policeCapGeo, new THREE.MeshLambertMaterial({ color: 0x1a237e }));
    policeCap.position.set(0, 3.4, 0);
    chaserGroup.add(policeCap);

    // Chaser Arms
    const armGeo = new THREE.BoxGeometry(0.35, 1.2, 0.35);
    const leftArm = new THREE.Mesh(armGeo, coatMat);
    leftArm.position.set(-0.95, 1.6, 0);
    chaserGroup.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, coatMat);
    rightArm.position.set(0.95, 1.6, 0);
    chaserGroup.add(rightArm);

    // Bulldog beside inspector
    const dogGroup = new THREE.Group();
    const dogBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.1), new THREE.MeshLambertMaterial({ color: 0x8d6e63 }));
    dogBody.position.set(1.4, 0.45, -0.4);
    dogGroup.add(dogBody);
    const dogHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0x6d4c41 }));
    dogHead.position.set(1.4, 0.8, -0.9);
    dogGroup.add(dogHead);
    chaserGroup.add(dogGroup);

    chaserGroup.position.set(LANES[LANE_MID], 0, 10);
    scene.add(chaserGroup);
  }

  // --- PROCEDURAL TRACKS & CHUNKS ---
  function createTrackChunk(zPos) {
    const chunkGroup = new THREE.Group();
    chunkGroup.position.z = zPos;

    // Ground Ballast Bed
    const groundGeo = new THREE.PlaneGeometry(16, CONFIG.trackChunkLength);
    const ground = new THREE.Mesh(groundGeo, mats.trackBed);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    chunkGroup.add(ground);

    // 3 pairs of steel rails
    LANES.forEach(laneX => {
      [-0.75, 0.75].forEach(offset => {
        const railGeo = new THREE.BoxGeometry(0.12, 0.22, CONFIG.trackChunkLength);
        const rail = new THREE.Mesh(railGeo, mats.rail);
        rail.position.set(laneX + offset, 0.11, 0);
        chunkGroup.add(rail);
      });

      // Wooden Railroad Sleepers
      const sleeperCount = Math.floor(CONFIG.trackChunkLength / 2.5);
      for (let i = 0; i < sleeperCount; i++) {
        const sleeperZ = -CONFIG.trackChunkLength / 2 + i * 2.5 + 1.25;
        const sleeperGeo = new THREE.BoxGeometry(2.1, 0.1, 0.45);
        const sleeper = new THREE.Mesh(sleeperGeo, mats.sleeper);
        sleeper.position.set(laneX, 0.05, sleeperZ);
        sleeper.receiveShadow = true;
        chunkGroup.add(sleeper);
      }
    });

    // Side tunnel walls / barriers with neon trims
    const wallGeo = new THREE.BoxGeometry(1.2, 5, CONFIG.trackChunkLength);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x161b22 });

    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-8.6, 2.5, 0);
    chunkGroup.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(8.6, 2.5, 0);
    chunkGroup.add(rightWall);

    // Overhead Electric Gantry Arch
    const gantry = createGantryArch();
    gantry.position.set(0, 0, 0);
    chunkGroup.add(gantry);

    scene.add(chunkGroup);
    trackChunks.push(chunkGroup);

    // Populate with obstacles, coins, and powerups (except first starting chunk)
    if (zPos < -20) {
      populateChunk(zPos);
    }
  }

  function createGantryArch() {
    const arch = new THREE.Group();
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x30363d });

    // Left pillar
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 0.6), pillarMat);
    p1.position.set(-7.8, 4.5, 0);
    arch.add(p1);

    // Right pillar
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 0.6), pillarMat);
    p2.position.set(7.8, 4.5, 0);
    arch.add(p2);

    // Crossbeam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.6, 0.6), pillarMat);
    beam.position.set(0, 8.8, 0);
    arch.add(beam);

    // Neon signal lights
    [-4, 0, 4].forEach(lx => {
      const signal = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), mats.neonCyan);
      signal.position.set(lx, 8.2, 0);
      arch.add(signal);
    });

    return arch;
  }

  function initTracks() {
    trackChunks = [];
    nextChunkZ = 30;
    for (let i = 0; i < CONFIG.activeChunks; i++) {
      createTrackChunk(nextChunkZ);
      nextChunkZ -= CONFIG.trackChunkLength;
    }
  }

  // --- OBSTACLE & ITEM GENERATOR ---
  function populateChunk(chunkZ) {
    const zBase = chunkZ;
    const laneConfigs = [0, 1, 2];

    // Pick 1 or 2 lanes for obstacles, leaving at least 1 lane free or jumpable!
    const numObstacles = Math.random() < 0.65 ? 2 : 1;
    const shuffledLanes = [...laneConfigs].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numObstacles; i++) {
      const laneIdx = shuffledLanes[i];
      const zOffset = (Math.random() - 0.5) * (CONFIG.trackChunkLength * 0.5);
      const obsZ = zBase + zOffset;
      const typeRand = Math.random();

      if (typeRand < 0.45) {
        // Subway Train Car
        spawnTrain(laneIdx, obsZ);
      } else if (typeRand < 0.75) {
        // Low Jump Barricade
        spawnBarricadeLow(laneIdx, obsZ);
      } else {
        // High Slide Barricade
        spawnBarricadeHigh(laneIdx, obsZ);
      }
    }

    // Spawn Coins & Powerups on remaining lanes
    const freeLane = shuffledLanes[numObstacles] !== undefined ? shuffledLanes[numObstacles] : shuffledLanes[0];
    const coinPattern = Math.random();
    if (coinPattern < 0.45) {
      spawnCoinArc(freeLane, zBase);
    } else {
      spawnCoinLine(freeLane, zBase);
    }

    // Random Powerup (Magnet, Jetpack, Sneakers, Multiplier)
    if (Math.random() < 0.3) {
      const pL = shuffledLanes[Math.floor(Math.random() * shuffledLanes.length)];
      spawnPowerup(pL, zBase + (Math.random() - 0.5) * 20);
    }
  }

  // 1. Subway Train (3D Car)
  function spawnTrain(laneIdx, zPos) {
    const trainGroup = new THREE.Group();
    const length = 26;
    const height = 4.4;
    const width = 3.3;

    const isRed = Math.random() < 0.5;
    const bodyMat = isRed ? mats.trainBodyRed : mats.trainBodyBlue;

    // Main train body
    const bodyGeo = new THREE.BoxGeometry(width, height, length);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, height / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    trainGroup.add(body);

    // Roof (walkable)
    const roofGeo = new THREE.BoxGeometry(width + 0.1, 0.4, length + 0.1);
    const roof = new THREE.Mesh(roofGeo, mats.trainRoof);
    roof.position.set(0, height + 0.2, 0);
    trainGroup.add(roof);

    // Windows on sides
    const winGeo = new THREE.BoxGeometry(width + 0.15, 1.1, 2.2);
    for (let w = -length / 2 + 3; w <= length / 2 - 3; w += 3.8) {
      const win = new THREE.Mesh(winGeo, mats.trainWindow);
      win.position.set(0, height * 0.65, w);
      trainGroup.add(win);
    }

    // Front headlights
    const lightGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12);
    lightGeo.rotateX(Math.PI / 2);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const l1 = new THREE.Mesh(lightGeo, lightMat);
    l1.position.set(-0.9, 1.6, length / 2 + 0.05);
    const l2 = new THREE.Mesh(lightGeo, lightMat);
    l2.position.set(0.9, 1.6, length / 2 + 0.05);
    trainGroup.add(l1);
    trainGroup.add(l2);

    // Optional cowcatcher ramp (lets player run up onto train!)
    const hasRamp = Math.random() < 0.35;
    if (hasRamp) {
      const rampGeo = new THREE.BoxGeometry(width, 0.4, 5);
      const ramp = new THREE.Mesh(rampGeo, mats.trainRoof);
      ramp.position.set(0, height * 0.48, length / 2 + 2.2);
      ramp.rotation.x = 0.45;
      trainGroup.add(ramp);
    }

    trainGroup.position.set(LANES[laneIdx], 0, zPos);
    scene.add(trainGroup);

    obstacles.push({
      type: 'train',
      mesh: trainGroup,
      lane: laneIdx,
      x: LANES[laneIdx],
      z: zPos,
      width: width,
      height: height,
      length: length,
      roofY: height + 0.4,
      hasRamp: hasRamp,
      moving: Math.random() < 0.35, // Some trains slowly move towards player!
      speed: 10
    });
  }

  // 2. Low Barricade (Must Jump Over)
  function spawnBarricadeLow(laneIdx, zPos) {
    const group = new THREE.Group();
    const width = 3.6;
    const height = 1.35;

    // Striped hurdle board
    const boardGeo = new THREE.BoxGeometry(width, 0.55, 0.2);
    const board = new THREE.Mesh(boardGeo, mats.barrierStriped);
    board.position.set(0, 0.8, 0);
    board.castShadow = true;
    group.add(board);

    // Support legs
    [-1.6, 1.6].forEach(lx => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.8), mats.rail);
      leg.position.set(lx, 0.7, 0);
      group.add(leg);
    });

    group.position.set(LANES[laneIdx], 0, zPos);
    scene.add(group);

    obstacles.push({
      type: 'barrier_low',
      mesh: group,
      lane: laneIdx,
      x: LANES[laneIdx],
      z: zPos,
      width: width,
      height: height,
      length: 1.0
    });
  }

  // 3. High Barricade (Must Slide / Roll Under)
  function spawnBarricadeHigh(laneIdx, zPos) {
    const group = new THREE.Group();
    const width = 3.6;
    const topY = 3.2;

    // Overhead Warning Beam
    const beamGeo = new THREE.BoxGeometry(width, 1.4, 0.3);
    const beam = new THREE.Mesh(beamGeo, mats.barrierStriped);
    beam.position.set(0, topY, 0);
    beam.castShadow = true;
    group.add(beam);

    // Tall support posts
    [-1.6, 1.6].forEach(lx => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.0, 0.25), mats.rail);
      post.position.set(lx, 2.0, 0);
      group.add(post);
    });

    // "DUCK / KAY!" Warning Sign
    const signGeo = new THREE.BoxGeometry(1.8, 0.5, 0.35);
    const sign = new THREE.Mesh(signGeo, mats.neonPink);
    sign.position.set(0, topY, 0.05);
    group.add(sign);

    group.position.set(LANES[laneIdx], 0, zPos);
    scene.add(group);

    obstacles.push({
      type: 'barrier_high',
      mesh: group,
      lane: laneIdx,
      x: LANES[laneIdx],
      z: zPos,
      width: width,
      clearanceY: 1.65, // Slide clearance under beam
      height: 4.0,
      length: 1.0
    });
  }

  // --- COINS & POWERUPS ---
  function spawnCoin(x, y, z) {
    const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 14);
    geo.rotateX(Math.PI / 2);
    const coin = new THREE.Mesh(geo, mats.goldCoin);
    coin.position.set(x, y, z);
    coin.castShadow = true;
    scene.add(coin);
    coins.push(coin);
  }

  function spawnCoinLine(laneIdx, zStart) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      spawnCoin(LANES[laneIdx], 1.2, zStart - i * 3.5);
    }
  }

  function spawnCoinArc(laneIdx, zStart) {
    const count = 7;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const arcY = 1.2 + Math.sin(t * Math.PI) * 3.5;
      spawnCoin(LANES[laneIdx], arcY, zStart - i * 3.2);
    }
  }

  function spawnPowerup(laneIdx, zPos) {
    const types = ['magnet', 'jetpack', 'sneakers', 'multiplier'];
    const type = types[Math.floor(Math.random() * types.length)];

    const group = new THREE.Group();
    let col = 0x00e5ff;
    if (type === 'jetpack') col = 0xff3d00;
    if (type === 'sneakers') col = 0x76ff03;
    if (type === 'multiplier') col = 0xffd600;

    const iconGeo = new THREE.OctahedronGeometry(0.7, 0);
    const iconMat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.65,
      metalness: 0.8
    });
    const icon = new THREE.Mesh(iconGeo, iconMat);
    group.add(icon);

    // Glowing aura ring
    const ringGeo = new THREE.TorusGeometry(0.9, 0.08, 8, 20);
    const ringMat = new THREE.MeshBasicMaterial({ color: col });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    group.position.set(LANES[laneIdx], 1.5, zPos);
    scene.add(group);

    powerups.push({
      type: type,
      mesh: group,
      lane: laneIdx,
      x: LANES[laneIdx],
      z: zPos
    });
  }

  // --- CONTROLS & INPUT SYSTEM ---
  function handleInput(action) {
    if (!state.running) {
      if (action === 'jump' || action === 'left' || action === 'right') {
        startGame();
      }
      return;
    }
    if (state.gameOver) return;

    Sound.init();

    if (action === 'left') {
      if (state.lane > LANE_LEFT) {
        state.lane--;
        state.targetX = LANES[state.lane];
        Sound.playTone(400, 'triangle', 0.08, 0.15);
      }
    } else if (action === 'right') {
      if (state.lane < LANE_RIGHT) {
        state.lane++;
        state.targetX = LANES[state.lane];
        Sound.playTone(480, 'triangle', 0.08, 0.15);
      }
    } else if (action === 'jump') {
      // Jump
      if (!state.isJumping || state.onTrainRoof) {
        state.isJumping = true;
        state.isRolling = false;
        const jumpVel = state.hasSneakers ? CONFIG.sneakersJumpVelocity : CONFIG.jumpVelocity;
        state.vy = jumpVel;
        Sound.jump();
      }
    } else if (action === 'slide') {
      // Slide / Roll
      state.isRolling = true;
      state.rollTime = CONFIG.slideDuration;
      // If jumping, slam down fast
      if (state.isJumping) {
        state.vy = -CONFIG.jumpVelocity * 1.5;
      }
      Sound.slide();
    } else if (action === 'hoverboard') {
      // Activate Hoverboard
      activateHoverboard();
    }
  }

  function activateHoverboard() {
    state.hasHoverboard = true;
    state.hoverboardTimer = CONFIG.hoverboardDuration;
    if (hoverboardMesh) hoverboardMesh.visible = true;
    Sound.hoverboard();
    updatePowerupHUD();
  }

  function initInputs() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') {
        e.preventDefault();
        handleInput('left');
      } else if (k === 'arrowright' || k === 'd') {
        e.preventDefault();
        handleInput('right');
      } else if (k === 'arrowup' || k === 'w') {
        e.preventDefault();
        handleInput('jump');
      } else if (k === 'arrowdown' || k === 's') {
        e.preventDefault();
        handleInput('slide');
      } else if (e.code === 'Space' || k === ' ') {
        e.preventDefault();
        // Double space triggers hoverboard, single space jumps
        const now = performance.now();
        if (state._lastSpace && (now - state._lastSpace < 350)) {
          handleInput('hoverboard');
        } else {
          handleInput('jump');
        }
        state._lastSpace = now;
      }
    });

    // Touch Swipe Gestures for Mobile / Tablet
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    window.addEventListener('touchstart', e => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = performance.now();
      }
    }, { passive: true });

    window.addEventListener('touchend', e => {
      if (e.changedTouches.length > 0) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const elapsed = performance.now() - touchStartTime;

        if (elapsed < 450) {
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);

          if (Math.max(absX, absY) > 25) {
            if (absX > absY) {
              if (dx > 0) handleInput('right');
              else handleInput('left');
            } else {
              if (dy > 0) handleInput('slide');
              else handleInput('jump');
            }
          } else {
            // Tap / Double Tap
            const now = performance.now();
            if (state._lastTap && (now - state._lastTap < 320)) {
              handleInput('hoverboard');
            }
            state._lastTap = now;
          }
        }
      }
    }, { passive: true });
  }

  // --- GAMEPLAY UPDATE LOOP ---
  let lastTime = performance.now();

  function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min((now - lastTime) / 1000, 0.08);
    lastTime = now;

    if (state.running && !state.gameOver) {
      updatePhysics(dt);
      updateWorld(dt);
      updateCollisions();
      updatePowerups(dt);
      updateCamera();
      updateUI();
    }

    // Always animate coins and scenery
    animateProps(dt);

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function updatePhysics(dt) {
    // Speed acceleration with distance
    state.speed = Math.min(CONFIG.maxSpeed, state.speed + CONFIG.speedAccel * dt);
    state.distance += state.speed * dt;
    state.score = Math.floor(state.distance * 1.5 * state.multiplier);

    // Smooth lane interpolation
    state.x += (state.targetX - state.x) * 16 * dt;
    if (Math.abs(state.targetX - state.x) < 0.05) state.x = state.targetX;

    // Jetpack Flying Mode
    if (state.hasJetpack) {
      state.y += (12.5 - state.y) * 8 * dt;
      state.vy = 0;
      state.isJumping = false;
      state.isRolling = false;
      // Emit jetpack fire particles
      emitParticles(playerGroup.position.x, playerGroup.position.y + 1.2, playerGroup.position.z + 0.6, 0xff7700, 2);
    } else {
      // Normal Gravity & Jumping
      state.vy += CONFIG.gravity * dt;
      state.y += state.vy * dt;

      // Floor / Train roof landing
      const groundLevel = state.onTrainRoof ? state.trainRoofY : 0;
      if (state.y <= groundLevel) {
        state.y = groundLevel;
        state.vy = 0;
        state.isJumping = false;
      }
    }

    // Roll / Slide duration
    if (state.isRolling) {
      state.rollTime -= dt;
      if (state.rollTime <= 0) {
        state.isRolling = false;
      }
    }

    // Apply player group position & animations
    playerGroup.position.set(state.x, state.y, 0);

    // Running / jumping / rolling character pose
    animatePlayerPose(dt);

    // Chaser follow & distance
    updateChaser(dt);
  }

  function animatePlayerPose(dt) {
    const runCycle = (state.distance * 0.8) % (Math.PI * 2);

    if (state.isRolling) {
      // Squashed roll pose
      characterParts.torso.scale.set(1, 0.45, 1.2);
      characterParts.torso.position.y = 0.6;
      characterParts.head.position.y = 1.2;
      characterParts.leftLeg.position.y = 0.2;
      characterParts.rightLeg.position.y = 0.2;
      playerGroup.rotation.x = Math.PI / 4;
    } else if (state.isJumping) {
      // Tuck jump pose
      characterParts.torso.scale.set(1, 1, 1);
      characterParts.torso.position.y = 1.6;
      characterParts.head.position.y = 2.7;
      characterParts.leftLeg.rotation.x = -0.7;
      characterParts.rightLeg.rotation.x = -0.7;
      characterParts.leftArm.rotation.x = 0.8;
      characterParts.rightArm.rotation.x = 0.8;
      playerGroup.rotation.x = -0.15;
    } else {
      // Normal running gait
      characterParts.torso.scale.set(1, 1, 1);
      characterParts.torso.position.y = 1.6 + Math.abs(Math.sin(runCycle * 2)) * 0.15;
      characterParts.head.position.y = 2.7 + Math.abs(Math.sin(runCycle * 2)) * 0.15;
      playerGroup.rotation.x = 0.08;

      characterParts.leftLeg.rotation.x = Math.sin(runCycle) * 0.85;
      characterParts.rightLeg.rotation.x = -Math.sin(runCycle) * 0.85;
      characterParts.leftArm.rotation.x = -Math.sin(runCycle) * 0.9;
      characterParts.rightArm.rotation.x = Math.sin(runCycle) * 0.9;
    }

    // Hoverboard tilt
    if (state.hasHoverboard && hoverboardMesh) {
      hoverboardMesh.rotation.z = (state.targetX - state.x) * 0.15;
    }
  }

  function updateChaser(dt) {
    // If player stumbled, chaser closes in!
    let targetChaserDist = 8;
    if (state.stumbleTimer > 0) {
      state.stumbleTimer -= dt;
      targetChaserDist = 2.5; // Right behind player!
    }
    state.chaserDist += (targetChaserDist - state.chaserDist) * 4 * dt;

    chaserGroup.position.set(state.x * 0.85, 0, state.chaserDist);

    // Chaser running animation
    const chaserCycle = (state.distance * 0.7) % (Math.PI * 2);
    chaserGroup.position.y = Math.abs(Math.sin(chaserCycle * 2)) * 0.15;
  }

  function updateWorld(dt) {
    const moveDist = state.speed * dt;

    // Move track chunks towards camera (+Z)
    trackChunks.forEach(chunk => {
      chunk.position.z += moveDist;
      // If passed behind camera, recycle ahead
      if (chunk.position.z > 60) {
        chunk.position.z = nextChunkZ;
        nextChunkZ -= CONFIG.trackChunkLength;
        // Clean old items and populate new
        cleanChunkItems(chunk.position.z);
        populateChunk(chunk.position.z);
      }
    });

    // Move obstacles towards camera (+Z)
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      let obsSpeed = state.speed;
      if (obs.moving) obsSpeed += obs.speed; // Moving trains come faster
      obs.z += obsSpeed * dt;
      obs.mesh.position.z = obs.z;

      // Despawn passed obstacles
      if (obs.z > 35) {
        scene.remove(obs.mesh);
        obstacles.splice(i, 1);
      }
    }

    // Move coins towards camera (+Z)
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.position.z += moveDist;

      // Magnet pull effect
      if (state.hasMagnet) {
        const dx = playerGroup.position.x - c.position.x;
        const dy = (playerGroup.position.y + 1.2) - c.position.y;
        const dz = playerGroup.position.z - c.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < CONFIG.coinMagnetRadius) {
          c.position.x += dx * 14 * dt;
          c.position.y += dy * 14 * dt;
          c.position.z += dz * 14 * dt;
        }
      }

      if (c.position.z > 25) {
        scene.remove(c);
        coins.splice(i, 1);
      }
    }

    // Move powerups towards camera (+Z)
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.z += moveDist;
      p.mesh.position.z = p.z;
      if (p.z > 25) {
        scene.remove(p.mesh);
        powerups.splice(i, 1);
      }
    }
  }

  function cleanChunkItems(targetZ) {
    // Cleanup any lingering items around recycled chunk
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (Math.abs(obstacles[i].z - targetZ) < CONFIG.trackChunkLength * 0.5) {
        scene.remove(obstacles[i].mesh);
        obstacles.splice(i, 1);
      }
    }
  }

  function animateProps(dt) {
    // Spin coins
    coins.forEach(c => {
      c.rotation.z += 3.5 * dt;
    });

    // Spin powerup meshes
    powerups.forEach(p => {
      p.mesh.rotation.y += 2.8 * dt;
      p.mesh.position.y = 1.5 + Math.sin(performance.now() / 250) * 0.25;
    });

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.mesh.position.addScaledVector(pt.velocity, dt);
      pt.life -= dt;
      pt.mesh.scale.multiplyScalar(0.95);
      if (pt.life <= 0) {
        scene.remove(pt.mesh);
        particles.splice(i, 1);
      }
    }
  }

  function emitParticles(x, y, z, color, count = 6) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const mat = new THREE.MeshBasicMaterial({ color: color });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      scene.add(m);
      particles.push({
        mesh: m,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4 + 1.5,
          (Math.random() - 0.5) * 4 + 4
        ),
        life: 0.45
      });
    }
  }

  // --- COLLISION DETECTION & RESOLUTION ---
  function updateCollisions() {
    state.onTrainRoof = false;

    // Check Obstacle Collisions
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const zDist = Math.abs(obs.z - playerGroup.position.z);

      if (obs.type === 'train') {
        const halfL = obs.length / 2;
        const inZ = obs.z - halfL < playerGroup.position.z + 0.8 && obs.z + halfL > playerGroup.position.z - 0.8;
        const inX = Math.abs(obs.x - playerGroup.position.x) < (obs.width / 2 + 0.5);

        if (inZ && inX) {
          // If player is on top of train roof
          if (state.y >= obs.roofY - 0.5) {
            state.onTrainRoof = true;
            state.trainRoofY = obs.roofY;
          } else if (obs.hasRamp && playerGroup.position.z > obs.z + halfL - 3) {
            // Player ran up the cowcatcher ramp onto roof!
            state.y = obs.roofY;
            state.onTrainRoof = true;
            state.trainRoofY = obs.roofY;
          } else {
            // Frontal crash into train!
            triggerCrash();
            return;
          }
        }
      } else if (obs.type === 'barrier_low') {
        // Low barricade: must jump over!
        if (zDist < 1.2 && Math.abs(obs.x - playerGroup.position.x) < 1.4) {
          if (state.y < obs.height) {
            triggerCrash();
            return;
          }
        }
      } else if (obs.type === 'barrier_high') {
        // High barricade: must slide/roll under!
        if (zDist < 1.2 && Math.abs(obs.x - playerGroup.position.x) < 1.4) {
          // If standing or jumping -> hit the beam!
          if (!state.isRolling || state.y > 0.4) {
            triggerCrash();
            return;
          }
        }
      }
    }

    // Check Coin Collisions
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      const dx = c.position.x - playerGroup.position.x;
      const dy = c.position.y - (playerGroup.position.y + 1.2);
      const dz = c.position.z - playerGroup.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 1.8) {
        // Collect coin!
        state.coins++;
        state.score += 25 * state.multiplier;
        Sound.coin();
        emitParticles(c.position.x, c.position.y, c.position.z, 0xffd700, 4);
        scene.remove(c);
        coins.splice(i, 1);
      }
    }

    // Check Powerup Collisions
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      const dx = p.x - playerGroup.position.x;
      const dy = p.mesh.position.y - (playerGroup.position.y + 1.2);
      const dz = p.z - playerGroup.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 2.0) {
        applyPowerup(p.type);
        emitParticles(p.x, p.mesh.position.y, p.z, 0x00f0ff, 8);
        scene.remove(p.mesh);
        powerups.splice(i, 1);
      }
    }
  }

  function applyPowerup(type) {
    Sound.powerup();
    if (type === 'magnet') {
      state.hasMagnet = true;
      state.magnetTimer = CONFIG.magnetDuration;
    } else if (type === 'jetpack') {
      state.hasJetpack = true;
      state.jetpackTimer = CONFIG.jetpackDuration;
      if (jetpackMesh) jetpackMesh.visible = true;
    } else if (type === 'sneakers') {
      state.hasSneakers = true;
      state.sneakersTimer = CONFIG.sneakersDuration;
    } else if (type === 'multiplier') {
      state.multiplier = 2;
      state.multiplierTimer = CONFIG.multiplierDuration;
    }
    updatePowerupHUD();
  }

  function updatePowerups(dt) {
    if (state.hasMagnet) {
      state.magnetTimer -= dt;
      if (state.magnetTimer <= 0) state.hasMagnet = false;
    }
    if (state.hasJetpack) {
      state.jetpackTimer -= dt;
      if (state.jetpackTimer <= 0) {
        state.hasJetpack = false;
        if (jetpackMesh) jetpackMesh.visible = false;
      }
    }
    if (state.hasHoverboard) {
      state.hoverboardTimer -= dt;
      if (state.hoverboardTimer <= 0) {
        state.hasHoverboard = false;
        if (hoverboardMesh) hoverboardMesh.visible = false;
      }
    }
    if (state.hasSneakers) {
      state.sneakersTimer -= dt;
      if (state.sneakersTimer <= 0) state.hasSneakers = false;
    }
    if (state.multiplier > 1) {
      state.multiplierTimer -= dt;
      if (state.multiplierTimer <= 0) state.multiplier = 1;
    }
    updatePowerupHUD();
  }

  function triggerCrash() {
    // If Hoverboard is active, it saves player from 1 fatal crash!
    if (state.hasHoverboard) {
      state.hasHoverboard = false;
      if (hoverboardMesh) hoverboardMesh.visible = false;
      Sound.crash();
      emitParticles(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z, 0x00e5ff, 15);
      // Stumble slightly and give safe invulnerability clearance
      state.stumbleTimer = 2.0;
      updatePowerupHUD();
      return;
    }

    // Direct Crash -> Game Over!
    state.gameOver = true;
    Sound.crash();
    Sound.stopBgm();
    emitParticles(playerGroup.position.x, playerGroup.position.y + 1, playerGroup.position.z, 0xff1744, 20);

    // Inspector catches the player
    chaserGroup.position.set(playerGroup.position.x, 0, playerGroup.position.z + 0.8);

    // Save High Score
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem('subway_highscore', state.highScore.toString());
    }

    // Show Game Over UI
    setTimeout(() => {
      if (elGoScore) elGoScore.textContent = state.score.toLocaleString();
      if (elGoCoins) elGoCoins.textContent = state.coins.toLocaleString();
      if (elGoHigh) elGoHigh.textContent = state.highScore.toLocaleString();
      if (elGameOver) elGameOver.style.display = 'flex';
    }, 700);
  }

  function updateCamera() {
    // Smooth cinematic chase camera
    const targetCamX = playerGroup.position.x * 0.45;
    const targetCamY = Math.max(5.8, playerGroup.position.y + 4.8);
    const targetCamZ = playerGroup.position.z + 9.5;

    camera.position.x += (targetCamX - camera.position.x) * 0.12;
    camera.position.y += (targetCamY - camera.position.y) * 0.15;
    camera.position.z = targetCamZ;

    camera.lookAt(playerGroup.position.x * 0.6, playerGroup.position.y * 0.5 + 2.2, playerGroup.position.z - 16);
  }

  function updateUI() {
    if (elScore) elScore.textContent = state.score.toLocaleString();
    if (elCoins) elCoins.textContent = state.coins.toLocaleString();
    if (elMulti) elMulti.textContent = `${state.multiplier}X`;
    if (elHigh) elHigh.textContent = state.highScore.toLocaleString();
  }

  function updatePowerupHUD() {
    if (!elPowerupBar) return;
    let html = '';
    if (state.hasHoverboard) html += `<div class="powerup-badge p-board">🛹 KAYKAY (${Math.ceil(state.hoverboardTimer)}s)</div>`;
    if (state.hasMagnet) html += `<div class="powerup-badge p-mag">🧲 MIKNATIS (${Math.ceil(state.magnetTimer)}s)</div>`;
    if (state.hasJetpack) html += `<div class="powerup-badge p-jet">🚀 JETPACK (${Math.ceil(state.jetpackTimer)}s)</div>`;
    if (state.hasSneakers) html += `<div class="powerup-badge p-sneak">👟 SÜPER ZIPLAMA (${Math.ceil(state.sneakersTimer)}s)</div>`;
    if (state.multiplier > 1) html += `<div class="powerup-badge p-multi">⭐ 2X PUAN (${Math.ceil(state.multiplierTimer)}s)</div>`;
    elPowerupBar.innerHTML = html;
  }

  // --- START & RESTART ---
  function startGame() {
    state.running = true;
    state.gameOver = false;
    state.score = 0;
    state.coins = 0;
    state.multiplier = 1;
    state.speed = CONFIG.baseSpeed;
    state.distance = 0;
    state.lane = LANE_MID;
    state.targetX = LANES[LANE_MID];
    state.x = LANES[LANE_MID];
    state.y = 0;
    state.vy = 0;
    state.isJumping = false;
    state.isRolling = false;
    state.hasHoverboard = false;
    state.hasMagnet = false;
    state.hasJetpack = false;
    state.hasSneakers = false;
    state.chaserDist = 8;
    state.stumbleTimer = 0;

    if (hoverboardMesh) hoverboardMesh.visible = false;
    if (jetpackMesh) jetpackMesh.visible = false;

    // Clear existing obstacles and coins
    obstacles.forEach(o => scene.remove(o.mesh));
    obstacles = [];
    coins.forEach(c => scene.remove(c));
    coins = [];
    powerups.forEach(p => scene.remove(p.mesh));
    powerups = [];

    // Reset chunks
    trackChunks.forEach(ch => scene.remove(ch));
    initTracks();

    if (elGameOver) elGameOver.style.display = 'none';
    const menuEl = document.getElementById('start-screen');
    if (menuEl) menuEl.style.display = 'none';

    Sound.init();
    Sound.startBgm();
  }

  // --- INITIALIZATION ---
  window.addEventListener('DOMContentLoaded', () => {
    initThree();
    initInputs();
    updateUI();

    // Start Button
    const btnStart = document.getElementById('btn-play-game');
    if (btnStart) btnStart.addEventListener('click', startGame);

    // Restart Button
    const btnRestart = document.getElementById('btn-restart-game');
    if (btnRestart) btnRestart.addEventListener('click', startGame);

    // On-screen touch buttons for mobile
    const btnLeft = document.getElementById('touch-left');
    const btnRight = document.getElementById('touch-right');
    const btnJump = document.getElementById('touch-jump');
    const btnSlide = document.getElementById('touch-slide');
    const btnBoard = document.getElementById('touch-board');

    if (btnLeft) btnLeft.addEventListener('click', () => handleInput('left'));
    if (btnRight) btnRight.addEventListener('click', () => handleInput('right'));
    if (btnJump) btnJump.addEventListener('click', () => handleInput('jump'));
    if (btnSlide) btnSlide.addEventListener('click', () => handleInput('slide'));
    if (btnBoard) btnBoard.addEventListener('click', () => handleInput('hoverboard'));

    // Audio toggle
    const btnAudio = document.getElementById('btn-toggle-audio');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        Sound.muted = !Sound.muted;
        btnAudio.textContent = Sound.muted ? '🔇 Ses: Kapalı' : '🔊 Ses: Açık';
        if (Sound.muted) Sound.stopBgm();
        else Sound.startBgm();
      });
    }

    requestAnimationFrame(gameLoop);
  });

  // Global game object for debugging & controls
  window.game = {
    start: startGame,
    input: handleInput
  };
})();
