// 實際遊戲畫面（1x）＋ 3 倍放大：看軟磚在真實尺寸下長什麼樣
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, process.argv[2] || '_v525');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

async function clipShot(p, file, clip, scale) {
  const r = await p.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: scale },
    captureBeyondViewport: false
  });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
}

(async () => {
  const b = await launch({ port: 9847, w: 430, h: 932 });
  const p = await b.newPage();
  await p.resize(430, 932, true);
  await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 6000);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(800);

  const stages = [1, 5, 9, 13, 17, 21, 25, 29];
  for (const st of stages) {
    const info = await p.eval(`(function(){
      var BH=window.__BH, G=BH.Game;
      BH.startSolo(${st}, false);
      G.state='play'; G.countdown=0; G.paused=false;
      ['ovIn','ov','hud'].forEach(function(id){var e=document.getElementById(id); if(e&&id!=='hud') e.style.setProperty('display','none','important');});
      // 找一組「附近有 3 塊以上軟磚」的格子當鏡頭中心
      var best=null, bestN=-1;
      for (var y=2;y<G.rows-2;y++) for (var x=2;x<G.cols-2;x++) {
        if (G.grid[y][x]!==0) continue;
        var n=0;
        for (var dy=-2;dy<=2;dy++) for (var dx=-2;dx<=2;dx++) if (G.grid[y+dy] && G.grid[y+dy][x+dx]===2) n++;
        if (n>bestN) { bestN=n; best=[x,y]; }
      }
      if (!best) return null;
      G.camX=(BH.VIEW_W||430)/2-(best[0]+0.5)*G.T;
      G.camY=(BH.VIEW_H||932)/2-(best[1]+0.5)*G.T;
      if (BH.updateCamera) BH.updateCamera();
      BH.render();
      return { at: best, softNear: bestN, T: G.T, style: (G.theme&&G.theme.style)||'?' };
    })()`);
    if (!info) { console.log(st + ' → 找不到軟磚'); continue; }
    console.log('stage ' + st + ' → ' + JSON.stringify(info));
    await sleep(350);
    await p.shot(path.join(OUT, 'live-' + st + '-' + info.style + '.png'));
    await clipShot(p, path.join(OUT, 'zoom-' + st + '-' + info.style + '.png'),
                   { x: 55, y: 280, w: 320, h: 320 }, 2.6);
  }
  b.close();
})();
