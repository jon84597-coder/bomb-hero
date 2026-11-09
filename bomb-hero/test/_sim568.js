// test/_sim568.js —— v5.67 大逃殺 AI 侵略性模擬（不進 _runall，手動跑）
//   用模擬時鐘跑 120 秒，統計「AI 總共放了幾顆炸彈／死了幾個人／走了多遠」
const { makeEnv } = require('./_sandbox');

function run(n, sec, aiLevel) {
  const env = makeEnv();
  const P = env.BH, G = P.Game;
  env.getId('body').classList.add('touch');
  const cv = env.getId('cv'); cv.clientWidth = 390; cv.clientHeight = 775;
  P.settings.ctrl = 'touch';
  P.settings.aiLevel = aiLevel || 'normal';
  P.BR.opt.n = n;
  P.BR.opt.map = 1;
  P.startBR();
  G.state = 'play';
  const startAlive = G.players.filter(function (p) { return p.alive; }).length;
  const seen = new Set();
  let bombs = 0, walk = 0, endAt = -1;
  const last = new Map();
  G.players.forEach(function (p) { if (p.ai) last.set(p, { x: p.x, y: p.y }); });
  const steps = Math.round(sec * 30);
  for (let i = 0; i < steps; i++) {
    P.updateBR(1 / 30);
    for (let k = 0; k < G.bombs.length; k++) {
      const b = G.bombs[k];
      if (!seen.has(b)) { seen.add(b); bombs++; }
    }
    G.players.forEach(function (p) {
      if (!p.ai) return;
      const o = last.get(p);
      if (o) { walk += Math.abs(p.x - o.x) + Math.abs(p.y - o.y); o.x = p.x; o.y = p.y; }
    });
    if (endAt < 0 && G.state !== 'play') endAt = i / 30;
  }
  const alive = G.players.filter(function (p) { return p.alive; }).length;
  const meAlive = !!(G.players[0] && G.players[0].alive);
  return { n: n, sec: sec, aiLevel: aiLevel, startAlive: startAlive, alive: alive,
    meAlive: meAlive, bombs: bombs, walk: Math.round(walk), endAt: endAt, state: G.state };
}

for (const cfg of [[20, 120, 'normal'], [20, 240, 'normal'], [40, 120, 'strong'], [100, 120, 'normal']]) {
  const r = run(cfg[0], cfg[1], cfg[2]);
  console.log(JSON.stringify(r));
}
