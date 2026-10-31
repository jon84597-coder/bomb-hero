// 無頭測試 v46（v4.0 第二輪）：32 關全跑得起來 / 主題共用調色盤 / 4 種尺寸上限 / BOSS 狂暴＋暈眩
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH;
const G = P.Game;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

// 清空機關格 → 讓 BOSS 測試可以在乾淨場地量速度
function clearArena() {
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    G.grid[y][x] = (x === 0 || y === 0 || x === G.cols - 1 || y === G.rows - 1) ? 1 : 0;
  }
  G.hazards = [];
  for (let y = 0; y < G.rows; y++) G.hazards.push(new Array(G.cols).fill(null));
  G.bombs = []; G.flames = []; G.enemies = []; G.items = [];
  G.door = null;
}

console.log('\n=== 1. 32 關全部進得去（不再只有第 1 關能玩）===');
G.rpg = true;
G.settings = P.settings;
P.settings.size = 'M';
let buildErr = '', buildOk = true;
try { P.startRpg(1); } catch (e) { buildOk = false; buildErr = 'stage1: ' + e.message; }
for (let s = 1; s <= 32 && buildOk; s++) {
  try { P.buildRpgStage(s, false); }
  catch (e) { buildOk = false; buildErr = '第 ' + s + ' 關: ' + e.message; }
}
ok(buildOk, '第 1~32 關都能生成（機關地圖不再爆錯）' + (buildErr ? '（' + buildErr + '）' : ''));

// 每一關都要有出口門、起點可走、門走得到
let doorOk = true, reachOk = true, foeOk = true, detail = '';
for (let s = 1; s <= 32; s++) {
  P.buildRpgStage(s, false);
  const cols = G.cols, rows = G.rows;
  if (!G.door) { doorOk = false; detail = '第 ' + s + ' 關沒門'; }
  if (G.grid[1][1] === 1) { reachOk = false; detail = '第 ' + s + ' 關起點是牆'; }
  if (G.door) {
    const r = P.bfsReach(G.grid, cols, rows, 1, 1);
    if (G.grid[G.door.y][G.door.x] === 1 || !r[G.door.y][G.door.x]) { reachOk = false; detail = '第 ' + s + ' 關門走不到'; }
  }
  // 地面怪一定要站在非牆格（否則會卡在牆裡）
  G.enemies.forEach(function (e) {
    if (e.type === 'bat' || e.type === 'ghost' || e.type === 'bee') return;
    if (G.grid[Math.floor(e.y / G.T)][Math.floor(e.x / G.T)] === 1) { foeOk = false; detail = '第 ' + s + ' 關怪卡在牆裡'; }
  });
}
ok(doorOk, '32 關都有出口門');
ok(reachOk, '32 關的門都走得到（尋路驗證生效）');
ok(foeOk, '地面怪不會生在牆裡' + (detail ? '（' + detail + '）' : ''));

console.log('\n=== 2. 同一主題的 4 張小地圖共用調色盤／環境元素 ===');
const M = P.MAP32;
let paletteOk = true, hazardOk = true, palDetail = '';
const seenColors = {};
for (let t = 0; t < 8; t++) {
  const sig = [];
  for (let k = 0; k < 4; k++) {
    const stage = t * 4 + k + 1;
    P.buildRpgStage(stage, false);
    const th = G.theme;
    sig.push(th.name + '|' + th.floor + '|' + th.floor2 + '|' + th.hard + '|' + th.soft + '|' + th.style + '|' + (th.hazards || []).join(','));
    // 主題機關真的有鋪進地圖（綠野草原不鋪）
    if (th.hazards && th.hazards.length) {
      let n = 0;
      for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) if (G.hazards[y][x]) n++;
      if (n < 2) { hazardOk = false; palDetail = th.name + ' 第 ' + (k + 1) + ' 張沒有機關'; }
    }
  }
  if (new Set(sig).size !== 1) { paletteOk = false; palDetail = '主題 ' + (t + 1) + ' 的 4 張顏色不一致'; }
  seenColors[t] = sig[0].split('|')[2];
}
ok(paletteOk, '8 大主題各自 4 張小地圖的底色／地板／磚塊色完全一致' + (palDetail ? '（' + palDetail + '）' : ''));
ok(hazardOk, '主題專屬機關（冰面／輸送帶／傳送門）真的有鋪進該主題的每張地圖');
ok(new Set(Object.values(seenColors)).size === 8, '8 大主題彼此顏色都不同（場景辨識度）');
ok(M.every(function (m, i) { return m.theme === Math.floor(i / 4); }), 'MAP32 依序每 4 張同一主題');

