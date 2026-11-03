// 同一關卡、同一視窗尺寸，分別渲染「舊版 4.61（破洞）」與「新版 4.62（補好）」
//   node test/shot-v462-cmp.js 8
// 需要先把舊版抓出來：git show cbadac2^:bomb-hero/index.html > _oldbh/index.html
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const ST = parseInt(process.argv[2] || '8', 10);
const OLD = 'file:///' + path.resolve(__dirname, '../_oldbh/index.html').replace(/\\/g, '/');
const NEW = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

function boot() {
  return `(function(){
    var BH = window.__BH, G = BH.Game;
    BH.startSolo(${ST}, true);
    var ov = document.getElementById('ovIn'); if (ov) { ov.classList.add('hide'); ov.style.setProperty('display','none','important'); }
    G.state = 'play'; G.countdown = 0;
    for (var i = 0; i < 90; i++) BH.updateWorld(1/60);
    var cv = document.getElementById('cv');
    G.zoom = Math.min(cv.width / (G.cols * G.T), cv.height / (G.rows * G.T)) * .98;
    if (BH.updateCamera) BH.updateCamera();
    BH.render();
    var holes = [];
    for (var y = 0; y < G.rows; y++) for (var x = 0; x < G.cols; x++) {
      if (G.grid[y][x] === 1 && G.wallKind && G.wallKind[y] && G.wallKind[y][x] === 0) holes.push(x + ',' + y);
    }
    return { T: G.T, cols: G.cols, rows: G.rows, zoom: G.zoom, cam: G.cam, holes: holes.join(' ') };
  })()`;
}

(async () => {
  const b = await launch({ port: 9792, w: 1000, h: 800 });
  const out = {};
  for (const [tag, url] of [['old', OLD], ['new', NEW]]) {
    const p = await b.newPage();
    await p.goto(url, 3600);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
    await sleep(400);
    const info = await p.eval(boot());
    const r = await p.eval(`(function(){var cv=document.getElementById('cv');var q=cv.getBoundingClientRect();return {l:q.left,t:q.top,w:q.width,h:q.height};})()`);
    const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: r.l, y: r.t, width: r.w, height: r.h, scale: 1 } });
    fs.writeFileSync(path.join(__dirname, '_v462', tag + '.png'), Buffer.from(shot.data, 'base64'));
    out[tag] = info;
    console.log(tag, JSON.stringify(info));
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
