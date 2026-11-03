// v4.61：比较「ed 单用」vs「ed + void2」的外墙判定
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH;
const N = parseInt(process.argv[2] || '32', 10);

function compute() {
  const rows = G.rows, cols = G.cols, g = G.grid;
  const dist = [], q = [];
  for (let y = 0; y < rows; y++) dist.push(new Array(cols).fill(-1));
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (g[y][x] !== 1) { dist[y][x] = 0; q.push([x, y]); }
  for (let i = 0; i < q.length; i++) {
    const x = q[i][0], y = q[i][1];
    if (dist[y][x] >= 4) continue;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      const nx = x + d[0], ny = y + d[1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
      if (g[ny][nx] !== 1 || dist[ny][nx] >= 0) return;
      dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]);
    });
  }
  function void2(x, y) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (g[ny][nx] === 1 && dist[ny][nx] >= 2) return true;
    }
    return false;
  }
  const ed = [];
  for (let y = 0; y < rows; y++) ed.push(new Array(cols).fill(-1));
  const q2 = [];
  for (let x = 0; x < cols; x++) { q2.push([x, 0, 0]); q2.push([x, rows - 1, 0]); }
  for (let y = 0; y < rows; y++) { q2.push([0, y, 0]); q2.push([cols - 1, y, 0]); }
  for (let i = 0; i < q2.length; i++) {
    const x = q2[i][0], y = q2[i][1], d = q2[i][2];
    if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
    if (ed[y][x] >= 0 || g[y][x] !== 1) continue;
    ed[y][x] = d;
    if (d < 2) q2.push([x + 1, y, d + 1], [x - 1, y, d + 1], [x, y + 1, d + 1], [x, y - 1, d + 1]);
  }
  let drawn = 0, curOut = 0, hyb = 0, deepInterior = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] !== 1 || dist[y][x] < 0 || dist[y][x] > 1) continue;
    drawn++;
    const a = ed[y][x] >= 0;
    if (a) curOut++;
    if (a || void2(x, y)) hyb++;
    if (!a && void2(x, y)) {
      const dEdge = Math.min(x, y, cols - 1 - x, rows - 1 - y);
      if (dEdge > 3) deepInterior++;
    }
  }
  return { drawn: drawn, curOut: curOut, hyb: hyb, deep: deepInterior };
}

let sum = { drawn: 0, curOut: 0, hyb: 0, deep: 0 };
const rows = [];
for (let st = 1; st <= N; st++) {
  P.clearMapTest(); P.startSolo(st, true); G.state = 'play'; P.markWallKinds();
  const r = compute();
  ['drawn', 'curOut', 'hyb', 'deep'].forEach(function (k) { sum[k] += r[k]; });
  if (st <= 10 || st === 29) rows.push('st' + st + ' 墙' + r.drawn + ' 现外墙' + r.curOut + ' 混合' + r.hyb + ' 远离边框的补判' + r.deep);
}
console.log(rows.join('\n'));
console.log('合计 墙 ' + sum.drawn + ' 现外墙 ' + sum.curOut + ' 混合 ' + sum.hyb + '（远离边框的补判 ' + sum.deep + '）');
