// v4.67 驗證：
//   ① 對戰縮圈時場內硬牆不能被換成外牆素材（也不能露出一片背景）
//   ② 隨機地圖：出生點半徑 1 淨空、小怪離出生點 ≥2 格
//   ③ 鑽地／瞬移怪的落點不能貼在玩家身上（冒出瞬間也不傷人）
//   ④ 隨機地圖的速度要跟一般關卡一致（每秒幾格，不是每秒幾像素）
//   node test/verify-v467.js
const { makeEnv } = require('./_sandbox');
const fs = require('fs');
const path = require('path');

const src = require('./_sandbox').rawHtml;
const env = makeEnv();
/* v5.49：單人／RPG 的預設地圖改成「隨機生成」→ 這支驗的是手工地圖（15×13）的手感與版面，
   先釘回基本地圖，免得地圖變大讓尺寸／速度／數量的斷言跟著飄。 */
env.BH.settings.mapMode = 'classic';
const P = env.BH, G = P.Game;
const S = [], F = [];
function ok(cond, msg, extra) {
  (cond ? S : F).push(msg);
  console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
}
function head(t) { console.log('\n' + t); }
const vm = src.match(/const VERSION = '([\d.]+)';/);

function connMap() {
  const cols = G.cols, rows = G.rows, g = G.grid;
  const conn = [];
  for (let y = 0; y < rows; y++) conn.push(new Array(cols).fill(false));
  const q = [];
  for (let x = 0; x < cols; x++) { q.push([x, 0]); q.push([x, rows - 1]); }
  for (let y = 0; y < rows; y++) { q.push([0, y]); q.push([cols - 1, y]); }
  for (let i = 0; i < q.length; i++) {
    const x = q[i][0], y = q[i][1];
    if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
    if (conn[y][x] || g[y][x] !== 1) continue;
    conn[y][x] = true;
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return conn;
}

// ================================================================
head('1. 源碼檢查');
{
  ok(vm && parseFloat(vm[1]) >= 4.67, 'VERSION >= 4.67（目前 ' + (vm && vm[1]) + '，不寫死版號）');
  ok(/const mass = rock \|\| \(Game\.sdActive && conn\[y\]\[x\]\);/.test(src),
    '縮圈時「連到外框的岩體」整片畫（石堆內部不會露背景）');
  ok(/wk\[y\]\[x\] = \(isOut\[y\]\[x\] \|\| mass\) \? 1 : 2;/.test(src),
    '只有外圍岩體／落石用外牆素材，場內硬牆仍是石材（=2）');
  ok(!/\|\| Game\.sdActive;/.test(src.split('const mass')[0].slice(-400)),
    '決定素材時不再把 Game.sdActive 直接當落石');
  ok(/function recalcSpdK\(\)/.test(src) && /recalcSpdK\(\);/.test(src),
    '有 recalcSpdK() 而且建圖時會呼叫');
  ok(/const base = \(146 \+ p\.speedLv \* 20\) \* \(p\.rpgSpd \|\| 1\) \* \(Game\.spdK \|\| 1\);/.test(src),
    '玩家速度乘上 Game.spdK');
  ok(/speed: \(sp\.spd \+ stage \*[\s\S]{0,80}\* \(Game\.spdK \|\| 1\)/.test(src), '小怪速度乘上 Game.spdK');
  ok(/FLY_SPEED_CAP \* M \* \(Game\.spdK \|\| 1\)/.test(src), '飛行怪上限也乘上 Game.spdK');
  ok(/BELT_SPEED \* \(Game\.spdK \|\| 1\)/.test(src), '輸送帶推力也跟著縮放');
  ok(/Game\.bigMap = false;[\s\S]{0,120}recalcSpdK\(\);/.test(src), 'buildMap（對戰／經典）會清掉 bigMap 與速度係數');
  ok(/for \(let dy = -1; dy <= 1; dy\+\+\) for \(let dx = -1; dx <= 1; dx\+\+\) \{[\s\S]{0,220}if \(g\[by2\]\[bx2\] !== 0\) g\[by2\]\[bx2\] = 0;/.test(src),
    '出生點半徑 1 一律淨空（硬岩、軟磚都清掉）');
  ok(/const spots = \[\];/.test(src) && /nearSpawn\(xx, yy, 2\)/.test(src),
    '小怪改成「先列出合法格再抽」，合法格必須離出生點 2 格以上');
  ok(/for \(let r = 2; r <= 4; r\+\+\)/.test(src), '鑽地落點從半徑 2 起挑（不再從玩家身邊冒出）');
  ok(/function foeNearPlayer\(x, y, rad\)/.test(src), '有 foeNearPlayer() 判斷落點附近有沒有人');
  ok(/e\.emergeT = \.6;/.test(src), '冒出後 0.6 秒不傷人（emergeT）');
  ok(/if \(e\.emergeT > 0\) e\.emergeT -= dt;/.test(src), 'emergeT 每幀遞減');
  ok((src.match(/e\.emergeT > 0/g) || []).length >= 4, '三處碰撞判定都會跳過 emergeT',
    { count: (src.match(/e\.emergeT > 0/g) || []).length });
}

// ================================================================
head('2. 對戰縮圈：場內硬牆材質不變、也不露背景');
{
  P.settings.count = 4; P.settings.size = 'M'; P.settings.time = 60; P.settings.sd = 'on';
  P.startBattle();
  G.state = 'play';
  G.wallKind = null; P.markWallKinds();
  // 先把「縮圈前」的場內硬牆記下來（wk === 2）
  const stoneBefore = [];
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    if (G.grid[y][x] === 1 && G.wallKind[y][x] === 2) stoneBefore.push([x, y]);
  }
  ok(stoneBefore.length > 0, '縮圈前有場內硬牆（石材）可對照', { n: stoneBefore.length });

  for (const rings of [1, 3, 5, 8]) {
    G.sdActive = true;
    const want = rings * Math.round(G.sdList.length / 24);
    while (G.sdIndex < want) {
      const c = G.sdList[G.sdIndex++];
      if (G.grid[c[1]][c[0]] !== 1) {
        G.grid[c[1]][c[0]] = 1;
        if (!G.sdRock) G.sdRock = {};
        G.sdRock[c[1] * G.cols + c[0]] = 1;
        G.wallKind = null;
      }
    }
    G.wallKind = null; P.markWallKinds();
    const conn = connMap();
    let notDrawn = 0, hole = 0, wrongMat = 0, stoneLeft = 0;
    for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
      if (G.grid[y][x] !== 1) continue;
      const rock = !!(G.sdRock && G.sdRock[y * G.cols + x]);
      if (G.wallKind[y][x] === 0) {
        notDrawn++;
        if (!conn[y][x]) hole++;
      }
      if (!rock && !conn[y][x] && G.wallKind[y][x] !== 2) wrongMat++;
      if (!rock && !conn[y][x] && G.wallKind[y][x] === 2) stoneLeft++;
    }
    ok(notDrawn === 0, '縮 ' + rings + ' 圈：沒有「實心卻不畫」的格子（不會露背景）', { notDrawn, hole });
    ok(hole === 0, '縮 ' + rings + ' 圈：沒有場內黑洞', { hole });
    ok(wrongMat === 0, '縮 ' + rings + ' 圈：場內硬牆沒有被換成外牆素材', { wrongMat });
    ok(stoneLeft > 0 || rings > 6, '縮 ' + rings + ' 圈：還有石材硬牆（沒被整片染色）', { stoneLeft });
  }
}

// ================================================================
head('3. 隨機地圖：出生點淨空 + 小怪離 ≥2 格 + 速度一致');
{
  const tilesPerSec = [];
  for (let n = 1; n <= 5; n++) {
    P.startMapTest(n);
    let worstWall = 0, worstFoe = 99, emptySpots = 0, bad = 0;
    const seeds = [101, 202, 303, 404, 505, 606];
    for (const sd of seeds) {
      G.mapTestSeed = sd;
      P.startSolo(1, false);
      G.state = 'play';
      const sp = G.spawnCell;
      for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
        if (G.grid[y][x] === 0) continue;
        const d = Math.max(Math.abs(x - sp.x), Math.abs(y - sp.y));
        if (d <= 1) worstWall = Math.max(worstWall, 1);
      }
      if (!G.enemies.length) emptySpots++;
      G.enemies.forEach(function (e) {
        const d = Math.max(Math.abs(Math.floor(e.x / G.T) - sp.x), Math.abs(Math.floor(e.y / G.T) - sp.y));
        if (d < worstFoe) worstFoe = d;
        if (d < 2) bad++;
      });
      // 玩家：每秒走幾格
      const p0 = G.players[0];
      if (p0) tilesPerSec.push(P.moveSpeed(p0) / G.T);
    }
    const s = tilesPerSec[tilesPerSec.length - 1];
    ok(worstWall === 0, '圖' + n + '（' + G.cols + 'x' + G.rows + '）：出生點半徑 1 內沒有牆（6 個種子）', { wall: worstWall });
    ok(bad === 0 && worstFoe >= 2, '圖' + n + '：小怪全部離出生點 2 格以上', { nearest: worstFoe, bad });
    ok(emptySpots === 0, '圖' + n + '：一定有生怪', { empty: emptySpots });
    ok(G.spdK < 1, '圖' + n + '：速度係數 < 1（格子比一般關卡小）', { spdK: +G.spdK.toFixed(3), T: G.T });
    ok(Math.abs(s - 2.47) < .06, '圖' + n + '：玩家每秒走的格數跟一般關卡一致（2.47 格/秒）', { '格/秒': +s.toFixed(2) });
  }
  const mn = Math.min.apply(null, tilesPerSec), mx = Math.max.apply(null, tilesPerSec);
  ok(mx / mn < 1.06, '五張圖＋一般關卡的速度差 < 6%', { min: +mn.toFixed(2), max: +mx.toFixed(2) });

  // 一般關卡：spdK = 1、速度不變
  P.clearMapTest();
  P.settings.size = 'M';
  P.startSolo(1, false);
  ok((G.spdK || 1) === 1, '一般關卡速度係數 = 1（手感完全不變）', { spdK: G.spdK });
  ok(Math.abs(P.moveSpeed(G.players[0]) - 146) < .5, '一般關卡玩家速度仍是 146px/s',
    { v: +P.moveSpeed(G.players[0]).toFixed(1) });

  // 小怪速度也跟著縮：同一隻怪在隨機大圖的 px/s 應該比一般關卡小
  P.clearMapTest(); P.startSolo(1, false);
  const eNormal = P.makeEnemy(2, 2, 'slime', 0, 1);
  P.startMapTest(3); G.mapTestSeed = 999; P.startSolo(1, false);
  const eBig = P.makeEnemy(2, 2, 'slime', 0, 1);
  ok(eBig.speed < eNormal.speed * .8, '小怪速度跟著格子縮（不是只有玩家變慢）',
    { 一般: +eNormal.speed.toFixed(1), 大圖: +eBig.speed.toFixed(1) });
}

