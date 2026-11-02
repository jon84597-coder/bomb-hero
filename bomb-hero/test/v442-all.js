// v4.42 三項需求的回歸測試：
//   1. 藏人物件：飽和度／對比拉回來（v4.41 太淡太扁），影子加深
//   2. 推車投擲 1／2／3 格 —— 可以丟到牆上（炸彈坐在牆頂）
//   3. 版號與快取
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
console.log('=== 1. 藏人物件：顏色／明暗回到「看得出來是什麼」 ===');
{
  const stats = JSON.parse(fs.readFileSync(__dirname + '/../art/hides/_stats.json', 'utf8'));
  const kinds = ['bush', 'hut', 'rock', 'jar', 'crate'];
  ok(kinds.every(function (k) { return !!stats[k]; }), '五張都有量測資料（_stats.json）');
  const sats = kinds.map(function (k) { return stats[k].sat; });
  ok(sats.filter(function (v) { return v >= 70; }).length >= 4,
    '至少四張的飽和度 ≥ 70（v4.41 偏灰）', sats.join(' / '));
  ok(kinds.every(function (k) { return stats[k].p5 <= 95; }),
    '每張都有真正的暗部（p5 ≤ 95，不是一片死白）',
    kinds.map(function (k) { return stats[k].p5; }).join(' / '));
  ok(kinds.every(function (k) { return stats[k].lum >= 95 && stats[k].lum <= 175; }),
    '整體亮度仍在中間調（95～175，不會像 v4.40 那麼黑）',
    kinds.map(function (k) { return stats[k].lum; }).join(' / '));

  ok(P.HIDE_ART_SCALE === 1.14, '寬度 1.14 格（不變）', P.HIDE_ART_SCALE);
  ok(P.HIDE_ART_MAXH === 1.26, '高度上限放寬到 1.26 格（細高的陶甕不再被壓成小不點）', P.HIDE_ART_MAXH);
  ok(!/HIDE_ART_MAXH = 1\.10/.test(src), '舊的 1.10 已移除');
}

console.log('\n=== 1b. 場上尺寸與地面影子 ===');
{
  const T2 = 46;
  const kinds = ['bush', 'hut', 'rock', 'jar', 'crate'];
  const realGet = P.HideArt.get;
  kinds.forEach(function (k) {
    P.HideArt.get = function (kk) { return kk === k ? env.fakeImg(176, 176) : null; };
    rec.calls.length = 0; rec.sets.length = 0;
    P.drawHideTile(100, 100, T2, 1, k, 5);
    const di = rec.calls.filter(function (c) { return c[0] === 'drawImage'; });
    const w = di.length ? di[0][4] : 0, h = di.length ? di[0][5] : 0;
    ok(w <= T2 * 1.141 && w >= T2 * 0.94, k + ' 寬度 0.94～1.14 格（' + (w / T2).toFixed(2) + ' 格）');
    ok(h <= T2 * 1.261, k + ' 高不超過 1.26 格（' + (h / T2).toFixed(2) + ' 格）');
    P.HideArt.get = realGet;
  });
  // 影子：v4.41 的 .115 太淡 → 影子要更深、更寬
  P.HideArt.get = function () { return env.fakeImg(176, 148); };
  rec.calls.length = 0; rec.sets.length = 0;
  P.drawHideTile(100, 100, T2, 1, 'bush', 5);
  const fills = rec.sets.filter(function (s2) { return s2[0] === 'fillStyle'; })
    .map(function (s2) { return rgbaOf(s2[1]); }).filter(Boolean);
  const sh = fills.filter(function (c) { return c.a > 0 && c.a < .5; })[0];
  ok(!!sh && sh.a >= .18 && sh.a <= .26, '地面影子 alpha 0.18～0.26（v4.41 是 .115）',
    sh ? 'a=' + sh.a : 'none');
  P.HideArt.get = realGet;
}

// ==================================================================
console.log('\n=== 2. 推車投擲：1／2／3 格都能丟到牆上 ===');
P.settings.count = 4;
P.Battle.resetSlots(); P.startBattle(); G.state = 'play';
let me = G.players[0];
const T3 = G.T;
function putCart(x, y) {
  G.players.forEach(function (p) { p.cart = false; });
  me.cart = true; me.alive = true;
  me.x = x * T3 + T3 / 2; me.y = y * T3 + T3 / 2;
  me.cartCd = 0; me.cartCharge = 0; me.cartDir = null;
  return me;
}
function clearGrid() {
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.grid[y][x] = 0;
}

{
  // 三種距離各放一面石牆在正前方該距離上 → 都必須丟得到
  [1, 2, 3].forEach(function (d, i) {
    clearGrid();
    putCart(6, 0);
    G.grid[d][6] = 1;
    const land = P.cartPickLanding(me, i);
    ok(!!land && land.y === d, '集氣 ' + (i + 1) + '（' + (i + 1) + ' 格）→ 石牆在正前方 → 丟得上去',
      land && (land.x + ',' + land.y));
    ok(!!land && land.onWall === true, '集氣 ' + (i + 1) + ' → 標記 onWall（炸彈坐在牆頂）');
    ok(!!land && land.dist === d, '集氣 ' + (i + 1) + ' → 距離就是 ' + d + ' 格', land && land.dist);
  });
}

