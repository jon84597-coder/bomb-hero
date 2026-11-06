const { makeEnv } = require('./_sandbox.js');
for (let t = 0; t < 3; t++) {
  const env = makeEnv(); const P = env.BH, G = env.G;
  P.startBattle ? P.startBattle(2) : null;
  if (typeof G.cols !== 'number') { console.log('skip'); break; }
  let hz = {};
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    const h = G.hazards[y] && G.hazards[y][x];
    if (h) hz[h.type] = (hz[h.type] || 0) + 1;
  }
  console.log(t, G.cols + 'x' + G.rows, JSON.stringify(hz));
}
