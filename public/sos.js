const username = localStorage.getItem('portal_username') || 'Oyuncu';
document.getElementById('player-name').textContent = username;

const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
let ws = new WebSocket(`${wsProto}//${location.host}`);

let gameState = null;
let myPlayerId = 1;
let selectedLetter = 'S';
let cellSize = 40;

if (window.innerWidth < 600) {
    cellSize = 30;
}

// Audio context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'place') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'sos') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(554, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

ws.onopen = () => {
    console.log('WS Connected');
};

ws.onmessage = (e) => {
    let data;
    try {
        // Handle socket.io style wrapper if any, or raw JSON
        if (typeof e.data === 'string' && e.data.startsWith('42')) {
            const arr = JSON.parse(e.data.substring(2));
            data = arr[1];
        } else {
            data = JSON.parse(e.data);
        }
    } catch (err) { return; }

    if (!data.type) return;

    if (data.type === 'sos_waiting') {
        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('waiting-screen').style.display = 'flex';
        document.getElementById('room-id-display').textContent = `Oda ID: ${data.roomId}`;
    }
    else if (data.type === 'sos_start') {
        gameState = data.state;
        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('waiting-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'flex';
        
        document.getElementById('p1-name').textContent = gameState.p1name;
        document.getElementById('p2-name').textContent = gameState.p2name;
        
        initCanvas();
        updateUI();
    }
    else if (data.type === 'sos_move') {
        gameState.grid[data.y][data.x] = data.letter;
        gameState.scores = data.scores;
        gameState.turn = data.turn;
        
        playSound('place');
        
        if (data.newSOS && data.newSOS.length > 0) {
            playSound('sos');
            // Animate line drawing
            drawSOSLines(data.newSOS, data.player);
            // Save to state for redraws
            if(!gameState.lines) gameState.lines = [];
            data.newSOS.forEach(l => {
                gameState.lines.push({x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, p: data.player});
            });
        }
        
        drawGrid();
        updateUI();
    }
    else if (data.type === 'sos_end') {
        gameState.scores = data.scores;
        updateUI();
        document.getElementById('game-over-box').style.display = 'block';
        let text = 'Berabere!';
        if (data.winner === myPlayerId) text = 'Kazandın! 🎉';
        else if (data.winner !== 0) text = 'Kaybettin! 😢';
        document.getElementById('winner-text').textContent = text;
    }
    else if (data.type === 'sos_left') {
        alert('Rakip oyundan ayrıldı!');
        location.reload();
    }
};

// UI Listeners
document.getElementById('btn-vs-ai').onclick = () => {
    ws.send(JSON.stringify({
        type: 'sos_create',
        gridSize: document.getElementById('grid-size').value,
        vsAI: true,
        username
    }));
    myPlayerId = 1;
};

document.getElementById('btn-vs-friend').onclick = () => {
    ws.send(JSON.stringify({
        type: 'sos_create',
        gridSize: document.getElementById('grid-size').value,
        vsAI: false,
        username
    }));
    myPlayerId = 1;
};

document.getElementById('btn-join-friend').onclick = () => {
    ws.send(JSON.stringify({
        type: 'sos_join',
        username
    }));
    myPlayerId = 2;
};

document.getElementById('btn-cancel-wait').onclick = () => {
    ws.send(JSON.stringify({type: 'sos_leave'}));
    location.reload();
};

document.getElementById('btn-back-menu').onclick = () => {
    location.reload();
};

document.getElementById('btn-select-s').onclick = () => {
    selectedLetter = 'S';
    document.getElementById('btn-select-s').classList.add('active');
    document.getElementById('btn-select-o').classList.remove('active');
};
document.getElementById('btn-select-o').onclick = () => {
    selectedLetter = 'O';
    document.getElementById('btn-select-o').classList.add('active');
    document.getElementById('btn-select-s').classList.remove('active');
};

// Canvas
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const linesCanvas = document.getElementById('lines-canvas');
const lctx = linesCanvas.getContext('2d');

function initCanvas() {
    const size = gameState.size;
    canvas.width = size * cellSize;
    canvas.height = size * cellSize;
    linesCanvas.width = canvas.width;
    linesCanvas.height = canvas.height;
    
    // Add click listener
    canvas.addEventListener('click', handleGridClick);
    
    drawGrid();
}

function handleGridClick(e) {
    if (!gameState || gameState.turn !== myPlayerId) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    if (x >= 0 && x < gameState.size && y >= 0 && y < gameState.size) {
        if (!gameState.grid[y][x]) {
            ws.send(JSON.stringify({
                type: 'sos_move',
                x, y,
                letter: selectedLetter
            }));
        }
    }
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const size = gameState.size;
    
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    
    // Draw cells
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            
            const letter = gameState.grid[y][x];
            if (letter) {
                ctx.fillStyle = letter === 'S' ? '#00e5ff' : '#00e676';
                ctx.font = `bold ${cellSize * 0.6}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(letter, x * cellSize + cellSize/2, y * cellSize + cellSize/2);
            }
        }
    }
    
    // Redraw all lines
    lctx.clearRect(0, 0, linesCanvas.width, linesCanvas.height);
    if (gameState.lines) {
        gameState.lines.forEach(l => {
            lctx.beginPath();
            lctx.moveTo(l.x1 * cellSize + cellSize/2, l.y1 * cellSize + cellSize/2);
            lctx.lineTo(l.x2 * cellSize + cellSize/2, l.y2 * cellSize + cellSize/2);
            lctx.strokeStyle = l.p === 1 ? '#00e5ff' : '#00e676';
            lctx.lineWidth = 4;
            lctx.stroke();
        });
    }
}

function drawSOSLines(lines, player) {
    lines.forEach(l => {
        lctx.beginPath();
        lctx.moveTo(l.x1 * cellSize + cellSize/2, l.y1 * cellSize + cellSize/2);
        lctx.lineTo(l.x2 * cellSize + cellSize/2, l.y2 * cellSize + cellSize/2);
        lctx.strokeStyle = player === 1 ? '#00e5ff' : '#00e676';
        lctx.lineWidth = 4;
        lctx.stroke();
    });
}

function updateUI() {
    document.getElementById('p1-score').textContent = gameState.scores[1];
    document.getElementById('p2-score').textContent = gameState.scores[2];
    
    const p1box = document.getElementById('p1-score-box');
    const p2box = document.getElementById('p2-score-box');
    const turnDisp = document.getElementById('turn-display');
    
    if (gameState.turn === 1) {
        p1box.classList.add('p1-active');
        p2box.classList.remove('p2-active');
        turnDisp.textContent = 'Sıra: ' + gameState.p1name;
        turnDisp.style.color = '#00e5ff';
    } else {
        p1box.classList.remove('p1-active');
        p2box.classList.add('p2-active');
        turnDisp.textContent = 'Sıra: ' + gameState.p2name;
        turnDisp.style.color = '#00e676';
    }
}
