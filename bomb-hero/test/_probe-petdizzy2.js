// _probe-petdizzy2.js — 實際跑一場單人關（帶隨從），用 setter 抓「誰把 p.dizzy 設起來」
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

P.settings.soloDiff = 'normal';
P.settings.ctrl = 'kb';
P.startSolo(1, false);
G.state = 'play';

const p = G.players[0];
let hits = [];
let _d = 0;
Object.defineProperty(p, 'dizzy', {
  configurable: true,
  get() { return _d; },
  set(v) {
    if (v > 0 && !(_d > 0)) {
      const st = (new Error()).stack.split('\n').slice(1, 5).join('\n');
      hits.push({ v: v, t: +G.gameT.toFixed(2), stack: st });
    }
    _d = v;
  }
});

// 放一隻隨從在主角旁邊
const kind = Object.keys(P.PET_KINDS)[0];
const pet = P.makePet(kind, 0, 0);
pet.x = p.x - G.T; pet.y = p.y; pet.hp = 99; pet.down = false;
G.pets = [pet];

// 生幾隻怪在附近，讓隨從有事做
for (let i = 0; i < 3; i++) {
  try {
    const e = P.makeEnemy(6 + i, 6, 1, 1);
    if (e) G.enemies.push(e);
  } catch (err) {}
}
console.log('enemies', G.enemies.length, 'pets', G.pets.length);

for (let i = 0; i < 60 * 90; i++) {
  try { P.updateWorld(1 / 60); } catch (e) { console.log('upd err', e.message); break; }
  if (hits.length >= 3) break;
}
console.log('dizzy 次數', hits.length);
hits.forEach(function (h) {
  console.log('--- t=' + h.t + ' v=' + h.v);
  console.log(h.stack);
});
