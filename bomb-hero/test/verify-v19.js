// 無頭測試 v19：輸送帶加減速 / 彩色傳送門 / 2 分鐘長曲 / 戰鬥結束特效音 / 線上大廳版面
const fs = require('fs');
const vm = require('vm');

const html = require('./_sandbox').rawHtml;
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('no script'); process.exit(1); }
const code = m[1];

// ----- 模擬瀏覽環境 -----
function mkCtx2D() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return { width: 720, height: 540 };
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (typeof t[k] !== 'undefined') return t[k];
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
function mkEl(id) {
  const el = {
    id, style: {}, dataset: {}, children: [], _cls: new Set(),
    classList: {
      add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); },
      toggle(c) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); },
      contains(c) { return el._cls.has(c); }
    },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; },
    getContext: () => mkCtx2D(),
    querySelectorAll: () => [],
    querySelector: () => mkEl(id + '-q'),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 540 }),
    setPointerCapture() {}, releasePointerCapture() {},
    focus() {}, click() {},
    width: 720, height: 540, textContent: '', value: ''
  };
  let _inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return _inner; },
    set(v) { _inner = v; el.children = []; }
  });
  return el;
}
const els = {};
function getId(id) { if (!els[id]) els[id] = mkEl(id); return els[id]; }

const listeners = {};
const storage = {};
const sandbox = {
  console, Math, JSON, Object, Array, Date, parseInt, parseFloat, isNaN, isFinite,
  Uint8ClampedArray, Infinity, NaN, undefined,
  setTimeout: () => 0,
  clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0,
  performance: { now: () => Date.now() },
  localStorage: {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; }
  },
  navigator: { getGamepads: () => [] },
  document: {
    getElementById: getId,
    querySelectorAll: () => [],
    querySelector: () => mkEl('q'),
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener() {},
    createElement: t => mkEl(t),
    body: mkEl('body'),
    documentElement: mkEl('html')
  }
};
sandbox.window = sandbox;
sandbox.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
sandbox.removeEventListener = () => {};
sandbox.globalThis = sandbox;
sandbox.window.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'index.html' });

const BH = sandbox.window.__BH;
if (!BH) { console.error('no __BH'); process.exit(1); }
const G = BH.Game;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

function freshBattle() {
  BH.settings.size = 'M'; BH.settings.hazards = 'off'; BH.settings.sd = 'off';
  BH.settings.revenge = 'off'; BH.settings.ctrl = 'kb'; BH.settings.count = 4;
  BH.Battle.resetSlots();
  BH.startBattle();
  G.state = 'play';
  G.bombs.length = 0; G.flames.length = 0; G.bubbles.length = 0; G.particles.length = 0;
  G.players.forEach(function (p) {
    p.invuln = 0; p.cart = false; p.alive = true; p.gloat = 0;
    p.beltMul = 1; p.warpLock = ''; p.warpCool = 0; p.slide = null;
  });
}
function clearArea(x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G.grid[y][x] = 0;
}
function clearHazards() {
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.hazards[y][x] = null;
}

// ================================================================
console.log('=== 1. 版本號（每次改版 +0.1） ===');
ok(parseFloat(BH.VERSION) >= 1.1, '版本號 ≥ 1.1（每次改版 +0.1，目前 ' + BH.VERSION + '）');
ok(getId('verTxt').textContent === BH.VERSION, '標題畫面顯示 v' + BH.VERSION);

// ================================================================
console.log('=== 2. 輸送帶：順行變快、逆行變慢、站著會被帶走 ===');
freshBattle();
clearHazards();
clearArea(1, 1, G.cols - 2, G.rows - 2);
const T = G.T;
const p0 = G.players[0];
// 在 (3,3) 放一條往右的輸送帶
G.hazards[3][3] = { type: 'convey', dir: 'right' };
p0.x = 3 * T + T / 2; p0.y = 3 * T + T / 2;

ok(BH.beltMulFor(p0, 1, 0) === BH.BELT_FAST, '順行（往右走）→ 速度倍率 ' + BH.beltMulFor(p0, 1, 0) + '（加速）');
ok(BH.beltMulFor(p0, -1, 0) === BH.BELT_SLOW, '逆行（往左走）→ 速度倍率 ' + BH.beltMulFor(p0, -1, 0) + '（減速）');
// v4.39：垂直穿越改成「會被皮帶甩出去」→ 比 1 大（舊版是 .95，站在帶子上幾乎走不掉）
ok(BH.beltMulFor(p0, 0, 1) > 1.15, '垂直穿越 → 甩得比平常快（' + BH.beltMulFor(p0, 0, 1) + '）');

