# -*- coding: utf-8 -*-
"""v4.42 測試改寫：舊基線還在驗 v4.41 的規則（撞牆停在牆前 / 高 1.10 格 / 影子 .115），逐條改成新規格。"""

import io
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test')


def patch(name, pairs):
    p = os.path.join(ROOT, name)
    s = io.open(p, encoding='utf-8').read()
    for old, new in pairs:
        n = s.count(old)
        assert n == 1, '%s：找到 %d 次 → %r' % (name, n, old[:60])
        s = s.replace(old, new)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('OK', name)


# ------------------------------------------------------------------ v438-cart
patch('v438-cart.js', [
    ("""console.log('\\n=== 2. v4.41：撞到硬牆就停住（不再一格一格彈過牆） ===');
clearGrid();
{
  putCart(6, 0);
  G.grid[2][6] = 1;      // 第 2 格硬牆
  const land = P.cartPickLanding(me, 2);       // 遠 3 格
  ok(!!land, '有落點', land && (land.x + ',' + land.y));
  ok(land && land.x === 6, '同一條垂直線上（沒偏掉）', land && land.x);
  ok(land && land.y === 1, '擋在牆前 → 落在第 1 格（不會翻過石牆）', land && land.y);
  ok(land && land.path.length === 2, '飛行路徑只有「推車 → 落點」', land && land.path.length);
}""",
     """console.log('\\n=== 2. v4.42：可以丟到 1／2／3 格的牆上 ===');
clearGrid();
{
  putCart(6, 0);
  G.grid[1][6] = 1;                            // 第 1 格石牆
  const l1 = P.cartPickLanding(me, 0);         // 近 1 格
  ok(l1 && l1.x === 6 && l1.y === 1, '第 1 格是石牆 → 丟到牆上', l1 && (l1.x + ',' + l1.y));
  ok(l1 && l1.onWall === true, '標記 onWall（炸彈坐在牆頂）', l1 && l1.onWall);

  G.grid[2][6] = 1;                            // 第 2 格也是石牆
  const l2 = P.cartPickLanding(me, 1);         // 中 2 格
  ok(l2 && l2.y === 2 && l2.onWall === true, '第 2 格是石牆 → 丟到第 2 格的牆上',
    l2 && (l2.y + ' onWall=' + l2.onWall));

  const l3 = P.cartPickLanding(me, 2);         // 遠 3 格（第 3 格是空地）
  ok(l3 && l3.y === 3 && !l3.onWall, '第 3 格是空地 → 越過兩格牆落在空地', l3 && l3.y);
  ok(l3 && l3.path.length === 4, '飛行路徑 4 格（推車 → 第 3 格）', l3 && l3.path.length);
}"""),
    ("""console.log('\\n=== 3b. 硬牆在第一格 → 3 格內全沒得放，直接丟不出去 ===');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y <= 3; y++) G.grid[y][6] = 1;
  ok(!P.cartPickLanding(me, 2), '沒有落點（不會飛到牆後面）');
}""",
     """console.log('\\n=== 3b. 3 格全是石牆 → 丟到最遠那格牆上 ===');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y <= 3; y++) G.grid[y][6] = 1;
  const land = P.cartPickLanding(me, 2);
  ok(!!land && land.y === 3 && land.onWall === true, '落在第 3 格石牆上',
    land && (land.y + ' onWall=' + land.onWall));
}"""),
    ("""console.log('\\n=== 6. 射線上沒有空地 → 不亂丟 ===');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y < G.rows - 1; y++) G.grid[y][6] = 1;
  G.bombs = [];
  const thrown = P.cartThrowBomb(me, 2);
  ok(!thrown, '整條射線都是牆 → 不丟（不會憑空出現在牆裡）');
  ok(G.bombs.length === 0, '沒有產生炸彈', G.bombs.length);
}""",
     """console.log('\\n=== 6. 射線全是牆 → 丟到第 3 格牆上，不會一直往前飛 ===');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y < G.rows - 1; y++) G.grid[y][6] = 1;
  G.bombs = [];
  const thrown = P.cartThrowBomb(me, 2);
  ok(thrown, '整條射線都是牆 → 仍丟得出去');
  const b = G.bombs[G.bombs.length - 1];
  ok(G.bombs.length === 1 && b && b.cy === 3 && b.onWall === true,
    '炸彈停在第 3 格、標 onWall', b && (b.cy + ' onWall=' + b.onWall));
}"""),
])

