// 探针：对战模式坐骑龙吐火，到底有没有伤到 AI
const { makeEnv } = require('./_sandbox');
const env = makeEnv(); const P = env.BH, G = P.Game;
P.settings.count = 4; P.settings.size = 'M'; P.settings.wins = 2;
P.Battle.resetSlots();
P.startBattle();
G.state = 'play';

const T = G.T;
console.log('mode=', G.mode, 'T=', T, 'players=', G.players.length);
console.log('players:', G.players.map(function (p, i) {
  return i + ':' + (p.ai ? 'AI' : 'HUM') + (p.alive ? '' : '(dead)');
}).join('  '));

const me = G.players[0], foe = G.players[1];
if (!me || !foe) { console.log('沒有對手'); process.exit(0); }

// 把雙方放到同一條走道上，面對面
me.x = 3 * T + T / 2; me.y = 3 * T + T / 2; me.alive = true; me.invuln = 0;
foe.x = 5 * T + T / 2; foe.y = 3 * T + T / 2; foe.alive = true; foe.invuln = 0;
me.dino = true; me.redDragon = false; me.fireCd = 0; me.facing = 'right';
console.log('\n--- 小龍朝右吐火，對手在右邊 2 格 ---');
console.log('me.facing =', me.facing, ' dino =', me.dino, ' fireCd =', me.fireCd);
const ok1 = P.fireBreath(me);
console.log('fireBreath 回傳:', ok1, ' 火焰數:', G.flames.length);
console.log('火焰格:', G.flames.map(function (f) { return f.cx + ',' + f.cy + (f.src ? '/' + f.src : '') + (f.owner === me ? '[me]' : f.owner === foe ? '[foe]' : ''); }).join(' '));
console.log('對手格:', Math.floor(foe.x / T) + ',' + Math.floor(foe.y / T), ' 對手還活著:', foe.alive);

// 手動跑一幀更新，看傷害判定有沒有觸發
P.updateBattle ? P.updateBattle(1 / 60) : null;
console.log('跑一幀後 → 對手還活著:', foe.alive, ' me.fireCd =', me.fireCd);

// 逐格掃描：火焰實際覆蓋到哪些座標
console.log('\n--- flameCovers 覆蓋檢查 ---');
G.flames.forEach(function (f) {
  const hit = P.flameCovers(f, foe.x, foe.y, T);
  console.log('  flame(' + f.cx + ',' + f.cy + ') 蓋到對手?', hit);
});

// 直接看 fireBreath 產生的火焰 owner 是誰
console.log('\n--- 火焰 src/owner ---');
G.flames.forEach(function (f, i) {
  console.log('  #' + i, 'cx=' + f.cx, 'cy=' + f.cy, 'src=' + f.src, 'owner=' + (f.owner === me ? 'me' : f.owner === foe ? 'foe' : String(f.owner)));
});
