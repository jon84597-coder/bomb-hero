// 掃 32 關：外牆三大病（孤島碎塊／淺色磚補在外牆帶／封閉破洞）＋ 小怪有沒有生在牆上
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

function scan(st) {
  P.settings.size = 'M';
  P.startSolo(st, false);
  P.markWallKinds();
  const wk = G.wallKind, cols = G.cols, rows = G.rows, g = G.grid;
  const solid = function (x, y) { return x >= 0 && y >= 0 && x < cols && y < rows && g[y][x] === 1; };
  // conn
  const conn = [];
  for (let y = 0; y < rows; y++) conn.push(new Array(cols).fill(false));
  const q = [];
  for (let x = 0; x < cols; x++) { q.push([x, 0]); q.push([x, rows - 1]); }
  for (let y = 0; y < rows; y++) { q.push([0, y]); q.push([cols - 1, y]); }
  for (let i = 0; i < q.length; i++) {
    const x = q[i][0], y = q[i][1];
    if (!solid(x, y) || conn[y][x]) continue;
    conn[y][x] = true;
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  let orphan = 0, creamInRim = 0, drawn = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] !== 1 || !wk[y][x]) continue;
    drawn++;
    let openN = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (g[ny][nx] !== 1) openN++;
    }
    if (!openN) orphan++;
    if (wk[y][x] === 2) {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        if (solid(x + d[0], y + d[1]) && conn[y + d[1]][x + d[0]]) creamInRim++;
      });
    }
  }
  // 封閉破洞
  const seen = [], q2 = [];
  for (let y = 0; y < rows; y++) { seen.push([]); for (let x = 0; x < cols; x++) seen[y].push(g[y][x] !== 1 || wk[y][x] !== 0); }
  for (let x = 0; x < cols; x++) { q2.push([x, 0]); q2.push([x, rows - 1]); }
  for (let y = 0; y < rows; y++) { q2.push([0, y]); q2.push([cols - 1, y]); }
  for (let i = 0; i < q2.length; i++) {
    const x = q2[i][0], y = q2[i][1];
    if (x < 0 || y < 0 || x >= cols || y >= rows || seen[y][x]) continue;
    seen[y][x] = true; q2.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  let closedHole = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] === 1 && wk[y][x] === 0 && !seen[y][x]) closedHole++;
  }
  // 小怪：生在牆上？生在「四面都是牆的密封地板」？走不到？
  let foeOnWall = 0, foeSealed = 0, foeUnreach = 0;
  // 從出生點 BFS 可走區域
  const reach = [];
  for (let y = 0; y < rows; y++) reach.push(new Array(cols).fill(false));
  const sp = G.spawnCell || { x: 1, y: 1 };
  const qr = [[sp.x, sp.y]];
  if (sp.x >= 0 && sp.y >= 0 && sp.x < cols && sp.y < rows) reach[sp.y][sp.x] = true;
  for (let i = 0; i < qr.length; i++) {
    const x = qr[i][0], y = qr[i][1];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      const nx = x + d[0], ny = y + d[1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
      if (reach[ny][nx] || g[ny][nx] === 1) return;
      reach[ny][nx] = true; qr.push([nx, ny]);
    });
  }
  let sealedFloor = 0, unreachFloor = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] === 1) continue;
    if (!reach[y][x]) unreachFloor++;
    let solidN = 0;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      const nx = x + d[0], ny = y + d[1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || g[ny][nx] === 1) solidN++;
    });
    if (solidN === 4) sealedFloor++;
  }
  (G.enemies || []).forEach(function (e) {
    const cx = Math.floor(e.x / G.T), cy = Math.floor(e.y / G.T);
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) { foeOnWall++; return; }
    if (g[cy][cx] === 1) foeOnWall++;
    else {
      let solidN = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const nx = cx + d[0], ny = cy + d[1];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || g[ny][nx] === 1) solidN++;
      });
      if (solidN === 4) foeSealed++;
      if (!reach[cy][cx]) foeUnreach++;
    }
  });
  return { st, drawn, orphan, creamInRim, closedHole, foeOnWall, foeSealed, foeUnreach, sealedFloor, unreachFloor, foes: (G.enemies || []).length };
}

const rows = [];
for (let st = 1; st <= 32; st++) rows.push(scan(st));
let tO = 0, tC = 0, tH = 0, tF = 0, tS = 0, tU = 0, tSF = 0, tUF = 0;
rows.forEach(function (r) { tO += r.orphan; tC += r.creamInRim; tH += r.closedHole; tF += r.foeOnWall; tS += r.foeSealed; tU += r.foeUnreach; tSF += r.sealedFloor; tUF += r.unreachFloor; });
const bad = rows.filter(function (r) { return r.orphan || r.creamInRim || r.closedHole || r.foeOnWall || r.foeSealed || r.foeUnreach || r.sealedFloor || r.unreachFloor; });
if (bad.length) bad.forEach(function (r) {
  console.log('  st' + r.st + '  孤島=' + r.orphan + ' 淺磚=' + r.creamInRim + ' 破洞=' + r.closedHole +
              ' 怪在牆上=' + r.foeOnWall + ' 怪密封=' + r.foeSealed + ' 怪走不到=' + r.foeUnreach +
              ' 密封地板=' + r.sealedFloor + ' 走不到地板=' + r.unreachFloor + ' (怪' + r.foes + ')');
});
console.log('總計：孤島 ' + tO + '／淺磚補外牆 ' + tC + '／封閉破洞 ' + tH + '／怪在牆上 ' + tF +
            '／怪在密封格 ' + tS + '／怪走不到 ' + tU + '／密封地板格 ' + tSF + '／走不到地板格 ' + tUF);
