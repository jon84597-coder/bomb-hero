const { makeEnv } = require('./_sandbox.js');
function run(mapMode) {
  const out = [];
  for (const st of [1, 2, 5, 6, 17, 21, 25, 29, 33, 37, 40]) {
    const env = makeEnv(); const P = env.BH, G = env.G;
    P.settings.mapMode = mapMode;
    P.startRpg(st, {});
    const info = G.mapInfo || {};
    out.push({
      st, mode: mapMode, size: G.cols + 'x' + G.rows,
      nm: info.boss ? '(BOSS)' : info.n, shape: info.shape,
      theme: G.theme && G.theme.name, boss: !!G.bossArena
    });
  }
  return out;
}
console.log('=== mapMode = classic（預設）===');
run('classic').forEach(r => console.log(
  'st', String(r.st).padStart(2), r.size.padEnd(6), String(r.theme).padEnd(8), String(r.nm).padEnd(7), r.shape || ''));
console.log('\n=== mapMode = random ===');
run('random').forEach(r => console.log(
  'st', String(r.st).padStart(2), r.size.padEnd(6), String(r.theme).padEnd(8), String(r.nm).padEnd(7), r.shape || '', r.boss ? 'BOSS' : ''));
