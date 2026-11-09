// _probe-gold.js — 量金幣經濟：一關實際進帳多少 vs 商店總價
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const { BH } = env;
env.BH.settings.mapMode = 'classic';
const G = BH.Game;

function stage(n) {
  BH.clearMapTest();
  BH.startSolo(n, false);
  let soft = 0, hard = 0, eggs = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    const v = G.grid[y][x];
    if (v === 1) soft++;
    else if (v === 2) hard++;
  }
  return { stage: n, cols: G.cols, rows: G.rows, foes: (G.foes || []).length, soft, hard };
}

console.log('=== 每關規模 ===');
[1, 5, 20, 40].forEach(function (n) {
  try { console.log(JSON.stringify(stage(n))); } catch (e) { console.log(n, 'ERR', e.message); }
});

console.log('\n=== 商店總價 ===');
let pets = 0;
(BH.PET_KINDS || []).forEach(function (k) { pets += k.price; console.log('  隨從', k.key, k.price); });
console.log('  隨從合計', pets);
let perm = 0;
(BH.RPG_PERM_UP || []).forEach(function (u) {
  const s = u.prices.reduce(function (a, b) { return a + b; }, 0);
  perm += s; console.log('  永久', u.id, u.prices.join('+'), '=', s);
});
console.log('  永久合計', perm);
console.log('  門票', BH.Shop.ticketPrice());
console.log('  >>> 一次性商店總額', pets + perm, '(+門票 2000/張)');

console.log('\n=== 過關獎勵 base ===');
for (const n of [1, 2, 4, 5, 20, 39, 40]) {
  console.log('  第 ' + n + ' 關 base = ' + (40 + Math.floor((n - 1) / 4) * 10));
}
