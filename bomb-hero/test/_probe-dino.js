// test/_probe-dino.js — 探針：對戰模式龍吐火是否真的能燒死對手
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

P.settings.size = 'M';
P.settings.count = 2;
P.settings.ctrl = 'kb';
P.settings.hazards = 'off';
P.Battle.resetSlots();
P.startBattle();
G.state = 'play';

const T = G.T;
const p0 = G.players[0], p1 = G.players[1];
function openCell() {
  for (let y = 4; y < G.rows - 4; y++) {
    for (let x = 4; x < G.cols - 6; x++) {
      if (G.grid[y][x] === 0 && G.grid[y][x + 1] === 0 && G.grid[y][x + 2] === 0) return [x, y];
    }
  }
  return [4, 4];
}
const [cx, cy] = openCell();
p0.x = cx * T + T / 2; p0.y = cy * T + T / 2;
p1.x = (cx + 1) * T + T / 2; p1.y = cy * T + T / 2;
p0.invuln = 0; p1.invuln = 0;
p0.alive = true; p1.alive = true;
p1.ai = true;
p0.dino = true; p0.redDragon = false; p0.fireCd = 0; p0.facing = 'right';
G.flames = [];
console.log('mode', G.mode, 'p0', p0.x | 0, p0.y | 0, 'p1', p1.x | 0, p1.y | 0);
const ok = P.fireBreath(p0);
console.log('fireBreath ->', ok, 'flames', G.flames.map(f => [f.cx, f.cy, f.src, f.owner === p0]));
for (let i = 0; i < 12; i++) P.updateWorld(1 / 60);
console.log('after step: p1.alive', p1.alive, 'dead', p1.dead, 'invuln', p1.invuln, 'respawnT', p1.respawnT);
console.log('mode players score', G.players.map(p => p.score));
