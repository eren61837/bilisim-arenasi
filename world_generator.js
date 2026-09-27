// world_generator.js
// 100% Real Geographical World Map Generator using Natural Earth 50m GeoJSON
// Features 241 real countries, borders, lakes, Turkey flag & In-World 0ms Bot Arena!

const fs = require('fs');
const path = require('path');

// Pixelplace Classic 34 Palette
const PALETTE = [
  "#FFFFFF", // 0: White
  "#C4C4C4", // 1: Light Gray
  "#888888", // 2: Gray
  "#222222", // 3: Dark Gray / Borders
  "#FFA7D1", // 4: Pink
  "#E50000", // 5: Red
  "#E59500", // 6: Orange
  "#A06A42", // 7: Brown
  "#E5D900", // 8: Yellow (Desert)
  "#94E044", // 9: Light Green
  "#02BE01", // 10: Green (Land)
  "#00D3DD", // 11: Cyan
  "#0083C7", // 12: Sky Blue (Ocean)
  "#0000EA", // 13: Deep Blue (Grid)
  "#CF6EE4", // 14: Lavender
  "#820080", // 15: Dark Purple
  "#FFDFCC", // 16: Peach / Skin
  "#555555", // 17: Medium Gray
  "#000000", // 18: Black
  "#EC08EC", // 19: Magenta
  "#6B0000", // 20: Dark Red
  "#FF3904", // 21: Orange Red
  "#633C1F", // 22: Dark Brown
  "#51E119", // 23: Lime Green
  "#006600", // 24: Forest Green
  "#36BAFF", // 25: Light Blue
  "#044BFF", // 26: Royal Blue
  "#FBFF5B", // 27: Hazard Yellow
  "#98FB98", // 28: Pale Green
  "#FF755F", // 29: Coral
  "#5100FF", // 30: Indigo
  "#003638", // 31: Dark Teal
  "#B5E8EE", // 32: Ice Blue
  "#E30A17"  // 33: Turkish Flag Red
];

// Color definitions
const C_OCEAN = 12;
const C_DEEP_OCEAN = 13;
const C_LAND = 10;
const C_FOREST = 24;
const C_DESERT = 8;
const C_ICE = 0;
const C_BORDER = 3;
const C_TURKEY = 33;
const C_WHITE = 0;
const C_BOT_BG = 3;
const C_BOT_GRID = 17;
const C_HAZARD_YELLOW = 27;
const C_HAZARD_BLACK = 18;

// WORLD BOT ZONE REMOVED (Ocean is completely clean)
const WORLD_BOT_ZONE = {
  minX: -1,
  maxX: -1,
  minY: -1,
  maxY: -1
};

// 5x7 Bitmap Font for Pixel Texts
const FONT_5X7 = {
  'A': [0x1C, 0x22, 0x22, 0x3E, 0x22, 0x22, 0x22],
  'B': [0x3C, 0x22, 0x22, 0x3C, 0x22, 0x22, 0x3C],
  'C': [0x1E, 0x20, 0x20, 0x20, 0x20, 0x20, 0x1E],
  'D': [0x38, 0x24, 0x22, 0x22, 0x22, 0x24, 0x38],
  'E': [0x3E, 0x20, 0x20, 0x3C, 0x20, 0x20, 0x3E],
  'F': [0x3E, 0x20, 0x20, 0x3C, 0x20, 0x20, 0x20],
  'G': [0x1E, 0x20, 0x20, 0x2E, 0x22, 0x22, 0x1E],
  'H': [0x22, 0x22, 0x22, 0x3E, 0x22, 0x22, 0x22],
  'I': [0x1C, 0x08, 0x08, 0x08, 0x08, 0x08, 0x1C],
  'J': [0x0E, 0x04, 0x04, 0x04, 0x24, 0x24, 0x18],
  'K': [0x22, 0x24, 0x28, 0x30, 0x28, 0x24, 0x22],
  'L': [0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x3E],
  'M': [0x22, 0x36, 0x2A, 0x22, 0x22, 0x22, 0x22],
  'N': [0x22, 0x32, 0x2A, 0x26, 0x22, 0x22, 0x22],
  'O': [0x1C, 0x22, 0x22, 0x22, 0x22, 0x22, 0x1C],
  'P': [0x3C, 0x22, 0x22, 0x3C, 0x20, 0x20, 0x20],
  'R': [0x3C, 0x22, 0x22, 0x3C, 0x28, 0x24, 0x22],
  'S': [0x1E, 0x20, 0x20, 0x1C, 0x02, 0x02, 0x3C],
  'T': [0x3E, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08],
  'U': [0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x1C],
  'V': [0x22, 0x22, 0x22, 0x14, 0x14, 0x08, 0x08],
  'Y': [0x22, 0x22, 0x14, 0x08, 0x08, 0x08, 0x08],
  'Z': [0x3E, 0x02, 0x04, 0x08, 0x10, 0x20, 0x3E],
  '0': [0x1C, 0x22, 0x26, 0x2A, 0x32, 0x22, 0x1C],
  '1': [0x08, 0x18, 0x08, 0x08, 0x08, 0x08, 0x1C],
  '2': [0x1C, 0x22, 0x02, 0x0C, 0x10, 0x20, 0x3E],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  '-': [0x00, 0x00, 0x00, 0x3E, 0x00, 0x00, 0x00],
  '!': [0x08, 0x08, 0x08, 0x08, 0x08, 0x00, 0x08],
  '(': [0x0C, 0x10, 0x20, 0x20, 0x20, 0x10, 0x0C],
  ')': [0x30, 0x08, 0x04, 0x04, 0x04, 0x08, 0x30]
};

