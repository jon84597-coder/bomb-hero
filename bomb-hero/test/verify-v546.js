// test/verify-v546.js —— v5.46：洗點（全部退回）退還已花金幣，扣 1000 手續費
//   ① 退款試算：買過的每一格照「當時的價錢」加總
//   ② 手續費：有買過才收 1000；沒花過錢的洗點免費
//   ③ 洗點套用：四項歸零、價格階歸零、金幣入帳
//   ④ 退單一格不退錢（不然點一格退一格就能無痛套利）
//   ⑤ 雲端同一套算術（paidRefund / RESPEC_FEE）
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

// 錢包替身
let gold = 10000, spent = [], added = [];
const gp = P.Shop.gold, gs = P.Shop.spend, ga = P.Shop.addGold;
P.Shop.gold = function () { return gold; };
P.Shop.spend = function (n) { spent.push(n); gold -= n; return { ok: true, gold: gold }; };
P.Shop.addGold = function (n) { added.push(n); gold += n; return gold; };
function reset(alloc, paid, total) {
  P.RPG.alloc = Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, alloc || {});
  P.RPG.paid = Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, paid || {});
  P.RPG.bought = 0;
  for (const k in P.RPG.paid) P.RPG.bought += P.RPG.paid[k];
  P.rpgSetTotal(total === undefined ? 16 : total);
  spent.length = 0; added.length = 0;
}

/* ================= ① 退款試算 ================= */
head('① 退款試算（2000 + 2500 + 3000 …）');
reset({}, {});
ok(P.rpgPaidRefund() === 0, '沒買過 → 退 0', P.rpgPaidRefund());
reset({ hp: 4 }, { hp: 1 });
ok(P.rpgPaidRefund() === 2000, '買 1 格 → 2000', P.rpgPaidRefund());
reset({ hp: 5 }, { hp: 2 });
ok(P.rpgPaidRefund() === 4500, '買 2 格 → 2000+2500 = 4500', P.rpgPaidRefund());
reset({ hp: 6 }, { hp: 3 });
ok(P.rpgPaidRefund() === 7500, '買 3 格 → +3000 = 7500', P.rpgPaidRefund());
reset({ hp: 10 }, { hp: 7 });
ok(P.rpgPaidRefund() === 24500, '單項買滿 7 格 → 24,500', P.rpgPaidRefund());
reset({ hp: 4, def: 4 }, { hp: 1, def: 1 });
ok(P.rpgPaidRefund() === 4000, '兩項各買 1 格 → 4000（各項自己從 2000 起）', P.rpgPaidRefund());
reset({ hp: 10, def: 10, spd: 10, atk: 10 }, { hp: 7, def: 7, spd: 7, atk: 7 });
ok(P.rpgPaidRefund() === 98000, '四項買滿 → 98,000', P.rpgPaidRefund());

/* ================= ② 手續費 ================= */
head('② 手續費 1000（沒花過錢不收）');
reset({ hp: 3 }, {});
let info = P.rpgRespecInfo();
ok(info.refund === 0 && info.fee === 0 && info.back === 0, '沒買過 → 0 / 0 / 0（免費洗點）', info);
reset({ hp: 5 }, { hp: 2 });
info = P.rpgRespecInfo();
ok(info.refund === 4500, '退 4,500', info);
ok(info.fee === P.RPG_RESPEC_FEE && info.fee === 1000, '手續費 1,000', info.fee);
ok(info.back === 3500, '實拿 3,500', info.back);
reset({ hp: 4 }, { hp: 1 });
info = P.rpgRespecInfo();
ok(info.back === 1000, '只買 1 格 → 2,000 退 1,000（手續費吃掉一半）', info.back);

/* ================= ③ 洗點套用 ================= */
head('③ 洗點套用：歸零 + 入帳');
reset({ hp: 5, def: 4 }, { hp: 2, def: 1 });
gold = 500;
added.length = 0;
let r = P.rpgRespecApply();
ok(r.back === 4500 + 2000 - 1000, '本次實拿 5,500', r.back);
ok(P.RPG.alloc.hp === 0 && P.RPG.alloc.def === 0 && P.RPG.alloc.spd === 0 && P.RPG.alloc.atk === 0, '四項配點歸零', P.RPG.alloc);
ok(P.RPG.paid.hp === 0 && P.RPG.paid.def === 0 && P.rpgSumPaid() === 0, '價格階歸零', P.RPG.paid);
ok(P.RPG.bought === 0, '「買過幾點」也歸零');
ok(gold === 500 + 5500, '金幣真的進錢包（500 → 6,000）', gold);
ok(added.length === 1 && added[0] === 5500, '只加一次，金額正確', added);
ok(P.rpgPrice('hp') === 2000, '洗點後下一格重新從 2000 起算', P.rpgPrice('hp'));
ok(P.rpgLeft() === 16, 'v5.48：洗點後點數全部回來', P.rpgLeft());
ok(P.rpgSum(P.RPG.alloc) === 0, '四項歸零（每格都吃點，歸零就是全部還回）', P.rpgSum(P.RPG.alloc));
// 沒花過錢 → 一毛都不加
reset({ hp: 2, def: 2 }, {});
gold = 700; added.length = 0;
r = P.rpgRespecApply();
ok(r.back === 0 && added.length === 0, '沒買過的洗點不動錢包', { back: r.back, added: added });
ok(gold === 700, '金幣沒變', gold);

