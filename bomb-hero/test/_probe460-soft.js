// 統計 32 關的軟磚密度（相鄰放寬前後對照用）
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const BH = env.BH, G = BH.Game;

let sum = 0, n = 0, lo = { s: 0, p: 99 }, hi = { s: 0, p: 0 };
const rows = [];
for (let st = 1; st <= 32; st++) {
  BH.startSolo(st, false);
  G.state = 'play';
  let open = 0, soft = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    const v = G.grid[y][x];
    if (v === 0) open++; else if (v === 2) soft++;
  }
  const p = soft + open > 0 ? soft / (soft + open) : 0;
  rows.push(st + ':' + Math.round(p * 100) + '%(' + soft + '/' + (soft + open) + ')');
  sum += p; n++;
  if (p < lo.p) lo = { s: st, p: p };
  if (p > hi.p) hi = { s: st, p: p };
}
console.log(rows.join('  '));
console.log('平均 ' + Math.round(sum / n * 100) + '%  最低 st' + lo.s + ' ' + Math.round(lo.p * 100) +
  '%  最高 st' + hi.s + ' ' + Math.round(hi.p * 100) + '%');
