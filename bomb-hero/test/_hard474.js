const { makeEnv } = require('./_sandbox.js');
for (let run = 0; run < 4; run++) {
  const env = makeEnv(); const BH = env.BH, G = env.G;
  BH.startBR();
  let land = 0, hard = 0, soft = 0, lone = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    if (G.brIsl[y][x] < 0) continue;
    land++;
    const g = G.grid[y][x];
    if (g === 1) { hard++;
      let n1 = 0;
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const px=x+dx, py=y+dy; if (G.grid[py] && G.grid[py][px]===1) n1++; }
      if (n1 === 0) lone++;
    } else if (g === 2) soft++;
  }
  console.log(`run${run} land=${land} hard=${hard} (${(hard/land*100).toFixed(1)}%) lone=${lone} soft=${soft}`);
}
