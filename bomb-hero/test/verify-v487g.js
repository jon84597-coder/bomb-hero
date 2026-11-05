// v4.87 驗證：7 天簽到 ／ 每日 3 任務 ／ 關卡三星 ／ 每週榜（含存檔同步與後端模式）
// 跑法：node test/verify-v487g.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CLOUD = fs.readFileSync(path.join(ROOT, '..', 'cloud.js'), 'utf8');

const env = makeEnv();
const B = env.BH;
const Gift = B.Gift;

/* ---------- 日期小工具（全部用 UTC+8 的 dailyDayKey，跟遊戲同一套） ---------- */
function dayShift(key, n) {
  const p = String(key).split('-');
  const d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  d.setUTCDate(d.getUTCDate() + n);
  const p2 = v => (v < 10 ? '0' : '') + v;
  return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate());
}
const TODAY = B.dailyDayKey();
const YESTERDAY = dayShift(TODAY, -1);

console.log('=== ① 獎勵表與任務池 ===');
ok(Gift.REWARDS.length === 7, '簽到 7 天（' + Gift.REWARDS.length + ' 格）');
ok(Gift.REWARDS.every(r => r.g > 0), '每天都有金幣獎勵');
ok(Gift.REWARDS[2].t === 1 && Gift.REWARDS[4].t === 1, '第 3／5 天各給 1 張票券');
ok(Gift.REWARDS[6].t === 2 && Gift.REWARDS[6].g >= 400, '第 7 天是大獎（雙票券＋大金幣）');
ok(Gift.POOL.length >= 5, '每日任務池 ' + Gift.POOL.length + ' 種');
ok(Gift.POOL.every(m => m.id && m.n > 0 && m.g > 0), '任務池每項都有 id／目標數／獎金');

console.log('=== ② 7 天簽到 ===');
const c0 = Gift.checkin();
ok(c0.done === false, '全新狀態：今天還沒簽到');
ok(c0.day === 1 && c0.streak === 0, '第一次簽到就是第 1 天');

const r1 = Gift.claimCheckin();
ok(r1.ok === true && r1.day === 1, '領取第 1 天成功');
ok(r1.gold === Gift.REWARDS[0].g, '發的是第 1 天的金幣（' + r1.gold + '）');
ok(Gift.checkin().done === true, '領完之後 done 變 true');
ok(Gift.claimCheckin().ok === false, '同一天不能再領一次');

// 模擬「昨天簽到過」→ 今天接續第 2 天（不能重來）
Gift._data().last = YESTERDAY;
Gift._data().streak = 1;
ok(Gift.nextStreak() === 2, '昨天有簽 → 今天是第 2 天');
Gift._data().streak = 3;
ok(Gift.nextStreak() === 4, '連續第 3 天 → 今天第 4 天');

// 斷簽（前天簽的，昨天沒簽）→ 從第 1 天重來
Gift._data().last = dayShift(TODAY, -2);
Gift._data().streak = 6;
ok(Gift.nextStreak() === 1, '斷簽一天 → 從第 1 天重來');

// 第 7 天領完 → 下一輪回到第 1 天
Gift._data().last = YESTERDAY;
Gift._data().streak = 7;
ok(Gift.nextStreak() === 1, '第 7 天之後回到第 1 天（7 天一輪）');

console.log('=== ③ 每日 3 任務 ===');
const env2 = makeEnv();
const G2 = env2.BH.Gift;
const m1 = G2.missions();
ok(m1.length === 3, '每天固定 3 個任務');
ok(new Set(m1.map(m => m.id)).size === 3, '3 個任務不重複');
ok(m1.every(m => m.p === 0 && m.got === false), '進度從 0 開始');
ok(JSON.stringify(m1.map(m => m.id)) === JSON.stringify(G2.missions().map(m => m.id)),
   '同一天再呼叫一次 → 抽到同樣 3 個（種子固定）');

// 挑一個「目標數 > 1」的任務來驗進度（perfect 的目標是 1，加一次就達標，驗不出中間態）
let ix = m1.findIndex(m => m.n > 1);
if (ix < 0) ix = 0;
const kind = m1[ix].id, need = m1[ix].n;
G2.add(kind, 1);
ok(G2.missions()[ix].p === 1, '事件累加進度（' + kind + ' 1/' + need + '）');
if (need > 1) ok(G2.claimMission(ix).ok === false, '沒達標不能領');
G2.add(kind, need + 50);
ok(G2.missions()[ix].p === need, '進度封頂在目標數（不會超過）');
const rc = G2.claimMission(ix);
ok(rc.ok === true && rc.gold === m1[ix].g, '達標可領，獎金 = ' + m1[ix].g);
ok(G2.missions()[ix].got === true, '領完標記 got');
ok(G2.claimMission(ix).ok === false, '同一個任務不能重複領');
G2.add(kind, 5);
ok(G2.missions()[ix].p === need, '已領的任務不再累加');

