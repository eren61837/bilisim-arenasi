// stickwar.js - Authentic Stick War: Legacy Web Game Engine
// Complete with all units, ballistic arrows, shield blocks, magic summons, giant smashes,
// and dynamic music crossfading: "Hymn For The Weekend" on Attack, "Run From Your Demons" on Defend/Retreat.
(function () {
    'use strict';

    /* ==========================================================================
       1. GAME CONSTANTS & CONFIGURATION
       ========================================================================== */
    const WORLD_WIDTH = 3800;
    const WORLD_HEIGHT = 700;
    const GROUND_Y = 560;

    const UNIT_TYPES = {
        miner: {
            name: 'Madenci',
            cost: 150,
            pop: 1,
            hp: 110,
            speed: 2.3,
            range: 40,
            damage: 9,
            attackCd: 1.0,
            avatar: '⛏️',
            desc: 'Altın madenlerini kazar, heykele altın taşır.'
        },
        sword: {
            name: 'Kılıçlı',
            cost: 125,
            pop: 1,
            hp: 130,
            speed: 3.8,
            range: 45,
            damage: 18,
            attackCd: 0.7,
            avatar: '🗡️',
            desc: 'Hızlı piyade, seri kılıç darbeleri indirir.'
        },
        archer: {
            name: 'Okçu',
            cost: 300,
            pop: 1,
            hp: 95,
            speed: 2.9,
            range: 520,
            damage: 22,
            attackCd: 1.3,
            avatar: '🏹',
            desc: 'Balistik yay ile havadan menzilli ok fırlatır.'
        },
        spear: {
            name: 'Mızrakçı',
            cost: 500,
            pop: 2,
            hp: 330,
            speed: 2.1,
            range: 65,
            damage: 32,
            attackCd: 1.1,
            avatar: '🛡️',
            desc: 'Ağır kalkanlı ve mızraklı savaşçı. Hasarı %75 engeller.'
        },
        mage: {
            name: 'Büyücü',
            cost: 1200,
            pop: 3,
            hp: 240,
            speed: 1.7,
            range: 440,
            damage: 55,
            attackCd: 2.2,
            avatar: '🧙',
            desc: 'Yerden patlayan büyü sütunu ve iskelet savaşçılar çağırır.'
        },
        giant: {
            name: 'Dev',
            cost: 1500,
            pop: 4,
            hp: 950,
            speed: 1.3,
            range: 85,
            damage: 75,
            attackCd: 1.9,
            avatar: '👹',
            desc: 'Devasa sopasıyla yeri sarsar, düşmanları havaya savurur.'
        },
        meric: {
            name: 'Şifacı (Meric)',
            cost: 200,
            mana: 80,
            pop: 1,
            hp: 120,
            speed: 2.2,
            range: 220,
            damage: 0,
            heal: 28,
            attackCd: 1.4,
            avatar: '✨',
            desc: 'Yaralı dost askerleri kutsal altın ışıkla iyileştirir.'
        },
        bomber: {
            name: 'Bombacı (Bomber)',
            cost: 200,
            pop: 1,
            hp: 85,
            speed: 4.6,
            range: 35,
            damage: 85,
            attackCd: 0.5,
            avatar: '💣',
            desc: 'Barut fıçısıyla hızla koşar ve intihar patlaması yapar.'
        },
        juggerknight: {
            name: 'Kaos Şövalyesi',
            cost: 650,
            pop: 2,
            hp: 440,
            speed: 2.0,
            range: 60,
            damage: 38,
            attackCd: 1.0,
            avatar: '🪓',
            desc: 'Ağır zırhlı Kaos devi, dev baltasıyla döner saldırı yapar.'
        },
        marrowkai: {
            name: 'Marrowkai',
            cost: 1400,
            pop: 3,
            hp: 280,
            speed: 1.6,
            range: 420,
            damage: 60,
            attackCd: 2.0,
            avatar: '💀',
            desc: 'Kaos büyücüsü, zehir bulutu ve kara ruhlar fırlatır.'
        },
        crawler: {
            name: 'Minyon (Crawler)',
            cost: 0,
            pop: 0,
            hp: 65,
            speed: 4.2,
            range: 35,
            damage: 14,
            attackCd: 0.6,
            avatar: '💀',
            desc: 'Kaos ordusunun 4 ayaklı hızlı yaratığı.'
        }
    };

    /* ==========================================================================
       2. AUDIO & DYNAMIC MUSIC ENGINE
       ========================================================================== */
    const SoundManager = {
        ctx: null,
        audioAttack: null,
        audioDefend: null,
        isMuted: false,
        currentTrack: 'defend', // default: defend (Run From Your Demons)
        userInteracted: false,
        fadeInterval: null,

        init() {
            this.audioAttack = document.getElementById('audio-attack');
            this.audioDefend = document.getElementById('audio-defend');

            if (this.audioAttack) this.audioAttack.volume = 0;
            if (this.audioDefend) this.audioDefend.volume = 0;

            const startAudioOnAction = () => {
                if (this.userInteracted) return;
                this.userInteracted = true;
                if (!this.ctx) {
                    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
                }
                this.playModeMusic(this.currentTrack);
                window.removeEventListener('click', startAudioOnAction);
                window.removeEventListener('keydown', startAudioOnAction);
            };

            window.addEventListener('click', startAudioOnAction);
            window.addEventListener('keydown', startAudioOnAction);

            const muteBtn = document.getElementById('btn-sw-mute');
            if (muteBtn) {
                muteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleMute();
                });
            }
        },

        toggleMute() {
            this.isMuted = !this.isMuted;
            const muteBtn = document.getElementById('btn-sw-mute');
            if (muteBtn) muteBtn.textContent = this.isMuted ? '🔇' : '🔊';

            if (this.isMuted) {
                if (this.audioAttack) this.audioAttack.volume = 0;
                if (this.audioDefend) this.audioDefend.volume = 0;
            } else {
                this.playModeMusic(this.currentTrack);
            }
        },

        // DYNAMIC MUSIC CROSSFADE:
        // 'attack' => Hymn For The Weekend
        // 'defend' or 'retreat' => Run From Your Demons
        playModeMusic(mode) {
            this.currentTrack = mode;
            const trackLabel = document.getElementById('sw-track-name');

            if (mode === 'attack') {
                if (trackLabel) trackLabel.textContent = 'Hymn For The Weekend (Saldırı 🔥)';
                this.crossfade(this.audioAttack, this.audioDefend);
            } else {
                // defend or retreat
                const label = mode === 'retreat' ? 'Run From Your Demons (Kaleye Sığınma 🏰)' : 'Run From Your Demons (Savunma 🛡️)';
                if (trackLabel) trackLabel.textContent = label;
                this.crossfade(this.audioDefend, this.audioAttack);
            }
        },

        crossfade(targetAudio, sourceAudio) {
            if (!this.userInteracted || this.isMuted) return;

            if (targetAudio && targetAudio.paused) {
                targetAudio.play().catch(() => {});
            }

            if (this.fadeInterval) clearInterval(this.fadeInterval);

            let step = 0;
            const steps = 15;
            const maxVol = 0.75;

            this.fadeInterval = setInterval(() => {
                step++;
                const progress = step / steps;

                if (targetAudio) {
                    targetAudio.volume = Math.min(maxVol, targetAudio.volume + (maxVol / steps));
                }
                if (sourceAudio) {
                    sourceAudio.volume = Math.max(0, sourceAudio.volume - (maxVol / steps));
                }

                if (step >= steps) {
                    clearInterval(this.fadeInterval);
                    if (targetAudio) targetAudio.volume = maxVol;
                    if (sourceAudio) {
                        sourceAudio.volume = 0;
                        sourceAudio.pause();
                    }
                }
            }, 40);
        },

        playSfx(type) {
            if (this.isMuted) return;
            if (!this.ctx) {
                try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return; }
            }
            if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            if (type === 'mine') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'goldDeposit') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1300, now + 0.18);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
                osc.start(now);
                osc.stop(now + 0.18);
            } else if (type === 'slash') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(450, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.1);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'bow') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'arrowHit') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(280, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'shieldBlock') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'magicBoom') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
            } else if (type === 'giantSmash') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(90, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
                osc.start(now);
                osc.stop(now + 0.6);
            }
        },

        playVoice(unitType) {
            if (this.isMuted) return;
            if ('speechSynthesis' in window) {
                try {
                    window.speechSynthesis.cancel();
                    const voiceMap = {
                        miner: 'Miner ready!',
                        sword: 'Swordwrath!',
                        archer: 'Archidons!',
                        spear: 'Speartons!',
                        mage: 'Magikill!',
                        giant: 'Giant!'
                    };
                    const text = voiceMap[unitType];
                    if (!text) return;
                    const u = new SpeechSynthesisUtterance(text);
                    u.rate = 1.25;
                    u.pitch = unitType === 'giant' ? 0.6 : (unitType === 'spear' ? 0.85 : 1.1);
                    u.volume = 0.85;
                    window.speechSynthesis.speak(u);
                } catch (_) {}
            }
        },

        playOrderFanfare(mode) {
            if (this.isMuted) return;
            if (!this.ctx) {
                try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return; }
            }
            const now = this.ctx.currentTime;
            if (mode === 'attack') {
                // Brass War Horn Fanfare (triad: C4 -> E4 -> G4 -> C5)
                [261.6, 329.6, 392.0, 523.2].forEach((freq, i) => {
                    const osc = this.ctx.createOscillator();
                    const g = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now + i * 0.12);
                    g.gain.setValueAtTime(0, now + i * 0.12);
                    g.gain.linearRampToValueAtTime(0.25, now + i * 0.12 + 0.04);
                    g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.35);
                    osc.connect(g);
                    g.connect(this.ctx.destination);
                    osc.start(now + i * 0.12);
                    osc.stop(now + i * 0.12 + 0.35);
                });
            } else if (mode === 'defend') {
                // Heavy War Drums
                [0, 0.15, 0.3, 0.45].forEach((t, i) => {
                    const osc = this.ctx.createOscillator();
                    const g = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(140 - i * 15, now + t);
                    osc.frequency.exponentialRampToValueAtTime(35, now + t + 0.18);
                    g.gain.setValueAtTime(0.35, now + t);
                    g.gain.exponentialRampToValueAtTime(0.01, now + t + 0.18);
                    osc.connect(g);
                    g.connect(this.ctx.destination);
                    osc.start(now + t);
                    osc.stop(now + t + 0.18);
                });
            } else if (mode === 'retreat') {
                // Retreat bugle (High -> Low drop)
                [587.3, 440.0, 349.2].forEach((freq, i) => {
                    const osc = this.ctx.createOscillator();
                    const g = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now + i * 0.14);
                    g.gain.setValueAtTime(0.2, now + i * 0.14);
                    g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.14 + 0.28);
                    osc.connect(g);
                    g.connect(this.ctx.destination);
                    osc.start(now + i * 0.14);
                    osc.stop(now + i * 0.14 + 0.28);
                });
            }
        }
    };

    /* ==========================================================================
       3. GAME ENGINE & STATE
       ========================================================================== */
    const Game = {
        canvas: null,
        ctx: null,
        width: 1200,
        height: 700,

        // Camera
        camX: 0,
        camTargetX: 0,
        camDragStartX: 0,
        isDraggingCam: false,

        // Game State
        orderMode: 'defend', // 'defend' | 'attack' | 'retreat'
        gold: 500,
        mana: 150,
        maxMana: 500,
        pop: 0,
        maxPop: 50,
        isStickWar2Mode: false,
        rageTimer: 0,

        enemyGold: 500,
        enemyPop: 0,
        enemyMaxPop: 50,
        enemyAIState: 'defend',
        enemySpawnTimer: 0,

        // Statues
        statues: {
            order: { x: 190, maxHp: 3000, hp: 3000, side: 'order' },
            chaos: { x: 3610, maxHp: 3000, hp: 3000, side: 'chaos' }
        },

        // Castles
        castles: {
            order: { x: 80, archerY: GROUND_Y - 225, fireCd: 0 },
            chaos: { x: 3720, archerY: GROUND_Y - 225, fireCd: 0 }
        },

        currentChapter: 1,

        // Gold Mines (2 per side + 1 central rich mine)
        goldMines: [
            { id: 1, x: 420, capacity: 99999, name: 'Düzen İç Maden' },
            { id: 2, x: 800, capacity: 99999, name: 'Düzen Dış Maden' },
            { id: 3, x: 1900, capacity: 99999, name: 'Büyük Merkez Maden (Zengin!)', isRich: true },
            { id: 4, x: 3000, capacity: 99999, name: 'Kaos Dış Maden' },
            { id: 5, x: 3380, capacity: 99999, name: 'Kaos İç Maden' }
        ],

        // Entities
        units: [],
        arrows: [],
        particles: [],
        floatingTexts: [],
        magicSpells: [],

        // Manual Control
        controlledUnit: null,
        keys: { a: false, d: false, space: false, s: false, q: false, f: false },
        mouseX: 0,
        mouseY: 0,
        worldMouseX: 0,
        worldMouseY: 0,

        // Upgrades
        upgrades: {
            minerBag: false,
            swordDamage: false,
            fireArrows: false,
            ironShield: false,
            statueArmor: false
        },

        // Stats & Timers
        statsKills: 0,
        statsGoldMined: 0,
        gameStartTime: Date.now(),
        isGameOver: false,
        screenShake: 0,

        // Online Multiplayer State
        ws: null,
        isOnlineMatch: false,
        onlineMode: null,
        onlineSide: 'order',
        onlineRoomId: null,
        opponentName: 'Rakip',

        /* INITIALIZATION */
        init() {
            this.canvas = document.getElementById('stickwar-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());

            SoundManager.init();
            this.initOnlineMultiplayer();

            this.inMainMenu = true;
            this.selectedSkin = localStorage.getItem('sw_skin') || 'classic';

            this.bindEvents();
            this.initMinimap();
            this.updateSkinsUI();

            // Set music for menu
            SoundManager.playModeMusic('defend');

            // Start Animation Loop (keeps background alive while in menu)
            requestAnimationFrame((ts) => this.loop(ts));
        },

        startMode(mode) {
            this.hideMainMenu();
            this.inMainMenu = false;

            if (mode === 'campaign') {
                this.startChapter(1);
            } else if (mode === 'tournament') {
                this.startChapter(8);
            } else if (mode === 'endless') {
                this.startChapter(9);
            } else if (mode === '1v1') {
                this.startChapter(6);
            } else if (mode === '2v2') {
                this.startChapter(7);
            }
        },

        showMainMenu() {
            this.inMainMenu = true;
            const menuScreen = document.getElementById('screen-sw-main-menu');
            if (menuScreen) menuScreen.classList.remove('hidden');
            SoundManager.playModeMusic('defend');
        },

        hideMainMenu() {
            const menuScreen = document.getElementById('screen-sw-main-menu');
            if (menuScreen) menuScreen.classList.add('hidden');
        },

        openSkinsModal() {
            const m = document.getElementById('modal-sw-skins');
            if (m) m.classList.remove('hidden');
            this.updateSkinsUI();
        },

        openTournamentModal() {
            const m = document.getElementById('modal-sw-tournament');
            if (m) m.classList.remove('hidden');
        },

        updateSkinsUI() {
            const skin = this.selectedSkin || 'classic';
            document.querySelectorAll('.skin-card').forEach(card => {
                const s = card.getAttribute('data-skin');
                const isEquipped = (s === skin);
                card.classList.toggle('equipped', isEquipped);
                const btn = card.querySelector('.btn-equip-skin');
                if (btn) {
                    btn.classList.toggle('active-equipped', isEquipped);
                    btn.textContent = isEquipped ? 'KUŞANILDI ✅' : 'KUŞAN 👕';
                }
            });
        },

        initOnlineMultiplayer() {
            try {
                const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
                this.ws = new WebSocket(`${proto}//${location.host}`);
                this.ws.onmessage = (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        this.handleOnlineMessage(data);
                    } catch (_) {}
                };
            } catch (err) {
                console.warn('WS Init err:', err);
            }
        },

        startOnlineMatchmaking(mode) {
            const mmModal = document.getElementById('modal-sw-matchmaking');
            const mmTitle = document.getElementById('sw-mm-title');
            const mmSub = document.getElementById('sw-mm-sub');
            if (mmModal) mmModal.classList.remove('hidden');
            if (mmTitle) mmTitle.textContent = mode === '2v2' ? '👥 2v2 CANLI TAKIM SAVAŞI ARANIYOR...' : '⚔️ 1v1 CANLI RAKİP ARANIYOR...';
            if (mmSub) mmSub.textContent = 'Canlı sunucuya bağlanılıyor. Diğer oyuncunun girmesi bekleniyor...';

            this.onlineMode = mode;
            if (!this.ws || this.ws.readyState !== 1) {
                this.initOnlineMultiplayer();
            }

            const username = localStorage.getItem('portal_username') || 'Savaşçı_' + Math.floor(100 + Math.random() * 900);
            const trySend = () => {
                if (this.ws && this.ws.readyState === 1) {
                    this.ws.send(JSON.stringify({
                        type: 'sw_find_match',
                        mode: mode,
                        username: username
                    }));
                } else {
                    setTimeout(trySend, 250);
                }
            };
            trySend();
        },

        cancelOnlineMatchmaking() {
            const mmModal = document.getElementById('modal-sw-matchmaking');
            if (mmModal) mmModal.classList.add('hidden');
            if (this.ws && this.ws.readyState === 1) {
                this.ws.send(JSON.stringify({ type: 'sw_leave' }));
            }
        },

        sendOnlineAction(actionData) {
            if (!this.isOnlineMatch || !this.ws || this.ws.readyState !== 1) return;
            this.ws.send(JSON.stringify({
                type: 'sw_action',
                side: this.onlineSide,
                ...actionData
            }));
        },

        handleOnlineMessage(data) {
            if (data.type === 'sw_waiting') {
                const mmSub = document.getElementById('sw-mm-sub');
                if (mmSub) {
                    mmSub.textContent = data.mode === '2v2' ? 
                        `👥 Oyuncular bekleniyor... (${data.count || 1}/4 Oyuncu Hazır)` : 
                        '⏳ Rakip bekleniyor... İlk katılan oyuncuyla canlı düello başlayacak!';
                }
            } else if (data.type === 'sw_matched') {
                const mmModal = document.getElementById('modal-sw-matchmaking');
                if (mmModal) mmModal.classList.add('hidden');

                this.isOnlineMatch = true;
                this.onlineMode = data.mode;
                this.onlineSide = data.side || 'order';
                this.onlineRoomId = data.roomId;
                this.opponentName = data.opponentName || 'Online Rakip';

                this.resetMatch();
                this.addFloatingText(550, GROUND_Y - 160, `⚔️ CANLI SAVAŞ BAŞLADI! Rakip: ${this.opponentName}`, '#00e5ff');
                SoundManager.playOrderFanfare('attack');
            } else if (data.type === 'sw_action') {
                if (data.action === 'spawn') {
                    const enemySpawnSide = this.onlineSide === 'order' ? 'chaos' : 'order';
                    this.spawnUnit(enemySpawnSide, data.unitType);
                    this.addFloatingText(enemySpawnSide === 'chaos' ? 2900 : 200, GROUND_Y - 120, `⚠️ ${data.sender} [${data.unitType}] çağırdı!`, '#ff3d00');
                } else if (data.action === 'order') {
                    this.enemyAIState = data.order;
                    this.addFloatingText(2900, GROUND_Y - 150, `📢 Rakip Emri: ${data.order.toUpperCase()}`, '#ff9800');
                    SoundManager.playOrderFanfare(data.order);
                } else if (data.action === 'spell') {
                    const enemySide = this.onlineSide === 'order' ? 'chaos' : 'order';
                    if (data.spell === 'rage') {
                        this.screenShake = 6;
                        this.addFloatingText(2900, GROUND_Y - 160, '⚡ RAKİP ÖFKE BÜYÜSÜ ATTI!', '#ff1744');
                        this.units.forEach(u => { if (u.side === enemySide) { u.rageBoost = 2.0; } });
                    }
                }
            } else if (data.type === 'sw_statue_dmg') {
                if (data.targetSide && this.statues[data.targetSide]) {
                    this.statues[data.targetSide].hp = Math.max(0, data.newHp);
                    this.updateStatueUI();
                    if (this.statues[data.targetSide].hp <= 0) {
                        this.triggerGameOver(data.targetSide === 'chaos');
                    }
                }
            } else if (data.type === 'sw_opponent_left') {
                this.addFloatingText(550, GROUND_Y - 160, `🏆 ${data.name || 'Rakip'} savaştan kaçtı! ZAFER SENİN!`, '#00e676');
                this.triggerGameOver(true);
            }
        },

        resize() {
            const viewport = document.getElementById('canvas-viewport');
            if (!viewport || !this.canvas) return;
            this.width = viewport.clientWidth;
            this.height = viewport.clientHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        },

        bindEvents() {
            // Main Menu Buttons
            document.getElementById('btn-menu-campaign')?.addEventListener('click', () => this.startMode('campaign'));
            document.getElementById('btn-menu-tournament')?.addEventListener('click', () => this.openTournamentModal());
            document.getElementById('btn-menu-endless')?.addEventListener('click', () => this.startMode('endless'));
            document.getElementById('btn-menu-1v1')?.addEventListener('click', () => this.startOnlineMatchmaking('1v1'));
            document.getElementById('btn-menu-2v2')?.addEventListener('click', () => this.startOnlineMatchmaking('2v2'));
            document.getElementById('btn-menu-skins')?.addEventListener('click', () => this.openSkinsModal());
            document.getElementById('btn-menu-armory')?.addEventListener('click', () => {
                document.getElementById('modal-upgrades')?.classList.remove('hidden');
                this.updateUpgradeButtons();
            });

            // In-Game Top Bar Return to Menu
            document.getElementById('btn-sw-back-to-menu')?.addEventListener('click', () => this.showMainMenu());

            // Modal Close Buttons
            document.getElementById('btn-close-skins')?.addEventListener('click', () => {
                document.getElementById('modal-sw-skins')?.classList.add('hidden');
            });
            document.getElementById('btn-close-tournament')?.addEventListener('click', () => {
                document.getElementById('modal-sw-tournament')?.classList.add('hidden');
            });
            document.getElementById('btn-start-tournament-match')?.addEventListener('click', () => {
                document.getElementById('modal-sw-tournament')?.classList.add('hidden');
                this.startMode('tournament');
            });

            // Equip Skin Buttons
            document.querySelectorAll('.btn-equip-skin').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const card = btn.closest('.skin-card');
                    const skin = card ? card.getAttribute('data-skin') : btn.getAttribute('data-skin');
                    if (skin) {
                        this.selectedSkin = skin;
                        try { localStorage.setItem('sw_skin', skin); } catch(_) {}
                        this.updateSkinsUI();
                        this.addFloatingText(this.camX + this.width / 2, 200, `👕 Kostüm Kuşanıldı: ${skin.toUpperCase()}`, '#ffd700');
                    }
                });
            });

            // Exit Rating Modal (Portale Giderken Puanlama)
            let swRating = 5;
            const starEls = document.querySelectorAll('#modal-exit-rating #exit-stars span');
            starEls.forEach(star => {
                star.addEventListener('click', () => {
                    swRating = parseInt(star.getAttribute('data-star'), 10);
                    starEls.forEach(s => {
                        const val = parseInt(s.getAttribute('data-star'), 10);
                        s.style.color = val <= swRating ? '#ffd700' : '#555';
                    });
                });
            });

            document.getElementById('btn-submit-sw-rating')?.addEventListener('click', () => {
                try {
                    fetch('/api/ratings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ game: 'stickwar', stars: swRating })
                    }).catch(() => {});
                } catch (_) {}
                window.location.href = '/';
            });

            document.getElementById('btn-skip-sw-rating')?.addEventListener('click', () => {
                window.location.href = '/';
            });

            document.querySelectorAll('a[href="/"]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.getElementById('modal-exit-rating')?.classList.remove('hidden');
                });
            });

            // Formation buttons
            const btnDefend = document.getElementById('btn-order-defend');
            const btnAttack = document.getElementById('btn-order-attack');
            const btnRetreat = document.getElementById('btn-order-retreat');

            btnDefend.addEventListener('click', () => this.setOrderMode('defend'));
            btnAttack.addEventListener('click', () => this.setOrderMode('attack'));
            btnRetreat.addEventListener('click', () => this.setOrderMode('retreat'));

            // Stick War 2 Mode Toggle
            const btnMode = document.getElementById('btn-toggle-game-mode');
            if (btnMode) {
                btnMode.addEventListener('click', () => this.toggleGameMode());
            }

            // Stick War 2 Spells
            document.getElementById('btn-spell-rage')?.addEventListener('click', () => this.castSpell('rage'));
            document.getElementById('btn-spell-heal')?.addEventListener('click', () => this.castSpell('heal'));
            document.getElementById('btn-spell-meteor')?.addEventListener('click', () => this.castSpell('meteor'));

            // Unit Spawn Buttons
            document.querySelectorAll('.btn-recruit').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.getAttribute('data-type') || btn.id.replace('btn-spawn-', '');
                    const unitKey = type === 'sword' ? 'sword' : 
                                    type === 'archer' ? 'archer' : 
                                    type === 'spear' ? 'spear' : 
                                    type === 'meric' ? 'meric' :
                                    type === 'mage' ? 'mage' : 
                                    type === 'giant' ? 'giant' : 'miner';
                    this.purchaseUnit('order', unitKey);
                });
            });

            // Online Multiplayer Matchmaking Buttons
            document.getElementById('btn-sw-online-1v1')?.addEventListener('click', () => {
                this.startOnlineMatchmaking('1v1');
            });
            document.getElementById('btn-sw-online-2v2')?.addEventListener('click', () => {
                this.startOnlineMatchmaking('2v2');
            });
            document.getElementById('btn-mm-cancel')?.addEventListener('click', () => {
                this.cancelOnlineMatchmaking();
            });
            document.getElementById('btn-mm-fill-bots')?.addEventListener('click', () => {
                this.cancelOnlineMatchmaking();
                this.startChapter(this.onlineMode === '2v2' ? '7' : '6');
            });

            // Chapters Modal
            const chModal = document.getElementById('modal-sw-chapters');
            document.getElementById('btn-sw-chapters')?.addEventListener('click', () => {
                if (chModal) chModal.classList.remove('hidden');
            });
            document.getElementById('btn-close-chapters')?.addEventListener('click', () => {
                if (chModal) chModal.classList.add('hidden');
            });
            document.querySelectorAll('.btn-select-chapter').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const chId = btn.getAttribute('data-chapter');
                    this.startChapter(chId);
                });
            });

            // Upgrades Modal
            const upgModal = document.getElementById('modal-upgrades');
            document.getElementById('btn-sw-upgrades').addEventListener('click', () => {
                upgModal.classList.remove('hidden');
                this.updateUpgradeButtons();
            });
            document.getElementById('btn-close-upgrades').addEventListener('click', () => {
                upgModal.classList.add('hidden');
            });

            document.querySelectorAll('.btn-buy-upgrade').forEach(btn => {
                btn.addEventListener('click', () => {
                    const upg = btn.getAttribute('data-upgrade');
                    const cost = parseInt(btn.getAttribute('data-cost'), 10);
                    this.buyUpgrade(upg, cost);
                });
            });

            // Manual unit release
            document.getElementById('btn-mc-release').addEventListener('click', () => {
                this.releaseManualControl();
            });

            // Restart buttons
            document.getElementById('btn-sw-restart').addEventListener('click', () => this.resetMatch());
            document.getElementById('btn-go-restart').addEventListener('click', () => this.resetMatch());

            // Fullscreen
            document.getElementById('btn-sw-fullscreen').addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            });

            // Keyboard Controls
            window.addEventListener('keydown', (e) => {
                const tag = document.activeElement?.tagName;
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

                const k = e.key.toLowerCase();

                // Unit Recruitment Hotkeys (1-7)
                const recruitMap = {
                    '1': 'miner',
                    '2': 'sword',
                    '3': 'archer',
                    '4': 'spear',
                    '5': 'meric',
                    '6': 'mage',
                    '7': 'giant'
                };
                if (recruitMap[e.key]) {
                    const uKey = recruitMap[e.key];
                    this.purchaseUnit('order', uKey);
                    const btn = document.getElementById('btn-spawn-' + uKey);
                    if (btn) {
                        btn.classList.add('hotkey-active');
                        setTimeout(() => btn.classList.remove('hotkey-active'), 150);
                    }
                    return;
                }

                // Formation Stance Hotkeys (Z, X, C)
                if (k === 'z') { this.setOrderMode('defend'); return; }
                if (k === 'x') { this.setOrderMode('attack'); return; }
                if (k === 'c') { this.setOrderMode('retreat'); return; }

                // God Powers / Spells (R, T, Y) - only when not controlling a unit that uses R/T/Y
                if (k === 'r' && !this.controlledUnit) { this.castSpell('rage'); return; }
                if (k === 't' && !this.controlledUnit) { this.castSpell('heal'); return; }
                if (k === 'y' && !this.controlledUnit) { this.castSpell('meteor'); return; }

                // Cephanelik / Upgrades Modal Toggle (U)
                if (k === 'u') {
                    const upg = document.getElementById('modal-upgrades');
                    if (upg) {
                        upg.classList.toggle('hidden');
                        if (!upg.classList.contains('hidden')) this.updateUpgradeButtons();
                    }
                    return;
                }

                // Minimap Toggle (M)
                if (k === 'm') {
                    const mm = document.getElementById('minimap-container');
                    if (mm) mm.classList.toggle('hidden');
                    return;
                }

                // Manual soldier controls (A, D, S, Space, Q, F, Esc)
                if (k === 'a' || k === 'arrowleft') this.keys.a = true;
                if (k === 'd' || k === 'arrowright') this.keys.d = true;
                if (k === 's' || k === 'arrowdown') this.keys.s = true;
                if (k === ' ' || k === 'spacebar') {
                    this.keys.space = true;
                    e.preventDefault();
                }
                if (k === 'q') this.keys.q = true;
                if (k === 'f') this.keys.f = true;
                if (k === 'escape') {
                    if (this.controlledUnit) this.releaseManualControl();
                    const upg = document.getElementById('modal-upgrades');
                    if (upg) upg.classList.add('hidden');
                }
            });

            window.addEventListener('keyup', (e) => {
                const k = e.key.toLowerCase();
                if (k === 'a' || k === 'arrowleft') this.keys.a = false;
                if (k === 'd' || k === 'arrowright') this.keys.d = false;
                if (k === 's' || k === 'arrowdown') this.keys.s = false;
                if (k === ' ' || k === 'spacebar') this.keys.space = false;
                if (k === 'q') this.keys.q = false;
                if (k === 'f') this.keys.f = false;
            });

            // Mouse & Unit Selection
            this.canvas.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = e.clientX - rect.left;
                this.mouseY = e.clientY - rect.top;
                this.worldMouseX = this.mouseX + this.camX;
                this.worldMouseY = this.mouseY;

                if (this.isDraggingCam) {
                    const dx = e.clientX - this.camDragStartX;
                    this.camTargetX -= dx;
                    this.camDragStartX = e.clientX;
                }
            });

            this.canvas.addEventListener('mousedown', (e) => {
                if (e.button === 2) { // Right Click
                    e.preventDefault();
                    if (this.controlledUnit && this.controlledUnit.type === 'spear') {
                        this.controlledUnit.isShieldGuarding = true;
                    }
                    return;
                }

                if (e.button === 0) { // Left Click
                    // Check if clicked on a friendly unit to control it!
                    const clickedUnit = this.getUnitAt(this.worldMouseX, this.worldMouseY, 'order');
                    if (clickedUnit) {
                        this.selectManualControl(clickedUnit);
                    } else if (this.controlledUnit) {
                        // Attack action for controlled unit
                        this.performManualAttack(this.controlledUnit);
                    } else {
                        // Start camera drag
                        this.isDraggingCam = true;
                        this.camDragStartX = e.clientX;
                    }
                }
            });

            this.canvas.addEventListener('mouseup', (e) => {
                if (e.button === 0) this.isDraggingCam = false;
                if (e.button === 2 && this.controlledUnit) {
                    this.controlledUnit.isShieldGuarding = false;
                }
            });

            this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

            // Wheel zoom or horizontal scroll
            this.canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                this.camTargetX += e.deltaY * 1.5;
            }, { passive: false });
        },

        /* MINIMAP */
        initMinimap() {
            const mCanvas = document.getElementById('minimap-canvas');
            const mContainer = document.getElementById('minimap-container');
            if (!mCanvas || !mContainer) return;

            mContainer.addEventListener('click', (e) => {
                const rect = mContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = clickX / rect.width;
                this.camTargetX = (ratio * WORLD_WIDTH) - (this.width / 2);
            });
        },

        /* RECRUITMENT & ECONOMY */
        purchaseUnit(side, unitTypeKey) {
            const cfg = UNIT_TYPES[unitTypeKey];
            if (!cfg) return;

            if (side === 'order') {
                const isLeaf = (this.selectedSkin === 'leaf');
                const finalCost = isLeaf ? Math.round(cfg.cost * 0.8) : cfg.cost;

                if (this.gold < finalCost) {
                    this.addFloatingText(this.camX + this.width / 2, 200, 'Yetersiz Altın!', '#ff5252');
                    return;
                }
                if (cfg.mana && this.mana < cfg.mana) {
                    this.addFloatingText(this.camX + this.width / 2, 200, 'Yetersiz Mana! (' + cfg.mana + ' Mana Gerekli)', '#38bdf8');
                    return;
                }
                if (this.pop + cfg.pop > this.maxPop) {
                    this.addFloatingText(this.camX + this.width / 2, 200, `Nüfus Sınırı Dolu! (${this.pop}/${this.maxPop})`, '#ff5252');
                    return;
                }
                this.gold -= finalCost;
                if (cfg.mana) this.mana -= cfg.mana;
                this.spawnUnit('order', unitTypeKey);
                SoundManager.playVoice(unitTypeKey);
                this.updateUI();
                if (this.isOnlineMatch) {
                    this.sendOnlineAction({ action: 'spawn', unitType: unitTypeKey });
                }
            } else {
                if (this.enemyGold >= cfg.cost && (this.enemyPop + cfg.pop <= this.enemyMaxPop)) {
                    this.enemyGold -= cfg.cost;
                    this.spawnUnit('chaos', unitTypeKey);
                }
            }
        },

        /* STICK WAR 2: GAME MODE TOGGLE & SPELLS */
        toggleGameMode() {
            this.isStickWar2Mode = !this.isStickWar2Mode;
            const btn = document.getElementById('btn-toggle-game-mode');
            const spells = document.getElementById('sw-spells-group');
            const manaBox = document.getElementById('res-mana-box');
            const mericBtn = document.getElementById('btn-spawn-meric');

            if (this.isStickWar2Mode) {
                if (btn) btn.textContent = '👑 Mod: Stick War II (Order vs Chaos)';
                if (spells) spells.style.display = 'flex';
                if (manaBox) manaBox.style.display = 'flex';
                if (mericBtn) mericBtn.style.display = 'flex';
                this.addFloatingText(this.camX + this.width / 2, 180, 'STICK WAR 2: ORDER EMPIRE MODU AKTİF! 👑', '#ffd700');
            } else {
                if (btn) btn.textContent = '⚔️ Mod: Stick War Legacy';
                if (spells) spells.style.display = 'none';
                if (manaBox) manaBox.style.display = 'none';
                if (mericBtn) mericBtn.style.display = 'none';
                this.addFloatingText(this.camX + this.width / 2, 180, 'STICK WAR LEGACY MODU AKTİF! ⚔️', '#00e5ff');
            }
        },

        castSpell(type) {
            if (!this.isStickWar2Mode) return;

            if (type === 'rage') {
                if (this.mana < 100) {
                    this.addFloatingText(this.camX + this.width / 2, 200, 'Yetersiz Mana! (100 Gerekli)', '#38bdf8');
                    return;
                }
                this.mana -= 100;
                this.rageTimer = 9.0;
                this.screenShake = 6;
                SoundManager.playSfx('giantSmash');
                this.addFloatingText(this.camX + this.width / 2, 160, '🔥 ÇILGIN ÖFKE AKTİF! (2x HIZ & HASAR)', '#ff3d00');

                // Enrage melee units
                this.units.forEach(u => {
                    if (u.side === 'order' && (u.type === 'sword' || u.type === 'spear')) {
                        u.speed *= 1.4;
                        u.damage = Math.round(u.damage * 1.5);
                        for (let p = 0; p < 8; p++) {
                            this.particles.push({
                                x: u.x + (Math.random() - 0.5) * 20,
                                y: u.y - 30,
                                vx: (Math.random() - 0.5) * 40,
                                vy: -Math.random() * 80 - 40,
                                color: '#ff3d00',
                                size: 4,
                                life: 0.6,
                                maxLife: 0.6
                            });
                        }
                    }
                });
            } else if (type === 'heal') {
                if (this.mana < 150) {
                    this.addFloatingText(this.camX + this.width / 2, 200, 'Yetersiz Mana! (150 Gerekli)', '#38bdf8');
                    return;
                }
                this.mana -= 150;
                SoundManager.playSfx('magicBoom');
                this.addFloatingText(this.camX + this.width / 2, 160, '✨ KUTSAL İYİLEŞTİRME (%40 CAN YENİLENDİ)', '#00e676');

                this.units.forEach(u => {
                    if (u.side === 'order' && u.hp > 0) {
                        const healAmt = Math.round(u.maxHp * 0.4);
                        u.hp = Math.min(u.maxHp, u.hp + healAmt);
                        this.addFloatingText(u.x, u.y - 50, `+${healAmt}`, '#00e676');
                        for (let p = 0; p < 5; p++) {
                            this.particles.push({
                                x: u.x + (Math.random() - 0.5) * 20,
                                y: u.y - 20,
                                vx: (Math.random() - 0.5) * 30,
                                vy: -Math.random() * 60 - 30,
                                color: '#00e676',
                                size: 3,
                                life: 0.6,
                                maxLife: 0.6
                            });
                        }
                    }
                });
            } else if (type === 'meteor') {
                if (this.mana < 250) {
                    this.addFloatingText(this.camX + this.width / 2, 200, 'Yetersiz Mana! (250 Gerekli)', '#38bdf8');
                    return;
                }
                this.mana -= 250;
                this.screenShake = 18;
                SoundManager.playSfx('giantSmash');

                // Determine strike zone (enemy frontline or enemy statue)
                const enemyUnits = this.units.filter(u => u.side === 'chaos' && u.hp > 0);
                const strikeX = enemyUnits.length > 0 ? enemyUnits[0].x : this.statues.chaos.x;

                this.addFloatingText(strikeX, 180, '☄️ GÖKTAŞI ÇARPMASI!', '#ff3d00');

                // Blast damage
                this.units.forEach(u => {
                    if (u.side === 'chaos' && u.hp > 0 && Math.abs(u.x - strikeX) < 220) {
                        this.damageUnit(u, 260, { x: strikeX });
                        u.vy = -340;
                        u.vx = (u.x > strikeX ? 1 : -1) * 120;
                    }
                });

                if (Math.abs(this.statues.chaos.x - strikeX) < 240) {
                    this.damageStatue('chaos', 200);
                }

                // Meteor explosion particles
                for (let p = 0; p < 45; p++) {
                    this.particles.push({
                        x: strikeX + (Math.random() - 0.5) * 80,
                        y: GROUND_Y - Math.random() * 20,
                        vx: (Math.random() - 0.5) * 260,
                        vy: -Math.random() * 380 - 120,
                        color: Math.random() < 0.5 ? '#ff3d00' : '#ffd700',
                        size: Math.random() * 6 + 3,
                        life: 0.9,
                        maxLife: 0.9
                    });
                }
            }
            this.updateUI();
        },

        spawnUnit(side, type) {
            const cfg = UNIT_TYPES[type];
            const isOrder = side === 'order';
            const spawnX = isOrder ? 140 + Math.random() * 80 : 3660 - Math.random() * 80;

            const unit = {
                id: Math.random().toString(36).substring(2, 9),
                side: side,
                type: type,
                x: spawnX,
                y: GROUND_Y,
                vx: 0,
                vy: 0,
                hp: cfg.hp,
                maxHp: cfg.hp,
                speed: cfg.speed,
                range: cfg.range,
                damage: cfg.damage,
                attackCd: cfg.attackCd,
                lastAttack: 0,
                facing: isOrder ? 1 : -1,

                // Animation state
                walkCycle: Math.random() * Math.PI * 2,
                animAction: 'idle', // 'idle' | 'walk' | 'attack' | 'mine' | 'block' | 'hurt'
                animTimer: 0,

                // Miner specific
                carriedGold: 0,
                targetMine: null,
                miningTimer: 0,

                // Spearton specific
                isShieldGuarding: false,
                spearThrowCd: 0,

                // Mage specific
                spellCd: 0,
                summonCd: 0
            };

            // Apply Upgrades and Skin Perks for Order
            unit.freezeTimer = 0;
            unit.burnTimer = 0;

            if (isOrder) {
                unit.skin = this.selectedSkin || 'classic';
                if (unit.skin === 'leaf') {
                    unit.speed = Number((unit.speed * 1.20).toFixed(2));
                }
                if (type === 'sword' && this.upgrades.swordDamage) {
                    unit.damage = Math.round(unit.damage * 1.35);
                    unit.speed += 0.5;
                }
                if (type === 'spear' && this.upgrades.ironShield) {
                    unit.hp += 80;
                    unit.maxHp += 80;
                }
            } else {
                unit.skin = 'classic';
            }

            this.units.push(unit);
            this.recalcPop();
            return unit;
        },

        recalcPop() {
            let pOrder = 0, pChaos = 0;
            this.units.forEach(u => {
                const c = UNIT_TYPES[u.type];
                if (u.side === 'order') {
                    if (!u.isAlly) pOrder += c.pop;
                } else {
                    pChaos += c.pop;
                }
            });
            this.pop = pOrder;
            this.enemyPop = pChaos;
            this.updateUI();
        },

        setOrderMode(mode) {
            this.orderMode = mode;
            document.querySelectorAll('.btn-formation').forEach(b => b.classList.remove('active'));
            const activeBtn = document.getElementById('btn-order-' + mode);
            if (activeBtn) activeBtn.classList.add('active');

            // Play authentic war horn / drum / retreat brass fanfare
            SoundManager.playOrderFanfare(mode);

            // CRITICAL USER REQUIREMENT:
            // "saldırı yaparken hymn for weekejnd çalsın savunmada yada en gerideyken run from your demons çalsın"
            SoundManager.playModeMusic(mode);

            if (this.isOnlineMatch) {
                this.sendOnlineAction({ action: 'order', order: mode });
            }
        },

        /* MANUAL DIRECT CONTROL */
        selectManualControl(unit) {
            this.controlledUnit = unit;
            const card = document.getElementById('sw-manual-card');
            const nameEl = document.getElementById('mc-name');
            const avatarEl = document.getElementById('mc-avatar');
            const secHint = document.getElementById('mc-secondary-hint');
            const specHint = document.getElementById('mc-special-hint');

            if (card) card.classList.remove('hidden');
            if (nameEl) nameEl.textContent = `${UNIT_TYPES[unit.type].name} (Doğrudan Kontrol)`;
            if (avatarEl) avatarEl.textContent = UNIT_TYPES[unit.type].avatar;

            if (unit.type === 'spear') {
                secHint.textContent = '[S / Sağ Tık] Kalkan Duvarı';
                specHint.textContent = '[Q / F] Mızrak Fırlat';
            } else if (unit.type === 'archer') {
                secHint.textContent = '[S / Sağ Tık] Hassas Nişan';
                specHint.textContent = '[SPACE] Seri Ok';
            } else if (unit.type === 'mage') {
                secHint.textContent = '[S / Sağ Tık] Büyü Kalkanı';
                specHint.textContent = '[Q / F] İskelet Çağır';
            } else if (unit.type === 'giant') {
                secHint.textContent = '[S / Sağ Tık] Yere Vuruş';
                specHint.textContent = '[SPACE] Dev Sopası';
            } else {
                secHint.textContent = '[S / Sağ Tık] Savunma';
                specHint.textContent = '[Q / F] Hızlı Atılma';
            }
        },

        releaseManualControl() {
            this.controlledUnit = null;
            const card = document.getElementById('sw-manual-card');
            if (card) card.classList.add('hidden');
        },

        performManualAttack(unit) {
            const now = Date.now() / 1000;
            if (now - unit.lastAttack < unit.attackCd) return;

            unit.lastAttack = now;
            unit.animAction = 'attack';
            unit.animTimer = 0.3;

            if (unit.type === 'archer') {
                this.fireArrow(unit, this.worldMouseX, this.worldMouseY);
            } else if (unit.type === 'mage') {
                this.castMageSpell(unit, this.worldMouseX, this.worldMouseY);
            } else if (unit.type === 'marrowkai') {
                this.performMarrowkaiAttack(unit, this.worldMouseX, this.worldMouseY);
            } else if (unit.type === 'giant') {
                this.performGiantSmash(unit);
            } else if (unit.type === 'juggerknight') {
                this.performJuggerAttack(unit);
            } else if (unit.type === 'bomber') {
                this.detonateBomber(unit);
            } else if (unit.type === 'meric') {
                this.performMericHeal(unit);
            } else if (unit.type === 'miner') {
                // If near gold mine, double-speed rapid strike (+15 gold per strike)
                const mine = this.getNearestMine(unit.x);
                if (mine && Math.abs(unit.x - mine.x) < 95) {
                    unit.animAction = 'attack';
                    unit.animTimer = 0.25;
                    SoundManager.playSfx('mine');
                    this.addHitSparks(mine.x, GROUND_Y - 25, '#ffd700');
                    this.gold += 15;
                    this.statsGoldMined += 15;
                    this.updateResourceUI();
                    this.addFloatingText(unit.x, unit.y - 65, '+15 🟡 HIZLI KAZI!', '#ffd700');
                } else {
                    this.performMeleeAttack(unit);
                }
            } else {
                this.performMeleeAttack(unit);
            }
        },

        performManualSpecial(unit) {
            const now = Date.now() / 1000;
            if (!unit.specialCdTimer) unit.specialCdTimer = 0;
            if (now - unit.specialCdTimer < 2.0) return; // 2 sec cooldown for specials
            unit.specialCdTimer = now;

            if (unit.type === 'sword') {
                // Sword Jump
                unit.vy = -350;
                unit.vx = unit.facing * 180;
                unit.isJumpingSlash = true;
                SoundManager.playSfx('slash');
                this.addFloatingText(unit.x, unit.y - 60, 'Sıçrayış! ⚔️', '#00e5ff');
            } else if (unit.type === 'spear') {
                // Spear Throw
                SoundManager.playSfx('bow');
                unit.animAction = 'attack';
                unit.animTimer = 0.3;
                this.arrows.push({
                    side: unit.side,
                    x: unit.x + unit.facing * 20,
                    y: unit.y - 40,
                    vx: unit.facing * 800,
                    vy: -150,
                    damage: unit.damage * 2,
                    isFire: false,
                    isSpear: true,
                    stuck: false,
                    stuckTimer: 0,
                    life: 0
                });
                this.addFloatingText(unit.x, unit.y - 60, 'Mızrak Atışı! 🎯', '#00e5ff');
            } else if (unit.type === 'giant') {
                // Giant Earthquake (Slam)
                this.performGiantSmash(unit);
            } else if (unit.type === 'mage') {
                // Magikill Stun Blast or Summon
                SoundManager.playSfx('magicBoom');
                this.addFloatingText(unit.x, unit.y - 70, 'Gölge Şoku! 🔮', '#7c4dff');
                this.screenShake = 8;
                const targetSide = unit.side === 'order' ? 'chaos' : 'order';
                this.units.forEach(t => {
                    if (t.side === targetSide && t.hp > 0 && Math.abs(t.x - unit.x) < 200) {
                        this.damageUnit(t, unit.damage, unit);
                        t.vx = (t.x > unit.x ? 1 : -1) * 100;
                        t.animAction = 'hurt';
                        t.animTimer = 1.0; // Stun effect
                    }
                });
            }
        },

        /* COMBAT ACTIONS */
        performMeleeAttack(unit) {
            SoundManager.playSfx('slash');
            const targetSide = unit.side === 'order' ? 'chaos' : 'order';
            const hitBox = {
                x: unit.facing === 1 ? unit.x : unit.x - unit.range,
                y: unit.y - 70,
                w: unit.range + 20,
                h: 70
            };

            // Attack enemies
            let hitAny = false;
            this.units.forEach(target => {
                if (target.side === targetSide && target.hp > 0) {
                    if (target.x >= hitBox.x && target.x <= hitBox.x + hitBox.w) {
                        this.damageUnit(target, unit.damage, unit);
                        hitAny = true;
                    }
                }
            });

            // Attack enemy statue
            const enemyStatue = this.statues[targetSide];
            if (enemyStatue && enemyStatue.hp > 0) {
                if (Math.abs(unit.x - enemyStatue.x) <= unit.range + 30) {
                    this.damageStatue(targetSide, unit.damage);
                    hitAny = true;
                }
            }

            if (hitAny) {
                this.addHitSparks(unit.x + unit.facing * 30, unit.y - 40, '#ffd700');
            }
        },

        fireArrow(unit, targetX, targetY) {
            SoundManager.playSfx('bow');
            const startX = unit.x + unit.facing * 20;
            const startY = unit.y - 50;

            const dx = targetX - startX;
            const dy = (targetY || GROUND_Y - 40) - startY;
            const dist = Math.abs(dx);

            // Ballistic physics trajectory
            const flightTime = Math.max(0.4, Math.min(1.2, dist / 450));
            const vx = dx / flightTime;
            const vy = (dy - 0.5 * 900 * flightTime * flightTime) / flightTime;

            this.arrows.push({
                side: unit.side,
                x: startX,
                y: startY,
                vx: vx,
                vy: vy,
                damage: unit.damage,
                isFire: (unit.side === 'order' && this.upgrades.fireArrows),
                stuck: false,
                stuckTimer: 0,
                life: 0
            });
        },

        castMageSpell(unit, targetX, targetY) {
            SoundManager.playSfx('magicBoom');
            const blastX = Math.max(200, Math.min(WORLD_WIDTH - 200, targetX));

            this.magicSpells.push({
                side: unit.side,
                x: blastX,
                y: GROUND_Y,
                radius: 70,
                timer: 0.6, // delay before eruption
                erupted: false,
                damage: unit.damage
            });

            // Magic summoning particle ring
            for (let i = 0; i < 16; i++) {
                this.particles.push({
                    x: blastX + (Math.random() - 0.5) * 80,
                    y: GROUND_Y - Math.random() * 20,
                    vx: (Math.random() - 0.5) * 40,
                    vy: -Math.random() * 80 - 40,
                    color: '#00e5ff',
                    size: 4,
                    life: 0.8,
                    maxLife: 0.8
                });
            }
        },

        performGiantSmash(unit) {
            SoundManager.playSfx('giantSmash');
            this.screenShake = 12;
            const targetSide = unit.side === 'order' ? 'chaos' : 'order';
            const smashX = unit.x + unit.facing * 50;

            // AoE damage & massive knockback
            this.units.forEach(target => {
                if (target.side === targetSide && target.hp > 0) {
                    const dist = Math.abs(target.x - smashX);
                    if (dist < 130) {
                        this.damageUnit(target, unit.damage, unit);
                        target.vx = unit.facing * (150 - dist * 0.7);
                        target.vy = -180;
                    }
                }
            });

            // Damage enemy statue if close
            const enemyStatue = this.statues[targetSide];
            if (enemyStatue && Math.abs(smashX - enemyStatue.x) < 140) {
                this.damageStatue(targetSide, unit.damage * 1.5);
            }

            // Shockwave particles
            for (let i = 0; i < 20; i++) {
                this.particles.push({
                    x: smashX,
                    y: GROUND_Y,
                    vx: (Math.random() - 0.5) * 260,
                    vy: -Math.random() * 120,
                    color: '#d4a373',
                    size: Math.random() * 6 + 3,
                    life: 0.6,
                    maxLife: 0.6
                });
            }
        },

        /* STICK WAR 2 COMBAT ACTIONS */
        performMericHeal(unit) {
            const wounded = this.units
                .filter(u => u.side === unit.side && u.hp > 0 && u.hp < u.maxHp && u.id !== unit.id)
                .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

            if (!wounded) return false;

            unit.facing = wounded.x > unit.x ? 1 : -1;
            const healAmt = 35;
            wounded.hp = Math.min(wounded.maxHp, wounded.hp + healAmt);
            SoundManager.playSfx('magicBoom');
            this.addFloatingText(wounded.x, wounded.y - 45, `+${healAmt} ❤️`, '#00e676');

            for (let i = 0; i < 12; i++) {
                const lerp = Math.random();
                this.particles.push({
                    x: unit.x + (wounded.x - unit.x) * lerp,
                    y: unit.y - 35 + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 20,
                    vy: -Math.random() * 40 - 10,
                    color: '#00e676',
                    size: 3,
                    life: 0.5,
                    maxLife: 0.5
                });
            }
            return true;
        },

        detonateBomber(unit) {
            SoundManager.playSfx('giantSmash');
            this.screenShake = 16;
            const targetSide = unit.side === 'order' ? 'chaos' : 'order';
            const boomX = unit.x;

            this.addFloatingText(boomX, unit.y - 50, '💥 BOOM!', '#ff3d00');

            this.units.forEach(target => {
                if (target.side === targetSide && target.hp > 0) {
                    const dist = Math.abs(target.x - boomX);
                    if (dist < 110) {
                        this.damageUnit(target, unit.damage, unit);
                        target.vx = (target.x > boomX ? 1 : -1) * 220;
                        target.vy = -260;
                    }
                }
            });

            const enemyStatue = this.statues[targetSide];
            if (enemyStatue && Math.abs(boomX - enemyStatue.x) < 120) {
                this.damageStatue(targetSide, unit.damage);
            }

            for (let p = 0; p < 35; p++) {
                this.particles.push({
                    x: boomX + (Math.random() - 0.5) * 30,
                    y: GROUND_Y - 20 + (Math.random() - 0.5) * 30,
                    vx: (Math.random() - 0.5) * 240,
                    vy: -Math.random() * 300 - 60,
                    color: Math.random() < 0.6 ? '#ff3d00' : '#ffd700',
                    size: Math.random() * 5 + 3,
                    life: 0.7,
                    maxLife: 0.7
                });
            }

            unit.hp = 0;
        },

        performJuggerAttack(unit) {
            SoundManager.playSfx('slash');
            this.screenShake = 6;
            const targetSide = unit.side === 'order' ? 'chaos' : 'order';
            const hitBox = {
                x: unit.facing === 1 ? unit.x : unit.x - unit.range,
                y: unit.y - 75,
                w: unit.range + 30,
                h: 75
            };

            let hitAny = false;
            this.units.forEach(target => {
                if (target.side === targetSide && target.hp > 0) {
                    if (target.x >= hitBox.x && target.x <= hitBox.x + hitBox.w) {
                        this.damageUnit(target, unit.damage, unit);
                        target.vx = unit.facing * 80;
                        hitAny = true;
                    }
                }
            });

            const enemyStatue = this.statues[targetSide];
            if (enemyStatue && enemyStatue.hp > 0 && Math.abs(unit.x - enemyStatue.x) <= unit.range + 35) {
                this.damageStatue(targetSide, unit.damage);
                hitAny = true;
            }

            if (hitAny) {
                this.addHitSparks(unit.x + unit.facing * 35, unit.y - 45, '#e0e0e0');
            }
        },

        performMarrowkaiAttack(unit, targetX, targetY) {
            SoundManager.playSfx('magicBoom');
            const blastX = Math.max(200, Math.min(WORLD_WIDTH - 200, targetX));

            this.magicSpells.push({
                side: unit.side,
                x: blastX,
                y: GROUND_Y,
                radius: 85,
                timer: 0.5,
                erupted: false,
                damage: unit.damage,
                color: '#9c27b0'
            });

            for (let i = 0; i < 16; i++) {
                this.particles.push({
                    x: blastX + (Math.random() - 0.5) * 70,
                    y: GROUND_Y - Math.random() * 20,
                    vx: (Math.random() - 0.5) * 50,
                    vy: -Math.random() * 90 - 40,
                    color: '#9c27b0',
                    size: 4,
                    life: 0.8,
                    maxLife: 0.8
                });
            }
        },

        damageUnit(target, dmg, attacker) {
            if (target.hp <= 0) return;
            if (target.isGarrisoned && target.type !== 'archer') return; // Sheltered inside the castle fortress!

            let finalDmg = dmg;

            // Active Skin Perks when Order is dealing damage:
            const attackerSkin = (attacker && attacker.side === 'order') ? (attacker.skin || this.selectedSkin) : null;
            if (attackerSkin === 'savage') {
                finalDmg = Math.round(finalDmg * 1.35); // +35% Savage Bonus
            }

            // Target taking damage: Lava reflection (25% reflected to attacker with burn)
            const targetSkin = (target.side === 'order') ? (target.skin || this.selectedSkin) : null;
            if (targetSkin === 'lava' && attacker && attacker.hp > 0 && !target._isReflecting) {
                target._isReflecting = true;
                const reflectDmg = Math.max(1, Math.round(finalDmg * 0.25));
                attacker.hp -= reflectDmg;
                attacker.burnTimer = 2.5;
                this.addFloatingText(attacker.x, attacker.y - 60, `🔥 -${reflectDmg} LAV!`, '#ff3d00');
                this.addHitSparks(attacker.x, attacker.y - 30, '#ff5722');
                if (attacker.hp <= 0) {
                    attacker.hp = 0;
                    this.onUnitKilled(attacker, target);
                }
                target._isReflecting = false;
            }

            // Spearton Shield Wall Block
            if (target.type === 'spear') {
                const facingAttacker = (target.x < (attacker ? attacker.x : target.x) && target.facing === 1) ||
                                       (target.x > (attacker ? attacker.x : target.x) && target.facing === -1);
                if (target.isShieldGuarding || facingAttacker) {
                    const blockRate = (target.side === 'order' && this.upgrades.ironShield) ? 0.90 : 0.75;
                    finalDmg = Math.round(dmg * (1 - blockRate));
                    SoundManager.playSfx('shieldBlock');
                    this.addFloatingText(target.x, target.y - 60, 'ENGEL! 🛡️', '#00e5ff');
                    this.addHitSparks(target.x, target.y - 40, '#00e5ff');
                }
            }

            // Attacker dealing damage: Vamp lifesteal (25% heal)
            if (attackerSkin === 'vamp' && attacker && attacker.hp > 0) {
                const healAmt = Math.max(1, Math.round(finalDmg * 0.25));
                attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
                this.addFloatingText(attacker.x, attacker.y - 75, `+${healAmt} 🩸`, '#ff1744');
            }

            // Attacker dealing damage: Ice freeze (50% slow for 2.5s)
            if (attackerSkin === 'ice' && target && target.hp > 0) {
                target.freezeTimer = 2.5;
                this.addFloatingText(target.x, target.y - 70, '❄️ DONDU!', '#00e5ff');
            }

            // Attacker dealing damage: Voltaic chain lightning (shock jump 15 dmg)
            if (attackerSkin === 'voltaic' && target && target.hp > 0) {
                const jumpTarget = this.units.find(u => u.side === target.side && u.id !== target.id && u.hp > 0 && Math.abs(u.x - target.x) <= 180);
                if (jumpTarget) {
                    jumpTarget.hp -= 15;
                    this.addFloatingText(jumpTarget.x, jumpTarget.y - 65, '⚡ -15 ŞOK!', '#ffd700');
                    this.addHitSparks(jumpTarget.x, jumpTarget.y - 30, '#00e5ff');
                    if (jumpTarget.hp <= 0) {
                        jumpTarget.hp = 0;
                        this.onUnitKilled(jumpTarget, attacker);
                    }
                }
            }

            target.hp -= finalDmg;
            target.animAction = 'hurt';
            target.animTimer = 0.2;

            this.addFloatingText(target.x, target.y - 50, `-${finalDmg}`, target.side === 'order' ? '#ff5252' : '#ffd700');

            if (target.hp <= 0) {
                target.hp = 0;
                this.onUnitKilled(target, attacker);
            }
        },

        damageStatue(side, dmg) {
            const st = this.statues[side];
            if (!st || st.hp <= 0) return;

            let finalDmg = dmg;
            if (side === 'chaos' && this.selectedSkin === 'savage') {
                finalDmg = Math.round(finalDmg * 1.35); // Savage bonus damage to statues!
            }

            st.hp = Math.max(0, st.hp - finalDmg);
            SoundManager.playSfx('slash');
            this.screenShake = 6;

            this.addFloatingText(st.x, GROUND_Y - 140, `-${finalDmg} HEYKEL!`, side === 'order' ? '#ff3d00' : '#00e5ff');
            this.addHitSparks(st.x, GROUND_Y - 100, '#ffd700');

            this.updateStatueUI();

            if (st.hp <= 0) {
                this.triggerGameOver(side === 'chaos'); // if chaos statue fell, player won!
            }
        },

        onUnitKilled(target, attacker) {
            if (target.side === 'chaos') {
                this.statsKills++;
                this.gold += Math.round(UNIT_TYPES[target.type].cost * 0.35); // Bounty reward!
                this.addFloatingText(target.x, target.y - 70, `+${Math.round(UNIT_TYPES[target.type].cost * 0.35)} 🟡`, '#ffd700');

                // Kill Streak & Rapid Combo System
                const nowTime = performance.now();
                if (!this.comboStreak || nowTime - (this.lastKillTime || 0) > 4000) {
                    this.comboStreak = 1;
                } else {
                    this.comboStreak++;
                }
                this.lastKillTime = nowTime;

                if (this.comboStreak === 3) {
                    this.screenShake = 6;
                    SoundManager.playSfx('magicBoom');
                    this.addFloatingText(target.x, GROUND_Y - 180, '⚡ X3 ÇİFTE DARBE!', '#00e5ff');
                } else if (this.comboStreak === 5) {
                    this.screenShake = 10;
                    SoundManager.playSfx('giantSmash');
                    this.addFloatingText(target.x, GROUND_Y - 200, '🔥 X5 SERİ KATLİAM!', '#ff3d00');
                } else if (this.comboStreak === 8) {
                    this.screenShake = 15;
                    SoundManager.playSfx('giantSmash');
                    this.addFloatingText(target.x, GROUND_Y - 220, '💀 X8 DURDURULAMAZ!', '#ffd700');
                } else if (this.comboStreak >= 12 && this.comboStreak % 4 === 0) {
                    this.screenShake = 20;
                    SoundManager.playSfx('giantSmash');
                    this.addFloatingText(target.x, GROUND_Y - 240, `👑 X${this.comboStreak} İNAMORTA TANRISI!`, '#e040fb');
                }
            }

            if (this.controlledUnit && this.controlledUnit.id === target.id) {
                this.releaseManualControl();
            }

            // Death blood/smoke particles
            for (let i = 0; i < 12; i++) {
                this.particles.push({
                    x: target.x,
                    y: target.y - 30,
                    vx: (Math.random() - 0.5) * 80,
                    vy: -Math.random() * 80 - 20,
                    color: target.side === 'order' ? '#00e5ff' : '#ff3d00',
                    size: 3,
                    life: 0.6,
                    maxLife: 0.6
                });
            }

            this.recalcPop();
        },

        /* UPGRADES */
        buyUpgrade(key, cost) {
            if (this.gold < cost) {
                this.addFloatingText(this.camX + this.width / 2, 200, 'Yetersiz Altın!', '#ff5252');
                return;
            }

            this.gold -= cost;
            this.upgrades[key] = true;
            SoundManager.playSfx('goldDeposit');

            if (key === 'statueArmor') {
                this.statues.order.maxHp += 1000;
                this.statues.order.hp = Math.min(this.statues.order.maxHp, this.statues.order.hp + 1000);
                this.updateStatueUI();
            }

            this.updateUpgradeButtons();
            this.updateUI();
        },

        updateUpgradeButtons() {
            document.querySelectorAll('.btn-buy-upgrade').forEach(btn => {
                const upg = btn.getAttribute('data-upgrade');
                if (this.upgrades[upg]) {
                    btn.disabled = true;
                    btn.textContent = '✓ Satın Alındı';
                }
            });
        },

        /* ALLIED AI (2v2 MODE) */
        updateAllyAI(dt) {
            if (!this.allySpawnTimer) this.allySpawnTimer = 0;
            if (!this.allyGold) this.allyGold = 400;
            this.allyGold += 35 * dt;
            this.allySpawnTimer += dt;

            // Allied Commander recruits balanced reinforcements (Swords, Archers, Speartons, Mages)
            if (this.allySpawnTimer > 3.8) {
                this.allySpawnTimer = 0;
                const allyUnits = this.units.filter(u => u.side === 'order' && u.isAlly && u.hp > 0);
                if (allyUnits.length < 14) {
                    const pool = ['sword', 'sword', 'archer', 'spear', 'mage'];
                    const chosen = pool[Math.floor(Math.random() * pool.length)];
                    const cfg = UNIT_TYPES[chosen];
                    if (this.allyGold >= cfg.cost) {
                        this.allyGold -= cfg.cost;
                        const u = this.spawnUnit('order', chosen);
                        if (u) {
                            u.isAlly = true;
                            this.addFloatingText(u.x, GROUND_Y - 90, `🛡️ Müttefik ${cfg.name}!`, '#00e5ff');
                        }
                    }
                }
            }
        },

        /* AI LOGIC */
        updateAI(dt) {
            if (this.isOnlineMatch) {
                // Online Multiplayer: Real players control units, disable bot AI
                return;
            }

            if (this.is2v2 || this.currentChapter === 7) {
                this.updateAllyAI(dt);
            }

            this.enemySpawnTimer += dt;

            // Dynamic recruitment based on gold & situation
            if (this.enemySpawnTimer > 3.0) {
                this.enemySpawnTimer = 0;

                // Maintain 4 miners (2 per mine)
                const minerCount = this.units.filter(u => u.side === 'chaos' && u.type === 'miner').length;
                if (minerCount < 4 && this.enemyGold >= UNIT_TYPES.miner.cost) {
                    this.purchaseUnit('chaos', 'miner');
                } else if (this.currentChapter === 1) {
                    // Chapter 1: Archidon Valley - Focus on Archidons
                    if (this.enemyGold >= UNIT_TYPES.archer.cost) {
                        this.purchaseUnit('chaos', 'archer');
                    }
                } else if (this.currentChapter === 2) {
                    // Chapter 2: Swordwrath Highlands - Rapid Swords!
                    if (this.enemyGold >= UNIT_TYPES.sword.cost) {
                        this.purchaseUnit('chaos', 'sword');
                    }
                } else if (this.currentChapter === 3) {
                    // Chapter 3: Spearton Desert - Heavy Spears & Shields!
                    if (this.enemyGold >= UNIT_TYPES.spear.cost && Math.random() < 0.65) {
                        this.purchaseUnit('chaos', 'spear');
                    } else if (this.enemyGold >= UNIT_TYPES.sword.cost) {
                        this.purchaseUnit('chaos', 'sword');
                    }
                } else if (this.currentChapter === 4) {
                    // Chapter 4: Magikill Sanctuary - Mages & Skeletons!
                    if (this.enemyGold >= UNIT_TYPES.mage.cost && Math.random() < 0.45) {
                        this.purchaseUnit('chaos', 'mage');
                    } else if (this.enemyGold >= UNIT_TYPES.spear.cost && Math.random() < 0.5) {
                        this.purchaseUnit('chaos', 'spear');
                    } else if (this.enemyGold >= UNIT_TYPES.archer.cost) {
                        this.purchaseUnit('chaos', 'archer');
                    }
                } else if (this.currentChapter === 5) {
                    // Chapter 5: Chaos Giant Lord & Final Army!
                    const hasGiant = this.units.some(u => u.side === 'chaos' && u.type === 'giant' && u.hp > 0);
                    if (!hasGiant && this.enemyGold >= UNIT_TYPES.giant.cost) {
                        this.purchaseUnit('chaos', 'giant');
                    } else if (this.enemyGold >= UNIT_TYPES.mage.cost && Math.random() < 0.3) {
                        this.purchaseUnit('chaos', 'mage');
                    } else if (this.enemyGold >= UNIT_TYPES.spear.cost && Math.random() < 0.4) {
                        this.purchaseUnit('chaos', 'spear');
                    } else if (this.enemyGold >= UNIT_TYPES.archer.cost && Math.random() < 0.5) {
                        this.purchaseUnit('chaos', 'archer');
                    } else if (this.enemyGold >= UNIT_TYPES.sword.cost) {
                        this.purchaseUnit('chaos', 'sword');
                    }
                } else if (this.isStickWar2Mode) {
                    // Stick War 2 Chaos Empire Roster
                    const rnd = Math.random();
                    if (rnd < 0.25 && this.enemyGold >= UNIT_TYPES.bomber.cost) {
                        this.purchaseUnit('chaos', 'bomber');
                    } else if (rnd < 0.50 && this.enemyGold >= UNIT_TYPES.juggerknight.cost) {
                        this.purchaseUnit('chaos', 'juggerknight');
                    } else if (rnd < 0.70 && this.enemyGold >= UNIT_TYPES.crawler.cost) {
                        this.purchaseUnit('chaos', 'crawler');
                    } else if (rnd < 0.85 && this.enemyGold >= UNIT_TYPES.marrowkai.cost) {
                        this.purchaseUnit('chaos', 'marrowkai');
                    } else if (this.enemyGold >= UNIT_TYPES.sword.cost) {
                        this.purchaseUnit('chaos', 'sword');
                    }
                } else if (this.currentChapter === 7) {
                    // Chapter 7: 2v2 Alliance War - Double Chaos Army
                    const rnd = Math.random();
                    if (rnd < 0.18 && this.enemyGold >= UNIT_TYPES.giant.cost) {
                        this.purchaseUnit('chaos', 'giant');
                    } else if (rnd < 0.45 && this.enemyGold >= UNIT_TYPES.spear.cost) {
                        this.purchaseUnit('chaos', 'spear');
                    } else if (rnd < 0.75 && this.enemyGold >= UNIT_TYPES.archer.cost) {
                        this.purchaseUnit('chaos', 'archer');
                    } else if (this.enemyGold >= UNIT_TYPES.sword.cost) {
                        this.purchaseUnit('chaos', 'sword');
                    }
                } else if (this.currentChapter === 8) {
                    // Chapter 8: Crown of Inamorta Tournament
                    const round = this.tournamentRound || 1;
                    if (round === 1) {
                        // Round 1: Willow (Archidon Queen) - heavy archer volleys!
                        if (this.enemyGold >= UNIT_TYPES.archer.cost && Math.random() < 0.7) {
                            this.purchaseUnit('chaos', 'archer');
                        } else if (this.enemyGold >= UNIT_TYPES.sword.cost) {
                            this.purchaseUnit('chaos', 'sword');
                        }
                    } else if (round === 2) {
                        // Round 2: Ruth (Spearton Commander) - heavy spear phalanx!
                        if (this.enemyGold >= UNIT_TYPES.spear.cost && Math.random() < 0.65) {
                            this.purchaseUnit('chaos', 'spear');
                        } else if (this.enemyGold >= UNIT_TYPES.archer.cost && Math.random() < 0.5) {
                            this.purchaseUnit('chaos', 'archer');
                        } else if (this.enemyGold >= UNIT_TYPES.sword.cost) {
                            this.purchaseUnit('chaos', 'sword');
                        }
                    } else {
                        // Round 3: Cyrus (Arch-Sorcerer) - Magikill summons & Giant!
                        const hasGiant = this.units.some(u => u.side === 'chaos' && u.type === 'giant' && u.hp > 0);
                        if (!hasGiant && this.enemyGold >= UNIT_TYPES.giant.cost && Math.random() < 0.4) {
                            this.purchaseUnit('chaos', 'giant');
                        } else if (this.enemyGold >= UNIT_TYPES.mage.cost && Math.random() < 0.5) {
                            this.purchaseUnit('chaos', 'mage');
                        } else if (this.enemyGold >= UNIT_TYPES.spear.cost) {
                            this.purchaseUnit('chaos', 'spear');
                        }
                    }
                } else if (this.currentChapter === 9) {
                    // Endless Deads handled by zombie wave manager below!
                } else {
                    // 1v1 / Free Sandbox
                    if (this.enemyGold >= UNIT_TYPES.giant.cost && Math.random() < 0.25) {
                        this.purchaseUnit('chaos', 'giant');
                    } else if (this.enemyGold >= UNIT_TYPES.mage.cost && Math.random() < 0.3) {
                        this.purchaseUnit('chaos', 'mage');
                    } else if (this.enemyGold >= UNIT_TYPES.spear.cost && Math.random() < 0.4) {
                        this.purchaseUnit('chaos', 'spear');
                    } else if (this.enemyGold >= UNIT_TYPES.archer.cost && Math.random() < 0.5) {
                        this.purchaseUnit('chaos', 'archer');
                    } else if (this.enemyGold >= UNIT_TYPES.sword.cost) {
                        this.purchaseUnit('chaos', 'sword');
                    }
                }
            }

            // Endless Deads (Chapter 9) Wave Manager
            if (this.currentChapter === 9) {
                if (!this.endlessWave) this.endlessWave = 1;
                if (!this.endlessState) this.endlessState = 'day';
                if (typeof this.endlessTimer !== 'number') this.endlessTimer = 0;
                if (typeof this.endlessSpawnInterval !== 'number') this.endlessSpawnInterval = 0;

                this.endlessTimer += dt;

                if (this.endlessState === 'day') {
                    const timeLeft = Math.max(0, Math.ceil(12 - this.endlessTimer));
                    const waveHUD = document.getElementById('sw-chapter-name');
                    if (waveHUD) waveHUD.textContent = `☀️ Gündüz (Hazırlık): ${timeLeft}s | Dalga: ${this.endlessWave}`;

                    if (this.endlessTimer >= 12) {
                        this.endlessState = 'night';
                        this.endlessTimer = 0;
                        this.endlessSpawnsLeft = 4 + this.endlessWave * 3;
                        this.enemyAIState = 'attack';
                        SoundManager.playVoice('giant');
                        this.addFloatingText(1900, GROUND_Y - 220, `🩸 KANLI AY ÇIKTI! DALGA ${this.endlessWave} BAŞLADI!`, '#ff1744');
                        this.screenShake = 8;
                    }
                } else if (this.endlessState === 'night') {
                    const waveHUD = document.getElementById('sw-chapter-name');
                    if (waveHUD) waveHUD.textContent = `🩸 Gece (Saldırı): Dalga ${this.endlessWave} | Kalan Zombi: ${this.endlessSpawnsLeft}`;

                    this.endlessSpawnInterval += dt;
                    if (this.endlessSpawnsLeft > 0 && this.endlessSpawnInterval >= 2.0) {
                        this.endlessSpawnInterval = 0;
                        this.endlessSpawnsLeft--;

                        const zType = this.endlessWave >= 6 && Math.random() < 0.25 ? 'giant' :
                                     (this.endlessWave >= 4 && Math.random() < 0.35 ? 'spear' :
                                     (this.endlessWave >= 2 && Math.random() < 0.45 ? 'sword' : 'crawler'));
                        const z = this.spawnUnit('chaos', zType);
                        if (z) {
                            z.isZombie = true;
                            z.hp = Math.round(z.hp * (1 + this.endlessWave * 0.1));
                            z.maxHp = z.hp;
                        }
                    }

                    const aliveZombies = this.units.filter(u => u.side === 'chaos' && u.hp > 0).length;
                    if (this.endlessSpawnsLeft <= 0 && aliveZombies === 0) {
                        this.endlessState = 'day';
                        this.endlessTimer = 0;
                        const goldReward = 200 + this.endlessWave * 80;
                        this.gold += goldReward;
                        this.endlessWave++;
                        this.addFloatingText(600, GROUND_Y - 160, `🌅 ŞAFAK SÖKTÜ! DALGA GEÇİLDİ! +${goldReward} 🟡`, '#ffd700');
                        SoundManager.playOrderFanfare('attack');
                    }
                }
                return;
            }

            // Tactical Wave State Machine
            if (!this.enemyWavePhase) this.enemyWavePhase = 'assembling';

            const chaosCombatUnits = this.units.filter(u => u.side === 'chaos' && u.type !== 'miner');
            const targetWaveSize = (this.is2v2 || this.currentChapter === 7 || this.currentChapter === 5) ? 10 : (this.currentChapter >= 3 ? 7 : 5);

            // Emergency defense: if player units are threatening Chaos statue, defend actively!
            const playerThreat = this.units.some(u => u.side === 'order' && u.hp > 0 && u.x > 2550);

            if (playerThreat) {
                this.enemyAIState = 'defend';
            } else if (this.enemyWavePhase === 'assembling') {
                this.enemyAIState = 'defend';
                // Wait until the army reaches full wave size and has balanced melee + ranged
                const hasMelee = chaosCombatUnits.some(u => u.type === 'sword' || u.type === 'spear' || u.type === 'giant' || u.type === 'juggerknight');
                const hasRanged = chaosCombatUnits.some(u => u.type === 'archer' || u.type === 'mage' || u.type === 'marrowkai');

                if (chaosCombatUnits.length >= targetWaveSize && (hasMelee || this.currentChapter === 1)) {
                    this.enemyWavePhase = 'marching';
                    this.enemyAIState = 'attack';
                    this.addFloatingText('🔥 KAOS TAARRUZU BAŞLADI!', 3200, GROUND_Y - 140, '#ff3d00');
                }
            } else if (this.enemyWavePhase === 'marching') {
                this.enemyAIState = 'attack';
                // If wave suffered severe losses, retreat to statue to rebuild
                if (chaosCombatUnits.length <= 1) {
                    this.enemyWavePhase = 'assembling';
                    this.enemyAIState = 'defend';
                }
            }
        },

        /* CASTLE DEFENSE ARCHERS */
        updateCastles(dt) {
            // Order Castle Archer atop turret
            this.castles.order.fireCd += dt;
            if (this.castles.order.fireCd >= 1.2) {
                const intruder = this.units.find(u => u.side === 'chaos' && u.hp > 0 && u.x < 650);
                if (intruder) {
                    this.castles.order.fireCd = 0;
                    this.fireArrow({ side: 'order', x: this.castles.order.x + 30, y: this.castles.order.archerY, facing: 1, damage: 30 }, intruder.x, intruder.y - 30);
                }
            }

            // Chaos Castle Archer atop turret
            this.castles.chaos.fireCd += dt;
            if (this.castles.chaos.fireCd >= 1.2) {
                const intruder = this.units.find(u => u.side === 'order' && u.hp > 0 && u.x > 3150);
                if (intruder) {
                    this.castles.chaos.fireCd = 0;
                    this.fireArrow({ side: 'chaos', x: this.castles.chaos.x - 30, y: this.castles.chaos.archerY, facing: -1, damage: 30 }, intruder.x, intruder.y - 30);
                }
            }
        },

        /* MAIN GAME LOOP */
        loop(timestamp) {
            const dt = 0.016; // Fixed 60FPS step

            this.update(dt);
            this.render();

            if (!this.isGameOver) {
                requestAnimationFrame((ts) => this.loop(ts));
            }
        },

        update(dt) {
            // AI
            this.updateAI(dt);
            this.updateCastles(dt);

            // Stick War 2: Mana Generation & Rage Timer
            if (this.isStickWar2Mode) {
                const minerBonus = this.units.filter(u => u.side === 'order' && u.type === 'miner' && u.hp > 0).length * 1.5;
                this.mana = Math.min(this.maxMana, this.mana + dt * (6 + minerBonus));
                const manaEl = document.getElementById('res-mana-val');
                if (manaEl) manaEl.textContent = Math.floor(this.mana);
            }

            if (this.rageTimer > 0) {
                this.rageTimer = Math.max(0, this.rageTimer - dt);
            }

            // Screen Shake Decay
            if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 25);

            // Smooth Camera
            if (this.controlledUnit) {
                this.camTargetX = this.controlledUnit.x - this.width / 2;
            } else if (!this.isDraggingCam) {
                // Edge pan
                if (this.mouseX < 60) this.camTargetX -= 15;
                if (this.mouseX > this.width - 60) this.camTargetX += 15;
                if (this.keys.a) this.camTargetX -= 12;
                if (this.keys.d) this.camTargetX += 12;
            }
            this.camTargetX = Math.max(0, Math.min(WORLD_WIDTH - this.width, this.camTargetX));
            this.camX += (this.camTargetX - this.camX) * 0.12;

            // Update Units
            for (let i = this.units.length - 1; i >= 0; i--) {
                const u = this.units[i];
                if (u.hp <= 0) {
                    this.units.splice(i, 1);
                    continue;
                }

                // Freeze and burn status effects
                if (u.freezeTimer > 0) {
                    u.freezeTimer = Math.max(0, u.freezeTimer - dt);
                }
                if (u.burnTimer > 0) {
                    u.burnTimer = Math.max(0, u.burnTimer - dt);
                    u.hp -= 12 * dt;
                    if (Math.random() < 0.25) {
                        this.particles.push({
                            x: u.x + (Math.random() - 0.5) * 16,
                            y: u.y - 30 + (Math.random() - 0.5) * 20,
                            vx: (Math.random() - 0.5) * 20,
                            vy: -40,
                            color: '#ff5722',
                            size: 2.5,
                            life: 0.4,
                            maxLife: 0.4
                        });
                    }
                    if (u.hp <= 0) {
                        u.hp = 0;
                        this.onUnitKilled(u, null);
                        this.units.splice(i, 1);
                        continue;
                    }
                }

                // If manually controlled
                if (this.controlledUnit && this.controlledUnit.id === u.id) {
                    this.updateControlledUnit(u, dt);
                } else {
                    this.updateAIUnit(u, dt);
                }

                // Physics & gravity
                u.x += u.vx * dt;
                u.y += u.vy * dt;
                u.vx *= 0.88;

                if (u.y < GROUND_Y) {
                    u.vy += 800 * dt;
                } else {
                    if (u.isJumpingSlash && u.vy > 0) {
                        u.isJumpingSlash = false;
                        this.screenShake = 5;
                        this.performMeleeAttack(u);
                        this.addHitSparks(u.x + u.facing * 30, GROUND_Y, '#ff3d00');
                    }
                    u.y = GROUND_Y;
                    u.vy = 0;
                }

                // World bounds
                u.x = Math.max(50, Math.min(WORLD_WIDTH - 50, u.x));

                // Anim timers
                if (u.animTimer > 0) {
                    u.animTimer -= dt;
                    if (u.animTimer <= 0) u.animAction = 'idle';
                }
            }

            // Update Ballistic Arrows
            for (let i = this.arrows.length - 1; i >= 0; i--) {
                const a = this.arrows[i];

                if (a.stuck) {
                    a.stuckTimer += dt;
                    if (a.stuckTimer > 3.0) this.arrows.splice(i, 1);
                    continue;
                }

                a.x += a.vx * dt;
                a.y += a.vy * dt;
                a.vy += 650 * dt; // Gravity

                // Ground hit
                if (a.y >= GROUND_Y) {
                    a.y = GROUND_Y;
                    a.stuck = true;
                    SoundManager.playSfx('arrowHit');
                    continue;
                }

                // Unit collision
                const targetSide = a.side === 'order' ? 'chaos' : 'order';
                let arrowHit = false;

                for (let j = 0; j < this.units.length; j++) {
                    const u = this.units[j];
                    if (u.side === targetSide && u.hp > 0) {
                        if (Math.abs(a.x - u.x) < 25 && a.y >= u.y - 70 && a.y <= u.y) {
                            // Headshot check
                            const isHeadshot = a.y <= u.y - 50;
                            const finalDmg = isHeadshot ? Math.round(a.damage * 1.5) : a.damage;
                            if (isHeadshot) this.addFloatingText(u.x, u.y - 70, 'KRİTİK! 🎯', '#ffd700');

                            this.damageUnit(u, finalDmg, { x: a.x });
                            SoundManager.playSfx('arrowHit');
                            arrowHit = true;
                            break;
                        }
                    }
                }

                // Enemy Statue collision
                const enemyStatue = this.statues[targetSide];
                if (!arrowHit && enemyStatue && Math.abs(a.x - enemyStatue.x) < 40 && a.y >= GROUND_Y - 140) {
                    this.damageStatue(targetSide, a.damage);
                    arrowHit = true;
                }

                if (arrowHit) {
                    this.arrows.splice(i, 1);
                }
            }

            // Update Magic Spells
            for (let i = this.magicSpells.length - 1; i >= 0; i--) {
                const sp = this.magicSpells[i];
                sp.timer -= dt;

                if (sp.timer <= 0 && !sp.erupted) {
                    sp.erupted = true;
                    this.screenShake = 8;
                    const targetSide = sp.side === 'order' ? 'chaos' : 'order';

                    // AoE Eruption Damage
                    this.units.forEach(u => {
                        if (u.side === targetSide && u.hp > 0 && Math.abs(u.x - sp.x) <= sp.radius) {
                            this.damageUnit(u, sp.damage, { x: sp.x });
                            u.vy = -260; // Launch in air!
                            u.vx = (u.x > sp.x ? 1 : -1) * 80;
                        }
                    });

                    // Damage statue if caught in blast
                    const st = this.statues[targetSide];
                    if (st && Math.abs(st.x - sp.x) <= sp.radius + 30) {
                        this.damageStatue(targetSide, sp.damage);
                    }

                    // Eruption pillar particles
                    for (let p = 0; p < 25; p++) {
                        this.particles.push({
                            x: sp.x + (Math.random() - 0.5) * 50,
                            y: GROUND_Y,
                            vx: (Math.random() - 0.5) * 60,
                            vy: -Math.random() * 300 - 150,
                            color: sp.color || (sp.side === 'order' ? '#00e5ff' : '#9c27b0'),
                            size: 5,
                            life: 0.7,
                            maxLife: 0.7
                        });
                    }

                    this.magicSpells.splice(i, 1);
                }
            }

            // Update Particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                if (p.life <= 0) this.particles.splice(i, 1);
            }

            // Update Floating Texts
            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const t = this.floatingTexts[i];
                t.y -= 30 * dt;
                t.life -= dt;
                if (t.life <= 0) this.floatingTexts.splice(i, 1);
            }

            this.updateMinimapLens();
        },

        /* UNIT CONTROLS & AI LOGIC */
        updateControlledUnit(u, dt) {
            u.facing = this.worldMouseX >= u.x ? 1 : -1;

            if (this.keys.a) {
                u.x -= u.speed * 60 * dt;
                u.walkCycle += 12 * dt;
                u.animAction = 'walk';
            } else if (this.keys.d) {
                u.x += u.speed * 60 * dt;
                u.walkCycle += 12 * dt;
                u.animAction = 'walk';
            } else if (u.animAction === 'walk') {
                u.animAction = 'idle';
            }

            // Spearton Guard
            if (u.type === 'spear') {
                u.isShieldGuarding = this.keys.s;
                if (u.isShieldGuarding) u.animAction = 'block';
            }

            // Attack on Space
            if (this.keys.space) {
                this.performManualAttack(u);
            }

            // Special Ability on Q or F
            if (this.keys.q || this.keys.f) {
                this.performManualSpecial(u);
                this.keys.q = false;
                this.keys.f = false;
            }
        },

        updateAIUnit(u, dt) {
            const isOrder = u.side === 'order';
            const mode = isOrder ? this.orderMode : this.enemyAIState;
            const enemySide = isOrder ? 'chaos' : 'order';
            const targetStatue = this.statues[enemySide];

            // 1. MINER LOGIC
            if (u.type === 'miner') {
                this.updateMinerAI(u, dt, isOrder, mode);
                return;
            }

            // 2. COMBAT UNITS LOGIC
            // Look for nearest hostile unit or statue
            const nearestEnemy = this.getNearestEnemy(u);
            const distToEnemy = nearestEnemy ? Math.abs(u.x - nearestEnemy.x) : 99999;
            const distToStatue = targetStatue ? Math.abs(u.x - targetStatue.x) : 99999;

            const now = Date.now() / 1000;

            // SPECIAL UNITS LOGIC: Meric (Healer) & Bomber (Kamikaze)
            if (u.type === 'meric') {
                const wounded = this.units.find(a => a.side === u.side && a.hp > 0 && a.hp < a.maxHp && a.id !== u.id && Math.abs(a.x - u.x) <= u.range);
                if (wounded) {
                    u.facing = wounded.x > u.x ? 1 : -1;
                    if (now - u.lastAttack >= u.attackCd) {
                        u.lastAttack = now;
                        u.animAction = 'attack';
                        u.animTimer = 0.35;
                        this.performMericHeal(u);
                    }
                    return;
                }
            }

            if (u.type === 'bomber') {
                if ((nearestEnemy && distToEnemy <= 40) || (targetStatue && distToStatue <= 50)) {
                    this.detonateBomber(u);
                    return;
                }
            }

            // Attack if within range
            if (nearestEnemy && distToEnemy <= u.range) {
                u.facing = nearestEnemy.x > u.x ? 1 : -1;
                if (now - u.lastAttack >= u.attackCd) {
                    u.lastAttack = now;
                    u.animAction = 'attack';
                    u.animTimer = 0.35;
                    if (u.type === 'archer') this.fireArrow(u, nearestEnemy.x, nearestEnemy.y - 30);
                    else if (u.type === 'mage') this.castMageSpell(u, nearestEnemy.x, nearestEnemy.y);
                    else if (u.type === 'marrowkai') this.performMarrowkaiAttack(u, nearestEnemy.x, nearestEnemy.y);
                    else if (u.type === 'giant') this.performGiantSmash(u);
                    else if (u.type === 'juggerknight') this.performJuggerAttack(u);
                    else if (u.type === 'meric') this.performMericHeal(u);
                    else this.performMeleeAttack(u);
                }
                return;
            }

            if (targetStatue && distToStatue <= u.range + 30) {
                u.facing = targetStatue.x > u.x ? 1 : -1;
                if (now - u.lastAttack >= u.attackCd) {
                    u.lastAttack = now;
                    u.animAction = 'attack';
                    u.animTimer = 0.35;
                    if (u.type === 'archer') this.fireArrow(u, targetStatue.x, GROUND_Y - 80);
                    else if (u.type === 'mage') this.castMageSpell(u, targetStatue.x, GROUND_Y);
                    else if (u.type === 'marrowkai') this.performMarrowkaiAttack(u, targetStatue.x, GROUND_Y);
                    else if (u.type === 'giant') this.performGiantSmash(u);
                    else if (u.type === 'juggerknight') this.performJuggerAttack(u);
                    else this.performMeleeAttack(u);
                }
                return;
            }

            // Movement according to army mode
            if (mode === 'retreat') {
                if (isOrder) {
                    const castleDoorX = 140;
                    if (u.type === 'archer') {
                        // Archidons climb the castle ramparts and shoot from battlements!
                        const slot = (u.id.charCodeAt(0) % 4);
                        const wallSlotX = 50 + slot * 24;
                        if (Math.abs(u.x - wallSlotX) > 15) {
                            u.facing = wallSlotX > u.x ? 1 : -1;
                            u.x += u.facing * u.speed * 60 * dt;
                            u.walkCycle += 10 * dt;
                            u.animAction = 'walk';
                            u.isGarrisoned = false;
                        } else {
                            u.x = wallSlotX;
                            u.y = this.castles.order.archerY;
                            u.facing = 1;
                            u.animAction = 'idle';
                            u.isGarrisoned = true;
                            // Shoot at approaching enemies from the high castle ramparts!
                            const intruder = this.units.find(en => en.side === 'chaos' && en.hp > 0 && en.x < 750);
                            if (intruder && now - u.lastAttack >= u.attackCd) {
                                u.lastAttack = now;
                                u.animAction = 'attack';
                                u.animTimer = 0.35;
                                this.fireArrow(u, intruder.x, intruder.y - 30);
                            }
                        }
                    } else {
                        // Miners & Melee infantry enter the fortress keep
                        if (u.x > castleDoorX) {
                            u.facing = -1;
                            u.x += u.facing * u.speed * 60 * dt;
                            u.walkCycle += 10 * dt;
                            u.animAction = 'walk';
                            u.isGarrisoned = false;
                        } else {
                            u.isGarrisoned = true;
                            u.animAction = 'idle';
                            u.facing = 1;
                        }
                    }
                } else {
                    const retreatX = 3660;
                    if (Math.abs(u.x - retreatX) > 20) {
                        u.facing = retreatX > u.x ? 1 : -1;
                        u.x += u.facing * u.speed * 60 * dt;
                        u.walkCycle += 10 * dt;
                        u.animAction = 'walk';
                    } else {
                        u.animAction = 'idle';
                    }
                }
                return;
            }

            // If switching out of retreat, release from garrison
            if (u.isGarrisoned) {
                u.isGarrisoned = false;
                u.y = GROUND_Y;
            }

            // TACTICAL FORMATION: ARCHIDONS & MAGES STAY STRICTLY BEHIND SWORDSMEN
            const isRanged = (u.type === 'archer' || u.type === 'mage' || u.type === 'meric');
            if (isRanged) {
                if (isOrder) {
                    const meleeUnits = this.units.filter(m => m.side === 'order' && !m.isGarrisoned && m.hp > 0 && (m.type === 'sword' || m.type === 'spear' || m.type === 'juggerknight' || m.type === 'giant'));
                    if (meleeUnits.length > 0) {
                        const maxFrontX = Math.max(...meleeUnits.map(m => m.x));
                        const idealArchidonX = Math.max(250, maxFrontX - 140 - (u.id.charCodeAt(0) % 4) * 22);

                        // If enemy in range, hold ground and shoot!
                        if (nearestEnemy && distToEnemy <= u.range) {
                            u.facing = 1;
                            if (distToEnemy < 150) {
                                u.facing = -1;
                                u.x -= u.speed * 40 * dt;
                                u.animAction = 'walk';
                            } else {
                                u.animAction = 'idle';
                            }
                            return;
                        }

                        // Maintain formation behind swordsmen
                        if (u.x < idealArchidonX - 25) {
                            u.facing = 1;
                            u.x += u.speed * 60 * dt;
                            u.animAction = 'walk';
                            u.walkCycle += 10 * dt;
                        } else if (u.x > idealArchidonX + 25) {
                            u.facing = -1;
                            u.x -= u.speed * 40 * dt;
                            u.animAction = 'walk';
                            u.walkCycle += 10 * dt;
                        } else {
                            u.animAction = 'idle';
                            u.facing = 1;
                        }
                        return;
                    }
                } else {
                    const chaosMelee = this.units.filter(m => m.side === 'chaos' && m.hp > 0 && (m.type === 'sword' || m.type === 'spear' || m.type === 'juggerknight' || m.type === 'giant'));
                    if (chaosMelee.length > 0) {
                        const minFrontX = Math.min(...chaosMelee.map(m => m.x));
                        const idealArchidonX = Math.min(3550, minFrontX + 140 + (u.id.charCodeAt(0) % 4) * 22);

                        if (nearestEnemy && distToEnemy <= u.range) {
                            u.facing = -1;
                            if (distToEnemy < 150) {
                                u.facing = 1;
                                u.x += u.speed * 40 * dt;
                                u.animAction = 'walk';
                            } else {
                                u.animAction = 'idle';
                            }
                            return;
                        }

                        if (u.x > idealArchidonX + 25) {
                            u.facing = -1;
                            u.x -= u.speed * 60 * dt;
                            u.animAction = 'walk';
                            u.walkCycle += 10 * dt;
                        } else if (u.x < idealArchidonX - 25) {
                            u.facing = 1;
                            u.x += u.speed * 40 * dt;
                            u.animAction = 'walk';
                            u.walkCycle += 10 * dt;
                        } else {
                            u.animAction = 'idle';
                            u.facing = -1;
                        }
                        return;
                    }
                }
            }

            if (mode === 'defend') {
                const defendX = isOrder ? 750 : 3050;
                if (nearestEnemy && (isOrder ? nearestEnemy.x < 1200 : nearestEnemy.x > 2600)) {
                    u.facing = nearestEnemy.x > u.x ? 1 : -1;
                    u.x += u.facing * u.speed * 60 * dt;
                    u.walkCycle += 10 * dt;
                    u.animAction = 'walk';
                } else if (Math.abs(u.x - defendX) > 40) {
                    u.facing = defendX > u.x ? 1 : -1;
                    u.x += u.facing * u.speed * 60 * dt;
                    u.walkCycle += 10 * dt;
                    u.animAction = 'walk';
                } else {
                    u.animAction = 'idle';
                    u.facing = isOrder ? 1 : -1;
                    if (u.type === 'spear') u.isShieldGuarding = true;
                }
            } else if (mode === 'attack') {
                const marchTargetX = nearestEnemy ? nearestEnemy.x : targetStatue.x;
                u.facing = marchTargetX > u.x ? 1 : -1;
                u.x += u.facing * u.speed * 60 * dt;
                u.walkCycle += 10 * dt;
                u.animAction = 'walk';
            }
        },

        updateMinerAI(u, dt, isOrder, mode) {
            const baseStatue = isOrder ? this.statues.order : this.statues.chaos;
            const targetMine = this.getAssignedMine(u, isOrder);

            if (mode === 'retreat') {
                const safeX = isOrder ? 100 : 3700;
                if (Math.abs(u.x - safeX) > 20) {
                    u.facing = safeX > u.x ? 1 : -1;
                    u.x += u.facing * u.speed * 60 * dt;
                    u.animAction = 'walk';
                    u.walkCycle += 10 * dt;
                    u.isGarrisoned = false;
                } else {
                    u.animAction = 'idle';
                    if (isOrder) u.isGarrisoned = true;
                }
                return;
            }

            // Release miner from garrison when moving out
            if (u.isGarrisoned) {
                u.isGarrisoned = false;
            }

            // If carrying gold, return to base statue
            if (u.carriedGold > 0) {
                if (Math.abs(u.x - baseStatue.x) > 30) {
                    u.facing = baseStatue.x > u.x ? 1 : -1;
                    u.x += u.facing * u.speed * 60 * dt;
                    u.animAction = 'walk';
                    u.walkCycle += 10 * dt;
                } else {
                    // Deposit gold!
                    if (isOrder) {
                        this.gold += u.carriedGold;
                        this.statsGoldMined += u.carriedGold;
                        SoundManager.playSfx('goldDeposit');
                        this.addFloatingText(baseStatue.x, GROUND_Y - 90, `+${u.carriedGold} 🟡`, '#ffd700');
                    } else {
                        this.enemyGold += u.carriedGold;
                    }
                    u.carriedGold = 0;
                    this.updateUI();
                }
            } else {
                // Move towards mine
                if (!targetMine) return;
                if (Math.abs(u.x - targetMine.x) > 35) {
                    u.facing = targetMine.x > u.x ? 1 : -1;
                    u.x += u.facing * u.speed * 60 * dt;
                    u.animAction = 'walk';
                    u.walkCycle += 10 * dt;
                } else {
                    // Mining gold!
                    u.animAction = 'mine';
                    u.miningTimer += dt;
                    if (Math.random() < 0.08) SoundManager.playSfx('mine');

                    if (u.miningTimer >= 2.8) {
                        u.miningTimer = 0;
                        const goldAmount = (isOrder && this.upgrades.minerBag) ? 25 : 15;
                        u.carriedGold = targetMine.isRich ? goldAmount * 1.5 : goldAmount;
                        this.addHitSparks(targetMine.x, GROUND_Y - 20, '#ffd700');
                    }
                }
            }
        },

        getAssignedMine(miner, isOrder) {
            const isEven = miner.id.charCodeAt(0) % 2 === 0;
            if (isOrder) {
                if (this.orderMode === 'attack') return this.goldMines[2]; // Rich Center Mine!
                return isEven ? this.goldMines[0] : this.goldMines[1];
            } else {
                if (this.enemyAIState === 'attack') return this.goldMines[2];
                return isEven ? this.goldMines[4] : this.goldMines[3];
            }
        },

        getNearestMine(x) {
            let nearest = null;
            let minDist = 99999;
            this.goldMines.forEach(m => {
                const d = Math.abs(x - m.x);
                if (d < minDist) {
                    minDist = d;
                    nearest = m;
                }
            });
            return nearest;
        },

        getNearestEnemy(unit) {
            const targetSide = unit.side === 'order' ? 'chaos' : 'order';
            let nearest = null;
            let minDist = 99999;
            this.units.forEach(u => {
                if (u.side === targetSide && u.hp > 0 && (!u.isGarrisoned || u.type === 'archer')) {
                    const d = Math.abs(unit.x - u.x);
                    if (d < minDist) {
                        minDist = d;
                        nearest = u;
                    }
                }
            });
            return nearest;
        },

        getUnitAt(worldX, worldY, side) {
            for (let i = 0; i < this.units.length; i++) {
                const u = this.units[i];
                if ((!side || u.side === side) && u.hp > 0) {
                    if (Math.abs(worldX - u.x) < 30 && worldY >= u.y - 80 && worldY <= u.y + 10) {
                        return u;
                    }
                }
            }
            return null;
        },

        /* VISUAL EFFECTS */
        addFloatingText(x, y, text, color) {
            if (typeof x === 'string') {
                const t = x; x = y; y = text; text = t;
            }
            this.floatingTexts.push({ x: Number(x) || 0, y: Number(y) || 0, text: String(text || ''), color: color || '#ffd700', life: 1.0 });
        },

        addHitSparks(x, y, color) {
            for (let i = 0; i < 6; i++) {
                this.particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 120,
                    vy: -Math.random() * 120,
                    color: color || '#ffd700',
                    size: 3,
                    life: 0.4,
                    maxLife: 0.4
                });
            }
        },

        /* RENDERING ENGINE */
        render() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.width, this.height);

            ctx.save();

            // Screen Shake
            if (this.screenShake > 0) {
                const shakeX = (Math.random() - 0.5) * this.screenShake;
                const shakeY = (Math.random() - 0.5) * this.screenShake;
                ctx.translate(shakeX, shakeY);
            }

            // Camera Translation
            ctx.translate(-this.camX, 0);

            // 1. Parallax Sky & War Atmosphere
            this.renderSky(ctx);

            // 2. Castles & Architecture
            this.renderCastles(ctx);

            // 3. Statues
            this.renderStatues(ctx);

            // 4. Gold Mines
            this.renderGoldMines(ctx);

            // 5. Units (Stick figures!)
            this.renderUnits(ctx);

            // 6. Projectiles & Magic
            this.renderProjectiles(ctx);

            // 7. Particles & Floaters
            this.renderParticles(ctx);

            ctx.restore();

            // 8. Render Minimap
            this.renderMinimap();
        },

        renderSky(ctx) {
            if (this.currentChapter === 9) {
                // Endless Deads Blood Moon Night Sky
                const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
                skyGrad.addColorStop(0, '#040206');
                skyGrad.addColorStop(0.5, '#1e050b');
                skyGrad.addColorStop(1, '#3b0d18');
                ctx.fillStyle = skyGrad;
                ctx.fillRect(this.camX, 0, this.width, GROUND_Y);

                // Giant Glowing Blood Moon
                ctx.save();
                ctx.beginPath();
                ctx.arc(1900, 150, 75, 0, Math.PI * 2);
                ctx.fillStyle = '#ff1744';
                ctx.shadowColor = '#d50000';
                ctx.shadowBlur = 60;
                ctx.fill();
                ctx.fillStyle = 'rgba(60, 0, 10, 0.4)';
                ctx.beginPath();
                ctx.arc(1880, 135, 16, 0, Math.PI * 2);
                ctx.arc(1915, 160, 20, 0, Math.PI * 2);
                ctx.arc(1895, 175, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                // Sky gradient
                const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
                skyGrad.addColorStop(0, '#0a0d14');
                skyGrad.addColorStop(0.5, '#192231');
                skyGrad.addColorStop(1, '#2c1e1e');
                ctx.fillStyle = skyGrad;
                ctx.fillRect(this.camX, 0, this.width, GROUND_Y);

                // Blood Sun / Eclipse
                ctx.save();
                ctx.beginPath();
                ctx.arc(1900, 160, 60, 0, Math.PI * 2);
                ctx.fillStyle = '#ff5722';
                ctx.shadowColor = '#ff3d00';
                ctx.shadowBlur = 40;
                ctx.fill();
                ctx.restore();
            }

            // Distant Mountains
            ctx.fillStyle = '#111722';
            ctx.beginPath();
            ctx.moveTo(0, GROUND_Y);
            for (let x = 0; x <= WORLD_WIDTH; x += 150) {
                const h = 240 + Math.sin(x * 0.003) * 90;
                ctx.lineTo(x, GROUND_Y - h);
            }
            ctx.lineTo(WORLD_WIDTH, GROUND_Y);
            ctx.fill();

            // Ground & Battlefield Dirt
            const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, WORLD_HEIGHT);
            groundGrad.addColorStop(0, '#1c1511');
            groundGrad.addColorStop(0.2, '#140f0c');
            groundGrad.addColorStop(1, '#090706');
            ctx.fillStyle = groundGrad;
            ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, WORLD_HEIGHT - GROUND_Y);

            // Ground surface line
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, GROUND_Y);
            ctx.lineTo(WORLD_WIDTH, GROUND_Y);
            ctx.stroke();
        },

        renderCastles(ctx) {
            // ==================== ORDER CASTLE FORTRESS (LEFT) ====================
            ctx.save();
            const castleLeft = 20;
            const castleWidth = 140;
            const wallTop = GROUND_Y - 220;
            const wallH = 220;

            // Main Keep Body Gradient
            const orderWallGrad = ctx.createLinearGradient(castleLeft, wallTop, castleLeft + castleWidth, GROUND_Y);
            orderWallGrad.addColorStop(0, '#242f3d');
            orderWallGrad.addColorStop(0.5, '#1e2430');
            orderWallGrad.addColorStop(1, '#11151c');
            ctx.fillStyle = orderWallGrad;
            ctx.fillRect(castleLeft, wallTop, castleWidth, wallH);

            // Stone Masonry Lines
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
            ctx.lineWidth = 1;
            for (let y = wallTop + 20; y < GROUND_Y; y += 22) {
                ctx.beginPath();
                ctx.moveTo(castleLeft, y);
                ctx.lineTo(castleLeft + castleWidth, y);
                ctx.stroke();
            }

            // Crenellations / Battlements at top
            ctx.fillStyle = '#2c3e50';
            for (let bx = castleLeft; bx < castleLeft + castleWidth; bx += 28) {
                ctx.fillRect(bx, wallTop - 18, 16, 18);
            }

            // Rampart Archer Walkway (where garrisoned archers stand)
            ctx.fillStyle = '#34495e';
            ctx.fillRect(castleLeft, wallTop, castleWidth, 12);
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(castleLeft, wallTop);
            ctx.lineTo(castleLeft + castleWidth, wallTop);
            ctx.stroke();

            // High Watchtower (Leftmost)
            ctx.fillStyle = '#1a2332';
            ctx.fillRect(castleLeft - 10, wallTop - 70, 45, 90);
            ctx.fillStyle = '#24334a';
            ctx.fillRect(castleLeft - 12, wallTop - 85, 14, 15);
            ctx.fillRect(castleLeft + 8, wallTop - 85, 14, 15);
            ctx.fillRect(castleLeft + 25, wallTop - 85, 12, 15);

            // Order Banner Pole & Flag
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(castleLeft + 5, wallTop - 85);
            ctx.lineTo(castleLeft + 5, wallTop - 125);
            ctx.stroke();
            ctx.fillStyle = '#00e5ff';
            ctx.beginPath();
            ctx.moveTo(castleLeft + 6, wallTop - 125);
            ctx.lineTo(castleLeft + 35, wallTop - 112);
            ctx.lineTo(castleLeft + 6, wallTop - 100);
            ctx.closePath();
            ctx.fill();

            // Arched Fortress Gate (Enter/Exit point for retreat)
            const gateX = castleLeft + 65;
            const gateW = 55;
            const gateH = 85;
            const gateY = GROUND_Y - gateH;

            // Stone arch rim
            ctx.fillStyle = '#0d1117';
            ctx.beginPath();
            ctx.moveTo(gateX, GROUND_Y);
            ctx.lineTo(gateX, gateY + 25);
            ctx.arc(gateX + gateW / 2, gateY + 25, gateW / 2, Math.PI, 0, false);
            ctx.lineTo(gateX + gateW, GROUND_Y);
            ctx.closePath();
            ctx.fill();

            // Portcullis Grate (Iron bars)
            ctx.strokeStyle = '#4a5568';
            ctx.lineWidth = 2.5;
            for (let gx = gateX + 8; gx < gateX + gateW; gx += 10) {
                ctx.beginPath();
                ctx.moveTo(gx, gateY + 15);
                ctx.lineTo(gx, GROUND_Y);
                ctx.stroke();
            }
            for (let gy = gateY + 25; gy < GROUND_Y; gy += 15) {
                ctx.beginPath();
                ctx.moveTo(gateX + 4, gy);
                ctx.lineTo(gateX + gateW - 4, gy);
                ctx.stroke();
            }

            // Torch Lights at Gate
            const now = Date.now() * 0.005;
            const flicker = Math.sin(now) * 2;
            ctx.fillStyle = '#ff9800';
            ctx.beginPath();
            ctx.arc(gateX - 8, gateY + 30, 4 + flicker, 0, Math.PI * 2);
            ctx.arc(gateX + gateW + 8, gateY + 30, 4 - flicker, 0, Math.PI * 2);
            ctx.fill();

            // Garrison Counter Badge
            const orderGarrison = this.units.filter(u => u.side === 'order' && u.isGarrisoned);
            if (orderGarrison.length > 0) {
                const label = `🏰 Sığınak: ${orderGarrison.length} Asker`;
                ctx.font = 'bold 12px sans-serif';
                const tw = ctx.measureText(label).width;
                const bx = gateX + gateW / 2 - (tw + 16) / 2;
                const by = gateY - 32;

                ctx.fillStyle = 'rgba(13, 17, 23, 0.88)';
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(bx, by, tw + 16, 22, 6);
                } else {
                    ctx.rect(bx, by, tw + 16, 22);
                }
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#00e5ff';
                ctx.textAlign = 'center';
                ctx.fillText(label, gateX + gateW / 2, by + 15);
            }

            // ==================== CHAOS CASTLE FORTRESS (RIGHT) ====================
            const chaosLeft = 3640;
            const chaosWidth = 140;

            const chaosWallGrad = ctx.createLinearGradient(chaosLeft, wallTop, chaosLeft + chaosWidth, GROUND_Y);
            chaosWallGrad.addColorStop(0, '#3a1a1a');
            chaosWallGrad.addColorStop(0.5, '#261212');
            chaosWallGrad.addColorStop(1, '#150808');
            ctx.fillStyle = chaosWallGrad;
            ctx.fillRect(chaosLeft, wallTop, chaosWidth, wallH);

            // Dark stone masonry
            ctx.strokeStyle = 'rgba(255, 61, 0, 0.15)';
            ctx.lineWidth = 1;
            for (let y = wallTop + 20; y < GROUND_Y; y += 22) {
                ctx.beginPath();
                ctx.moveTo(chaosLeft, y);
                ctx.lineTo(chaosLeft + chaosWidth, y);
                ctx.stroke();
            }

            // Spiked Crenellations
            ctx.fillStyle = '#421616';
            for (let bx = chaosLeft; bx < chaosLeft + chaosWidth; bx += 28) {
                ctx.fillRect(bx, wallTop - 18, 16, 18);
                // Spikes
                ctx.beginPath();
                ctx.moveTo(bx, wallTop - 18);
                ctx.lineTo(bx + 8, wallTop - 26);
                ctx.lineTo(bx + 16, wallTop - 18);
                ctx.fillStyle = '#ff3d00';
                ctx.fill();
            }

            // Chaos Archer Walkway
            ctx.fillStyle = '#3a1818';
            ctx.fillRect(chaosLeft, wallTop, chaosWidth, 12);
            ctx.strokeStyle = '#ff3d00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(chaosLeft, wallTop);
            ctx.lineTo(chaosLeft + chaosWidth, wallTop);
            ctx.stroke();

            // Chaos High Spire (Rightmost)
            ctx.fillStyle = '#2b0d0d';
            ctx.fillRect(chaosLeft + chaosWidth - 35, wallTop - 70, 45, 90);

            // Chaos Banner Pole & Flag
            ctx.strokeStyle = '#d50000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(chaosLeft + chaosWidth - 10, wallTop - 70);
            ctx.lineTo(chaosLeft + chaosWidth - 10, wallTop - 120);
            ctx.stroke();
            ctx.fillStyle = '#ff1744';
            ctx.beginPath();
            ctx.moveTo(chaosLeft + chaosWidth - 9, wallTop - 120);
            ctx.lineTo(chaosLeft + chaosWidth - 38, wallTop - 107);
            ctx.lineTo(chaosLeft + chaosWidth - 9, wallTop - 95);
            ctx.closePath();
            ctx.fill();

            // Chaos Spiked Gate
            const cGateX = chaosLeft + 20;
            const cGateW = 55;
            const cGateH = 85;
            const cGateY = GROUND_Y - cGateH;

            ctx.fillStyle = '#100505';
            ctx.beginPath();
            ctx.moveTo(cGateX, GROUND_Y);
            ctx.lineTo(cGateX, cGateY + 25);
            ctx.arc(cGateX + cGateW / 2, cGateY + 25, cGateW / 2, Math.PI, 0, false);
            ctx.lineTo(cGateX + cGateW, GROUND_Y);
            ctx.closePath();
            ctx.fill();

            // Spikes on gate
            ctx.strokeStyle = '#ff3d00';
            ctx.lineWidth = 2;
            for (let gx = cGateX + 8; gx < cGateX + cGateW; gx += 10) {
                ctx.beginPath();
                ctx.moveTo(gx, cGateY + 15);
                ctx.lineTo(gx, GROUND_Y);
                ctx.stroke();
            }

            ctx.restore();
        },

        renderStatues(ctx) {
            // Order Golden Statue (Iconic Stick War Monument)
            const stO = this.statues.order;
            ctx.save();
            ctx.translate(stO.x, GROUND_Y);

            // Plinth / Base
            ctx.fillStyle = '#37474f';
            ctx.fillRect(-45, -25, 90, 25);
            ctx.fillStyle = '#263238';
            ctx.fillRect(-38, -15, 76, 15);

            // Golden Monument Stick Guardian
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';

            // Legs
            ctx.beginPath();
            ctx.moveTo(-18, -25); ctx.lineTo(-12, -80); ctx.lineTo(0, -95);
            ctx.moveTo(18, -25); ctx.lineTo(12, -80); ctx.lineTo(0, -95);
            // Spine
            ctx.lineTo(0, -150);
            // Raised Sword Arm
            ctx.moveTo(0, -140); ctx.lineTo(35, -170); ctx.lineTo(65, -195);
            // Shield Arm
            ctx.moveTo(0, -140); ctx.lineTo(-28, -130);
            ctx.stroke();

            // Head
            ctx.beginPath();
            ctx.arc(0, -165, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd700';
            ctx.fill();

            // Spartan Helmet Crest on Statue
            ctx.fillStyle = '#d50000';
            ctx.beginPath();
            ctx.moveTo(-12, -181); ctx.quadraticCurveTo(0, -202, 14, -181);
            ctx.lineTo(10, -176); ctx.quadraticCurveTo(0, -194, -10, -176);
            ctx.closePath();
            ctx.fill();

            // Large Golden Hoplon Shield in Statue's Hand
            ctx.fillStyle = '#8c6218';
            ctx.beginPath();
            ctx.arc(-30, -130, 24, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Spartan Lambda (Λ) on Shield
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(-38, -120); ctx.lineTo(-30, -142); ctx.lineTo(-22, -120);
            ctx.stroke();

            // Glowing Golden Sword Blade
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(65, -195); ctx.lineTo(115, -245);
            ctx.stroke();

            ctx.restore();

            // Chaos Dark Horned Statue
            const stC = this.statues.chaos;
            ctx.save();
            ctx.translate(stC.x, GROUND_Y);

            ctx.fillStyle = '#261b1b';
            ctx.fillRect(-45, -25, 90, 25);
            ctx.fillStyle = '#1a1010';
            ctx.fillRect(-38, -15, 76, 15);

            ctx.strokeStyle = '#ff3d00';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(-18, -25); ctx.lineTo(-12, -80); ctx.lineTo(0, -95);
            ctx.moveTo(18, -25); ctx.lineTo(12, -80); ctx.lineTo(0, -95);
            ctx.lineTo(0, -150);
            ctx.moveTo(0, -140); ctx.lineTo(-35, -170); ctx.lineTo(-65, -195);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, -165, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3d00';
            ctx.fill();

            // Horns on Chaos Statue
            ctx.strokeStyle = '#b71c1c';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-10, -178); ctx.lineTo(-24, -202);
            ctx.moveTo(10, -178); ctx.lineTo(24, -202);
            ctx.stroke();

            // Red glowing staff
            ctx.strokeStyle = '#d50000';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(-65, -195); ctx.lineTo(-115, -245);
            ctx.stroke();

            ctx.restore();
        },

        renderGoldMines(ctx) {
            this.goldMines.forEach(m => {
                ctx.save();
                ctx.translate(m.x, GROUND_Y);

                // Rocky deposit
                ctx.fillStyle = m.isRich ? '#4a3b18' : '#2b2d42';
                ctx.beginPath();
                ctx.moveTo(-45, 0);
                ctx.lineTo(-30, -50);
                ctx.lineTo(-5, -65);
                ctx.lineTo(25, -45);
                ctx.lineTo(45, 0);
                ctx.closePath();
                ctx.fill();

                // Gold veins
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(-10, -35, 6, 0, Math.PI * 2);
                ctx.arc(12, -25, 8, 0, Math.PI * 2);
                ctx.arc(-2, -50, 5, 0, Math.PI * 2);
                ctx.fill();

                // Mine name label
                ctx.font = '10px sans-serif';
                ctx.fillStyle = m.isRich ? '#ffd700' : '#8d99ae';
                ctx.textAlign = 'center';
                ctx.fillText(m.name, 0, -75);

                ctx.restore();
            });
        },

        renderUnits(ctx) {
            this.units.forEach(u => {
                // If unit is garrisoned inside the castle fortress (except archers atop the ramparts), skip drawing
                if (u.isGarrisoned && u.type !== 'archer') {
                    return;
                }

                ctx.save();
                ctx.translate(u.x, u.y);

                const isOrder = u.side === 'order';
                let mainColor = isOrder ? '#00e5ff' : '#ff3d00';
                const bodyColor = '#0a0a0a'; // Iconic Stick War solid black silhouette
                let eyeColor = isOrder ? '#00e5ff' : '#ff1744';

                // Skin Eye & Main Colors
                if (isOrder) {
                    const skin = u.skin || this.selectedSkin;
                    if (skin === 'leaf') { eyeColor = '#34d399'; mainColor = '#10b981'; }
                    else if (skin === 'ice') { eyeColor = '#a5f3fc'; mainColor = '#38bdf8'; }
                    else if (skin === 'savage') { eyeColor = '#fbbf24'; mainColor = '#f59e0b'; }
                    else if (skin === 'lava') { eyeColor = '#ff5722'; mainColor = '#f97316'; }
                    else if (skin === 'vamp') { eyeColor = '#f43f5e'; mainColor = '#e11d48'; }
                    else if (skin === 'voltaic') { eyeColor = '#fef08a'; mainColor = '#eab308'; }
                }

                // Freeze status effect visual tint
                if (u.freezeTimer > 0) {
                    eyeColor = '#a5f3fc';
                    ctx.shadowColor = '#38bdf8';
                    ctx.shadowBlur = 8;
                } else if (u.burnTimer > 0) {
                    eyeColor = '#ff4500';
                    ctx.shadowColor = '#ff5722';
                    ctx.shadowBlur = 8;
                }

                // Ally Unit Indicator Tag
                if (u.isAlly && u.hp > 0) {
                    ctx.font = 'bold 9px sans-serif';
                    ctx.fillStyle = '#00e5ff';
                    ctx.textAlign = 'center';
                    ctx.fillText('🛡️ Müttefik', 0, -84);
                }

                // Controlled Aura
                if (this.controlledUnit && this.controlledUnit.id === u.id) {
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 26, 8, 0, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
                    ctx.fill();
                    ctx.strokeStyle = '#00e5ff';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Arrow over head
                    ctx.fillStyle = '#00e5ff';
                    ctx.beginPath();
                    ctx.moveTo(0, -90); ctx.lineTo(-7, -100); ctx.lineTo(7, -100);
                    ctx.closePath();
                    ctx.fill();
                }

                // Health Bar
                if (u.hp < u.maxHp) {
                    const bw = 32;
                    const bh = 4;
                    const pct = Math.max(0, u.hp / u.maxHp);
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillRect(-bw / 2, -75, bw, bh);
                    ctx.fillStyle = mainColor;
                    ctx.fillRect(-bw / 2, -75, bw * pct, bh);
                }

                // DRAW ARTICULATED STICK FIGURE (1-to-1 Stick War: Legacy)
                const scale = u.type === 'giant' ? 2.3 : (u.type === 'crawler' ? 0.7 : 1.0);
                ctx.scale(scale * u.facing, scale);

                const legAngle = u.animAction === 'walk' ? Math.sin(u.walkCycle) * 0.6 : 0;
                const armAngle = u.animAction === 'attack' ? -Math.PI * 0.45 : (u.animAction === 'walk' ? -Math.sin(u.walkCycle) * 0.5 : 0.2);

                ctx.strokeStyle = bodyColor;
                ctx.lineWidth = u.type === 'giant' ? 6 : 3.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // 1. Legs (thigh + knee + shin + foot)
                // Left Leg
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(-Math.sin(legAngle) * 14, -12);
                ctx.lineTo(-Math.sin(legAngle) * 20, 0);
                ctx.stroke();

                // Right Leg
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(Math.sin(legAngle) * 14, -12);
                ctx.lineTo(Math.sin(legAngle) * 20, 0);
                ctx.stroke();

                // 2. Spine / Torso
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(0, -48);
                ctx.stroke();

                // 3. Head (Black circular silhouette)
                ctx.beginPath();
                ctx.arc(0, -56, 7.5, 0, Math.PI * 2);
                ctx.fillStyle = bodyColor;
                ctx.fill();

                // 4. Iconic Stick War Fierce Glowing Eye Slit
                ctx.fillStyle = eyeColor;
                ctx.fillRect(3, -57.5, 3.2, 2.2);

                // 5. Arms, Armor & Equipment (1-to-1 Authentic Stick War Weapons)
                ctx.strokeStyle = bodyColor;

                if (u.type === 'miner') {
                    // Miner Helmet / Cap
                    ctx.fillStyle = '#5d4037';
                    ctx.beginPath();
                    ctx.arc(0, -59, 8, Math.PI, Math.PI * 2);
                    ctx.fill();
                    ctx.fillRect(-2, -59, 12, 3); // cap visor

                    // Mining Sack on Back
                    ctx.fillStyle = '#6d4c41';
                    ctx.beginPath();
                    ctx.ellipse(-10, -36, 7, 10, -0.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#4e342e';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Gold Nuggets visible in sack
                    if (u.carriedGold > 0) {
                        ctx.fillStyle = '#ffd700';
                        ctx.beginPath();
                        ctx.arc(-8, -43, 3, 0, Math.PI * 2);
                        ctx.arc(-11, -39, 3.5, 0, Math.PI * 2);
                        ctx.arc(-7, -35, 2.8, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // Miner Arms holding pickaxe
                    ctx.strokeStyle = bodyColor;
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.moveTo(0, -42);
                    ctx.lineTo(10, -38);
                    ctx.lineTo(16, -30);
                    ctx.stroke();

                    // Sturdy Two-Handed Pickaxe
                    const pickSwing = (u.animAction === 'attack') ? Math.sin(u.animTimer * 18) * 0.8 : 0;
                    ctx.save();
                    ctx.translate(14, -34);
                    ctx.rotate(pickSwing);
                    // Wooden Handle
                    ctx.strokeStyle = '#8d6e63';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(-6, -14); ctx.lineTo(14, 18);
                    ctx.stroke();
                    // Iron Pick Head
                    ctx.strokeStyle = '#cfd8dc';
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.moveTo(8, 8); ctx.lineTo(20, 26);
                    ctx.moveTo(14, 18); ctx.lineTo(6, 26);
                    ctx.stroke();
                    ctx.restore();

                } else if (u.type === 'sword') {
                    // ========================================================
                    // SWORDWRATH: AUTHENTIC STICK WAR HEADBAND & BROADSWORD
                    // ========================================================
                    // Red Warrior Headband with fluttering ribbon tails
                    ctx.fillStyle = isOrder ? '#d50000' : '#b71c1c';
                    ctx.fillRect(-7, -59, 14, 3.2);
                    const flap = Math.sin(Date.now() * 0.012 + u.id) * 4;
                    ctx.beginPath();
                    ctx.moveTo(-6, -58);
                    ctx.lineTo(-15 + flap, -56);
                    ctx.lineTo(-14 + flap, -52);
                    ctx.lineTo(-6, -56);
                    ctx.closePath();
                    ctx.fill();

                    // Leather Baldric Sash
                    ctx.strokeStyle = '#3e2723';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(-6, -46); ctx.lineTo(6, -26);
                    ctx.stroke();

                    // Sword Arm
                    ctx.strokeStyle = bodyColor;
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.moveTo(0, -42);
                    ctx.lineTo(14, -38 + Math.sin(armAngle) * 10);
                    ctx.stroke();

                    // Iconic Swordwrath Steel Broadsword
                    const swordSwing = (u.animAction === 'attack') ? Math.sin(u.animTimer * 16) * 1.2 : 0;
                    ctx.save();
                    ctx.translate(14, -38 + Math.sin(armAngle) * 10);
                    ctx.rotate(swordSwing);

                    // Crossguard & Hilt
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 3.2;
                    ctx.beginPath();
                    ctx.moveTo(-5, -2); ctx.lineTo(5, 2);
                    ctx.stroke();

                    // Polished Steel Blade with Fuller Groove
                    ctx.fillStyle = '#f1f5f9';
                    ctx.strokeStyle = isOrder ? '#00e5ff' : '#ff3d00';
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(28, -26);
                    ctx.lineTo(31, -24);
                    ctx.lineTo(5, 4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // Attack Slash Motion Swoosh Arc
                    if (u.animAction === 'attack') {
                        ctx.strokeStyle = isOrder ? 'rgba(0, 229, 255, 0.7)' : 'rgba(255, 61, 0, 0.7)';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(0, 0, 36, -0.9, 0.9);
                        ctx.stroke();
                    }
                    ctx.restore();

                } else if (u.type === 'archer') {
                    // ========================================================
                    // ARCHIDON: POINTED ARCHER CAP, FEATHER & RECURVE LONGBOW
                    // ========================================================
                    // Pointed Leather Archer Cap
                    ctx.fillStyle = isOrder ? '#2e7d32' : '#3e2723';
                    ctx.beginPath();
                    ctx.moveTo(-7, -59);
                    ctx.lineTo(7, -59);
                    ctx.lineTo(1, -68);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#1b5e20';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();

                    // Golden Archer Feather atop Cap
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, -67); ctx.lineTo(-7, -76);
                    ctx.stroke();

                    // Archidon: Leather Quiver on Back with Arrows
                    ctx.fillStyle = '#5d4037';
                    ctx.fillRect(-12, -45, 6, 18);
                    // Fletched Arrow Tails sticking out
                    ctx.strokeStyle = isOrder ? '#00e5ff' : '#ff1744';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-10, -45); ctx.lineTo(-12, -54);
                    ctx.moveTo(-8, -45); ctx.lineTo(-9, -53);
                    ctx.moveTo(-6, -45); ctx.lineTo(-6, -55);
                    ctx.stroke();

                    // Bow Arm & Recurve Bow
                    ctx.strokeStyle = bodyColor;
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.moveTo(0, -42); ctx.lineTo(14, -40);
                    ctx.stroke();

                    // Wooden Recurve Bow
                    ctx.strokeStyle = '#8d6e63';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(14, -40, 17, -Math.PI * 0.4, Math.PI * 0.4);
                    ctx.stroke();

                    // Bowstring & Nocked Arrow
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    if (u.animAction === 'attack') {
                        // Drawn string and arrow ready to fire!
                        ctx.moveTo(2, -40);
                        ctx.lineTo(26, -53);
                        ctx.moveTo(2, -40);
                        ctx.lineTo(26, -27);
                        ctx.stroke();
                        // Nocked Arrow with steel arrowhead
                        ctx.strokeStyle = '#ffd700';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(2, -40); ctx.lineTo(24, -40);
                        ctx.stroke();
                        ctx.fillStyle = '#cfd8dc';
                        ctx.beginPath();
                        ctx.moveTo(24, -42); ctx.lineTo(28, -40); ctx.lineTo(24, -38);
                        ctx.closePath();
                        ctx.fill();
                    } else {
                        ctx.moveTo(26, -53); ctx.lineTo(26, -27);
                        ctx.stroke();
                    }

                } else if (u.type === 'spear') {
                    // ========================================================
                    // SPEARTON: CORINTHIAN HELMET, HOPLON SHIELD & ASHWOOD SPEAR
                    // ========================================================
                    // Bronze Helmet Cap with Cheek Guards
                    ctx.fillStyle = '#c99738';
                    ctx.beginPath();
                    ctx.arc(0, -57, 8.5, Math.PI, Math.PI * 2);
                    ctx.lineTo(6, -53);
                    ctx.lineTo(2, -53);
                    ctx.lineTo(2, -58);
                    ctx.lineTo(-4, -58);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#8c6218';
                    ctx.lineWidth = 1.4;
                    ctx.stroke();

                    // Spartan Tall Horsehair Crest / Plumage
                    ctx.fillStyle = isOrder ? '#d50000' : '#212121';
                    ctx.beginPath();
                    ctx.moveTo(-8, -64);
                    ctx.quadraticCurveTo(0, -75, 10, -64);
                    ctx.lineTo(8, -61);
                    ctx.quadraticCurveTo(0, -69, -6, -61);
                    ctx.closePath();
                    ctx.fill();

                    // Eye slit showing through Spartan helmet
                    ctx.fillStyle = eyeColor;
                    ctx.fillRect(2.5, -57, 3.2, 2.2);

                    // Bronze Greaves on Shins
                    ctx.fillStyle = '#b8860b';
                    ctx.fillRect(-3, -11, 4, 8);
                    ctx.fillRect(5, -11, 4, 8);

                    // Shield Wall Guard Stance
                    const isGuarding = u.isShieldGuarding || false;
                    const shieldX = isGuarding ? 10 : 14;
                    const shieldY = isGuarding ? -36 : -34;
                    const shieldR = isGuarding ? 17 : 15;

                    // Large Bronze Hoplon Shield
                    ctx.fillStyle = '#b8860b';
                    ctx.beginPath();
                    ctx.arc(shieldX, shieldY, shieldR, 0, Math.PI * 2);
                    ctx.fill();

                    // Golden Shield Rim
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 2.8;
                    ctx.stroke();

                    // Spartan Emblem / Chevron (Lambda Λ)
                    ctx.strokeStyle = '#3e2723';
                    ctx.lineWidth = 2.8;
                    ctx.beginPath();
                    ctx.moveTo(shieldX - 5, shieldY + 6);
                    ctx.lineTo(shieldX, shieldY - 7);
                    ctx.lineTo(shieldX + 5, shieldY + 6);
                    ctx.stroke();

                    // Spartan Ashwood Spear with Thrust Animation
                    ctx.save();
                    const spearThrust = (u.animAction === 'attack') ? Math.sin(u.animTimer * 16) * 16 : 0;
                    ctx.translate(spearThrust, 0);

                    // Wooden Spear Shaft
                    ctx.strokeStyle = '#8d6e63';
                    ctx.lineWidth = 3.2;
                    ctx.beginPath();
                    if (isGuarding) {
                        ctx.moveTo(-16, -36); ctx.lineTo(44, -36);
                    } else {
                        ctx.moveTo(-18, -24); ctx.lineTo(40, -45);
                    }
                    ctx.stroke();

                    // Leaf-shaped Iron Spearhead
                    const tipX = isGuarding ? 44 : 40;
                    const tipY = isGuarding ? -36 : -45;
                    ctx.fillStyle = '#eceff1';
                    ctx.strokeStyle = '#90a4ae';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(tipX, tipY);
                    ctx.lineTo(tipX + 8, tipY - 3);
                    ctx.lineTo(tipX + 13, tipY);
                    ctx.lineTo(tipX + 8, tipY + 3);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();

                } else if (u.type === 'mage') {
                    // ========================================================
                    // MAGIKILL: WIZARD HAT, BEARD, ROBE & LEVITATING ORB
                    // ========================================================
                    // Grand Crooked Wizard Hat
                    ctx.fillStyle = isOrder ? '#311b92' : '#4a148c';
                    ctx.beginPath();
                    ctx.moveTo(-11, -61);
                    ctx.lineTo(13, -61);
                    ctx.lineTo(3, -79);
                    ctx.lineTo(-2, -84);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // White Flowing Wizard Beard
                    ctx.fillStyle = '#f1f5f9';
                    ctx.beginPath();
                    ctx.moveTo(-3, -51);
                    ctx.lineTo(3, -51);
                    ctx.lineTo(1, -38);
                    ctx.lineTo(-1, -38);
                    ctx.closePath();
                    ctx.fill();

                    // Wizard Robe Cape
                    ctx.fillStyle = isOrder ? 'rgba(49, 27, 146, 0.9)' : 'rgba(74, 20, 140, 0.9)';
                    ctx.beginPath();
                    ctx.moveTo(0, -48);
                    ctx.lineTo(-13, -20);
                    ctx.lineTo(-3, -19);
                    ctx.lineTo(4, -48);
                    ctx.closePath();
                    ctx.fill();

                    // Arcane Staff
                    ctx.strokeStyle = '#5d4037';
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.moveTo(0, -42); ctx.lineTo(16, -38);
                    ctx.moveTo(16, -10); ctx.lineTo(16, -68);
                    ctx.stroke();

                    // Levitating Glowing Arcane Orb with Pulsing Aura
                    ctx.save();
                    const orbPulse = Math.sin(Date.now() * 0.008) * 1.5;
                    ctx.shadowColor = isOrder ? '#00e5ff' : '#ff0055';
                    ctx.shadowBlur = 14;
                    ctx.fillStyle = isOrder ? '#00e5ff' : '#ff1744';
                    ctx.beginPath();
                    ctx.arc(16, -73, 7.5 + orbPulse, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                } else if (u.type === 'giant') {
                    // ========================================================
                    // GIANT: TOWERING MONOLITH WITH SPIKED CLUB & LOINCLOTH
                    // ========================================================
                    // Leather Loincloth
                    ctx.fillStyle = '#4e342e';
                    ctx.fillRect(-10, -28, 20, 9);
                    ctx.strokeStyle = '#271815';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(-10, -28, 20, 9);

                    ctx.strokeStyle = bodyColor;
                    ctx.lineWidth = 7.5;
                    ctx.beginPath();
                    ctx.moveTo(0, -40); ctx.lineTo(24, -35); ctx.lineTo(36, -58);
                    ctx.stroke();

                    // Spiked Club Head (Gnarled Wooden Trunk)
                    ctx.strokeStyle = '#5d4037';
                    ctx.lineWidth = 9.5;
                    ctx.beginPath();
                    ctx.moveTo(28, -50); ctx.lineTo(45, -74);
                    ctx.stroke();

                    // Jagged Steel Spikes
                    ctx.strokeStyle = '#cfd8dc';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(33, -56); ctx.lineTo(28, -63);
                    ctx.moveTo(37, -61); ctx.lineTo(44, -66);
                    ctx.moveTo(42, -67); ctx.lineTo(37, -74);
                    ctx.moveTo(45, -73); ctx.lineTo(52, -78);
                    ctx.stroke();

                } else if (u.type === 'meric') {
                    // Golden Healer Caduceus / Staff
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 2.8;
                    ctx.beginPath();
                    ctx.moveTo(0, -42); ctx.lineTo(14, -38);
                    ctx.moveTo(14, -12); ctx.lineTo(14, -66);
                    ctx.stroke();

                    // Glowing Sacred Heal Gem
                    ctx.fillStyle = '#00e676';
                    ctx.beginPath();
                    ctx.arc(14, -68, 6, 0, Math.PI * 2);
                    ctx.fill();

                    // Holy Halo
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.ellipse(0, -70, 9, 3.5, 0, 0, Math.PI * 2);
                    ctx.stroke();

                } else if (u.type === 'bomber') {
                    // Gunpowder Keg on Back
                    ctx.fillStyle = '#4e342e';
                    ctx.fillRect(-8, -48, 16, 14);
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(-8, -48, 16, 14);

                    // Burning Fuse
                    ctx.strokeStyle = '#ff9800';
                    ctx.beginPath();
                    ctx.moveTo(0, -48); ctx.lineTo(4, -54);
                    ctx.stroke();
                    ctx.fillStyle = '#ff3d00';
                    ctx.beginPath();
                    ctx.arc(4, -54, 3, 0, Math.PI * 2);
                    ctx.fill();

                } else if (u.type === 'juggerknight') {
                    // Horned Iron Helmet
                    ctx.fillStyle = '#37474f';
                    ctx.fillRect(-6, -63, 12, 5);
                    ctx.strokeStyle = '#b0bec5';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-6, -63); ctx.lineTo(-12, -74);
                    ctx.moveTo(6, -63); ctx.lineTo(12, -74);
                    ctx.stroke();

                    // Massive Spiked Cleaver
                    ctx.strokeStyle = '#cfd8dc';
                    ctx.lineWidth = 4.5;
                    ctx.beginPath();
                    ctx.moveTo(10, -36); ctx.lineTo(28, -60);
                    ctx.stroke();
                    ctx.fillStyle = '#90a4ae';
                    ctx.fillRect(20, -62, 16, 9);

                } else if (u.type === 'marrowkai') {
                    // Dark Necromancer Staff
                    ctx.strokeStyle = '#4a148c';
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.moveTo(0, -42); ctx.lineTo(16, -38);
                    ctx.moveTo(16, -10); ctx.lineTo(16, -70);
                    ctx.stroke();

                    // Poison Purple Skull
                    ctx.fillStyle = '#ab47bc';
                    ctx.beginPath();
                    ctx.arc(16, -72, 8, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Rage Aura (Flame Effect)
                if (u.side === 'order' && this.rageTimer > 0) {
                    ctx.fillStyle = 'rgba(255, 61, 0, 0.35)';
                    ctx.beginPath();
                    ctx.arc(0, -30, 24, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            });
        },

        renderProjectiles(ctx) {
            // Archidon manual aiming arc
            if (this.controlledUnit && this.controlledUnit.type === 'archer') {
                const u = this.controlledUnit;
                const startX = u.x + u.facing * 20;
                const startY = u.y - 50;
                const targetX = this.worldMouseX;
                const targetY = this.worldMouseY;
                
                const dx = targetX - startX;
                const dy = targetY - startY;
                const dist = Math.abs(dx);
                const flightTime = Math.max(0.4, Math.min(1.2, dist / 450));
                const vx = dx / flightTime;
                const vy = (dy - 0.5 * 900 * flightTime * flightTime) / flightTime;

                ctx.save();
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                for (let t = 0; t <= flightTime; t += 0.05) {
                    const px = startX + vx * t;
                    const py = startY + vy * t + 0.5 * 900 * t * t;
                    ctx.lineTo(px, py);
                    if (py > GROUND_Y) break;
                }
                ctx.stroke();
                ctx.restore();
            }

            // Ballistic Arrows
            this.arrows.forEach(a => {
                ctx.save();
                ctx.translate(a.x, a.y);
                const angle = Math.atan2(a.vy, a.vx);
                ctx.rotate(angle);

                ctx.strokeStyle = a.isFire ? '#ff3d00' : '#e0e0e0';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-12, 0);
                ctx.lineTo(8, 0);
                ctx.stroke();

                // Arrow head
                ctx.fillStyle = a.side === 'order' ? '#00e5ff' : '#ff3d00';
                ctx.beginPath();
                ctx.moveTo(8, 0); ctx.lineTo(4, -3); ctx.lineTo(4, 3);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            });

            // Magic Ground Blast Sigils
            this.magicSpells.forEach(sp => {
                ctx.save();
                ctx.translate(sp.x, sp.y);
                ctx.strokeStyle = sp.color || (sp.side === 'order' ? '#00e5ff' : '#9c27b0');
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, sp.radius * (1 - sp.timer / 0.6), 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            });
        },

        renderParticles(ctx) {
            this.particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            // Floating combat text
            this.floatingTexts.forEach(t => {
                ctx.font = 'bold 14px sans-serif';
                ctx.fillStyle = t.color;
                ctx.textAlign = 'center';
                ctx.fillText(t.text, t.x, t.y);
            });
        },

        renderMinimap() {
            const mCanvas = document.getElementById('minimap-canvas');
            if (!mCanvas) return;
            const mctx = mCanvas.getContext('2d');
            const mw = mCanvas.width;
            const mh = mCanvas.height;

            mctx.fillStyle = '#0a0d14';
            mctx.fillRect(0, 0, mw, mh);

            // Statues
            mctx.fillStyle = '#00e5ff';
            mctx.fillRect((this.statues.order.x / WORLD_WIDTH) * mw - 2, 5, 4, mh - 10);
            mctx.fillStyle = '#ff3d00';
            mctx.fillRect((this.statues.chaos.x / WORLD_WIDTH) * mw - 2, 5, 4, mh - 10);

            // Gold Mines
            mctx.fillStyle = '#ffd700';
            this.goldMines.forEach(m => {
                mctx.beginPath();
                mctx.arc((m.x / WORLD_WIDTH) * mw, mh / 2, 3, 0, Math.PI * 2);
                mctx.fill();
            });

            // Units
            this.units.forEach(u => {
                mctx.fillStyle = u.side === 'order' ? '#00e5ff' : '#ff3d00';
                mctx.fillRect((u.x / WORLD_WIDTH) * mw - 1, mh / 2 - 2, 2, 4);
            });
        },

        updateMinimapLens() {
            const lens = document.getElementById('minimap-lens');
            const mContainer = document.getElementById('minimap-container');
            if (!lens || !mContainer) return;

            const totalW = mContainer.clientWidth;
            const viewRatio = this.width / WORLD_WIDTH;
            const posRatio = this.camX / WORLD_WIDTH;

            lens.style.width = `${viewRatio * totalW}px`;
            lens.style.left = `${posRatio * totalW}px`;
        },

        /* UI UPDATE */
        updateUI() {
            const goldEl = document.getElementById('res-gold-val');
            const popEl = document.getElementById('res-pop-val');
            if (goldEl) goldEl.textContent = this.gold;
            if (popEl) popEl.textContent = `${this.pop} / ${this.maxPop}`;

            // Update recruit button disabled states
            document.querySelectorAll('.btn-recruit').forEach(btn => {
                const cost = parseInt(btn.getAttribute('data-cost'), 10);
                const pop = parseInt(btn.getAttribute('data-pop'), 10);
                btn.disabled = (this.gold < cost) || (this.pop + pop > this.maxPop);
            });
        },

        updateStatueUI() {
            const hpO = document.getElementById('hp-statue-order');
            const hpC = document.getElementById('hp-statue-chaos');
            const fillO = document.getElementById('fill-statue-order');
            const fillC = document.getElementById('fill-statue-chaos');

            const stO = this.statues.order;
            const stC = this.statues.chaos;

            if (hpO) hpO.textContent = `${stO.hp} / ${stO.maxHp}`;
            if (hpC) hpC.textContent = `${stC.hp} / ${stC.maxHp}`;

            if (fillO) fillO.style.width = `${(stO.hp / stO.maxHp) * 100}%`;
            if (fillC) fillC.style.width = `${(stC.hp / stC.maxHp) * 100}%`;
        },

        /* GAME OVER */
        triggerGameOver(playerWon) {
            this.isGameOver = true;
            const modal = document.getElementById('modal-gameover');
            const title = document.getElementById('go-title');
            const desc = document.getElementById('go-desc');
            const killsEl = document.getElementById('go-kills');
            const goldEl = document.getElementById('go-gold');
            const timeEl = document.getElementById('go-time');

            if (modal) modal.classList.remove('hidden');

            const durationSec = Math.floor((Date.now() - this.gameStartTime) / 1000);
            const m = Math.floor(durationSec / 60);
            const s = durationSec % 60;
            const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            if (this.currentChapter === 8) {
                // Tournament
                if (playerWon) {
                    if (this.tournamentRound === 1) {
                        this.tournamentRound = 2;
                        if (title) title.textContent = '🏹 1. RAUNT KAZANILDI!';
                        if (desc) desc.textContent = 'Willow dize getirildi! Yarı Finalde rakibin Ruth (Mızrakçı Komutanı)!';
                    } else if (this.tournamentRound === 2) {
                        this.tournamentRound = 3;
                        if (title) title.textContent = '🛡️ YARI FİNAL KAZANILDI!';
                        if (desc) desc.textContent = 'Ruth mağlup edildi! BÜYÜK FİNALDE rakibin Cyrus & Dev Kaos Ordusu!';
                    } else {
                        if (title) title.textContent = '👑 CROWN OF INAMORTA ŞAMPİYONU!';
                        if (desc) desc.textContent = 'Tebrikler! Cyrus ve Kaos ordusunu ezerek İnamorta Şampiyonluk Tacını kazandın!';
                    }
                } else {
                    if (title) { title.textContent = '💀 TURNUVADAN ELENDİN!'; title.style.color = '#ff5252'; }
                    if (desc) desc.textContent = 'Gladyatörler arenasında yenildin. Yeniden denemek için maçı başlat.';
                }
            } else if (this.currentChapter === 9) {
                // Endless Deads
                if (title) { title.textContent = '🧟 ZOMBİ KUŞATMASI SONA ERDİ!'; title.style.color = '#ff5252'; }
                if (desc) desc.textContent = `Heykelin yıkıldı! Toplam ${this.endlessWave || 1} gece boyunca zombi dalgalarına karşı direndin.`;
            } else if (playerWon) {
                if (title) title.textContent = '🏆 BÜYÜK ZAFER!';
                if (desc) desc.textContent = 'Kaos İmparatorluğu yerle bir edildi! İnamorta topraklarına ebedi düzen ve adalet geldi.';
            } else {
                if (title) {
                    title.textContent = '💀 YENİLGİ!';
                    title.style.color = '#ff5252';
                }
                if (desc) desc.textContent = 'Heykelimiz yıkıldı! Kaos güçleri krallığımızı ele geçirdi.';
            }

            if (killsEl) killsEl.textContent = this.statsKills;
            if (goldEl) goldEl.textContent = this.statsGoldMined;
            if (timeEl) timeEl.textContent = timeStr;
        },

        startChapter(id) {
            this.currentChapter = parseInt(id, 10);
            try { localStorage.setItem('sw_chapter', this.currentChapter.toString()); } catch(e){}

            const chModal = document.getElementById('modal-sw-chapters');
            if (chModal) chModal.classList.add('hidden');

            document.querySelectorAll('.chapter-card').forEach(c => {
                const isActive = c.getAttribute('data-chapter') === id.toString();
                c.classList.toggle('active', isActive);
                c.style.borderColor = isActive ? '#ff9800' : '#30363d';
            });

            this.resetMatch();

            const chapterNames = {
                1: '🏹 1. Bölüm: Archidon Vadisi',
                2: '🗡️ 2. Bölüm: Swordwrath Dağları',
                3: '🛡️ 3. Bölüm: Spearton Çölü',
                4: '🧙 4. Bölüm: Magikill Tapınağı',
                5: '👹 5. Bölüm: Kaos Lordu ve Devler Diyarı',
                6: '⚡ 1v1 Özel Düello',
                7: '🛡️ 2v2 İttifak Savaşı (Müttefik AI ile Omuz Omuza)',
                8: '👑 Turnuva: Crown of Inamorta',
                9: '🧟 Sonsuz Zombiler (Endless Deads)'
            };
            this.addFloatingText(chapterNames[this.currentChapter] || 'Bölüm Başladı!', 550, GROUND_Y - 140, '#ff9800');
        },

        resetMatch() {
            this.units = [];
            this.arrows = [];
            this.particles = [];
            this.floatingTexts = [];
            this.magicSpells = [];
            this.controlledUnit = null;

            const is2v2Mode = (this.currentChapter === 7);
            const isTournament = (this.currentChapter === 8);
            const isEndless = (this.currentChapter === 9);

            this.is2v2 = is2v2Mode;
            this.allyGold = 400;
            this.allySpawnTimer = 0;
            this.maxPop = is2v2Mode ? 35 : (isEndless ? 30 : 20);
            this.enemyMaxPop = is2v2Mode ? 35 : (isEndless ? 40 : 20);

            if (isEndless) {
                this.endlessWave = 1;
                this.endlessState = 'day';
                this.endlessTimer = 0;
                this.endlessSpawnsLeft = 0;
            }
            if (isTournament && !this.tournamentRound) {
                this.tournamentRound = 1;
            }

            const hpTable = { 1: 2200, 2: 2600, 3: 3000, 4: 3500, 5: 4500, 6: 3000, 7: 5500, 8: 4000, 9: 99999 };
            const chaosHp = hpTable[this.currentChapter] || (is2v2Mode ? 5500 : 3000);
            this.statues.order.hp = this.statues.order.maxHp = is2v2Mode ? 5000 : (isEndless ? 4000 : 3000);
            this.statues.chaos.hp = this.statues.chaos.maxHp = chaosHp;

            this.gold = is2v2Mode ? 650 : (isEndless ? 600 : 500);
            this.enemyGold = is2v2Mode ? 650 : 500;
            this.mana = 150;
            this.isGameOver = false;
            this.statsKills = 0;
            this.statsGoldMined = 0;
            this.gameStartTime = Date.now();

            const goModal = document.getElementById('modal-gameover');
            if (goModal) goModal.classList.add('hidden');

            // Spawn initial units (2 miners + 1 combat unit per side)
            this.spawnUnit('order', 'miner');
            this.spawnUnit('order', 'miner');
            this.spawnUnit('order', 'sword');

            if (!isEndless) {
                this.spawnUnit('chaos', 'miner');
                this.spawnUnit('chaos', 'miner');
                this.spawnUnit('chaos', 'sword');
            }

            if (is2v2Mode) {
                const a1 = this.spawnUnit('order', 'sword');
                if (a1) a1.isAlly = true;
                const a2 = this.spawnUnit('order', 'archer');
                if (a2) a2.isAlly = true;
                this.spawnUnit('chaos', 'sword');
                this.spawnUnit('chaos', 'archer');
            }

            this.updateResourceUI();
            this.updateStatueUI();
            SoundManager.playModeMusic('defend');
        },

        restartGame() {
            this.resetMatch();
        }
    };

    window.addEventListener('DOMContentLoaded', () => {
        Game.init();
    });

})();
