// test/v436-kits.js — v4.36：48 隻小怪的個別習性／技能／元素特效＋每關 12 隻上限＋龍吐火
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
const env = makeEnv();
const P = env.BH, G = P.Game;

function freshSolo(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.settings.soloTime = 300;
  P.startSolo(stage || 1, false);
  G.state = 'play';
  const p = G.players[0];
  if (p) { p.invuln = 0; p.alive = true; }
  return p;
}
function openCell() {
  for (let y = 2; y < G.rows - 2; y++)
    for (let x = 3; x < G.cols - 4; x++)
      if (G.grid[y][x] === 0 && G.grid[y][x + 1] === 0 && G.grid[y][x + 2] === 0 && G.grid[y][x + 3] === 0) return [x, y];
  return [3, 3];
}
function put(o, cx, cy) { o.x = cx * G.T + G.T / 2; o.y = cy * G.T + G.T / 2; }
// 把玩家放在「不會躲進樹叢」的格子（躲在樹叢裡的小怪看不到 → 技能不會發動）
function placeVisible(p, x0, y) {
  for (let x = x0; x < G.cols - 2; x++) {
    put(p, x, y);
    if (!P.playerHiding(p)) return x;
  }
  return x0;
}

// ==================================================================
console.log('\n=== 1. 48 隻都有 FOE_KIT（習性／技能／元素） ===');
const ids = P.ENEMY_SPECIES.map(s => s.id);
ok(ids.length === 48, '物種表 48 隻', ids.length);
let missing = [];
ids.forEach(id => {
  const k = P.FOE_KIT[id];
  if (!k) { missing.push(id); return; }
  if (!k.habit) missing.push(id + '(無習性)');
  if (k.fx && !P.FOE_FX_NAME[k.fx]) missing.push(id + '(fx錯)');
});
ok(missing.length === 0, '每一隻都有習性＋合法元素', missing.join(','));
const fxUsed = {};
ids.forEach(id => { const k = P.FOE_KIT[id]; if (k && k.fx) fxUsed[k.fx] = (fxUsed[k.fx] | 0) + 1; });
ok(Object.keys(fxUsed).length >= 8, '至少 8 種元素特效有被用到', JSON.stringify(fxUsed));
const skillUsed = {};
ids.forEach(id => { const k = P.FOE_KIT[id]; if (k && k.skill) skillUsed[k.skill] = (skillUsed[k.skill] | 0) + 1; });
ok(Object.keys(skillUsed).length >= 10, '至少 10 種不同技能', JSON.stringify(skillUsed));

// ==================================================================
console.log('\n=== 2. 圖鑑文字有寫出習性＋特殊技能 ===');
let noText = [];
ids.forEach(id => {
  const d = P.foeDesc(id);
  if (!d || d.indexOf('習性') < 0) noText.push(id);
});
ok(noText.length === 0, '48 隻圖鑑都寫了「習性」', noText.join(','));
ok(P.foeDesc('slime').indexOf('分裂') > 0, '史萊姆圖鑑寫了分裂');
ok(P.foeDesc('frog').indexOf('水彈') > 0, '青蛙圖鑑寫了水彈');
ok(P.foeDesc('snowball').indexOf('冰霜') > 0, '雪球怪圖鑑寫了冰霜');

// ==================================================================
console.log('\n=== 3. 每關小怪 ≤ 12 隻，且依難度成長 ===');
P.settings.size = 'M';
const counts = [];
for (const st of [1, 4, 8, 12, 16, 20, 24, 28, 32]) {
  P.startSolo(st, false);
  counts.push([st, G.enemies.length]);
}
ok(counts.every(c => c[1] <= P.FOE_MAX_LIVE), '每一關都 ≤ 12 隻', JSON.stringify(counts));
ok(counts[0][1] < counts[counts.length - 1][1], '後段關卡比第一關多', JSON.stringify(counts.map(c => c[1])));
P.settings.size = 'L';
P.startSolo(32, false);
ok(G.enemies.length <= 12, '大張地圖也不會超過 12 隻', G.enemies.length);
P.settings.size = 'M';

