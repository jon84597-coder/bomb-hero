// v4.94 驗證：後台樣式命名不再以 ad 開頭（避開廣告封鎖擴充的 [id^="ad"] / [class^="ad"] 誤判）
//   症狀：AdBlock 一開，整個面板被當成廣告元素隱藏 → 「按了沒反應」。
// 跑法：node test/verify-v494.js
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const SRC = require('./_sandbox').rawHtml;
const css = SRC.slice(SRC.indexOf('<style>'), SRC.indexOf('</style>'));

/* ================= ① 沒有 ad 開頭的選擇器 ================= */
console.log('=== ① 選擇器命名 ===');
// 只看「.ad 後面接小寫字母」的類別（.addEventListener 這類方法呼叫不在 CSS 裡）
const adClasses = [...new Set((css.match(/\.(ad[a-z][A-Za-z0-9_-]*)/g) || []))]
  .filter(function (x) { return !/^\.add[A-Z]/.test(x); });
ok(adClasses.length === 0, 'CSS 裡沒有 .ad* 類別（會被 [class^="ad"] 隱藏）', adClasses.slice(0, 6));

const adIds = [...new Set((SRC.match(/\$id\('(ad[A-Za-z0-9_]+)'\)/g) || []))];
ok(adIds.length === 0, 'JS 沒有 $id("ad*") 這種 id', adIds.slice(0, 6));

ok(!/id="adminModal"/.test(SRC), 'HTML 沒有 id="adminModal"');
ok(/id="bhModal"/.test(SRC), '改用 id="bhModal"');

/* ================= ② 新名稱確實在用 ================= */
console.log('=== ② 新名稱 ===');
[['bhcard', '卡片'], ['bhpane', '頁籤面板'], ['bhrow', '名單列'], ['bhlogin', '登入提示'],
 ['bhsplit', '雙欄'], ['bhtabs', '頁籤列'], ['bhwarn', '警示條']].forEach(function (p) {
  ok(css.indexOf('.' + p[0]) >= 0, '.' + p[0] + '（' + p[1] + '）在 CSS 裡');
});

/* ================= ③ CSS 與 JS 對得上 ================= */
console.log('=== ③ 選擇器與程式碼一致 ===');
// CSS 定義的每個 bh* 類別，至少要能在畫面或 JS 字串裡被用到一次
const used = [...new Set((css.match(/\.(bh[a-z0-9_-]*)/g) || []))];
const orphan = used.filter(function (c) {
  const t = c.slice(1);
  const inCss = new RegExp('\\.' + t + '[\\s,{:.\\[]').test(css);
  const raw = SRC.split(t).length - 1;
  return !inCss || raw < 2;
});
ok(orphan.length === 0, '沒有「定義了卻沒人用」的樣式', orphan.slice(0, 6));

// 反向：JS 用到的 $id('bh*') 都要有對應的 HTML id
const jsIds = [...new Set((SRC.match(/\$id\('(bh[A-Za-z0-9_]+)'\)/g) || []))].map(function (x) {
  return x.slice(5, -2);
});
const missing = jsIds.filter(function (id) { return SRC.indexOf('id="' + id + '"') < 0; });
ok(missing.length === 0, '$id() 取的 id 都真的存在於 HTML', missing);

/* ================= ④ 入口沒有被改壞 ================= */
console.log('=== ④ 入口 ===');
ok(!/id="devBtn"/.test(SRC), '首頁已無 🛠 按鈕（v5.5 移除；入口改走連點／快捷鍵／#admin）');
ok(/e\.altKey && \(e\.ctrlKey \|\| e\.shiftKey\)/.test(SRC), 'Ctrl+Alt+D 還在');
ok(/indexOf\('admin=1'\)/.test(SRC), '?admin=1 還在');
ok(/function open\(\) \{[\s\S]{0,600}?m\.classList\.add\('on'\)/.test(SRC), 'open() 仍然用 class "on" 顯示');

console.log('\n--- v4.94: ' + pass + ' 通過, ' + fail + ' 失敗 ---');
process.exit(fail ? 1 : 0);
