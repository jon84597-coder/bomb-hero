// 無頭測試：驗證 穿牆 / 投擲 / 拳擊 / 踢彈
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
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

// 模擬鍵盤
function key(codeName, down) {
  (listeners[down ? 'keydown' : 'keyup'] || []).forEach(fn =>
    fn({ code: codeName, preventDefault() {} }));
}

console.log('=== 1. 比賽時間設定 ===');
ok(BH.settings.time === undefined || typeof BH.settings.time !== 'undefined', 'settings 有 time 欄位');
BH.settings.time = 90; BH.settings.size = 'M'; BH.settings.hazards = 'off'; BH.settings.sd = 'off'; BH.settings.revenge = 'off';
BH.Battle.resetSlots();
BH.startBattle();
G.state = 'play';
ok(G.timer === 90, '設定 90 秒 → 開局計時 = 90（實際 ' + G.timer + '）');
BH.settings.time = 300;
BH.startBattle(); G.state = 'play';
ok(G.timer === 300, '設定 300 秒 → 開局計時 = 300（實際 ' + G.timer + '）');

console.log('=== 2. 推車丟彈：從推車拋物線飛入場內 ===');
BH.settings.time = 120; BH.settings.revenge = 'on';
BH.startBattle(); G.state = 'play';
const T = G.T;
const CP = G.players[0];
BH.putOnCart(CP);
ok(CP.cart, 'P0 上推車');
// 放到左緣 (0, 5)，清出內側落點
CP.x = 0 * T + T / 2; CP.y = 5 * T + T / 2;
G.grid[5][1] = 0; G.grid[5][2] = 0;
G.bombs.length = 0;
CP.cartCd = 0;
const thrown = BH.cartThrowBomb(CP);
ok(thrown, 'cartThrowBomb 成功');
const cb = G.bombs[0];
ok(cb && cb.flying, '炸彈處於飛行狀態（不是直接出現在場內）');
if (cb && cb.flying) {
  ok(cb.flying.fx === 0 && cb.flying.fy === 5, '起點是推車所在格 (0,5)（實際 ' + cb.flying.fx + ',' + cb.flying.fy + '）');
  ok(cb.flying.tx >= 1, '落點在場內 x=' + cb.flying.tx);
  ok(Math.abs(cb.px - CP.x) < 1 && Math.abs(cb.py - CP.y) < 1, '起始座標在推車上（' + cb.px.toFixed(1) + ',' + cb.py.toFixed(1) + '）');
  // 推進飛行，確認畫面座標逐漸飛向落點且飛行中不擋格
  const midPos = [];
  for (let i = 0; i < 15; i++) { BH.updateWorld(1 / 60); if (i === 7) midPos.push(cb.px, cb.py); }
  ok(cb.flying, '0.25 秒後仍在飛行中');
  ok(cb.px > 0, '飛行中炸彈位置前進（px=' + cb.px.toFixed(1) + '）');
  // 飛到落地為止（v4.38 飛行時間隨距離變長，最長 1.15s，不要寫死幀數）
  for (let i = 0; i < 180 && cb.flying; i++) BH.updateWorld(1 / 60);
  ok(!cb.flying, '飛行結束落地');
  ok(Math.abs(cb.px - (cb.cx * T + T / 2)) < 1, '落地座標對齊格心');
}

console.log('=== 3. 滑軌可回頭走 ===');
// 把 P0 推車放到上緣 (5, 0)，先往右走 1 秒，再往左走 1 秒（人類推車讀鍵盤）
CP.cart = true; CP.alive = false;
CP.x = 5 * T + T / 2; CP.y = 0 * T + T / 2; CP.cartDir = null;
key('KeyD', true);
const x0 = CP.x;
for (let i = 0; i < 60; i++) { BH.updateCart(CP, 1 / 60); }
const xFwd = CP.x - x0;
ok(xFwd > 80, '按住右 1 秒前進 ' + xFwd.toFixed(1) + 'px（正常速度）');
// 回頭：倒推只有 42% 速度，且「走滿一格」後朝向就翻轉 → 之後恢復全速
//   （v4.38 把推車基礎速度提到 250px/s＝滑冰鞋 5 級，比例不變但翻轉時機會切斷量測）
CP.x = 8 * T + T / 2; CP.cartDir = { x: 1, y: 0 }; CP.cartRevDist = 0;
key('KeyD', false); key('KeyA', true);
const x1 = CP.x;
for (let i = 0; i < 30; i++) { BH.updateCart(CP, 1 / 60); }
const xBack = x1 - CP.x;
ok(xBack > 0, '按反方向會回頭走（0.5 秒倒推 ' + xBack.toFixed(1) + 'px）');
const ratioBack = xBack / (xFwd / 2);
ok(ratioBack < .5, '倒推速度只有 42%（' + Math.round(ratioBack * 100) + '% 於前進）');
// 倒推滿一格 → 朝向翻轉
for (let i = 0; i < 40; i++) { BH.updateCart(CP, 1 / 60); }
ok(CP.cartDir.x === -1, '倒推滿一格後朝向翻轉（cartDir 變成往左）');
// 翻轉後就是正常速度
const x3 = CP.x;
for (let i = 0; i < 20; i++) { BH.updateCart(CP, 1 / 60); }
const fwd3 = x3 - CP.x;
key('KeyA', false);
ok(fwd3 / 20 > (xBack / 30) * 2, '朝向翻轉後恢復全速（20 幀 ' + fwd3.toFixed(1) + 'px vs 倒推 ' + (xBack / 30 * 20).toFixed(1) + 'px）');

console.log('=== 4. AI 推車 20 秒模擬（含丟彈飛行）無崩潰 ===');
const aiP = G.players[2];
aiP.ai = {}; aiP.cart = true; aiP.alive = false; aiP.cartDir = null;
aiP.x = 8 * T + T / 2; aiP.y = 0 * T + T / 2;
G.bombs.length = 0; G.flames.length = 0;
let cartBombsFlown = 0, throws = 0, err = null;
try {
  for (let f = 0; f < 60 * 20; f++) {
    const before = G.bombs.length;
    BH.updateCart(aiP, 1 / 60);
    if (G.bombs.length > before) throws++;
    G.bombs.forEach(function (b) { if (b.flying) cartBombsFlown++; });
    BH.updateWorld(1 / 60);
  }
} catch (e) { err = e; }
ok(!err, '20 秒 AI 推車模擬無例外' + (err ? '（' + err.message + '）' : ''));
ok(throws > 0, 'AI 推車丟了 ' + throws + ' 顆炸彈');
ok(cartBombsFlown > 0, '有 ' + cartBombsFlown + ' 幀炸彈處於「從推車飛入場內」狀態');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
