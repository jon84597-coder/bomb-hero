// 截圖目檢 v1.1：輸送帶方向箭頭 + 彩色傳送門（紅藍綠紫黃白黑）
const fs = require('fs');
const vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
code = code.replace(/^\s*\(function \(\) \{/, '').replace(/\}\)\(\);\s*$/, '');

function mkCtx2D(real) {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return { width: 760, height: 560 };
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return (...a) => (real && real[k]) ? real[k](...a) : grad;
      if (k === 'measureText') return (s) => ({ width: (real && real.measureText) ? real.measureText(s).width : 10 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (real && typeof real[k] === 'function') return (...a) => real[k](...a);
      if (real && k in real) return real[k];
      return () => {};
    },
    set(t, k, v) { if (real) { try { real[k] = v; } catch (e) {} } return true; }
  });
}
function mkEl(id, realCtx) {
  const el = {
    id, style: {}, dataset: {}, children: [], width: 760, height: 560,
    _cls: new Set(),
    classList: { add(c){el._cls.add(c);}, remove(c){el._cls.delete(c);}, toggle(){}, contains(c){return el._cls.has(c);} },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; },
    getContext: () => realCtx ? mkCtx2D(realCtx) : mkCtx2D(null),
    querySelectorAll: () => [], querySelector: () => mkEl(id+'-q'),
    getBoundingClientRect: () => ({ left:0, top:0, width:760, height:560 }),
    focus(){}, click(){}, textContent: '', value: ''
  };
  let _inner=''; Object.defineProperty(el,'innerHTML',{ get(){return _inner;}, set(v){_inner=v; el.children=[];} });
  return el;
}
const els = {};
const realCanvas = createCanvas(760, 560);
const realCtx = realCanvas.getContext('2d');
function getId(id) {
  if (id === 'cv') { if (!els[id]) els[id] = mkEl(id, realCtx); return els[id]; }
  if (!els[id]) els[id] = mkEl(id); return els[id];
}
const sandbox = {
  console, Math, JSON, Object, Array, Date, parseInt, parseFloat, isNaN, isFinite,
  Uint8ClampedArray, Infinity, NaN, undefined,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0,
  performance: { now: () => Date.now() },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { getGamepads: () => [] },
  document: {
    getElementById: getId, querySelectorAll: () => [], querySelector: () => mkEl('q'),
    addEventListener() {}, removeEventListener() {}, createElement: t => mkEl(t),
    body: mkEl('body'), documentElement: mkEl('html')
  }
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
sandbox.window.window = sandbox;
sandbox.addEventListener = function () {};
sandbox.removeEventListener = function () {};
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'index.html' });

const BH = sandbox.window.__BH;
const G = BH.Game;
BH.settings.size = 'M'; BH.settings.ctrl = 'kb'; BH.settings.count = 4;
BH.settings.hazards = 'on';
BH.Battle.resetSlots();
BH.startBattle();
G.state = 'play';
const T = G.T;

// 清空一整區當地畫布
for (let y = 1; y < G.rows - 1; y++) {
  for (let x = 1; x < G.cols - 1; x++) {
    G.grid[y][x] = 0;
    G.hazards[y][x] = null;
  }
}
// 輸送帶：上／右／下／左 各一條
const beltDirs = [['up', 4, 3], ['right', 6, 3], ['down', 8, 3], ['left', 10, 3]];
beltDirs.forEach(function (b) { G.hazards[b[2]][b[1]] = { type: 'convey', dir: b[0] }; });
// 一條往右的長輸送帶（看得出連續感）
for (let x = 3; x <= 5; x++) G.hazards[6][x] = { type: 'convey', dir: 'right' };

// 七對彩色傳送門，同色兩兩成對
const pairSpots = [[2, 2], [5, 2], [8, 2], [11, 2], [2, 8], [5, 8], [8, 8]];
pairSpots.forEach(function (sp, i) {
  const ci = i % BH.WARP_COLORS.length;
  const a = { x: sp[0], y: sp[1] };
  const b = { x: sp[0] + 1, y: sp[1] };
  G.grid[a.y][a.x] = 0; G.grid[b.y][b.x] = 0;
  G.hazards[a.y][a.x] = { type: 'warp', link: b, ci: ci, color: BH.WARP_COLORS[ci].hex };
  G.hazards[b.y][b.x] = { type: 'warp', link: a, ci: ci, color: BH.WARP_COLORS[ci].hex };
});
// 玩家站在輸送帶上、冰面旁邊
G.players.forEach(function (p, i) {
  p.alive = true; p.invuln = 0; p.moving = false; p.cart = false;
  const s = [[4, 5], [7, 5], [9, 5], [11, 5]][i];
  p.x = s[0] * T + T / 2; p.y = s[1] * T + T / 2;
  p.facing = 'right';
});
G.gameT = 0.9;
G.bombs = []; G.flames = []; G.items = []; G.bubbles = [];

vm.runInContext("try{Screen.show('game');}catch(e){}; resizeView(); Game.camSnap=true; updateCamera(0.016); render()", sandbox, { filename: 'render' });
fs.writeFileSync(__dirname + '/shot19-hazard.png', realCanvas.toBuffer('image/png'));
console.log('saved shot19-hazard.png');
