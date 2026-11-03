// ASCII 印出某關地圖：.=空地 #=硬牆 o=軟磚
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const BH = env.BH, G = BH.Game;
const st = parseInt(process.argv[2] || '24', 10);
BH.startSolo(st, false);
G.state = 'play';
const out = [];
for (let y = 0; y < G.rows; y++) {
  let line = '';
  for (let x = 0; x < G.cols; x++) {
    const v = G.grid[y][x];
    line += v === 0 ? '.' : v === 2 ? 'o' : '#';
  }
  out.push(line);
}
console.log('stage ' + st + '  ' + G.cols + 'x' + G.rows);
console.log(out.join('\n'));
