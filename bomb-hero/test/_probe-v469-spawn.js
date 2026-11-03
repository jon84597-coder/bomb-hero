// v4.69 探針：出生點「半徑 1 淨空、第 2 格起就要有牆」
//   node test/_probe-v469-spawn.js
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

function ring(sp, r) {
  const out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = sp.x + dx, y = sp.y + dy;
    if (x < 0 || y < 0 || x >= G.cols || y >= G.rows) continue;
    out.push([x, y]);
  }
  return out;
}
function stats(sp, r) {
  const cells = ring(sp, r);
  let wall = 0, soft = 0;
  cells.forEach(function (c) {
    const v = G.grid[c[1]][c[0]];
    if (v === 1) wall++;
    else if (v === 2) soft++;
  });
  return { n: cells.length, wall, soft, any: wall + soft };
}

console.log('關卡            半徑1 牆/軟/格      半徑2 牆/軟/格      半徑3 牆/軟');
const rows = [];
for (let t = 1; t <= 5; t++) {
  for (const seed of [111, 222, 777]) {
    P.startMapTest(t);
    G.mapTestSeed = seed;
    P.startSolo(1, false);
    const sp = G.spawnCell;
    const a = stats(sp, 1), b = stats(sp, 2), c = stats(sp, 3);
    rows.push({ t, seed, a, b, c });
    console.log(('T' + t + ' seed' + seed).padEnd(14) +
      (a.wall + '/' + a.soft + '/' + a.n).padEnd(20) +
      (b.wall + '/' + b.soft + '/' + b.n).padEnd(20) +
      (c.wall + '/' + c.soft));
  }
}
// 一般關卡
P.clearMapTest();
P.startSolo(1, false);
{
  const sp = G.spawnCell;
  const a = stats(sp, 1), b = stats(sp, 2), c = stats(sp, 3);
  console.log('一般關卡(15x13)'.padEnd(13) +
    (a.wall + '/' + a.soft + '/' + a.n).padEnd(20) +
    (b.wall + '/' + b.soft + '/' + b.n).padEnd(20) +
    (c.wall + '/' + c.soft));
  rows.push({ t: 0, seed: 0, a, b, c });
}

const bad1 = rows.filter(function (r) { return r.a.any > 0; }).length;
const noWall2 = rows.filter(function (r) { return r.b.any === 0; }).length;
console.log('\n半徑 1 還有牆的圖：' + bad1 + ' / ' + rows.length);
console.log('半徑 2 完全沒牆的圖：' + noWall2 + ' / ' + rows.length);
const avg2 = rows.reduce(function (s, r) { return s + r.b.any / r.b.n; }, 0) / rows.length;
console.log('半徑 2 平均牆率：' + Math.round(avg2 * 100) + '%');
