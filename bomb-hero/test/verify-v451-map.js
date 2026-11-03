// v4.51 專屬測試：大型不規則地圖生成器 ＋ 不對外測試關
//   使用者定調的五條保護一定逐條驗：
//     ① 出生點半徑 3 內無怪  ② 出生點旁邊不能全是牆  ③ 傳送門周圍至少一格可走
//     ④ 不能有硬牆圍出「進不去也炸不開」的空地  ⑤ 至少 2 個「一圈硬牆＋2~3 塊軟磚」怪物房
const fs = require('fs');
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function eq(a, b, name) { ok(a === b, name + '（' + a + '）'); }

// ---------- 小工具 ----------
function countFloor(g) {
  let n = 0;
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) if (g[y][x] !== 1) n++;
  return n;
}
function bfs(g, sx, sy) {
  const rows = g.length, cols = g[0].length;
  const seen = [];
  for (let y = 0; y < rows; y++) seen.push(new Array(cols).fill(false));
  const q = [[sx, sy]]; seen[sy][sx] = true;
  let n = 0;
  for (let i = 0; i < q.length; i++) {
    const x = q[i][0], y = q[i][1]; n++;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      const nx = x + d[0], ny = y + d[1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
      if (seen[ny][nx] || g[ny][nx] === 1) return;
      seen[ny][nx] = true; q.push([nx, ny]);
    });
  }
  return n;
}
function borderOk(g) {
  const rows = g.length, cols = g[0].length;
  for (let x = 0; x < cols; x++) if (g[0][x] !== 1 || g[rows - 1][x] !== 1) return false;
  for (let y = 0; y < rows; y++) if (g[y][0] !== 1 || g[y][cols - 1] !== 1) return false;
  return true;
}

console.log('\n=== 0. 版本與匯出 ===');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '徽章版本同步 ' + P.VERSION);
eq(typeof P.bigGrid, 'function', 'bigGrid 已匯出');
eq(typeof P.startMapTest, 'function', 'startMapTest 已匯出');
eq(P.MAPTEST.length, 5, '測試關 5 檔');

console.log('\n=== 1. 五檔規格（可走格 100→300、怪 6→20）===');
const WANT = [[100, 6], [150, 9], [200, 12], [250, 16], [300, 20]];
P.MAPTEST.forEach(function (m, i) {
  ok(m.floor === WANT[i][0] && m.foes === WANT[i][1],
    'T' + m.n + '：' + m.floor + ' 格／' + m.foes + ' 怪');
});
ok(P.MAPTEST[4].cols > P.MAPTEST[0].cols && P.MAPTEST[4].rows > P.MAPTEST[0].rows,
  '地圖一檔比一檔大（' + P.MAPTEST[0].cols + '×' + P.MAPTEST[0].rows + ' → ' +
  P.MAPTEST[4].cols + '×' + P.MAPTEST[4].rows + '）');
ok(P.MAPTEST.every(function (m) { return m.cols / m.rows >= 1.05; }),
  '橫向都比直向寬（攤開更開闊，不是正方形）');

