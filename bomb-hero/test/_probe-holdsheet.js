// 把「小熊舉彈的 12 格 + 遊戲炸彈」畫到離屏畫布上，直接看炸彈有沒有蓋住素材球
const { launch, sleep } = require('./cdp');
const fs = require('fs');

const DRAW = `(function(){
  var B = window.__BH;
  var COLS = 6, ROWS = 2, CW = 150, CH = 230, H = 110;
  var cv = document.createElement('canvas');
  cv.width = COLS * CW; cv.height = ROWS * CH;
  var g = cv.getContext('2d');
  g.fillStyle = '#20232a'; g.fillRect(0, 0, cv.width, cv.height);
  var out = [];
  for (var i = 0; i < 12; i++) {
    var cx = (i % COLS) * CW + CW / 2;
    var cy = Math.floor(i / COLS) * CH + CH - 20;
    g.save();
    g.translate(cx, cy);
    // 格線：腳底基線
    g.strokeStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.moveTo(-CW/2, 0); g.lineTo(CW/2, 0); g.stroke();
    g.restore();
    var bd = B.HeroAnim.draw(g, 'bear', cx, cy, H, { carry: true, idle: (i + 0.5) / 9, facing: 'down' });
    var hb = B.holdBombPos('bear', bd);
    if (hb && bd) {
      g.save();
      g.translate(cx + hb.dx, hb.y);
      B.drawBombOn(g, H * 0.282, 3, false, true, false, true);
      g.restore();
      out.push({ i: i, act: bd.act, f: bd.frame, dx: +(hb.dx / H).toFixed(4), up: +((bd.footY - hb.y) / H).toFixed(4) });
    } else out.push({ i: i, err: 'hb/bd null', act: bd && bd.act });
  }
  return { url: cv.toDataURL('image/png'), rows: out };
})()`;

(async () => {
  const br = await launch({ w: 900, h: 1000, port: 9412 });
  const page = await br.newPage();
  await page.goto('http://127.0.0.1:3122/?t=' + Date.now(), 2600);
  await sleep(1500);
  const r = await page.eval(DRAW);
  fs.writeFileSync(__dirname + '/_holdsheet.png', Buffer.from(r.url.split(',')[1], 'base64'));
  console.log(JSON.stringify(r.rows.slice(0, 4)));
  console.log('...共', r.rows.length, '格 → test/_holdsheet.png');
  await br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
