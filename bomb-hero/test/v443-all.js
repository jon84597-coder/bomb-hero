// v4.43 四項需求的回歸測試
//   1. 手機 HUD：只留兩排（工具列＋資訊列）、ESC 收掉、工具收進 ⋮、橫放同一排
//   2. 推車：丟到牆上會往同方向彈一格，落地就停
//   3. 場景貼圖：硬牆 3／軟牆 1／地板 3／外牆 2，只換第一大關
//   4. 版號與快取
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec;
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let pass = 0, fail = 0;
function ok(c, msg, extra) {
  if (c) { pass++; console.log('  ✓ ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
}

P.settings.size = 'M'; P.settings.hazards = 'on'; P.settings.ctrl = 'kb';
P.startSolo(1, false); G.state = 'play';
const T = G.T;

// ==================================================================
console.log('\n=== 1. 手機 HUD：兩排以內 ===');
{
  ok(/body\.touch\.in-game #gameTop \{\s*\n\s*flex-wrap: nowrap;/.test(src), '#gameTop 手機遊戲中強制單列（nowrap）');
  ok(/body\.touch\.in-game #gameTop \.chip \.thn \{ display: none; \}/.test(src),
    '窄螢幕把關卡名藏起來（一排才塞得下 8 個資訊）');
  ok(/body\.touch\.in-game #pauseBtn \{ display: none; \}/.test(src),
    'ESC 那顆按鈕（#pauseBtn）在手機上收掉（右邊已有大顆暫停）');
  ok(/html \+= '<button id="pauseBtn">/.test(src), 'ESC 按鈕仍在（桌機用），只是手機隱藏');
  ok(/@media \(orientation: portrait\) \{/.test(src), '直放／橫放分開處理（portrait 專屬區塊）');
  ok(/padding-right: 154px/.test(src), '橫放資訊列右邊讓開給 ⋮（不會壓到按鈕）');
  ok(/#navBar\.inGame #btnMore \{/.test(src) && /#navBar\.inGame \.navmore \{/.test(src),
    '遊戲中工具列一律收成 ⋮ 下拉（橫放也不再攤平 7 顆圖示）');
  ok(/\.navmore\.on \{ display: flex; \}/.test(src), '⋮ 下拉可展開');
  const hb = src.match(/<button class="navbtn" id="btnBack"[^>]*>([\s\S]*?)<\/button>/);
  ok(hb && /<b>上一頁<\/b>/.test(hb[1]), '「上一頁」文字包進 <b> → 遊戲中只留箭頭');
}

// ==================================================================
console.log('\n=== 2. 推車：丟到牆上會彈一格，落地就停 ===');
{
  ok(P.CART_BOUNCE_MAX === 3, '彈跳上限 = 3 格', P.CART_BOUNCE_MAX);
  ok(P.CART_LV.map(function (l) { return l.reach; }).join(',') === '1,2,3', '集氣距離仍是 1／2／3 格');

  // 第 2 格是牆 → 彈到第 3 格落地
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.grid[y][x] = 0;
  const me = G.players[0];
  me.cart = true; me.alive = true;
  me.x = 6 * T + T / 2; me.y = 0 * T + T / 2;
  G.grid[2][6] = 1;
  let land = P.cartPickLanding(me, 1);
  ok(!!land && land.y === 3 && land.onWall === false && land.bounce === 1,
    '第 2 格石牆 → 彈到第 3 格（地上）', land && ('y=' + land.y + ' bounce=' + land.bounce));

  // 連兩格牆 → 連彈兩格
  G.grid[3][6] = 1;
  land = P.cartPickLanding(me, 1);
  ok(!!land && land.y === 4 && land.bounce === 2, '連兩格牆 → 彈到第 4 格',
    land && ('y=' + land.y + ' bounce=' + land.bounce));

  // 落在空地不彈
  G.grid[2][6] = 0; G.grid[3][6] = 0;
  land = P.cartPickLanding(me, 0);
  ok(!!land && land.y === 1 && land.bounce === 0 && land.onWall === false, '落在空地不彈（近 1 格）');

  // 撞到地圖邊界 → 停在牆頂
  for (let y = 1; y < G.rows; y++) G.grid[y][6] = 1;
  land = P.cartPickLanding(me, 2);
  ok(!!land && land.onWall === true, '整排都是牆、彈到邊界 → 停在牆頂', land && ('y=' + land.y));

  // 下一格有炸彈 → 不彈過去
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.grid[y][x] = 0;
  G.grid[2][6] = 1;
  G.bombs = [{
    cx: 6, cy: 3, px: 0, py: 0, timer: 2, power: 1, owner: me, seed: 1,
    remoteArmed: false, mine: false, moving: null, flying: null, held: false, age: 1
  }];
  land = P.cartPickLanding(me, 1);
  ok(!!land && land.y === 2 && land.onWall === true, '牆的下一格已經有炸彈 → 停在牆頂（不疊炸彈）',
    land && ('y=' + land.y + ' onWall=' + land.onWall));
  G.bombs = [];

  // 路徑有把「彈過去」的格子串起來
  G.grid[2][6] = 1;
  land = P.cartPickLanding(me, 1);
  ok(!!land && land.path.length === 4, '飛行路徑 = 推車 → 牆 → 落點（共 4 節點）',
    land && land.path.length);
  ok(!!land && land.path[2].w === 1, '路徑裡標出「牆那一格」（w=1）');
}

// ==================================================================
console.log('\n=== 3. 場景貼圖（八個主題的地面） ===');
{
  const A = P.TILE_ART;
  ok(!!A, 'TILE_ART 存在');
  // v4.46：牆（硬磚／軟磚／外框）全部回歸程序化美術，只留地面貼圖
  ok(A.hard === undefined && A.soft === undefined && A.outer === undefined,
    '牆的三組貼圖已移除（第一大關除了地面都回溯成程序美術）');
  ok(A.floor.length === 4, '草地 4 張', A.floor.length);

  const PAIRS = [['floorSand', '沙地'], ['floorIce', '雪地'], ['floorLava', '熔岩'],
                 ['floorNeon', '霓虹'], ['floorSea', '深海'], ['floorSky', '天空'],
                 ['floorDark', '暗黑']];
  PAIRS.forEach(function (pr) {
    ok(Array.isArray(A[pr[0]]) && A[pr[0]].length === 4, pr[1] + ' 4 張',
      A[pr[0]] && A[pr[0]].length);
  });

  let all = [].concat(A.floor);
  PAIRS.forEach(function (pr) { all = all.concat(A[pr[0]] || []); });
  ok(all.length === 32, '總共 32 張（8 個主題 × 4）', all.length);
  ok(all.every(function (o) { return /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(o.u); }),
    '全部是 webp data URI（沒有漏前綴）');

  const bytes = all.reduce(function (a, o) { return a + o.u.length; }, 0);
  ok(bytes < 90000, 'base64 合計 < 90KB（省空間）', (bytes / 1024).toFixed(1) + ' KB');

  // 統計檔要跟貼圖對得上（否則改圖忘了重跑管線）
  function stat(f) {
    return JSON.parse(fs.readFileSync(__dirname + '/../art/ground/' + f, 'utf8'));
  }
  ok(stat('_stats.json').length === 4, '草地統計 4 筆');
  ok(stat('_stats-sand.json').length === 4, '沙地統計 4 筆');
  ok(stat('_stats-ice.json').length === 4, '雪地統計 4 筆');
  const gs = stat('_stats-ground.json');
  ['lava', 'neon', 'sea', 'sky', 'dark'].forEach(function (k) {
    ok(gs[k] && gs[k].length === 4, k + ' 統計 4 筆', gs[k] && gs[k].length);
  });

  // 每個主題的四張亮度差要小（差太多拼起來就是方格）
  function spread(list) {
    const Ls = list.map(function (d) { return d.L; });
    return Math.max.apply(null, Ls) - Math.min.apply(null, Ls);
  }
  ok(spread(stat('_stats.json')) < 3, '四張草地亮度差 < 3 灰階');
  ok(spread(stat('_stats-sand.json')) < 3, '四張沙地亮度差 < 3 灰階');
  ok(spread(stat('_stats-ice.json')) < 3, '四張雪地亮度差 < 3 灰階');
  ['lava', 'neon', 'sea', 'sky', 'dark'].forEach(function (k) {
    ok(spread(gs[k]) < 3, '四張' + k + '亮度差 < 3 灰階', spread(gs[k]).toFixed(2));
  });

  // 尺寸
  const gbuf = fs.readFileSync(__dirname + '/../art/ground/tile-sky0.png');
  const gw0 = gbuf.readUInt32BE(16);
  ok(gw0 === 96 && gbuf.readUInt32BE(20) === 96, '新主題地面是 96×96（59px 顯示夠用，省額度）',
    gw0 + 'x' + gbuf.readUInt32BE(20));

  // 生效範圍與繪製路徑
  ok(/if \(k !== 'floor'\) return false;/.test(src), 'TileArt 只認地板（牆走程序化）');
  ok(/sand: 'floorSand', ice: 'floorIce', lava: 'floorLava'/.test(src),
    '主題對照表：沙地／雪地／熔岩');
  ok(/const im = pick\(ALT\[st\] \|\| 'floor', seed\);/.test(src),
    '草原用 floor，其餘主題用各自的 floorXXX');
  ok(/TileArt\.draw\('floor'/.test(src), '地板用新貼圖');
  ok(!/TileArt\.draw\(ring \? 'outer' : 'hard'/.test(src), '石牆不再走貼圖');
  ok(!/TileArt\.draw\('soft'/.test(src), '軟磚不再走貼圖');
  ok(/function paintGroundDecor/.test(src), '有地面裝飾（冰晶／火星／水草／血跡…）');
  ok(/paintGroundDecor\(x, y, px, py, T, \(th && th\.style\) \|\| 'forest'\);/.test(src),
    '地板畫完接著畫裝飾');

  // 沙盒裡沒有 Image → 不能爆掉，要退回原本的程序化美術
  ok(P.TileArt.readyCount() === 0, '沒有 Image 時不會硬載（沙盒安全）');
  ok(P.TileArt.draw('floor', 0, 0, 0, T) === false, '沒載到圖就回 false → 走原本畫法');
}

// ==================================================================
console.log('\n=== 4. 版號與快取 ===');
{
  ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正常', P.VERSION);
  const top = P.VERSION_LOG[0];
  ok(top.v === P.VERSION, '版本紀錄第一筆同步', top.v);
  ok(top.now === true, '第一筆是 now');
  ok(P.VERSION_LOG[1].now !== true, '第二筆已取消 now');
  ok(top.items.length >= 3, '本版寫了 ' + top.items.length + ' 條更新');
  const swv = 'v' + P.VERSION + '.0';
  ok(fs.readFileSync(__dirname + '/../sw.js', 'utf8').indexOf(swv) >= 0, '主檔 sw.js = ' + swv);
  ok(fs.readFileSync(__dirname + '/../../public/sw.js', 'utf8').indexOf(swv) >= 0, 'public/sw.js = ' + swv);
  ok(fs.readFileSync(__dirname + '/../../bomberman-online/public/sw.js', 'utf8').indexOf(swv) >= 0,
    'bomberman-online/public/sw.js = ' + swv);
  ok(src.length < 3350000, '單檔仍在體積上限內', src.length + ' 字元');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v4.43：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
