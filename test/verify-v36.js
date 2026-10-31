// 無頭測試 v36：v3.0 首頁左上角「作者公告欄」
//   1. HTML：#annBox（標題列 + 內容 + FB 連結），放在 #scr-title 裡（只在首頁出現）
//   2. CSS：固定在左上角、收起時只剩一顆膠囊、手機縮小可捲動
//   3. JS：initAnn / setAnnMin / toggleAnn —— PC 展開、手機收起、點標題開合並記憶
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH;
const doc = env.sandbox ? env.sandbox.document : sandbox.document;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

console.log('\n=== 0. 版本 ===');
ok(P.VERSION === '4.3', '版本 = 3.5');
ok(html.indexOf('v3.0：作者公告欄（首頁左上角背景空白處）') > 0, 'CSS 有 v3.0 公告欄註解');

console.log('\n=== 1. HTML 結構 ===');
ok(html.indexOf('<div class="annbox" id="annBox">') > 0, '有 #annBox 容器');
ok(html.indexOf('<button class="annhead" id="annHead" type="button"') > 0, '有可點的標題列 #annHead');
ok(html.indexOf('<div class="annbody" id="annBody">') > 0, '有內容區 #annBody');
ok(html.indexOf('<span class="annico">\u{1F4E2}</span>') > 0 || html.indexOf('📢') > 0, '標題有 📢 圖示');
ok(html.indexOf('作者公告') > 0, '標題文字「作者公告」');
ok(html.indexOf('<span class="anncaret" id="annCaret">') > 0, '有開合指示箭頭 #annCaret');

// 放在首頁畫面裡（其他畫面自動看不到）
const iTitle = html.indexOf('<div class="screen on" id="scr-title">');
const iAnn = html.indexOf('<div class="annbox" id="annBox">');
const iCard = html.indexOf('<div class="title-card">');
ok(iTitle > 0 && iAnn > iTitle && iAnn < iCard, '公告欄放在 #scr-title 內、標題卡之前（只有首頁顯示）');

console.log('\n=== 2. 公告內容 ===');
const body = (html.slice(html.indexOf('<div class="annbody" id="annBody">'), html.indexOf('<div class="title-card">')) || '');
ok(body.indexOf('大家好，這是我利用 AI 的方式來研發生成的遊戲') > 0, '內容：AI 研發生成的遊戲');
ok(body.indexOf('電腦 PC 的網頁上遊玩') > 0 && body.indexOf('手機的網頁上進行遊戲') > 0, '內容：PC／手機都能玩');
ok(body.indexOf('目前還在開發測試階段') > 0 && body.indexOf('非營利') > 0, '內容：開發測試階段、非營利');
ok(body.indexOf('✉️ 信箱') > 0 || body.indexOf('右上角的') > 0, '內容：引導點右上角信箱回報');
ok(body.indexOf('祝大家天天開心快樂') > 0, '內容：結尾祝福');
const fbUrl = 'https://www.facebook.com/jon84597';
ok(html.indexOf('href="' + fbUrl + '"') > 0, 'FB 連結：' + fbUrl);
ok(html.indexOf('target="_blank"') > 0 && html.indexOf('rel="noopener noreferrer"') > 0, 'FB 連結另開新窗且安全 rel');
ok(body.indexOf('— Jon.') > 0, '署名 Jon.');

