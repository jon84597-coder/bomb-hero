// v4.61：外墙判定诊断。印出 grid / 现有 wallKind / 候选规则（void 距离）
// 用法：node test/_probe461-wall.js <stage> [big]
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH;
const st = parseInt(process.argv[2] || '1', 10);
BH.startSolo(st, false);
G.state = 'play';
P.markWallKinds();
const rows = G.rows, cols = G.cols, g = G.grid;

// ---- 自己算 dist（离空地距离，上限 4）----
const dist = [], q = [];
for (let y = 0; y < rows; y++) { dist.push(new Array(cols).fill(-1)); }
for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (g[y][x] !== 1) { dist[y][x] = 0; q.push([x, y]); }
for (let i = 0; i < q.length; i++) {
  const x = q[i][0], y = q[i][1];
  if (dist[y][x] >= 4) continue;
  [[1,0],[-1,0],[0,1],[0,-1]].forEach(function (d) {
    const nx = x + d[0], ny = y + d[1];
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
    if (g[ny][nx] !== 1 || dist[ny][nx] >= 0) return;
    dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]);
  });
}
// void = 实心且 dist>=2
function isVoid(x, y) {
  if (x < 0 || y < 0 || x >= cols || y >= rows) return true;   // 出界也算 void
  return g[y][x] === 1 && dist[y][x] >= 2;
}
function voidWithin(x, y, r) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (isVoid(x + dx, y + dy)) return true;
  return false;
}
let same = 0, curOut = 0, candOut = 0, diff = [];
for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
  if (g[y][x] !== 1 || dist[y][x] < 0 || dist[y][x] > 1) continue;
  const cur = G.wallKind[y][x];
  if (cur === 0) continue;
  curOut++;
  const isOut = voidWithin(x, y, 2);
  if (isOut) candOut++;
  if ((cur === 1) === isOut) same++;
  else diff.push([x, y, cur, isOut ? 1 : 2]);
}
function dump(title, fn) {
  const o = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) line += fn(x, y);
    o.push(line);
  }
  console.log('--- ' + title + ' (cols ' + cols + ' rows ' + rows + ')');
  console.log(o.join('\n'));
}
dump('grid  .=空 #=硬 o=软', function (x, y) {
  const v = g[y][x];
  return v === 0 ? '.' : v === 2 ? 'o' : '#';
});
dump('wallKind  C=外墙 h=硬墙 .=不画', function (x, y) {
  if (g[y][x] !== 1) return ' ';
  const k = G.wallKind[y][x];
  return k === 1 ? 'C' : k === 2 ? 'h' : '.';
});
dump('dist 0..4   .=空地', function (x, y) {
  if (g[y][x] !== 1) return '.';
  const d = dist[y][x];
  return d < 0 ? '9' : String(d);
});
dump('diff  X=现外墙→候选硬  Y=现硬→候选外墙', function (x, y) {
  if (g[y][x] !== 1) return ' ';
  const cur = G.wallKind[y][x];
  if (cur === 0) return '.';
  const isOut = voidWithin(x, y, 2);
  if ((cur === 1) === isOut) return ' ';
  return isOut ? 'Y' : 'X';
});
console.log('画出的墙格 ' + curOut + '，现有外墙 ' + G.wallKind.flat().filter(function (k) { return k === 1; }).length +
  '，候选外墙 ' + candOut + '，一致 ' + same + '，不一致 ' + diff.length);
