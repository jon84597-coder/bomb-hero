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
BH.settings.hazards = 'on'; BH.settings.sd = 'off'; BH.settings.revenge = 'off';
BH.settings.soloChar = 0;
BH.Battle.resetSlots();
BH.startBattle();
G.state = 'play';
const T = G.T;
for (let y = 1; y < G.rows - 1; y++) {
  for (let x = 1; x < G.cols - 1; x++) { G.grid[y][x] = 0; G.hazards[y][x] = null; }
}
// 4 位玩家 → 兔 / 狗 / 熊貓 / 青蛙，各自不同面向與走路相位
const chars = [0, 2, 5, 6];
G.players.length = 0;
chars.forEach(function (ci, i) {
  const p = BH.makePlayer(i, ci, { dirs: () => [], action: () => false, actionHeld: () => false }, { px: 0, py: 0 });
  p.x = (3 + i * 3) * T + T / 2;
  p.y = (4 + (i % 2) * 3) * T + T / 2;
  p.facing = ['right', 'left', 'down', 'up'][i];
  p.moving = i !== 2;
  p.walkT = 0.12 + i * 0.13;
  p.invuln = 0;
  G.players.push(p);
});
G.enemies.length = 0; G.bombs.length = 0; G.flames.length = 0; G.bubbles.length = 0;
G.items.length = 0; G.eggs.length = 0; G.door = null;
G.gameT = 1.2;
vm.runInContext("try{Screen.show('game');}catch(e){}; resizeView(); Game.camSnap=true; updateCamera(0.016); render()", sandbox, { filename: 'render' });
fs.writeFileSync(__dirname + '/shot21-ingame.png', realCanvas.toBuffer('image/png'));
console.log('saved shot21-ingame.png');
