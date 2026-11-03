// 跑地圖測試關，量每隻怪實際畫出來多大（換算成格子數）
const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const N = parseInt(process.argv[2] || '3', 10);

(async () => {
  const b = await launch({ port: 9771, w: 1280, h: 900 });
  const p = await b.newPage();
  await p.goto(URL + '?maptest=' + N + '&seed=424242', 3600);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
  await sleep(600);

  const out = await p.eval(`(function(){
    var BH = window.__BH, G = BH.Game;
    var rows = [];
    (G.enemies || []).forEach(function(e){
      var R = BH.enemyArtR(e);
      var M = BH.FOE_ART[e.spec || e.type] || {};
      rows.push({ sp: e.spec || e.type, r: e.r, boss: !!e.boss, hs: M.hs,
                  artH: +(R * (M.hs || 1.9)).toFixed(1),
                  artW: +(R * (M.hs || 1.9) * (M.asp || 1)).toFixed(1),
                  tiles: +(R * (M.hs || 1.9) / G.T).toFixed(2) });
    });
    return { T: G.T, cols: G.cols, rows: G.rows, zoom: G.zoom, list: rows };
  })()`);
  console.log('T=' + out.T, out.cols + 'x' + out.rows, 'zoom=' + out.zoom);
  out.list.forEach(r => console.log(r.sp.padEnd(11), 'r', String(r.r).padEnd(3), 'hs', r.hs,
    'H', r.artH + 'px', '=', r.tiles + 'T'));
  await p.eval('window.__BH.render()');
  const r2 = await p.eval(`(function(){var cv=document.getElementById('cv');var rc=cv.getBoundingClientRect();return {l:rc.left,t:rc.top,w:rc.width,h:rc.height};})()`);
  const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: r2.l, y: r2.t, width: r2.w, height: r2.h, scale: 1 } });
  require('fs').writeFileSync(path.join(__dirname, '_v459', 'maptest' + N + '.png'), Buffer.from(shot.data, 'base64'));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
