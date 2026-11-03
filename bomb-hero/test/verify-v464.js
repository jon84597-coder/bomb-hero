// v4.64：全模式「牆分類 / 掉圖」掃描
//   掉圖 = grid 是實心(1) 但 wallKind=0（地板迴圈與牆迴圈都跳過）→ 露出頁面底色
//   合法的不畫格只有一種：連到地圖外框的厚岩層內部（輪廓凹凸用）
//   node test/verify-v464.js
const { makeEnv } = require('./_sandbox');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const env = makeEnv();
const P = env.BH, G = P.Game;
const S = [], F = [];
function ok(cond, msg) { (cond ? S : F).push(msg); console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg); }
function head(t) { console.log('\n' + t); }

function connMap() {
  const cols = G.cols, rows = G.rows, g = G.grid;
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
// 回傳 { solid, notDrawn, hole }
function audit() {
  if (!G.wallKind || G.wallSize !== (G.cols + 'x' + G.rows)) P.markWallKinds();
  const cols = G.cols, rows = G.rows, g = G.grid, wk = G.wallKind;
  const conn = connMap();
  let solid = 0, notDrawn = 0, hole = 0, where = '';
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (g[y][x] !== 1) continue;
    solid++;
    if (wk[y][x] === 0) {
      notDrawn++;
      if (!conn[y][x]) { hole++; if (!where) where = '(' + x + ',' + y + ')'; }
    }
  }
  return { solid: solid, notDrawn: notDrawn, hole: hole, where: where };
}

// ================================================================
head('1. 換地圖一定會重算牆分類（源碼）');
{
  const bm = src.slice(src.indexOf('function buildMap(cols, rows, theme, opts)'), src.indexOf('function buildMap(cols, rows, theme, opts)') + 2400);
  ok(/Game\.grid = \[\];[\s\S]{0,420}Game\.wallKind = null;[\s\S]{0,120}Game\.wallSize = null;/.test(bm),
    'buildMap 重建地圖時清掉 wallKind / wallSize（對戰每回合都走這裡）');
  ok(/Game\.sdRock = null;/.test(bm) && /Game\.sdActive = false;/.test(bm),
    'buildMap 也清掉縮圈落石表與縮圈旗標（不會把上一局的狀態帶過來）');
  ok(/!Game\.wallKind \|\| Game\.wallSize !== \(Game\.cols \+ 'x' \+ Game\.rows\)/.test(src),
    'render 除了「沒算過」，尺寸對不上也會重算（換圖忘記清也不會掉圖）');
  ok(/Game\.wallSize = cols \+ 'x' \+ rows;/.test(src), 'markWallKinds 會記下自己是給多大的圖算的');
  ok(/Game\.sdRock\[c\[1\] \* Game\.cols \+ c\[0\]\] = 1;/.test(src), '縮圈落石會記進 sdRock');
  // v4.67：改成「連到外框的岩體整片畫、場內硬牆保持石材」——素材不再被 sdActive 整片蓋掉
  ok(/const mass = rock \|\| \(Game\.sdActive && conn\[y\]\[x\]\);/.test(src),
    '縮圈期間外圍岩體整片畫（不會露出一片背景色），場內硬牆仍用石材');
}

// ================================================================
head('2. 單人 32 關：沒有「場內黑洞」（不連外框卻不畫）');
{
  let worst = '', total = 0, shapes = {}, maps = 0;
  for (let st = 1; st <= 32; st++) {
    P.settings.size = 'M';
    P.startSolo(st, false);
    const a = audit();
    total += a.notDrawn;
    maps++;
    shapes[G.cols + 'x' + G.rows] = 1;
    if (a.hole && !worst) worst = 'st' + st + ' ' + a.where;
  }
  ok(!worst, '32 關全部沒有場內黑洞' + (worst ? '：' + worst : ''));
  ok(maps === 32, '32 關都真的建了圖（' + maps + ' 關，尺寸 ' + Object.keys(shapes).join('、') + '）');
  console.log('      合法不畫格（外圍岩層內層）共 ' + total + ' 格');
}

// ================================================================
head('3. RPG 關卡');
{
  P.settings.size = 'M';
  P.startSolo(1, false);
  let bad = '', n = 0, notDrawn = 0;
  for (let st = 1; st <= 12; st++) {
    try { P.buildRpgStage(st, false); } catch (e) { break; }
    n++;
    const a = audit();
    notDrawn += a.notDrawn;
    if (a.hole && !bad) bad = 'rpg' + st + ' ' + a.where;
  }
  ok(n >= 8, 'RPG 至少掃到 ' + n + ' 關');
  ok(!bad, 'RPG 沒有場內黑洞' + (bad ? '：' + bad : ''));
}

