// ============================================================================
// GEOMETRY NEON DASH - geometrydash.js
// High-Speed Rhythm Runner with Procedural EDM Music & Cyber Neon Aesthetics
// ============================================================================

(function () {
    'use strict';

    // --- DOM Elements ---
    const canvas = document.getElementById('gd-canvas');
    const ctx = canvas.getContext('2d');
    const progressFill = document.getElementById('gd-progress-fill');
    const percentText = document.getElementById('gd-percent-text');
    const attemptCountEl = document.getElementById('attempt-count');
    const levelSelect = document.getElementById('level-select');
    const btnToggleMusic = document.getElementById('btn-toggle-music');
    const musicLabel = document.getElementById('music-label');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const startOverlay = document.getElementById('start-overlay');
    const btnPlayGame = document.getElementById('btn-play-game');
    const victoryOverlay = document.getElementById('gd-victory-overlay');
    const victoryStats = document.getElementById('victory-stats');
    const btnNextLevel = document.getElementById('btn-next-level');
    const btnReplayLevel = document.getElementById('btn-replay-level');
    const skinsRow = document.getElementById('skins-row');

    // --- Audio Context & Synth ---
    let audioCtx = null;
    let isMusicPlaying = false;
    let isMuted = false;
    let musicInterval = null;
    let beatStep = 0;

    const BPM = 132;
    const STEP_TIME = (60 / BPM) / 4; // 16th note in seconds (~113ms)

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // Procedural Drum Synthesis
    function synthKick(time) {
        if (!audioCtx || isMuted) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.15);
    }

    function synthSnare(time) {
        if (!audioCtx || isMuted) return;
        // White noise burst
        const bufferSize = audioCtx.sampleRate * 0.1;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 800;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(time);
    }

    function synthHiHat(time) {
        if (!audioCtx || isMuted) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(8000, time);
        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.04);
    }

    // Melodic Synth Note
    function synthLead(freq, time, dur = 0.1) {
        if (!audioCtx || isMuted || freq <= 0) return;
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, time);
        filter.frequency.exponentialRampToValueAtTime(600, time + dur);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(time);
        osc.stop(time + dur);
    }

    // Bassline Note
    function synthBass(freq, time, dur = 0.14) {
        if (!audioCtx || isMuted || freq <= 0) return;
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, time);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(time);
        osc.stop(time + dur);
    }

    // EDM Melodic Scale: A Minor Pentatonic (A, C, D, E, G)
    const BASS_PITCHES = [110, 110, 130.81, 146.83, 164.81, 196, 110, 130.81]; // A2, C3, D3, E3, G3
    const LEAD_PITCHES = [
        440, 523.25, 587.33, 659.25, 783.99, 880, 783.99, 659.25,
        587.33, 659.25, 523.25, 440, 523.25, 587.33, 659.25, 880
    ];

    function scheduleBeat() {
        if (!audioCtx || !isMusicPlaying) return;
        const now = audioCtx.currentTime;

        // 4-on-the-floor Kick
        if (beatStep % 4 === 0) {
            synthKick(now);
        }

        // Snare on beats 4 and 12
        if (beatStep % 8 === 4) {
            synthSnare(now);
        }

        // 16th Hi-Hats
        if (beatStep % 2 === 1) {
            synthHiHat(now);
        }

        // Rolling 16th Synth Bass
        const bassNote = BASS_PITCHES[Math.floor(beatStep / 4) % BASS_PITCHES.length];
        synthBass(bassNote, now, STEP_TIME * 0.9);

        // Synth Lead Arpeggio
        if (beatStep % 2 === 0) {
            const leadNote = LEAD_PITCHES[(beatStep / 2) % LEAD_PITCHES.length];
            synthLead(leadNote, now, STEP_TIME * 0.9);
        }

        beatStep = (beatStep + 1) % 64;
    }

    const bgmAudio = document.getElementById('gd-bgm');

    function startMusic() {
        initAudio();
        if (bgmAudio) {
            bgmAudio.muted = isMuted;
            bgmAudio.currentTime = 0;
            bgmAudio.play().catch(() => {});
        }
        isMusicPlaying = true;
    }

    function stopMusic() {
        isMusicPlaying = false;
        if (bgmAudio) {
            bgmAudio.pause();
        }
    }

    // Jump & Crash SFX
    function sfxJump() {
        if (!audioCtx || isMuted) return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.frequency.setValueAtTime(380, now);
            osc.frequency.exponentialRampToValueAtTime(760, now + 0.08);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch(e) {}
    }

    function sfxOrb() {
        if (!audioCtx || isMuted) return;
        try {
            const now = audioCtx.currentTime;
            synthLead(880, now, 0.15);
            synthLead(1046.5, now + 0.05, 0.15);
        } catch(e) {}
    }

    function sfxCrash() {
        if (!audioCtx || isMuted) return;
        try {
            const now = audioCtx.currentTime;
            // Heavy explosion boom
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch(e) {}
    }

    // ========================================================================
    // 🕹️ GAME STATE & PHYSICS
    // ========================================================================
    const GRAVITY = 0.85;
    const JUMP_FORCE = -12.5;
    let selectedSkin = 'neon_cube';
    let currentLevel = 1;
    let attempts = 1;
    let isPlaying = false;
    let isDead = false;
    let hasWon = false;
    let gameLoopId = null;

    try {
        attempts = parseInt(localStorage.getItem('gd_attempts') || '1', 10);
        if (isNaN(attempts)) attempts = 1;
    } catch(e) {}

    const player = {
        x: 100,
        y: 350,
        size: 38,
        vy: 0,
        rotation: 0,
        isGrounded: false,
        gravitySign: 1, // 1 for normal, -1 for inverted
        mode: 'cube', // 'cube' or 'ship'
        trail: []
    };

    let levelLength = 6000;
    let blocks = [];
    let spikes = [];
    let jumpPads = [];
    let jumpOrbs = [];
    let portals = [];
    let particles = [];
    let pulseGlow = 0;

    // Skin Buttons
    skinsRow.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-skin');
        if (btn) {
            document.querySelectorAll('.btn-skin').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedSkin = btn.dataset.skin || 'neon_cube';
        }
    });

    levelSelect.addEventListener('change', () => {
        currentLevel = parseInt(levelSelect.value, 10);
        resetLevel();
    });

    btnToggleMusic.addEventListener('click', () => {
        isMuted = !isMuted;
        musicLabel.textContent = isMuted ? "Müzik: KAPALI" : "Müzik: AÇIK";
        if (bgmAudio) bgmAudio.muted = isMuted;
    });

    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    });

    btnPlayGame.addEventListener('click', () => {
        startGame();
    });

    btnNextLevel.addEventListener('click', () => {
        victoryOverlay.classList.add('hidden');
        currentLevel = currentLevel < 3 ? currentLevel + 1 : 1;
        levelSelect.value = currentLevel.toString();
        resetLevel();
        startGame();
    });

    btnReplayLevel.addEventListener('click', () => {
        victoryOverlay.classList.add('hidden');
        resetLevel();
        startGame();
    });

    // ========================================================================
    // 🗺️ LEVEL GENERATOR
    // ========================================================================
    function generateLevel(lvl) {
        blocks = [];
        spikes = [];
        jumpPads = [];
        jumpOrbs = [];
        portals = [];
        particles = [];

        const groundY = 380;
        levelLength = 6500;

        // Ground Platform base
        blocks.push({ x: -100, y: groundY, w: levelLength + 500, h: 200, type: 'ground' });

        if (lvl === 1) {
            // Level 1: "Neon Overdrive" - Friendly pacing, rhythmic jumps
            const obstacles = [
                { type: 'spike', x: 600 },
                { type: 'spike', x: 850 },
                { type: 'block', x: 1100, y: groundY - 40, w: 40, h: 40 },
                { type: 'spike', x: 1140 },
                { type: 'block', x: 1400, y: groundY - 40, w: 80, h: 40 },
                { type: 'spike', x: 1550 },
                { type: 'spike', x: 1590 }, // Double spike
                { type: 'pad_yellow', x: 1800, y: groundY - 10 },
                { type: 'block', x: 1950, y: groundY - 120, w: 120, h: 30 },
                { type: 'spike', x: 2250 },
                { type: 'orb_yellow', x: 2450, y: groundY - 70 },
                { type: 'spike', x: 2450 }, // Spike underneath orb!
                { type: 'block', x: 2700, y: groundY - 50, w: 100, h: 50 },
                { type: 'spike', x: 2950 },
                { type: 'spike', x: 3000 },
                { type: 'pad_yellow', x: 3300, y: groundY - 10 },
                { type: 'block', x: 3450, y: groundY - 140, w: 150, h: 30 },
                { type: 'orb_yellow', x: 3800, y: groundY - 70 },
                { type: 'spike', x: 4100 },
                { type: 'spike', x: 4140 },
                { type: 'spike', x: 4180 }, // Triple spike!
                { type: 'pad_yellow', x: 4400, y: groundY - 10 },
                { type: 'block', x: 4550, y: groundY - 100, w: 200, h: 30 },
                { type: 'spike', x: 4900 },
                { type: 'orb_yellow', x: 5200, y: groundY - 80 },
                { type: 'block', x: 5400, y: groundY - 50, w: 120, h: 50 }
            ];
            loadObstacles(obstacles, groundY);
        } else if (lvl === 2) {
            // Level 2: "Cyber Rave" - Faster, multi-orbs, aerial staircases
            levelLength = 7500;
            const obstacles = [
                { type: 'spike', x: 500 },
                { type: 'spike', x: 750 }, { type: 'spike', x: 790 },
                { type: 'orb_yellow', x: 1050, y: groundY - 80 },
                { type: 'spike', x: 1050 },
                { type: 'orb_yellow', x: 1300, y: groundY - 100 },
                { type: 'spike', x: 1300 },
                { type: 'pad_yellow', x: 1550, y: groundY - 10 },
                { type: 'block', x: 1700, y: groundY - 140, w: 100, h: 30 },
                { type: 'spike', x: 1730, y: groundY - 170 }, // Spike on top of block!
                { type: 'block', x: 2000, y: groundY - 60, w: 80, h: 60 },
                { type: 'block', x: 2150, y: groundY - 120, w: 80, h: 120 },
                { type: 'spike', x: 2400 }, { type: 'spike', x: 2440 }, { type: 'spike', x: 2480 },
                { type: 'orb_yellow', x: 2750, y: groundY - 90 },
                { type: 'orb_yellow', x: 2950, y: groundY - 90 },
                { type: 'pad_yellow', x: 3300, y: groundY - 10 },
                { type: 'block', x: 3450, y: groundY - 160, w: 180, h: 30 },
                { type: 'spike', x: 3800 }, { type: 'spike', x: 3840 },
                { type: 'pad_yellow', x: 4200, y: groundY - 10 },
                { type: 'block', x: 4350, y: groundY - 120, w: 100, h: 30 },
                { type: 'orb_yellow', x: 4650, y: groundY - 100 },
                { type: 'spike', x: 4950 }, { type: 'spike', x: 4990 }, { type: 'spike', x: 5030 },
                { type: 'pad_yellow', x: 5400, y: groundY - 10 },
                { type: 'block', x: 5550, y: groundY - 140, w: 150, h: 30 }
            ];
            loadObstacles(obstacles, groundY);
        } else {
            // Level 3: "Electro Madness" - Fast and intense
            levelLength = 8500;
            const obstacles = [
                { type: 'spike', x: 400 },
                { type: 'spike', x: 600 }, { type: 'spike', x: 640 },
                { type: 'orb_yellow', x: 900, y: groundY - 80 },
                { type: 'orb_yellow', x: 1100, y: groundY - 120 },
                { type: 'block', x: 1350, y: groundY - 80, w: 80, h: 80 },
                { type: 'spike', x: 1550 }, { type: 'spike', x: 1590 }, { type: 'spike', x: 1630 },
                { type: 'pad_yellow', x: 1850, y: groundY - 10 },
                { type: 'block', x: 2000, y: groundY - 180, w: 200, h: 30 },
                { type: 'spike', x: 2060, y: groundY - 210 },
                { type: 'orb_yellow', x: 2400, y: groundY - 100 },
                { type: 'spike', x: 2650 }, { type: 'spike', x: 2690 },
                { type: 'pad_yellow', x: 2950, y: groundY - 10 },
                { type: 'orb_yellow', x: 3250, y: groundY - 120 },
                { type: 'block', x: 3500, y: groundY - 70, w: 120, h: 70 },
                { type: 'spike', x: 3800 }, { type: 'spike', x: 3840 }, { type: 'spike', x: 3880 },
                { type: 'pad_yellow', x: 4200, y: groundY - 10 },
                { type: 'block', x: 4350, y: groundY - 150, w: 160, h: 30 },
                { type: 'orb_yellow', x: 4700, y: groundY - 100 },
                { type: 'orb_yellow', x: 4950, y: groundY - 100 },
                { type: 'spike', x: 5200 }, { type: 'spike', x: 5240 },
                { type: 'pad_yellow', x: 5600, y: groundY - 10 },
                { type: 'block', x: 5750, y: groundY - 100, w: 220, h: 30 }
            ];
            loadObstacles(obstacles, groundY);
        }
    }

    function loadObstacles(obsList, groundY) {
        for (const o of obsList) {
            if (o.type === 'spike') {
                spikes.push({
                    x: o.x,
                    y: o.y !== undefined ? o.y : groundY - 36,
                    w: 36,
                    h: 36
                });
            } else if (o.type === 'block') {
                blocks.push({
                    x: o.x,
                    y: o.y,
                    w: o.w,
                    h: o.h,
                    type: 'block'
                });
            } else if (o.type === 'pad_yellow') {
                jumpPads.push({
                    x: o.x,
                    y: o.y,
                    w: 42,
                    h: 12,
                    color: '#ffe600',
                    power: -16
                });
            } else if (o.type === 'orb_yellow') {
                jumpOrbs.push({
                    x: o.x,
                    y: o.y,
                    radius: 18,
                    color: '#ffe600',
                    power: -13.5,
                    active: true
                });
            }
        }
    }

    function resetLevel() {
        generateLevel(currentLevel);
        player.x = 100;
        player.y = 340;
        player.vy = 0;
        player.rotation = 0;
        player.isGrounded = true;
        player.trail = [];
        isDead = false;
        hasWon = false;
        particles = [];
        progressFill.style.width = '0%';
        percentText.textContent = '0%';
        attemptCountEl.textContent = attempts.toString();
        if (isPlaying && bgmAudio) {
            bgmAudio.currentTime = 0;
            bgmAudio.play().catch(() => {});
        }
    }

    function startGame() {
        startOverlay.classList.add('hidden');
        victoryOverlay.classList.add('hidden');
        isPlaying = true;
        startMusic();
    }

    function triggerCrash() {
        if (isDead) return;
        isDead = true;
        sfxCrash();
        if (bgmAudio) {
            bgmAudio.pause();
        }
        attempts++;
        try { localStorage.setItem('gd_attempts', attempts.toString()); } catch(e){}
        attemptCountEl.textContent = attempts.toString();

        // Spawn bright neon explosion particles
        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 9 + 3;
            particles.push({
                x: player.x + player.size / 2,
                y: player.y + player.size / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 6 + 3,
                color: ['#00f0ff', '#ff007f', '#ffe600', '#ffffff', '#00ff66'][Math.floor(Math.random() * 5)],
                alpha: 1,
                decay: 0.035
            });
        }

        // Restart quickly (Geometry Dash style instant respawn)
        setTimeout(() => {
            resetLevel();
            isDead = false;
        }, 550);
    }

    function triggerVictory() {
        if (hasWon) return;
        hasWon = true;
        isPlaying = false;
        stopMusic();
        victoryStats.textContent = `Muazzam refleksler! Seviye %100 tamamlandı. (${attempts} Deneme)`;
        victoryOverlay.classList.remove('hidden');
    }

    // ========================================================================
    // 🕹️ INPUT & JUMP HANDLING
    // ========================================================================
    let jumpKeyPressed = false;

    function handleJump() {
        if (!isPlaying || isDead || hasWon) {
            if (!isPlaying && !hasWon) startGame();
            return;
        }

        // Check if inside any Jump Orb first
        let usedOrb = false;
        for (const orb of jumpOrbs) {
            const dist = Math.hypot((player.x + player.size / 2) - orb.x, (player.y + player.size / 2) - orb.y);
            if (dist < orb.radius + 30) {
                player.vy = orb.power;
                player.isGrounded = false;
                sfxOrb();
                usedOrb = true;
                // Ring pulse effect
                for (let i = 0; i < 12; i++) {
                    particles.push({
                        x: orb.x, y: orb.y,
                        vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                        size: 4, color: orb.color, alpha: 1, decay: 0.05
                    });
                }
                break;
            }
        }

        if (!usedOrb && player.isGrounded) {
            player.vy = JUMP_FORCE;
            player.isGrounded = false;
            sfxJump();
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            e.preventDefault();
            if (!jumpKeyPressed) {
                jumpKeyPressed = true;
                handleJump();
            }
        } else if (e.code === 'KeyR') {
            resetLevel();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            jumpKeyPressed = false;
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        handleJump();
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleJump();
    }, { passive: false });

    // ========================================================================
    // 🔄 PHYSICS & COLLISION UPDATE
    // ========================================================================
    function update() {
        if (!isPlaying || isDead || hasWon) {
            updateParticles();
            return;
        }

        // Continuous jump if space key held down (GD auto-jump on landing)
        if (jumpKeyPressed && player.isGrounded) {
            player.vy = JUMP_FORCE;
            player.isGrounded = false;
            sfxJump();
        }

        // Forward speed
        const SPEED = 7.5;
        player.x += SPEED;

        // Apply Gravity
        player.vy += GRAVITY;
        if (player.vy > 14) player.vy = 14;
        player.y += player.vy;

        // Rotation: Rotate 90 degrees while in the air, snap to nearest 90 on ground
        if (!player.isGrounded) {
            player.rotation += 8.5;
        } else {
            // Snap to nearest 90
            player.rotation = Math.round(player.rotation / 90) * 90;
        }

        // Add Trail
        player.trail.unshift({ x: player.x, y: player.y, rot: player.rotation });
        if (player.trail.length > 8) player.trail.pop();

        // Platform Collisions
        player.isGrounded = false;
        const px = player.x;
        const py = player.y;
        const ps = player.size;

        for (const b of blocks) {
            if (px + ps > b.x && px < b.x + b.w && py + ps > b.y && py < b.y + b.h) {
                // If it's ground, it's ALWAYS safe landing on top!
                if (b.type === 'ground') {
                    player.y = b.y - ps;
                    player.vy = 0;
                    player.isGrounded = true;
                    continue;
                }
                // Check if landing on top of block
                const prevY = py - player.vy;
                if ((prevY + ps <= b.y + 16 || py + ps - b.y <= 16) && player.vy >= 0) {
                    player.y = b.y - ps;
                    player.vy = 0;
                    player.isGrounded = true;
                } else if (px + ps - b.x <= SPEED + 8 && py + ps > b.y + 8) {
                    // Crashed into side of block!
                    triggerCrash();
                    return;
                } else if (py < b.y + b.h && py + ps > b.y) {
                    // Hit underside or stuck
                    triggerCrash();
                    return;
                }
            }
        }

        // Jump Pad Collisions
        for (const pad of jumpPads) {
            if (px + ps > pad.x && px < pad.x + pad.w && py + ps >= pad.y && py <= pad.y + pad.h + 10) {
                player.vy = pad.power;
                player.isGrounded = false;
                sfxJump();
            }
        }

        // Spike Collisions (Fair geometry hitbox)
        for (const sp of spikes) {
            const marginX = 7;
            const marginTop = 6;
            if (px + ps - marginX > sp.x && px + marginX < sp.x + sp.w &&
                py + ps > sp.y + marginTop && py + 4 < sp.y + sp.h) {
                triggerCrash();
                return;
            }
        }

        // Progress Calculation & High Score Persistence
        const progress = Math.min(100, Math.max(0, Math.floor((player.x / levelLength) * 100)));
        progressFill.style.width = `${progress}%`;
        const best = parseInt(localStorage.getItem('gd_best_level_' + currentLevel) || '0', 10);
        if (progress > best) {
            localStorage.setItem('gd_best_level_' + currentLevel, progress.toString());
        }
        const currentBest = Math.max(progress, best);
        percentText.textContent = `${progress}% (Rekor: %${currentBest})`;

        // Victory Check
        if (player.x >= levelLength) {
            localStorage.setItem('gd_best_level_' + currentLevel, '100');
            triggerVictory();
        }

        // Update Particles
        updateParticles();
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            if (p.alpha <= 0) particles.splice(i, 1);
        }
    }

    // ========================================================================
    // 🎨 RENDER ENGINE (Cyber Neon Visuals)
    // ========================================================================
    function draw() {
        pulseGlow = (pulseGlow + 0.05) % (Math.PI * 2);

        // Dark Synth Background
        ctx.fillStyle = '#080710';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Cyber Grid Floor & Background Pulse Lines
        const camX = player.x - 160;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 1;
        const gridOffset = camX % 40;
        for (let x = -gridOffset; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        ctx.restore();

        // World translation
        ctx.save();
        ctx.translate(-Math.floor(camX), 0);

        // --- Draw Ground & Platforms ---
        for (const b of blocks) {
            // Neon Block Fill & Border
            ctx.fillStyle = b.type === 'ground' ? '#0d0d1e' : '#15142b';
            ctx.fillRect(b.x, b.y, b.w, b.h);

            // Glowing Neon Border
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            // Ground Top Glow Strip
            if (b.type === 'ground') {
                ctx.fillStyle = '#00f0ff';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 10;
                ctx.fillRect(b.x, b.y, b.w, 3);
                ctx.shadowBlur = 0;
            }
        }

        // --- Draw Jump Pads ---
        for (const pad of jumpPads) {
            ctx.fillStyle = pad.color;
            ctx.shadowColor = pad.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.roundRect(pad.x, pad.y, pad.w, pad.h, 6);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // --- Draw Jump Orbs ---
        for (const orb of jumpOrbs) {
            ctx.strokeStyle = orb.color;
            ctx.lineWidth = 3;
            ctx.shadowColor = orb.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner Pulsing Core
            const coreRad = orb.radius * 0.5 + Math.sin(pulseGlow * 2) * 2;
            ctx.fillStyle = orb.color;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, coreRad, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // --- Draw Spikes ---
        for (const sp of spikes) {
            ctx.fillStyle = '#ff007f';
            ctx.shadowColor = '#ff007f';
            ctx.shadowBlur = 12;

            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y + sp.h);
            ctx.lineTo(sp.x + sp.w / 2, sp.y);
            ctx.lineTo(sp.x + sp.w, sp.y + sp.h);
            ctx.closePath();
            ctx.fill();

            // Inner dark core for depth
            ctx.fillStyle = '#660033';
            ctx.beginPath();
            ctx.moveTo(sp.x + 6, sp.y + sp.h - 2);
            ctx.lineTo(sp.x + sp.w / 2, sp.y + 8);
            ctx.lineTo(sp.x + sp.w - 6, sp.y + sp.h - 2);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // --- Draw Player Trail ---
        for (let i = 0; i < player.trail.length; i++) {
            const t = player.trail[i];
            const alpha = 1 - (i / player.trail.length);
            ctx.save();
            ctx.translate(t.x + player.size / 2, t.y + player.size / 2);
            ctx.rotate((t.rot * Math.PI) / 180);
            ctx.fillStyle = `rgba(0, 240, 255, ${alpha * 0.35})`;
            ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);
            ctx.restore();
        }

        // --- Draw Player Cube ---
        if (!isDead) {
            drawPlayerCube();
        }

        // --- Draw Particles ---
        for (const p of particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            ctx.restore();
        }

        ctx.restore();
    }

    function drawPlayerCube() {
        ctx.save();
        ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
        ctx.rotate((player.rotation * Math.PI) / 180);

        const s = player.size;
        const half = s / 2;

        if (selectedSkin === 'cyber_demon') {
            ctx.fillStyle = '#ff007f';
            ctx.fillRect(-half, -half, s, s);
            ctx.strokeStyle = '#ffe600';
            ctx.lineWidth = 3;
            ctx.strokeRect(-half, -half, s, s);
            // Horns / Eyes
            ctx.fillStyle = '#ffe600';
            ctx.fillRect(-half + 6, -half + 8, 8, 8);
            ctx.fillRect(half - 14, -half + 8, 8, 8);
            ctx.fillRect(-6, 2, 12, 6);
        } else if (selectedSkin === 'golden_star') {
            ctx.fillStyle = '#ffe600';
            ctx.fillRect(-half, -half, s, s);
            ctx.strokeStyle = '#ff9100';
            ctx.lineWidth = 3;
            ctx.strokeRect(-half, -half, s, s);
            ctx.fillStyle = '#000';
            ctx.fillRect(-half + 8, -half + 10, 6, 6);
            ctx.fillRect(half - 14, -half + 10, 6, 6);
            ctx.fillRect(-8, 4, 16, 4);
        } else if (selectedSkin === 'glitch_robot') {
            ctx.fillStyle = '#00ff66';
            ctx.fillRect(-half, -half, s, s);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeRect(-half, -half, s, s);
            ctx.fillStyle = '#000';
            ctx.fillRect(-half + 6, -half + 8, 10, 5);
            ctx.fillRect(half - 16, -half + 8, 10, 5);
            ctx.fillRect(-10, 4, 20, 4);
        } else {
            // Default Neon Cube
            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(-half, -half, s, s);
            ctx.strokeStyle = '#ffe600';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 12;
            ctx.strokeRect(-half, -half, s, s);
            ctx.shadowBlur = 0;

            // Expressive Glowing Cube Eyes
            ctx.fillStyle = '#080710';
            ctx.fillRect(-half + 7, -half + 9, 8, 8);
            ctx.fillRect(half - 15, -half + 9, 8, 8);
            // Pupil glow
            ctx.fillStyle = '#ffe600';
            ctx.fillRect(-half + 9, -half + 11, 4, 4);
            ctx.fillRect(half - 13, -half + 11, 4, 4);
            // Smile
            ctx.fillStyle = '#080710';
            ctx.fillRect(-8, 4, 16, 5);
        }

        ctx.restore();
    }

    // ========================================================================
    // 🚀 INITIALIZATION & RESIZE
    // ========================================================================
    function resizeCanvas() {
        const container = document.getElementById('gd-container');
        if (container) {
            canvas.width = container.clientWidth || 960;
            canvas.height = container.clientHeight || 540;
        }
    }

    window.addEventListener('resize', resizeCanvas);

    function mainLoop() {
        update();
        draw();
        gameLoopId = requestAnimationFrame(mainLoop);
    }

    resizeCanvas();
    resetLevel();
    gameLoopId = requestAnimationFrame(mainLoop);

})();
