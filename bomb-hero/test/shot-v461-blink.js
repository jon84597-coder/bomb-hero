// v4.61 目檢：鑽地怪的「集氣」與「落點警示圈」
//   左半：集氣中（抖動＋聚氣球）  右半：消失中（落點亮圈）
const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9794, w: 1200, h: 760 });
  const p = await b.newPage();
  await p.goto(URL, 3600);
  for (let i = 0; i < 80; i++) {
    if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break;
    await sleep(250);
  }
  await sleep(500);

  async function shot(tag, setup) {
    const info = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T;
      BH.startSolo(1, true);
      var ov = document.getElementById('ovIn');
      if (ov) { ov.classList.add('hide'); ov.style.setProperty('display','none','important'); }
      G.state = 'play'; G.countdown = 0;
      for (var y = 1; y < G.rows - 1; y++) for (var x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
      G.bombs.length = 0; G.flames.length = 0; G.items.length = 0; G.enemies.length = 0;
      G.pets.length = 0;
      T = G.T;
      var p = G.players[0];
      p.x = 8 * T + T / 2; p.y = 7 * T + T / 2; p.invuln = 99;
      ${setup}
      G.zoom = Math.min(document.getElementById('cv').width / (G.cols * T),
                        document.getElementById('cv').height / (G.rows * T)) * .98;
      if (BH.updateCamera) BH.updateCamera();
      BH.render();
      return { T: T, bx: e.bx, by: e.by, castT: e.castT, blinkT: e.blinkT };
    })()`);
    console.log(tag, JSON.stringify(info));
    const r = await p.eval(`(function(){var cv=document.getElementById('cv');var q=cv.getBoundingClientRect();return {l:q.left,t:q.top,w:q.width,h:q.height};})()`);
    const s = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: r.l, y: r.t, width: r.w, height: r.h, scale: 1 } });
    require('fs').writeFileSync(path.join(__dirname, '_v461', 'blink-' + tag + '.png'), Buffer.from(s.data, 'base64'));
  }

  // 集氣中：走完一次風怒蓄力 → 進入 blink 的 castT
  await shot('cast', `
    var e = BH.makeEnemy(5, 6, 'imp', 1, 1);
    e.aggro = true; e.skCd = 0; G.enemies.push(e);
    e.windT = 0; e.dashT = 0;
    e.castT = BH.FOE_CAST_WINDUP * .45;
    G.gameT = 3.0;
  `);

  // 消失中：落點亮圈（警示圈最後 1/3）
  await shot('mark', `
    var e = BH.makeEnemy(5, 6, 'imp', 1, 1);
    e.aggro = true; G.enemies.push(e);
    e.bx = 7; e.by = 7;
    e.blinkT = BH.FOE_BLINK_T * .55;
    G.gameT = 4.4;
  `);

  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
