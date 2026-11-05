// 無頭測試 v40：v3.4 手機誤觸系統返回手勢不再跳出暫停選單
//   遊戲中 popstate → 手機（body.touch）靜默吃掉返回；PC 才當暫停
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const doc = env.sandbox ? env.sandbox.document : sandbox.document;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

console.log('\n=== 0. 版本 ===');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '徽章版本號同步 ' + P.VERSION);

console.log('\n=== 1. onPop 遊戲中分支 ===');
ok(/function onPop\(\) \{\s*\n\s*if \(cur === 'game'\) \{/.test(html), 'onPop 有獨立的遊戲中分支');
ok(/v3\.4：手機的系統返回手勢（邊緣往內滑）會在玩到一半誤觸/.test(html), '有 v3.4 註解說明');
const iPop = html.indexOf('function onPop()');
const seg = html.slice(iPop, iPop + 900);
ok(seg.indexOf("history.pushState({ bh: 'game' }, '')") > 0 &&
   seg.indexOf("body.classList.contains('touch')") > 0 &&
   seg.indexOf('togglePause()') > 0,
   '遊戲中 popstate → 先補回 history 吃掉返回；只有非觸控（PC）才暫停');
ok(/if \(!document\.body\.classList\.contains\('touch'\)\) \{\s*\n\s*try \{ togglePause\(\); \} catch \(e\) \{\}\s*\n\s*\}/.test(html),
   '只有非觸控（PC）的返回鍵才觸發暫停；手機（body.touch）不再自動跳暫停選單');
ok(html.indexOf("window.addEventListener('popstate'") > 0 || /popstate/.test(html), 'popstate 監聽存在');

console.log('\n=== 2. 手機暫停的其他入口仍在 ===');
// v5.10：導覽改成 PadUI／Screen.back() 共用一條，寫死的字面會整支紅。
//   改成驗「有這麼一條規則」：遊戲中 → togglePause() 然後收工。
ok(/Screen(?:\.|\s*\?\s*[^:]{0,40}:\s*Screen\.)current === 'game'[\s\S]{0,60}togglePause\(\)[\s\S]{0,40}return/.test(html),
   'navBar「← 上一頁」在遊戲中仍可暫停');
ok(/function back\(\) \{\s*\n\s*if \(cur === 'game'\) \{ try \{ togglePause\(\); \} catch \(e\) \{\} return; \}/.test(html),
   'Screen.back() 本身在遊戲中就是暫停（上一頁／手把 B 都走這條）');
ok(html.indexOf("$id('pauseBtn').addEventListener('click', togglePause)") > 0, '⏸ ESC 按鈕仍可暫停');
ok(/Input\.edges\.Escape\) togglePause\(\)/.test(html), '鍵盤 ESC 仍可暫停');
ok(/if \(Net\.on && Net\.role === 'guest'\) \{ guestPause\(\); return; \}/.test(html), '客人暫停走 guestPause（行為不變）');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
if (fail > 0) process.exit(1);
