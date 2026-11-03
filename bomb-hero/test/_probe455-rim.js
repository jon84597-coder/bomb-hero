// v4.55 量測：內陸硬牆島「黏在外牆上」的格數（freeRimRocks 的目標）
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;
let totalRimRocks = 0, totalIslands = 0, stages = 0, walkSum = 0;
for (let st = 1; st <= 32; st++) {
  P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
  P.settings.ctrl = 'kb'; P.settings.soloDiff = 'normal';
  P.startSolo(st, false); G.state = 'play';
  P.markWallKinds();
  const k = G.wallKind || [];
  let rim = 0, isl = 0, walk = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    if (G.grid[y][x] !== 1) { walk++; continue; }
    if (!k[y] || k[y][x] !== 2) continue;
    isl++;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const ay = y + dy, ax = x + dx;
      if (ay < 0 || ax < 0 || ay >= G.rows || ax >= G.cols) continue;
      if (k[ay] && k[ay][ax] === 1) { rim++; dy = 9; break; }
    }
  }
  totalRimRocks += rim; totalIslands += isl; walkSum += walk; stages++;
}
console.log('stage 1-32｜硬牆島格數 ' + totalIslands + '｜黏外牆的 ' + totalRimRocks +
  '｜平均可走 ' + (walkSum / stages).toFixed(1));
