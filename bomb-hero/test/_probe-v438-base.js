// 探針：v4.38 改動後，舊基線 verify-v26 兩組斷言要換成什麼數字
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

function openField() {
  for (let y = 1; y < G.rows - 1; y++)
    for (let x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
}

P.settings.count = 4; P.settings.size = 'M'; P.settings.hazards = 'off';
P.settings.sd = 'off'; P.settings.revenge = 'off'; P.settings.ctrl = 'kb';
P.settings.aiLevel = 'normal';
P.Battle.resetSlots();
P.startBattle();
G.state = 'play';
G.bombs.length = 0; G.flames.length = 0;

console.log('cols=', G.cols, 'rows=', G.rows, 'T=', G.T);

// ---- 紅龍火焰格數 ----
openField();
const p7 = G.players[0];
const T7 = G.T;
p7.x = Math.floor(G.cols / 2) * T7 + T7 / 2;
p7.y = Math.floor(G.rows / 2) * T7 + T7 / 2;
const pcx = Math.floor(p7.x / T7), pcy = Math.floor(p7.y / T7);
G.eggs.length = 0;
G.eggs.push({ x: pcx, y: pcy, bob: 0, wob: 0 }); P.takeEgg(p7);
G.eggs.push({ x: pcx, y: pcy, bob: 0, wob: 0 }); P.takeEgg(p7);
console.log('redDragon=', p7.redDragon, 'RANGE=', P.DINO_FIRE_RANGE);
G.flames.length = 0; p7.fireCd = 0; p7.facing = 'right';
P.fireBreath(p7);
console.log('紅龍火焰格數=', G.flames.length);
['up', 'down', 'left'].forEach(function (dn) {
  G.flames.length = 0; p7.fireCd = 0; p7.facing = dn;
  P.fireBreath(p7);
  console.log('  朝 ' + dn + ' → ' + G.flames.length + ' 格');
});

// ---- 推車落點 ----
openField();
const cp = G.players[0];
G.players.forEach(function (q, i) { if (i) { q.alive = false; q.cart = false; } });
cp.cart = true; cp.alive = false; cp.cartDir = null; cp.cartCd = 0; cp.cartCharge = 0;
cp.x = G.T / 2; cp.y = 4 * G.T + G.T / 2;
const dir = P.cartThrowDir(cp);
console.log('\n推車位置 cx=0 cy=4  →  方向=' + dir.dn);
[0, 1, 2].forEach(function (lv) {
  const land = P.cartPickLanding(cp, lv);
  console.log('  lv' + lv + ' (reach=' + P.CART_LV[lv].reach + ') → ' +
    (land ? 'x=' + land.x + ' y=' + land.y + ' dist=' + land.dist + ' path=' + land.path.length : 'null'));
});
// 丟真的
cp.cartCd = 0;
console.log('cartThrowBomb →', P.cartThrowBomb(cp, 2), '炸彈:',
  G.bombs.map(function (b) { return '(' + b.cx + ',' + b.cy + ')'; }).join(' '));
