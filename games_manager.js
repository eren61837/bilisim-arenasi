// games_manager.js
// Multiplayer Game Engines for Bilişim Sınıfı Oyun Portalı
// 1. XOX Online (1v1 Matchmaking & Smart Bot)
// 2. Agar.io (Multiplayer Cell Battle, Split, Eject, Leaderboard & AI Bots)
// 3. Counter-Strike 1.6 Web 3D FPS (de_dust2, AK47, Deagle, Bots, Multi deathmatch)
// 4. PaperMap.io (Territory Conquest, Trail Cut, Map Expansion)
// 5. Portal Presence, LAN IP & Global Classroom Chat

const os = require('os');
const WebSocket = require('ws');

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function initGamesManager(wss, db) {
  // Store chat history table for portal global chat
  db.exec(`
    CREATE TABLE IF NOT EXISTS portal_chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  function hasRoomClients(room) {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN && client.room === room) return true;
    }
    return false;
  }

  // ============================================================
  // 1. GLOBAL PORTAL CHAT, STATS & ADMIN ENGINE
  // ============================================================
  const ADMIN_PASSWORD = 'erencix201124';
  const portalChatHistory = [];
  try {
    const rows = db.prepare('SELECT username, message, created_at FROM portal_chat ORDER BY id DESC LIMIT 50').all();
    rows.reverse().forEach(r => portalChatHistory.push(r));
  } catch (_) {}

  function broadcastPortalChat(username, message) {
    const now = Date.now();
    const item = { username, message, created_at: now };
    portalChatHistory.push(item);
    if (portalChatHistory.length > 50) portalChatHistory.shift();

    try {
      db.prepare('INSERT INTO portal_chat (username, message, created_at) VALUES (?, ?, ?)').run(username, message, now);
    } catch (_) {}

    const payload = JSON.stringify({
      type: 'portal_chat_msg',
      item,
      u: username,
      msg: message,
      t: now
    });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  function clearPortalChat() {
    portalChatHistory.length = 0;
    try {
      db.prepare('DELETE FROM portal_chat').run();
    } catch (_) {}
    const payload = JSON.stringify({ type: 'portal_chat_cleared', message: '🧹 Sohbet bir yönetici tarafından temizlendi!' });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  function broadcastAnnouncement(text, author = '👑 Baş Yönetici') {
    const payload = JSON.stringify({
      type: 'portal_announcement',
      text: String(text).trim(),
      author: String(author)
    });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  // ============================================================
  // 2. XOX (TIC-TAC-TOE) 1V1 MATCHMAKING ENGINE
  // ============================================================
  let xoxQueue = [];
  const xoxMatches = new Map(); // matchId -> match object

  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  function checkXoxWinner(board) {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }
    if (board.every(cell => cell !== null)) {
      return { winner: 'draw', line: null };
    }
    return null;
  }

  function handleXoxMessage(ws, data) {
    ws.room = 'xox';
    const username = ws.user?.username || ws.gameUsername || 'Oyuncu_' + Math.floor(100 + Math.random() * 900);

    // 1. Join Matchmaking Queue
    if (data.type === 'xox_queue') {
      // Remove any stale entry
      xoxQueue = xoxQueue.filter(q => q.ws !== ws && q.ws.readyState === WebSocket.OPEN);

      if (xoxQueue.length > 0) {
        const opponent = xoxQueue.shift();
        const matchId = 'xox_' + Math.random().toString(36).slice(2, 9);
        const match = {
          id: matchId,
          board: Array(9).fill(null),
          turn: 'X',
          pX: ws,
          pO: opponent.ws,
          uX: username,
          uO: opponent.username,
          scoreX: 0,
          scoreO: 0,
          active: true
        };
        xoxMatches.set(matchId, match);
        ws.xoxMatchId = matchId;
        opponent.ws.xoxMatchId = matchId;

        ws.send(JSON.stringify({
          type: 'xox_match_found',
          matchId,
          mySymbol: 'X',
          opponent: opponent.username,
          turn: 'X',
          scoreX: 0,
          scoreO: 0
        }));

        opponent.ws.send(JSON.stringify({
          type: 'xox_match_found',
          matchId,
          mySymbol: 'O',
          opponent: username,
          turn: 'X',
          scoreX: 0,
          scoreO: 0
        }));
      } else {
        xoxQueue.push({ ws, username });
        ws.send(JSON.stringify({ type: 'xox_queue_waiting', message: 'Sınıfta rakip aranıyor...' }));
      }
      return;
    }

    // 2. Cancel Queue
    if (data.type === 'xox_cancel_queue') {
      xoxQueue = xoxQueue.filter(q => q.ws !== ws);
      ws.send(JSON.stringify({ type: 'xox_queue_cancelled' }));
      return;
    }

    // 3. Make Move
    if (data.type === 'xox_move') {
      const match = xoxMatches.get(data.matchId);
      if (!match || !match.active) return;

      const playerSymbol = match.pX === ws ? 'X' : (match.pO === ws ? 'O' : null);
      if (!playerSymbol || match.turn !== playerSymbol) return;

      const idx = parseInt(data.index, 10);
      if (idx < 0 || idx > 8 || match.board[idx] !== null) return;

      match.board[idx] = playerSymbol;
      const res = checkXoxWinner(match.board);

      if (res) {
        if (res.winner === 'X') match.scoreX++;
        if (res.winner === 'O') match.scoreO++;

        const resultPayload = JSON.stringify({
          type: 'xox_game_over',
          winner: res.winner,
          line: res.line,
          board: match.board,
          scoreX: match.scoreX,
          scoreO: match.scoreO
        });
        if (match.pX.readyState === WebSocket.OPEN) match.pX.send(resultPayload);
        if (match.pO.readyState === WebSocket.OPEN) match.pO.send(resultPayload);
      } else {
        match.turn = match.turn === 'X' ? 'O' : 'X';
        const updatePayload = JSON.stringify({
          type: 'xox_state',
          board: match.board,
          turn: match.turn
        });
        if (match.pX.readyState === WebSocket.OPEN) match.pX.send(updatePayload);
        if (match.pO.readyState === WebSocket.OPEN) match.pO.send(updatePayload);
      }
      return;
    }

    // 4. Rematch
    if (data.type === 'xox_rematch') {
      const match = xoxMatches.get(data.matchId);
      if (!match) return;

      match.board = Array(9).fill(null);
      match.turn = Math.random() < 0.5 ? 'X' : 'O';
      match.active = true;

      const resetPayload = JSON.stringify({
        type: 'xox_reset',
        board: match.board,
        turn: match.turn,
        scoreX: match.scoreX,
        scoreO: match.scoreO
      });
      if (match.pX.readyState === WebSocket.OPEN) match.pX.send(resetPayload);
      if (match.pO.readyState === WebSocket.OPEN) match.pO.send(resetPayload);
      return;
    }

    // 5. In-game Emote / Chat
    if (data.type === 'xox_reaction') {
      const match = xoxMatches.get(data.matchId);
      if (!match) return;
      const other = match.pX === ws ? match.pO : match.pX;
      if (other && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify({ type: 'xox_reaction', emote: data.emote, from: username }));
      }
    }
  }

  function handleXoxDisconnect(ws) {
    xoxQueue = xoxQueue.filter(q => q.ws !== ws);
    if (ws.xoxMatchId) {
      const match = xoxMatches.get(ws.xoxMatchId);
      if (match) {
        const other = match.pX === ws ? match.pO : match.pX;
        if (other && other.readyState === WebSocket.OPEN) {
          other.send(JSON.stringify({ type: 'xox_opponent_left', message: 'Rakip oyundan ayrıldı!' }));
        }
        xoxMatches.delete(ws.xoxMatchId);
      }
    }
  }

  // ============================================================
  // 3. AGAR.IO MULTIPLAYER CELL BATTLE ENGINE
  // ============================================================
  const AGAR_WIDTH = 2600;
  const AGAR_HEIGHT = 2600;
  const AGAR_COLORS = ['#ff1744', '#00e676', '#00e5ff', '#ffea00', '#d500f9', '#ff9100', '#3d5afe', '#00b0ff'];

  let agarFood = [];
  for (let i = 0; i < 350; i++) {
    agarFood.push({
      id: i,
      x: Math.random() * (AGAR_WIDTH - 60) + 30,
      y: Math.random() * (AGAR_HEIGHT - 60) + 30,
      c: AGAR_COLORS[Math.floor(Math.random() * AGAR_COLORS.length)]
    });
  }

  let agarViruses = [];
  for (let i = 0; i < 10; i++) {
    agarViruses.push({
      id: i,
      x: 200 + Math.random() * (AGAR_WIDTH - 400),
      y: 200 + Math.random() * (AGAR_HEIGHT - 400),
      r: 40
    });
  }

  let agarEjected = [];
  const agarPlayers = new Map(); // ws or botId -> player object

  // AI Bots for Agar.io (3 bot - dengeli oyun için)
  const AGAR_BOT_NAMES = ['Amip_Reis', 'Pro_Hücre', 'Bilişimci'];
  const agarBots = [];

  function spawnAgarBot(name) {
    const bot = {
      id: 'bot_' + Math.random().toString(36).slice(2, 7),
      username: '🤖 ' + name,
      isBot: true,
      color: AGAR_COLORS[Math.floor(Math.random() * AGAR_COLORS.length)],
      cells: [{
        x: Math.random() * (AGAR_WIDTH - 200) + 100,
        y: Math.random() * (AGAR_HEIGHT - 200) + 100,
        r: 24,
        mass: 25,
        vx: 0,
        vy: 0,
        mergeTime: 0
      }],
      targetX: Math.random() * AGAR_WIDTH,
      targetY: Math.random() * AGAR_HEIGHT,
      nextRetarget: Date.now() + 2000
    };
    agarBots.push(bot);
    agarPlayers.set(bot.id, bot);
  }

  for (const name of AGAR_BOT_NAMES) {
    spawnAgarBot(name);
  }

  function handleAgarMessage(ws, data) {
    if (data.type === 'agario_join') {
      ws.room = 'agario';
      const uname = data.username || ws.user?.username || 'Hücre_' + Math.floor(100 + Math.random() * 900);
      const color = data.color || AGAR_COLORS[Math.floor(Math.random() * AGAR_COLORS.length)];
      const player = {
        id: 'p_' + Math.random().toString(36).slice(2, 8),
        ws,
        username: uname,
        isBot: false,
        color,
        cells: [{
          x: Math.random() * (AGAR_WIDTH - 400) + 200,
          y: Math.random() * (AGAR_HEIGHT - 400) + 200,
          r: 25,
          mass: 25,
          vx: 0,
          vy: 0,
          mergeTime: 0
        }],
        targetX: AGAR_WIDTH / 2,
        targetY: AGAR_HEIGHT / 2
      };
      ws.agarPlayerId = player.id;
      agarPlayers.set(player.id, player);
      ws.send(JSON.stringify({ type: 'agario_joined', id: player.id, x: player.cells[0].x, y: player.cells[0].y }));
      return;
    }

    const player = ws.agarPlayerId ? agarPlayers.get(ws.agarPlayerId) : null;
    if (!player) return;

    if (data.type === 'agario_target') {
      player.targetX = Math.max(0, Math.min(AGAR_WIDTH, data.x));
      player.targetY = Math.max(0, Math.min(AGAR_HEIGHT, data.y));
    }
    else if (data.type === 'agario_split') {
      // Split cells with mass >= 36
      const newCells = [];
      const now = Date.now();
      for (const cell of player.cells) {
        if (cell.mass >= 36 && player.cells.length + newCells.length < 8) {
          const halfMass = Math.floor(cell.mass / 2);
          cell.mass = halfMass;
          cell.r = Math.sqrt(halfMass * 100);
          cell.mergeTime = now + 12000;

          const dx = player.targetX - cell.x;
          const dy = player.targetY - cell.y;
          const dist = Math.hypot(dx, dy) || 1;
          const speed = 14;

          newCells.push({
            x: cell.x + (dx / dist) * (cell.r + 5),
            y: cell.y + (dy / dist) * (cell.r + 5),
            r: cell.r,
            mass: halfMass,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            mergeTime: now + 12000
          });
        }
      }
      player.cells.push(...newCells);
    }
    else if (data.type === 'agario_eject') {
      // Eject mass (W)
      for (const cell of player.cells) {
        if (cell.mass >= 30) {
          cell.mass -= 14;
          cell.r = Math.sqrt(cell.mass * 100);
          const dx = player.targetX - cell.x;
          const dy = player.targetY - cell.y;
          const dist = Math.hypot(dx, dy) || 1;
          agarEjected.push({
            id: Math.random().toString(36).slice(2, 8),
            x: cell.x + (dx / dist) * (cell.r + 10),
            y: cell.y + (dy / dist) * (cell.r + 10),
            vx: (dx / dist) * 12,
            vy: (dy / dist) * 12,
            mass: 12,
            color: player.color
          });
        }
      }
    }
  }

  // 20 FPS Agar.io Server Loop (idle sleep when 0 players in room)
  setInterval(() => {
    if (!hasRoomClients('agario')) return;
    const now = Date.now();

    // 1. Update AI Bots
    for (const bot of agarBots) {
      if (now > bot.nextRetarget) {
        // Find nearest food or wander
        bot.targetX = Math.random() * AGAR_WIDTH;
        bot.targetY = Math.random() * AGAR_HEIGHT;
        bot.nextRetarget = now + 2500 + Math.random() * 2000;
      }
    }

    // 2. Physics & Movement for all players & bots
    for (const [id, player] of agarPlayers.entries()) {
      if (!player.cells || player.cells.length === 0) continue;

      for (let i = 0; i < player.cells.length; i++) {
        const cell = player.cells[i];
        // Move towards target
        const dx = player.targetX - cell.x;
        const dy = player.targetY - cell.y;
        const dist = Math.hypot(dx, dy);

        // Speed is inversely proportional to mass
        const baseSpeed = Math.max(1.8, 6.5 - Math.log(cell.mass || 10) * 0.9);
        if (dist > 10) {
          cell.x += (dx / dist) * baseSpeed;
          cell.y += (dy / dist) * baseSpeed;
        }

        // Apply impulse velocity (from split)
        if (Math.abs(cell.vx) > 0.1 || Math.abs(cell.vy) > 0.1) {
          cell.x += cell.vx;
          cell.y += cell.vy;
          cell.vx *= 0.92;
          cell.vy *= 0.92;
        }

        // Boundary Clamp
        cell.x = Math.max(cell.r, Math.min(AGAR_WIDTH - cell.r, cell.x));
        cell.y = Math.max(cell.r, Math.min(AGAR_HEIGHT - cell.r, cell.y));

        // Eat food pellets
        for (let f = agarFood.length - 1; f >= 0; f--) {
          const food = agarFood[f];
          if (Math.hypot(cell.x - food.x, cell.y - food.y) < cell.r) {
            cell.mass += 1;
            cell.r = Math.sqrt(cell.mass * 100);
            food.x = Math.random() * (AGAR_WIDTH - 60) + 30;
            food.y = Math.random() * (AGAR_HEIGHT - 60) + 30;
            food.c = AGAR_COLORS[Math.floor(Math.random() * AGAR_COLORS.length)];
          }
        }

        // Eat ejected mass
        for (let em = agarEjected.length - 1; em >= 0; em--) {
          const ej = agarEjected[em];
          if (Math.hypot(cell.x - ej.x, cell.y - ej.y) < cell.r) {
            cell.mass += ej.mass;
            cell.r = Math.sqrt(cell.mass * 100);
            agarEjected.splice(em, 1);
          }
        }
      }

      // Merge own split cells after cooldown
      if (player.cells.length > 1) {
        for (let i = 0; i < player.cells.length; i++) {
          for (let j = i + 1; j < player.cells.length; j++) {
            const cA = player.cells[i];
            const cB = player.cells[j];
            if (now > cA.mergeTime && now > cB.mergeTime) {
              if (Math.hypot(cA.x - cB.x, cA.y - cB.y) < cA.r + cB.r) {
                cA.mass += cB.mass;
                cA.r = Math.sqrt(cA.mass * 100);
                player.cells.splice(j, 1);
                j--;
              }
            }
          }
        }
      }
    }

    // 3. Player vs Player eating
    const playerArray = Array.from(agarPlayers.values());
    for (let i = 0; i < playerArray.length; i++) {
      const p1 = playerArray[i];
      for (let j = 0; j < playerArray.length; j++) {
        if (i === j) continue;
        const p2 = playerArray[j];

        for (let c1 = 0; c1 < p1.cells.length; c1++) {
          for (let c2 = p2.cells.length - 1; c2 >= 0; c2--) {
            const cell1 = p1.cells[c1];
            const cell2 = p2.cells[c2];
            if (!cell1 || !cell2) continue;

            if (cell1.mass > cell2.mass * 1.15) {
              const d = Math.hypot(cell1.x - cell2.x, cell1.y - cell2.y);
              if (d < cell1.r - cell2.r / 3) {
                cell1.mass += cell2.mass;
                cell1.r = Math.sqrt(cell1.mass * 100);
                p2.cells.splice(c2, 1);

                if (p2.cells.length === 0) {
                  // Player eliminated
                  if (p2.ws && p2.ws.readyState === WebSocket.OPEN) {
                    p2.ws.send(JSON.stringify({ type: 'agario_died', killer: p1.username }));
                  }
                  if (p2.isBot) {
                    // Respawn bot
                    setTimeout(() => {
                      p2.cells = [{
                        x: Math.random() * (AGAR_WIDTH - 200) + 100,
                        y: Math.random() * (AGAR_HEIGHT - 200) + 100,
                        r: 24,
                        mass: 25,
                        vx: 0,
                        vy: 0,
                        mergeTime: 0
                      }];
                    }, 3000);
                  }
                }
              }
            }
          }
        }
      }
    }

    // 4. Update ejected mass physics
    for (let i = agarEjected.length - 1; i >= 0; i--) {
      const ej = agarEjected[i];
      ej.x += ej.vx;
      ej.y += ej.vy;
      ej.vx *= 0.94;
      ej.vy *= 0.94;
      if (ej.x < 0 || ej.x > AGAR_WIDTH || ej.y < 0 || ej.y > AGAR_HEIGHT) {
        agarEjected.splice(i, 1);
      }
    }

    // 5. Leaderboard & Broadcast
    const leaderboard = playerArray
      .filter(p => p.cells.length > 0)
      .map(p => ({
        username: p.username,
        score: p.cells.reduce((sum, c) => sum + c.mass, 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const payload = JSON.stringify({
      type: 'agario_tick',
      players: playerArray.filter(p => p.cells.length > 0).map(p => ({
        id: p.id,
        username: p.username,
        color: p.color,
        cells: p.cells.map(c => ({ x: Math.round(c.x), y: Math.round(c.y), r: Math.round(c.r), mass: Math.round(c.mass) }))
      })),
      foods: agarFood,
      viruses: agarViruses,
      ejected: agarEjected,
      leaderboard
    });

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.room === 'agario') {
        client.send(payload);
      }
    });
  }, 50);

  // ============================================================
  // 4. COUNTER-STRIKE 1.6 & CS2 WEB 3D FPS MATCH ENGINE
  // ============================================================
  const cs16Players = new Map(); // ws or botId -> player object

  const WEAPON_PRICES = {
    ak47: 2700,
    m4a1: 3100,
    awp: 4750,
    deagle: 650,
    knife: 0
  };

  const cs16Match = {
    scoreT: 0,
    scoreCT: 0,
    roundTime: 115, // 1:55
    roundState: 'active', // 'active' or 'ended'
    roundNumber: 1
  };

  // 4 Dust2 Bot Patrols (2 CT, 2 T)
  const CS_BOTS = [
    { id: 'cs_bot_1', username: 'Bot_Osman', team: 'CT', x: 15, y: 1.6, z: 20, yaw: 0, pitch: 0, hp: 100, kills: 0, deaths: 0, weapon: 'm4a1', isDead: false },
    { id: 'cs_bot_2', username: 'Bot_Can', team: 'T', x: -18, y: 1.6, z: -25, yaw: 1.5, pitch: 0, hp: 100, kills: 0, deaths: 0, weapon: 'ak47', isDead: false },
    { id: 'cs_bot_3', username: 'Bot_Berk', team: 'CT', x: 25, y: 1.6, z: -15, yaw: 3.1, pitch: 0, hp: 100, kills: 0, deaths: 0, weapon: 'deagle', isDead: false },
    { id: 'cs_bot_4', username: 'Bot_Kral', team: 'T', x: -20, y: 1.6, z: 25, yaw: 4.2, pitch: 0, hp: 100, kills: 0, deaths: 0, weapon: 'ak47', isDead: false }
  ];

  function getSpawnPoint(team) {
    if (team === 'CT') {
      return { x: 18 + (Math.random() * 8 - 4), z: 18 + (Math.random() * 8 - 4) };
    } else {
      return { x: -18 + (Math.random() * 8 - 4), z: -18 + (Math.random() * 8 - 4) };
    }
  }

  function endCsRound(winner, reason) {
    if (cs16Match.roundState === 'ended') return;
    cs16Match.roundState = 'ended';

    if (winner === 'T') cs16Match.scoreT++;
    else if (winner === 'CT') cs16Match.scoreCT++;

    // Money rewards: $3250 for winners, $1400 for losers
    for (const [, p] of cs16Players) {
      if (p.team === winner) {
        p.money = Math.min(16000, (p.money || 1600) + 3250);
      } else {
        p.money = Math.min(16000, (p.money || 1600) + 1400);
      }
      if (p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(JSON.stringify({ type: 'cs16_money_update', money: p.money }));
      }
    }

    const payload = JSON.stringify({
      type: 'cs16_round_end',
      winner,
      reason,
      scoreT: cs16Match.scoreT,
      scoreCT: cs16Match.scoreCT,
      roundNumber: cs16Match.roundNumber
    });

    wss.clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN && c.room === 'cs16') c.send(payload);
    });

    // 5 seconds pause then next round
    setTimeout(() => {
      startNextCsRound();
    }, 5000);
  }

  function startNextCsRound() {
    cs16Match.roundNumber++;
    cs16Match.roundTime = 115;
    cs16Match.roundState = 'active';

    // Respawn all bots
    for (const b of CS_BOTS) {
      b.hp = 100;
      b.isDead = false;
      const sp = getSpawnPoint(b.team);
      b.x = sp.x;
      b.z = sp.z;
    }

    // Respawn all players
    for (const [, p] of cs16Players) {
      p.hp = 100;
      p.ap = 100;
      p.isDead = false;
      const sp = getSpawnPoint(p.team);
      p.x = sp.x;
      p.z = sp.z;
      if (p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(JSON.stringify({
          type: 'cs16_round_start',
          roundNumber: cs16Match.roundNumber,
          roundTime: cs16Match.roundTime,
          scoreT: cs16Match.scoreT,
          scoreCT: cs16Match.scoreCT,
          x: p.x,
          y: 1.6,
          z: p.z,
          money: p.money
        }));
      }
    }
  }

  // 1-Second Match Timer
  setInterval(() => {
    if (!hasRoomClients('cs16')) return;
    if (cs16Match.roundState === 'active') {
      cs16Match.roundTime--;

      // Check win condition
      const aliveT = Array.from(cs16Players.values()).filter(p => p.team === 'T' && !p.isDead).length + CS_BOTS.filter(b => b.team === 'T' && !b.isDead).length;
      const aliveCT = Array.from(cs16Players.values()).filter(p => p.team === 'CT' && !p.isDead).length + CS_BOTS.filter(b => b.team === 'CT' && !b.isDead).length;

      if (aliveT === 0 && aliveCT > 0) {
        endCsRound('CT', 'Tüm Teröristler Etkisiz Hale Getirildi!');
      } else if (aliveCT === 0 && aliveT > 0) {
        endCsRound('T', 'Tüm Karşı-Teröristler Etkisiz Hale Getirildi!');
      } else if (cs16Match.roundTime <= 0) {
        endCsRound('CT', 'Zaman Doldu! Hedef Korundu - CT Kazandı!');
      }
    }
  }, 1000);

  function handleCs16Message(ws, data) {
    if (data.type === 'cs16_join') {
      ws.room = 'cs16';
      const uname = data.username || ws.user?.username || 'Asker_' + Math.floor(100 + Math.random() * 900);
      const team = data.team || (Math.random() < 0.5 ? 'CT' : 'T');
      const sp = getSpawnPoint(team);

      const player = {
        id: 'cs_' + Math.random().toString(36).slice(2, 8),
        ws,
        username: uname,
        team,
        x: sp.x,
        y: 1.6,
        z: sp.z,
        yaw: 0,
        pitch: 0,
        hp: 100,
        ap: 100,
        money: 1600,
        weapon: team === 'CT' ? 'm4a1' : 'ak47',
        kills: 0,
        deaths: 0,
        isDead: false
      };
      ws.cs16Id = player.id;
      cs16Players.set(player.id, player);

      ws.send(JSON.stringify({
        type: 'cs16_joined',
        id: player.id,
        x: player.x,
        y: player.y,
        z: player.z,
        team: player.team,
        money: player.money,
        scoreT: cs16Match.scoreT,
        scoreCT: cs16Match.scoreCT,
        roundTime: cs16Match.roundTime
      }));
      return;
    }

    const player = ws.cs16Id ? cs16Players.get(ws.cs16Id) : null;
    if (!player) return;

    // Team switch / selection
    if (data.type === 'cs16_select_team') {
      const newTeam = data.team === 'T' ? 'T' : 'CT';
      player.team = newTeam;
      const sp = getSpawnPoint(newTeam);
      player.x = sp.x;
      player.z = sp.z;
      player.hp = 100;
      player.isDead = false;
      player.weapon = newTeam === 'CT' ? 'm4a1' : 'ak47';
      ws.send(JSON.stringify({
        type: 'cs16_team_assigned',
        team: player.team,
        x: player.x,
        y: 1.6,
        z: player.z,
        weapon: player.weapon
      }));
      return;
    }

    // Buy Weapon
    if (data.type === 'cs16_buy') {
      const reqWp = data.weapon;
      const price = WEAPON_PRICES[reqWp] !== undefined ? WEAPON_PRICES[reqWp] : 99999;
      if ((player.money || 0) >= price) {
        player.money -= price;
        player.weapon = reqWp;
        ws.send(JSON.stringify({
          type: 'cs16_buy_success',
          weapon: reqWp,
          money: player.money
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'cs16_buy_failed',
          msg: `Yetersiz Bakiye! ($${price} gerekiyor, sende $${player.money || 0} var)`
        }));
      }
      return;
    }

    if (player.isDead) return;

    if (data.type === 'cs16_move') {
      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
      player.yaw = data.yaw;
      player.pitch = data.pitch;
      player.weapon = data.weapon || player.weapon;
    }
    else if (data.type === 'cs16_shoot') {
      const shotBroadcast = JSON.stringify({
        type: 'cs16_player_shot',
        id: player.id,
        weapon: data.weapon || player.weapon
      });
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.room === 'cs16' && client !== ws) {
          client.send(shotBroadcast);
        }
      });

      if (data.targetId) {
        let victim = cs16Players.get(data.targetId) || CS_BOTS.find(b => b.id === data.targetId);
        if (victim && victim.hp > 0 && !victim.isDead) {
          const isHead = !!data.isHeadshot;
          const damage = isHead ? 100 : (data.weapon === 'deagle' ? 52 : (data.weapon === 'awp' ? 115 : 34));
          victim.hp -= damage;

          // Notify victim of damage direction
          if (victim.ws && victim.ws.readyState === WebSocket.OPEN) {
            victim.ws.send(JSON.stringify({
              type: 'cs16_hit',
              damage,
              hp: Math.max(0, victim.hp),
              fromX: player.x,
              fromZ: player.z
            }));
          }

          if (victim.hp <= 0) {
            victim.hp = 0;
            victim.isDead = true;
            player.kills++;
            player.money = Math.min(16000, (player.money || 0) + 300); // $300 kill reward
            if (victim.deaths !== undefined) victim.deaths++;

            // Update shooter money
            ws.send(JSON.stringify({ type: 'cs16_money_update', money: player.money }));

            const killPayload = JSON.stringify({
              type: 'cs16_kill_feed',
              killer: player.username,
              victim: victim.username,
              killerTeam: player.team,
              victimTeam: victim.team,
              weapon: data.weapon || 'ak47',
              headshot: isHead
            });

            wss.clients.forEach(c => {
              if (c.readyState === WebSocket.OPEN && c.room === 'cs16') {
                c.send(killPayload);
              }
            });
          }
        }
      }
    }
  }

  // 20 FPS CS 1.6 Sync Loop (idle sleep when 0 players in room)
  setInterval(() => {
    if (!hasRoomClients('cs16')) return;
    // 1. Move Bots along waypoints & bot AI combat
    for (const b of CS_BOTS) {
      if (b.hp > 0 && !b.isDead) {
        b.yaw += (Math.random() - 0.5) * 0.15;
        b.x += Math.sin(b.yaw) * 0.18;
        b.z += Math.cos(b.yaw) * 0.18;
        b.x = Math.max(-35, Math.min(35, b.x));
        b.z = Math.max(-35, Math.min(35, b.z));
      }
    }

    // 2. Broadcast players & bots to cs16 clients
    const activeCsPlayers = Array.from(cs16Players.values()).map(p => ({
      id: p.id,
      username: p.username,
      team: p.team,
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: p.yaw,
      pitch: p.pitch,
      weapon: p.weapon,
      hp: p.hp,
      kills: p.kills,
      deaths: p.deaths,
      isDead: p.isDead
    }));

    const allEntities = [...activeCsPlayers, ...CS_BOTS.map(b => ({
      id: b.id,
      username: b.username,
      team: b.team,
      x: b.x,
      y: b.y,
      z: b.z,
      yaw: b.yaw,
      pitch: b.pitch,
      weapon: b.weapon,
      hp: b.hp,
      kills: b.kills,
      deaths: b.deaths,
      isDead: b.isDead,
      isBot: true
    }))];

    const statePayload = JSON.stringify({
      type: 'cs16_sync',
      players: allEntities,
      scoreT: cs16Match.scoreT,
      scoreCT: cs16Match.scoreCT,
      roundTime: cs16Match.roundTime,
      roundNumber: cs16Match.roundNumber
    });

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.room === 'cs16') {
        client.send(statePayload);
      }
    });
  }, 50);

  // ============================================================
  // 5. SLITHER.IO — ONLINE YILAN SARMA OYUNU
  // ============================================================
  const SLITHER_W = 4000, SLITHER_H = 4000;
  const SLITHER_COLORS = ['#ff1744','#00e676','#00e5ff','#ffea00','#d500f9','#ff9100','#3d5afe','#00bfa5','#ff6d00','#76ff03'];
  const slitherPlayers = new Map();
  let slitherNextId = 1;
  const slitherFoods = new Map();
  let slitherFoodNextId = 1;

  function spawnSlitherFood(count = 1) {
    for (let i = 0; i < count; i++) {
      const id = slitherFoodNextId++;
      slitherFoods.set(id, {
        id, x: 50 + Math.random() * (SLITHER_W - 100), y: 50 + Math.random() * (SLITHER_H - 100),
        r: 6 + Math.random() * 8, color: SLITHER_COLORS[Math.floor(Math.random() * SLITHER_COLORS.length)]
      });
    }
  }
  spawnSlitherFood(500);

  function createSlitherPlayer(opts = {}) {
    const id = opts.id || slitherNextId++;
    const color = opts.color || SLITHER_COLORS[id % SLITHER_COLORS.length];
    const cx = opts.x || 200 + Math.random() * (SLITHER_W - 400);
    const cy = opts.y || 200 + Math.random() * (SLITHER_H - 400);
    const angle = Math.random() * Math.PI * 2;
    const segments = [];
    const startLen = opts.isBot ? 20 : 10;
    for (let i = 0; i < startLen; i++) segments.push({ x: cx - Math.cos(angle) * i * 8, y: cy - Math.sin(angle) * i * 8 });
    return {
      id, username: opts.username || 'Yılan_' + id, isBot: opts.isBot || false, ws: opts.ws || null,
      color, segments, angle, targetAngle: angle, speed: 3, boosting: false, score: startLen, isDead: false,
      botTargetX: cx + (Math.random() - 0.5) * 600, botTargetY: cy + (Math.random() - 0.5) * 600,
      botRetargetAt: Date.now() + 2000 + Math.random() * 3000
    };
  }

  const SLITHER_BOT_NAMES = ['🐍 Kobra', '🐍 Anaconda', '🐍 Python'];
  const slitherBots = [];
  for (const name of SLITHER_BOT_NAMES) {
    const bot = createSlitherPlayer({ username: name, isBot: true });
    slitherBots.push(bot);
    slitherPlayers.set(bot.id, bot);
  }

  function handleSlitherMessage(ws, data) {
    if (data.type === 'slither_join') {
      ws.room = 'slither';
      const uname = data.username || ws.user?.username || 'Yılan_' + Math.floor(100 + Math.random() * 900);
      const color = data.color || SLITHER_COLORS[slitherNextId % SLITHER_COLORS.length];
      const p = createSlitherPlayer({ username: uname, color, ws });
      ws.slitherId = p.id;
      slitherPlayers.set(p.id, p);
      ws.send(JSON.stringify({ type: 'slither_joined', id: p.id, x: p.segments[0].x, y: p.segments[0].y, worldW: SLITHER_W, worldH: SLITHER_H }));
      return;
    }
    const p = ws.slitherId ? slitherPlayers.get(ws.slitherId) : null;
    if (!p || p.isDead) return;
    if (data.type === 'slither_dir') { p.targetAngle = data.angle; p.boosting = !!data.boost; }
  }

  function handleSlitherDisconnect(ws) { if (ws.slitherId) slitherPlayers.delete(ws.slitherId); }

  function slitherDie(player, killerName) {
    if (player.isDead) return;
    player.isDead = true;
    const step = Math.max(1, Math.floor(player.segments.length / 60));
    for (let i = 0; i < player.segments.length; i += step) {
      const seg = player.segments[i];
      const fid = slitherFoodNextId++;
      slitherFoods.set(fid, { id: fid, x: seg.x + (Math.random()-0.5)*20, y: seg.y + (Math.random()-0.5)*20, r: 8 + Math.random()*6, color: player.color });
    }
    if (player.ws && player.ws.readyState === WebSocket.OPEN) player.ws.send(JSON.stringify({ type: 'slither_dead', killer: killerName }));
    const kp = JSON.stringify({ type: 'slither_kill_feed', killer: killerName, victim: player.username, score: player.score });
    wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN && c.room === 'slither') c.send(kp); });
    if (player.isBot) {
      setTimeout(() => {
        const nb = createSlitherPlayer({ username: player.username, isBot: true, color: player.color });
        const idx = slitherBots.indexOf(player);
        if (idx !== -1) slitherBots[idx] = nb;
        slitherPlayers.set(nb.id, nb);
      }, 3000);
    }
  }

  // Slither tick — 20 FPS (idle sleep when 0 players in room)
  setInterval(() => {
    if (!hasRoomClients('slither')) return;
    const now = Date.now();
    const active = Array.from(slitherPlayers.values()).filter(p => !p.isDead);

    // Bot AI
    for (const bot of slitherBots) {
      if (bot.isDead) continue;
      if (now > bot.botRetargetAt) {
        let bestFood = null, bestDist = Infinity, searched = 0;
        for (const [, food] of slitherFoods) {
          const dx = food.x - bot.segments[0].x, dy = food.y - bot.segments[0].y;
          const d = dx*dx + dy*dy;
          if (d < bestDist) { bestDist = d; bestFood = food; }
          if (++searched > 80) break;
        }
        if (bestFood && bestDist < 600*600) { bot.botTargetX = bestFood.x; bot.botTargetY = bestFood.y; }
        else { bot.botTargetX = 200 + Math.random()*(SLITHER_W-400); bot.botTargetY = 200 + Math.random()*(SLITHER_H-400); }
        bot.botRetargetAt = now + 1500 + Math.random()*2500;
      }
      const head = bot.segments[0];
      if (head.x < 200) bot.botTargetX = SLITHER_W/2;
      if (head.x > SLITHER_W-200) bot.botTargetX = SLITHER_W/2;
      if (head.y < 200) bot.botTargetY = SLITHER_H/2;
      if (head.y > SLITHER_H-200) bot.botTargetY = SLITHER_H/2;
      bot.targetAngle = Math.atan2(bot.botTargetY-head.y, bot.botTargetX-head.x);
    }

    // Move all
    for (const p of active) {
      let da = p.targetAngle - p.angle;
      while (da > Math.PI) da -= Math.PI*2;
      while (da < -Math.PI) da += Math.PI*2;
      p.angle += Math.sign(da) * Math.min(Math.abs(da), p.boosting ? 0.18 : 0.12);
      const spd = p.boosting ? 6 : p.isBot ? 2.8 : 3.2;
      const nx = p.segments[0].x + Math.cos(p.angle) * spd;
      const ny = p.segments[0].y + Math.sin(p.angle) * spd;
      if (nx < 10 || nx > SLITHER_W-10 || ny < 10 || ny > SLITHER_H-10) { slitherDie(p, 'Duvar'); continue; }
      p.segments.unshift({ x: nx, y: ny });
      if (p.boosting && p.segments.length > 10) {
        p.segments.pop();
        if (Math.random() < 0.4) { const fid = slitherFoodNextId++; slitherFoods.set(fid, { id: fid, x: p.segments[p.segments.length-1].x, y: p.segments[p.segments.length-1].y, r: 5, color: p.color }); }
      }
      p.segments.pop();
      // Eat food
      for (const [fid, food] of slitherFoods) {
        const fdx = food.x-nx, fdy = food.y-ny;
        if (fdx*fdx+fdy*fdy < (food.r+10)*(food.r+10)) {
          const grow = Math.ceil(food.r/4);
          for (let g = 0; g < grow; g++) p.segments.push({...p.segments[p.segments.length-1]});
          p.score += grow;
          slitherFoods.delete(fid);
          spawnSlitherFood(1);
        }
      }
    }

    // Collision
    for (const p of active) {
      if (p.isDead) continue;
      const head = p.segments[0];
      for (const other of active) {
        if (other.id === p.id || other.isDead) continue;
        for (let i = 0; i < other.segments.length; i += 2) {
          const seg = other.segments[i];
          const dx = head.x-seg.x, dy = head.y-seg.y;
          if (dx*dx+dy*dy < 18*18) { slitherDie(p, other.username); break; }
        }
        if (p.isDead) break;
      }
    }

    // Broadcast
    const activeNow = Array.from(slitherPlayers.values()).filter(p => !p.isDead);
    const lb = [...activeNow].sort((a,b)=>b.score-a.score).slice(0,5).map(p=>({username:p.username,score:p.score}));
    const payload = JSON.stringify({
      type: 'slither_tick',
      players: activeNow.map(p=>({ id:p.id, username:p.username, color:p.color, segments:p.segments.slice(0,120), angle:p.angle, score:p.score, boosting:p.boosting })),
      foods: Array.from(slitherFoods.values()),
      leaderboard: lb
    });
    wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN && c.room === 'slither') c.send(payload); });
  }, 50);

  // ============================================================
  // 6. TANK SAVAŞI 2D (BOUNCING BULLETS LABİRENT TANK ARENASI)
  // ============================================================
  const TANK_ARENA_W = 1200;
  const TANK_ARENA_H = 800;
  const TANK_COLORS = ['#00e676', '#ff1744', '#00e5ff', '#ffea00', '#d500f9', '#ff9100'];

  const TANK_WALLS = [
    // Outer border
    { x1: 20, y1: 20, x2: 1180, y2: 20 },
    { x1: 1180, y1: 20, x2: 1180, y2: 780 },
    { x1: 1180, y1: 780, x2: 20, y2: 780 },
    { x1: 20, y1: 780, x2: 20, y2: 20 },
    // Maze inner obstacles
    { x1: 200, y1: 140, x2: 500, y2: 140 },
    { x1: 700, y1: 140, x2: 1000, y2: 140 },
    { x1: 350, y1: 140, x2: 350, y2: 340 },
    { x1: 850, y1: 140, x2: 850, y2: 340 },
    { x1: 140, y1: 400, x2: 440, y2: 400 },
    { x1: 760, y1: 400, x2: 1060, y2: 400 },
    { x1: 600, y1: 220, x2: 600, y2: 580 },
    { x1: 200, y1: 660, x2: 500, y2: 660 },
    { x1: 700, y1: 660, x2: 1000, y2: 660 },
    { x1: 350, y1: 460, x2: 350, y2: 660 },
    { x1: 850, y1: 460, x2: 850, y2: 660 }
  ];

  const tankPlayers = new Map();
  let tankNextId = 1;
  let tankBullets = [];
  let tankCrates = [];
  let tankBulletNextId = 1;

  function getRandomTankSpawn() {
    const spots = [
      { x: 100, y: 100, angle: 0 },
      { x: 1100, y: 100, angle: Math.PI },
      { x: 100, y: 700, angle: 0 },
      { x: 1100, y: 700, angle: Math.PI },
      { x: 600, y: 100, angle: Math.PI / 2 },
      { x: 600, y: 700, angle: -Math.PI / 2 }
    ];
    return spots[Math.floor(Math.random() * spots.length)];
  }

  // AI Bots for Tank
  const TANK_BOT_NAMES = ['🤖 Tank_Reis', '🤖 Fırtına_Tank'];
  const tankBots = [];

  function spawnTankBot(name) {
    const sp = getRandomTankSpawn();
    const id = tankNextId++;
    const bot = {
      id,
      username: name,
      isBot: true,
      color: TANK_COLORS[id % TANK_COLORS.length],
      x: sp.x,
      y: sp.y,
      angle: sp.angle,
      turretAngle: sp.angle,
      speed: 2.5,
      score: 0,
      kills: 0,
      deaths: 0,
      isDead: false,
      hasShield: false,
      nextShoot: Date.now() + 1500,
      nextTurn: Date.now() + 1000
    };
    tankBots.push(bot);
    tankPlayers.set(id, bot);
  }

  for (const bname of TANK_BOT_NAMES) spawnTankBot(bname);

  // Spawn powerup crate every 10s
  setInterval(() => {
    if (!hasRoomClients('tank')) return;
    if (tankCrates.length < 4) {
      const types = ['laser', 'shotgun', 'shield', 'speed'];
      tankCrates.push({
        id: Date.now(),
        x: 150 + Math.random() * 900,
        y: 100 + Math.random() * 600,
        type: types[Math.floor(Math.random() * types.length)]
      });
    }
  }, 10000);

  function handleTankMessage(ws, data) {
    if (data.type === 'tank_join') {
      ws.room = 'tank';
      const uname = data.username || ws.user?.username || 'Tankçı_' + Math.floor(100 + Math.random() * 900);
      const sp = getRandomTankSpawn();
      const id = tankNextId++;
      const p = {
        id,
        ws,
        username: uname,
        isBot: false,
        color: TANK_COLORS[id % TANK_COLORS.length],
        x: sp.x,
        y: sp.y,
        angle: sp.angle,
        turretAngle: sp.angle,
        score: 0,
        kills: 0,
        deaths: 0,
        isDead: false,
        hasShield: false,
        powerup: null,
        powerupAmmo: 0
      };
      ws.tankId = id;
      tankPlayers.set(id, p);

      ws.send(JSON.stringify({
        type: 'tank_joined',
        id: p.id,
        x: p.x,
        y: p.y,
        angle: p.angle,
        color: p.color,
        walls: TANK_WALLS,
        arenaW: TANK_ARENA_W,
        arenaH: TANK_ARENA_H
      }));
      return;
    }

    const p = ws.tankId ? tankPlayers.get(ws.tankId) : null;
    if (!p || p.isDead) return;

    if (data.type === 'tank_move') {
      p.x = Math.max(30, Math.min(TANK_ARENA_W - 30, data.x));
      p.y = Math.max(30, Math.min(TANK_ARENA_H - 30, data.y));
      p.angle = data.angle;
      p.turretAngle = data.turretAngle;
    }
    else if (data.type === 'tank_shoot') {
      const bx = p.x + Math.cos(p.turretAngle) * 26;
      const by = p.y + Math.sin(p.turretAngle) * 26;
      const spd = 7.5;

      if (p.powerup === 'shotgun') {
        for (let angleOffset of [-0.2, 0, 0.2]) {
          tankBullets.push({
            id: tankBulletNextId++,
            ownerId: p.id,
            ownerName: p.username,
            x: bx,
            y: by,
            vx: Math.cos(p.turretAngle + angleOffset) * spd,
            vy: Math.sin(p.turretAngle + angleOffset) * spd,
            bouncesLeft: 3,
            color: '#ff9100',
            createdAt: Date.now()
          });
        }
        p.powerupAmmo--;
        if (p.powerupAmmo <= 0) p.powerup = null;
      } else {
        tankBullets.push({
          id: tankBulletNextId++,
          ownerId: p.id,
          ownerName: p.username,
          x: bx,
          y: by,
          vx: Math.cos(p.turretAngle) * spd,
          vy: Math.sin(p.turretAngle) * spd,
          bouncesLeft: 5,
          color: p.color,
          createdAt: Date.now()
        });
      }
    }
  }

  function eliminateTank(victim, killerName) {
    if (victim.isDead) return;
    victim.isDead = true;
    victim.deaths++;

    if (victim.ws && victim.ws.readyState === WebSocket.OPEN) {
      victim.ws.send(JSON.stringify({ type: 'tank_dead', killer: killerName }));
    }

    const kp = JSON.stringify({
      type: 'tank_kill_feed',
      killer: killerName,
      victim: victim.username
    });
    wss.clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN && c.room === 'tank') c.send(kp);
    });

    // Respawn after 3 seconds
    setTimeout(() => {
      const sp = getRandomTankSpawn();
      victim.x = sp.x;
      victim.y = sp.y;
      victim.angle = sp.angle;
      victim.turretAngle = sp.angle;
      victim.isDead = false;
      victim.hasShield = false;
      victim.powerup = null;
      if (victim.ws && victim.ws.readyState === WebSocket.OPEN) {
        victim.ws.send(JSON.stringify({
          type: 'tank_respawn',
          x: victim.x,
          y: victim.y,
          angle: victim.angle
        }));
      }
    }, 3000);
  }

  // 20 FPS Tank Arena Physics Loop (idle sleep when 0 players in room)
  setInterval(() => {
    if (!hasRoomClients('tank')) return;
    const now = Date.now();
    const active = Array.from(tankPlayers.values()).filter(p => !p.isDead);

    // 1. Bot AI
    for (const b of tankBots) {
      if (b.isDead) continue;

      if (now > b.nextTurn) {
        b.angle += (Math.random() - 0.5) * 1.5;
        b.turretAngle = b.angle;
        b.nextTurn = now + 1200 + Math.random() * 1500;
      }

      // Drive forward
      const nx = b.x + Math.cos(b.angle) * b.speed;
      const ny = b.y + Math.sin(b.angle) * b.speed;

      // Wall avoidance
      let hitWall = false;
      if (nx < 40 || nx > TANK_ARENA_W - 40 || ny < 40 || ny > TANK_ARENA_H - 40) hitWall = true;
      for (const w of TANK_WALLS) {
        const dist = distToSegment({ x: nx, y: ny }, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
        if (dist < 25) { hitWall = true; break; }
      }

      if (!hitWall) {
        b.x = nx;
        b.y = ny;
      } else {
        b.angle += Math.PI * 0.7;
        b.nextTurn = now + 800;
      }

      // Aim at closest enemy
      let closest = null, closestDist = 450;
      for (const other of active) {
        if (other.id === b.id) continue;
        const dx = other.x - b.x, dy = other.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < closestDist) { closestDist = d; closest = other; }
      }

      if (closest) {
        const targetAngle = Math.atan2(closest.y - b.y, closest.x - b.x);
        b.turretAngle = targetAngle;

        if (now > b.nextShoot) {
          b.nextShoot = now + 2000 + Math.random() * 1000;
          tankBullets.push({
            id: tankBulletNextId++,
            ownerId: b.id,
            ownerName: b.username,
            x: b.x + Math.cos(b.turretAngle) * 26,
            y: b.y + Math.sin(b.turretAngle) * 26,
            vx: Math.cos(b.turretAngle) * 7.5,
            vy: Math.sin(b.turretAngle) * 7.5,
            bouncesLeft: 4,
            color: b.color,
            createdAt: now
          });
        }
      }
    }

    // 2. Bullets movement & bouncing
    const remainingBullets = [];
    for (const b of tankBullets) {
      if (now - b.createdAt > 10000) continue; // 10s max life

      b.x += b.vx;
      b.y += b.vy;

      // Check wall bounce
      let bounced = false;
      for (const w of TANK_WALLS) {
        const isHoriz = Math.abs(w.y1 - w.y2) < 5;
        const isVert = Math.abs(w.x1 - w.x2) < 5;

        if (isHoriz) {
          const minX = Math.min(w.x1, w.x2) - 8, maxX = Math.max(w.x1, w.x2) + 8;
          if (b.x >= minX && b.x <= maxX && Math.abs(b.y - w.y1) < 8) {
            b.vy = -b.vy;
            b.bouncesLeft--;
            bounced = true;
            break;
          }
        } else if (isVert) {
          const minY = Math.min(w.y1, w.y2) - 8, maxY = Math.max(w.y1, w.y2) + 8;
          if (b.y >= minY && b.y <= maxY && Math.abs(b.x - w.x1) < 8) {
            b.vx = -b.vx;
            b.bouncesLeft--;
            bounced = true;
            break;
          }
        }
      }

      if (b.bouncesLeft <= 0) continue;

      // Tank hit detection
      let hitSomeone = false;
      for (const t of active) {
        if (now - b.createdAt < 200 && b.ownerId === t.id) continue; // Grace period for shooter
        const dist = Math.hypot(b.x - t.x, b.y - t.y);
        if (dist < 20) {
          hitSomeone = true;
          if (t.hasShield) {
            t.hasShield = false; // Shield absorbs hit
          } else {
            eliminateTank(t, b.ownerName);
            const shooter = tankPlayers.get(b.ownerId);
            if (shooter) {
              shooter.kills++;
              shooter.score += 100;
            }
          }
          break;
        }
      }

      if (!hitSomeone) {
        remainingBullets.push(b);
      }
    }
    tankBullets = remainingBullets;

    // 3. Crates pickup
    tankCrates = tankCrates.filter(c => {
      for (const t of active) {
        if (Math.hypot(t.x - c.x, t.y - c.y) < 28) {
          if (c.type === 'shield') t.hasShield = true;
          else { t.powerup = c.type; t.powerupAmmo = 5; }
          return false;
        }
      }
      return true;
    });

    // 4. Broadcast
    const leaderboard = [...active].sort((a, b) => b.score - a.score).slice(0, 5).map(p => ({
      username: p.username,
      score: p.score,
      kills: p.kills
    }));

    const payload = JSON.stringify({
      type: 'tank_tick',
      tanks: active.map(t => ({
        id: t.id,
        username: t.username,
        color: t.color,
        x: t.x,
        y: t.y,
        angle: t.angle,
        turretAngle: t.turretAngle,
        hasShield: t.hasShield,
        powerup: t.powerup,
        score: t.score
      })),
      bullets: tankBullets.map(b => ({ id: b.id, x: b.x, y: b.y, color: b.color })),
      crates: tankCrates,
      leaderboard
    });

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.room === 'tank') {
        client.send(payload);
      }
    });
  }, 50);

  function distToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  // ============================================================
  // 7. DEEEEP.IO (OKYANUS EVRİMİ & DERİNLİK SAVAŞI)
  // ============================================================
  const DEEEEP_W = 4000;
  const DEEEEP_H = 2400; // 0..350=Hava/Yüzey, 350..1400=Sığ Deniz, 1400..2400=Karanlık Abyss

  const DEEEEP_TIERS = [
    { tier: 1, name: 'Palyaço Balığı', emoji: '🐟', nextExp: 100, speed: 4.0, maxHp: 100, breathType: 'water', depthRange: [300, 1600], desc: 'Yosunlarda hızlı plankton yer' },
    { tier: 2, name: 'Yengeç', emoji: '🦀', nextExp: 300, speed: 3.5, maxHp: 150, breathType: 'water', depthRange: [300, 2400], desc: 'Sert kabuk - az hasar alır' },
    { tier: 3, name: 'Kalamar', emoji: '🦑', nextExp: 750, speed: 4.2, maxHp: 200, breathType: 'water', depthRange: [300, 2400], desc: 'Mürekkep püskürterek kaçar' },
    { tier: 4, name: 'Fener Balığı', emoji: '💡', nextExp: 1600, speed: 3.8, maxHp: 280, breathType: 'deep', depthRange: [1200, 2400], desc: 'Abyss feneri - karanlıkta avlanır' },
    { tier: 5, name: 'Yunus', emoji: '🐬', nextExp: 3200, speed: 5.0, maxHp: 380, breathType: 'air', depthRange: [100, 1500], desc: 'Süper hızlı yüzücü - yüzeyden hava alır' },
    { tier: 6, name: 'Çekiç Başlı', emoji: '🦈', nextExp: 6000, speed: 4.5, maxHp: 520, breathType: 'water', depthRange: [300, 1800], desc: 'Yaralı avları uzaktan sezer' },
    { tier: 7, name: 'Büyük Beyaz', emoji: '🦈', nextExp: 10000, speed: 4.8, maxHp: 700, breathType: 'water', depthRange: [300, 2000], desc: 'Apex Predator: Ölümcül Isırık' },
    { tier: 8, name: 'Kraken / Dev Kalamar', emoji: '🐙', nextExp: 999999, speed: 4.6, maxHp: 900, breathType: 'deep', depthRange: [1200, 2400], desc: 'Derinlerin Efendisi: Rakipleri derine çeker!' }
  ];

  const deeeepPlayers = new Map();
  let deeeepNextId = 1;
  const deeeepFoods = new Map();
  let deeeepFoodNextId = 1;

  function spawnDeeeepFood(count = 1) {
    for (let i = 0; i < count; i++) {
      const id = deeeepFoodNextId++;
      const fy = 350 + Math.random() * (DEEEEP_H - 400);
      const isDeep = fy > 1400;
      deeeepFoods.set(id, {
        id,
        x: 50 + Math.random() * (DEEEEP_W - 100),
        y: fy,
        r: 4 + Math.random() * 4,
        type: isDeep ? 'lava' : 'plankton',
        color: isDeep ? (Math.random() < 0.5 ? '#ff3d00' : '#ff9100') : (Math.random() < 0.5 ? '#76ff03' : '#00e5ff'),
        exp: isDeep ? 15 : 10
      });
    }
  }
  spawnDeeeepFood(450);

  function createDeeeepPlayer(opts = {}) {
    const id = opts.id || deeeepNextId++;
    const tier = opts.tier || 1;
    const tInfo = DEEEEP_TIERS[tier - 1];
    const cx = opts.x || 300 + Math.random() * (DEEEEP_W - 600);
    const cy = opts.y || 450 + Math.random() * 800;

    return {
      id,
      ws: opts.ws || null,
      username: opts.username || 'Balık_' + id,
      isBot: opts.isBot || false,
      tier,
      exp: 0,
      hp: tInfo.maxHp,
      maxHp: tInfo.maxHp,
      oxygen: 100,
      pressure: 100,
      boostCharges: 2,
      maxBoost: 2,
      boostTimeLeft: 0,
      x: cx,
      y: cy,
      angle: 0,
      targetAngle: 0,
      score: 0,
      kills: 0,
      isDead: false,
      botRetargetAt: Date.now() + 1500
    };
  }

  // AI Bots
  const DEEEEP_BOTS = [
    { name: '🐬 Bot_Yunus', tier: 5 },
    { name: '🦈 Bot_Köpekbalığı', tier: 7 },
    { name: '💡 Bot_Fener', tier: 4 },
    { name: '🦀 Bot_Yengeç', tier: 2 }
  ];
  const deeeepBotsList = [];
  for (const b of DEEEEP_BOTS) {
    const bot = createDeeeepPlayer({ username: b.name, tier: b.tier, isBot: true });
    deeeepBotsList.push(bot);
    deeeepPlayers.set(bot.id, bot);
  }

  function handleDeeeepMessage(ws, data) {
    if (data.type === 'deeeep_join') {
      ws.room = 'deeeep';
      const uname = data.username || ws.user?.username || 'Denizci_' + Math.floor(100 + Math.random() * 900);
      const p = createDeeeepPlayer({ username: uname, ws });
      ws.deeeepId = p.id;
      deeeepPlayers.set(p.id, p);

      ws.send(JSON.stringify({
        type: 'deeeep_joined',
        id: p.id,
        x: p.x,
        y: p.y,
        tier: p.tier,
        worldW: DEEEEP_W,
        worldH: DEEEEP_H,
        tiers: DEEEEP_TIERS
      }));
      return;
    }

    const p = ws.deeeepId ? deeeepPlayers.get(ws.deeeepId) : null;
    if (!p || p.isDead) return;

    if (data.type === 'deeeep_move') {
      p.targetAngle = data.angle;
    }
    else if (data.type === 'deeeep_boost') {
      if (p.boostCharges >= 1 && p.boostTimeLeft <= 0) {
        p.boostCharges--;
        p.boostTimeLeft = 14; // ~450ms of high speed burst
      }
    }
  }

  function handleDeeeepDisconnect(ws) {
    if (ws.deeeepId) deeeepPlayers.delete(ws.deeeepId);
  }

  function killDeeeepPlayer(victim, killer) {
    if (victim.isDead) return;
    victim.isDead = true;

    // Drop meat chunks
    const meatCount = Math.min(25, 6 + victim.tier * 3);
    for (let i = 0; i < meatCount; i++) {
      const fid = deeeepFoodNextId++;
      deeeepFoods.set(fid, {
        id: fid,
        x: victim.x + (Math.random() - 0.5) * 60,
        y: victim.y + (Math.random() - 0.5) * 60,
        r: 7 + Math.random() * 4,
        type: 'meat',
        color: '#ff1744',
        exp: 35
      });
    }

    if (victim.ws && victim.ws.readyState === WebSocket.OPEN) {
      victim.ws.send(JSON.stringify({ type: 'deeeep_dead', killer: killer.username }));
    }

    const kp = JSON.stringify({
      type: 'deeeep_kill_feed',
      killer: killer.username,
      killerTier: killer.tier,
      victim: victim.username,
      victimTier: victim.tier
    });
    wss.clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN && c.room === 'deeeep') c.send(kp);
    });

    if (victim.isBot) {
      setTimeout(() => {
        const nb = createDeeeepPlayer({ username: victim.username, tier: victim.tier, isBot: true });
        const idx = deeeepBotsList.indexOf(victim);
        if (idx !== -1) deeeepBotsList[idx] = nb;
        deeeepPlayers.set(nb.id, nb);
      }, 4000);
    }
  }

  // 1-Second Vitals Tick (Oxygen, Pressure, Health Regen, Boost Recharge)
  setInterval(() => {
    if (!hasRoomClients('deeeep')) return;
    for (const [, p] of deeeepPlayers) {
      if (p.isDead) continue;
      const tInfo = DEEEEP_TIERS[p.tier - 1];

      // Oxygen
      if (tInfo.breathType === 'air') {
        if (p.y <= 360) {
          p.oxygen = 100; // Surface breathing
        } else {
          p.oxygen = Math.max(0, p.oxygen - 4);
          if (p.oxygen <= 0) p.hp = Math.max(0, p.hp - 10);
        }
      } else {
        p.oxygen = 100;
      }

      // Pressure
      const inRange = p.y >= tInfo.depthRange[0] && p.y <= tInfo.depthRange[1];
      if (!inRange) {
        p.pressure = Math.max(0, p.pressure - 6);
        if (p.pressure <= 0) p.hp = Math.max(0, p.hp - 12);
      } else {
        p.pressure = Math.min(100, p.pressure + 8);
      }

      // Natural HP Regen
      if (p.hp < p.maxHp && p.oxygen > 0 && p.pressure > 0) {
        p.hp = Math.min(p.maxHp, p.hp + 4);
      }

      // Boost Recharge
      if (p.boostCharges < p.maxBoost) {
        p.boostCharges = Math.min(p.maxBoost, p.boostCharges + 0.35);
      }
    }
  }, 1000);

  // 20 FPS Deeeep.io Simulation Loop (idle sleep when 0 players in room)
  setInterval(() => {
    if (!hasRoomClients('deeeep')) return;
    const now = Date.now();
    const active = Array.from(deeeepPlayers.values()).filter(p => !p.isDead);

    // 1. Bot AI
    for (const b of deeeepBotsList) {
      if (b.isDead) continue;
      if (now > b.botRetargetAt) {
        let bestTarget = null, bestDist = Infinity;
        // Search food or weaker animals
        for (const other of active) {
          if (other.id === b.id) continue;
          if (other.tier < b.tier) {
            const d = Math.hypot(other.x - b.x, other.y - b.y);
            if (d < 500 && d < bestDist) { bestDist = d; bestTarget = other; }
          }
        }
        if (bestTarget) {
          b.targetAngle = Math.atan2(bestTarget.y - b.y, bestTarget.x - b.x);
          if (bestDist < 160 && b.boostCharges >= 1) {
            b.boostCharges--;
            b.boostTimeLeft = 14;
          }
        } else {
          // Wander within depth range
          const tInfo = DEEEEP_TIERS[b.tier - 1];
          const targetY = tInfo.depthRange[0] + Math.random() * (tInfo.depthRange[1] - tInfo.depthRange[0]);
          const targetX = 200 + Math.random() * (DEEEEP_W - 400);
          b.targetAngle = Math.atan2(targetY - b.y, targetX - b.x);
        }
        b.botRetargetAt = now + 1200 + Math.random() * 2000;
      }
    }

    // 2. Movement
    for (const p of active) {
      const tInfo = DEEEEP_TIERS[p.tier - 1];
      let da = p.targetAngle - p.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      p.angle += Math.sign(da) * Math.min(Math.abs(da), 0.14);

      let currentSpeed = tInfo.speed;
      if (p.boostTimeLeft > 0) {
        currentSpeed *= 2.2;
        p.boostTimeLeft--;
      }

      p.x = Math.max(30, Math.min(DEEEEP_W - 30, p.x + Math.cos(p.angle) * currentSpeed));
      p.y = Math.max(30, Math.min(DEEEEP_H - 30, p.y + Math.sin(p.angle) * currentSpeed));

      // Eat Food
      const eatRadius = 18 + p.tier * 2;
      for (const [fid, f] of deeeepFoods) {
        if (Math.hypot(p.x - f.x, p.y - f.y) < eatRadius) {
          p.exp += f.exp;
          p.score += f.exp;
          p.hp = Math.min(p.maxHp, p.hp + 6);
          deeeepFoods.delete(fid);
          spawnDeeeepFood(1);

          // Evolution Check!
          if (p.tier < DEEEEP_TIERS.length && p.exp >= tInfo.nextExp) {
            p.tier++;
            const newTInfo = DEEEEP_TIERS[p.tier - 1];
            p.maxHp = newTInfo.maxHp;
            p.hp = newTInfo.maxHp;
            if (p.ws && p.ws.readyState === WebSocket.OPEN) {
              p.ws.send(JSON.stringify({
                type: 'deeeep_evolved',
                tier: p.tier,
                tierInfo: newTInfo
              }));
            }
          }
        }
      }
    }

    // 3. Combat & Bite Collisions
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];
        if (a.isDead || b.isDead) continue;

        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const contactDist = 32 + (a.tier + b.tier) * 2;

        if (dist < contactDist) {
          // Both face each other or boosting
          const dmgA = (12 + a.tier * 8) * (a.boostTimeLeft > 0 ? 1.6 : 1.0);
          const dmgB = (12 + b.tier * 8) * (b.boostTimeLeft > 0 ? 1.6 : 1.0);

          b.hp -= dmgA;
          a.hp -= dmgB;

          // Bounce back slightly
          const pushAngle = Math.atan2(b.y - a.y, b.x - a.x);
          a.x -= Math.cos(pushAngle) * 8;
          a.y -= Math.sin(pushAngle) * 8;
          b.x += Math.cos(pushAngle) * 8;
          b.y += Math.sin(pushAngle) * 8;

          if (b.hp <= 0) {
            a.kills++;
            a.exp += 300;
            killDeeeepPlayer(b, a);
          }
          if (a.hp <= 0) {
            b.kills++;
            b.exp += 300;
            killDeeeepPlayer(a, b);
          }
        }
      }
    }

    // 4. Broadcast
    const leaderboard = [...active].sort((a, b) => b.score - a.score).slice(0, 5).map(p => ({
      username: p.username,
      tier: p.tier,
      tierName: DEEEEP_TIERS[p.tier - 1].name,
      score: p.score
    }));

    const payload = JSON.stringify({
      type: 'deeeep_tick',
      players: active.map(p => ({
        id: p.id,
        username: p.username,
        tier: p.tier,
        x: p.x,
        y: p.y,
        angle: p.angle,
        hp: p.hp,
        maxHp: p.maxHp,
        oxygen: p.oxygen,
        pressure: p.pressure,
        exp: p.exp,
        score: p.score,
        boostCharges: p.boostCharges,
        isBoosting: p.boostTimeLeft > 0
      })),
      foods: Array.from(deeeepFoods.values()),
      leaderboard
    });

    wss.clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN && c.room === 'deeeep') {
        c.send(payload);
      }
    });
  }, 50);

  // Return Public API
  return {
    getLanIp,
    getStats() {
      let csCount = 0, diepCount = 0, mcCount = 0, survivorCount = 0, gdCount = 0, pixelCount = 0, sosCount = 0, kafatopuCount = 0, zombsCount = 0, redmatchCount = 0, dinoCount = 0, sumoCount = 0, stickwarCount = 0;
      let realHumanTotal = 0;
      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN && !c.isBot) {
          realHumanTotal++;
          if (c.room === 'cs16') csCount++;
          else if (c.room === 'diep') diepCount++;
          else if (c.room === 'minecraft') mcCount++;
          else if (c.room === 'survivor') survivorCount++;
          else if (c.room === 'geometrydash') gdCount++;
          else if (c.room === 'sos') sosCount++;
          else if (c.room === 'kafatopu') kafatopuCount++;
          else if (c.room === 'zombs') zombsCount++;
          else if (c.room === 'redmatch') redmatchCount++;
          else if (c.room === 'dino') dinoCount++;
          else if (c.room === 'sumo') sumoCount++;
          else if (c.room === 'stickwar') stickwarCount++;
          else if (c.room === 'world' || c.room === 'turkey' || c.room === 'pixelplace') pixelCount++;
        }
      });
      return {
        lanIp: getLanIp(),
        onlineTotal: realHumanTotal,
        games: {
          cs16: csCount,
          diep: diepCount,
          minecraft: mcCount,
          survivor: survivorCount,
          geometrydash: gdCount,
          pixelplace: pixelCount,
          sos: sosCount,
          kafatopu: kafatopuCount,
          zombs: zombsCount,
          redmatch: redmatchCount,
          dino: dinoCount,
          sumo: sumoCount,
          stickwar: stickwarCount
        }
      };
    },
    handleMessage(ws, data) {
      if (!data || !data.type) return false;

      // Sumo Multiplayer Relay
      if (data.type.startsWith('sumo_')) {
        wss.clients.forEach(c => {
          if (c !== ws && c.readyState === WebSocket.OPEN && c.room === 'sumo') {
            c.send(JSON.stringify(data));
          }
        });
        return true;
      }

      // Portal Chat
      if (data.type === 'portal_chat') { broadcastPortalChat(data.username || ws.user?.username || 'Misafir_' + Math.floor(100+Math.random()*900), data.msg); return true; }
      if (data.type === 'portal_get_chat') { ws.send(JSON.stringify({ type: 'portal_chat_history', history: portalChatHistory })); return true; }

      // Admin Controls
      if (data.type === 'admin_auth') {
        if (data.password === ADMIN_PASSWORD) { ws.isAdmin = true; ws.send(JSON.stringify({ type: 'admin_auth_success', message: '👑 Admin yetkileri tanımlandı!' })); }
        else ws.send(JSON.stringify({ type: 'admin_auth_failed', message: '❌ Hatalı admin şifresi!' }));
        return true;
      }
      if (data.type === 'admin_clear_chat') { if (ws.isAdmin) clearPortalChat(); return true; }
      if (data.type === 'admin_announcement') {
        if (!ws.isAdmin) {
          ws.send(JSON.stringify({ type: 'portal_error', message: '❌ Yetkisiz erişim: Sadece yetkili adminler duyuru gönderebilir!' }));
          return true;
        }
        if (data.text || data.message) {
          broadcastAnnouncement(data.text || data.message, data.author || ws.user?.username || '👑 Admin');
        }
        return true;
      }
      if (data.type === 'admin_cs16_godmode') {
        if (ws.isAdmin && ws.cs16Id) { const p = cs16Players.get(ws.cs16Id); if (p) { p.isGod = !p.isGod; ws.send(JSON.stringify({ type: 'cs16_godmode_status', isGod: p.isGod })); } }
        return true;
      }
      if (data.type === 'admin_cs16_kill_bots') {
        if (ws.isAdmin) {
          for (const b of CS_BOTS) { if (b.hp > 0) { b.hp = 0; b.isDead = true;
            const kp = JSON.stringify({ type:'cs16_kill_feed', killer:'👑 Admin', victim:b.username, weapon:'admin_strike', headshot:true });
            wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN && c.room === 'cs16') c.send(kp); });
            setTimeout(() => { b.hp = 100; b.isDead = false; }, 3000);
          }}
        }
        return true;
      }
      if (data.type === 'admin_agario_mass') {
        if (ws.isAdmin && ws.agarPlayerId) { const p = agarPlayers.get(ws.agarPlayerId); if (p && p.cells.length > 0) { p.cells[0].mass += 1000; p.cells[0].r = Math.sqrt(p.cells[0].mass*100); } }
        return true;
      }

      // Game dispatchers
      if (data.type.startsWith('xox_')) { handleXoxMessage(ws, data); return true; }
      if (data.type.startsWith('agario_')) { handleAgarMessage(ws, data); return true; }
      if (data.type.startsWith('cs16_')) { handleCs16Message(ws, data); return true; }
      if (data.type.startsWith('slither_')) { handleSlitherMessage(ws, data); return true; }
      if (data.type.startsWith('tank_')) { handleTankMessage(ws, data); return true; }
      if (data.type.startsWith('deeeep_')) { handleDeeeepMessage(ws, data); return true; }
      if (data.type === 'redmatch_join') {
        ws.room = 'redmatch';
        ws.send(JSON.stringify({ type: 'redmatch_joined', success: true }));
        return true;
      }
      if (data.type === 'redmatch_sync') {
        const payload = JSON.stringify({
          type: 'redmatch_player_update',
          id: ws.cs16Id || ws.id || 'p_' + Math.random().toString(36).substr(2, 6),
          username: data.username,
          pos: data.pos,
          yaw: data.yaw,
          hp: data.hp,
          weapon: data.weapon,
          grappling: data.grappling
        });
        wss.clients.forEach(c => {
          if (c.readyState === WebSocket.OPEN && c.room === 'redmatch' && c !== ws) c.send(payload);
        });
        return true;
      }
      if (data.type === 'redmatch_kill') {
        const payload = JSON.stringify({
          type: 'redmatch_kill_feed',
          killer: data.killer,
          victim: data.victim,
          weapon: data.weapon,
          headshot: !!data.headshot
        });
        wss.clients.forEach(c => {
          if (c.readyState === WebSocket.OPEN && c.room === 'redmatch') c.send(payload);
        });
        return true;
      }
    },
    handleDisconnect(ws) {
      handleXoxDisconnect(ws);
      if (ws.agarPlayerId) agarPlayers.delete(ws.agarPlayerId);
      if (ws.cs16Id) cs16Players.delete(ws.cs16Id);
      if (ws.tankId) tankPlayers.delete(ws.tankId);
      handleSlitherDisconnect(ws);
      handleDeeeepDisconnect(ws);
    }
  };
}

module.exports = { initGamesManager, getLanIp };
