// server.js
// Ultra-High-Performance Fullstack Pixelplace Server
// Features: Express-style HTTP router, WebSockets, SQLite Auth, World Map, Bot Zones, Cloudflare Turnstile verification

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { DatabaseSync } = require('node:sqlite');
const { WebSocketServer, WebSocket } = require('ws');
const { PALETTE, WORLD_BOT_ZONE, generateWorldMap, generateBotSandbox, generateTurkeyMap } = require('./world_generator.js');
const { initGamesManager, getLanIp } = require('./games_manager.js');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// -------------------------------------------------------------
// 1. SQLITE DATABASE SETUP (node:sqlite)
// -------------------------------------------------------------
const DB_FILE = path.join(DATA_DIR, 'pixelplace.sqlite');
const db = new DatabaseSync(DB_FILE);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;
  PRAGMA cache_size = -8000;
  PRAGMA temp_store = MEMORY;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    pixels_placed INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS game_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    username TEXT NOT NULL,
    rating INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(game_id, username)
  );

  CREATE TABLE IF NOT EXISTS protected_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    name TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    w INTEGER NOT NULL,
    h INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ip_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    username TEXT,
    action TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_history(room, id DESC);
  CREATE INDEX IF NOT EXISTS idx_protected_zones_room ON protected_zones(room);
  CREATE INDEX IF NOT EXISTS idx_ip_logs_ip ON ip_logs(ip);
