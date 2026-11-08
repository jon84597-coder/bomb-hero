// test/verify-v561.js —— v5.61：玩家資料的「加入時間」全都是錯的（1969 年）
//   ① 主檔：時間戳欄位不得用位運算（`| 0` 會 ToInt32 溢位）
//   ② fmtJoin：真的跑起來看格式與壞值處理
//   ③ 後端 pcMs／pcJoin：毫秒／秒／0；帳號與社交身分取「較早」的那個
//   ④ 卡片模組 okTs／fmtDate：壞值不顯示，日期固定數字格式
//   ⑤ 版本
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const cloudSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'cloud.js'), 'utf8');
const pcSrc = fs.readFileSync(path.join(ROOT, 'js/playercard.js'), 'utf8');
const vlogSrc = fs.readFileSync(path.join(ROOT, 'js/version-log.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(n) { console.log('\n=== ' + n + ' ==='); }

/* 從原始碼裡挖出一個函式本體（大括號配對），再真的跑它 —— 比純正則可信。 */
function grab(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('找不到函式 ' + name);
  let d = 0, j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === '{') d++;
    else if (c === '}') { d--; if (!d) { j++; break; } }
  }
  return src.slice(i, j);
}

/* ============================================================
   ① 主檔：時間戳不能用位運算
   ============================================================ */
sec('① 主檔不再截斷時間戳');
const spBlock = (function () {
  const i = mainSrc.indexOf('function showPlayer(o)');
  return mainSrc.slice(i, mainSrc.indexOf('window.Social = {', i));
})();
ok(spBlock.length > 300, '抓到 showPlayer 本體');
ok(!/join:\s*o\.join\s*\|\s*0/.test(spBlock), 'join 不再用 `| 0`（1.79e12 會被截成負數 → 1969 年）');
ok(!/seen:\s*o\.seen\s*\|\s*0/.test(spBlock), 'seen 不再用 `| 0`');
ok(!/avt:\s*o\.avt\s*\|\s*0/.test(spBlock), 'avt 不再用 `| 0`（頭貼版本也是時間戳）');
ok(/join:\s*Number\(o\.join\)\s*\|\|\s*0/.test(spBlock), 'join 改走 Number()');
ok(/seen:\s*Number\(o\.seen\)\s*\|\|\s*0/.test(spBlock), 'seen 改走 Number()');
ok(/avt:\s*Number\(o\.avt\)\s*\|\|\s*0/.test(spBlock), 'avt 改走 Number()');
ok(/sec:\s*o\.sec\s*\|\s*0/.test(spBlock), 'sec（秒數）保留 | 0 —— 那是小整數，不會溢位');

/* 全域反向掃描：任何「時間戳欄位 | 0」都是同樣的病 */
const BAD = ['join', 'seen', 'created', 'lastSeen', 'avt'];
BAD.forEach(function (k) {
  const re = new RegExp('\\b' + k + '\\s*:\\s*[A-Za-z_$][\\w.$]*\\s*\\|\\s*0\\b');
  ok(!re.test(mainSrc), '主檔沒有「' + k + ': xxx | 0」');
});
ok(!/S\.at\s*=\s*o\.at\s*\|\s*0/.test(mainSrc), '每週榜的 S.at 也修了（那是 Date.now()）');
ok(/S\.at\s*=\s*Number\(o\.at\)\s*\|\|\s*0/.test(mainSrc), 'S.at 走 Number()');

/* ============================================================
   ② fmtJoin：真的跑
   ============================================================ */
