// test/_probe-v466-map.js — 隨機地圖硬牆／軟牆數量：舊參數 vs 新參數（同一組種子）
const { launch, sleep } = require('./cdp');
const path = require('path');
const FRESH = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/') + '?seed=12345';
const OLD = 'file:///' + path.join(__dirname, '_v466/old.html').replace(/\\/g, '/') + '?seed=12345';

const COUNT = `(function(){
  var G = __BH.Game, hard = 0, soft = 0, floor = 0, inner = 0;
  for (var y = 1; y < G.rows - 1; y++) for (var x = 1; x < G.cols - 1; x++) {
    inner++;
    var v = G.grid[y][x];
    if (v === 1) hard++; else if (v === 2) soft++; else floor++;
  }
  return { cols: G.cols, rows: G.rows, T: G.T, hard: hard, soft: soft, floor: floor, inner: inner,
           hardPct: +(hard / inner * 100).toFixed(1), softPct: +(soft / inner * 100).toFixed(1) };
})()`;

(async function () {
  const br = await launch({ port: 9562, w: 390, h: 844 });
  const np = await br.newPage();
  const op = await br.newPage();
  for (const p of [np, op]) {
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.resize(390, 844, true);
  }
  await np.goto(FRESH, 3200);
  await op.goto(OLD, 3200);
  for (let i = 0; i < 40; i++) {
    const a = await np.eval('typeof __BH').catch(() => 'x');
    const b = await op.eval('typeof __BH').catch(() => 'x');
    if (a === 'object' && b === 'object') break;
    await sleep(300);
  }
  await np.eval("__BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  await op.eval("__BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");

  console.log('關卡      新：硬/軟/空地        舊：硬/軟/空地');
  for (let n = 1; n <= 5; n++) {
    await np.eval(`__BH.startMapTest(${n}); 1`);
    await op.eval(`__BH.startMapTest(${n}); 1`);
    await sleep(400);
    const a = await np.eval(COUNT);
    const b = await op.eval(COUNT);
    console.log(
      (a.cols + 'x' + a.rows).padEnd(7),
      ('硬 ' + a.hard + '（' + a.hardPct + '%） 軟 ' + a.soft + '（' + a.softPct + '%） 空 ' + a.floor).padEnd(34),
      '硬 ' + b.hard + '（' + b.hardPct + '%） 軟 ' + b.soft + '（' + b.softPct + '%） 空 ' + b.floor);
  }
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
