// kafatopu.js - Kafa Topu: Beyaz Saray (1:1 Orijinal Pygame Portu)
// Orijinal Tasarım & Oyun: Yusuf Kaan
// Web Çevirisi & Sistem: Halil Eren

(function() {
    'use strict';

    const WIDTH = 1280;
    const HEIGHT = 720;
    const GROUND_Y = HEIGHT - 80; // 640
    const MATCH_DURATION = 60;

    // Fizik Sabitleri (Orijinal Python kodundan)
    const GRAVITY = 0.55;
    const FRICTION = 0.988;
    const BOUNCE_FACTOR = -0.86;
    const GOAL_HEIGHT = 250;
    const GOAL_WIDTH = 70;

    // Oyun Durumları
    const STATE_MENU = 'MENU';
    const STATE_PLAYING = 'PLAYING';
    const STATE_GAMEOVER = 'GAMEOVER';
    let currentState = STATE_MENU;

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // Ses Efektleri (Web Audio API)
    const SoundFX = {
        ctx: null,
        enabled: true,
        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        },
        kick(high = false) {
            if (!this.enabled) return;
            try {
                this.init();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(high ? 240 : 160, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.12);
            } catch (_) {}
        },
        bounce() {
            if (!this.enabled) return;
            try {
                this.init();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.08);
            } catch (_) {}
        },
        whistle() {
            if (!this.enabled) return;
            try {
                this.init();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(2200, now);
                osc.frequency.setValueAtTime(2500, now + 0.08);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.35);
            } catch (_) {}
        },
        goal() {
            if (!this.enabled) return;
            try {
                this.init();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                    gain.gain.setValueAtTime(0.25, now + idx * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.35);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now + idx * 0.1);
                    osc.stop(now + idx * 0.1 + 0.35);
                });
            } catch (_) {}
        }
    };

    // Görseller (Kök Dizin Yolları)
    const images = {
        bg: new Image(),
        menuBg: new Image(),
        ball: new Image(),
        p1: new Image(),
        p1Foot: new Image(),
        p2: new Image(),
        p2Foot: new Image()
    };

    const imageSources = [
        { key: 'bg', src: '/kafatopu_bg.jpg' },
        { key: 'menuBg', src: '/kafatopu_menu_bg.jpg' },
        { key: 'ball', src: '/kafatopu_ball.png' },
        { key: 'p1', src: '/kafatopu_p1.png' },
        { key: 'p1Foot', src: '/kafatopu_p1_ayak.png' },
        { key: 'p2', src: '/kafatopu_p2.png' },
        { key: 'p2Foot', src: '/kafatopu_p2_ayak.png' }
    ];

    let loadedImages = 0;
    const progressBarFill = document.getElementById('progress-bar-fill');
    const loadingStatusText = document.getElementById('loading-text');
    const loadingOverlay = document.getElementById('loading-screen');

    function preloadAllImages(callback) {
        let isDone = false;
        const total = imageSources.length;

        function checkProgress() {
            const pct = Math.round((loadedImages / total) * 100);
            if (progressBarFill) progressBarFill.style.width = pct + '%';
            if (loadingStatusText) loadingStatusText.textContent = `Beyaz Saray sahası yükleniyor... %${pct} (Yusuf Kaan)`;

            if (loadedImages >= total && !isDone) {
                isDone = true;
                setTimeout(() => {
                    if (loadingOverlay) loadingOverlay.classList.add('fade-out');
                    setTimeout(() => {
                        if (loadingOverlay) loadingOverlay.style.display = 'none';
                    }, 500);
                    callback();
                }, 500);
            }
        }

        imageSources.forEach(item => {
            images[item.key].onload = () => {
                loadedImages++;
                checkProgress();
            };
            images[item.key].onerror = () => {
                console.warn('Görsel yüklenemedi:', item.src);
                loadedImages++;
                checkProgress();
            };
            images[item.key].src = item.src;
        });

        // 2.5 saniye sonra güvenli geçiş
        setTimeout(() => {
            if (!isDone) {
                isDone = true;
                if (loadingOverlay) {
                    loadingOverlay.classList.add('fade-out');
                    setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
                }
                callback();
            }
        }, 2500);
    }

    // Oyuncu Sınıfı
    class Player {
        constructor(x, color, facingRight = true) {
            this.startX = x;
            this.x = x;
            this.y = GROUND_Y - 100;
            this.width = 100;
            this.height = 100;
            this.color = color;
            this.velY = 0;
            this.speed = 8.0;
            this.jumpPower = -15.5;
            this.onGround = true;
            this.facingRight = facingRight;

            this.footAngle = 0;
            this.isKicking = false;
            this.kickType = null;
            this.kickTimer = 0;
        }

        resetPosition() {
            this.x = this.startX;
            this.y = GROUND_Y - 100;
            this.velY = 0;
            this.onGround = true;
            this.footAngle = 0;
            this.isKicking = false;
            this.kickTimer = 0;
        }

        move(dx) {
            this.x += dx * this.speed;
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > WIDTH) this.x = WIDTH - this.width;
        }

        jump() {
            if (this.onGround) {
                this.velY = this.jumpPower;
                this.onGround = false;
                SoundFX.bounce();
            }
        }

        kick(kickType) {
            if (this.isKicking) return;
            this.isKicking = true;
            this.kickType = kickType;
            this.kickTimer = 12;
            SoundFX.kick(kickType === 'high');
        }

        update() {
            this.velY += GRAVITY;
            this.y += this.velY;

            if (this.y + this.height >= GROUND_Y) {
                this.y = GROUND_Y - this.height;
                this.velY = 0;
                this.onGround = true;
            }

            if (this.isKicking) {
                this.kickTimer--;
                const targetAngle = this.kickType === 'high' ? 85 : 50;
                if (this.kickTimer > 6) {
                    this.footAngle += (targetAngle - this.footAngle) * 0.6;
                } else {
                    this.footAngle -= this.footAngle * 0.4;
                }
                if (this.kickTimer <= 0) {
                    this.isKicking = false;
                    this.footAngle = 0;
                }
            } else if (this.footAngle !== 0) {
                this.footAngle -= this.footAngle * 0.5;
                if (Math.abs(this.footAngle) < 1) this.footAngle = 0;
            }
        }

        getFootCenter() {
            const dirMult = this.facingRight ? 1 : -1;
            const rad = (this.footAngle * Math.PI) / 180;
            const baseX = (this.x + this.width / 2) + (dirMult * 14);
            const baseY = (this.y + this.height) - 10;
            const footX = baseX + (Math.cos(rad) * dirMult * 22);
            const footY = baseY - (Math.sin(rad) * 22);
            return { x: footX, y: footY };
        }

        draw(ctx) {
            const headImg = this.facingRight ? images.p1 : images.p2;
            const footImg = this.facingRight ? images.p1Foot : images.p2Foot;

            // Kafa Görseli (100x100)
            if (headImg && headImg.complete && headImg.naturalWidth > 0) {
                ctx.drawImage(headImg, this.x, this.y, this.width, this.height);
            } else {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2 - 10, 40, 0, Math.PI * 2);
                ctx.fill();
            }

            // Ayak Görseli (65x45)
            const foot = this.getFootCenter();
            if (footImg && footImg.complete && footImg.naturalWidth > 0) {
                ctx.save();
                ctx.translate(foot.x, foot.y);
                const angleRad = ((this.facingRight ? this.footAngle : -this.footAngle) * Math.PI) / 180;
                ctx.rotate(angleRad);
                ctx.drawImage(footImg, -32, -22, 65, 45);
                ctx.restore();
            } else {
                ctx.fillStyle = '#1e1e1e';
                ctx.beginPath();
                ctx.ellipse(foot.x, foot.y, 25, 12, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Top Sınıfı
    class Ball {
        constructor(x, y) {
            this.startX = x;
            this.startY = y;
            this.x = x;
            this.y = y;
            this.radius = 20;
            this.velX = 0;
            this.velY = 0;
            this.trail = [];
        }

        resetPosition() {
            this.x = this.startX;
            this.y = this.startY;
            this.velX = 0;
            this.velY = 0;
            this.trail = [];
        }

        update() {
            if (Math.abs(this.velX) > 1.0 || Math.abs(this.velY) > 1.0) {
                this.trail.push({ x: this.x, y: this.y, radius: this.radius, alpha: 180 });
                if (this.trail.length > 8) this.trail.shift();
            }

            for (let i = 0; i < this.trail.length; i++) {
                this.trail[i].alpha -= 22;
                this.trail[i].radius = Math.max(2, this.trail[i].radius - 1);
            }
            this.trail = this.trail.filter(t => t.alpha > 0);

            this.velY += GRAVITY;
            this.x += this.velX;
            this.y += this.velY;
            this.velX *= FRICTION;

            // Zemin sekmesi
            if (this.y + this.radius >= GROUND_Y) {
                this.y = GROUND_Y - this.radius;
                this.velY *= BOUNCE_FACTOR;
                this.velX *= 0.975;
                if (Math.abs(this.velY) > 1.5) SoundFX.bounce();
            }

            // Tavan
            if (this.y - this.radius <= 0) {
                this.y = this.radius;
                this.velY *= BOUNCE_FACTOR;
            }

            // Duvarlar
            if (this.x - this.radius <= 0) {
                this.x = this.radius;
                this.velX *= BOUNCE_FACTOR;
            } else if (this.x + this.radius >= WIDTH) {
                this.x = WIDTH - this.radius;
                this.velX *= BOUNCE_FACTOR;
            }
        }

        draw(ctx) {
            // Altın kuyruk efekti
            for (const t of this.trail) {
                ctx.fillStyle = `rgba(255, 215, 0, ${Math.max(0, t.alpha / 255)})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Top Görseli (40x40)
            if (images.ball && images.ball.complete && images.ball.naturalWidth > 0) {
                ctx.drawImage(images.ball, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
            } else {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }

    // Nesneler (Orijinal Koordinatlar)
    const p1 = new Player(180, '#dc143c', true);
    const p2 = new Player(WIDTH - 280, '#1e90ff', false); // 1000
    const ball = new Ball(WIDTH / 2, 250);

    let scoreP1 = 0;
    let scoreP2 = 0;
    let countdownStartTicks = 0;
    let matchStartTicks = 0;
    let winner = 0;

    // Üst Direkler (Crossbar)
    const crossbarLeft = { left: 0, right: GOAL_WIDTH, top: GROUND_Y - GOAL_HEIGHT, bottom: GROUND_Y - GOAL_HEIGHT + 16 };
    const crossbarRight = { left: WIDTH - GOAL_WIDTH, right: WIDTH, top: GROUND_Y - GOAL_HEIGHT, bottom: GROUND_Y - GOAL_HEIGHT + 16 };

    // Buton Koordinatları (Orijinal Menü)
    const btnStartRect = { x: WIDTH / 2 - 130, y: HEIGHT / 2 + 20, w: 260, h: 65 };
    const btnRestartRect = { x: WIDTH / 2 - 210, y: HEIGHT / 2 + 50, w: 190, h: 50 };
    const btnMenuRect = { x: WIDTH / 2 + 20, y: HEIGHT / 2 + 50, w: 190, h: 50 };

    // Konfeti ve Yağmur Efektleri
    let confetti = [];
    let rainDrops = [];

    function initGameOverEffects(w) {
        confetti = [];
        rainDrops = [];
        const colors = ['#dc143c', '#ffd700', '#ffffff', '#00ff7f', '#ff69b4'];

        for (let i = 0; i < 130; i++) {
            let cx = Math.random() * WIDTH;
            let rx = Math.random() * WIDTH;
            if (w === 1) {
                cx = Math.random() * (WIDTH / 2);
                rx = (WIDTH / 2) + Math.random() * (WIDTH / 2);
            } else if (w === 2) {
                cx = (WIDTH / 2) + Math.random() * (WIDTH / 2);
                rx = Math.random() * (WIDTH / 2);
            }

            confetti.push({
                x: cx,
                y: -Math.random() * HEIGHT,
                vy: 2 + Math.random() * 3,
                vx: -1 + Math.random() * 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 4 + Math.random() * 5
            });

            rainDrops.push({
                x: rx,
                y: -Math.random() * HEIGHT,
                vy: 12 + Math.random() * 8,
                length: 12 + Math.random() * 10
            });
        }
    }

    function resetGame() {
        scoreP1 = 0;
        scoreP2 = 0;
        countdownStartTicks = Date.now();
        matchStartTicks = 0;
        p1.resetPosition();
        p2.resetPosition();
        ball.resetPosition();
        SoundFX.whistle();
    }

    // Tuş Dinleyicileri
    const keys = {};
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        SoundFX.init();

        if (currentState === STATE_PLAYING && (Date.now() - countdownStartTicks >= 3000)) {
            // Oyuncu 1 Şutlar
            if (e.code === 'KeyN') p1.kick('low');
            if (e.code === 'KeyM') p1.kick('high');

            // Oyuncu 2 Klavye Şut Alternatifleri (Mouse olmayanlar için J & K)
            if (e.code === 'KeyJ') p2.kick('high');
            if (e.code === 'KeyK') p2.kick('low');
        }

        if (e.code === 'F11') {
            e.preventDefault();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // Mouse Tıklamaları (Orijinal Pygame Kontrolleri)
    canvas.addEventListener('mousedown', (e) => {
        SoundFX.init();
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (WIDTH / rect.width);
        const my = (e.clientY - rect.top) * (HEIGHT / rect.height);

        if (currentState === STATE_MENU) {
            if (mx >= btnStartRect.x && mx <= btnStartRect.x + btnStartRect.w &&
                my >= btnStartRect.y && my <= btnStartRect.y + btnStartRect.h) {
                resetGame();
                currentState = STATE_PLAYING;
            }
        } else if (currentState === STATE_PLAYING) {
            if (Date.now() - countdownStartTicks >= 3000) {
                // Oyuncu 2: Sol Tık = Yüksek, Sağ Tık = Alçak
                if (e.button === 0) p2.kick('high');
                if (e.button === 2) p2.kick('low');
            }
        } else if (currentState === STATE_GAMEOVER) {
            if (mx >= btnRestartRect.x && mx <= btnRestartRect.x + btnRestartRect.w &&
                my >= btnRestartRect.y && my <= btnRestartRect.y + btnRestartRect.h) {
                resetGame();
                currentState = STATE_PLAYING;
            } else if (mx >= btnMenuRect.x && mx <= btnMenuRect.x + btnMenuRect.w &&
                       my >= btnMenuRect.y && my <= btnMenuRect.y + btnMenuRect.h) {
                currentState = STATE_MENU;
            }
        }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Çarpışma Hesaplamaları (1:1 Orijinal Pygame Fiziği)
    function handlePhysics() {
        // Karakter - Karakter Çarpışması
        const p1R = p1.x + p1.width;
        const p2L = p2.x;
        if (p1.x < p2.x + p2.width && p1R > p2L && p1.y < p2.y + p2.height && p1.y + p1.height > p2.y) {
            const overlapX = Math.min(p1R - p2L, p2.x + p2.width - p1.x);
            if (p1.x < p2.x) {
                p1.x -= overlapX / 2 + 0.5;
                p2.x += overlapX / 2 + 0.5;
            } else {
                p1.x += overlapX / 2 + 0.5;
                p2.x -= overlapX / 2 + 0.5;
            }
            if (p1.x < 0) p1.x = 0;
            if (p2.x + p2.width > WIDTH) p2.x = WIDTH - p2.width;
        }

        // Kale Üst Direkleri
        [crossbarLeft, crossbarRight].forEach(bar => {
            const bL = ball.x - ball.radius;
            const bR = ball.x + ball.radius;
            const bT = ball.y - ball.radius;
            const bB = ball.y + ball.radius;

            if (bR > bar.left && bL < bar.right && bB > bar.top && bT < bar.bottom) {
                const overlapLeft = bR - bar.left;
                const overlapRight = bar.right - bL;
                const overlapTop = bB - bar.top;
                const overlapBottom = bar.bottom - bT;
                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapTop) {
                    ball.y = bar.top - ball.radius;
                    ball.velY = -Math.abs(ball.velY) * 0.85 - 1;
                } else if (minOverlap === overlapBottom) {
                    ball.y = bar.bottom + ball.radius;
                    ball.velY = Math.abs(ball.velY) * 0.85 + 1;
                } else if (minOverlap === overlapLeft) {
                    ball.x = bar.left - ball.radius;
                    ball.velX = -Math.abs(ball.velX) * 0.85;
                } else {
                    ball.x = bar.right + ball.radius;
                    ball.velX = Math.abs(ball.velX) * 0.85;
                }
                SoundFX.bounce();
            }
        });

        // Sıkışan Top Kontrolü
        const pDist = Math.abs((p1.x + p1.width / 2) - (p2.x + p2.width / 2));
        if (pDist < 130 && ((p1.x < ball.x && ball.x < p2.x) || (p2.x < ball.x && ball.x < p1.x))) {
            if (keys['KeyM'] || keys['KeyW'] || keys['ArrowUp'] || keys['KeyN']) {
                ball.velY = -16.0;
                ball.velX = Math.random() > 0.5 ? 11.0 : -11.0;
            }
        }

        // Karakter - Top Çarpışmaları (Kafa Vuruşları)
        [p1, p2].forEach(p => {
            const headX = p.x + p.width / 2;
            const headY = p.y + p.height / 2 - 10;
            const dx = ball.x - headX;
            const dy = ball.y - headY;
            const dist = Math.hypot(dx, dy);
            const minDist = 45 + ball.radius;

            if (dist < minDist && dist > 0) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                ball.x += nx * overlap;
                ball.y += ny * overlap;

                const dirMult = p.facingRight ? 1 : -1;
                const fwdBoost = !p.onGround ? (dirMult * 3.5) : (dirMult * 1.5);

                ball.velX = ball.velX * 0.3 + nx * 5.5 + fwdBoost;
                ball.velY = ball.velY * 0.3 + ny * 5.5;
                SoundFX.bounce();
            }

            // Ayak Vuruşları
            if (p.isKicking) {
                const foot = p.getFootCenter();
                const distFoot = Math.hypot(ball.x - foot.x, ball.y - foot.y);
                if (distFoot < ball.radius + 28) {
                    const direction = p.facingRight ? 1 : -1;
                    if (p.kickType === 'low') {
                        ball.velX = 23 * direction;
                        ball.velY = -9;
                    } else if (p.kickType === 'high') {
                        ball.velX = 17 * direction;
                        ball.velY = -19;
                    }
                    p.isKicking = false;
                    p.footAngle = 0;
                    SoundFX.kick(p.kickType === 'high');
                }
            }
        });
    }

    // Kalelerin Çizimi
    function drawRealisticGoals() {
        // Ağlar (15px aralıklarla)
        ctx.strokeStyle = 'rgba(240, 240, 240, 0.43)';
        ctx.lineWidth = 1;

        // Sol Kale Ağı
        for (let y = GROUND_Y - GOAL_HEIGHT; y <= GROUND_Y; y += 15) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GOAL_WIDTH, y); ctx.stroke();
        }
        for (let x = 0; x <= GOAL_WIDTH; x += 15) {
            ctx.beginPath(); ctx.moveTo(x, GROUND_Y - GOAL_HEIGHT); ctx.lineTo(x, GROUND_Y); ctx.stroke();
        }

        // Sağ Kale Ağı
        for (let y = GROUND_Y - GOAL_HEIGHT; y <= GROUND_Y; y += 15) {
            ctx.beginPath(); ctx.moveTo(WIDTH - GOAL_WIDTH, y); ctx.lineTo(WIDTH, y); ctx.stroke();
        }
        for (let x = WIDTH - GOAL_WIDTH; x <= WIDTH; x += 15) {
            ctx.beginPath(); ctx.moveTo(x, GROUND_Y - GOAL_HEIGHT); ctx.lineTo(x, GROUND_Y); ctx.stroke();
        }

        // Üst Traversler ve Direkler
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, GROUND_Y - GOAL_HEIGHT, GOAL_WIDTH, 14);
        ctx.fillRect(WIDTH - GOAL_WIDTH, GROUND_Y - GOAL_HEIGHT, GOAL_WIDTH, 14);
        ctx.fillStyle = '#e6e6e6';
        ctx.fillRect(0, GROUND_Y - GOAL_HEIGHT, 10, GOAL_HEIGHT);
        ctx.fillRect(WIDTH - 10, GROUND_Y - GOAL_HEIGHT, 10, GOAL_HEIGHT);
    }

    // Buton Çizimi (Orijinal Tasarım)
    function drawButton(text, rect) {
        ctx.fillStyle = '#235aa0';
        ctx.beginPath();
        ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 15);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    // Animasyonlu Kontrol Kutucukları (Aşağı Kayan Bilgi Kutusu)
    function drawAnimatedControls(countdownMs) {
        let offsetY = 0;
        if (countdownMs < 3000) {
            offsetY = 0;
        } else {
            const slideTime = (countdownMs - 3000) / 1000.0;
            const slideProgress = Math.min(1.0, slideTime / 0.8);
            offsetY = slideProgress * slideProgress * 160;
        }

        if (offsetY >= 160) return;

        const baseY = HEIGHT - 85 + offsetY;
        const boxW = 500;
        const boxH = 55;

        // 1. Oyuncu Kutusu
        ctx.fillStyle = 'rgba(15, 20, 30, 0.9)';
        ctx.beginPath();
        ctx.roundRect(25, baseY, boxW, boxH, 14);
        ctx.fill();
        ctx.strokeStyle = '#dc143c';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#dc143c';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('🔴 OYUNCU 1:', 39, baseY + 8);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 15px Arial, sans-serif';
        ctx.fillText('Hareket: [W][A][D]  |  Şut: [N] Alçak, [M] Yüksek', 39, baseY + 30);

        // 2. Oyuncu Kutusu
        ctx.fillStyle = 'rgba(15, 20, 30, 0.9)';
        ctx.beginPath();
        ctx.roundRect(WIDTH - 525, baseY, boxW, boxH, 14);
        ctx.fill();
        ctx.strokeStyle = '#1e90ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#1e90ff';
        ctx.fillText('🔵 OYUNCU 2:', WIDTH - 511, baseY + 8);
        ctx.fillStyle = '#fff';
        ctx.fillText('Hareket: [YÖN] | Şut: [Sol Tık/J] Yüksek, [Sağ Tık/K] Alçak', WIDTH - 511, baseY + 30);
    }

    // Ana Oyun Döngüsü
    function gameLoop() {
        requestAnimationFrame(gameLoop);

        if (currentState === STATE_MENU) {
            // Menü Arka Planı (menu_bg.jpg)
            if (images.menuBg && images.menuBg.complete && images.menuBg.naturalWidth > 0) {
                ctx.drawImage(images.menuBg, 0, 0, WIDTH, HEIGHT);
            } else {
                ctx.fillStyle = '#141e32';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
            }

            // Orijinal "OYUNA BAŞLA" Butonu
            drawButton('OYUNA BAŞLA', btnStartRect);

            // Başlık & Yapımcı İmzası
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 22px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('⭐ MADE BY YUSUF KAAN ⭐', WIDTH / 2, 40);

            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '14px Arial, sans-serif';
            ctx.fillText('Sistem Entegrasyonu: Halil Eren', WIDTH / 2, 70);

            return;
        }

        // Oyun İçi Arka Planı (Beyaz Saray - background.jpg)
        if (images.bg && images.bg.complete && images.bg.naturalWidth > 0) {
            ctx.drawImage(images.bg, 0, 0, WIDTH, HEIGHT);
        } else {
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.fillStyle = '#228b22';
            ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
        }

        // Kaleler
        drawRealisticGoals();

        // Varlıklar
        p1.draw(ctx);
        p2.draw(ctx);
        ball.draw(ctx);

        // Oyun Mantığı
        const now = Date.now();
        const countdownMs = now - countdownStartTicks;

        if (currentState === STATE_PLAYING) {
            drawAnimatedControls(countdownMs);

            if (countdownMs >= 3000) {
                if (matchStartTicks === 0) matchStartTicks = now;
                const elapsedSec = (now - matchStartTicks) / 1000.0;
                const timeLeft = Math.max(0, MATCH_DURATION - Math.floor(elapsedSec));

                if (timeLeft === 0) {
                    currentState = STATE_GAMEOVER;
                    winner = scoreP1 > scoreP2 ? 1 : (scoreP2 > scoreP1 ? 2 : 0);
                    initGameOverEffects(winner);
                    SoundFX.whistle();
                }

                // Hareket Tuşları
                if (keys['KeyA']) p1.move(-1);
                if (keys['KeyD']) p1.move(1);
                if (keys['KeyW']) p1.jump();

                if (keys['ArrowLeft']) p2.move(-1);
                if (keys['ArrowRight']) p2.move(1);
                if (keys['ArrowUp']) p2.jump();

                p1.update();
                p2.update();
                ball.update();

                handlePhysics();

                // Gol Kontrolleri (Orijinal Mantık)
                if (ball.x - ball.radius <= 10 && ball.y > (GROUND_Y - GOAL_HEIGHT + 14)) {
                    scoreP2++;
                    SoundFX.goal();
                    p1.resetPosition();
                    p2.resetPosition();
                    ball.resetPosition();
                } else if (ball.x + ball.radius >= (WIDTH - 10) && ball.y > (GROUND_Y - GOAL_HEIGHT + 14)) {
                    scoreP1++;
                    SoundFX.goal();
                    p1.resetPosition();
                    p2.resetPosition();
                    ball.resetPosition();
                }
            }
        }

        // Skor Tablosu
        ctx.fillStyle = '#000';
        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${scoreP1}   -   ${scoreP2}`, WIDTH / 2, 25);

        // Süre
        if (currentState === STATE_PLAYING && countdownMs >= 3000) {
            const elapsed = (now - matchStartTicks) / 1000.0;
            const timeLeft = Math.max(0, MATCH_DURATION - Math.floor(elapsed));
            ctx.fillStyle = timeLeft <= 10 ? '#dc143c' : '#000';
            ctx.font = 'bold 30px Arial, sans-serif';
            ctx.fillText(`Süre: ${timeLeft}`, WIDTH / 2, 70);
        }

        // Geri Sayım (3, 2, 1, BAŞLA! - Orijinal Animasyonlu Font)
        if (currentState === STATE_PLAYING && countdownMs < 3500) {
            if (countdownMs < 3000) {
                const number = 3 - Math.floor(countdownMs / 1000);
                const phase = (countdownMs % 1000) / 1000.0;
                const fontSize = Math.floor(130 - (phase * 40));

                ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Gölge
                ctx.fillStyle = '#000';
                ctx.fillText(String(number), WIDTH / 2 + 4, HEIGHT / 2 - 40 + 4);
                // Altın Yazı
                ctx.fillStyle = '#ffd700';
                ctx.fillText(String(number), WIDTH / 2, HEIGHT / 2 - 40);
            } else {
                ctx.font = 'bold 100px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillStyle = '#000';
                ctx.fillText('BAŞLA!', WIDTH / 2 + 4, HEIGHT / 2 - 40 + 4);
                ctx.fillStyle = '#00e676';
                ctx.fillText('BAŞLA!', WIDTH / 2, HEIGHT / 2 - 40);
            }
        }

        // Bitiş Menüsü ve Efektler
        if (currentState === STATE_GAMEOVER) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            // Konfetiler (Kazananın tarafına)
            for (const c of confetti) {
                c.y += c.vy;
                c.x += c.vx;
                if (c.y > HEIGHT) {
                    c.y = -10;
                    c.x = Math.random() * WIDTH;
                }
                ctx.fillStyle = c.color;
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Yağmur Damlaları (Kaybedenin tarafına)
            ctx.strokeStyle = 'rgba(100, 150, 255, 0.7)';
            ctx.lineWidth = 2;
            for (const r of rainDrops) {
                r.y += r.vy;
                if (r.y > HEIGHT) r.y = -20;
                ctx.beginPath();
                ctx.moveTo(r.x, r.y);
                ctx.lineTo(r.x - 1, r.y + r.length);
                ctx.stroke();
            }

            // Kaybedenin Üzerinde Kara Bulutlar
            const loserSide = scoreP1 > scoreP2 ? WIDTH / 2 : (scoreP2 > scoreP1 ? 0 : -1);
            if (loserSide !== -1) {
                ctx.fillStyle = 'rgba(100, 100, 110, 0.85)';
                ctx.beginPath();
                ctx.ellipse(loserSide + 150, 65, 95, 28, 0, 0, Math.PI * 2);
                ctx.ellipse(loserSide + 230, 50, 105, 33, 0, 0, Math.PI * 2);
                ctx.ellipse(loserSide + 310, 65, 85, 28, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Kazanan Yazısı
            ctx.font = 'bold 60px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (scoreP1 > scoreP2) {
                ctx.fillStyle = '#dc143c';
                ctx.fillText('1. OYUNCU KAZANDI!', WIDTH / 2, HEIGHT / 2 - 90);
            } else if (scoreP2 > scoreP1) {
                ctx.fillStyle = '#1e90ff';
                ctx.fillText('2. OYUNCU KAZANDI!', WIDTH / 2, HEIGHT / 2 - 90);
            } else {
                ctx.fillStyle = '#ffd700';
                ctx.fillText('MAÇ BERABERE BİTTİ!', WIDTH / 2, HEIGHT / 2 - 90);
            }

            drawButton('Tekrar Başlat', btnRestartRect);
            drawButton('Ana Menü', btnMenuRect);
        }
    }

    // Ses Aç/Kapat Butonu
    const btnSound = document.getElementById('btn-toggle-sound');
    if (btnSound) {
        btnSound.addEventListener('click', () => {
            SoundFX.enabled = !SoundFX.enabled;
            btnSound.textContent = SoundFX.enabled ? '🔊' : '🔇';
        });
    }

    // Tam Ekran Butonu
    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });
    }

    // Başlat
    preloadAllImages(() => {
        requestAnimationFrame(gameLoop);
    });

})();
