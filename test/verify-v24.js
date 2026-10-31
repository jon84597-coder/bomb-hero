// 無頭測試 v24：v1.6 九項需求（版本已推進 1.8）
//   1. 每一頁都有明顯的「← 上一頁」（#navBar + Screen 棧 + 手機系統返回不關網頁）
//   2. 音樂／音效開關放在明顯處（🎵 音樂、🔊 音效 兩顆藥丸按鈕）
//   3. 小怪變多變兇（10 種 species）
//   4. 冰面／輸送帶改成「繞一圈」或「一排一排」，不再一塊一塊
//   5. BOSS 會躲炸彈、炸彈多、火力長、很會丟
//   6. 線上配對只剩一個暱稱輸入框
//   7. 每一關有自己的地圖材質（8 種風格）
//   8. 10 種小怪造形 + 飛的越牆 / 走的被牆擋
//   9. 網頁打得開（單檔、零外鏈、版本正確）
const fs = require('fs');
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH, rec = env.rec;
const els = env.els;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function freshSolo(stage, opts) {
  opts = opts || {};
  P.settings.size = 'M';
  P.settings.hazards = opts.hazards || 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.settings.soloTime = 300;
  P.settings.bgm = .6;

  P.startSolo(stage || 1, false);
  G.state = 'play';
  G.bombs.length = 0; G.flames.length = 0;
  G.particles.length = 0; G.bubbles.length = 0;
  G.players[0].invuln = 0;
  return G.players[0];
}
function clearBoard() {
  G.bombs.length = 0; G.flames.length = 0; G.enemies.length = 0;
  G.particles.length = 0; G.bubbles.length = 0;
}
function snapCalls() { return rec.calls.slice(); }
function opHash(list) {
  const names = list.map(c => c[0]);
  const uniq = Array.from(new Set(names)).sort();
  return uniq.join(',');
}