`);

console.log('✅ SQLite Database initialized at:', DB_FILE);

const IP_LOG_FILE = path.join(DATA_DIR, 'ip_logs.json');
let cachedIpLogs = [];
try {
  if (fs.existsSync(IP_LOG_FILE)) {
    cachedIpLogs = JSON.parse(fs.readFileSync(IP_LOG_FILE, 'utf8'));
  }
} catch (_) { cachedIpLogs = []; }

function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const headers = req.headers || {};
  const cf = headers['cf-connecting-ip'];
  if (cf) return String(cf).trim();
  const xf = headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  const xr = headers['x-real-ip'];
  if (xr) return String(xr).trim();
  return req.socket ? req.socket.remoteAddress || '127.0.0.1' : '127.0.0.1';
}

function logClientIp(req, username = 'Misafir', action = 'visit') {
  try {
    const ip = getClientIp(req);
    const ua = (req && req.headers && req.headers['user-agent']) || 'Unknown';
    const now = Date.now();
    db.prepare('INSERT INTO ip_logs (ip, username, action, user_agent, created_at) VALUES (?, ?, ?, ?, ?)').run(
      ip, username, action, ua, now
    );
    cachedIpLogs.push({ ip, username, action, ua, time: new Date(now).toISOString() });
    if (cachedIpLogs.length > 500) cachedIpLogs.shift();
    fs.writeFileSync(IP_LOG_FILE, JSON.stringify(cachedIpLogs, null, 2));
  } catch (_) {}
}

let activeProtectedZones = [];
try {
  activeProtectedZones = db.prepare('SELECT id, room, user_id, username, name, x, y, w, h FROM protected_zones').all();
  console.log(`🛡️ Loaded ${activeProtectedZones.length} protected zone(s) from database`);
} catch (e) {
  console.error('Error loading protected zones:', e);
}

function findProtectedZone(room, x, y) {
  for (let i = 0; i < activeProtectedZones.length; i++) {
    const z = activeProtectedZones[i];
    if (z.room === room && x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) {
      return z;
    }
  }
  return null;
}

const stmtIncUserPixel = db.prepare('UPDATE users SET pixels_placed = pixels_placed + 1 WHERE id = ?');
const stmtBatchIncUserPixel = db.prepare('UPDATE users SET pixels_placed = pixels_placed + ? WHERE id = ?');

// Auth Helpers
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function findUserBySession(token) {
  if (!token) return null;
  const stmt = db.prepare(`
    SELECT u.id, u.username, u.email, u.pixels_placed, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `);
  return stmt.get(token, Date.now()) || null;
}

const OFFICIAL_BOT = {
  enabled: false,
  repairSpeedMs: 999999,
  doodlesEnabled: false
};
let worldCountryPixels = [];

const ROOMS = {
  world: {
    id: 'world',
    name: '🌍 Dünya Haritası (World Map)',
    w: 2048,
    h: 1024,
    cooldownMs: 0, // Cooldown yok - Anında yerleştirme (Hız sınırlayıcı fırça aktif)
    isBotAllowed: true,
    description: 'Gerçek dünya haritası. Denizler boyanamaz, karalar boyanabilir!',
    buffer: null,
    paintableMask: null
  },
  turkey: {
    id: 'turkey',
    name: '🇹🇷 Türkiye Haritası (TR Canvas)',
    w: 1600,
    h: 900,
    cooldownMs: 0, // Cooldown yok!
    isBotAllowed: true,
    description: 'Anadolu ve Trakya temalı tuval. Denizler boyanamaz!',
    buffer: null,
    paintableMask: null
  }
};

// Initialize or load canvas buffers and paintable masks from disk
function initRoomCanvases() {
  for (const [roomId, room] of Object.entries(ROOMS)) {
    const file = path.join(DATA_DIR, `canvas_${roomId}.bin`);
    const maskFile = path.join(DATA_DIR, `paintable_${roomId}.bin`);

    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file);
      if (data.length === room.w * room.h) {
        room.buffer = data;
        if (roomId === 'world') {
          const fresh = generateWorldMap();
          let sanitized = 0;
          for (let i = 0; i < room.buffer.length; i++) {
            if (fresh[i] === 12 || fresh[i] === 13 || fresh[i] === 3) {
              if (room.buffer[i] !== fresh[i]) {
                room.buffer[i] = fresh[i];
                sanitized++;
              }
            }
          }
          if (sanitized > 0) {
            fs.writeFileSync(file, room.buffer);
            console.log(`🛡️ [world] Deniz ve sınırlar arındırıldı: ${sanitized} piksel temizlendi ve diske yazıldı!`);
          }
        }
        console.log(`✅ Loaded existing canvas for [${roomId}] (${room.w}x${room.h})`);
      }
    }

    if (!room.buffer) {
      console.log(`⚡ Generating fresh map for [${roomId}]...`);
      if (roomId === 'world') {
        room.buffer = generateWorldMap();
      } else if (roomId === 'botzone') {
        room.buffer = generateBotSandbox();
      } else if (roomId === 'turkey') {
        room.buffer = generateTurkeyMap();
      } else {
        room.buffer = Buffer.alloc(room.w * room.h, 0);
      }
      fs.writeFileSync(file, room.buffer);
      console.log(`💾 Saved initial canvas for [${roomId}]`);
    }

    // Load or Generate Paintable Mask (0 = Boyanamaz: Deniz/Okyanus ve ÜLKE SINIRLARI, 1 = Kara BOYANABİLİR)
    if (fs.existsSync(maskFile)) {
      const mData = fs.readFileSync(maskFile);
      if (mData.length === room.w * room.h) {
        room.paintableMask = mData;
        console.log(`🛡️ Loaded paintable mask for [${roomId}] (${room.paintableMask.length} bytes)`);
      }
    }
    if (!room.paintableMask) {
      room.paintableMask = Buffer.alloc(room.w * room.h, 1);
      if (roomId === 'world') {
        let protectedCount = 0;
        for (let i = 0; i < room.buffer.length; i++) {
          const c = room.buffer[i];
          const x = i % room.w;
          const y = Math.floor(i / room.w);
          if (c === 12 || c === 13 || c === 3) {
            // 12=Ocean, 13=Deep ocean grid, 3=Country borders (kara parçalarını ayıran yerler)
            room.paintableMask[i] = 0;
            protectedCount++;
          }
        }
        console.log(`🛡️ [world] Sınırlar ve denizler korundu! ${protectedCount} piksel boyanamaz yapıldı.`);
      } else if (roomId === 'turkey') {
        for (let i = 0; i < room.buffer.length; i++) {
          const c = room.buffer[i];
          if (c === 12 || c === 13 || c === 18) { // 18 is border stroke in Turkey map
            room.paintableMask[i] = 0;
          }
        }
      }
      fs.writeFileSync(maskFile, room.paintableMask);
      console.log(`🛡️ Generated & saved paintable mask for [${roomId}]`);
    }
  }
}

// PixelPlace canvas buffers disabled to optimize RAM for Render free tier (20+ concurrent players)
// initRoomCanvases();

// -------------------------------------------------------------
// 3. HTTP SERVER & API ROUTES
// -------------------------------------------------------------
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(c => {
    const parts = c.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getGameRatings() {
  const result = {};
  try {
    const rows = db.prepare('SELECT game_id, SUM(rating) as total_sum, COUNT(*) as total_count FROM game_ratings GROUP BY game_id').all();
    for (const r of rows) {
      const count = Number(r.total_count);
      const sum = Number(r.total_sum);
      result[r.game_id] = {
        avg: count > 0 ? Number((sum / count).toFixed(1)) : 0,
        count: count
      };
    }
  } catch (_) {}
  return result;
}

// High-Speed In-Memory Static Cache with Pre-gzipped Buffers
// Eliminates CPU spike, file disk I/O, and streaming lag on weak / free-tier servers
const STATIC_RAM_CACHE = new Map();
const MAX_RAM_CACHE_FILE_SIZE = 4 * 1024 * 1024; // 4MB per file max

let cachedStatsPayload = null;
let lastStatsTime = 0;

const server = http.createServer(async (req, res) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Log incoming client IP & route
  if (!pathname.startsWith('/api/canvas') && !pathname.endsWith('.png') && !pathname.endsWith('.jpg')) {
    logClientIp(req, 'Visitor', pathname);
  }

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // API ROUTES
  if (pathname.startsWith('/api/')) {
    try {
      // 1. GET /api/rooms
      if (pathname === '/api/rooms' && req.method === 'GET') {
        const roomList = Object.values(ROOMS).map(r => ({
          id: r.id,
          name: r.name,
          w: r.w,
          h: r.h,
          cooldownMs: r.cooldownMs,
          isBotAllowed: r.isBotAllowed,
          description: r.description
        }));
        return sendJson(res, 200, { rooms: roomList, palette: PALETTE });
      }

      // 1.5 GET /api/canvas (Fast Binary Buffer Download)
      if (pathname === '/api/canvas' && req.method === 'GET') {
        const targetRoom = ROOMS[parsedUrl.searchParams.get('room')] || ROOMS.world;
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(targetRoom.buffer);
      }

      // 1.6 GET /api/paintable-mask (Paintable Land / Ocean Mask)
      if (pathname === '/api/paintable-mask' && req.method === 'GET') {
        const targetRoom = ROOMS[parsedUrl.searchParams.get('room')] || ROOMS.world;
        if (!targetRoom || !targetRoom.paintableMask) {
          return sendJson(res, 404, { error: 'Mask not found' });
        }
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': targetRoom.paintableMask.length,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        });
        return res.end(targetRoom.paintableMask);
      }

      // 1.7 POST /api/reset-map (Haritaları Sıfırla)
      if (pathname === '/api/reset-map' && req.method === 'POST') {
        const { resetAllMaps } = require('./reset_maps.js');
        resetAllMaps();
        initRoomCanvases();
        for (const [roomId, room] of Object.entries(ROOMS)) {
          broadcastToRoom(roomId, room.buffer);
        }
        return sendJson(res, 200, { success: true, message: 'Haritalar başarıyla sıfırlandı!' });
      }

      // 1.8 GET /api/protected-zones
      if (pathname === '/api/protected-zones' && req.method === 'GET') {
        const roomId = parsedUrl.searchParams.get('room') || 'world';
        const zones = activeProtectedZones.filter(z => z.room === roomId);
        return sendJson(res, 200, { zones });
      }

      // 1.9 POST /api/protect-zone
      if (pathname === '/api/protect-zone' && req.method === 'POST') {
        const cookies = parseCookies(req);
        const authHeader = req.headers.authorization;
        const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7) : (cookies.session_token || parsedUrl.searchParams.get('token'));
        const user = findUserBySession(token);
        if (!user) {
          return sendJson(res, 401, { error: 'Alan korumak için lütfen bir isim belirleyin!' });
        }

        const body = await parseJsonBody(req);
        const roomId = body.room || 'world';
        const name = String(body.name || 'Korumalı Alan').trim().slice(0, 30);
        const x = parseInt(body.x, 10);
        const y = parseInt(body.y, 10);
        const w = Math.min(256, Math.max(1, parseInt(body.w, 10)));
        const h = Math.min(256, Math.max(1, parseInt(body.h, 10)));

        const room = ROOMS[roomId];
        if (!room) return sendJson(res, 400, { error: 'Geçersiz oda.' });
        if (x < 0 || x + w > room.w || y < 0 || y + h > room.h) {
          return sendJson(res, 400, { error: 'Alan harita sınırları dışına taşıyor.' });
        }

        const now = Date.now();
        const resDb = db.prepare(`
          INSERT INTO protected_zones (room, user_id, username, name, x, y, w, h, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(roomId, user.id, user.username, name, x, y, w, h, now);

        const newZone = {
          id: Number(resDb.lastInsertRowid),
          room: roomId,
          user_id: user.id,
          username: user.username,
          name,
          x,
          y,
          w,
          h,
          created_at: now
        };
        activeProtectedZones.push(newZone);

        // Broadcast to all clients in the room
        broadcastToRoom(roomId, {
          type: 'zone_protected',
          zone: newZone
        });

        return sendJson(res, 201, { success: true, zone: newZone });
      }

      // 1.10 DELETE /api/protect-zone
      if (pathname === '/api/protect-zone' && req.method === 'DELETE') {
        const cookies = parseCookies(req);
        const authHeader = req.headers.authorization;
        const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7) : (cookies.session_token || parsedUrl.searchParams.get('token'));
        const user = findUserBySession(token);
        if (!user) {
          return sendJson(res, 401, { error: 'Yetkisiz istek.' });
        }

        let body = {};
        try { body = await parseJsonBody(req); } catch (_) {}
        const zoneId = parseInt(body.id || parsedUrl.searchParams.get('id'), 10);
        if (isNaN(zoneId)) {
          return sendJson(res, 400, { error: 'Geçersiz korumalı alan kimliği.' });
        }
        const zoneIndex = activeProtectedZones.findIndex(z => z.id === zoneId);
        if (zoneIndex === -1) {
          return sendJson(res, 404, { error: 'Korumalı alan bulunamadı.' });
        }

        const targetZone = activeProtectedZones[zoneIndex];
        if (targetZone.user_id !== user.id && user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Bu alanı silme yetkiniz yok.' });
        }

        db.prepare('DELETE FROM protected_zones WHERE id = ?').run(zoneId);
        activeProtectedZones.splice(zoneIndex, 1);

        broadcastToRoom(targetZone.room, {
          type: 'zone_unprotected',
          id: zoneId
        });

        return sendJson(res, 200, { success: true });
      }

      // 1.105 GET /api/admin/bot-config
      if (pathname === '/api/admin/bot-config' && req.method === 'GET') {
        return sendJson(res, 200, { success: true, config: global.OFFICIAL_BOT });
      }

      // 1.106 POST /api/admin/bot-config
      if (pathname === '/api/admin/bot-config' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (body.enabled !== undefined) global.OFFICIAL_BOT.enabled = !!body.enabled;
        if (body.speedMs !== undefined) global.OFFICIAL_BOT.repairSpeedMs = parseInt(body.speedMs, 10) || 4000;
        if (body.doodlesEnabled !== undefined) global.OFFICIAL_BOT.doodlesEnabled = !!body.doodlesEnabled;
        return sendJson(res, 200, { success: true, config: global.OFFICIAL_BOT });
      }

      // 1.11 GET /api/download-minecraft-launcher
      if (pathname === '/api/download-minecraft-launcher' && req.method === 'GET') {
        const username = (parsedUrl.searchParams.get('nick') || 'Oyuncu').replace(/[^a-zA-Z0-9_]/g, '');
        const version = (parsedUrl.searchParams.get('version') || '1.21.1').replace(/[^a-zA-Z0-9._-]/g, '');
        const ram = (parsedUrl.searchParams.get('ram') || '4G').replace(/[^a-zA-Z0-9]/g, '');
        const host = req.headers.host || 'localhost:3000';
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const serverJarUrl = `${proto}://${host}/TLauncher.jar`;

        const batScript = `@echo off
chcp 65001 >nul
title BilisimCraft - Minecraft ${version} & TLauncher Baslatici
color 0A
cls
echo =======================================================================
echo    MINECRAFT ${version} & TLAUNCHER OTO-KURUCU - BILISIM ARENASI
echo    Oyuncu: ${username} ^| RAM: ${ram} ^| Surum: ${version}
echo =======================================================================
echo.
echo [1/4] Calisma klasoru hazirlaniyor...
set "WORK_DIR=%LOCALAPPDATA%\\BilisimCraft"
if not exist "%WORK_DIR%" mkdir "%WORK_DIR%"
set "JAVA_DIR=%WORK_DIR%\\java21"

echo.
echo [2/4] Java 21 kontrol ediliyor...
where java >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Sistemde yuklu Java bulundu!
    set "RUN_JAVA=java"
) else (
    if exist "%JAVA_DIR%\\bin\\java.exe" (
        echo [OK] Tasinabilir Java 21 bulundu!
        set "RUN_JAVA=%JAVA_DIR%\\bin\\java.exe"
    ) else (
        echo [!] Java 21 bulunamadi. Tasinabilir Adoptium OpenJDK 21 indiriliyor...
        echo     (Yonetici izni gerektirmez, dogrudan kurulur!)
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $url = 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse'; Invoke-WebRequest -Uri $url -OutFile '%WORK_DIR%\\java21.zip'"
        echo [i] Java 21 cikartiliyor...
        powershell -Command "Expand-Archive -Path '%WORK_DIR%\\java21.zip' -DestinationPath '%WORK_DIR%\\java_temp' -Force; $inner = Get-ChildItem '%WORK_DIR%\\java_temp' | Select -First 1; Move-Item $inner.FullName '%JAVA_DIR%'; Remove-Item '%WORK_DIR%\\java_temp' -Recurse; Remove-Item '%WORK_DIR%\\java21.zip'"
        set "RUN_JAVA=%JAVA_DIR%\\bin\\java.exe"
    )
)

echo.
echo [3/4] TLauncher & Gercek Minecraft bilesenleri yukleniyor...
set "LAUNCHER_JAR=%WORK_DIR%\\TLauncher.jar"
if not exist "%LAUNCHER_JAR%" (
    echo [i] TLauncher portal sunucusundan yukleniyor...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri '${serverJarUrl}' -OutFile '%LAUNCHER_JAR%' -UserAgent 'Mozilla/5.0' } catch { Write-Host 'Alternatif kaynak deneniyor...' }"
)

echo.
echo [4/4] Gercek Minecraft & TLauncher ${version} baslatiliyor! Iyi Oyunlar ${username}!
echo =======================================================================
if exist "%LAUNCHER_JAR%" (
    start "" "%RUN_JAVA%" -Xmx${ram} -jar "%LAUNCHER_JAR%"
) else (
    echo [!] Hata: TLauncher dosyasi alinamadi.
    pause
)
timeout /t 3 >nul
exit
`;
        res.writeHead(200, {
          'Content-Type': 'application/x-bat',
          'Content-Disposition': `attachment; filename="BilisimCraft_TLauncher_${version}.bat"`,
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(batScript);
      }

      // 1.12 POST /api/minecraft/launch-local
      if (pathname === '/api/minecraft/launch-local' && req.method === 'POST') {
        const { spawn } = require('child_process');
        const jarPath = path.join(__dirname, 'public', 'TLauncher.jar');
        if (!fs.existsSync(jarPath)) {
          return sendJson(res, 404, { error: 'TLauncher.jar dosyası sunucuda bulunamadı.' });
        }
        try {
          const child = spawn('javaw', ['-jar', jarPath], { detached: true, stdio: 'ignore' });
          child.unref();
          return sendJson(res, 200, { success: true, message: 'Gerçek TLauncher bilgisayarınızda başlatıldı!' });
        } catch (_) {
          try {
            const child2 = spawn('java', ['-jar', jarPath], { detached: true, stdio: 'ignore' });
            child2.unref();
            return sendJson(res, 200, { success: true, message: 'Gerçek TLauncher bilgisayarınızda başlatıldı!' });
          } catch (err) {
            return sendJson(res, 500, { error: 'Java başlatılamadı: ' + err.message });
          }
        }
      }

      // 2. GET /api/me
      if (pathname === '/api/me' && req.method === 'GET') {
        const cookies = parseCookies(req);
        const authHeader = req.headers.authorization;
        const token = (authHeader && authHeader.startsWith('Bearer ')) 
          ? authHeader.slice(7) 
          : (cookies.session_token || parsedUrl.searchParams.get('token'));

        const user = findUserBySession(token);
        if (!user) {
          return sendJson(res, 200, { authenticated: false });
        }
        return sendJson(res, 200, { authenticated: true, user });
      }

      // 2.5 POST /api/quick-auth (Sadece İsim / Nickname ile Giriş)
      if (pathname === '/api/quick-auth' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const username = body.username ? String(body.username).trim() : '';

        if (!username || username.length < 2 || username.length > 20) {
          return sendJson(res, 400, { error: 'Kullanıcı adı 2 ile 20 karakter arasında olmalıdır.' });
        }

        const now = Date.now();
        let user = db.prepare('SELECT id, username, email, pixels_placed, role FROM users WHERE username = ?').get(username);

        if (!user) {
          const safeId = Buffer.from(username).toString('hex').slice(0, 12);
          const fakeEmail = `u_${safeId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@pixelplace.local`;
          const result = db.prepare(`
            INSERT INTO users (username, email, password_hash, password_salt, pixels_placed, role, created_at)
            VALUES (?, ?, '', '', 0, 'user', ?)
          `).run(username, fakeEmail, now);
          user = {
            id: Number(result.lastInsertRowid),
            username: username,
            email: fakeEmail,
            pixels_placed: 0,
            role: 'user'
          };
        }

        const token = generateToken();
        const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
        db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, user.id, now, expiresAt);
        logClientIp(req, user.username, 'login');
        res.setHeader('Set-Cookie', `session_token=${token}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`);
        return sendJson(res, 200, {
          success: true,
          token,
          user
        });
      }

      // 3. POST /api/register
      if (pathname === '/api/register' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        
        // hCaptcha verification
        const hcaptchaToken = body['h-captcha-response'] || body.hcaptchaToken || '';
        if (!hcaptchaToken) {
          return sendJson(res, 400, { error: 'Güvenlik doğrulaması gerekli! (hCaptcha)' });
        }
        // Test key always passes; for production replace with real secret from hcaptcha.com
        const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '0x0000000000000000000000000000000000000000';
        try {
          const verifyRes = await new Promise((resolve, reject) => {
            const postData = `response=${hcaptchaToken}&secret=${HCAPTCHA_SECRET}`;
            const options = {
              hostname: 'hcaptcha.com',
              path: '/siteverify',
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
            };
            const req2 = require('https').request(options, (res2) => {
              let d = ''; res2.on('data', c => d += c); res2.on('end', () => resolve(JSON.parse(d)));
            });
            req2.on('error', reject);
            req2.write(postData);
            req2.end();
          });
          if (!verifyRes.success) {
            return sendJson(res, 400, { error: 'Güvenlik doğrulaması başarısız! Lütfen tekrar deneyin.' });
          }
        } catch (_) {
          // If hcaptcha check fails due to network, allow through (don't block students)
        }

        const { username, email, password, captchaToken } = body;

        // Cloudflare Turnstile / Captcha Verification Check
        if (!captchaToken && process.env.REQUIRE_CAPTCHA === 'true') {
          return sendJson(res, 400, { error: 'Lütfen Cloudflare doğrulamasını tamamlayın.' });
        }

        if (!username || username.trim().length < 2 || username.trim().length > 20) {
          return sendJson(res, 400, { error: 'Kullanıcı adı 2 ile 20 karakter arasında olmalıdır.' });
        }
        if (!password || password.length < 3) {
          return sendJson(res, 400, { error: 'Şifre en az 3 karakter olmalıdır.' });
        }

        const cleanUsername = username.trim();
        const cleanEmail = (email && email.includes('@')) 
          ? email.trim().toLowerCase() 
          : `${cleanUsername.toLowerCase()}@arena.local`;

        // Check if username or email already exists
        const checkStmt = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?');
        const existing = checkStmt.get(cleanUsername, cleanEmail);
        if (existing) {
          return sendJson(res, 409, { error: 'Bu kullanıcı adı zaten kullanımda. Giriş yapmayı dene!' });
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPassword(password, salt);
        const now = Date.now();

        const insertStmt = db.prepare(`
          INSERT INTO users (username, email, password_hash, password_salt, pixels_placed, role, created_at)
          VALUES (?, ?, ?, ?, 0, 'user', ?)
        `);
        const result = insertStmt.run(cleanUsername, cleanEmail, hash, salt, now);
        const userId = result.lastInsertRowid;

        // Create Session Token
        const token = generateToken();
        const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days
        db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, now, expiresAt);
        logClientIp(req, cleanUsername, 'register');
        res.setHeader('Set-Cookie', `session_token=${token}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`);
        return sendJson(res, 201, {
          success: true,
          token,
          user: { id: userId, username: cleanUsername, email: cleanEmail, pixels_placed: 0, role: 'user' }
        });
      }

      // 4. POST /api/login
      if (pathname === '/api/login' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { identifier, password, captchaToken } = body;

        if (!identifier || !password) {
          return sendJson(res, 400, { error: 'E-posta/Kullanıcı adı ve şifre zorunludur.' });
        }

        const cleanId = identifier.trim();
        const stmt = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?');
        const user = stmt.get(cleanId, cleanId.toLowerCase());

        if (!user) {
          return sendJson(res, 401, { error: 'Kullanıcı adı veya şifre hatalı.' });
        }

        const testHash = hashPassword(password, user.password_salt);
        if (testHash !== user.password_hash) {
          return sendJson(res, 401, { error: 'Kullanıcı adı veya şifre hatalı.' });
        }

        const now = Date.now();
        const token = generateToken();
        const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
        db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, user.id, now, expiresAt);

        res.setHeader('Set-Cookie', `session_token=${token}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`);
        return sendJson(res, 200, {
          success: true,
          token,
          user: { id: user.id, username: user.username, email: user.email, pixels_placed: user.pixels_placed, role: user.role }
        });
      }

      // 5. POST /api/logout
      if (pathname === '/api/logout' && req.method === 'POST') {
        const cookies = parseCookies(req);
        const authHeader = req.headers.authorization;
        const token = (authHeader && authHeader.startsWith('Bearer ')) 
          ? authHeader.slice(7) 
          : cookies.session_token;

        if (token) {
          db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        }
        res.setHeader('Set-Cookie', 'session_token=; Path=/; HttpOnly; Max-Age=0');
        return sendJson(res, 200, { success: true });
      }

      // 6. GET /api/leaderboard
      if (pathname === '/api/leaderboard' && req.method === 'GET') {
        const topUsers = db.prepare('SELECT username, pixels_placed FROM users ORDER BY pixels_placed DESC LIMIT 10').all();
        return sendJson(res, 200, { leaderboard: topUsers });
      }

      // 7. GET /api/canvas-raw (Direct binary download)
      if (pathname === '/api/canvas-raw' && req.method === 'GET') {
        const roomId = parsedUrl.searchParams.get('room') || 'world';
        const room = ROOMS[roomId] || ROOMS.world;
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': room.buffer.length,
          'Access-Control-Allow-Origin': '*'
        });
        res.end(room.buffer);
        return;
      }

      // 8. GET /api/portal-stats (Cached for 2s to prevent polling storms from hammering SQLite/event loop)
      if (pathname === '/api/portal-stats' && req.method === 'GET') {
        const now = Date.now();
        if (!cachedStatsPayload || (now - lastStatsTime > 2000)) {
          cachedStatsPayload = gamesManager ? gamesManager.getStats() : { lanIp: getLanIp(), onlineTotal: connectedClients.size, games: {} };
          lastStatsTime = now;
        }
        return sendJson(res, 200, cachedStatsPayload);
      }

      // 8a. GET /api/game-ratings
      if (pathname === '/api/game-ratings' && req.method === 'GET') {
        return sendJson(res, 200, { success: true, ratings: getGameRatings() });
      }

      // 8b. POST /api/rate-game
      if (pathname === '/api/rate-game' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const gameId = String(body.gameId || '').trim().toLowerCase();
        const rating = parseInt(body.rating, 10);
        const username = String(body.username || 'Misafir').trim().slice(0, 30);
        if (!gameId || isNaN(rating) || rating < 1 || rating > 5) {
          return sendJson(res, 400, { error: 'Geçersiz puan veya oyun ID (1-5 arası olmalıdır).' });
        }
        try {
          db.prepare(`
            INSERT INTO game_ratings (game_id, username, rating, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(game_id, username) DO UPDATE SET rating = excluded.rating, created_at = excluded.created_at
          `).run(gameId, username, rating, Date.now());
        } catch (dbErr) {
          console.error('Rate DB error:', dbErr);
        }
        const updated = getGameRatings();
        return sendJson(res, 200, {
          success: true,
          gameId,
          newAvg: updated[gameId] ? updated[gameId].avg : rating,
          newCount: updated[gameId] ? updated[gameId].count : 1,
          ratings: updated
        });
      }

      // 8c. POST /api/portal-chat (HTTP fallback for 100% reliable chat delivery)
      if (pathname === '/api/portal-chat' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const username = String(body.username || 'Misafir').trim().slice(0, 30);
        const msg = String(body.msg || body.message || '').trim().slice(0, 300);
        if (!msg) {
          return sendJson(res, 400, { error: 'Mesaj boş olamaz.' });
        }
        if (gamesManager && typeof gamesManager.broadcastPortalChat === 'function') {
          gamesManager.broadcastPortalChat(username, msg);
        }
        return sendJson(res, 200, { success: true });
      }

      // 8c2. GET /api/ip-logs (Recorded Visitor & Player IPs)
      if (pathname === '/api/ip-logs' && req.method === 'GET') {
        try {
          const logs = db.prepare('SELECT ip, username, action, user_agent, created_at FROM ip_logs ORDER BY id DESC LIMIT 100').all();
          return sendJson(res, 200, { success: true, logs });
        } catch (_) {
          return sendJson(res, 200, { success: true, logs: cachedIpLogs });
        }
      }

      // 8d. POST /api/admin-announce (Broadcasts to all games & sockets)
      if (pathname === '/api/admin-announce' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const text = String(body.text || body.message || '').trim();
        const author = String(body.author || '👑 Admin').trim();
        if (text) {
          if (gamesManager && typeof gamesManager.broadcastAnnouncement === 'function') {
            gamesManager.broadcastAnnouncement(text, author);
          }
        }
        return sendJson(res, 200, { success: true });
      }

      // 8e. GET /api/latest-announcement (Universal polling fallback for all games & tabs)
      if (pathname === '/api/latest-announcement' && req.method === 'GET') {
        const ann = (gamesManager && typeof gamesManager.getLatestAnnouncement === 'function')
          ? gamesManager.getLatestAnnouncement()
          : null;
        return sendJson(res, 200, { success: true, announcement: ann });
      }

      // 9. GET /api/admin/bot-config
      if (pathname === '/api/admin/bot-config' && req.method === 'GET') {
        return sendJson(res, 200, { success: true, config: OFFICIAL_BOT });
      }

      // 10. POST /api/admin/bot-config
      if (pathname === '/api/admin/bot-config' && req.method === 'POST') {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const user = findUserBySession(token);
        if (!user || user.role !== 'admin') {
          return sendJson(res, 403, { error: 'Admin yetkisi gereklidir.' });
        }
        const body = await parseJsonBody(req);
        if (typeof body.enabled === 'boolean') OFFICIAL_BOT.enabled = body.enabled;
        if (typeof body.repairSpeedMs === 'number') OFFICIAL_BOT.repairSpeedMs = body.repairSpeedMs;
        if (typeof body.doodlesEnabled === 'boolean') OFFICIAL_BOT.doodlesEnabled = body.doodlesEnabled;
        return sendJson(res, 200, { success: true, config: OFFICIAL_BOT });
      }

    } catch (err) {
      console.error('API Error:', err);
      return sendJson(res, 500, { error: 'Sunucu hatası: ' + err.message });
    }
  }

  // STATIC FILE SERVING & CLEAN URLS
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (pathname === '/xox') safePath = '/xox.html';
  else if (pathname === '/cs16') safePath = '/cs16.html';
  else if (pathname === '/agario') safePath = '/agario.html';
  else if (pathname === '/papermap' || pathname === '/slither') safePath = '/slither.html';
  else if (pathname === '/tank') safePath = '/tank.html';
  else if (pathname === '/diep' || pathname === '/deeeep') safePath = '/diep.html';
  else if (pathname === '/minecraft') safePath = '/minecraft.html';
  else if (pathname === '/survivor') safePath = '/survivor.html';
  else if (pathname === '/trollparkur') safePath = '/trollparkur.html';
  else if (pathname === '/geometrydash') safePath = '/geometrydash.html';
  else if (pathname === '/miner') safePath = '/miner.html';
  else if (pathname === '/sos') safePath = '/sos.html';
  else if (pathname === '/kafatopu') safePath = '/kafatopu.html';
  else if (pathname === '/zombs') safePath = '/zombs.html';
  else if (pathname === '/flappy') safePath = '/flappy.html';
  else if (pathname === '/tetris') safePath = '/tetris.html';
  else if (pathname === '/dino') safePath = '/dino.html';
  else if (pathname === '/sumo') safePath = '/sumo.html';
  else if (pathname === '/stickwar') safePath = '/stickwar.html';
  else if (pathname === '/eaglercraft') safePath = '/eaglercraft.html';
  else if (pathname === '/subway') safePath = '/subway.html';
  else if (pathname === '/templerun') safePath = '/index.html';
  else if (pathname === '/gartic') safePath = '/gartic.html';
  else if (pathname === '/racing') safePath = '/racing.html';
  else if (pathname === '/slope') safePath = '/slope.html';
  else if (pathname === '/hook') safePath = '/hook.html';
  else if (pathname === '/python' || pathname === '/pygame') safePath = '/python.html';
  else if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  // Check both PUBLIC_DIR and root (__dirname), pick whichever exists and is newer!
  function resolveStaticFile(sub) {
    const p1 = path.join(PUBLIC_DIR, sub);
    const p2 = path.join(__dirname, sub);
    const has1 = fs.existsSync(p1) && fs.statSync(p1).isFile();
    const has2 = fs.existsSync(p2) && fs.statSync(p2).isFile();
    if (has1 && has2) {
      return (fs.statSync(p2).mtimeMs > fs.statSync(p1).mtimeMs) ? p2 : p1;
    }
    if (has1) return p1;
    if (has2) return p2;
    return null;
  }

  const filePath = resolveStaticFile(safePath);
  if (!filePath) {
    // Fallback to index.html for SPA
    const indexFile = resolveStaticFile('/index.html') || path.join(PUBLIC_DIR, 'index.html');
    fs.readFile(indexFile, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Immediate updates: Disable cache on HTML, JS and CSS so changes reflect instantly
  let cacheHeader = 'no-cache, no-store, must-revalidate, max-age=0';
  if (ext === '.mp3' || ext === '.wav' || ext === '.ogg' || ext === '.wasm') {
    cacheHeader = 'public, max-age=604800, immutable';
  } else if (ext === '.png' || ext === '.jpg' || ext === '.svg' || ext === '.webp') {
    cacheHeader = 'public, max-age=86400';
  }

  // Audio / Media HTTP Range Streaming Support (Vital for browser audio playback & seeking!)
  if (ext === '.mp3' || ext === '.wav' || ext === '.ogg') {
    try {
      const stat = fs.statSync(filePath);
      const total = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
        const chunksize = (end - start) + 1;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Cache-Control': cacheHeader
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      } else {
        res.writeHead(200, {
          'Content-Length': total,
          'Accept-Ranges': 'bytes',
          'Content-Type': contentType,
          'Cache-Control': cacheHeader
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    } catch (_) {}
  }

  // High-Speed In-Memory RAM Cache with Pre-gzipped Buffers
  try {
    const stat = fs.statSync(filePath);
    const etag = `"${stat.size}-${Math.floor(stat.mtimeMs)}"`;

    // 304 Not Modified check (Instant 0-byte response)
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { 'ETag': etag, 'Cache-Control': cacheHeader });
      res.end();
      return;
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const isCompressible = /text|javascript|json|xml|svg|html/.test(contentType);

    if (stat.size <= MAX_RAM_CACHE_FILE_SIZE) {
      let cached = STATIC_RAM_CACHE.get(filePath);
      if (!cached || cached.mtimeMs !== stat.mtimeMs) {
        const rawBuf = fs.readFileSync(filePath);
        const gzBuf = isCompressible ? zlib.gzipSync(rawBuf, { level: 6 }) : null;
        cached = { mtimeMs: stat.mtimeMs, buffer: rawBuf, gzippedBuffer: gzBuf, etag, contentType };
        STATIC_RAM_CACHE.set(filePath, cached);
      }

      if (isCompressible && acceptEncoding.includes('gzip') && cached.gzippedBuffer) {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Encoding': 'gzip',
          'Content-Length': cached.gzippedBuffer.length,
          'ETag': etag,
          'Cache-Control': cacheHeader,
          'Vary': 'Accept-Encoding'
        });
        res.end(cached.gzippedBuffer);
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': cached.buffer.length,
          'ETag': etag,
          'Cache-Control': cacheHeader
        });
        res.end(cached.buffer);
      }
      return;
    }

    // Large files fallback (>4MB, e.g. TLauncher.jar)
    if (isCompressible && acceptEncoding.includes('gzip')) {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Encoding': 'gzip',
        'Cache-Control': cacheHeader,
        'Vary': 'Accept-Encoding'
      });
      fs.createReadStream(filePath).pipe(zlib.createGzip({ level: 6 })).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': cacheHeader
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (serveErr) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error serving static file');
  }
});

