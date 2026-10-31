// 無頭測試 v39：v3.3 線上配對錯誤訊息人話化（Failed to fetch → 明確指引）
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
ok(P.VERSION === '4.2', '版本 = 4.2');
ok(/<span id="verTxt">4\.2<\/span>/.test(html), '徽章版本號同步 4.2');

console.log('\n=== 1. netErrText 存在且邏輯正確 ===');
ok(typeof P.Net.netErrText === 'function', 'Net.netErrText 是函式');
ok(String(P.Net.netErrText(null, 404)).indexOf('node server.js') >= 0 &&
   String(P.Net.netErrText(null, 404)).indexOf('/api/*') >= 0,
   '404 → 提示執行 node server.js（純靜態空間沒有後端）');
const proto = (env.sandbox && env.sandbox.location && env.sandbox.location.protocol) || (typeof location !== 'undefined' && location.protocol) || '';
const msgGen = String(P.Net.netErrText({ message: 'boom' }, 0));
ok(msgGen === 'boom' || (proto === 'file:' && msgGen.indexOf('file://') >= 0),
   '一般錯誤 → 保留原始訊息（file: 環境則改給 file 指引）');
ok(String(P.Net.netErrText(null, 0)).length > 0, '無錯誤物件 → 給預設訊息');

console.log('\n=== 2. api() 錯誤路徑有套用 netErrText ===');
ok(/\.then\(function \(r\) \{\s*\n\s*if \(r\.ok\) cb\(null, r\.json \|\| \{\}\);\s*\n\s*else cb\(new Error\(\(r\.json && r\.json\.err\) \|\| Net\.netErrText\(null, r\.status\)\), r\.json\);/.test(html),
   'HTTP 錯誤 → 經 netErrText（404 給指引）');
ok(/\.catch\(function \(e\) \{ cb\(new Error\(Net\.netErrText\(e, 0\)\)\); \}\);/.test(html),
   '網路層錯誤（如 file:// 的 Failed to fetch）→ 經 netErrText');
ok(/location\.protocol === 'file:'/.test(html), 'file:// 情境有专门处理');
ok(html.indexOf('node server.js') > 0 && html.indexOf('http://localhost:3000') > 0,
   '訊息含具體指令與網址');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
if (fail > 0) process.exit(1);
