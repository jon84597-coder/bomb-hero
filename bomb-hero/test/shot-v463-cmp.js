// 舊版（v4.62）vs 新版：同一關、同一視窗、都縮到整張圖可見
//   node test/shot-v463-cmp.js 1
// 需要先抓舊版：git show cbadac2:bomb-hero/index.html > _oldbh/index.html
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const ST = parseInt(process.argv[2] || '1', 10);
const OLD = 'file:///' + path.resolve(__dirname, '../_oldbh/index.html').replace(/\\/g, '/');
const NEW = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9796, w: 1300, h: 1150 });
  for (const [tag, url] of [['old', OLD], ['new', NEW]]) {
    const p = await b.newPage();
    await p.goto(url, 3600);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
    await sleep(400);
    const info = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      BH.startSolo(${ST}, false);
      var ov = document.getElementById('ovIn'); if (ov) ov.style.setProperty('display','none','important');
      G.state = 'play'; G.countdown = 0;
      for (var i = 0; i < 90; i++) BH.updateWorld(1/60);
      var cv = document.getElementById('cv');
      G.zoom = Math.min(cv.width / ((G.cols + 2.4) * G.T), cv.height / ((G.rows + 2.4) * G.T));
      if (BH.updateCamera) BH.updateCamera();
      BH.render();
      return { zoom: G.zoom.toFixed(3) };
    })()`);
    const r = await p.eval(`(function(){var cv=document.getElementById('cv');var q=cv.getBoundingClientRect();return {l:q.left,t:q.top,w:q.width,h:q.height};})()`);
    const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: r.l, y: r.t, width: r.w, height: r.h, scale: 1 } });
    fs.writeFileSync(path.join(__dirname, '_v463', tag + '.png'), Buffer.from(shot.data, 'base64'));
    console.log(tag, JSON.stringify(info));
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
