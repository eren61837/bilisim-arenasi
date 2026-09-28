const fs = require('fs');
const path = require('path');
const { PALETTE, WORLD_BOT_ZONE, generateWorldMap, generateBotSandbox, generateTurkeyMap } = require('./world_generator.js');

const DATA_DIR = path.join(__dirname, 'data');
const geojsonPath = path.join(DATA_DIR, 'countries_50m.json');

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

function resetAllMaps() {
  console.log('🔄 HARİTALAR SIFIRLANIYOR (Resetting all maps to pristine state)...');

  // 1. WORLD CANVAS & MASK
  console.log('Generating fresh World Map (2048x1024)...');
  const worldCanvas = generateWorldMap();
  fs.writeFileSync(path.join(DATA_DIR, 'canvas_world.bin'), worldCanvas);

  const W = 2048, H = 1024;
  const worldMask = Buffer.alloc(W * H, 0); // 0 = Ocean, 1 = Land/Arena
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom) continue;
    const polygons = geom.type === 'Polygon' ? [geom.coordinates] : (geom.type === 'MultiPolygon' ? geom.coordinates : []);
    for (const poly of polygons) {
      for (let r = 0; r < poly.length; r++) {
        const ring = poly[r];
        const pts = ring.map(c => project(c[0], c[1], W, H));
        if (r === 0) {
          fillPoly(worldMask, W, H, pts, 1);
        } else {
          fillPoly(worldMask, W, H, pts, 0); // Inland lakes/seas
        }
        strokePoly(worldMask, W, H, pts, 1);
      }
    }
  }

  // In-World Bot Arena
  for (let y = WORLD_BOT_ZONE.minY - 4; y <= WORLD_BOT_ZONE.maxY + 4; y++) {
    for (let x = WORLD_BOT_ZONE.minX - 4; x <= WORLD_BOT_ZONE.maxX + 4; x++) {
      worldMask[y * W + x] = 1;
    }
  }
  fillCircle(worldMask, W, H, 1223, 290, 6, 1); // Turkey flag
  fs.writeFileSync(path.join(DATA_DIR, 'paintable_world.bin'), worldMask);
  console.log('✅ World Canvas & Paintable Mask reset successfully.');

  // 2. TURKEY CANVAS & MASK
  console.log('Generating fresh Turkey Map (1600x900)...');
  const turkeyCanvas = generateTurkeyMap();
  fs.writeFileSync(path.join(DATA_DIR, 'canvas_turkey.bin'), turkeyCanvas);

  const TW = 1600, TH = 900;
  const turkeyMask = Buffer.alloc(TW * TH, 0);
  for (const f of geojson.features) {
    if (f.properties.NAME === 'Turkey' || f.properties.NAME === 'Türkiye') {
      const geom = f.geometry;
      const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
      for (const poly of polys) {
        for (let r = 0; r < poly.length; r++) {
          const ring = poly[r];
          const pts = ring.map(c => {
            const x = Math.round((c[0] - 25.0) / 20.5 * 1300 + 150);
            const y = Math.round((42.5 - c[1]) / 7.2 * 600 + 150);
            return [Math.max(0, Math.min(TW - 1, x)), Math.max(0, Math.min(TH - 1, y))];
          });
          if (r === 0) fillPoly(turkeyMask, TW, TH, pts, 1);
          else fillPoly(turkeyMask, TW, TH, pts, 0);
          strokePoly(turkeyMask, TW, TH, pts, 1);
        }
      }
    }
  }
  fillCircle(turkeyMask, TW, TH, 800, 460, 95, 1);
  fillCircle(turkeyMask, TW, TH, 940, 460, 34, 1);
  fs.writeFileSync(path.join(DATA_DIR, 'paintable_turkey.bin'), turkeyMask);
  console.log('✅ Turkey Canvas & Paintable Mask reset successfully.');

  // 3. BOTZONE CANVAS & MASK
  console.log('Generating fresh Bot Sandbox (1024x1024)...');
  const botCanvas = generateBotSandbox();
  fs.writeFileSync(path.join(DATA_DIR, 'canvas_botzone.bin'), botCanvas);
  const botMask = Buffer.alloc(1024 * 1024, 1);
  fs.writeFileSync(path.join(DATA_DIR, 'paintable_botzone.bin'), botMask);
  console.log('✅ Botzone Canvas & Paintable Mask reset successfully.');

  console.log('🎉 TÜM HARİTALAR BAŞARIYLA TERTEMİZ SIFIRLANDI!');
}

if (require.main === module) {
  resetAllMaps();
}

module.exports = { resetAllMaps };
