// v4.41 三項需求的回歸測試：
//   1. 藏人場景物件改「淺色、矮胖」（顏色太重／疊箱 1.83 格會遮住上面一格）
//   2. 推車投擲距離硬上限 1／2／3 格（原本會無視標示飛到 5～16 格，還會一格一格彈過牆）
//   3. 版號與快取同步
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec;
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let pass = 0, fail = 0;
function ok(c, msg, extra) {
  if (c) { pass++; console.log('  ✓ ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
}
function rgbaOf(v) {
  const m = String(v).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const a = m[1].split(',').map(function (x) { return parseFloat(x); });
  return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 };
}

P.settings.size = 'M'; P.settings.hazards = 'on'; P.settings.ctrl = 'kb';
P.startSolo(1, false); G.state = 'play';
const T = G.T;

// ==================================================================
console.log('=== 1. 藏人物件：淺色、矮胖（只比一格多一點點） ===');
{
  ok(P.HIDE_ART_SCALE === 1.14, '寬度常數 = 1.14 格（舊 1.26）', P.HIDE_ART_SCALE);
  ok(P.HIDE_ART_MAXH === 1.26, '高度上限 = 1.26 格（v4.42 放寬，細高物件才不會被壓扁）', P.HIDE_ART_MAXH);
  ok(!/const HIDE_ART_SCALE = 1\.26;/.test(src), '舊的 1.26 已移除');
  ok(!/h > T \* 1\.55/.test(src), '舊的 1.55 高度上限已移除');

  const kinds = ['bush', 'hut', 'rock', 'jar', 'crate'];
  ok(Object.keys(P.HIDE_ART).length === 5, '五組貼圖都在', Object.keys(P.HIDE_ART).join(','));

  // 長寬比：全部「寬 ≥ 高」（矮胖），不會再出現 0.69 的瘦高木箱
  const asps = kinds.map(function (k) { return P.HIDE_ART[k].asp; });
  ok(asps.every(function (a) { return a >= .75; }), '沒有瘦成一條棍（asp ≥ 0.75）',
    asps.map(function (a) { return a.toFixed(2); }).join(' / '));
  ok(asps.every(function (a) { return a < 1.95; }), '也沒有扁成一條線（asp < 1.95，石堆最扁）',
    asps.map(function (a) { return a.toFixed(2); }).join(' / '));

  // 實際畫到場上的尺寸
  const T2 = 46;
  kinds.forEach(function (k) {
    const realGet = P.HideArt.get;
    P.HideArt.get = function (kk) { return kk === k ? env.fakeImg(176, 176) : null; };
    rec.calls.length = 0; rec.sets.length = 0;
    P.drawHideTile(100, 100, T2, 1, k, 5);
    const di = rec.calls.filter(function (c) { return c[0] === 'drawImage'; });
    const w = di.length ? di[0][4] : 0, h = di.length ? di[0][5] : 0, dy = di.length ? di[0][3] : 0;
    ok(di.length === 1, k + ' 有畫出來');
    ok(w <= T2 * 1.141 && w >= T2 * 0.94, k + ' 寬度 0.94～1.14 格（' + (w / T2).toFixed(2) + ' 格）');
    ok(h <= T2 * 1.261, k + ' 高不超過 1.26 格（' + (h / T2).toFixed(2) + ' 格）');
    ok(Math.abs(dy + h - (100 + T2 * .93)) < .01, k + ' 底部對齊格子下緣');
    P.HideArt.get = realGet;
  });

  // 木箱堆是上次最誇張的（1.83 格）→ 這次要壓到 1.1 格以內
  ok(P.HIDE_ART.crate.asp >= 1.1, '木箱堆仍是「橫躺的兩箱並排」（asp ' + P.HIDE_ART.crate.asp.toFixed(2) + '）',
    P.HIDE_ART.crate.w + 'x' + P.HIDE_ART.crate.h);
  {
    const realGet = P.HideArt.get;
    P.HideArt.get = function (kk) { return kk === 'crate' ? env.fakeImg(176, 133) : null; };
    rec.calls.length = 0; rec.sets.length = 0;
    P.drawHideTile(100, 100, T2, 1, 'crate', 5);
    const di = rec.calls.filter(function (c) { return c[0] === 'drawImage'; });
    ok(di.length && di[0][5] < T2 * 1.06, '木箱堆高度壓在 1 格出頭（' +
      (di[0][5] / T2).toFixed(2) + ' 格，v4.40 是 1.83）');
    P.HideArt.get = realGet;
  }

  // 影子淡一階
  {
    const realGet = P.HideArt.get;
    P.HideArt.get = function () { return env.fakeImg(176, 148); };
    rec.calls.length = 0; rec.sets.length = 0;
    P.drawHideTile(100, 100, T2, 1, 'bush', 5);
    const fills = rec.sets.filter(function (s2) { return s2[0] === 'fillStyle'; })
      .map(function (s2) { return rgbaOf(s2[1]); }).filter(Boolean);
    const sh = fills.filter(function (c) { return c.a > 0 && c.a < .5; })[0];
    ok(!!sh && sh.a >= .18 && sh.a <= .26, '地面影子 alpha 0.18～0.26（v4.41 的 .115 太淡）',
      sh ? 'a=' + sh.a : 'none');
    P.HideArt.get = realGet;
  }

  // 單檔體積：五張合計不能比 v4.40 更大（單檔只剩 ~100KB 額度）
  const total = Object.keys(P.HIDE_ART).reduce(function (n, k) { return n + P.HIDE_ART[k].u.length; }, 0);
  ok(total < 70000, '五張 base64 合計 < 70KB（省單檔空間）', (total / 1024).toFixed(1) + ' KB');
}

// ==================================================================
console.log('\n=== 2. 推車投擲：硬上限 1／2／3 格 ===');
P.settings.count = 4;
P.Battle.resetSlots(); P.startBattle(); G.state = 'play';
let me = G.players[0];
function putCart(x, y) {
  G.players.forEach(function (p) { p.cart = false; });
  me.cart = true; me.alive = true;
  me.x = x * T + T / 2; me.y = y * T + T / 2;
  me.cartCd = 0; me.cartCharge = 0; me.cartDir = null;
  return me;
}
function clearGrid() {
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.grid[y][x] = 0;
}
{
  const r = P.CART_LV.map(function (l) { return l.reach; });
  ok(r.join('/') === '1/2/3', '三段集氣距離 = 1／2／3 格（舊 3／6／10）', r.join(' / '));
  ok(P.CART_LV[0].name === '近 1 格' && P.CART_LV[1].name === '中 2 格' && P.CART_LV[2].name === '遠 3 格',
    'UI 標示跟著改（近 1 格／中 2 格／遠 3 格）');
  ok(!/reach \+ THROW_RANGE/.test(src), '「reach + 16 格」的超飛迴圈已移除');
}

console.log('\n--- 2a. 空曠地：丟多遠就是幾格 ---');
clearGrid();
{
  putCart(6, 0);
  const l = [0, 1, 2].map(function (i) { return P.cartPickLanding(me, i); });
  ok(l.every(Boolean), '三段都有落點');
  ok(l[0].dist === 1 && l[1].dist === 2 && l[2].dist === 3, '集氣 1／2／3 → 丟 1／2／3 格',
    l.map(function (x) { return x.dist; }).join(' / '));
  ok(l[2] && l[2].y === 3, '最遠就是第 3 格（不會再多）', l[2] && l[2].y);
}

console.log('\n--- 2b. 對戰地圖：每個外圈格 × 三段集氣，全部都不超過 3 格 ---');
{
  // 推車只出現在對戰（經典棋盤地圖）→ 先重開一場對戰，用真的地圖跑一輪
  G.bombs = []; G.flames = [];
  P.Battle.resetSlots(); P.startBattle(); G.state = 'play';
  me = G.players[0];
  let maxD = 0, bad = 0, nulls = 0, softs = 0, walls = 0, n = 0;
  const spots = [];
  for (let x = 1; x < G.cols - 1; x++) { spots.push([x, 0]); spots.push([x, G.rows - 1]); }
  for (let y = 1; y < G.rows - 1; y++) { spots.push([0, y]); spots.push([G.cols - 1, y]); }
  spots.forEach(function (sp) {
    putCart(sp[0], sp[1]);
    for (let lv = 0; lv < 3; lv++) {
      const land = P.cartPickLanding(me, lv);
      n++;
      if (!land) { nulls++; continue; }
      const d = Math.abs(land.x - sp[0]) + Math.abs(land.y - sp[1]);
      maxD = Math.max(maxD, d);
      if (d > 3) bad++;
      if (d < 1) bad++;
      if (land.onWall) walls++;                        // v4.42：落在石牆上是允許的（丟到牆上）
      if (land.onSoft) softs++;
    }
  });
  ok(bad === 0, '外圈 ' + spots.length + ' 個位置 × 3 段：沒有一次超過 3 格', 'bad=' + bad);
  ok(walls > 0, '有些位置就是「把炸彈丟到石牆上」（' + walls + ' 次）');
  ok(maxD <= 3, '最遠距離 = ' + maxD + ' 格（硬上限 3）');
  ok(nulls === 0, '對戰地圖上不會「按了沒反應」（0 次丟不出去）', nulls + '/' + n);
  ok(softs > 0, '有些位置是「砸在軟磚上」（' + softs + ' 次）');
}

console.log('\n--- 2b2. 厚牆地形：直接丟到牆上（不會穿牆、也不會飛更遠） ---');
{
  clearGrid();
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    G.grid[y][x] = (x === 0 || y === 0 || x === G.cols - 1 || y === G.rows - 1) ? 1
      : (x <= 4 ? 1 : 0);
  }
  putCart(2, 0);
  const land = P.cartPickLanding(me, 2);
  ok(!!land && land.y === 3 && land.onWall === true, '前面 3 格全是石牆 → 丟到第 3 格牆上',
    land && (land.y + ' onWall=' + land.onWall));
  G.bombs = []; me.cartCd = 0;
  ok(P.cartThrowBomb(me, 2) === true, '投擲回傳 true');
  ok(G.bombs.length === 1 && G.bombs[0].onWall === true, '生了一顆在牆上的炸彈');
  ok(me.cartCd > 0, '進入冷卻', me.cartCd);
  // 目標格已經有炸彈（而且已經落地）→ 自動退一格
  G.bombs.length = 0;
  G.bombs.push({ cx: 2, cy: 3, px: 0, py: 0, timer: 2, power: 1, owner: me, seed: 1,
    remoteArmed: false, mine: false, moving: null, flying: null, held: false, age: 1 });
  const back = P.cartPickLanding(me, 2);
  ok(!!back && back.dist === 2, '第 3 格已經有炸彈 → 自動退到第 2 格',
    back && back.dist);
}

