// 無頭測試：驗證 穿牆 / 投擲 / 拳擊 / 踢彈
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
    id, style: {}, dataset: {}, children: [],
    _cls: new Set(),
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
    focus() {}, click() {},
    width: 720, height: 540, textContent: '', value: ''
  };
  let _inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return _inner; },
    set(v) {
      _inner = v;
      // 設定畫面的段落按鈕用 querySelectorAll 綁定，這裡提供假子節點即可
      el.children = [];
    }
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
  setTimeout: (fn) => { /* 不執行，避免回合流程 */ return 0; },
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

// 執行遊戲主程式
vm.runInContext(code, sandbox, { filename: 'index.html' });

const BH = sandbox.window.__BH;
if (!BH) { console.error('no __BH'); process.exit(1); }
const G = BH.Game;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

// 模擬鍵盤
function key(codeName, down) {
  (listeners[down ? 'keydown' : 'keyup'] || []).forEach(fn =>
    fn({ code: codeName, preventDefault() {} }));
}
console.log('=== 1. 對戰出生點隨機化 ===');
BH.settings.size = 'M'; BH.settings.hazards = 'off'; BH.settings.sd = 'off';
BH.Battle.resetSlots();
const sets = new Set(), cornerSet = new Set(['1,1', '13,1', '1,11', '13,11']);
let spawnBad = 0, overlap = 0, openBad = 0, rounds = 40;
const allCells = new Set();
for (let r = 0; r < rounds; r++) {
  BH.startBattle(); G.state = 'play';
  const T = G.T;
  const seen = new Set();
  G.players.forEach(function (p) {
    const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
    allCells.add(cx + ',' + cy);
    // 出生格必須是空地
    if (!G.grid[cy] || G.grid[cy][cx] !== 0) openBad++;
    // 不可重疊
    if (seen.has(cx + ',' + cy)) overlap++;
    seen.add(cx + ',' + cy);
    // 不可卡在牆裡、外框之外
    if (cx < 1 || cy < 1 || cx > G.cols - 2 || cy > G.rows - 2) spawnBad++;
  });
  sets.add(G.players.map(p => Math.floor(p.x / T) + ',' + Math.floor(p.y / T)).sort().join('|'));
}
ok(openBad === 0, rounds + ' 局全部出生在空地（違規 ' + openBad + '）');
ok(overlap === 0, rounds + ' 局無兩人同格（重疊 ' + overlap + '）');
ok(spawnBad === 0, '出生點都在場內（違規 ' + spawnBad + '）');
ok(sets.size >= 25, rounds + ' 局出現 ' + sets.size + ' 種不同出生組合（非固定四角）');
ok(allCells.size > 12, '共使用 ' + allCells.size + ' 個不同出生格');
let allCorner = 0;
sets.forEach(function (k) {
  const cells = k.split('|');
  if (cells.every(c => cornerSet.has(c))) allCorner++;
});
ok(allCorner <= 1, '四角全包的死板組合僅 ' + allCorner + ' 次 / ' + sets.size + ' 種');

console.log('=== 2. 自殺測試：SUPER 模式不該自我復活 ===');
function suicideTest(mode) {
  BH.settings.revenge = mode;
  BH.startBattle(); G.state = 'play';
  const T = G.T;
  const P = G.players[0];
  P.invuln = 0;
  G.bombs.length = 0; G.flames.length = 0;
  // 腳下放自己的炸彈並立刻引爆
  BH.placeBomb(P);
  const b = G.bombs[G.bombs.length - 1];
  ok(!!b && b.owner === P, '[' + mode + '] 腳下放置自己的炸彈');
  b.timer = 0.01;
  for (let i = 0; i < 20; i++) BH.updateWorld(1 / 60);
  ok(!P.alive, '[' + mode + '] 自殺後死亡');
  if (mode === 'off') {
    ok(P.cart === false, '[' + mode + '] 關閉推車 → 不上車（cart=' + P.cart + '）');
  } else {
    ok(P.cart === true, '[' + mode + '] 自殺後被送到外圍推車（cart=' + P.cart + '）');
    ok(P.cart && Math.floor(P.x / T) !== undefined && BH.onRingCell(Math.round(P.x / T - .5), Math.round(P.y / T - .5)), '[' + mode + '] 位置在外圈軌道上');
    if (mode === 'super') ok(!P.alive && P.cart, '[' + mode + '] 沒有原地復活（仍為淘汰上車狀態）');
  }
}
suicideTest('super');
suicideTest('on');
suicideTest('off');

console.log('=== 3. SUPER 正常機制仍有效：推車炸死人 → 推車者復活、死者接替 ===');
BH.settings.revenge = 'super';
BH.startBattle(); G.state = 'play';
const T2 = G.T;
const CART = G.players[0], VICTIM = G.players[1];
BH.putOnCart(CART);
CART.x = 0 * T2 + T2 / 2; CART.y = 3 * T2 + T2 / 2;
VICTIM.invuln = 0; VICTIM.alive = true;
VICTIM.x = 2 * T2 + T2 / 2; VICTIM.y = 3 * T2 + T2 / 2;
G.bombs.length = 0; G.flames.length = 0;
G.bombs.push({ cx: 2, cy: 3, px: 2 * T2 + T2 / 2, py: 3 * T2 + T2 / 2,
  timer: 0.01, power: 1, owner: CART, passers: [], remoteArmed: false, mine: false,
  moving: null, flying: null, held: false, seed: 0 });
for (let i = 0; i < 20; i++) BH.updateWorld(1 / 60);
ok(VICTIM.cart === true && VICTIM.alive === false, '受害者被炸死並在同一幀接替推車（cart=' + VICTIM.cart + '）');
ok(CART.cart === false && CART.alive === true, '兇手（推車者）成功復活回場（alive=' + CART.alive + ', cart=' + CART.cart + '）');
ok(VICTIM.cart === true && VICTIM.alive === false, '死者接替推車（cart=' + VICTIM.cart + '）');

console.log('=== 4. 全員 AI 對戰 30 秒（含自殺/推車）無崩潰 ===');
BH.settings.revenge = 'super'; BH.settings.time = 120;
BH.startBattle(); G.state = 'play';
let err = null, carts = 0, revives = 0;
try {
  // 至少跑 30 秒；若還沒出現推車就繼續跑到 90 秒（隨機地圖有時 30 秒內沒人死）
  for (let f = 0; f < 60 * 90; f++) {
    BH.updateBattle(1 / 60);
    G.players.forEach(p => { if (p.cart) carts++; if (p.alive) revives++; });
    if (f > 60 * 30 && carts > 0) break;
  }
} catch (e) { err = e; }
ok(!err, '30 秒模擬無例外' + (err ? '（' + err.message + '）' : ''));
ok(carts > 0, '期間有推車狀態（' + carts + ' 幀）');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
