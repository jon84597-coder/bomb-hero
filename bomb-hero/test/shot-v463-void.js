// 重現「外牆碎片漂在地圖外」：整張地圖連同背景一起截，同時輸出 grid/wallKind 的 ASCII
//   node test/shot-v463-void.js 1
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const ST = parseInt(process.argv[2] || '1', 10);

(async () => {
  const b = await launch({ port: 9794, w: 1300, h: 1150 });
  const p = await b.newPage();
  await p.goto(URL, 3600);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
  await sleep(500);

  const info = await p.eval(`(function(){
    var BH = window.__BH, G = BH.Game;
    BH.startSolo(${ST}, false);
    var ov = document.getElementById('ovIn'); if (ov) { ov.classList.add('hide'); ov.style.setProperty('display','none','important'); }
    G.state = 'play'; G.countdown = 0;
    for (var i = 0; i < 90; i++) BH.updateWorld(1/60);
    var cv = document.getElementById('cv');
    // 縮到剛好整張圖都看得到，四邊留 1.2 格背景
    G.zoom = Math.min(cv.width / ((G.cols + 2.4) * G.T), cv.height / ((G.rows + 2.4) * G.T));
    if (BH.updateCamera) BH.updateCamera();
    BH.render();
    var art = [], holes = [];
    for (var yy = 0; yy < G.rows; yy++) {
      var row = '';
      for (var xx = 0; xx < G.cols; xx++) {
        var gg = G.grid[yy][xx], kk = G.wallKind && G.wallKind[yy] ? G.wallKind[yy][xx] : 0;
        row += (gg !== 1) ? (gg === 0 ? '.' : 's') : (kk === 1 ? 'B' : kk === 2 ? 'H' : '-');
        if (gg === 1 && kk === 0) {
          // 這格是實心但不畫 → 它有沒有非實心的鄰居？(dist 一定 <=1 才可能被畫)
          holes.push(xx + ',' + yy);
        }
      }
      art.push(row);
    }
    // 找出「畫了、但四周沒有任何非實心鄰居」的格（真正的孤島）
    var orphan = [];
    for (var y2 = 0; y2 < G.rows; y2++) for (var x2 = 0; x2 < G.cols; x2++) {
      var k2 = G.wallKind[y2] ? G.wallKind[y2][x2] : 0;
      if (!k2) continue;
      var openN = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var nx = x2 + dx, ny = y2 + dy;
        if (nx < 0 || ny < 0 || nx >= G.cols || ny >= G.rows) continue;
        if (G.grid[ny][nx] !== 1) openN++;
      }
      if (!openN) orphan.push(x2 + ',' + y2 + '=' + k2);
    }
    return { T: G.T, cols: G.cols, rows: G.rows, zoom: G.zoom, camX: G.camX, camY: G.camY,
             art: art.join(String.fromCharCode(10)), orphan: orphan.join(' '), notDrawn: holes.length };
  })()`);

  console.log('T=' + info.T + ' zoom=' + info.zoom.toFixed(3) + ' cam=' + info.camX + ',' + info.camY + ' 不畫=' + info.notDrawn);
  console.log('孤島（畫了但四周沒空地）: ' + (info.orphan || '無'));
  console.log(info.art);
  fs.writeFileSync(path.join(__dirname, '_v463', 'map' + ST + '.txt'), info.art);

  const r = await p.eval(`(function(){var cv=document.getElementById('cv');var q=cv.getBoundingClientRect();return {l:q.left,t:q.top,w:q.width,h:q.height};})()`);
  const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: r.l, y: r.t, width: r.w, height: r.h, scale: 1 } });
  fs.writeFileSync(path.join(__dirname, '_v463', 'map' + ST + '.png'), Buffer.from(shot.data, 'base64'));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
