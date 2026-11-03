// v4.61：扫多张随机图，统计「外墙/硬墙」误判
// 误判 A：画出来的墙格被判成硬墙，但它 2 格内有 void（= 应该算外墙）→ 图里会出现浅色砖顶在外缘
// 误判 B：判成外墙，但 2 格内没有 void（= 其实在场地内部）→ 鹅卵石长进草地中间
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH;

function classify() {
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
  function isVoid(x, y) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return true;
    return g[y][x] === 1 && dist[y][x] >= 2;
  }
  function voidNear(x, y, r) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (isVoid(x + dx, y + dy)) return true;
    return false;
  }
  let drawn = 0, out = 0, badA = 0, badB = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] !== 1 || dist[y][x] < 0 || dist[y][x] > 1) continue;
    drawn++;
    const k = G.wallKind[y][x];
    const want = voidNear(x, y, 2);
    if (k === 1) out++;
    if (k === 2 && want) badA++;
    if (k === 1 && !want) badB++;
  }
  return { drawn: drawn, out: out, badA: badA, badB: badB, rows: rows, cols: cols };
}

let sum = { drawn: 0, out: 0, badA: 0, badB: 0 };
const lines = [];
for (let st = 1; st <= 32; st++) {
  try {
    BH.startSolo(st, false);
    G.state = 'play';
    P.markWallKinds();
    const r = classify();
    ['drawn', 'out', 'badA', 'badB'].forEach(function (k) { sum[k] += r[k]; });
    lines.push('st' + st + ' ' + r.cols + 'x' + r.rows + ' 墙' + r.drawn + ' 外墙' + r.out +
      ' 硬墙误判' + r.badA + ' 外墙误判' + r.badB);
  } catch (err) { lines.push('st' + st + ' ERR ' + err.message); }
}
console.log(lines.join('\n'));
console.log('合计：墙格 ' + sum.drawn + ' 外墙 ' + sum.out + ' A(硬墙顶在外缘) ' + sum.badA + ' B(鹅卵石在内部) ' + sum.badB);
