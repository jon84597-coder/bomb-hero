// v4.68 驗證：小怪遠程索敵距離
//   ① 吐彈怪（spit）不再隔 5 格點名：察覺 3.2 格、集氣中 4.4 格、追丟就收手
//   ② 集氣後半段鎖死落點（玩家走開就不會被砸到）
//   ③ 直線衝撞 6 格 → 3.6 格
//   ④ 鑽地／瞬移的索敵 8 格 → 4.2 格（落點仍要離玩家 2 格以上）
//   node test/verify-v468.js
const { makeEnv } = require('./_sandbox');
const fs = require('fs');
const path = require('path');

const src = require('./_sandbox').rawHtml;
const env = makeEnv();
const P = env.BH, G = P.Game;
const S = [], F = [];
function ok(cond, msg, extra) {
  (cond ? S : F).push(msg);
  console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
}
function head(t) { console.log('\n' + t); }
const vm = src.match(/const VERSION = '([\d.]+)';/);

// 乾淨的測試場地：整片可走、沒有躲藏物、沒有其他怪
function arena() {
  P.clearMapTest();
  P.settings.size = 'M';
  P.startSolo(1, false);
  G.state = 'play';
  G.stage = 9;                          // v5.82：招式只在前 3 關關閉；這支測的是技能 AI 本身

  G.hides = [];
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.grid[y][x] = (y === 0 || x === 0) ? 1 : 0;
  G.enemies.length = 0;
  G.bolts = [];
  G.bombs.length = 0;
  G.flames.length = 0;
  const me = G.players[0];
  me.alive = true; me.hp = 1; me.invuln = 0; me.x = 3.5 * G.T; me.y = 3.5 * G.T;
  return me;
}
function foeAt(cx, cy, type) {
  const e = P.makeEnemy(cx, cy, type || 'frog', 0, 1);
  e.aggro = true; e.skCd = 0; e.castT = 0;
  G.enemies = [e];
  return e;
}
function run(e, frames) {
  for (let i = 0; i < frames; i++) P.enemySkillTick(e, 1 / 60);
}

// ================================================================
head('1. 源碼檢查');
{
  ok(vm && parseFloat(vm[1]) >= 4.68, 'VERSION >= 4.68（目前 ' + (vm && vm[1]) + '，不寫死版號）');
  ok(/const FOE_SIGHT_TILES = 3\.2;/.test(src), '遠程察覺距離常數 = 3.2 格');
  ok(/const FOE_CAST_LOCK_K = \.55;/.test(src), '集氣鎖點門檻 = 55%');
  ok(/nearestPlayerTo\(e, T \* FOE_SIGHT_TILES\)/.test(src), '吐彈起手用 FOE_SIGHT_TILES');
  ok(!/nearestPlayerTo\(e, T \* 6\.5\)/.test(src), '吐彈不再是 6.5 格');
  ok(!/nearestPlayerTo\(e, T \* 8\)/.test(src), '沒有任何地方還在用 8 格索敵');
  ok(/nearestPlayerTo\(e, T \* \(FOE_SIGHT_TILES \+ 1\.2\)\)/.test(src), '集氣中追蹤上限 = 射程 +1.2 格');
  ok(/nearestPlayerTo\(e, T \* 3\.6\)/.test(src), '直線衝撞起手 3.6 格');
  ok(/nearestPlayerTo\(e, T \* \(FOE_SIGHT_TILES \+ 1\.0\)\)/.test(src), '鑽地索敵 = 射程 +1 格');
  ok(/if \(!tgt2\) \{ e\.castT = 0;(?: e\.castSkill = '';)? e\.skCd = 1\.5; return; \}/.test(src), '集氣中追丟 → 收手並進冷卻');
  ok(/const AGGRO_TILES = 2;/.test(src), '一般小怪的仇恨範圍仍是 2 格（移動手感不變）');
}

// ================================================================
head('2. 吐彈：5 格外不再點名');
{
  const me = arena();
  const T = G.T;
  const e = foeAt(3 + 5, 3);                       // 玩家 5 格外的同一排
  run(e, 240);                                     // 4 秒
  ok(e.castT === 0, '5 格外跑 4 秒不會集氣', { castT: e.castT, dist: +((e.x - me.x) / T).toFixed(2) });
  ok((G.bolts || []).length === 0, '也不會吐出任何彈');

  // 退到 3.2 格邊界外一點
  const e2 = foeAt(3 + 4, 3);
  run(e2, 240);
  ok(e2.castT === 0 && (G.bolts || []).length === 0, '4 格外也不打');

  // 進到 3 格內 → 會開始集氣
  G.bolts = [];
  const e3 = foeAt(3 + 3, 3);
  run(e3, 6);
  ok(e3.castT > 0, '3 格內會開始集氣', { castT: +(e3.castT || 0).toFixed(2) });
  ok(e3.castX === 3 && e3.castY === 3, '落點就是玩家站的那格', { castX: e3.castX, castY: e3.castY });
}

