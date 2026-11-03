// v4.61：量测正式代码的墙分类结果（给断言定门槛）
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH;
const N = parseInt(process.argv[2] || '32', 10);
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function solid(x, y) {
  if (x < 0 || y < 0 || x >= G.cols || y >= G.rows) return true;
  return G.grid[y][x] === 1;
}
let tot = 0, rim = 0, inner = 0, badInner = 0, badOuter = 0, minOut = 99;
for (let st = 1; st <= N; st++) {
  P.clearMapTest(); P.startSolo(st, true); G.state = 'play'; P.markWallKinds();
  const k = G.wallKind || [];
  let r = 0, i2 = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    if (!k[y] || !k[y][x]) continue;
    tot++;
    let floor4 = 0, backSolid = false;
    for (let d = 0; d < 4; d++) {
      const dx = D4[d][0], dy = D4[d][1];
      if (!solid(x + dx, y + dy)) {
        floor4++;
        if (solid(x - dx, y - dy) && solid(x - dx * 2, y - dy * 2)) backSolid = true;
      }
    }
    if (k[y][x] === 1) { rim++; r++; if (floor4 === 4) badOuter++; }
    else { inner++; i2++; if (backSolid) badInner++; }
  }
  if (st <= 8) console.log('st' + st + ' 外牆' + r + ' 硬牆' + i2);
}
console.log('墙格 ' + tot + ' 外牆 ' + rim + ' 硬牆 ' + inner +
  ' 误判(硬墙在外缘) ' + badInner + ' 误判(四面空地被当外墙) ' + badOuter +
  ' 外墙占比 ' + Math.round(rim / tot * 100) + '%');
