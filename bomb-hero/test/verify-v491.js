// v4.91 驗證：開發者後台入口修復（按鈕消失 → 開不了）＋ 版本紀錄不再寫開發者內容
// 跑法：node test/verify-v491.js
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

/* ================= ① 後台入口：按鈕不能因為沒有 dev 旗標就消失 ================= */
console.log('=== ① 後台入口 ===');
ok(/if \(a\.dev \|\| \(DEV_BUILD && !Cloud\.online\(\)\)\)/.test(SRC),
  '入口按鈕：dev 帳號 或「開發者版＋無後端」都顯示（原本只有 a.dev）');
ok(!/^\s*if \(a\.dev\) \{$/m.test(SRC), '舊的「只有 a.dev 才顯示」已移除');
ok(/Ctrl\+Shift\+D/.test(SRC) || /ctrlKey && !?e\.shiftKey/.test(SRC) || /e\.ctrlKey && e\.shiftKey/.test(SRC),
  '有 Ctrl+Shift+D 快捷鍵（不依賴登入狀態）');
ok(/if \(A\.open\) close\(\); else open\(\);/.test(SRC), '快捷鍵是開／關切換');
ok(/function open\(\) \{[\s\S]{0,120}if \(!Cloud\.isDev\(\)\)/.test(SRC),
  'open() 仍保留 isDev() 檢查（不會被繞過）');

// 模擬判斷式真值表（照抄實際條件，驗證邏輯而不是驗證字串）
function show(dev, devBuild, online) { return !!(dev || (devBuild && !online)); }
ok(show(true, true, true) === true, '線上＋白名單帳號 → 顯示');
ok(show(false, true, true) === false, '線上＋一般帳號 → 不顯示（玩家看不到後台按鈕）');
ok(show(false, true, false) === true, '本地／無後端＋開發者版 → 顯示（可離線開發）');
ok(show(false, false, false) === false, '非開發者版＋無 dev → 不顯示');

/* ================= ② 版本紀錄：玩家看得到的地方不寫開發者內容 ================= */
console.log('\n=== ② 遊戲內版本紀錄 ===');
const all = P.VERSION_LOG;
const joinAll = all.map(function (x) { return (x.items || []).join('|'); }).join('|');
ok(all.length >= 100, '版本紀錄仍有 100 筆以上（只刪條目，沒有刪版本）', all.length);
ok(joinAll.indexOf('jon84597@gmail.com') < 0, '沒有任何一筆洩漏管理員信箱');
ok(joinAll.indexOf('開發者後台') < 0, '沒有任何一筆寫「開發者後台」');
ok(joinAll.indexOf('後台') < 0, '沒有任何一筆寫「後台」');
ok(joinAll.indexOf('render.yaml') < 0 && joinAll.indexOf('DEV_BUILD') < 0,
  '沒有內部運維字樣（render.yaml／DEV_BUILD）');
ok(all.every(function (x) { return x.items && x.items.length; }), '每個版本仍有內容（沒有空條目）');

const v490 = all.filter(function (x) { return x.v === '4.90'; })[0];
ok(v490 && v490.items.length === 3, 'v4.90 剩 3 條（手把＋兩條 AI）', v490 && v490.items.length);
const s490 = v490.items.join('|');
ok(s490.indexOf('手把') >= 0, 'v4.90 保留手把 1P~4P');
ok(s490.indexOf('大逃殺 AI') >= 0, 'v4.90 保留大逃殺 AI');
ok(s490.indexOf('後台') < 0, 'v4.90 已無後台字樣');

const v43 = all.filter(function (x) { return x.v === '4.3'; })[0];
ok(v43 && v43.items.length >= 3, 'v4.3 仍保留其餘條目', v43 && v43.items.length);
ok(v43.items.join('|').indexOf('開發者') < 0, 'v4.3 已無「開發者」');

/* ================= ③ 後台本身沒被改壞 ================= */
console.log('\n=== ③ 後台功能未受影響 ===');
ok((SRC.match(/<button type="button" data-tab="/g) || []).length === 5, '五個分頁仍在');
ok(/id="adminModal"/.test(SRC), '後台容器仍在');
ok(/function wire\(\)/.test(SRC) && /Admin\.wire\(\)/.test(SRC), 'wire() 仍會被呼叫');
ok(/data-acct="admin"/.test(SRC), '帳號彈窗的後台按鈕仍在');

console.log('\n' + (fail ? '✗ ' + fail + ' 項失敗 / ' : '✓ ') + pass + ' 項通過');
process.exit(fail ? 1 : 0);
