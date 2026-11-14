// test/shot-v601-pet.js —— 隨從動作的實拍驗證（真的載入 spr/pet-anim-*.webp，走真的 PetAnim）
//   ① 三隻 × 五動作各抽 4 個時間點，畫在同一張畫布上（bodyH 用遊戲實際值）
//   ② 右上角印 readyCount，確認 15 支圖集都載得到
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = 'test/_v601/';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await launch({ w: 1100, h: 760 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2500);
  for (let i = 0; i < 40; i++) {
    if (await p.eval('typeof __BH') === 'object') break;
    await sleep(250);
  }
  await sleep(600);

  // 先把 15 支圖集叫起來（PetAnim 是第一次 draw 才載入）
  await p.eval(`(function(){
    var P=__BH.PetAnim; ['blade','bomber','guard'].forEach(function(k){ P.load(k); });
    return 1;
  })()`);
  for (let i = 0; i < 40; i++) {
    const n = await p.eval('__BH.PetAnim.readyCount()');
    if (n >= 15) break;
    await sleep(200);
  }
  const ready = await p.eval('__BH.PetAnim.readyCount()');

  await p.eval(`(function(){
    var P = __BH.PetAnim;
    var W = 1080, H = 700, acts = P.ACTS;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#12161e';
    var g = cv.getContext('2d');
    g.fillStyle = '#12161e'; g.fillRect(0, 0, W, H);
    var pets = ['blade', 'bomber', 'guard'];
    var T = 48;                                  // 場上格子的像素（實際遊戲差不多這麼大）
    var HERO = .81;
    var K = { blade: 1.00, bomber: 1.00, guard: 1.20 };
    for (var i = 0; i < pets.length; i++) {
      var k = pets[i];
      var bodyH = T * .40 * 3.75 * HERO * K[k];
      for (var r = 0; r < acts.length; r++) {
        var y = 120 + r * 128;
        g.fillStyle = 'rgba(255,255,255,.06)';
        g.fillRect(8, y, W - 16, 1);
        g.fillStyle = '#8fa6c8';
        g.font = '600 13px sans-serif';
        g.fillText(acts[r], 12, y - 6);
        for (var j = 0; j < 4; j++) {
          var x = 120 + i * 340 + j * 78;
          P.draw(g, k, x, y, bodyH, 1, { act: acts[r], idle: j * 0.31, walk: j * 3 });
        }
      }
      g.fillStyle = '#ffd479';
      g.font = '700 15px sans-serif';
      g.fillText(k, 12, 100 + 0);
    }
    document.body.appendChild(cv);
    return 1;
  })()`);
  await sleep(500);
  await p.shot(OUT + 'pets-live.png');
  console.log('readyCount =', ready, '（應為 15）');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
