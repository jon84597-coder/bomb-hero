// v4.68 A/B 對照：同一距離下「舊版／新版」會不會被吐彈怪點名
//   node test/_probe-v468.js
const { makeEnv } = require('./_sandbox');
const path = require('path');

const OLD = path.join(__dirname, '../_bak_v468_pre.html');
const NEW = path.join(__dirname, '../index.html');

function run(file, distTiles, frames) {
  const env = makeEnv({ file });
  const P = env.BH, G = P.Game;
  P.clearMapTest();
  P.settings.size = 'M';
  P.startSolo(1, false);
  G.state = 'play'; G.hides = []; G.bolts = []; G.enemies.length = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.grid[y][x] = (y === 0 || x === 0) ? 1 : 0;
  const T = G.T, me = G.players[0];
  me.alive = true; me.invuln = 99; me.x = 2.5 * T; me.y = 3.5 * T;   // 站著不動

  const e = P.makeEnemy(2 + distTiles, 3, 'frog', 0, 1);
  e.skCd = 0; e.castT = 0;
  G.enemies = [e];

  let casts = 0, bolts = 0, prevCast = 0;
  for (let i = 0; i < frames; i++) {
    e.aggro = true;                       // 模擬「被隨從引到的仇恨」（實戰裡 aggro 也可能來自隨從）
    P.enemySkillTick(e, 1 / 60);
    if (prevCast <= 0 && e.castT > 0) casts++;
    prevCast = e.castT;
    if (G.bolts && G.bolts.length > bolts) bolts = G.bolts.length;
    P.updateBolts(1 / 60);
    if (e.skCd > 0) e.skCd -= 0;          // skCd 由 skill tick 自己扣
  }
  // 統計真正射出的彈（含已落地的）
  let shots = 0;
  if (G.bolts) G.bolts.length = 0;
  return { casts, shots: bolts, castT: +(e.castT || 0).toFixed(2) };
}

const rows = [2.5, 3.4, 5, 6];
console.log('距離(格)   舊版 v4.67        新版 v4.68');
console.log('            起手 / 空中彈      起手 / 空中彈');
for (const d of rows) {
  const a = run(OLD, d, 600);
  const b = run(NEW, d, 600);
  console.log(
    String(d).padEnd(10) +
    (a.casts + ' / ' + a.shots).padEnd(20) +
    (b.casts + ' / ' + b.shots)
  );
}