console.log('\n--- 2c. 預告落點 = 實際落點 ---');
clearGrid();
{
  putCart(6, 0);
  for (let lv = 0; lv < 3; lv++) {
    G.bombs = [];
    const land = P.cartPickLanding(me, lv);
    me.cartCd = 0;
    const thrown = P.cartThrowBomb(me, lv);
    const b = G.bombs[G.bombs.length - 1];
    ok(thrown && b && land && b.cx === land.x && b.cy === land.y,
      '集氣 ' + (lv + 1) + '：預告格與炸彈落點一致',
      land ? land.x + ',' + land.y : '-');
  }
}

console.log('\n--- 2d. 3 格全是石牆 → 丟在第 3 格牆上（不會生在中間格） ---');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y <= 3; y++) G.grid[y][6] = 1;
  G.bombs = [];
  const thrown = P.cartThrowBomb(me, 2);
  ok(thrown, '丟得出去');
  const b = G.bombs[G.bombs.length - 1];
  ok(b && b.cy === 3 && b.onWall === true, '炸彈在第 3 格牆上',
    b && ('y=' + b.cy + ' onWall=' + b.onWall));
}

console.log('\n--- 2e. 砸在軟磚上 → 引爆時把那塊磚炸掉 ---');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y <= 3; y++) G.grid[y][6] = 2;
  G.bombs = [];
  P.cartThrowBomb(me, 2);
  const b = G.bombs[G.bombs.length - 1];
  ok(b && b.onSoft === true, '炸彈標記 onSoft');
  ok(b && b.cy === 3, '停在最遠那塊磚上', b && b.cy);
  if (b) {
    G.flames = [];
    P.explodeBomb(b);
    ok(G.grid[3][6] === 0, '引爆後那一格軟磚消失（不會留一顆炸彈卡在磚裡）', G.grid[3][6]);
  }
}

