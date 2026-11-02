// test/shot71-v413-monsters.js — 20 隻小怪圖（用沙盒的 vm context 正確地把遊戲 ctx 換掉）
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');
const { makeEnv } = require('./_sandbox');

const OUT = path.join(__dirname, '_v413');
fs.mkdirSync(OUT, { recursive: true });

const env = makeEnv();
const P = env.BH, G = P.Game;
P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
P.settings.ctrl = 'kb'; P.settings.soloDiff = 'normal'; P.settings.soloTime = 300;
P.startSolo(1, false);
G.state = 'play';

// 建立真 canvas 與「橋接 ctx」：把遊戲的 ctx 換成這個，drawEnemyArt 就會畫到真 canvas
const W = 1080, H = 620;
const canvas = createCanvas(W, H);
const real = canvas.getContext('2d');
const bridge = new Proxy({}, {
  get(t, k) {
    if (k === 'canvas') return { width: W, height: H };
    if (k === 'createLinearGradient') return function () { return real.createLinearGradient.apply(real, arguments); };
    if (k === 'createRadialGradient') return function () { return real.createRadialGradient.apply(real, arguments); };
    if (k === 'measureText') return function () { return real.measureText.apply(real, arguments); };
    if (typeof real[k] !== 'undefined') {
      const v = real[k];
      return typeof v === 'function' ? v.bind(real) : v;
    }
    return function () {};
  },
  set(t, k, v) { real[k] = v; return true; }
});

// 關鍵：在沙盒自己的 vm context 裡執行 → 可以改到 script scope 的 ctx（let ctx）
const sb = env.sandbox;
try {
  vm.runInContext('ctx = __BRIDGE__;', vm.createContext(Object.assign(
    Object.create(Object.getPrototypeOf(sb)),
    { __BRIDGE__: bridge, window: sb, document: sb.document, console: console,
      Math: Math, JSON: JSON, Object: Object, Array: Array, Date: Date,
      parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, isFinite: isFinite,
      requestAnimationFrame: sb.requestAnimationFrame, localStorage: sb.localStorage,
      navigator: sb.navigator, location: sb.location, performance: sb.performance,
      setTimeout: sb.setTimeout, clearTimeout: sb.clearTimeout, setInterval: sb.setInterval,
      clearInterval: sb.clearInterval, Uint8ClampedArray: Uint8ClampedArray,
      Infinity: Infinity, NaN: NaN, undefined: undefined }
  )));
} catch (e) {
  console.log('ctx swap via new context failed:', e.message);
}

// 背景
real.setTransform(1, 0, 0, 1, 0, 0);
real.fillStyle = '#8fc98a'; real.fillRect(0, 0, W, H);
real.fillStyle = 'rgba(60,90,55,.28)';
for (let i = 0; i < 220; i++) real.fillRect((i * 97) % W, (i * 53) % H, 2, 2);
real.fillStyle = '#20301c'; real.font = '700 26px sans-serif';
real.fillText('v4.13  20 monsters (star = has skill)', 20, 40);
real.font = '16px sans-serif';
real.fillText('new 10: scavenger / sapper / bomber / panda / penguin / octopus / robot / wizard / wisp / hornet', 20, 66);

// 逐隻畫
const list = P.ENEMY_SPECIES;
const cols = 10, cw = W / cols, ch = (H - 90) / 2;
let drawn = 0;
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < cols; c++) {
    const sp = list[r * cols + c];
    if (!sp) continue;
    const x = cw * c + cw / 2, y = 90 + ch * r + ch / 2 - 10;
    real.fillStyle = 'rgba(0,0,0,.22)';
    real.beginPath(); real.ellipse(x, y + 40, 25, 8, 0, 0, 6.283); real.fill();
    const e = { type: sp.id, spec: sp.id, color: sp.color, color2: sp.color2, r: sp.r,
                kind: sp.kind, wing: sp.wing, walkT: 1.2, vx: 1, dirName: 'right', bobP: 0.3 };
    try { P.drawEnemyArt(e, x, y, false, 1.2); drawn++; } catch (err) { console.log('draw ' + sp.id + ' failed: ' + err.message); }
    real.fillStyle = '#20301c'; real.font = '700 15px sans-serif'; real.textAlign = 'center';
    real.fillText(sp.name + (sp.skill ? ' *' : ''), x, y + 68);
    real.textAlign = 'left';
  }
}
fs.writeFileSync(path.join(OUT, 'monsters-20.png'), canvas.toBuffer('image/png'));
console.log('saved monsters-20.png (' + drawn + ' drawn / ' + list.length + ')');
