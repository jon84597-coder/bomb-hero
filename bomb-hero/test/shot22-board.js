// 截圖目檢 v1.4：繪本風木箱草地 + 精靈圖角色 + 開門光效
const fs = require('fs');
const vm = require('vm');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

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
      if (k === 'drawImage') return (img, ...a) => { if (real) { if (img && img._bmp) real.drawImage(img._bmp, ...a); else real.drawImage(img, ...a); } };
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
// 直接注入已解碼的點陣圖（@napi-rs/canvas 沒有 DOM Image）
(async function () {
const NAMES = ['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick'];
const bmps = await Promise.all(NAMES.map(n => loadImage(__dirname + '/../art/chars/' + n + '.webp')));
NAMES.forEach(function (n, i) {
  BH.Sprites.inject(n, { _bmp: bmps[i], naturalWidth: bmps[i].width, naturalHeight: bmps[i].height });
});
console.log('sprites ready', BH.Sprites.readyCount());

BH.settings.size = 'M'; BH.settings.ctrl = 'kb'; BH.settings.count = 4;
BH.settings.hazards = 'on'; BH.settings.soloDiff = 'normal';
BH.settings.soloChar = 1;
BH.startSolo(1, false);
G.state = 'play';
const T = G.T;
G.enemies.length = 0;
G.bombs.length = 0; G.flames.length = 0; G.bubbles.length = 0;
G.items.length = 0; G.eggs.length = 0;
G.particles.length = 0;

// 4 隻不同動物站在盤面上（走路中）
const chars = [0, 2, 5, 7];
const fakeScheme = { dirs: () => [], action: () => false, actionHeld: () => false };
G.players.length = 0;
chars.forEach(function (ci, i) {
  const p = BH.makePlayer(i, ci, fakeScheme, { px: 0, py: 0 });
  p.x = (3 + i * 3) * T + T / 2;
  p.y = (4 + (i % 2) * 3) * T + T / 2;
  p.facing = ['right', 'left', 'down', 'up'][i];
  p.moving = true;
  p.walkT = 0.06 + i * 0.09;
  p.invuln = 0;
  G.players.push(p);
});
// 開著的門 + 光效
if (G.door) { G.door.revealed = true; G.door.open = false; }
BH.openDoorForce();
G.door.open = true;
BH.sfxProbe = null;
G.gameT = 3.6;
vm.runInContext("try{Screen.show('game');}catch(e){}; resizeView(); Game.camSnap=true; updateCamera(0.016); render()", sandbox, { filename: 'render' });
fs.writeFileSync(__dirname + '/shot22-board.png', realCanvas.toBuffer('image/png'));
console.log('saved shot22-board.png');
})();
