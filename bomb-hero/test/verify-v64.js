// test/verify-v64.js —— v4.19
//   ① 所有小怪（含飛行怪）只有玩家踏進 2 格內才有仇恨，否則不會主動靠近
//   ② 中階／高階小怪被發現 → 頭上一直冒 😡 生氣泡泡 → 先蓄力 → 加速撲上來
//   ③ BOSS 平常只在自己的地盤踱步，2 格內才會追人／放炸彈
//   ④ 技能怪（放彈／撿彈）沒被惹到不會主動攻擊
//   ⑤ 版本與 SW 快取
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec, html = env.html;
const fs = require('fs');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
const css = html.replace(/\r/g, '');
const DT = 1 / 60;
let T = 40;

function soloStage(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';      // 關掉機關 → 不會有躲藏格干擾「看不看得到」
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.startSolo(stage || 1, false);
  G.state = 'play';
  // 躲藏地形（樹叢／破屋）會讓人「看不到」→ 這裡全部清掉，只量測距離
  G.hazards = [];
  T = G.T;
  return G.players[0];
}
function clearEnemies() { G.enemies.length = 0; }
function addFoe(x, y, type) {
  const e = P.makeEnemy(x, y, type, 1, 1);
  G.enemies.push(e);
  return e;
}
// 找一段橫向連續空地（順便把上下堵成硬牆 → 亂走時方向是可控的）
// 地圖不一定有很長的直線 → 找不到就往下退（最短 4 格）
function findRun(len) {
  for (let L = len; L >= 4; L--) {
    for (let y = 2; y < G.rows - 2; y++) {
      for (let x = 1; x < G.cols - 1 - L; x++) {
        let okAll = true;
        for (let i = 0; i < L; i++) if (G.grid[y][x + i] !== 0) { okAll = false; break; }
        if (!okAll) continue;
        for (let i = 0; i < L; i++) {
          if (y - 1 >= 1) G.grid[y - 1][x + i] = 1;
          if (y + 1 < G.rows - 1) G.grid[y + 1][x + i] = 1;
        }
        return { y: y, x: x, len: L };
      }
    }
  }
  return null;
}
function place(p, cx, cy) { p.x = cx * T + T / 2; p.y = cy * T + T / 2; }
function withRandom(v, fn) {
  const R = Math.random;
  Math.random = function () { return v; };
  try { return fn(); } finally { Math.random = R; }
}

// ================================================================
head('1. 仇恨範圍：小怪 2 格、BOSS 3 格');
ok(P.AGGRO_TILES === 2, 'AGGRO_TILES = 2（實測 ' + P.AGGRO_TILES + '）');
ok(P.BOSS_AGGRO_TILES === 3, 'v4.20：BOSS_AGGRO_TILES = 3（實測 ' + P.BOSS_AGGRO_TILES + '）');
ok(typeof P.aggroTiles === 'function', '__BH 匯出 aggroTiles');
ok(P.aggroTiles({ boss: true }) === 3 && P.aggroTiles({ type: 'skull' }) === 2,
  'aggroTiles()：BOSS 3 格、小怪 2 格');
ok(typeof P.enemyAggro === 'function', '__BH 匯出 enemyAggro');
ok(typeof P.foeInRange === 'function', '__BH 匯出 foeInRange');
ok(typeof P.isAngryFoe === 'function' && typeof P.foeTier === 'function', '__BH 匯出 foeTier / isAngryFoe');
ok(/const foe = enemyAggro\(e\);|enemyAngerTick\(e, dt, !!enemyAggro\(e\), true\)/.test(css),
  'updateEnemy 會先算仇恨再決定行為');
ok(css.indexOf('if (e.kind === \'chase\' && e.aggro && atCenter') > 0,
  '地面追人怪：沒有仇恨就不追（chase 條件多了 e.aggro）');

