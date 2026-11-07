/* v5.40 探針：小地圖（56×44）跑 180 秒 —— 核彈/空投/縮圈會不會丟錯 */
const SB = require('./_sandbox');
function sim(map, n, dur, sec) {
  const env = SB.makeEnv();
  const P = env.BH, G = env.G;
  P.BR.opt.map = map; P.BR.opt.n = n; P.BR.opt.dur = dur; P.BR.opt.team = 1;
  P.startBR();
  G.state = 'play';
  let err = null, drops = 0, nukes = 0, fired = 0, zoneMax = 0;
  const t0 = Date.now();
  try {
    for (let i = 0; i < sec * 60; i++) {
      P.updateWorld(1 / 60);
      P.updateBR(1 / 60);
      if (G.brDrops) drops = Math.max(drops, G.brDrops.length);
      if (G.brNukes) nukes = Math.max(nukes, G.brNukes.filter(function (x) { return x; }).length);
      if (G.brNuke && G.brNuke.t) fired++;
      if (G.brZone) zoneMax = Math.max(zoneMax, G.brZone.phase | 0);
    }
  } catch (e) { err = e; }
  console.log('map=' + map + ' n=' + n + ' dur=' + dur + ' ' + sec + 's → ' +
    (err ? '✗ ' + err.message : '✓ alive=' + G.brAlive + ' drops(max)=' + drops +
      ' nukes(max)=' + nukes + ' zonePhase=' + zoneMax) + '  (' + (Date.now() - t0) + 'ms)');
  if (err) console.log((err.stack || '').split('\n').slice(1, 4).join('\n'));
}
sim(0, 20, 10, 180);
sim(0, 20, 5, 150);
sim(1, 30, 10, 60);
