const { makeEnv } = require('./_sandbox.js');
function stats(G) {
  const cols = G.cols, rows = G.rows, M = G.brHardMark;
  const cells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (M[y][x]) cells.push([x, y]);
  // 2x2 實心（只看掩體）
  let sq = 0;
  for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols - 1; x++)
    if (M[y][x] && M[y][x + 1] && M[y + 1][x] && M[y + 1][x + 1]) sq++;
  // 半徑 3 內最多幾格掩體
  let densMax = 0;
  for (const [x, y] of cells) {
    let n = 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx + dy * dy > 9) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && M[ny][nx]) n++;
    }
    if (n > densMax) densMax = n;
  }
  // 連通塊大小（4 向）
  const seen = new Set(); let maxComp = 0, comps = 0;
  for (const [sx, sy] of cells) {
    const k0 = sy * cols + sx;
    if (seen.has(k0)) continue;
    comps++; let q = [k0]; seen.add(k0); let sz = 0;
    for (let i = 0; i < q.length; i++) {
      const id = q[i], x = id % cols, y = (id / cols) | 0; sz++;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const nk = ny * cols + nx;
        if (seen.has(nk) || !M[ny][nx]) continue;
        seen.add(nk); q.push(nk);
      }
    }
    if (sz > maxComp) maxComp = sz;
  }
  return { n: cells.length, sq, densMax, maxComp, comps };
}
for (let rep = 0; rep < 3; rep++) for (const map of [1, 0]) {
  const env = makeEnv(); const P = env.BH, G = env.G;
  P.BR.opt.map = map; P.BR.opt.n = map ? 100 : 50;
  const t0 = Date.now();
  P.startBR();
  console.log('rep' + rep, 'map=' + (map ? 'big  ' : 'small'), 'build', Date.now() - t0, 'ms', JSON.stringify(stats(G)));
}