console.log('\n=== 3. CSS：左上角固定 + 收起成膠囊 ===');
const cssAnn = (html.match(/\/\* =+\s*\n\s*v3\.0：作者公告欄[\s\S]*?body\.touch \.annbox \.annhead \{[^}]*\}/) || [''])[0];
ok(cssAnn.length > 200, 'CSS 有 v3.0 公告欄區塊');
ok(/\.annbox \{\s*\n(?:[^\n]*\n){0,2}?\s*position: fixed; z-index: 900;/.test(html), '.annbox 固定定位（不隨內容排版跑掉）');
ok(/left: 10px; top: calc\(94px \+ env\(safe-area-inset-top, 0px\)\);/.test(cssAnn),
   '位置在左上角（v4.0 往下讓開「版本更新內容」標籤 → 94px）');
ok(/width: clamp\(190px, 17vw, 300px\); max-width: calc\(100vw - 20px\);/.test(html), '寬度隨視窗縮放、不超出螢幕');
ok(/\.annbox\.min \.annbody \{ display: none; \}/.test(html), '收起時內容隱藏 → 只剩一顆小膠囊');
ok(/\.annbox \.annbody \{[\s\S]*?max-height: min\(52vh, 430px\); overflow-y: auto;/.test(html), '內容區高度上限 + 可上下捲動');
ok(/@media \(min-width: 1400px\) \{ \.annbox \{ width: clamp\(240px, 18vw, 340px\); \}/.test(html), '大螢幕（≥1400px）再放大');
ok(/@media \(max-width: 1199px\) \{ \.annbox \{ width: min\(320px, calc\(100vw - 20px\)\); \} \}/.test(html), '窄螢幕展開時接近滿版寬');
ok(/body\.touch \.annbox \{ left: 8px; top: calc\(84px \+ env\(safe-area-inset-top, 0px\)\); \}/.test(html), '手機版位置／尺寸微調（v4.0 讓開版本標籤 → 84px）');
ok(/body\.touch \.annbox \.annbody \{ font-size: 12px; max-height: 58vh; \}/.test(html), '手機版字級縮小、捲動區加大');

console.log('\n=== 4. JS：開合 + 預設狀態 ===');
ok(html.indexOf("const ANN_STORE = 'bombhero.ann.min';") > 0, '有 localStorage 記憶鍵 ANN_STORE');
ok(html.indexOf("const ANN_URL = 'https://www.facebook.com/jon84597';") > 0, 'JS 常數 ANN_URL = FB 連結');
ok(/function setAnnMin\(mn\) \{[\s\S]*?classList\.toggle\('min', !!mn\);/.test(html), 'setAnnMin 切換 .min');
ok(/function toggleAnn\(\) \{\s*\n\s*const mn = !isAnnMin\(\);/.test(html), 'toggleAnn 反轉目前狀態');
ok(/h\.addEventListener\('click', function \(ev\) \{[\s\S]{0,160}?toggleAnn\(\);/.test(html), '點標題列 → 開合');
ok(/const narrow = \(typeof window !== 'undefined' && window\.innerWidth \? window\.innerWidth < 1200 : true\);/.test(html),
   '窄螢幕（<1200px）判斷');
ok(/setAnnMin\(!!\(IS_TOUCH \|\| narrow\)\);/.test(html), '手機／窄螢幕預設收起，PC 寬螢幕預設展開');
ok(html.indexOf('  initAnn();') > 0, '啟動時呼叫 initAnn()');

console.log('\n=== 5. 沙盒實測 ===');
const box = doc.getElementById('annBox');
ok(!!box, '沙盒抓得到 #annBox');
ok(!!doc.getElementById('annHead') && !!doc.getElementById('annBody'), '沙盒抓得到 #annHead／#annBody');
ok(typeof P.setAnnMin === 'function' && typeof P.toggleAnn === 'function' && typeof P.initAnn === 'function',
   '匯出 setAnnMin / toggleAnn / initAnn');
const isMin = () => box.classList.contains('min');
P.setAnnMin(false);
ok(!isMin(), 'setAnnMin(false) → 展開（無 .min）');
ok(doc.getElementById('annCaret').textContent === '\u25be', '展開時箭頭 ▾');
P.setAnnMin(true);
ok(isMin(), 'setAnnMin(true) → 收起（有 .min）');
ok(doc.getElementById('annCaret').textContent === '\u25b8', '收起時箭頭 ▸');
const before = isMin();
P.toggleAnn();
ok(isMin() !== before, 'toggleAnn 每次都反轉狀態');
P.initAnn();
ok(typeof isMin() === 'boolean', 'initAnn 可重複呼叫（不噴錯）');
ok(!!P.ANN_URL && P.ANN_URL === 'https://www.facebook.com/jon84597', 'BH.ANN_URL = FB 連結');

console.log('\n========================================');
console.log('通過 ' + pass + ' / 失敗 ' + fail);
process.exit(fail ? 1 : 0);
