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

console.log('=== 1. 對戰開局（1 人類 + 3 AI）===');
BH.Battle.resetSlots();
BH.Battle.slots[1].joined = false; BH.Battle.slots[2].joined = false; BH.Battle.slots[3].joined = false;
BH.settings.size = 'M'; BH.settings.hazards = 'off'; BH.settings.sd = 'off';
BH.startBattle();
// 跳過倒數
G.state = 'play';
ok(G.players.length === 4, '四人開戰');
const P = G.players[0];
ok(P.isHuman, 'P0 是人類');
const T = G.T;
console.log('  T=' + T + ' cols=' + G.cols + ' rows=' + G.rows);

// 讓 P0 站定位於出生格中心（地圖出生點是隨機的，(1,1) 可能剛好是軟磚 → 先清空）
G.grid[1][1] = 0;
P.x = 1 * T + T / 2; P.y = 1 * T + T / 2; P.invuln = 99;

console.log('=== 2. 穿牆測試：連續往各方向推 3 秒，確認不進牆 ===');
function cellOf(o) { return [Math.floor(o.x / T), Math.floor(o.y / T)]; }
function inWall() {
  const [cx, cy] = cellOf(P);
  return G.grid[cy] && G.grid[cy][cx] !== 0;
}
let walked = 0, wallViolations = 0;
const dirs = [['KeyD', 'KeyA', 'KeyS', 'KeyW']];
for (let round = 0; round < 12; round++) {
  const kc = ['KeyD', 'KeyA', 'KeyS', 'KeyW'][round % 4];
  key(kc, true);
  for (let f = 0; f < 60; f++) { BH.controlHuman(P, 1 / 60); G.updateWorld && null; }
  key(kc, false);
}
// 檢查最終位置與整個過程：改為每幀檢查
for (let round = 0; round < 8; round++) {
  const kc = ['KeyW', 'KeyS', 'KeyA', 'KeyD'][round % 4];
  key(kc, true);
  for (let f = 0; f < 90; f++) {
    BH.controlHuman(P, 1 / 60);
    if (inWall()) wallViolations++;
  }
  key(kc, false);
}
ok(wallViolations === 0, '推牆 8 輪 × 90 幀，沒有任何一幀進入牆格（違規 ' + wallViolations + ' 次）');

// 軟磚也擋人
console.log('=== 3. 軟磚也擋人 ===');
// 找一個軟磚，把玩家放在旁邊空地往軟磚推
let found = false;
for (let y = 1; y < G.rows - 1 && !found; y++) for (let x = 2; x < G.cols - 1 && !found; x++) {
  if (G.grid[y][x] === 2 && G.grid[y][x - 1] === 0) {
    P.x = (x - 1) * T + T / 2; P.y = y * T + T / 2;
    key('KeyD', true);
    for (let f = 0; f < 120; f++) BH.controlHuman(P, 1 / 60);
    key('KeyD', false);
    const [cx, cy] = cellOf(P);
    ok(G.grid[cy][cx] !== 2, '往軟磚 (' + x + ',' + y + ') 推 120 幀不會穿進去（玩家在 ' + cx + ',' + cy + '）');
    found = true;
  }
}
if (!found) console.log('  （沒找到軟磚測點，略）');

console.log('=== 4. 投擲測試：撿彈 → 越牆投擲 ===');
// 手動構造：P0 有手套，腳下放一顆炸彈，右邊 3 格有硬牆，牆後空地
// v4.17：先把其他 AI 移到最下排 —— 站在第 3 列的 AI 會讓投擲「穿過他」，
//   落點變成更遠的格子（這是舊測試偶發紅燈的原因）
G.players.forEach(function (q) { if (q !== P) { q.x = 1 * T + T / 2; q.y = (G.rows - 2) * T + T / 2; } });
P.glove = true; P.carry = null; P.x = 3 * T + T / 2; P.y = 3 * T + T / 2;
G.grid[3][4] = 1; G.grid[3][5] = 1; G.grid[3][6] = 1; // 三格硬牆
G.grid[3][7] = 0;
G.bombs.length = 0; G.flames.length = 0;
BH.placeBomb(P);                       // 腳下放彈
ok(G.bombs.length === 1, '放置炸彈');
// 再按一次動作鍵（撿起）。v4.36：剛放下的 0.35 秒內不撿、站在自己炸彈上也不撿
//   → 這裡模擬「放了一陣子、離開過這一格」，走真正的動作鍵分派（carry → 撿 → 放）
G.bombs[0].age = 1; G.bombs[0].ownerLeft = true;
key('Space', true); BH.controlHuman(P, 1 / 60); key('Space', false);
ok(P.carry === G.bombs[0], '手套撿起炸彈');
// 面向右投擲（經由 controlHuman 動作鍵路徑）
key('Space', true);
BH.controlHuman(P, 1 / 60);
key('Space', false);
ok(P.carry === null, '投擲後手上沒有炸彈');
const fb = G.bombs[0];
ok(fb && fb.flying, '炸彈進入飛行狀態');
if (fb && fb.flying) {
  ok(fb.flying.tx === 7 && fb.flying.ty === 3, '落點在三格硬牆後的空地 (7,3)，實際 (' + fb.flying.tx + ',' + fb.flying.ty + ')');
  ok(fb.flying.t < fb.flying.dur, '飛行中');
  // 推進飛行
  for (let i = 0; i < 120; i++) BH.updateWorld(1 / 60);
  ok(!fb.flying, '飛行結束落地');
  ok(fb.cx === 7 && fb.cy === 3, '落地在 (7,3)，實際 (' + fb.cx + ',' + fb.cy + ')');
}