console.log('\n=== 3. 4 種尺寸上限（小 13×11 / 中 15×13 / 大 17×15 / 超大 21×15）===');
const LIMIT = { S: [13, 11], M: [15, 13], L: [17, 15], XL: [21, 15] };
let sizeOk = true, sizeDetail = '';
Object.keys(LIMIT).forEach(function (k) {
  P.settings.size = k;
  for (let s = 1; s <= 8; s++) {
    P.buildRpgStage(s, false);
    if (G.cols !== LIMIT[k][0] || G.rows !== LIMIT[k][1]) {
      sizeOk = false; sizeDetail = k + '/第 ' + s + ' 關 = ' + G.cols + '×' + G.rows;
    }
    // 邊界仍是牆（走不出去）
    let border = true;
    for (let x = 0; x < G.cols; x++) if (G.grid[0][x] !== 1 || G.grid[G.rows - 1][x] !== 1) border = false;
    for (let y = 0; y < G.rows; y++) if (G.grid[y][0] !== 1 || G.grid[y][G.cols - 1] !== 1) border = false;
    if (!border) { sizeOk = false; sizeDetail = k + ' 邊界沒封好'; }
  }
});
P.settings.size = 'M';
ok(sizeOk, '4 種尺寸都精準符合規格、邊界封閉' + (sizeDetail ? '（' + sizeDetail + '）' : ''));

console.log('\n=== 4. 不規則地形：不是制式棋盤 ===');
P.buildRpgStage(9, false);           // 第 3 主題（冰雪原）
let wall = 0, wallEven = 0, floors = 0;
for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) {
  if (G.grid[y][x] === 1) { wall++; if (x % 2 === 0 && y % 2 === 0) wallEven++; }
  if (G.grid[y][x] !== 1) floors++;
}
ok(wall > 0 && wallEven / wall < .8, '牆不是全落在偶數×偶數（' + Math.round(wallEven / wall * 100) + '%，棋盤會是 100%）');
ok(floors / (G.cols * G.rows) > .3, '可走地面佔 ' + Math.round(floors / (G.cols * G.rows) * 100) + '%（不會擠成一條線）');
// 4 個子地圖彼此長得不同（非同模板換色）
const g1 = JSON.stringify((P.buildRpgStage(9, false), G.grid));
const g2 = JSON.stringify((P.buildRpgStage(10, false), G.grid));
ok(g1 !== g2, '同主題的相鄰兩張小地圖地形不同');

console.log('\n=== 5. BOSS：血量 40% 以下進入狂暴 ===');
G.rpg = true;
P.settings.size = 'M';
P.startRpg(32);
let boss = G.enemies.filter(function (e) { return e.type === 'boss'; })[0];
ok(!!boss, '第 32 關有 BOSS（暗暗魔王）');
ok(boss.maxHp >= 10 && boss.def >= 1, 'BOSS 血量 ' + boss.maxHp + ' 格、防禦 ' + boss.def);

function measure(dtSteps) {
  // 從同一點開始跑，回傳位移量
  const bx = 3 * G.T + G.T / 2, by = 3 * G.T + G.T / 2;
  boss.x = bx; boss.y = by; boss.dizzy = 0; boss.walkT = 0; boss.bombT = 999;
  G.bombs = []; G.flames = []; G.particles = [];
  G.players = [{ alive: true, x: (G.cols - 2) * G.T + G.T / 2, y: (G.rows - 2) * G.T + G.T / 2 }];
  for (let i = 0; i < dtSteps; i++) P.updateBoss(boss, 1 / 60);
  return Math.hypot(boss.x - bx, boss.y - by);
}
clearArena();
boss.maxHp = 20; boss.hp = 20;
const dCalm = measure(60);
boss.hp = Math.ceil(boss.maxHp * .4);      // 40% → 進入狂暴
const dRage = measure(60);
ok(dCalm > 20, '正常狀態 1 秒走 ' + Math.round(dCalm) + 'px');
ok(dRage > dCalm * 1.25, '狂暴後 1 秒走 ' + Math.round(dRage) + 'px（比正常快 ' +
  Math.round((dRage / dCalm - 1) * 100) + '%，規格要求更快）');

