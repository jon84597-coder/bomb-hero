// 截圖目檢 v1.3：8 隻動物角色 + 走路動畫分解（選角卡片用的就是這套畫法）
const fs = require('fs');
const vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
code = code.replace(/^\s*\(function \(\) \{/, '').replace(/\}\)\(\);\s*$/, '');

const W = 1180, H = 700;
const canvas = createCanvas(W, H);
const g = canvas.getContext('2d');

function mkEl(id) {
  const el = {
    id, style: {}, dataset: {}, children: [], width: W, height: H, _cls: new Set(),
    classList: { add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); }, toggle() {}, contains(c) { return el._cls.has(c); } },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; },
    getContext: () => g, querySelectorAll: () => [], querySelector: () => mkEl(id + '-q'),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }),
    focus() {}, click() {}, textContent: '', value: ''
  };
  let _inner = '';
  Object.defineProperty(el, 'innerHTML', { get() { return _inner; }, set(v) { _inner = v; el.children = []; } });
  return el;
}
const els = {};
function getId(id) { if (!els[id]) els[id] = mkEl(id); return els[id]; }
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
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.window.window = sandbox;
sandbox.addEventListener = function () {}; sandbox.removeEventListener = function () {};
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'index.html' });
const BH = sandbox.window.__BH;
const CH = BH.CHARACTERS;

// ---- 背景：森林草地（對應選角圖的氛圍） ----
const sky = g.createLinearGradient(0, 0, 0, H);
sky.addColorStop(0, '#cfe9c3');
sky.addColorStop(.55, '#e8f4d8');
sky.addColorStop(1, '#bfe0a8');
g.fillStyle = sky; g.fillRect(0, 0, W, H);
// 遠景樹影
g.fillStyle = 'rgba(120,180,120,.35)';
for (let i = 0; i < 14; i++) {
  const x = 40 + i * 88, r = 46 + (i % 3) * 12;
  g.beginPath(); g.arc(x, 96 + (i % 2) * 16, r, 0, 6.283); g.fill();
}
g.fillStyle = 'rgba(255,255,255,.55)';
for (let i = 0; i < 40; i++) {
  const x = Math.random() * W, y = 150 + Math.random() * 60;
  g.beginPath(); g.arc(x, y, 1.6 + Math.random() * 1.8, 0, 6.283); g.fill();
}

// ---- 標題 ----
g.textAlign = 'center';
g.fillStyle = '#2b4a2b';
g.font = '900 30px sans-serif';
g.fillText('BOMB HERO  v1.3  8 ANIMALS', W / 2, 52);
g.font = '700 15px sans-serif';
g.fillStyle = '#4a6b4a';
g.fillText('each card = walk cycle (arms + legs + bob) / blink / hop-on-select', W / 2, 78);

// ---- 8 隻角色 ----
const cw = W / 8;
CH.forEach(function (c, i) {
  const cx = cw * (i + .5);
  const R = 34;
  const footY = 320;
  // 卡片底
  g.fillStyle = 'rgba(255,255,255,.62)';
  if (g.roundRect) { g.beginPath(); g.roundRect(cx - cw * .44, 108, cw * .88, 250, 18); g.fill(); }
  else { g.fillRect(cx - cw * .44, 108, cw * .88, 250); }
  // 名字
  g.textAlign = 'center';
  g.fillStyle = '#243b24';
  g.font = '900 17px sans-serif';
  g.fillText(c.name, cx, 136);
  g.fillStyle = '#6b7f6b';
  g.font = '700 12px sans-serif';
  g.fillText(c.en, cx, 154);
  // 地面陰影
  g.fillStyle = 'rgba(0,0,0,.16)';
  g.beginPath(); g.ellipse(cx, footY + 2, R * .74, R * .2, 0, 0, 6.283); g.fill();
  // 角色（走路中，每隻相位錯開）
  BH.drawCharBody(g, c, cx, footY, R, {
    walk: 1.1 + i * .9, moving: true, facing: i % 2 ? 'left' : 'right', blink: i === 3, amp: R / 14
  });
  // 特色標籤
  g.fillStyle = '#8a5a00';
  g.font = '900 14px sans-serif';
  g.fillText(c.tag, cx, 340);
});

// ---- 走路動畫分解（兔兔 8 個相位） ----
g.fillStyle = 'rgba(43,74,43,.9)';
g.font = '900 18px sans-serif';
g.textAlign = 'left';
g.fillText('WALK CYCLE  (rabbit, 8 phases)', 40, 400);

const phases = 8;
for (let i = 0; i < phases; i++) {
  const cx = 82 + i * 130, footY = 610, R = 38;
  g.fillStyle = 'rgba(255,255,255,.5)';
  if (g.roundRect) { g.beginPath(); g.roundRect(cx - 56, 430, 112, 210, 16); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.15)';
  g.beginPath(); g.ellipse(cx, footY + 2, R * .74, R * .2, 0, 0, 6.283); g.fill();
  BH.drawCharBody(g, CH[0], cx, footY, R, {
    walk: i / phases * Math.PI * 2, moving: true, facing: 'right', amp: R / 14
  });
  g.textAlign = 'center';
  g.fillStyle = '#4a6b4a';
  g.font = '700 11px sans-serif';
  g.fillText((i / phases * 360).toFixed(0) + '°', cx, 646);
}

fs.writeFileSync(__dirname + '/shot21-chars.png', canvas.toBuffer('image/png'));
console.log('saved shot21-chars.png');