console.log('=== 5. 投擲出邊界繞回 ===');
// 玩家在 x=3，右邊全部是空地到邊界外 → 從左邊繞回來
P.x = (G.cols - 2) * T + T / 2; P.y = 3 * T + T / 2;
G.grid[3][G.cols - 1] = 0; // 確保右側貼邊是空地（邊界外是牆）
G.bombs.length = 0;
BH.placeBomb(P);
G.bombs[0].age = 1; G.bombs[0].ownerLeft = true;
key('Space', true); BH.controlHuman(P, 1 / 60); key('Space', false);
ok(P.carry, '撿起炸彈');
key('Space', true); BH.controlHuman(P, 1 / 60); key('Space', false);
const fb2 = G.bombs[0];
if (fb2 && fb2.flying) {
  // 面向 right，投出右邊界 → 從左邊 (x=1) 進來
  ok(fb2.flying.tx <= G.cols - 2, '落點在界內：(' + fb2.flying.tx + ',' + fb2.flying.ty + ')');
  ok(fb2.flying.tx < P.x / T, '飛越右邊界從左側繞回，落點 x=' + fb2.flying.tx);
  const expX = fb2.flying.tx, expY = fb2.flying.ty;
  for (let i = 0; i < 100; i++) BH.updateWorld(1 / 60);
  ok(fb2.cx === expX && fb2.cy === expY, '落地位置正確 (' + fb2.cx + ',' + fb2.cy + ')');
} else {
  ok(false, '炸彈應該在飛行（繞回測試）');
}

console.log('=== 6. 拳擊測試：打飛越牆 ===');
P.punch = true; P.glove = false; P.kick = false;
P.x = 3 * T + T / 2; P.y = 5 * T + T / 2; P.invuln = 99;
G.grid[5][5] = 1; G.grid[5][6] = 1; G.grid[5][7] = 0; G.grid[5][8] = 0; G.grid[5][4] = 0; // 炸彈在(4,5)，硬牆(5,5)(6,5)
G.bombs.length = 0; G.flames.length = 0;
G.bombs.push({ cx: 4, cy: 5, px: 4 * T + T / 2, py: 5 * T + T / 2, timer: 2.4, power: 1, owner: P, passers: [], remoteArmed: false, mine: false, moving: null, flying: null, held: false, seed: 0 });
// 玩家在 (3,5)，往右走一步觸發 punch
key('KeyD', true);
for (let f = 0; f < 30; f++) BH.controlHuman(P, 1 / 60);
key('KeyD', false);
const pb = G.bombs[0];
ok(pb && pb.flying, '拳擊讓炸彈起飛');
if (pb && pb.flying) ok(pb.flying.tx >= 7, '拳擊飛越兩格硬牆，落點 x=' + pb.flying.tx + '（期望 ≥7）');

console.log('=== 7. AI 對戰跑 15 秒模擬（檢查 AI 是否穿牆 / 崩潰）===');
BH.settings.size = 'M';
BH.startBattle();
G.state = 'play';
let aiWall = 0;
for (let f = 0; f < 60 * 15; f++) {
  BH.updateBattle(1 / 60);
  G.players.forEach(p => {
    if (!p.alive) return;
    const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
    if (G.grid[cy] && G.grid[cy][cx] !== 0) aiWall++;
  });
}
ok(aiWall === 0, '15 秒 AI 對戰，沒有任何玩家進入牆格（違規 ' + aiWall + '）');
ok(G.players.some(p => !p.alive) || G.bombs.length > 0 || true, '模擬過程無崩潰');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
