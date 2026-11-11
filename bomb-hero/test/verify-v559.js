// test/verify-v559.js —— v5.59：所有看得到的玩家名字都能點出「玩家資訊卡」
//   ① 後端 /api/player/card：路由三處都登記、只吃 GET、有白名單與限流
//   ② 隱私：輸出欄位是白名單（email／username／IP／裝置／密碼／存檔信封一律不外流）
//   ③ 前端模組：選擇器覆蓋七種名字來源、會剝「1. 」「🤖 」、不搶 Social 名單的點擊
//   ④ Social.showPlayer：離線的人也能從卡片跳進完整資料頁
//   ⑤ i18n：33 條文案六欄齊備、沒有重複 key
//   ⑥ 版本與載入順序
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SB = require('./_sandbox');

const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const cloudSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'cloud.js'), 'utf8');
const serverSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'server.js'), 'utf8');
const htmlSrc = typeof SB.rawHtml === 'function' ? SB.rawHtml() : SB.rawHtml;
const pcSrc = fs.readFileSync(path.join(ROOT, 'js/playercard.js'), 'utf8');
const i18nSrc = fs.readFileSync(path.join(ROOT, 'js/i18n-src.js'), 'utf8');
const vlogSrc = fs.readFileSync(path.join(ROOT, 'js/version-log.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(n) { console.log('\n=== ' + n + ' ==='); }

/* ============================================================
   ① 後端路由
   ============================================================ */
sec('① 後端 /api/player/card');
ok(/const isPc = p === '\/api\/player\/card'/.test(cloudSrc), 'cloud.js handle() 有登記 isPc');
ok(/!isSoc && !isPc\) return false/.test(cloudSrc), 'isPc 進了「這是我們的 API 嗎」的白名單（漏了會回 no such api）');
ok(/url\.pathname === '\/api\/player\/card'/.test(serverSrc), 'server.js 的轉交白名單也有（第二道門，漏了同樣 404）');
ok(/function pcCard\(pid, name\)/.test(cloudSrc), '有 pcCard(pid, name)');
ok(/function pcSoc\(pid, name\)/.test(cloudSrc) && /function pcAcc\(name\)/.test(cloudSrc),
  '社交名單與帳號兩邊都會查（只有一邊的話，離線的人或沒綁帳號的人會查不到）');
ok(/if \(isPc && req\.method === 'GET'\)/.test(cloudSrc), '只吃 GET（不給寫入）');
ok(/gate\(req, res, 'pcard', 60, 0\.5, CORS_PC\)/.test(cloudSrc), '有限流（60 次／分，公開端點不能讓人列舉整個資料庫）');
ok(/return fail\(res, 400, 'BAD_NAME', CORS_PC\)/.test(cloudSrc), '沒帶名字要回 400，不能回全部人');
ok(/return fail\(res, 404, 'NOT_FOUND', CORS_PC\)/.test(cloudSrc), '查不到要回 404（前端才能老實說查不到）');
ok(/function pcName\(s\)/.test(cloudSrc) && /replace\(\/\[\\u0000-\\u001f<>\]\/g/.test(cloudSrc),
  '名字有清洗（控制字元與角括號）');
ok(/p\.n !== name/.test(cloudSrc), '社交名單用「名字完全相同」比對（不做模糊比對）');
ok(/\(p\.seen \|\| 0\) > \(hit\.p\.seen \|\| 0\)/.test(cloudSrc), '同名時取最近活躍的那個（規則寫死，不是隨機）');

/* ============================================================
   ② 隱私：白名單輸出
   ============================================================ */
sec('② 隱私白名單');
const pcBlock = (function () {
  const i = cloudSrc.indexOf('function pcCard(pid, name)');
  const j = cloudSrc.indexOf('async function handle(req, res, url)');
  return cloudSrc.slice(i, j > i ? j : i + 4000);
})();
ok(pcBlock.length > 400, '抓到 pcCard 本體');
['email', 'username', 'pass', 'secret', 'ip', 'ips', 'key', 'save', 'makeEnvelope', 'layout', 'events']
  .forEach(function (k) {
    ok(!new RegExp('(^|[\\s,{])' + k + '\\s*:').test(pcBlock), '輸出不含 ' + k + ' 欄位');
  });
ok(/clampInt\(/.test(pcBlock), '每個數字都有夾值（不直接把別人的資料原樣丟出去）');
ok(/MAX_STAGE/.test(pcBlock), '關卡數字夾在合法範圍內');
ok(/SOC_TTL/.test(pcBlock), '「在線」判定沿用社交名單那一套（150 秒），不自己另立標準');

/* ============================================================
   ③ 前端模組
   ============================================================ */
sec('③ 玩家資訊卡模組');
ok(/js\/playercard\.js/.test(htmlSrc), 'index.html 有載入 playercard.js');
ok(htmlSrc.indexOf('notify.js') < htmlSrc.indexOf('playercard.js'), '排在 notify.js 之後（主檔與其他模組都先就位）');
ok(/window\.__BHPlayerCard = API/.test(pcSrc), '有掛全域（測試與其他模組可用）');
ok(/module\.exports = API/.test(pcSrc), '有 module.exports（測試能直接 require）');
ok(/window\.__BH/.test(pcSrc) && /typeof b\.t === 'function'/.test(pcSrc), '文案走主檔的 t()（不是自己寫死中文）');

const SEL_NEED = ['[data-pc]', '.lbrow .nm', '.rkname', '.gwrow > span:first-child', '#pkRoster .plabel', '#onChatWho b', '#invList .invrow b'];
SEL_NEED.forEach(function (s) {
  ok(pcSrc.indexOf("'" + s + "'") >= 0, '選擇器有 ' + s);
});
ok(/'\.onrow,#onBody \.onrow,#specBar,#bhModal,#pcModal,(#dvcModal,)?input,textarea,select,button'/.test(pcSrc),
  'SKIP 名單含 .onrow（那裡本來就會開完整資料頁，不能被搶）與 .specBar（那顆是切鏡頭）');
ok(/addEventListener\('click', onDocClick, true\)/.test(pcSrc), '用捕獲階段委派（抗主檔重畫）');
ok(/nm\.textContent = n/.test(pcSrc), '名字用 textContent 塞（暱稱可能含 < > &）');
ok(/function esc\(s\)/.test(pcSrc) && /esc\(/.test(pcSrc), '其餘欄位有跳脫');
ok(/e\.key === 'Escape'/.test(pcSrc), 'Esc 可以關');
ok(/e\.target === m/.test(pcSrc), '點背景可以關');
ok(/tabindex="-1"/.test(pcSrc), '卡片按鈕 tabindex="-1"（不插進手把／鍵盤焦點鏈）');
ok(/var WAIT = 8000;/.test(pcSrc), '有 8 秒上限（伺服器叫不醒時不能一直轉圈）');
ok(/var TTL = 60000;/.test(pcSrc), '有 60 秒快取（榜單同一個人常被連點）');
ok(/delete inflight\[key\]/.test(pcSrc), '同一個人同時點兩次只打一次 API');
ok(/cur\.n !== n/.test(pcSrc), '期間被點去別人時，舊回應不會蓋掉新卡片');
ok(/navigator\.clipboard/.test(pcSrc) && /execCommand\('copy'\)/.test(pcSrc), '複製有兩條路（clipboard／舊瀏覽器 fallback）');
ok(/已離線\|已离线/.test(pcSrc), '「（已離線）玩家 1234」這種佔位名不當成真人');
/* 每週榜一列有兩個 span（名字＋秒數），只認第一格；空榜那格是提示語，不是人 */
ok(/hot\.closest\('\.gwrow'\) &&/.test(pcSrc) && /\^\\d\+\\s\*\[\.、\]/.test(pcSrc),
  '每週榜只認「1. 名字」那一格（點秒數、空榜提示語都不會開卡片）');

/* 真的 require 起來驗 pickName（靜態正則驗不出剝皮順序） */
sec('③b pickName 真的跑');
function loadPc() {
  const saved = { win: global.window, doc: global.document };
  global.document = {
    getElementById: function () { return null; },
    createElement: function () {
      return {
        style: {}, id: '', textContent: '', className: '',
        setAttribute: function () {}, addEventListener: function () {},
        appendChild: function () {}, querySelector: function () { return null; },
        classList: { add: function () {}, remove: function () {}, contains: function () { return false; }, toggle: function () {} }
      };
    },
    addEventListener: function () {},
    head: { appendChild: function () {} },
    documentElement: { appendChild: function () {} },
    body: { appendChild: function () {} }
  };
  global.window = { __BH: { Ach: { TITLES: [{ name: '新手上路', ico: '🌱', color: '#3a8', bg: '#dfd' }], DEV_TITLE: { name: '開發者', ico: '🛠️', color: '#333', bg: '#eee' } } } };
  let API = null;
  try {
    const p = path.join(ROOT, 'js/playercard.js');
    delete require.cache[require.resolve(p)];
    API = require(p);
  } catch (e) {
    API = { err: String(e && e.message) };
  }
  global.window = saved.win;
  global.document = saved.doc;
  return API;
}
const PC = loadPc();
ok(!PC.err, '模組載入沒有丟例外' + (PC.err ? '（' + PC.err + '）' : ''));
function fakeEl(txt, attr) {
  return {
    textContent: txt,
    hasAttribute: function (k) { return !!attr && attr[k] !== undefined; },
    getAttribute: function (k) { return attr ? attr[k] : null; }
  };
}
ok(typeof PC.pickName === 'function', '有 pickName()');
ok(PC.pickName(fakeEl('阿爆')) === '阿爆', '一般名字原樣回傳');
ok(PC.pickName(fakeEl('1. 阿爆')) === '阿爆', '每週榜的「1. 阿爆」→ 阿爆');
ok(PC.pickName(fakeEl('12、阿爆')) === '阿爆', '「12、阿爆」也剝得掉');
ok(PC.pickName(fakeEl('🤖 電腦二號')) === '電腦二號', 'HUD 的「🤖 電腦二號」→ 電腦二號');
ok(PC.pickName(fakeEl('👑小明🛒')) === '小明', '👑 與 🛒 都剝掉');
ok(PC.pickName(fakeEl('  阿爆  ')) === '阿爆', '前後空白修掉');
ok(PC.pickName(fakeEl('<b>阿爆</b>')) === 'b阿爆/b', '角括號先被清掉（不可能變成 HTML）');
ok(PC.pickName(fakeEl('阿爆', { 'data-pc': '指定的名字' })) === '指定的名字', '有 data-pc 時以它為準');
ok(PC.pickName(fakeEl('')) === '', '空字串回空（不會拿空名字去查）');
ok(PC.pickName(fakeEl('阿'.repeat(40))).length === 24, '名字上限 24 字（跟後端一致）');
/* titleOf 會即時跟 window.__BH.Ach 拿字典 → 斷言期間要把 __BH 掛回去 */
global.window = { __BH: { Ach: { TITLES: [{ name: '新手上路', ico: '🌱', color: '#3a8', bg: '#dfd' }], DEV_TITLE: { name: '開發者', ico: '🛠️', color: '#333', bg: '#eee' } } } };
ok(PC.titleOf(0) && PC.titleOf(0).name === '新手上路', '稱號用本地字典解（跨語言不會變中文）');
ok(PC.titleOf(8) && PC.titleOf(8).name === '開發者', '稱號 8 是開發者');
ok(PC.titleOf(-1) === null, '沒戴稱號回 null');
global.window = undefined;
ok(Array.isArray(PC.SEL) && PC.SEL.length === 7, 'SEL 有 7 條（實際 ' + (PC.SEL || []).length + '）');
ok(typeof PC.open === 'function' && typeof PC.close === 'function', '有 open／close');

/* ============================================================
   ③c 榜單帶 pid：不再靠名字比對
   ============================================================ */
sec('③c 榜單記「這一行是誰」');
ok(/const whoPid = \/\^p_\[0-9a-f\]\{10\}\$\//.test(cloudSrc), '後端只收長得像 p_xxxxxxxxxx 的 pid');
ok(/if \(whoPid\) mine\.pid = whoPid;/.test(cloudSrc), '新舊紀錄都會補上 pid（補一次就永久有）');
ok(/if \(e\.pid\) o\.pid = e\.pid;/.test(cloudSrc), '/api/lb/top 會把 pid 帶出去');
ok(/data-pid="' \+ hesc\(String\(e\.pid\)\)/.test(mainSrc), '榜單那一列有 data-pid');
ok(/body\.pid = \(typeof Social !== 'undefined' && Social\.pid\)/.test(mainSrc), '送成績時會帶自己的 pid');
ok(/pid: function \(\) \{ return \(S\.me && S\.me\.pid\) \|\| ''; \}/.test(mainSrc), 'Social 對外給了 pid()');
ok(/hot\.closest\('\[data-pid\]'\)/.test(pcSrc), '卡片會往外層找 data-pid（榜單的 pid 寫在列上）');
ok(/\^p_\[0-9a-f\]\{10\}\$\/\.test\(pid\)/.test(pcSrc), '前端也驗 pid 形狀（不接受亂傳）');

/* ============================================================
   ④ Social.showPlayer
   ============================================================ */
sec('④ Social.showPlayer（卡片 → 完整資料頁）');
ok(/function showPlayer\(o\)/.test(mainSrc), 'main.js 有 showPlayer(o)');
ok(/showPlayer: showPlayer/.test(mainSrc), '有加進 window.Social 的導出');
ok(/S\.sel = p;/.test(mainSrc) && /S\.view = 'detail'/.test(mainSrc), '會切到 detail 視圖');
ok(/S\.tab = 'online';/.test(mainSrc), '順便把分頁切到「線上」，回上一頁不會迷路');
ok(/pid: String\(o\.pid\), name: String\(o\.n/.test(mainSrc), '用卡片帶進來的資料合成玩家物件（離線的人也有資料）');
ok(/typeof api\('Social'\)\.showPlayer === 'function'/.test(pcSrc), '卡片端會先確認對方有沒有這個方法才顯示按鈕');

/* ============================================================
   ⑤ i18n
   ============================================================ */
sec('⑤ 文案');
const rows = (function () {
  const m = /window\.__I18N_SRC = `([\s\S]*?)`;/.exec(i18nSrc);
  return m ? m[1].split('\n').filter(Boolean) : [];
})();
ok(rows.length > 1900, '字典有 ' + rows.length + ' 條');
const badCol = rows.filter(function (r) { return r.split('|').length !== 6; });
ok(badCol.length === 0, '每行都是六欄（實際壞 ' + badCol.length + ' 條）');
const pcRows = rows.filter(function (r) { return r.indexOf('pc.') === 0; });
ok(pcRows.length >= 33, '玩家卡文案有 ' + pcRows.length + ' 條');
const keys = {};
let dup = 0;
rows.forEach(function (r) { const k = r.split('|')[0]; if (keys[k]) dup++; keys[k] = 1; });
ok(dup === 0, '沒有重複 key（實際 ' + dup + ' 條）');
ok(pcRows.every(function (r) { return r.split('|').slice(1).every(function (c) { return c.trim().length > 0; }); }),
  'pc.* 的六個語言都填了（少填會退回顯示 key）');
['pc.notFound', 'pc.more', 'pc.copy', 'pc.lv', 'pc.online'].forEach(function (k) {
  ok(!!keys[k], '有 ' + k);
});
ok(!/pc\.joinAgo/.test(pcSrc) || !!keys['pc.joinAgo'], '程式用到的 key 都要在字典裡（joinAgo 已改成共用 fmtAgo）');

/* ============================================================
   ⑥ 版本
   ============================================================ */
sec('⑥ 版本');
const P = (function () {
  try { return SB.makeEnv().BH; } catch (e) { return null; }
})();
const ver = P ? String(P.VERSION || '') : '';
ok(!!ver && parseFloat(ver) >= 5.59, '版本 ≥ 5.59（實際 ' + ver + '）');
const vlog = (function () {
  const m = /v: '([\d.]+)', date: '[^']*', now: true/.exec(vlogSrc);
  return m ? m[1] : '';
})();
ok(!!vlog && vlog >= '5.59', 'VERSION_LOG 最新一條是 5.59 以上且 now:true（實際 ' + vlog + '）');
ok(/now: false/.test(vlogSrc), '上一版有改成 now:false');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.59：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
