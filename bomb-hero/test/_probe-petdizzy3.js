// _probe-petdizzy3.js — bomber 隨從：丟彈飛過主人時，主人會不會暈？
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;
P.settings.soloDiff = 'normal';
P.settings.ctrl = 'kb';
P.startSolo(1, false);
G.state = 'play';
G.enemies.length = 0; G.bombs.length = 0;
const T = G.T, p = G.players[0];
for (let y = 2; y < Math.min(G.rows - 2, 14); y++) for (let x = 2; x < Math.min(G.cols - 2, 14); x++) G.grid[y][x] = 0;
p.x = 5 * T + T / 2; p.y = 6 * T + T / 2; p.invuln = 0;

let pet;
try { pet = P.makePet('bomber', 0, 0); } catch (e) { console.log('makePet err', e.message); process.exit(1); }
console.log('pet kind', pet && pet.kind, 'hp', pet && pet.hp);
pet.x = 5 * T + T / 2; pet.y = 4 * T + T / 2; pet.hp = 99; pet.down = false;
G.pets = [pet];

let foe;
try { foe = P.makeEnemy(7, 10, 1, 1); } catch (e) { console.log('makeEnemy err', e.message); process.exit(1); }
foe.hp = foe.maxHp = 9999;
G.enemies.push(foe);

let _d = 0, hits = [], throws = 0; const seen = new Set();
Object.defineProperty(p, 'dizzy', {
  configurable: true, get() { return _d; },
  set(v) { if (v > 0 && !(_d > 0)) hits.push(new Error().stack.split('\n').slice(2, 4).join(' | ')); _d = v; }
});
let firstBomb = null;
for (let i = 0; i < 60 * 90; i++) {
  P.updateWorld(1 / 60);
  G.bombs.forEach(function (b) {
    if (b.petOwner && !seen.has(b)) {
      seen.add(b); throws++;
      if (!firstBomb) firstBomb = { cx: b.cx, cy: b.cy, fx: b.flying && b.flying.fx, fy: b.flying && b.flying.fy };
    }
  });
  if (hits.length) break;
}
console.log('bomber 丟彈', throws, '第一顆', JSON.stringify(firstBomb), 'dizzy', hits.length);
hits.forEach(function (h) { console.log(h); });
console.log('player hp', p.sHp, '/', p.sHpMax, 'alive', p.alive);
