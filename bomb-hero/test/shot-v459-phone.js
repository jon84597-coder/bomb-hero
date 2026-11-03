// 手機尺寸（390×844）截圖，對照使用者回報的畫面
const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const ST = parseInt(process.argv[2] || '1', 10);
const TAG = process.argv[3] || 'phone';
const MT = process.argv[4] || '';

(async () => {
  const b = await launch({ port: 9821, w: 390, h: 844 });
  const p = await b.newPage();
  await p.resize(390, 844, true);
  await p.goto(URL + (MT ? '?maptest=' + MT + '&seed=424242' : ''), 3600);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
  await sleep(500);

  const info = await p.eval(`(function(){
    var BH = window.__BH, G = BH.Game;
    if (!${MT ? 1 : 0}) BH.startSolo(${ST}, true);
    G.state = 'play'; G.countdown = 0;
    if (BH.hideOverlay) BH.hideOverlay();
    var ov = document.getElementById('ovIn');
    if (ov) { ov.classList.add('hide'); ov.style.setProperty('display','none','important'); }
    for (var i = 0; i < 60; i++) BH.updateWorld(1/60);
    BH.render();
    var foes = (G.enemies || []).map(function(e){
      var R = BH.enemyArtR(e), M = BH.FOE_ART[e.spec || e.type] || {};
      return (e.spec || e.type) + ':' + (R * (M.hs || 1.9) / G.T).toFixed(2) + 'T';
    });
    return { T: G.T, zoom: G.zoom, cols: G.cols, rows: G.rows, n: foes.length, foes: foes.slice(0, 6) };
  })()`);
  console.log(TAG, JSON.stringify(info));

  const r = await p.eval(`(function(){var cv=document.getElementById('cv');var q=cv.getBoundingClientRect();return {l:q.left,t:q.top,w:q.width,h:q.height};})()`);
  const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: r.l, y: r.t, width: r.w, height: r.h, scale: 2 } });
  require('fs').writeFileSync(path.join(__dirname, '_v459', 'phone-' + TAG + '.png'), Buffer.from(shot.data, 'base64'));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
