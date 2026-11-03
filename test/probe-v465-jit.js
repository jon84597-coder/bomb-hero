// test/probe-v465-jit.js — 驗證「客人畫面一直跳」是不是 resizeView 跟快照搶 Game.T
const { launch, sleep } = require('./cdp');
const path = require('path');

const FILE = 'file:///' + path.join(__dirname, '../bomb-hero/index.html').replace(/\\/g, '/');

(async function () {
  const br = await launch({ port: 9471, w: 390, h: 844 });
  const page = await br.newPage();
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.resize(390, 844, true);
  await page.goto(FILE, 3500);

  await page.eval(`__BH.startMapTest(1); 1`);
  await sleep(2500);

  console.log('--- 手機直放 390x844 / mapTest1 (18x16) ---');
  console.log(await page.eval(`(function(){
    var G = __BH.Game, v = __BH.viewInfo();
    return JSON.stringify({ view: [v.w, v.h], T: G.T, cols: G.cols, rows: G.rows,
      mapPx: [G.cols*G.T, G.rows*G.T], fillH: +(G.rows*G.T / v.h).toFixed(2),
      fillW: +(G.cols*G.T / v.w).toFixed(2), zoom: G.zoom, bigMap: !!G.bigMap,
      foes: (G.enemies||[]).length });
  })()`));

  console.log('--- resizeView 前置條件 ---');
  console.log(await page.eval(`(function(){
    var G = __BH.Game;
    return JSON.stringify({ state: G.state, touch: document.body.className.indexOf('touch') >= 0,
      bodyClass: document.body.className, tileSizeNow: __BH.tileSize(), T: G.T,
      gridOk: !!(G.grid && G.grid.length), cols: G.cols });
  })()`));

  console.log('--- 模擬客人：房主 T 比本地大，每 0.4s 跑一次 resizeView ---');
  await page.eval(`(function(){
    var G = __BH.Game, p = G.players[0];
    window.__log = [];
    window.__px0 = p.x;
    G.state = 'play';
    G.T = 54;                                   // 快照蓋上房主的格子大小
    p.tx = 5 * 54 + 27; p.ty = 5 * 54 + 27;      // 房主座標系
    p.x = p.tx; p.y = p.ty;
    return 1;
  })()`);

  const out = [];
  for (let i = 0; i < 6; i++) {
    out.push(await page.eval(`(function(){
      var G = __BH.Game, p = G.players[0];
      var before = { T: G.T, px: Math.round(p.x) };
      __BH.resizeView();
      var mid = { T: G.T, px: Math.round(p.x), camSnap: !!G.camSnap,
                  camDelta: Math.round(G.camX) };
      // 下一張快照（只改 T 與 tx/ty，不改 x）
      G.T = 54;
      p.tx = 5 * 54 + 27; p.ty = 5 * 54 + 27;
      return JSON.stringify({ before: before, afterResize: mid });
    })()`));
  }
  out.forEach((r, i) => console.log('  #' + i, r));

  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
