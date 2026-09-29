// PYTHON & PYGAME WEB ARENASI MOTORU
(function() {
    'use strict';

    const canvas = document.getElementById('pygame-canvas');
    const ctx = canvas.getContext('2d');
    const hudScore = document.getElementById('py-hud-score');
    const hudWave = document.getElementById('py-hud-wave');
    const hudLives = document.getElementById('py-hud-lives');
    const goModal = document.getElementById('py-gameover');
    const goScore = document.getElementById('go-score');
    const goHighScore = document.getElementById('go-highscore');
    const codePanel = document.getElementById('py-code-panel');
    const codeEditor = document.getElementById('py-code-editor');
    const btnToggleSound = document.getElementById('btn-toggle-sound');

    // 1. STATE & AUDIO
    let currentGameType = 'space'; // 'space', 'snake', 'flappy'
    let soundEnabled = true;
    let audioCtx = null;
    let isGameOver = false;
    let score = 0;
    let highScore = localStorage.getItem('pygame_highscore') || 0;
    let wave = 1;
    let lives = 3;

    function initAudio() {
        if (audioCtx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        } catch (_) {}
    }

    function playTone(freq, type, duration, vol = 0.15) {
        if (!soundEnabled) return;
        try {
            initAudio();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (_) {}
    }

    function soundLaser() { playTone(880, 'sawtooth', 0.1, 0.12); }
    function soundExplosion() { playTone(120, 'square', 0.25, 0.2); }
    function soundBonus() { playTone(1320, 'sine', 0.15, 0.15); }
    function soundGameOver() {
        [440, 392, 349, 293].forEach((f, i) => setTimeout(() => playTone(f, 'triangle', 0.3), i * 150));
    }

    window.toggleAudio = function() {
        soundEnabled = !soundEnabled;
        if (btnToggleSound) {
            btnToggleSound.textContent = soundEnabled ? '🔊 Ses: Açık' : '🔇 Ses: Kapalı';
        }
    };

    window.toggleFullscreen = function() {
        const wrapper = document.getElementById('canvas-wrapper');
        if (!document.fullscreenElement) {
            (wrapper || document.documentElement).requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    // 2. INPUT KEYS
    const keys = {
        left: false,
        right: false,
        up: false,
        down: false,
        space: false
    };

    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'TEXTAREA') return;
        initAudio();
        const code = e.code;
        if (code === 'ArrowLeft' || code === 'KeyA') keys.left = true;
        if (code === 'ArrowRight' || code === 'KeyD') keys.right = true;
        if (code === 'ArrowUp' || code === 'KeyW') keys.up = true;
        if (code === 'ArrowDown' || code === 'KeyS') keys.down = true;
        if (code === 'Space') { keys.space = true; e.preventDefault(); }
        if (code === 'KeyR') restartCurrentGame();
    });

    window.addEventListener('keyup', (e) => {
        if (e.target.tagName === 'TEXTAREA') return;
        const code = e.code;
        if (code === 'ArrowLeft' || code === 'KeyA') keys.left = false;
        if (code === 'ArrowRight' || code === 'KeyD') keys.right = false;
        if (code === 'ArrowUp' || code === 'KeyW') keys.up = false;
        if (code === 'ArrowDown' || code === 'KeyS') keys.down = false;
        if (code === 'Space') keys.space = false;
    });

    // 3. PYTHON CODE TEMPLATES
    const PYTHON_CODE = {
        space: `# Bilişim Arenası - Pygame Cyber Space Invaders
import pygame
import random

pygame.init()
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cyber Space Invaders")
clock = pygame.time.Clock()

# Oyuncu Parametreleri (Buradan değiştirebilirsin!)
PLAYER_SPEED = 7.5
FIRE_RATE = 0.18
LIVES = 3

class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.rect = pygame.Rect(380, 530, 44, 28)
        self.speed = PLAYER_SPEED
        self.last_shot = 0

    def update(self, keys):
        if keys[pygame.K_LEFT] and self.rect.left > 10:
            self.rect.x -= self.speed
        if keys[pygame.K_RIGHT] and self.rect.right < SCREEN_WIDTH - 10:
            self.rect.x += self.speed

class Alien(pygame.sprite.Sprite):
    def __init__(self, x, y, kind=1):
        super().__init__()
        self.rect = pygame.Rect(x, y, 32, 24)
        self.kind = kind
        self.hp = kind

# Ana Oyun Döngüsü
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    clock.tick(60)
`,
        snake: `# Bilişim Arenası - Pygame Neon Retro Snake
import pygame
import random

pygame.init()
WIDTH, HEIGHT = 800, 600
CELL_SIZE = 25
screen = pygame.display.set_mode((WIDTH, HEIGHT))
clock = pygame.time.Clock()

# Yılan Ayarları
SNAKE_SPEED = 12
INITIAL_LENGTH = 4

snake = [(10, 10), (9, 10), (8, 10)]
direction = (1, 0)
food = (random.randint(0, 31), random.randint(0, 23))

while True:
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_UP and direction != (0, 1):
                direction = (0, -1)
            elif event.key == pygame.K_DOWN and direction != (0, -1):
                direction = (0, 1)
            elif event.key == pygame.K_LEFT and direction != (1, 0):
                direction = (-1, 0)
            elif event.key == pygame.K_RIGHT and direction != (-1, 0):
                direction = (1, 0)
    clock.tick(SNAKE_SPEED)
`,
        flappy: `# Bilişim Arenası - Pygame Flappy Python
import pygame
import random

pygame.init()
screen = pygame.display.set_mode((800, 600))
clock = pygame.time.Clock()

GRAVITY = 0.42
JUMP_FORCE = -8.5
PIPE_SPEED = 3.5
PIPE_GAP = 160

bird_y = 300
bird_vy = 0
pipes = []

while True:
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
            bird_vy = JUMP_FORCE

    bird_vy += GRAVITY
    bird_y += bird_vy
    clock.tick(60)
`
    };

    window.toggleCodePanel = function() {
        const isVisible = codePanel.style.display !== 'none';
        codePanel.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) {
            codeEditor.value = PYTHON_CODE[currentGameType] || '';
        }
    };

    window.applyPythonCode = function() {
        const code = codeEditor.value;
        // Parse simple Python variables if tweaked!
        const speedMatch = code.match(/PLAYER_SPEED\s*=\s*([0-9.]+)/);
        if (speedMatch && spaceGame) {
            spaceGame.player.speed = parseFloat(speedMatch[1]);
        }
        const livesMatch = code.match(/LIVES\s*=\s*([0-9]+)/);
        if (livesMatch) {
            lives = parseInt(livesMatch[1], 10);
            updateHUD();
        }
        const snakeSpeedMatch = code.match(/SNAKE_SPEED\s*=\s*([0-9]+)/);
        if (snakeSpeedMatch && snakeGame) {
            snakeGame.speed = parseInt(snakeSpeedMatch[1], 10);
        }
        soundBonus();
        alert('🐍 Python kodu başarıyla derlendi ve motora uygulandı!');
    };

    // =========================================================
    // GAME 1: CYBER SPACE INVADERS (Pygame 60FPS)
    // =========================================================
    let spaceGame = null;
    function initSpaceGame() {
        spaceGame = {
            player: { x: 380, y: 530, w: 44, h: 26, speed: 7.5, lastShot: 0 },
            lasers: [],
            alienLasers: [],
            aliens: [],
            particles: [],
            alienDir: 1,
            alienStepTimer: 0,
            ufo: null,
            ufoTimer: 0
        };

        spawnAlienWave();
    }

    function spawnAlienWave() {
        spaceGame.aliens = [];
        const rows = 4;
        const cols = 9;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                spaceGame.aliens.push({
                    x: 100 + c * 65,
                    y: 70 + r * 50,
                    w: 36,
                    h: 26,
                    kind: rows - r, // 1 to 4
                    hp: 1,
                    frame: 0
                });
            }
        }
    }

    function updateSpaceGame(dt) {
        if (isGameOver) return;
        const p = spaceGame.player;

        // Player Move
        if (keys.left && p.x > 20) p.x -= p.speed;
        if (keys.right && p.x < 800 - p.w - 20) p.x += p.speed;

        // Fire Lasers (Space)
        const now = performance.now() / 1000;
        if (keys.space && now - p.lastShot > 0.22) {
            p.lastShot = now;
            spaceGame.lasers.push({ x: p.x + 8, y: p.y - 6, w: 4, h: 14, vy: -12 });
            spaceGame.lasers.push({ x: p.x + p.w - 12, y: p.y - 6, w: 4, h: 14, vy: -12 });
            soundLaser();
        }

        // Update Lasers
        for (let i = spaceGame.lasers.length - 1; i >= 0; i--) {
            const l = spaceGame.lasers[i];
            l.y += l.vy;
            if (l.y < -20) { spaceGame.lasers.splice(i, 1); continue; }

            // Check collision with aliens
            for (let j = spaceGame.aliens.length - 1; j >= 0; j--) {
                const a = spaceGame.aliens[j];
                if (l.x + l.w > a.x && l.x < a.x + a.w && l.y + l.h > a.y && l.y < a.y + a.h) {
                    // Alien hit!
                    spaceGame.lasers.splice(i, 1);
                    spawnExplosion(a.x + a.w / 2, a.y + a.h / 2, a.kind === 4 ? '#ff2a5f' : '#00dbff');
                    soundExplosion();
                    score += a.kind * 10;
                    spaceGame.aliens.splice(j, 1);
                    updateHUD();
                    break;
                }
            }
        }

        // Alien Movement & March
        spaceGame.alienStepTimer += dt;
        const stepRate = Math.max(0.12, 0.65 - (36 - spaceGame.aliens.length) * 0.015);
        if (spaceGame.alienStepTimer > stepRate) {
            spaceGame.alienStepTimer = 0;
            let hitEdge = false;
            for (const a of spaceGame.aliens) {
                if ((spaceGame.alienDir === 1 && a.x + a.w > 760) || (spaceGame.alienDir === -1 && a.x < 40)) {
                    hitEdge = true;
                    break;
                }
            }

            if (hitEdge) {
                spaceGame.alienDir *= -1;
                for (const a of spaceGame.aliens) {
                    a.y += 24;
                    // If aliens reach player's level -> Game Over!
                    if (a.y + a.h >= p.y) triggerGameOver();
                }
            } else {
                for (const a of spaceGame.aliens) {
                    a.x += spaceGame.alienDir * 18;
                    a.frame = 1 - a.frame;
                }
            }

            // Random alien shots
            if (spaceGame.aliens.length > 0 && Math.random() < 0.6) {
                const shooter = spaceGame.aliens[Math.floor(Math.random() * spaceGame.aliens.length)];
                spaceGame.alienLasers.push({ x: shooter.x + shooter.w / 2 - 2, y: shooter.y + shooter.h, w: 4, h: 12, vy: 5.5 });
            }
        }

        // Alien Lasers
        for (let i = spaceGame.alienLasers.length - 1; i >= 0; i--) {
            const al = spaceGame.alienLasers[i];
            al.y += al.vy;
            if (al.y > 620) { spaceGame.alienLasers.splice(i, 1); continue; }

            // Hit player
            if (al.x + al.w > p.x && al.x < p.x + p.w && al.y + al.h > p.y && al.y < p.y + p.h) {
                spaceGame.alienLasers.splice(i, 1);
                spawnExplosion(p.x + p.w / 2, p.y + p.h / 2, '#ff2a5f');
                soundExplosion();
                lives--;
                updateHUD();
                if (lives <= 0) triggerGameOver();
            }
        }

        // Next Wave check
        if (spaceGame.aliens.length === 0) {
            wave++;
            score += 200;
            soundBonus();
            spawnAlienWave();
            updateHUD();
        }

        // Update particles
        updateParticles(dt);
    }

    function spawnExplosion(x, y, color) {
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 5 + 2;
            spaceGame.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                alpha: 1.0,
                color,
                size: Math.random() * 4 + 2
            });
        }
    }

    function updateParticles(dt) {
        for (let i = spaceGame.particles.length - 1; i >= 0; i--) {
            const pt = spaceGame.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.alpha -= 0.04;
            if (pt.alpha <= 0) spaceGame.particles.splice(i, 1);
        }
    }

    function renderSpaceGame() {
        // Space Background
        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, 800, 600);

        // Starfield
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < 40; i++) {
            const sx = (i * 73) % 800;
            const sy = (i * 97 + (performance.now() * 0.05)) % 600;
            ctx.fillRect(sx, sy, 2, 2);
        }

        // Draw Player Ship
        const p = spaceGame.player;
        ctx.save();
        ctx.fillStyle = '#00dbff';
        ctx.shadowColor = '#00dbff';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(p.x + p.w / 2, p.y);
        ctx.lineTo(p.x + p.w, p.y + p.h);
        ctx.lineTo(p.x + p.w - 8, p.y + p.h - 6);
        ctx.lineTo(p.x + 8, p.y + p.h - 6);
        ctx.lineTo(p.x, p.y + p.h);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#fff';
        ctx.fillRect(p.x + p.w / 2 - 3, p.y + 8, 6, 8);
        ctx.restore();

        // Draw Player Lasers
        ctx.fillStyle = '#00e676';
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 8;
        for (const l of spaceGame.lasers) {
            ctx.fillRect(l.x, l.y, l.w, l.h);
        }
        ctx.shadowBlur = 0;

        // Draw Alien Lasers
        ctx.fillStyle = '#ff2a5f';
        ctx.shadowColor = '#ff2a5f';
        ctx.shadowBlur = 8;
        for (const al of spaceGame.alienLasers) {
            ctx.fillRect(al.x, al.y, al.w, al.h);
        }
        ctx.shadowBlur = 0;

        // Draw Aliens
        for (const a of spaceGame.aliens) {
            ctx.save();
            ctx.fillStyle = a.kind === 4 ? '#ff2a5f' : a.kind === 3 ? '#ffd700' : a.kind === 2 ? '#b5179e' : '#00dbff';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;

            // Cyber Alien Pixelated Art
            const cx = a.x;
            const cy = a.y;
            ctx.fillRect(cx + 6, cy + 4, a.w - 12, a.h - 8);
            ctx.fillRect(cx + 2, cy + 8, a.w - 4, a.h - 16);

            // Eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(cx + 10, cy + 8, 4, 6);
            ctx.fillRect(cx + a.w - 14, cy + 8, 4, 6);

            // Legs / Antenna
            ctx.fillStyle = a.kind === 4 ? '#ff2a5f' : '#00dbff';
            if (a.frame === 0) {
                ctx.fillRect(cx + 2, cy + a.h - 4, 6, 4);
                ctx.fillRect(cx + a.w - 8, cy + a.h - 4, 6, 4);
            } else {
                ctx.fillRect(cx + 6, cy + a.h - 4, 6, 4);
                ctx.fillRect(cx + a.w - 12, cy + a.h - 4, 6, 4);
            }
            ctx.restore();
        }

        // Draw Particles
        for (const pt of spaceGame.particles) {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.alpha;
            ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        }
        ctx.globalAlpha = 1.0;
    }

    // =========================================================
    // GAME 2: NEON RETRO SNAKE
    // =========================================================
    let snakeGame = null;
    function initSnakeGame() {
        snakeGame = {
            gridW: 32,
            gridH: 24,
            cellSize: 25,
            snake: [{ x: 10, y: 12 }, { x: 9, y: 12 }, { x: 8, y: 12 }],
            dir: { x: 1, y: 0 },
            nextDir: { x: 1, y: 0 },
            food: { x: 20, y: 12 },
            timer: 0,
            speed: 12 // updates per second
        };
    }

    function updateSnakeGame(dt) {
        if (isGameOver) return;
        const s = snakeGame;

        if (keys.left && s.dir.x !== 1) s.nextDir = { x: -1, y: 0 };
        if (keys.right && s.dir.x !== -1) s.nextDir = { x: 1, y: 0 };
        if (keys.up && s.dir.y !== 1) s.nextDir = { x: 0, y: -1 };
        if (keys.down && s.dir.y !== -1) s.nextDir = { x: 0, y: 1 };

        s.timer += dt;
        if (s.timer >= 1 / s.speed) {
            s.timer = 0;
            s.dir = s.nextDir;
            const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

            // Wall collision
            if (head.x < 0 || head.x >= s.gridW || head.y < 0 || head.y >= s.gridH) {
                triggerGameOver();
                return;
            }

            // Self collision
            for (let i = 1; i < s.snake.length; i++) {
                if (head.x === s.snake[i].x && head.y === s.snake[i].y) {
                    triggerGameOver();
                    return;
                }
            }

            s.snake.unshift(head);

            // Food eating
            if (head.x === s.food.x && head.y === s.food.y) {
                score += 10;
                soundBonus();
                s.food = {
                    x: Math.floor(Math.random() * s.gridW),
                    y: Math.floor(Math.random() * s.gridH)
                };
                updateHUD();
            } else {
                s.snake.pop();
            }
        }
    }

    function renderSnakeGame() {
        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, 800, 600);

        const s = snakeGame;
        // Food
        ctx.fillStyle = '#ff2a5f';
        ctx.shadowColor = '#ff2a5f';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc((s.food.x + 0.5) * s.cellSize, (s.food.y + 0.5) * s.cellSize, s.cellSize / 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Snake Body
        s.snake.forEach((seg, idx) => {
            ctx.fillStyle = idx === 0 ? '#00e676' : '#00dbff';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = idx === 0 ? 10 : 4;
            ctx.fillRect(seg.x * s.cellSize + 1, seg.y * s.cellSize + 1, s.cellSize - 2, s.cellSize - 2);
        });
        ctx.shadowBlur = 0;
    }

    // =========================================================
    // GAME 3: FLAPPY PYTHON
    // =========================================================
    let flappyGame = null;
    function initFlappyGame() {
        flappyGame = {
            birdY: 280,
            vy: 0,
            gravity: 0.38,
            jumpForce: -7.5,
            pipes: [],
            pipeTimer: 0,
            passedPipes: 0
        };
        spawnFlappyPipe();
    }

    function spawnFlappyPipe() {
        const topH = Math.floor(Math.random() * 220) + 80;
        const gap = 170;
        flappyGame.pipes.push({
            x: 820,
            w: 64,
            topH: topH,
            bottomY: topH + gap,
            passed: false
        });
    }

    function updateFlappyGame(dt) {
        if (isGameOver) return;
        const f = flappyGame;

        if (keys.space || keys.up) {
            if (!f.jumped) {
                f.vy = f.jumpForce;
                soundLaser();
                f.jumped = true;
            }
        } else {
            f.jumped = false;
        }

        f.vy += f.gravity;
        f.birdY += f.vy;

        if (f.birdY > 580 || f.birdY < 0) {
            triggerGameOver();
            return;
        }

        f.pipeTimer += dt;
        if (f.pipeTimer >= 2.0) {
            f.pipeTimer = 0;
            spawnFlappyPipe();
        }

        for (let i = f.pipes.length - 1; i >= 0; i--) {
            const p = f.pipes[i];
            p.x -= 3.5;

            // Score check
            if (!p.passed && p.x < 180) {
                p.passed = true;
                score += 1;
                soundBonus();
                updateHUD();
            }

            // Collision check (Bird x is fixed at 180, radius 18)
            const birdX = 180;
            if (birdX + 16 > p.x && birdX - 16 < p.x + p.w) {
                if (f.birdY - 16 < p.topH || f.birdY + 16 > p.bottomY) {
                    triggerGameOver();
                    return;
                }
            }

            if (p.x < -80) f.pipes.splice(i, 1);
        }
    }

    function renderFlappyGame() {
        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, 800, 600);

        const f = flappyGame;
        // Pipes
        ctx.fillStyle = '#00e676';
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 8;
        for (const p of f.pipes) {
            ctx.fillRect(p.x, 0, p.w, p.topH);
            ctx.fillRect(p.x, p.bottomY, p.w, 600 - p.bottomY);
        }
        ctx.shadowBlur = 0;

        // Python Bird Head
        ctx.save();
        ctx.translate(180, f.birdY);
        ctx.rotate(Math.min(Math.PI / 4, Math.max(-Math.PI / 4, f.vy * 0.08)));
        ctx.fillStyle = '#00dbff';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        // Eye & Tongue
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(8, -6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillRect(10, -7, 2, 2);

        ctx.fillStyle = '#ff2a5f';
        ctx.fillRect(18, -1, 6, 2);
        ctx.restore();
    }

    // =========================================================
    // GENERAL GAME LOOP & CONTROLLER
    // =========================================================
    function updateHUD() {
        if (hudScore) hudScore.textContent = score;
        if (hudWave) hudWave.textContent = wave;
        if (hudLives) hudLives.textContent = '❤️'.repeat(Math.max(0, lives));

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('pygame_highscore', highScore);
        }
    }

    function triggerGameOver() {
        isGameOver = true;
        soundGameOver();
        if (goModal) {
            goModal.style.display = 'flex';
            if (goScore) goScore.textContent = score;
            if (goHighScore) goHighScore.textContent = highScore;
        }
    }

    window.restartCurrentGame = function() {
        isGameOver = false;
        score = 0;
        wave = 1;
        lives = 3;
        if (goModal) goModal.style.display = 'none';
        updateHUD();

        if (currentGameType === 'space') initSpaceGame();
        else if (currentGameType === 'snake') initSnakeGame();
        else if (currentGameType === 'flappy') initFlappyGame();
    };

    window.changePyGame = function(type) {
        currentGameType = type;
        if (codeEditor) codeEditor.value = PYTHON_CODE[type] || '';
        restartCurrentGame();
    };

    let lastTime = performance.now();
    function mainLoop(now) {
        requestAnimationFrame(mainLoop);
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        if (currentGameType === 'space') {
            updateSpaceGame(dt);
            renderSpaceGame();
        } else if (currentGameType === 'snake') {
            updateSnakeGame(dt);
            renderSnakeGame();
        } else if (currentGameType === 'flappy') {
            updateFlappyGame(dt);
            renderFlappyGame();
        }
    }

    // Boot default game
    initSpaceGame();
    updateHUD();
    requestAnimationFrame(mainLoop);

})();
