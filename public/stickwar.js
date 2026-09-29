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
        crawler: {
            name: 'Minyon',
            cost: 0,
            pop: 0,
            hp: 55,
            speed: 4.2,
            range: 35,
            damage: 12,
            attackCd: 0.6,
            avatar: '💀',
            desc: 'Büyücünün çağırdığı hızlı iskelet.'
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
        pop: 0,
        maxPop: 20,

        enemyGold: 500,
        enemyPop: 0,
        enemyMaxPop: 20,
        enemyAIState: 'defend',
        enemySpawnTimer: 0,

        // Statues
        statues: {
            order: { x: 190, maxHp: 3000, hp: 3000, side: 'order' },
            chaos: { x: 3610, maxHp: 3000, hp: 3000, side: 'chaos' }
        },

        // Castles
        castles: {
            order: { x: 80, archerY: GROUND_Y - 140, fireCd: 0 },
            chaos: { x: 3720, archerY: GROUND_Y - 140, fireCd: 0 }
        },

        // Gold Mines
        goldMines: [
            { id: 1, x: 500, capacity: 99999, name: 'Düzen Altın Madeni' },
            { id: 2, x: 1900, capacity: 99999, name: 'Büyük Merkez Maden (Zengin!)', isRich: true },
            { id: 3, x: 3300, capacity: 99999, name: 'Kaos Altın Madeni' }
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

        /* INITIALIZATION */
        init() {
            this.canvas = document.getElementById('stickwar-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());

            SoundManager.init();

            // Spawn initial units
            this.spawnUnit('order', 'miner');
            this.spawnUnit('order', 'miner');
            this.spawnUnit('order', 'sword');

            this.spawnUnit('chaos', 'miner');
            this.spawnUnit('chaos', 'miner');
            this.spawnUnit('chaos', 'sword');

            this.bindEvents();
            this.initMinimap();

            // Set default music to Defend (Run From Your Demons)
            SoundManager.playModeMusic('defend');

            // Start Animation Loop
            requestAnimationFrame((ts) => this.loop(ts));
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
            // Formation buttons
            const btnDefend = document.getElementById('btn-order-defend');
            const btnAttack = document.getElementById('btn-order-attack');
            const btnRetreat = document.getElementById('btn-order-retreat');

            btnDefend.addEventListener('click', () => this.setOrderMode('defend'));
            btnAttack.addEventListener('click', () => this.setOrderMode('attack'));
            btnRetreat.addEventListener('click', () => this.setOrderMode('retreat'));

            // Unit Spawn Buttons
            document.querySelectorAll('.btn-recruit').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.getAttribute('data-type') || btn.id.replace('btn-spawn-', '');
                    const unitKey = type === 'sword' ? 'sword' : 
                                    type === 'archer' ? 'archer' : 
                                    type === 'spear' ? 'spear' : 
                                    type === 'mage' ? 'mage' : 
                                    type === 'giant' ? 'giant' : 'miner';
                    this.purchaseUnit('order', unitKey);
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
            document.getElementById('btn-sw-restart').addEventListener('click', () => this.restartGame());
            document.getElementById('btn-go-restart').addEventListener('click', () => this.restartGame());

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
                const k = e.key.toLowerCase();
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
                if (this.gold < cfg.cost) {
                    this.addFloatingText(this.camX + this.width / 2, 200, 'Yetersiz Altın!', '#ff5252');
                    return;
                }
                if (this.pop + cfg.pop > this.maxPop) {
                    this.addFloatingText(this.camX + this.width / 2, 200, 'Nüfus Dolu! (20/20)', '#ff5252');
                    return;
                }
                this.gold -= cfg.cost;
                this.spawnUnit('order', unitTypeKey);
                this.updateUI();
            } else {
                if (this.enemyGold >= cfg.cost && (this.enemyPop + cfg.pop <= this.enemyMaxPop)) {
                    this.enemyGold -= cfg.cost;
                    this.spawnUnit('chaos', unitTypeKey);
                }
            }
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

            // Apply Upgrades for Order
            if (isOrder) {
                if (type === 'sword' && this.upgrades.swordDamage) {
                    unit.damage = Math.round(unit.damage * 1.35);
                    unit.speed += 0.5;
                }
                if (type === 'spear' && this.upgrades.ironShield) {
                    unit.hp += 80;
                    unit.maxHp += 80;
                }
            }

            this.units.push(unit);
            this.recalcPop();
            return unit;
        },

        recalcPop() {
            let pOrder = 0, pChaos = 0;
            this.units.forEach(u => {
                const c = UNIT_TYPES[u.type];
                if (u.side === 'order') pOrder += c.pop;
                else pChaos += c.pop;
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

            // CRITICAL USER REQUIREMENT:
            // "saldırı yaparken hymn for weekejnd çalsın savunmada yada en gerideyken run from your demons çalsın"
            SoundManager.playModeMusic(mode);
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
            } else if (unit.type === 'giant') {
                this.performGiantSmash(unit);
            } else if (unit.type === 'miner') {
                // If near gold mine, mine it; else slash
                const mine = this.getNearestMine(unit.x);
                if (mine && Math.abs(unit.x - mine.x) < 70) {
                    unit.miningTimer = 2.5;
                    unit.animAction = 'mine';
                    SoundManager.playSfx('mine');
                } else {
                    this.performMeleeAttack(unit);
                }
            } else {
                this.performMeleeAttack(unit);
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

        damageUnit(target, dmg, attacker) {
            if (target.hp <= 0) return;

            let finalDmg = dmg;

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

            st.hp = Math.max(0, st.hp - dmg);
            SoundManager.playSfx('slash');
            this.screenShake = 6;

            this.addFloatingText(st.x, GROUND_Y - 140, `-${dmg} HEYKEL!`, side === 'order' ? '#ff3d00' : '#00e5ff');
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

        /* AI LOGIC */
        updateAI(dt) {
            this.enemySpawnTimer += dt;

            // Dynamic recruitment based on gold & situation
            if (this.enemySpawnTimer > 3.0) {
                this.enemySpawnTimer = 0;

                // Always maintain at least 3 miners
                const minerCount = this.units.filter(u => u.side === 'chaos' && u.type === 'miner').length;
                if (minerCount < 3 && this.enemyGold >= UNIT_TYPES.miner.cost) {
                    this.purchaseUnit('chaos', 'miner');
                } else if (this.enemyGold >= UNIT_TYPES.giant.cost && Math.random() < 0.25) {
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

            // Decide tactical formation
            const chaosCombatUnits = this.units.filter(u => u.side === 'chaos' && u.type !== 'miner');
            const orderCombatUnits = this.units.filter(u => u.side === 'order' && u.type !== 'miner');

            if (chaosCombatUnits.length >= 6 || this.orderMode === 'retreat') {
                this.enemyAIState = 'attack';
            } else if (this.statues.chaos.hp < 1200 && chaosCombatUnits.length < 3) {
                this.enemyAIState = 'retreat';
            } else {
                this.enemyAIState = 'defend';
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
                            color: '#00e5ff',
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

            // Attack if within range
            if (nearestEnemy && distToEnemy <= u.range) {
                u.facing = nearestEnemy.x > u.x ? 1 : -1;
                if (now - u.lastAttack >= u.attackCd) {
                    u.lastAttack = now;
                    u.animAction = 'attack';
                    u.animTimer = 0.35;
                    if (u.type === 'archer') this.fireArrow(u, nearestEnemy.x, nearestEnemy.y - 30);
                    else if (u.type === 'mage') this.castMageSpell(u, nearestEnemy.x, nearestEnemy.y);
                    else if (u.type === 'giant') this.performGiantSmash(u);
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
                    else if (u.type === 'giant') this.performGiantSmash(u);
                    else this.performMeleeAttack(u);
                }
                return;
            }

            // Movement according to army mode
            if (mode === 'retreat') {
                const retreatX = isOrder ? 140 : 3660;
                if (Math.abs(u.x - retreatX) > 20) {
                    u.facing = retreatX > u.x ? 1 : -1;
                    u.x += u.facing * u.speed * 60 * dt;
                    u.walkCycle += 10 * dt;
                    u.animAction = 'walk';
                } else {
                    u.animAction = 'idle';
                }
            } else if (mode === 'defend') {
                const defendX = isOrder ? 750 : 3050;
                // If enemy is advancing inside defensive zone, push to meet them
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
                // March towards enemy base/statue
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
                } else {
                    u.animAction = 'idle';
                }
                return;
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
            if (isOrder) {
                // If attacking, consider rich center mine; otherwise stick to safe base mine
                return this.orderMode === 'attack' ? this.goldMines[1] : this.goldMines[0];
            } else {
                return this.enemyAIState === 'attack' ? this.goldMines[1] : this.goldMines[2];
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
                if (u.side === targetSide && u.hp > 0) {
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
            this.floatingTexts.push({ x, y, text, color, life: 1.0 });
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
            // Order Castle (Left)
            ctx.fillStyle = '#1e2430';
            ctx.fillRect(40, GROUND_Y - 220, 80, 220);
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(75, GROUND_Y - 250, 10, 30); // Banner pole
            ctx.beginPath();
            ctx.arc(80, this.castles.order.archerY, 8, 0, Math.PI * 2); // Archer head
            ctx.fillStyle = '#00e5ff';
            ctx.fill();

            // Chaos Castle (Right)
            ctx.fillStyle = '#2b1b1b';
            ctx.fillRect(3680, GROUND_Y - 220, 80, 220);
            ctx.fillStyle = '#ff3d00';
            ctx.fillRect(3715, GROUND_Y - 250, 10, 30);
            ctx.beginPath();
            ctx.arc(3720, this.castles.chaos.archerY, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3d00';
            ctx.fill();
        },

        renderStatues(ctx) {
            // Order Golden Statue
            const stO = this.statues.order;
            ctx.save();
            ctx.translate(stO.x, GROUND_Y);

            // Plinth / Base
            ctx.fillStyle = '#37474f';
            ctx.fillRect(-35, -25, 70, 25);

            // Golden Monument Stick Guardian
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';

            // Legs
            ctx.beginPath();
            ctx.moveTo(-15, -25); ctx.lineTo(-10, -80); ctx.lineTo(0, -95);
            ctx.moveTo(15, -25); ctx.lineTo(10, -80); ctx.lineTo(0, -95);
            // Spine
            ctx.lineTo(0, -150);
            // Raised Sword Arm
            ctx.moveTo(0, -140); ctx.lineTo(35, -170); ctx.lineTo(65, -195);
            // Shield Arm
            ctx.moveTo(0, -140); ctx.lineTo(-25, -130);
            ctx.stroke();

            // Head
            ctx.beginPath();
            ctx.arc(0, -165, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd700';
            ctx.fill();

            // Sword blade
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(65, -195); ctx.lineTo(110, -240);
            ctx.stroke();

            ctx.restore();

            // Chaos Dark Horned Statue
            const stC = this.statues.chaos;
            ctx.save();
            ctx.translate(stC.x, GROUND_Y);

            ctx.fillStyle = '#261b1b';
            ctx.fillRect(-35, -25, 70, 25);

            ctx.strokeStyle = '#ff3d00';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(-15, -25); ctx.lineTo(-10, -80); ctx.lineTo(0, -95);
            ctx.moveTo(15, -25); ctx.lineTo(10, -80); ctx.lineTo(0, -95);
            ctx.lineTo(0, -150);
            ctx.moveTo(0, -140); ctx.lineTo(-35, -170); ctx.lineTo(-65, -195);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, -165, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3d00';
            ctx.fill();

            // Red glowing staff
            ctx.strokeStyle = '#d50000';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(-65, -195); ctx.lineTo(-105, -240);
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
                ctx.save();
                ctx.translate(u.x, u.y);

                const isOrder = u.side === 'order';
                const mainColor = isOrder ? '#00e5ff' : '#ff3d00';
                const skinColor = '#ffffff';

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

                // DRAW ARTICULATED STICK FIGURE
                const scale = u.type === 'giant' ? 2.2 : (u.type === 'crawler' ? 0.7 : 1.0);
                ctx.scale(scale * u.facing, scale);

                const legAngle = u.animAction === 'walk' ? Math.sin(u.walkCycle) * 0.6 : 0;
                const armAngle = u.animAction === 'attack' ? -Math.PI * 0.4 : (u.animAction === 'walk' ? -Math.sin(u.walkCycle) * 0.5 : 0.2);

                ctx.strokeStyle = skinColor;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // 1. Legs (thigh + shin)
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

                // 3. Head
                ctx.beginPath();
                ctx.arc(0, -56, 7, 0, Math.PI * 2);
                ctx.fillStyle = skinColor;
                ctx.fill();

                // 4. Arms & Equipment
                ctx.strokeStyle = skinColor;

                if (u.type === 'miner') {
                    // Pickaxe
                    ctx.beginPath();
                    ctx.moveTo(0, -42);
                    ctx.lineTo(12, -35);
                    ctx.stroke();

                    // Pickaxe head & shaft
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(8, -48); ctx.lineTo(18, -25);
                    ctx.moveTo(4, -46); ctx.lineTo(15, -42);
                    ctx.stroke();

                    if (u.carriedGold > 0) {
                        ctx.fillStyle = '#ffd700';
                        ctx.beginPath();
                        ctx.arc(-8, -32, 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (u.type === 'sword') {
                    // Sword Arm
                    ctx.beginPath();
                    ctx.moveTo(0, -42);
                    ctx.lineTo(14, -38 + Math.sin(armAngle) * 10);
                    ctx.stroke();

                    // Sword Blade
                    ctx.strokeStyle = mainColor;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(14, -38 + Math.sin(armAngle) * 10);
                    ctx.lineTo(28, -50 + Math.sin(armAngle) * 15);
                    ctx.stroke();
                } else if (u.type === 'archer') {
                    // Bow
                    ctx.beginPath();
                    ctx.moveTo(0, -42); ctx.lineTo(12, -38);
                    ctx.stroke();

                    ctx.strokeStyle = '#d4a373';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(14, -38, 12, -Math.PI * 0.4, Math.PI * 0.4);
                    ctx.stroke();
                } else if (u.type === 'spear') {
                    // Big Corinthian Shield
                    ctx.fillStyle = mainColor;
                    ctx.beginPath();
                    ctx.ellipse(14, -36, 6, 18, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.stroke();

                    // Spear
                    ctx.strokeStyle = '#c0c0c0';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(-10, -25); ctx.lineTo(34, -45);
                    ctx.stroke();
                } else if (u.type === 'mage') {
                    // Arcane Staff
                    ctx.strokeStyle = '#9c27b0';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(0, -42); ctx.lineTo(16, -38);
                    ctx.moveTo(16, -10); ctx.lineTo(16, -65);
                    ctx.stroke();

                    // Glowing Orb
                    ctx.fillStyle = '#00e5ff';
                    ctx.beginPath();
                    ctx.arc(16, -68, 6, 0, Math.PI * 2);
                    ctx.fill();
                } else if (u.type === 'giant') {
                    // Spiked Wooden Club
                    ctx.strokeStyle = '#8d6e63';
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.moveTo(0, -40); ctx.lineTo(24, -35); ctx.lineTo(36, -60);
                    ctx.stroke();
                }

                ctx.restore();
            });
        },

        renderProjectiles(ctx) {
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
                ctx.strokeStyle = sp.side === 'order' ? '#00e5ff' : '#ff3d00';
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

            if (playerWon) {
                if (title) title.textContent = '🏆 BÜYÜK ZAFER!';
                if (desc) desc.textContent = 'Kaos İmparatorluğu yerle bir edildi! İnaworta topraklarına ebedi düzen ve adalet geldi.';
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

        restartGame() {
            window.location.reload();
        }
    };

    window.addEventListener('DOMContentLoaded', () => {
        Game.init();
    });

})();
