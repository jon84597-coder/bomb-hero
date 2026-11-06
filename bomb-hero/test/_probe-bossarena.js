const { makeEnv } = require('./_sandbox.js');
function audit(st, rpg) {
  const env = makeEnv(); const P = env.BH, G = env.G;
  if (rpg) P.startRpg(st); else P.startSolo(st, false);
  let hard = 0, soft = 0, hz = {}, hidden = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    const v = G.grid[y][x];
    if (v === 1) hard++; else if (v === 2) soft++;
    const h = G.hazards[y] && G.hazards[y][x];
    if (h) hz[h.type] = (hz[h.type] || 0) + 1;
  }
  hidden = Object.keys(G.hidden || {}).length;
  // 半徑 1 檢查
  function r1clean(cx, cy) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x <= 0 || y <= 0 || x >= G.cols - 1 || y >= G.rows - 1) continue;
      if (G.grid[y][x] !== 0) return false;
      if (G.hazards[y][x]) return false;
    }
    return true;
  }
  const boss = G.enemies.filter(e => e.boss || e.type === 'boss')[0];
  return {
    st, rpg, cols: G.cols, rows: G.rows, hard, soft, hz, hidden,
    door: G.door && [G.door.x, G.door.y, G.door.revealed, G.door.open],
    bossArea: r1clean(8, 2), playerArea: r1clean(8, 13),
    bossHp: boss && boss.hp, bossPos: boss && [Math.floor(boss.x / G.T), Math.floor(boss.y / G.T)],
    playerPos: [Math.floor(G.players[0].x / G.T), Math.floor(G.players[0].y / G.T)],
    arena: !!G.bossArena
  };
}
for (const st of [5, 10, 40]) console.log(JSON.stringify(audit(st, false)));
for (const st of [5, 40]) console.log(JSON.stringify(audit(st, true)));
