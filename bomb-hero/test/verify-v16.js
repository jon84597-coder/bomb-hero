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
function key(codeName, down) {
  (listeners[down ? 'keydown' : 'keyup'] || []).forEach(fn =>
    fn({ code: codeName, preventDefault() {} }));
}

console.log('=== 1. 對戰人數 4 / 8 ===');
BH.settings.count = 4;
BH.Battle.resetSlots();
ok(BH.Battle.slots.length === 4, '4 人 → 4 個槽位（' + BH.Battle.slots.length + '）');
BH.settings.count = 8;
BH.Battle.resetSlots();
ok(BH.Battle.slots.length === 8, '8 人 → 8 個槽位（' + BH.Battle.slots.length + '）');
ok(BH.Battle.slots[7].label === 'P8', '第 8 格標籤是 P8（' + BH.Battle.slots[7].label + '）');

BH.settings.size = 'L'; BH.settings.hazards = 'off'; BH.settings.sd = 'off'; BH.settings.revenge = 'off';
BH.settings.ctrl = 'kb'; BH.settings.time = 120;
BH.Battle.resetSlots();
BH.startBattle();
G.state = 'play';
ok(G.players.length === 8, '開局有 8 位玩家（' + G.players.length + '）');
const T = G.T;
const cells = new Set();
let badCell = 0;
G.players.forEach(function (p) {
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  cells.add(cx + ',' + cy);
  if (!G.grid[cy] || G.grid[cy][cx] !== 0) badCell++;
});
ok(badCell === 0, '8 人全部出生在空地（違規 ' + badCell + '）');
ok(cells.size === 8, '8 人分散在 8 個不同格子（實際 ' + cells.size + '）');

console.log('=== 2. 暱稱命名 ===');
BH.setPname(0, '阿肥');
BH.setPname(1, '小美');
ok(BH.settings.names[0] === '阿肥' && BH.settings.names[1] === '小美', '暱稱寫進設定');
BH.setPname(2, '一二三四五六七八九');
ok(BH.settings.names[2].length === 8, '暱稱最長 8 字（實際 ' + BH.settings.names[2].length + '）');
BH.setPname(0, '');
BH.Battle.resetSlots();
BH.startBattle(); G.state = 'play';
ok(G.players[0].name === '', '沒填暱稱 → name 為空（HUD 會顯示角色名）');
ok(BH.pname(G.players[0]).length > 0, 'pname() 有值（' + BH.pname(G.players[0]) + '）');
BH.setPname(1, '小美');
BH.startBattle(); G.state = 'play';
ok(G.players[1].name === '小美', '有暱稱 → 帶進角色 name（' + G.players[1].name + '）');
ok(BH.pname(G.players[1]) === '小美', 'pname() 回傳暱稱');
BH.updateHud();
ok((sandbox.document.getElementById('pkRoster').innerHTML || '').indexOf('小美') >= 0, 'HUD 顯示暱稱（v2.9：右上一橫排玩家卡）');

console.log('=== 3. 8 人 HUD 左右各 4 張卡 ===');
BH.settings.count = 8; BH.Battle.resetSlots(); BH.startBattle(); G.state = 'play';
BH.updateHud();
const pkh = sandbox.document.getElementById('pkRoster').innerHTML || '';
ok((pkh.match(/pcard/g) || []).length === 8, 'v2.9：8 人一橫排 8 張卡（' + (pkh.match(/pcard/g) || []).length + '）');
ok((sandbox.document.getElementById('sideL').innerHTML || '') === '' &&
   (sandbox.document.getElementById('sideR').innerHTML || '') === '', 'v2.9：左右側欄已收掉（畫面左右延伸）');
ok(sandbox.document.getElementById('pkRoster').className.indexOf('hide') < 0, 'v2.9：對戰時橫排玩家卡顯示中');

console.log('=== 4. 手機橫向不被裁切（CSS） ===');
ok(html.indexOf('--vvh') >= 0 && html.indexOf('--vvw') >= 0, '視窗變數 --vvh/--vvw 仍在（給其他版面用）');
ok(!/translate\(-50%, -50%\) rotate\(90deg\)/.test(html), 'v2.3：不再用中心點旋轉（直式維持手機原本方向）');
ok(!/width: var\(--vvh/.test(html), 'v2.3：遊戲畫面不再用「高寬互換」的旋轉尺寸');
ok(html.indexOf('updateViewportVars') >= 0, '有 JS 量測實際視窗尺寸');

console.log('=== 5. 線上：房主快照 → 客人套用 ===');
BH.settings.count = 4; BH.Battle.resetSlots(); BH.startBattle(); G.state = 'play';
const N = BH.Net;
N.on = true; N.role = 'host'; N.pid = 'host1';
N.slotOf = { host1: 0, guest1: 1 };
G.players[0].name = '房主'; G.players[1].name = '客人';
G.players[0].x = G.T * 3 + G.T / 2; G.players[0].y = G.T * 2 + G.T / 2;
G.players[1].x = G.T * 6 + G.T / 2; G.players[1].y = G.T * 5 + G.T / 2;
const snap = BH.buildSnap();
ok(!!snap && snap.c === G.cols && snap.r === G.rows, '快照帶地圖尺寸 ' + snap.c + '×' + snap.r + '');
ok(snap.g.length === G.rows && snap.g[0].length === G.cols, '快照帶完整地形（' + snap.g.length + ' 列）');
ok(snap.p.length === 4, '快照帶 4 位玩家');
ok(snap.pl.length === 2, '快照帶 pid → 位子對照');
const bytes = JSON.stringify(snap).length;
ok(bytes < 9000, '快照大小 ' + bytes + ' bytes（可接受）');

// 模擬客人端：清空狀態後套用
const hostGrid = G.grid.map(r => r.slice());
const hostTheme = G.theme;
const hx = G.players[0].x, hy = G.players[0].y;
G.grid = null; G.hazards = null; G.players = []; G.bombs = []; G.flames = []; G.items = [];
N.role = 'guest'; N.pid = 'guest1';
BH.applySnap(snap);
ok(G.cols === snap.c && G.rows === snap.r && G.T === snap.T, '客人端建立相同地圖尺寸與格子大小');
ok(G.theme === hostTheme, '客人端主題相同');
let gridDiff = 0;
for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) if (G.grid[y][x] !== hostGrid[y][x]) gridDiff++;
ok(gridDiff === 0, '地形完全一致（差異 ' + gridDiff + '）');
ok(G.players.length === 4, '客人端建立 4 位玩家');
ok(Math.abs(G.players[0].x - hx) < .01 && Math.abs(G.players[0].y - hy) < .01, '玩家位置一致');
ok(G.players[1].name === '客人', '玩家暱稱同步（' + G.players[1].name + '）');
ok(N.mySlot === 1, '客人認得自己的位子（slot=' + N.mySlot + '）');

