# -*- coding: utf-8 -*-
"""v4.43：推車「撞牆會彈到下一格、落地才停」→ 更新舊測試的預期。"""
import io


def patch(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, (path, s.count(old), old[:60])
        s = s.replace(old, new)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
    print('  ok', path)


# ---------------------------------------------------------------- v438-cart
patch('test/v438-cart.js', [
("""console.log('\\n=== 2. v4.42：可以丟到 1／2／3 格的牆上 ===');
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
""",
"""console.log('\\n=== 2. v4.43：丟到牆上 → 往同方向彈一格，落地就停 ===');
clearGrid();
{
  putCart(6, 0);
  G.grid[1][6] = 1;                            // 第 1 格石牆
  const l1 = P.cartPickLanding(me, 0);         // 近 1 格
  ok(l1 && l1.x === 6 && l1.y === 2, '第 1 格是石牆 → 彈過牆、落在第 2 格',
    l1 && (l1.x + ',' + l1.y));
  ok(l1 && l1.onWall === false && l1.bounce === 1, '落地（不再停在牆頂）· 彈了 1 格',
    l1 && ('onWall=' + l1.onWall + ' bounce=' + l1.bounce));

  G.grid[2][6] = 1;                            // 第 2 格也是石牆
  const l2 = P.cartPickLanding(me, 1);         // 中 2 格
  ok(l2 && l2.y === 3 && l2.onWall === false && l2.bounce === 1,
    '第 2 格是石牆 → 連著牆一路彈到第 3 格',
    l2 && (l2.y + ' onWall=' + l2.onWall + ' bounce=' + l2.bounce));
"""),
("""console.log('\\n=== 3b. 3 格全是石牆 → 丟到最遠那格牆上 ===');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y <= 3; y++) G.grid[y][6] = 1;
  const land = P.cartPickLanding(me, 2);
  ok(!!land && land.y === 3 && land.onWall === true, '落在第 3 格石牆上',
    land && (land.y + ' onWall=' + land.onWall));
}""",
"""console.log('\\n=== 3b. 3 格全是石牆 → 彈到牆外的第 4 格 ===');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y <= 3; y++) G.grid[y][6] = 1;
  const land = P.cartPickLanding(me, 2);
  ok(!!land && land.y === 4 && land.onWall === false, '彈過三格牆、落在第 4 格',
    land && (land.y + ' onWall=' + land.onWall));
}"""),
("""  ok(G.bombs.length === 1 && b && b.cy === 3 && b.onWall === true,
    '炸彈停在第 3 格、標 onWall', b && (b.cy + ' onWall=' + b.onWall));""",
"""  ok(G.bombs.length === 1 && b && b.cy === 6 && b.onWall === true,
    '整排牆彈不出去 → 停在牆頂（第 6 格）', b && (b.cy + ' onWall=' + b.onWall));"""),
])

# ---------------------------------------------------------------- v439-all
patch('test/v439-all.js', [
("""  // v4.41：撞到石牆就停 → 路徑裡不會有「牆的那一格」，實際上也就不會再彈跳
  const cart = G.players[1];
  cart.cart = true; cart.alive = true;
  cart.x = 6 * T + T / 2; cart.y = 0 * T + T / 2;
  G.grid[2][6] = 1; G.grid[3][6] = 1;
  const land = P.cartPickLanding(cart, 2);           // 遠 3 格（第 3 格是石牆）
  ok(!!land && land.y === 3, '兩格牆都越過，丟到第 3 格（' + (land && land.y) + '）');
  ok(!!land && land.onWall === true, '第 3 格是石牆 → 標記 onWall');
  ok(!!land && land.path.filter(function (n) { return n.w === 1; }).length === 2,
    '路徑裡「牆的兩格」都標到了（w=1）');
  ok(!!land && land.path.length === 4, '路徑 4 格（推車 → 第 3 格）', land && land.path.length);""",
"""  // v4.43：第 2、3 格是石牆 → 集滿 3 格丟到牆上時會「彈過牆」，落在第 4 格
  const cart = G.players[1];
  cart.cart = true; cart.alive = true;
  cart.x = 6 * T + T / 2; cart.y = 0 * T + T / 2;
  G.grid[2][6] = 1; G.grid[3][6] = 1;
  const land = P.cartPickLanding(cart, 2);           // 遠 3 格（第 3 格是石牆）
  ok(!!land && land.y === 4, '兩格牆都彈過，落在第 4 格（' + (land && land.y) + '）');
  ok(!!land && land.onWall === false && land.bounce === 1, '落地了（彈 1 格）',
    land && ('onWall=' + land.onWall + ' bounce=' + land.bounce));
  ok(!!land && land.path.filter(function (n) { return n.w === 1; }).length === 2,
    '路徑裡「牆的兩格」都標到了（w=1）');
  ok(!!land && land.path.length === 5, '路徑 5 格（推車 → 第 4 格）', land && land.path.length);"""),
])

# ---------------------------------------------------------------- v441-all
patch('test/v441-all.js', [
("""      if (land.onWall) walls++;                        // v4.42：落在石牆上是允許的（丟到牆上）""",
"""      if (land.onWall) walls++;                        // v4.43：只剩「彈不出去」才會停在牆頂"""),
("""  ok(walls > 0, '有些位置就是「把炸彈丟到石牆上」（' + walls + ' 次）');
  ok(maxD <= 3, '最遠距離 = ' + maxD + ' 格（硬上限 3）');""",
"""  ok(walls >= 0 && walls <= n, '牆頂落點只在彈不出去時出現（' + walls + ' 次）');
  ok(maxD <= 3 + P.CART_BOUNCE_MAX, '最遠 = 集氣 3 格 + 彈跳 ' + P.CART_BOUNCE_MAX + ' 格上限',
    maxD + ' 格');"""),
("""  ok(!!land && land.y === 3 && land.onWall === true, '前面 3 格全是石牆 → 丟到第 3 格牆上',
    land && (land.y + ' onWall=' + land.onWall));""",
"""  ok(!!land && land.y === 4 && land.onWall === false, '前面 3 格全是石牆 → 彈到第 4 格落地',
    land && (land.y + ' onWall=' + land.onWall));"""),
("""  ok(b && b.cy === 3 && b.onWall === true, '炸彈在第 3 格牆上',
    b && ('y=' + b.cy + ' onWall=' + b.onWall));""",
"""  ok(b && b.cy === 4 && b.onWall === false, '炸彈彈到第 4 格（地上）',
    b && ('y=' + b.cy + ' onWall=' + b.onWall));"""),
])

# ---------------------------------------------------------------- verify-v17
patch('test/verify-v17.js', [
("""ok(onRay17 && dist17 >= 1 && dist17 <= want17, '落點在推車的垂直射線上，且不超過集氣距離（' + cartCx + ',' + cartCy +
  ' 往' + dn17 + ' → ' + b.cx + ',' + b.cy + '，' + dist17 + ' / ' + want17 + ' 格）');""",
"""ok(onRay17 && dist17 >= 1 && dist17 <= want17 + BH.CART_BOUNCE_MAX,
  '落點在推車的垂直射線上（集氣距離 + 最多彈跳 ' + BH.CART_BOUNCE_MAX + ' 格）' +
  '（' + cartCx + ',' + cartCy + ' 往' + dn17 + ' → ' + b.cx + ',' + b.cy + '，' + dist17 + ' / ' + want17 + ' 格）');"""),
])

# ---------------------------------------------------------------- verify-v18
patch('test/verify-v18.js', [
("""ok(fb && fb.cx === 2 && fb.cy === 2, '落點就在石牆那一格（' +
  (fb ? fb.cx + ',' + fb.cy : '-') + '）');
ok(fb && fb.onWall === true, '標記 onWall（炸彈畫在牆頂）');
ok(fb && fb.flying && fb.flying.path.length === 3, '路徑 3 格（推車 → 第 2 格牆）' +
  '（' + (fb && fb.flying ? fb.flying.path.length : 0) + ' 格）');""",
"""ok(fb && fb.cx === 3 && fb.cy === 2, '丟到石牆 → 彈一格，落在牆後的空地（' +
  (fb ? fb.cx + ',' + fb.cy : '-') + '）');
ok(fb && fb.onWall === false, '落地了（不再停在牆頂）');
ok(fb && fb.flying && fb.flying.path.length === 4, '路徑 4 格（推車 → 牆 → 彈到的空地）' +
  '（' + (fb && fb.flying ? fb.flying.path.length : 0) + ' 格）');"""),
])
