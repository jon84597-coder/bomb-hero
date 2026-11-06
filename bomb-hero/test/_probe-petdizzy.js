// _probe-petdizzy.js — 隨從丟的炸彈飛過主人頭上，主人會不會被砸暈？
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

P.settings.soloDiff = 'normal';
P.settings.ctrl = 'kb';
P.startSolo(1, false);
G.state = 'play';
G.enemies.length = 0;
G.bombs.length = 0;

const T = G.T, p = G.players[0];
for (let y = 2; y <= 10; y++) for (let x = 2; x <= 10; x++) G.grid[y][x] = 0;
p.x = 5 * T + T / 2; p.y = 6 * T + T / 2;
p.invuln = 0; p.dizzy = 0; p.alive = true; p.dead = false;

const kind = Object.keys(P.PET_KINDS)[0];
const pet = P.makePet(kind, 0, 0);
pet.x = 5 * T + T / 2; pet.y = 5 * T + T / 2;
pet.down = false; pet.hp = 99;
G.pets = [pet];

// 怪在玩家下方 → 炸彈從 (5,5) 飛到 (5,7)，會飛過玩家所在的 (5,6)
const foe = { x: 5 * T + T / 2, y: 7 * T + T / 2, hp: 3, maxHp: 3, dead: false };
const thrown = P.petThrowBomb(pet, foe);
console.log('throw:', thrown, 'bomb petOwner?', G.bombs.length ? !!G.bombs[0].petOwner : 'none');
if (G.bombs[0]) console.log('bomb', G.bombs[0].cx, G.bombs[0].cy, 'from', G.bombs[0].flying && G.bombs[0].flying.fx, G.bombs[0].flying && G.bombs[0].flying.fy);

let dizzyAt = -1, maxDizzy = 0;
for (let i = 0; i < 240; i++) {
  try { P.updateWorld(1 / 60); } catch (e) { console.log('update err', e.message); break; }
  if (p.dizzy > 0) { if (dizzyAt < 0) dizzyAt = i; maxDizzy = Math.max(maxDizzy, p.dizzy); }
}
console.log('player dizzy?', p.dizzy, 'first frame', dizzyAt, 'max', maxDizzy);
console.log('player hp', p.sHp, '/', p.sHpMax, 'alive', p.alive, 'score', p.score);
console.log('bombs left', G.bombs.length, 'flames', G.flames.length);
