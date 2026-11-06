// v5.32 探針 B：單一角色 × 4 個時間點，畫出「角色框（綠）」「頭部框（藍）」與頭像中心（紅點）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

(async () => {
  const b = await launch({ port: 9878, w: 1060, h: 560 });
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
      cv.width = 1060; cv.height = 540; cv.style.cssText = 'display:block';
      document.body.appendChild(cv);
      var g = cv.getContext('2d');
      g.fillStyle = '#1b2430'; g.fillRect(0, 0, 1060, 540);
      var ch = BH.CHARACTERS[0], R = 26, S = 3.6;
      var ts = [1.18, 1.32, 1.46, 1.60];
      var gx = 100, gy = 430;
      ts.forEach(function (tt, i) {
        var cx = gx + i * 245, foot = gy;
        g.fillStyle = 'rgba(58,107,74,.85)'; g.fillRect(cx - 90, foot, 180, 26);
        g.save();
        g.translate(cx, gy - 21.3 * S); g.scale(S, S);
        BH.drawSpriteChar(g, ch, 0, 0, R, { expr: 'cry', idle: tt, facing: 'down' });
        g.restore();
        var d = BH.Game.__DBGI || {};
        // 角色外框（H=79）與頭部框
        g.strokeStyle = 'rgba(90,240,150,.9)'; g.lineWidth = 1;
        g.strokeRect(cx - 40 * S, gy - 79 * S, 80 * S, 79 * S);
        g.strokeStyle = 'rgba(120,190,255,.9)';
        g.strokeRect(cx - (d.hbw || 55) * S * .5, gy + ((d.hby || -59) - 21.3) * S, (d.hbw || 55) * S, (d.hbh || 47) * S);
        g.fillStyle = '#ff5a5a';
        g.beginPath(); g.arc(cx, gy + ((d.hby || -59) - 21.3 - (d.H || 79) * .275) * S, 3.5, 0, 6.283); g.fill();
        g.fillStyle = '#8fa6c4'; g.font = '600 12px sans-serif'; g.textAlign = 'center';
        g.fillText('t=' + tt.toFixed(2), cx, foot + 46);
      });
      g.textAlign = 'left'; g.fillStyle = '#cfd9ea'; g.font = '700 15px sans-serif';
      g.fillText('綠=角色外框　藍=頭部框　紅點=情緒頭像圓心（t=1.18/1.32/1.46/1.60）', 20, 30);
      return { ok: true, dbg: BH.Game.__DBGI || null };
    })()`);
    console.log('build:', JSON.stringify(info));
    await sleep(300);
    const shot = await p.send('Page.captureScreenshot', { format: 'png' });
    const f = path.resolve(__dirname, '_v532', 'cry-geometry.png');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
    console.log('截圖：', f);
  } finally { b.close(); }
})();
