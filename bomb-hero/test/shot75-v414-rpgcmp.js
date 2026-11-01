// test/shot75-v414-rpgcmp.js — 比較：RPG 第 1 關（同一套有機地形）長什麼樣
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v414');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const br = await launch({ w: 1100, h: 760, port: 9389 });
  const page = await br.newPage();
  await page.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame = function(){ return 0; };'
  });
  await page.goto(URL, 1800);
  await sleep(600);
  const res = await page.eval(`(function(){
    var P = window.__BH;
    P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.ctrl = 'kb';
    P.startRpg(1);
    P.Game.state = 'play';
    for (var i = 0; i < 40; i++) P.updateWorld(1/60);
    P.render();
    var c = {0:0,1:0,2:0};
    for (var y=0;y<P.Game.rows;y++) for (var x=0;x<P.Game.cols;x++) c[P.Game.grid[y][x]]++;
    var cv = document.getElementById('cv');
    return { map: P.Game.mapInfo.n, cells: c, data: cv.toDataURL('image/png') };
  })()`);
  fs.writeFileSync(path.join(OUT, 'v414-rpg1.png'), Buffer.from(res.data.split(',')[1], 'base64'));
  console.log('rpg1 ' + res.map + ' cells=' + JSON.stringify(res.cells));
  await br.close();
})();
