// 地圖生成檢查：整張地圖入鏡 + 統計外牆／硬牆／軟磚格數
const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const N = parseInt(process.argv[2] || '3', 10);
const SEED = process.argv[3] || '424242';
const TAG = process.argv[4] || ('m' + N);

(async () => {
  const b = await launch({ port: 9781, w: 1400, h: 1000 });
  const p = await b.newPage();
  await p.goto(URL + '?maptest=' + N + '&seed=' + SEED, 3600);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
  await sleep(600);

  const info = await p.eval(`(function(){
    var BH = window.__BH, G = BH.Game;
    G.state = 'play'; if ('countdown' in G) G.countdown = 0;
    var cv = document.getElementById('cv');
    var z = Math.min(cv.width / (G.cols * G.T), cv.height / (G.rows * G.T));
    G.zoom = z;
    if (BH.updateCamera) BH.updateCamera();
    BH.render();
    var cnt = { open: 0, hard: 0, soft: 0, wall1: 0, wall2: 0, wall0: 0 };
    for (var y = 0; y < G.rows; y++) for (var x = 0; x < G.cols; x++) {
      var v = G.grid[y][x];
      if (v === 0) cnt.open++; else if (v === 2) cnt.soft++; else {
        cnt.hard++;
        var k = G.wallKind && G.wallKind[y] ? G.wallKind[y][x] : 0;
        if (k === 1) cnt.wall1++; else if (k === 2) cnt.wall2++; else cnt.wall0++;
      }
    }
    return { T: G.T, cols: G.cols, rows: G.rows, zoom: +z.toFixed(2), cnt: cnt,
             foes: (G.enemies || []).length };
  })()`);
  console.log(TAG, JSON.stringify(info));

  const sizes = await p.eval(`(function(){
    var BH = window.__BH, G = BH.Game, o = [];
    (G.enemies || []).forEach(function(e){
      var R = BH.enemyArtR(e), M = BH.FOE_ART[e.spec || e.type] || {};
      o.push((e.spec || e.type) + ' ' + (R * (M.hs || 1.9) / G.T).toFixed(2) + 'T');
    });
    return o;
  })()`);
  console.log('  foe sizes:', sizes.join(', '));

  const r = await p.eval(`(function(){var cv=document.getElementById('cv');var q=cv.getBoundingClientRect();return {l:q.left,t:q.top,w:q.width,h:q.height};})()`);
  const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: r.l, y: r.t, width: r.w, height: r.h, scale: 1 } });
  require('fs').writeFileSync(path.join(__dirname, '_v459', 'map-' + TAG + '.png'), Buffer.from(shot.data, 'base64'));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
