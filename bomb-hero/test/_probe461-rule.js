// v4.61：比较三种「外墙」判定的差异
//   A 现行：从地图阵列外框沿实心格 BFS 2 步（ed>=0）
//   B 空洞距离：2 格内有 void（实心且 dist>=2）
//   C 射线：往「背对空地的方向」连续 2 格都是实心 → 外缘
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH;
const rule = process.argv[3] || 'C';

function solid(x, y) {
  const g = G.grid;
  if (x < 0 || y < 0 || x >= G.cols || y >= G.rows) return true;
  return g[y][x] === 1;
}
function rayOuter(x, y) {
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let i = 0; i < 4; i++) {
    const d = D[i];
    if (!solid(x + d[0], y + d[1])) {            // 这一侧是空地 → 看「背对它」的方向
      if (solid(x - d[0], y - d[1]) && solid(x - d[0] * 2, y - d[1] * 2)) return true;
    }
  }
  return false;
}
function distMap() {
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
  return dist;
}
let DIST = null;
function voidNear(x, y, r) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= G.cols || ny >= G.rows) continue;
    if (G.grid[ny][nx] === 1 && DIST[ny][nx] >= 2) return true;
  }
  return false;
}

let sum = { drawn: 0, curOut: 0, outB: 0, outC: 0, hardLeftC: 0 };
const lines = [];
for (let st = 1; st <= 32; st++) {
  BH.startSolo(st, false);
  G.state = 'play';
  P.markWallKinds();
  DIST = distMap();
  let drawn = 0, curOut = 0, outB = 0, outC = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    if (G.grid[y][x] !== 1) continue;
    if (DIST[y][x] < 0 || DIST[y][x] > 1) continue;
    drawn++;
    if (G.wallKind[y][x] === 1) curOut++;
    if (voidNear(x, y, 2)) outB++;
    if (rayOuter(x, y)) outC++;
  }
  sum.drawn += drawn; sum.curOut += curOut; sum.outB += outB; sum.outC += outC; sum.hardLeftC += drawn - outC;
  lines.push('st' + st + ' 墙' + drawn + ' 现外墙' + curOut + ' | B ' + outB + ' | C ' + outC + ' (硬墙剩 ' + (drawn - outC) + ')');
}
console.log(lines.slice(0, 8).join('\n'));
console.log('...');
console.log('合计 墙 ' + sum.drawn + ' 现外墙 ' + sum.curOut + ' B ' + sum.outB + ' C ' + sum.outC + ' 硬墙剩 ' + sum.hardLeftC);
