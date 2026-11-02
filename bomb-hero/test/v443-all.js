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
console.log('\n=== 3. 場景貼圖（第一大關） ===');
{
  const A = P.TILE_ART;
  ok(!!A, 'TILE_ART 存在');
  ok(A.hard.length === 3, '硬牆 3 張', A.hard.length);
  ok(A.soft.length >= 1, '軟牆至少 1 張', A.soft.length);
  ok(A.floor.length === 3, '地板 3 張', A.floor.length);
  ok(A.outer.length >= 2, '外牆至少 2 張', A.outer.length);
  const all = [].concat(A.hard, A.soft, A.floor, A.outer);
  ok(all.every(function (o) { return /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(o.u); }),
    '全部是 webp data URI（沒有漏前綴）');
  ok(all.length >= 9, '總共至少 9 張', all.length);

  // 檔案大小（v4.44 起每張 128×128）
  const bytes = all.reduce(function (a, o) { return a + o.u.length; }, 0);
  ok(bytes < 60000, 'base64 合計 < 60KB（省空間）', (bytes / 1024).toFixed(1) + ' KB');

  // 尺寸
  const dims = JSON.parse(fs.readFileSync(__dirname + '/../art/tiles2/_stats.json', 'utf8'));
  ok(dims.length === all.length, '_stats.json 筆數與 TILE_ART 一致', dims.length);
  const png = require('child_process');
  // 用 PIL 不方便 → 直接讀 PNG 標頭（tile-*.png 是 128×128）
  const buf = fs.readFileSync(__dirname + '/../art/tiles2/tile-hard0.png');
  ok(buf.readUInt32BE(16) === 128 && buf.readUInt32BE(20) === 128, '輸出貼圖是 128×128',
    buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20));

  // 只換第一大關
  ok(/if \(!Game\.theme \|\| Game\.theme\.style !== 'forest'\) return false;/.test(src),
    'TileArt 只在 forest（第一大關）生效');
  ok(/TileArt\.draw\(ring \? 'outer' : 'hard'/.test(src), '石牆會依「是不是最外圈」挑外牆／硬牆');
  ok(/TileArt\.draw\('soft'/.test(src), '軟磚用新貼圖');
  ok(/TileArt\.draw\('floor'/.test(src), '地板用新貼圖');
  ok(/drawStone\(px, py, T, th\.hard, x \* 37 \+ y \* 7, x, y\);/.test(src),
    '呼叫端有把格子座標傳進去（才分得出外圈）');

  // 沙盒裡沒有 Image → 不能爆掉，要退回原本的程序化美術
  ok(P.TileArt.readyCount() === 0, '沒有 Image 時不會硬載（沙盒安全）');
  ok(P.TileArt.draw('hard', 0, 0, 0, T) === false, '沒載到圖就回 false → 走原本畫法');
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