// ================================================================
head('4. BOSS RUSH');
{
  P.settings.size = 'M';
  let bad = '', n = 0;
  for (let st = 4; st <= 32; st += 4) {
    P.startSolo(st, true);
    n++;
    const a = audit();
    if (a.hole && !bad) bad = 'rush' + st + ' ' + a.where;
  }
  ok(n >= 6, 'BOSS RUSH 掃到 ' + n + ' 關');
  ok(!bad, 'BOSS RUSH 沒有場內黑洞' + (bad ? '：' + bad : ''));
}

// ================================================================
head('5. 對戰模式：連續換圖（以前會把上一張圖的分類套到新圖）');
{
  P.settings.count = 4; P.settings.hazards = 'on'; P.settings.sd = 'off';
  let bad = '', maxNotDrawn = 0;
  const sizes = ['S', 'M', 'L', 'M', 'S', 'L'];
  for (let i = 0; i < sizes.length; i++) {
    P.settings.size = sizes[i];
    const sz = P.SIZES[sizes[i]];
    P.buildMap(sz[0], sz[1], P.THEMES[i % 8], { spawns: [{ x: 1, y: 1 }], items: 18, emptyRate: .35 });
    const a = audit();
    if (a.notDrawn > maxNotDrawn) maxNotDrawn = a.notDrawn;
    if (a.notDrawn && !bad) bad = '回合' + (i + 1) + ' 不畫 ' + a.notDrawn + ' 格';
  }
  // 棋盤地圖每一格牆都貼著空地 → 一格都不該被跳過
  ok(maxNotDrawn === 0, '對戰 6 回合（尺寸 S/M/L 輪換）沒有任何一格牆被跳過（最多 ' + maxNotDrawn + ' 格）' + (bad ? '：' + bad : ''));
}

// ================================================================
head('6. 對戰模式：突死縮圈把外圈填滿後，仍然是整片石頭');
{
  P.settings.count = 4; P.settings.hazards = 'on'; P.settings.sd = 'on'; P.settings.size = 'M'; P.settings.time = '30';
  const sz = P.SIZES['M'];
  P.buildMap(sz[0], sz[1], P.THEMES[3], { spawns: [{ x: 1, y: 1 }], items: 10, emptyRate: .35 });
  G.state = 'play'; G.timer = 0; G.sdActive = false; G.sdIndex = 0; G.sdTimer = 0;
  P.buildSdList();
  // 手動把前 5 圈落石打上去（走跟遊戲一樣的路徑：grid=1 + sdRock + wallKind=null）
  const cols = G.cols, rows = G.rows;
  let placed = 0;
  for (let ring = 0; ring < 5; ring++) {
    const x0 = 1 + ring, y0 = 1 + ring, x1 = cols - 2 - ring, y1 = rows - 2 - ring;
    const cells = [];
    for (let x = x0; x <= x1; x++) { cells.push([x, y0]); cells.push([x, y1]); }
    for (let y = y0 + 1; y <= y1 - 1; y++) { cells.push([x0, y]); cells.push([x1, y]); }
    cells.forEach(function (c) {
      if (G.grid[c[1]][c[0]] === 1) return;
      G.grid[c[1]][c[0]] = 1;
      if (!G.sdRock) G.sdRock = {};
      G.sdRock[c[1] * cols + c[0]] = 1;
      placed++;
    });
    G.wallKind = null;
  }
  G.sdActive = true;
  const a = audit();
  ok(placed > 80, '縮圈真的填了 ' + placed + ' 格');
  ok(a.notDrawn === 0, '縮圈 5 圈後沒有任何一格牆被跳過（實測 ' + a.notDrawn + ' 格）');
  ok(a.hole === 0, '縮圈後也沒有場內黑洞（' + a.hole + ' 格）');
  // 縮圈結束後回到正常規則（不該永久整片畫）
  G.sdActive = false; G.sdRock = null;
  G.wallKind = null;
  const b2 = audit();
  ok(b2.notDrawn > 0, '關掉縮圈旗標後恢復「外圍岩層只畫一層皮」（' + b2.notDrawn + ' 格）');
}

// ================================================================
head('7. 教學小地圖');
{
  P.settings.size = 'M';
  P.startSolo(1, false);
  const cols = 13, rows = 11;
  P.buildMap(cols, rows, P.THEMES[0], { spawns: [{ x: 1, y: 1 }], items: 4, emptyRate: .3 });
  const a = audit();
  ok(a.notDrawn === 0, '教學地圖每一格牆都畫出來（' + a.notDrawn + ' 格被跳過）');
}

console.log('\n' + (S.length + F.length) + ' 通過 / ' + S.length);
if (F.length) { F.forEach(function (m) { console.log('  敗：' + m); }); process.exit(1); }
