// 截圖目檢：推車拋彈飛行畫面
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
      if (typeof t[k] !== 'undefined') return t[k];
      if (real && typeof real[k] === 'function') return (...a) => real[k](...a);
      if (real && k in real) return real[k];
      return () => {};
    },
    set(t, k, v) { t[k] = v; if (real) { try { real[k] = v; } catch (e) {} } return true; }
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
sandbox.window = sandbox; sandbox.addEventListener = () => {}; sandbox.removeEventListener = () => {};
sandbox.globalThis = sandbox; sandbox.window.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'index.html' });
const BH = sandbox.window.__BH, G = BH.Game;

BH.settings.size = 'M'; BH.settings.hazards = 'off'; BH.settings.sd = 'off'; BH.settings.revenge = 'on';
BH.Battle.resetSlots();
BH.startBattle(); G.state = 'play';
const T = G.T;
const P = G.players[0];
// 不動玩家：直接看隨機出生分布
G.players.forEach(function(q){ q.invuln = 0; });
for (let i = 0; i < 30; i++) BH.updateWorld(1/60);
console.log('spawns: ' + G.players.map(function(q){ return Math.floor(q.x/T) + ',' + Math.floor(q.y/T); }).join('  '));
vm.runInContext("try{Screen.show('game');}catch(e){console.log('show:',e.message)}; render()", sandbox, { filename: 'render' });
fs.writeFileSync(__dirname + '/shot-v11.png', realCanvas.toBuffer('image/png'));
console.log('saved shot-v11.png');