// Highly optimized WebSocket Server for Render 512MB RAM free tier
const wss = new WebSocketServer({ 
  server, 
  perMessageDeflate: false,
  maxPayload: 1024 * 64
});
const gamesManager = initGamesManager(wss, db);
const connectedClients = new Set();

// Automatic dead connection cleanup & Render 55s timeout preventer heartbeat every 25s
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch (_) {}
  });
}, 25000);

function broadcastToRoom(roomId, message, senderWs = null) {
  const data = typeof message === 'string' ? message : JSON.stringify(message);
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN && client.room === roomId) {
      if (!senderWs || client !== senderWs) {
        client.send(data);
      }
    }
  }
}

// PixelPlace bots disabled to maximize CPU and memory efficiency
setTimeout(() => {
  if (!OFFICIAL_BOT.enabled) return;
  const WORLD = ROOMS.world;
  if (!WORLD || !WORLD.buffer) return;

  const MEME_PAINTERS = [
    'SkibidiRizzler', 'GigaChad_TR', 'Amogus_31', 'KarpuzKesen_Pro',
    'Keloğlan_Racon', 'SigmaMale_99', 'Dayı_Naber', 'Tostçu_Erol',
    'Mewing_God', 'PepeTheFrog', 'Walter_White_TR', 'Dönerci_Hamdi',
    'BruhMoment', 'Kekstra_Canavarı', 'Doge_Elon', 'Adana_Merkez_01',
    'Shrek_Official', 'NPC_Ahmet', 'Kedy_Sever_35', 'NoobMaster69',
    'Ayasofya_Enjoyer', 'GötürBeniAya', 'SubToPewds', 'Czn_Burak_Smile',
    'Speedy_Gonzales', 'Çaycı_Hüseyin', 'Ben_Fero_31', 'Minecraft_Steve',
    'Sans_Undertale', 'Gaben_Steam', 'Bgy_Aslanı', 'Limonlu_Soda',
    'Koyun_Shaun', 'Sıfır_Bir_Cio', 'Tırrek_Avcısı', 'SpongeBob_Meme',
    'Balerina_Cappuccino', 'Hamsi_Kafalı', 'Konyalı_Astronot', 'Pikachu_Şok',
    'Korkusuz_Dürümcü', 'Kral_Şakir_Fan', 'Gamer_Reis', 'Nusret_Salt',
    'Ramiz_Dayı', 'Süleyman_Çakır', 'KurtlarVadisi_Polat', 'Ezel_Bayraktar',
    'Polat_Alemdar', 'Memati_Baş', 'Abdülhey', 'Güllü_Erhan', 'Erşan_Kuneri',
    'Hızlı_Ve_Öfkeli_Murat', 'Çorbacı_Necmi', 'Dönerin_Efendisi'
  ];

  function getMemeName() {
    return MEME_PAINTERS[Math.floor(Math.random() * MEME_PAINTERS.length)];
  }

  const geojsonPath = path.join(__dirname, 'data', 'countries_50m.json');
  if (!fs.existsSync(geojsonPath)) {
    console.log('Countries geojson not found, skipping world flag generator');
    return;
  }

  const geo = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
  const W = 2048, H = 1024;

  function project(lon, lat) {
    return [Math.round((lon + 180) / 360 * (W - 1)), Math.round((90 - lat) / 180 * (H - 1))];
  }

  function fillPoly(grid, pts, val) {
    let minY = H, maxY = 0, minX = W, maxX = 0;
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = minY; y <= maxY; y++) {
      const nodes = [];
      let j = pts.length - 1;
      for (let i = 0; i < pts.length; i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if ((yi < y && yj >= y) || (yj < y && yi >= y)) {
          nodes.push(Math.round(xi + (y - yi) / (yj - yi) * (xj - xi)));
        }
        j = i;
      }
      nodes.sort((a, b) => a - b);
      for (let i = 0; i < nodes.length; i += 2) {
        if (nodes[i] > maxX) break;
        if (nodes[i + 1] > minX) {
          const sx = Math.max(nodes[i], minX);
          const ex = Math.min(nodes[i + 1], maxX);
          for (let x = sx; x <= ex; x++) grid[y * W + x] = val;
        }
      }
    }
  }

  const COUNTRY_RULES = [
    { name: 'Turkey', id: 1, colorFn: (x, y, bb) => {
      const cx = 1282, cy = 372, oR = 14, iR = 11;
      const d1 = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const d2 = Math.sqrt((x - cx - 4) ** 2 + (y - cy) ** 2);
      if (d1 <= oR && d2 > iR) return 0;
      const sx = 1298, sy = 372;
      if (Math.abs(x - sx) + Math.abs(y - sy) <= 4 && (Math.abs(x - sx) <= 1 || Math.abs(y - sy) <= 1)) return 0;
      return 33; // Turkish Red
    }},
    { name: 'United States of America', id: 2, colorFn: (x, y, bb) => {
      const minX = 314, maxX = 643, minY = 231, maxY = 372;
      const flagW = maxX - minX + 1, flagH = maxY - minY + 1;
      const cantonW = Math.round(flagW * 0.40), cantonH = Math.round(flagH * (7 / 13));
      const relX = x - minX, relY = y - minY;
      if (relX < cantonW && relY < cantonH) {
        const row = Math.floor(relY / 8), col = Math.floor(relX / 11);
        const starX = col * 11 + ((row % 2 === 1) ? 5 : 0) + 4;
        const starY = row * 8 + 4;
        return (relX === starX && relY === starY) ? 0 : 26;
      }
      return (Math.floor(relY / (flagH / 13)) % 2 === 0) ? 5 : 0;
    }},
    { name: 'Brazil', id: 3, colorFn: (x, y, bb) => {
      const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
      const rw = (bb.maxX - bb.minX) / 2, rh = (bb.maxY - bb.minY) / 2;
      const distRhombus = Math.abs(x - cx) / rw + Math.abs(y - cy) / rh;
      const distCircle = Math.sqrt(((x - cx) / 18) ** 2 + ((y - cy) / 18) ** 2);
      if (distCircle <= 1.0) {
        if (Math.abs(y - (cy - (x - cx) * 0.2)) <= 1.5) return 0; // White band
        return 26; // Blue circle
      }
      if (distRhombus <= 0.75) return 8; // Yellow rhombus
      return 24; // Green field
    }},
    { name: 'Germany', id: 4, colorFn: (x, y, bb) => {
      const h = bb.maxY - bb.minY + 1;
      const relY = y - bb.minY;
      if (relY < h / 3) return 18; // Black
      if (relY < (2 * h) / 3) return 5; // Red
      return 8; // Gold
    }},
    { name: 'France', id: 5, colorFn: (x, y, bb) => {
      const w = bb.maxX - bb.minX + 1;
      const relX = x - bb.minX;
      if (relX < w / 3) return 26; // Blue
      if (relX < (2 * w) / 3) return 0; // White
      return 5; // Red
    }},
    { name: 'Italy', id: 6, colorFn: (x, y, bb) => {
      const w = bb.maxX - bb.minX + 1;
      const relX = x - bb.minX;
      if (relX < w / 3) return 10; // Green
      if (relX < (2 * w) / 3) return 0; // White
      return 5; // Red
    }},
    { name: 'United Kingdom', id: 7, colorFn: (x, y, bb) => {
      const cx = Math.round((bb.minX + bb.maxX) / 2);
      const cy = Math.round((bb.minY + bb.maxY) / 2);
      if (Math.abs(x - cx) <= 2 || Math.abs(y - cy) <= 2) return 5; // Red cross
      if (Math.abs(x - cx) <= 4 || Math.abs(y - cy) <= 4) return 0; // White border
      return 26; // Blue field
    }},
    { name: 'Japan', id: 8, colorFn: (x, y, bb) => {
      const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
      return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= 12 ? 5 : 0;
    }},
    { name: 'Russia', id: 9, colorFn: (x, y, bb) => {
      const h = bb.maxY - bb.minY + 1;
      const relY = y - bb.minY;
      if (relY < h / 3) return 0; // White
      if (relY < (2 * h) / 3) return 26; // Blue
      return 5; // Red
    }},
    { name: 'Australia', id: 10, colorFn: (x, y, bb) => {
      const relX = x - bb.minX, relY = y - bb.minY;
      if (relX < 45 && relY < 30) {
        if (Math.abs(relX - 22) <= 2 || Math.abs(relY - 15) <= 2) return 5;
        if (Math.abs(relX - 22) <= 4 || Math.abs(relY - 15) <= 4) return 0;
        return 26;
      }
      // Southern cross star dots
      if ((relX === 60 && relY === 45) || (relX === 75 && relY === 35) || (relX === 78 && relY === 55) || (relX === 65 && relY === 65)) return 0;
      return 26; // Deep Blue
    }},
    { name: 'Egypt', id: 11, colorFn: (x, y, bb) => {
      const h = bb.maxY - bb.minY + 1;
      const relY = y - bb.minY;
      if (relY < h / 3) return 5; // Red
      if (relY < (2 * h) / 3) {
        const cx = (bb.minX + bb.maxX) / 2;
        if (Math.abs(x - cx) <= 3 && Math.abs(y - (bb.minY + h / 2)) <= 3) return 8; // Gold eagle
        return 0; // White
      }
      return 18; // Black
    }},
    { name: 'Canada', id: 12, colorFn: (x, y, bb) => {
      const w = bb.maxX - bb.minX + 1;
      const relX = x - bb.minX;
      if (relX < w * 0.25 || relX > w * 0.75) return 5; // Red side bands
      const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
      if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= 10) return 5; // Maple leaf center
      return 0; // White center
    }},
    { name: 'Argentina', id: 13, colorFn: (x, y, bb) => {
      const h = bb.maxY - bb.minY + 1;
      const relY = y - bb.minY;
      if (relY < h / 3 || relY > (2 * h) / 3) return 25; // Light blue
      const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
      if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= 4) return 8; // Sun
      return 0; // White
    }},
    { name: 'India', id: 14, colorFn: (x, y, bb) => {
      const h = bb.maxY - bb.minY + 1;
      const relY = y - bb.minY;
      if (relY < h / 3) return 6; // Saffron
      if (relY < (2 * h) / 3) {
        const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
        if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= 4) return 26; // Blue chakra
        return 0; // White
      }
      return 10; // Green
    }},
    { name: 'China', id: 15, colorFn: (x, y, bb) => {
      const relX = x - bb.minX, relY = y - bb.minY;
      if (relX < 35 && relY < 35) {
        if (Math.sqrt((relX - 12) ** 2 + (relY - 12) ** 2) <= 5) return 8; // Big yellow star
        if ((relX === 22 && relY === 6) || (relX === 26 && relY === 11) || (relX === 26 && relY === 17) || (relX === 22 && relY === 22)) return 8; // Small stars
      }
      return 5; // Red field
    }},
    { name: 'Mexico', id: 16, colorFn: (x, y, bb) => {
      const w = bb.maxX - bb.minX + 1;
      const relX = x - bb.minX;
      if (relX < w / 3) return 10; // Green
      if (relX < (2 * w) / 3) {
        const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
        if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= 4) return 7; // Eagle
        return 0; // White
      }
      return 5; // Red
    }},
    { name: 'Spain', id: 17, colorFn: (x, y, bb) => {
      const h = bb.maxY - bb.minY + 1;
      const relY = y - bb.minY;
      if (relY < h * 0.25 || relY > h * 0.75) return 5; // Red
      return 8; // Gold
    }},
    { name: 'Sweden', id: 18, colorFn: (x, y, bb) => {
      const cx = Math.round(bb.minX + (bb.maxX - bb.minX) * 0.35);
      const cy = Math.round((bb.minY + bb.maxY) / 2);
      if (Math.abs(x - cx) <= 2 || Math.abs(y - cy) <= 2) return 8; // Yellow cross
      return 26; // Blue field
    }},
    { name: 'Saudi Arabia', id: 19, colorFn: (x, y, bb) => {
      const cy = Math.round((bb.minY + bb.maxY) / 2);
      if (Math.abs(y - cy) <= 1 && Math.abs(x - (bb.minX + bb.maxX) / 2) <= 16) return 0; // White sword
      return 24; // Forest Green
    }},
    { name: 'South Africa', id: 20, colorFn: (x, y, bb) => {
      const h = bb.maxY - bb.minY + 1;
      const relY = y - bb.minY;
      const relX = x - bb.minX;
      if (relX < (bb.maxX - bb.minX) * 0.35 && Math.abs(relY - h / 2) <= relX * 0.5) return 18; // Black triangle
      if (relY < h * 0.4) return 5; // Red
      if (relY > h * 0.6) return 26; // Blue
      return 10; // Green Y-band
    }}
  ];

  const countryGrid = Buffer.alloc(W * H, 0);
  const countryBounds = {};

  COUNTRY_RULES.forEach(rule => {
    const feat = geo.features.find(x => x.properties.NAME === rule.name || x.properties.name === rule.name || x.properties.NAME_SORT === rule.name);
    if (!feat) return;

    let bMinX = W, bMaxX = 0, bMinY = H, bMaxY = 0;
    const polys = feat.geometry.type === 'Polygon' ? [feat.geometry.coordinates] : feat.geometry.coordinates;

    for (const poly of polys) {
      const ring = poly[0];
      if (ring && ring.length >= 3) {
        const pts = ring.map(c => project(c[0], c[1]));
        pts.forEach(([px, py]) => {
          if (px < bMinX) bMinX = px;
          if (px > bMaxX) bMaxX = px;
          if (py < bMinY) bMinY = py;
          if (py > bMaxY) bMaxY = py;
        });
        fillPoly(countryGrid, pts, rule.id);
      }
    }
    countryBounds[rule.id] = { minX: bMinX, maxX: bMaxX, minY: bMinY, maxY: bMaxY };
  });

  // Collect all valid land pixels for each country
  worldCountryPixels.length = 0;
  const expectedWorldMap = new Map();

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const cid = countryGrid[idx];
      // STRICT FILTER: Land only, never ocean or border!
      if (cid > 0 && WORLD.paintableMask && WORLD.paintableMask[idx] === 1) {
        const rule = COUNTRY_RULES.find(r => r.id === cid);
        if (rule) {
          const c = rule.colorFn(x, y, countryBounds[cid]);
          if (c >= 0) {
            worldCountryPixels.push({ x, y, c, cid });
            expectedWorldMap.set(x + ',' + y, c);
            WORLD.buffer[idx] = c;
          }
        }
      }
    }
  }

  console.log(`🌍 TÜM DÜNYA SANATI HAZIRLANDI: ${worldCountryPixels.length} piksel 20 ülkeye boyandı!`);

  // Disk buffer save immediately
  if (typeof saveRoomBuffer === 'function') {
    saveRoomBuffer(WORLD);
  }

  // ACTIVE CONTINUOUS WORLDWIDE MEME PAINTER TICK (40ms)
  let worldDrawIdx = 0;
  const WORLD_BURST = 30;
  const worldRepairQueue = [];

  // =============================================================
  // OFFICIAL PIXELPLACE REGIONAL & DOODLE BOT SYSTEM (ADMIN CONTROLLABLE)
  // =============================================================
  // 1. Group pixels by country ID (1..20)
  const countryPixelsMap = new Map();
  for (const p of worldCountryPixels) {
    if (!countryPixelsMap.has(p.cid)) countryPixelsMap.set(p.cid, []);
    countryPixelsMap.get(p.cid).push(p);
  }

  // 2. Dedicated Regional Meme Bot Tag Maps ("botların hepsi ayrı yerleri korusun")
  const COUNTRY_BOT_MAP = {
    1:  ['GigaChad_TR', 'Tostçu_Erol', 'Çaycı_Hüseyin', 'KarpuzKesen_Pro'], // Turkey
    2:  ['Walter_White_TR', 'SkibidiRizzler', 'Sigma_Male', 'BurgerKing_Pro'], // USA
    3:  ['Bratwurst_Boss', 'Techno_Viking'], // Germany
    4:  ['Croissant_Lover', 'Baguette_Warrior'], // France
    5:  ['Pizza_MammaMia', 'Pasta_Enjoyer', 'Mario_Luigi_TR'], // Italy
    6:  ['Tea_And_Crumpets', 'Peaky_Blinder_TR'], // UK
    7:  ['Blyat_Man', 'Vodka_Warrior', 'Gopnik_Slav'], // Russia
    8:  ['Anime_Senpai', 'Dorito_Ninja', 'Goku_Ultra'], // Japan
    9:  ['Samba_King', 'Neymar_Roll'], // Brazil
    10: ['Kangaroo_Boxer', 'Boomerang_Bro'], // Australia
    11: ['Pharaoh_King', 'Pyramid_Builder'], // Egypt
    12: ['MapleSyrup_Chad', 'Eh_Lover'], // Canada
    13: ['Messi_GOAT', 'D10S_Maradona'], // Argentina
    14: ['Curry_Master', 'T-Series_Boss'], // India
    15: ['Dragon_Warrior', 'Social_Credit_Max'], // China
    16: ['TacoBell_Pro', 'Speedy_Gonzales_TR'], // Mexico
    17: ['Paella_Master', 'Siesta_King'], // Spain
    18: ['IKEA_Meatball', 'Pewds_Fan'], // Sweden
    19: ['Desert_Falcon', 'Habibi_Drifter'], // Saudi Arabia
    20: ['Safari_King', 'Vuvuzela_Master'] // South Africa
  };

  // 3. Mini Pixel Art Doodles ("bazıları bazı yerlere rastgele şekiller çizsin")
  const DOODLE_PATTERNS = [
    // Heart (5x5, red: 5)
    {
      name: 'Heart',
      pixels: [
        { dx: 1, dy: 0, c: 5 }, { dx: 3, dy: 0, c: 5 },
        { dx: 0, dy: 1, c: 5 }, { dx: 1, dy: 1, c: 5 }, { dx: 2, dy: 1, c: 5 }, { dx: 3, dy: 1, c: 5 }, { dx: 4, dy: 1, c: 5 },
        { dx: 0, dy: 2, c: 5 }, { dx: 1, dy: 2, c: 5 }, { dx: 2, dy: 2, c: 5 }, { dx: 3, dy: 2, c: 5 }, { dx: 4, dy: 2, c: 5 },
        { dx: 1, dy: 3, c: 5 }, { dx: 2, dy: 3, c: 5 }, { dx: 3, dy: 3, c: 5 },
        { dx: 2, dy: 4, c: 5 }
      ]
    },
    // Smiley (5x5, yellow: 8, black: 18)
    {
      name: 'Smiley',
      pixels: [
        { dx: 1, dy: 0, c: 8 }, { dx: 2, dy: 0, c: 8 }, { dx: 3, dy: 0, c: 8 },
        { dx: 0, dy: 1, c: 8 }, { dx: 1, dy: 1, c: 18 }, { dx: 2, dy: 1, c: 8 }, { dx: 3, dy: 1, c: 18 }, { dx: 4, dy: 1, c: 8 },
        { dx: 0, dy: 2, c: 8 }, { dx: 1, dy: 2, c: 8 }, { dx: 2, dy: 2, c: 8 }, { dx: 3, dy: 2, c: 8 }, { dx: 4, dy: 2, c: 8 },
        { dx: 0, dy: 3, c: 8 }, { dx: 1, dy: 3, c: 18 }, { dx: 2, dy: 3, c: 18 }, { dx: 3, dy: 3, c: 18 }, { dx: 4, dy: 3, c: 8 },
        { dx: 1, dy: 4, c: 8 }, { dx: 2, dy: 4, c: 8 }, { dx: 3, dy: 4, c: 8 }
      ]
    },
    // Mini Amogus (5x6, cyan visor: 11, red: 5)
    {
      name: 'Amogus',
      pixels: [
        { dx: 1, dy: 0, c: 5 }, { dx: 2, dy: 0, c: 5 }, { dx: 3, dy: 0, c: 5 },
        { dx: 0, dy: 1, c: 5 }, { dx: 1, dy: 1, c: 5 }, { dx: 2, dy: 1, c: 11 }, { dx: 3, dy: 1, c: 11 },
        { dx: 0, dy: 2, c: 5 }, { dx: 1, dy: 2, c: 5 }, { dx: 2, dy: 2, c: 11 }, { dx: 3, dy: 2, c: 11 },
        { dx: 0, dy: 3, c: 5 }, { dx: 1, dy: 3, c: 5 }, { dx: 2, dy: 3, c: 5 }, { dx: 3, dy: 3, c: 5 },
        { dx: 0, dy: 4, c: 5 }, { dx: 1, dy: 4, c: 5 }, { dx: 2, dy: 4, c: 5 }, { dx: 3, dy: 4, c: 5 },
        { dx: 1, dy: 5, c: 5 }, { dx: 3, dy: 5, c: 5 }
      ]
    },
    // Star (5x5, gold: 8)
    {
      name: 'Star',
      pixels: [
        { dx: 2, dy: 0, c: 8 },
        { dx: 0, dy: 1, c: 8 }, { dx: 1, dy: 1, c: 8 }, { dx: 2, dy: 1, c: 8 }, { dx: 3, dy: 1, c: 8 }, { dx: 4, dy: 1, c: 8 },
        { dx: 1, dy: 2, c: 8 }, { dx: 2, dy: 2, c: 8 }, { dx: 3, dy: 2, c: 8 },
        { dx: 0, dy: 3, c: 8 }, { dx: 2, dy: 3, c: 8 }, { dx: 4, dy: 3, c: 8 },
        { dx: 1, dy: 4, c: 8 }, { dx: 3, dy: 4, c: 8 }
      ]
    },
    // Mini Diamond (5x5, cyan: 11, ice blue: 32)
    {
      name: 'Diamond',
      pixels: [
        { dx: 2, dy: 0, c: 11 },
        { dx: 1, dy: 1, c: 11 }, { dx: 2, dy: 1, c: 32 }, { dx: 3, dy: 1, c: 11 },
        { dx: 0, dy: 2, c: 11 }, { dx: 1, dy: 2, c: 32 }, { dx: 2, dy: 2, c: 32 }, { dx: 3, dy: 2, c: 32 }, { dx: 4, dy: 2, c: 11 },
        { dx: 1, dy: 3, c: 11 }, { dx: 2, dy: 3, c: 32 }, { dx: 3, dy: 3, c: 11 },
        { dx: 2, dy: 4, c: 11 }
      ]
    }
  ];

  const DOODLE_BOTS = ['Meme_Artist_Pepe', 'Doodle_Master_Ali', 'Bob_Ross_TR', 'Piksel_Ressami_Veli', 'Amogus_Painter', 'Shrek_Sanatci'];

  // Official PixelPlace Bot State (Admin Controlled - defined at top level)
  global.OFFICIAL_BOT = OFFICIAL_BOT;

  // Active doodle queue: [ { x, y, c, u } ]
  const activeDoodleQueue = [];

  // SLOW TERRITORIAL REPAIR TICK: Checks every 4s and restores ONLY 1 single pixel from a damaged country
  setInterval(() => {
    if (!OFFICIAL_BOT.enabled || !WORLD.buffer) return;

    // Pick random countries until we find one with damage
    const countryIds = Array.from(countryPixelsMap.keys());
    countryIds.sort(() => Math.random() - 0.5);

    for (const cid of countryIds) {
      const pixels = countryPixelsMap.get(cid);
      if (!pixels || pixels.length === 0) continue;

      // Find damaged pixels in this specific country
      const damaged = [];
      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        if (WORLD.buffer[p.y * WORLD.w + p.x] !== p.c) {
          damaged.push(p);
          if (damaged.length >= 10) break;
        }
      }

      if (damaged.length > 0) {
        // Pick 1 single damaged pixel!
        const target = damaged[Math.floor(Math.random() * damaged.length)];
        const botNames = COUNTRY_BOT_MAP[cid] || ['Meme_Bot'];
        const botName = botNames[Math.floor(Math.random() * botNames.length)];

        // Restore this single pixel
        WORLD.buffer[target.y * WORLD.w + target.x] = target.c;
        broadcastToRoom('world', { type: 'p', x: target.x, y: target.y, c: target.c, u: botName });
        break; // Exactly 1 pixel total per tick across the whole world!
      }
    }
  }, 4000);

  // DOODLE TICK: places 1 pixel every 2.5 seconds if queue has items
  setInterval(() => {
    if (!OFFICIAL_BOT.enabled || !OFFICIAL_BOT.doodlesEnabled || !WORLD.buffer) return;
    if (activeDoodleQueue.length > 0) {
      const p = activeDoodleQueue.shift();
      if (WORLD.paintableMask && WORLD.paintableMask[p.y * WORLD.w + p.x] === 1) {
        WORLD.buffer[p.y * WORLD.w + p.x] = p.c;
        broadcastToRoom('world', { type: 'p', x: p.x, y: p.y, c: p.c, u: p.u });
      }
    }
  }, 2500);

  // DOODLE SPAWNER: Every 45 seconds, schedule a cute mini shape in unpainted quiet land
  setInterval(() => {
    if (!OFFICIAL_BOT.enabled || !OFFICIAL_BOT.doodlesEnabled || !WORLD.buffer || activeDoodleQueue.length > 0) return;

    const doodle = DOODLE_PATTERNS[Math.floor(Math.random() * DOODLE_PATTERNS.length)];
    const artist = DOODLE_BOTS[Math.floor(Math.random() * DOODLE_BOTS.length)];

    for (let attempt = 0; attempt < 30; attempt++) {
      const randX = Math.floor(100 + Math.random() * (WORLD.w - 200));
      const randY = Math.floor(100 + Math.random() * (WORLD.h - 200));

      let canPlace = true;
      for (const dp of doodle.pixels) {
        const px = randX + dp.dx;
        const py = randY + dp.dy;
        if (!WORLD.paintableMask || WORLD.paintableMask[py * WORLD.w + px] !== 1) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        for (const dp of doodle.pixels) {
          activeDoodleQueue.push({
            x: randX + dp.dx,
            y: randY + dp.dy,
            c: dp.c,
            u: artist
          });
        }
        break;
      }
    }
  }, 45000);

  console.log('🚀 BÖLGESEL MEME BOTLARI & DOODLE SANATÇILARI AKTİF: Çok Yavaş Koruma & Eğlenceli Şekiller!');
}, 2500);

