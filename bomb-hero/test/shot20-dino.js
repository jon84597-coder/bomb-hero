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

// v1.2 目檢：恐龍蛋 + 騎恐龍 + 吐火冷卻提示 + 被炸到的道具閃光 + 出口門
BH.settings.soloDiff = 'normal';
BH.settings.soloTime = 0;
BH.settings.size = 'M';
BH.startSolo(3, false);          // 冰雪原（第 3 關）
G.state = 'play';
const T2 = G.T;
for (let y = 1; y < G.rows - 1; y++) {
  for (let x = 1; x < G.cols - 1; x++) { G.grid[y][x] = 0; G.hazards[y][x] = null; }
}
G.enemies.length = 0;
G.eggs.length = 0;
G.eggs.push({ x: 5, y: 3, bob: 0.6, wob: 0 });
G.eggs.push({ x: 11, y: 8, bob: 2.1, wob: 0 });
G.eggs.push({ x: 8, y: 10, bob: 4.4, wob: 0 });
G.items.length = 0;
BH.spawnItem(3, 6, 'fire');
BH.spawnItem(9, 6, 'remote');
G.items[1].glint = 0.85;
G.door = { x: 12, y: 2, revealed: true, open: false };
const me = G.players[0];
me.invuln = 0; me.facing = 'right';
me.x = 7 * T2 + T2 / 2; me.y = 6 * T2 + T2 / 2;
me.dino = true; me.dinoT = 2.4; me.fireCd = 1.8; me.moving = true; me.walkT = 0.3;
G.bombs.length = 0; G.flames.length = 0; G.bubbles.length = 0;
// 一顆遙控彈 + 一段火焰，讓畫面有東西看
G.bombs.push({ cx: 9, cy: 4, px: 9 * T2 + T2 / 2, py: 4 * T2 + T2 / 2, timer: 9999, power: 2,
  owner: me, passers: [], remoteArmed: true, mine: false, mineLife: 10, moving: null, flying: null,
  held: false, seed: 1, armT: 30 });
G.bombs.push({ cx: 10, cy: 8, px: 10 * T2 + T2 / 2, py: 8 * T2 + T2 / 2, timer: 1.2, power: 2,
  owner: null, passers: [], remoteArmed: false, mine: false, mineLife: 10, moving: null, flying: null,
  held: false, seed: 2, armT: 12 });
G.flames.push({ cx: 4, cy: 5, type: 'center', dir: 'right', t: .4, owner: me });
G.flames.push({ cx: 5, cy: 5, type: 'mid', dir: 'right', t: .4, owner: me });
G.gameT = 1.1;
vm.runInContext("try{Screen.show('game');}catch(e){}; resizeView(); Game.camSnap=true; updateCamera(0.016); render()", sandbox, { filename: 'render' });
fs.writeFileSync(__dirname + '/shot20-dino.png', realCanvas.toBuffer('image/png'));
console.log('saved shot20-dino.png');
