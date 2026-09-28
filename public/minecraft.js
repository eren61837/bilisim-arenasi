// minecraft.js - 3D Web Voxel Minecraft & Eaglecraft Engine (Three.js)
(function() {
  'use strict';

  // --- AUDIO SYNTHESIZER (C418 AMBIENT PIANO & BLOCK SFX) ---
  const MCAudio = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
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
    breakBlock() {
      this.playTone(90 + Math.random() * 40, 'sawtooth', 0.08, 0.14);
    },
    placeBlock() {
      this.playTone(130 + Math.random() * 30, 'triangle', 0.09, 0.16);
    },
    step() {
      this.playTone(70 + Math.random() * 20, 'square', 0.04, 0.03);
    }
  };

  // C418 Nostalgic Ambient Piano Music
  const C418BGM = {
    ctx: null,
    isPlaying: false,
    intervalId: null,
    step: 0,
    // Gentle Minecraft Piano Chords (F#m - D - A - E)
    chords: [
      [370.0, 440.0, 554.37], // F#m
      [293.66, 369.99, 440.0], // D
      [220.0, 277.18, 329.63], // A
      [329.63, 415.30, 493.88]  // E
    ],
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
      this.intervalId = setInterval(() => this.playChord(), 3200);
      this.playChord();
      this.updateBtn(true);
    },
    stop() {
      this.isPlaying = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.updateBtn(false);
    },
    toggle() {
      if (this.isPlaying) this.stop();
      else this.start();
    },
    updateBtn(active) {
      const txt = document.getElementById('bgm-text');
      const btn = document.getElementById('btn-toggle-bgm');
      if (txt) txt.textContent = active ? 'C418: Açık' : 'Müzik: Kapalı';
      if (btn) btn.style.borderColor = active ? '#4caf50' : 'rgba(255,255,255,0.2)';
    },
    playChord() {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      const chord = this.chords[this.step % this.chords.length];

      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.045, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 2.8);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 2.8);
      });

      this.step++;
    }
  };

  // --- PROCEDURAL BLOCK TEXTURE FACTORY ---
  function makeTexture(w, h, drawFn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    drawFn(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  // Grass Top
  const texGrassTop = makeTexture(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#4c9930'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#5bb33a' : '#3d8026';
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
    }
  });

  // Grass Side
  const texGrassSide = makeTexture(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#866043'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#734d31' : '#9c7352';
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
    }
    // Grass hanging down
    ctx.fillStyle = '#4c9930';
    ctx.fillRect(0, 0, w, 4);
    for (let x = 0; x < w; x++) {
      const drop = Math.floor(Math.random() * 3);
      ctx.fillRect(x, 4, 1, drop);
    }
  });

  // Dirt
  const texDirt = makeTexture(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#866043'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#734d31' : '#9c7352';
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
    }
  });

  // Stone
  const texStone = makeTexture(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#666666' : '#8f8f8f';
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
    }
  });

  // Cobblestone
  const texCobble = makeTexture(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#5c5c5c'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#707070' : '#454545';
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
    }
  });

  // Wood Log Side
  const texWoodSide = makeTexture(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#6b5130'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x % 4 === 0) ctx.fillStyle = '#574126';
        else ctx.fillStyle = '#6b5130';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // Wood Log Top (Growth Rings)
  const texWoodTop = makeTexture(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#b08b59'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#85643b'; ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, 10, 10);
    ctx.strokeRect(6, 6, 4, 4);
  });

  // Leaves
  const texLeaves = makeTexture(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#2f751c'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#3b8f24' : '#1e5210';
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
    }
  });

  // Diamond Ore
  const texDiamond = makeTexture(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#666666' : '#8f8f8f';
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
    }
    // Cyan Diamond gems
    ctx.fillStyle = '#00e5ff';
    [[4,4], [5,4], [4,5], [10,9], [11,9], [11,10], [3,11], [4,11]].forEach(([x, y]) => {
      ctx.fillRect(x, y, 2, 2);
    });
    ctx.fillStyle = '#e0f7fa';
    [[4,4], [10,9], [3,11]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
  });

  // Gold Ore
  const texGold = makeTexture(16, 16, (ctx, w, h) => {
    ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#666666' : '#8f8f8f';
      ctx.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1, 1);
    }
    ctx.fillStyle = '#ffd54f';
    [[3,3], [4,3], [4,4], [9,8], [10,8], [10,9], [2,10], [3,10]].forEach(([x, y]) => {
      ctx.fillRect(x, y, 2, 2);
    });
  });

  // Glass
  const texGlass = makeTexture(16, 16, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(230, 245, 255, 0.4)'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
    ctx.strokeRect(4, 4, 3, 3);
  });

  // Material sets
  const MATS = {
    grass: [
      new THREE.MeshLambertMaterial({ map: texGrassSide }),
      new THREE.MeshLambertMaterial({ map: texGrassSide }),
      new THREE.MeshLambertMaterial({ map: texGrassTop }),
      new THREE.MeshLambertMaterial({ map: texDirt }),
      new THREE.MeshLambertMaterial({ map: texGrassSide }),
      new THREE.MeshLambertMaterial({ map: texGrassSide })
    ],
    dirt: new THREE.MeshLambertMaterial({ map: texDirt }),
    stone: new THREE.MeshLambertMaterial({ map: texStone }),
    wood: [
      new THREE.MeshLambertMaterial({ map: texWoodSide }),
      new THREE.MeshLambertMaterial({ map: texWoodSide }),
      new THREE.MeshLambertMaterial({ map: texWoodTop }),
      new THREE.MeshLambertMaterial({ map: texWoodTop }),
      new THREE.MeshLambertMaterial({ map: texWoodSide }),
      new THREE.MeshLambertMaterial({ map: texWoodSide })
    ],
    leaves: new THREE.MeshLambertMaterial({ map: texLeaves, transparent: true, opacity: 0.95 }),
    cobble: new THREE.MeshLambertMaterial({ map: texCobble }),
    diamond: new THREE.MeshLambertMaterial({ map: texDiamond }),
    gold: new THREE.MeshLambertMaterial({ map: texGold }),
    glass: new THREE.MeshLambertMaterial({ map: texGlass, transparent: true, opacity: 0.65 })
  };

  // HOTBAR REGISTRY
  const HOTBAR_ITEMS = [
    { id: 1, name: 'Çimenli Blok (Grass)', icon: '🟩', mat: 'grass' },
    { id: 2, name: 'Toprak (Dirt)', icon: '🟫', mat: 'dirt' },
    { id: 3, name: 'Doğal Taş (Stone)', icon: '🪨', mat: 'stone' },
    { id: 4, name: 'Meşe Kütüğü (Wood)', icon: '🪵', mat: 'wood' },
    { id: 5, name: 'Ağaç Yaprağı (Leaves)', icon: '🍃', mat: 'leaves' },
    { id: 6, name: 'Kırıktaş (Cobble)', icon: '🧱', mat: 'cobble' },
    { id: 7, name: 'Elmas Cevheri (Diamond Ore)', icon: '💎', mat: 'diamond' },
    { id: 8, name: 'Altın Cevheri (Gold Ore)', icon: '🪙', mat: 'gold' },
    { id: 9, name: 'Cam Blok (Glass)', icon: '🪟', mat: 'glass' }
  ];

  let selectedSlot = 0; // 0 to 8

  // --- THREE.JS SCENE SETUP ---
  const canvas = document.getElementById('mc-canvas');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x78a7ff);
  scene.fog = new THREE.FogExp2(0x78a7ff, 0.025);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 180);
  camera.rotation.order = 'YXZ';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff4d6, 1.1);
  sunLight.position.set(40, 70, 30);
  sunLight.castShadow = true;
  scene.add(sunLight);

  // VOXEL WORLD STORAGE
  const WORLD_X = 32;
  const WORLD_Z = 32;
  const WORLD_Y = 16;
  const voxelGrid = new Map(); // key: "x,y,z" -> mesh

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  function getVoxelKey(x, y, z) {
    return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
  }

  function addVoxel(x, y, z, matName) {
    const key = getVoxelKey(x, y, z);
    if (voxelGrid.has(key)) return;

    const mat = MATS[matName] || MATS.dirt;
    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { vx: x, vy: y, vz: z, matName };
    scene.add(mesh);
    voxelGrid.set(key, mesh);
  }

  function removeVoxel(x, y, z) {
    const key = getVoxelKey(x, y, z);
    const mesh = voxelGrid.get(key);
    if (mesh) {
      scene.remove(mesh);
      voxelGrid.delete(key);
      MCAudio.breakBlock();

      // Emit small voxel crack particles
      for (let i = 0; i < 6; i++) {
        const pGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const pMat = new THREE.MeshBasicMaterial({ color: 0x866043 });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, z + (Math.random() - 0.5) * 0.6);
        scene.add(pMesh);
        setTimeout(() => scene.remove(pMesh), 400);
      }
    }
  }

  // --- PROCEDURAL TERRAIN GENERATOR ---
  function generateTerrain() {
    for (let x = -WORLD_X / 2; x < WORLD_X / 2; x++) {
      for (let z = -WORLD_Z / 2; z < WORLD_Z / 2; z++) {
        // Natural hill height
        const dist = Math.sqrt(x * x + z * z);
        const h = Math.floor(Math.sin(x * 0.25) * 2 + Math.cos(z * 0.25) * 2 + 5);

        for (let y = 0; y <= h; y++) {
          if (y === h) {
            addVoxel(x, y, z, 'grass');
          } else if (y >= h - 2) {
            addVoxel(x, y, z, 'dirt');
          } else {
            const r = Math.random();
            if (r < 0.04 && y <= 3) addVoxel(x, y, z, 'diamond');
            else if (r < 0.08 && y <= 4) addVoxel(x, y, z, 'gold');
            else addVoxel(x, y, z, 'stone');
          }
        }

        // Trees (Oak trees on grass)
        if (x % 7 === 0 && z % 7 === 0 && Math.abs(x) > 2 && Math.abs(z) > 2) {
          const treeY = h + 1;
          // Trunk
          for (let ty = 0; ty < 4; ty++) {
            addVoxel(x, treeY + ty, z, 'wood');
          }
          // Canopy
          for (let lx = -2; lx <= 2; lx++) {
            for (let lz = -2; lz <= 2; lz++) {
              for (let ly = 2; ly <= 3; ly++) {
                if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && ly === 3) continue;
                if (!voxelGrid.has(getVoxelKey(x + lx, treeY + ly, z + lz))) {
                  addVoxel(x + lx, treeY + ly, z + lz, 'leaves');
                }
              }
            }
          }
          addVoxel(x, treeY + 4, z, 'leaves');
        }
      }
    }
  }

  generateTerrain();

  // PLAYER STATE
  const player = {
    pos: new THREE.Vector3(0, 10, 5),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    onGround: false,
    creative: false,
    speed: 0.16,
    lastSpaceTime: 0
  };

  camera.position.copy(player.pos);

  // Wireframe Target Box (Selection outline)
  const wireGeo = new THREE.EdgesGeometry(boxGeo);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
  const wireBox = new THREE.LineSegments(wireGeo, wireMat);
  wireBox.visible = false;
  scene.add(wireBox);

  // RAYCASTING TARGET
  const raycaster = new THREE.Raycaster();
  raycaster.far = 6.5;

  let currentTargetVoxel = null;
  let currentTargetNormal = null;

  function updateTarget() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const meshes = Array.from(voxelGrid.values());
    const hits = raycaster.intersectObjects(meshes, false);

    if (hits.length > 0) {
      const hit = hits[0];
      currentTargetVoxel = hit.object;
      currentTargetNormal = hit.face.normal;
      wireBox.position.copy(hit.object.position);
      wireBox.visible = true;
    } else {
      currentTargetVoxel = null;
      currentTargetNormal = null;
      wireBox.visible = false;
    }
  }

  // --- CONTROLS & POINTER LOCK ---
  const blocker = document.getElementById('mc-blocker');
  let isLocked = false;

  blocker.addEventListener('click', () => {
    canvas.requestPointerLock();
    C418BGM.start();
  });

  document.addEventListener('pointerlockchange', () => {
    isLocked = (document.pointerLockElement === canvas);
    blocker.classList.toggle('hidden', isLocked);
  });

  const keys = {};
  window.addEventListener('keydown', e => {
    if (document.activeElement?.tagName === 'INPUT') return;
    keys[e.code] = true;

    // Chat Trigger: T, Slash (/), or Enter
    if (e.code === 'KeyT' || e.code === 'Slash' || e.code === 'Enter') {
      e.preventDefault();
      openChat(e.code === 'Slash' ? '/' : '');
      return;
    }

    // Number keys 1-9 for hotbar
    if (e.code.startsWith('Digit')) {
      const num = parseInt(e.code.replace('Digit', ''), 10);
      if (num >= 1 && num <= 9) {
        selectHotbar(num - 1);
      }
    }

    // Space double tap for creative flight toggle
    if (e.code === 'Space') {
      const now = performance.now();
      if (now - player.lastSpaceTime < 280) {
        player.creative = !player.creative;
        player.vel.y = 0;
        updateGamemodeUI();
      }
      player.lastSpaceTime = now;
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });

  // Mouse Wheel hotbar select
  window.addEventListener('wheel', e => {
    if (!isLocked) return;
    if (e.deltaY > 0) selectHotbar((selectedSlot + 1) % 9);
    else selectHotbar((selectedSlot + 8) % 9);
  });

  // Mouse Move Look
  document.addEventListener('mousemove', e => {
    if (!isLocked) return;
    const sens = 0.0024;
    player.yaw -= e.movementX * sens;
    player.pitch -= e.movementY * sens;
    player.pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, player.pitch));

    camera.rotation.set(player.pitch, player.yaw, 0);
  });

  // Click Mining & Placing
  window.addEventListener('mousedown', e => {
    if (!isLocked) return;

    // Left Click: Break block
    if (e.button === 0 && currentTargetVoxel) {
      const p = currentTargetVoxel.position;
      removeVoxel(p.x, p.y, p.z);
    }
    // Right Click: Place block
    else if (e.button === 2 && currentTargetVoxel && currentTargetNormal) {
      const p = currentTargetVoxel.position;
      const nx = p.x + currentTargetNormal.x;
      const ny = p.y + currentTargetNormal.y;
      const nz = p.z + currentTargetNormal.z;

      // Don't place inside player
      const distToPlayer = Math.hypot(nx - player.pos.x, ny - (player.pos.y - 1), nz - player.pos.z);
      if (distToPlayer > 0.8) {
        const item = HOTBAR_ITEMS[selectedSlot];
        addVoxel(nx, ny, nz, item.mat);
        MCAudio.placeBlock();
      }
    }
  });

  // Prevent context menu
  window.addEventListener('contextmenu', e => {
    if (isLocked) e.preventDefault();
  });

  // --- HUD SETUP ---
  const heartsBar = document.getElementById('mc-hearts-bar');
  const hungerBar = document.getElementById('mc-hunger-bar');
  const hotbarEl = document.getElementById('mc-hotbar');
  const namePop = document.getElementById('mc-item-name-pop');

  for (let i = 0; i < 10; i++) {
    const h = document.createElement('span');
    h.className = 'mc-heart';
    h.textContent = '❤️';
    heartsBar.appendChild(h);

    const m = document.createElement('span');
    m.className = 'mc-meat';
    m.textContent = '🍗';
    hungerBar.appendChild(m);
  }

  HOTBAR_ITEMS.forEach((item, idx) => {
    const slot = document.createElement('div');
    slot.className = 'mc-slot' + (idx === 0 ? ' active' : '');
    slot.innerHTML = `
      <span class="mc-slot-num">${idx + 1}</span>
      <span class="mc-slot-icon">${item.icon}</span>
    `;
    slot.addEventListener('click', () => selectHotbar(idx));
    hotbarEl.appendChild(slot);
  });

  function selectHotbar(idx) {
    selectedSlot = idx;
    document.querySelectorAll('.mc-slot').forEach((el, i) => {
      el.classList.toggle('active', i === idx);
    });
    const item = HOTBAR_ITEMS[idx];
    if (namePop) {
      namePop.textContent = item.name;
      namePop.classList.add('visible');
      setTimeout(() => namePop.classList.remove('visible'), 2200);
    }
  }

  function updateGamemodeUI() {
    const icon = document.getElementById('gamemode-icon');
    const text = document.getElementById('gamemode-text');
    if (icon && text) {
      if (player.creative) {
        icon.textContent = '🕊️';
        text.textContent = 'Yaratıcı (Uçma)';
      } else {
        icon.textContent = '⚔️';
        text.textContent = 'Hayatta Kalma';
      }
    }
  }

  // Header Actions
  document.getElementById('btn-toggle-gamemode')?.addEventListener('click', () => {
    player.creative = !player.creative;
    player.vel.y = 0;
    updateGamemodeUI();
  });

  let isDay = true;
  document.getElementById('btn-toggle-time')?.addEventListener('click', () => {
    isDay = !isDay;
    const timeText = document.getElementById('time-text');
    if (isDay) {
      scene.background.set(0x78a7ff);
      scene.fog.color.set(0x78a7ff);
      ambientLight.intensity = 0.6;
      sunLight.intensity = 1.1;
      if (timeText) timeText.textContent = 'Gündüz';
    } else {
      scene.background.set(0x050814);
      scene.fog.color.set(0x050814);
      ambientLight.intensity = 0.15;
      sunLight.intensity = 0.2;
      if (timeText) timeText.textContent = 'Gece';
    }
  });

  document.getElementById('btn-toggle-bgm')?.addEventListener('click', () => {
    C418BGM.toggle();
  });

  // TABS & MODALS
  // TABS & VIEW SWITCHER
  const tabSingle = document.getElementById('tab-btn-single');
  const tabEagle = document.getElementById('tab-btn-eagle');
  const tabClassic = document.getElementById('tab-btn-classic');
  const tabVoxel = document.getElementById('tab-btn-web');
  const tabLauncher = document.getElementById('tab-btn-launcher');

  const frameSingle = document.getElementById('mc-single-frame');
  const frameEagle = document.getElementById('mc-eagle-frame');
  const frameClassic = document.getElementById('mc-classic-frame');
  const wrapVoxel = document.getElementById('mc-voxel-wrap');
  const modalLauncher = document.getElementById('modal-launcher');
  const btnCloseLauncher = document.getElementById('btn-close-launcher');

  const btnGm = document.getElementById('btn-toggle-gamemode');
  const btnTime = document.getElementById('btn-toggle-time');
  const btnBgm = document.getElementById('btn-toggle-bgm');

  function setView(viewName) {
    if (document.exitPointerLock) document.exitPointerLock();

    [tabSingle, tabEagle, tabClassic, tabVoxel, tabLauncher].forEach(b => b?.classList.remove('active'));

    // Hide all viewports
    if (frameSingle) frameSingle.style.display = 'none';
    if (frameEagle) frameEagle.style.display = 'none';
    if (frameClassic) frameClassic.style.display = 'none';
    if (wrapVoxel) wrapVoxel.style.display = 'none';
    if (modalLauncher) modalLauncher.classList.add('hidden');

    if (btnGm) btnGm.style.display = 'none';
    if (btnTime) btnTime.style.display = 'none';
    if (btnBgm) btnBgm.style.display = 'none';

    if (viewName === 'single') {
      tabSingle?.classList.add('active');
      if (frameSingle) frameSingle.style.display = 'block';
    } else if (viewName === 'eagle') {
      tabEagle?.classList.add('active');
      if (frameEagle) frameEagle.style.display = 'block';
    } else if (viewName === 'classic') {
      tabClassic?.classList.add('active');
      if (frameClassic) {
        if (!frameClassic.src && frameClassic.getAttribute('data-src')) {
          frameClassic.src = frameClassic.getAttribute('data-src');
        }
        frameClassic.style.display = 'block';
      }
    } else if (viewName === 'voxel') {
      tabVoxel?.classList.add('active');
      if (wrapVoxel) wrapVoxel.style.display = 'block';
      if (btnGm) btnGm.style.display = 'inline-flex';
      if (btnTime) btnTime.style.display = 'inline-flex';
      if (btnBgm) btnBgm.style.display = 'inline-flex';
    } else if (viewName === 'launcher') {
      tabLauncher?.classList.add('active');
      if (frameSingle) frameSingle.style.display = 'block'; // keep background active
      modalLauncher?.classList.remove('hidden');
    }
  }

  tabSingle?.addEventListener('click', () => setView('single'));
  tabEagle?.addEventListener('click', () => setView('eagle'));
  tabClassic?.addEventListener('click', () => setView('classic'));
  tabVoxel?.addEventListener('click', () => setView('voxel'));
  tabLauncher?.addEventListener('click', () => setView('launcher'));
  btnCloseLauncher?.addEventListener('click', () => modalLauncher?.classList.add('hidden'));

  // Fullscreen button
  document.getElementById('btn-mc-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Reload button
  document.getElementById('btn-mc-reload')?.addEventListener('click', () => {
    if (frameEagle && frameEagle.style.display !== 'none') {
      frameEagle.src = frameEagle.src;
    } else if (frameClassic && frameClassic.style.display !== 'none') {
      frameClassic.src = frameClassic.src;
    } else {
      window.location.reload();
    }
  });

  document.getElementById('btn-launch-local-pc')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/minecraft/launch-local', { method: 'POST' });
      const data = await res.json();
      if (data.success) alert('🚀 TLauncher başlatıldı! Masaüstü penceresine bakın.');
      else alert('Hata: ' + data.error);
    } catch (e) { alert('Bağlantı hatası: ' + e.message); }
  });

  // --- GAME ANIMATION LOOP ---
  let lastFrame = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;

    if (isLocked) {
      // Movement vectors
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);

      const move = new THREE.Vector3();
      if (keys['KeyW']) move.add(forward);
      if (keys['KeyS']) move.sub(forward);
      if (keys['KeyA']) move.sub(right);
      if (keys['KeyD']) move.add(right);
      if (move.lengthSq() > 0) move.normalize();

      // Creative Fly Mode
      if (player.creative) {
        player.pos.addScaledVector(move, player.speed * 1.5);
        if (keys['Space']) player.pos.y += player.speed * 1.2;
        if (keys['ShiftLeft'] || keys['ShiftRight']) player.pos.y -= player.speed * 1.2;
      }
      // Survival Physics (Gravity & Collision)
      else {
        player.pos.addScaledVector(move, player.speed);

        // Gravity
        player.vel.y -= 26 * dt;
        player.pos.y += player.vel.y * dt;

        // Ground block collision check
        const checkBelowX = Math.round(player.pos.x);
        const checkBelowY = Math.round(player.pos.y - 1.6);
        const checkBelowZ = Math.round(player.pos.z);
        const underKey = getVoxelKey(checkBelowX, checkBelowY, checkBelowZ);

        if (voxelGrid.has(underKey)) {
          player.pos.y = checkBelowY + 1.6;
          player.vel.y = 0;
          player.onGround = true;

          // Footstep sound when walking
          if (move.lengthSq() > 0 && Math.random() < 0.08) {
            MCAudio.step();
          }
        } else {
          player.onGround = false;
        }

        if (keys['Space'] && player.onGround) {
          player.vel.y = 9.5;
          player.onGround = false;
        }
      }

      camera.position.copy(player.pos);
      updateTarget();
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  // --- MINECRAFT IN-GAME CHAT SYSTEM ---
  const voxelWrap = document.getElementById('mc-voxel-wrap');
  const chatBox = document.createElement('div');
  chatBox.id = 'mc-chat-system';
  chatBox.style.cssText = 'position:absolute; bottom:65px; left:16px; width:380px; max-width:90%; z-index:100; pointer-events:none; font-family:monospace;';
  chatBox.innerHTML = `
    <div id="mc-chat-log" style="display:flex; flex-direction:column; gap:4px; max-height:220px; overflow-y:auto; margin-bottom:8px;"></div>
    <div id="mc-chat-bar" style="display:none; pointer-events:all; background:rgba(0,0,0,0.85); border:1.5px solid #55ff55; border-radius:4px; padding:4px 8px;">
      <input type="text" id="mc-chat-input" placeholder="Sohbet veya komut (/help)..." maxlength="120" style="width:100%; background:transparent; border:none; color:#fff; font-family:monospace; font-size:13px; outline:none;">
    </div>
  `;
  if (voxelWrap) voxelWrap.appendChild(chatBox);

  const chatLog = document.getElementById('mc-chat-log');
  const chatBar = document.getElementById('mc-chat-bar');
  const chatInput = document.getElementById('mc-chat-input');

  function addChatMessage(msg, color = '#ffffff') {
    if (!chatLog) return;
    const line = document.createElement('div');
    line.style.cssText = `background:rgba(0,0,0,0.6); color:${color}; padding:3px 8px; border-radius:3px; font-size:12px; line-height:1.4; word-break:break-word; max-width:100%; text-shadow:1px 1px 0 #000;`;
    line.innerHTML = msg;
    chatLog.appendChild(line);
    chatLog.scrollTop = chatLog.scrollHeight;
    setTimeout(() => {
      line.style.transition = 'opacity 1s';
      line.style.opacity = '0.5';
    }, 10000);
  }

  // Welcome message
  addChatMessage('⛏️ <span style="color:#55ff55; font-weight:bold;">[BilişimCraft]</span> Dünyaya hoş geldin! Sohbet veya komutlar için <b>T</b> veya <b>/</b> tuşuna bas.');

  function openChat(prefix = '') {
    if (!chatBar || !chatInput) return;
    if (document.pointerLockElement) document.exitPointerLock();
    chatBar.style.display = 'block';
    chatInput.value = prefix;
    setTimeout(() => chatInput.focus(), 50);
  }

  function closeChat() {
    if (!chatBar || !chatInput) return;
    chatBar.style.display = 'none';
    chatInput.blur();
    if (blocker && blocker.classList.contains('hidden')) {
      canvas.requestPointerLock?.();
    }
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        closeChat();
      } else if (e.key === 'Enter') {
        const text = chatInput.value.trim();
        if (text) {
          handleChatCommandOrMessage(text);
        }
        chatInput.value = '';
        closeChat();
      }
    });
  }

  function handleChatCommandOrMessage(text) {
    const pName = localStorage.getItem('portal_username') || 'Oyuncu';
    if (text.startsWith('/')) {
      const parts = text.slice(1).trim().split(' ');
      const cmd = parts[0].toLowerCase();
      if (cmd === 'help') {
        addChatMessage('📜 <span style="color:#ffff55;">Komutlar:</span> /gamemode c (Yaratıcı), /gamemode s (Hayatta Kalma), /time set day, /time set night, /clear, /spawn');
      } else if (cmd === 'gamemode') {
        const mode = parts[1]?.toLowerCase();
        if (mode === 'c' || mode === 'creative' || mode === '1') {
          player.creative = true;
          updateGamemodeUI();
          addChatMessage('⚙️ <span style="color:#55ff55;">Oyun modu Yaratıcı (Uçma) olarak değiştirildi.</span>');
        } else {
          player.creative = false;
          player.vel.y = 0;
          updateGamemodeUI();
          addChatMessage('⚙️ <span style="color:#55ff55;">Oyun modu Hayatta Kalma olarak değiştirildi.</span>');
        }
      } else if (cmd === 'time') {
        const t = parts[2]?.toLowerCase() || parts[1]?.toLowerCase();
        if (t === 'night' || t === 'gece') {
          scene.background.setHex(0x050814);
          scene.fog.color.setHex(0x050814);
          addChatMessage('🌙 <span style="color:#55ffff;">Zaman Gece olarak ayarlandı.</span>');
        } else {
          scene.background.setHex(0x78a7ff);
          scene.fog.color.setHex(0x78a7ff);
          addChatMessage('☀️ <span style="color:#ffff55;">Zaman Gündüz olarak ayarlandı.</span>');
        }
      } else if (cmd === 'spawn') {
        player.pos.set(0, 15, 0);
        player.vel.set(0, 0, 0);
        addChatMessage('🚩 <span style="color:#55ff55;">Başlangıç noktasına ışınlandın!</span>');
      } else if (cmd === 'clear') {
        if (chatLog) chatLog.innerHTML = '';
      } else {
        addChatMessage(`❓ <span style="color:#ff5555;">Bilinmeyen komut: /${cmd}. Yardım için /help yazın.</span>`);
      }
    } else {
      addChatMessage(`&lt;${pName}&gt; ${text}`);
      MCAudio.pop();
    }
  }

  // Window Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

})();
