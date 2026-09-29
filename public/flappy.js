// flappy.js - High Performance Cyber Flappy Bird
(function () {
    'use strict';

    const canvas = document.getElementById('flappy-canvas');
    const ctx = canvas.getContext('2d');

    const overlayStart = document.getElementById('overlay-start');
    const overlayGameOver = document.getElementById('overlay-gameover');
    const liveScoreEl = document.getElementById('live-score');
    const hudBestEl = document.getElementById('hud-best-score');
    const goScoreEl = document.getElementById('go-score');
    const goBestEl = document.getElementById('go-best');
    const goMedalEl = document.getElementById('go-medal');
    const btnStart = document.getElementById('btn-start-game');
    const btnRestart = document.getElementById('btn-restart-game');
    const btnSound = document.getElementById('btn-sound');
    const skinsContainer = document.getElementById('skins-container');
    const modalRating = document.getElementById('modal-exit-rating');
    const btnBackPortal = document.getElementById('btn-back-portal');
    const btnGoPortal = document.getElementById('btn-go-portal');

    let audioCtx = null;
    let soundEnabled = true;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playSound(type) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            if (type === 'flap') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(now); osc.stop(now + 0.08);
            } else if (type === 'point') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(900, now);
                osc.frequency.setValueAtTime(1300, now + 0.08);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(now); osc.stop(now + 0.2);
            } else if (type === 'hit') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(250, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(now); osc.stop(now + 0.15);
            }
        } catch (_) {}
    }

    // --- GAME STATE ---
    let width = 480;
    let height = 640;
    let isPlaying = false;
    let isGameOver = false;
    let score = 0;
    let bestScore = 0;
    let selectedSkin = 'cyber';

    try {
        bestScore = parseInt(localStorage.getItem('flappy_best') || '0', 10);
    } catch (_) {}
    hudBestEl.textContent = bestScore;

    function resize() {
        const container = canvas.parentElement;
        width = container.clientWidth || 480;
        height = container.clientHeight || 640;
        canvas.width = width;
        canvas.height = height;
    }
    window.addEventListener('resize', resize);
    resize();

    // Bird Object
    const bird = {
        x: 100,
        y: 300,
        radius: 18,
        vy: 0,
        gravity: 0.48,
        jump: -8.8,
        tilt: 0,
        wingAngle: 0
    };

    // Pipes & Particles
    let pipes = [];
    let particles = [];
    const PIPE_WIDTH = 68;
    const PIPE_GAP = 145;
    const PIPE_SPEED = 2.8;
    let pipeTimer = 0;

    // Background Stars & Buildings
    const buildings = [];
    for (let i = 0; i < 20; i++) {
        buildings.push({
            x: i * 50,
            w: 45 + Math.random() * 25,
            h: 80 + Math.random() * 160,
            color: (i % 2 === 0) ? '#0d1326' : '#111833'
        });
    }

    function spawnPipe() {
        const minH = 70;
        const maxH = height - PIPE_GAP - minH;
        const topH = Math.floor(minH + Math.random() * (maxH - minH));
        pipes.push({
            x: width + 20,
            top: topH,
            bottom: topH + PIPE_GAP,
            passed: false
        });
    }

    function flap() {
        initAudio();
        if (!isPlaying) {
            startGame();
            return;
        }
        if (isGameOver) return;

        bird.vy = bird.jump;
        playSound('flap');

        // Flap jet particles
        for (let i = 0; i < 5; i++) {
            particles.push({
                x: bird.x - 12,
                y: bird.y + (Math.random() - 0.5) * 10,
                vx: -2 - Math.random() * 3,
                vy: (Math.random() - 0.5) * 2,
                color: selectedSkin === 'phoenix' ? '#ff3d00' : '#00f0ff',
                size: 4,
                life: 0.35,
                maxLife: 0.35
            });
        }
    }

    function startGame() {
        isPlaying = true;
        isGameOver = false;
        score = 0;
        liveScoreEl.textContent = '0';
        overlayStart.classList.add('hidden');
        overlayGameOver.classList.add('hidden');

        bird.x = width > 500 ? 140 : 90;
        bird.y = height / 2;
        bird.vy = 0;
        bird.tilt = 0;
        pipes = [];
        particles = [];
        pipeTimer = 0;
    }

    function triggerGameOver() {
        if (isGameOver) return;
        isGameOver = true;
        isPlaying = false;
        playSound('hit');

        if (score > bestScore) {
            bestScore = score;
            try { localStorage.setItem('flappy_best', bestScore.toString()); } catch (_) {}
            hudBestEl.textContent = bestScore;
        }

        goScoreEl.textContent = score;
        goBestEl.textContent = bestScore;

        // Determine Medal
        if (score >= 50) goMedalEl.textContent = '👑';
        else if (score >= 25) goMedalEl.textContent = '🥇';
        else if (score >= 10) goMedalEl.textContent = '🥈';
        else goMedalEl.textContent = '🥉';

        overlayGameOver.classList.remove('hidden');

        // Explosion particles
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 6 + 2;
            particles.push({
                x: bird.x,
                y: bird.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: '#ff2a5f',
                size: 5,
                life: 0.6,
                maxLife: 0.6
            });
        }
    }

    // --- GAME LOOP ---
    let lastTime = performance.now();

    function update(dt) {
        if (!isPlaying || isGameOver) return;

        // Bird Physics
        bird.vy += bird.gravity;
        bird.y += bird.vy;
        bird.wingAngle += 0.25;

        // Tilt based on vy
        bird.tilt = Math.min(Math.PI / 4, Math.max(-Math.PI / 6, bird.vy * 0.07));

        // Floor / Ceiling Collision
        if (bird.y + bird.radius >= height - 30) {
            bird.y = height - 30 - bird.radius;
            triggerGameOver();
        }
        if (bird.y - bird.radius <= 0) {
            bird.y = bird.radius;
            bird.vy = 0;
        }

        // Pipe Spawning
        pipeTimer += dt;
        if (pipeTimer > 1.6) {
            pipeTimer = 0;
            spawnPipe();
        }

        // Pipe Updating & Collision
        for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i];
            p.x -= PIPE_SPEED;

            // Score check
            if (!p.passed && p.x + PIPE_WIDTH < bird.x) {
                p.passed = true;
                score++;
                liveScoreEl.textContent = score;
                playSound('point');
            }

            // AABB Collision with Circular Bird
            const birdRight = bird.x + bird.radius - 4;
            const birdLeft = bird.x - bird.radius + 4;
            const birdTop = bird.y - bird.radius + 4;
            const birdBottom = bird.y + bird.radius - 4;

            if (birdRight > p.x && birdLeft < p.x + PIPE_WIDTH) {
                if (birdTop < p.top || birdBottom > p.bottom) {
                    triggerGameOver();
                }
            }

            if (p.x + PIPE_WIDTH < -50) {
                pipes.splice(i, 1);
            }
        }

        // Update Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= dt;
            if (pt.life <= 0) particles.splice(i, 1);
        }
    }

    function render() {
        ctx.clearRect(0, 0, width, height);

        // 1. Cyber Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#060913');
        skyGrad.addColorStop(0.7, '#0e172e');
        skyGrad.addColorStop(1, '#1a264a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. City Skyline
        buildings.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x % width, height - b.h - 30, b.w, b.h);
            // Window dots
            ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
            for (let wy = height - b.h - 15; wy < height - 40; wy += 22) {
                ctx.fillRect((b.x % width) + 8, wy, 6, 6);
                ctx.fillRect((b.x % width) + 24, wy, 6, 6);
            }
        });

        // 3. Neon Pipes
        pipes.forEach(p => {
            const pipeColor = selectedSkin === 'phoenix' ? '#ff3d00' : '#00e676';
            const pipeGlow = selectedSkin === 'phoenix' ? 'rgba(255, 61, 0, 0.4)' : 'rgba(0, 230, 118, 0.4)';

            // Top Pipe
            ctx.fillStyle = '#101d24';
            ctx.fillRect(p.x, 0, PIPE_WIDTH, p.top);
            ctx.strokeStyle = pipeColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.top);
            // Pipe lip
            ctx.fillStyle = pipeColor;
            ctx.fillRect(p.x - 4, p.top - 20, PIPE_WIDTH + 8, 20);

            // Bottom Pipe
            ctx.fillStyle = '#101d24';
            ctx.fillRect(p.x, p.bottom, PIPE_WIDTH, height - p.bottom);
            ctx.strokeRect(p.x, p.bottom, PIPE_WIDTH, height - p.bottom);
            // Pipe lip
            ctx.fillRect(p.x - 4, p.bottom, PIPE_WIDTH + 8, 20);
        });

        // 4. Ground
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, height - 30, width, 30);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height - 30);
        ctx.lineTo(width, height - 30);
        ctx.stroke();

        // 5. Particles
        particles.forEach(pt => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 6. Draw Bird
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(bird.tilt);

        let bodyColor = '#00f0ff';
        let wingColor = '#ffd700';

        if (selectedSkin === 'phoenix') {
            bodyColor = '#ff3d00';
            wingColor = '#ffd700';
        } else if (selectedSkin === 'mecha') {
            bodyColor = '#9c27b0';
            wingColor = '#00e676';
        } else if (selectedSkin === 'gold') {
            bodyColor = '#ffd700';
            wingColor = '#ffffff';
        }

        // Glow
        ctx.shadowColor = bodyColor;
        ctx.shadowBlur = 15;

        // Body
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, bird.radius + 3, bird.radius - 1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Wing
        const wingY = Math.sin(bird.wingAngle) * 6;
        ctx.fillStyle = wingColor;
        ctx.beginPath();
        ctx.ellipse(-6, wingY, 8, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8, -6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(10, -6, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.moveTo(14, -2);
        ctx.lineTo(24, 2);
        ctx.lineTo(14, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        render();
    }
    requestAnimationFrame(loop);

    // --- CONTROLS ---
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            e.preventDefault();
            flap();
        }
    });

    canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        flap();
    });

    if (btnStart) btnStart.addEventListener('click', startGame);
    if (btnRestart) btnRestart.addEventListener('click', startGame);

    if (btnSound) {
        btnSound.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            btnSound.textContent = soundEnabled ? '🔊 Ses: Açık' : '🔇 Ses: Kapalı';
        });
    }

    if (skinsContainer) {
        skinsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.skin-btn');
            if (btn) {
                document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedSkin = btn.dataset.skin || 'cyber';
            }
        });
    }

    // --- EXIT RATING MODAL (PORTALE GİDERKEN DEĞERLENDİRME) ---
    let chosenRating = 5;

    function openExitRating() {
        if (modalRating) modalRating.classList.remove('hidden');
    }

    const starEls = document.querySelectorAll('#exit-stars span');
    starEls.forEach(star => {
        star.addEventListener('click', () => {
            chosenRating = parseInt(star.dataset.star, 10);
            starEls.forEach(s => {
                const val = parseInt(s.dataset.star, 10);
                s.classList.toggle('active', val <= chosenRating);
            });
        });
    });

    const btnSubmitRating = document.getElementById('btn-submit-rating');
    if (btnSubmitRating) {
        btnSubmitRating.addEventListener('click', () => {
            try {
                fetch('/api/ratings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game: 'flappy', stars: chosenRating })
                }).catch(() => {});
            } catch (_) {}
            window.location.href = '/';
        });
    }

    const btnSkipRating = document.getElementById('btn-skip-rating');
    if (btnSkipRating) {
        btnSkipRating.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    if (btnBackPortal) btnBackPortal.addEventListener('click', openExitRating);
    if (btnGoPortal) btnGoPortal.addEventListener('click', openExitRating);

})();