head('2. 中階／高階小怪分類');
{
  const high = ['lizard', 'robot', 'bomber', 'wizard', 'hornet'];
  const mid = ['beetle', 'skull', 'eye', 'scavenger', 'sapper', 'wisp'];
  const low = ['slime', 'mush', 'crab', 'panda', 'penguin', 'octopus', 'bat', 'ghost', 'bee'];
  high.forEach(function (id) { ok(P.foeTier(id) === 'high', id + ' = 高階'); });
  mid.forEach(function (id) { ok(P.foeTier(id) === 'mid', id + ' = 中階'); });
  low.forEach(function (id) { ok(P.foeTier(id) === 'low', id + ' = 低階（不會冒生氣）'); });
  ok(P.isAngryFoe({ type: 'lizard' }) === true, '疾風蜥會生氣');
  ok(P.isAngryFoe({ type: 'beetle' }) === true, '鐵甲蟲會生氣');
  ok(P.isAngryFoe({ type: 'slime' }) === false, '史萊姆不會生氣');
  ok(P.isAngryFoe({ type: 'boss', boss: true }) === true, 'BOSS 被惹到也會生氣');
  ok(Object.keys(P.FOE_TIER).length === 20, '20 種小怪都有階級（' + Object.keys(P.FOE_TIER).length + '）');
}

head('3. 2 格內才算被發現（3 格不算）');
{
  const p = soloStage(1);
  clearEnemies();
  const run = findRun(6);
  ok(!!run, '找到測試用走廊');
  const px = run.x, py = run.y;
  place(p, px, py); p.alive = true;
  const e2 = addFoe(px + 2, py, 'skull');   // 正好 2 格
  const e3 = addFoe(px + 3, py, 'skull');   // 3 格
  ok(!!P.enemyAggro(e2), '距離 2 格 → 被發現');
  ok(P.enemyAggro(e3) === null, '距離 3 格 → 沒發現');
  ok(P.foeInRange(e2, p) === true && P.foeInRange(e3, p) === false, 'foeInRange 也是 2 格界線');
  place(p, px + 1, py);
  ok(!!P.enemyAggro(e3), '往前一步（2 格）就被發現了');
}

head('4. 沒被發現 → 追人怪不會主動靠過來');
{
  const p = soloStage(1);
  clearEnemies();
  const run = findRun(7);
  const px = run.x, py = run.y;
  place(p, px, py); p.alive = true;
  const e = addFoe(px + 3, py, 'skull');    // 3 格 > 2 格 → 沒仇恨
  const d0 = Math.hypot(e.x - p.x, e.y - p.y);
  // 方向可控：走廊上下是牆 → 亂走只會挑 left/right，Math.random=0.99 → 一律往右
  withRandom(0.99, function () {
    for (let i = 0; i < 120; i++) P.updateEnemy(e, DT);
  });
  const d1 = Math.hypot(e.x - p.x, e.y - p.y);
  ok(e.aggro === false, '沒仇恨（aggro = false）');
  ok(d1 >= d0 - 1, '沒有往玩家靠（' + Math.round(d0) + ' → ' + Math.round(d1) + ' px，反而走遠）');
  ok(e.windT === 0 && e.dashT === 0, '不會蓄力也不會衝刺');
}

head('5. 中階怪：2 格內 → 生氣蓄力 → 撲上來');
{
  const p = soloStage(1);
  clearEnemies();
  const run = findRun(6);
  const px = run.x, py = run.y;
  place(p, px, py); p.alive = true;
  const e = addFoe(px + 2, py, 'skull');    // 中階追人怪
  const x0 = e.x, y0 = e.y;
  P.updateEnemy(e, DT);
  ok(e.aggro === true, '被發現（aggro = true）');
  ok(e.windT > 0, '先蓄力（windT = ' + e.windT.toFixed(2) + 's）');
  ok(e.angerT > 0, '怒氣開始累積（angerT = ' + e.angerT.toFixed(2) + '）');
  // 蓄力期間站著不動
  for (let i = 0; i < 14; i++) P.updateEnemy(e, DT);
  const moved = Math.hypot(e.x - x0, e.y - y0);
  ok(moved < 2, '蓄力期間原地不動（位移 ' + moved.toFixed(1) + 'px）');
  // 蓄力結束 → 衝刺
  let sawDash = false, minD = 1e9;
  const d0 = Math.hypot(e.x - p.x, e.y - p.y);
  for (let i = 0; i < 42; i++) {
    P.updateEnemy(e, DT);
    if (e.dashT > 0) sawDash = true;
    minD = Math.min(minD, Math.hypot(e.x - p.x, e.y - p.y));
  }
  ok(sawDash, '蓄力完進入衝刺（dashT > 0）');
  ok(minD < d0 * .72, '撲上來（' + Math.round(d0) + ' → ' + Math.round(minD) + ' px）');
  ok(P.ANGER_DASH_MUL > 1.3, '衝刺倍率 ' + P.ANGER_DASH_MUL + ' 倍');
}

