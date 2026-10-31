// 截圖目檢 v1.5：部位骨架（頭/手/腳）＋ 石頭/木箱分色 ＋ 老虎 BOSS ＋ 小龍坐騎
const fs = require('fs');
const vm = require('vm');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
code = code.replace(/^\s*\(function \(\) \{/, '').replace(/\}\)\(\);\s*$/, '');

const W = 820, H = 620;
function mkCtx2D(real) {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return { width: W, height: H };
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
    id, style: {}, dataset: {}, children: [], width: W, height: H,
    _cls: new Set(),
    classList: { add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); }, toggle() {}, contains(c) { return el._cls.has(c); } },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; },
    getContext: () => realCtx ? mkCtx2D(realCtx) : mkCtx2D(null),
    querySelectorAll: () => [], querySelector: () => mkEl(id + '-q'),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }),
    focus() {}, click() {}, textContent: '', value: ''
  };
  let _inner = ''; Object.defineProperty(el, 'innerHTML', { get() { return _inner; }, set(v) { _inner = v; el.children = []; } });
  return el;
}
const els = {};
const realCanvas = createCanvas(W, H);
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

(async function () {
  // 動物整張圖（頭像用）
  const NAMES = ['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick'];
  const bmps = await Promise.all(NAMES.map(n => loadImage(__dirname + '/../art/chars/' + n + '.webp')));
  NAMES.forEach(function (n, i) {
    BH.Sprites.inject(n, { _bmp: bmps[i], naturalWidth: bmps[i].width, naturalHeight: bmps[i].height });
  });
  // 部位圖
  let nParts = 0;
  for (const key of Object.keys(BH.IMG_PARTS)) {
    for (const pn of Object.keys(BH.IMG_PARTS[key].p)) {
      const p = __dirname + '/../art/parts/' + key + '_' + pn + '.webp';
      if (!fs.existsSync(p)) continue;
      const b = await loadImage(p);
      BH.Parts.inject(key, pn, { _bmp: b, naturalWidth: b.width, naturalHeight: b.height });
      nParts++;
    }
  }
  console.log('parts ready', nParts, 'has rabbit', BH.Parts.has('rabbit'), 'has boss', BH.Parts.has('boss'));

  BH.settings.size = 'M'; BH.settings.ctrl = 'kb'; BH.settings.count = 4;
  BH.settings.hazards = 'on'; BH.settings.soloDiff = 'normal';
  BH.settings.soloChar = 1;
  BH.startSolo(1, false);
  G.state = 'play';
  const T = G.T;
  G.enemies.length = 0; G.bombs.length = 0; G.flames.length = 0; G.bubbles.length = 0;
  G.items.length = 0; G.eggs.length = 0; G.particles.length = 0;

  const fakeScheme = { dirs: () => [], action: () => false, actionHeld: () => false };
  G.players.length = 0;
  [0, 2, 5, 7].forEach(function (ci, i) {
    const p = BH.makePlayer(i, ci, fakeScheme, { px: 0, py: 0 });
    p.x = (3 + i * 3) * T + T / 2;
    p.y = (4 + (i % 2) * 3) * T + T / 2;
    p.facing = ['right', 'left', 'down', 'up'][i];
    p.moving = true; p.walkT = 0.06 + i * 0.09; p.invuln = 0;
    G.players.push(p);
  });
  // 溜冰鞋道具 + 老虎 BOSS
  G.items.push({ cx: 3, cy: 8, type: 'speed', bob: 0, glint: 0 });
  G.items.push({ cx: 5, cy: 8, type: 'fire', bob: 0, glint: 0 });
  const boss = BH.makeBoss(9, 6, 10);
  boss.x = 10 * T; boss.y = 6 * T; boss.walkT = .3; boss.dirName = 'left';
  G.enemies.push(boss);
  // 開著的門
  BH.openDoorForce();
  if (G.door) { G.door.open = true; }
  G.gameT = 3.6;
  vm.runInContext("try{Screen.show('game');}catch(e){}; resizeView(); Game.camSnap=true; updateCamera(0.016); render()", sandbox, { filename: 'render' });
  fs.writeFileSync(__dirname + '/shot23-board.png', realCanvas.toBuffer('image/png'));
  console.log('saved shot23-board.png');

  // ---- 第二張：小龍坐騎 + 骨架分解 ----
  const G2 = G;
  G2.players[0].dino = true; G2.players[0].dinoT = 1; G2.players[0].fireCd = 0;
  G2.players[0].moving = true;
  vm.runInContext("render()", sandbox, { filename: 'render2' });
  fs.writeFileSync(__dirname + '/shot23-dino.png', realCanvas.toBuffer('image/png'));
  console.log('saved shot23-dino.png');

  // ---- 第三張：8 隻角色 + 老虎 + 小龍的骨架大圖（檢查接縫） ----
  const sheet = createCanvas(4 * 220, 3 * 240);
  const sg = mkCtx2D(sheet.getContext('2d'));
  sg.fillStyle = '#f6f1e6'; sg.fillRect(0, 0, sheet.width, sheet.height);
  const keys = ['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick', 'boss', 'dragon'];
  keys.forEach(function (k, i) {
    const cx = 110 + (i % 4) * 220, base = 235 + Math.floor(i / 4) * 240;
    BH.drawRigChar(sg, k, cx, base, 200, { walk: Math.PI / 2, moving: true, facing: 'right', amp: 1, idle: 0 });
    sg.fillStyle = '#7b4a1f'; sg.font = '16px sans-serif';
    sg.fillText(k, cx - 24, base + 8);
  });
  fs.writeFileSync(__dirname + '/shot23-sheet.png', sheet.toBuffer('image/png'));
  console.log('saved shot23-sheet.png');
})();
