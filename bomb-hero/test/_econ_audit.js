// test/_econ_audit.js —— 經濟現況盤點（只讀，不改任何東西）
//   ① 40 關：軟磚數、小怪數、BOSS 數、地圖尺寸
//   ② 單局分數期望（軟磚 10／小怪 60% 掉 5~14 幣）
//   ③ 成就／賽季／每日／任務／簽到／分享／週榜／BR／深淵 的年度總產出
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH;
const G = P.Game;
try { P.WeekMod.pin([]); } catch (e) {}

const rows = [];
for (let s = 1; s <= 40; s++) {
  try { P.startSolo(s, false, false); } catch (e) { rows.push({ s, err: String(e).slice(0, 60) }); continue; }
  let soft = 0, rock = 0;
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) {
    if (G.grid[y][x] === 2) soft++;
    else if (G.grid[y][x] === 1) rock++;
  }
  const foes = G.enemies.filter(e => !e.boss).length;
  const boss = G.enemies.filter(e => e.boss).length;
  const items = G.items.length;
  rows.push({ s, cols: G.cols, rows: G.rows, soft, rock, foes, boss, items });
}

// 單局期望：軟磚 10 分/塊；小怪 60% 掉 coin(5+rand(10)) 均 9.5；BOSS 一次掉 coin(26+rand(20)) 均 35.5
function expectScore(r) {
  const brickG = r.soft * 10;
  const foeG = r.foes * 0.60 * 9.5;
  const bossG = (r.boss || 0) * 35.5;
  return { brickG: Math.round(brickG), foeG: Math.round(foeG), bossG: Math.round(bossG), total: Math.round(brickG + foeG + bossG) };
}

console.log('stage\tcols×rows\tsoft\tfoes\tboss\texpectScore\tclearBase\ttotal');
let sumAll = 0, sumBase = 0;
rows.forEach(r => {
  if (r.err) { console.log(r.s + '\tERR ' + r.err); return; }
  const e = expectScore(r);
  const base = 40 + Math.floor((r.s - 1) / 4) * 10;
  sumAll += e.total + base; sumBase += base;
  console.log([r.s, r.cols + '×' + r.rows, r.soft, r.foes, r.boss, e.total, base, e.total + base].join('\t'));
});
console.log('\n一輪 40 關總產出 =', sumAll, '（其中過關獎勵', sumBase, '，關內分數', sumAll - sumBase, '）');

// 成就總額
const SERIES = [
  ['brKill', 1.6, 9], ['brTop10', 1, 8], ['brTop3', 1.3, 8], ['brWin', 2, 8],
  ['btKill', 1.5, 9], ['btWin', 1.8, 7], ['onKill', 2, 8], ['onWin', 2.4, 6],
  ['soloKill', 1.3, 9], ['soloBoss', 2.2, 8], ['soloClear', 1.6, 6], ['soloNoHit', 2, 6], ['star3', 1.8, 5],
  ['rpgKill', 1.5, 9], ['rpgBoss', 2.4, 8], ['rpgClear', 1.8, 6],
  ['mountDragon', 3, 1], ['mountOstrich', 3, 1], ['stormMount', 4, 1],
  ['dragonKill', 2, 8], ['ostrichKill', 2, 8],
  ['playSec', 1.2, 8], ['death', .8, 9], ['brick', .7, 6], ['itemGet', .7, 6],
  ['bomb', .6, 6], ['goldEarn', .5, 6], ['loginDays', 1, 7], ['dailyDone', 1.5, 5]
];
let achTotal = 0, achN = 0;
const achBy = SERIES.map(([k, g, n]) => {
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.max(20, Math.round(g * (i + 1) * (i + 1) * 12));
  achTotal += s; achN += n;
  return k + '=' + s;
});
console.log('\n成就：' + achN + ' 個，總額', achTotal);
console.log(achBy.join('  '));

// 賽季 30 級
let tierTotal = 0;
for (let i = 1; i <= 30; i++) tierTotal += 40 + 12 * i;
console.log('賽季 30 級總額', tierTotal, '｜四目標', 400 + 500 + 600 + 800, '＝', tierTotal + 2300);

// 每日：簽到 7 天 / 每日任務 3 個 / 週榜 / 分享
const sign = 120 + 180 + 100 + 260 + 160 + 320 + 500;
console.log('簽到 7 天合計', sign);
console.log('每日任務池均值', ((120 + 100 + 100 + 150 + 110 + 180 + 220 + 180 + 160) / 9).toFixed(1), '×3 =', (((120 + 100 + 100 + 150 + 110 + 180 + 220 + 180 + 160) / 9) * 3).toFixed(0));
console.log('週榜', 1000 + 700 + 500 + 350 * 2 + 200 * 5, '｜分享', 1000 * 3, '/日');
console.log('BR 名次', [1200, 700, 450, 300, 200, 150, 100, 80].join('/'));
console.log('深淵每層', 15, '（破紀錄 +45）');
console.log('圖鑑', 1200 * 4 + 6000);
console.log('角色/隨從：三隻 8000 + 升級 4000+8000+16000+32000 各');
