// BİLİŞİM GP: ÇOK OYUNCULU YARIŞ ARENASI MOTORU
(function() {
    'use strict';

    // 1. STATE & GLOBALS
    const state = {
        mode: 'ai', // 'ai', '1v1', '2v2', 'quick'
        color: '#00dbff',
        username: localStorage.getItem('portal_username') || 'Yarışçı_' + Math.floor(100 + Math.random() * 900),
        lapsToWin: 3,
        difficulty: 'medium',
        roomCode: '',
        isHost: false,
        ws: null,
        soundEnabled: true,
        gameRunning: false,
        inCountdown: false,
        startTime: 0,
        currentLapStartTime: 0,
        bestLapTime: null,
        lapTimes: []
    };

    // UI ELEMENTS
    const screenMenu = document.getElementById('screen-menu');
    const screenLobby = document.getElementById('screen-lobby');
    const screenGame = document.getElementById('screen-game');
    const screenPodium = document.getElementById('screen-podium');
    const playerNameEl = document.getElementById('racing-player-name');
    const btnToggleSound = document.getElementById('btn-toggle-sound');

    if (playerNameEl) playerNameEl.textContent = state.username;

    // 2. AUDIO SYNTHESIZER (Web Audio API)
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

            // Engine synthesis
            engineOsc1 = audioCtx.createOscillator();
            engineOsc2 = audioCtx.createOscillator();
            engineGain = audioCtx.createGain();

            engineOsc1.type = 'sawtooth';
            engineOsc2.type = 'triangle';
            engineOsc1.frequency.setValueAtTime(45, audioCtx.currentTime);
            engineOsc2.frequency.setValueAtTime(90, audioCtx.currentTime);

            engineGain.gain.setValueAtTime(0, audioCtx.currentTime);

            engineOsc1.connect(engineGain);
            engineOsc2.connect(engineGain);
            engineGain.connect(audioCtx.destination);

            engineOsc1.start();
            engineOsc2.start();

            // Drift tire screech
            driftOsc = audioCtx.createOscillator();
            driftGain = audioCtx.createGain();
            driftOsc.type = 'sawtooth';
            driftOsc.frequency.setValueAtTime(800, audioCtx.currentTime);
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
                const targetGain = 0.08 + speedRatio * 0.12 + (isNitro ? 0.08 : 0);
                engineGain.gain.setTargetAtTime(targetGain, now, 0.05);

                const baseFreq = 50 + speedRatio * 180 + (isNitro ? 60 : 0);
                engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
                engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);

                const driftVol = isDrifting ? 0.08 : 0;
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
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
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
            osc.frequency.setValueAtTime(140, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        } catch (_) {}
    }

    function playLapChime() {
        if (!state.soundEnabled) return;
        [523, 659, 784, 1046].forEach((f, i) => {
            setTimeout(() => playBeep(f, 0.18), i * 90);
        });
    }

    function playVictoryFanfare() {
        if (!state.soundEnabled) return;
        [440, 554, 659, 880, 880, 1108].forEach((f, i) => {
            setTimeout(() => playBeep(f, 0.25), i * 140);
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

    // 3. COLOR & MODE SELECTION
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

    // 4. TRACK & CIRCUIT DEFINITION (3600 x 2600 px world)
    const WORLD_W = 3600;
    const WORLD_H = 2600;
    const ROAD_WIDTH = 150;

    // Checkpoints forming a complete grand prix circuit
    const WAYPOINTS = [
        { x: 500,  y: 400 },
        { x: 1200, y: 350 },
        { x: 2200, y: 400 },
        { x: 3100, y: 700 },
        { x: 3200, y: 1400 },
        { x: 2700, y: 1900 },
        { x: 2100, y: 1600 },
        { x: 1800, y: 2100 },
        { x: 1200, y: 2200 },
        { x: 600,  y: 1900 },
        { x: 400,  y: 1300 },
        { x: 420,  y: 700 }
    ];

    const START_LINE = {
        x1: WAYPOINTS[0].x,
        y1: WAYPOINTS[0].y - ROAD_WIDTH / 2,
        x2: WAYPOINTS[0].x,
        y2: WAYPOINTS[0].y + ROAD_WIDTH / 2
    };

    // Helper: Distance point to line segment
    function distToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const l2 = dx * dx + dy * dy;
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }

    // Check if point is on asphalt road
    function getRoadDistance(px, py) {
        let minDist = Infinity;
        for (let i = 0; i < WAYPOINTS.length; i++) {
            const p1 = WAYPOINTS[i];
            const p2 = WAYPOINTS[(i + 1) % WAYPOINTS.length];
            const d = distToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
            if (d < minDist) minDist = d;
        }
        return minDist;
    }

    // 5. CAR CLASS (PHYSICS, DRIFT & PARTICLES)
    class Car {
        constructor(id, name, color, isPlayer = false, isTeamBlue = false) {
            this.id = id;
            this.name = name;
            this.color = color;
            this.isPlayer = isPlayer;
            this.isTeamBlue = isTeamBlue;

            this.x = 460;
            this.y = 380;
            this.angle = 0; // In radians (0 is pointing right along straight)
            this.speed = 0;
            this.maxSpeed = 16.5; // ~260 km/h
            this.accel = 0.28;
            this.friction = 0.985;
            this.steerRate = 0.045;

            // Drift state
            this.isDrifting = false;
            this.driftAngle = 0;
            this.driftScore = 0;

            // Nitro state
            this.nitro = 100;
            this.isNitro = false;

            // Lap tracking
            this.lap = 1;
            this.checkpoint = 0;
            this.finished = false;
            this.finishTime = 0;

            // AI specific
            this.aiTargetWaypoint = 1;
            this.aiSkill = 1.0; // modified by difficulty

            // Visual effects
            this.smokeParticles = [];
            this.nitroParticles = [];
        }

        reset(x, y, angle) {
            this.x = x;
            this.y = y;
            this.angle = angle;
            this.speed = 0;
            this.driftAngle = 0;
            this.isDrifting = false;
            this.isNitro = false;
            this.nitro = 100;
            this.lap = 1;
            this.checkpoint = 0;
            this.finished = false;
            this.finishTime = 0;
            this.aiTargetWaypoint = 1;
        }

        update(keys) {
            if (this.finished) {
                this.speed *= 0.95;
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                return;
            }

            // Surface check: on road vs off-road
            const distFromCenter = getRoadDistance(this.x, this.y);
            const halfRoad = ROAD_WIDTH / 2;
            const isOffRoad = distFromCenter > halfRoad;
            const isKerb = distFromCenter > halfRoad - 20 && distFromCenter <= halfRoad;

            let currentMaxSpeed = this.maxSpeed;
            if (isOffRoad) currentMaxSpeed *= 0.45; // heavy off-road drag
            if (this.isNitro) currentMaxSpeed *= 1.45;

            // CONTROLS FOR PLAYER
            if (this.isPlayer) {
                // Steering
                const turningSpeed = this.steerRate * (Math.abs(this.speed) / this.maxSpeed + 0.35);
                if (keys.left) {
                    this.angle -= turningSpeed;
                    if (this.isDrifting) this.driftAngle = -0.35;
                } else if (keys.right) {
                    this.angle += turningSpeed;
                    if (this.isDrifting) this.driftAngle = 0.35;
                } else {
                    this.driftAngle *= 0.85;
                }

                // Throttle / Brake
                if (keys.up) {
                    let acc = this.accel;
                    if (this.isNitro && this.nitro > 0) {
                        acc *= 1.8;
                        this.nitro = Math.max(0, this.nitro - 0.45);
                    }
                    this.speed = Math.min(currentMaxSpeed, this.speed + acc);
                } else if (keys.down) {
                    this.speed = Math.max(-5, this.speed - this.accel * 1.5);
                } else {
                    this.speed *= this.friction;
                }

                // Drift / Handbrake (Space)
                this.isDrifting = keys.handbrake && Math.abs(this.speed) > 5;
                if (this.isDrifting) {
                    this.speed *= 0.982;
                    this.nitro = Math.min(100, this.nitro + 0.2); // Refill nitro on drift!
                    this.driftScore += Math.floor(Math.abs(this.speed) * 2);
                }

                // Nitro (Shift)
                this.isNitro = keys.nitro && this.nitro > 5 && this.speed > 3;

                // Off-road passive slowdown
                if (isOffRoad && this.speed > 6) {
                    this.speed *= 0.92;
                }
            } else {
                // AI DRIVING LOGIC
                this.updateAI();
            }

            // MOVEMENT VECTOR
            const moveAngle = this.angle + (this.isDrifting ? this.driftAngle : 0);
            this.x += Math.cos(moveAngle) * this.speed;
            this.y += Math.sin(moveAngle) * this.speed;

            // WORLD BOUNDS CHECK
            if (this.x < 80) { this.x = 80; this.speed *= -0.4; playCrashSound(); }
            if (this.x > WORLD_W - 80) { this.x = WORLD_W - 80; this.speed *= -0.4; playCrashSound(); }
            if (this.y < 80) { this.y = 80; this.speed *= -0.4; playCrashSound(); }
            if (this.y > WORLD_H - 80) { this.y = WORLD_H - 80; this.speed *= -0.4; playCrashSound(); }

            // CHECKPOINT TRACKING & LAPS
            this.checkWaypoints();

            // PARTICLES
            if (this.isDrifting || (isOffRoad && Math.abs(this.speed) > 4)) {
                this.spawnSmokeParticle(isOffRoad ? '#8d6e63' : '#e0e0e0');
            }
            if (this.isNitro) {
                this.spawnNitroFlame();
            }
            this.updateParticles();
        }

        updateAI() {
            const target = WAYPOINTS[this.aiTargetWaypoint];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const targetAngle = Math.atan2(dy, dx);

            // Angle difference (-PI to PI)
            let diff = targetAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            // Steer towards target
            const steerAmt = this.steerRate * this.aiSkill;
            if (diff > 0.08) {
                this.angle += steerAmt;
            } else if (diff < -0.08) {
                this.angle -= steerAmt;
            }

            // Speed control based on corner sharpness
            const sharpCorner = Math.abs(diff) > 0.6;
            let targetSpeed = sharpCorner ? this.maxSpeed * 0.65 : this.maxSpeed * 0.95;
            targetSpeed *= this.aiSkill;

            if (this.speed < targetSpeed) {
                this.speed += this.accel * 0.85;
            } else {
                this.speed *= 0.98;
            }

            // AI Nitro usage on straights
            if (!sharpCorner && Math.abs(diff) < 0.2 && this.speed > 10 && this.nitro > 30) {
                this.isNitro = true;
                this.speed += this.accel * 1.2;
                this.nitro -= 0.35;
            } else {
                this.isNitro = false;
                this.nitro = Math.min(100, this.nitro + 0.1);
            }

            // Advance waypoint when close
            if (Math.hypot(dx, dy) < 220) {
                this.aiTargetWaypoint = (this.aiTargetWaypoint + 1) % WAYPOINTS.length;
            }
        }

        checkWaypoints() {
            // Next target checkpoint
            const nextIdx = (this.checkpoint + 1) % WAYPOINTS.length;
            const target = WAYPOINTS[nextIdx];
            const dist = Math.hypot(this.x - target.x, this.y - target.y);

            if (dist < 260) {
                this.checkpoint = nextIdx;
                // If wrapped back to 0 -> completed a lap!
                if (this.checkpoint === 0) {
                    this.lap++;
                    if (this.isPlayer) {
                        const now = performance.now();
                        const lapTime = now - state.currentLapStartTime;
                        state.lapTimes.push(lapTime);
                        if (!state.bestLapTime || lapTime < state.bestLapTime) {
                            state.bestLapTime = lapTime;
                        }
                        state.currentLapStartTime = now;
                        playLapChime();
                    }

                    if (this.lap > state.lapsToWin) {
                        this.finished = true;
                        this.finishTime = performance.now() - state.startTime;
                    }
                }
            }
        }

        spawnSmokeParticle(color) {
            // Emit from rear wheels
            const rearX = this.x - Math.cos(this.angle) * 22;
            const rearY = this.y - Math.sin(this.angle) * 22;
            this.smokeParticles.push({
                x: rearX + (Math.random() - 0.5) * 12,
                y: rearY + (Math.random() - 0.5) * 12,
                size: Math.random() * 8 + 6,
                alpha: 0.6,
                color: color
            });
        }

        spawnNitroFlame() {
            const rearX = this.x - Math.cos(this.angle) * 26;
            const rearY = this.y - Math.sin(this.angle) * 26;
            this.nitroParticles.push({
                x: rearX,
                y: rearY,
                vx: -Math.cos(this.angle) * (Math.random() * 5 + 6),
                vy: -Math.sin(this.angle) * (Math.random() * 5 + 6),
                size: Math.random() * 6 + 4,
                alpha: 0.9,
                color: Math.random() > 0.5 ? '#00dbff' : '#ffd700'
            });
        }

        updateParticles() {
            for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
                const p = this.smokeParticles[i];
                p.size += 0.4;
                p.alpha -= 0.025;
                if (p.alpha <= 0) this.smokeParticles.splice(i, 1);
            }
            for (let i = this.nitroParticles.length - 1; i >= 0; i--) {
                const p = this.nitroParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.06;
                p.size *= 0.92;
                if (p.alpha <= 0) this.nitroParticles.splice(i, 1);
            }
        }

        draw(ctx) {
            // Draw particles behind car
            for (const p of this.smokeParticles) {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            for (const p of this.nitroParticles) {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;

            // DRAW CAR BODY
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle + (this.isDrifting ? this.driftAngle : 0));

            // Neon Underglow
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 18;

            // Main Chassis
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.roundRect(-22, -12, 44, 24, [6, 12, 12, 6]);
            ctx.fill();

            // Cabin / Windshield
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#0b0f19';
            ctx.beginPath();
            ctx.roundRect(-8, -8, 20, 16, 4);
            ctx.fill();

            // Headlights
            ctx.fillStyle = '#fff';
            ctx.fillRect(18, -10, 4, 5);
            ctx.fillRect(18, 5, 4, 5);

            // Tail lights
            ctx.fillStyle = this.isNitro ? '#00dbff' : '#ff2a5f';
            ctx.fillRect(-22, -10, 3, 5);
            ctx.fillRect(-22, 5, 3, 5);

            // Wheels
            ctx.fillStyle = '#111';
            ctx.fillRect(-16, -15, 10, 4); // Rear left
            ctx.fillRect(-16, 11, 10, 4);  // Rear right
            ctx.fillRect(8, -15, 10, 4);   // Front left
            ctx.fillRect(8, 11, 10, 4);    // Front right

            // Rear spoiler
            ctx.fillStyle = '#222';
            ctx.fillRect(-24, -13, 3, 26);

            ctx.restore();

            // PLAYER / BOT OVERHEAD TAG
            ctx.save();
            ctx.font = 'bold 12px -apple-system, sans-serif';
            ctx.textAlign = 'center';

            // Background pill
            const tagText = (this.isTeamBlue ? '🔵 ' : '🔴 ') + this.name;
            const textWidth = ctx.measureText(tagText).width;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.roundRect(this.x - textWidth / 2 - 8, this.y - 34, textWidth + 16, 18, 6);
            ctx.fill();

            ctx.fillStyle = this.color;
            ctx.fillText(tagText, this.x, this.y - 20);
            ctx.restore();
        }
    }

    // 6. TRACK RENDERING ENGINE
    function drawTrack(ctx) {
        // Clear background grass
        ctx.fillStyle = '#0a140d';
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);

        // Gravel borders
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer gravel rim
        ctx.strokeStyle = '#2b2118';
        ctx.lineWidth = ROAD_WIDTH + 50;
        ctx.beginPath();
        for (let i = 0; i < WAYPOINTS.length; i++) {
            const p = WAYPOINTS[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();

        // Red & White Kerbs
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = ROAD_WIDTH + 14;
        ctx.beginPath();
        for (let i = 0; i < WAYPOINTS.length; i++) {
            const p = WAYPOINTS[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();

        // Asphalt Road Surface
        ctx.strokeStyle = '#1e2430';
        ctx.lineWidth = ROAD_WIDTH;
        ctx.stroke();

        // Road Center Dashed Line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 4;
        ctx.setLineDash([24, 24]);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Start / Finish Line (Chequered pattern)
        const p0 = WAYPOINTS[0];
        ctx.save();
        ctx.translate(p0.x, p0.y);
        ctx.rotate(Math.PI / 2);
        for (let r = 0; r < 2; r++) {
            for (let c = -ROAD_WIDTH / 2; c < ROAD_WIDTH / 2; c += 15) {
                ctx.fillStyle = ((r + Math.floor(c / 15)) % 2 === 0) ? '#ffffff' : '#000000';
                ctx.fillRect(c, r * 15 - 15, 15, 15);
            }
        }
        ctx.restore();
    }

    // 7. GAME CONTROLLER & INPUT
    const keys = {
        up: false,
        down: false,
        left: false,
        right: false,
        handbrake: false,
        nitro: false
    };

    window.addEventListener('keydown', (e) => {
        if (!state.gameRunning) return;
        const code = e.code;
        if (code === 'KeyW' || code === 'ArrowUp') keys.up = true;
        if (code === 'KeyS' || code === 'ArrowDown') keys.down = true;
        if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true;
        if (code === 'KeyD' || code === 'ArrowRight') keys.right = true;
        if (code === 'Space') { keys.handbrake = true; e.preventDefault(); }
        if (code === 'ShiftLeft' || code === 'ShiftRight') keys.nitro = true;
        if (code === 'KeyR') resetPlayerOnTrack();
    });

    window.addEventListener('keyup', (e) => {
        const code = e.code;
        if (code === 'KeyW' || code === 'ArrowUp') keys.up = false;
        if (code === 'KeyS' || code === 'ArrowDown') keys.down = false;
        if (code === 'KeyA' || code === 'ArrowLeft') keys.left = false;
        if (code === 'KeyD' || code === 'ArrowRight') keys.right = false;
        if (code === 'Space') keys.handbrake = false;
        if (code === 'ShiftLeft' || code === 'ShiftRight') keys.nitro = false;
    });

    function resetPlayerOnTrack() {
        if (!playerCar) return;
        const wp = WAYPOINTS[playerCar.checkpoint];
        const nextWp = WAYPOINTS[(playerCar.checkpoint + 1) % WAYPOINTS.length];
        const angle = Math.atan2(nextWp.y - wp.y, nextWp.x - wp.x);
        playerCar.x = wp.x;
        playerCar.y = wp.y;
        playerCar.angle = angle;
        playerCar.speed = 0;
    }

    // 8. CARS & RACE MANAGEMENT
    let cars = [];
    let playerCar = null;

    function setupRaceCars() {
        cars = [];
        const is2v2 = state.mode === '2v2';

        // 1. Human Player Car
        playerCar = new Car('player', state.username, state.color, true, false);
        cars.push(playerCar);

        // Difficulty multipliers
        let skill = 0.85;
        if (state.difficulty === 'medium') skill = 0.94;
        if (state.difficulty === 'hard') skill = 1.05;

        // 2. Opponents / AI Bots
        const botConfigs = [
            { name: '⚡ Turbo Eyüp', color: '#ff2a5f', teamBlue: !is2v2 },
            { name: '🔥 Fırtına Onur', color: '#ffd700', teamBlue: true },
            { name: '🤖 Alpha Eren', color: '#b5179e', teamBlue: true }
        ];

        if (state.mode === '1v1') {
            const b = botConfigs[0];
            const bot = new Car('bot_1', b.name, b.color, false, true);
            bot.aiSkill = skill;
            cars.push(bot);
        } else {
            botConfigs.forEach((b, idx) => {
                const bot = new Car('bot_' + (idx + 1), b.name, b.color, false, b.teamBlue);
                bot.aiSkill = skill * (1 + (idx - 1) * 0.04);
                cars.push(bot);
            });
        }

        // Stagger grid positions on starting straight
        cars.forEach((c, idx) => {
            const startX = 400 - (idx % 2) * 50;
            const startY = 360 + idx * 30;
            c.reset(startX, startY, 0);
        });
    }

    // 9. GAME LOOP & RENDERING
    const canvas = document.getElementById('race-canvas');
    const ctx = canvas.getContext('2d');
    const minimapCanvas = document.getElementById('minimap-canvas');
    const miniCtx = minimapCanvas.getContext('2d');

    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 48 - 30;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function formatTime(ms) {
        if (!ms || ms <= 0) return '00:00.0';
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const tenths = Math.floor((ms % 1000) / 100);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
    }

    let lastTime = performance.now();
    function gameLoop(now) {
        if (!state.gameRunning) return;
        requestAnimationFrame(gameLoop);

        const dt = (now - lastTime) / 1000;
        lastTime = now;

        // UPDATE CARS
        if (!state.inCountdown) {
            cars.forEach(c => c.update(keys));

            // Sound modulation
            const speedRatio = Math.abs(playerCar.speed) / playerCar.maxSpeed;
            updateEngineSound(speedRatio, playerCar.isDrifting, playerCar.isNitro);
        }

        // UPDATE HUD
        updateHUD();

        // CAMERA CENTERING ON PLAYER
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        const camX = canvas.width / 2 - playerCar.x;
        const camY = canvas.height / 2 - playerCar.y;
        ctx.translate(camX, camY);

        // Draw track
        drawTrack(ctx);

        // Draw all cars (sort by Y so closer ones overlap properly)
        const sortedCars = [...cars].sort((a, b) => a.y - b.y);
        sortedCars.forEach(c => c.draw(ctx));

        ctx.restore();

        // DRAW MINIMAP
        drawMinimap();

        // CHECK RACE COMPLETION
        if (playerCar.finished) {
            setTimeout(showPodium, 1200);
            state.gameRunning = false;
        }
    }

    function updateHUD() {
        const hudSpeed = document.getElementById('hud-speed');
        const hudNitro = document.getElementById('hud-nitro-bar');
        const hudLap = document.getElementById('hud-lap');
        const hudPos = document.getElementById('hud-pos');
        const hudCurrentTime = document.getElementById('hud-current-time');
        const hudBestTime = document.getElementById('hud-best-time');
        const driftNotice = document.getElementById('hud-drift-notice');

        // Speed (km/h approximation)
        const speedKmh = Math.floor(Math.abs(playerCar.speed) * 16);
        if (hudSpeed) hudSpeed.textContent = speedKmh;

        // Nitro
        if (hudNitro) hudNitro.style.width = playerCar.nitro + '%';

        // Lap
        if (hudLap) hudLap.textContent = Math.min(state.lapsToWin, playerCar.lap) + '/' + state.lapsToWin;

        // Times
        const curLapElapsed = performance.now() - state.currentLapStartTime;
        if (hudCurrentTime) hudCurrentTime.textContent = formatTime(curLapElapsed);
        if (hudBestTime && state.bestLapTime) hudBestTime.textContent = formatTime(state.bestLapTime);

        // Position calculation
        const sortedByProgress = [...cars].sort((a, b) => {
            if (a.lap !== b.lap) return b.lap - a.lap;
            if (a.checkpoint !== b.checkpoint) return b.checkpoint - a.checkpoint;
            const nextWp = WAYPOINTS[(a.checkpoint + 1) % WAYPOINTS.length];
            const distA = Math.hypot(a.x - nextWp.x, a.y - nextWp.y);
            const distB = Math.hypot(b.x - nextWp.x, b.y - nextWp.y);
            return distA - distB;
        });

        const playerRank = sortedByProgress.findIndex(c => c.id === 'player') + 1;
        if (hudPos) hudPos.textContent = playerRank;

        // Drift Notice
        if (driftNotice) {
            if (playerCar.isDrifting && playerCar.driftScore > 50) {
                driftNotice.textContent = `🔥 +${playerCar.driftScore} DRIFT!`;
                driftNotice.classList.add('show');
            } else {
                driftNotice.classList.remove('show');
            }
        }
    }

    function drawMinimap() {
        miniCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
        const scaleX = minimapCanvas.width / WORLD_W;
        const scaleY = minimapCanvas.height / WORLD_H;

        // Minimap track path
        miniCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        miniCtx.lineWidth = 4;
        miniCtx.beginPath();
        for (let i = 0; i < WAYPOINTS.length; i++) {
            const p = WAYPOINTS[i];
            if (i === 0) miniCtx.moveTo(p.x * scaleX, p.y * scaleY);
            else miniCtx.lineTo(p.x * scaleX, p.y * scaleY);
        }
        miniCtx.closePath();
        miniCtx.stroke();

        // Minimap cars
        cars.forEach(c => {
            miniCtx.fillStyle = c.color;
            miniCtx.beginPath();
            miniCtx.arc(c.x * scaleX, c.y * scaleY, c.isPlayer ? 4.5 : 3.5, 0, Math.PI * 2);
            miniCtx.fill();
        });
    }

    // 10. COUNTDOWN & START SEQUENCE
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

    // 11. START RACE & SCREENS
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

        resizeCanvas();
        setupRaceCars();
        state.gameRunning = true;
        lastTime = performance.now();

        runCountdown(() => {
            // Racing started!
        });

        requestAnimationFrame(gameLoop);
    };

    function showPodium() {
        screenGame.classList.remove('active');
        screenPodium.classList.add('active');
        playVictoryFanfare();

        const listEl = document.getElementById('podium-list');
        listEl.innerHTML = '';

        // Sort cars by finish status & progress
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
        screenPodium.classList.remove('active');
        screenGame.classList.remove('active');
        screenMenu.classList.add('active');
    };

})();
