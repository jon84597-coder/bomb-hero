const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

P.settings.size = 'M'; P.settings.soloDiff = 'normal'; P.settings.hazards = 'off';
const day = P.Daily.today();
// 模擬「開始每日挑戰」
P.startSolo(P.Daily.stage(), false, { day: day, seed: P.Daily.seed(), stage: P.Daily.stage(), ms: 0, done: false });
G.state = 'play';
console.log('ghost 物件:', JSON.stringify(G.ghost && { has: G.ghost.has, ms: G.ghost.ms }));

const me = G.players[0];
for (let i = 0; i < 60 * 6; i++) {               // 跑 6 秒
  me.x += 3; me.y += 1;
  P.updateSolo(1 / 60);
  if (i === 200) { G.daily.ms; }
}
console.log('取樣格數:', G.ghost.rec.length, '| 第一天', JSON.stringify(G.ghost.rec[0]), '| 最後', JSON.stringify(G.ghost.rec[G.ghost.rec.length - 1]));

G.players[0].alive = true;
P.dailyClear(G.players[0]);
const g = P.Ghost.today();
console.log('存檔:', !!g, g && g.day, g && g.ms, g && g.path.length);
console.log('at(1.0)=', JSON.stringify(P.Ghost.at(1.0)));
console.log('at(3.5)=', JSON.stringify(P.Ghost.at(3.5)));
console.log('at(999)=', JSON.stringify(P.Ghost.at(999)));

// 畫一次（不炸就好）
try { P.drawDailyGhost(G.T); console.log('drawDailyGhost ok, calls=', env.rec.calls.length); }
catch (e) { console.log('draw ERR', e.message); }
