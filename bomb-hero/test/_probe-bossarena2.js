const { makeEnv } = require('./_sandbox.js');
const env = makeEnv(); const P = env.BH, G = env.G;
P.startSolo(5, false);
for (let y = 0; y < G.rows; y++) {
  let row = '';
  for (let x = 0; x < G.cols; x++) {
    const v = G.grid[y][x];
    const h = G.hazards[y] && G.hazards[y][x];
    row += v === 1 ? '#' : v === 2 ? 'x' : h ? (h.type === 'convey' ? '>' : h.type === 'ice' ? '~' : '?') : '.';
  }
  console.log(String(y).padStart(2), row);
}
console.log('--- player r1 zone:');
for (let dy = -1; dy <= 1; dy++) {
  let o = [];
  for (let dx = -1; dx <= 1; dx++) o.push([8+dx, 13+dy, G.grid[13+dy] && G.grid[13+dy][8+dx], !!(G.hazards[13+dy] && G.hazards[13+dy][8+dx])]);
  console.log(JSON.stringify(o));
}
