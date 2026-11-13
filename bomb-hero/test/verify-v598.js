// test/verify-v598.js —— v5.98：地板透底 ＋ 音效 ＋ 鴕鳥斜跳 ＋ 放彈上牆
//   ① 地板不再疊「氛圍照片」（玩家看到的「地板半透明透出底圖」就是那一層）
//   ② 取得道具 → 高亢愉悅（上行琶音，全部 ≥ 1047Hz）；隨從共用同一個音效
//   ③ 取得坐騎 → 另一支獎勵音；二階坐騎 → 更高更長的頒獎音 ＋ 繽紛大特效
//   ④ 鴕鳥 45 度斜跳（同時按住兩個垂直方向鍵）
//   ⑤ 鴕鳥前方無牆也要往前跳；優先序 隔二格 > 隔一格 > 原地
//   ⑥ 放完炸彈不能走上旁邊的軟牆／硬牆（passers 方盒判定 ＋ freeMove 自救條件）
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function sec(t) { console.log('\n' + t); }

/* ---------------------------------------------------------------- ① */
sec('① 地板不再透出背景底圖');
ok(mainSrc.indexOf("ctx.drawImage(Game.bgPhoto, 0, 0, Game.cols * T, Game.rows * T)") < 0,
  '不再把氛圍照片 drawImage 到整片地板上');
ok(!/globalCompositeOperation = 'overlay';\s*\n\s*ctx\.globalAlpha = \.26/.test(mainSrc),
  'overlay 26% 那一層已經移除');
ok(mainSrc.indexOf('Game.bgPhoto 仍然保留') >= 0, '註解有交代 bgPhoto 仍然用在「地圖外面」的背景');

