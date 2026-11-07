// test/verify-v545.js —— v5.45：配點改成「每項前 4 格免費、第 5 格起金幣」
//   ① 價格階：2000 → 2500 → 3000 …（跟著「這一項買過幾格」走）
//   ② 免費 4 格：前 4 格不花錢，第 5 格開始一定要錢
//   ③ 免費額度上限 16 格；「剩餘點數」= 真正還能用的免費點
//   ④ 退點先退買來的、洗點清價格階
//   ⑤ 雲端裁判：spendPoint 同一套規則（改前端也刷不出便宜價）
//   ⑥ 版本
const SB = require('./_sandbox');
const env = SB.makeEnv();
const P = env.BH;
const src = SB.rawHtml;
const C = require('../../cloud.js');

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

// 錢包替身：記錄每一次扣款
let gold = 999999, spent = [];
const gp = P.Shop.gold, gs = P.Shop.spend;
P.Shop.gold = function () { return gold; };
P.Shop.spend = function (n) { spent.push(n); gold -= n; return { ok: true, gold: gold }; };
function reset(alloc, paid, total) {
  P.RPG.alloc = Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, alloc || {});
  P.RPG.paid = Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, paid || {});
  P.RPG.bought = 0;
  for (const k in P.RPG.paid) P.RPG.bought += P.RPG.paid[k];
  P.rpgSetTotal(total === undefined ? 16 : total);
  spent.length = 0;
}

/* ================= ① 價格階 ================= */
head('① 價格階：2000 / 2500 / 3000 …');
ok(P.RPG_FREE_PER === 4, 'RPG_FREE_PER = 4（每項前 4 格免費）', P.RPG_FREE_PER);
ok(P.RPG_PT_BUY === 2000, '第 1 個金幣格 = 2000', P.RPG_PT_BUY);
ok(P.RPG_PT_STEP === 500, '每多一階 +500', P.RPG_PT_STEP);
reset({ hp: 4 });
ok(P.rpgPrice('hp') === 2000, '沒買過 → 下一格 2000', P.rpgPrice('hp'));
reset({ hp: 5 }, { hp: 1 });
ok(P.rpgPrice('hp') === 2500, '買過 1 格 → 2500', P.rpgPrice('hp'));
reset({ hp: 6 }, { hp: 2 });
ok(P.rpgPrice('hp') === 3000, '買過 2 格 → 3000', P.rpgPrice('hp'));
reset({ hp: 9 }, { hp: 5 });
ok(P.rpgPrice('hp') === 4500, '買過 5 格 → 4500（第 10 格）', P.rpgPrice('hp'));
reset({ hp: 5, def: 0 }, { hp: 1 });
ok(P.rpgPrice('def') === 2000, '換一項從 2000 重新起算（不是全域統一價）', P.rpgPrice('def'));
ok(P.rpgPrice('hp') === 2500, '同一項維持自己的階', P.rpgPrice('hp'));
// 四項全滿的總價
let totalCost = 0;
for (let i = 0; i < 6; i++) totalCost += 2000 + 500 * i;
ok(totalCost === 19500 && totalCost * 4 === 78000, '單項 5→10 格共 19,500；四項全滿 78,000', totalCost);

/* ================= ② 前 4 格免費 ================= */
head('② 前 4 格白拿，第 5 格起要錢');
reset({}, {}, 16);
for (let i = 0; i < 4; i++) P.rpgAdjust('atk', 1);
ok(P.RPG.alloc.atk === 4, '連按 4 次 → 攻擊 4 格');
ok(spent.length === 0, '前 4 格完全沒扣金幣', spent);
ok(P.RPG.paid.atk === 0, '前 4 格不會記成買來的');
// 免費點還很多（16-4=12），第 5 格仍然要錢
ok(P.rpgLeft() === 12, '免費點還剩 12', P.rpgLeft());
P.rpgAdjust('atk', 1);
ok(P.RPG.alloc.atk === 5, '第 5 格有加上去');
ok(spent.length === 1 && spent[0] === 2000, '第 5 格扣 2000（免費點再多也不能白加）', spent);
ok(P.RPG.paid.atk === 1, '記下「攻擊買過 1 格」');
ok(P.rpgLeft() === 12, '買來的格子不吃免費額度 → 仍剩 12', P.rpgLeft());

/* ================= ③ 免費額度上限 16 ================= */
head('③ 免費額度 = 4 格 × 4 項 = 16');
reset({ hp: 4, def: 4, spd: 4, atk: 4 }, {}, 40);
ok(P.rpgFreeCap() === 16, '總點數 40 時，免費額度仍夾在 16', P.rpgFreeCap());
ok(P.rpgLeft() === 0, '四項都滿 4 格 → 剩 0（不會顯示一堆用不掉的點）', P.rpgLeft());
reset({ hp: 4, def: 4 }, {}, 9);
ok(P.rpgLeft() === 1, '兩項滿 4 格、總點數 9 → 剩 1', P.rpgLeft());
reset({ hp: 4 }, {}, 9);
ok(P.rpgLeft() === 5, '一項滿 4 格、總點數 9 → 剩 5', P.rpgLeft());

