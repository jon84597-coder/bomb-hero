// v5.32 展示圖：兩隻角色 × 三個時間點的「灑水式哭臉」（遊戲內尺寸放大 2.6 倍，無除錯框）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

(async () => {
  const b = await launch({ port: 9883, w: 1120, h: 660 });
  try {
    const p = await b.newPage();
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 6000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(700);
    const info = await p.eval(`(function(){
      var BH = window.__BH;
      document.body.innerHTML = '';
      document.body.style.cssText = 'margin:0;background:#141b26';
      var cv = document.createElement('canvas');
      cv.width = 1120; cv.height = 640; cv.style.cssText = 'display:block';
      document.body.appendChild(cv);
      var g = cv.getContext('2d');
      var grad = g.createLinearGradient(0, 0, 0, 640);
      grad.addColorStop(0, '#1a2433'); grad.addColorStop(1, '#0f151f');
      g.fillStyle = grad; g.fillRect(0, 0, 1120, 640);

      var R = 26, S = 2.6, foot = 300;
      var rows = [BH.CHARACTERS[0], BH.CHARACTERS[3]];
      var ts = [1.20, 1.40, 1.60];
      rows.forEach(function (ch, r) {
        var baseY = foot + r * 300;
        g.fillStyle = 'rgba(58,107,74,.55)';
        g.fillRect(60, baseY + 2, 1000, 10);
        ts.forEach(function (tt, i) {
          var cx = 210 + i * 340;
          g.save();
          g.translate(cx, baseY - 21.32 * S);
          g.scale(S, S);
          BH.drawSpriteChar(g, ch, 0, 0, R, { expr: 'cry', idle: tt, facing: 'down' });
          g.restore();
          g.fillStyle = '#6b7c94'; g.font = '600 13px sans-serif'; g.textAlign = 'center';
          g.fillText('t=' + tt.toFixed(2), cx, baseY + 34);
        });
        g.textAlign = 'left';
        g.fillStyle = '#9fb2c9'; g.font = '700 15px sans-serif';
        g.fillText(ch.name || ch.animal, 62, baseY - 210);
      });
      g.textAlign = 'left'; g.fillStyle = '#cfd9ea'; g.font = '700 17px sans-serif';
      g.fillText('v5.32 哭臉：兩眼外側持續往左右灑（每顆水珠速度／角度不同）', 60, 40);
      return { ok: true };
    })()`);
    console.log('build:', JSON.stringify(info));
    await sleep(350);
    const shot = await p.send('Page.captureScreenshot', { format: 'png' });
    const f = path.resolve(__dirname, '_v532', 'cry-showcase.png');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
    console.log('截圖：', f);
  } finally { b.close(); }
})();
