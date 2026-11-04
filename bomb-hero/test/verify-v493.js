// v4.93 驗證：看得見的 🛠 入口 ＋ wire() 早退陷阱 ＋ 版本一致性
//   背景：Chrome 打不開、Edge 可以 → 兩者都是 Chromium，差別只在 Service Worker 快取。
//        真正該修的是「入口不能只有隱藏手勢」，所以補了 #devBtn。
// 跑法：node test/verify-v493.js
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const root = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

/* ================= ① 原始碼健康度 ================= */
console.log('=== ① 原始碼健康度 ===');
ok(SRC.indexOf('\r') < 0, '整檔 LF（0 個 CR）');
const VERSION = (SRC.match(/const VERSION = '([0-9.]+)'/) || [])[1] || '';
function vnum(v) { return String(v).split('.').map(Number); }
function vge(a, b) { const x = vnum(a), y = vnum(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return true; }
ok(/const VERSION = '[0-9.]+'/.test(SRC) && vge(VERSION, '4.93'), 'VERSION >= 4.93', VERSION);

// 字面的 script 結束標籤會截斷整份 JS —— 這個坑 v4.93 真的踩過
const scriptEnd = '<' + '/script>';
const openTags = (SRC.match(/<script[\s>]/g) || []).length;
const closeTags = (SRC.match(new RegExp(scriptEnd, 'g')) || []).length;
ok(openTags === closeTags, 'script 開／閉標籤數量相符（註解裡沒有誤寫結束標籤）', { openTags, closeTags });

/* ================= ② 看得見的入口 #devBtn ================= */
console.log('=== ② 看得見的入口 ===');
ok(/<button class="verlogbtn devbtn" id="devBtn"/.test(SRC), '首頁頂部有 #devBtn 按鈕');
ok(/\.devbtn \{ display: none;/.test(SRC), '.devbtn 預設 display:none（一般玩家看不到）');
ok(/\.devbtn\.on \{ display: inline-flex; \}/.test(SRC), '.devbtn.on 才顯示');
ok(/if \(showIt\) bd\.classList\.add\('on'\);/.test(SRC), '只有 DEV_BUILD 或白名單帳號才加 .on');
ok(/bd\.addEventListener\('click'/.test(SRC), '#devBtn 綁了 click');

/* ================= ③ wire() 不能因為 DOM 沒到就整體早退 ================= */
console.log('=== ③ wire() 早退陷阱 ===');
// 檔裡有 7 個 function wire()，要抓 Admin 模組那一個（從 const Admin 之後開始找）
const wireBody = (function () {
  const a = SRC.indexOf('const Admin = (function () {');
  if (a < 0) return '';
  const i = SRC.indexOf('function wire() {', a);
  return i < 0 ? '' : SRC.slice(i, i + 7000);
})();
ok(wireBody.length > 0, '找得到 wire()');
ok(!/function wire\(\) \{\s*const m = \$id\('bhModal'\);\s*if \(!m\) return;/.test(wireBody),
   '不再「拿不到 #bhModal 就整個 return」（會讓三條入口全部沒綁）');
ok(/if \(!A\.entryWired\) \{/.test(wireBody), '入口監聽用 A.entryWired 只綁一次');
ok(/if \(!m\) \{[\s\S]{0,400}?A\.pending = true/.test(wireBody), '拿不到 modal 時改登記 DOMContentLoaded 再補，而不是放棄');
ok(/if \(A\.wiredModal\) return;/.test(wireBody), 'modal 內部按鈕只綁一次（A.wiredModal）');
ok(/entryWired: false, wiredModal: false, pending: false/.test(SRC), 'A 狀態物件有三個新旗標');

/* ================= ④ 三條舊入口都還在 ================= */
console.log('=== ④ 舊入口沒有被改壞 ===');
ok(/e\.altKey && \(e\.ctrlKey \|\| e\.shiftKey\)/.test(SRC), 'Ctrl+Alt+D 仍在');
ok(/indexOf\('admin=1'\)/.test(SRC), '?admin=1 仍在');
ok(/h\.indexOf\('admin'\) >= 0/.test(SRC), '#admin 仍在');
ok(/v\.addEventListener\('click'/.test(wireBody), '版本號連點 3 下仍在');

/* ================= ⑤ 版本一致性 ================= */
console.log('=== ⑤ 版本一致性 ===');
const sws = [path.join('..', 'sw.js'), path.join('..', '..', 'public', 'sw.js')];
sws.forEach(function (rel) {
  const f = path.join(__dirname, rel);
  if (!fs.existsSync(f)) return;
  const s = fs.readFileSync(f, 'utf8');
  ok(new RegExp("var SW_VERSION = 'v" + VERSION.replace(/\./g, '\\.') + "\\.0';").test(s), rel + ' SW_VERSION = v' + VERSION + '.0');
});
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
ok(pkg.version === VERSION + '.0', 'package.json = VERSION.0', pkg.version);

// 遊戲內版本紀錄不得出現後台／開發者字樣
const log = (function () {
  const i = SRC.indexOf('const VERSION_LOG = [');
  const j = SRC.indexOf('];', i);
  return SRC.slice(i, j);
})();
ok(new RegExp("v: '" + VERSION.replace(/\./g, '\\.') + "'").test(log), 'VERSION_LOG 有最新版號', VERSION);
ok(log.indexOf('後台') < 0, 'VERSION_LOG 不含「後台」');
ok(log.indexOf('開發者') < 0, 'VERSION_LOG 不含「開發者」');

/* ================= ⑥ 三份副本一致 ================= */
console.log('=== ⑥ 副本同步 ===');
const pub = path.join(__dirname, '..', '..', 'public', 'index.html');
if (fs.existsSync(pub)) ok(fs.readFileSync(pub, 'utf8') === SRC, 'public/index.html 與主檔一致');

console.log('\n--- v4.93+: ' + pass + ' 通過, ' + fail + ' 失敗 ---');
process.exit(fail ? 1 : 0);
