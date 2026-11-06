// v5.32 探針：量「眼睛在你的角色圖上哪個高度」—— 畫刻度尺，找出淚水起點該用的比例
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

(async () => {
  const b = await launch({ port: 9867, w: 900, h: 560 });
  try {
    const p = await b.newPage();
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 6000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(600);
    const info = await p.eval(`(function(){
      var BH = window.__BH;
      document.body.innerHTML = '';
      document.body.style.cssText = 'margin:0;background:#1b2430';
      var cv = document.createElement('canvas');
      cv.width = 900; cv.height = 540; cv.style.cssText = 'display:block';
      document.body.appendChild(cv);
      var g = cv.getContext('2d');
      g.fillStyle = '#1b2430'; g.fillRect(0, 0, 900, 540);
      var ch = BH.CHARACTERS[0];
      var R = 26, H = R * 3.75, cx = 300, cy = 380;    // cy = 腳底
      g.save();
      g.translate(cx, cy); g.scale(3.6, 3.6);
      BH.drawSpriteChar(g, ch, 0, 0, R, { expr: '', idle: 1.5, facing: 'down' });
      g.restore();
      // 刻度：從腳底往上，每 10% H 一條線（世界座標 py=cy, size=H）
      for (var k = 1; k <= 9; k++) {
        var yy = cy - H * 3.6 * (k / 10);
        g.strokeStyle = k === 4 || k === 5 ? 'rgba(255,90,90,.95)' : 'rgba(120,200,255,.45)';
        g.lineWidth = k === 4 || k === 5 ? 2 : 1;
        g.beginPath(); g.moveTo(60, yy); g.lineTo(560, yy); g.stroke();
        g.fillStyle = k === 4 || k === 5 ? '#ff8a8a' : '#7cc8ff';
        g.font = '600 12px sans-serif';
        g.fillText('H*.' + k, 66, yy - 3);
      }
      g.fillStyle = '#cfd9ea'; g.font = '700 15px sans-serif';
      g.fillText('腳底往上每 10% 角色高度畫一條線（紅線＝ .4 / .5）', 60, 30);
      return { ok: true };
    })()`);
    console.log('build:', JSON.stringify(info));
    await sleep(300);
    const shot = await p.send('Page.captureScreenshot', { format: 'png' });
    const f = path.resolve(__dirname, '_v532', 'eye-ruler.png');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
    console.log('截圖：', f);
  } finally { b.close(); }
})();
