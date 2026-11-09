const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = env.BG || P.Game;
P.Solo.unlocked = 40;
const gold0 = P.Shop.gold();
P.Abyss.start(1);
console.log('layer', P.Abyss.layerOf(), 'perks', P.Abyss.perks().length, 'gold0', gold0);
// 模擬過門三次
for (let i = 0; i < 3; i++) P.Abyss.layerClear();
console.log('after 3 clears layer', P.Abyss.layerOf(), 'gold', P.Shop.gold(), '(delta', P.Shop.gold()-gold0, ')');
// 契約三張
const ids = P.ABYSS_PERKS.map(x => x.id);
console.log('perks pool', ids.join(','));
// 手動加入兩張契約 → 檢查數值
P.Game.abyss.perks = ['power', 'greed'];
const sum = P.Abyss.perkSum();
console.log('sum', JSON.stringify(sum));
const before = { power: P.Game.players[0].power, bombs: P.Game.players[0].maxBombs };
P.Abyss.start(6);
const p = P.Game.players[0];
console.log('layer6 power', before.power, '->', p.power, 'bombs', before.bombs, '->', p.maxBombs, 'enemies', P.Game.enemies.length);
console.log('layerGold(6)', P.Abyss.layerGold(6));
// 里程碑
const ms = P.Abyss.msCheck(25);
console.log('ms@25', JSON.stringify(ms), 'gold', P.Shop.gold());
console.log('ms again', JSON.stringify(P.Abyss.msCheck(25)));