console.log('\n--- 2a. 丟得出去：炸彈真的在牆上、而且會進入冷卻 ---');
clearGrid();
{
  putCart(6, 0);
  G.grid[2][6] = 1;                       // 第 2 格石牆
  G.bombs = []; me.cartCd = 0;
  ok(P.cartThrowBomb(me, 1) === true, '丟得出去');
  const b = G.bombs[G.bombs.length - 1];
  ok(b && b.cx === 6 && b.cy === 2, '炸彈在第 2 格（牆上）', b && (b.cx + ',' + b.cy));
  ok(b && b.onWall === true, '炸彈帶 onWall 標記');
  ok(me.cartCd > 0, '進入冷卻', me.cartCd);
}

console.log('\n--- 2b. 牆上的炸彈畫在牆頂（往上抬 0.22 格） ---');
{
  function bombY(onWall) {
    const b = {
      cx: 6, cy: 2, px: 6 * T3 + T3 / 2, py: 2 * T3 + T3 / 2, timer: 2, power: 1,
      owner: null, seed: 0, remoteArmed: false, mine: false, moving: null, flying: null,
      held: false, age: 1, onWall: onWall
    };
    rec.calls.length = 0;
    P.drawBomb(b, T3);
    const tr = rec.calls.filter(function (c) { return c[0] === 'translate'; })[0];
    return tr ? tr[2] : null;
  }
  const yFloor = bombY(false), yWall = bombY(true);
  ok(yFloor != null && yWall != null, '兩個都有畫出來');
  ok(Math.abs((yFloor - yWall) - T3 * .22) < .01, '牆上的炸彈比地上的高 0.22 格',
    (yFloor - yWall).toFixed(1) + 'px');
}

console.log('\n--- 2c. 落在空地時不會被抬高（不影響原本手感） ---');
clearGrid();
{
  putCart(6, 0);
  const land = P.cartPickLanding(me, 2);
  ok(!!land && land.onWall === false && land.y === 3, '空地落點 onWall=false');
}

console.log('\n--- 2d. 牆上的炸彈引爆：只炸自己那一格，不會穿牆 ---');
clearGrid();
{
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.grid[y][x] = 1;
  G.flames = []; G.bombs = [];
  const b = {
    cx: 5, cy: 4, px: 0, py: 0, timer: .1, power: 1, owner: me, seed: 1,
    remoteArmed: false, mine: false, moving: null, flying: null, held: false, age: 1, onWall: true
  };
  G.bombs.push(b);
  P.explodeBomb(b);
  ok(G.flames.length === 1, '四面都是石牆 → 只有爆心那一格有火', G.flames.length);
  ok(G.bombs.indexOf(b) < 0, '炸彈已被移除');
}

console.log('\n--- 2e. 丟在軟磚上一樣砸得碎（onSoft 還在） ---');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y <= 3; y++) G.grid[y][6] = 2;
  G.bombs = []; G.flames = []; me.cartCd = 0;
  ok(P.cartThrowBomb(me, 2) === true, '丟得出去');
  const b = G.bombs[G.bombs.length - 1];
  ok(b && b.cy === 3 && b.onSoft === true, '落在第 3 塊軟磚上（onSoft）', b && b.cy);
  P.explodeBomb(b);
  ok(G.grid[3][6] === 0, '引爆時把那塊軟磚炸掉了');
}

console.log('\n--- 2f. 不會再飛超過 3 格（v4.41 的硬上限還在） ---');
{
  let maxD = 0, walls = 0, n = 0;
  G.bombs = []; G.flames = [];
  P.Battle.resetSlots(); P.startBattle(); G.state = 'play';
  me = G.players[0];
  const spots = [];
  for (let x = 1; x < G.cols - 1; x++) { spots.push([x, 0]); spots.push([x, G.rows - 1]); }
  for (let y = 1; y < G.rows - 1; y++) { spots.push([0, y]); spots.push([G.cols - 1, y]); }
  spots.forEach(function (sp) {
    putCart(sp[0], sp[1]);
    for (let lv = 0; lv < 3; lv++) {
      const land = P.cartPickLanding(me, lv);
      n++;
      if (!land) return;
      const d = Math.abs(land.x - sp[0]) + Math.abs(land.y - sp[1]);
      maxD = Math.max(maxD, d);
      if (land.onWall) walls++;
    }
  });
  ok(maxD <= 3, '對戰地圖外圈 × 3 段：最遠還是 3 格', maxD + ' 格');
  ok(walls > 0, '其中有些就是丟在牆上（' + walls + '/' + n + '）');
}

// ==================================================================
console.log('\n=== 3. 版號／快取同步 ===');
{
  ok(P.VERSION_LOG[0].v === P.VERSION, 'VERSION_LOG 第一筆 = VERSION', P.VERSION);
  ok(P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆標 now');
  const v = 'v' + P.VERSION + '.0';
  ok(src.indexOf('const VERSION = \'' + P.VERSION + '\'') >= 0, 'index.html 版號一致');
  ['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (rel) {
    const f = path.join(__dirname, rel);
    if (!fs.existsSync(f)) { ok(true, rel + ' 不存在（跳過）'); return; }
    const t = fs.readFileSync(f, 'utf8');
    ok(t.indexOf(v) >= 0, rel + ' = ' + v);
  });
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v4.42：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
