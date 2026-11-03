// 量測：場內厚牆被「dist > 1 → 不畫」挖出的洞有幾格
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

function analyze(st) {
  P.settings.size = 'M';
  P.startSolo(st, false);
  P.markWallKinds();
  const wk = G.wallKind, cols = G.cols, rows = G.rows, g = G.grid;
  // 重算 dist / ed 以判斷「這格本該是牆」
  const dist = [];
  for (let y = 0; y < rows; y++) dist.push(new Array(cols).fill(-1));
  const q = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] !== 1) { dist[y][x] = 0; q.push([x, y]); }
  }
  for (let i = 0; i < q.length; i++) {
    const x = q[i][0], y = q[i][1];
    if (dist[y][x] >= 3) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (dist[ny][nx] >= 0) continue;
      dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]);
    }
  }
  // 真破洞 = 不畫的牆格，而且從陣列外面 flood fill（只走「不畫的牆格」）走不到它
  let zero = 0, hole = 0, solid = 0;
  const holes = [];
  const seen = [], q4 = [];
  for (let y = 0; y < rows; y++) seen.push(new Array(cols).fill(false));
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] !== 1) { seen[y][x] = true; continue; }     // 空地/軟磚是出口，當作連到外面
    if (wk[y][x] !== 0) { seen[y][x] = true; continue; }    // 有畫的牆是實體
  }
  for (let x = 0; x < cols; x++) { q4.push([x, 0]); q4.push([x, rows - 1]); }
  for (let y = 0; y < rows; y++) { q4.push([0, y]); q4.push([cols - 1, y]); }
  for (let i = 0; i < q4.length; i++) {
    const x = q4[i][0], y = q4[i][1];
    if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
    if (seen[y][x]) continue;
    seen[y][x] = true;
    q4.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] !== 1) continue;
    solid++;
    if (wk[y][x] === 0) { zero++; if (!seen[y][x]) { hole++; holes.push(x + ',' + y); } }
  }
  return { st, cols, rows, solid, zero, hole, holes: holes.slice(0, 8) };
}

const rows = [];
for (let st = 1; st <= 32; st++) rows.push(analyze(st));
let totHole = 0, maxHole = 0, worst = '';
rows.forEach(function (r) {
  totHole += r.hole;
  if (r.hole > maxHole) { maxHole = r.hole; worst = 'st' + r.st; }
});
console.log('關卡 | 格數 | 實心 | 不畫(0) | 其中是破洞');
rows.forEach(function (r) {
  if (r.hole > 0) console.log('  ' + r.st + '  | ' + r.cols + 'x' + r.rows + ' | ' + r.solid + ' | ' + r.zero + ' | ' + r.hole + '  ' + r.holes.join(' '));
});
console.log('總破洞格數', totHole, '最多', maxHole, worst);