function drawText(buf, w, h, text, startX, startY, color, scale = 1) {
  const upper = text.toUpperCase();
  let curX = startX;
  for (let c = 0; c < upper.length; c++) {
    const char = upper[c];
    const glyph = FONT_5X7[char] || FONT_5X7[' '];
    for (let r = 0; r < 7; r++) {
      const rowByte = glyph[r];
      for (let col = 0; col < 5; col++) {
        if ((rowByte >> (4 - col)) & 1) {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = curX + col * scale + dx;
              const py = startY + r * scale + dy;
              if (px >= 0 && px < w && py >= 0 && py < h) {
                buf[py * w + px] = color;
              }
            }
          }
        }
      }
    }
    curX += 6 * scale;
  }
}

function project(lon, lat, W, H) {
  const x = Math.round((lon + 180) / 360 * (W - 1));
  const y = Math.round((90 - lat) / 180 * (H - 1));
  return [Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y))];
}

function fillPoly(buf, W, H, pts, color) {
  let minY = H, maxY = 0, minX = W, maxX = 0;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  minX = Math.max(0, minX);
  maxX = Math.min(W - 1, maxX);
  minY = Math.max(0, minY);
  maxY = Math.min(H - 1, maxY);

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
        for (let x = sx; x <= ex; x++) {
          buf[y * W + x] = color;
        }
      }
    }
  }
}

function strokePoly(buf, W, H, pts, color) {
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const dx = Math.abs(p2[0] - p1[0]);
    const dy = Math.abs(p2[1] - p1[1]);
    const sx = p1[0] < p2[0] ? 1 : -1;
    const sy = p1[1] < p2[1] ? 1 : -1;
    let err = dx - dy;
    let cx = p1[0], cy = p1[1];
    while (true) {
      if (cx >= 0 && cx < W && cy >= 0 && cy < H) buf[cy * W + cx] = color;
      if (cx === p2[0] && cy === p2[1]) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
    }
  }
}

function fillCircle(buf, W, H, cx, cy, r, c) {
  const r2 = r * r;
  const x1 = Math.max(0, Math.floor(cx - r));
  const x2 = Math.min(W - 1, Math.ceil(cx + r));
  const y1 = Math.max(0, Math.floor(cy - r));
  const y2 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y1; y <= y2; y++) {
    const dy = y - cy;
    for (let x = x1; x <= x2; x++) {
      const dx = x - cx;
      if (dx * dx + dy * dy <= r2) {
        buf[y * W + x] = c;
      }
    }
  }
}