// ================================================================
head('3. 集氣中：追丟收手、後半段鎖點');
{
  const me = arena();
  const T = G.T;

  // (a) 追丟：集氣到一半玩家跑到 6 格外
  const e = foeAt(3 + 3, 3);
  run(e, 12);
  ok(e.castT > 0, '先把集氣跑起來', { castT: +(e.castT || 0).toFixed(2) });
  me.x = (3 + 9 + .5) * T;
  P.enemySkillTick(e, 1 / 60);
  ok(e.castT === 0, '玩家跑出追蹤範圍 → 集氣直接取消', { castT: e.castT });
  ok(e.skCd > 1, '取消後進 1.5 秒冷卻（不會立刻重來）', { skCd: +(e.skCd || 0).toFixed(2) });
  ok((G.bolts || []).length === 0, '也沒有留下彈');

  // (b) 前半段：落點會跟著玩家跑
  const me2 = arena();
  const e2 = foeAt(3 + 3, 3);
  e2.castT = P.FOE_CAST_WINDUP - .02;          // k≈0.02（前段）
  me2.y = 3.5 * G.T;
  P.enemySkillTick(e2, 1 / 60);                    // castT 0.88 → k=0.037（前段）
  me2.x = (3 + 2 + .5) * G.T;                      // 玩家橫向換一格（還在追蹤範圍）
  P.enemySkillTick(e2, 1 / 60);
  ok(e2.castX === 5, '集氣前段落點會跟著玩家（看得出來牠在瞄你）', { castX: e2.castX, castY: e2.castY });

  // (c) 後半段：落點鎖死
  const me3 = arena();
  const e3 = foeAt(3 + 3, 3);
  e3.castT = .30;                                  // k = 1 - .30/.9 = .667 > .55
  e3.castX = 3; e3.castY = 3;                      // 起手時鎖定的落點（玩家原本站的那格）
  P.enemySkillTick(e3, 1 / 60);
  const lx = e3.castX, ly = e3.castY;
  me3.x = (3 + 2 + .5) * G.T;
  me3.y = (3 + 2 + .5) * G.T;
  P.enemySkillTick(e3, 1 / 60);
  ok(e3.castX === lx && e3.castY === ly, '集氣過半後落點鎖死（走得開就不會被砸）', { lx, ly, castX: e3.castX, castY: e3.castY });

  // (d) 鎖點之後真的放開來走：彈落在鎖定格，人不在那裡 → 打空
  P.enemySkillTick(e3, .35);                       // 集氣結束 → 射出
  ok((G.bolts || []).length === 1, '集氣結束會射出（機制沒被關掉）', { bolts: (G.bolts || []).length });
  const b = G.bolts[0];
  ok(b && b.cx === lx && b.cy === ly, '彈的落點就是鎖住的那格', { cx: b && b.cx, cy: b && b.cy, lx, ly });
  const stillAlive = G.players[0].alive;
  P.updateBolts(1.2);
  ok(G.players[0].alive === stillAlive, '站在別格就安全（舊版落點貼在腳下必中）');
}

// ================================================================
head('4. 直線衝撞：6 格 → 3.6 格');
{
  const me = arena();
  const T = G.T;
  const e = foeAt(3 + 5, 3, 'bunny');               // charge 怪
  e.aggro = true; e.skCd = 0;
  P.enemySkillTick(e, 1 / 60);
  ok(!(e.dashT > 0), '5 格外不會衝撞', { dashT: e.dashT });

  const e2 = foeAt(3 + 3, 3, 'bunny');
  e2.aggro = true; e2.skCd = 0;
  // v5.83：衝撞多了 0.8 秒起手（頭頂圖示）→ 跑到真的撲出去為止
  for (let i = 0; i < 90 && !(e2.dashT > 0); i++) P.enemySkillTick(e2, 1 / 60);
  ok(e2.dashT > 0, '3 格內同一排會衝撞', { dashT: +(e2.dashT || 0).toFixed(2) });
}

// ================================================================
head('5. 鑽地／瞬移：索敵 4.2 格');
{
  const me = arena();
  const T = G.T;
  const far = foeAt(3 + 8, 3, 'sandworm');         // 8 格外
  far.aggro = true; far.skCd = 0;
  P.foeBlinkMark(far);
  const farD = Math.max(Math.abs(far.bx - 3), Math.abs(far.by - 3));
  ok(farD > 4, '8 格外不會瞬移過來（落點留在原地附近）', { bx: far.bx, by: far.by, d: farD });

  const near = foeAt(3 + 3, 3, 'sandworm');
  near.aggro = true; near.skCd = 0;
  P.foeBlinkMark(near);
  const nearD = Math.max(Math.abs(near.bx - 3), Math.abs(near.by - 3));
  ok(nearD >= 2 && nearD <= 4, '4 格內才會跳過來，而且落點離玩家 2 格以上', { dx: near.bx - 3, dy: near.by - 3, d: nearD });
}

// ================================================================
head('6. 一般關卡手感沒被連帶改壞');
{
  P.clearMapTest(); P.settings.size = 'M'; P.startSolo(1, false);
  const e = P.makeEnemy(5, 5, 'slime', 0, 1);
  ok(e.skCd > .5, '小怪出生自帶 0.9~2.5 秒的技能冷卻（不會一生成就開火）', { skCd: +e.skCd.toFixed(2) });
  ok(Math.abs(P.aggroTiles(e) - 2) < .001, '近戰怪的仇恨仍是 2 格');
  ok(G.spdK >= 0 && G.spdK <= 1.05, '速度係數沒被動到', { spdK: G.spdK });
}

console.log('\n結果：' + S.length + ' 通過 / ' + F.length + ' 失敗');
if (F.length) { F.forEach(function (m) { console.log('  ✗ ' + m); }); process.exit(1); }
