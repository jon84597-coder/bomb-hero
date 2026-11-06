// 無頭測試 v522：地板陰影三層（接縫 AO／場地光線／樹影）＋ 全關卡覆蓋率
// 重點不是「有沒有這個函式」，而是「每一關的每一格看得到的地板，是不是都有陰影」。
const fs = require('fs');
const path = require('path');
const { makeEnv, rawHtml } = require('./_sandbox');

const env = makeEnv();
const P = env.BH;
const rec = env.rec;
const html = rawHtml;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t2) { console.log('\n=== ' + t2 + ' ==='); }

/* ================================================================ ⓪ */
head('⓪ 版本');
const VN = P.VERSION.split('.').map(Number);
ok(VN[0] === 5 && VN[1] >= 22, '版本是 5.22 以上（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '首頁徽章與 VERSION 同步');
ok(html.indexOf('id="verLogVer">' + P.VERSION) > 0, '版本紀錄標題與 VERSION 同步');
ok(P.VERSION_LOG[0].now === true, '版本紀錄最上面是 now:true');
const v521 = P.VERSION_LOG.filter(function (x) { return x.v === '5.21'; })[0];
ok(!!v521 && v521.now === false, '5.21 已經轉成舊版');
ok(P.VERSION_LOG[0].items.length >= 4, '5.22 至少 4 條更新（' + P.VERSION_LOG[0].items.length + ' 條）');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (rel) {
  const f = path.join(__dirname, rel);
  const v = (/SW_VERSION = '([^']+)'/.exec(fs.readFileSync(f, 'utf8')) || [])[1] || '';
  ok(Number(v.replace(/^v/, '').split('.')[1]) >= 22, rel + ' SW_VERSION = ' + v);
});
{
  const pk = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
  ok(Number(pk.version.split('.')[1]) >= 22, 'package.json = ' + pk.version);
}
ok(html.length < 1900000, '主檔 ' + html.length + ' 字元（預算 1,900,000）');
ok((html.match(/\r/g) || []).length === 0, '整檔 LF（0 個 \\r）');

