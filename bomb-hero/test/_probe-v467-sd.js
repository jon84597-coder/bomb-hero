// v4.67 探針：對戰縮圈時，場內硬牆有沒有被誤畫成外牆素材
//   node test/_probe-v467-sd.js
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

P.settings.count = 4; P.settings.size = 'M'; P.settings.time = 60; P.settings.sd = 'on';
P.startBattle();
G.state = 'play';

function countKind() {
  const cols = G.cols, rows = G.rows, g = G.grid;
  G.wallKind = null; P.markWallKinds();
  const wk = G.wallKind;
  let outer = 0, stone = 0, none = 0, rock = 0, rockNone = 0, stoneOnRock = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] !== 1) continue;
    const isRock = !!(G.sdRock && G.sdRock[y * cols + x]);
    if (isRock) rock++;
    if (wk[y][x] === 1) { outer++; if (isRock) stoneOnRock++; }
    else if (wk[y][x] === 2) stone++;
    else { none++; if (isRock) rockNone++; }
  }
  return { outer: outer, stone: stone, none: none, rock: rock, rockNone: rockNone };
}

console.log('縮圈前', JSON.stringify(countKind()));
G.sdActive = true;
for (const round of [1, 2, 3, 4, 5, 6, 8, 10, 12]) {
  while (G.sdIndex < round * Math.max(1, Math.round(G.sdList.length / 24))) {
    const c = G.sdList[G.sdIndex++];
    if (G.grid[c[1]][c[0]] !== 1) {
      G.grid[c[1]][c[0]] = 1;
      if (!G.sdRock) G.sdRock = {};
      G.sdRock[c[1] * G.cols + c[0]] = 1;
      G.wallKind = null;
    }
  }
  const a = countKind();
  // 關掉 sdActive 再算一次 → 差額就是「被 sdActive 硬改成外牆」的場內硬牆
  G.sdActive = false;
  const wkNoFlag = (function () { G.wallKind = null; P.markWallKinds(); return G.wallKind; })();
  G.sdActive = true;
  G.wallKind = null; P.markWallKinds();
  let wrongMat = 0, undrawn = 0;
  const cols = G.cols, rows = G.rows;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (G.grid[y][x] !== 1) continue;
    if (G.wallKind[y][x] === 1 && wkNoFlag[y][x] === 2) wrongMat++;
    if (wkNoFlag[y][x] === 0) { const r = G.sdRock && G.sdRock[y * cols + x]; if (r) undrawn++; }
  }
  console.log('第' + round + '輪 已落 ' + G.sdIndex + ' 格 | 外牆素材 ' + a.outer + ' 硬牆素材 ' + a.stone +
    ' 不畫 ' + a.none + ' | 落石 ' + a.rock + '（其中沒畫 ' + a.rockNone + '）| 被誤改素材 ' + wrongMat +
    ' | sdRock 若不整片畫會少 ' + undrawn);
}