# ------------------------------------------------------------------- v439-all
patch('v439-all.js', [
    ("""  const land = P.cartPickLanding(cart, 2);           // 遠 3 格
  ok(!!land && land.y === 1, '前面是石牆 → 停在第 1 格（' + (land && land.y) + '）');
  ok(!!land && land.path.every(function (n) { return n.w !== 1; }), '路徑裡沒有牆節點（不再彈過牆）');
  ok(!!land && land.path.length === 2, '路徑只有「推車 → 落點」（' + (land && land.path.length) + ' 格）');""",
     """  const land = P.cartPickLanding(cart, 2);           // 遠 3 格（第 3 格是石牆）
  ok(!!land && land.y === 3, '兩格牆都越過，丟到第 3 格（' + (land && land.y) + '）');
  ok(!!land && land.onWall === true, '第 3 格是石牆 → 標記 onWall');
  ok(!!land && land.path.filter(function (n) { return n.w === 1; }).length === 2,
    '路徑裡「牆的兩格」都標到了（w=1）');
  ok(!!land && land.path.length === 4, '路徑 4 格（推車 → 第 3 格）', land && land.path.length);"""),
])

# ------------------------------------------------------------------- v440-all
patch('v440-all.js', [
    ("""    ok(w <= T2 * 1.141 && w >= T2 * 1.05, '寬只比一格多一點點（1.05～1.14 格）', (w / T2).toFixed(2) + ' 格');
    ok(h <= T2 * 1.10 + .01, '高不超過 1.10 格（不會蓋掉上面那一格）', (h / T2).toFixed(2) + ' 格');""",
     """    ok(w <= T2 * 1.141 && w >= T2 * 0.94, '寬度落在 0.94～1.14 格（細高的陶甕才不會被壓成小不點）',
      (w / T2).toFixed(2) + ' 格');
    ok(h <= T2 * 1.261, '高不超過 1.26 格（不會蓋掉上面那一格）', (h / T2).toFixed(2) + ' 格');"""),
    ("""  ok(src.indexOf('const HIDE_ART_SCALE = 1.14;') >= 0, '尺寸是常數（1.14 格）');""",
     """  ok(src.indexOf('const HIDE_ART_SCALE = 1.14;') >= 0, '尺寸是常數（1.14 格）');
  ok(src.indexOf('const HIDE_ART_MAXH = 1.26;') >= 0, '高度上限是常數（1.26 格）');"""),
])