function runAxis(mul, frames) {
  p0.x = 2 * T + T / 2; p0.y = 3 * T + T / 2;
  p0.beltMul = mul;
  const x0 = p0.x;
  for (let i = 0; i < frames; i++) BH.tryMove(p0, 1, 0, 1 / 60);
  p0.beltMul = 1;
  return p0.x - x0;
}
const dNormal = runAxis(1, 30);
const dFast = runAxis(BH.BELT_FAST, 30);
const dSlow = runAxis(BH.BELT_SLOW, 30);
ok(dFast > dNormal + 5, '順行真的比較快（' + dFast.toFixed(1) + 'px > ' + dNormal.toFixed(1) + 'px）');
ok(dSlow < dNormal - 5, '逆行真的比較慢（' + dSlow.toFixed(1) + 'px < ' + dNormal.toFixed(1) + 'px）');

// 站著不動也會被帶走
p0.x = 3 * T + T / 2; p0.y = 3 * T + T / 2;
const cxBefore = p0.x;
for (let i = 0; i < 45; i++) BH.hazardTick(p0, 1 / 60, false);
ok(p0.x - cxBefore > 20, '站著不動被帶往輸送方向（移動 ' + (p0.x - cxBefore).toFixed(1) + 'px）');
ok(Math.abs(p0.y - (3 * T + T / 2)) < 6, '橫向輸送帶不會把人帶歪（Y 幾乎不變）');

// 撞到牆不會被推穿
G.grid[3][4] = 1;   // 右邊放硬牆
p0.x = 3 * T + T / 2; p0.y = 3 * T + T / 2;
for (let i = 0; i < 90; i++) BH.hazardTick(p0, 1 / 60, false);
ok(Math.floor(p0.x / T) === 3, '輸送帶不會把人推穿牆（仍在第 3 格）');
G.grid[3][4] = 0;

// 上下方向
clearHazards();
G.hazards[3][3] = { type: 'convey', dir: 'down' };
p0.x = 3 * T + T / 2; p0.y = 3 * T + T / 2;
ok(BH.beltMulFor(p0, 0, 1) === BH.BELT_FAST, '往下的輸送帶：往下走加速');
ok(BH.beltMulFor(p0, 0, -1) === BH.BELT_SLOW, '往下的輸送帶：往上走（逆行）減速');

// 不在輸送帶上 → 不影響
p0.x = 8 * T + T / 2;
ok(BH.beltMulFor(p0, 1, 0) === 1, '不在輸送帶上 → 速度倍率 1（無影響）');

