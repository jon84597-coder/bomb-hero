// test/shot-v467-map.js — 手機（390×844）隨機地圖：出生點淨空 + 比例
const { launch, sleep } = require('./cdp');
const path = require('path');
const FRESH = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/') + '?seed=12345';

(async function () {
  const br = await launch({ port: 9581, w: 390, h: 844 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(FRESH, 3200);
  for (let i = 0; i < 40; i++) {
    if (await p.eval('typeof __BH').catch(() => 'x') === 'object') break;
    await sleep(300);
  }
  await p.eval("__BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  for (const n of [1, 4]) {
    await p.eval(`__BH.startMapTest(${n}); 1`);
    await sleep(800);
    console.log(n, await p.eval(`(function(){
      var G=__BH.Game, e=document.getElementById('rotHint'); if(e) e.remove();
      var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
      var rc=document.querySelector('.rotcard,.rot-card,#rotCard'); if(rc) rc.remove();
      var bn=document.getElementById('banner'); if(bn) bn.style.display='none';
      G.state='play'; G.zoom=G.zoomTarget=1; G.camSnap=true;
      var me=G.players[0];
      me.x=(G.spawnCell.x+.5)*G.T; me.y=(G.spawnCell.y+.5)*G.T;
      __BH.updateCamera(1); __BH.render();
      var near=[];
      for (var i=0;i<G.enemies.length;i++){
        var d=Math.max(Math.abs(Math.floor(G.enemies[i].x/G.T)-G.spawnCell.x),Math.abs(Math.floor(G.enemies[i].y/G.T)-G.spawnCell.y));
        if(d<=4) near.push(d);
      }
      var art=[];
      for (var yy=0; yy<G.rows; yy++){
        var row='';
        for (var xx=0; xx<G.cols; xx++){
          var v=G.grid[yy][xx];
          var ch = v===1?'#':(v===2?'B':'.');
          if (xx===G.spawnCell.x && yy===G.spawnCell.y) ch='@';
          row+=ch;
        }
        art.push(row);
      }
      return JSON.stringify({T:G.T, cols:G.cols, rows:G.rows, spdK:+G.spdK.toFixed(2),
        fillH:+(G.rows*G.T/__BH.viewInfo().h).toFixed(2), foesNear:near, art:art});
    })()`));
    await p.shot(path.join(__dirname, `_v467/phone-map${n}.png`));
  }
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
