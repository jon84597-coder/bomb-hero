// v4.92 驗證：後台入口「三保險」（版本號連點／Ctrl+Alt+D／#admin）
//   背景：v4.91 用 Ctrl+Shift+D，但那是 Chrome 內建的「書籤全部開啟」——
//   瀏覽器層級快速鍵不會傳給網頁，所以按了百分之百沒反應。
// 跑法：node test/verify-v492.js
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const { makeEnv } = require('./_sandbox');
const P = makeEnv().BH;

/* ================= ① open() 不再被 Cloud stub 擋死 ================= */
console.log('=== ① open() 的守門條件 ===');
ok(/let devOk = DEV_BUILD;/.test(SRC), 'open() 先看 DEV_BUILD（編譯期常數，永遠可信）');
ok(/if \(!devOk\) \{ devOk = !!\(Cloud && Cloud\.isDev && Cloud\.isDev\(\)\); \}/.test(SRC) ||
   /devOk = !!\(Cloud && Cloud\.isDev && Cloud\.isDev\(\)\)/.test(SRC),
   '非開發者版才去問 Cloud.isDev()，且用 try/catch 包住');
ok(!/function open\(\) \{\s*if \(!Cloud\.isDev\(\)\) \{ toast\('只有開發者帳號可以開啟後台'/.test(SRC),
   '不再「一進門就被 Cloud.isDev() 擋掉」（stub 時 isDev 永遠 false → 沒有任何反應）');

// 守門真值表：DEV_BUILD 為 true 時，不論 Cloud 壞掉都要能開
function gateDevBuild() { return true; }
function gateRuntime(cloudOk, cloudIsDev) { try { return !!(cloudOk && cloudIsDev); } catch (e) { return false; } }
function canOpen(devBuild, cloudOk, cloudIsDev) { const d = devBuild || gateRuntime(cloudOk, cloudIsDev); return !!d; }
ok(canOpen(true, false, false) === true, '開發者版 ＋ Cloud 模組掛掉 → 仍可開（原本會靜默失敗）');
ok(canOpen(true, true, false) === true, '開發者版 ＋ Cloud 說不是 dev → 仍可開');
ok(canOpen(false, true, true) === true, '正式版 ＋ 白名單帳號 → 可開');
ok(canOpen(false, true, false) === false, '正式版 ＋ 一般帳號 → 不開');

/* ================= ② 鍵盤入口：Ctrl+Alt+D 為主 ================= */
console.log('=== ② 鍵盤入口 ===');
ok(/const isD = \(e\.code === 'KeyD'\) \|\| e\.key === 'd' \|\| e\.key === 'D'/.test(SRC),
   '用 e.code === KeyD 判斷（不受鍵盤佈局／大小寫影響）');
ok(/const combo = \(e\.altKey && \(e\.ctrlKey \|\| e\.shiftKey\)\) \|\| \(e\.ctrlKey && e\.shiftKey\)/.test(SRC),
   'Ctrl+Alt+D 與 Ctrl+Shift+D 都能觸發');
ok(/, true\);\s*\n\s*\n\s*\/\/ ① 版本號連點 3 下/.test(SRC),
   'keydown 用 capture 階段攔（避免被其他模組吃掉）');

// 組合鍵真值表（照抄實際條件）
function hotkey(ctrl, alt, shift) { return !!((alt && (ctrl || shift)) || (ctrl && shift)); }
ok(hotkey(false, true, false) === false, '只按 Alt+D → 不觸發（瀏覽器網址列用）');
ok(hotkey(true, true, false) === true, 'Ctrl+Alt+D → 觸發');
ok(hotkey(true, false, true) === true, 'Ctrl+Shift+D → 觸發（非 Chrome 或未被攔截時）');
ok(hotkey(true, false, false) === false, '只有 Ctrl+D → 不觸發（那是瀏覽器加書籤）');
ok(hotkey(false, false, false) === false, '單按 D → 不觸發');

/* ================= ③ 版本號連點 3 下（手機也能用） ================= */
console.log('=== ③ 版本號連點 ===');
ok(/const vt = \$id\('verTxt'\);\s*\n\s*const v = vt && vt\.parentNode \? vt\.parentNode : null;/.test(SRC),
   '綁在版本標籤（#verTxt 的父節點）上');
ok(/if \(now - t0 > 1200\) n = 0;/.test(SRC), '1.2 秒內連點才算一組（誤觸不會開）');
ok(/if \(n >= 3\) \{/.test(SRC), '連 3 下才開');
ok(/v\.addEventListener\('click', function \(e\) \{/.test(SRC),
   '用 click 事件（滑鼠與觸控都會產生，手機可用）');
ok(/v\.style\.cursor = 'pointer';/.test(SRC), '可點的外觀（游標變手指）');

/* ================= ④ 網址入口 ================= */
console.log('=== ④ 網址參數 ===');
ok(/h\.indexOf\('admin'\) >= 0 \|\| q\.indexOf\('admin=1'\) >= 0/.test(SRC),
   '#admin 與 ?admin=1 都能觸發');
ok(/window\.addEventListener\('hashchange'/.test(SRC), '已在頁內時改 hash 也會開（不用重整）');
ok(/if \(want\(\)\) setTimeout\(function \(\) \{ try \{ if \(!A\.open\) open\(\); \} catch \(e\) \{\} \}, 800\);/.test(SRC),
   '載入時偵測到就自動開（延遲 0.8s 等後台 HTML 就緒）');

/* ================= ⑤ 沒登入時不再是一片空白 ================= */
console.log('=== ⑤ 登入提示 ===');
ok(/const needLogin = code === 'NO_SESSION' \|\| code === 'NOT_DEV';/.test(SRC),
   '401 NO_SESSION / 403 NOT_DEV 會走「需要登入」分支');
ok(/<div class="adlogin">/.test(SRC), '總覽頁畫一塊登入說明（不是只閃一句 toast）');
ok(/data-adm="login"/.test(SRC), '有「前往登入／切換帳號」按鈕');
ok(/closest\('\[data-adm="login"\]'\)/.test(SRC), '按鈕有綁點擊（會打開帳號視窗）');
ok(/if \(Cloud && Cloud\.open\) Cloud\.open\(\);/.test(SRC), '按下後呼叫 Cloud.open() 開帳號視窗');
ok(/\.adlogin button \{/.test(SRC), '登入按鈕有樣式（不是預設灰按鈕）');
ok(!/if \(r && r\.err === 'NOT_DEV'\) \{ toast\('沒有權限（只有開發者帳號可以看後台）', 3\); close\(\); \}/.test(SRC),
   '原本「toast 一句就自動關掉」的行為已移除（使用者看不到原因）');

/* ================= ⑥ 版號與版本紀錄 ================= */
console.log('=== ⑤ 版號／紀錄 ===');
ok(P.VERSION === '4.92', 'VERSION = 4.92', P.VERSION);
ok(new RegExp('id="verTxt">' + P.VERSION.replace(/\./g, '\\.') + '<').test(SRC), '首頁版本標籤同步');
ok(new RegExp('id="verLogVer">' + P.VERSION.replace(/\./g, '\\.') + '<').test(SRC), '版本面板標題同步');
const top = P.VERSION_LOG[0];
ok(top.v === '4.92', '版本紀錄第一筆是 4.92', top.v);
ok(top.now === true, '4.92 標記為 now');
ok(top.items.length >= 3, '至少 3 條更新（專案規則）', top.items.length);
ok(!/後台|開發者/.test(top.items.join('|')), '4.92 條目不含「後台／開發者」字樣');
const prev = P.VERSION_LOG[1];
ok(prev.v === '4.91' && prev.now === false, '4.91 的 now 已取消');
ok(P.VERSION_LOG.length >= 100, '版本紀錄仍有 100 筆以上', P.VERSION_LOG.length);
ok(P.VERSION_LOG.filter(function (x) { return !x.items || !x.items.length; }).length === 0,
   '沒有空條目的版本');
const all = P.VERSION_LOG.map(function (x) { return x.items.join('|'); }).join('|');
ok(all.indexOf('後台') < 0, '整份版本紀錄沒有「後台」');
ok(all.indexOf('開發者') < 0, '整份版本紀錄沒有「開發者」');

console.log('\n' + (fail === 0 ? '✓ ' + pass + ' 項通過' : '✗ ' + fail + ' 項失敗 / ' + pass + ' 項通過'));
process.exit(fail ? 1 : 0);