console.log('\n=== 2. 生成器：可走格數、連通、外牆、出生點 ===');
P.MAPTEST.forEach(function (m) {
  let worstDev = 0, allReach = true, allBorder = true, spOk = true, roomOk = true;
  for (let rep = 0; rep < 4; rep++) {
    const res = P.bigGrid(m.cols, m.rows, m.floor, P.rngFrom(1000 + m.n * 7919 + rep * 131));
    const g = res.g, n = countFloor(g);
    worstDev = Math.max(worstDev, Math.abs(n - m.floor) / m.floor);
    if (bfs(g, res.spawn.x, res.spawn.y) !== n) allReach = false;
    if (!borderOk(g)) allBorder = false;
    // 出生點 3×3 全可走 ＋ 四鄰至少 2 格可走
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = res.spawn.x + dx, y = res.spawn.y + dy;
      if (!g[y] || g[y][x] !== 0) spOk = false;
    }
    let adj = 0;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      const x = res.spawn.x + d[0], y = res.spawn.y + d[1];
      if (g[y] && g[y][x] === 0) adj++;
    });
    if (adj < 2) spOk = false;
    if (res.rooms.length < 2) roomOk = false;
    // 房間真的被一圈硬牆圍住：18 個方向射出去，半徑 rad*0.9 ~ rad*1.8 之間要撞到硬牆
    //   （環帶半徑有 ±24% 擾動，不能固定半徑取樣）
    res.rooms.forEach(function (rm) {
      let ring = 0;
      for (let a = 0; a < 6.283; a += .35) {
        for (let rr = rm.r * .9; rr <= rm.r * 1.8; rr += .25) {
          const x = Math.round(rm.x + Math.cos(a) * rr);
          const y = Math.round(rm.y + Math.sin(a) * rr);
          // 射到地圖外 ＝ 撞到外牆，也算「有牆圍住」（房間貼邊是允許的）
          if (x <= 0 || y <= 0 || x >= m.cols - 1 || y >= m.rows - 1) { ring++; break; }
          if (g[y] && g[y][x] === 1) { ring++; break; }
        }
      }
      if (ring < 12) roomOk = false;
    });
  }
  ok(worstDev <= .08, 'T' + m.n + ' 可走格誤差 ≤8%（最大 ' + (worstDev * 100).toFixed(1) + '%）');
  ok(allReach, 'T' + m.n + ' 所有空地都走得到（沒有孤島）');
  ok(allBorder, 'T' + m.n + ' 只有一層外牆、封得住');
  ok(spOk, 'T' + m.n + ' 出生點 3×3 可走、四鄰 ≥2 格可走');
  ok(roomOk, 'T' + m.n + ' 至少 2 間「一圈硬牆」怪物房');
});

console.log('\n=== 3. 測試關整場（走 startMapTest → buildOrganicMap）===');
P.settings.soloDiff = 'normal';
P.settings.size = 'M';
P.startMapTest(1);
ok(!!G.mapTest, 'Game.mapTest 已設定');
eq(G.cols, P.MAPTEST[0].cols, '地圖寬度吃到測試關設定');
eq(G.rows, P.MAPTEST[0].rows, '地圖高度吃到測試關設定');
ok(G.bigMap === true, 'Game.bigMap = true（tileSize 會把整張塞進畫面）');
ok(!!G.spawnCell && G.spawnCell.x > 1, '出生格是隨機的（' + G.spawnCell.x + ',' + G.spawnCell.y + '）');
const p0 = G.players[0];
const pc = Math.floor(p0.x / G.T), pr = Math.floor(p0.y / G.T);
ok(pc === G.spawnCell.x && pr === G.spawnCell.y, '玩家真的站在出生格上');

// ① 出生點半徑 3 內無怪
let near = 0;
G.enemies.forEach(function (e) {
  const ex = Math.floor(e.x / G.T), ey = Math.floor(e.y / G.T);
  if (Math.abs(ex - G.spawnCell.x) <= 3 && Math.abs(ey - G.spawnCell.y) <= 3) near++;
});
eq(near, 0, '① 出生點半徑 3 內沒有怪');

// 怪數
eq(G.enemies.filter(function (e) { return !e.boss; }).length, P.MAPTEST[0].foes, 'T1 場上 6 隻怪');

// ④ 沒有走不到的角落：所有非硬牆格都要連到出生點
const reachAll = bfs(G.grid, G.spawnCell.x, G.spawnCell.y);
eq(reachAll, countFloor(G.grid), '④ 所有可走格都連通（沒有硬牆圍出進不去的空地）');

// ⑤ 怪物房入口有軟磚
let sealOk = 0, sealAll = 0;
(G.roomSeal || []).forEach(function (rm) {
  let soft = 0;
  (rm.seal || []).forEach(function (c) {
    if (G.grid[c[1]] && G.grid[c[1]][c[0]] === 2) soft++;
  });
  sealAll++;
  if (soft >= 2) sealOk++;
});
ok(sealAll >= 2, '⑤ 有 ' + sealAll + ' 間怪物聚集房');
ok(sealOk === sealAll, '⑤ 每間房入口都封了 2 塊以上軟磚（' + sealOk + '/' + sealAll + '）');

