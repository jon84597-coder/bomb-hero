// v4.76 平衡量測：有 BOSS / 沒 BOSS 的場長分布
const { makeEnv } = require('./_sandbox');
const withBoss = process.argv[2] !== 'no';
for (let run = 0; run < 3; run++) {
  const env = makeEnv(); const BH = env.BH, G = env.G;
  if (!withBoss) BH.BR.BOSS_N = 0;
  BH.BR.opt = { n: 30, team: 1, dur: 10 };
  BH.startBR(); G.state = 'play'; G.countdown = 0;
  let t = 0, marks = [];
  for (let i = 0; i < 60 * 620; i++) {
    try { BH.updateBR(1 / 60); } catch (e) { console.log('ERR', e.message); break; }
    t += 1 / 60;
    if (i % (60 * 60) === 0) marks.push(Math.round(t) + 's:' + G.brAlive);
    if (G.endShown) break;
  }
  console.log((withBoss ? 'BOSS ' : 'NOB  ') + 'run' + run, 'END@' + Math.round(t) + 's', marks.join(' '));
}
