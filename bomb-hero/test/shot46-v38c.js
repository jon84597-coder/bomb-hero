// v3.8-C 目檢：第二關熔岩洞窟的新配色（硬牆 vs 軟磚 vs 地板）
const path = require('path');
const { launch, sleep } = require('./cdp');

(async function () {
  const br = await launch({ w: 1100, h: 800, port: 9523 });
  const page = await br.newPage();
  await page.goto('file:///' + path.resolve(__dirname, '..').replace(/\\/g, '/') + '/index.html', 2200);
  await sleep(700);

  await page.eval(`(function(){ window.__BH.startSolo(2); })()`);
  await sleep(600);
  await page.eval(`(function(){
    var b = document.querySelector('.overlay-in .mbtn');
    if (b && b.click) b.click();
    var G = window.__BH.Game;
    G.state = 'play'; G.countdown = 0;
    var p = G.players[0];
    if (p) { p.vx = 0; p.vy = 0; p.invuln = 99; }
    G.enemies = G.enemies || [];
    if (G.enemies) G.enemies.length = 0;   // 清掉怪，畫面乾淨好比較
  })()`);
  await sleep(900);
  await page.shot('test/v38c-1-lava.png');

  await br.close();
  console.log('done');
})().catch(e => { console.error(e.message); process.exit(1); });
