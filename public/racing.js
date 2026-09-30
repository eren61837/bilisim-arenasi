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
    const BARRIER_HEIGHT = 3.6;
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
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        renderer.shadowMap.enabled = false;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0f18);
        scene.fog = new THREE.FogExp2(0x0a0f18, 0.0016);

        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 1200);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xddeeff, 0.65);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0x00dbff, 0x1a2436, 0.5);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
        dirLight.position.set(200, 300, 150);
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
        // 1. Deep Cyber Night Sky Dome
        const skyGeo = new THREE.SphereGeometry(950, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x070c18,
            side: THREE.BackSide
        });
        scene.add(new THREE.Mesh(skyGeo, skyMat));

        // 2. Stars Particle Field
        const starsGeo = new THREE.BufferGeometry();
        const starPositions = [];
        for (let i = 0; i < 900; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 0.9);
            const r = 920;
            starPositions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.cos(phi),
                r * Math.sin(phi) * Math.sin(theta)
            );
        }
        starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0.85 });
        scene.add(new THREE.Points(starsGeo, starsMat));

        // 3. Glowing Neon Moon
        const moonGeo = new THREE.SphereGeometry(32, 16, 16);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xfff3d0 });
        const moon = new THREE.Mesh(moonGeo, moonMat);
        moon.position.set(-350, 360, -500);
        scene.add(moon);

        // 4. Procedural Cyber City Skyscrapers (75+ buildings around perimeter)
        const windowColors = [0x00e5ff, 0xffd600, 0xff007f, 0x00ff88, 0xff6d00];
        const bldgMat = new THREE.MeshStandardMaterial({
            color: 0x111827,
            roughness: 0.7,
            metalness: 0.3
        });

        const cityClusters = [
            { cx: 300, cz: -180, count: 18, radius: 160 },
            { cx: 580, cz: 250, count: 18, radius: 180 },
            { cx: 200, cz: 600, count: 16, radius: 160 },
            { cx: -320, cz: 480, count: 16, radius: 160 },
            { cx: -520, cz: -80, count: 20, radius: 200 }
        ];

        cityClusters.forEach(cluster => {
            for (let i = 0; i < cluster.count; i++) {
                const angle = (i / cluster.count) * Math.PI * 2 + Math.random() * 0.3;
                const dist = cluster.radius * (0.6 + Math.random() * 0.7);
                const bx = cluster.cx + Math.cos(angle) * dist;
                const bz = cluster.cz + Math.sin(angle) * dist;

                const bw = 18 + Math.random() * 22;
                const bd = 18 + Math.random() * 22;
                const bh = 50 + Math.random() * 110;

                const bldgMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bldgMat);
                bldgMesh.position.set(bx, bh / 2, bz);
                scene.add(bldgMesh);

                // Single Neon Facade Accent Band
                const winColor = windowColors[i % windowColors.length];
                const winMat = new THREE.MeshBasicMaterial({ color: winColor });
                const stripGeo = new THREE.BoxGeometry(bw + 0.4, 2.4, bd + 0.4);
                const stripMesh = new THREE.Mesh(stripGeo, winMat);
                stripMesh.position.set(bx, bh * 0.65, bz);
                scene.add(stripMesh);

                // Rooftop Red Aviation Beacon
                const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
                beacon.position.set(bx, bh + 1.5, bz);
                scene.add(beacon);
            }
        });

        // 5. Trackside Palm Trees with Illuminated Foliage
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x00e676, roughness: 0.4, emissive: 0x00a843, emissiveIntensity: 0.18 });

        for (let i = 0; i < TOTAL_POINTS; i += 12) {
            const frame = getTrackFrameAt(i / TOTAL_POINTS);
            [-1, 1].forEach(side => {
                const treePos = new THREE.Vector3().copy(frame.pt).addScaledVector(frame.normal, side * (HALF_ROAD + 8 + Math.random() * 6));
                const treeGroup = new THREE.Group();
                treeGroup.position.set(treePos.x, 0, treePos.z);

                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 9, 7), trunkMat);
                trunk.position.y = 4.5;
                trunk.rotation.z = (Math.random() - 0.5) * 0.15;
                treeGroup.add(trunk);

                for (let k = 0; k < 6; k++) {
                    const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5.5, 4), leafMat);
                    leaf.position.set(0, 9, 0);
                    leaf.rotation.x = Math.PI / 3;
                    leaf.rotation.y = (k / 6) * Math.PI * 2;
                    treeGroup.add(leaf);
                }
                scene.add(treeGroup);
            });
        }

        // 6. Modern Arching Highway Streetlights with Light Cones
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.85, roughness: 0.25 });
        const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
        const poleGeo = new THREE.CylinderGeometry(0.3, 0.4, 14, 8);

        for (let i = 0; i < TOTAL_POINTS; i += 8) {
            const frame = getTrackFrameAt(i / TOTAL_POINTS);
            const polePos = new THREE.Vector3().copy(frame.pt).addScaledVector(frame.normal, HALF_ROAD + 3.8);
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(polePos.x, 7, polePos.z);
            scene.add(pole);

            const arm = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 0.4), poleMat);
            arm.position.set(polePos.x - frame.normal.x * 1.8, 14, polePos.z - frame.normal.z * 1.8);
            arm.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), frame.normal.clone().negate());
            scene.add(arm);

            const lantern = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.9), lanternMat);
            lantern.position.set(polePos.x - frame.normal.x * 3.2, 13.7, polePos.z - frame.normal.z * 3.2);
            scene.add(lantern);
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

        // Vertical Steel Support Posts with LED Beacons along both barriers ("Demir Sur")
        const postGeo = new THREE.CylinderGeometry(0.35, 0.35, BARRIER_HEIGHT + 0.6, 8);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.9, roughness: 0.2 });
        const leftBeaconMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
        const rightBeaconMat = new THREE.MeshBasicMaterial({ color: 0xff3d00 });
        const beaconGeo = new THREE.SphereGeometry(0.28, 8, 8);

        for (let i = 0; i <= SEGMENTS; i += 6) {
            const u = i / SEGMENTS;
            const frame = getTrackFrameAt(u);
            const pt = frame.pt;
            const norm = frame.normal;

            // Left Post & Beacon
            const leftPostPos = new THREE.Vector3().copy(pt).addScaledVector(norm, HALF_ROAD + 1.25);
            leftPostPos.y = (BARRIER_HEIGHT + 0.6) / 2;
            const lp = new THREE.Mesh(postGeo, postMat);
            lp.position.copy(leftPostPos);
            scene.add(lp);

            const lb = new THREE.Mesh(beaconGeo, leftBeaconMat);
            lb.position.set(leftPostPos.x, BARRIER_HEIGHT + 0.6, leftPostPos.z);
            scene.add(lb);

            // Right Post & Beacon
            const rightPostPos = new THREE.Vector3().copy(pt).addScaledVector(norm, -(HALF_ROAD + 1.25));
            rightPostPos.y = (BARRIER_HEIGHT + 0.6) / 2;
            const rp = new THREE.Mesh(postGeo, postMat);
            rp.position.copy(rightPostPos);
            scene.add(rp);

            const rb = new THREE.Mesh(beaconGeo, rightBeaconMat);
            rb.position.set(rightPostPos.x, BARRIER_HEIGHT + 0.6, rightPostPos.z);
            scene.add(rb);
        }

        // Start / Finish Line 3D Overhead Gantry Arch
        buildStartFinishGantry();
    }

    function buildStartFinishGantry() {
        const gantryConfigs = [
            { u: 0.0, color: 0x00e5ff, title: "🏁 START / FINISH - BİLİŞİM GP 🏁" },
            { u: 0.25, color: 0xff007f, title: "⚡ NEED FOR SPEED: UNDERGROUND ⚡" },
            { u: 0.55, color: 0x00ff88, title: "🚀 EXTREME NITRO ZONE 🚀" },
            { u: 0.82, color: 0xffd600, title: "🔥 DRIFT APEX - 300 KM/H 🔥" }
        ];

        const trussMat = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.85, roughness: 0.25 });

        gantryConfigs.forEach(cfg => {
            const frame = getTrackFrameAt(cfg.u);
            const gantryGroup = new THREE.Group();
            gantryGroup.position.copy(frame.pt);
            gantryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), frame.tangent);

            // Left & Right Support Pillars
            const pillarGeo = new THREE.BoxGeometry(1.4, 11, 1.4);
            const leftPillar = new THREE.Mesh(pillarGeo, trussMat);
            leftPillar.position.set(HALF_ROAD + 2.2, 5.5, 0);
            leftPillar.castShadow = true;
            gantryGroup.add(leftPillar);

            const rightPillar = new THREE.Mesh(pillarGeo, trussMat);
            rightPillar.position.set(-(HALF_ROAD + 2.2), 5.5, 0);
            rightPillar.castShadow = true;
            gantryGroup.add(rightPillar);

            // Overhead Cross Beam
            const beamGeo = new THREE.BoxGeometry(ROAD_WIDTH + 8, 1.8, 1.8);
            const beam = new THREE.Mesh(beamGeo, trussMat);
            beam.position.set(0, 10.5, 0);
            gantryGroup.add(beam);

            // Glowing Neon Banner Sign
            const bannerMat = new THREE.MeshBasicMaterial({ color: cfg.color });
            const sign = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH, 2.4, 0.4), bannerMat);
            sign.position.set(0, 9.2, 0.5);
            gantryGroup.add(sign);

            // Strobe Lights on top of gantry
            const strobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            for (let s = -4; s <= 4; s += 2) {
                const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), strobeMat);
                strobe.position.set(s * 2.5, 11.6, 0.5);
                gantryGroup.add(strobe);
            }

            scene.add(gantryGroup);
        });

        // 3D Stadium Grandstands with Tiered Bleachers along the home straight
        const grandstandUs = [0.02, 0.06, 0.94];
        const standMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6, metalness: 0.4 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x00dbff, roughness: 0.3, metalness: 0.8 });
        const crowdColors = [0xff0055, 0x00e5ff, 0xffd600, 0x00e676, 0xffffff];

        grandstandUs.forEach(u => {
            const frame = getTrackFrameAt(u);
            const standPos = new THREE.Vector3().copy(frame.pt).addScaledVector(frame.normal, -(HALF_ROAD + 14));
            const standGroup = new THREE.Group();
            standGroup.position.set(standPos.x, 0, standPos.z);
            standGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), frame.tangent);

            for (let t = 0; t < 5; t++) {
                const tier = new THREE.Mesh(new THREE.BoxGeometry(36, 1.6 * (t + 1), 3.0), standMat);
                tier.position.set(0, (1.6 * (t + 1)) / 2, -(t * 2.8));
                tier.castShadow = true;
                standGroup.add(tier);

                const crowd = new THREE.Mesh(new THREE.BoxGeometry(34, 0.8, 1.4), new THREE.MeshBasicMaterial({ color: crowdColors[t % crowdColors.length] }));
                crowd.position.set(0, 1.6 * (t + 1) + 0.4, -(t * 2.8));
                standGroup.add(crowd);
            }

            const roof = new THREE.Mesh(new THREE.BoxGeometry(38, 0.8, 16), roofMat);
            roof.position.set(0, 14, -5);
            standGroup.add(roof);

            scene.add(standGroup);
        });
    }

    // ------------------------------------------------------------------------
    // 7. 3D CAR MESH GENERATOR
    // ------------------------------------------------------------------------
    function create3DCarMesh(colorHex, isPlayer = false) {
        const carGroup = new THREE.Group();

        const bodyColor = new THREE.Color(colorHex);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.18,
            metalness: 0.85
        });
        const carbonMat = new THREE.MeshStandardMaterial({
            color: 0x0c0f14,
            roughness: 0.35,
            metalness: 0.65
        });
        const darkTrimMat = new THREE.MeshStandardMaterial({
            color: 0x10141b,
            roughness: 0.4,
            metalness: 0.5
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x050a12,
            roughness: 0.05,
            metalness: 0.95,
            transparent: true,
            opacity: 0.88
        });

        // 1. Aerodynamic Wedge Chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.45, 4.3), bodyMat);
        chassis.position.y = 0.48;
        chassis.castShadow = true;
        chassis.receiveShadow = true;
        carGroup.add(chassis);

        // 2. Slanted Sports Hood
        const hoodGeo = new THREE.BoxGeometry(2.0, 0.22, 1.8);
        const hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.position.set(0, 0.62, 1.1);
        hood.rotation.x = 0.08;
        hood.castShadow = true;
        carGroup.add(hood);

        // Hood Dual Carbon Air Scoops
        [-0.45, 0.45].forEach(hx => {
            const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.6), carbonMat);
            scoop.position.set(hx, 0.74, 0.9);
            carGroup.add(scoop);
        });

        // 3. Front Bumper, Grille & Carbon Splitter with Canards
        const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.8), bodyMat);
        frontBumper.position.set(0, 0.4, 2.15);
        frontBumper.castShadow = true;
        carGroup.add(frontBumper);

        const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.1), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        grille.position.set(0, 0.36, 2.56);
        carGroup.add(grille);

        const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 1.1), carbonMat);
        splitter.position.set(0, 0.22, 2.2);
        carGroup.add(splitter);

        // Front Aero Canards
        [-1.15, 1.15].forEach(cx => {
            const canard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.5), carbonMat);
            canard.position.set(cx, 0.32, 2.3);
            canard.rotation.y = (cx > 0 ? -1 : 1) * 0.35;
            carGroup.add(canard);
        });

        // 4. Sleek Fastback Cockpit with Tinted Glass & Driver Silhouette
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.55, 2.1), glassMat);
        cabin.position.set(0, 0.92, -0.25);
        cabin.castShadow = true;
        carGroup.add(cabin);

        // Driver Helmet Silhouette inside Cockpit
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffd600, metalness: 0.6 }));
        helmet.position.set(0.32, 0.94, -0.2);
        carGroup.add(helmet);

        // 5. Side Skirts with Carbon Winglets
        [-1.08, 1.08].forEach(sx => {
            const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 2.4), carbonMat);
            skirt.position.set(sx, 0.25, 0);
            carGroup.add(skirt);
        });

        // 6. High-Downforce GT Carbon Wing (Rear Spoiler)
        const wingMountLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.25), carbonMat);
        wingMountLeft.position.set(0.68, 0.98, -1.92);
        carGroup.add(wingMountLeft);

        const wingMountRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.25), carbonMat);
        wingMountRight.position.set(-0.68, 0.98, -1.92);
        carGroup.add(wingMountRight);

        const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.65), carbonMat);
        wingBlade.position.set(0, 1.25, -1.95);
        wingBlade.rotation.x = -0.06;
        wingBlade.castShadow = true;
        carGroup.add(wingBlade);

        // Wing Endplates
        [-1.22, 1.22].forEach(ex => {
            const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.8), bodyMat);
            endplate.position.set(ex, 1.25, -1.95);
            carGroup.add(endplate);
        });

        // 7. Projector Xenon Headlights & LED Light Strip
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-0.78, 0.78].forEach(hx => {
            const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.15), headlightMat);
            hl.position.set(hx, 0.52, 2.48);
            carGroup.add(hl);
        });

        // Full-Width LED Taillight Bar
        const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
        const tlBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.12), taillightMat);
        tlBar.position.set(0, 0.64, -2.16);
        carGroup.add(tlBar);

        // 8. Aggressive Rear Diffuser & Twin Chrome Exhausts
        const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 0.6), carbonMat);
        diffuser.position.set(0, 0.26, -2.05);
        carGroup.add(diffuser);

        const exhaustGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 8);
        exhaustGeo.rotateX(Math.PI / 2);
        const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, metalness: 0.95, roughness: 0.1 });

        [-0.45, 0.45].forEach(exX => {
            const pipe = new THREE.Mesh(exhaustGeo, exhaustMat);
            pipe.position.set(exX, 0.35, -2.25);
            carGroup.add(pipe);
        });

        // 9. Wheels with Tires, Silver Rims, Discs & Red Brake Calipers
        const tireGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.38, 18);
        tireGeo.rotateZ(Math.PI / 2);
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9, metalness: 0.1 });

        const rimGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.39, 10);
        rimGeo.rotateZ(Math.PI / 2);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xe0e6ed, metalness: 0.9, roughness: 0.15 });

        const discGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.08, 12);
        discGeo.rotateZ(Math.PI / 2);
        const discMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.95, roughness: 0.2 });

        const caliperGeo = new THREE.BoxGeometry(0.12, 0.18, 0.12);
        const caliperMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });

        const wheels = [];
        const wheelOffsets = [
            { x: 1.08, y: 0.44, z: 1.35, isFront: true },
            { x: -1.08, y: 0.44, z: 1.35, isFront: true },
            { x: 1.08, y: 0.44, z: -1.35, isFront: false },
            { x: -1.08, y: 0.44, z: -1.35, isFront: false }
        ];

        wheelOffsets.forEach(pos => {
            const wheelAnchor = new THREE.Group();
            wheelAnchor.position.set(pos.x, pos.y, pos.z);

            const tire = new THREE.Mesh(tireGeo, tireMat);
            tire.castShadow = true;
            wheelAnchor.add(tire);

            const rim = new THREE.Mesh(rimGeo, rimMat);
            wheelAnchor.add(rim);

            const disc = new THREE.Mesh(discGeo, discMat);
            wheelAnchor.add(disc);

            const caliper = new THREE.Mesh(caliperGeo, caliperMat);
            caliper.position.set(0, 0.18, 0.08);
            wheelAnchor.add(caliper);

            carGroup.add(wheelAnchor);
            wheels.push({ mesh: wheelAnchor, isFront: pos.isFront });
        });

        // 10. Dual Nitro Fire Jet Plumes (Outer cyan + Inner core)
        const flameGroup = new THREE.Group();
        flameGroup.position.set(0, 0.35, -2.4);

        [-0.45, 0.45].forEach(fx => {
            const outerGeo = new THREE.ConeGeometry(0.24, 1.6, 8);
            outerGeo.rotateX(-Math.PI / 2);
            const outerMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
            const outerFlame = new THREE.Mesh(outerGeo, outerMat);
            outerFlame.position.set(fx, 0, -0.8);
            flameGroup.add(outerFlame);

            const innerGeo = new THREE.ConeGeometry(0.12, 1.2, 8);
            innerGeo.rotateX(-Math.PI / 2);
            const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const innerFlame = new THREE.Mesh(innerGeo, innerMat);
            innerFlame.position.set(fx, 0, -0.6);
            flameGroup.add(innerFlame);
        });

        flameGroup.visible = false;
        carGroup.add(flameGroup);

        // 11. Ground Contact Shadow & Underglow Neon
        const shadowGeo = new THREE.PlaneGeometry(2.7, 4.8);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.85 });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.rotation.x = -Math.PI / 2;
        shadowMesh.position.y = 0.04;
        carGroup.add(shadowMesh);

        const glowGeo = new THREE.PlaneGeometry(3.0, 5.0);
        const glowMat = new THREE.MeshBasicMaterial({
            color: bodyColor,
            transparent: true,
            opacity: 0.45
        });
        const underglow = new THREE.Mesh(glowGeo, glowMat);
        underglow.rotation.x = -Math.PI / 2;
        underglow.position.y = 0.06;
        carGroup.add(underglow);

        // 12. Floating 3D Overhead Indicator Arrow (🔻)
        const markerGroup = new THREE.Group();
        markerGroup.position.set(0, 2.1, 0);
        const arrowGeo = new THREE.ConeGeometry(0.35, 0.65, 4);
        arrowGeo.rotateX(Math.PI); // Points downward at roof
        const arrowMat = new THREE.MeshBasicMaterial({ color: isPlayer ? 0x00e5ff : bodyColor });
        const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
        markerGroup.add(arrowMesh);
        carGroup.add(markerGroup);

        // 13. Forward Headlight Illumination Cones
        [-0.75, 0.75].forEach(hx => {
            const beamGeo = new THREE.CylinderGeometry(0.1, 1.4, 12, 8, 1, true);
            beamGeo.rotateX(Math.PI / 2);
            beamGeo.translate(0, 0, 6.0);
            const beamMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.12,
                depthWrite: false
            });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.set(hx, 0.45, 2.2);
            carGroup.add(beam);
        });

        scene.add(carGroup);

        return { carGroup, wheels, nitroFlame: flameGroup, taillightMat, markerGroup };
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
            // 1. Process Nitro Request FIRST (works from 0 km/h, at any speed!)
            const nitroPressed = (keys.nitro || keys.screenNitro || keys.keyN) && this.nitro > 0.5;
            this.isNitro = nitroPressed;

            const topSpeed = this.isNitro ? this.maxNitroSpeed : this.maxNormalSpeed;

            // 2. Throttle, Brake & Active Rocket Boost
            if (this.isNitro) {
                // Active rocket boost surges forward even without holding W!
                const nitroBurst = this.accelRate * 1.9 + 28.0;
                this.speed = Math.min(topSpeed, this.speed + nitroBurst * dt);
                this.nitro = Math.max(0, this.nitro - 22.0 * dt);

                // Flash and pulse nitro button
                const nitroBtn = document.getElementById('btn-screen-nitro');
                if (nitroBtn) nitroBtn.classList.add('active-nitro');
            } else {
                const nitroBtn = document.getElementById('btn-screen-nitro');
                if (nitroBtn) nitroBtn.classList.remove('active-nitro');

                if (keys.up) {
                    this.speed = Math.min(topSpeed, this.speed + this.accelRate * dt);
                } else if (keys.down) {
                    this.speed = Math.max(-14, this.speed - this.brakeRate * dt);
                } else {
                    // Smooth rolling resistance
                    this.speed *= Math.pow(0.988, dt * 60);
                    if (Math.abs(this.speed) < 0.2) this.speed = 0;
                }

                // Slowly recharge nitro when cruising
                this.nitro = Math.min(100, this.nitro + 7.5 * dt);
            }

            // 3. Progressive Steering
            const speedRatio = Math.min(1.0, Math.abs(this.speed) / 26.0);
            const steerSensitivity = 16.5 * speedRatio;

            if (keys.left) {
                this.lateralVel += steerSensitivity * dt;
                this.steerAngle = Math.max(-0.45, this.steerAngle - 3.2 * dt);
            } else if (keys.right) {
                this.lateralVel -= steerSensitivity * dt;
                this.steerAngle = Math.min(0.45, this.steerAngle + 3.2 * dt);
            } else {
                this.steerAngle *= Math.pow(0.82, dt * 60);
            }

            // 4. Drift / Handbrake (Space)
            this.isDrifting = keys.handbrake && Math.abs(this.speed) > 16.0;
            if (this.isDrifting) {
                this.speed *= Math.pow(0.986, dt * 60);
                this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, (keys.left ? -0.38 : (keys.right ? 0.38 : 0)), 0.14);
                this.nitro = Math.min(100, this.nitro + 22.0 * dt); // Big nitro recharge on drift!
                this.driftScore += Math.floor(Math.abs(this.speed) * 5 * dt);
            } else {
                this.driftAngle *= Math.pow(0.80, dt * 60);
            }

            // 5. Visual Nitro Flame: Dynamic Pulsing Scale & Light
            if (this.view.nitroFlame) {
                this.view.nitroFlame.visible = this.isNitro;
                if (this.isNitro) {
                    const flicker = 1.0 + Math.random() * 0.4;
                    this.view.nitroFlame.scale.set(flicker, 1.4 + Math.random() * 0.8, flicker);
                }
            }

            // 6. Quick Recovery / Reset Track (R)
            if (keys.reset) {
                this.lateralOffset = 0;
                this.lateralVel = 0;
                this.driftAngle = 0;
                this.speed = Math.max(15, Math.min(this.speed, 25));
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
        screenNitro: false,
        reset: false
    };

    window.addEventListener('keydown', e => {
        initAudio();
        const code = e.code;
        const key = e.key ? e.key.toLowerCase() : '';
        if (code === 'KeyW' || code === 'ArrowUp' || key === 'w') keys.up = true;
        if (code === 'KeyS' || code === 'ArrowDown' || key === 's') keys.down = true;
        if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') keys.left = true;
        if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') keys.right = true;
        if (code === 'Space') keys.handbrake = true;
        if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift' || code === 'KeyN' || key === 'n' || code === 'KeyE' || key === 'e' || code === 'KeyF' || key === 'f') {
            keys.nitro = true;
        }
        if (code === 'KeyC' || key === 'c') {
            toggleCameraMode();
        }
        if (code === 'KeyR' || key === 'r') keys.reset = true;
    });

    window.addEventListener('keyup', e => {
        const code = e.code;
        const key = e.key ? e.key.toLowerCase() : '';
        if (code === 'KeyW' || code === 'ArrowUp' || key === 'w') keys.up = false;
        if (code === 'KeyS' || code === 'ArrowDown' || key === 's') keys.down = false;
        if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') keys.left = false;
        if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') keys.right = false;
        if (code === 'Space') keys.handbrake = false;
        if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift' || code === 'KeyN' || key === 'n' || code === 'KeyE' || key === 'e' || code === 'KeyF' || key === 'f') {
            keys.nitro = false;
        }
    });

    // Touch & Mouse Interactive Nitro Buttons
    function setupNitroControls() {
        const btn = document.getElementById('btn-screen-nitro');
        const gauge = document.getElementById('hud-gauge-clickable');

        function startNitro(e) {
            if (e) e.preventDefault();
            initAudio();
            keys.screenNitro = true;
        }

        function endNitro(e) {
            if (e) e.preventDefault();
            keys.screenNitro = false;
        }

        if (btn) {
            btn.addEventListener('pointerdown', startNitro);
            btn.addEventListener('pointerup', endNitro);
            btn.addEventListener('pointercancel', endNitro);
            btn.addEventListener('pointerleave', endNitro);
        }
        if (gauge) {
            gauge.addEventListener('pointerdown', startNitro);
            gauge.addEventListener('pointerup', endNitro);
            gauge.addEventListener('pointercancel', endNitro);
            gauge.addEventListener('pointerleave', endNitro);
        }
    }
    setupNitroControls();

    // Camera Mode System: 3rd-Person NFS Chase vs 1st-Person Hood/Cockpit
    function toggleCameraMode() {
        state.cameraMode = ((state.cameraMode || 0) + 1) % 2;
        updateCameraUI();
    }

    function updateCameraUI() {
        const btn = document.getElementById('btn-screen-camera');
        const txt = document.getElementById('hud-cam-mode-txt');
        const is1st = (state.cameraMode === 1);
        if (txt) {
            txt.textContent = is1st ? '1. ŞAHIS (KAPUT)' : '3. ŞAHIS (NFS)';
        }
        if (btn) {
            btn.classList.toggle('mode-1st', is1st);
        }
        showCameraNotice(is1st ? '🎥 1. ŞAHIS GÖRÜNÜM (Kaput / Kokpit)' : '🎥 3. ŞAHIS GÖRÜNÜM (Need for Speed Takip)');
    }

    function showCameraNotice(msg) {
        const notice = document.getElementById('hud-drift-notice');
        if (!notice) return;
        notice.textContent = msg;
        notice.classList.add('visible');
        clearTimeout(notice._camNoticeTimeout);
        notice._camNoticeTimeout = setTimeout(() => {
            notice.classList.remove('visible');
        }, 1800);
    }

    function setupCameraControls() {
        const camBtn = document.getElementById('btn-screen-camera');
        if (camBtn) {
            camBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                initAudio();
                toggleCameraMode();
            });
            camBtn.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
                initAudio();
                toggleCameraMode();
            });
        }
    }
    setupCameraControls();

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

        if (state.cameraMode === 1) {
            // Hood / Bumper 1st-Person Immersive Camera
            desiredCamPos.copy(carPos)
                .addScaledVector(forward, 1.8)
                .add(new THREE.Vector3(0, 1.25, 0));
            desiredLookTarget.copy(carPos)
                .addScaledVector(forward, 25.0)
                .add(new THREE.Vector3(0, 0.9, 0));
            camera.up.set(0, 1, 0);
        } else {
            // Authentic Need for Speed 3rd-Person Chase Camera
            // Follow distance and height tuned specifically to frame the sports car prominently
            const speedRatio = Math.min(1.0, Math.abs(playerCar.speed) / playerCar.maxNitroSpeed);
            const followDist = 7.4 + speedRatio * 1.8;
            const followHeight = 2.9 + (playerCar.isNitro ? -0.2 : 0);

            desiredCamPos.copy(carPos)
                .subScaledVector(forward, followDist)
                .add(new THREE.Vector3(0, followHeight, 0));

            // Aim look target directly at the car's body and slightly forward
            desiredLookTarget.copy(carPos)
                .addScaledVector(forward, 2.0)
                .add(new THREE.Vector3(0, 0.9, 0));

            // Need for Speed signature dynamic camera banking / roll into drifts & turns!
            const bankAngle = -(playerCar.driftAngle * 0.4 + (playerCar.steerAngle || 0) * 0.15);
            camera.up.set(Math.sin(bankAngle), Math.cos(bankAngle), 0);
        }

        // Camera Shake on barrier crash or extreme nitro
        if (cameraShake > 0) {
            desiredCamPos.x += (Math.random() - 0.5) * cameraShake * 1.5;
            desiredCamPos.y += (Math.random() - 0.5) * cameraShake * 1.5;
            cameraShake = Math.max(0, cameraShake - dt * 2.5);
        } else if (playerCar.isNitro) {
            desiredCamPos.x += (Math.random() - 0.5) * 0.12;
            desiredCamPos.y += (Math.random() - 0.5) * 0.12;
        }

        camera.position.lerp(desiredCamPos, Math.min(1.0, 14.0 * dt));
        camera.lookAt(desiredLookTarget);

        // Dynamic FOV kicking back during Nitro for extreme speed sensation!
        const targetFov = playerCar.isNitro ? 84 : (state.cameraMode === 1 ? 75 : 66);
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 9.0 * dt);
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
        if (playerCar) {
            updateCamera(0.016);
            camera.position.copy(desiredCamPos);
            camera.lookAt(desiredLookTarget);
        }
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
