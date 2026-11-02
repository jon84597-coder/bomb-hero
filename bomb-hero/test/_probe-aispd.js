const { makeEnv } = require('./_sandbox');
const env = makeEnv(); const P = env.BH, G = P.Game;
P.settings.count = 4; P.settings.size = 'M'; P.settings.wins = 2;
P.Battle.resetSlots(); P.startBattle(); G.state = 'play';
const T = G.T;
const ai = G.players.filter(function (p) { return p.ai; });
console.log('AI 數:', ai.length, ' T=', T);
const start = ai.map(function (p) { return { x: p.x, y: p.y }; });
let frames = 0;
for (let i = 0; i < 120; i++) { P.updateBattle(1 / 60); frames++; }
console.log('跑了', frames, '幀（2 秒）');
ai.forEach(function (p, i) {
  const dx = p.x - start[i].x, dy = p.y - start[i].y;
  const d = Math.sqrt(dx * dx + dy * dy);
  console.log('  AI' + (i + 1), '位移', d.toFixed(1), 'px  →', (d / 2).toFixed(1), 'px/秒',
    '(玩家基礎 146 px/秒)', ' speedLv=' + p.speedLv, ' aiDir=' + p.aiDir);
});
const me = G.players[0];
console.log('玩家 speedLv=', me.speedLv, ' moveSpeed=', me.speedLv);
