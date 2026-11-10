// test/verify-v57.js —— v4.13 小怪擴充 + 技能（需求 ⑤）
//   · 小怪 10 隻 → 20 隻，美術各有特色
//   · A 撿彈怪：撿起玩家放的炸彈 → 丟回玩家
//   · B 拆彈怪：拆掉附近的炸彈（不會爆炸）
//   · C 聰明怪：看到炸彈會找掩體躲
//   · D 放彈怪：自己放炸彈，火焰只有 1 格
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, html = env.html;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
P.settings.ctrl = 'kb'; P.settings.soloDiff = 'normal'; P.settings.soloTime = 300;
P.startSolo(1, false);
G.state = 'play';
  G.stage = 9;                          // v5.82：招式只在前 3 關關閉；這支測的是技能 AI 本身


// ================================================================
head('① 小怪 10 隻 → 20 隻');
const species = P.ENEMY_SPECIES;
ok(species.length === 48, 'ENEMY_SPECIES 有 48 隻（v4.27：八關 × 6 隻）');
const ids = species.map(function (s) { return s.id; });
const uniq = ids.filter(function (v, i) { return ids.indexOf(v) === i; });
ok(uniq.length === 48, '48 隻的 id 都不重複');
// 每隻都有顏色 / 半徑 / 速度 / 名稱
let allOk = true;
species.forEach(function (s) {
  if (!s.name || !s.color || !s.color2 || !s.r || !s.spd || !s.kind) allOk = false;
});
ok(allOk, '每隻都有名稱／配色／半徑／速度／行為類型');
// 每隻都有專屬美術（eye 走共用分支）
const artIds = [];
const re = /if \(sp === '([a-z]+)'\)/g;
let m;
while ((m = re.exec(html))) artIds.push(m[1]);
// v4.27：新怪走「參數化原型」→ 有 art 欄位也算有專屬美術（15 種身體＋配件）
const ART_KINDS = ['blob', 'worm', 'critter', 'humanoid', 'bug', 'crystal', 'golem',
  'machine', 'sprite', 'bird', 'shell', 'jelly', 'spike', 'ghost', 'ship'];
// eye 沒有 `if (sp === 'eye')` 分支 —— 它是 drawEnemyArt 最後那段【無條件】繪製的預設款
//   （任何未知 id 都長成眼球），所以不算「缺專屬美術」。
const DEFAULT_ART = ['eye'];
const noArt = species.filter(function (s) {
  if (DEFAULT_ART.indexOf(s.id) >= 0) return false;
  return artIds.indexOf(s.id) < 0 && ART_KINDS.indexOf(s.art) < 0;
}).map(function (s) { return s.id; });
ok(noArt.length === 0, '每隻都有專屬美術（缺的：' + (noArt.join(',') || '無') + '）');
const badArt = species.filter(function (s) { return s.art && ART_KINDS.indexOf(s.art) < 0; });
ok(badArt.length === 0, 'art 原型都在實作清單內' + (badArt.length ? '（' + badArt.map(function (s) { return s.id + ':' + s.art; }).join(',') + '）' : ''));
// 新種都在關卡怪池裡
// v5.66：怪池早就不寫成一行了（v4.27 起是 STAGE_ROSTER 八章 × 6 隻）→ 直接查資料
const rosterIds = (P.STAGE_ROSTER || []).reduce(function (a, l) { return a.concat(l); }, []);
const inRoster = function (ids) { return ids.every(function (id) { return rosterIds.indexOf(id) >= 0; }); };
ok(inRoster(['scavenger', 'sapper', 'bomber', 'wizard']), '四隻有技能的怪都在怪池中');
ok(inRoster(['panda', 'penguin', 'octopus', 'robot']), '四隻新的地面怪在怪池中');
ok(inRoster(['wisp', 'hornet']), '兩隻新的飛行怪在怪池中');
// 美術是「精緻」的：新種都有多層造型（不是單純一團）
ok(/if \(sp === 'panda'\)/.test(html) && /if \(sp === 'robot'\)/.test(html) &&
   /if \(sp === 'octopus'\)/.test(html) && /if \(sp === 'wizard'\)/.test(html),
  '新種有多層精緻造型（貓熊／機器人／章魚／小巫師）');

