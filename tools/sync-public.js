#!/usr/bin/env node
/**
 * tools/sync-public.js —— 把開發目錄 bomb-hero/ 同步到「部署來源」public/
 *
 * 為什麼需要這支：
 *   Render（和 GitHub Pages）都是從 **public/** 起服務，不是從 bomb-hero/。
 *   bomb-hero/ 裡改了 index.html、換了 spr/ 的圖，public/ 不會自己跟著變 ——
 *   v5.7 就是這樣把「新 LOGO」寫進 bomb-hero/spr/，public/spr/ 還是 v5.6 的舊檔，
 *   線上就一直是舊 LOGO，而所有測試（只讀 bomb-hero/）全綠，完全看不出來。
 *
 * 用法：
 *   node tools/sync-public.js            同步（覆蓋 public/，並清掉多出來的檔）
 *   node tools/sync-public.js --check    只檢查，不一致就 exit 1（測試／CI 用）
 *   node tools/sync-public.js --check -v 連一致的檔也列出來
 *   node tools/sync-public.js --src=<dir> --dst=<dir>   指定別的來源／目的（測試用）
 *
 * 同步範圍刻意寫死成白名單：
 *   檔案  index.html / sw.js / manifest.json
 *   目錄  spr/ / bg/ / icons/
 *   （test/、art/、dist/、patch_*.py、_bak_*.html 這些都不進部署）
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const CHECK = args.indexOf('--check') >= 0;
const VERBOSE = args.indexOf('-v') >= 0 || args.indexOf('--verbose') >= 0;

// v5.9：可指定來源／目的，測試就能拿兩個暫存目錄驗「真的抓得到不一致」
function opt(name, fallback) {
  const hit = args.filter(function (a) { return a.indexOf('--' + name + '=') === 0; })[0];
  return hit ? path.resolve(ROOT, hit.slice(name.length + 3)) : fallback;
}
const SRC = opt('src', path.join(ROOT, 'bomb-hero'));
const DST = opt('dst', path.join(ROOT, 'public'));

const FILES = ['index.html', 'sw.js', 'manifest.json'];
const DIRS = ['spr', 'bg', 'icons'];

function sha(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);
}

// 收集某個根目錄下的白名單檔案（相對路徑 → 絕對路徑）
function collect(root) {
  const out = new Map();
  FILES.forEach(function (f) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) out.set(f, p);
  });
  DIRS.forEach(function (d) {
    const base = path.join(root, d);
    if (!fs.existsSync(base)) return;
    (function walk(dir, rel) {
      fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
        if (e.name === '.DS_Store' || e.name === 'Thumbs.db') return;
        const abs = path.join(dir, e.name);
        const r = rel ? rel + '/' + e.name : e.name;
        if (e.isDirectory()) walk(abs, r);
        else out.set(r, abs);
      });
    })(base, d);
  });
  return out;
}

const src = collect(SRC);
const dst = collect(DST);

const missing = [];   // 部署目錄少了
const differ = [];    // 兩邊都有但內容不同
const extra = [];     // 部署目錄多的（多半是舊版留下的）
const same = [];

src.forEach(function (p, rel) {
  const q = dst.get(rel);
  if (!q) { missing.push(rel); return; }
  const a = sha(p), b = sha(q);
  if (a !== b) differ.push({ rel: rel, src: a, dst: b });
  else same.push(rel);
});
dst.forEach(function (p, rel) {
  if (!src.has(rel)) extra.push(rel);
});

function kb(n) { return (n / 1024).toFixed(1) + ' KB'; }

if (CHECK) {
  const bad = missing.length + differ.length + extra.length;
  if (VERBOSE) {
    same.forEach(function (r) { console.log('  = ' + r); });
  }
  missing.forEach(function (r) {
    console.log('  ✗ 缺少  ' + r + '（bomb-hero 有、public 沒有）');
  });
  differ.forEach(function (d) {
    console.log('  ✗ 不同  ' + d.rel + '（' + d.src + ' vs ' + d.dst + '）');
  });
  extra.forEach(function (r) {
    console.log('  ✗ 多餘  ' + r + '（public 有、bomb-hero 沒有 → 會送到玩家手上）');
  });
  if (bad) {
    console.log('✗ public/ 與 bomb-hero/ 不一致：' + bad + ' 個檔案（' + same.length + ' 個一致）');
    console.log('  修正：node tools/sync-public.js');
    process.exit(1);
  }
  console.log('✓ public/ 與 bomb-hero/ 完全一致（' + same.length + ' 個檔案）');
  process.exit(0);
}

// ---- 同步 ----
if (!fs.existsSync(SRC)) {
  console.error('✗ 找不到 bomb-hero/');
  process.exit(1);
}
fs.mkdirSync(DST, { recursive: true });

let copied = 0, bytes = 0;
src.forEach(function (p, rel) {
  const q = path.join(DST, rel);
  fs.mkdirSync(path.dirname(q), { recursive: true });
  const need = !fs.existsSync(q) || sha(p) !== sha(q);
  if (!need) return;
  fs.copyFileSync(p, q);
  copied++;
  bytes += fs.statSync(p).size;
  if (differ.some(function (d) { return d.rel === rel; })) {
    console.log('  ↻ ' + rel + '（' + kb(fs.statSync(p).size) + '）');
  } else {
    console.log('  + ' + rel);
  }
});
extra.forEach(function (rel) {
  fs.rmSync(path.join(DST, rel), { force: true });
  console.log('  − ' + rel + '（bomb-hero 沒有，已從部署目錄移除）');
});

if (!copied && !extra.length) {
  console.log('✓ public/ 已經是最新的（' + same.length + ' 個檔案，沒動）');
} else {
  console.log('✓ 同步完成：更新 ' + copied + ' 個檔案（' + kb(bytes) + '）、移除 ' + extra.length + ' 個');
}
