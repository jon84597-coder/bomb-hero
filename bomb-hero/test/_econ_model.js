// test/_econ_model.js —— 新舊經濟模型對照（只算，不改）
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH; const G = P.Game;
try { P.WeekMod.pin([]); } catch (e) {}

const rows = [];
for (let s = 1; s <= 40; s++) {
  try { P.startSolo(s, false, false); } catch (e) { continue; }
  let soft = 0;
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) if (G.grid[y][x] === 2) soft++;
  rows.push({ s, soft, foes: G.enemies.filter(e => !e.boss).length, boss: G.enemies.filter(e => e.boss).length });
}

// 舊：磚10 + 小怪60%×9.5 + Boss35.5 + base(40+每4關10)
// 新：磚2  + 小怪60%×5   + Boss37.5 + base(65+每4關5)
let oldSum = 0, newSum = 0, oldBase = 0, newBase = 0;
rows.forEach(r => {
  const ob = 40 + Math.floor((r.s - 1) / 4) * 10;
  const nb = 65 + Math.floor((r.s - 1) / 4) * 5;
  oldBase += ob; newBase += nb;
  oldSum += r.soft * 10 + r.foes * .6 * 9.5 + r.boss * 35.5 + ob;
  newSum += r.soft * 2 + r.foes * .6 * 5 + r.boss * 37.5 + nb;
});
console.log('舊 40 關總額', Math.round(oldSum), '｜關內', Math.round(oldSum - oldBase), '｜過關', oldBase);
console.log('新 40 關總額', Math.round(newSum), '｜關內', Math.round(newSum - newBase), '｜過關', newBase);
console.log('單關均值 舊', (oldSum / 40).toFixed(0), '→ 新', (newSum / 40).toFixed(0), '（降 ' + (100 - newSum / oldSum * 100).toFixed(0) + '%）');

// 每章（10 關）小計
for (let c = 0; c < 4; c++) {
  let o = 0, n = 0;
  rows.filter(r => Math.floor((r.s - 1) / 10) === c).forEach(r => {
    const ob = 40 + Math.floor((r.s - 1) / 4) * 10, nb = 65 + Math.floor((r.s - 1) / 4) * 5;
    o += r.soft * 10 + r.foes * .6 * 9.5 + r.boss * 35.5 + ob;
    n += r.soft * 2 + r.foes * .6 * 5 + r.boss * 37.5 + nb;
  });
  console.log('第' + (c + 1) + '章(10關) 舊', Math.round(o), '新', Math.round(n));
}

// 購買難度
const GPH_OLD = 24 * 543, GPH_NEW = 24 * (newSum / 40);
console.log('\nGPH 舊', Math.round(GPH_OLD), '→ 新', Math.round(GPH_NEW));
const items = [
  ['小藥水', 250], ['大藥水', 600], ['復活幣', 1200], ['隨從', 8000], ['三隻隨從', 24000],
  ['BR 門票', 2000], ['改名', 5000], ['RPG 永久三件', 16800], ['RPG 屬性點全滿', 114500],
  ['隨從滿級', 180000], ['清空商店', 24000 + 180000 + 16800 + 114500]
];
console.log('\n商品\t現價\t舊局數\t新局數\t新小時');
items.forEach(([n, p]) => {
  console.log([n, p, (p / 543).toFixed(1), (p / (newSum / 40)).toFixed(1), (p / GPH_NEW).toFixed(1)].join('\t'));
});
