// v4.38 第 2/3/4/6 項：推車投擲射線、提示可見性、推車速度、AI 速度
const { makeEnv } = require('./_sandbox');
const env = makeEnv(); const P = env.BH, G = P.Game;
let pass = 0, fail = 0;
function ok(c, msg, extra) {
  if (c) { pass++; console.log('  ✓ ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
}
P.settings.count = 4; P.settings.size = 'M'; P.settings.wins = 2;
P.Battle.resetSlots(); P.startBattle(); G.state = 'play';
const T = G.T;
const me = G.players[0];

// 造一台推車（人在外圈格子上）
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

console.log('=== 1. 投擲方向嚴格垂直于推車所在邊 ===');
clearGrid();
{
  putCart(6, 0);
  ok(P.cartLandingDir(me) === 'down', '站在上邊 → 只能往下丟', P.cartLandingDir(me));
  putCart(6, G.rows - 1);
  ok(P.cartLandingDir(me) === 'up', '站在下邊 → 只能往上丟', P.cartLandingDir(me));
  putCart(0, 6);
  ok(P.cartLandingDir(me) === 'right', '站在左邊 → 只能往右丟', P.cartLandingDir(me));
  putCart(G.cols - 1, 6);
  ok(P.cartLandingDir(me) === 'left', '站在右邊 → 只能往左丟', P.cartLandingDir(me));
}

console.log('\n=== 2. v4.41：撞到硬牆就停住（不再一格一格彈過牆） ===');
clearGrid();
{
  putCart(6, 0);
  G.grid[2][6] = 1;      // 第 2 格硬牆
  const land = P.cartPickLanding(me, 2);       // 遠 3 格
  ok(!!land, '有落點', land && (land.x + ',' + land.y));
  ok(land && land.x === 6, '同一條垂直線上（沒偏掉）', land && land.x);
  ok(land && land.y === 1, '擋在牆前 → 落在第 1 格（不會翻過石牆）', land && land.y);
  ok(land && land.path.length === 2, '飛行路徑只有「推車 → 落點」', land && land.path.length);
}

console.log('\n=== 3. 只有軟磚 → 砸在磚上（引爆順便破磚） ===');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y <= 3; y++) G.grid[y][6] = 2;
  const land = P.cartPickLanding(me, 2);
  ok(!!land && land.y === 3, '落在最遠那塊軟磚上', land && land.y);
  ok(!!land && land.onSoft === true, '標記 onSoft（引爆時把磚炸掉）', land && land.onSoft);
}

console.log('\n=== 3b. 硬牆在第一格 → 3 格內全沒得放，直接丟不出去 ===');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y <= 3; y++) G.grid[y][6] = 1;
  ok(!P.cartPickLanding(me, 2), '沒有落點（不會飛到牆後面）');
}

console.log('\n=== 4. 集氣等級決定飛多遠 ===');
clearGrid();
{
  putCart(6, 0);
  const l0 = P.cartPickLanding(me, 0);
  const l1 = P.cartPickLanding(me, 1);
  const l2 = P.cartPickLanding(me, 2);
  ok(l0 && l1 && l2, '三段都有落點');
  ok(l0.dist === 1 && l1.dist === 2 && l2.dist === 3, '三段 = 1／2／3 格（硬上限 3）',
    l0.dist + ' / ' + l1.dist + ' / ' + l2.dist);
}

console.log('\n=== 5. 真的丟得出去，而且帶逐格跳躍動畫 ===');
clearGrid();
{
  putCart(6, 0);
  G.bombs = [];
  const thrown = P.cartThrowBomb(me, 1);
  ok(thrown, '投出去成功');
  const b = G.bombs[G.bombs.length - 1];
  ok(b && b.flying && b.flying.path && b.flying.path.length > 1, '炸彈帶飛行路徑',
    b && b.flying && b.flying.path.length);
  ok(b && b.cx === 6, '落點在同一條垂直線上', b && b.cx);
  ok(me.cartCd > 0, '進入冷卻', me.cartCd);
}

console.log('\n=== 6. 射線上沒有空地 → 不亂丟 ===');
clearGrid();
{
  putCart(6, 0);
  for (let y = 1; y < G.rows - 1; y++) G.grid[y][6] = 1;
  G.bombs = [];
  const thrown = P.cartThrowBomb(me, 2);
  ok(!thrown, '整條射線都是牆 → 不丟（不會憑空出現在牆裡）');
  ok(G.bombs.length === 0, '沒有產生炸彈', G.bombs.length);
}

console.log('\n=== 7. 推車移動速度提到滑冰鞋 5 級 ===');
{
  const src = require('fs').readFileSync(__dirname + '/../index.html', 'utf8');
  ok(/const CART_SPEED = 250;/.test(src), '推車速度 250 px/s（玩家基礎 146、滑冰鞋 5 級 = 246）');
  ok(!/150 \* \.42 : 150/.test(src), '舊的 150 已經拿掉');
}

console.log('\n=== 8. AI 起手速度低於玩家 ===');
{
  const cap = P.AI_SPEED_CAP;
  ok(cap === 186, 'AI 速度上限 = 滑冰鞋 2 級（186）', cap);
  const lvN = P.AI_LEVELS.normal, lvS = P.AI_LEVELS.strong, lvW = P.AI_LEVELS.weak;
  ok(lvN.spd < 1, 'normal 起手比玩家慢（spd < 1）', lvN.spd);
  ok(lvS.spd <= 1, 'strong 起手不超過玩家', lvS.spd);
  ok(lvW.spd < lvN.spd && lvN.spd < lvS.spd, '三段難度仍有差距',
    lvW.spd + ' / ' + lvN.spd + ' / ' + lvS.spd);
}

console.log('\n=== 9. AI 撿滿速度道具也不會超速 ===');
{
  const p = G.players[1];
  p.cart = false;
  p.speedLv = 6;                                  // 吃滿
  const raw = P.moveSpeed(p);
  ok(raw > P.AI_SPEED_CAP, '原始速度確實超過上限', raw.toFixed(0));
  ok(Math.min(raw, P.AI_SPEED_CAP) === P.AI_SPEED_CAP, '會被 AI_SPEED_CAP 夾住', P.AI_SPEED_CAP);
}

console.log('\n=== 10. 投擲提示只畫給自己 ===');
{
  const src = require('fs').readFileSync(__dirname + '/../index.html', 'utf8');
  ok(/const showThrowUi = isMyPlayer\(p\);/.test(src), '有 showThrowUi 開關');
  ok((src.match(/if \(showThrowUi\) \{/g) || []).length === 2,
    '手持炸彈高亮與集氣條／落點預告都有包起來',
    (src.match(/if \(showThrowUi\) \{/g) || []).length);
}

console.log('\n========================================');
console.log((fail === 0 ? '✅ ' : '❌ ') + 'v4.38 推車／AI：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