// ================================================================
head('4. 鑽地／瞬移：落點與冒出瞬間');
{
  P.startMapTest(2); G.mapTestSeed = 4242; P.startSolo(1, false);
  G.state = 'play';
  const T = G.T, me = G.players[0];
  me.invuln = 0;
  let tooNear = 0, samples = 0, minD = 99;
  for (let i = 0; i < 400; i++) {
    const e = P.makeEnemy(Math.floor(me.x / T), Math.floor(me.y / T) + 3, 'sandworm', 3, 1);
    e.aggro = true;
    P.foeBlinkMark(e);
    if (e.bx != null) {
      const d = Math.max(Math.abs(e.bx - Math.floor(me.x / T)), Math.abs(e.by - Math.floor(me.y / T)));
      samples++;
      if (d < 2) tooNear++;
      if (d < minD) minD = d;
    }
  }
  ok(samples > 300, '落點取樣足夠', { samples });
  ok(tooNear === 0 && minD >= 2, '鑽地落點一律離玩家 2 格以上（不會從你要走的位置冒出來）', { minD, tooNear });

  // 玩家站在落點上 → 不冒出來
  const e2 = P.makeEnemy(Math.floor(me.x / T) + 2, Math.floor(me.y / T), 'sandworm', 3, 1);
  e2.aggro = true;
  e2.bx = Math.floor(me.x / T); e2.by = Math.floor(me.y / T);
  const y0 = e2.y;
  P.foeBlinkTo(e2);
  ok(e2.blinkT > 0 && e2.y === y0, '玩家站在落點上時，蟲先延後不冒出', { blinkT: +e2.blinkT.toFixed(2) });
  P.foeBlinkTo(e2);
  ok(e2.blinkT > 0, '第二次還是有人在落點上 → 繼續延後', { blinkT: +e2.blinkT.toFixed(2) });
  P.foeBlinkTo(e2);
  ok(!(e2.bx === Math.floor(me.x / T) && e2.by === Math.floor(me.y / T)), '第三次會改挑別的落點，不會硬上',
    { bx: e2.bx, by: e2.by, blinkT: +e2.blinkT.toFixed(2) });

  // 冒出後 0.6 秒的保護
  const e3 = P.makeEnemy(Math.floor(me.x / T) + 4, Math.floor(me.y / T), 'sandworm', 3, 1);
  e3.aggro = true;
  e3.bx = Math.floor(me.x / T) + 3; e3.by = Math.floor(me.y / T);
  e3.blinkT = .01;
  G.enemies = [e3];
  P.updateEnemy(e3, 1 / 60);
  ok(e3.emergeT > .5, '冒出瞬間有 0.6 秒保護', { emergeT: +(e3.emergeT || 0).toFixed(2) });
  // 保護期內撞到玩家不應該死
  const before = G.players[0].alive;
  G.players[0].x = e3.x; G.players[0].y = e3.y; G.players[0].invuln = 0;
  P.updateSolo(1 / 60);
  ok(G.players[0].alive === before, '冒出保護期內貼身也不會被撞死', { alive: G.players[0].alive });
}

console.log('\n結果：' + S.length + ' 通過 / ' + F.length + ' 失敗');
if (F.length) { F.forEach(function (m) { console.log('  ✗ ' + m); }); process.exit(1); }
