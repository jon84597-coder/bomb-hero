// v4.47：手機直放實機截圖 + 佈局量測
// 用法：node shot-v447-portrait.js [標記] [關卡]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v447');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }

const TAG = process.argv[2] || 'before';
const STAGE = Number(process.argv[3] || 21);
const W = Number(process.env.BH_W || 390), H = Number(process.env.BH_H || 844);

(async () => {
  const b = await launch({ port: 9571, w: 900, h: 900 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.goto(URL, 3000);
    for (let i = 0; i < 60; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
      await sleep(300);
    }
    await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}");
    await p.eval("(function(){var BH=window.__BH;BH.settings.ctrl='touch';if(BH.applyCtrl)BH.applyCtrl();document.body.classList.add('touch');})()");
    await sleep(400);
    await p.eval('window.__BH.startSolo(' + STAGE + ')');
    for (let i = 0; i < 40; i++) {
      if (await p.eval('window.__BH.TileArt && window.__BH.TileArt.readyCount() >= window.__BH.TileArt.total()')) break;
      await sleep(200);
    }
    await sleep(600);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
    await p.eval(`(function(){
      var G=window.__BH.Game; if(G.players[0]) G.players[0].invuln=0;
      if (window.__BH.settings) window.__BH.settings.ctrl = window.__BH.settings.ctrl || 'touch';
      document.body.classList.remove('slidepad');
      ['doorHint','annBox','toast'].forEach(function(id){ var a=document.getElementById(id); if(a) a.style.display='none'; });
    })()`);
    await sleep(500);

    const info = await p.eval(`(function(){
      function box(sel){
        var e = document.querySelector(sel); if(!e) return null;
        var b=e.getBoundingClientRect(), s=getComputedStyle(e);
        return {r:[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)],
                pad:s.padding, disp:s.display};
      }
      var G=window.__BH.Game;
      return {
        vw:innerWidth, vh:innerHeight, dpr:devicePixelRatio,
        body: box('body'), wrap: box('.wrap.game'), sw: box('#stageWrap'), cv: box('#cv'),
        cvs:[document.getElementById('cv').width, document.getElementById('cv').height],
        top: box('#gameTop'),
        T:G.T, cols:G.cols, rows:G.rows, zoom:G.zoom,
        mapPx:[Math.round(G.cols*G.T), Math.round(G.rows*G.T)],
        ox:G.ox, oy:G.oy
      };
    })()`);
    console.log(TAG, JSON.stringify(info));
    await p.shot(path.join(OUT, TAG + '-page.png'));
    console.log('saved', path.join(OUT, TAG + '-page.png'));
  } finally { await b.close(); }
})();