// ================================================================
head('② 技能 A：撿彈怪撿起玩家炸彈再丟回去');
ok(/skill: 'scavenger'/.test(html), '有 scavenger（撿彈怪）這個技能種');
ok(typeof P.enemySkillTick === 'function', 'enemySkillTick 存在（技能 AI）');
ok(/if \(e\.skill === 'scavenger'\)/.test(html), '撿彈怪的 AI 分支存在');
ok(/e\.carryBomb/.test(html), '撿彈怪會把炸彈拿在手上（carryBomb）');
// 實測：玩家放一顆炸彈 nearby → 撿彈怪撿起來
{
  const T = G.T;
  const sc = P.makeEnemy(5, 5, 'scavenger', 1, 1);
  sc.x = 5 * T + T / 2; sc.y = 5 * T + T / 2; sc.speed = 0; sc.dirT = 999;
  G.enemies.length = 0; G.enemies.push(sc); G.bombs.length = 0;
  const pb = { cx: 6, cy: 5, px: 6 * T + T / 2, py: 5 * T + T / 2, timer: 2.4, power: 2,
    owner: G.players[0], passers: [G.players[0]], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 1, armT: 40 };
  G.bombs.push(pb);
  // v4.13：撿彈 + 丟回是在同一個 tick 完成的 → 分兩段驗證
  // 先驗證「撿起來」：把玩家拿遠一點，讓它沒有對手可以丟
  const far = P.makePlayer(2, 2, { px: 0, py: 0 }, { px: 1 * T + T / 2, py: 1 * T + T / 2 });
  far.ai = false; far.alive = true;
  G.players.push(far);
  sc.grabT = 0;
  // v4.19：技能怪只在「有仇恨（玩家 2 格內）」時才動手 → 這裡直接給仇恨
  sc.aggro = true;
  // v5.83：撿彈也要先起手（0.4 秒）→ 跑到撿起來為止，不再假設一幀完成
  for (let i = 0; i < 60 && !sc.carryBomb; i++) P.enemySkillTick(sc, 1 / 60);
  ok(sc.carryBomb != null, '撿彈怪把附近的炸彈撿起來了（手上拿著）');
  ok(G.bombs.indexOf(pb) < 0, '被撿的炸彈已從場上移除（不會在玩家腳下爆）');
  // 丟回去 → 場上會重新出現一顆炸彈（帶 flying）
  if (sc.carryBomb) {
    // 撿起來後會先拿在手上一下 → 多跑幾幀讓它丟出去
    for (let i = 0; i < 40 && sc.carryBomb; i++) P.enemySkillTick(sc, 1 / 60);
    const thrown = G.bombs.filter(function (b) { return b.flying; })[0];
    ok(!!thrown, '撿彈怪把炸彈丟回玩家（場上出現 flying 的炸彈）');
    if (thrown) ok(thrown.owner === sc, '丟出去的炸彈屬於小怪');
  }
  G.players.pop();
  G.enemies.length = 0; G.bombs.length = 0;
}

// ================================================================
head('③ 技能 B：拆彈怪拆掉炸彈（不會爆炸）');
ok(/skill: 'sapper'/.test(html), '有 sapper（拆彈怪）這個技能種');
ok(/if \(e\.skill === 'sapper'\)/.test(html), '拆彈怪的 AI 分支存在');
ok(/e\.defuseT/.test(html), '拆彈怪有拆彈冷卻（defuseT）');
// 實測：附近有炸彈 → 被拆掉且沒有爆炸
{
  const T = G.T;
  const sp = P.makeEnemy(5, 5, 'sapper', 1, 1);
  sp.x = 5 * T + T / 2; sp.y = 5 * T + T / 2; sp.speed = 0; sp.dirT = 999;
  G.enemies.length = 0; G.enemies.push(sp); G.bombs.length = 0; G.flames.length = 0;
  const pb = { cx: 6, cy: 5, px: 6 * T + T / 2, py: 5 * T + T / 2, timer: 0.05, power: 2,
    owner: G.players[0], passers: [G.players[0]], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 1, armT: 40 };
  G.bombs.push(pb);
  sp.defuseT = 0;
  for (let i = 0; i < 60 && G.bombs.indexOf(pb) >= 0; i++) P.enemySkillTick(sp, 1 / 60);
  ok(G.bombs.indexOf(pb) < 0, '炸彈被拆掉了');
  ok(G.flames.length === 0, '拆彈不會爆炸（沒有產生火焰）');
  G.enemies.length = 0; G.bombs.length = 0;
}

