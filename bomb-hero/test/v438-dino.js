// v4.38 第 1 項：對戰模式坐騎吐火判定
const { makeEnv } = require('./_sandbox');
const env = makeEnv(); const P = env.BH, G = P.Game;
let pass = 0, fail = 0;
function ok(c, msg, extra) {
  if (c) { pass++; console.log('  ✓ ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
}
function fresh() {
  P.settings.count = 4; P.settings.size = 'M'; P.settings.wins = 2;
  P.Battle.resetSlots(); P.startBattle(); G.state = 'play';
  const T = G.T, me = G.players[0], foe = G.players[1];
  G.players.forEach(function (p) { p.alive = true; p.invuln = 0; p.dino = false; p.redDragon = false; });
  return { T: T, me: me, foe: foe };
}

console.log('=== 1. 面對面吐火（對手沒騎龍） ===');
{
  const { T, me, foe } = fresh();
  me.x = 3 * T + T / 2; me.y = 3 * T + T / 2;
  foe.x = 5 * T + T / 2; foe.y = 3 * T + T / 2;
  me.dino = true; me.fireCd = 0; me.facing = 'right';
  const fired = P.fireBreath(me);
  P.updateWorld(1 / 60);
  ok(fired, '吐火成功');
  ok(!foe.alive, '對手被燒死', 'alive=' + foe.alive);
}

console.log('\n=== 2. 對手站在格子交界（x 剛好是 T 的整數倍） ===');
{
  const { T, me, foe } = fresh();
  me.x = 3 * T + T / 2; me.y = 3 * T + T / 2;
  foe.x = 5 * T; foe.y = 3 * T + T / 2;      // 正好壓在格線上
  me.dino = true; me.fireCd = 0; me.facing = 'right';
  P.fireBreath(me);
  P.updateWorld(1 / 60);
  ok(!foe.alive, '站在格線上也會被燒到（舊版 floor 會判到隔壁格）', 'alive=' + foe.alive);
}

console.log('\n=== 3. 對手站在斜角格（格子角落） ===');
{
  const { T, me, foe } = fresh();
  me.x = 3 * T + T / 2; me.y = 3 * T + T / 2;
  foe.x = 5 * T + T * .18; foe.y = 3 * T + T * .18;   // 斜角偏一點
  me.dino = true; me.fireCd = 0; me.facing = 'right';
  P.fireBreath(me);
  P.updateWorld(1 / 60);
  ok(!foe.alive, '斜角也燒得到（.74 格圓形覆蓋）', 'alive=' + foe.alive);
}

console.log('\n=== 4. 範圍回到 2 格：第 3 格燒不到 ===');
{
  const { T, me, foe } = fresh();
  me.x = 3 * T + T / 2; me.y = 3 * T + T / 2;
  foe.x = 6 * T + T / 2; foe.y = 3 * T + T / 2;       // 距離 3 格
  me.dino = true; me.fireCd = 0; me.facing = 'right';
  P.fireBreath(me);
  P.updateWorld(1 / 60);
  ok(foe.alive, '第 3 格不會被燒到（範圍 2 格）', 'alive=' + foe.alive);
  const far = G.flames.filter(function (f) { return f.cx >= 6; });
  ok(far.length === 0, '火焰沒有生成在第 3 格', 'far=' + far.length);
}

console.log('\n=== 5. 對手騎龍：第一發掉龍，第二發要死 ===');
{
  const { T, me, foe } = fresh();
  foe.x = 5 * T + T / 2; foe.y = 3 * T + T / 2;
  foe.dino = true;
  me.x = 3 * T + T / 2; me.y = 3 * T + T / 2;
  me.dino = true;
  me.facing = 'right'; me.fireCd = 0;
  P.fireBreath(me);
  P.updateWorld(1 / 60);
  ok(foe.alive && !foe.dino, '第一發只打掉龍，人還活著', 'alive=' + foe.alive + ' dino=' + foe.dino);
  // 無敵 0.7 秒 → 跑 0.8 秒後再吐
  for (let i = 0; i < 48; i++) P.updateWorld(1 / 60);
  me.fireCd = 0;
  P.fireBreath(me);
  P.updateWorld(1 / 60);
  ok(!foe.alive, '第二發燒死人（不會再被無限護盾擋住）', 'alive=' + foe.alive);
}

console.log('\n=== 6. 對戰模式的蛋只有 1 顆 ===');
{
  fresh();
  ok(G.eggs.length <= 1, '恐龍蛋 1 顆（原本 3 顆會讓 AI 一直換龍擋刀）', 'eggs=' + G.eggs.length);
}

console.log('\n=== 7. 龍碎掉的無敵時間 0.7 秒 ===');
{
  const { foe } = fresh();
  foe.dino = true; foe.invuln = 0;
  P.breakDino(foe);
  ok(Math.abs(foe.invuln - .7) < 1e-6, 'breakDino 後無敵 .7s（原本 1.8s 會蓋過吐火冷卻）', 'invuln=' + foe.invuln);
}

console.log('\n========================================');
console.log((fail === 0 ? '✅ ' : '❌ ') + 'v4.38 吐火判定：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
