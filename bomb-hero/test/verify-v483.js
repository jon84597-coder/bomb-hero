// test/verify-v483.js —— v4.83：LOGO 破圖的替身標題 + 更準的載入失敗說明
//   ① 使用者回報「首頁長這樣」：破圖 + alt 文字 + 紅色「資源載入失敗」
//      真正原因是把 index.html 單獨打開（旁邊沒有 spr/），不是部署有問題
//   ② 圖抓不到時要自動換成文字標題，首頁不能露出破圖
//   ③ 替身要靠三條路都能觸發：inline onerror / 錯誤捕捉器 / load 後補檢查
//   ④ 錯誤訊息要指出「旁邊少了 spr/ 資料夾」，不能只叫人按強制更新
//   ⑤ 正常載入時替身必須是隱藏的（不能反過來蓋掉真的 LOGO）
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path');

const env = makeEnv();
const src = env.html;
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }

// 只切 head 裡的開機自我檢查（錯誤捕捉 + 替身定義都在這），避免掃到整包 JS
const HEAD_END = src.indexOf('</head>');
const HEAD = src.slice(0, HEAD_END > 0 ? HEAD_END : 20000);

head('① 標題區的 DOM 結構');
ok(/<img class="title-logo" id="titleLogo"[^>]*src="spr\/title-logo\.webp"/.test(src), '#titleLogo 仍指向 spr/title-logo.webp');
ok(/id="titleLogo"[^>]*onerror="window\.__titleLogoFail&&window\.__titleLogoFail\(\)"/.test(src), '#titleLogo 有 inline onerror 兜底');
const wrap = (src.match(/<div class="titlewrap">[\s\S]*?<\/div>\s*<\/div>/) || [''])[0];
ok(/id="titleFallback"/.test(wrap), '替身 #titleFallback 就在 .titlewrap 裡面');
ok(/<span class="tf-en">BOMB HERO<\/span>/.test(src), '替身有英文標題 BOMB HERO');
ok(/<span class="tf-cn">爆爆英雄<\/span>/.test(src), '替身有中文標題 爆爆英雄');
ok(/id="titleFallback"[^>]*aria-hidden="true"/.test(src), '替身預設 aria-hidden（讀屏不會唸兩次）');

head('② 替身的樣式');
const css = (src.match(/\.title-fallback \{[\s\S]*?\n\}/) || [''])[0];
ok(css.length > 60, '.title-fallback 有樣式規則');
ok(/display: none/.test(css), '預設 display:none（正常載入時看不到）');
ok(/\.title-fallback\.on \{ display: flex/.test(src), '掛上 .on 才顯示');
const en = (src.match(/\.title-fallback \.tf-en \{[\s\S]*?\n\}/) || [''])[0];
ok(/font-size: clamp\(/.test(en), '英文標題用 clamp 跟著螢幕縮放');
ok((en.match(/text-shadow:/g) || []).length === 1 && /0 8px 0 #b8351a/.test(en), '英文標題有 3 層實心陰影（像素感，不是模糊光暈）');
const cn = (src.match(/\.title-fallback \.tf-cn \{[\s\S]*?\n\}/) || [''])[0];
ok(/letter-spacing: \.40em/.test(cn) && /text-indent: \.40em/.test(cn), '中文標題有字距補償（text-indent 讓它維持置中）');

head('③ 替身的三條觸發路徑');
ok(/window\.__titleLogoFail = function \(\)/.test(HEAD), 'head 內定義了 window.__titleLogoFail');
ok(/if \(t\.id === 'titleLogo'\)/.test(HEAD), '資源錯誤捕捉器會針對 #titleLogo 呼叫替身');
ok(/img\.complete && img\.naturalWidth === 0/.test(HEAD), 'load 後補檢查 naturalWidth === 0（onerror 沒跑到也能救）');
ok(/document\.addEventListener\('DOMContentLoaded', chk\)/.test(HEAD), 'DOMContentLoaded 就檢查一次');
ok(/fb\.classList\.add\('on'\)/.test(HEAD), '替身用 class .on 切換（不用 hidden，避免被 display:flex 蓋掉）');
ok(/img\.style\.display = 'none'/.test(HEAD), '替身同時把 <img> 關掉（alt 文字不會一起冒出來）');
ok(/__BHTitleFailed/.test(HEAD), '只警告一次（重複觸發不會洗版 console）');

head('④ 載入失敗的說明文字');
ok(/artOnly/.test(src), 'bootDiag 會分辨「只缺美術圖」與「模組掛掉」');
ok(/旁邊少了 spr\/ 資料夾/.test(src), '訊息直接說出 spr/ 資料夾');
ok(/python -m http\.server/.test(src), '訊息給了可以照做的指令（本機伺服器）');
ok(!/頁面有資源載入失敗'\) \+\s*'。按「強制更新」/.test(src), '舊的「一律叫你按強制更新」文案已經不在');

head('⑤ 不會反過來蓋掉真的 LOGO');
ok(/\.title-fallback \{ display: none/.test(src), '替身沒掛 .on 時是 display:none');
ok(!/#titleFallback[^{]*\{[^}]*display: flex/.test(src), '沒有任何規則無條件把替身打開');
ok(!/onload="[^"]*titleFallback/.test(src), '沒有在 onload 亂開替身');

head('⑥ 10 國譯文（4.83 三條）');
const CJK = /[\u4e00-\u9fff]/;
for (let n = 1; n <= 3; n++) {
  const key = 'ver.4.83.' + n;
  const line = src.split('\n').find(function (x) { return x.indexOf(key + '|') === 0; });
  if (!line) { ok(false, key + ' 字典列存在'); continue; }
  const cols = line.split('|');
  ok(cols.length === 6, key + ' 剛好 6 欄（實際 ' + cols.length + '）');
  ok(cols.slice(2).every(function (c) { return c.trim(); }), key + ' 9 種語言都填了');
  /* 日文（第 5 欄）本來就用漢字，不能當「漏中文」判 */
  const leak = cols.filter(function (c, i) { return i >= 3 && i !== 4 && CJK.test(c); });
  ok(leak.length === 0, key + ' 非中文語系沒有漏中文' + (leak.length ? '（' + leak.length + ' 欄）' : ''));
}

head('⑦ 版本與容量');
const P = env.BH || {};
ok((parseFloat(P.VERSION) >= 4.83), 'VERSION 至少 4.83（實際 ' + P.VERSION + '）');
ok(new RegExp('id="verTxt">' + P.VERSION.replace(/\./g, '\\.') + '<').test(src), '首頁版本標籤跟著 VERSION 走');
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '版本紀錄首位就是目前版號且 now:true');
ok(P.VERSION_LOG[1].now === false, '上一版（' + P.VERSION_LOG[1].v + '）已改 now:false');
const chars = src.length;
ok(chars < 3900000, '字元 ' + chars + ' < 3.9M');
ok((src.match(/\r/g) || []).length === 0, '整檔 LF（CR 0）');
for (const f of ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { ok(false, f + ' 不存在'); continue; }
  const v = (fs.readFileSync(p, 'utf8').match(/SW_VERSION = '(v[\d.]+)'/) || [])[1] || '';
  ok(new RegExp('^v\\d+\\.\\d+\\.\\d+$').test(v), f + ' 版本跟得上主檔（' + v + '）');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' ' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
