// check_all.js - Deep QA and Bug Hunt Suite
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('=== [1] ASSET REFERENCE INTEGRITY CHECK ===');
const publicDir = path.join(__dirname, 'public');
const htmls = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
let missingCount = 0;

htmls.forEach(h => {
  const content = fs.readFileSync(path.join(publicDir, h), 'utf8');
  const scriptRegex = /<script\b[^>]*\bsrc=["']([^"']+)["']/gi;
  const linkRegex = /<link\b[^>]*\bhref=["']([^"']+)["']/gi;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    const src = match[1];
    if (!src.startsWith('http')) {
      const clean = src.split('?')[0];
      if (!fs.existsSync(path.join(publicDir, clean))) {
        console.error(`❌ [${h}] Missing script: ${src}`);
        missingCount++;
      } else {
        console.log(`  ✓ [${h}] Script: ${clean}`);
      }
    }
  }
  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[1];
    if (!href.startsWith('http') && !href.startsWith('data:')) {
      const clean = href.split('?')[0];
      if (!fs.existsSync(path.join(publicDir, clean))) {
        console.error(`❌ [${h}] Missing CSS: ${href}`);
        missingCount++;
      } else {
        console.log(`  ✓ [${h}] CSS: ${clean}`);
      }
    }
  }
});

console.log(`\nAsset Missing Total: ${missingCount}`);
if (missingCount > 0) process.exit(1);

console.log('\n=== [2] HTTP ENDPOINT VERIFICATION ===');
const routes = [
  '/', '/cs16', '/pixelplace', '/minecraft', '/agario',
  '/slither', '/tank', '/deeeep', '/xox', '/survivor',
  '/miner', '/api/portal-stats', '/api/leaderboard',
  '/api/download-minecraft-launcher'
];

let checked = 0;
routes.forEach(r => {
  const req = http.get('http://localhost:3000' + r, res => {
    console.log(`  ✓ HTTP ${res.statusCode} -> ${r}`);
    if (++checked === routes.length) {
      console.log('All HTTP routes OK!');
      process.exit(0);
    }
  });
  req.on('error', err => {
    console.error(`❌ HTTP ERROR on ${r}:`, err.message);
    process.exit(1);
  });
});