// B 大門：藏在軟磚下、離出生點遠
ok(!!G.door, '有出口門');
const doorSoft = G.grid[G.door.y][G.door.x] === 2 || !G.door.revealed;
ok(doorSoft, '門藏在軟磚下（開場看不到出口）');
const dd = Math.abs(G.door.x - G.spawnCell.x) + Math.abs(G.door.y - G.spawnCell.y);
ok(dd >= Math.floor((G.cols + G.rows) * .25), '門離出生點夠遠（曼哈頓 ' + dd + ' 格）');

// ③ 傳送門周圍至少一格可走（有傳送門的主題才驗）
if (G.warps && G.warps.length) {
  let wOk = true;
  G.warps.forEach(function (pair) {
    pair.forEach(function (c) {
      let n = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const x = c.x + d[0], y = c.y + d[1];
        if (x > 0 && y > 0 && x < G.cols - 1 && y < G.rows - 1 && G.grid[y][x] !== 1) n++;
      });
      if (n < 1) wOk = false;
    });
  });
  ok(wOk, '③ 傳送門四周至少留一格可走（' + G.warps.length + ' 對）');
} else {
  ok(true, '③ 這張圖沒有傳送門（草原主題）→ 略過');
}

console.log('\n=== 4. 大圖的顯示方式（整張塞進畫面）===');
ok(G.T * G.cols <= 720 * 1.02, '地圖寬度不超出視口（' + (G.T * G.cols) + ' ≤ 720）');
ok(G.T * G.rows <= 540 * 1.02, '地圖高度不超出視口（' + (G.T * G.rows) + ' ≤ 540）');
ok(G.T >= 12, '格子不小於 12px（' + G.T + 'px）');
ok(G.ox === Math.floor((720 - G.T * G.cols) / 2), '水平置中（ox=' + G.ox + '）');

console.log('\n=== 5. 每張地圖都不一樣（真的隨機）===');
P.startMapTest(3);
const a = G.grid.map(function (r) { return r.join(''); }).join('|');
const sa = G.spawnCell.x + ',' + G.spawnCell.y;
P.startMapTest(3);
const b = G.grid.map(function (r) { return r.join(''); }).join('|');
ok(a !== b || sa !== (G.spawnCell.x + ',' + G.spawnCell.y), '同一個測試關連兩次長得不同');

console.log('\n=== 6. 正常入口會離開測試關 ===');
P.clearMapTest();
P.startSolo(1, false);
ok(!G.mapTest, '清掉後 mapTest = null');
eq(G.cols, 15, '回到正常關卡 15 欄');
eq(G.rows, 13, '回到正常關卡 13 列');
ok(G.bigMap === false, 'Game.bigMap = false');
ok(G.spawnCell && G.spawnCell.x === 1 && G.spawnCell.y === 1, '正常關卡出生點仍是 (1,1)');

console.log('\n=== 7. 設定頁與入口 ===');
ok(!/id="segSize2"/.test(html), '設定頁已移除「地圖尺寸（全域）」');
ok(!/segWire\('segSize2'/.test(html), 'segSize2 的綁定也一起拿掉');
ok(/id="mapTestRow"/.test(html), '說明頁有測試關入口容器');
ok(/q\.get\('maptest'\)/.test(html), '支援 ?maptest=N 直開');

console.log('\n=== 8. 版本 ===');
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆就是當前版本');
ok(P.VERSION_LOG[0].now === true, '第一筆 now = true');
ok(P.VERSION_LOG[0].items.length >= 3, '本版寫了 ' + P.VERSION_LOG[0].items.length + ' 條更新');
ok(P.VERSION_LOG[1].now === false, '上一版已取消 now');
ok(fs.readFileSync(__dirname + '/../sw.js', 'utf8').indexOf('v' + P.VERSION + '.0') >= 0, 'sw.js 跟著版本升（v' + P.VERSION + '.0）');

console.log('\n========================================');
console.log('v4.51 地圖生成：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