# ------------------------------------------------------------------- v441-all
patch('v441-all.js', [
    ("""  ok(P.HIDE_ART_MAXH === 1.10, '高度硬上限 = 1.10 格（舊 1.55）', P.HIDE_ART_MAXH);""",
     """  ok(P.HIDE_ART_MAXH === 1.26, '高度上限 = 1.26 格（v4.42 放寬，細高物件才不會被壓扁）', P.HIDE_ART_MAXH);"""),
    ("""  ok(asps.every(function (a) { return a >= .95; }), '五種都是「寬 ≥ 高」的矮胖比例',
    asps.map(function (a) { return a.toFixed(2); }).join(' / '));
  ok(asps.every(function (a) { return a < 1.35; }), '也沒有扁成一條線（asp < 1.35）',
    asps.map(function (a) { return a.toFixed(2); }).join(' / '));""",
     """  ok(asps.every(function (a) { return a >= .75; }), '沒有瘦成一條棍（asp ≥ 0.75）',
    asps.map(function (a) { return a.toFixed(2); }).join(' / '));
  ok(asps.every(function (a) { return a < 1.95; }), '也沒有扁成一條線（asp < 1.95，石堆最扁）',
    asps.map(function (a) { return a.toFixed(2); }).join(' / '));"""),
    ("""    ok(w <= T2 * 1.141 && w >= T2 * 1.0, k + ' 寬只比一格多一點（' + (w / T2).toFixed(2) + ' 格）');
    ok(h <= T2 * 1.101, k + ' 高不超過 1.10 格（' + (h / T2).toFixed(2) + ' 格）');""",
     """    ok(w <= T2 * 1.141 && w >= T2 * 0.94, k + ' 寬度 0.94～1.14 格（' + (w / T2).toFixed(2) + ' 格）');
    ok(h <= T2 * 1.261, k + ' 高不超過 1.26 格（' + (h / T2).toFixed(2) + ' 格）');"""),
    ("""  ok(P.HIDE_ART.crate.asp >= 1.3, '木箱堆是「橫躺的兩箱並排」（asp ' + P.HIDE_ART.crate.asp.toFixed(2) + '）',""",
     """  ok(P.HIDE_ART.crate.asp >= 1.1, '木箱堆仍是「橫躺的兩箱並排」（asp ' + P.HIDE_ART.crate.asp.toFixed(2) + '）',"""),
    ("""    ok(di.length && di[0][5] < T2 * 1.11, '木箱堆高度被壓在 1.1 格內（' +
      (di[0][5] / T2).toFixed(2) + ' 格，舊 1.83）');""",
     """    ok(di.length && di[0][5] < T2 * 1.06, '木箱堆高度壓在 1 格出頭（' +
      (di[0][5] / T2).toFixed(2) + ' 格，v4.40 是 1.83）');"""),
    ("""    ok(!!sh && sh.a <= .15, '地面影子 alpha ≤ .15（舊 .24）', sh ? 'a=' + sh.a : 'none');""",
     """    ok(!!sh && sh.a >= .18 && sh.a <= .26, '地面影子 alpha 0.18～0.26（v4.41 的 .115 太淡）',
      sh ? 'a=' + sh.a : 'none');"""),
    ("""  let maxD = 0, bad = 0, nulls = 0, softs = 0, n = 0;""",
     """  let maxD = 0, bad = 0, nulls = 0, softs = 0, walls = 0, n = 0;"""),
    ("""      if (d > 3) bad++;
      if (d < 1) bad++;
      if (G.grid[land.y][land.x] === 1) bad++;         // 不能落在石牆上
      if (land.onSoft) softs++;""",
     """      if (d > 3) bad++;
      if (d < 1) bad++;
      if (land.onWall) walls++;                        // v4.42：落在石牆上是允許的（丟到牆上）
      if (land.onSoft) softs++;"""),
    ("""  ok(bad === 0, '外圈 ' + spots.length + ' 個位置 × 3 段：沒有一次超過 3 格、也沒有落在石牆上', 'bad=' + bad);""",
     """  ok(bad === 0, '外圈 ' + spots.length + ' 個位置 × 3 段：沒有一次超過 3 格', 'bad=' + bad);
  ok(walls > 0, '有些位置就是「把炸彈丟到石牆上」（' + walls + ' 次）');"""),
    ("""console.log('\\n--- 2b2. 有機地形（厚牆）丟不出去時要「安靜失敗」 ---');
{
  // 單人／有機地形外圈可能整排石牆 → 允許丟不出去，但絕不能把炸彈塞進石頭裡
  clearGrid();
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    G.grid[y][x] = (x === 0 || y === 0 || x === G.cols - 1 || y === G.rows - 1) ? 1
      : (x <= 4 ? 1 : 0);
  }
  putCart(2, 0);
  const land = P.cartPickLanding(me, 2);
  ok(land === null, '前面 3 格都是石牆 → 沒有落點（不會穿牆）');
  G.bombs = [];
  ok(P.cartThrowBomb(me, 2) === false, '投擲回傳 false');
  ok(G.bombs.length === 0 && me.cartCd === 0, '沒有生炸彈、沒有扣冷卻');
  ok(typeof P.cartThrowBomb === 'function', '（對照）函式仍在');
}""",
     """console.log('\\n--- 2b2. 厚牆地形：直接丟到牆上（不會穿牆、也不會飛更遠） ---');
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
  // 只有「那格已經有炸彈」才會丟不出去
  ok(P.cartPickLanding(me, 2) && P.cartPickLanding(me, 2).dist === 2,
    '同一格有炸彈 → 自動退一格（第 2 格）');
}"""),
    ("""console.log('\\n--- 2d. 丟不出去時不會偷扣冷卻、不會生炸彈 ---');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y <= 3; y++) G.grid[y][6] = 1;
  G.bombs = [];
  const thrown = P.cartThrowBomb(me, 2);
  ok(!thrown, '3 格內全是石牆 → 丟不出去');
  ok(G.bombs.length === 0, '沒有偷偷生成炸彈');
  ok(me.cartCd === 0, '沒有白扣冷卻（可以馬上換位置再丟）', me.cartCd);
}""",
     """console.log('\\n--- 2d. 3 格全是石牆 → 丟在第 3 格牆上（不會生在中間格） ---');
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
}"""),
])