// ================================================================
head('④ 技能 C：聰明怪會找掩體躲炸彈');
ok(/if \(e\.smart\)/.test(html), 'smart（躲炸彈）機制存在');
ok(/function enemyFleeStep/.test(html), 'enemyFleeStep（BFS 找掩體）存在');
ok(/dangerAt\(cx0, cy0, null\) \|\| bombNear\(cx0, cy0, 3\)/.test(html),
  '聰明怪看到危險或附近的炸彈會開始躲');
// 實測：smart 的怪會往安全格移動
{
  const T = G.T;
  const sk = P.makeEnemy(5, 5, 'skull', 1, 1);
  sk.x = 5 * T + T / 2; sk.y = 5 * T + T / 2; sk.speed = 0; sk.dirT = 999;
  ok(sk.smart === true, '骷髏兵是 smart（會躲炸彈）');
  G.enemies.length = 0; G.enemies.push(sk); G.bombs.length = 0;
  // 附近放一顆炸彈
  G.bombs.push({ cx: 6, cy: 5, px: 6 * T + T / 2, py: 5 * T + T / 2, timer: 2.4, power: 2,
    owner: G.players[0], passers: [G.players[0]], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 1, armT: 40 });
  const before = sk.dirName;
  P.updateEnemy(sk, 1 / 60);
  ok(sk.fleeT > 0 || sk.dirName !== before, '聰明怪偵測到炸彈後開始找掩體躲');
  G.enemies.length = 0; G.bombs.length = 0;
}

// ================================================================
head('⑤ 技能 D：放彈怪會放炸彈，火焰只有 1 格');
ok(/skill: 'bomber'/.test(html), '有 bomber（放彈怪）這個技能種');
ok(/if \(e\.skill === 'bomber'\)/.test(html), '放彈怪的 AI 分支存在');
ok(/power: 1,\s*\/\/ v4\.13：放彈怪的火焰只有 1 格/.test(html), '放彈怪的炸彈 power = 1（火焰只有 1 格）');
// 實測：放彈怪會自己生炸彈
{
  const T = G.T;
  const bo = P.makeEnemy(5, 5, 'bomber', 1, 1);
  bo.x = 5 * T + T / 2; bo.y = 5 * T + T / 2; bo.speed = 0; bo.dirT = 999;
  G.enemies.length = 0; G.enemies.push(bo); G.bombs.length = 0;
  bo.bombT = 0;
  bo.aggro = true;                       // v4.19：要有仇恨才會放彈
  for (let i = 0; i < 90 && !G.bombs.length; i++) P.enemySkillTick(bo, 1 / 60);
  ok(G.bombs.length === 1, '放彈怪自己生了一顆炸彈');
  if (G.bombs.length === 1) {
    ok(G.bombs[0].power === 1, '那顆炸彈的火焰只有 1 格（power=1）');
    ok(G.bombs[0].owner === bo, '炸彈屬於放彈怪');
  }
  G.enemies.length = 0; G.bombs.length = 0;
}

// ================================================================
head('⑥ 單人闖關與 RPG 的怪池都擴充了');
ok(rosterIds.length === 48, '八章 × 6 隻＝' + rosterIds.length + ' 隻（每隻都排進某一章）');
ok(P.stageRoster(21).indexOf('scavenger') >= 0, 'RPG 後期（第 5 章）會出技能怪');
ok(P.stageRoster(36).indexOf('wizard') >= 0, '單人後期（第 8 章）也會出技能怪');

console.log('');
console.log(fail === 0 ? ('通過 ' + pass + ' / ' + (pass + fail)) : ('✗ ' + fail + ' 項失敗（通過 ' + pass + '）'));
process.exit(fail === 0 ? 0 : 1);
