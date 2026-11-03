// v4.64 探針：對戰模式連續換圖，檢查「掉圖」（地板與牆同時消失的格子）
//   掉圖 = grid 是牆(1) 但 wallKind=0（不畫）→ 地板迴圈跳過、牆迴圈也跳過 → 露出頁面底色
//   正常的不畫格只該出現在「連到地圖外框的厚岩層內部」（輪廓凹凸用）
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;
const src = require('fs').readFileSync(__dirname + '/../index.html', 'utf8');
const m = src.match(/const SIZES = \{\s*([\s\S]*?)\n\};/);

P.settings.size = 'M';
P.settings.hazards = 'on';
P.settings.sd = 'off';
if (!P.buildMap) { console.log('NO buildMap export'); process.exit(1); }

function connMap(cols, rows, g) {
  const conn = [];
  for (let y = 0; y < rows; y++) conn.push(new Array(cols).fill(false));
  const q = [];
  for (let x = 0; x < cols; x++) { q.push([x, 0]); q.push([x, rows - 1]); }
  for (let y = 0; y < rows; y++) { q.push([0, y]); q.push([cols - 1, y]); }
  for (let i = 0; i < q.length; i++) {
    const x = q[i][0], y = q[i][1];
    if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
    if (conn[y][x] || g[y][x] !== 1) continue;
    conn[y][x] = true;
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return conn;
}

function audit(tag) {
  // 模擬 render() 的懶計算條件
  if (!G.wallKind || G.wallSize !== (G.cols + 'x' + G.rows)) P.markWallKinds();
  const cols = G.cols, rows = G.rows, g = G.grid;
  const conn = connMap(cols, rows, g);
  let solid = 0, hidden = 0, orphanHidden = 0, orphanList = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] !== 1) continue;
    solid++;
    if (G.wallKind[y][x] === 0) {
      hidden++;
      if (!conn[y][x]) { orphanHidden++; if (orphanList.length < 4) orphanList.push(x + ',' + y); }
    }
  }
  const bad = orphanHidden > 0 ? '  <<< 掉圖' : '';
  console.log(tag.padEnd(26) + ' ' + cols + 'x' + rows + '  牆 ' + String(solid).padStart(4) +
    '  不畫 ' + String(hidden).padStart(4) + '  場內黑洞 ' + orphanHidden +
    (orphanList.length ? ' [' + orphanList.join(' ') + ']' : '') + bad);
  return orphanHidden;
}

let bad = 0;
// 連續 8 回合（尺寸輪替 → 以前一定錯位；現在每回合都必須乾淨）
const sizes = ['S', 'M', 'L', 'M'];
for (let i = 0; i < 8; i++) {
  P.settings.size = sizes[i % sizes.length];
  P.buildMap(15, 13, P.THEMES[i % 8], { spawns: [{ x: 1, y: 1 }], items: 18, emptyRate: .35 });
  G.t = 0;
  bad += audit('回合' + (i + 1) + ' 主題' + (i % 8));
  // 模擬突死縮圈：把外圈往內補幾圈牆
  const cols = G.cols, rows = G.rows;
  if (!G.sdRock) G.sdRock = {};
  for (let k = 0; k < 3; k++) {
    const x0 = 1 + k, y0 = 1 + k, x1 = cols - 2 - k, y1 = rows - 2 - k;
    for (let x = x0; x <= x1; x++) { G.grid[y0][x] = 1; G.sdRock[y0 * cols + x] = 1; G.grid[y1][x] = 1; G.sdRock[y1 * cols + x] = 1; }
    for (let y = y0; y <= y1; y++) { G.grid[y][x0] = 1; G.sdRock[y * cols + x0] = 1; G.grid[y][x1] = 1; G.sdRock[y * cols + x1] = 1; }
  }
  G.sdActive = true;                 // 真實流程：縮圈一開始就會設這個旗標
  G.wallKind = null; G.wallSize = null;
  bad += audit('  └ 縮圈 3 圈後');
  G.sdActive = false;
}
console.log(bad === 0 ? '\nOK：沒有任何場內黑洞 / 掉圖' : '\nFAIL：' + bad + ' 格掉圖');
process.exit(bad === 0 ? 0 : 1);
