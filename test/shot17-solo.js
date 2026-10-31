// 截圖目檢：第 7 關四種怪物（含飛行穿牆怪）
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
      if (k === 'canvas') return { width: 720, height: 540 };
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
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
    id, style: {}, dataset: {}, children: [], width: 720, height: 540,
    _cls: new Set(),
    classList: { add(c){el._cls.add(c);}, remove(c){el._cls.delete(c);}, toggle(){}, contains(c){return el._cls.has(c);} },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; },
    getContext: () => realCtx ? mkCtx2D(realCtx) : mkCtx2D(null),
    querySelectorAll: () => [], querySelector: () => mkEl(id+'-q'),
    getBoundingClientRect: () => ({ left:0, top:0, width:720, height:540 }),
    focus(){}, click(){}, textContent: '', value: ''
  };
  let _inner=''; Object.defineProperty(el,'innerHTML',{ get(){return _inner;}, set(v){_inner=v; el.children=[];} });
  return el;
}
const els = {};
const realCanvas = createCanvas(720, 540);
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
BH.settings.size = 'M'; BH.settings.ctrl = 'kb';
BH.startSolo(7);
G.state = 'play';
G.players[0].invuln = 0;
// 把四種怪各放一隻在玩家附近，排成一排方便目檢
const T = G.T;
const kinds = ['walker', 'chaser', 'speeder', 'flyer'];
G.enemies = kinds.map(function (tp, i) {
  const e = BH.makeEnemy(3 + i * 2, 3, tp, 7);
  e.x = (3 + i * 2) * T + T / 2; e.y = 3 * T + T / 2;
  e.vx = 0; e.vy = 0;   // 靜止方便截圖（flyer 除外，給它一點漂移）
  if (tp === 'flyer') { e.vx = 12; e.vy = 0; }
  return e;
});
G.gameT = 1.2;
for (let i = 0; i < 12; i++) { G.enemies.forEach(function (e) { BH.updateEnemy(e, 1/60); }); }
// render
vm.runInContext("try{Screen.show('game');}catch(e){console.log('show:',e.message)}; resizeView(); render()", sandbox, { filename: 'render' });
fs.writeFileSync(__dirname + '/shot17-solo.png', realCanvas.toBuffer('image/png'));
console.log('saved shot17-solo.png; enemies:', G.enemies.map(e => e.type).join(','));
