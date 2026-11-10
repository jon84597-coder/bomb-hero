// test/verify-v565.js —— v5.64：金幣出口四項（重抽／復活／隨從升級／押注）
//   ① 起手強化重抽：價格遞增、一局 3 次、鎖住的卡不會被洗掉
//   ② 局內復活：價格公式、限制條件、半血復活、不重複發金幣
//   ③ 隨從 Lv.1→5：升級扣款、等級上限、冷卻與傷害真的變強、存檔帶 lv
//   ④ 大逃殺押注：先扣款、前三名賠付、期望值 < 1
//   ⑤ 字典六語言
//   ⑥ 版本
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const i18nSrc = fs.readFileSync(path.join(ROOT, 'js/i18n-src.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(n) { console.log('\n=== ' + n + ' ==='); }

function grab(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('找不到函式 ' + name);
  let d = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (!d) { j++; break; } }
  }
  return src.slice(i, j);
}

/* ---------------- ① 重抽 ---------------- */
sec('① 起手強化：重抽 ＋ 鎖卡');
ok(/const REROLL_COST = \[200, 400, 800\];/.test(mainSrc), '價格 200／400／800 遞增');
ok(/if \(rerollN >= REROLL_COST\.length\) return;/.test(mainSrc), '一局上限 3 次');
ok(/r = Shop\.spend\(c\);/.test(mainSrc), '重抽真的扣金幣（走 Shop.spend）');
ok(/rerollN = 0; locks = \{\};/.test(mainSrc), '每次開面板重設次數與鎖定');
ok(/function toggleLock\(i\)/.test(mainSrc), '有鎖卡切換');
ok(/data-bplock="' \+ i \+ '"/.test(mainSrc), '卡片上有鎖頭（可點）');
ok(/if \(locks\[i\]\) \{ out\[i\] = locks\[i\]; used\[locks\[i\]\.id\] = 1; \}/.test(mainSrc),
  '★ 重抽會保留鎖住的卡');
