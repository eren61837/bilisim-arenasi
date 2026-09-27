// xox.js - XOX Online 1v1 Client Logic & Bot Engine
(function() {
  'use strict';

  const state = {
    username: localStorage.getItem('portal_username') || 'Öğrenci_' + Math.floor(100 + Math.random() * 900),
    isAdmin: localStorage.getItem('portal_is_admin') === 'true',
    isBotMode: false,
    ws: null,
    matchId: null,
    mySymbol: 'X',
    opponentName: 'Rakip',
    board: Array(9).fill(null),
    turn: 'X',
    scoreX: 0,
    scoreO: 0,
    active: false,
    timerSeconds: 15,
    timerInterval: null
  };

  // Audio Synthesizer
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    playClick() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch (_) {}
    },
    playWin() {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0.2, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.25);
        });
      } catch (_) {}
    }
  };

  // DOM Elements
  const elUser = document.getElementById('xox-user-display');
  const cardLobby = document.getElementById('xox-lobby-card');
  const cardArena = document.getElementById('xox-arena-card');
  const btnStartQueue = document.getElementById('btn-start-queue');
  const btnStartBot = document.getElementById('btn-start-bot');
  const queueStatus = document.getElementById('xox-queue-status');
  const btnCancelQueue = document.getElementById('btn-cancel-queue');

  // Arena Elements
  const pXName = document.getElementById('p-x-name');
  const pOName = document.getElementById('p-o-name');
  const pXScore = document.getElementById('p-x-score');
  const pOScore = document.getElementById('p-o-score');
  const turnBanner = document.getElementById('turn-banner');
  const turnText = document.getElementById('turn-text');
  const turnTimer = document.getElementById('turn-timer');
  const gridCells = document.querySelectorAll('.cell');
  const btnRematch = document.getElementById('btn-rematch');
  const btnLeave = document.getElementById('btn-leave-match');
  const reactionBubble = document.getElementById('reaction-bubble');

  // Admin Elements
  const adminBar = document.getElementById('xox-admin-bar');
  const btnAdminInstaWin = document.getElementById('btn-admin-insta-win');
  const btnAdminResetBoard = document.getElementById('btn-admin-reset-board');

  // Init UI
  elUser.textContent = (state.isAdmin ? '👑 ' : '👤 ') + state.username;
  if (state.isAdmin && adminBar) adminBar.classList.remove('hidden');

  // Admin Actions
  if (btnAdminInstaWin) {
    btnAdminInstaWin.addEventListener('click', () => {
      if (state.active) {
        state.active = false;
        clearInterval(state.timerInterval);
        turnText.textContent = '👑 Yönetici Yetkisi ile Kazanıldı!';
        AudioEngine.playWin();
        if (state.mySymbol === 'X') state.scoreX++; else state.scoreO++;
        updateScores();
        btnRematch.classList.remove('hidden');
      }
    });
  }
  if (btnAdminResetBoard) {
    btnAdminResetBoard.addEventListener('click', () => {
      resetBoard();
      state.active = true;
      turnText.textContent = 'Sıra Sende!';
      startTurnTimer();
    });
  }

  // 1. Queue Matchmaking
  btnStartQueue.addEventListener('click', () => {
    state.isBotMode = false;
    queueStatus.classList.remove('hidden');
    btnStartQueue.disabled = true;
    btnStartBot.disabled = true;
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'xox_queue', username: state.username }));
    }
  });

  btnCancelQueue.addEventListener('click', () => {
    queueStatus.classList.add('hidden');
    btnStartQueue.disabled = false;
    btnStartBot.disabled = false;
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: 'xox_cancel_queue' }));
    }
  });

  // 2. Play Against Smart Bot
  btnStartBot.addEventListener('click', () => {
    state.isBotMode = true;
    state.matchId = 'bot_match';
    state.mySymbol = 'X';
    state.opponentName = '🤖 Akıllı Bot';
    state.scoreX = 0;
    state.scoreO = 0;
    startMatchUI();
  });

  // Cell clicks
  gridCells.forEach(cell => {
    cell.addEventListener('click', () => {
      if (!state.active) return;
      if (state.turn !== state.mySymbol) return;

      const idx = parseInt(cell.getAttribute('data-idx'), 10);
      if (state.board[idx] !== null) return;

      if (state.isBotMode) {
        makeMove(idx, state.mySymbol);
        if (state.active && state.turn === 'O') {
          setTimeout(runBotMove, 450);
        }
      } else {
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({
            type: 'xox_move',
            matchId: state.matchId,
            index: idx
          }));
        }
      }
    });
  });

  function makeMove(idx, symbol) {
    state.board[idx] = symbol;
    renderBoard();
    AudioEngine.playClick();

    const winnerInfo = checkLocalWinner(state.board);
    if (winnerInfo) {
      handleGameOver(winnerInfo.winner, winnerInfo.line);
    } else {
      state.turn = state.turn === 'X' ? 'O' : 'X';
      updateTurnBanner();
      startTurnTimer();
    }
  }

  // Smart Bot Minimax AI
  function runBotMove() {
    if (!state.active || state.turn !== 'O') return;

    // Check if bot can win immediately
    for (let i = 0; i < 9; i++) {
      if (state.board[i] === null) {
        state.board[i] = 'O';
        if (checkLocalWinner(state.board)?.winner === 'O') {
          state.board[i] = null;
          makeMove(i, 'O');
          return;
        }
        state.board[i] = null;
      }
    }

    // Check if player can win and block them
    for (let i = 0; i < 9; i++) {
      if (state.board[i] === null) {
        state.board[i] = 'X';
        if (checkLocalWinner(state.board)?.winner === 'X') {
          state.board[i] = null;
          makeMove(i, 'O');
          return;
        }
        state.board[i] = null;
      }
    }

    // Prefer Center
    if (state.board[4] === null) {
      makeMove(4, 'O');
      return;
    }

    // Prefer Corners
    const corners = [0, 2, 6, 8].filter(c => state.board[c] === null);
    if (corners.length > 0) {
      const pick = corners[Math.floor(Math.random() * corners.length)];
      makeMove(pick, 'O');
      return;
    }

    // Pick any remaining
    const remaining = [];
    for (let i = 0; i < 9; i++) {
      if (state.board[i] === null) remaining.push(i);
    }
    if (remaining.length > 0) {
      const pick = remaining[Math.floor(Math.random() * remaining.length)];
      makeMove(pick, 'O');
    }
  }

  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  function checkLocalWinner(board) {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }
    if (board.every(c => c !== null)) {
      return { winner: 'draw', line: null };
    }
    return null;
  }

  function handleGameOver(winner, line) {
    state.active = false;
    clearInterval(state.timerInterval);

    if (line) {
      line.forEach(idx => {
        gridCells[idx].classList.add('win');
      });
    }

    if (winner === 'draw') {
      turnText.textContent = '🤝 Berabere!';
      turnBanner.style.borderColor = '#aaa';
    } else if (winner === state.mySymbol) {
      turnText.textContent = '🎉 Kazandın! Tebrikler!';
      turnBanner.style.borderColor = '#00e676';
      AudioEngine.playWin();
      if (winner === 'X') state.scoreX++; else state.scoreO++;
    } else {
      turnText.textContent = '💀 Kaybettin!';
      turnBanner.style.borderColor = '#ff1744';
      if (winner === 'X') state.scoreX++; else state.scoreO++;
    }

    updateScores();
    btnRematch.classList.remove('hidden');
  }

  function renderBoard() {
    gridCells.forEach((cell, idx) => {
      const val = state.board[idx];
      cell.textContent = val ? (val === 'X' ? '❌' : '⭕') : '';
      cell.className = 'cell' + (val ? (' ' + val.toLowerCase()) : '');
    });
  }

  function resetBoard() {
    state.board = Array(9).fill(null);
    gridCells.forEach(cell => {
      cell.textContent = '';
      cell.className = 'cell';
    });
    btnRematch.classList.add('hidden');
  }

  function updateTurnBanner() {
    const isMyTurn = state.turn === state.mySymbol;
    turnText.textContent = isMyTurn ? '👉 Sıra Sende!' : `⏳ ${state.opponentName} düşünüyor...`;
    turnBanner.style.borderColor = isMyTurn ? '#00dbff' : '#555';
  }

  function startTurnTimer() {
    clearInterval(state.timerInterval);
    state.timerSeconds = 15;
    turnTimer.textContent = `${state.timerSeconds}s`;

    state.timerInterval = setInterval(() => {
      state.timerSeconds--;
      turnTimer.textContent = `${state.timerSeconds}s`;
      if (state.timerSeconds <= 0) {
        clearInterval(state.timerInterval);
        // Time out
        if (state.active) {
          if (state.turn === state.mySymbol) {
            handleGameOver(state.mySymbol === 'X' ? 'O' : 'X', null);
          }
        }
      }
    }, 1000);
  }

  function updateScores() {
    pXScore.textContent = state.scoreX;
    pOScore.textContent = state.scoreO;
  }

  function startMatchUI() {
    cardLobby.classList.add('hidden');
    cardArena.classList.remove('hidden');
    resetBoard();

    pXName.textContent = state.mySymbol === 'X' ? state.username : state.opponentName;
    pOName.textContent = state.mySymbol === 'O' ? state.username : state.opponentName;
    updateScores();

    state.turn = 'X';
    state.active = true;
    updateTurnBanner();
    startTurnTimer();
  }

  // Rematch button
  btnRematch.addEventListener('click', () => {
    if (state.isBotMode) {
      resetBoard();
      state.turn = 'X';
      state.active = true;
      updateTurnBanner();
      startTurnTimer();
    } else {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'xox_rematch', matchId: state.matchId }));
      }
    }
  });

  // Leave Match
  btnLeave.addEventListener('click', () => {
    state.active = false;
    clearInterval(state.timerInterval);
    cardArena.classList.add('hidden');
    cardLobby.classList.remove('hidden');
    queueStatus.classList.add('hidden');
    btnStartQueue.disabled = false;
    btnStartBot.disabled = false;
  });

  // Reaction Buttons
  document.querySelectorAll('.btn-react').forEach(btn => {
    btn.addEventListener('click', () => {
      const emote = btn.getAttribute('data-emote');
      showReaction(`Sen: ${emote}`);
      if (!state.isBotMode && state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'xox_reaction', matchId: state.matchId, emote }));
      }
    });
  });

  function showReaction(text) {
    reactionBubble.textContent = text;
    reactionBubble.classList.remove('hidden');
    setTimeout(() => { reactionBubble.classList.add('hidden'); }, 2000);
  }

  // WebSocket Connection for Multiplayer Matchmaking
  function initWS() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    state.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: 'xox' }));
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      let data;
      try { data = JSON.parse(event.data); } catch (_) { return; }

      if (data.type === 'xox_match_found') {
        queueStatus.classList.add('hidden');
        state.matchId = data.matchId;
        state.mySymbol = data.mySymbol;
        state.opponentName = data.opponent;
        state.scoreX = data.scoreX || 0;
        state.scoreO = data.scoreO || 0;
        startMatchUI();
      }
      else if (data.type === 'xox_state') {
        state.board = data.board;
        state.turn = data.turn;
        renderBoard();
        AudioEngine.playClick();
        updateTurnBanner();
        startTurnTimer();
      }
      else if (data.type === 'xox_game_over') {
        state.board = data.board;
        state.scoreX = data.scoreX;
        state.scoreO = data.scoreO;
        renderBoard();
        handleGameOver(data.winner, data.line);
      }
      else if (data.type === 'xox_reset') {
        resetBoard();
        state.turn = data.turn;
        state.active = true;
        state.scoreX = data.scoreX;
        state.scoreO = data.scoreO;
        updateScores();
        updateTurnBanner();
        startTurnTimer();
      }
      else if (data.type === 'xox_reaction') {
        showReaction(`${data.from}: ${data.emote}`);
      }
      else if (data.type === 'xox_opponent_left') {
        alert(data.message || 'Rakip ayrıldı!');
        btnLeave.click();
      }
    };

    ws.onclose = () => {
      setTimeout(initWS, 2000);
    };
  }

  initWS();

})();
