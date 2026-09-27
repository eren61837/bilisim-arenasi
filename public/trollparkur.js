// ============================================================================
// MEME TROLL PARKUR (Trololo Edition) - trollparkur.js
// Ultra-Troll Physics, Hilarious Traps, Meme Effects & Web Audio Trololo Song
// ============================================================================

(function () {
    'use strict';

    // --- DOM Elements ---
    const canvas = document.getElementById('troll-canvas');
    const ctx = canvas.getContext('2d');
    const deathCountEl = document.getElementById('death-count');
    const trollRankEl = document.getElementById('troll-rank');
    const stageNumEl = document.getElementById('stage-num');
    const memePopup = document.getElementById('meme-popup');
    const memeFace = document.getElementById('meme-face');
    const memeText = document.getElementById('meme-text');
    const memeSub = document.getElementById('meme-sub');
    const winBanner = document.getElementById('win-banner');
    const winDesc = document.getElementById('win-desc');
    const btnNextStage = document.getElementById('btn-next-stage');
    const btnToggleTrololo = document.getElementById('btn-toggle-trololo');
    const bgmLabel = document.getElementById('bgm-label');
    const btnRestartStage = document.getElementById('btn-restart-stage');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    // --- State ---
    let deathCount = 0;
    try {
        deathCount = parseInt(localStorage.getItem('troll_deaths') || '0', 10);
        if (isNaN(deathCount)) deathCount = 0;
    } catch(e) {}

    let currentStage = 1;
    const TOTAL_STAGES = 5;
    let cameraX = 0;
    let cameraY = 0;
    let gameLoopId = null;
    let isGameOver = false;
    let isStageCleared = false;
    let trollfaceImg = null;

    // Rank titles based on death count
    const RANKS = [
        { deaths: 0, title: "Masum Çaylak 🍼" },
        { deaths: 3, title: "Trolle Yeni Isınan 🙂" },
        { deaths: 8, title: "Bir Şeyler Ters Gidiyor 🤨" },
        { deaths: 15, title: "Klavye Yumruklayan 😡" },
        { deaths: 25, title: "Duygusal Hasarlı 😭" },
        { deaths: 40, title: "Akıl Sağlığını Yitirmiş 🤪" },
        { deaths: 60, title: "Meme Çocuğu 🤡" },
        { deaths: 100, title: "ÖLÜMSÜZ TROLL KURBANI 💀" },
        { deaths: 200, title: "GİGATROLL GURBETÇİSİ 🗿" }
    ];

    function updateRank() {
        deathCountEl.textContent = deathCount;
        let rank = RANKS[0].title;
        for (const r of RANKS) {
            if (deathCount >= r.deaths) rank = r.title;
        }
        trollRankEl.textContent = rank;
        stageNumEl.textContent = `${currentStage} / ${TOTAL_STAGES}`;
        try { localStorage.setItem('troll_deaths', deathCount.toString()); } catch(e){}
    }

    // ========================================================================
    // 🎵 WEB AUDIO: TROLOLO SONG (Eduard Khil Vocalise) SYNTHESIZER
    // ========================================================================
    let audioCtx = null;
    let isTrololoPlaying = false;
    let trololoTimeout = null;
    let isAudioMuted = false;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // Note frequencies in Hz
    const NOTES = {
        'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
        'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
        'C6': 1046.50, 'REST': 0
    };

    // The iconic Trololo Melody sequence: Note and duration in 16th steps (step = 135ms)
    // "Trolololo, lo-lo-lo-lo-lo, trololololo, ha-ha-ha-ha-ha, trololololo..."
    const TROLOLO_MELODY = [
        // Intro / Chorus Hook
        { n: 'G4', d: 2 }, { n: 'C5', d: 2 }, { n: 'E5', d: 2 }, { n: 'G5', d: 4 },
        { n: 'F5', d: 2 }, { n: 'E5', d: 2 }, { n: 'D5', d: 4 },
        { n: 'D5', d: 2 }, { n: 'E5', d: 2 }, { n: 'F5', d: 2 }, { n: 'A5', d: 4 },
        { n: 'G5', d: 2 }, { n: 'F5', d: 2 }, { n: 'E5', d: 4 },

        // Second line: Trololololo...
        { n: 'E5', d: 2 }, { n: 'F5', d: 2 }, { n: 'G5', d: 2 }, { n: 'C6', d: 4 },
        { n: 'B5', d: 2 }, { n: 'A5', d: 2 }, { n: 'G5', d: 4 },
        { n: 'F5', d: 2 }, { n: 'E5', d: 2 }, { n: 'D5', d: 2 }, { n: 'C5', d: 4 },
        { n: 'REST', d: 2 },

        // Laugh / Staccato part ("Ha ha ha ha ha!")
        { n: 'G5', d: 1 }, { n: 'REST', d: 1 }, { n: 'G5', d: 1 }, { n: 'REST', d: 1 },
        { n: 'E5', d: 1 }, { n: 'REST', d: 1 }, { n: 'C5', d: 2 },
        { n: 'A5', d: 1 }, { n: 'REST', d: 1 }, { n: 'A5', d: 1 }, { n: 'REST', d: 1 },
        { n: 'F5', d: 1 }, { n: 'REST', d: 1 }, { n: 'D5', d: 2 },
        { n: 'G5', d: 2 }, { n: 'F5', d: 2 }, { n: 'E5', d: 2 }, { n: 'D5', d: 2 },
        { n: 'C5', d: 6 }, { n: 'REST', d: 4 }
    ];

    // Bass accompaniment for bouncy polk-style trololo rhythm
    const TROLOLO_BASS = [
        'C4', 'G3', 'C4', 'G3', 'F3', 'C4', 'F3', 'C4',
        'G3', 'D4', 'G3', 'D4', 'C4', 'G3', 'C4', 'G3'
    ];

    let currentMelodyStep = 0;
    const STEP_MS = 140;

    function playTone(freq, type, duration, volume, vibrato = true) {
        if (!audioCtx || isAudioMuted || freq <= 0) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            // Add slight vibrato for human voice mimicry (Trololo vocalise!)
            if (vibrato && freq > 200) {
                const lfo = audioCtx.createOscillator();
                const lfoGain = audioCtx.createGain();
                lfo.frequency.setValueAtTime(5.5, audioCtx.currentTime); // 5.5 Hz vibrato
                lfoGain.gain.setValueAtTime(freq * 0.02, audioCtx.currentTime);
                lfo.connect(osc.frequency);
                lfo.start();
                lfo.stop(audioCtx.currentTime + duration);
            }

            gain.gain.setValueAtTime(volume, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch(e) {}
    }

    function playTrololoStep() {
        if (!isTrololoPlaying || isAudioMuted) return;

        const item = TROLOLO_MELODY[currentMelodyStep];
        if (item) {
            const freq = NOTES[item.n] || 0;
            const dur = (item.d * STEP_MS) / 1000;
            if (freq > 0) {
                // Lead voice: triangle + lowpass warmth
                playTone(freq, 'triangle', dur * 0.95, 0.16, true);
                // Subtle brass overtone
                playTone(freq * 0.5, 'sawtooth', dur * 0.95, 0.04, false);
            }

            // Simple bouncy bass tick
            if (currentMelodyStep % 2 === 0) {
                playTone(130.81, 'triangle', 0.15, 0.09, false); // C3
            } else {
                playTone(196.00, 'triangle', 0.12, 0.07, false); // G3
            }

            currentMelodyStep = (currentMelodyStep + 1) % TROLOLO_MELODY.length;
            trololoTimeout = setTimeout(playTrololoStep, item.d * STEP_MS);
        } else {
            currentMelodyStep = 0;
            trololoTimeout = setTimeout(playTrololoStep, 200);
        }
    }

    function startTrololoMusic() {
        initAudio();
        if (isTrololoPlaying) return;
        isTrololoPlaying = true;
        currentMelodyStep = 0;
        playTrololoStep();
    }

    function stopTrololoMusic() {
        isTrololoPlaying = false;
        if (trololoTimeout) clearTimeout(trololoTimeout);
    }

    // --- SFX (Meme Sounds) ---
    function sfxJump() {
        playTone(320, 'sine', 0.1, 0.15);
        setTimeout(() => playTone(540, 'sine', 0.12, 0.12), 40);
    }

    function sfxBruh() {
        if (!audioCtx || isAudioMuted) return;
        // Pitch drop sound "BRUH"
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(45, audioCtx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.35);
        } catch(e) {}
    }

    function sfxVineBoom() {
        if (!audioCtx || isAudioMuted) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(80, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(25, audioCtx.currentTime + 0.6);
            gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.6);
        } catch(e) {}
    }

    function sfxBoing() {
        playTone(200, 'sine', 0.08, 0.2);
        setTimeout(() => playTone(600, 'sine', 0.18, 0.25), 50);
    }

    function sfxCoinTroll() {
        // High cheery ding followed instantly by explosion tone!
        playTone(987.77, 'sine', 0.1, 0.2);
        setTimeout(() => playTone(1318.51, 'sine', 0.15, 0.25), 80);
        setTimeout(() => sfxVineBoom(), 200);
    }

    function sfxVictory() {
        const notes = [523, 659, 783, 1046];
        notes.forEach((f, i) => {
            setTimeout(() => playTone(f, 'square', 0.25, 0.15), i * 140);
        });
    }

    // ========================================================================
    // 🎮 GAME PHYSICS & TROLL ENGINE
    // ========================================================================
    const GRAVITY = 0.58;
    const JUMP_FORCE = -12.2;
    const MOVE_SPEED = 4.2;

    const player = {
        x: 60,
        y: 300,
        width: 32,
        height: 42,
        vx: 0,
        vy: 0,
        isGrounded: false,
        facingRight: true,
        isDead: false,
        deathTimer: 0,
        isInvertedControls: false,
        invTimer: 0
    };

    const keys = {
        left: false,
        right: false,
        jump: false
    };

    // Troll traps & level elements
    let platforms = [];
    let hazards = []; // Spikes, lasers, traps
    let trollTriggers = []; // Invisible areas that trigger chaos
    let collectibles = []; // Fake/real coins
    let finishGoal = null;
    let particles = [];
    let boss = null;

    // Meme death messages
    const TROLL_MESSAGES = [
        { face: '🤪', text: "U MAD BRO? 😈", sub: "Trololo şarkısı arkada keyifle çalıyor..." },
        { face: '💀', text: "SKILL ISSUE KANKA!", sub: "Oraya basmaman gerektiğini bilmeliydin." },
        { face: '🤡', text: "EMOTIONAL DAMAGE!", sub: "Tuzak göz göre göre oradaydı!" },
        { face: '🗿', text: "GİGATROLL CEZASI", sub: "Saygıyla eğil ve R'ye bas." },
        { face: '🐸', text: "FEELS BAD MAN 😢", sub: "Zemin birden yok mu oldu? Ne tesadüf!" },
        { face: '🐕', text: "MUCH TRAP, VERY TROLL!", sub: "Vay canına, yine mi öldün?" },
        { face: '💥', text: "BOMBA GİBİ PATLADIN!", sub: "O para sana bedava mı sandın?" },
        { face: '🤦‍♂️', text: "KLAVYEYİ KIRMA SAKIN!", sub: "Gözlerini kapa, derin nefes al..." }
    ];

    function showMemePopup(customText, customSub, customFace) {
        const randomMsg = TROLL_MESSAGES[Math.floor(Math.random() * TROLL_MESSAGES.length)];
        memeFace.textContent = customFace || randomMsg.face;
        memeText.textContent = customText || randomMsg.text;
        memeSub.textContent = customSub || randomMsg.sub;
        memePopup.classList.remove('hidden');

        setTimeout(() => {
            memePopup.classList.add('hidden');
        }, 1800);
    }

    function triggerDeath(reason, customFace) {
        if (player.isDead) return;
        player.isDead = true;
        player.deathTimer = 45;
        deathCount++;
        updateRank();

        sfxBruh();
        sfxVineBoom();

        // Spawn death confetti / bone particles
        for (let i = 0; i < 24; i++) {
            particles.push({
                x: player.x + player.width / 2,
                y: player.y + player.height / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12 - 4,
                size: Math.random() * 8 + 4,
                color: ['#ff1744', '#ffd54f', '#ffffff', '#00e676', '#ff4081'][Math.floor(Math.random() * 5)],
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.4,
                life: 60
            });
        }

        showMemePopup(reason, null, customFace);
    }

    function respawnPlayer() {
        player.x = 60;
        player.y = 300;
        player.vx = 0;
        player.vy = 0;
        player.isDead = false;
        player.isInvertedControls = false;
        loadStage(currentStage, false); // Reload stage traps to initial state
    }

    // ========================================================================
    // 🗺️ STAGE DESIGN & CAT-MARIO STYLE TROLL GENERATION
    // ========================================================================
    function loadStage(stageNum, resetDeaths = false) {
        currentStage = stageNum;
        if (resetDeaths) deathCount = 0;
        updateRank();

        platforms = [];
        hazards = [];
        trollTriggers = [];
        collectibles = [];
        particles = [];
        boss = null;
        isStageCleared = false;
        winBanner.classList.add('hidden');

        player.x = 60;
        player.y = 320;
        player.vx = 0;
        player.vy = 0;
        player.isDead = false;

        if (stageNum === 1) {
            buildStage1();
        } else if (stageNum === 2) {
            buildStage2();
        } else if (stageNum === 3) {
            buildStage3();
        } else if (stageNum === 4) {
            buildStage4();
        } else if (stageNum === 5) {
            buildStage5();
        }
    }

    // --- STAGE 1: Acemi Tuzağı (Novice Trap - Looks like standard Mario, everything kills you) ---
    function buildStage1() {
        // Floor section 1
        platforms.push({ x: 0, y: 400, w: 280, h: 80, type: 'ground' });

        // TROLL: Floor tile that falls when stepped on!
        platforms.push({
            x: 280, y: 400, w: 90, h: 80, type: 'falling',
            triggered: false, fallVy: 0,
            color: '#2e7d32'
        });

        // Safe landing island
        platforms.push({ x: 420, y: 400, w: 120, h: 80, type: 'ground' });

        // TROLL: Shiny Golden Coin in the middle of gap - touches it -> Spikes drop from sky!
        collectibles.push({
            x: 480, y: 280, w: 24, h: 24, type: 'trap_coin',
            collected: false,
            onCollect: () => {
                sfxCoinTroll();
                // Spawn 3 falling anvils / spikes directly over player!
                hazards.push({
                    x: player.x, y: 0, w: 40, h: 40, vy: 9, type: 'anvil',
                    text: '10 TON 💣'
                });
            }
        });

        // Mid platform
        platforms.push({ x: 600, y: 350, w: 140, h: 30, type: 'ground' });

        // TROLL: Invisible block right above gap that hits your head into pit!
        platforms.push({
            x: 650, y: 230, w: 40, h: 40, type: 'invisible_block',
            revealed: false,
            onHit: () => {
                sfxVineBoom();
                showMemePopup("KAFANI VURDUN 🤪", "Görünmez blok selam söyledi!");
            }
        });

        // Floor after gap
        platforms.push({ x: 800, y: 400, w: 200, h: 80, type: 'ground' });

        // TROLL: Spikes that pop up from ground when player approaches
        hazards.push({
            x: 900, y: 400, w: 40, h: 30, type: 'pop_spike',
            triggered: false, targetY: 370, curY: 400
        });

        // Trampoline to high area
        platforms.push({
            x: 960, y: 390, w: 40, h: 10, type: 'spring',
            power: -16
        });

        // High ledge
        platforms.push({ x: 1060, y: 250, w: 220, h: 30, type: 'ground' });

        // TROLL FINISH FLAG: When player gets near, it runs away!
        finishGoal = {
            x: 1220, y: 170, w: 32, h: 80,
            hasLegs: false, legTimer: 0,
            runaway: true, speed: 0
        };

        // Secret real button that triggers the win if you catch or jump over the running flag!
        collectibles.push({
            x: 1380, y: 220, w: 30, h: 30, type: 'win_cookie',
            collected: false,
            onCollect: () => {
                stageCleared("Bölüm 1'i Bitirdin!", "İlk bölümü geçtin ama henüz hiçbir şey görmedin! Asıl trol şimdi başlıyor.");
            }
        });
    }

    // --- STAGE 2: Uçan Dikenler ve Şakalar (Jumping Spikes, Cloud Dodgers) ---
    function buildStage2() {
        platforms.push({ x: 0, y: 420, w: 220, h: 60, type: 'ground' });

        // TROLL: Gizli basamak (düşersen kurtarıcı basamak açılır)
        platforms.push({
            x: 235, y: 390, w: 45, h: 25, type: 'invisible_block',
            revealed: false,
            onHit: () => {
                sfxBoing();
                showMemePopup("GİZLİ BASAMAK! 🤫", "Şimdi bulutun yeni yerine zıpla!");
            }
        });

        // TROLL: Moving platform that dodges away right when player jumps on it, then STOPS at x:340!
        platforms.push({
            x: 280, y: 370, w: 100, h: 25, type: 'dodge_cloud',
            baseX: 280, targetX: 340, dodged: false
        });

        // Stable small stepping stone
        platforms.push({ x: 440, y: 330, w: 80, h: 25, type: 'ground' });

        // TROLL: Spikes on platform that JUMP UP into the air when player jumps over!
        hazards.push({
            x: 460, y: 300, w: 40, h: 30, type: 'jumping_spike',
            jumped: false, vy: 0
        });

        // Inverted controls poison apple
        collectibles.push({
            x: 580, y: 240, w: 26, h: 26, type: 'troll_apple',
            collected: false,
            onCollect: () => {
                player.isInvertedControls = true;
                player.invTimer = 220;
                sfxBruh();
                showMemePopup("KONTROLLER TERS! 🔄", "Sol Sağ oldu, geçmiş olsun!");
            }
        });

        // Stepping stones
        platforms.push({ x: 560, y: 380, w: 90, h: 25, type: 'ground' });
        platforms.push({ x: 720, y: 350, w: 90, h: 25, type: 'ground' });

        // TROLL: Fake checkpoint: "KAYDEDİLDİ 😈" -> floor collapses immediately!
        platforms.push({
            x: 880, y: 320, w: 140, h: 30, type: 'fake_checkpoint',
            triggered: false, text: 'GÜVENLİ BÖLGE 🚩'
        });

        // Distant island with flag
        platforms.push({ x: 1100, y: 360, w: 160, h: 40, type: 'ground' });

        finishGoal = {
            x: 1200, y: 280, w: 32, h: 80,
            hasLegs: false, runaway: false,
            onReach: () => {
                stageCleared("Bölüm 2 Geçildi!", "Kontroller ters dönerken bile geçtin ha? Rütben yükseliyor!");
            }
        };
    }

    // --- STAGE 3: Akıl Sağlığını Kaybetme Simülatörü (Falling Ceilings & Doge Rockets) ---
    function buildStage3() {
        platforms.push({ x: 0, y: 420, w: 260, h: 60, type: 'ground' });

        // TROLL: Low ceiling with stalactites that drop as player walks under
        for (let i = 0; i < 4; i++) {
            hazards.push({
                x: 100 + i * 40, y: 260, w: 24, h: 32, type: 'falling_spike',
                triggered: false, vy: 0
            });
        }

        // Gap with disappearing platforms (only visible when standing on them)
        platforms.push({ x: 320, y: 390, w: 70, h: 25, type: 'blinking', timer: 0, visible: true });
        platforms.push({ x: 440, y: 350, w: 70, h: 25, type: 'blinking', timer: 30, visible: true });
        platforms.push({ x: 560, y: 310, w: 70, h: 25, type: 'blinking', timer: 60, visible: true });

        // Doge bullet rocket launcher
        trollTriggers.push({
            x: 650, y: 150, w: 60, h: 300,
            triggered: false,
            onEnter: () => {
                sfxVineBoom();
                hazards.push({
                    x: cameraX + 800, y: player.y - 10, w: 48, h: 48, type: 'doge_bullet',
                    vx: -7, text: '🐕 BARK'
                });
            }
        });

        platforms.push({ x: 680, y: 380, w: 200, h: 40, type: 'ground' });

        // Signs: Troll direction arrows
        platforms.push({ x: 920, y: 380, w: 120, h: 40, type: 'ground' });
        hazards.push({
            x: 940, y: 350, w: 40, h: 30, type: 'fake_sign',
            text: '👉 BURASI GÜVENLİ (ŞAKA)'
        });

        // Real goal platform
        platforms.push({ x: 1100, y: 330, w: 150, h: 40, type: 'ground' });

        finishGoal = {
            x: 1190, y: 250, w: 32, h: 80,
            hasLegs: false, runaway: false,
            onReach: () => {
                stageCleared("Bölüm 3 Geçildi!", "Doge mermilerinden ve düşen tavanlardan sağ çıktın! Gerçek bir trollsün.");
            }
        };
    }

    // --- STAGE 4: Speedrun Kabusu (Speed Booster & Laser Troll) ---
    function buildStage4() {
        platforms.push({ x: 0, y: 420, w: 200, h: 60, type: 'ground' });

        // Speed pad that launches player fast
        platforms.push({
            x: 150, y: 410, w: 60, h: 10, type: 'speed_pad',
            boost: 12
        });

        // Lava pit below
        hazards.push({ x: 200, y: 450, w: 600, h: 40, type: 'lava' });

        // Tiny islands to bounce across
        platforms.push({ x: 300, y: 390, w: 50, h: 25, type: 'ground' });
        platforms.push({ x: 420, y: 370, w: 50, h: 25, type: 'ground' });
        platforms.push({ x: 540, y: 350, w: 50, h: 25, type: 'ground' });

        // TROLL: Giant meme wall with laser beam warning
        hazards.push({
            x: 650, y: 200, w: 30, h: 200, type: 'laser_gate',
            active: true, timer: 0
        });

        platforms.push({ x: 700, y: 380, w: 180, h: 40, type: 'ground' });

        // Bounce spring into ceiling spikes if you don't steer
        platforms.push({
            x: 760, y: 370, w: 40, h: 10, type: 'spring',
            power: -18
        });
        hazards.push({ x: 740, y: 120, w: 90, h: 25, type: 'ceiling_spike' });

        platforms.push({ x: 920, y: 320, w: 200, h: 40, type: 'ground' });

        finishGoal = {
            x: 1050, y: 240, w: 32, h: 80,
            hasLegs: false, runaway: false,
            onReach: () => {
                stageCleared("Bölüm 4 Geçildi!", "Final Bölüme Ulaştın! Karşında BÜYÜK BOSS TROLLFACE var!");
            }
        };
    }

    // --- STAGE 5: BÜYÜK BOSS: TROLLFACE EFENDİSİ ---
    function buildStage5() {
        // Boss arena: wide floor, floating platforms, and giant Trollface boss
        platforms.push({ x: 0, y: 430, w: 900, h: 60, type: 'ground' });
        platforms.push({ x: 120, y: 320, w: 120, h: 25, type: 'ground' });
        platforms.push({ x: 640, y: 320, w: 120, h: 25, type: 'ground' });
        platforms.push({ x: 380, y: 240, w: 140, h: 25, type: 'ground' });

        boss = {
            x: 400,
            y: 110,
            w: 120,
            h: 120,
            hp: 3,
            maxHp: 3,
            timer: 0,
            attackState: 'idle',
            angle: 0
        };

        // Red big "DO NOT PRESS" button
        collectibles.push({
            x: 435, y: 210, w: 32, h: 30, type: 'boss_button',
            collected: false,
            onCollect: () => {
                if (boss && boss.hp > 0) {
                    boss.hp--;
                    sfxVineBoom();
                    showMemePopup(`BOSS CANI: ${boss.hp} / 3 💥`, "BİR KEZ DAHA BAS!", "🤪");
                    // Spawn attack barrage
                    for (let i = 0; i < 5; i++) {
                        hazards.push({
                            x: boss.x + boss.w / 2, y: boss.y + boss.h / 2,
                            w: 24, h: 24, type: 'troll_tear',
                            vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6 - 2
                        });
                    }
                    if (boss.hp <= 0) {
                        sfxVictory();
                        stageCleared("🎉 TROLL DÜNYASININ FATİHİ OLDUN! 🎉",
                            `Tebrikler! Toplam ${deathCount} kez ölerek ve trolün her türlüsünü aşarak oyunu BİTİRDİN! Efsanesin kanka!`
                        );
                    }
                }
            }
        });
    }

    function stageCleared(title, desc) {
        isStageCleared = true;
        sfxVictory();
        winDesc.textContent = desc;
        winBanner.querySelector('h2').textContent = title;
        winBanner.classList.remove('hidden');

        if (currentStage >= TOTAL_STAGES) {
            btnNextStage.textContent = "🏆 OYUNU BAŞTAN TROLLE! (Bölüm 1'e Dön)";
        } else {
            btnNextStage.textContent = "SONRAKİ TROLL BÖLÜME GEÇ ▶";
        }
    }

    // ========================================================================
    // 🕹️ INPUT LISTENERS
    // ========================================================================
    window.addEventListener('keydown', (e) => {
        // Start trololo music on first user key press
        if (!isTrololoPlaying && !isAudioMuted) {
            startTrololoMusic();
        }

        const isInv = player.isInvertedControls;
        const code = e.code;

        if (code === 'KeyA' || code === 'ArrowLeft') {
            if (isInv) keys.right = true; else keys.left = true;
        } else if (code === 'KeyD' || code === 'ArrowRight') {
            if (isInv) keys.left = true; else keys.right = true;
        } else if (code === 'KeyW' || code === 'Space' || code === 'ArrowUp') {
            keys.jump = true;
            if (player.isGrounded && !player.isDead) {
                player.vy = JUMP_FORCE;
                player.isGrounded = false;
                sfxJump();
            }
        } else if (code === 'KeyR') {
            respawnPlayer();
        }
    });

    window.addEventListener('keyup', (e) => {
        const isInv = player.isInvertedControls;
        const code = e.code;

        if (code === 'KeyA' || code === 'ArrowLeft') {
            if (isInv) keys.right = false; else keys.left = false;
        } else if (code === 'KeyD' || code === 'ArrowRight') {
            if (isInv) keys.left = false; else keys.right = false;
        } else if (code === 'KeyW' || code === 'Space' || code === 'ArrowUp') {
            keys.jump = false;
        }
    });

    // Touch & Button Controls
    btnToggleTrololo.addEventListener('click', () => {
        isAudioMuted = !isAudioMuted;
        if (isAudioMuted) {
            stopTrololoMusic();
            bgmLabel.textContent = "Trololo Müziği: KAPALI";
        } else {
            bgmLabel.textContent = "Trololo Müziği: AÇIK";
            startTrololoMusic();
        }
    });

    btnRestartStage.addEventListener('click', () => {
        loadStage(currentStage);
    });

    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    });

    btnNextStage.addEventListener('click', () => {
        if (currentStage >= TOTAL_STAGES) {
            loadStage(1);
        } else {
            loadStage(currentStage + 1);
        }
    });

    // Click canvas to trigger audio & focus
    canvas.addEventListener('click', () => {
        if (!isTrololoPlaying && !isAudioMuted) {
            startTrololoMusic();
        }
    });

    // ========================================================================
    // 🔄 GAME LOOP & UPDATE
    // ========================================================================
    function update() {
        if (player.isDead) {
            player.deathTimer--;
            if (player.deathTimer <= 0) {
                respawnPlayer();
            }
            updateParticles();
            return;
        }

        if (isStageCleared) return;

        // Inverted controls timer
        if (player.isInvertedControls) {
            player.invTimer--;
            if (player.invTimer <= 0) player.isInvertedControls = false;
        }

        // Horizontal Movement
        if (keys.left) {
            player.vx = -MOVE_SPEED;
            player.facingRight = false;
        } else if (keys.right) {
            player.vx = MOVE_SPEED;
            player.facingRight = true;
        } else {
            player.vx *= 0.75;
            if (Math.abs(player.vx) < 0.1) player.vx = 0;
        }

        // Apply Gravity
        player.vy += GRAVITY;
        if (player.vy > 14) player.vy = 14;

        // Move Horizontal & Check Platform Collisions
        player.x += player.vx;
        checkPlatformCollisions(true);

        // Move Vertical & Check Platform Collisions
        player.y += player.vy;
        player.isGrounded = false;
        checkPlatformCollisions(false);

        // Fall into void check
        if (player.y > 600) {
            triggerDeath("BOŞLUĞA DÜŞTÜN 🕳️", "Zemine güvenmeyecektin!");
        }

        // Update Platforms (Falling, Dodging, Blinking)
        updatePlatforms();

        // Update Hazards & Traps
        updateHazards();

        // Update Triggers
        updateTriggers();

        // Update Collectibles
        updateCollectibles();

        // Update Finish Goal
        updateGoal();

        // Update Boss
        if (boss) updateBoss();

        // Update Camera
        const targetCamX = player.x - canvas.width * 0.35;
        cameraX += (targetCamX - cameraX) * 0.1;
        if (cameraX < 0) cameraX = 0;

        // Update Particles
        updateParticles();
    }

    function checkPlatformCollisions(isHorizontal) {
        for (const p of platforms) {
            if (p.type === 'invisible_block' && !p.revealed) {
                // Check if head hit invisible block from below
                if (!isHorizontal && player.vy < 0) {
                    if (
                        player.x + player.width > p.x &&
                        player.x < p.x + p.w &&
                        player.y <= p.y + p.h &&
                        player.y - player.vy >= p.y + p.h
                    ) {
                        p.revealed = true;
                        player.y = p.y + p.h;
                        player.vy = 2; // Knock down hard!
                        if (p.onHit) p.onHit();
                    }
                } else if (!isHorizontal && player.vy > 0) {
                    // Stepped on from above
                    if (
                        player.x + player.width > p.x &&
                        player.x < p.x + p.w &&
                        player.y + player.height >= p.y &&
                        player.y - player.vy + player.height <= p.y + 20
                    ) {
                        p.revealed = true;
                        player.y = p.y - player.height;
                        player.vy = 0;
                        player.isGrounded = true;
                        if (p.onHit) p.onHit();
                    }
                }
                continue;
            }

            // Normal AABB
            if (
                player.x + player.width > p.x &&
                player.x < p.x + p.w &&
                player.y + player.height > p.y &&
                player.y < p.y + p.h
            ) {
                if (isHorizontal) {
                    if (player.vx > 0) {
                        player.x = p.x - player.width;
                    } else if (player.vx < 0) {
                        player.x = p.x + p.w;
                    }
                    player.vx = 0;
                } else {
                    if (player.vy > 0) { // Landing on top
                        player.y = p.y - player.height;
                        player.vy = 0;
                        player.isGrounded = true;

                        // Trigger spring
                        if (p.type === 'spring') {
                            sfxBoing();
                            player.vy = p.power || -15;
                            player.isGrounded = false;
                        }

                        // Trigger speed pad
                        if (p.type === 'speed_pad') {
                            sfxVineBoom();
                            player.vx = p.boost || 12;
                        }

                        // Trigger falling platform
                        if (p.type === 'falling') {
                            p.triggered = true;
                        }

                        // Trigger fake checkpoint
                        if (p.type === 'fake_checkpoint' && !p.triggered) {
                            p.triggered = true;
                            sfxBruh();
                            showMemePopup("KAYDEDİLDİ 😈", "Şaka yaptım, zemin çöküyor!");
                        }

                    } else if (player.vy < 0) { // Hitting ceiling
                        player.y = p.y + p.h;
                        player.vy = 1;
                    }
                }
            }
        }
    }

    function updatePlatforms() {
        for (const p of platforms) {
            if (p.type === 'falling' && p.triggered) {
                p.fallVy = (p.fallVy || 0) + 0.6;
                p.y += p.fallVy;
            } else if (p.type === 'fake_checkpoint' && p.triggered) {
                p.y += 8;
            } else if (p.type === 'dodge_cloud') {
                // If player is jumping close, dodge right to targetX and stop!
                const dist = Math.hypot((player.x + 16) - (p.x + p.w / 2), (player.y + 20) - p.y);
                if (dist < 110 && !p.dodged) {
                    p.dodged = true;
                    sfxVineBoom();
                    showMemePopup("HOOOP KAÇTIM! 🏃", "Ama durdum, şimdi üstüme zıpla!");
                }
                const target = p.targetX || 340;
                if (p.dodged && p.x < target) {
                    p.x += 4;
                    if (p.x >= target) p.x = target;
                }
            } else if (p.type === 'blinking') {
                p.timer = (p.timer + 1) % 120;
                p.visible = p.timer < 60;
            }
        }
    }

    function updateHazards() {
        for (let i = hazards.length - 1; i >= 0; i--) {
            const h = hazards[i];

            // Anvil falling
            if (h.type === 'anvil') {
                h.y += h.vy;
                if (h.y > 600) { hazards.splice(i, 1); continue; }
            }

            // Falling spike
            if (h.type === 'falling_spike') {
                if (!h.triggered && Math.abs((player.x + 16) - (h.x + h.w / 2)) < 50) {
                    h.triggered = true;
                    h.vy = 2;
                }
                if (h.triggered) {
                    h.vy += 0.5;
                    h.y += h.vy;
                }
            }

            // Jumping spike
            if (h.type === 'jumping_spike') {
                if (!h.jumped && Math.abs((player.x + 16) - (h.x + h.w / 2)) < 60 && !player.isGrounded) {
                    h.jumped = true;
                    h.vy = -9;
                    sfxBoing();
                }
                if (h.jumped) {
                    h.vy += 0.45;
                    h.y += h.vy;
                }
            }

            // Doge bullet
            if (h.type === 'doge_bullet') {
                h.x += h.vx;
                if (h.x < cameraX - 200) { hazards.splice(i, 1); continue; }
            }

            // Boss tear / bullet
            if (h.type === 'troll_tear') {
                h.x += h.vx;
                h.y += h.vy;
                h.vy += 0.25;
                if (h.y > 600) { hazards.splice(i, 1); continue; }
            }

            // Hazard Collision with Player
            if (
                player.x + player.width > h.x &&
                player.x < h.x + h.w &&
                player.y + player.height > h.y &&
                player.y < h.y + h.h
            ) {
                if (h.type === 'anvil') {
                    triggerDeath("10 TONLUK DARBE! 💣", "Üstüne demir düştü!");
                } else if (h.type === 'doge_bullet') {
                    triggerDeath("MUCH PAIN, VERY DED! 🐕", "Doge seni biçti!");
                } else if (h.type === 'lava') {
                    triggerDeath("LAVA ATLAYIŞI! 🌋", "Yüzme biliyor muydun?");
                } else {
                    triggerDeath("DİKENLENDİN! 🌵", "Dikenleri sevemedin gitti!");
                }
            }
        }
    }

    function updateTriggers() {
        for (const t of trollTriggers) {
            if (!t.triggered) {
                if (
                    player.x + player.width > t.x &&
                    player.x < t.x + t.w &&
                    player.y + player.height > t.y &&
                    player.y < t.y + t.h
                ) {
                    t.triggered = true;
                    if (t.onEnter) t.onEnter();
                }
            }
        }
    }

    function updateCollectibles() {
        for (const c of collectibles) {
            if (!c.collected) {
                if (
                    player.x + player.width > c.x &&
                    player.x < c.x + c.w &&
                    player.y + player.height > c.y &&
                    player.y < c.y + c.h
                ) {
                    c.collected = true;
                    if (c.onCollect) c.onCollect();
                }
            }
        }
    }

    function updateGoal() {
        if (!finishGoal) return;

        // If runaway flag, run away when player approaches!
        if (finishGoal.runaway) {
            const dist = (finishGoal.x) - (player.x + player.width);
            if (dist < 120 && dist > -50) {
                finishGoal.hasLegs = true;
                finishGoal.x += 4.5;
                if (!finishGoal.taunted) {
                    finishGoal.taunted = true;
                    sfxVineBoom();
                    showMemePopup("BAYRAK KAÇIYOR! 🏃‍♂️", "Yakalayabilirsen yakala!");
                }
            }
        }

        // Touch flag
        if (
            player.x + player.width > finishGoal.x &&
            player.x < finishGoal.x + finishGoal.w &&
            player.y + player.height > finishGoal.y &&
            player.y < finishGoal.y + finishGoal.h
        ) {
            if (finishGoal.onReach) finishGoal.onReach();
        }
    }

    function updateBoss() {
        if (!boss || boss.hp <= 0) return;
        boss.timer++;

        // Boss floating wave
        boss.y = 110 + Math.sin(boss.timer * 0.05) * 25;
        boss.x = 420 + Math.cos(boss.timer * 0.03) * 60;

        // Boss attacks every 120 frames
        if (boss.timer % 120 === 0) {
            sfxVineBoom();
            // Fire 3 troll projectiles
            for (let i = -1; i <= 1; i++) {
                hazards.push({
                    x: boss.x + boss.w / 2, y: boss.y + boss.h / 2,
                    w: 24, h: 24, type: 'troll_tear',
                    vx: i * 3, vy: 4
                });
            }
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3;
            p.rot += p.vrot;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    // ========================================================================
    // 🎨 RENDER ENGINE (Canvas, Trollface, Memes & Level Visuals)
    // ========================================================================
    function draw() {
        // Clear screen with sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#4fc3f7');
        grad.addColorStop(0.7, '#81d4fa');
        grad.addColorStop(1, '#e1f5fe');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(-Math.floor(cameraX), 0);

        // --- Draw Clouds & Background Meme Signs ---
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < 15; i++) {
            const cx = i * 280;
            ctx.beginPath();
            ctx.arc(cx, 80 + (i % 3) * 30, 35, 0, Math.PI * 2);
            ctx.arc(cx + 25, 70 + (i % 3) * 30, 45, 0, Math.PI * 2);
            ctx.arc(cx + 55, 80 + (i % 3) * 30, 35, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- Draw Platforms ---
        for (const p of platforms) {
            if (p.type === 'invisible_block') {
                if (p.revealed) {
                    ctx.fillStyle = '#b0bec5';
                    ctx.fillRect(p.x, p.y, p.w, p.h);
                    ctx.fillStyle = '#ff1744';
                    ctx.font = 'bold 20px sans-serif';
                    ctx.fillText('😈', p.x + 8, p.y + 28);
                }
                continue;
            }

            if (p.type === 'dodge_cloud') {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.roundRect(p.x, p.y, p.w, p.h, 12);
                ctx.fill();
                ctx.fillStyle = '#0288d1';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText('☁️ BULUT', p.x + 12, p.y + 17);
                continue;
            }

            if (p.type === 'blinking' && !p.visible) continue;

            if (p.type === 'spring') {
                ctx.fillStyle = '#ffd54f';
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = '#e65100';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText('⬆️ ZIPLA', p.x + 2, p.y + 9);
                continue;
            }

            if (p.type === 'speed_pad') {
                ctx.fillStyle = '#00e676';
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 11px sans-serif';
                ctx.fillText('⏩ HIZ', p.x + 12, p.y + 9);
                continue;
            }

            if (p.type === 'fake_checkpoint') {
                ctx.fillStyle = '#42a5f5';
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(p.text || '🚩 CHECKPOINT', p.x + 10, p.y + 20);
                continue;
            }

            // Normal ground blocks
            ctx.fillStyle = p.color || '#388e3c';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            // Grass top trim
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(p.x, p.y, p.w, 8);
            // Brick borders
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, p.y, p.w, p.h);
        }

        // --- Draw Hazards ---
        for (const h of hazards) {
            if (h.type === 'anvil') {
                ctx.fillStyle = '#455a64';
                ctx.fillRect(h.x, h.y, h.w, h.h);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText('10t 💣', h.x + 4, h.y + 24);
            } else if (h.type === 'doge_bullet') {
                ctx.fillStyle = '#ffb300';
                ctx.beginPath();
                ctx.arc(h.x + 24, h.y + 24, 24, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = 'bold 20px sans-serif';
                ctx.fillText('🐕', h.x + 12, h.y + 32);
            } else if (h.type === 'lava') {
                ctx.fillStyle = '#ff3d00';
                ctx.fillRect(h.x, h.y, h.w, h.h);
                ctx.fillStyle = '#ffeb3b';
                for (let lx = h.x; lx < h.x + h.w; lx += 20) {
                    ctx.beginPath();
                    ctx.arc(lx + 10, h.y + 4, 6, 0, Math.PI);
                    ctx.fill();
                }
            } else if (h.type === 'troll_tear') {
                ctx.fillStyle = '#00e5ff';
                ctx.beginPath();
                ctx.arc(h.x + 12, h.y + 12, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = '12px sans-serif';
                ctx.fillText('💧', h.x + 3, h.y + 16);
            } else {
                // Spikes
                ctx.fillStyle = '#d32f2f';
                const count = Math.max(1, Math.floor(h.w / 16));
                const sw = h.w / count;
                for (let k = 0; k < count; k++) {
                    ctx.beginPath();
                    ctx.moveTo(h.x + k * sw, h.y + h.h);
                    ctx.lineTo(h.x + (k + 0.5) * sw, h.y);
                    ctx.lineTo(h.x + (k + 1) * sw, h.y + h.h);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }

        // --- Draw Collectibles ---
        for (const c of collectibles) {
            if (!c.collected) {
                if (c.type === 'trap_coin') {
                    ctx.fillStyle = '#ffd54f';
                    ctx.beginPath();
                    ctx.arc(c.x + 12, c.y + 12, 12, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ff6f00';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.fillStyle = '#e65100';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.fillText('$', c.x + 8, c.y + 16);
                } else if (c.type === 'troll_apple') {
                    ctx.font = '22px sans-serif';
                    ctx.fillText('🍏', c.x, c.y + 20);
                } else if (c.type === 'boss_button') {
                    ctx.fillStyle = '#d50000';
                    ctx.fillRect(c.x, c.y + 10, c.w, c.h - 10);
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.fillText('BASMA!', c.x - 3, c.y + 6);
                } else {
                    ctx.font = '22px sans-serif';
                    ctx.fillText('🍪', c.x, c.y + 20);
                }
            }
        }

        // --- Draw Finish Goal ---
        if (finishGoal) {
            // Flag pole
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(finishGoal.x + 4, finishGoal.y, 6, finishGoal.h);
            // Flag banner
            ctx.fillStyle = '#ff1744';
            ctx.beginPath();
            ctx.moveTo(finishGoal.x + 10, finishGoal.y + 5);
            ctx.lineTo(finishGoal.x + 40, finishGoal.y + 20);
            ctx.lineTo(finishGoal.x + 10, finishGoal.y + 35);
            ctx.closePath();
            ctx.fill();

            // Troll face on flag
            ctx.fillStyle = '#fff';
            ctx.font = '16px sans-serif';
            ctx.fillText('🤪', finishGoal.x + 12, finishGoal.y + 24);

            // If flag has legs running away
            if (finishGoal.hasLegs) {
                ctx.fillStyle = '#000';
                ctx.fillRect(finishGoal.x, finishGoal.y + finishGoal.h, 4, 12);
                ctx.fillRect(finishGoal.x + 10, finishGoal.y + finishGoal.h, 4, 12);
            }
        }

        // --- Draw Boss Trollface ---
        if (boss && boss.hp > 0) {
            ctx.save();
            ctx.translate(boss.x + boss.w / 2, boss.y + boss.h / 2);

            // Giant Meme Troll Face Avatar
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, boss.w / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Eyes
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(-24, -14, 12, 8, 0.2, 0, Math.PI * 2);
            ctx.ellipse(24, -14, 12, 8, -0.2, 0, Math.PI * 2);
            ctx.fill();

            // Iconic wide Troll grin with teeth
            ctx.beginPath();
            ctx.arc(0, 10, 42, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.closePath();
            ctx.fillStyle = '#000';
            ctx.fill();

            // Grin teeth
            ctx.fillStyle = '#fff';
            for (let t = -30; t <= 30; t += 10) {
                ctx.fillRect(t, 22, 6, 12);
            }

            // Boss HP overhead
            ctx.fillStyle = '#ff1744';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(`👑 TROLL KRAL: ${boss.hp} CAN`, -60, -boss.h / 2 - 12);

            ctx.restore();
        }

        // --- Draw Player ---
        if (!player.isDead) {
            drawPlayer();
        }

        // --- Draw Particles ---
        for (const p of particles) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        }

        ctx.restore();

        // --- Inverted Controls Warning Overlay ---
        if (player.isInvertedControls) {
            ctx.fillStyle = 'rgba(255, 0, 85, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff1744';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText('⚠️ KONTROLLER TERS! (SOL SAĞ OLDU)', canvas.width / 2 - 190, 70);
        }
    }

    function drawPlayer() {
        const px = player.x;
        const py = player.y;
        const pw = player.width;
        const ph = player.height;

        // Player Body: Cute little derp meme hero with cap
        ctx.fillStyle = '#29b6f6'; // Blue overalls
        ctx.fillRect(px + 4, py + 16, pw - 8, ph - 20);

        // Legs
        ctx.fillStyle = '#0277bd';
        ctx.fillRect(px + 6, py + ph - 8, 8, 8);
        ctx.fillRect(px + pw - 14, py + ph - 8, 8, 8);

        // Meme Head
        ctx.fillStyle = '#ffe0b2';
        ctx.beginPath();
        ctx.arc(px + pw / 2, py + 12, 14, 0, Math.PI * 2);
        ctx.fill();

        // Eyes & Derp smile
        ctx.fillStyle = '#000';
        if (player.facingRight) {
            ctx.fillRect(px + pw / 2, py + 8, 3, 3);
            ctx.fillRect(px + pw / 2 + 6, py + 8, 3, 3);
            // Grin
            ctx.beginPath();
            ctx.arc(px + pw / 2 + 3, py + 14, 5, 0, Math.PI);
            ctx.stroke();
        } else {
            ctx.fillRect(px + pw / 2 - 8, py + 8, 3, 3);
            ctx.fillRect(px + pw / 2 - 2, py + 8, 3, 3);
            // Grin
            ctx.beginPath();
            ctx.arc(px + pw / 2 - 5, py + 14, 5, 0, Math.PI);
            ctx.stroke();
        }

        // Troll Cap
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(px + 4, py - 1, pw - 8, 6);
        ctx.fillRect(player.facingRight ? px + pw - 8 : px - 2, py + 2, 8, 3);
    }

    // ========================================================================
    // 🚀 INITIALIZATION & RESIZE
    // ========================================================================
    function resizeCanvas() {
        const container = document.getElementById('game-container');
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

    // Auto-boot
    resizeCanvas();
    updateRank();
    loadStage(1);
    gameLoopId = requestAnimationFrame(mainLoop);

    // Initial hint popup
    setTimeout(() => {
        showMemePopup("TROLOLO DÜNYASINA HOŞGELDİN! 🤪", "Gördüğün hiçbir şeye güvenme, arkana yaslan ve eğlen!");
    }, 600);

})();