/* ---------------------------------------------------------------- ② */
sec('② 取得道具：高亢愉悅');
const itemBlock = (mainSrc.match(/item\(\) \{([\s\S]*?)\n    \},/) || [])[1] || '';
ok(itemBlock.length > 40, '找得到 item() 音效配方');
const freqs = (itemBlock.match(/tone\((\d+)/g) || []).map(function (s) { return parseInt(s.slice(5), 10); });
ok(freqs.length >= 4, 'item() 至少四層（取得道具不能只有一聲）', freqs);
ok(freqs.every(function (f) { return f >= 1047; }), 'item() 全部 ≥ 1047Hz（C6 以上才算高亢）', freqs);
ok(freqs.length >= 2 && freqs[0] < freqs[freqs.length - 1], 'item() 是上行（最後一顆比第一顆高）', freqs);
ok(!/tone\(760/.test(itemBlock), '舊版的 760Hz 低音已經拿掉');
ok(/AudioSys\.sfx\('item', p\.x, p\.y\)/.test(mainSrc), '隨從取得道具走同一個 item 音效（六格可聽半徑）');

/* ---------------------------------------------------------------- ③ */
sec('③ 坐騎：一般 vs 二階');
ok(/^    mount\(\) \{/m.test(mainSrc), '有 mount() 專屬獎勵音（不再借用 item）');
ok(/^    mount2\(\) \{/m.test(mainSrc), '有 mount2() 二階坐騎頒獎音');
const m2 = (mainSrc.match(/mount2\(\) \{([\s\S]*?)\n    \},/) || [])[1] || '';
// mount2 用的是「和弦陣列 + forEach」寫法，tone(1047…) 不會以字面出現 → 兩個來源都要抓
const m2f = [];
(m2.match(/tone\((\d+)/g) || []).forEach(function (s) { m2f.push(parseInt(s.slice(5), 10)); });
(m2.match(/\[[\d,\s]+\]\.forEach/g) || []).forEach(function (a) {
  (a.match(/\d+/g) || []).forEach(function (n) { m2f.push(parseInt(n, 10)); });
});
ok(m2f.length >= 6, 'mount2() 至少六層（和弦 ＋ 五連上行）', m2f);
ok(Math.max.apply(null, m2f.concat([0])) >= 3136, 'mount2() 有 3136Hz 超高亮片（比 mount 更高）', m2f);
ok(/AudioSys\.sfx\(red \? 'mount2' : 'mount'\)/.test(mainSrc), '紅龍（二階）走 mount2、一般恐龍走 mount');
ok(/AudioSys\.sfx\(up \? 'mount2' : 'mount'\)/.test(mainSrc), '風暴鴕鳥（二階）走 mount2、一般鴕鳥走 mount');
ok(/if \(red\) mountUpFx\(p, '#ff7a8a'\)/.test(mainSrc), '進化紅龍會播繽紛大特效');
ok(/if \(up\) mountUpFx\(p, '#c9a7f2'\)/.test(mainSrc), '進化風暴鴕鳥會播繽紛大特效');
const mfx = (mainSrc.match(/function mountUpFx\(p, base\) \{([\s\S]*?)\n\}/) || [])[1] || '';
ok(/heroImpact\(/.test(mfx), '大特效有主爆核（heroImpact）');
ok((mfx.match(/kind: 'ring'/g) || []).length >= 1 && /for \(let i = 0; i < 3; i\+\+\)/.test(mfx), '三圈錯開的彩色擴散環');
ok(/confetti\(/.test(mfx), '有彩帶（繽紛的關鍵）');
ok(/speedLines\(/.test(mfx), '有五色放射光線');

/* ---------------------------------------------------------------- ④⑤ */
sec('④⑤ 鴕鳥跳躍');
const env = makeEnv();
const B = env.BH;
const G = B.Game;
const T = 40;
G.T = T;
G.particles = G.particles || [];
G.rings = G.rings || [];
G.players = G.players || [];
function board(cols, rows) {
  G.cols = cols; G.rows = rows;
  G.grid = []; G.wallKind = [];
  for (let y = 0; y < rows; y++) {
    const r = [], k = [];
    for (let x = 0; x < cols; x++) { r.push(0); k.push(2); }
    G.grid.push(r); G.wallKind.push(k);
  }
  for (let x = 0; x < cols; x++) {
    G.grid[0][x] = 1; G.grid[rows - 1][x] = 1;
    G.wallKind[0][x] = 1; G.wallKind[rows - 1][x] = 1;
  }
  for (let y = 0; y < rows; y++) {
    G.grid[y][0] = 1; G.grid[y][cols - 1] = 1;
    G.wallKind[y][0] = 1; G.wallKind[y][cols - 1] = 1;
  }
  G.bombs = []; G.items = []; G.enemies = []; G.flames = []; G.eggs = []; G.eggsHidden = [];
  return G;
}
function ost(x, y, storm) {
  return { x: x * T + T / 2, y: y * T + T / 2, alive: true, ostrich: true, storm: !!storm,
    air: 0, fireCd: 0, facing: 'right', moving: false, invuln: 0, dived: false };
}
function cellOf(v) { return Math.floor(v / T); }
function land(p) { return [cellOf(p.jumpTo.x), cellOf(p.jumpTo.y)]; }

// ④-1 斜跳：同時按住 ↑ + →（沒有牆）→ 往右上對角
board(12, 12);
let p = ost(5, 5, false);
ok(B.mountJump(p, ['up', 'right']) === true, '斜跳：mountJump 回傳 true');
let L = land(p);
ok(L[0] > 5 && L[1] < 5, '斜跳：往右上（x 增加、y 減少）', L);
ok(Math.abs(L[0] - 5) === Math.abs(L[1] - 5), '斜跳：兩軸位移相同 → 真的 45 度', L);
ok(p.jumpTo.x - p.x === -(p.jumpTo.y - p.y), '斜跳：位移向量是 (±d, ∓d)');

// ④-2 只按一個方向 → 不會變斜
board(12, 12);
p = ost(5, 5, false);
B.mountJump(p, ['right']);
L = land(p);
ok(L[1] === 5, '只按 → 時仍是水平跳（不會歪成斜的）', L);
ok(L[0] > 5, '水平跳有往前', L);

// ④-3 上下同時按（互相反向）→ 不算斜向
board(12, 12);
p = { x: 5.5 * T, y: 5.5 * T, alive: true, ostrich: true, storm: false, air: 0, fireCd: 0,
  facing: 'left', moving: false, invuln: 0, dived: false };
B.mountJump(p, ['up', 'down']);
L = land(p);
ok(L[1] === 5, '上下同時按不會變成斜跳（退回 facing）', L);

// ⑤-1 前方全無牆 → 往前跳（舊版會原地跳）
board(12, 12);
p = ost(5, 5, false);
B.mountJump(p, ['right']);
L = land(p);
ok(L[0] === 7, '前方無牆：往前跳 2 格（不再是原地跳）', L);
ok(p.jumpOver === false, '前方無牆：jumpOver = false（這不是「跨」）');

// ⑤-2 隔一格牆 → 跨過去
board(12, 12);
G.grid[5][6] = 1;
p = ost(5, 5, false);
B.mountJump(p, ['right']);
L = land(p);
ok(L[0] === 7 && L[1] === 5, '隔一格牆：落在牆後面那一格', L);
ok(p.jumpOver === true, '隔一格牆：jumpOver = true');

// ⑤-3 隔二格牆（一般鴕鳥）→ 跳不過，原地
board(12, 12);
G.grid[5][6] = 1; G.grid[5][7] = 1;
p = ost(5, 5, false);
B.mountJump(p, ['right']);
L = land(p);
ok(L[0] === 5 && L[1] === 5, '隔二格牆（未進化）：跳不過 → 原地跳', L);

// ⑤-4 隔二格牆（風暴鴕鳥）→ 跨二格
board(12, 12);
G.grid[5][6] = 1; G.grid[5][7] = 1;
p = ost(5, 5, true);
B.mountJump(p, ['right']);
L = land(p);
ok(L[0] === 8 && L[1] === 5, '隔二格牆（風暴）：跨二格落第 3 格', L);
ok(p.jumpOver === true, '隔二格牆（風暴）：jumpOver = true');

// ⑤-5 隔一格牆 + 進化 → 優先序：先試二格，不行才一格
board(12, 12);
G.grid[5][6] = 1;
p = ost(5, 5, true);
B.mountJump(p, ['right']);
L = land(p);
ok(L[0] === 7, '只有一格牆時（風暴）退回隔一格，不會硬跳三格', L);

// ⑤-6 全被牆擋死 → 原地
board(12, 12);
G.grid[5][6] = 1; G.grid[5][7] = 1; G.grid[5][8] = 1;
p = ost(5, 5, true);
B.mountJump(p, ['right']);
L = land(p);
ok(L[0] === 5 && L[1] === 5, '前方三格全是牆 → 原地跳', L);

// ⑤-7 落點是地圖邊界外 → 原地
board(12, 12);
p = ost(10, 5, false);
B.mountJump(p, ['right']);
L = land(p);
ok(L[0] >= 10 && L[0] <= 11, '靠右邊界時不會跳出地圖', L);

/* ---------------------------------------------------------------- ⑥ */
sec('⑥ 放完炸彈不能走上牆');
board(12, 12);
const bomb = { cx: 5, cy: 5, passers: [], timer: 99, power: 1, owner: null };
// passers 保留條件：方盒還壓在炸彈格上就要留著
let pl = { x: 5.5 * T, y: 5.5 * T, alive: true };
ok(B.bombPassKeep(bomb, pl) === true, '站在炸彈格中央 → 還是 passer');
pl = { x: 5.5 * T, y: 4.95 * T, alive: true };       // 中心已跨進上一格，方盒(0.6格)還壓著
ok(Math.floor(pl.y / T) === 4, '（前提）中心已經在上面的格子');
ok(B.bombPassKeep(bomb, pl) === true, '中心跨格但方盒還壓著 → 仍是 passer（舊版這裡就踢掉了）');
pl = { x: 5.5 * T, y: 4.69 * T, alive: true };       // 方盒 4.39~4.99 完全離開第 5 列
ok(B.bombPassKeep(bomb, pl) === false, '方盒完全離開 → 才移除 passer（炸彈恢復實體）');
pl = { x: 5.5 * T, y: 4.95 * T, alive: false };
ok(B.bombPassKeep(bomb, pl) === false, '死亡的人不會留在 passers');

// freeMove：被炸彈壓住（不是牆）時，只能走出炸彈，不能走進牆
//   場景：角色站在 (6,5) 正中央、左邊 (5,5) 與上面 (6,4) 都是硬牆，
//         腳下 (6,5) 有自己剛放的炸彈 → 方盒壓著炸彈，但沒有壓到牆。
board(12, 12);
G.grid[5][5] = 1; G.grid[4][6] = 1;
const wallP = { x: 6.5 * T, y: 5.5 * T, alive: true, ch: {} };
ok(B.terrainBlocked(wallP, wallP.x, wallP.y) === false, '（前提）他現在沒有壓在牆上');
G.bombs = [{ cx: 6, cy: 5, px: 6.5 * T, py: 5.5 * T, passers: [], timer: 99 }];
ok(B.boxBlocked(wallP, wallP.x, wallP.y) === true, '（前提）他現在被炸彈壓住');
for (let i = 0; i < 120; i++) B.freeMove(wallP, -1, -1, 1 / 60);
ok(cellOf(wallP.x) === 6 && cellOf(wallP.y) === 5,
  '被炸彈壓住時往左上推 2 秒 → 走不進旁邊的牆', [cellOf(wallP.x), cellOf(wallP.y)]);
ok(B.terrainBlocked(wallP, wallP.x, wallP.y) === false, '推了 2 秒之後仍然沒有卡在牆裡');

// 真的卡在牆裡 → 仍然可以自由移動（自救機制不能被拿掉）
board(12, 12);
G.grid[4][4] = 1;
G.bombs = [];
const stuck = { x: 4.5 * T, y: 4.5 * T, alive: true, ch: {} };
ok(B.terrainBlocked(stuck, stuck.x, stuck.y) === true, '（前提）他卡在牆裡');
B.freeMove(stuck, 1, 1, 1 / 60);
ok(stuck.x > 4.5 * T && stuck.y > 4.5 * T, '卡在牆裡時仍可自由移動（自救）', [stuck.x.toFixed(1), stuck.y.toFixed(1)]);

/* ---------------------------------------------------------------- 版本 */
sec('版本戳記');
const vm = mainSrc.match(/const VERSION = '([\d.]+)'/);
ok(vm && parseFloat(vm[1]) >= 5.98, 'VERSION ≥ 5.98（' + (vm && vm[1]) + '）');
const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
ok(/var SW_VERSION = 'v5\.98\.0';/.test(SW), 'SW 版號 v5.98.0');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.98：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
