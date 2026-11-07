// test/verify-v544.js —— v5.44：
//   ① 直放資訊列貼到最上面（原本上面空 46px 給工具列）＋ 工具列只留 ⋮
//   ② 十顆資訊格的配重（內距／間距／窄機收格／計時器不准壓縮）
//   ③ RPG 配點：免費點用完後可用 2000 金幣買額外點（價格／上限／金幣不足）
//   ④ 版本 / 版本日誌
const SB = require('./_sandbox');
const env = SB.makeEnv();
const P = env.BH;
const src = SB.rawHtml;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
// 直放那一區的起點：同一個 selector 在橫屏區也有一份，一定要從這裡往後找
const PORT = src.indexOf('/* v4.43\uff1a\u624b\u6a5f\u904a\u6232\u4e2d\u53ea\u7559');
function ruleFrom(sel, from) {
  const i = src.indexOf(sel, from);
  if (i < 0) return '';
  const j = src.indexOf('{', i), k = src.indexOf('}', j);
  return (j < 0 || k < 0) ? '' : src.slice(j + 1, k);
}
// 取第一個符合 selector 的規則宣告區塊
function rule(sel) {
  const i = src.indexOf(sel);
  if (i < 0) return '';
  const j = src.indexOf('{', i), k = src.indexOf('}', j);
  return (j < 0 || k < 0) ? '' : src.slice(j + 1, k);
}