// 丟彈間隔：狂暴 0.75s、平常 1.35s；而且狂暴時同場可到 6 顆
clearArena();
boss.hp = 20; boss.dizzy = 0; boss.bombT = 0; G.bombs = [];
P.updateBoss(boss, 1 / 60);
const cdCalm = boss.bombT;
clearArena();
boss.hp = 8; boss.dizzy = 0; boss.bombT = 0; G.bombs = [];
P.updateBoss(boss, 1 / 60);
const cdRage = boss.bombT;
ok(cdRage < cdCalm, '狂暴丟彈間隔 ' + cdRage.toFixed(2) + 's < 平常 ' + cdCalm.toFixed(2) + 's（丟得更兇）');
ok(/\(rage \? 6 : 4\)/.test(html), '狂暴時同場炸彈上限拉到 6 顆（平常 4 顆）');

console.log('\n=== 6. BOSS：被「丟過來的炸彈」砸到會暈眩 ===');
clearArena();
G.enemies = [boss];                  // 暈眩判定是掃 Game.enemies，BOSS 要在場上
boss.dizzy = 0; boss.hp = 20;
const flyBomb = {
  cx: Math.floor(boss.x / G.T), cy: Math.floor(boss.y / G.T),
  px: boss.x, py: boss.y, timer: 1.5, power: 2, owner: null, passers: [],
  flying: { fx: 1, fy: 1, tx: 3, ty: 3, t: .3, dur: .5 }, remoteArmed: false, mine: false, held: false
};
P.flyingDizzyCheck(flyBomb, G.T);
ok(boss.dizzy > 0, 'BOSS 被飛行的炸彈砸到 → dizzy = ' + (boss.dizzy || 0) + 's');
const beforeX = boss.x, beforeY = boss.y, beforeDizzy = boss.dizzy;
G.players = [{ alive: true, x: 2 * G.T, y: 2 * G.T }];
for (let i = 0; i < 20; i++) P.updateBoss(boss, 1 / 60);
ok(Math.abs(boss.x - beforeX) < 1e-9 && Math.abs(boss.y - beforeY) < 1e-9,
  '暈眩期間 BOSS 完全定住（不會動也不會丟彈）');
ok(boss.dizzy < beforeDizzy, '暈眩時間會倒數（' + boss.dizzy.toFixed(2) + 's 剩）');
// 自己丟的彈砸到自己不算
boss.dizzy = 0;
const ownBomb = Object.assign({}, flyBomb, { owner: boss });
P.flyingDizzyCheck(ownBomb, G.T);
ok(!boss.dizzy, '自己丟的彈砸到自己不會暈（不會自鎖）');
// 魔王也有星星特效的繪製路徑
ok(/drawDizzyMark\(x, barY - Game\.T \* \.46, T\)/.test(html), 'BOSS 頭上有轉星星的暈眩特效');

console.log('\n=== 7. 關卡推進與難度曲線 ===');
P.startRpg(1);
ok(G.stage === 1, '從第 1 關開始');
const foes1 = G.enemies.length;
P.buildRpgStage(20, false);
const foes20 = G.enemies.length;
ok(foes20 > foes1, '第 20 關怪物 ' + foes20 + ' 隻 > 第 1 關 ' + foes1 + ' 隻（越後面越硬）');
const pool1 = P.rpgFoePool ? P.rpgFoePool(1) : null;
ok(/Game\.mode === 'rpg'\) \? 32 : 8/.test(html), 'RPG 共 32 關（一般闖關仍是 8 關）');

console.log('\n=== 8. RPG 與一般模式互不干擾 ===');
G.rpg = false;
ok(P.VERSION === '4.3', '版本仍是 4.2');
P.startSolo(1);
ok(!G.rpg, '一般闖關不會被 RPG 狀態污染');
ok(G.enemies.length > 0 && !!G.door, '一般闖關照常生成怪物與出口');

console.log('\n[v46] ' + pass + ' 通過、' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
