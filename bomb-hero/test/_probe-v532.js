// v5.32 探針：四隻不同角色的「哭」特效（遊戲內真實尺寸放大 3.2 倍）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

(async () => {
  const b = await launch({ port: 9868, w: 1040, h: 860 });
  try {
    const p = await b.newPage();
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 6000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(700);

    const info = await p.eval(`(function(){
      var BH = window.__BH;
      document.body.innerHTML = '';
      document.body.style.cssText = 'margin:0;background:#1b2430';
      var cv = document.createElement('canvas');
      cv.width = 1040; cv.height = 840; cv.style.cssText = 'display:block';
      document.body.appendChild(cv);
      var g = cv.getContext('2d');
      g.fillStyle = '#1b2430'; g.fillRect(0, 0, 1040, 840);

      var ts = [1.22, 1.36, 1.50, 1.64];
      BH.CHARACTERS.slice(0, 4).forEach(function (ch, row) {
        var cy = 170 + row * 205;
        g.fillStyle = '#8ea3be'; g.font = '700 14px sans-serif'; g.textAlign = 'left';
        g.fillText((ch.name || ch.animal || ('#' + row)) + ' / ' + ch.animal, 16, cy - 128);
        ts.forEach(function (tt, i) {
          var cx = 190 + i * 240;
          g.fillStyle = 'rgba(58,107,74,.9)'; g.fillRect(cx - 105, cy + 30, 210, 44);
          g.save();
          g.translate(cx, cy); g.scale(3.2, 3.2);
          BH.drawSpriteChar(g, ch, 0, 0, 26, { expr: 'cry', idle: tt, facing: 'down' });
          g.restore();
          g.fillStyle = '#7d8ea6'; g.font = '600 12px sans-serif'; g.textAlign = 'center';
          g.fillText('t=' + tt.toFixed(2), cx, cy + 96);
        });
      });
      g.textAlign = 'left';
      g.fillStyle = '#cfd9ea'; g.font = '700 16px sans-serif';
      g.fillText('四隻角色的哭泣特效（R=26 遊戲內尺寸 ×3.2）', 16, 30);
      return { ok: true };
    })()`);
    console.log('build:', JSON.stringify(info));
    await sleep(400);
    const shot = await p.send('Page.captureScreenshot', { format: 'png' });
    const f = path.resolve(__dirname, '_v532', 'cry-4chars.png');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
    console.log('截圖：', f);
  } finally { b.close(); }
})();