// ==================================================================
console.log('\n=== 4. 龍吐火：2 格扇形（v4.38 調回 2 格）、斜一格也燒得到 ===');
let p = freshSolo(1);
const [cx, cy] = openCell();
put(p, cx, cy);
G.flames.length = 0; G.bombs.length = 0;
p.dino = true; p.redDragon = false; p.fireCd = 0; p.facing = 'right';
P.fireBreath(p);
const straight = G.flames.filter(f => f.cy === cy && f.cx > cx).map(f => f.cx - cx).sort();
ok(straight.join(',') === '1,2', '正前方燒 2 格（v4.38 把範圍調回 DINO_FIRE_RANGE=' + P.DINO_FIRE_RANGE + '）', straight.join(','));
const side = G.flames.filter(f => f.cy !== cy).length;
ok(side >= 2, '左右各溢一格（扇形）', side);
ok(G.flames.some(f => f.src === 'dino'), '火焰標記為坐騎火（不會燒到自己）');
// 斜一格也要判定命中
p.invuln = 0;
const f0 = G.flames[0];
ok(P.flameCovers(f0, f0.cx * G.T + G.T * .58, f0.cy * G.T + G.T / 2, G.T) === true, '站在格子邊緣 0.58 格也算命中');

// ==================================================================
console.log('\n=== 5. AI 走路時會面向移動方向 ===');
p = freshSolo(1);
G.players.length = 2;
const ai = P.makePlayer(1, 0, { dirs: () => [], action: () => false, actionHeld: () => false }, { px: 0, py: 0 });
ai.ai = true; ai.alive = true; ai.invuln = 0;
G.players.push(ai);
const [ax, ay] = openCell();
put(ai, ax, ay);
ai.facing = 'down';
G.players[0].x = -9999;          // 玩家移開，AI 才會自由亂走
let seen = {};
for (let i = 0; i < 240; i++) {
  P.controlAI(ai, 1 / 60);
  seen[ai.facing] = 1;
  if (ai.x === ax * G.T + G.T / 2 && ai.y === ay * G.T + G.T / 2) put(ai, ax, ay);
}
const dirsSeen = Object.keys(seen);
ok(dirsSeen.length >= 2, 'AI 的面向會跟著換（不再固定一個方向）', dirsSeen.join(','));

// ==================================================================
console.log('\n=== 6. 八種新技能實際會做事 ===');
p = freshSolo(1);
G.enemies.length = 0; G.bolts = [];
const [sx, sy] = openCell();

// 6-1 分裂
const sl = P.makeEnemy(sx, sy, 'slime', 1, 1);
sl.dead = true;
G.enemies.push(sl);
const before = G.enemies.length;
P.foeOnDeath(sl);
ok(G.enemies.length > before, '史萊姆死亡 → 分裂出小史萊姆', (G.enemies.length - before));

// 6-2 吐元素彈
p = freshSolo(1);
G.enemies.length = 0; G.bolts = [];
const fr = P.makeEnemy(sx, sy, 'frog', 1, 1);
const fx1 = placeVisible(p, sx + 2, sy);
fr.aggro = true; fr.skCd = 0;
G.enemies.push(fr);
// v4.40：不再看到人就射 → 先集氣（全身抖動＋落點預告），時間到才真的吐出去
P.enemySkillTick(fr, 0.016);
ok(G.bolts.length === 0 && fr.castT > 0,
  '青蛙先集氣、還沒射（castT=' + (fr.castT || 0).toFixed(2) + '）', G.bolts.length);
ok(fr.castT === P.FOE_CAST_WINDUP, '集氣時間 = FOE_CAST_WINDUP（' + P.FOE_CAST_WINDUP + 's）');
for (let i = 0; i < 80 && G.bolts.length === 0; i++) P.enemySkillTick(fr, 1 / 60);
ok(G.bolts.length === 1, '集氣結束 → 青蛙吐出水彈', G.bolts.length);
ok(G.bolts[0] && G.bolts[0].cx === fx1, '水彈瞄準玩家那一格', G.bolts[0] && G.bolts[0].cx);
ok(G.bolts[0] && Math.abs(G.bolts[0].dur - P.BOLT_TRAVEL) < 1e-6,
  '彈體飛行時間放慢到 ' + (G.bolts[0] ? G.bolts[0].dur : '-') + 's（原本 .55 → 速度砍半）');

// 6-3 水彈命中會死人
const hpBefore = p.lives;
for (let i = 0; i < 120; i++) P.updateBolts(1 / 60);
ok(p.alive === false || p.lives < hpBefore, '水彈打到玩家會扣命', p.lives);