sec('② fmtJoin（加入時間格式）');
let fmtJoin = null;
try { fmtJoin = new Function('return ' + grab(mainSrc, 'fmtJoin'))(); } catch (e) { fmtJoin = null; }
ok(typeof fmtJoin === 'function', 'fmtJoin 存在且可執行');
if (typeof fmtJoin === 'function') {
  /* 1793901858654 ＝ 2026-11-05 18:04 UTC ＝ 台北 11-06 02:04。
     這裡刻意用「本地時區」的日期 —— 玩家看到的應該是他自己那天的日期。 */
  ok(fmtJoin(1793901858654) === '2026/11/06', '毫秒時間戳 → 2026/11/06（實際 ' + fmtJoin(1793901858654) + '）');
  ok(fmtJoin(1735689600000) === '2025/01/01', '跨年邊界正確（' + fmtJoin(1735689600000) + '）');
  ok(fmtJoin(0) === '—', '沒有資料 → 破折號，不是 1970/01/01');
  ok(fmtJoin(-1394471074) === '—', '被截斷過的負數 → 破折號（這是原本的 bug 值）');
  ok(fmtJoin(undefined) === '—', 'undefined → 破折號');
  ok(fmtJoin(null) === '—', 'null → 破折號');
  ok(fmtJoin(1793901858) === '—', '秒級時間戳（10 位數）→ 破折號，不會變成 1970');
  ok(/^\d{4}\/\d{2}\/\d{2}$/.test(fmtJoin(1793901858654)), '固定 YYYY/MM/DD（不看語系、不補零漏掉）');
}
ok(/加入時間<b>' \+ fmtJoin\(p\.join\)/.test(mainSrc), '資料頁的「加入時間」走 fmtJoin');
ok(!/toLocaleDateString\('zh-TW'\)/.test(mainSrc.slice(mainSrc.indexOf('function renderDetail'), mainSrc.indexOf('function renderDetail') + 3000)),
  '資料頁不再用 toLocaleDateString（遇到壞值會安靜顯示錯的日期）');

/* ============================================================
   ③ 後端 pcMs / pcJoin
   ============================================================ */
sec('③ 後端時間戳正規化');
let pc = null;
try {
  pc = new Function(grab(cloudSrc, 'pcMs') + '\n' + grab(cloudSrc, 'pcJoin') + '\nreturn { pcMs: pcMs, pcJoin: pcJoin };')();
} catch (e) { pc = null; }
ok(!!pc, 'pcMs／pcJoin 可執行');
if (pc) {
  ok(pc.pcMs(1793901858654) === 1793901858654, '毫秒原樣通過');
  ok(pc.pcMs(1793901858) === 1793901858000, '秒級舊資料 ×1000');
  ok(pc.pcMs(0) === 0 && pc.pcMs(null) === 0 && pc.pcMs(undefined) === 0 && pc.pcMs(-1) === 0,
    '空值／負數一律回 0');
  ok(pc.pcMs('1793901858654') === 1793901858654, '字串形式也吃（Supabase 回來可能是字串）');
  ok(pc.pcMs(Date.now()) > 1e12, '現在的時間可以通過');

  const early = { created: 1793901858654 };   /* 11-05 建帳號 */
  const late = { join: 1794138854014 };       /* 11-08 才有社交身分 */
  ok(pc.pcJoin(early, late) === 1793901858654, '取較早的（帳號先建 → 用帳號的日期）');
  ok(pc.pcJoin({ created: 1794138854014 }, { join: 1793901858654 }) === 1793901858654,
    '順序反過來也取較早的');
  ok(pc.pcJoin(null, late) === 1794138854014, '只有社交身分時用它');
  ok(pc.pcJoin(early, null) === 1793901858654, '只有帳號時用它');
  ok(pc.pcJoin(null, null) === 0, '都沒有 → 0');
}
ok(/join:\s*pcJoin\(acc, s\)/.test(cloudSrc), 'pcCard 的 join 走 pcJoin');
ok(!/join:\s*\(acc && acc\.created\)\s*\|\|\s*\(s && s\.join\)/.test(cloudSrc),
  '不再是「帳號優先」（帳號是後來才自動建立的，會顯示成換裝置那天）');

/* ============================================================
   ④ 卡片模組：壞值不顯示
   ============================================================ */
sec('④ 玩家資訊卡的時間顯示');
let pcf = null;
try {
  pcf = new Function(grab(pcSrc, 'okTs') + '\n' + grab(pcSrc, 'fmtDate') +
    '\nreturn { okTs: okTs, fmtDate: fmtDate };')();
} catch (e) { pcf = null; }
ok(!!pcf, 'okTs／fmtDate 可執行');
if (pcf) {
  ok(pcf.fmtDate(1793901858654) === '2026/11/06', '卡片上的加入日期正確（' + pcf.fmtDate(1793901858654) + '）');
  ok(pcf.fmtDate(0) === '', '沒有資料就不顯示這一格（不是 1970/01/01）');
  ok(pcf.fmtDate(-1394471074) === '', '截斷過的負數不顯示');
  ok(pcf.fmtDate(1793901858) === '', '秒級時間戳不顯示（避免顯示 1970）');
  ok(pcf.okTs(Date.now()) > 0, '現在的時間通過檢查');
}
ok(/var jd = fmtDate\(d\.join\)/.test(pcSrc), '「加入」那一格改用 fmtDate');
ok(!/cell\(T\('pc\.join'[^)]*\), fmtAgo\(/.test(pcSrc), '「加入」不再用 fmtAgo（同一個人每次看都不一樣）');
ok(/else if \(fmtAgo\(d\.seen\)\)/.test(pcSrc), '「上線」也先驗過再顯示（壞值不會變「今天」）');
ok(/function okTs\(ts\)/.test(pcSrc) && /t > 1e12 && t < 4e12/.test(pcSrc),
  '合理範圍寫死（2001～2100 年），超出就不顯示');

/* ============================================================
   ④b ago()：壞值不要變成「20765 天前」
   ============================================================ */
sec('④b 相對時間的防呆');
let agoFn = null;
try { agoFn = new Function('return ' + grab(mainSrc, 'ago'))(); } catch (e) { agoFn = null; }
ok(typeof agoFn === 'function', 'ago 可執行');
if (typeof agoFn === 'function') {
  ok(agoFn(0) === '—', 'seen 為 0 → —，不是「20765 天前」（實際 ' + agoFn(0) + '）');
  ok(agoFn(-1394471074) === '—', '截斷的負數 → —');
  ok(agoFn(undefined) === '—', 'undefined → —');
  ok(agoFn(1793901858) === '—', '秒級時間戳 → —');
  ok(/^剛剛|分鐘前|小時前|天前$/.test(agoFn(Date.now())) || /剛剛/.test(agoFn(Date.now())),
    '現在的時間 → 剛剛（' + agoFn(Date.now()) + '）');
  ok(/天前/.test(agoFn(Date.now() - 3 * 86400000)), '三天前 → 「3 天前」');
}
ok(/ago\(p\.seen\) === '—' \? '還沒有動靜'/.test(mainSrc), 'seen 無效時說「還沒有動靜」，不硬湊一句');

/* ============================================================
   ⑤ 版本
   ============================================================ */
sec('⑤ 版本');
const ver = (mainSrc.match(/const VERSION = '([\d.]+)'/) || [])[1] || '0';
ok(parseFloat(ver) >= 5.62, '主檔版本 ≥ 5.62（實際 ' + ver + '）');
ok(new RegExp("v: '" + ver + "'[^\\n]*now: true").test(vlogSrc), 'VERSION_LOG 有 ' + ver + ' 且是 now:true');
ok(/5\.60[^]*now: false/.test(vlogSrc), '上一版 5.60 已標成 now:false');
ok(/加入時間/.test(vlogSrc), '版本日誌有提到這次修的內容');

console.log('\n' + (fail ? '❌ ' : '✅ ') + 'verify-v561：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
