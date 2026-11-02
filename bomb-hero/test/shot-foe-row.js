// v4.30：把 6 隻小怪用「遊戲同一段程式」畫成一排 —— 驗大小、面向（左右各一列）、受傷白閃
// 用法：node test/shot-foe-row.js [html路徑] [輸出名]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const FILE = process.argv[2] || path.resolve(__dirname, '../index.html');
const OUTNAME = process.argv[3] || 'row.png';
const OUT = path.join(__dirname, '_v430');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(FILE).replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9482, w: 1000, h: 620 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 2400);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.FoeArt)')) break; await sleep(300); }
    await sleep(1800);

    const data = await p.eval(`(function(){
      var BH = window.__BH;
      var ids = ['slime','bunny','frog','cater','mush','beetle'];
      var T = 40;                       // 遊戲裡的格子大小（放大 2 倍畫）
      var R = BH.enemyArtR({ r: 14 });  // 遊戲實際的外型半徑（T=40 時）
      var K = 2;                        // 畫布放大倍率，方便肉眼檢查
      var COL = 150, ROWH = 150;
      var W = 6 * COL + 40, H = ROWH * 3 + 60;
      var c = document.createElement('canvas');
      c.width = W * K; c.height = H * K;
      var g = c.getContext('2d');
      g.scale(K, K);
      var bg = g.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#3a5a34'); bg.addColorStop(1,'#22331f');
      g.fillStyle = bg; g.fillRect(0,0,W,H);
      // 地板格線（看得出怪物相對格子多大）
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
      for (var yy = 20; yy < H; yy += T) { g.beginPath(); g.moveTo(0,yy); g.lineTo(W,yy); g.stroke(); }
      for (var xx = 20; xx < W; xx += T) { g.beginPath(); g.moveTo(xx,0); g.lineTo(xx,H); g.stroke(); }
      g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#dff0d4';
      g.fillText('面朝左 / walking left', W/2, 22);
      g.fillText('面朝右 / walking right', W/2, 22 + ROWH);
      g.fillText('受傷白閃 / hit flash', W/2, 22 + ROWH*2);

      var info = [];
      ids.forEach(function(id, i){
        var cx = 30 + COL * (i + .5);
        var eL = { walkT: .42, x: 0, y: 0, dirName: 'left',  _fx: null };
        var eR = { walkT: .42, x: 0, y: 0, dirName: 'right', _fx: null };
        var eF = { walkT: .42, x: 0, y: 0, dirName: 'left',  _fx: null };
        var fy1 = 22 + 100, fy2 = 22 + ROWH + 100, fy3 = 22 + ROWH*2 + 100;
        var r1 = BH.drawFoeSprite(g, id, eL, cx, fy1, R, false);
        var r2 = BH.drawFoeSprite(g, id, eR, cx, fy2, R, false);
        var r3 = BH.drawFoeSprite(g, id, eF, cx, fy3, R, true);
        info.push([id, r1, r2, r3]);
        g.fillStyle = '#eaf6e0';
        g.fillText(id, cx, fy1 + 20);
      });
      return JSON.stringify({ png: c.toDataURL('image/png'), info: info,
        R: R, ready: BH.FoeArt.readyCount(), keys: BH.FoeArt.keys() });
    })()`);

    const o = JSON.parse(data);
    console.log('FoeArt ready', o.ready, 'keys', JSON.stringify(o.keys), 'R', o.R.toFixed(2));
    console.log('drawn', JSON.stringify(o.info));
    fs.writeFileSync(path.join(OUT, OUTNAME), Buffer.from(o.png.split(',')[1], 'base64'));
    console.log('saved', OUTNAME);
  } finally {
    await b.close();
  }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