/* ================= ④ 退點 / 洗點 ================= */
head('④ 退點先退買來的、洗點清價格階');
reset({ hp: 6 }, { hp: 2 });
P.rpgAdjust('hp', -1);
ok(P.RPG.alloc.hp === 5, '退一格 → 6 → 5');
ok(P.RPG.paid.hp === 1, '退掉的是買來的那格 → paid 2 → 1');
ok(P.rpgPrice('hp') === 2500, '價格階跟著降回 2500', P.rpgPrice('hp'));
reset({ hp: 4 }, { hp: 0 });
P.rpgAdjust('hp', -1);
ok(P.RPG.alloc.hp === 3 && P.RPG.paid.hp === 0, '退免費格不會亂動 paid');
// 洗點（全部退回）：價格階歸零
reset({ hp: 9 }, { hp: 5 });
P.RPG.alloc = { hp: 0, def: 0, spd: 0, atk: 0 };
P.RPG.paid = { hp: 0, def: 0, spd: 0, atk: 0 };
ok(P.rpgPrice('hp') === 2000, '洗點後重新從 2000 起算', P.rpgPrice('hp'));

/* ================= ⑤ 金幣不足 / 上限 / 隨機分配 ================= */
head('⑤ 金幣不足、單項上限、隨機分配');
reset({ hp: 4 }, { hp: 0 }, 16);
gold = 1999;
const before = P.RPG.alloc.hp;
ok(P.rpgBuyPoint('hp') === false, '1999 金幣買不起 2000 的格子 → 失敗', P.RPG.alloc.hp);
ok(P.RPG.alloc.hp === before && P.RPG.paid.hp === 0, '失敗時不偷加點、不記帳');
gold = 999999;
reset({ hp: 10 }, { hp: 6 }, 16);
ok(P.rpgBuyPoint('hp') === false, '滿 10 格 → 有錢也買不了');
reset({}, {}, 16);
P.rpgRandomAlloc();
const rnd = P.RPG.alloc;
ok(rnd.hp <= 4 && rnd.def <= 4 && rnd.spd <= 4 && rnd.atk <= 4, '隨機分配每項都不超過 4 格（不替玩家花錢）', rnd);
ok(rnd.hp + rnd.def + rnd.spd + rnd.atk <= 16, '隨機分配不會超過免費額度', rnd);

/* ================= ⑥ 雲端同一套規則 ================= */
head('⑥ 雲端裁判 spendPoint');
function freshRpg(alloc, paid) {
  return {
    alloc: Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, alloc || {}),
    paid: Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, paid || {}),
    bought: 0, cleared: 0, xp: 0, gold: 0, char: 0, deaths: 0, playSec: 0,
    perm: { hp: 0, bomb: 0, fire: 0 }, sk: {}, skLoad: [], bag: {}, campRev: 0
  };
}
let r = freshRpg({ def: 0 }, {});
let res = C.spendPoint(r, 'def', 1, 0);
ok(res.ok && r.alloc.def === 1, '免費格：不帶 pay 也能加（前 4 格）', res);
r = freshRpg({ def: 4 }, {});
res = C.spendPoint(r, 'def', 1, 0);
ok(!res.ok && res.err === 'NO_POINTS', '第 5 格不帶 pay → 後端直接拒絕', res);
res = C.spendPoint(r, 'def', 1, 2000);
ok(res.ok && r.alloc.def === 5, '帶了 pay → 放行', res);
ok(r.paid.def === 1 && r.bought === 1, '後端也記「買過 1 格」', [r.paid.def, r.bought]);
// 這個帳號總點數 9（cleared=0）→ 免費額度 9；用掉 4 格免費後應該剩 5
ok(C.freeLeftOf(r) === 5, '買來的那格不吃免費額度（仍剩 5，不是 4）', C.freeLeftOf(r));
// 退點先退買來的
res = C.spendPoint(r, 'def', -1, 0);
ok(r.alloc.def === 4 && r.paid.def === 0, '後端退點也是先退買來的', [r.alloc.def, r.paid.def]);
// 免費額度用完 → 前 4 格也得付錢
r = freshRpg({ hp: 4, spd: 4, atk: 4, def: 0 }, {});
res = C.spendPoint(r, 'def', 1, 0);
ok(!res.ok && res.err === 'NO_POINTS', '免費 16 格用光 → 第 1 格也要 pay', res);
// 買滿 10 格
r = freshRpg({ def: 10 }, { def: 6 });
ok(!C.spendPoint(r, 'def', 1, 99999).ok, '第 11 格後端也擋');

/* ================= ⑦ 版本 ================= */
head('⑦ 版本戳記');
const vm = src.match(/const VERSION = '([\d.]+)'/);
ok(vm && +vm[1] >= 5.45, 'VERSION ≥ 5.45', vm && vm[1]);
const vlog = String(SB.vlog || '');
ok(/'5\.45'/.test(vlog), 'VERSION_LOG 有 5.45 條目');
ok(/v: '5\.45'[\s\S]{0,120}now: true/.test(vlog), '5.45 是 now:true（最新）');

P.Shop.gold = gp; P.Shop.spend = gs;

console.log('\n' + (fail === 0 ? '✅ 全部 ' + pass + ' 項通過' : '❌ ' + fail + ' 項失敗 / ' + (pass + fail) + ' 項'));
process.exit(fail === 0 ? 0 : 1);
