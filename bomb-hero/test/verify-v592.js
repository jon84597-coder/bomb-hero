// test/verify-v592.js —— v5.92
//   ① 舉彈素材不再「挖球」：沒有假洞、炸彈位置逐格跟素材球心走
//   ② 手持炸彈比素材球大 12%（蓋得住，但不至於變成一顆大黑球）
//   ③ 衝刺吃得到道具（滑冰鞋）與坐騎（鴕鳥 1.45／風暴 1.62）的速度
//   ④ 衝刺冷卻：按鈕上報剩餘秒數、衝刺中閃掉傷害會彈 MISS
//   ⑤ 鴕鳥跳躍：進化跨 2 → 沒空間退回跨 1 → 連 1 都跨不到就原地跳
//   ⑥ 版本
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'spr/hero-anim-rabbit.json'), 'utf8'));

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(n) { console.log('\n=== ' + n + ' ==='); }

/* ① 逐格高度表 */
sec('① 舉彈炸彈位置（逐格跟素材球心）');
const tableM = mainSrc.match(/const HOLD_BOMB = \{([\s\S]*?)\n\};/);
ok(!!tableM, 'main.js 有 HOLD_BOMB 表');
const tb = tableM ? tableM[1] : '';
const upF = tb.match(/upFrames:\s*\[([^\]]+)\]/);
ok(!!upF, 'rabbit 有逐格高度表 upFrames');
if (upF) {
  const arr = upF[1].split(',').map(function (x) { return +x.trim(); });
  ok(arr.length === 12, 'upFrames 剛好 12 格（實際 ' + arr.length + '）');
  ok(arr.every(function (v) { return v > 0.80 && v < 0.97; }),
     '每格都落在 0.80~0.97H（實際 ' + Math.min.apply(null, arr).toFixed(3) + '~' + Math.max.apply(null, arr).toFixed(3) + '）');
  ok(Math.max.apply(null, arr) - Math.min.apply(null, arr) > 0.005,
     '有起伏（蹲舉時炸彈會跟著降，不是死板一個值）');
}
// 不再挖球：素材幀沒有被洋紅挖過的痕跡
//   舊版 fix_ball.py 會把球挖成洋紅再轉透明 → 頭上留一個大洞
const batch = fs.readFileSync(path.join(ROOT, 'art/anim-v2/anim_batch.py'), 'utf8');
ok(/vid\/hold\/fr/.test(batch) && !/vid\/hold\/fixed/.test(batch),
   'anim_batch.py 直接用原始幀（vid/hold/fr），不再吃 fix_ball 的挖洞結果');

/* ② 手持炸彈半徑 */
sec('② 手持炸彈比素材球大一點就好');
ok(/const r = T \* \(b\.held \? \.30 : \.32\);/.test(mainSrc), '手上的彈半徑 0.30T（其餘仍是 0.32T）');
const rHold = 0.30, rNormal = 0.32;
ok(rHold < rNormal, '手持比一般小（不然會變成一顆大黑球壓在頭上）');
// 素材球 r = 0.22H；H = 1.215T → 球 0.22*1.215 = 0.267T
ok(rHold > 0.22 * 1.215, '手持仍大於素材球（0.267T）→ 蓋得住，不會露邊');

/* ③ 衝刺吃速度 */
sec('③ 衝刺吃道具與坐騎');
ok(/function dashSpeedOf\(p\)/.test(mainSrc), '有 dashSpeedOf(p)');
ok(/playerSpeed\(p\) \/ base/.test(mainSrc), '衝刺速度由 playerSpeed 換算（含滑冰鞋／鴕鳥）');
ok(/DASH_SPD_CAP = 2\.4/.test(mainSrc), '倍率上限 2.4（再快單幀位移會超過半格 → 可能穿牆）');
ok(/p\.dashSpd = dashSpeedOf\(p\);/.test(mainSrc), 'startDash 把速度記在 p.dashSpd');
ok(/const sp = p\.dashSpd \|\|/.test(mainSrc), 'dashStep 用 p.dashSpd');
ok(/const steps = Math\.max\(1, Math\.ceil\(\(sp \* dt\) \/ \(T \* \.4\)\)\);/.test(mainSrc),
   '高速時切成每步 ≤0.4 格（不會穿過 1 格厚的牆）');

