// v4.67 探針：出生點淨空 / 怪離多遠 / 速度換算 / 鑽地落點
//   node test/_probe-v467.js
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

function dist2sp(x, y) {
  const sp = G.spawnCell;
  return Math.max(Math.abs(x - sp.x), Math.abs(y - sp.y));
}

console.log('=== 1. 隨機地圖：出生點淨空 + 怪離多遠 + 速度係數 ===');
for (let n = 1; n <= 5; n++) {
  P.startMapTest(n);
  G.state = 'play';
  const sp = G.spawnCell;
  let wallR1 = 0, wallR2 = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    if (G.grid[y][x] === 0) continue;
    const d = dist2sp(x, y);
    if (d <= 1) wallR1++;
    else if (d === 2) wallR2++;
  }
  let minFoe = 99, bad = 0;
  G.enemies.forEach(e => {
    const d = dist2sp(Math.floor(e.x / G.T), Math.floor(e.y / G.T));
    if (d < minFoe) minFoe = d;
    if (d < 2) bad++;
  });
  const spd = G.players[0] ? P.moveSpeed(G.players[0]) : 0;
  console.log(`  圖${n} ${G.cols}x${G.rows} T=${G.T} spdK=${(G.spdK || 1).toFixed(3)}` +
    ` 出生點1格內牆=${wallR1} 2格=${wallR2}` +
    ` 怪最近=${minFoe}格 太近=${bad} 玩家速度=${spd.toFixed(1)}px/s → ${(spd / G.T).toFixed(2)}格/秒`);
}

console.log('\n=== 2. 一般關卡速度係數（應該是 1）===');
P.settings.size = 'M';
P.clearMapTest();
P.startSolo(1, false);
console.log('  T=' + G.T, 'spdK=' + (G.spdK || 1), '速度=' + P.moveSpeed(G.players[0]).toFixed(1) +
  ' → ' + (P.moveSpeed(G.players[0]) / G.T).toFixed(2) + ' 格/秒');

console.log('\n=== 3. 鑽地落點：永遠離玩家 2 格以上 ===');
P.startMapTest(2);
G.state = 'play';
const me = G.players[0];
const T = G.T;
let tooNear = 0, samples = 0, minD = 99;
for (let i = 0; i < 300; i++) {
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
console.log(`  抽樣 ${samples} 次，最近落點 ${minD} 格，太近(<=1) ${tooNear} 次`);

console.log('\n=== 4. 玩家站在落點上時，蟲不會冒出來 ===');
const e2 = P.makeEnemy(0, 0, 'sandworm', 3, 1);
e2.aggro = true;
const pcx = Math.floor(me.x / T), pcy = Math.floor(me.y / T);
e2.bx = pcx; e2.by = pcy;                 // 強制落點在玩家腳下
e2.blinkT = P.FOE_BLINK_T;
const before = { blinkT: e2.blinkT, x: e2.x, y: e2.y };
P.foeBlinkTo(e2);                          // 第一次：應該延後
console.log('  第1次呼叫 → blinkT =', e2.blinkT, '（>0 表示延後，沒有冒出來）');
P.foeBlinkTo(e2);                          // 第二次：還是延後
console.log('  第2次呼叫 → blinkT =', e2.blinkT);
P.foeBlinkTo(e2);                          // 第三次：換落點
console.log('  第3次呼叫 → 新落點 =', e2.bx, e2.by, 'blinkT =', e2.blinkT);

console.log('\n=== 5. 冒出後的保護時間 ===');
const e3 = P.makeEnemy(Math.floor(me.x / T) + 3, Math.floor(me.y / T), 'sandworm', 3, 1);
e3.bx = Math.floor(me.x / T) + 2; e3.by = Math.floor(me.y / T);
e3.blinkT = .01;
G.enemies = [e3];
me.invuln = 0;
for (let i = 0; i < 20; i++) P.updateEnemy(e3, 1 / 60);   // 讓牠冒出來
console.log('  emergeT =', (e3.emergeT || 0).toFixed(2), '（>0 ＝ 這 0.6 秒碰不到玩家）');