// =====================================================================
console.log('=== 1. 每一頁都有明顯的「← 上一頁」 ===');
ok(/<div id="navBar">/.test(html), 'HTML 有全域工具列 #navBar');
ok(/id="btnBack"/.test(html) && /上一頁/.test(html) && /class="ar">←/.test(html), '工具列有「← 上一頁」按鈕');
ok(/#navBar \{[^}]*position:\s*fixed/.test(html), '#navBar 是 fixed（釘在畫面上，不隨頁面捲走）');
ok(/#navBar \{[^}]*z-index:\s*1200/.test(html), '#navBar z-index 1200（蓋在所有畫面之上）');
ok(/env\(safe-area-inset-top/.test(html), '避開 iPhone 瀏海（safe-area-inset-top）');
ok(/\.navbtn \{[^}]*pointer-events:\s*auto/.test(html), '按鈕本身可點（父層 pointer-events:none）');
ok(/\.navbtn \{[^}]*font-size:\s*14px/.test(html), '按鈕字級 14px（手機好按）');
ok(/\.navbtn \{[^}]*border-radius:\s*999px/.test(html), '按鈕是藥丸形');

ok(typeof P.Screen.back === 'function', 'Screen.back() 存在');
ok(typeof P.Screen.stack === 'function', 'Screen 用「畫面棧」記住走過的路徑');
ok(Array.isArray(P.Screen.stack()) && P.Screen.stack()[0] === 'title', '棧底固定是標題頁（不會退到空白）');
ok((env.listeners.popstate || []).length >= 1, '有監聽 popstate（手機系統返回鍵）');
ok(P.Screen.depth >= 1, '棧深度可讀（目前 ' + P.Screen.depth + '）');

// 走一趟：標題 → 設定 → 返回
P.Screen.show('title');
ok(P.Screen.current === 'title', '起點是 title');
P.Screen.show('settings');
ok(P.Screen.current === 'settings' && P.Screen.depth === 2, '進設定頁 → 棧深度 2');
P.Screen.back();
ok(P.Screen.current === 'title', '按「← 上一頁」回到標題（不會離開網頁）');

P.Screen.show('online');
ok(P.Screen.current === 'online', '進線上配對頁');
P.Screen.show('settings');
P.Screen.back();
ok(P.Screen.current === 'online', '線上配對 → 設定 → 上一頁，回到線上配對（不是直接跳標題）');

// 遊戲中按上一頁 = 暫停，不是退出
freshSolo(1);
P.Screen.show('game');
P.Screen.back();
ok(P.Screen.current === 'game', '遊戲中按上一頁仍留在遊戲畫面');
ok(P.isPaused() === true, '遊戲中按上一頁 → 變成暫停（不會直接關掉 / 退出）');
P.togglePause();

// 工具列在遊戲中自動收起（但返回邏輯還在）
P.Screen.show('title');
ok(els.navBar && els.navBar._cls.has('atTitle'), '標題頁隱藏「上一頁」（已經在最上層）');
P.Screen.show('settings');
ok(els.navBar && !els.navBar._cls.has('atTitle'), '設定頁顯示「上一頁」');
P.Screen.show('game');
// v1.8：遊戲中不再收起工具列 —— 🎵／🔊 永遠在右上角隨時可開關
ok(els.navBar && !els.navBar._cls.has('hide'), '遊戲中工具列依然在（音樂／音效隨時能關）');
ok(els.navBar && els.navBar._cls.has('inGame'), '遊戲中切換成精簡模式（inGame）');
ok(/#navBar\.inGame #btnBack \{ display: inline-flex/.test(html), 'v2.3：精簡模式「← 上一頁」改成顯示（討伐 BOSS 才退得回來）');
ok(/#navBar\.inGame \{[^}]*justify-content: flex-end/.test(html), '遊戲中兩顆開關仍靠右對齊');
P.Screen.show('title');

// =====================================================================
console.log('\n=== 2. 音樂／音效開關在明顯處 ===');
ok(/id="btnMusic"/.test(html) && /🎵/.test(html), '工具列有「🎵 音樂」按鈕');
ok(/id="btnSfx"/.test(html) && /🔊/.test(html), '工具列有「🔊 音效」按鈕');
ok(/#navBar \.navright|\.navright \{/.test(html), '兩顆開關靠右上角（.navright）');
ok(/\.navbtn\.tg\.off\s*\{[^}]*color:\s*#7d7790/.test(html), '關閉狀態有明顯變灰（.off）');
ok(/\.navbtn\.tg\.off b\s*\{[^}]*line-through/.test(html), '關閉狀態文字加刪除線');

const btnM = els.btnMusic, btnS = els.btnSfx;
ok(btnM && (btnM._on.click || []).length === 1, '音樂按鈕已綁 click');
ok(btnS && (btnS._on.click || []).length === 1, '音效按鈕已綁 click');

P.settings.bgm = .6; P.settings.bgmLast = .6;
btnM._on.click[0]();
ok(P.settings.bgm === 0, '按一下「音樂」→ 主音樂關（bgm=0）');
ok(btnM._cls.has('off'), '關閉後按鈕變灰（視覺回饋）');
btnM._on.click[0]();
ok(P.settings.bgm > 0, '再按一下 → 主音樂開回來（' + P.settings.bgm + '）');
ok(!btnM._cls.has('off'), '開啟後按鈕恢復亮色');

P.settings.sfx = 1; P.settings.sfxLast = 1;
btnS._on.click[0]();
ok(P.settings.sfx === 0, '按一下「音效」→ 音效關（sfx=0）');
ok(btnS._cls.has('off'), '音效關閉後按鈕變灰');
btnS._on.click[0]();
ok(P.settings.sfx > 0, '再按一下 → 音效開回來');

// 音樂與音效互不干擾
P.settings.bgm = .6; P.settings.sfx = 1;
btnS._on.click[0]();
ok(P.settings.sfx === 0 && P.settings.bgm > 0, '關音效不會關到主音樂');
P.settings.sfx = 1;
btnM._on.click[0]();
ok(P.settings.bgm === 0 && P.settings.sfx > 0, '關主音樂不會關到音效');
P.settings.bgm = .6;
ok(typeof P.AudioSys.applyVolumes === 'function', '音量有實際套用到 WebAudio（applyVolumes）');
ok(/musicGain\.gain\.value\s*=\s*0\.32\s*\*\s*settings\.bgm/.test(html) && /sfxGain\.gain\.value\s*=\s*0\.5\s*\*\s*settings\.sfx/.test(html),
  '主音樂 / 音效走各自的 gain node（真的分開）');

// =====================================================================
console.log('\n=== 3. 小怪種類變多、變兇 ===');
const SP = BH.ENEMY_SPECIES;
ok(Array.isArray(SP) && SP.length === 10, '小怪共 10 種（' + (SP || []).length + '）');
ok(SP.filter(s => s.wing).length === 4, '天空飛的 4 種（有翅膀）');
ok(SP.filter(s => !s.wing).length === 6, '地上走的 6 種（沒翅膀）');
ok(new Set(SP.map(s => s.id)).size === 10, '每種 id 都不重複');
ok(SP.every(s => s.name && s.name.length >= 2), '每種都有中文名');
ok(new Set(SP.map(s => s.color)).size >= 8, '顏色至少 8 種不同（外型辨識度）');
ok(SP.every(s => s.r >= 12 && s.r <= 16), '體型半徑 12～16（不會大小失衡）');
ok(BH.speciesOf('bat').wing === true, 'speciesOf 查得到（bat 會飛）');
ok(BH.speciesOf('slime').wing === false, 'speciesOf 查得到（slime 走地面）');

// 每關出怪種類遞增
function typesOfStage(stage) {
  freshSolo(stage);
  const set = new Set();
  G.enemies.forEach(e => { if (!e.boss) set.add(e.spec || e.type); });
  return set;
}
const t1 = typesOfStage(1), t4 = typesOfStage(4), t7 = typesOfStage(7);
ok(t1.size >= 2, '第 1 關就有 2 種以上小怪（' + t1.size + '）');
ok(t4.size > t1.size, '第 4 關種類比第 1 關多（' + t4.size + ' > ' + t1.size + '）');
ok(t7.size >= 7, '第 7 關種類最多（' + t7.size + ' 種）');

// 兩段血的小怪
const beetle = P.makeEnemy(2, 2, 'beetle', 5, 1);
const slimeE = P.makeEnemy(2, 2, 'slime', 5, 1);
ok(beetle.hp === 2, '鐵甲蟲要炸兩次（hp=2）');
ok(slimeE.hp === 1, '史萊姆炸一次就爆（hp=1）');
ok(beetle.eName === '鐵甲蟲' && beetle.wing === false, 'makeEnemy 會帶入中文名與翅膀屬性');

// 小怪速度有感差異
const spds = SP.map(s => s.spd);
ok(Math.max.apply(null, spds) - Math.min.apply(null, spds) >= 30, '快慢差距 ≥ 30（疾風蜥 / 毒蜂真的有感）');

// =====================================================================
console.log('\n=== 4. 冰面／輸送帶繞一圈或一排一排 ===');
const TP = P.THEMES.find(t => t.hazards.indexOf('convey') >= 0 && t.hazards.indexOf('ice') >= 0);
const CV = P.THEMES.find(t => t.hazards.length === 1 && t.hazards[0] === 'convey');
const IC = P.THEMES.find(t => t.hazards.length === 1 && t.hazards[0] === 'ice');
ok(!!TP, '有同時帶輸送帶＋冰面的關卡（' + (TP && TP.name) + '）');
ok(!!CV && !!IC, '也有單一機關的關卡（' + (CV && CV.name) + ' / ' + (IC && IC.name) + '）');

function mapWith(shape, theme) {
  P.settings.hazards = 'on';
  G.stage = 1;
  P.buildMap(15, 13, theme || TP, { hazardShape: shape, emptyRate: 0, items: 0 });
  return { cols: G.cols, rows: G.rows };
}

function hazardCells() {
  const out = [];
  for (let y = 1; y < G.rows - 1; y++)
    for (let x = 1; x < G.cols - 1; x++)
      if (G.hazards[y][x]) out.push({ x: x, y: y, h: G.hazards[y][x] });
  return out;
}
// 出口門那一格不算斷點（跑道要繞過門，不可能壓在門上）
function isHz(x, y) {
  if (G.hazards[y] && G.hazards[y][x]) return true;
  if (G.door && G.door.x === x && G.door.y === y) return true;
  return false;
}
function maxRunInRow(y) {
  let best = 0, cur = 0;
  for (let x = 0; x < G.cols; x++) { if (isHz(x, y)) { cur++; if (cur > best) best = cur; } else cur = 0; }
  return best;
}
function maxRunInCol(x) {
  let best = 0, cur = 0;
  for (let y = 0; y < G.rows; y++) { if (isHz(x, y)) { cur++; if (cur > best) best = cur; } else cur = 0; }
  return best;
}

// --- 環形（輸送帶） ---
mapWith('ring', CV);
let hz = hazardCells();
ok(hz.length >= 40, '環形：機關數量夠整圈（' + hz.length + ' 格）');
ok(maxRunInRow(1) >= G.cols - 4, '環形：上緣一整條連通（' + maxRunInRow(1) + ' / ' + (G.cols - 2) + '）');
ok(maxRunInRow(G.rows - 2) >= G.cols - 4, '環形：下緣一整條連通（' + maxRunInRow(G.rows - 2) + '）');
ok(maxRunInCol(1) >= G.rows - 4, '環形：左緣一整條連通（' + maxRunInCol(1) + ' / ' + (G.rows - 2) + '）');
ok(maxRunInCol(G.cols - 2) >= G.rows - 4, '環形：右緣一整條連通（' + maxRunInCol(G.cols - 2) + '）');
ok(hz.every(c => G.grid[c.y][c.x] !== 1), '環形：不會蓋在炸不掉的石牆上');
// 順時針：上緣往右、右緣往下、下緣往左、左緣往上（真的繞一圈）
const dirAt = (x, y) => (G.hazards[y] && G.hazards[y][x] ? G.hazards[y][x].dir : null);
ok(dirAt(5, 1) === 'right', '環形：上緣方向往右（' + dirAt(5, 1) + '）');
ok(dirAt(G.cols - 2, 5) === 'down', '環形：右緣方向往下（' + dirAt(G.cols - 2, 5) + '）');
ok(dirAt(5, G.rows - 2) === 'left', '環形：下緣方向往左（' + dirAt(5, G.rows - 2) + '）');
ok(dirAt(1, 5) === 'up', '環形：左緣方向往上（' + dirAt(1, 5) + '）');
// 環形：中間不應該有散落的機關（不再是「一塊一塊」）
const inner = hz.filter(c => c.x > 2 && c.x < G.cols - 3 && c.y > 2 && c.y < G.rows - 3);
ok(inner.length === 0, '環形：地圖中央沒有零散機關（' + inner.length + ' 格）');

// --- 環形（冰面）也一樣繞一圈 ---
mapWith('ring', IC);
ok(maxRunInRow(1) >= G.cols - 4 && maxRunInCol(1) >= G.rows - 4, '冰面關也是繞一整圈');
ok(hazardCells().every(c => c.h.type === 'ice'), '冰面關鋪的是冰面（不是輸送帶）');

// --- 條狀（輸送帶） ---
mapWith('rows', CV);
hz = hazardCells();
ok(hz.length >= 30, '條狀：機關數量足夠（' + hz.length + ' 格）');
const rowRuns = [];
for (let y = 1; y < G.rows - 1; y++) { const r = maxRunInRow(y); if (r >= 5) rowRuns.push(y); }
ok(rowRuns.length >= 3, '條狀：至少 3 條完整長條（' + rowRuns.length + ' 條）');
ok(rowRuns.every(y => maxRunInRow(y) >= G.cols - 4), '條狀：每條都幾乎橫貫整張圖');
ok(hz.every(c => G.grid[c.y][c.x] !== 1), '條狀：不會蓋在石牆上');
// 條與條之間是空白的
const gapOk = rowRuns.length >= 2 && (rowRuns[1] - rowRuns[0]) >= 3;
ok(gapOk, '條狀：條與條之間有留走道（間隔 ' + (rowRuns[1] - rowRuns[0]) + ' 排）');
// 相鄰兩條方向交錯（一條往右一條往左）
ok(dirAt(5, rowRuns[0]) !== dirAt(5, rowRuns[1]), '條狀：相鄰兩條方向交錯（' + dirAt(5, rowRuns[0]) + ' / ' + dirAt(5, rowRuns[1]) + '）');
// 條狀：沒有散落的單格機關
const lonely = hz.filter(c => maxRunInRow(c.y) < 5 && maxRunInCol(c.x) < 5);
ok(lonely.length === 0, '條狀：沒有孤零零的單格機關（' + lonely.length + ' 格）');

// 條狀（冰面）
mapWith('rows', IC);
ok(hazardCells().every(c => c.h.type === 'ice') && maxRunInRow(1) >= G.cols - 4, '冰面關也能排成一條一條');

// 同一關兩種機關：一種繞圈、一種排排站，而且不互相覆蓋
mapWith('ring', TP);
const combine = hazardCells();
const cTypes = new Set(combine.map(c => c.h.type));
ok(cTypes.size === 2, '同時有輸送帶與冰面時兩種都會出現（' + Array.from(cTypes).join('+') + '）');
ok(combine.every(c => G.hazards[c.y][c.x] && G.hazards[c.y][c.x].type === c.h.type), '兩種機關同格不會互相覆蓋');

// 跑道不會被軟磚打斷（put() 會清軟磚）
mapWith('rows', CV);
let broken = 0;
hazardCells().forEach(c => { if (G.grid[c.y][c.x] === 2) broken++; });
ok(broken === 0, '跑道上的軟磚已被清掉（不會被木箱擋住）' + (broken ? '，仍有 ' + broken : ''));

// 出口門不會被機關挖掉
mapWith('ring', CV);
ok(!!G.door && !G.hazards[G.door.y][G.door.x], '環形不會把出口門挖掉');
mapWith('rows', CV);
ok(!!G.door && !G.hazards[G.door.y][G.door.x], '條狀不會把出口門挖掉');

// 奇偶關自動輪替（單一機關關卡才看得出來）
P.settings.hazards = 'on';
G.stage = 1; P.buildMap(15, 13, CV, { emptyRate: 0, items: 0 });
const oddRing = maxRunInRow(1) >= G.cols - 4 && maxRunInCol(1) >= G.rows - 4;
G.stage = 2; P.buildMap(15, 13, CV, { emptyRate: 0, items: 0 });
const evenRows = maxRunInRow(1) >= G.cols - 4 && maxRunInCol(1) < G.rows - 4;
ok(oddRing, '奇數關自動排成「繞一圈」');
ok(evenRows, '偶數關自動排成「一排一排」');

// =====================================================================
console.log('\n=== 5. BOSS 會躲炸彈、彈多、火力長、很會丟 ===');
const theme0 = P.THEMES[0];
P.settings.hazards = 'off';
P.buildMap(15, 13, theme0, { emptyRate: 1, items: 0, noHazards: true });
G.stage = 8;
clearBoard();
freshSolo(1);
P.buildMap(15, 13, theme0, { emptyRate: 1, items: 0, noHazards: true });
G.players[0].x = 13 * G.T + G.T / 2;
G.players[0].y = 11 * G.T + G.T / 2;
G.players[0].invuln = 99;
clearBoard();

const T = G.T;
function bossAt(cx, cy, hp) {
  const b = P.makeBoss(cx, cy, hp || 10);
  clearBoard();
  G.enemies.push(b);
  return b;
}
function cellOf(e) { return { x: Math.floor(e.x / T), y: Math.floor(e.y / T) }; }

let boss = bossAt(4, 4, 10);
ok(boss.boss === true && boss.maxHp === 10, 'BOSS 有 boss 標記與血量上限');
function playerBomb(cx, cy, power) {
  G.bombs.push({
    cx: cx, cy: cy, px: cx * T + T / 2, py: cy * T + T / 2, timer: 2, power: power,
    owner: G.players[0], passers: [G.players[0]], flying: null, moving: null, held: false
  });
}
function bossBomb(cx, cy, power) {
  G.bombs.push({
    cx: cx, cy: cy, px: cx * T + T / 2, py: cy * T + T / 2, timer: 2, power: power,
    owner: null, passers: [boss], flying: null, moving: null, held: false
  });
}

// --- 躲：玩家在同一排丟了一顆火力 4 的炸彈 ---
boss = bossAt(7, 5, 10);
playerBomb(3, 5, 4);
ok(P.dangerAt(7, 5) === true, '玩家的火線蓋到 BOSS 腳下（dangerAt 判得出來）');
for (let i = 0; i < 120; i++) P.updateBoss(boss, 1 / 60);
const after = cellOf(boss);
ok(!(after.x === 7 && after.y === 5), '腳下有火線時 BOSS 會跑開（搬到 ' + after.x + ',' + after.y + '）');
ok(P.dangerAt(after.x, after.y) === false, 'BOSS 躲到安全格（不是隨便亂衝）');
ok(after.y !== 5 || after.x > 7, 'BOSS 是離開射線（橫向繞出或縱向閃開），不是原地抖');

// --- 躲：玩家炸彈在正下方，要往左右閃 ---
boss = bossAt(5, 7, 10);
playerBomb(5, 10, 4);
ok(P.dangerAt(5, 7) === true, '直向火線也判得出來');
for (let i = 0; i < 120; i++) P.updateBoss(boss, 1 / 60);
const vb = cellOf(boss);
ok(P.dangerAt(vb.x, vb.y) === false, '直向火線也能躲掉（跑到 ' + vb.x + ',' + vb.y + '）');
ok(vb.x !== 5, '是往左右離開火線（x ' + vb.x + '）');

// --- 沒有安全格時不亂衝（四面都是玩家炸彈） ---
boss = bossAt(4, 4, 10);
[[3, 4], [5, 4], [4, 3], [4, 5]].forEach(function (c) { playerBomb(c[0], c[1], 3); });
for (let i = 0; i < 30; i++) P.updateBoss(boss, 1 / 60);
ok(P.dangerAt(cellOf(boss).x, cellOf(boss).y) === true, '四面楚歌時不會瞬移逃走（硬吃一下）');
ok(cellOf(boss).x === 4 && cellOf(boss).y === 4, '沒有安全格就原地撐住，不會亂衝進火裡');

// --- 自己的炸彈：免疫、不躲、也不自爆 ---
boss = bossAt(5, 5, 10);
bossBomb(5, 5, 4);
ok(P.dangerAt(5, 5) === true, '（對照）自己腳下的炸彈在 dangerAt 眼裡仍是危險格');
for (let i = 0; i < 120; i++) P.updateBoss(boss, 1 / 60);
ok(boss.hp === 10, 'BOSS 不會被自己的長程火力炸死（hp ' + boss.hp + '）');
const bc = cellOf(boss);
G.flames.length = 0;
G.flames.push({ cx: bc.x, cy: bc.y, owner: null, type: 'center', t: .46 });
P.updateBoss(boss, 1 / 60);
ok(boss.hp === 10, '自己的火焰燒不到自己（hp ' + boss.hp + '）');
G.flames.length = 0;
G.flames.push({ cx: bc.x, cy: bc.y, owner: G.players[0], type: 'center', t: .46 });
P.updateBoss(boss, 1 / 60);
ok(boss.hp === 9, '玩家的火焰才扣得到 BOSS 的血（hp ' + boss.hp + '）');
ok(boss.hitT > 0, '受擊後有 0.8 秒無敵（hitT=' + boss.hitT.toFixed(2) + '）');
P.updateBoss(boss, 1 / 60);
ok(boss.hp === 9, '同一道火不會連扣（還是 ' + boss.hp + '）');

// --- 炸彈數量上限（普通 4 / 暴走 6） ---
boss = bossAt(2, 2, 10);
const far = G.players[0];
far.x = 13 * T + T / 2; far.y = 11 * T + T / 2;
boss.bombT = 0;
let normalMax = 0;
for (let i = 0; i < 900; i++) {
  P.updateBoss(boss, 1 / 60);
  const n = G.bombs.filter(b => !b.owner).length;
  if (n > normalMax) normalMax = n;
}
const bossBombs = G.bombs.filter(b => !b.owner);
ok(normalMax <= 4, '普通狀態同時最多 4 顆炸彈（峰值 ' + normalMax + '）');
ok(normalMax >= 3, 'BOSS 會主動一直放炸彈（峰值 ' + normalMax + ' 顆）');
ok(bossBombs.concat([{ power: 2 }]).every(b => b.power === P.BOSS_POWER) && P.BOSS_POWER === 2,
  'v2.2：BOSS 火力改成 2 格（' + (bossBombs[0] ? bossBombs[0].power : '-') + '）');
ok(G.bombs.some(b => b.flying), 'BOSS 會把手上的炸彈丟出去（越牆投擲）');

// --- 暴走模式 ---
boss = bossAt(2, 2, 10);
boss.hp = 2;                            // 20% → 暴走
boss.bombT = 0;
let rageMax = 0, ragePower = 0;
for (let i = 0; i < 1200; i++) {
  P.updateBoss(boss, 1 / 60);
  const live = G.bombs.filter(b => !b.owner);
  if (live.length > rageMax) rageMax = live.length;
  live.forEach(b => { if (b.power > ragePower) ragePower = b.power; });
}
ok(rageMax > normalMax, '暴走後彈量變多（' + rageMax + ' > ' + normalMax + '）');
ok(rageMax <= 6, '暴走最多 6 顆（不會無限噴）');
ok(ragePower === 2, 'v2.2：連暴走也是 2 格（' + ragePower + '）');

// 放彈間隔：普通 1.35 秒、暴走 0.75 秒
function bombGap(rage) {
  const b = bossAt(2, 2, 10);
  if (rage) b.hp = 2;
  b.bombT = 0;
  P.updateBoss(b, 1 / 60);
  return b.bombT;
}
const gapN = bombGap(false), gapR = bombGap(true);
ok(Math.abs(gapN - 1.35) < .05, '普通狀態每 1.35 秒放一顆（' + gapN.toFixed(2) + 's）');
ok(Math.abs(gapR - .75) < .05, '暴走狀態每 0.75 秒放一顆（' + gapR.toFixed(2) + 's）');
ok(gapR < gapN, '暴走丟彈頻率幾乎快一倍');

// 暴走速度更快
const b1 = bossAt(4, 4, 10); b1.bombT = 99;
const x0 = b1.x, y0 = b1.y;
for (let i = 0; i < 20; i++) P.updateBoss(b1, 1 / 60);
const d1 = Math.hypot(b1.x - x0, b1.y - y0);
const b2 = bossAt(4, 4, 10); b2.hp = 1; b2.bombT = 99;
const x1 = b2.x, y1 = b2.y;
for (let i = 0; i < 20; i++) P.updateBoss(b2, 1 / 60);
const d2 = Math.hypot(b2.x - x1, b2.y - y1);
ok(d2 > d1, '暴走後移動更快（' + d2.toFixed(1) + ' > ' + d1.toFixed(1) + ' px）');

// 被火燒：一次扣 1 血 + 0.8 秒無敵
boss = bossAt(4, 4, 10);
G.flames.push({ cx: 4, cy: 4, owner: G.players[0], t: 1 });
P.updateBoss(boss, 1 / 60);
const hp1 = boss.hp;
P.updateBoss(boss, 1 / 60);
ok(hp1 === 9, '火焰燒 BOSS 扣 1 血（' + hp1 + '）');
ok(boss.hp === 9, '0.8 秒無敵內同一道火不會連扣（還是 ' + boss.hp + '）');
ok(boss.hitT > 0, '受擊後有短暫無敵時間（hitT=' + boss.hitT.toFixed(2) + '）');

// findLanding 越牆找落點
const land = P.findLanding(4, 4, 1, 1);
ok(land && land.x >= 4 && land.y >= 4 && land.dist >= 1, 'findLanding 找得到越牆投擲落點（' + (land && land.x + ',' + land.y) + '）');

// BOSS 還會追玩家（不是只會逃）
boss = bossAt(4, 4, 10);
boss.bombT = 99;
const p4 = G.players[0];
p4.x = 4 * T + T / 2; p4.y = 11 * T + T / 2;
const px0 = boss.x, py0 = boss.y;
for (let i = 0; i < 30; i++) P.updateBoss(boss, 1 / 60);
ok(boss.y > py0, '沒危險時 BOSS 會朝玩家靠近（y ' + py0.toFixed(0) + ' → ' + boss.y.toFixed(0) + '）');
ok(boss.walkT > 0, '移動時有走路動畫計時（手腳會動）');

// =====================================================================
console.log('\n=== 6. 線上配對只剩一個暱稱輸入 ===');
const nameInputs = (html.match(/id="netName"/g) || []).length;
ok(nameInputs === 1, '暱稱輸入框只有 1 個（現在 ' + nameInputs + ' 個）');
ok(!/id="netName2"/.test(html) && !/id="p2Name"/.test(html), '沒有第二個暱稱欄位');
ok(/placeholder="輸入暱稱（最多 8 字）"/.test(html), '暱稱欄提示文字正確');
const netScr = html.slice(html.indexOf('id="scr-online"'), html.indexOf('id="scr-game"'));
ok((netScr.match(/class="tinput"/g) || []).length === 2, '線上配對頁只有 2 個輸入框：暱稱 1 個 + 房號 1 個');
ok((netScr.match(/id="netName"/g) || []).length === 1, '其中「暱稱」只有 1 個（沒有重複的暱稱欄）');
ok(/id="netCode"/.test(netScr) && /placeholder="房號"/.test(netScr), '另一個是「房號」，不是第二個暱稱');
ok(/setPname/.test(html), '暱稱仍會寫進 setPname（配對與戰鬥顯示都會用）');

// =====================================================================
console.log('\n=== 7. 每一關有自己的地圖材質（8 種風格） ===');
const TH = P.THEMES;
ok(TH.length === 8, '共 8 個關卡主題（' + TH.length + '）');
ok(TH.every(t => typeof t.style === 'string' && t.style.length > 2), '每個主題都有 style');
ok(new Set(TH.map(t => t.style)).size === 8, '8 種風格互不重複（' + TH.map(t => t.style).join('/') + '）');
const wantStyles = ['forest', 'lava', 'ice', 'sand', 'neon', 'sea', 'sky', 'dark'];
ok(wantStyles.every(s => TH.some(t => t.style === s)), '草原／熔岩／冰雪／沙漠／霓虹／深海／天空／暗黑都在');

ok(typeof P.drawStone === 'function' && typeof P.drawCrate === 'function', '石頭與木箱各有專門畫法（可按主題分派）');
ok(/function drawWallIce/.test(html) && /function drawWallLava/.test(html) && /function drawWallSand/.test(html)
  && /function drawWallDark/.test(html) && /function drawWallNeon/.test(html), '五種牆面專屬材質函式都在');
ok(/function drawCrateIce/.test(html) && /function drawCrateLava/.test(html) && /function paintFloorStyle/.test(html), '木箱與地板也有主題材質');

// 每個風格畫出來的指令真的不同
const hashes = {};
TH.forEach(function (t) {
  G.theme = t;
  const ctx = env.mkCtx2D();
  rec.calls.length = 0;
  try {
    P.drawStone(10, 10, 32, t.hard || '#888', 1);
    P.drawCrate(10, 10, 32, t.soft || '#b84', '#753', false);
  } catch (e) { }
  hashes[t.style] = opHash(rec.calls);
});
ok(new Set(Object.values(hashes)).size >= 5, '不同主題的石頭／木箱畫法指令不同（' + new Set(Object.values(hashes)).size + ' / 8 種相異）');

// 八關都能建圖 + 渲染
const stageInfo = [];
let buildErr = null;
for (let s = 1; s <= 8; s++) {
  try {
    P.settings.hazards = 'on';
    freshSolo(s);
    G.state = 'play';
    for (let i = 0; i < 3; i++) { P.updateSolo(1 / 60); P.render(); }
    stageInfo.push({ s: s, name: G.theme.name, style: G.theme.style, T: G.T, hz: countHz() });
  } catch (e) { buildErr = e; break; }
}
function countHz() {
  let n = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) if (G.hazards[y] && G.hazards[y][x]) n++;
  return n;
}
ok(!buildErr, '8 關都能正常建圖 + 跑 3 幀' + (buildErr ? '：' + buildErr.message : ''));
ok(stageInfo.length === 8, '8 關全部通過（' + stageInfo.map(i => i.name).join('、') + '）');
ok(new Set(stageInfo.map(i => i.style)).size === 8, '8 關風格各不相同');
ok(stageInfo.every(i => i.T > 0), '每關都有可用的磚塊尺寸（相機與繪圖正常）');

// =====================================================================
console.log('\n=== 8. 10 種小怪外型 + 飛的越牆 / 走的被擋 ===');
ok(typeof P.drawEnemyArt === 'function', 'drawEnemyArt 存在（一種一種畫）');
const artHashes = {};
SP.forEach(function (sp) {
  const e = P.makeEnemy(3, 3, sp.id, 5, 1);
  artHashes[sp.id] = null;
  rec.calls.length = 0;
  try { P.drawEnemyArt(e, 100, 100, false, 0); } catch (err) { artHashes[sp.id] = 'ERR:' + err.message; }
  artHashes[sp.id] = opHash(rec.calls) + '|' + rec.calls.length;
});
const artFails = Object.entries(artHashes).filter(([k, v]) => String(v).indexOf('ERR') === 0);
ok(artFails.length === 0, '10 種小怪都能畫出來不報錯' + (artFails.length ? '（' + artFails.map(f => f[0]).join(',') + '）' : ''));
const uniqArt = new Set(Object.values(artHashes));
ok(uniqArt.size === 10, '10 種外型的繪圖指令都不同（' + uniqArt.size + ' / 10）');

// 翅膀會拍（時間不同 → 指令不同）
const bat = P.makeEnemy(3, 3, 'bat', 5, 1);
G.gameT = 0; rec.calls.length = 0; P.drawEnemyArt(bat, 100, 100, false, 0);
const wingA = JSON.stringify(rec.calls.filter(c => c[0] === 'ellipse' || c[0] === 'quadraticCurveTo'));
G.gameT = .5; rec.calls.length = 0; P.drawEnemyArt(bat, 100, 100, false, 0);
const wingB = JSON.stringify(rec.calls.filter(c => c[0] === 'ellipse' || c[0] === 'quadraticCurveTo'));
ok(wingA !== wingB, '飛怪的翅膀會拍動（不是一張靜圖）');

// 走的被牆擋
P.settings.hazards = 'off';
P.buildMap(15, 13, P.THEMES[0], { emptyRate: 1, items: 0, noHazards: true });
G.state = 'play';
G.players[0].invuln = 99;
clearBoard();
G.grid[7][7] = 1;                     // 正前方一顆炸不掉的石頭
const walker = P.makeEnemy(6, 7, 'slime', 5, 1);
walker.kind = 'wander'; walker.dirName = 'right'; walker.dirT = 99;
const wx0 = walker.x;
for (let i = 0; i < 60; i++) P.updateEnemy(walker, 1 / 60);
ok(Math.floor(walker.x / T) === 6, '地上小怪（史萊姆）撞牆就停住（cell ' + Math.floor(walker.x / T) + '）');
ok(Math.abs(walker.x - wx0) < 1, '地上小怪完全穿不過石牆（位移 ' + Math.abs(walker.x - wx0).toFixed(2) + 'px）');

const walker2 = P.makeEnemy(6, 5, 'crab', 5, 1);
walker2.dirName = 'right'; walker2.dirT = 99;
G.grid[5][7] = 1;
for (let i = 0; i < 60; i++) P.updateEnemy(walker2, 1 / 60);
ok(Math.floor(walker2.x / T) === 6, '螃蟹也一樣被牆擋（cell ' + Math.floor(walker2.x / T) + '）');

// 追人的地面小怪（鐵甲蟲 / 骷髏兵）繞得過去才走，絕不會卡進石牆
const chaser = P.makeEnemy(6, 9, 'beetle', 5, 1);
G.players[0].x = 9 * T + T / 2; G.players[0].y = 9 * T + T / 2;
G.grid[9][7] = 1;                    // 玩家與牠之間隔一道牆
let inWall = 0;
for (let i = 0; i < 300; i++) {
  P.updateEnemy(chaser, 1 / 60);
  const cc = { x: Math.floor(chaser.x / T), y: Math.floor(chaser.y / T) };
  if (G.grid[cc.y] && G.grid[cc.y][cc.x] === 1) inWall++;
}
ok(inWall === 0, '會追人的地面小怪從不卡進石牆（' + inWall + ' 幀）');
ok(Math.abs(chaser.x - (6 * T + T / 2)) > 0.5 || G.grid[9][8] === 1, '追人小怪被牆擋住後會改走別的路（不會原地抖）');

// 飛的越過牆
const flyer = P.makeEnemy(6, 7, 'bat', 5, 1);
flyer.vx = 200; flyer.vy = 0; flyer.turnT = 99;
G.grid[7][7] = 1;
for (let i = 0; i < 60; i++) P.updateEnemy(flyer, 1 / 60);
ok(flyer.x > 7 * T + T, '會飛的（蝙蝠）直接飛過石牆（x ' + flyer.x.toFixed(0) + ' > ' + (7 * T + T).toFixed(0) + '）');
ok(Math.floor(flyer.x / T) >= 8, '飛行怪已經飛到牆的另一側（cell ' + Math.floor(flyer.x / T) + '）');

const flyer2 = P.makeEnemy(6, 7, 'ghost', 5, 1);
flyer2.vy = 200; flyer2.vx = 0; flyer2.turnT = 99;
G.grid[9][6] = 1;
for (let i = 0; i < 60; i++) P.updateEnemy(flyer2, 1 / 60);
ok(flyer2.y > 9 * T + T, '幽靈也能垂直飛過牆（y ' + flyer2.y.toFixed(0) + '）');

// 飛怪會追人
const bee = P.makeEnemy(3, 3, 'bee', 7, 1);
G.players[0].x = 11 * T + T / 2; G.players[0].y = 9 * T + T / 2;
let chased = 0;
for (let i = 0; i < 240; i++) {
  const d0 = Math.hypot(G.players[0].x - bee.x, G.players[0].y - bee.y);
  P.updateFlyer(bee, 1 / 60);
  const d1 = Math.hypot(G.players[0].x - bee.x, G.players[0].y - bee.y);
  if (d1 < d0) chased++;
}
ok(chased > 40, '飛行怪會主動撲向玩家（' + chased + ' / 240 幀在靠近）');

// 邊界不會飛出去
const edge = P.makeEnemy(1, 1, 'eye', 7, 1);
edge.vx = -400; edge.vy = -400; edge.turnT = 99;
for (let i = 0; i < 120; i++) P.updateFlyer(edge, 1 / 60);
ok(edge.x >= 0 && edge.y >= 0, '飛行怪不會飛出地圖外（' + edge.x.toFixed(0) + ',' + edge.y.toFixed(0) + '）');

// =====================================================================
console.log('\n=== 9. 網頁打得開（單檔零外鏈） ===');
ok(parseFloat(P.VERSION) >= 1.9, '版本 = 1.9（' + P.VERSION + '）');
ok(/^<!DOCTYPE html>/i.test(html), '有 DOCTYPE（瀏覽器標準模式）');
ok(/<meta charset="UTF-8">/i.test(html), '有 UTF-8 charset（中文不會亂碼）');
ok(/name="viewport"/.test(html), '有 viewport meta（手機不會縮成一小塊）');
ok((html.match(/<script/g) || []).length === 1, '只有 1 個 script 區塊（單檔）');
ok(!/<script[^>]+src=/.test(html), '沒有外部 js 檔（不會 404 白畫面）');
ok(!/<link[^>]+href="http/.test(html), '沒有外部 css（不會等不到樣式）');
ok(!/src="http/.test(html), '沒有外部圖片網址（離線也能開）');
ok(!/@import/.test(html), '沒有 @import 外鏈');
ok(!/\brequire\s*\(/.test(html) && !/^\s*import\s/m.test(html), '沒有 node 專用語法（瀏覽器直接跑）');
ok(/<\/html>\s*$/.test(html.trim()), '檔案結尾完整（</html>）');
const bytes = fs.statSync(__dirname + '/../index.html').size;
ok(bytes > 900000 && bytes < 2000000, '檔案大小合理（' + (bytes / 1024).toFixed(0) + ' KB）');
ok(!!BH && !!BH.Game && !!BH.startSolo, '__BH 正常匯出（腳本沒有中途爆掉）');
ok(typeof BH.render === 'function' && typeof BH.updateSolo === 'function', '主迴圈函式都在');

// 從頭玩一次：標題 → 出發 → 倒數 → 遊戲 → 渲染
let runErr = null;
try {
  P.Screen.show('title');
  freshSolo(1);
  if (P.isPaused()) P.togglePause();
  P.beginCountdown('battle');
  ok(G.state === 'countdown', '出發前先倒數（state=' + G.state + '）');
  G.state = 'play';
  for (let i = 0; i < 260; i++) { P.updateWorld(1 / 60); P.render(); }
} catch (e) { runErr = e; }
ok(!runErr, '真的跑一場（倒數→遊戲→260 幀）不報錯' + (runErr ? '：' + runErr.message : ''));

// 三個畫面都切得過去
let navErr = null;
try {
  ['title', 'solo', 'battle', 'online', 'settings', 'game', 'title'].forEach(function (s) { P.Screen.show(s); });
} catch (e) { navErr = e; }
ok(!navErr, '標題 / 線上 / 設定 / 遊戲 互相切換不報錯');
ok(true, '-----------------------------');

console.log('');
console.log('通過 ' + pass + ' / ' + (pass + fail) + (fail ? '（' + fail + ' 項失敗）' : ''));
process.exit(fail ? 1 : 0);
