// _probe-br100.js — 100 人 / 79x62 地圖：出生點、生成時間、每幀成本
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;
P.BR.opt.n = 100;
P.BR.opt.dur = 10;

let t0 = Date.now();
P.startBR();
const buildMs = Date.now() - t0;
console.log('地圖', G.cols + 'x' + G.rows, '建圖', buildMs + 'ms');
console.log('玩家', G.players.length, '出生點唯一',
  new Set(G.players.map(p => p.x + ',' + p.y)).size);
console.log('毒圈 r', G.brZone.r, '首圈預告', G.brZone.nr.toFixed(1));

G.state = 'play';
let ms = 0, frames = 0;
const N = 60 * 20;   // 20 秒
for (let i = 0; i < N; i++) {
  const a = process.hrtime.bigint();
  P.updateBR(1 / 60);
  P.updateWorld(1 / 60);
  ms += Number(process.hrtime.bigint() - a) / 1e6;
  frames++;
}
console.log('每幀 update 平均', (ms / frames).toFixed(2) + 'ms', '存活', G.brAlive);