ok(/picks = roll\(true\)/.test(mainSrc), '重抽走 roll(true)');
ok(/picks = roll\(false\)/.test(mainSrc), '開面板走 roll(false)（全部重抽）');
ok(/id="bpReroll"/.test(idxSrc), 'index.html 有重抽按鈕');
ok(/#buffPick \.bpreroll\{/.test(idxSrc), '重抽按鈕有樣式');

/* roll(true) 真的保留鎖牌 —— 把模組挖出來跑 */
(function () {
  const rollSrc = grab(mainSrc, 'roll');
  const toggleSrc = grab(mainSrc, 'toggleLock');
  const availSrc = grab(mainSrc, 'availList');
  const defs = '[{id:"a",ico:"A",max:3},{id:"b",ico:"B",max:3},{id:"c",ico:"C",max:3},' +
    '{id:"d",ico:"D",max:3},{id:"e",ico:"E",max:3},{id:"f",ico:"F",max:3}]';
  const fn = new Function(
    'Game', 'BUFF_DEFS', 'locks', 'picks',
    'BUFF_DEFS = ' + defs + ';' +
    'var locks = {}; var picks = null;' +
    availSrc + '\n' + rollSrc + '\n' + toggleSrc + '\n' +
    'var first = roll(false);' +
    'locks[1] = first[1];' +
    'var again = roll(true);' +
    'return { first: first.map(function(d){return d.id;}), again: again.map(function(d){return d.id;}),' +
    '  kept: again[1] && again[1].id };'
  );
  const r = fn({ buffs: {} }, null, {}, null);
  ok(r.first.length === 3, '抽三張');
  ok(r.kept === r.first[1], '★ 鎖住的那張重抽後還在原位');
  ok(r.again.length === 3, '重抽後仍是三張');
  ok(new Set(r.again).size === 3, '重抽不會出現重複卡');
})();

/* ---------------- ② 復活 ---------------- */
sec('② 局內復活');
(function () {
  const priceSrc = grab(mainSrc, 'revivePrice');
  const fn = new Function('Game', priceSrc + '\nreturn revivePrice;');
  /* revivePrice 讀的是外層的 Game（不接受參數）→ 每一關都要建一個新的閉包 */
  const at = function (st) { return fn({ stage: st })(); };
  ok(at(1) === 340, '第 1 關 = 340（300＋40×1）');
  ok(at(10) === 700, '第 10 關 = 700');
  ok(at(40) === 1900, '第 40 關 = 1900');
  ok(at(0) === 340, '關號 0 也有底價（不會變 300 以下）');
})();
ok(/if \(Game\.revived\) return false;/.test(mainSrc), '每局只能一次');
ok(/if \(Game\.daily \|\| Game\.bossRush\) return false;/.test(mainSrc), '每日／BOSS 連戰不給');
ok(/if \(Game\.bossArena\) return false;/.test(mainSrc), '決戰場不給');
ok(/p\.sHp = Math\.max\(1, Math\.ceil\(p\.sHpMax \/ 2\)\);/.test(mainSrc), '★ 半血復活（不是滿血）');
ok(/Game\.revived = true;/.test(mainSrc) && /Game\.state = 'play';/.test(mainSrc), '復活後解除凍結');
ok(!/resetPlayerStats\(p\);\s*\n\s*Game\.revived/.test(mainSrc), '復活不會洗掉整輪強化');
ok(/if \(reviveCanOffer\(\)\)|reviveCanOffer\(\) \? revivePrice\(\) : 0/.test(mainSrc), '死亡時才判斷要不要給');
ok(/Game\.paidScore/.test(mainSrc), '★ 已結算的分數有記帳（復活後不重複發金幣）');
ok(/const coins = Math\.max\(0, all - paid\);/.test(mainSrc), '死亡時只發差額');
ok(/Math\.round\(p\.coin \|\| 0\) - Math\.max\(0, Game\.paidCoin \| 0\)/.test(mainSrc),
  '過關時也只發差額（v5.86：改看 p.coin）');
ok(/id="btnRevive"/.test(mainSrc), '結算畫面有復活按鈕');
ok(/Shop\.spend\(reviveCost\)/.test(mainSrc), '復活真的扣金幣');

/* ---------------- ③ 隨從升級 ---------------- */
sec('③ 隨從 Lv.1→5');
ok((mainSrc.match(/ups: \[4000, 8000, 16000, 32000\]/g) || []).length === 3, '三隻都有 4 級價目');
(function () {
  const env = makeEnv();
  const BH = env.BH;
  const Shop = BH.Shop;
  ok(typeof Shop.upgrade === 'function' && typeof Shop.lvOf === 'function', 'Shop 匯出 upgrade／lvOf');
  Shop.reset();
  Shop.addGold(200000);
  const devMode = Shop.dev();
  const g0 = Shop.gold();
  ok(Shop.lvOf('blade') === 0, '還沒雇用 → lv 0');
  const b = Shop.buy('blade');
  ok(b.ok, '雇用成功');
  ok(Shop.lvOf('blade') === 1, '★ 新雇用的隨從是 Lv.1');
  let r = Shop.upgrade('blade');
  ok(r.ok && r.lv === 2, '★ 升級到 Lv.2');
  ok(devMode || Shop.gold() === g0 - 8000 - 4000, '扣款 8,000（雇用）＋ 4,000（升級）');
  ok(Shop.upgrade('blade').lv === 3, 'Lv.3');
  ok(Shop.upgrade('blade').lv === 4, 'Lv.4');
  ok(Shop.upgrade('blade').lv === 5, 'Lv.5');
  r = Shop.upgrade('blade');
  ok(!r.ok && r.err === 'MAX', '★ 滿級後不能再升');
  ok(Shop.upgrade('bomber').err === 'NOT_OWNED', '沒雇用的不能升');
  /* 存檔要帶 lv，不然重新整理等級就消失 */
  const st = Shop.state();
  ok(st.pets[0].lv === 5, '★ state() 有帶等級');
  Shop.reset();
  Shop.setState(st);
  ok(Shop.lvOf('blade') === 5, '★ setState() 能把等級還原');
  ok(Shop.lvOf('bogus') === 0, '不存在的隨從回 0');
})();
(function () {
  const mulSrc = grab(mainSrc, 'petCdMul');
  const dmgSrc = grab(mainSrc, 'petDmgOf');
  const fn = new Function(mulSrc + '\n' + dmgSrc + '\nreturn { mul: petCdMul, dmg: petDmgOf };');
  const f = fn();
  ok(Math.abs(f.mul({ lv: 1 }) - 1) < 1e-9, 'Lv.1 冷卻 = 原始值');
  ok(Math.abs(f.mul({ lv: 5 }) - 0.68) < 1e-9, 'Lv.5 冷卻 = 原始 × 0.68（−32%）');
  ok(f.dmg({ lv: 1 }) === 1 && f.dmg({ lv: 2 }) === 1, 'Lv.1／2 傷害 1');
  ok(f.dmg({ lv: 3 }) === 2 && f.dmg({ lv: 5 }) === 3, '★ Lv.3／5 傷害 +1／+2');
  ok(Math.abs(f.mul({ lv: 99 }) - 0.68) < 1e-9, '離譜等級會被夾住');
})();
ok(/pp\.atkCd|pt\.atkCd = 2 \* petCdMul\(pt\)/.test(mainSrc), '刀客冷卻套等級');
ok(/pt\.atkCd = 3 \* petCdMul\(pt\)/.test(mainSrc), '投彈冷卻套等級');
ok(/petHitEnemy\(foe, petDmgOf\(pt\)\)/.test(mainSrc), '刀客傷害套等級');
ok(/makePet\(list\[i\]\.kind, list\[i\]\.ch, i, list\[i\]\.lv\)/.test(mainSrc), '出場時把等級帶進隨從');
ok(/hp: hp, maxHp: hp/.test(mainSrc) && /petHpMax\(kind, lv\)/.test(mainSrc), '血量也吃等級');
ok(/data-petup="/.test(mainSrc), '商店有升級按鈕');
ok(/owned\.push\(\{ kind: kind, ch: .*lv: 1 \}\)/.test(mainSrc), '新雇用寫入 lv:1');

/* ---------------- ④ 押注 ---------------- */
sec('④ 大逃殺押注');
ok(/opt: \{ n: 100, team: 1, dur: 10, map: 1, bet: 0 \}/.test(mainSrc), 'BR.opt 有 bet 預設 0');
ok(/k === 'map' \|\| k === 'bet'/.test(mainSrc), '★ bet 的 0 不會被 || 1 吃掉');
ok(/seg\('bet', \[\[0, t\('br\.betOff'\)\], \[500, '500'\], \[2000, '2000'\], \[5000, '5000'\]\]\)/.test(mainSrc),
  '四個押注選項（含不押注）');
ok(/Game\.brBet = 0;\n    const bet = Math\.max\(0, BR\.opt\.bet \| 0\);/.test(mainSrc),
  '★ 出發當下就扣押注（不能等結算才扣）');
ok(/if \(rr && rr\.ok\) Game\.brBet = bet;/.test(mainSrc), '扣成功才記下押注額');
ok(/place === 1 \? 1\.6 : place === 2 \? 1\.2 : place === 3 \? 1\.0 : 0/.test(mainSrc),
  '★ 賠率 1.6／1.2／1.0，其餘 0');
(function () {
  /* 期望值必須 < 1（否則押注會變成印鈔機） */
  const mul = function (place) { return place === 1 ? 1.6 : place === 2 ? 1.2 : place === 3 ? 1.0 : 0; };
  ok(mul(1) < 2 && mul(2) < 1.5 && mul(3) <= 1 && mul(4) === 0, '各名次賠率合理');
  /* 100 人、假設平均名次 → 中獎率 3%，期望值遠小於 1 */
  const ev = (1.6 + 1.2 + 1.0) / 100;
  ok(ev < 0.05, '期望值很低（真的能回收金幣）');
})();
ok(/br\.betWin/.test(mainSrc) && /br\.betLose/.test(mainSrc), '結算會顯示押注輸贏');

/* ---------------- ⑤ 字典 ---------------- */
sec('⑤ 字典六語言');
['buff.reroll', 'buff.rerollEnd', 'buff.lockHint', 'rev.live', 'rev.half',
  'pet.lv', 'pet.upTip', 'pet.lvUp', 'br.bet', 'br.betOff', 'br.betTip',
  'br.betWin', 'br.betLose'].forEach(function (k) {
  const line = i18nSrc.split('\n').filter(function (l) { return l.indexOf(k + '|') === 0; })[0];
  ok(!!line, k + ' 存在');
  ok(!!line && line.split('|').length === 6, k + ' 有六個語言欄位');
});

/* ---------------- ⑥ 版本 ---------------- */
sec('⑥ 版本');
const m = mainSrc.match(/const VERSION = '([\d.]+)';/);
const ver = m ? m[1] : '';
ok(!!ver && Number(ver.split('.')[1]) >= 64, 'VERSION ≥ 5.64（實際 ' + ver + '）');

console.log('\n' + (fail ? '❌ ' : '✅ ') + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