console.log('=== 6. 線上：炸彈 / 火焰 / 道具同步 ===');
G.bombs.push({ cx: 2, cy: 3, px: 2 * G.T + G.T / 2, py: 3 * G.T + G.T / 2, timer: 1.8,
  power: 2, owner: G.players[0], passers: [], remoteArmed: false, mine: false,
  moving: null, flying: null, held: false, seed: 1.2 });
G.flames.push({ cx: 2, cy: 3, t: .3, dir: 'up', owner: G.players[0] });
G.items.push({ cx: 4, cy: 4, type: 'power', bob: 1 });
const s2 = BH.buildSnap();
ok(s2.b.length === 1 && s2.b[0][0] === 2 && s2.b[0][5] === 2, '炸彈資料同步（格 2,3 火力 2）');
ok(s2.f.length === 1 && s2.f[0][3] === 0, '火焰方向同步（up=0）');
ok(s2.it.length === 1 && s2.it[0][2] === 'power', '道具同步（' + s2.it[0][2] + '）');
N.role = 'host'; N.slotOf = { host1: 0, guest1: 1 };
const s2b = BH.buildSnap();
N.role = 'guest';
G.bombs = []; G.flames = []; G.items = [];
BH.applySnap(s2b);
ok(G.bombs.length === 1 && G.bombs[0].cx === 2 && G.bombs[0].power === 2, '客人端重建炸彈');
ok(G.bombs[0].owner === G.players[0], '炸彈 owner 對到客人端的玩家物件');
ok(G.flames.length === 1 && G.flames[0].dir === 'up', '客人端重建火焰');
ok(G.items.length === 1 && G.items[0].type === 'power', '客人端重建道具');

console.log('=== 7. 線上：客人輸入 → 房主套用 ===');
N.role = 'host';
N.inputs = {};
N.absorbInputs([{ pid: 'guest1', dx: 1, dy: 0, act: 0 }, { pid: 'guest1', dx: 1, dy: 0, act: 1 }]);
const sch = N.remoteScheme('guest1');
ok(sch.dirs().indexOf('right') >= 0, '客人按右 → 房主端 dirs 有 right');
ok(sch.action() === true, '客人按放彈 → action() 觸發一次');
ok(sch.action() === false, '同一包不會重複觸發');
N.absorbInputs([{ pid: 'guest1', dx: 0, dy: -1, act: 0 }]);
ok(sch.dirs().indexOf('up') >= 0 && sch.dirs().indexOf('right') < 0, '客人改按上 → 方向即時更新');

console.log('=== 8. 等待室：入場／觀戰切換 + AI 補位 ===');
N.roster = [
  { pid: 'host1', name: '房主', ch: 0, slot: 0, entry: 1, host: true },
  { pid: 'guest1', name: '客人', ch: 1, slot: 1, entry: 1 },
  { pid: 'guest2', name: '路人', ch: 2, slot: 2, entry: 0 }
];
N.count = 5; N.pid = 'host1'; N.hostPid = 'host1'; N.role = 'host';
N.renderRoster();
const rosterHtml = sandbox.document.getElementById('netRoster').innerHTML || '';
ok((rosterHtml.match(/netslot/g) || []).length === 5, '等待室畫出 5 個位子（實際 ' + (rosterHtml.match(/netslot/g) || []).length + '）');
ok(rosterHtml.indexOf('AI 補位') >= 0, '空位標示 AI 補位');
ok(rosterHtml.indexOf('👑') >= 0, '房主有皇冠標記');
N.preparePlayers();
ok(G.players.length === 5, '5 人房 → 5 位角色');
const humans = G.players.filter(p => !p.ai).length;
ok(humans === 2, '只有 2 位入場人類（實際 ' + humans + '）');
ok(G.players.filter(p => p.ai).length === 3, '其餘 3 位由 AI 補位');
ok(G.players[0].scheme !== G.players[1].scheme, '房主與客人用不同的控制來源');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
