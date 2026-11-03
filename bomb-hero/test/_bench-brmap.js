// test/_bench-brmap.js — 大逃殺地圖「可以多大」的實測：不同尺寸下 render() 的每幀成本
//   用真 Chrome 量（mock ctx 的 Proxy 成本不具參考性）
const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');

function scene(cols, rows, T) {
  return `(function(){
    var G = __BH.Game;
    __BH.settings.mapMode = 'random';
    __BH.startSolo(20, false);
    G.state = 'play';
    var T = ${T};
    G.cols = ${cols}; G.rows = ${rows}; G.T = T;
    G.grid = [];
    for (var y = 0; y < ${rows}; y++) {
      var row = [];
      for (var x = 0; x < ${cols}; x++) {
        var border = (x === 0 || y === 0 || x === ${cols} - 1 || y === ${rows} - 1);
        var rock = (!border && x % 7 === 3 && y % 6 === 2);
        var soft = (!border && !rock && ((x * 31 + y * 17) % 5 === 0));
        row.push(border || rock ? 1 : (soft ? 2 : 0));
      }
      G.grid.push(row);
    }
    G.wallKind = null; G.wallSize = null; G.hazards = [];
    for (var y2 = 0; y2 < ${rows}; y2++) { var hr = []; for (var x2 = 0; x2 < ${cols}; x2++) hr.push(null); G.hazards.push(hr); }
    G.enemies = []; G.bombs = []; G.flames = []; G.items = []; G.particles = []; G.bolts = []; G.pops = [];
    G.zoom = G.zoomTarget = 0.6; G.camSnap = true;
    var me = G.players[0]; me.x = G.T * 3; me.y = G.T * 3; me.invuln = 0;
    try { __BH.updateCamera(1); } catch (e) {}
    // 暖機
    for (var i = 0; i < 10; i++) __BH.render();
    var t0 = performance.now();
    for (var i2 = 0; i2 < 60; i2++) __BH.render();
    var ms = (performance.now() - t0) / 60;
    return JSON.stringify({ cols: ${cols}, rows: ${rows}, T: T, cells: ${cols} * ${rows}, msPerFrame: +ms.toFixed(2) });
  })()`;
}

(async function () {
  const br = await launch({ port: 9621, w: 390, h: 844 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) {
    const a = await p.eval('typeof __BH').catch(() => 'x');
    if (a === 'object') break;
    await sleep(300);
  }
  await p.eval("try{localStorage.setItem('bombhero-rotstip','1');localStorage.setItem('bombhero-rotsskip','1')}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  const cases = [
    [28, 25, 31],   // T5 現況
    [36, 30, 26],
    [44, 36, 24],
    [52, 42, 24],
    [60, 48, 24],
    [72, 56, 24]
  ];
  for (const c of cases) {
    const r = await p.eval(scene(c[0], c[1], c[2]));
    console.log(r);
    await sleep(120);
  }
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
