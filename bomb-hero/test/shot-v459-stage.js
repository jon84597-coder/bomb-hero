// 截圖：指定關卡的整張地圖（含怪物），可指定是否鋪滿視野
const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const ST = parseInt(process.argv[2] || '1', 10);
const TAG = process.argv[3] || ('s' + ST);
const FIT = process.argv[4] !== 'zoom';

(async () => {
  const b = await launch({ port: 9791, w: 1400, h: 950 });
  const p = await b.newPage();
  await p.goto(URL, 3600);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
  await sleep(500);

  const info = await p.eval(`(function(){
    var BH = window.__BH, G = BH.Game;
    BH.startSolo(${ST}, true);
    var ov = document.getElementById('ovIn'); if (ov) { ov.classList.add('hide'); ov.style.setProperty('display','none','important'); }
    G.state = 'play'; G.countdown = 0;
    for (var i = 0; i < 90; i++) BH.updateWorld(1/60);
    var cv = document.getElementById('cv');
    if (${FIT}) G.zoom = Math.min(cv.width / (G.cols * G.T), cv.height / (G.rows * G.T)) * .98;
    if (BH.updateCamera) BH.updateCamera();
    BH.render();
    var cnt = { open: 0, hard: 0, soft: 0, w1: 0, w2: 0 };
    for (var y = 0; y < G.rows; y++) for (var x = 0; x < G.cols; x++) {
      var v = G.grid[y][x];
      if (v === 0) cnt.open++; else if (v === 2) cnt.soft++; else {
        cnt.hard++;
        var kk = G.wallKind && G.wallKind[y] ? G.wallKind[y][x] : 0;
        if (kk === 1) cnt.w1++; else if (kk === 2) cnt.w2++;
      }
    }
    return { stage: G.stage, T: G.T, cols: G.cols, rows: G.rows, cnt: cnt, foes: (G.enemies || []).length,
             theme: (BH.THEMES[(Math.ceil(G.stage/4)-1)] || {}).name };
  })()`);
  console.log(TAG, JSON.stringify(info));

  const r = await p.eval(`(function(){var cv=document.getElementById('cv');var q=cv.getBoundingClientRect();return {l:q.left,t:q.top,w:q.width,h:q.height};})()`);
  const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: r.l, y: r.t, width: r.w, height: r.h, scale: 1 } });
  require('fs').writeFileSync(path.join(__dirname, '_v459', 'stage-' + TAG + '.png'), Buffer.from(shot.data, 'base64'));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
