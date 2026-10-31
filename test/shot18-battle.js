// 截圖目檢 v1.1：對戰場景（陰影／新角色美術／死亡擊殺對話框）
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
BH.settings.size = 'L'; BH.settings.ctrl = 'kb'; BH.settings.count = 4;
BH.settings.hazards = 'on'; BH.settings.sd = 'on'; BH.settings.revenge = 'on';
BH.Battle.resetSlots();
BH.startBattle();
G.state = 'play';
const T = G.T;

// 四位玩家排開，人人穿不同裝
const spots = [[4, 5], [8, 5], [6, 3], [10, 8]];
G.players.forEach(function (p, i) {
  const s = spots[i % spots.length];
  p.x = s[0] * T + T / 2; p.y = s[1] * T + T / 2;
  p.invuln = 0; p.alive = true; p.gloat = 0; p.moving = false;
  p.facing = i % 2 ? 'left' : 'right';
  // 清空腳下
  G.grid[s[1]][s[0]] = 0;
});

// 玩家 2 炸死玩家 1（死亡＋擊殺對話框）
BH.killBattlePlayer(G.players[1], G.players[0]);
// 玩家 3 也放一句得意的
BH.bubbleKill(G.players[2]);

// 炸彈＋火焰＋道具＋怪物，畫面熱鬧一點
G.bombs.length = 0;
G.bombs.push({ cx: 6, cy: 7, px: 6 * T + T / 2, py: 7 * T + T / 2, timer: 1.4, power: 2,
  owner: G.players[0], passers: [], remoteArmed: false, mine: false, moving: null, held: false,
  flying: null, seed: 1.2 });
G.bombs.push({ cx: 9, cy: 4, px: 9 * T + T / 2, py: 4 * T + T / 2, timer: 2.2, power: 3,
  owner: G.players[2], passers: [], remoteArmed: true, mine: false, moving: null, held: false,
  flying: null, seed: 3.1 });
G.flames = [{ cx: 4, cy: 7, type: 'center', dir: null, t: .38, owner: G.players[0] }];
G.items = [
  { cx: 7, cy: 6, type: 'fire', bob: 1.1 },
  { cx: 11, cy: 6, type: 'bomb', bob: 2.4 },
  { cx: 5, cy: 9, type: 'speed', bob: .6 }
];
G.enemies = [];
['walker', 'chaser'].forEach(function (tp, i) {
  const e = BH.makeEnemy(12, 3 + i * 4, tp, 4);
  e.x = (12) * T + T / 2; e.y = (3 + i * 4) * T + T / 2;
  G.enemies.push(e);
});
G.gameT = 1.35;
BH.updateBubbles(.32);
for (let i = 0; i < 6; i++) G.players.forEach(function (p) { if (p.alive) p.walkT += 1 / 60; });

vm.runInContext("try{Screen.show('game');}catch(e){}; resizeView(); Game.camSnap=true; updateCamera(0.016); render()", sandbox, { filename: 'render' });
fs.writeFileSync(__dirname + '/shot18-battle.png', realCanvas.toBuffer('image/png'));
console.log('saved shot18-battle.png  bubbles=' + G.bubbles.length);
