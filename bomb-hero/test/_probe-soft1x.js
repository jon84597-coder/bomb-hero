// 正常縮放（玩家實際看到的比例）下的軟牆陰影
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v524');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  const b = await launch({ port: 9836, w: 430, h: 932 });
  const p = await b.newPage();
  await p.resize(430, 932, true);
  await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 5000);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(800);
  for (const [st, stage] of [['forest', 3], ['sand', 5], ['ice', 9]]) {
    await p.eval(`(function(){
      var BH=window.__BH, G=BH.Game;
      BH.startSolo(${stage}, false); G.state='play'; G.countdown=0;
      ['ovIn','ov'].forEach(function(id){var e=document.getElementById(id); if(e) e.style.setProperty('display','none','important');});
      // 找一格軟磚，把鏡頭對準它
      for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++) {
        if (G.grid[y][x]===2) { G.camX=(BH.VIEW_W||720)/2-(x+0.5)*G.T; G.camY=(BH.VIEW_H||540)/2-(y+0.5)*G.T;
          if (BH.updateCamera) BH.updateCamera(); BH.render(); return 1; }
      }
      return 0; })()`);
    await sleep(400);
    await p.shot(path.join(OUT, 'live1x-' + st + '.png'));
    console.log('shot ' + st);
  }
  b.close();
})();
