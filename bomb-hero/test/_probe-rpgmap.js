const { makeEnv } = require('./_sandbox.js');
const env = makeEnv(); const P = env.BH, G = env.G;
const rows = [];
for (let st = 1; st <= 40; st++) {
  P.startRpg(st, {});
  const boss = !!G.bossArena;
  const info = G.mapInfo || {};
  rows.push({
    st: st,
    ch: P.chapterOf ? P.chapterOf(st) : '?',
    slot: P.stageSlot ? P.stageSlot(st) : '?',
    theme: G.theme && G.theme.n,
    sub: info.sub,
    nm: info.n,
    idx: info.idx,
    size: G.cols + 'x' + G.rows,
    boss: boss,
    foes: G.enemies.length,
    walls: (function(){let c=0;for(let y=0;y<G.rows;y++)for(let x=0;x<G.cols;x++)if(G.grid[y][x]===1)c++;return c;})()
  });
}
console.log('st ch sl theme            sub idx  name        size    boss foes walls');
rows.forEach(r => {
  console.log(
    String(r.st).padStart(2), ' ',
    String(r.ch).padStart(2), ' ',
    String(r.slot).padStart(2), ' ',
    String(r.theme || '-').padEnd(16, ' '),
    String(r.sub).padStart(3), ' ',
    String(r.idx).padStart(3), ' ',
    String(r.boss ? '(arena)' : r.nm || '-').padEnd(11, ' '),
    String(r.size).padEnd(7),
    r.boss ? 'B' : ' ', String(r.foes).padStart(4), String(r.walls).padStart(4)
  );
});