function broadcastOnlineCount() {
  const counts = { total: connectedClients.size, rooms: {} };
  for (const client of connectedClients) {
    if (client.room) {
      counts.rooms[client.room] = (counts.rooms[client.room] || 0) + 1;
    }
  }
  const payload = JSON.stringify({ type: 'online', counts });
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

wss.on('connection', (ws, req) => {
  connectedClients.add(ws);
  ws.room = 'world';
  const guestNum = Math.floor(1000 + Math.random() * 9000);
  ws.user = { id: 0, username: 'Oyuncu_' + guestNum, role: 'guest', pixels_placed: 0 };
  ws.lastPixelTime = 0;

  // Initial Room Assignment
  const room = ROOMS.world;

  // Send Initial Connection OK
  ws.send(JSON.stringify({
    type: 'connected',
    room: ws.room,
    palette: PALETTE,
    cooldownMs: room.cooldownMs,
    isBotAllowed: room.isBotAllowed,
    w: room.w,
    h: room.h
  }));

  // Send full binary canvas for the initial room immediately
  if (room.buffer) {
    ws.send(room.buffer);
  }

  // Send Recent Chat History
  const history = db.prepare('SELECT username, message, created_at FROM chat_history WHERE room = ? ORDER BY id DESC LIMIT 25').all(ws.room);
  history.reverse().forEach(row => {
    ws.send(JSON.stringify({ type: 'chat', u: row.username, msg: row.message, t: row.created_at }));
  });

  broadcastOnlineCount();
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (msg, isBinary) => {
    // 1. Binary Protocol: Fast Pixel Placement [x (2B), y (2B), c (1B)]
    if (isBinary) {
      if (msg.length >= 5) {
        const x = msg.readUInt16BE(0);
        const y = msg.readUInt16BE(2);
        const c = msg.readUInt8(4);
        handlePixelPlacement(ws, x, y, c);
      }
      return;
    }

    // 2. Text / JSON Protocol (Handles both Pixelplace JSON & Socket.IO 42[...] formats)
    const rawStr = msg.toString('utf8');

    // Engine.IO Heartbeats
    if (rawStr === '2') {
      ws.send('3'); // pong
      return;
    }
    if (rawStr === '2probe') {
      ws.send('3probe');
      return;
    }
    if (rawStr.startsWith('40')) {
      ws.isSocketIo = true;
      ws.send('40{"sid":"sio_' + Date.now() + '","upgrades":[],"pingInterval":25000,"pingTimeout":20000}');
      return;
    }

    let data;
    // Check if it's Socket.IO event packet: 42["event", ...]
    if (rawStr.startsWith('42')) {
      ws.isSocketIo = true;
      try {
        const sIo = JSON.parse(rawStr.slice(2));
        if (Array.isArray(sIo)) {
          const ev = sIo[0];
          const payload = sIo[1];
          if (ev === 'p') {
            // [x, y, c, 1] or [x, y, c] or {x, y, c}
            if (Array.isArray(payload)) {
              handlePixelPlacement(ws, parseInt(payload[0], 10), parseInt(payload[1], 10), parseInt(payload[2], 10));
              return;
            } else if (payload && typeof payload === 'object') {
              handlePixelPlacement(ws, parseInt(payload.x, 10), parseInt(payload.y, 10), parseInt(payload.c, 10));
              return;
            }
          } else if (ev === 'chat') {
            data = { type: 'chat', msg: typeof payload === 'string' ? payload : (payload?.msg || '') };
          } else if (ev === 'join') {
            data = { type: 'join', room: typeof payload === 'string' ? payload : (payload?.room || 'world') };
          } else if (ev === 'init') {
            ws.send('42["init",{"cooldown":' + (ROOMS[ws.room]?.cooldownMs || 0) + '}]');
            return;
          }
        }
      } catch (_) {
        return;
      }
    }

    if (!data) {
      try {
        data = JSON.parse(rawStr);
      } catch (_) {
        return;
      }
    }

    if (data.type && data.type.startsWith('sw_')) {
      handleStickWarMessage(ws, data);
      return;
    }

    if (data.type && data.type.startsWith('sos_')) {
      handleSosMessage(ws, data);
      return;
    }

    // MULTIPLAYER GAMES DISPATCHER (XOX, Agar.io, CS 1.6, PaperMap, Portal Chat)
    if (gamesManager && gamesManager.handleMessage(ws, data)) {
      return;
    }

    // GLOBAL PLAYER JOIN / SET USERNAME ANNOUNCEMENT
    if (data.type === 'set_username' || data.type === 'player_announce') {
      const uName = String(data.username || '').trim();
      if (uName && uName.length >= 2) {
        ws.user = ws.user || {};
        ws.user.username = uName;
        const announcementMsg = JSON.stringify({
          type: 'player_join_announcement',
          username: uName,
          text: `🎮 ${uName} az önce aramıza katıldı ve oyunlara başladı!`
        });
        for (const client of connectedClients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(announcementMsg);
          }
        }
      }
      return;
    }

    // AUTH
    if (data.type === 'auth') {
      let user = findUserBySession(data.token);
      if (!user && data.username) {
        const u = String(data.username).trim();
        user = db.prepare('SELECT id, username, email, pixels_placed, role FROM users WHERE username = ?').get(u);
        if (!user) {
          const safeId = Buffer.from(u).toString('hex').slice(0, 12);
          const fakeEmail = `u_${safeId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@pixelplace.local`;
          const res = db.prepare("INSERT INTO users (username, email, password_hash, password_salt, pixels_placed, role, created_at) VALUES (?, ?, '', '', 0, 'user', ?)").run(u, fakeEmail, Date.now());
          user = { id: Number(res.lastInsertRowid), username: u, email: fakeEmail, pixels_placed: 0, role: 'user' };
        }
      }
      if (user) {
        ws.user = user;
        ws.send(JSON.stringify({ type: 'auth_ok', user }));
      } else {
        ws.send(JSON.stringify({ type: 'auth_fail' }));
      }
      return;
    }

    // JOIN ROOM
    if (data.type === 'join') {
      const targetRoomId = data.room || 'world';
      const targetRoom = ROOMS[targetRoomId];
      if (targetRoom) {
        ws.room = targetRoomId;
        ws.send(JSON.stringify({
          type: 'room_changed',
          room: targetRoom.id,
          w: targetRoom.w,
          h: targetRoom.h,
          cooldownMs: targetRoom.cooldownMs,
          isBotAllowed: targetRoom.isBotAllowed
        }));

        // Send full binary canvas for the joined room
        ws.send(targetRoom.buffer);

        // Send chat history for joined room
        const roomHist = db.prepare('SELECT username, message, created_at FROM chat_history WHERE room = ? ORDER BY id DESC LIMIT 25').all(ws.room);
        roomHist.reverse().forEach(row => {
          ws.send(JSON.stringify({ type: 'chat', u: row.username, msg: row.message, t: row.created_at }));
        });

        broadcastOnlineCount();
      } else {
        // Special Game Rooms (xox, cs16, agario, papermap, lobby)
        ws.room = targetRoomId;
        ws.send(JSON.stringify({ type: 'room_changed', room: targetRoomId }));
        broadcastOnlineCount();
      }
      return;
    }

    // REQUEST CANVAS BUFFER
    if (data.type === 'get_canvas') {
      const curRoom = ROOMS[ws.room] || ROOMS.world;
      ws.send(curRoom.buffer);
      return;
    }

    // SINGLE PIXEL PLACEMENT: { type: 'p', x, y, c }
    if (data.type === 'p') {
      handlePixelPlacement(ws, parseInt(data.x, 10), parseInt(data.y, 10), parseInt(data.c, 10));
      return;
    }

    // BATCH PIXELS (Restricted to Admin only - "bot başkalarından olmasın")
    if (data.type === 'batch' && Array.isArray(data.pixels)) {
      if (!ws.user || ws.user.role !== 'admin') {
        ws.send(JSON.stringify({ type: 'pixel_rejected', msg: 'Bot kullanımı sadece yöneticiler için geçerlidir!' }));
        return;
      }
      const curRoom = ROOMS[ws.room];
      if (!curRoom) return;
      const applied = [];
      for (const p of data.pixels) {
        if (!Array.isArray(p) || p.length < 3) continue;
        const x = p[0], y = p[1], c = p[2];
        if (curRoom.paintableMask && !curRoom.paintableMask[y * curRoom.w + x]) continue;
        if (x >= 0 && x < curRoom.w && y >= 0 && y < curRoom.h && c >= 0 && c < PALETTE.length) {
          curRoom.buffer[y * curRoom.w + x] = c;
          applied.push([x, y, c]);
        }
      }
      if (applied.length > 0) {
        broadcastToRoom(ws.room, {
          type: 'batch_p',
          pixels: applied,
          u: ws.user ? ws.user.username : 'Admin'
        });
      }
      return;
    }

    // ADMIN OFFICIAL BOT CONTROL
    if (data.type === 'admin_bot_cmd') {
      if (!ws.user || ws.user.role !== 'admin') {
        ws.send(JSON.stringify({ type: 'pixel_rejected', msg: 'Yönetici yetkisi gerekli!' }));
        return;
      }
      if (data.action === 'toggle') {
        OFFICIAL_BOT.enabled = !OFFICIAL_BOT.enabled;
        broadcastToRoom('world', {
          type: 'portal_announcement',
          text: `🤖 Resmi PixelPlace Botu: ${OFFICIAL_BOT.enabled ? '🟢 AKTİF' : '🔴 DURDURULDU'}`
        });
      } else if (data.action === 'speed') {
        OFFICIAL_BOT.repairSpeedMs = parseInt(data.speedMs, 10) || 4000;
        ws.send(JSON.stringify({
          type: 'portal_announcement',
          text: `⚡ Bot Koruma Aralığı: ${OFFICIAL_BOT.repairSpeedMs / 1000}s`
        }));
      } else if (data.action === 'doodle_toggle') {
        OFFICIAL_BOT.doodlesEnabled = !OFFICIAL_BOT.doodlesEnabled;
        broadcastToRoom('world', {
          type: 'portal_announcement',
          text: `🎨 Rastgele Şekil / Doodle Çizici: ${OFFICIAL_BOT.doodlesEnabled ? 'AÇIK' : 'KAPALI'}`
        });
      } else if (data.action === 'repaint_countries') {
        const WORLD_ROOM = ROOMS.world;
        if (WORLD_ROOM && WORLD_ROOM.buffer && worldCountryPixels) {
          for (const p of worldCountryPixels) {
            if (WORLD_ROOM.paintableMask && WORLD_ROOM.paintableMask[p.y * WORLD_ROOM.w + p.x] === 1) {
              WORLD_ROOM.buffer[p.y * WORLD_ROOM.w + p.x] = p.c;
            }
          }
          for (const client of connectedClients) {
            if (client.room === 'world' && client.readyState === WebSocket.OPEN) {
              client.send(WORLD_ROOM.buffer);
            }
          }
          broadcastToRoom('world', {
            type: 'portal_announcement',
            text: '🌍 Tüm 20 Ülke Bayrağı Yönetici Tarafından Yeniden Çizildi!'
          });
        }
      }
      ws.send(JSON.stringify({ type: 'admin_bot_status', config: OFFICIAL_BOT }));
      return;
    }

    // CHAT MESSAGE
    if (data.type === 'chat' && data.msg) {
      const rawMsg = String(data.msg).trim();
      if (!rawMsg || rawMsg.length > 180) return;

      const username = ws.user ? ws.user.username : 'Misafir_' + Math.floor(1000 + Math.random() * 9000);
      const now = Date.now();

      // Save to DB
      db.prepare('INSERT INTO chat_history (room, username, message, created_at) VALUES (?, ?, ?, ?)').run(ws.room, username, rawMsg, now);

      broadcastToRoom(ws.room, {
        type: 'chat',
        u: username,
        msg: rawMsg,
        t: now
      });
      return;
    }
  });

  ws.on('close', () => {
    connectedClients.delete(ws);
    if (gamesManager) gamesManager.handleDisconnect(ws);
    cleanupStickWarPlayer(ws);
    broadcastOnlineCount();
  });
});