head('6. 低階怪：2 格內被發現，但不會蓄力（只是繼續亂走）');
{
  const p = soloStage(1);
  clearEnemies();
  const run = findRun(6);
  const px = run.x, py = run.y;
  place(p, px, py); p.alive = true;
  const e = addFoe(px + 2, py, 'slime');    // 低階亂走怪
  P.updateEnemy(e, DT);
  ok(e.aggro === true, '低階怪也會被發現（aggro = true）');
  ok(e.windT === 0, '但不會蓄力（windT = 0）');
  ok(!P.isAngryFoe(e), 'isAngryFoe = false → 頭上不會冒 😡');
}

head('7. 飛行怪：沒被發現不會往你飛、被發現才加速纏人');
{
  const p = soloStage(1);
  clearEnemies();
  const run = findRun(7);
  const px = run.x, py = run.y;
  place(p, px, py); p.alive = true;
  const far = addFoe(px + 3, py, 'bat');
  far.x = p.x + 4 * T;                     // 直接擺到 4 格外（走廊不夠長沒關係）
  P.updateEnemy(far, DT);
  ok(far.aggro === false, '距離 4 格 → 沒被發現');
  ok(far.spdBoost === 1, '沒有加速（spdBoost = ' + far.spdBoost + '）');
  ok(/if \(foe && Math\.random\(\) < \(isAngryFoe\(e\) \? \.78 : \.48\)\)/.test(css),
    '朝玩家飛的條件改成「有仇恨」才觸發');
  const near = addFoe(px + 2, py, 'bee');
  P.updateEnemy(near, DT);
  ok(near.aggro === true, '距離 2 格 → 被發現');
  ok(near.spdBoost > 1.2, '被盯上會飛快一點（spdBoost = ' + near.spdBoost + '）');
}

