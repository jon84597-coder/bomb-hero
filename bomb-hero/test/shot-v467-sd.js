// test/shot-v467-sd.js — 對戰縮圈：場內硬牆不能被換成外牆素材（目檢圖）
const { launch, sleep } = require('./cdp');
const path = require('path');
const FRESH = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/') + '?seed=777';

(async function () {
  const br = await launch({ port: 9571, w: 390, h: 844 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(FRESH, 3200);
  for (let i = 0; i < 40; i++) {
    if (await p.eval('typeof __BH').catch(() => 'x') === 'object') break;
    await sleep(300);
  }
  await p.eval("__BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  await p.eval("__BH.settings.count=4; __BH.settings.size='M'; __BH.settings.sd='on'; __BH.startBattle(); 1");
  await sleep(900);
  for (const rings of [0, 3, 6]) {
    await p.eval(`(function(){
      var G = __BH.Game;
      var e=document.getElementById('rotHint'); if(e) e.remove();
      var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
      var bn=document.getElementById('banner'); if(bn) bn.style.display='none';
      G.state = 'play';
      // 把縮圈補到指定圈數
      var want = ${rings} * Math.round(G.sdList.length / 24);
      G.sdActive = ${rings} > 0;
      G.sdIndex = 0;
      for (var i = 0; i < want; i++) {
        var c = G.sdList[G.sdIndex++];
        if (G.grid[c[1]][c[0]] !== 1) {
          G.grid[c[1]][c[0]] = 1;
          if (!G.sdRock) G.sdRock = {};
          G.sdRock[c[1] * G.cols + c[0]] = 1;
          G.wallKind = null;
        }
      }
      G.zoom = G.zoomTarget = 1; G.camSnap = true;
      var me = G.players[0];
      me.x = (G.cols/2) * G.T; me.y = (G.rows/2) * G.T;
      __BH.updateCamera(1); __BH.render();
      return [G.cols, G.rows, G.T, G.sdIndex];
    })()`).then(r => console.log('rings', rings, 'map', JSON.stringify(r)));
    await p.shot(path.join(__dirname, `_v467/sd-r${rings}.png`));
  }
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