const env = makeEnv();
const BH = env.BH;
const G = env.G;
G.T = 40;
function mkP(extra) {
  const p = { x: 100, y: 100, alive: true, speedLv: 0, rpgSpd: 1 };
  Object.assign(p, extra || {});
  return p;
}
const pBase = mkP({ speedLv: 0 });
const pFast = mkP({ speedLv: 4 });       // 4 顆滑冰鞋
const pBird = mkP({ ostrich: true });
const pStorm = mkP({ ostrich: true, storm: true });
const vBase = BH.dashSpeedOf(pBase);
ok(vBase > 0, '基礎衝刺速度 > 0（' + Math.round(vBase) + ' px/s）');
ok(BH.dashSpeedOf(pFast) > vBase * 1.2, '滑冰鞋吃滿 → 衝得更遠（' + Math.round(BH.dashSpeedOf(pFast)) + ' px/s）');
ok(BH.dashSpeedOf(pBird) > vBase * 1.2, '騎鴕鳥 → 衝得更遠（' + Math.round(BH.dashSpeedOf(pBird)) + ' px/s）');
ok(BH.dashSpeedOf(pStorm) >= BH.dashSpeedOf(pBird), '風暴鴕鳥不慢於普通鴕鳥');
ok(BH.dashSpeedOf(mkP({ speedLv: 99, ostrich: true, storm: true })) <= vBase * 2.4 + 0.01,
   '再怎麼疊也不會超過 2.4 倍上限');

/* ④ 冷卻與 MISS */
sec('④ 冷卻秒數與 MISS');
ok(/function dashMiss\(p\)/.test(mainSrc), '有 dashMiss(p)');
ok(idxSrc.indexOf('attr(data-cd)') > 0, '衝刺鍵在冷卻時顯示剩餘秒數（CSS attr(data-cd)）');
ok(/dashBtn\.setAttribute\('data-cd', cd0\.toFixed\(1\)\)/.test(mainSrc), 'updateHud 把冷卻秒數寫進按鈕');
const missHooks = (mainSrc.match(/if \(p\.dashT > 0\) dashMiss\(p\);/g) || []).length;
ok(missHooks >= 3, '至少三個受傷入口接上 MISS（實際 ' + missHooks + ' 處）');
BH.Game.gameT = 10;
const pMiss = mkP({ dashT: 0.1, dashMissCd: 0 });
const popsBefore = (BH.Game.pops || []).length;
BH.dashMiss(pMiss);
ok((BH.Game.pops || []).length === popsBefore + 1, 'dashMiss 會彈一個提示');
BH.dashMiss(pMiss);
ok((BH.Game.pops || []).length === popsBefore + 1, '0.35 秒內不重複彈（同一格火焰不會洗頻）');

/* ⑤ 鴕鳥跳躍 */
sec('⑤ 鴕鳥：跨 2 → 跨 1 → 原地');
function grid(rows, cols, cellFn) {
  G.cols = cols; G.rows = rows; G.T = 40;
  G.grid = [];
  G.bombs = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) row.push(cellFn ? cellFn(x, y) : 0);
    G.grid.push(row);
  }
  if (typeof BH.markWallKinds === 'function') { try { BH.markWallKinds(); } catch (e) {} }
}
function at(p, cx, cy) { p.x = cx * G.T + G.T / 2; p.y = cy * G.T + G.T / 2; }
function col(p) { return Math.floor(p.x / G.T); }

// 風暴鴕鳥：中間兩格牆、第三格空地 → 跨 2
grid(12, 12, function (x, y) { return (y === 5 && (x === 6 || x === 7)) ? 1 : 0; });
let p1 = mkP({ ostrich: true, storm: true, facing: 'right', air: 0, fireCd: 0, invuln: 0 });
at(p1, 5, 5);
const j1 = BH.mountJump(p1);
ok(j1 === true, '風暴鴕鳥：跨 2 格跳得出去');
ok(col(p1) === 5 && Math.round(p1.jumpTo.x / G.T - .5) === 8, '落在第 3 格（x=8），不是第 2 格');
ok(p1.jumpOver === true, 'jumpOver 標記為「真的跨過障礙」');