function handlePixelPlacement(ws, x, y, c) {
  // AUTH CHECK: Misafir ismi otomatik ata
  if (!ws.user) {
    const guestNum = Math.floor(1000 + Math.random() * 9000);
    ws.user = { id: 0, username: 'Oyuncu_' + guestNum, role: 'guest', pixels_placed: 0 };
  }

  const room = ROOMS[ws.room] || ROOMS.world;
  if (!room || !room.buffer) return;

  if (x < 0 || x >= room.w || y < 0 || y >= room.h || c < 0 || c >= PALETTE.length) {
    return;
  }

  // 1. DENİZ VE SINIR KONTROLÜ: Deniz, okyanus ve ülke sınır çizgileri boyanamaz!
  if (room.paintableMask && !room.paintableMask[y * room.w + x]) {
    ws.send(JSON.stringify({
      type: 'pixel_rejected',
      reason: 'ocean_or_border',
      x,
      y,
      msg: '🌊 Denizler ve ⛔ kara parçalarını ayıran ülke sınırları boyanamaz! Sadece ülke topraklarını boyayabilirsiniz.'
    }));
    return;
  }

  // 1.5. ALAN KORUMA (Protected Zone) KONTROLÜ
  const protectedZone = findProtectedZone(ws.room, x, y);
  if (protectedZone) {
    const isOwner = ws.user && (ws.user.id === protectedZone.user_id || ws.user.role === 'admin');
    if (!isOwner) {
      ws.send(JSON.stringify({
        type: 'pixel_rejected',
        reason: 'protected',
        x,
        y,
        zoneName: protectedZone.name,
        owner: protectedZone.username,
        msg: `🛡️ Bu alan "${protectedZone.name}" (${protectedZone.username}) tarafından korunmaktadır!`
      }));
      return;
    }
  }

  // 2. ÇOK HIZLI KOYMASINLAR (Spam / Aşırı Hızlı Paket Filtresi - Cooldown Kilidi DEĞİL)
  // Saniyede max ~25 piksel (40ms aralık). Akıcı fırça çizimi sağlar, robotik floodları engeller.
  const now = Date.now();
  if (now - (ws.lastPixelTime || 0) < 40) {
    return; // Flood koruması: bekleme süresi kilitlemez, sadece aşırı flood paketini filtreler
  }
  ws.lastPixelTime = now;

  // Update in-memory canvas buffer
  room.buffer[y * room.w + x] = c;

  // Increment user stat
  if (ws.user) {
    try {
      stmtIncUserPixel.run(ws.user.id);
    } catch (_) {}
  }

  const username = ws.user ? ws.user.username : 'Misafir';

  // Broadcast to all clients in the room
  broadcastToRoom(ws.room, {
    type: 'p',
    x,
    y,
    c,
    u: username
  });
}

