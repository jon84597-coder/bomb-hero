#!/usr/bin/env node
/**
 * tools/build-static.js —— GitHub Pages 用的靜態「建置」步驟
 *
 * 本專案是**單檔 HTML5（零依賴）**，不需要打包、不需要轉譯：
 * 真正的「建置」只有兩件事 ——
 *   1. 確認 public/ 裡的靜態檔齊全（index.html / sw.js / manifest.json / icons）
 *   2. 把 public/ 複製成 dist/（有些託管只認 dist/）
 *
 * 之前 repo 沒有 build script，但 GitHub Pages 的 workflow 名稱叫 "Build"，
 * 很容易被誤會成「npm run build 失敗」。這支腳本讓那句話有明確答案。
 *
 * 用法：npm run build
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'dist', 'site');

function fail(msg) {
  console.error('✗ 建置失敗：' + msg);
  process.exit(1);
}

function kb(n) { return (n / 1024).toFixed(0) + ' KB'; }

// ---- 1. 來源檢查 ----
if (!fs.existsSync(SRC)) fail('找不到 public/ 目錄（請先同步部署副本）');

const must = ['index.html', 'sw.js', 'manifest.json'];
const miss = must.filter(function (f) { return !fs.existsSync(path.join(SRC, f)); });
if (miss.length) fail('public/ 缺少必要檔案：' + miss.join('、'));

const idx = fs.statSync(path.join(SRC, 'index.html')).size;
if (idx < 200 * 1024) fail('public/index.html 只有 ' + kb(idx) + '，看起來是空檔或同步不完整');

/* 版本號交叉檢查。
   v5.74 起主程式搬到 js/main.js（index.html 只剩 HTML+CSS），所以 VERSION 要在
   js/main.js 裡找；index.html 只留顯示用的 <span id="verTxt">。
   這裡兩邊都驗 —— 顯示的版號跟程式的版號不同步，玩家看到的更新說明就會錯一版。 */
const htmlTxt = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const mainPath = path.join(SRC, 'js', 'main.js');
const mainTxt = fs.existsSync(mainPath) ? fs.readFileSync(mainPath, 'utf8') : '';
const swTxt = fs.readFileSync(path.join(SRC, 'sw.js'), 'utf8');
const vm = mainTxt.match(/const VERSION = '([\d.]+)'/) || htmlTxt.match(/const VERSION = '([\d.]+)'/);
const sm = swTxt.match(/SW_VERSION = 'v([\d.]+)'/);
const vt = htmlTxt.match(/id="verTxt"[^>]*>\s*v?([\d.]+)/);
if (!vm) fail(mainTxt ? 'js/main.js 找不到 const VERSION' : '找不到 js/main.js，index.html 也沒有 const VERSION');
if (!sm) fail('sw.js 找不到 SW_VERSION');
// 主程式的 VERSION 是 5.75，sw.js 的 SW_VERSION 是 v5.75.0 → 後者＝前者 + '.0'
if (sm[1] !== vm[1] + '.0') {
  fail('版本不一致：VERSION ' + vm[1] + ' vs sw.js ' + sm[1] + '（三份 sw.js 要一起升）');
}
if (vt && vt[1] !== vm[1]) {
  fail('版本不一致：index.html 顯示 ' + vt[1] + ' vs VERSION ' + vm[1] + '（#verTxt 忘了改）');
}

// ---- 2. 複製到 dist/site ----
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let count = 0, bytes = 0;

(function copy(from, to) {
  fs.readdirSync(from, { withFileTypes: true }).forEach(function (e) {
    const s = path.join(from, e.name);
    const d = path.join(to, e.name);
    if (e.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copy(s, d);
    } else {
      fs.copyFileSync(s, d);
      count++;
      bytes += fs.statSync(s).size;
    }
  });
})(SRC, OUT);

console.log('✓ 靜態建置完成');
console.log('  版本      v' + vm[1] + '（sw.js v' + sm[1] + ' 對得上）');
console.log('  來源      public/ → dist/site/');
console.log('  檔案      ' + count + ' 個，共 ' + kb(bytes));
console.log('  主檔      js/main.js ' + kb(fs.statSync(mainPath).size) + '＋ index.html ' + kb(idx)
  + '（零依賴，不需要轉譯）');
