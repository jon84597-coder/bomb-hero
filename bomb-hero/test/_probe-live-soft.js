// 線上實測（Render）：軟牆腳下陰影是否真的生效
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v524');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  const b = await launch({ port: 9837, w: 430, h: 932 });
  const p = await b.newPage();
  await p.resize(430, 932, true);
  await p.goto('https://bomb-hero-game.onrender.com/?v=' + Date.now(), 14000);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(400); }
  await sleep(1500);
  console.log('VERSION = ' + await p.eval('(window.__BH && window.__BH.VERSION) || "?"'));
  console.log('AO_SOFT_W = ' + await p.eval('(function(){var s=document.documentElement.innerHTML;var m=/const AO_SOFT_W = ([\\d.]+)/.exec(s);return m?m[1]:"?";})()'));

  for (const [st, stage] of [['sand', 5], ['forest', 3]]) {
    const r = await p.eval(`(function(){
      var BH=window.__BH, G=BH.Game;
      BH.startSolo(${stage}, false); G.state='play'; G.countdown=0;
      ['ovIn','ov'].forEach(function(id){var e=document.getElementById(id); if(e) e.style.setProperty('display','none','important');});
      for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++) {
        if (G.grid[y][x]===2) { G.camX=(BH.VIEW_W||720)/2-(x+0.5)*G.T; G.camY=(BH.VIEW_H||540)/2-(y+0.5)*G.T;
          if (BH.updateCamera) BH.updateCamera(); BH.render();
          return {x:x,y:y,T:G.T,bands:BH.floorAOSoftBands(x,y,G.T).length}; }
      }
      return null; })()`);
    console.log(st + ' → ' + JSON.stringify(r));
    await sleep(500);
    await p.shot(path.join(OUT, 'online-' + st + '.png'));
  }
  // 版本紀錄
  await p.eval(`(function(){ var b=document.getElementById('verLogBtn'); if(b) b.click(); return 1; })()`);
  await sleep(800);
  await p.shot(path.join(OUT, 'online-verlog.png'));
  b.close();
})();