/* ================================================================ ① */
head('① 三層結構與烘焙順序');
ok(typeof P.aoSolid === 'function', 'aoSolid 存在');
ok(typeof P.floorAOBands === 'function', 'floorAOBands 存在');
ok(typeof P.drawFloorAO === 'function', 'drawFloorAO 存在');
ok(typeof P.drawAOCell === 'function', 'drawAOCell 存在（機關格補壓用）');
ok(typeof P.drawFloorLight === 'function', 'drawFloorLight 存在');
ok(typeof P.drawFloorDapple === 'function', 'drawFloorDapple 存在');
{
  // 五段式烘焙：地板 → 牆 → 光線 → 樹影 → AO
  const iFloor = html.indexOf('paintFloorStyle(gx, gy, xx * T, yy * T, T, thc');
  const iWall = html.indexOf('if (wk === 1) drawOuterWall(cxp, cyp');
  const iLight = html.indexOf('try { drawFloorLight(cx * FLR_N, cy * FLR_N, w, h, T); }');
  const iDap = html.indexOf('try { drawFloorDapple(cx * FLR_N, cy * FLR_N, w, h, T); }');
  const iAO = html.indexOf('try { drawFloorAO(cx * FLR_N, cy * FLR_N, w, h, T); }');
  ok(iFloor > 0 && iFloor < iWall, '① 地板先鋪完，牆才畫（牆站在地板上，不會被隔壁地板壓到）');
  ok(iWall > 0 && iWall < iLight, '② 牆之後才打光（牆會跟著地板一起變暗，不會「牆比地板亮」）');
  ok(iLight > 0 && iLight < iDap, '③ 光線之後才是樹影');
  ok(iDap > 0 && iDap < iAO, '④ 接縫 AO 最後（接觸感不會被光線洗淡）');
}
ok(/try \{ drawAOCell\(x, y, T\); \} catch \(e\) \{\}/.test(html), '機關格畫完會補壓陰影');
ok(/const AO_WIDE = \.62/.test(html) && /const AO_TIGHT = \.18/.test(html), '寬帶／貼邊帶的常數集中管理');
ok((html.match(/rgba\(6,8,16,/g) || []).length >= 3, '陰影顏色不分主題（視覺一致）');

/* ================================================================ ② */
head('② 全關卡逐格覆蓋率（32 關單人）');
const G = P.Game;

/* 由 grid 推出「這一格該有幾個影」：每個貼著的實心鄰邊 2 層 + 轉角 1 塊 */
function expectOps(gx, gy) {
  const solid = function (x, y) {
    if (!G.grid[y] || x < 0 || x >= G.grid[y].length) return 0;
    const v = G.grid[y][x] | 0;
    return v === 0 ? 0 : (v === 2 ? 2 : 1);
  };
  if (solid(gx, gy)) return { total: 0, dirs: 0, corners: 0, soft: 0 };
  let dirs = 0, corners = 0, soft = 0;
  const N = [[0, -1, 'u'], [0, 1, 'd'], [-1, 0, 'l'], [1, 0, 'r']];
  for (let i = 0; i < 4; i++) {
    const s = solid(gx + N[i][0], gy + N[i][1]);
    if (s) { dirs++; if (s === 2) soft++; }
  }
  const D = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (let i = 0; i < 4; i++) {
    if (!solid(gx + D[i][0], gy + D[i][1])) continue;
    if (solid(gx + D[i][0], gy) || solid(gx, gy + D[i][1])) continue;
    corners++;
  }
  return { total: dirs * 2 + corners, dirs: dirs, corners: corners, soft: soft };
}

function auditMap(tag) {
  let cells = 0, covered = 0, missed = 0, softCells = 0, softMissed = 0, bad = 0;
  for (let y = 0; y < G.rows; y++) {
    for (let x = 0; x < G.cols; x++) {
      const want = expectOps(x, y);
      const got = P.floorAOBands(x, y, G.T);
      const nDir = got.filter(function (o) { return o.k === 'b'; }).length;
      const nCor = got.filter(function (o) { return o.k === 'c'; }).length;
      if (nDir !== want.dirs * 2 || nCor !== want.corners) bad++;
      if (want.dirs === 0) continue;
      cells++;
      if (got.length > 0) covered++; else missed++;
      if (want.soft > 0) {
        softCells++;
        if (!got.length) softMissed++;
      }
    }
  }
  ok(bad === 0, tag + '：陰影指令與地形完全對得上（不符 ' + bad + ' 格）');
  ok(missed === 0, tag + '：貼著牆／軟磚的空地 100% 有陰影（' + covered + '/' + cells + '）');
  ok(softCells > 0 && softMissed === 0, tag + '：軟牆旁的陰影 ' + (softCells - softMissed) + '/' + softCells);
  return cells;
}

let soloCells = 0, soloStages = 0;
for (let st = 1; st <= 32; st++) {
  try { P.startSolo(st, false); } catch (e) { ok(false, '第 ' + st + ' 關建不起來：' + e.message); continue; }
  soloStages++;
  soloCells += auditMap('第 ' + st + ' 關（' + (G.theme && G.theme.style) + '）');
}
ok(soloStages === 32, '32 關全部跑過（' + soloStages + ' 關）');
ok(soloCells > 300, '32 關合計有 ' + soloCells + ' 格「貼著障礙的空地」全部檢查過');

/* ================================================================ ③ */
head('③ RPG 關卡');
let rpgOk = 0;
for (let st = 1; st <= 32; st += 4) {
  try { P.startRpg(st, {}); } catch (e) { ok(false, 'RPG 第 ' + st + ' 關建不起來：' + e.message); continue; }
  rpgOk++;
  auditMap('RPG 第 ' + st + ' 關');
}
ok(rpgOk === 8, 'RPG 抽驗 8 關（' + rpgOk + ' 關）');

/* ================================================================ ④ */
head('④ 大逃殺與對戰');
{
  let info = null;
  try { info = P.buildBRMap(); } catch (e) { ok(false, '大逃殺地圖建不起來：' + e.message); }
  if (info) {
    ok(G.cols >= 30 && G.rows >= 30, '大逃殺地圖 ' + G.cols + '×' + G.rows);
    auditMap('大逃殺');
    // 海島外圈不該有「假暗邊」：地圖最外圈的空地不長陰影
    let edgeFake = 0;
    for (let x = 0; x < G.cols; x++) {
      if (G.grid[0][x] === 0 && P.floorAOBands(x, 0, G.T).length) edgeFake++;
      if (G.grid[G.rows - 1][x] === 0 && P.floorAOBands(x, G.rows - 1, G.T).length) edgeFake++;
    }
    // 只有「貼著地圖內的牆」才該有影；外面那圈不算
    let legit = 0;
    for (let x = 0; x < G.cols; x++) if (G.grid[0][x] === 0 && G.grid[1][x] !== 0) legit++;
    ok(edgeFake === legit, '地圖邊界不算牆（合法 ' + legit + ' 條／實際 ' + edgeFake + ' 條）');
  }
}
{
  let okBattle = true;
  try { P.startBattle(); } catch (e) { okBattle = false; ok(false, '對戰地圖建不起來：' + e.message); }
  if (okBattle) auditMap('對戰');
}

/* ================================================================ ⑤ */
head('⑤ 軟牆專項（使用者要求：軟牆地面區塊也要有陰影）');
{
  const old = { T: G.T, cols: G.cols, rows: G.rows, grid: G.grid };
  G.T = 40; G.cols = 4; G.rows = 4;
  // 左上角一塊軟磚，右下是空地
  G.grid = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const right = P.floorAOBands(1, 0, 40);
  const below = P.floorAOBands(0, 1, 40);
  const diag = P.floorAOBands(1, 1, 40);
  ok(right.filter(function (o) { return o.d === 'l'; }).length === 2, '軟磚右邊的地板有兩層陰影');
  ok(below.filter(function (o) { return o.d === 'u'; }).length === 2, '軟磚下面的地板有兩層陰影');
  ok(diag.filter(function (o) { return o.k === 'c'; }).length === 1, '軟磚斜角有轉角陰影（不會露出一條亮縫）');
  // 軟磚與石牆的陰影「同一套參數」 —— 視覺一致，不因材質不同而深淺不一
  G.grid = [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const a1 = P.floorAOBands(1, 0, 40).filter(function (o) { return o.d === 'l'; });
  G.grid = [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const a2 = P.floorAOBands(1, 0, 40).filter(function (o) { return o.d === 'l'; });
  ok(a1.length === a2.length && a1.every(function (o, i) { return o.a === a2[i].a && o.w === a2[i].w; }),
    '軟磚與石牆用同一組陰影參數（視覺一致）');
  G.T = old.T; G.cols = old.cols; G.rows = old.rows; G.grid = old.grid;
}

/* ================================================================ ⑥ */
head('⑥ 八個主題的一致性');
{
  const styles = ['forest', 'sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark'];
  const missing = styles.filter(function (s) { return !(P.DAPPLE_A && P.DAPPLE_A[s] > 0); });
  ok(missing.length === 0, '八個主題都有樹影濃度（缺：' + (missing.join(',') || '無') + '）');
  const vals = styles.map(function (s) { return P.DAPPLE_A[s]; });
  ok(Math.min.apply(null, vals) >= .03 && Math.max.apply(null, vals) <= .14,
    '樹影濃度都在 ' + Math.min.apply(null, vals) + '~' + Math.max.apply(null, vals) + '（不會有的主題過黑）');
  ok(P.DAPPLE_A.ice < P.DAPPLE_A.forest && P.DAPPLE_A.sky < P.DAPPLE_A.forest,
    '亮地板（冰原／天空）的樹影比草地淡，不會像髒污');
  // 每個主題都要跑得出陰影（不是只有草地才有）
  const seen = [];
  for (let st = 1; st <= 32; st += 4) {
    P.startSolo(st, false);
    const stl = G.theme && G.theme.style;
    if (seen.indexOf(stl) >= 0) continue;
    seen.push(stl);
    let n = 0;
    for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) n += P.floorAOBands(x, y, G.T).length;
    ok(n > 0, '主題 ' + stl + ' 有畫出陰影（' + n + ' 條指令）');
  }
  ok(seen.length >= 8, '八個主題都實測過（' + seen.length + ' 個）');
}

/* ================================================================ ⑦ */
head('⑦ 分塊之間完全連續（不會出現 8×8 方格）');
{
  const T = 40;
  const oldCols = G.cols, oldRows = G.rows, oldGrid = G.grid, oldT = G.T;
  G.cols = 20; G.rows = 16; G.T = T;
  G.grid = [];
  for (let y = 0; y < 16; y++) { const r = []; for (let x = 0; x < 20; x++) r.push(0); G.grid.push(r); }
  G.theme = { style: 'forest' };

  rec.calls.length = 0;
  P.drawFloorLight(0, 0, 8, 8, T);
  rec.calls.length = 0;
  P.drawFloorLight(8, 0, 8, 8, T);
  // 沙盒的 ctx 是 Proxy，createLinearGradient 不會被記錄 → 改驗「漸層是不是用整張地圖算的」
  ok(/const ox = -gx0 \* T, oy = -gy0 \* T;/.test(html), '光線用「分塊左上角在地圖上的位置」換算（不是分塊自己的 0,0）');
  ok(/const CW = Math\.max\(1, Game\.cols \* T\), CH = Math\.max\(1, Game\.rows \* T\);/.test(html),
    '漸層的兩端是整張地圖的寬高（所以每塊拿到的是同一道漸層的不同段落）');
  ok(/createLinearGradient\(ox \+ CW \* \.04, oy \+ CH \* \.02, ox \+ CW \* \.94, oy \+ CH \* \.98\)/.test(html),
    '兩塊分塊只差在 ox／oy 的平移 → 接起來無縫');

  rec.calls.length = 0;
  P.drawFloorDapple(0, 0, 8, 8, T);
  const tr0 = rec.calls.filter(function (c) { return c[0] === 'translate'; }).map(function (c) { return c[1]; });
  rec.calls.length = 0;
  P.drawFloorDapple(8, 0, 8, 8, T);
  const tr1 = rec.calls.filter(function (c) { return c[0] === 'translate'; }).map(function (c) { return c[1]; });
  const shifted = tr1.filter(function (x) { return tr0.indexOf(x + 8 * T) >= 0; }).length;
  ok(tr0.length > 0 && shifted > 0, '樹影斑塊的位置以地圖座標為種子（隔壁分塊平移 8 格後對得上，' + shifted + ' 個）');

  G.cols = oldCols; G.rows = oldRows; G.grid = oldGrid; G.T = oldT;
}

/* ================================================================ ⑧ */
head('⑧ 成本');
{
  let ops = 0, n = 0;
  P.startSolo(32, false);
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) { ops += P.floorAOBands(x, y, G.T).length; n++; }
  ok(n > 0 && ops / n < 6, '平均每格 ' + (ops / n).toFixed(2) + ' 條陰影指令（烘焙一次，執行期 0）');
  ok(/try \{ drawFloorAO\(cx \* FLR_N, cy \* FLR_N, w, h, T\); \} catch \(e\) \{\}/.test(html), '只在 floorChunk 裡畫（不在每幀的 render 迴圈）');
  const iLayer = html.indexOf('drawFloorLayer(vr, T);');
  const rendered = iLayer > 0 ? html.slice(iLayer, iLayer + 1600) : '';
  ok(rendered.indexOf('drawFloorAO') < 0, 'render 每幀不重畫陰影');
  ok(rendered.indexOf('drawAOCell') >= 0, '只有機關格那幾格在 render 補壓');
}

/* ================================================================ ⑨ */
head('⑨ 軟磚被炸掉不會留下幽靈陰影');
{
  P.startSolo(1, false);
  ok(G.cols > 9, '地圖至少有 2 塊分塊寬（' + G.cols + ' 欄）');
  const a = P.floorChunk(0, 0);
  const b = P.floorChunk(1, 0);
  ok(!!a && !!b && a === P.floorChunk(0, 0) && b === P.floorChunk(1, 0), '分塊有快取（不會每幀重烘）');
  // x = 7 是第 0 塊的最後一格：它的陰影會壓到第 1 塊的左緣
  P.floorChunkDirty(7, 5);
  ok(P.floorChunk(0, 0) !== a, '自己那一塊會重烘');
  ok(P.floorChunk(1, 0) !== b, '隔壁分塊也會重烘（陰影壓過分塊邊界）');
  // 對角也要顧到（轉角補丁會壓到斜對角那一塊）
  const c = P.floorChunk(1, 1);
  P.floorChunkDirty(7, 7);
  ok(P.floorChunk(1, 1) !== c, '斜對角的分塊也會重烘（轉角陰影）');
  P.floorChunkDirty(null);
  ok(!!P.floorChunk(0, 0), '整批清掉（換地圖）之後還能重烘');
}

console.log('\n' + (fail ? '✗' : '✅') + ' v5.22：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
