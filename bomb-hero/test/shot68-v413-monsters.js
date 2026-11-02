// test/shot68-v413-monsters.js — v4.13 視覺目檢：20 隻新舊怪物 + 技能效果
const path = require('path');
const fs = require('fs');
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

// 真的把遊戲的 drawEnemyArt 畫到真 canvas 上
const { createCanvas: cc } = require('@napi-rs/canvas');
const W = 1000, H = 560;
const canvas = cc(W, H);
const real = canvas.getContext('2d');

// 草地背景
real.fillStyle = '#8fc98a'; real.fillRect(0, 0, W, H);
real.fillStyle = 'rgba(60,90,55,.28)';
for (let i = 0; i < 120; i++) real.fillRect((i * 97) % W, (i * 53) % H, 2, 2);

// 用沙盒的 ctx 代理 → 真 canvas
const grad = { addColorStop() {} };
const bridge = new Proxy({}, {
  get(t, k) {
    if (k === 'canvas') return { width: W, height: H };
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => real.createRadialGradient(0, 0, 1, 0, 0, 1);
    if (k === 'measureText') return () => ({ width: 10 });
    if (typeof real[k] !== 'undefined') {
      const v = real[k];
      return typeof v === 'function' ? v.bind(real) : v;
    }
    return function () {};
  },
  set(t, k, v) { real[k] = v; return true; }
});

// 取得沙盒裡的 ctx 並換成 bridge
const sb = env.sandbox;
const oldCtx = sb.eval ? null : null;
// drawEnemyArt 用的是全域 ctx → 透過 __BH.drawEnemy 呼叫時會用到 ctx。
// 做法：直接把沙盒的 ctx 變數換掉（vm 內的 let）→ 用 Function 建一個 setter 不行，
// 改用 drawEnemyArt 走 sandbox 的 Proxy ctx（會記錄呼叫），所以我們自己重畫一份。
// 最簡單可靠：用 sandbox 的 drawEnemyArt 取得「繪製指令」，再重放到真 canvas。
// 但 Proxy ctx 只記錄不繪製 → 這裡改成：把 Proxy 的 set/get 接到真 canvas。

// 直接把 sandbox 的 ctx 換成 bridge：__BH 沒有匯出 ctx，但 drawEnemyArt 內部用全域 ctx。
// 我們用 sandbox.eval 把全域 ctx 指向 bridge（script scope 的 let ctx 不能從外部改，
// 但可以用 drawEnemyOn(g) 之類的 API）。→ 改走：把每隻怪畫成 sprite 再貼上。

// 最實際：直接呼叫 drawEnemyArt，並把它的繪製目標設為 bridge。
// sandbox 的 ctx 是 Proxy(t) 其中 t 是 {}，我們可以「攔截」它的 method 呼叫。
const captured = [];
const fakeCtx = new Proxy({}, {
  get(t, k) {
    if (k === 'canvas') return { width: W, height: H };
    if (k === 'createLinearGradient' || k === 'createRadialGradient') {
      return function (x0, y0, r0, x1, y1, r1) {
        const g = real.createRadialGradient(x0, y0, r0, x1, y1, r1);
        return { addColorStop: function (o, c) { g.addColorStop(o, c); } };
      };
    }
    if (k === 'measureText') return () => ({ width: 10 });
    if (typeof real[k] !== 'undefined') {
      const v = real[k];
      return typeof v === 'function' ? v.bind(real) : v;
    }
    return function () {};
  },
  set(t, k, v) { real[k] = v; return true; }
});

// sandbox 裡 ctx 是 let ctx = ... 不可外部改 → 用 __BH 導出的繪製函式配合 replace
// 實際做法：drawEnemyArt 會用全域 ctx。我們用 sandbox.runInContext 執行一段程式，
// 把該 scope 的 ctx 改成 fakeCtx（同一個 scope 內可以賦值）。
const vm = require('vm');
const ctxScript = '(function(){ try { ctx = __FAKE__; } catch(e) { } return 1; })()';
try {
  vm.runInContext(ctxScript.replace('__FAKE__', 'globalThis.__FAKECTX__'), Object.assign(Object.create(sb), { __FAKECTX__: fakeCtx }));
} catch (e) { console.log('ctx swap failed:', e.message); }

// 逐隻畫
const T = 56;
const list = P.ENEMY_SPECIES;
let i = 0;
for (let row = 0; row < 2; row++) {
  for (let col = 0; col < 10; col++) {
    const sp = list[row * 10 + col];
    if (!sp) continue;
    const x = 50 + col * 96, y = 130 + row * 220;
    // 影子
    real.fillStyle = 'rgba(0,0,0,.22)';
    real.beginPath(); real.ellipse(x, y + 42, 26, 9, 0, 0, 6.283); real.fill();
    // 身體（用遊戲的 drawEnemyArt）
    try {
      const e = { type: sp.id, spec: sp.id, color: sp.color, color2: sp.color2, r: sp.r,
                   kind: sp.kind, wing: sp.wing, walkT: 1.2, vx: 1, dirName: 'right', bobP: 0.3 };
      P.drawEnemyArt(e, x, y, false, 1.2);
    } catch (err) { console.log('draw ' + sp.id + ' failed: ' + err.message); }
    // 名稱
    real.fillStyle = '#20301c';
    real.font = '700 13px sans-serif';
    real.textAlign = 'center';
    real.fillText(sp.name + (sp.skill ? '★' : ''), x, y + 66);
    real.textAlign = 'left';
    i++;
  }
}
real.fillStyle = '#20301c';
real.font = '700 20px sans-serif';
real.fillText('v4.13  20 隻小怪（★ = 有技能）', 20, 34);
real.font = '13px sans-serif';
real.fillText('新 10 隻：撿彈怪／拆彈怪／放彈怪／貓熊／企鵝／章魚／機器人／小巫師／鬼火／大黃蜂', 20, 56);

fs.writeFileSync(path.join(OUT, 'monsters-20.png'), canvas.toBuffer('image/png'));
console.log('saved monsters-20.png (' + i + ' monsters)');
