// 32 關軟磚密度掃描（可指定檔案：node _probe460-sweep.js [檔名]）
const { launch, sleep } = require('./cdp');
const path = require('path');
const FILE = process.argv[2] || '../index.html';
const URL = 'file:///' + path.resolve(__dirname, FILE).replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9787, w: 900, h: 700 });
  const p = await b.newPage();
  await p.goto(URL, 3600);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
  await sleep(400);
  const out = await p.eval(`(function(){
    var BH = window.__BH, G = BH.Game, rows = [], sum = 0, lo = null, hi = null;
    for (var st = 1; st <= 32; st++) {
      BH.startSolo(st, false); G.state = 'play';
      var o = 0, s = 0;
      for (var y = 0; y < G.rows; y++) for (var x = 0; x < G.cols; x++) {
        var v = G.grid[y][x]; if (v === 0) o++; else if (v === 2) s++;
      }
      var q = s + o > 0 ? s / (s + o) : 0;
      sum += q;
      rows.push(st + ':' + Math.round(q * 100) + '%');
      if (!lo || q < lo.q) lo = { st: st, q: q };
      if (!hi || q > hi.q) hi = { st: st, q: q };
    }
    return { avg: Math.round(sum / 32 * 100), lo: lo.st + ' ' + Math.round(lo.q * 100) + '%',
             hi: hi.st + ' ' + Math.round(hi.q * 100) + '%', rows: rows.join(' ') };
  })()`);
  console.log('平均', out.avg + '%', '  最低 st' + out.lo, '  最高 st' + out.hi);
  console.log(out.rows);
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
