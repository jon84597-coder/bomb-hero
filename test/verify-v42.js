// 無頭測試 v42（v3.8 重寫）：「瀏覽人數 ＋ 按讚」功能已依使用者要求整組移除
//   原本測的是 v3.6 的統計功能；功能拔掉後改成反向驗證 —— 確認 UI、模組、
//   匯出、字典、後端路由都真的清乾淨，而且公告欄回到原位（不再讓位給統計列）
const { makeEnv, html } = require('./_sandbox');

const P = makeEnv().BH;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function cnt(s, re) { const m = s.match(re); return m ? m.length : 0; }

console.log('\n=== 0. 版本 ===');
ok(P.VERSION === '4.5', '版本 = 4.2');
ok(/<span id="verTxt">4\.5<\/span>/.test(html), '徽章版本號同步 4.3');

console.log('\n=== 1. HTML：statBox 整塊移除 ===');
ok(html.indexOf('id="statBox"') < 0, '沒有 #statBox');
ok(html.indexOf('stViews') < 0 && html.indexOf('stLikes') < 0 && html.indexOf('stHeart') < 0,
  '沒有瀏覽數／按讚數／愛心元素');
ok(cnt(html, /stViewItem|stLocal|stSep/g) === 0, '沒有殘留的統計子元素');

console.log('\n=== 2. CSS：.statbox 樣式整塊移除 ===');
ok(cnt(html, /\.statbox/g) === 0, '沒有 .statbox 樣式');
ok(cnt(html, /stpop|stlike|stwait/g) === 0, '沒有殘留的按讚動畫／樣式');

console.log('\n=== 3. JS：Stats 模組與相關程式移除 ===');
ok(typeof P.Stats === 'undefined', '__BH 沒有導出 Stats');
ok(typeof P.initStats === 'undefined', '__BH 沒有導出 initStats');
ok(typeof P.fmtNum === 'undefined', '__BH 沒有導出 fmtNum');
ok(html.indexOf('const Stats = {') < 0 && html.indexOf('function initStats') < 0,
  'Stats 模組與 initStats 函式本體都刪了');
ok(html.indexOf('ST_VID') < 0 && html.indexOf('bombhero.stat.local') < 0,
  '本機統計的 localStorage 鍵也清了');
ok(html.indexOf('\ninitStats();') < 0, '檔案末尾不再呼叫 initStats()');
ok(html.indexOf('/api/stats') < 0, '前端不再打 /api/stats');

console.log('\n=== 4. 10 語字典：st.* 鍵移除 ===');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it'];
let missing = [];
LANGS.forEach(function (l) {
  const i = html.indexOf("I18N['" + l + "'] = {");
  const seg = html.slice(i, i + 60000);
  if (seg.indexOf("'st.viewTip'") >= 0) missing.push(l);
});
ok(missing.length === 0, '10 語的 st.* 統計文案都刪了（殘留：' + (missing.join(',') || '無') + '）');

console.log('\n=== 5. 公告欄位置（上面沒有統計列；v4.0 往下讓開版本更新標籤）===');
ok(/left: 10px; top: calc\(94px \+ env\(safe-area-inset-top, 0px\)\);/.test(html),
  '公告欄 top = 94px（56px + 版本標籤高 31px + 間距）');
ok(/body\.touch \.annbox \{ left: 8px; top: calc\(84px \+ env\(safe-area-inset-top, 0px\)\); \}/.test(html),
  '手機公告欄 top = 84px');
ok(!/id="statBar"|id="btnLike"/.test(html), '首頁沒有統計列／按讚鈕');

console.log('\n=== 6. 遊戲本體沒被弄壞 ===');
ok(html.indexOf('id="scr-title"') > 0 && html.indexOf('id="annBox"') > 0, '首頁與公告欄還在');
ok(html.indexOf('id="btnHelp"') > 0, '遊戲說明按鈕還在');
ok(html.indexOf('id="ctaBar"') > 0, '「下一步」快捷鈕還在');
ok(typeof P.Game === 'object' && typeof P.startSolo === 'function', '遊戲核心導出正常');
ok(typeof P.drawBombOn === 'function' && typeof P.drawFlameOn === 'function', 'v3.8 繪圖導出正常');
ok(/const VERSION = '4\.5';/.test(html), '版本常數是 4.5');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
