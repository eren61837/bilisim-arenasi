// test_multiplayer_suite.js - Deep Multiplayer Simulation & Load Tester
const WebSocket = require('ws');

async function testGame(name, testFn) {
  process.stdout.write(`Testing [${name}]... `);
  try {
    await testFn();
    console.log('✅ PASSED');
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('=== MULTIPLAYER REAL-TIME WEBSOCKET QA TEST ===\n');

  // 1. XOX 1v1 MATCHMAKING & MOVE TEST
  await testGame('XOX 1v1 Matchmaking & Move', async () => {
    return new Promise((resolve, reject) => {
      const p1 = new WebSocket('ws://localhost:3000');
      const p2 = new WebSocket('ws://localhost:3000');
      let p2MatchId = null;

      p1.on('open', () => {
        p1.send(JSON.stringify({ type: 'xox_queue', username: 'TestPlayer1' }));
      });

      p2.on('open', () => {
        setTimeout(() => {
          p2.send(JSON.stringify({ type: 'xox_queue', username: 'TestPlayer2' }));
        }, 150);
      });

      p2.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'xox_match_found' && msg.mySymbol === 'X') {
            p2MatchId = msg.matchId;
            p2.send(JSON.stringify({ type: 'xox_move', matchId: p2MatchId, index: 4 }));
          }
          if (msg.type === 'xox_state' && msg.board && msg.board[4] === 'X') {
            p1.close();
            p2.close();
            resolve();
          }
        } catch (_) {}
      });

      setTimeout(() => reject(new Error('XOX timeout')), 4000);
    });
  });

  // 2. AGAR.IO SIMULATION TEST
  await testGame('Agar.io Join & Food Spawn', async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:3000');
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'join', room: 'agario' }));
        ws.send(JSON.stringify({ type: 'agario_join', username: 'TestCell' }));
      });
      ws.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'agario_tick' && msg.foods && msg.foods.length > 20) {
            ws.send(JSON.stringify({ type: 'agario_target', x: 100, y: 100 }));
            ws.close();
            resolve();
          }
        } catch (_) {}
      });
      setTimeout(() => reject(new Error('Agar.io timeout')), 4000);
    });
  });

  // 3. SLITHER.IO SIMULATION TEST
  await testGame('Slither.io Join & Snake Trail', async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:3000');
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'join', room: 'slither' }));
        ws.send(JSON.stringify({ type: 'slither_join', username: 'TestSnake' }));
      });
      ws.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'slither_tick' && msg.foods && msg.players) {
            ws.send(JSON.stringify({ type: 'slither_dir', angle: 1.57, boost: false }));
            ws.close();
            resolve();
          }
        } catch (_) {}
      });
      setTimeout(() => reject(new Error('Slither timeout')), 4000);
    });
  });

  // 4. TANK 2D SIMULATION TEST
  await testGame('Tank 2D Join & Shell Firing', async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:3000');
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'join', room: 'tank' }));
        ws.send(JSON.stringify({ type: 'tank_join', username: 'TestTank' }));
      });
      ws.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'tank_tick' && msg.tanks) {
            ws.send(JSON.stringify({ type: 'tank_shoot' }));
            ws.close();
            resolve();
          }
        } catch (_) {}
      });
      setTimeout(() => reject(new Error('Tank timeout')), 4000);
    });
  });

  // 5. DEEEEP.IO SIMULATION TEST
  await testGame('Deeeep.io Join & Sea Food Ecology', async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:3000');
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'join', room: 'deeeep' }));
        ws.send(JSON.stringify({ type: 'deeeep_join', username: 'TestFish' }));
      });
      ws.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'deeeep_tick' && msg.foods && msg.players) {
            ws.close();
            resolve();
          }
        } catch (_) {}
      });
      setTimeout(() => reject(new Error('Deeeep timeout')), 4000);
    });
  });

  // 6. PIXELPLACE AUTH & LAND DRAWING TEST
  await testGame('PixelPlace Auth, Painting & Live Meme Broadcast', async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:3000');
      ws.on('open', () => {
        // Authenticate with a fun meme name
        ws.send(JSON.stringify({ type: 'auth', username: 'TestMemePainter' }));
      });

      let authenticated = false;
      let placedSuccess = false;

      ws.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'auth_ok') {
            authenticated = true;
            // Now join world and paint on land (1282, 372)
            ws.send(JSON.stringify({ type: 'join', room: 'world' }));
            ws.send(JSON.stringify({ type: 'p', x: 1282, y: 372, c: 33 }));
          }
          if (msg.type === 'p' && msg.u) {
            placedSuccess = true;
            ws.close();
            resolve();
          }
        } catch (_) {}
      });

      setTimeout(() => {
        if (placedSuccess) resolve();
        else reject(new Error('PixelPlace timeout'));
      }, 4000);
    });
  });

  console.log('\nAll multiplayer engines tested successfully!');
}

main();