// 風暴鴕鳥：只有一格牆 → 退回跨 1
grid(12, 12, function (x, y) { return (y === 5 && x === 6) ? 1 : 0; });
let p2 = mkP({ ostrich: true, storm: true, facing: 'right', air: 0, fireCd: 0, invuln: 0 });
at(p2, 5, 5);
BH.mountJump(p2);
ok(Math.round(p2.jumpTo.x / G.T - .5) === 7, '只剩一格牆 → 退回跨 1 格（落在 x=7）');

// 風暴鴕鳥：前面全空 → 原地跳
grid(12, 12, function () { return 0; });
let p3 = mkP({ ostrich: true, storm: true, facing: 'right', air: 0, fireCd: 0, invuln: 0 });
at(p3, 5, 5);
const before = { x: p3.x, y: p3.y };
const j3 = BH.mountJump(p3);
ok(j3 === true, '沒東西可跨也是「跳得起來」（不像舊版直接跳不了）');
/* v5.98：玩家要求「前方全無牆也可以往前跳」，所以這條由「原地」改成「往前 2 格」。 */
ok(p3.jumpTo.x === before.x + 3 * G.T && p3.jumpTo.y === before.y,
  '前方全空 → 往前跳 3 格（風暴的跳躍長度；v5.98 起不再原地發呆）');
ok(p3.jumpOver === false, 'jumpOver = false（沒有跨東西）');

// 普通鴕鳥（沒進化）：天花板就是跨 1 —— 兩格牆的中間擋住，落點（第 2 格）還是牆 → 只能原地
grid(12, 12, function (x, y) { return (y === 5 && (x === 6 || x === 7)) ? 1 : 0; });
let p4 = mkP({ ostrich: true, facing: 'right', air: 0, fireCd: 0, invuln: 0 });
at(p4, 5, 5);
BH.mountJump(p4);
ok(Math.round(p4.jumpTo.x / G.T - .5) === 5, '普通鴕鳥遇到兩格牆 → 過不去，原地跳（不會硬跨到牆裡）');

// 普通鴕鳥：只有一格牆（落點空地）→ 跨 1
grid(12, 12, function (x, y) { return (y === 5 && x === 6) ? 1 : 0; });
let p4b = mkP({ ostrich: true, facing: 'right', air: 0, fireCd: 0, invuln: 0 });
at(p4b, 5, 5);
BH.mountJump(p4b);
ok(Math.round(p4b.jumpTo.x / G.T - .5) === 7, '普通鴕鳥跨 1 格（落在 x=7）');
// 普通鴕鳥：前面全空 → 原地
grid(12, 12, function () { return 0; });
let p5 = mkP({ ostrich: true, facing: 'right', air: 0, fireCd: 0, invuln: 0 });
at(p5, 5, 5);
BH.mountJump(p5);
ok(Math.round(p5.jumpTo.x / G.T - .5) === 7, '普通鴕鳥前方全空 → 往前跳 2 格（v5.98 起；舊版原地跳）');

/* ⑥ 精靈與版本 */
sec('⑥ 精靈圖與版本');
ok(json.charHpx === 200 && json.cellW === 142 && json.cellH === 234, '精靈格尺寸沒變（142×234、角色高 200px）');
ok(json.actions.hold && json.actions.hold.frames === 12, 'hold 仍是 12 格');
const V = (mainSrc.match(/const VERSION = '([\d.]+)'/) || [])[1];
ok(V && parseFloat(V) >= 5.92, 'VERSION ≥ 5.92（實際 ' + V + '）');
ok(idxSrc.indexOf('<span id="verTxt">' + V + '</span>') > 0, 'index.html 的 verTxt 同版號');
ok(swSrc.indexOf("SW_VERSION = 'v" + V + ".0'") > 0, 'sw.js 同版號');

console.log('\n────────────────────────────');
console.log('通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
process.exit(fail ? 1 : 0);