// -------------------------------------------------------------
// 1. GENERATE AUTHENTIC REAL WORLD MAP WITH IN-WORLD BOT ARENA
// -------------------------------------------------------------
function generateWorldMap() {
  const W = 2048;
  const H = 1024;
  const buf = Buffer.alloc(W * H, C_OCEAN);

  // 1. Background Lat/Lon Coordinate Grid (Pixelplace Signature)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x % 64 === 0 || y % 64 === 0) {
        buf[y * W + x] = C_DEEP_OCEAN;
      }
    }
  }

  // 2. Load Real World Boundaries (Natural Earth 50m)
  const geojsonPath = path.join(__dirname, 'data', 'countries_50m.json');
  if (fs.existsSync(geojsonPath)) {
    const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

    const desertCountries = new Set([
      'Egypt', 'Libya', 'Algeria', 'Mauritania', 'Niger', 'Chad', 'Sudan',
      'Saudi Arabia', 'Yemen', 'Oman', 'United Arab Emirates', 'Qatar', 'Kuwait',
      'Iraq', 'Jordan'
    ]);

    for (const feature of geojson.features) {
      const name = feature.properties.NAME || '';
      const isTurkey = (name === 'Turkey' || name === 'Türkiye');
      const isIce = (name === 'Greenland' || name === 'Antarctica');
      const isDesert = desertCountries.has(name);

      let landColor = C_LAND;
      if (isTurkey) landColor = C_TURKEY;
      else if (isIce) landColor = C_ICE;
      else if (isDesert) landColor = C_DESERT;

      const geom = feature.geometry;
      if (!geom) continue;

      const polygons = geom.type === 'Polygon' ? [geom.coordinates] : (geom.type === 'MultiPolygon' ? geom.coordinates : []);
      for (const poly of polygons) {
        for (let r = 0; r < poly.length; r++) {
          const ring = poly[r];
          const pts = ring.map(c => project(c[0], c[1], W, H));
          if (r === 0) {
            fillPoly(buf, W, H, pts, landColor);
          } else {
            // Hole (Lake, Caspian Sea, Lake Victoria, etc.)
            fillPoly(buf, W, H, pts, C_OCEAN);
          }
          // Crisp Country Border
          strokePoly(buf, W, H, pts, C_BORDER);
        }
      }
    }
  }

  // 3. Central Anatolia (Turkey) Crescent & Star at (1223, 290)
  const tx = 1223;
  const ty = 290;
  fillCircle(buf, W, H, tx, ty, 6, C_WHITE);
  fillCircle(buf, W, H, tx + 2, ty, 5, C_TURKEY);
  buf[ty * W + (tx + 5)] = C_WHITE;
  buf[(ty - 1) * W + (tx + 5)] = C_WHITE;
  buf[(ty + 1) * W + (tx + 5)] = C_WHITE;
  buf[ty * W + (tx + 4)] = C_WHITE;
  buf[ty * W + (tx + 6)] = C_WHITE;

  return buf;
}

// -------------------------------------------------------------
// 2. STANDALONE BOT SANDBOX (1024 x 1024)
// -------------------------------------------------------------
function generateBotSandbox() {
  const W = 1024;
  const H = 1024;
  const buf = Buffer.alloc(W * H, 3);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x % 16 === 0 || y % 16 === 0) buf[y * W + x] = 17;
      if (x % 64 === 0 || y % 64 === 0) buf[y * W + x] = 2;
    }
  }

  fillCircle(buf, W, H, W / 2, H / 2, 280, 5);
  fillCircle(buf, W, H, W / 2, H / 2, 275, 3);
  fillCircle(buf, W, H, W / 2, H / 2, 190, 8);
  fillCircle(buf, W, H, W / 2, H / 2, 185, 3);
  fillCircle(buf, W, H, W / 2, H / 2, 100, 11);
  fillCircle(buf, W, H, W / 2, H / 2, 95, 3);

  for (let x = 0; x < W; x++) buf[Math.floor(H / 2) * W + x] = 18;
  for (let y = 0; y < H; y++) buf[y * W + Math.floor(W / 2)] = 18;

  return buf;
}

// -------------------------------------------------------------
// 3. TURKEY CANVAS (1600 x 900)
// -------------------------------------------------------------
function generateTurkeyMap() {
  const W = 1600;
  const H = 900;
  const buf = Buffer.alloc(W * H, 12);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (y < 260 || y > 630 || x < 320) {
        if ((x + y) % 32 === 0) buf[y * W + x] = 13;
      }
    }
  }

  const geojsonPath = path.join(__dirname, 'data', 'countries_50m.json');
  if (fs.existsSync(geojsonPath)) {
    const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    for (const f of geojson.features) {
      if (f.properties.NAME === 'Turkey' || f.properties.NAME === 'Türkiye') {
        const geom = f.geometry;
        const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
        for (const poly of polys) {
          for (let r = 0; r < poly.length; r++) {
            const ring = poly[r];
            // Scale and center Turkey onto 1600x900
            // Turkey Lon: 25.5 to 44.8 -> width ~19.3 deg
            // Turkey Lat: 35.8 to 42.2 -> height ~6.4 deg
            const pts = ring.map(c => {
              const x = Math.round((c[0] - 25.0) / 20.5 * 1300 + 150);
              const y = Math.round((42.5 - c[1]) / 7.2 * 600 + 150);
              return [Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y))];
            });
            if (r === 0) fillPoly(buf, W, H, pts, C_TURKEY);
            else fillPoly(buf, W, H, pts, 12);
            strokePoly(buf, W, H, pts, 18);
          }
        }
      }
    }
  }

  // Giant Crescent & Star in Central Anatolia
  fillCircle(buf, W, H, 800, 460, 95, C_WHITE);
  fillCircle(buf, W, H, 835, 460, 78, C_TURKEY);
  fillCircle(buf, W, H, 940, 460, 34, C_WHITE);

  return buf;
}

module.exports = {
  PALETTE,
  WORLD_BOT_ZONE,
  generateWorldMap,
  generateBotSandbox,
  generateTurkeyMap
};
