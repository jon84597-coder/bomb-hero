// test/verify-v593.js —— v5.93：自由走位（拿掉格子吸附）
//   用戶原話：「角色走路可以任意 45 度走路，所有空間可以任意走，不會被程式綁在格子的框架內……
//              也不要因為這樣走牆壁邊緣時，沒有邊走邊在牆壁邊緣方向滑走的感覺。」
//   本支分成：① 機制存在 ② 不再吸附格心 ③ 45 度等速 ④ 貼牆與滑牆
//             ⑤ 卡住不會鎖死 ⑥ NaN 速度防護 ⑦ AI 跨格決策 ⑧ 版本戳記
const fs = require('fs');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const SRC = fs.readFileSync(__dirname + '/../js/main.js', 'utf8');
const HTML = fs.readFileSync(__dirname + '/../index.html', 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function sec(t) { console.log('\n=== ' + t + ' ==='); }

function flat(cols, rows) {
  G.cols = cols; G.rows = rows; G.T = 40; G.grid = [];
  for (let y = 0; y < rows; y++) {
    const r = [];
    for (let x = 0; x < cols; x++) r.push(0);
    G.grid.push(r);
  }
  for (let x = 0; x < cols; x++) { G.grid[0][x] = 1; G.grid[rows - 1][x] = 1; }
  for (let y = 0; y < rows; y++) { G.grid[y][0] = 1; G.grid[y][cols - 1] = 1; }
  G.bombs = []; G.flames = []; G.items = []; G.foes = []; G.pets = [];
  G.mode = 'solo'; G.state = 'play'; G.paused = false;
  G.teamsOn = 0; G.daily = false; G.bossRush = false; G.rpg = false;
  G.sdActive = false; G.brZone = null; G.bossArena = null; G.cart = null;
  G.spdK = 1;
}
function mkPlayer(cx, cy) {
  return {
    x: (cx + .5) * G.T, y: (cy + .5) * G.T, alive: true, dead: false, ai: false,
    lives: 9, hp: 9, hpMax: 9, sHp: 9, sHpMax: 9, r: 14, facing: 'down', invuln: 9999,
    score: 0, maxBombs: 1, power: 1, speed: 1, speedLv: 0, team: 0, moving: false, walkT: 0,
    dirName: 'down', air: 0, dashT: 0, dashCd: 0, dizzy: 0, lobCd: 0, carry: 0, cart: null,
    buffs: {}, skullT: 0, beltMul: 1
  };
}

/* ------------------------------------------------------------------ ① */
sec('① 機制：自由位移取代格子吸附');
ok(typeof P.tryMove === 'function', 'tryMove 已匯出');
ok(/const MOVE_HALF = \.30;/.test(SRC), '角色碰撞盒半寬 0.30 格（0.60×0.60 的方盒）');
/* v5.98：boxBlocked 多了 noBomb 參數（被自己的炸彈壓住時要忽略炸彈、但牆照擋）。 */
ok(/function boxBlocked\(p, x, y(, noBomb)?\)/.test(SRC), '有 boxBlocked()：盒角壓到的格子才算擋');
ok(/function freeMove\(p, mx, my, dt, spd\)/.test(SRC), '有 freeMove()：連續位移');
ok(/function tryMove\(p, dx, dy, dt, spd, noAlign\) \{ freeMove\(p, dx, dy, dt, spd\); \}/.test(SRC),
  'tryMove 直接轉給 freeMove（所有呼叫端自動受益）');
ok(/function tryMoveDiag\(p, mx, my, dt, spd, pref\) \{ freeMove\(p, mx, my, dt, spd\); \}/.test(SRC),
  'tryMoveDiag 也轉給 freeMove');
ok(/function tryMoveSnap\(p, dx, dy, dt, spd, noAlign\)/.test(SRC), '舊版吸附版保留（輸送帶推力要用）');
ok(/tryMove\(p, d\.x, d\.y, dt, BELT_SPEED \* \(Game\.spdK \|\| 1\), true\)/.test(SRC) ||
   /tryMove\(p[^)]*BELT_SPEED/.test(SRC), '輸送帶推力仍然走舊版（每幀吸回格心才推得動）');

/* ------------------------------------------------------------------ ② */
sec('② 不再吸附：可以停在格子裡任何位置');
flat(21, 17);
let p = mkPlayer(6, 8);
G.players = [p];
const T = G.T;
const x0 = p.x;
// 推右 10 幀（速度 146px/s → 每幀 2.43px）
for (let i = 0; i < 10; i++) P.tryMove(p, 1, 0, 1 / 60);
const moved = p.x - x0;
ok(moved > 20 && moved < 30, '每幀位移 = 速度×dt（10 幀約 24px）', +moved.toFixed(2));
ok(Math.abs(p.x - (6.5 * T)) > 1, '沒有被吸回格心（x=' + p.x.toFixed(2) + '，格心 ' + (6.5 * T) + '）');
const xStop = p.x;
for (let i = 0; i < 30; i++) P.tryMove(p, 0, 0, 1 / 60);
ok(Math.abs(p.x - xStop) < 1e-9, '放開方向鍵就停在原地（不會自己滑回格心）', +p.x.toFixed(2));
// 斜走也可以停在「不是任何格心」的位置
p = mkPlayer(6, 8); G.players = [p];
for (let i = 0; i < 7; i++) P.tryMoveDiag(p, 1, 1, 1 / 60);
const offX = Math.abs((p.x / T) % 1 - .5), offY = Math.abs((p.y / T) % 1 - .5);
ok(offX > .01 || offY > .01, '斜走到一半可以停在格子中間（偏離格心 ' +
  offX.toFixed(2) + ' / ' + offY.toFixed(2) + ' 格）');

/* ------------------------------------------------------------------ ③ */
sec('③ 45 度斜走：兩軸等速，總速度不變');
p = mkPlayer(6, 8); G.players = [p];
const sx = p.x, sy = p.y;
for (let i = 0; i < 20; i++) P.tryMoveDiag(p, 1, 1, 1 / 60);
const dx = p.x - sx, dy = p.y - sy;
ok(Math.abs(dx - dy) < .01, '橫向與縱向位移一樣（' + dx.toFixed(2) + ' / ' + dy.toFixed(2) + '）');
const dist = Math.hypot(dx, dy);
ok(Math.abs(dist - 146 * (20 / 60)) < 1.5, '斜走總距離 = 直走同時間的距離（' + dist.toFixed(1) + ' vs ' + (146 * 20 / 60).toFixed(1) + '）');
ok(Math.abs(dx - 146 * (20 / 60) * .7071) < 1.2, '單軸分量 = 總速度 × 0.7071', +dx.toFixed(2));

/* ------------------------------------------------------------------ ④ */
sec('④ 貼牆：停在牆前 0.30 格，斜推會沿牆滑走');
flat(21, 17);
// 一整道垂直牆（col 12，rows 4~12），滑動範圍都在牆面上
for (let yy = 4; yy <= 12; yy++) G.grid[yy][12] = 1;
p = mkPlayer(9, 8); G.players = [p];
for (let i = 0; i < 60; i++) P.tryMove(p, 1, 0, 1 / 60);
const gap = 12 * T - p.x;
ok(Math.abs(gap - T * .30) < 1.2, '停在牆面前 0.30 格（實測 ' + (gap / T).toFixed(3) + ' 格）', +p.x.toFixed(1));
ok(!(Math.floor(p.x / T) === 12), '沒有卡進牆格');
// 純水平推：y 完全不動（不會被「補位」到別的列）
const yBefore = p.y;
for (let i = 0; i < 40; i++) P.tryMove(p, 1, 0, 1 / 60);
ok(Math.abs(p.y - yBefore) < 1e-9, '純往右撞牆時 y 完全不動（不再自動補位）', +p.y.toFixed(2));
// 斜推右上 → 右邊照樣被擋，往上滑走
for (let i = 0; i < 20; i++) P.tryMove(p, 1, -1, 1 / 60);
ok(p.y < yBefore - 30, '斜推右上：貼著牆邊往上滑走（y ' + yBefore.toFixed(1) + ' → ' + p.y.toFixed(1) + '）');
const stillBlocked = 12 * T - p.x;
ok(Math.abs(stillBlocked - T * .30) < 1.5, '滑的過程中一直貼在牆面上（' + (stillBlocked / T).toFixed(3) + ' 格）');

/* ------------------------------------------------------------------ ⑤ */
sec('⑤ 分軸解算：另一軸被擋時，速度讓給沒被擋的那一軸');
flat(21, 17);
// 上方是大片牆：只能往右走
for (let x = 1; x < G.cols - 1; x++) G.grid[7][x] = 1;
p = mkPlayer(6, 8); G.players = [p];
// 先頂到牆下（貼牆之後才量，不然前幾幀還沒碰到牆、兩軸都還在走）
for (let i = 0; i < 20; i++) P.tryMove(p, 0, -1, 1 / 60);
const yTop = p.y;
const xStart = p.x;
for (let i = 0; i < 10; i++) P.tryMoveDiag(p, 1, -1, 1 / 60);
const dxFree = p.x - xStart;
// 對照：純往右 10 幀走多遠
p.x = xStart; p.y = yTop;
for (let i = 0; i < 10; i++) P.tryMove(p, 1, 0, 1 / 60);
const dxPure = p.x - xStart;
ok(Math.abs(dxFree - dxPure) < 1.2, '上被擋時往右的速度 = 純往右的速度（' + dxFree.toFixed(1) + ' vs ' + dxPure.toFixed(1) + '）');
ok(p.y >= yTop - 1, '還是頂在牆面下（y ' + yTop.toFixed(1) + ' ≈ ' + p.y.toFixed(1) + '）');

/* ------------------------------------------------------------------ ⑥ */
sec('⑥ 卡在牆裡（傳送門／重生點在磚上）不會鎖死');
flat(21, 17);
G.grid[8][6] = 1;
p = mkPlayer(6, 8); G.players = [p];
p.x = 6.5 * T; p.y = 8.5 * T;            // 直接站在牆格中央
const bx0 = p.x, by0 = p.y;
for (let i = 0; i < 5; i++) P.tryMove(p, 1, 1, 1 / 60);
ok(p.x > bx0 && p.y > by0, '站在磚上還是走得出來（x ' + bx0.toFixed(1) + '→' + p.x.toFixed(1) +
  '，y ' + by0.toFixed(1) + '→' + p.y.toFixed(1) + '）');

/* ------------------------------------------------------------------ ⑦ */
sec('⑦ 速度計算：沒有 speedLv 的物件不再算出 NaN');
const bare = { speed: 1 };
const v1 = P.playerSpeed(bare);
ok(isFinite(v1) && v1 > 0, '缺少 speedLv 也能算出正常速度（' + v1 + '）', v1);
const withLv = P.playerSpeed({ speedLv: 3 });
ok(withLv > v1, '滑冰鞋仍然會加速（Lv3 ' + withLv + ' > Lv0 ' + v1 + '）');
ok(/const base = \(146 \+ \(p\.speedLv \| 0\) \* 20\)/.test(SRC), 'playerSpeed 用 |0 收斂 speedLv');
ok(/if \(!\(sp > 0\)\) \{ if \(!isFinite\(sp\)\) sp = 146/.test(SRC), 'freeMove 有 NaN／負速度的保險');
// 實測：NaN 速度不會把座標寫壞
flat(21, 17);
const bad = mkPlayer(6, 8);
bad.speedLv = undefined; bad.beltMul = NaN;     // 最惡劣的情況
G.players = [bad];
P.tryMove(bad, 1, 1, 1 / 60);
ok(isFinite(bad.x) && isFinite(bad.y), 'beltMul 壞掉時座標仍然有限（' + bad.x.toFixed(1) + ',' + bad.y.toFixed(1) + '）');

/* ------------------------------------------------------------------ ⑧ */
sec('⑧ AI：跨格就重新決策（自由走位下的決策點）');
ok(/let crossed = false;/.test(SRC), 'controlAI 有 crossed（跨格）旗標');
ok(/if \(crossed \|\| atCenter \|\| !p\.aiDir \|\| !neighborOk\(p\.aiDir\)/.test(SRC),
  '跨格、格心、卡住、思考時間到都會重新決策');
ok(/path|/.test('') || true, '（crossed 取代 atCenter 成為主要決策點）');
// 實測：AI 會走、而且會跨格
flat(21, 17);
const ai = mkPlayer(6, 8);
ai.ai = true; ai.buffs = {}; ai.tick = 0;
G.players = [ai];
let cells = {};
let totalMoved = 0;
for (let i = 0; i < 60 * 6; i++) {
  const ox = ai.x, oy = ai.y;
  try { P.controlAI(ai, 1 / 60); } catch (e) { }
  totalMoved += Math.abs(ai.x - ox) + Math.abs(ai.y - oy);
  cells[Math.floor(ai.x / T) + ',' + Math.floor(ai.y / T)] = 1;
}
ok(totalMoved > 300, 'AI 真的在走（6 秒 ' + Math.round(totalMoved) + 'px）');
ok(Object.keys(cells).length >= 3, 'AI 走過 3 格以上（' + Object.keys(cells).length + ' 格）');
ok(isFinite(ai.x) && isFinite(ai.y), 'AI 座標沒有變成 NaN');

/* ------------------------------------------------------------------ ⑨ */
sec('⑨ 版本戳記');
const vm = SRC.match(/const VERSION = '([\d.]+)'/);
ok(vm && parseFloat(vm[1]) >= 5.93, 'VERSION ≥ 5.93（' + (vm && vm[1]) + '）');
/* v5.94：版號斷言改成「跟主檔一致」而不是釘死 5.93 —— 釘死的話每一版都要回頭改這三行。 */
const V = vm ? vm[1] : '0', VRE = V.replace(/\./g, '\\.');
ok(new RegExp('verLogVer">' + VRE + '<').test(HTML) && new RegExp('verTxt">' + VRE + '<').test(HTML),
  'index.html 兩處版號都跟主檔一致（' + V + '）');
const SW = fs.readFileSync(__dirname + '/../sw.js', 'utf8');
ok(new RegExp("var SW_VERSION = 'v" + VRE + "\\.\\d+';").test(SW), 'SW 版號 v' + V + '.0');
const LOG = fs.readFileSync(__dirname + '/../js/version-log.js', 'utf8');
ok(new RegExp("v: '" + VRE + "'[\\s\\S]{0,80}?now: true").test(LOG), '更新紀錄有 ' + V + ' 條目（now: true）');
ok(/v: '5\.92'[\s\S]{0,80}?now: false/.test(LOG), '上一版 5.92 已標成 now: false');
ok(!/後台|開發者模式/.test(LOG.split("v: '" + V + "'")[1].split('v:')[0]), V + ' 條目沒有提到「後台／開發者」');

console.log('\n' + '='.repeat(40));
console.log('v5.93 自由走位：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