// 跨天 → 重抽（mday 變今天，任務重來）
G2._data().mday = YESTERDAY;
G2._data().mis = [{ id: 'kill', n: 20, p: 20, got: true, g: 100 }];
const m3 = G2.missions();
ok(G2._data().mday === TODAY, '換日後 mday 更新成今天');
ok(m3.length === 3 && m3.every(m => m.got === false && m.p === 0), '換日後任務重抽、進度歸零');

console.log('=== ④ 關卡三星 ===');
const js = Gift.judgeStars;
ok(js(200, 300, true) === 2, '時間夠但有被打到 → ★★');
ok(js(200, 300, false) === 3, '時間夠又沒被打到 → ★★★');
ok(js(50, 300, true) === 1, '時間不夠又有被打到 → ★');
ok(js(50, 300, false) === 1, '沒被打到但時間不夠 → 只有 ★（3 星要兩個條件都滿足）');
ok(js(30, 0, false) === 3, '無限時間＋沒被打到 → ★★★');
ok(js(30, 0, true) === 1, '無限時間＋被打到 → ★');

ok(Gift.setStars(7, 2) === true, '第 7 關記 2 星');
ok(Gift.stars(7) === 2, '讀回 2 星');
ok(Gift.setStars(7, 1) === false, '星數不會倒退（1 星不覆蓋 2 星）');
ok(Gift.stars(7) === 2, '還是 2 星');
ok(Gift.setStars(7, 3) === true && Gift.stars(7) === 3, '可以往上補到 3 星');
const tot = Gift.totalStars();
ok(tot >= 3, '總星數會累加（' + tot + '）');

console.log('=== ⑤ 每週榜 ===');
const wk = Gift.weekKey();
ok(/^\d{4}-W\d{2}$/.test(wk), '週 key 格式正確（' + wk + '）');
const mon = Gift.weekKey(new Date('2026-11-02T04:00:00Z').getTime());   // 週一（UTC+8 12:00）
const sun = Gift.weekKey(new Date('2026-11-08T04:00:00Z').getTime());   // 週日
ok(mon === sun, '同一週的星期一與星期日是同一個 key（' + mon + '）');
const nextMon = Gift.weekKey(new Date('2026-11-09T04:00:00Z').getTime());
ok(nextMon !== mon, '跨到下一週就換 key（' + nextMon + '）');
const stg = Gift.weekStage();
ok(stg >= 1 && stg <= 31, '本週關卡在 1~31（' + stg + '）');
ok(Gift.weekStage() === stg, '本週關卡固定（同一個 key 不會跳）');

ok(Gift.weekBest() === 0, '這週還沒有成績');
ok(Gift.weekSetBest(45000) === true, '第一次交成績 → 寫入');
ok(Gift.weekBest() === 45000, '讀回本週最佳 45000ms');
ok(Gift.weekSetBest(60000) === false, '更慢的成績不會蓋掉最佳');
ok(Gift.weekBest() === 45000, '還是 45000ms');
ok(Gift.weekSetBest(38000) === true && Gift.weekBest() === 38000, '更快的成績會更新');
Gift._data().wbest = '2020-W01:12345';
ok(Gift.weekBest() === 0, '上週的舊成績不算本週（跨週歸零）');

console.log('=== ⑥ 存檔同步（雲端 / 存檔碼） ===');
const st = Gift.state();
ok(st && typeof st === 'object', 'Gift.state() 有回傳物件');
['streak', 'last', 'mday', 'mis', 'stars', 'wbest'].forEach(k => ok(k in st, 'state 含 ' + k));
ok(st.stars && st.stars['7'] === 3, 'state.stars 帶著三星紀錄');

const snap = B.Save.snapshot();
ok(snap && snap.gift, 'Save.snapshot() 有 gift 欄位');
ok(snap.gift && snap.gift.stars['7'] === 3, 'snapshot 的三星跟 Gift 一致');

// merge：三星取大、任務取日期新的、每週最佳同週取秒數小
const remote = { stage: 1, gold: 0, tickets: 0, pets: [], tut: {}, daily: {}, stars: {},
  gift: { streak: 4, last: YESTERDAY, mday: YESTERDAY,
          mis: [{ id: 'brick', n: 40, p: 40, got: true }], stars: { '3': 2, '7': 1 }, wbest: '2026-W01:9999' } };
const local = { stage: 1, gold: 0, tickets: 0, pets: [], tut: {}, daily: {}, stars: {},
  gift: { streak: 2, last: TODAY, mday: TODAY,
          mis: [{ id: 'kill', n: 20, p: 5, got: false }], stars: { '3': 1, '4': 1 }, wbest: '2026-W01:5000' } };
