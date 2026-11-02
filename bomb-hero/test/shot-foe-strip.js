// v4.30：小怪走路動畫分鏡（每隻 6 帧）＋ 受傷白閃，確認動作幅度與面向
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v430');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9494, w: 1000, h: 620 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 2400);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.FoeArt&&window.__BH.FoeArt.readyCount()===6)')) break; await sleep(300); }
    const data = await p.eval(`(function(){
      var BH = window.__BH, R = BH.enemyArtR({r:14}), T = 40, K = 3;
      var ids = ['slime','bunny','frog','cater','mush','beetle'];
      var CW = 96, RH = 104, W = 6*CW + 70, H = ids.length*RH + 30;
      var c = document.createElement('canvas'); c.width = W*K; c.height = H*K;
      var g = c.getContext('2d'); g.scale(K,K);
      g.fillStyle = '#2b3f28'; g.fillRect(0,0,W,H);
      g.font = '11px sans-serif'; g.fillStyle = '#cfe8c8'; g.textAlign = 'left';
      ids.forEach(function(id, ri){
        var fy = ri*RH + 96;
        g.fillStyle = '#dfeccd'; g.fillText(id + '  →  往右走 6 帧 / walk right', 10, fy - 40);
        g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, fy); g.lineTo(W, fy); g.stroke();
        for (var f = 0; f < 6; f++) {
          var e = { walkT: f * .13, x: 0, y: 0, dirName: 'right', _fx: 0, _fy: 0 };
          // _fx/_fy 先給 0 → 第一次呼叫會判定「沒在動」；先叫一次熱身再畫
          BH.drawFoeSprite({ save:function(){}, restore:function(){}, translate:function(){}, scale:function(){}, rotate:function(){}, drawImage:function(){} }, id, e, 0, 0, R, false);
          e._fx = null;
          BH.drawFoeSprite(g, id, e, 26 + f*CW + CW*.5, fy, R, false);
        }
      });
      return c.toDataURL('image/png');
    })()`);
    fs.writeFileSync(path.join(OUT, 'strip.png'), Buffer.from(data.split(',')[1], 'base64'));
    console.log('saved strip.png');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
