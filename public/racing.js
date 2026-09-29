// ============================================================================
// BİLİŞİM GP: GERÇEK 3D ÇOK OYUNCULU YARIŞ ARENASI (Three.js WebGL Engine)
// Geliştirici: Halil Eren | Bilişim Arenası
// Özellikler:
//   - Tam 3D Three.js Motoru, Chase Kamera, Dinamik Gölgeler ve Aydınlatma
//   - Demir Sur / Çelik Bariyer Sistemi (Pist dışına çıkılamaz, metalik kıvılcım & sekme)
//   - Düzeltilmiş Sabit Zaman Adımlı Fizik (Ani hızlanma ve takılmalar yok)
//   - 4 Farklı 3D Yarış Arabası, Nitro Alevleri, Drift Dumanı, Çelik Bariyer Kıvılcımları
//   - 3 Zorluk Kademeli Akıllı AI Bot Rakipler
//   - Gerçek Zamanlı 2D Radar Minimap ve Tam HUD Entegrasyonu
// ============================================================================

(function() {
    'use strict';

    // ------------------------------------------------------------------------
    // 1. STATE & GLOBAL CONFIGURATION
    // ------------------------------------------------------------------------
    const state = {
        mode: 'ai', // 'ai', '1v1', '2v2', 'quick'
        color: '#00dbff',
        username: localStorage.getItem('portal_username') || 'Pilot_' + Math.floor(100 + Math.random() * 900),
        lapsToWin: 3,
        difficulty: 'medium', // 'easy', 'medium', 'hard'
        roomCode: '',
        soundEnabled: true,
        gameRunning: false,
        inCountdown: false,
        startTime: 0,
        currentLapStartTime: 0,
        bestLapTime: null,
        lapTimes: []
    };

    // UI Elements
    const screenMenu = document.getElementById('screen-menu');
    const screenLobby = document.getElementById('screen-lobby');
    const screenGame = document.getElementById('screen-game');
    const screenPodium = document.getElementById('screen-podium');
    const playerNameEl = document.getElementById('racing-player-name');
    const btnToggleSound = document.getElementById('btn-toggle-sound');

    if (playerNameEl) playerNameEl.textContent = state.username;

    // ------------------------------------------------------------------------
    // 2. AUDIO SYNTHESIZER (Web Audio API)
    // ------------------------------------------------------------------------
    let audioCtx = null;
    let engineOsc1 = null;
    let engineOsc2 = null;
    let engineGain = null;
    let driftOsc = null;
    let driftGain = null;

    function initAudio() {
        if (audioCtx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();

            // Dual engine synthesizers
            engineOsc1 = audioCtx.createOscillator();
            engineOsc2 = audioCtx.createOscillator();
            engineGain = audioCtx.createGain();

            engineOsc1.type = 'sawtooth';
            engineOsc2.type = 'triangle';
            engineOsc1.frequency.setValueAtTime(48, audioCtx.currentTime);
            engineOsc2.frequency.setValueAtTime(96, audioCtx.currentTime);

            engineGain.gain.setValueAtTime(0, audioCtx.currentTime);

            engineOsc1.connect(engineGain);
            engineOsc2.connect(engineGain);
            engineGain.connect(audioCtx.destination);

            engineOsc1.start();
            engineOsc2.start();

            // Tire screech / drift synthesizer
            driftOsc = audioCtx.createOscillator();
            driftGain = audioCtx.createGain();
            driftOsc.type = 'sawtooth';
            driftOsc.frequency.setValueAtTime(850, audioCtx.currentTime);
            driftGain.gain.setValueAtTime(0, audioCtx.currentTime);

            driftOsc.connect(driftGain);
            driftGain.connect(audioCtx.destination);
            driftOsc.start();
        } catch (_) {}
    }

    function updateEngineSound(speedRatio, isDrifting, isNitro) {
        if (!state.soundEnabled || !audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            if (state.gameRunning && !state.inCountdown) {
                const targetGain = 0.07 + speedRatio * 0.12 + (isNitro ? 0.08 : 0);
                engineGain.gain.setTargetAtTime(targetGain, now, 0.05);

                const baseFreq = 50 + speedRatio * 170 + (isNitro ? 65 : 0);
                engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
                engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);

                const driftVol = isDrifting ? 0.09 : 0;
                driftGain.gain.setTargetAtTime(driftVol, now, 0.04);
            } else {
                engineGain.gain.setTargetAtTime(0, now, 0.1);
                driftGain.gain.setTargetAtTime(0, now, 0.1);
            }
        } catch (_) {}
    }

    function playBeep(freq, duration) {
        if (!state.soundEnabled) return;
        try {
            initAudio();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (_) {}
    }

    function playCrashSound() {
        if (!state.soundEnabled) return;
        try {
            initAudio();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(45, audioCtx.currentTime + 0.22);
            gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.22);
        } catch (_) {}
    }

    function playLapChime() {
        if (!state.soundEnabled) return;
        [523, 659, 784, 1046].forEach((f, i) => {
            setTimeout(() => playBeep(f, 0.16), i * 85);
        });
    }

    function playVictoryFanfare() {
        if (!state.soundEnabled) return;
        [440, 554, 659, 880, 880, 1108].forEach((f, i) => {
            setTimeout(() => playBeep(f, 0.24), i * 130);
        });
    }

    window.toggleAudio = function() {
        state.soundEnabled = !state.soundEnabled;
        if (btnToggleSound) {
            btnToggleSound.textContent = state.soundEnabled ? '🔊 Ses: Açık' : '🔇 Ses: Kapalı';
        }
        if (!state.soundEnabled && engineGain) {
            try {
                engineGain.gain.setValueAtTime(0, audioCtx.currentTime);
                driftGain.gain.setValueAtTime(0, audioCtx.currentTime);
            } catch (_) {}
        }
    };

    window.toggleFullscreen = function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    // ------------------------------------------------------------------------
    // 3. COLOR & MODE SELECTION
    // ------------------------------------------------------------------------
    const colorDots = document.querySelectorAll('.color-dot');
    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            state.color = dot.getAttribute('data-color');
        });
    });

    window.selectMode = function(m) {
        state.mode = m;
        document.querySelectorAll('.btn-mode').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-mode') === m);
        });

        const diffWrap = document.getElementById('ai-diff-wrapper');
        const roomWrap = document.getElementById('room-code-wrapper');

        if (m === 'ai') {
            diffWrap.style.display = 'flex';
            roomWrap.style.display = 'none';
        } else {
            diffWrap.style.display = 'none';
            roomWrap.style.display = 'flex';
        }
    };

    // ------------------------------------------------------------------------
    // 4. 3D CIRCUIT & TRACK DEFINITION (Continuous Closed Loop with Steel Barrier)
    // ------------------------------------------------------------------------
    const ROAD_WIDTH = 22.0;
    const HALF_ROAD = ROAD_WIDTH / 2.0;
    const BARRIER_HEIGHT = 2.4;
    const CAR_WIDTH = 2.3;
    const MAX_LATERAL = HALF_ROAD - CAR_WIDTH * 0.55; // Maximum lateral offset before hitting steel barrier

    // 18 Grand Prix Waypoints forming a high-speed circuit
    const TRACK_POINTS_3D = [
        new THREE.Vector3(0, 0, 0),         // Start/Finish straight
        new THREE.Vector3(140, 0, -15),
        new THREE.Vector3(290, 0, -10),
        new THREE.Vector3(420, 0, 50),      // Turn 1 fast sweep
        new THREE.Vector3(500, 0, 180),
        new THREE.Vector3(480, 0, 340),     // Hairpin entry
        new THREE.Vector3(380, 0, 440),     // Hairpin apex
        new THREE.Vector3(220, 0, 410),     // Turn 3 sweep
        new THREE.Vector3(120, 0, 500),
        new THREE.Vector3(40, 0, 620),      // S-Chicane 1
        new THREE.Vector3(-70, 0, 590),     // S-Chicane 2
        new THREE.Vector3(-160, 0, 490),
        new THREE.Vector3(-260, 0, 350),    // Back straight
        new THREE.Vector3(-380, 0, 190),
        new THREE.Vector3(-420, 0, 40),     // Left sweeping bend
        new THREE.Vector3(-370, 0, -120),   // Final turn sequence
        new THREE.Vector3(-240, 0, -160),
        new THREE.Vector3(-100, 0, -90)
    ];

    const trackCurve = new THREE.CatmullRomCurve3(TRACK_POINTS_3D, true, 'centripetal');
    const TOTAL_POINTS = 360;
    const curvePoints = trackCurve.getSpacedPoints(TOTAL_POINTS);
    const TRACK_LENGTH = trackCurve.getLength();

    // Cache tangents and normals for ultra-fast lookup
    const curveData = [];
    for (let i = 0; i <= TOTAL_POINTS; i++) {
        const u = i / TOTAL_POINTS;
        const pt = curvePoints[i % TOTAL_POINTS];
        const tangent = trackCurve.getTangent(u).normalize();
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        curveData.push({ u, pt, tangent, normal });
    }

    function getTrackFrameAt(u) {
        let normalizedU = ((u % 1) + 1) % 1;
        const indexFloat = normalizedU * TOTAL_POINTS;
        const idx = Math.floor(indexFloat);
        const frac = indexFloat - idx;
        const d1 = curveData[idx % TOTAL_POINTS];
        const d2 = curveData[(idx + 1) % TOTAL_POINTS];

        const pt = new THREE.Vector3().lerpVectors(d1.pt, d2.pt, frac);
        const tangent = new THREE.Vector3().lerpVectors(d1.tangent, d2.tangent, frac).normalize();
        const normal = new THREE.Vector3().lerpVectors(d1.normal, d2.normal, frac).normalize();

        return { pt, tangent, normal };
    }

    // ------------------------------------------------------------------------
    // 5. THREE.JS 3D SCENE & ENVIRONMENT CREATION
    // ------------------------------------------------------------------------
    const canvas = document.getElementById('race-canvas');
    let renderer, scene, camera;
    let cameraShake = 0;

    function init3D() {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0f18);
        scene.fog = new THREE.FogExp2(0x0a0f18, 0.0016);

        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 1200);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xddeeff, 0.55);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0x00dbff, 0x1a2436, 0.4);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
        dirLight.position.set(200, 300, 150);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 50;
        dirLight.shadow.camera.far = 700;
        const d = 250;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        scene.add(dirLight);

        // Ground Plane (Dark surrounding terrain)
        const groundGeo = new THREE.PlaneGeometry(2400, 2400);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x070b10,
            roughness: 0.95,
            metalness: 0.1
        });
        const groundMesh = new THREE.Mesh(groundGeo, groundMat);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.y = -0.05;
        groundMesh.receiveShadow = true;
        scene.add(groundMesh);

        // Distant Stadium / Cyber City Elements
        buildEnvironment();

        // 3D Race Track with Asphalt, Curbs, and Continuous Solid Steel Barriers
        build3DTrackAndBarriers();
    }

    function buildEnvironment() {
        // Starfield / Cyber Grid Sky Dome
        const skyGeo = new THREE.SphereGeometry(900, 24, 24);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x050811,
            side: THREE.BackSide
        });
        scene.add(new THREE.Mesh(skyGeo, skyMat));

        // Perimeter floodlights along track
        const poleGeo = new THREE.CylinderGeometry(0.35, 0.45, 18, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.8, roughness: 0.3 });
        const lampMat = new THREE.MeshBasicMaterial({ color: 0x00dbff });

        for (let i = 0; i < TRACK_POINTS_3D.length; i += 2) {
            const p = TRACK_POINTS_3D[i];
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(p.x * 1.12, 9, p.z * 1.12);
            pole.castShadow = true;
            scene.add(pole);

            const lamp = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1.2), lampMat);
            lamp.position.set(p.x * 1.12, 18, p.z * 1.12);
            scene.add(lamp);
        }
    }

    // ------------------------------------------------------------------------
    // 6. PROCEDURAL 3D TRACK & SOLID STEEL BARRIER GENERATION ("Demir Sur")
    // ------------------------------------------------------------------------
    function build3DTrackAndBarriers() {
        const SEGMENTS = 360;

        // Geometries for Track Surface, Kerbs, and Steel Barriers
        const roadPositions = [];
        const roadNormals = [];
        const roadUvs = [];

        const leftKerbPositions = [];
        const rightKerbPositions = [];

        // STEEL BARRIERS (Left & Right continuous metallic walls)
        const leftBarrierPositions = [];
        const rightBarrierPositions = [];
        const leftBarrierNormals = [];
        const rightBarrierNormals = [];

        for (let i = 0; i <= SEGMENTS; i++) {
            const u = i / SEGMENTS;
            const frame = getTrackFrameAt(u);
            const pt = frame.pt;
            const norm = frame.normal;

            // Road Edge coordinates
            const leftEdge = new THREE.Vector3().copy(pt).addScaledVector(norm, HALF_ROAD);
            const rightEdge = new THREE.Vector3().copy(pt).addScaledVector(norm, -HALF_ROAD);

            // 1. Asphalt Road Quad Strip
            roadPositions.push(leftEdge.x, 0.02, leftEdge.z);
            roadPositions.push(rightEdge.x, 0.02, rightEdge.z);
            roadNormals.push(0, 1, 0, 0, 1, 0);
            roadUvs.push(0, u * 30, 1, u * 30);

            // 2. Red & White Racing Curbs on Inner & Outer Edges (1.2m width)
            const leftCurbOuter = new THREE.Vector3().copy(leftEdge).addScaledVector(norm, 1.2);
            const rightCurbOuter = new THREE.Vector3().copy(rightEdge).addScaledVector(norm, -1.2);

            leftKerbPositions.push(leftEdge.x, 0.05, leftEdge.z);
            leftKerbPositions.push(leftCurbOuter.x, 0.05, leftCurbOuter.z);

            rightKerbPositions.push(rightEdge.x, 0.05, rightEdge.z);
            rightKerbPositions.push(rightCurbOuter.x, 0.05, rightCurbOuter.z);

            // 3. CONTINUOUS STEEL BARRIER ("Demir Sur"):
            // Left Barrier: Extends upwards from leftCurbOuter with solid metallic wall
            leftBarrierPositions.push(leftCurbOuter.x, 0.0, leftCurbOuter.z);
            leftBarrierPositions.push(leftCurbOuter.x, BARRIER_HEIGHT, leftCurbOuter.z);
            leftBarrierNormals.push(-norm.x, 0, -norm.z, -norm.x, 0, -norm.z);

            // Right Barrier: Extends upwards from rightCurbOuter
            rightBarrierPositions.push(rightCurbOuter.x, 0.0, rightCurbOuter.z);
            rightBarrierPositions.push(rightCurbOuter.x, BARRIER_HEIGHT, rightCurbOuter.z);
            rightBarrierNormals.push(norm.x, 0, norm.z, norm.x, 0, norm.z);
        }

        // Indices generator for triangle strips
        function buildIndices(count) {
            const indices = [];
            for (let i = 0; i < count; i++) {
                const a = i * 2;
                const b = i * 2 + 1;
                const c = (i + 1) * 2;
                const d = (i + 1) * 2 + 1;
                indices.push(a, b, c);
                indices.push(c, b, d);
            }
            return indices;
        }

        const stripIndices = buildIndices(SEGMENTS);

        // Asphalt Mesh
        const roadGeo = new THREE.BufferGeometry();
        roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
        roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
        roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
        roadGeo.setIndex(stripIndices);
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x181c24,
            roughness: 0.85,
            metalness: 0.15
        });
        const roadMesh = new THREE.Mesh(roadGeo, roadMat);
        roadMesh.receiveShadow = true;
        scene.add(roadMesh);

        // Center White Dashed Stripe
        const centerLineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const centerLineMat = new THREE.LineDashedMaterial({
            color: 0xffffff,
            dashSize: 4,
            gapSize: 4,
            linewidth: 2
        });
        const centerLine = new THREE.Line(centerLineGeo, centerLineMat);
        centerLine.computeLineDistances();
        centerLine.position.y = 0.04;
        scene.add(centerLine);

        // Red/White Curbs (Kerbs)
        const curbMat = new THREE.MeshStandardMaterial({
            color: 0xe53935,
            roughness: 0.6,
            metalness: 0.1
        });
        const leftCurbGeo = new THREE.BufferGeometry();
        leftCurbGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftKerbPositions, 3));
        leftCurbGeo.setIndex(stripIndices);
        leftCurbGeo.computeVertexNormals();
        scene.add(new THREE.Mesh(leftCurbGeo, curbMat));

        const rightCurbGeo = new THREE.BufferGeometry();
        rightCurbGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightKerbPositions, 3));
        rightCurbGeo.setIndex(stripIndices);
        rightCurbGeo.computeVertexNormals();
        scene.add(new THREE.Mesh(rightCurbGeo, curbMat));

        // STEEL CRASH BARRIERS ("Demir Sur")
        // Heavy metallic material with high metalness and reflective sheen
        const steelBarrierMat = new THREE.MeshStandardMaterial({
            color: 0x90a4ae,
            roughness: 0.28,
            metalness: 0.85,
            side: THREE.DoubleSide
        });

        const leftBarrierGeo = new THREE.BufferGeometry();
        leftBarrierGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftBarrierPositions, 3));
        leftBarrierGeo.setAttribute('normal', new THREE.Float32BufferAttribute(leftBarrierNormals, 3));
        leftBarrierGeo.setIndex(stripIndices);
        const leftBarrierMesh = new THREE.Mesh(leftBarrierGeo, steelBarrierMat);
        leftBarrierMesh.castShadow = true;
        leftBarrierMesh.receiveShadow = true;
        scene.add(leftBarrierMesh);

        const rightBarrierGeo = new THREE.BufferGeometry();
        rightBarrierGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightBarrierPositions, 3));
        rightBarrierGeo.setAttribute('normal', new THREE.Float32BufferAttribute(rightBarrierNormals, 3));
        rightBarrierGeo.setIndex(stripIndices);
        const rightBarrierMesh = new THREE.Mesh(rightBarrierGeo, steelBarrierMat);
        rightBarrierMesh.castShadow = true;
        rightBarrierMesh.receiveShadow = true;
        scene.add(rightBarrierMesh);

        // Barrier Top Hazard Rail (Yellow/Black Glow Ribbon along the top of the barrier)
        const railMat = new THREE.MeshStandardMaterial({
            color: 0xffd600,
            emissive: 0xffaa00,
            emissiveIntensity: 0.25,
            metalness: 0.9,
            roughness: 0.2
        });
        const leftRailPoints = [];
        const rightRailPoints = [];
        for (let i = 0; i <= SEGMENTS; i++) {
            const u = i / SEGMENTS;
            const frame = getTrackFrameAt(u);
            leftRailPoints.push(new THREE.Vector3().copy(frame.pt).addScaledVector(frame.normal, HALF_ROAD + 1.2).setY(BARRIER_HEIGHT));
            rightRailPoints.push(new THREE.Vector3().copy(frame.pt).addScaledVector(frame.normal, -(HALF_ROAD + 1.2)).setY(BARRIER_HEIGHT));
        }
        const leftRail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftRailPoints), railMat);
        const rightRail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightRailPoints), railMat);
        scene.add(leftRail);
        scene.add(rightRail);

        // Start / Finish Line 3D Overhead Gantry Arch
        buildStartFinishGantry();
    }

    function buildStartFinishGantry() {
        const frame = getTrackFrameAt(0.0);
        const gantryGroup = new THREE.Group();
        gantryGroup.position.copy(frame.pt);
        gantryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), frame.tangent);

        const trussMat = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.8, roughness: 0.3 });
        const bannerMat = new THREE.MeshBasicMaterial({ color: 0x00dbff });

        // Left & Right Support Pillars
        const pillarGeo = new THREE.BoxGeometry(1.2, 10, 1.2);
        const leftPillar = new THREE.Mesh(pillarGeo, trussMat);
        leftPillar.position.set(HALF_ROAD + 1.8, 5, 0);
        leftPillar.castShadow = true;
        gantryGroup.add(leftPillar);

        const rightPillar = new THREE.Mesh(pillarGeo, trussMat);
        rightPillar.position.set(-(HALF_ROAD + 1.8), 5, 0);
        rightPillar.castShadow = true;
        gantryGroup.add(rightPillar);

        // Overhead Cross Beam
        const beamGeo = new THREE.BoxGeometry(ROAD_WIDTH + 6, 1.6, 1.6);
        const beam = new THREE.Mesh(beamGeo, trussMat);
        beam.position.set(0, 10, 0);
        gantryGroup.add(beam);

        // Digital Banner Sign
        const signGeo = new THREE.BoxGeometry(ROAD_WIDTH - 2, 2.2, 0.3);
        const sign = new THREE.Mesh(signGeo, bannerMat);
        sign.position.set(0, 8.5, 0.4);
        gantryGroup.add(sign);

        scene.add(gantryGroup);
    }

    // ------------------------------------------------------------------------
    // 7. 3D CAR MESH GENERATOR
    // ------------------------------------------------------------------------
    function create3DCarMesh(colorHex, isPlayer = false) {
        const carGroup = new THREE.Group();

        const bodyColor = new THREE.Color(colorHex);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.25,
            metalness: 0.75
        });
        const darkTrimMat = new THREE.MeshStandardMaterial({
            color: 0x10141b,
            roughness: 0.5,
            metalness: 0.5
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x111827,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.85
        });

        // 1. Lower Aerodynamic Chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 4.4), bodyMat);
        chassis.position.y = 0.5;
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        carGroup.add(chassis);

        // 2. Front Splitter
        const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.0), darkTrimMat);
        splitter.position.set(0, 0.28, 2.2);
        carGroup.add(splitter);

        // 3. Cabin & Cockpit Roof
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), glassMat);
        cabin.position.set(0, 0.95, -0.2);
        cabin.castShadow = true;
        carGroup.add(cabin);

        // 4. Rear Racing Wing (Spoiler)
        const wingMountLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.2), darkTrimMat);
        wingMountLeft.position.set(0.65, 0.95, -1.9);
        carGroup.add(wingMountLeft);

        const wingMountRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.2), darkTrimMat);
        wingMountRight.position.set(-0.65, 0.95, -1.9);
        carGroup.add(wingMountRight);

        const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.6), bodyMat);
        wingBlade.position.set(0, 1.2, -1.9);
        wingBlade.castShadow = true;
        carGroup.add(wingBlade);

        // 5. Headlights & Taillights
        const headlightGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const hlLeft = new THREE.Mesh(headlightGeo, headlightMat);
        hlLeft.position.set(0.75, 0.55, 2.21);
        carGroup.add(hlLeft);

        const hlRight = new THREE.Mesh(headlightGeo, headlightMat);
        hlRight.position.set(-0.75, 0.55, 2.21);
        carGroup.add(hlRight);

        const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
        const tlLeft = new THREE.Mesh(headlightGeo, taillightMat);
        tlLeft.position.set(0.75, 0.55, -2.21);
        carGroup.add(tlLeft);

        const tlRight = new THREE.Mesh(headlightGeo, taillightMat);
        tlRight.position.set(-0.75, 0.55, -2.21);
        carGroup.add(tlRight);

        // 6. Wheels (4 Rotating Cylinders with Silver Rims)
        const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.8, metalness: 0.2 });

        const wheels = [];
        const wheelOffsets = [
            { x: 1.05, y: 0.42, z: 1.35, isFront: true },   // Front Left
            { x: -1.05, y: 0.42, z: 1.35, isFront: true },  // Front Right
            { x: 1.05, y: 0.42, z: -1.35, isFront: false }, // Rear Left
            { x: -1.05, y: 0.42, z: -1.35, isFront: false } // Rear Right
        ];

        wheelOffsets.forEach(pos => {
            const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
            wheelMesh.position.set(pos.x, pos.y, pos.z);
            wheelMesh.castShadow = true;
            carGroup.add(wheelMesh);
            wheels.push({ mesh: wheelMesh, isFront: pos.isFront });
        });

        // 7. Nitro Flame Exhaust Plumes
        const flameGeo = new THREE.ConeGeometry(0.2, 1.2, 8);
        flameGeo.rotateX(-Math.PI / 2);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
        const nitroFlame = new THREE.Mesh(flameGeo, flameMat);
        nitroFlame.position.set(0, 0.4, -2.7);
        nitroFlame.visible = false;
        carGroup.add(nitroFlame);

        // 8. Underglow Neon (Player & AI)
        const glowGeo = new THREE.PlaneGeometry(2.4, 4.2);
        const glowMat = new THREE.MeshBasicMaterial({
            color: bodyColor,
            transparent: true,
            opacity: 0.35
        });
        const underglow = new THREE.Mesh(glowGeo, glowMat);
        underglow.rotation.x = -Math.PI / 2;
        underglow.position.y = 0.08;
        carGroup.add(underglow);

        scene.add(carGroup);

        return { carGroup, wheels, nitroFlame, taillightMat };
    }

    // ------------------------------------------------------------------------
    // 8. 3D CAR PHYSICS CLASS WITH STEEL BARRIER CLAMP ("Demir Sur")
    // ------------------------------------------------------------------------
    class Car3D {
        constructor(id, name, color, isPlayer = false) {
            this.id = id;
            this.name = name;
            this.color = color;
            this.isPlayer = isPlayer;

            // 3D Visual Mesh
            this.view = create3DCarMesh(color, isPlayer);

            // Track Coordinates
            this.trackU = 0.0; // 0.0 to 1.0
            this.distTraveled = 0.0;
            this.lateralOffset = 0.0; // -HALF_ROAD to +HALF_ROAD (0 is track centerline)
            this.lateralVel = 0.0;

            // Speed & Dynamics (Smooth meters per second)
            this.speed = 0.0;
            this.maxNormalSpeed = 52.0; // ~190 km/h
            this.maxNitroSpeed = 74.0;  // ~265 km/h
            this.accelRate = 34.0;      // m/s²
            this.brakeRate = 48.0;      // m/s²
            this.steerAngle = 0.0;
            this.headingAngle = 0.0;

            // Drift state
            this.isDrifting = false;
            this.driftScore = 0;
            this.driftAngle = 0.0;

            // Nitro
            this.nitro = 100.0;
            this.isNitro = false;

            // Race Laps & Progress
            this.lap = 1;
            this.checkpoint = 0;
            this.finished = false;
            this.finishTime = 0;

            // AI Lane Target & Skill
            this.aiTargetOffset = (Math.random() - 0.5) * (ROAD_WIDTH - 8);
            this.aiSkill = 1.0;
            this.aiLaneChangeTimer = 0;
        }

        reset(u, lateralOffset) {
            this.trackU = u;
            this.distTraveled = u * TRACK_LENGTH;
            this.lateralOffset = lateralOffset;
            this.lateralVel = 0;
            this.speed = 0;
            this.steerAngle = 0;
            this.headingAngle = 0;
            this.driftAngle = 0;
            this.isDrifting = false;
            this.isNitro = false;
            this.nitro = 100.0;
            this.lap = 1;
            this.finished = false;
            this.finishTime = 0;
            this.driftScore = 0;
        }

        update(dt, inputKeys) {
            if (this.finished) {
                this.speed *= 0.96;
            } else if (this.isPlayer) {
                this.updatePlayerControls(dt, inputKeys);
            } else {
                this.updateAIControls(dt);
            }

            // Fixed-timestep integration (No sudden speed spikes!)
            this.distTraveled += this.speed * dt;
            const prevU = this.trackU;
            this.trackU = ((this.distTraveled % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH / TRACK_LENGTH;

            // Lap Counter
            if (prevU > 0.85 && this.trackU < 0.15) {
                this.lap++;
                if (this.isPlayer) {
                    playLapChime();
                    const now = performance.now();
                    const lapDuration = now - state.currentLapStartTime;
                    state.currentLapStartTime = now;
                    if (!state.bestLapTime || lapDuration < state.bestLapTime) {
                        state.bestLapTime = lapDuration;
                    }
                }
                if (this.lap > state.lapsToWin && !this.finished) {
                    this.finished = true;
                    this.finishTime = performance.now() - state.startTime;
                }
            }

            // Lateral Movement (Steering + Drift slide)
            this.lateralOffset += this.lateralVel * dt;

            // ================================================================
            // DEMİR SUR / STEEL BARRIER HARD CLAMP & BOUNCE
            // ================================================================
            if (this.lateralOffset > MAX_LATERAL) {
                // Hit LEFT steel barrier!
                this.lateralOffset = MAX_LATERAL;
                this.lateralVel = -Math.abs(this.lateralVel) * 0.45;
                this.speed *= 0.86; // Controlled impact friction

                if (this.isPlayer) {
                    playCrashSound();
                    cameraShake = 0.4;
                    spawnSparks(this.view.carGroup.position, 12);
                }
            } else if (this.lateralOffset < -MAX_LATERAL) {
                // Hit RIGHT steel barrier!
                this.lateralOffset = -MAX_LATERAL;
                this.lateralVel = Math.abs(this.lateralVel) * 0.45;
                this.speed *= 0.86;

                if (this.isPlayer) {
                    playCrashSound();
                    cameraShake = 0.4;
                    spawnSparks(this.view.carGroup.position, 12);
                }
            }

            // Natural lateral drag to center alignment
            this.lateralVel *= 0.94;

            // Synchronize 3D Mesh Position and Orientation
            this.sync3DTransform(dt);
        }

        updatePlayerControls(dt, keys) {
            const topSpeed = (this.isNitro && this.nitro > 0) ? this.maxNitroSpeed : this.maxNormalSpeed;

            // Throttle & Brake
            if (keys.up) {
                let acc = this.accelRate;
                if (this.isNitro && this.nitro > 0) {
                    acc *= 1.45;
                    this.nitro = Math.max(0, this.nitro - 18 * dt);
                }
                this.speed = Math.min(topSpeed, this.speed + acc * dt);
            } else if (keys.down) {
                this.speed = Math.max(-12, this.speed - this.brakeRate * dt);
            } else {
                // Smooth rolling resistance
                this.speed *= Math.pow(0.988, dt * 60);
                if (Math.abs(this.speed) < 0.2) this.speed = 0;
            }

            // Steering
            const speedRatio = Math.min(1.0, Math.abs(this.speed) / 28.0);
            const steerSensitivity = 16.0 * speedRatio;

            if (keys.left) {
                this.lateralVel += steerSensitivity * dt;
                this.steerAngle = Math.max(-0.45, this.steerAngle - 2.8 * dt);
            } else if (keys.right) {
                this.lateralVel -= steerSensitivity * dt;
                this.steerAngle = Math.min(0.45, this.steerAngle + 2.8 * dt);
            } else {
                this.steerAngle *= Math.pow(0.85, dt * 60);
            }

            // Drift / Handbrake (Space)
            this.isDrifting = keys.handbrake && Math.abs(this.speed) > 18.0;
            if (this.isDrifting) {
                this.speed *= Math.pow(0.985, dt * 60);
                this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, (keys.left ? -0.35 : (keys.right ? 0.35 : 0)), 0.12);
                this.nitro = Math.min(100, this.nitro + 16 * dt); // Refill nitro on drift!
                this.driftScore += Math.floor(Math.abs(this.speed) * 4 * dt);
            } else {
                this.driftAngle *= Math.pow(0.82, dt * 60);
            }

            // Nitro Boost (Shift)
            this.isNitro = keys.nitro && this.nitro > 2 && this.speed > 10;

            // Visual Nitro Flame
            this.view.nitroFlame.visible = this.isNitro;

            // Quick Recovery / Reset Track (R)
            if (keys.reset) {
                this.lateralOffset = 0;
                this.lateralVel = 0;
                this.driftAngle = 0;
                this.speed = Math.min(this.speed, 25);
                keys.reset = false;
            }
        }

        updateAIControls(dt) {
            // AI Difficulty multiplier
            const diffMult = state.difficulty === 'hard' ? 1.05 : (state.difficulty === 'medium' ? 0.94 : 0.82);
            const targetSpd = this.maxNormalSpeed * diffMult;

            // Periodic lane repositioning for organic overtaking
            this.aiLaneChangeTimer -= dt;
            if (this.aiLaneChangeTimer <= 0) {
                this.aiTargetOffset = (Math.random() - 0.5) * (ROAD_WIDTH - 6);
                this.aiLaneChangeTimer = 2.5 + Math.random() * 3.0;
            }

            // Smoothly steer towards target lane
            const offsetDiff = this.aiTargetOffset - this.lateralOffset;
            this.lateralVel += Math.sign(offsetDiff) * Math.min(Math.abs(offsetDiff) * 3.5, 12.0) * dt;

            // AI Acceleration
            if (this.speed < targetSpd) {
                this.speed += this.accelRate * 0.85 * dt;
            } else {
                this.speed *= 0.99;
            }

            // Occasional AI Nitro usage in straightaways
            const isStraight = Math.abs(offsetDiff) < 2.0;
            if (isStraight && Math.random() < 0.015 && this.nitro > 40) {
                this.isNitro = true;
                this.speed = Math.min(this.maxNitroSpeed * diffMult, this.speed + 15 * dt);
                this.nitro -= 25 * dt;
            } else {
                this.isNitro = false;
                this.nitro = Math.min(100, this.nitro + 5 * dt);
            }

            this.view.nitroFlame.visible = this.isNitro;
        }

        sync3DTransform(dt) {
            const frame = getTrackFrameAt(this.trackU);
            const pt = frame.pt;
            const norm = frame.normal;
            const tang = frame.tangent;

            // World 3D Position
            const worldPos = new THREE.Vector3()
                .copy(pt)
                .addScaledVector(norm, this.lateralOffset);
            worldPos.y = 0.0;

            this.view.carGroup.position.copy(worldPos);

            // Car Rotation: aligns along track tangent + steer angle + drift angle
            const forward = new THREE.Vector3().copy(tang);
            forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.steerAngle * 0.45 + this.driftAngle);
            forward.y = 0;
            forward.normalize();

            this.view.carGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);

            // Rotate 4 Wheels
            const wheelSpinSpeed = (this.speed * dt) / 0.42;
            this.view.wheels.forEach(w => {
                w.mesh.rotation.x += wheelSpinSpeed;
                if (w.isFront) {
                    w.mesh.rotation.y = this.steerAngle * 0.8;
                }
            });
        }
    }

    // ------------------------------------------------------------------------
    // 9. CAR ROSTER, SPARK PARTICLES & INPUTS
    // ------------------------------------------------------------------------
    let cars = [];
    let playerCar = null;

    const keys = {
        up: false,
        down: false,
        left: false,
        right: false,
        handbrake: false,
        nitro: false,
        reset: false
    };

    window.addEventListener('keydown', e => {
        initAudio();
        const code = e.code;
        if (code === 'KeyW' || code === 'ArrowUp') keys.up = true;
        if (code === 'KeyS' || code === 'ArrowDown') keys.down = true;
        if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true;
        if (code === 'KeyD' || code === 'ArrowRight') keys.right = true;
        if (code === 'Space') keys.handbrake = true;
        if (code === 'ShiftLeft' || code === 'ShiftRight') keys.nitro = true;
        if (code === 'KeyR') keys.reset = true;
    });

    window.addEventListener('keyup', e => {
        const code = e.code;
        if (code === 'KeyW' || code === 'ArrowUp') keys.up = false;
        if (code === 'KeyS' || code === 'ArrowDown') keys.down = false;
        if (code === 'KeyA' || code === 'ArrowLeft') keys.left = false;
        if (code === 'KeyD' || code === 'ArrowRight') keys.right = false;
        if (code === 'Space') keys.handbrake = false;
        if (code === 'ShiftLeft' || code === 'ShiftRight') keys.nitro = false;
    });

    // Metallic Sparks from Steel Barrier Collisions
    const sparkParticles = [];
    const sparkGeo = new THREE.BufferGeometry();
    const sparkMat = new THREE.PointsMaterial({
        color: 0xffaa00,
        size: 0.6,
        transparent: true,
        opacity: 0.95
    });

    function spawnSparks(pos, count = 10) {
        for (let i = 0; i < count; i++) {
            sparkParticles.push({
                x: pos.x,
                y: pos.y + 0.5 + Math.random() * 0.8,
                z: pos.z,
                vx: (Math.random() - 0.5) * 16,
                vy: 4 + Math.random() * 10,
                vz: (Math.random() - 0.5) * 16,
                life: 0.25 + Math.random() * 0.2
            });
        }
    }

    function updateSparks(dt) {
        for (let i = sparkParticles.length - 1; i >= 0; i--) {
            const p = sparkParticles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vy -= 28 * dt; // gravity
            p.life -= dt;
            if (p.life <= 0) sparkParticles.splice(i, 1);
        }
    }

    function setupRaceCars() {
        // Clear previous meshes
        cars.forEach(c => {
            if (c.view?.carGroup) scene.remove(c.view.carGroup);
        });
        cars = [];

        // 1. Player Car
        playerCar = new Car3D('player', state.username, state.color, true);
        playerCar.reset(0.01, -3.5);
        cars.push(playerCar);

        // 2. AI Competitors
        const aiRoster = [
            { name: 'Phantom_99', color: '#ff2a5f', u: 0.02, offset: 3.5 },
            { name: 'Viper_GT',   color: '#00e676', u: 0.005, offset: -3.5 },
            { name: 'Turbo_Rex',  color: '#ffd700', u: 0.015, offset: 3.5 }
        ];

        aiRoster.forEach(ai => {
            const bot = new Car3D(ai.name, ai.name, ai.color, false);
            bot.reset(ai.u, ai.offset);
            cars.push(bot);
        });
    }

    // ------------------------------------------------------------------------
    // 10. 3D CHASE CAMERA SYSTEM
    // ------------------------------------------------------------------------
    const desiredCamPos = new THREE.Vector3();
    const desiredLookTarget = new THREE.Vector3();

    function updateCamera(dt) {
        if (!playerCar) return;

        const carPos = playerCar.view.carGroup.position;
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerCar.view.carGroup.quaternion);

        // Chase camera positioned behind and above the car
        const followDist = 8.8 + (playerCar.speed / playerCar.maxNitroSpeed) * 3.5;
        const followHeight = 3.6;

        desiredCamPos.copy(carPos)
            .subScaledVector(forward, followDist)
            .add(new THREE.Vector3(0, followHeight, 0));

        // Camera Shake on barrier crash
        if (cameraShake > 0) {
            desiredCamPos.x += (Math.random() - 0.5) * cameraShake * 1.5;
            desiredCamPos.y += (Math.random() - 0.5) * cameraShake * 1.5;
            cameraShake = Math.max(0, cameraShake - dt * 2.5);
        }

        camera.position.lerp(desiredCamPos, Math.min(1.0, 10.0 * dt));

        // Look slightly ahead of the car
        desiredLookTarget.copy(carPos).addScaledVector(forward, 6.0).add(new THREE.Vector3(0, 1.2, 0));
        camera.lookAt(desiredLookTarget);

        // Dynamic FOV kicking back during Nitro
        const targetFov = playerCar.isNitro ? 78 : 65;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 8.0 * dt);
        camera.updateProjectionMatrix();
    }

    // ------------------------------------------------------------------------
    // 11. 2D MINIMAP & HUD UPDATER
    // ------------------------------------------------------------------------
    const minimapCanvas = document.getElementById('minimap-canvas');
    const miniCtx = minimapCanvas?.getContext('2d');

    const hudSpeed = document.getElementById('hud-speed');
    const hudNitroBar = document.getElementById('hud-nitro-bar');
    const hudLap = document.getElementById('hud-lap');
    const hudPos = document.getElementById('hud-pos');
    const hudCurrentTime = document.getElementById('hud-current-time');
    const hudBestTime = document.getElementById('hud-best-time');
    const driftNotice = document.getElementById('hud-drift-notice');

    function formatTime(ms) {
        if (!ms || ms <= 0) return '00:00.0';
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const tenths = Math.floor((ms % 1000) / 100);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
    }

    function updateHUD() {
        if (!playerCar) return;

        // Speedometer (km/h)
        const kmh = Math.round(playerCar.speed * 3.6);
        if (hudSpeed) hudSpeed.textContent = kmh;

        // Nitro Bar
        if (hudNitroBar) hudNitroBar.style.width = `${Math.max(0, Math.min(100, playerCar.nitro))}%`;

        // Lap Tracker
        if (hudLap) hudLap.textContent = `${Math.min(playerCar.lap, state.lapsToWin)}/${state.lapsToWin}`;

        // Timers
        if (hudCurrentTime && state.startTime > 0) {
            const curLap = performance.now() - state.currentLapStartTime;
            hudCurrentTime.textContent = formatTime(curLap);
        }
        if (hudBestTime) {
            hudBestTime.textContent = state.bestLapTime ? formatTime(state.bestLapTime) : '--:--.-';
        }

        // Leaderboard Ranking
        const sortedCars = [...cars].sort((a, b) => (b.lap * 1000 + b.trackU * 1000) - (a.lap * 1000 + a.trackU * 1000));
        const rank = sortedCars.findIndex(c => c.id === 'player') + 1;
        if (hudPos) hudPos.textContent = rank;

        // Drift Notice
        if (driftNotice) {
            if (playerCar.isDrifting && playerCar.driftScore > 30) {
                driftNotice.textContent = `🔥 +${playerCar.driftScore} DRIFT!`;
                driftNotice.classList.add('show');
            } else {
                driftNotice.classList.remove('show');
            }
        }

        // 2D Radar Minimap
        drawMinimap();
    }

    function drawMinimap() {
        if (!miniCtx || !minimapCanvas) return;
        miniCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

        // Center track on minimap
        const mw = minimapCanvas.width;
        const mh = minimapCanvas.height;
        const scale = 0.14;
        const cx = mw / 2 + 10;
        const cz = mh / 2 - 15;

        // Draw Asphalt Path
        miniCtx.strokeStyle = 'rgba(0, 219, 255, 0.45)';
        miniCtx.lineWidth = 4;
        miniCtx.beginPath();
        for (let i = 0; i < curvePoints.length; i++) {
            const p = curvePoints[i];
            const mx = cx + p.x * scale;
            const my = cz + p.z * scale;
            if (i === 0) miniCtx.moveTo(mx, my);
            else miniCtx.lineTo(mx, my);
        }
        miniCtx.closePath();
        miniCtx.stroke();

        // Draw Cars on Minimap
        cars.forEach(c => {
            const pos = c.view.carGroup.position;
            const mx = cx + pos.x * scale;
            const my = cz + pos.z * scale;

            miniCtx.fillStyle = c.color;
            miniCtx.beginPath();
            miniCtx.arc(mx, my, c.isPlayer ? 5 : 3.5, 0, Math.PI * 2);
            miniCtx.fill();

            if (c.isPlayer) {
                miniCtx.strokeStyle = '#ffffff';
                miniCtx.lineWidth = 1.5;
                miniCtx.stroke();
            }
        });
    }

    // ------------------------------------------------------------------------
    // 12. COUNTDOWN & RACE START
    // ------------------------------------------------------------------------
    function runCountdown(onComplete) {
        state.inCountdown = true;
        const cdOverlay = document.getElementById('hud-countdown');
        const cdText = document.getElementById('countdown-text');
        cdOverlay.style.display = 'flex';

        let count = 3;
        cdText.textContent = count;
        playBeep(880, 0.2);

        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                cdText.textContent = count;
                playBeep(880, 0.2);
            } else if (count === 0) {
                cdText.textContent = 'GAZLA! 🏁';
                cdText.style.color = '#00e676';
                playBeep(1760, 0.5);
                state.inCountdown = false;
                state.startTime = performance.now();
                state.currentLapStartTime = state.startTime;
            } else {
                clearInterval(timer);
                cdOverlay.style.display = 'none';
                cdText.style.color = '#fff';
                if (onComplete) onComplete();
            }
        }, 1000);
    }

    window.startSelectedGame = function() {
        initAudio();
        const lapSelect = document.getElementById('select-laps');
        const diffSelect = document.getElementById('select-diff');
        if (lapSelect) state.lapsToWin = parseInt(lapSelect.value, 10);
        if (diffSelect) state.difficulty = diffSelect.value;

        // Switch to game screen
        screenMenu.classList.remove('active');
        screenLobby.classList.remove('active');
        screenPodium.classList.remove('active');
        screenGame.classList.add('active');

        // Init 3D if not already initialized
        if (!renderer) {
            init3D();
        } else {
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        setupRaceCars();
        state.gameRunning = true;
        lastTime = performance.now();

        runCountdown(() => {
            // Racing in progress!
        });

        requestAnimationFrame(gameLoop);
    };

    function showPodium() {
        state.gameRunning = false;
        screenGame.classList.remove('active');
        screenPodium.classList.add('active');
        playVictoryFanfare();

        const listEl = document.getElementById('podium-list');
        listEl.innerHTML = '';

        const rankedCars = [...cars].sort((a, b) => {
            if (a.finished && b.finished) return a.finishTime - b.finishTime;
            if (a.finished) return -1;
            if (b.finished) return 1;
            return b.lap - a.lap;
        });

        rankedCars.forEach((c, idx) => {
            const row = document.createElement('div');
            row.className = 'podium-row' + (idx === 0 ? ' first' : '');
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏎️';
            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <span class="podium-rank">${medal} #${idx + 1}</span>
                    <span class="podium-name" style="color:${c.color};">${c.isPlayer ? '👑 ' : ''}${c.name}</span>
                </div>
                <div class="podium-time">${c.finished ? formatTime(c.finishTime) : 'DNF'}</div>
            `;
            listEl.appendChild(row);
        });
    }

    window.restartRace = function() {
        startSelectedGame();
    };

    window.returnToMenu = function() {
        state.gameRunning = false;
        screenPodium.classList.remove('active');
        screenGame.classList.remove('active');
        screenMenu.classList.add('active');
    };

    // ------------------------------------------------------------------------
    // 13. MAIN 3D GAME LOOP
    // ------------------------------------------------------------------------
    let lastTime = performance.now();

    function gameLoop(now) {
        if (!state.gameRunning) return;
        requestAnimationFrame(gameLoop);

        // Fixed capped delta time to prevent any speed surges
        const dt = Math.min((now - lastTime) / 1000, 0.033);
        lastTime = now;

        if (!state.inCountdown) {
            // Update all racers
            cars.forEach(c => c.update(dt, keys));

            // Sound modulation
            const speedRatio = Math.abs(playerCar.speed) / playerCar.maxNitroSpeed;
            updateEngineSound(speedRatio, playerCar.isDrifting, playerCar.isNitro);

            // Check if player finished
            if (playerCar.finished) {
                setTimeout(showPodium, 1500);
            }
        }

        // Camera Follow
        updateCamera(dt);

        // Sparks
        updateSparks(dt);

        // Render 3D Scene
        renderer.render(scene, camera);

        // Update 2D Minimap & HUD
        updateHUD();
    }

    // Window Resize
    window.addEventListener('resize', () => {
        if (renderer && camera) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    });

})();