const mg = B.Save.merge(remote, local);
ok(mg.gift.streak === 2 && mg.gift.last === TODAY, '簽到取日期較新的那台（今天贏昨天）');
ok(mg.gift.mis[0].id === 'kill', '任務取日期較新的那一份（不混著加）');
ok(mg.gift.stars['3'] === 2 && mg.gift.stars['4'] === 1, '三星逐關取大（3 關 2 星、4 關 1 星）');
ok(mg.gift.stars['7'] === 1, '遠端有的關卡也留著（7 關 1 星）');
ok(mg.gift.wbest.split(':')[1] === '5000', '同一週的每週最佳取秒數較小（5000）');

// apply：雲端資料寫回 Gift
const env3 = makeEnv();
const G3 = env3.BH.Gift;
ok(G3.stars(9) === 0, '新裝置一開始第 9 關 0 星');
env3.BH.Save.apply({ stage: 1, gold: 0, tickets: 0, pets: [], tut: {}, daily: {}, stars: {},
  gift: { streak: 3, last: YESTERDAY, mday: TODAY,
          mis: [{ id: 'item', n: 8, p: 8, got: false }], stars: { '9': 2 }, wbest: '' } });
ok(G3.stars(9) === 2, 'apply() 後第 9 關變 2 星');
ok(G3.checkin().day === 4, 'apply() 後簽到天數接續（昨天簽 3 天 → 今天第 4 天）');

console.log('=== ⑦ 面板與掛載 ===');
['giftBtn', 'giftBk', 'giftPanel', 'giftTitle', 'giftSub', 'giftBody', 'giftClaim', 'giftGoWeek', 'giftNote', 'giftClose']
  .forEach(id => ok(SRC.indexOf('id="' + id + '"') >= 0, 'HTML 有 #' + id));
ok(/#giftPanel\.on/.test(SRC), '面板有 .on 顯示規則');
ok(/GiftUI\.wire\(\)/.test(SRC), 'boot() 有呼叫 GiftUI.wire()');
ok(/GiftUI\.alertOn\(\)/.test(SRC), '回到首頁／存檔套用後會刷新紅點');
ok(/Gift\.add\('brick'/.test(SRC) && /Gift\.add\('kill'/.test(SRC) && /Gift\.add\('jump'/.test(SRC),
   '炸磚／擊殺／跳躍都有掛上任務進度');
let ui = null;
try { B.GiftUI.alertOn(); B.GiftUI.render(); ui = 'ok'; } catch (e) { ui = String(e && e.message || e); }
ok(ui === 'ok', 'GiftUI.render()/alertOn() 不會拋錯', ui);
ok(typeof B.GiftUI.hasReward === 'function', 'GiftUI.hasReward() 存在（紅點判斷）');

console.log('=== ⑧ 十語系與後端 ===');
// v5.20：字典抽到 js/i18n-src.js（讀不到才退回主檔內嵌的舊格式）
const DICT = (function () { try { return fs.readFileSync(path.join(ROOT, 'js', 'i18n-src.js'), 'utf8'); } catch (e) { return SRC; } })();
const raw = (DICT.match(/window\.__I18N_SRC = `([\s\S]*?)`;/) || DICT.match(/const I18N_SRC = `([\s\S]*?)`;/) || [])[1] || '';
const rows = raw.split('\n').filter(Boolean);
const gRows = rows.filter(r => r.indexOf('gift.') === 0);
ok(gRows.length >= 30, 'gift.* 字典條目 ' + gRows.length + ' 條');
const badCols = gRows.filter(r => r.split('|').length !== 6).map(r => r.split('|')[0]);
ok(badCols.length === 0, '每條都是 6 欄（key＋5 語系）', badCols);
// 前端用到的每個 key 都要真的存在
const used = new Set();
(SRC.match(/t\('(gift\.[A-Za-z]+)'/g) || []).forEach(m => used.add(m.replace(/t\('/, '').replace(/'$/, '')));
(SRC.match(/'(gift\.[A-Za-z]+)'/g) || []).forEach(m => used.add(m.replace(/'/g, '')));
const missing = [...used].filter(k => !gRows.some(r => r.split('|')[0] === k));
ok(missing.length === 0, '程式用到的 gift.* 都有翻譯（' + used.size + ' 個）', missing);

ok(/LB_MODES = \{ daily: 1, weekly: 1 \}/.test(CLOUD), '後端 LB_MODES 多了 weekly');
ok(/function lbWeekOk/.test(CLOUD) && /function lbThisWeek/.test(CLOUD), '後端認得 YYYY-Www 週 key');
ok(/out\.gift = \{ streak: 0/.test(CLOUD), '後端 sanitizeSave() 會清洗 gift');
ok(/mode: 'weekly'/.test(SRC) && /mode=daily/.test(SRC), '前端每週榜跟每日榜分開打');

console.log('\n========================================');
console.log('v4.87 簽到／任務／三星／每週榜：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