console.log('\n--- 2f. 飛行時間不會因為距離長而拖太久 ---');
clearGrid();
{
  putCart(6, 0);
  G.bombs = [];
  P.cartThrowBomb(me, 2);
  const b = G.bombs[G.bombs.length - 1];
  ok(b && b.flying && b.flying.dur <= 1.15, '最遠 3 格的飛行時間 ≤ 1.15 秒',
    b && b.flying && b.flying.dur.toFixed(2));
  ok(b && b.flying.path.length <= 4, '路徑節點 ≤ 4（推車 + 3 格）', b && b.flying.path.length);
}

// ==================================================================
console.log('\n=== 3. 版號與快取 ===');
{
  // 版號一律動態比對（不寫死，改版才不會假紅）
  ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正常', P.VERSION);
  const top = P.VERSION_LOG[0];
  ok(top.v === P.VERSION, '版本紀錄第一筆同步', top.v);
  ok(top.now === true, '第一筆是 now');
  ok(P.VERSION_LOG[1].now !== true, '第二筆已取消 now', P.VERSION_LOG[1].now);
  ok(top.items.length >= 5, '本版寫了 ' + top.items.length + ' 條更新');
  const swv = 'v' + P.VERSION + '.0';
  ok(fs.readFileSync(__dirname + '/../sw.js', 'utf8').indexOf(swv) >= 0, '主檔 sw.js = ' + swv);
  ok(fs.readFileSync(__dirname + '/../../public/sw.js', 'utf8').indexOf(swv) >= 0, 'public/sw.js = ' + swv);
  ok(fs.readFileSync(__dirname + '/../../bomberman-online/public/sw.js', 'utf8').indexOf(swv) >= 0,
    'bomberman-online/public/sw.js = ' + swv);
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v4.41：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