/* ================= ① 直放資訊列貼最上 ================= */
head('① 直放資訊列貼最上（原本空 46px）');
const ptTop = ruleFrom('body.touch.in-game #scr-game.on .game-top {', PORT);
ok(/padding-top:\s*calc\(2px \+ env\(safe-area-inset-top/.test(ptTop),
  'padding-top 從 46px 收到 2px + 安全區（貼著狀態列下緣）', ptTop.slice(0, 130));
ok(!/calc\(46px/.test(ptTop), '舊的 46px 讓位已移除');
ok(/padding-right:\s*50px/.test(ptTop), '右邊讓 50px 給右上角的 ⋮');
ok(/margin-bottom:\s*1px/.test(ptTop), '下緣 margin 2px → 1px（再省 1px）');

const ptFull = rule('body.touch.in-game.pseudo-full #scr-game.on .game-top {');
ok(/padding-right:\s*4px/.test(ptFull), '全螢幕（pseudo-full，工具列被收掉）不用讓位 → 資訊列吃滿寬度', ptFull);

/* ================= ② 工具列只留 ⋮ ================= */
head('② 直放工具列只留 ⋮');
ok(/body\.touch\.in-game #navBar\.inGame #btnBack,\s*body\.touch\.in-game #navBar\.inGame #acctChip\s*\{\s*display:\s*none/.test(src),
  '← 與 👤 在遊戲中收起（暫停選單有「回首頁」，帳號膠囊在首頁還在）');
const navBtn = rule('body.touch.in-game #navBar.inGame .navbtn {');
ok(/min-height:\s*30px/.test(navBtn) && /height:\s*30px/.test(navBtn), '遊戲中工具列按鈕 44px → 30px（不壓到下面的 ⏸）', navBtn);
const moreBtn = rule('body.touch.in-game #navBar.inGame #btnMore {');
ok(/min-width:\s*30px/.test(moreBtn) && /min-height:\s*30px/.test(moreBtn), '⋮ 30×30（原本 38×38）', moreBtn);

/* ================= ③ 資訊格配重 ================= */
head('③ 資訊格配重（十顆塞得進 430 寬）');
const topGap = ruleFrom('body.touch.in-game #gameTop {', PORT);
ok(/gap:\s*2px/.test(topGap), '#gameTop 間距 3px → 2px', topGap);
const ptChip = ruleFrom('body.touch.in-game #gameTop .chip {', PORT);
ok(/padding:\s*0 3px/.test(ptChip), 'chip 左右內距 5px → 3px（十顆共省 40px）', ptChip.slice(0, 120));
ok(/gap:\s*2px/.test(ptChip), 'chip 內 gap 3px → 2px');
ok(/min-height:\s*20px/.test(ptChip), 'chip 高度維持 20px（沒有為了省空間犧牲可讀性）');
const timerRule = ruleFrom('body.touch.in-game #gameTop #hudTimer {', PORT);
ok(/flex:\s*0 0 auto/.test(timerRule), '計時器 flex 0 0 auto —— 永遠不准被壓縮', timerRule);
ok(/@media \(max-width: 400px\)/.test(src), '窄機（<400px）有專門的收格規則');
ok(/body\.touch\.in-game #gameTop \.chip\[data-k="spd"\] \{ display: none; \}/.test(src),
  '<400px 收「速度等級」');
ok(/body\.touch\.in-game #gameTop \.chip\[data-k="gear"\] \{ display: none; \}/.test(src),
  '<370px 再收背包');
// 橫屏（v5.42）不能被這次改動拖累
ok(/min-height:\s*21px/.test(rule('body.touch.in-game #gameTop .chip {')),
  '橫屏那組 21px 規則還在（沒被直放蓋掉）');

/* ================= ④ 執行期：金幣買配點 ================= */
head('④ RPG 配點：金幣買額外點');
ok(P.RPG_PT_BUY === 2000, 'RPG_PT_BUY = 2000', P.RPG_PT_BUY);
ok(P.RPG.bought === 0, 'RPG.bought 預設 0', P.RPG.bought);
ok(!!P.RPG.paid, 'RPG.paid（各項買過幾格）存在');
P.RPG.paid = { hp: 0, def: 0, spd: 0, atk: 0 };

// v5.48：每一格都吃 1 點（前 3 格只吃點、第 4 格起還要金幣）。總點數自己給 20 點好驗
P.rpgSetTotal(20);
P.RPG.alloc = { hp: 9, def: 0, spd: 0, atk: 0 };
P.RPG.bought = 0;
ok(P.rpgLeft() === 11, '九點點完 → 剩 11（20 - 9）', P.rpgLeft());

// 按鈕：四項都還在免費格內 → 「＋」、不顯示價錢
P.RPG.alloc = { hp: 2, def: 1, spd: 0, atk: 0 };
P.Rpg.renderStats();
let rows = String(env.getId('rpgRows').innerHTML || '');
ok(!/buypt/.test(rows), '前 3 格不顯示價錢，維持「＋」');
ok(rows.indexOf('>＋<') > 0, '＋ 按鈕存在');

// 第 4 格起 → 顯示價錢；滿 10 格 → 禁用
P.RPG.alloc = { hp: 10, def: 3, spd: 0, atk: 0 };
P.Rpg.renderStats();
rows = String(env.getId('rpgRows').innerHTML || '');
ok(/class="buypt"/.test(rows), '第 4 格起 → 按鈕加上 class="buypt"');
ok(rows.indexOf('💰2000') > 0, '按鈕直接寫價格 2000');
ok(!/class="buypt"[^>]*disabled/.test(rows), '「＋」在買點模式下不能被禁用（否則點不動）');
ok((rows.match(/class="buypt"/g) || []).length === 1,
  '只有防禦那一項（第 4 格）顯示價錢', (rows.match(/class="buypt"/g) || []).length);
ok(/data-d="1"[^>]*disabled/.test(rows), '滿 10 格那一項（生命）仍然是禁用狀態');

// 金幣足、點數也足 → 買成功（金幣與點數兩個都要扣）
let goldNow = 5000, spent = [];
const gp = P.Shop.gold, sp = P.Shop.spend;
P.Shop.gold = function () { return goldNow; };
P.Shop.spend = function (n) { spent.push(n); goldNow -= n; return { ok: true, gold: goldNow }; };
P.RPG.alloc = { hp: 4, def: 3, spd: 0, atk: 0 };
P.RPG.bought = 0;
P.RPG.paid = { hp: 0, def: 0, spd: 0, atk: 0 };
const r1 = P.rpgBuyPoint('def');
ok(r1 === true, '金幣與點數都夠 → 買點成功', r1);
ok(P.RPG.alloc.def === 4, '防禦 3 → 4');
ok(P.RPG.bought === 1, 'bought 累加 1');
ok(spent.length === 1 && spent[0] === 2000, 'Shop.spend 收到 2000 金幣', spent);
ok(goldNow === 3000, '金幣 5000 → 3000', goldNow);
ok(P.rpgLeft() === 12, '點數也扣了 1（13 → 12）', P.rpgLeft());

// 點數用完 → 就算有錢也不能再買
goldNow = 99999; spent.length = 0;
P.rpgSetTotal(4);
P.RPG.alloc = { hp: 4, def: 0, spd: 0, atk: 0 };
ok(P.rpgBuyPoint('hp') === false, 'v5.48：沒有屬性點 → 有錢也買不了', P.RPG.alloc.hp);
ok(spent.length === 0, '點數不足時一毛都沒扣', spent);

// 金幣不足
P.rpgSetTotal(20);
goldNow = 500; spent.length = 0;
P.RPG.alloc = { hp: 4, def: 3, spd: 0, atk: 0 };
const r2 = P.rpgBuyPoint('def');
ok(r2 === false, '金幣不足 → 回 false', r2);
ok(P.RPG.alloc.def === 3, '金幣不足時不會偷加點');
ok(spent.length === 0, '金幣不足時完全沒有扣款');

// 單項上限 10 格：就算有錢有點也買不了
goldNow = 99999;
P.RPG.alloc = { hp: 10, def: 0, spd: 0, atk: 0 };
ok(P.rpgBuyPoint('hp') === false, '生命已滿 10 格 → 有錢也不能買');

// 還有屬性點時，rpgBuyPoint 走原本那條（不扣金幣）
goldNow = 5000;
spent.length = 0;
P.RPG.alloc = { hp: 0, def: 0, spd: 0, atk: 0 };
P.RPG.bought = 0;
P.rpgSetTotal(9);
const r3 = P.rpgBuyPoint('def');
ok(r3 === true && P.RPG.alloc.def === 1, '還有屬性點 → 正常配點成功');
ok(spent.length === 0, '前 3 格不會扣金幣', spent);

// 還原
P.Shop.gold = gp; P.Shop.spend = sp;

/* ================= ⑤ 版本 ================= */
head('⑤ 版本戳記');
const vm = src.match(/const VERSION = '([\d.]+)'/);
ok(vm && +vm[1] >= 5.44, 'VERSION ≥ 5.44', vm && vm[1]);
const vl = String(env.htmlAll || src);
ok(/'5\.44'/.test(String(SB.vlog || vl)), 'VERSION_LOG 有 5.44 條目');
ok(!/v: '5\.44'[\s\S]{0,120}now: true/.test(String(SB.vlog || vl)), '5.44 已改成 now:false');
ok(!/v: '5\.43'[^}]*now: true/.test(String(SB.vlog || vl)), '5.43 已改成 now:false');

console.log('\n' + (fail === 0 ? '✅ 全部 ' + pass + ' 項通過' : '❌ ' + fail + ' 項失敗 / ' + (pass + fail) + ' 項'));
process.exit(fail === 0 ? 0 : 1);
