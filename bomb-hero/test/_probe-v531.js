// v5.31 探針：放大看「灑水式淚水」與「頭頂表情頭像」
// 用法：node test/_probe-v531.js
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

(async () => {
  const b = await launch({ port: 9865, w: 1000, h: 560 });
  try {
    const p = await b.newPage();
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 6000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(400);

    const info = await p.eval(`(function(){
      var BH = window.__BH;
      document.body.innerHTML = '';
      document.body.style.cssText = 'margin:0;background:#141b26';
      var cv = document.createElement('canvas');
      cv.width = 1000; cv.height = 540;
      cv.style.cssText = 'display:block';
      document.body.appendChild(cv);
      var g = cv.getContext('2d');
      g.fillStyle = '#141b26'; g.fillRect(0, 0, 1000, 540);

      // 左上：同一張臉三個時間點（看水珠是不是一直在往外灑）
      var ts = [1.20, 1.38, 1.56];
      ts.forEach(function (tt, i) {
        g.save();
        g.translate(40 + i * 205, 40); g.scale(3, 3);
        BH.drawFaceExpr(g, 'cry', 0, 0, 48, 48, tt, '#ffe6c4');
        g.restore();
        g.fillStyle = '#8fa6c4'; g.font = '600 13px sans-serif';
        g.fillText('t=' + tt.toFixed(2), 40 + i * 205, 205);
      });
      g.fillStyle = '#cfd9ea'; g.font = '700 16px sans-serif';
      g.fillText('同一個哭臉的三個時間點（水珠持續往外灑）', 40, 20);

      // 右：完整角色＋頭頂表情頭像（三個表情各一隻）
      var chars = BH.CHARACTERS;
      var kinds = [['cry', 560], ['laugh', 730], ['hurt', 900]];
      kinds.forEach(function (k, i) {
        var ch = chars[i % chars.length];
        BH.drawSpriteChar(g, ch, k[1], 430, 46, { expr: k[0], idle: 1.5, facing: 'down' });
        g.fillStyle = '#8fa6c4'; g.font = '600 15px sans-serif'; g.textAlign = 'center';
        g.fillText(k[0], k[1], 470);
      });
      g.textAlign = 'start';
      g.fillStyle = '#cfd9ea'; g.font = '700 18px sans-serif';
      g.fillText('頭頂情緒頭像（H*.215）', 560, 60);
      return { ok: true };
    })()`);
    console.log('build:', JSON.stringify(info));
    await sleep(300);
    const shot = await p.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const f = path.resolve(__dirname, '_v531', 'cry-and-mood.png');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
    console.log('截圖：', f);
  } finally {
    b.close();
  }
})();
