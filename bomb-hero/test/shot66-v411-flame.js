// test/shot66-v411-flame.js — 直接呼叫遊戲真正的 drawFlame，把結果畫成 PNG 目檢
//   用沙盒跑 index.html 的 script，但把 canvas ctx 換成真實的 @napi-rs/canvas
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { makeEnv } = require('./_sandbox');

const OUT = path.join(__dirname, '_v411');
fs.mkdirSync(OUT, { recursive: true });
const env = makeEnv();
const P = env.BH, G = P.Game;

// 用真 canvas 跑「真的遊戲程式碼」：
// 做法 → 讓沙盒的 document.createElement('canvas') 回傳真 canvas，
//        然後在沙盒裡執行一小段程式，用 drawFlameOn 把火焰畫到真 canvas 上。
const realCanvases = [];
const sb = env.sandbox;
const origCreate = sb.document.createElement;
sb.document.createElement = function (tag) {
  if (tag === 'canvas') {
    const cv = createCanvas(900, 560);
    realCanvases.push(cv);
    return {
      width: cv.width, height: cv.height,
      getContext: () => cv.getContext('2d'),
      style: {}, addEventListener() {}, removeEventListener() {}
    };
  }
  return origCreate.call(sb.document, tag);
};

// 沙盒的 ctx 是 Proxy 假物件 → drawFlameOn 會把 ctx 換成目標 g。
// 我們需要「真的 ctx」。做法：在沙盒裡直接把 canvas 變數指向 @napi-rs 的 ctx。
// sandbox 的 global 沒有 createCanvas → 從外部注入。
const realCtxHolder = { __REAL_CTX__: null };
const vm = require('vm');
vm.createContext(realCtxHolder);
const canvasForGame = createCanvas(900, 560);
const gameCtx = canvasForGame.getContext('2d');
realCtxHolder.__REAL_CTX__ = gameCtx;

// 在沙盒裡執行：把真的 ctx 塞進去（ctx 是 script scope 的 let，外部不可賦值）
// → 改走 drawFlameOn(g,...) 這條路：它會把 ctx 換成 g 再畫。
// 所以只要讓 g 是一個「代理到真 canvas 的假 ctx」即可。
function bridge(real) {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return { width: 900, height: 560 };
      // 漸層必須是「真的」漸層物件，否則 fillStyle 會失效（顏色全部掉光）
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
}
const bridgeCtx = bridge(gameCtx);

// 準備遊戲狀態
P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
P.settings.ctrl = 'kb'; P.settings.soloDiff = 'normal'; P.settings.soloTime = 300;
P.startSolo(1, false);
G.state = 'play';
G.gameT = 1.2;

// 背景
gameCtx.fillStyle = '#8fc98a'; gameCtx.fillRect(0, 0, 900, 560);
gameCtx.fillStyle = 'rgba(60,90,55,.3)';
for (let i = 0; i < 90; i++) gameCtx.fillRect((i * 97) % 900, (i * 53) % 560, 2, 2);

// 畫一整個十字爆炸（爆心 + 上下左右各 2 格）
const T = 62;
const cx = 5, cy = 4;
function flameAt(fcx, fcy, type, dir) {
  P.drawFlameOn(bridgeCtx, { cx: fcx, cy: fcy, t: .30, dir: dir, owner: 0, type: type }, T);
}
// 爆心
flameAt(cx, cy, 'center', null);
// 十字四臂
for (let i = 1; i <= 2; i++) {
  flameAt(cx, cy - i, i === 2 ? 'end' : 'mid', 'up');
  flameAt(cx, cy + i, i === 2 ? 'end' : 'mid', 'down');
  flameAt(cx - i, cy, i === 2 ? 'end' : 'mid', 'left');
  flameAt(cx + i, cy, i === 2 ? 'end' : 'mid', 'right');
}
// 右側 BOSS 紫色火焰
P.drawFlameOn(bridgeCtx, { cx: 11, cy: 2, t: .30, dir: null, owner: null, type: 'center' }, T);

// 說明文字
gameCtx.fillStyle = '#1b2a1c';
gameCtx.font = '700 20px sans-serif';
gameCtx.fillText('v4.11 explosion (real drawFlame)', 18, 32);
gameCtx.font = '14px sans-serif';
gameCtx.fillText('orange = player bomb (cross arms) / purple = BOSS', 18, 54);

fs.writeFileSync(path.join(OUT, 'D-flame-real.png'), canvasForGame.toBuffer('image/png'));
console.log('saved D-flame-real.png');
