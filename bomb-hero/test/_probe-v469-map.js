// v4.69 探針：地圖模式 / T1~T5 對照 / 怪量 / RPG 生態
//   node test/_probe-v469-map.js
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

const TIERS = [
  { n: 1, cols: 18, rows: 16, floor: 100, foes: 6, name: '窄洞' },
  { n: 2, cols: 21, rows: 19, floor: 150, foes: 9, name: '石窟' },
  { n: 3, cols: 23, rows: 21, floor: 200, foes: 12, name: '迷徑' },
  { n: 4, cols: 26, rows: 23, floor: 250, foes: 16, name: '大廳' },
  { n: 5, cols: 28, rows: 25, floor: 300, foes: 20, name: '深巢' }
];
function expectTier(st) {
  if (st <= 16) return (st - 1) % 4;
  return ((st - 17) % 4) + 1;
}
function openCells() {
  let n = 0;
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) if (G.grid[y][x] === 0) n++;
  return n;
}

console.log('== 單人：隨機生成模式 T1~T5 ==');
P.settings.mapMode = 'random';
P.clearMapTest();
let bad = 0;
for (let st = 1; st <= 32; st++) {
  P.startSolo(st, false);
  const t = TIERS[expectTier(st)];
  const foes = G.enemies.filter(function (e) { return !e.boss; }).length;
  const okT = G.cols === t.cols && G.rows === t.rows;
  const okF = foes === t.foes;
  if (!okT || !okF) bad++;
  if (st <= 4 || st === 16 || st === 17 || st === 20 || st === 21 || st === 32) {
    console.log(('第' + st + '關').padEnd(6) + ('T' + t.n + ' ' + t.name).padEnd(10) +
      (G.cols + '×' + G.rows).padEnd(9) + ('怪 ' + foes + '/' + t.foes).padEnd(10) +
      ('可走 ' + openCells()).padEnd(12) + (okT && okF ? 'OK' : '✗'));
  }
}
console.log('32 關尺寸/怪量不符：' + bad + ' 關');

console.log('\n== classic 模式（原本 32 張）==');
P.settings.mapMode = 'classic';
P.startSolo(1, false);
console.log('第1關', G.cols + '×' + G.rows, '可走', openCells(), '怪', G.enemies.length, 'bigMap', G.bigMap);
P.startSolo(32, false);
console.log('第32關', G.cols + '×' + G.rows, '可走', openCells(), '怪', G.enemies.length, 'bigMap', G.bigMap);

console.log('\n== 同一關重試：地圖要一樣 ==');
P.settings.mapMode = 'random';
P.startSolo(7, false);
const g1 = G.grid.map(function (r) { return r.join(''); }).join('|');
P.startSolo(7, false);
const g2 = G.grid.map(function (r) { return r.join(''); }).join('|');
P.startSolo(8, false);
const g3 = G.grid.map(function (r) { return r.join(''); }).join('|');
console.log('第7關兩次相同：', g1 === g2, ' 第8關不同：', g1 !== g3);

console.log('\n== RPG：怪要符合大關生態 ==');
const BLOCK = [
  ['slime', 'bunny', 'frog', 'cater', 'mush', 'beetle'],
  ['crab', 'mummy', 'eye', 'sandworm', 'dune', 'scorp'],
  ['penguin', 'crystal', 'bat', 'snowball', 'seal', 'panda'],
  ['lavaslime', 'lavaworm', 'bee', 'bomber', 'lizard', 'rockling'],
  ['wisp', 'scavenger', 'robot', 'pulser', 'laserbee', 'neonbot'],
  ['octopus', 'angler', 'ghost', 'hermit', 'jelly', 'urchin'],
  ['hornet', 'airship', 'sapper', 'thunder', 'windwisp', 'galehawk'],
  ['skull', 'imp', 'darkbat', 'wizard', 'royalguard', 'deathknight']
];
let mixed = 0;
[1, 5, 9, 13, 17, 21, 25, 29].forEach(function (st) {
  const bi = Math.ceil(st / 4) - 1;
  P.settings.mapMode = 'classic';
  P.startRpg ? P.startRpg(st) : null;
  const types = {};
  G.enemies.forEach(function (e) { if (e.spec) types[e.spec] = 1; });
  const list = Object.keys(types);
  const out = list.filter(function (t) { return BLOCK[bi].indexOf(t) < 0; });
  if (out.length) mixed++;
  console.log(('RPG 第' + st + '關（第' + (bi + 1) + '大關）').padEnd(18) +
    '怪 ' + list.length + ' 種：' + list.join(',') + (out.length ? '  ✗ 越界:' + out.join(',') : '  OK'));
});
console.log('生態越界的關卡：' + mixed + ' / 8');

console.log('\n== RPG 隨機地圖模式 ==');
P.settings.mapMode = 'random';
P.startRpg(20);
console.log('RPG 第20關', G.cols + '×' + G.rows, '可走', openCells(), '怪', G.enemies.length, 'bigMap', G.bigMap, 'spdK', G.spdK);
