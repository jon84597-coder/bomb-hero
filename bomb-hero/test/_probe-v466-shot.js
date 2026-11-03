// test/_probe-v466-shot.js — 隨機地圖：舊參數 vs 新參數 目檢圖
const { launch, sleep } = require('./cdp');
const path = require('path');
const FRESH = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/') + '?seed=12345';
const OLD = 'file:///' + path.join(__dirname, '_v466/old.html').replace(/\\/g, '/') + '?seed=12345';

(async function () {
  const br = await launch({ port: 9563, w: 390, h: 844 });
  const np = await br.newPage();
  const op = await br.newPage();
  for (const p of [np, op]) {
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.resize(390, 844, true);
  }
  await np.goto(FRESH, 3200);
  await op.goto(OLD, 3200);
  for (let i = 0; i < 40; i++) {
    const a = await np.eval('typeof __BH').catch(() => 'x');
    const b = await op.eval('typeof __BH').catch(() => 'x');
    if (a === 'object' && b === 'object') break;
    await sleep(300);
  }
  for (const p of [np, op]) {
    await p.eval("__BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  }
  for (const n of [1, 5]) {
    for (const [p, tag] of [[np, 'new'], [op, 'old']]) {
      await p.eval(`__BH.startMapTest(${n}); 1`);
      await sleep(700);
      await p.eval(`(function(){
        var G=__BH.Game, e=document.getElementById('rotHint'); if(e) e.remove();
        var ov=document.getElementById('overlay'); if(ov) ov.style.display='none';
        var bn=document.getElementById('banner'); if(bn) bn.style.display='none';
        G.state='play'; G.zoom=G.zoomTarget=1; G.camSnap=true;
        G.players[0].x = (G.spawnCell.x+.5)*G.T; G.players[0].y=(G.spawnCell.y+.5)*G.T;
        __BH.updateCamera(1); __BH.render();
        return 1;
      })()`);
      await p.shot(path.join(__dirname, `_v466/map${n}-${tag}.png`));
    }
    console.log('map', n, 'ok');
  }
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