// 6-4 衝撞
p = freshSolo(1);
G.enemies.length = 0; G.bolts = [];
const bn = P.makeEnemy(sx, sy, 'bunny', 1, 1);
placeVisible(p, sx + 3, sy);
bn.aggro = true; bn.skCd = 0; bn.dashT = 0;
G.enemies.push(bn);
P.enemySkillTick(bn, 0.016);
ok(bn.dashT > 0 && bn.dirName === 'right', '蹦蹦兔鎖定後直線撲撞', bn.dirName + '/' + bn.dashT.toFixed(2));

// 6-5 鑽地／瞬移
p = freshSolo(1);
G.enemies.length = 0;
const cw = P.makeEnemy(sx, sy, 'cater', 1, 1);
placeVisible(p, sx + 2, sy);
cw.aggro = true; cw.skCd = 0;
G.enemies.push(cw);
P.enemySkillTick(cw, 0.016);
ok(cw.blinkT > 0, '毛毛蟲進入鑽地狀態', cw.blinkT);
const bx0 = cw.x, by0 = cw.y;
for (let i = 0; i < 60; i++) P.updateEnemy(cw, 1 / 60);
ok(cw.blinkT === 0 && (cw.x !== bx0 || cw.y !== by0), '鑽地結束後從別的位置冒出來');

// 6-6 吹風推人
p = freshSolo(1);
G.enemies.length = 0;
const se = P.makeEnemy(sx, sy, 'seal', 1, 1);
placeVisible(p, sx + 1, sy);
se.aggro = true; se.skCd = 0;
G.enemies.push(se);
const px0 = p.x;
P.enemySkillTick(se, 0.016);
ok(p.x > px0, '小海豹吹風把玩家往後推', Math.round(p.x - px0));

// 6-7 催眠
p = freshSolo(1);
G.enemies.length = 0;
const ey = P.makeEnemy(sx, sy, 'eye', 1, 1);
placeVisible(p, sx + 1, sy);
ey.aggro = true; ey.skCd = 0;
G.enemies.push(ey);
P.enemySkillTick(ey, 0.016);
ok((p.dizzy || 0) > 0, '眼球怪的目光讓玩家頭暈', p.dizzy);

// 6-8 召喚（且不超過 12 隻）
p = freshSolo(1);
G.enemies.length = 0;
const nb = P.makeEnemy(sx, sy, 'neonbot', 1, 1);
nb.aggro = true; nb.skCd = 0;
G.enemies.push(nb);
const n0 = G.enemies.length;
P.enemySkillTick(nb, 0.016);
ok(G.enemies.length > n0, '霓虹機器人召喚小機兵', G.enemies.length - n0);
for (let i = 0; i < 40; i++) {
  nb.skCd = 0;
  P.enemySkillTick(nb, 0.016);
}
ok(G.enemies.length <= P.FOE_MAX_LIVE, '召喚不會讓場上超過 12 隻', G.enemies.length);

// ==================================================================
console.log('\n=== 7. 豬／青蛙／小雞 縮小 5% ===');
ok(P.heroSizeK('pig') === .95 && P.heroSizeK('frog') === .95 && P.heroSizeK('chick') === .95, '三隻都是 0.95');
ok(P.heroSizeK('rabbit') === 1, '其他角色不受影響');

// ==================================================================
console.log('\n=== 8. 渲染不會爆（元素特效／元素彈） ===');
p = freshSolo(1);
G.enemies.length = 0;
['slime', 'frog', 'crystal', 'thunder', 'imp', 'seal', 'rockling', 'jelly'].forEach((t, i) => {
  const e = P.makeEnemy(3 + i, 4, t, 1, 1);
  e.aggro = true;
  G.enemies.push(e);
});
let err = null;
try {
  P.drawEnemy(G.enemies[0], G.T);
  G.bolts = [{ sx: 100, sy: 100, tx: 200, ty: 200, cx: 3, cy: 3, t: .2, dur: P.BOLT_TRAVEL, kind: 'fire', owner: null }];
  // 集氣特效也要能畫（新函式不能拋錯）
  G.enemies[0].castT = P.FOE_CAST_WINDUP * .5;
  G.enemies[0].castX = 3; G.enemies[0].castY = 4;
  P.render();
} catch (e) { err = e; }
ok(!err, '元素特效與元素彈繪製不拋錯', err && err.message);

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v4.36 小怪個性化：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