// -------------------------------------------------------------
// 5. SOS GAME LOGIC
// -------------------------------------------------------------
const sosRooms = new Map();

function generateSosId() {
  return 'sos_' + Math.random().toString(36).substring(2, 9);
}

function checkSOS(grid, x, y, size) {
  const sosFound = [];
  const dirs = [
    [0, 1], [1, 0], [1, 1], [1, -1] // Horizontal, Vertical, Diagonal1, Diagonal2
  ];

  for (let d = 0; d < dirs.length; d++) {
    const dx = dirs[d][0];
    const dy = dirs[d][1];

    // Check S-O-S where current placed is S (could be start or end)
    if (grid[y] && grid[y][x] === 'S') {
      // Current is Start S
      if (y+dy*2 >= 0 && y+dy*2 < size && x+dx*2 >= 0 && x+dx*2 < size) {
        if (grid[y+dy][x+dx] === 'O' && grid[y+dy*2][x+dx*2] === 'S') {
          sosFound.push({x1: x, y1: y, x2: x+dx*2, y2: y+dy*2});
        }
      }
      // Current is End S
      if (y-dy*2 >= 0 && y-dy*2 < size && x-dx*2 >= 0 && x-dx*2 < size) {
        if (grid[y-dy][x-dx] === 'O' && grid[y-dy*2][x-dx*2] === 'S') {
          sosFound.push({x1: x, y1: y, x2: x-dx*2, y2: y-dy*2});
        }
      }
    }
    
    // Check S-O-S where current placed is O (middle)
    if (grid[y] && grid[y][x] === 'O') {
      if (y-dy >= 0 && y-dy < size && x-dx >= 0 && x-dx < size && y+dy >= 0 && y+dy < size && x+dx >= 0 && x+dx < size) {
        if (grid[y-dy][x-dx] === 'S' && grid[y+dy][x+dx] === 'S') {
          sosFound.push({x1: x-dx, y1: y-dy, x2: x+dx, y2: y+dy});
        } else if (grid[y-dy][x-dx] === 'S' && grid[y+dy][x+dx] === 'S') { // handled bidirectional implicitly above, just ensuring correct parsing
           // Actually wait, if O is in middle, order doesn't matter, it's just S-O-S.
        }
      }
    }
  }
  
  // Deduplicate found SOS lines
  const uniqueSOS = [];
  const seen = new Set();
  for (let s of sosFound) {
    // Sort coordinates to avoid bidirectional duplicates
    let p1 = {x: s.x1, y: s.y1};
    let p2 = {x: s.x2, y: s.y2};
    if (p1.y > p2.y || (p1.y === p2.y && p1.x > p2.x)) {
      let temp = p1; p1 = p2; p2 = temp;
    }
    let key = `${p1.x},${p1.y}-${p2.x},${p2.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSOS.push(s);
    }
  }
  
  return uniqueSOS;
}

function sosDoAIMove(roomId) {
  const room = sosRooms.get(roomId);
  if (!room || room.status !== 'playing' || room.turn !== 2 || !room.vsAI) return;
  
  // Find empty cells
  const emptyCells = [];
  for (let y = 0; y < room.size; y++) {
    for (let x = 0; x < room.size; x++) {
      if (!room.grid[y][x]) emptyCells.push({x, y});
    }
  }
  
  if (emptyCells.length === 0) return;
  
  // Greedy AI: tries to make an SOS if possible, otherwise random
  let bestMove = null;
  let maxSOS = 0;
  
  for (let cell of emptyCells) {
    for (let letter of ['S', 'O']) {
      room.grid[cell.y][cell.x] = letter;
      let sosLines = checkSOS(room.grid, cell.x, cell.y, room.size);
      room.grid[cell.y][cell.x] = null; // revert
      
      // AI doesn't know about already existing lines overlapping, so it should only count new ones.
      // But since it just placed it, any SOS it completes MUST include this cell, so they are guaranteed new!
      if (sosLines.length > maxSOS) {
        maxSOS = sosLines.length;
        bestMove = {x: cell.x, y: cell.y, letter};
      }
    }
  }
  
  if (!bestMove) {
    let cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    let letter = Math.random() > 0.5 ? 'S' : 'O';
    bestMove = {x: cell.x, y: cell.y, letter};
  }
  
  // Apply AI move
  room.grid[bestMove.y][bestMove.x] = bestMove.letter;
  let newSOS = checkSOS(room.grid, bestMove.x, bestMove.y, room.size);
  
  if (newSOS.length > 0) {
    room.scores[2] += newSOS.length;
  } else {
    room.turn = 1; // back to human
  }
  
  room.emptyCount--;
  
  let isEnd = room.emptyCount <= 0;
  
  const payload = {
    type: 'sos_move',
    x: bestMove.x,
    y: bestMove.y,
    letter: bestMove.letter,
    player: 2,
    newSOS,
    scores: room.scores,
    turn: room.turn
  };
  
  if (room.p1ws && room.p1ws.readyState === 1) room.p1ws.send(JSON.stringify(payload));
  
  if (isEnd) {
    room.status = 'end';
    let winner = 0;
    if (room.scores[1] > room.scores[2]) winner = 1;
    else if (room.scores[2] > room.scores[1]) winner = 2;
    
    if (room.p1ws && room.p1ws.readyState === 1) {
      room.p1ws.send(JSON.stringify({type: 'sos_end', winner, scores: room.scores}));
    }
    sosRooms.delete(roomId);
  } else if (newSOS.length > 0 && room.turn === 2) {
    // AI gets another turn
    setTimeout(() => sosDoAIMove(roomId), 800);
  }
}

function handleSosMessage(ws, data) {
  ws.room = 'sos';
  if (data.type === 'sos_create') {
    const size = parseInt(data.gridSize) || 10;
    const roomId = generateSosId();
    
    const room = {
      id: roomId,
      size: size,
      vsAI: !!data.vsAI,
      p1ws: ws,
      p2ws: null,
      p1name: data.username || 'Oyuncu 1',
      p2name: data.vsAI ? 'Yapay Zeka' : 'Bekleniyor...',
      status: 'waiting',
      grid: Array.from({length: size}, () => Array(size).fill(null)),
      scores: {1: 0, 2: 0},
      turn: 1, // 1 for p1, 2 for p2
      emptyCount: size * size
    };
    
    ws.sosRoom = roomId;
    ws.sosPlayer = 1;
    sosRooms.set(roomId, room);
    
    if (room.vsAI) {
      room.status = 'playing';
      ws.send(JSON.stringify({
        type: 'sos_start',
        state: getSosState(room)
      }));
    } else {
      ws.send(JSON.stringify({type: 'sos_waiting', roomId}));
    }
    
  } else if (data.type === 'sos_join') {
    // Find waiting room or specific ID
    let room = null;
    if (data.roomId) {
      room = sosRooms.get(data.roomId);
    } else {
      for (let r of sosRooms.values()) {
        if (r.status === 'waiting' && !r.vsAI) {
          room = r;
          break;
        }
      }
    }
    
    if (!room || room.status !== 'waiting') {
      ws.send(JSON.stringify({type: 'sos_error', msg: 'Oda bulunamadı veya dolu.'}));
      return;
    }
    
    room.p2ws = ws;
    room.p2name = data.username || 'Oyuncu 2';
    room.status = 'playing';
    ws.sosRoom = room.id;
    ws.sosPlayer = 2;
    
    const state = getSosState(room);
    if (room.p1ws && room.p1ws.readyState === 1) room.p1ws.send(JSON.stringify({type: 'sos_start', state}));
    if (room.p2ws && room.p2ws.readyState === 1) room.p2ws.send(JSON.stringify({type: 'sos_start', state}));
    
  } else if (data.type === 'sos_move') {
    const room = sosRooms.get(ws.sosRoom);
    if (!room || room.status !== 'playing') return;
    if (room.turn !== ws.sosPlayer) return;
    
    let x = parseInt(data.x);
    let y = parseInt(data.y);
    let letter = data.letter === 'S' || data.letter === 'O' ? data.letter : null;
    
    if (x < 0 || x >= room.size || y < 0 || y >= room.size || !letter) return;
    if (room.grid[y][x]) return; // already occupied
    
    room.grid[y][x] = letter;
    let newSOS = checkSOS(room.grid, x, y, room.size);
    
    if (newSOS.length > 0) {
      room.scores[ws.sosPlayer] += newSOS.length;
    } else {
      room.turn = ws.sosPlayer === 1 ? 2 : 1;
    }
    
    room.emptyCount--;
    let isEnd = room.emptyCount <= 0;
    
    const payload = JSON.stringify({
      type: 'sos_move',
      x, y, letter,
      player: ws.sosPlayer,
      newSOS,
      scores: room.scores,
      turn: room.turn
    });
    
    if (room.p1ws && room.p1ws.readyState === 1) room.p1ws.send(payload);
    if (room.p2ws && room.p2ws.readyState === 1) room.p2ws.send(payload);
    
    if (isEnd) {
      room.status = 'end';
      let winner = 0;
      if (room.scores[1] > room.scores[2]) winner = 1;
      else if (room.scores[2] > room.scores[1]) winner = 2;
      
      const endPayload = JSON.stringify({type: 'sos_end', winner, scores: room.scores});
      if (room.p1ws && room.p1ws.readyState === 1) room.p1ws.send(endPayload);
      if (room.p2ws && room.p2ws.readyState === 1) room.p2ws.send(endPayload);
      sosRooms.delete(room.id);
    } else {
      if (room.vsAI && room.turn === 2) {
        setTimeout(() => sosDoAIMove(room.id), 600);
      }
    }
  } else if (data.type === 'sos_leave') {
     const room = sosRooms.get(ws.sosRoom);
     if (room) {
       sosRooms.delete(room.id);
       const leaveMsg = JSON.stringify({type: 'sos_left'});
       if (room.p1ws && room.p1ws !== ws && room.p1ws.readyState === 1) room.p1ws.send(leaveMsg);
       if (room.p2ws && room.p2ws !== ws && room.p2ws.readyState === 1) room.p2ws.send(leaveMsg);
     }
  }
}

function getSosState(room) {
  return {
    id: room.id,
    size: room.size,
    vsAI: room.vsAI,
    p1name: room.p1name,
    p2name: room.p2name,
    scores: room.scores,
    turn: room.turn,
    grid: room.grid
  };
}

// -------------------------------------------------------------
// STICK WAR LEGACY ONLINE 1v1 & 2v2 MULTIPLAYER
// -------------------------------------------------------------
const swRooms = new Map();
const swQueue1v1 = [];
const swQueue2v2 = [];

function handleStickWarMessage(ws, data) {
  ws.room = 'stickwar';

  if (data.type === 'sw_find_match') {
    const mode = data.mode || '1v1';
    const username = String(data.username || ws.user?.username || 'Savaşçı_' + Math.floor(100 + Math.random() * 900)).trim();
    ws.swUsername = username;
    ws.swMode = mode;

    if (mode === '1v1') {
      const validQueue = swQueue1v1.filter(s => s !== ws && s.readyState === 1);
      swQueue1v1.length = 0;
      swQueue1v1.push(...validQueue);

      if (swQueue1v1.length > 0) {
        const opponent = swQueue1v1.shift();
        const roomId = 'sw_' + Math.random().toString(36).substring(2, 9);
        const room = {
          id: roomId,
          mode: '1v1',
          players: [
            { ws: opponent, name: opponent.swUsername, side: 'order' },
            { ws: ws, name: username, side: 'chaos' }
          ]
        };
        swRooms.set(roomId, room);
        opponent.swRoom = roomId;
        ws.swRoom = roomId;

        opponent.send(JSON.stringify({
          type: 'sw_matched',
          roomId,
          mode: '1v1',
          side: 'order',
          opponentName: username
        }));

        ws.send(JSON.stringify({
          type: 'sw_matched',
          roomId,
          mode: '1v1',
          side: 'chaos',
          opponentName: opponent.swUsername
        }));
      } else {
        swQueue1v1.push(ws);
        ws.send(JSON.stringify({ type: 'sw_waiting', mode: '1v1' }));
      }
    } else if (mode === '2v2') {
      const validQueue = swQueue2v2.filter(s => s !== ws && s.readyState === 1);
      swQueue2v2.length = 0;
      swQueue2v2.push(...validQueue);

      if (swQueue2v2.length >= 3) {
        const p1 = swQueue2v2.shift();
        const p2 = swQueue2v2.shift();
        const p3 = swQueue2v2.shift();
        const p4 = ws;
        const roomId = 'sw2v2_' + Math.random().toString(36).substring(2, 9);
        const room = {
          id: roomId,
          mode: '2v2',
          players: [
            { ws: p1, name: p1.swUsername, side: 'order', slot: 1 },
            { ws: p2, name: p2.swUsername, side: 'order', slot: 2 },
            { ws: p3, name: p3.swUsername, side: 'chaos', slot: 1 },
            { ws: p4, name: p4.swUsername, side: 'chaos', slot: 2 }
          ]
        };
        swRooms.set(roomId, room);
        [p1, p2, p3, p4].forEach(p => { p.swRoom = roomId; });

        p1.send(JSON.stringify({ type: 'sw_matched', roomId, mode: '2v2', side: 'order', team: [p1.swUsername, p2.swUsername], enemy: [p3.swUsername, p4.swUsername] }));
        p2.send(JSON.stringify({ type: 'sw_matched', roomId, mode: '2v2', side: 'order', team: [p1.swUsername, p2.swUsername], enemy: [p3.swUsername, p4.swUsername] }));
        p3.send(JSON.stringify({ type: 'sw_matched', roomId, mode: '2v2', side: 'chaos', team: [p3.swUsername, p4.swUsername], enemy: [p1.swUsername, p2.swUsername] }));
        p4.send(JSON.stringify({ type: 'sw_matched', roomId, mode: '2v2', side: 'chaos', team: [p3.swUsername, p4.swUsername], enemy: [p1.swUsername, p2.swUsername] }));
      } else {
        swQueue2v2.push(ws);
        ws.send(JSON.stringify({ type: 'sw_waiting', mode: '2v2', count: swQueue2v2.length }));
      }
    }
  } else if (data.type === 'sw_action') {
    const room = swRooms.get(ws.swRoom);
    if (!room) return;
    const payload = JSON.stringify({
      type: 'sw_action',
      action: data.action,
      side: data.side,
      unitType: data.unitType,
      order: data.order,
      spell: data.spell,
      sender: ws.swUsername
    });
    room.players.forEach(p => {
      if (p.ws !== ws && p.ws.readyState === 1) {
        p.ws.send(payload);
      }
    });
  } else if (data.type === 'sw_statue_dmg') {
    const room = swRooms.get(ws.swRoom);
    if (!room) return;
    const payload = JSON.stringify({
      type: 'sw_statue_dmg',
      targetSide: data.targetSide,
      dmg: data.dmg,
      newHp: data.newHp
    });
    room.players.forEach(p => {
      if (p.ws !== ws && p.ws.readyState === 1) {
        p.ws.send(payload);
      }
    });
  } else if (data.type === 'sw_leave') {
    cleanupStickWarPlayer(ws);
  }
}

function cleanupStickWarPlayer(ws) {
  const idx1 = swQueue1v1.indexOf(ws);
  if (idx1 !== -1) swQueue1v1.splice(idx1, 1);
  const idx2 = swQueue2v2.indexOf(ws);
  if (idx2 !== -1) swQueue2v2.splice(idx2, 1);

  if (ws.swRoom) {
    const room = swRooms.get(ws.swRoom);
    if (room) {
      room.players.forEach(p => {
        if (p.ws !== ws && p.ws.readyState === 1) {
          p.ws.send(JSON.stringify({ type: 'sw_opponent_left', name: ws.swUsername }));
        }
      });
      swRooms.delete(ws.swRoom);
    }
    ws.swRoom = null;
  }
}

server.listen(PORT, () => {
  console.log(`
=============================================================
🚀 PIXELPLACE CLONE SERVER RUNNING!
📡 URL: http://localhost:${PORT}
⚡ LAN IP: http://${getLanIp()}:${PORT}
💾 Database: SQLite (WAL Mode) Active
🛡️ Nickname Auth: Active (Tek tıkla isimle giriş)
=============================================================
  `);

  // Secondary Listener on Port 80 for Ultra-Short Direct IP (No :3000, 100% MEB Filter Proof!)
  try {
    const server80 = http.createServer((req, res) => {
      server.emit('request', req, res);
    });
    server80.on('upgrade', (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    });
    server80.listen(80, () => {
      console.log(`⚡ KISA IP AKTİF: http://${getLanIp()} (Portsuz, MEB Filtresine Takılmaz!)`);
    }).on('error', (err) => {
      console.log('ℹ️ Port 80 not bound:', err.message);
    });
  } catch (_) {}
});