// 上線時的先後順序陷阱：先問雲端（回來的帳號 paid 已歸零）→ 才執行退款。
//   所以 rpgRespecApply 必須接受「事先算好的金額」，不然會永遠退 0。
reset({ hp: 5, def: 4 }, { hp: 2, def: 1 });
gold = 0; added.length = 0;
const pre = P.rpgRespecInfo();
P.RPG.paid = { hp: 0, def: 0, spd: 0, atk: 0 };   // 模擬 Cloud adopt 已經把 paid 清零
const r4 = P.rpgRespecApply(pre);
ok(r4.back === 5500, '帶入事先算好的金額 → 仍然退 5,500', r4.back);
ok(gold === 5500 && added.length === 1, '錢包真的進帳（不是退 0）', { gold: gold, added: added });

/* ================= ④ 退單一格不退錢 ================= */
head('④ 退單一格不退錢');
reset({ hp: 6 }, { hp: 3 });
gold = 3000; added.length = 0; spent.length = 0;
P.rpgAdjust('hp', -1);
ok(P.RPG.alloc.hp === 5 && P.RPG.paid.hp === 2, '真的退了一格（paid 3 → 2）');
ok(added.length === 0 && gold === 3000, '但一毛錢都沒退（想拿回金幣只能洗點）', { added: added, gold: gold });
ok(P.rpgPaidRefund() === 4500, '剩下的 2 格仍可退 4,500', P.rpgPaidRefund());

/* ================= ⑤ 雲端同一套算術 ================= */
head('⑤ 雲端 paidRefund / RESPEC_FEE');
function freshRpg(alloc, paid) {
  return {
    alloc: Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, alloc || {}),
    paid: Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, paid || {}),
    bought: 0, cleared: 0, xp: 0, gold: 0, char: 0, deaths: 0, playSec: 0,
    perm: { hp: 0, bomb: 0, fire: 0 }, sk: {}, skLoad: [], bag: {}, campRev: 0
  };
}
ok(C.RESPEC_FEE === 1000, '雲端 RESPEC_FEE = 1000', C.RESPEC_FEE);
ok(typeof C.paidRefund === 'function', '雲端有 paidRefund()');
let cr = freshRpg({ hp: 5 }, { hp: 2 });
ok(C.paidRefund(cr) === 4500, '雲端算 4,500（跟前端一樣）', C.paidRefund(cr));
cr = freshRpg({ hp: 10, def: 10 }, { hp: 7, def: 7 });
ok(C.paidRefund(cr) === 49000, '兩項買滿 → 49,000', C.paidRefund(cr));
ok(C.paidRefund(freshRpg({}, {})) === 0, '沒買過 → 0', C.paidRefund(freshRpg({}, {})));

/* ================= ⑥ 版本 ================= */
head('⑥ 版本戳記');
const vm = src.match(/const VERSION = '([\d.]+)'/);
ok(vm && parseFloat(vm[1]) >= 5.46, 'VERSION ≥ 5.46', vm && vm[1]);
const vlog = String(SB.vlog || '');
ok(/'5\.46'/.test(vlog), 'VERSION_LOG 有 5.46 條目');
ok(!/v: '5\.46'[\s\S]{0,160}now: true/.test(vlog), '5.46 已改成 now:false（被更新的一版蓋過）');
ok(/1000 \u91d1\u5e63\u624b\u7e8c\u8cbb|1000<\/b> \u91d1\u5e63\u624b\u7e8c\u8cbb/.test(vlog), '更新紀錄有寫到 1000 手續費');

P.Shop.gold = gp; P.Shop.spend = gs; P.Shop.addGold = ga;

console.log('\n' + (fail === 0 ? '✅ 全部 ' + pass + ' 項通過' : '❌ ' + fail + ' 項失敗 / ' + (pass + fail) + ' 項'));
process.exit(fail === 0 ? 0 : 1);