# ------------------------------------------------------------------ verify-v17
patch('verify-v17.js', [
    ("""let wall17 = false;
for (let k = 1; k < dist17; k++) {
  if (G.grid[cartCy + vec17.y * k][cartCx + vec17.x * k] === 1) wall17 = true;
}
ok(!wall17, '不會穿過石牆（落點前面沒有石牆）');
ok(G.grid[b.cy][b.cx] !== 1, '不會丟進石頭裡');""",
     """ok(b.onWall === (G.grid[b.cy][b.cx] === 1), '牆上的落點有標 onWall（畫在牆頂）',
  'cell=' + G.grid[b.cy][b.cx] + ' onWall=' + b.onWall);
ok(dist17 <= 3, '距離不超過 3 格（石牆不再讓它多飛）', dist17);"""),
])

# ------------------------------------------------------------------ verify-v18
patch('verify-v18.js', [
    ("""// v4.41：射線上有石牆 → 停在牆前，不再「一格一格彈過牆」
freshBattle();
clearArea(1, 1, G.cols - 2, G.rows - 2);
me.cart = true;
me.x = T / 2; me.y = T * 2 + T / 2;                     // 最左邊 → 只能往右射
G.grid[2][2] = 1;                                       // 第 2 格是石牆
G.bombs.length = 0;
ok(BH.cartThrowBomb(me, 2) === true && G.bombs.length === 1, '前方有石牆仍丟得出去（停在牆前）');
const fb = G.bombs[G.bombs.length - 1];
ok(fb && fb.cx === 1 && fb.cy === 2, '落點停在石牆前面那一格（' +
  (fb ? fb.cx + ',' + fb.cy : '-') + '）');
ok(fb && fb.flying && fb.flying.path.length === 2, '路徑只有推車 → 落點（' +
  (fb && fb.flying ? fb.flying.path.length : 0) + ' 格，沒有彈跳）');

// 整個內場都被牆塞滿 → 丟不出去也不當機
clearArea(0, 0, G.cols - 1, G.rows - 1);
for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.grid[y][x] = 1;
ok(BH.cartThrowBomb(me) === false, '全場都是牆時安全回傳 false（不當機）');
me.cart = false;""",
     """// v4.42：石牆也能丟（炸彈坐在牆頂），不會被牆擋在半路
freshBattle();
clearArea(1, 1, G.cols - 2, G.rows - 2);
me.cart = true;
me.x = T / 2; me.y = T * 2 + T / 2;                     // 最左邊 → 只能往右射
G.grid[2][2] = 1;                                       // 第 2 格是石牆
G.bombs.length = 0;
ok(BH.cartThrowBomb(me, 0) === true && G.bombs.length === 1, '第 1 格是石牆 → 照樣丟得出去');
const fb = G.bombs[G.bombs.length - 1];
ok(fb && fb.cx === 1 && fb.cy === 2, '落點就在石牆那一格（' +
  (fb ? fb.cx + ',' + fb.cy : '-') + '）');
ok(fb && fb.onWall === true, '標記 onWall（炸彈畫在牆頂）');
ok(fb && fb.flying && fb.flying.path.length === 2, '路徑只有推車 → 落點（' +
  (fb && fb.flying ? fb.flying.path.length : 0) + ' 格）');

// 整個內場都被牆塞滿 → 丟在牆上，不當機
clearArea(0, 0, G.cols - 1, G.rows - 1);
for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.grid[y][x] = 1;
G.bombs.length = 0;
ok(BH.cartThrowBomb(me) === true && G.bombs.length === 1, '全場都是牆時仍丟得出去（落在牆上，不當機）');
me.cart = false;"""),
])

# ------------------------------------------------------------------ verify-v61
patch('verify-v61.js', [
    ("""     /const HIDE_ART_SCALE = 1\\.14;/.test(css) && /const HIDE_ART_MAXH = 1\\.10;/.test(css),
    '躲點用美術貼圖畫（寬 1.14 格、高上限 1.10 格）');""",
     """     /const HIDE_ART_SCALE = 1\\.14;/.test(css) && /const HIDE_ART_MAXH = 1\\.26;/.test(css),
    '躲點用美術貼圖畫（寬 1.14 格、高上限 1.26 格）');"""),
])

print('done')