head('8. 放彈怪 / 撿彈怪：沒被惹到不主動攻擊');
{
  const p = soloStage(1);
  clearEnemies();
  G.bombs.length = 0;
  const run = findRun(8);
  const px = run.x, py = run.y;
  place(p, px, py); p.alive = true;
  const bm = addFoe(px + 4, py, 'bomber');
  bm.speed = 0;                            // 不讓牠自己走過來（只驗「沒仇恨就不攻擊」）
  for (let i = 0; i < 300; i++) P.updateEnemy(bm, DT);
  ok(G.bombs.length === 0, '玩家在遠處 → 放彈怪一顆都沒放（' + G.bombs.length + '）');
  ok(bm.aggro === false, '放彈怪沒有仇恨');
  place(p, px + 4, py);                    // 拉近到 1 格
  for (let i = 0; i < 300; i++) P.updateEnemy(bm, DT);
  ok(bm.aggro === true, '拉近後被惹到');
  ok(G.bombs.length > 0, '被惹到才放炸彈（' + G.bombs.length + ' 顆）');
  ok(/if \(e\.skill === 'scavenger'\) \{\n    if \(!e\.aggro\) return;/.test(css), '撿彈怪同樣要仇恨才動手');
  ok(/if \(e\.skill === 'bomber'\) \{\n    if \(!e\.aggro\) return;/.test(css), '放彈怪同樣要仇恨才動手');
}

head('9. BOSS：平常只在自己的地盤踱步');
{
  const p = soloStage(1);
  clearEnemies();
  G.bombs.length = 0;
  // 清出一整塊空地當舞台（避免測試地圖的牆壁讓 BOSS 卡住，測不到踱步）
  for (let y = 2; y < G.rows - 2; y++) for (let x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
  G.bombs.length = 0;
  const px = Math.floor(G.cols / 2) - 3, py = Math.floor(G.rows / 2);
  const boss = P.makeBoss(px + 5, py, 12);
  G.enemies.push(boss);
  ok(boss.homeCX === px + 5 && boss.homeCY === py && boss.homeTiles === 4, 'BOSS 記住自己的地盤（4 格）');
  // v4.20：BOSS 的仇恨是 3 格，牠踱步的範圍（±4）可能自己走到玩家旁邊
  // → 玩家要站得比「地盤半徑 + 3 格」更遠，才測得到「沒被惹到」
  place(p, 1, Math.max(1, Math.min(G.rows - 2, py))); p.alive = true; p.invuln = 999;
  const hx = boss.homeCX * T + T / 2, hy = boss.homeCY * T + T / 2;
  let maxAway = 0, anywhere = 0;
  const bx0 = boss.x, by0 = boss.y;
  for (let i = 0; i < 260; i++) {
    P.updateBoss(boss, DT);
    maxAway = Math.max(maxAway, Math.hypot(boss.x - hx, boss.y - hy));
    anywhere = Math.max(anywhere, Math.hypot(boss.x - bx0, boss.y - by0));
  }
  ok(boss.aggro === false, '玩家在 8 格外（地盤外 4 格以上）→ BOSS 沒被惹到');
  ok(G.bombs.length === 0, '沒被惹到一顆炸彈都不放（' + G.bombs.length + '）');
  ok(anywhere > T * .8, '平常真的會走來走去（走了 ' + (Math.round(anywhere / T * 10) / 10) + ' 格）');
  ok(maxAway <= boss.homeTiles * T + T * 1.6, '只在自家地盤走動（最遠 ' + Math.round(maxAway / T * 10) / 10 + ' 格）');
  // 拉近到 2 格 → 立刻發火
  p.x = boss.x - 2 * T; p.y = boss.y; p.alive = true; p.invuln = 999;
  P.updateBoss(boss, DT);
  ok(boss.aggro === true, '踏進 2 格內 → BOSS 發火');
  ok(boss.angerT > 0, '怒氣開始累積（angerT = ' + boss.angerT.toFixed(2) + '）');
  const d0 = Math.hypot(boss.x - p.x, boss.y - p.y);
  let minD = 1e9;
  for (let i = 0; i < 120; i++) { P.updateBoss(boss, DT); minD = Math.min(minD, Math.hypot(boss.x - p.x, boss.y - p.y)); }
  ok(minD < d0 - T * .5, '被惹到就追人（' + Math.round(d0) + ' → ' + Math.round(minD) + ' px）');
  for (let i = 0; i < 200; i++) P.updateBoss(boss, DT);
  ok(G.bombs.length > 0, '被惹到才放炸彈（' + G.bombs.length + ' 顆）');
  ok(/if \(e\.aggro && e\.bombT <= 0 && bossBombs/.test(css), '放彈條件多了 e.aggro');
  // 跑遠 → BOSS 回去踱步
  place(p, px + 1, Math.max(1, py - 1));
  p.alive = false;                            // 玩家離場（死亡）＝沒有目標
  for (let i = 0; i < 5; i++) P.updateBoss(boss, DT);
  ok(boss.aggro === false, '沒有目標就回到踱步狀態');
}

head('9b. v4.20：BOSS 3 格內就發火（小怪同距離還看不到）');
{
  const p = soloStage(1);
  clearEnemies();
  for (let y = 2; y < G.rows - 2; y++) for (let x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
  G.bombs.length = 0;
  const px = Math.floor(G.cols / 2) - 3, py = Math.floor(G.rows / 2);
  const boss = P.makeBoss(px + 5, py, 12);
  G.enemies.push(boss);
  place(p, px, py); p.alive = true; p.invuln = 999;

  // 2.6 格：小怪（2 格）還看不到，BOSS（3 格）已經發火
  const sk = addFoe(px, py, 'skull');
  sk.x = p.x + 2.6 * T; sk.y = p.y;
  ok(P.enemyAggro(sk) === null, '2.6 格 → 小怪還看不到（小怪仍是 2 格）');
  boss.x = p.x + 2.6 * T; boss.y = p.y;
  P.updateBoss(boss, DT);
  ok(boss.aggro === true, '2.6 格 → BOSS 已經發火');

  // 正好 3 格：還在範圍內
  boss.x = p.x + 3 * T; boss.y = p.y;
  P.updateBoss(boss, DT);
  ok(boss.aggro === true, '正好 3 格 → BOSS 還在生氣（界線算在內）');

  // 3.4 格：跑出 3 格 → 放棄
  boss.x = p.x + 3.4 * T; boss.y = p.y;
  P.updateBoss(boss, DT);
  ok(boss.aggro === false, '3.4 格 → BOSS 沒被惹到');
  ok(boss.windT === 0 && boss.dashT === 0, '沒被惹到不會蓄力也不會衝刺');
  boss.x = p.x + 2.6 * T; boss.y = p.y;
  P.updateBoss(boss, DT);
  ok(boss.angerT > 0, '回到 3 格內又開始累積怒氣（angerT = ' + boss.angerT.toFixed(2) + '）');
}

head('10. 生氣效果：只在中階／高階怪（含 BOSS）頭上冒 😡');
{
  const p = soloStage(1);
  clearEnemies();
  const run = findRun(6);
  const px = run.x, py = run.y;
  place(p, px, py); p.alive = true;
  function markCount(e) {
    rec.calls.length = 0;
    P.updateEnemy(e, DT);          // 先讓牠被發現
    rec.calls.length = 0;
    P.drawEnemy(e, T);
    let n = 0;
    rec.calls.forEach(function (c) { if (c[0] === 'fillText' && String(c[1]).indexOf('😡') >= 0) n++; });
    return n;
  }
  const mid = addFoe(px + 2, py, 'skull');
  ok(markCount(mid) > 0, '骷髏兵（中階）頭上有 😡 泡泡');
  const low = addFoe(px + 2, py, 'slime');
  ok(markCount(low) === 0, '史萊姆（低階）頭上沒有 😡');
  const far = addFoe(px + 2, py, 'skull');
  far.x = p.x + 6 * T;    far.y = p.y;      // 擺到 6 格外
  ok(markCount(far) === 0, '距離太遠（沒仇恨）也不會冒 😡');
  ok(typeof P.drawAngerMark === 'function', '有 drawAngerMark');
  ok(/function drawAngerMark/.test(css) && /'&#x1F621;'|😡/.test(css), '生氣泡泡用 😡');
  const boss = P.makeBoss(px + 2, py, 6);
  place(p, px + 1, py);
  P.updateBoss(boss, DT);
  rec.calls.length = 0;
  P.drawEnemy(boss, T);
  let bn = 0;
  rec.calls.forEach(function (c) { if (c[0] === 'fillText' && String(c[1]).indexOf('😡') >= 0) bn++; });
  ok(bn > 0, 'BOSS 被惹到也會冒 😡');
}

head('11. 說明書與版本');
ok(css.indexOf('中階／高階') > 0, '說明書寫了中階／高階小怪');
ok(css.indexOf('都只在你踏進 <b>2 格內</b>才會發現你') > 0, '說明書寫了 2 格規則');
ok(P.VERSION === '4.20', '版號 = ' + P.VERSION);
ok(css.indexOf('id="verTxt">' + P.VERSION + '<') > 0, '畫面版本文字同步 ' + P.VERSION);
ok(P.VERSION_LOG[0].v === '4.20' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = 4.20（now）');
ok(P.VERSION_LOG[0].items.join(' ').indexOf('3 格') >= 0, 'v4.20 更新內容寫了 BOSS 3 格');
ok(P.VERSION_LOG[1].v === '4.19' && P.VERSION_LOG[1].now === false, '4.19 已不是 now');
ok(P.VERSION_LOG[1].items.join(' ').indexOf('2 格') >= 0, '4.19 條目仍寫著 2 格規則');
ok(P.VERSION_LOG[2].v === '4.18' && P.VERSION_LOG[2].now === false, '4.18 已不是 now');
ok(/SW_VERSION = 'v4\.20\.0'/.test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')), 'sw.js = v4.20.0');

console.log('\n' + (fail ? '✗ ' + fail + ' 項失敗 / ' : '') + '通過 ' + pass + ' 項');
process.exit(fail ? 1 : 0);
