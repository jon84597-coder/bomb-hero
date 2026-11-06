// _probe-boss5.js — 第 5 關 BOSS 決戰場
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;
P.settings.ctrl = 'kb';
P.settings.soloDiff = 'normal';

P.startSolo(5, false);
G.state = 'play';
console.log('地圖', G.cols + 'x' + G.rows, 'stage', G.stage, 'isBoss', P.isBossStage(5));
console.log('玩家格', Math.floor(G.players[0].x / G.T), Math.floor(G.players[0].y / G.T));
console.log('門', JSON.stringify(G.door), '王', G.enemies.length, G.enemies[0] && [Math.floor(G.enemies[0].x / G.T), Math.floor(G.enemies[0].y / G.T)].join(','));
console.log('開場小兵數', G.enemies.filter(e => !e.boss).length);

// 跑 61 秒 → 應該生 2 隻
for (let i = 0; i < 61 * 60; i++) P.updateSolo(1/60); P.updateWorld(1/60);
const minions = G.enemies.filter(e => e && !e.boss && !e.dead);
console.log('60 秒後小兵', minions.length, '門開?', G.door.open, '王血', G.enemies[0] && G.enemies[0].hp);

// 打死王 → 門要開
const boss = G.enemies.find(e => e.boss);
if (boss) { boss.hp = 0; boss.dead = true; }
P.updateSolo(1/60); P.updateWorld(1/60);
console.log('王死後門開?', G.door.open, 'bossDead', G.bossArena && G.bossArena.bossDead);
