const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

P.settings.size = 'M'; P.settings.soloDiff = 'normal'; P.settings.hazards = 'off';
P.startSolo(5, false);
G.state = 'play';
const A = G.bossArena, B = A.boss;

console.log('shieldMax=' + A.shieldMax + ' shield=' + A.shield + ' breakT=' + A.breakT + ' rageN=' + A.rageN);
console.log('hp0=' + B.hp + '/' + B.maxHp);

const hits = [];
for (let i = 0; i < 4; i++) hits.push(P.flameHitDamage(B));
console.log('4 hits dmg =', JSON.stringify(hits), '| shield=' + A.shield + ' breakT=' + A.breakT.toFixed(2) + ' hp=' + B.hp);

// 破防期再打 5 下
const h2 = [];
for (let i = 0; i < 5; i++) { h2.push(P.flameHitDamage(B)); B.hp -= h2[h2.length - 1]; }
console.log('break hits =', JSON.stringify(h2), '| hp=' + B.hp);

P.updateBossArena(5.5);
console.log('after window: breakT=' + A.breakT + ' shield=' + A.shield + ' rageN=' + A.rageN);
console.log('spd(rage1)=' + P.bossPhaseSpd(B).toFixed(3) + ' bombK=' + P.bossPhaseBombK(B).toFixed(3));
A.breakT = 2;
console.log('spd(break)=' + P.bossPhaseSpd(B).toFixed(3) + ' bombK=' + P.bossPhaseBombK(B).toFixed(3));
A.breakT = 0;

// 非決戰場的王不吃這套
const e2 = P.makeEnemy(3, 3, null, 1, 1);
console.log('normal foe dmg=' + P.flameHitDamage(e2) + ' spd=' + P.bossPhaseSpd(e2));
console.log('bossShieldMax 1..8 =', [1,2,3,4,5,6,7,8].map(P.bossShieldMax).join(','));
