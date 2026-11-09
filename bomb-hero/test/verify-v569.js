// test/verify-v569.js —— v5.68：BOSS 與 AI 不再「左右抖動」
//   症狀：魔王自走時貼在格線上左右橫跳，看起來像壞掉；AI 角色也偶發同樣情形。
//   根因：每一幀都重算「下一格」，而斜向時橫／豎兩格分數永遠打平，
//         跨過格線的瞬間就翻面 → A↔B 無限 2 循環。
//   本支測試分成：① 機制存在 ② BOSS 不再抖 ③ 步進承諾 ④ 亂入王同一套
//                 ⑤ AI 角色不再抖 ⑥ 噪聲改座標雜湊 ⑦ 版本戳記
const fs = require('fs');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const SRC = fs.readFileSync(__dirname + '/../js/main.js', 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function sec(t) { console.log('\n=== ' + t + ' ==='); }

/* ---------------- 共用地圖／角色 ---------------- */
function flat(cols, rows) {
  G.cols = cols; G.rows = rows; G.T = 40;
  G.grid = [];
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
}
function mkPlayer(cx, cy) {
  return {
    x: (cx + .5) * G.T, y: (cy + .5) * G.T, alive: true, dead: false, ai: false,
    lives: 9, hp: 9, hpMax: 9, sHp: 9, sHpMax: 9, r: 14, facing: 'down', invuln: 9999,
    score: 0, maxBombs: 1, power: 1, speed: 1, team: 0, moving: false, walkT: 0,
    dirName: 'down', air: 0, dashT: 0, dashCd: 0, dizzy: 0, lobCd: 0, carry: 0, cart: null,
    buffs: {}, skullT: 0, beltMul: 1
  };
}
// 跑 N 幀，回傳水平方向翻面次數與總位移
function runBoss(boss, frames) {
  let flips = 0, lastVx = 0, moved = 0;
  for (let i = 0; i < frames; i++) {
    const ox = boss.x;
    try { P.updateBoss(boss, 1 / 60); } catch (e) { return { flips: flips, moved: moved, err: e.message }; }
    G.bombs.length = 0; G.flames.length = 0;
    boss.bombT = 1e9; boss.skillCd = 1e9;
    const vx = boss.x - ox;
    if (Math.abs(vx) > .01) {
      moved += Math.abs(vx);
      if (lastVx !== 0 && Math.sign(vx) !== Math.sign(lastVx)) flips++;
      lastVx = vx;
    }
  }
  return { flips: flips, moved: moved };
}

/* ---------------------------------------------------------------- ① */
sec('① 防抽筋機制存在');
ok(typeof P.bossCellMemory === 'function', 'bossCellMemory() 已匯出');
ok(typeof P.bossBackCost === 'function', 'bossBackCost() 已匯出');
ok(typeof P.bossStepHold === 'function', 'bossStepHold() 已匯出');
ok(/if \(!target\) target = bossStepHold\(e, dt, centered, canGo, dangerAtBoss\);/.test(SRC),
  'updateBoss 會先把「承諾中的那一格」走完');
ok(/d \+= bossBackCost\(e, nx, ny, T\);/.test(SRC), 'updateBoss 追人時對「回頭」加重懲罰');
ok(/const horiz = Math\.abs\(p\.x - e\.x\) >= Math\.abs\(p\.y - e\.y\);/.test(SRC),
  '追人改用「主軸優先」，不再純曼哈頓貪心');

/* 回頭懲罰的實際數值 */
flat(23, 23);
const bx0 = P.makeBoss(11, 11, 99);
bx0.prevC = { x: 10, y: 11 };
ok(P.bossBackCost(bx0, 10, 11, G.T) === G.T * 1.5, '走回上一格要多付 1.5 格距離', P.bossBackCost(bx0, 10, 11, G.T));
ok(P.bossBackCost(bx0, 12, 11, G.T) === 0, '往前走不罰', P.bossBackCost(bx0, 12, 11, G.T));

/* ---------------------------------------------------------------- ② */
sec('② BOSS 追人：8 秒內的左右翻面次數');
function bossChase(ddx, ddy) {
  flat(23, 23);
  G.players = [mkPlayer(11, 12)];
  G.players[0].x += ddx;
  G.players[0].y += ddy;
  const boss = P.makeBoss(11, 9, 99999);
  boss.skillCd = 1e9; boss.bombT = 1e9;
  return runBoss(boss, 60 * 8);
}
const c1 = bossChase(6, 3 * 40);
const c2 = bossChase(2 * 40 + 10, 2 * 40);
const c3 = bossChase(1 * 40 + 10, 1 * 40);
console.log('  （翻面數：正下方 ' + c1.flips + '／斜下方 ' + c2.flips + '／貼身 ' + c3.flips + '，舊版是 190~250）');
ok(c1.flips <= 6, '玩家在正下方 3 格：8 秒翻面 ≤ 6 次', c1.flips);
ok(c2.flips <= 6, '玩家在斜下方 2.2 格：8 秒翻面 ≤ 6 次', c2.flips);
ok(c3.flips <= 6, '玩家貼身 1.4 格：8 秒翻面 ≤ 6 次', c3.flips);
ok(c1.moved > 150, '牠仍然真的在走（不是卡住不動）', Math.round(c1.moved));

/* ---------------------------------------------------------------- ③ */
sec('③ 步進承諾：走到格心之前不改主意');
flat(23, 23);
G.players = [mkPlayer(11, 20)];        // 玩家遠遠的（無仇恨）→ 巡邏
const bp = P.makeBoss(11, 11, 99999);
bp.skillCd = 1e9; bp.bombT = 1e9;
P.updateBoss(bp, 1 / 60);
ok(!!bp.step, '開跑後就記住「要走到哪一格」', bp.step);
const stepA = bp.step;
let changedMid = 0, stepSeen = {};
for (let i = 0; i < 30; i++) {
  P.updateBoss(bp, 1 / 60);
  G.bombs.length = 0; G.flames.length = 0;
  bp.bombT = 1e9; bp.skillCd = 1e9;
  if (bp.step) stepSeen[bp.step.x + ',' + bp.step.y] = 1;
  if (bp.step && stepA && (bp.step.x !== stepA.x || bp.step.y !== stepA.y)) changedMid++;
}
ok(changedMid === 0, '半路上不會突然改成反方向（0 次中途改口）', changedMid);
// 一格 40px、速度 54px/s → 約 0.75 秒走完；跑 1.5 秒後一定走過不只一格
for (let i = 0; i < 60; i++) {
  P.updateBoss(bp, 1 / 60);
  G.bombs.length = 0; G.flames.length = 0;
  bp.bombT = 1e9; bp.skillCd = 1e9;
  if (bp.step) stepSeen[bp.step.x + ',' + bp.step.y] = 1;
}
ok(Object.keys(stepSeen).length >= 2, '走完一格之後才換下一格（真的在前進）', Object.keys(stepSeen));
// 被牆擋住／超時會作廢
const bh = P.makeBoss(11, 11, 99);
bh.step = { x: 11, y: 10 }; bh.stepT = 0;
const res = P.bossStepHold(bh, 2.0, false, function () { return true; }, function () { return false; });
ok(res === null && bh.step === null, '卡住超過 1.4 秒就放棄承諾（不會原地發呆）', res);

/* ---------------------------------------------------------------- ④ */
sec('④ 大逃殺亂入王：同一套防抽筋');
ok(/if \(!target\) target = bossStepHold\(e, dt, centered, canGo, dangerAtBoss\);/.test(SRC),
  'updateBRBoss 也走步進承諾');
ok(/d \+= bossBackCost\(e, nx, ny, T\);/.test(SRC), '亂入王追人也吃回頭懲罰');
ok(typeof P.updateBRBoss === 'function', 'updateBRBoss() 已匯出（測試用）');
flat(23, 23);
G.players = [mkPlayer(11, 13)];
const brb = P.makeBoss(11, 9, 99999);
brb.brBoss = true; brb.aggro = true;
P.BR = (typeof P.BR !== 'undefined' && P.BR) || { BOSS_AGGRO: 4 };
if (!P.BR || typeof P.BR.BOSS_AGGRO !== 'number') P.BR.BOSS_AGGRO = 4;
let brFlipX = 0, brFlipY = 0, brLastX = 0, brLastY = 0, brMoved = 0, brErr = '';
for (let i = 0; i < 60 * 8; i++) {
  const ox = brb.x, oy = brb.y;
  try { P.updateBRBoss(brb, 1 / 60); } catch (e) { brErr = e.message; break; }
  G.bombs.length = 0;
  brb.bombT = 1e9;
  const vx = brb.x - ox, vy = brb.y - oy;
  brMoved += Math.abs(vx) + Math.abs(vy);
  if (Math.abs(vx) > .01) {
    if (brLastX !== 0 && Math.sign(vx) !== Math.sign(brLastX)) brFlipX++;
    brLastX = vx;
  }
  if (Math.abs(vy) > .01) {
    if (brLastY !== 0 && Math.sign(vy) !== Math.sign(brLastY)) brFlipY++;
    brLastY = vy;
  }
}
const brFlip = brFlipX + brFlipY;
ok(brFlip <= 6, '亂入王追人 8 秒翻面 ≤ 6 次', brFlip);
ok(brMoved > 100, '亂入王仍然真的在走' + (brErr ? '（例外：' + brErr + '）' : ''), Math.round(brMoved));

/* ---------------------------------------------------------------- ⑤ */
sec('⑤ AI 角色：不再在兩格之間左右抖');
function aiRun(useBR) {
  flat(27, 21);
  G.players = [];
  for (let i = 0; i < 5; i++) {
    const p = mkPlayer(3 + i * 5, 6 + (i % 2) * 8);
    p.ai = true; p.buffs = {}; p.tick = 0;
    G.players.push(p);
  }
  P.BR_AI.on = !!useBR;
  const OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
  const last = new Array(5).fill(null);
  let flips = 0, moved = 0;
  for (let i = 0; i < 60 * 12; i++) {
    for (let k = 0; k < 5; k++) {
      const p = G.players[k];
      if (!p.alive) continue;
      const ox = p.x, oy = p.y;
      try { P.controlAI(p, 1 / 60); } catch (e) { continue; }
      if (p.aiDir && last[k] && OPP[last[k]] === p.aiDir) flips++;
      if (p.aiDir) last[k] = p.aiDir;
      moved += Math.abs(p.x - ox) + Math.abs(p.y - oy);
    }
  }
  P.BR_AI.on = false;
  return { flips: flips, moved: moved };
}
const a1 = aiRun(false);
const a2 = aiRun(true);
console.log('  （12 秒 5 個 AI：對戰 ' + a1.flips + ' 次／大逃殺 ' + a2.flips + ' 次，舊版是 1100~1400 次）');
ok(a1.flips <= 12, '對戰 AI：12 秒內「立刻反向」≤ 12 次', a1.flips);
ok(a2.flips <= 12, '大逃殺 AI：12 秒內「立刻反向」≤ 12 次', a2.flips);
ok(a1.moved > 3000 && a2.moved > 3000, 'AI 仍然真的在場上跑（不是站著不動）',
  [Math.round(a1.moved), Math.round(a2.moved)]);
ok(/let opts = optsAll;/.test(SRC) && /cx \+ d\.x === p\.prevC\.x && cy \+ d\.y === p\.prevC\.y/.test(SRC),
  'controlAI 有「禁止立刻走回上一格」的過濾');
ok(/if \(p\.prevC && nx === p\.prevC\.x && ny === p\.prevC\.y\) v -= 2\.4;/.test(SRC),
  'aiBrChoose 對回頭那一格重罰');

/* ---------------------------------------------------------------- ⑥ */
sec('⑥ 噪聲改成座標雜湊（同一個決策點永遠同一個值）');
ok(typeof P.aiCellNoise === 'function', 'aiCellNoise() 已匯出');
const n1 = P.aiCellNoise(7, 9), n2 = P.aiCellNoise(7, 9);
ok(n1 === n2, '同一格兩次取值相同（不會自我打架）', n1);
ok(Math.abs(n1) <= .25, '噪聲落在 ±0.25 之內', n1);
const seen = {};
let distinct = 0;
for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
  const v = P.aiCellNoise(x, y);
  if (!(v in seen)) { seen[v] = 1; distinct++; }
}
ok(distinct >= 20, '相鄰格子的噪聲不一樣（不會整片同值）', distinct);
ok(!/Math\.random\(\) \* \.5 - \.25/.test(SRC), 'aiBrChoose 裡不再有「每方向各自 random」');
ok(!/Math\.random\(\) \* \.4/.test(SRC), 'aiBrLeastCrowded 裡不再有「每方向各自 random」');

/* ---------------------------------------------------------------- ⑦ */
sec('⑦ 版本戳記');
const verEl = fs.readFileSync(__dirname + '/../index.html', 'utf8').match(/id="verTxt">([\d.]+)</);
const cur = verEl ? parseFloat(verEl[1]) : 0;
ok(cur >= 5.68, '版本至少 5.68', cur);
const logSrc = fs.readFileSync(__dirname + '/../js/version-log.js', 'utf8');
ok(/v: '5\.68'/.test(logSrc), '更新紀錄有 5.68 條目');
ok(/v: '5\.67'[^]*?now: false/.test(logSrc), '上一版 5.67 已標成 now:false');
const sw = fs.readFileSync(__dirname + '/../sw.js', 'utf8');
ok(/SW_VERSION = 'v5\.68\.0'/.test(sw), 'SW 版號 v5.68.0');

console.log('\n========================================');
console.log('v5.68 BOSS／AI 防抖動：' + pass + ' 通過 / ' + fail + ' 失敗');
if (fail) process.exitCode = 1;
