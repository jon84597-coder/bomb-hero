// test/shot74-v414-map.js — v4.14：單人第 9 關 / 第 32 關（有機地形）畫面
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v414');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const br = await launch({ w: 1100, h: 760, port: 9387 });
  const page = await br.newPage();
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame = function(){ return 0; };'
  });
  await page.goto(URL, 1800);
  await sleep(600);

  for (const st of [1, 4]) {
    const res = await page.eval(`(function(){
      var P = window.__BH;
      P.settings.size = 'M';
      P.settings.hazards = 'off';
      P.settings.ctrl = 'kb';
      P.startSolo(${st}, false);
      P.Game.state = 'play';
      for (var i = 0; i < 40; i++) P.updateWorld(1/60);
      try { P.render(); } catch (e) { return { ok:false, err:e.message }; }
      var cv = document.getElementById('cv');
      return { ok:true, dpr: cv.width, stage: P.Game.stage,
               map: P.Game.mapInfo && P.Game.mapInfo.n,
               theme: P.Game.theme && P.Game.theme.name,
               enemies: P.Game.enemies.length,
               boss: P.Game.enemies.filter(function(e){return e.type==='boss';}).length,
               door: P.Game.door ? (P.Game.door.x + ',' + P.Game.door.y) : 'none',
               data: cv.toDataURL('image/png') };
    })()`);
    if (!res.ok) { console.log('stage ' + st + ' FAIL ' + res.err); continue; }
    fs.writeFileSync(path.join(OUT, 'v414-stage' + st + '.png'),
      Buffer.from(res.data.split(',')[1], 'base64'));
    delete res.data;
    console.log('stage ' + st + ': ' + JSON.stringify(res));
  }
  await br.close();
})();
