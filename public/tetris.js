// tetris.js - Cyber Tetris Engine with Ghost Piece, SRS Wall Kicks & Synthesizer
(function () {
    'use strict';

    const canvas = document.getElementById('tetris-canvas');
    const ctx = canvas.getContext('2d');
    const holdCanvas = document.getElementById('hold-canvas');
    const holdCtx = holdCanvas.getContext('2d');
    const nextCanvas = document.getElementById('next-canvas');
    const nextCtx = nextCanvas.getContext('2d');

    const overlayStart = document.getElementById('overlay-start');
    const overlayGameOver = document.getElementById('overlay-gameover');
    const scoreEl = document.getElementById('tetris-score');
    const bestEl = document.getElementById('tetris-best');
    const levelEl = document.getElementById('tetris-level');
    const linesEl = document.getElementById('tetris-lines');
    const goScoreEl = document.getElementById('go-score');
    const goBestEl = document.getElementById('go-best');
    const goLinesEl = document.getElementById('go-lines');
    const btnStart = document.getElementById('btn-start-game');
    const btnRestart = document.getElementById('btn-restart-game');
    const btnNavRestart = document.getElementById('btn-restart');
    const btnSound = document.getElementById('btn-toggle-sound');
    const modalRating = document.getElementById('modal-exit-rating');
    const btnBackPortal = document.getElementById('btn-back-portal');
    const btnGoPortal = document.getElementById('btn-go-portal');

    // --- AUDIO SYNTHESIZER ---
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

            if (type === 'move') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, now);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(now); osc.stop(now + 0.04);
            } else if (type === 'rotate') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(660, now + 0.06);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(now); osc.stop(now + 0.06);
            } else if (type === 'drop') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(now); osc.stop(now + 0.1);
            } else if (type === 'clear') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.setValueAtTime(659, now + 0.07);
                osc.frequency.setValueAtTime(783, now + 0.14);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(now); osc.stop(now + 0.25);
            } else if (type === 'tetris') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(554, now + 0.08);
                osc.frequency.setValueAtTime(659, now + 0.16);
                osc.frequency.setValueAtTime(880, now + 0.24);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(now); osc.stop(now + 0.45);
            }
        } catch (_) {}
    }

    // --- TETRIS CONFIGURATION ---
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30; // 10 * 30 = 300px, 20 * 30 = 600px

    const SHAPES = {
        I: { matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#00f0ff' },
        J: { matrix: [[1,0,0],[1,1,1],[0,0,0]], color: '#0055ff' },
        L: { matrix: [[0,0,1],[1,1,1],[0,0,0]], color: '#ff9900' },
        O: { matrix: [[1,1],[1,1]], color: '#ffee00' },
        S: { matrix: [[0,1,1],[1,1,0],[0,0,0]], color: '#00ff66' },
        T: { matrix: [[0,1,0],[1,1,1],[0,0,0]], color: '#aa00ff' },
        Z: { matrix: [[1,1,0],[0,1,1],[0,0,0]], color: '#ff2255' }
    };

    const PIECES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

    // --- GAME STATE ---
    let grid = createGrid();
    let currentPiece = null;
    let heldPiece = null;
    let canHold = true;
    let nextQueue = [];
    let score = 0;
    let bestScore = 0;
    let lines = 0;
    let level = 1;
    let dropInterval = 1000;
    let dropTimer = 0;
    let isPlaying = false;
    let isGameOver = false;
    let screenShake = 0;
    let clearAnimations = []; // line clear flashes

    try {
        bestScore = parseInt(localStorage.getItem('tetris_best') || '0', 10);
    } catch (_) {}
    bestEl.textContent = bestScore;

    function createGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    function randomPiece() {
        const type = PIECES[Math.floor(Math.random() * PIECES.length)];
        const shape = SHAPES[type];
        return {
            type: type,
            matrix: shape.matrix.map(row => [...row]),
            color: shape.color,
            x: Math.floor(COLS / 2) - Math.ceil(shape.matrix[0].length / 2),
            y: 0
        };
    }

    function refillQueue() {
        while (nextQueue.length < 4) {
            nextQueue.push(randomPiece());
        }
    }

    function spawnNextPiece() {
        refillQueue();
        currentPiece = nextQueue.shift();
        canHold = true;

        if (checkCollision(currentPiece.matrix, currentPiece.x, currentPiece.y)) {
            triggerGameOver();
        }
    }

    function checkCollision(matrix, px, py) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c]) {
                    const gx = px + c;
                    const gy = py + r;
                    if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
                    if (gy >= 0 && grid[gy][gx]) return true;
                }
            }
        }
        return false;
    }

    function rotateMatrix(matrix) {
        const N = matrix.length;
        const result = Array.from({ length: N }, () => Array(N).fill(0));
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                result[c][N - 1 - r] = matrix[r][c];
            }
        }
        return result;
    }

    function rotatePiece() {
        if (!currentPiece || !isPlaying || isGameOver) return;
        const rotated = rotateMatrix(currentPiece.matrix);

        // Wall kick tests
        const kicks = [0, 1, -1, 2, -2];
        for (const k of kicks) {
            if (!checkCollision(rotated, currentPiece.x + k, currentPiece.y)) {
                currentPiece.matrix = rotated;
                currentPiece.x += k;
                playSound('rotate');
                return;
            }
        }
    }

    function movePiece(dx) {
        if (!currentPiece || !isPlaying || isGameOver) return;
        if (!checkCollision(currentPiece.matrix, currentPiece.x + dx, currentPiece.y)) {
            currentPiece.x += dx;
            playSound('move');
        }
    }

    function dropPiece() {
        if (!currentPiece || !isPlaying || isGameOver) return;
        if (!checkCollision(currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.y++;
        } else {
            lockPiece();
        }
        dropTimer = 0;
    }

    function hardDrop() {
        if (!currentPiece || !isPlaying || isGameOver) return;
        let droppedLines = 0;
        while (!checkCollision(currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.y++;
            droppedLines++;
        }
        score += droppedLines * 2;
        screenShake = 4;
        playSound('drop');
        lockPiece();
    }

    function holdPiece() {
        if (!currentPiece || !canHold || !isPlaying || isGameOver) return;
        canHold = false;
        playSound('rotate');

        const currentType = currentPiece.type;
        if (!heldPiece) {
            heldPiece = currentType;
            spawnNextPiece();
        } else {
            const temp = heldPiece;
            heldPiece = currentType;
            const shape = SHAPES[temp];
            currentPiece = {
                type: temp,
                matrix: shape.matrix.map(row => [...row]),
                color: shape.color,
                x: Math.floor(COLS / 2) - Math.ceil(shape.matrix[0].length / 2),
                y: 0
            };
        }
        drawHoldPiece();
    }

    function lockPiece() {
        const m = currentPiece.matrix;
        for (let r = 0; r < m.length; r++) {
            for (let c = 0; c < m[r].length; c++) {
                if (m[r][c]) {
                    const gy = currentPiece.y + r;
                    const gx = currentPiece.x + c;
                    if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
                        grid[gy][gx] = currentPiece.color;
                    }
                }
            }
        }

        clearFullLines();
        spawnNextPiece();
    }

    function clearFullLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[r].every(cell => cell !== 0)) {
                grid.splice(r, 1);
                grid.unshift(Array(COLS).fill(0));
                cleared++;
                r++; // test same index again
            }
        }

        if (cleared > 0) {
            lines += cleared;
            const pointsTable = [0, 100, 300, 500, 800];
            score += (pointsTable[cleared] || 1000) * level;

            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(120, 1000 - (level - 1) * 90);

            if (cleared === 4) {
                playSound('tetris');
                screenShake = 7;
            } else {
                playSound('clear');
            }

            scoreEl.textContent = score;
            linesEl.textContent = lines;
            levelEl.textContent = level;

            if (score > bestScore) {
                bestScore = score;
                try { localStorage.setItem('tetris_best', bestScore.toString()); } catch(_) {}
                bestEl.textContent = bestScore;
            }
        }
    }

    function getGhostY() {
        if (!currentPiece) return 0;
        let gy = currentPiece.y;
        while (!checkCollision(currentPiece.matrix, currentPiece.x, gy + 1)) {
            gy++;
        }
        return gy;
    }

    function triggerGameOver() {
        isGameOver = true;
        isPlaying = false;
        overlayGameOver.classList.remove('hidden');
        goScoreEl.textContent = score;
        goBestEl.textContent = bestScore;
        goLinesEl.textContent = lines;
    }

    function startGame() {
        initAudio();
        grid = createGrid();
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = 1000;
        dropTimer = 0;
        heldPiece = null;
        canHold = true;
        nextQueue = [];
        isPlaying = true;
        isGameOver = false;

        scoreEl.textContent = '0';
        linesEl.textContent = '0';
        levelEl.textContent = '1';

        overlayStart.classList.add('hidden');
        overlayGameOver.classList.add('hidden');

        refillQueue();
        spawnNextPiece();
        drawHoldPiece();
    }

    // --- DRAWING ---
    function drawBlock(c, x, y, color, isGhost = false) {
        c.save();
        if (isGhost) {
            c.strokeStyle = color;
            c.lineWidth = 1.5;
            c.strokeRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
        } else {
            c.fillStyle = color;
            c.shadowColor = color;
            c.shadowBlur = 8;
            c.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

            // Highlight top/left
            c.fillStyle = 'rgba(255, 255, 255, 0.4)';
            c.fillRect(x + 2, y + 2, BLOCK_SIZE - 4, 3);
            c.fillRect(x + 2, y + 2, 3, BLOCK_SIZE - 4);
        }
        c.restore();
    }

    function drawHoldPiece() {
        holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
        if (!heldPiece) return;
        const shape = SHAPES[heldPiece];
        const m = shape.matrix;
        const size = 18;
        const ox = (holdCanvas.width - m[0].length * size) / 2;
        const oy = (holdCanvas.height - m.length * size) / 2;

        for (let r = 0; r < m.length; r++) {
            for (let c = 0; c < m[r].length; c++) {
                if (m[r][c]) {
                    holdCtx.fillStyle = shape.color;
                    holdCtx.fillRect(ox + c * size + 1, oy + r * size + 1, size - 2, size - 2);
                }
            }
        }
    }

    function drawNextQueue() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        const size = 18;
        for (let i = 0; i < Math.min(3, nextQueue.length); i++) {
            const piece = nextQueue[i];
            const m = piece.matrix;
            const ox = (nextCanvas.width - m[0].length * size) / 2;
            const oy = i * 75 + 15;

            for (let r = 0; r < m.length; r++) {
                for (let c = 0; c < m[r].length; c++) {
                    if (m[r][c]) {
                        nextCtx.fillStyle = piece.color;
                        nextCtx.fillRect(ox + c * size + 1, oy + r * size + 1, size - 2, size - 2);
                    }
                }
            }
        }
    }

    function render() {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Screen Shake
        if (screenShake > 0) {
            ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
            screenShake *= 0.85;
            if (screenShake < 0.2) screenShake = 0;
        }

        // 1. Grid Background
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * BLOCK_SIZE, 0);
            ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
            ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * BLOCK_SIZE);
            ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
            ctx.stroke();
        }

        // 2. Placed Grid Blocks
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c]) {
                    drawBlock(ctx, c * BLOCK_SIZE, r * BLOCK_SIZE, grid[r][c]);
                }
            }
        }

        // 3. Ghost Piece
        if (currentPiece && isPlaying && !isGameOver) {
            const ghostY = getGhostY();
            const m = currentPiece.matrix;
            for (let r = 0; r < m.length; r++) {
                for (let c = 0; c < m[r].length; c++) {
                    if (m[r][c]) {
                        drawBlock(ctx, (currentPiece.x + c) * BLOCK_SIZE, (ghostY + r) * BLOCK_SIZE, currentPiece.color, true);
                    }
                }
            }
        }

        // 4. Current Piece
        if (currentPiece && isPlaying && !isGameOver) {
            const m = currentPiece.matrix;
            for (let r = 0; r < m.length; r++) {
                for (let c = 0; c < m[r].length; c++) {
                    if (m[r][c]) {
                        drawBlock(ctx, (currentPiece.x + c) * BLOCK_SIZE, (currentPiece.y + r) * BLOCK_SIZE, currentPiece.color);
                    }
                }
            }
        }

        ctx.restore();

        drawNextQueue();
    }

    // --- GAME LOOP ---
    let lastTime = performance.now();

    function loop(now) {
        requestAnimationFrame(loop);
        const dt = now - lastTime;
        lastTime = now;

        if (isPlaying && !isGameOver) {
            dropTimer += dt;
            if (dropTimer >= dropInterval) {
                dropPiece();
            }
        }

        render();
    }
    requestAnimationFrame(loop);

    // --- INPUT CONTROLS ---
    window.addEventListener('keydown', (e) => {
        initAudio();
        if (!isPlaying) {
            if (e.code === 'Space' || e.code === 'Enter') startGame();
            return;
        }

        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            e.preventDefault(); movePiece(-1);
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            e.preventDefault(); movePiece(1);
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            e.preventDefault(); dropPiece();
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyX') {
            e.preventDefault(); rotatePiece();
        } else if (e.code === 'Space') {
            e.preventDefault(); hardDrop();
        } else if (e.code === 'KeyC' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            e.preventDefault(); holdPiece();
        }
    });

    // Mobile buttons
    document.getElementById('m-left')?.addEventListener('click', () => movePiece(-1));
    document.getElementById('m-right')?.addEventListener('click', () => movePiece(1));
    document.getElementById('m-down')?.addEventListener('click', () => dropPiece());
    document.getElementById('m-rotate')?.addEventListener('click', () => rotatePiece());
    document.getElementById('m-drop')?.addEventListener('click', () => hardDrop());
    document.getElementById('m-hold')?.addEventListener('click', () => holdPiece());

    if (btnStart) btnStart.addEventListener('click', startGame);
    if (btnRestart) btnRestart.addEventListener('click', startGame);
    if (btnNavRestart) btnNavRestart.addEventListener('click', startGame);

    if (btnSound) {
        btnSound.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            btnSound.textContent = soundEnabled ? '🔊 Ses: Açık' : '🔇 Ses: Kapalı';
        });
    }

    // --- EXIT RATING MODAL ---
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
                    body: JSON.stringify({ game: 'tetris', stars: chosenRating })
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