// ================================================================
console.log('=== 3. 傳送門：同色成對、離開再回來才再觸發 ===');
BH.settings.hazards = 'on';
BH.startSolo(7);                     // v5.36：第 5 關改成 BOSS 決戰場；沙漠區（6~9）第 7 關帶多組傳送門
const warpTiles = [];
for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
  const h = G.hazards[y] && G.hazards[y][x];
  if (h && h.type === 'warp') warpTiles.push({ x: x, y: y, h: h });
}
ok(warpTiles.length >= 2 && warpTiles.length % 2 === 0, '傳送門成對生成（' + warpTiles.length + ' 個門）');
ok(warpTiles.every(function (w) { return typeof w.h.ci === 'number'; }), '每個門都有顏色編號');
ok(warpTiles.every(function (w) { return w.h.color && /^#/.test(w.h.color); }), '每個門都有顏色值');

const byColor = {};
warpTiles.forEach(function (w) { byColor[w.h.ci] = (byColor[w.h.ci] || 0) + 1; });
ok(Object.keys(byColor).every(function (k) { return byColor[k] === 2; }), '同一顏色剛好兩個門（' + JSON.stringify(byColor) + '）');
ok(warpTiles.every(function (w) {
  const lk = w.h.link;
  return lk && G.hazards[lk.y][lk.x] && G.hazards[lk.y][lk.x].ci === w.h.ci;
}), '每個門都連到「同顏色」的另一個門（紅傳紅、藍傳藍…）');
ok(Object.keys(byColor).length >= 2, '一張圖上有多組不同顏色的門（' + Object.keys(byColor).length + ' 組）');
ok(BH.WARP_COLORS.length === 7, '顏色表 7 種：' + BH.WARP_COLORS.map(function (c) { return c.name; }).join('/'));

// 傳送行為
G.state = 'play';
const w0 = warpTiles[0];
const w1 = { x: w0.h.link.x, y: w0.h.link.y };
const pp = G.players[0];
pp.x = w0.x * T + T / 2; pp.y = w0.y * T + T / 2;
pp.warpLock = ''; pp.warpCool = 0;
BH.hazardTick(pp, 1 / 60, false);
ok(Math.floor(pp.x / T) === w1.x && Math.floor(pp.y / T) === w1.y,
  '踩上傳送門 → 傳到同色的另一頭 (' + w1.x + ',' + w1.y + ')');
ok(pp.warpLock === w1.x + ',' + w1.y, '落地後把該格上鎖，不會原地反覆傳送');

// 站著不動不會一直被傳
let hops = 0;
for (let i = 0; i < 60; i++) {
  const bx = Math.floor(pp.x / T), by = Math.floor(pp.y / T);
  BH.hazardTick(pp, 1 / 60, false);
  if (Math.floor(pp.x / T) !== bx || Math.floor(pp.y / T) !== by) hops++;
}
ok(hops === 0, '站在門上不動 → 不會反覆傳送（' + hops + ' 次）');

// 離開格子 → 解鎖
pp.x = 8 * T + T / 2; pp.y = 8 * T + T / 2;
pp.warpCool = 0;
BH.hazardTick(pp, 1 / 60, false);
ok(pp.warpLock === '', '離開傳送門格子 → 解鎖');

// 再走回來 → 又會傳
pp.x = w1.x * T + T / 2; pp.y = w1.y * T + T / 2;
BH.hazardTick(pp, 1 / 60, false);
ok(Math.floor(pp.x / T) === w0.x && Math.floor(pp.y / T) === w0.y, '離開後再走回來 → 又傳回去（可重複使用）');

// 不同顏色的門不會互通
const idxs = Object.keys(byColor).map(Number).sort(function (a, b) { return a - b; });
if (idxs.length >= 2) {
  const a0 = warpTiles.filter(function (w) { return w.h.ci === idxs[0]; })[0];
  const b0 = warpTiles.filter(function (w) { return w.h.ci === idxs[1]; })[0];
  ok(a0.h.link.x === warpTiles.filter(function (w) { return w.h.ci === idxs[0]; })[1].x ||
     a0.h.link.y === warpTiles.filter(function (w) { return w.h.ci === idxs[0]; })[1].y,
  '第一個顏色的門互連（不會連到別的顏色）');
  ok(!(b0.h.link.x === a0.x && b0.h.link.y === a0.y), '不同顏色（' +
    BH.WARP_COLORS[idxs[0]].name + '／' + BH.WARP_COLORS[idxs[1]].name + '）互不相通');
}

// 線上同步要帶顏色
const snap = BH.buildSnap();
const warpSnap = (snap.hz || []).filter(function (h) { return h[2] === 'w'; });
ok(warpSnap.length === warpTiles.length, '快照包含所有傳送門（' + warpSnap.length + '）');
ok(warpSnap.every(function (h) { return h[4] >= 0 && h[5] >= 0 && h[6] >= 0; }), '快照帶顏色編號與連結座標（客人端畫得出一樣的門）');
BH.applySnap(snap);
const ciAfter = G.hazards[w0.y][w0.x].ci;
ok(ciAfter === w0.h.ci, '客人端套用快照後顏色一致（' + ciAfter + '）');

// ================================================================
console.log('=== 4. 音樂：2～3 分鐘長度、三軌等長、無縫接回 ===');
['menu', 'battle', 'boss'].forEach(function (n) {
  const sec = BH.songSeconds(n);
  ok(sec >= 120 && sec <= 200, n + ' 曲長 ' + sec.toFixed(1) + ' 秒（' + (sec / 60).toFixed(2) + ' 分鐘）');
});
const song = BH.AudioSys.compileSong('menu');
ok(song.tracks.length === 3, '三軌（旋律／貝斯／和聲墊）');
const lens = song.tracks.map(function (t) {
  return t.seq.reduce(function (n, x) { return n + x.len; }, 0);
});
ok(lens[0] === lens[1] && lens[1] === lens[2], '三軌總長一致（' + lens.join(' / ') + ' 單位）→ 循環不會走音');
ok(lens[0] === 64 * 16, '共 64 小節（' + (lens[0] / 16) + ' 小節）');
ok(song.tracks[0].seq.some(function (n) { return n.midi !== null; }), '旋律有音符');
ok(song.tracks[0].seq.every(function (n) { return n.midi === null || (n.midi > 40 && n.midi < 100); }),
  '所有音高都在合理音域（40～100）');
const batt = BH.AudioSys.compileSong('battle');
const boss = BH.AudioSys.compileSong('boss');
ok(batt.bpm !== song.bpm && boss.bpm !== song.bpm, '三首曲子節奏不同（' + song.bpm + '/' + batt.bpm + '/' + boss.bpm + ' bpm）');
ok(JSON.stringify(batt.tracks[0].seq) !== JSON.stringify(song.tracks[0].seq), '對戰曲與選單曲旋律不同');
ok(html.indexOf('SONG_DEFS') >= 0 && html.indexOf('songSeconds') >= 0, '長曲系統在原始碼中');

// ================================================================
console.log('=== 5. 每場戰鬥結束都有特效音 ===');
ok(html.indexOf("case 'finish':") >= 0, '有戰鬥結束專屬音效 finish');
ok(html.indexOf("case 'finishLose':") >= 0, '有落敗版本音效 finishLose');
ok(html.indexOf('function battleEndFx') >= 0, '有統一的結束演出函式 battleEndFx');
freshBattle();
G.particles.length = 0;
BH.battleEndFx(true, 5 * T, 5 * T);
ok(G.particles.length >= 30, '勝利 → 噴彩帶（' + G.particles.length + ' 片）');
ok(G.particles.some(function (pt) { return pt.shape === 'rect' && pt.g > 0; }), '彩帶有重力、會旋轉');
const before = G.particles.length;
BH.battleEndFx(false);
ok(G.particles.length === before, '落敗 → 只播音效、不噴彩帶');

// 對戰結束自動觸發
freshBattle();
G.particles.length = 0;
G.players.forEach(function (p, i) { if (i > 0) p.alive = false; });
BH.updateBattle(1 / 60);
ok(G.state === 'roundover', '只剩一人存活 → 回合結束');
ok(G.particles.filter(function (pt) { return pt.shape === 'rect'; }).length > 0, '回合結束自動噴彩帶');
ok(G.players[0].wins === 1, '勝方加一勝');

// 單人過關也用同一個演出
ok(html.indexOf("battleEndFx(true, p.x, p.y - Game.T)") >= 0, '單人過關有結束特效音');

// ================================================================
console.log('=== 6. 線上大廳版面：兩欄自適應、內容不超出視窗 ===');
ok((html.match(/class="netcol"/g) || []).length >= 4, '大廳改用左右兩欄（netcol ×' + (html.match(/class="netcol"/g) || []).length + '）');
ok(html.indexOf('#netEntry, #netRoom { display: grid; grid-template-columns: 1fr 1fr;') >= 0, '大廳兩欄用 grid 自適應寬度');
ok(html.indexOf('overflow-y: auto') >= 0, '內容太長時可捲動（不會被切掉）');
ok(html.indexOf('body.touch #scr-online .card') >= 0, '手機直放（旋轉後）大廳有自己的緊湊排版');
ok(html.indexOf("room.style.display = 'grid'") >= 0, '切換到等待室時用 grid 排版');
ok(html.indexOf('id="netRoomList"') >= 0 && html.indexOf('id="netRoster"') >= 0, '房間列表與等待室名單都還在');
ok(html.indexOf('id="btnNetQuick"') >= 0 && html.indexOf('id="btnNetJoin"') >= 0 &&
   html.indexOf('id="btnNetCreate"') >= 0, '快速配對／加入／建立房間三個按鈕都在');
ok(html.indexOf('font-size: clamp(') >= 0, '字級隨視窗大小縮放（clamp）');

// ================================================================
console.log('');
console.log(fail === 0 ? '通過 ' + pass + ' / ' + (pass + fail) : '✗ ' + fail + ' 項失敗（通過 ' + pass + '）');
process.exit(fail === 0 ? 0 : 1);
