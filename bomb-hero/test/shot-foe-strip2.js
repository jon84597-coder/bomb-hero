// v4.31：第二關 6 隻小怪的走路分鏡（每隻 6 帧，往右）＋ 尺寸量測
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v431');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const IDS = (process.argv[2] || 'crab,mummy,eye,sandworm,dune,scorp').split(',');

(async () => {
  const b = await launch({ port: 9516, w: 1000, h: 760 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 2600);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.FoeArt&&window.__BH.FoeArt.readyCount()>=12)')) break; await sleep(300); }
    const ready = await p.eval('window.__BH.FoeArt.readyCount()');
    console.log('FoeArt ready', ready);

    const data = await p.eval(`(function(){
      var BH = window.__BH, T = 40; BH.Game.T = T;
      var ids = ${JSON.stringify(IDS)};
      var CW = 100, RH = 108, W = 6*CW + 70, H = ids.length*RH + 20, K = 3;
      var c = document.createElement('canvas'); c.width = W*K; c.height = H*K;
      var g = c.getContext('2d'); g.scale(K,K);
      g.fillStyle = '#e3ca95'; g.fillRect(0,0,W,H);
      g.font = '11px sans-serif'; g.textAlign = 'left';
      ids.forEach(function(id, ri){
        var sp = BH.speciesOf(id);
        var R = BH.enemyArtR({ r: sp.r });
        var fy = ri*RH + 92;
        g.fillStyle = '#5a3f1c'; g.fillText(id + '  (r=' + sp.r + ', R=' + R.toFixed(1) + ')  → right', 10, fy - 42);
        g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, fy); g.lineTo(W, fy); g.stroke();
        for (var f = 0; f < 6; f++) {
          var e = { walkT: f * .13, x: 0, y: 0, dirName: 'right', _fx: 0, _fy: 0, bobP: 0 };
          BH.drawFoeSprite({ save:function(){}, restore:function(){}, translate:function(){}, scale:function(){}, rotate:function(){}, drawImage:function(){} }, id, e, 0, 0, R, false);
          e._fx = null;
          BH.drawFoeSprite(g, id, e, 35 + f*CW, fy, R, false);
        }
      });
      return c.toDataURL('image/png');
    })()`);
    fs.writeFileSync(path.join(OUT, 'strip2.png'), Buffer.from(data.split(',')[1], 'base64'));
    console.log('saved strip2.png');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
