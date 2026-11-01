// 無頭測試 v37：v3.1 獲獎人物縮小 ＋ 右上角「下一步」快捷鈕
//   1. #winJumpCv 固定大小（不再被全域 canvas{width:100%} 撐爆蓋住按鈕）
//   2. #ctaBar／.ctabtn：單人→開始遊戲、對戰→開戰、線上→快速配對／開始遊戲；文字與主按鈕同步
//   3. 沙盒實測：updateCta 各畫面顯示／隱藏、點快捷鈕等於按主按鈕
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
ok(P.VERSION === '4.4', '版本 = 4.2');
ok(/<span id="verTxt">4\.4<\/span>/.test(html), '徽章版本號同步 4.3');

console.log('\n=== 1. 獲獎人物縮小 ===');
ok(/#winJumpCv \{\s*\n\s*width: auto; height: auto;\s*\n\s*max-width: min\(38vw, 190px\); max-height: 30vh;/.test(html),
   '#winJumpCv 固定大小上限（max-width min(38vw,190px)／max-height 30vh）');
ok(html.indexOf("style=\"display:none;margin:2px auto 4px;max-width:100%\"") < 0 &&
   html.indexOf('<canvas id="winJumpCv" width="170" height="168" style="display:none;margin:2px auto 4px"></canvas>') > 0,
   'showEnd 的 canvas 拿掉 inline max-width:100%（否則會覆蓋新尺寸）');
ok(/canvas \{ display: block; width: 100%; height: auto;/.test(html), '全域 canvas 規則不動（其他畫布照舊）');

console.log('\n=== 2. 快捷鈕 HTML／CSS ===');
ok(html.indexOf('<div id="ctaBar" class="hide"><button class="ctabtn" id="ctaBtn" type="button"></button></div>') > 0,
   'HTML 有 #ctaBar＋#ctaBtn（預設 hide）');
const iBar = html.indexOf('<div id="ctaBar"'), iWrap = html.indexOf('<div class="wrap">');
ok(iBar > 0 && iBar < iWrap, 'ctaBar 放在 .wrap 之前（固定定位不影響版面）');
ok(/#ctaBar \{ position: fixed; z-index: 950; right: 10px; top: calc\(54px \+ env\(safe-area-inset-top, 0px\)\); \}/.test(html),
   '固定在右上角（讓開工具列、支援瀏海安全區）');
ok(/#ctaBar\.hide \{ display: none; \}/.test(html), '非目標畫面自動隱藏');
ok(/\.ctabtn \{[\s\S]*?animation: ctaPulse 1\.6s ease-in-out infinite;/.test(html), '輕微脈動動畫引導玩家點擊');
ok(/@media \(max-width: 899px\) \{\s*\n\s*#ctaBar \{ right: 8px; top: calc\(48px \+ env\(safe-area-inset-top, 0px\)\); \}/.test(html) &&
   /\.ctabtn \{ font-size: 13\.5px; padding: 7px 14px 8px; border-radius: 12px; \}/.test(html),
   '手機版縮小尺寸');
ok(/@media \(prefers-reduced-motion: reduce\) \{ \.ctabtn \{ animation: none; \} \}/.test(html), '尊重 prefers-reduced-motion');

console.log('\n=== 3. JS 邏輯 ===');
ok(/function ctaTargets\(\) \{[\s\S]*?cur === 'solo'[\s\S]*?btnSoloGo[\s\S]*?cur === 'battle'[\s\S]*?btnStartBattle[\s\S]*?cur === 'online'[\s\S]*?btnNetStart[\s\S]*?btnNetQuick/.test(html),
   'ctaTargets：單人→btnSoloGo、對戰→btnStartBattle、線上→等待室 btnNetStart／大廳 btnNetQuick');
ok(/go\.classList\.contains\('locked'\) \|\| go\.disabled\) return null;/.test(html), '單人關卡未解鎖 → 不顯示（不誤導）');
ok(/room\.style\.display === 'grid'/.test(html), '線上等待室用 display===grid 判斷');
ok(/st\.style\.display !== 'none'\) return \{ btn: st, txt: st\.textContent \|\| '', sub: '' \};\s*\n\s*return null;/.test(html),
   '等待室訪客（沒有開始鈕）→ 不顯示快捷鈕');
ok(/function updateCta\(\) \{[\s\S]*?Screen\.current === 'game'\) \? null : ctaTargets\(\)/.test(html), '遊戲中一律隱藏');
ok(/b\.querySelector\('\.cta-t'\)\.textContent = tg\.txt;/.test(html), '文字用 textContent 塞入（同步主按鈕與語言）');
ok(/refreshers\.push\(updateCta\)/.test(html), 'updateCta 掛進 refreshers（每次換畫面自動同步）');
ok(/Solo\.renderGo = function \(\) \{\s*\n\s*const r = rg\.apply\(this, arguments\);\s*\n\s*try \{ updateCta\(\); \} catch \(e\) \{\}/.test(html),
   'Solo.renderGo 包一層（選關變化即時同步）');
ok(html.match(/try \{ updateCta\(\); \} catch \(e\) \{\}/g).length >= 3, 'Net 進房／離房也有同步');
ok(/try \{ if \(typeof updateCta === 'function'\) updateCta\(\); \} catch \(e\) \{\}/.test(html), '語言切換（refreshI18NUI）也同步');
ok(/  initCta\(\);/.test(html), '啟動時呼叫 initCta()');

console.log('\n=== 4. 沙盒實測：顯示／隱藏 ===');
const bar = doc.getElementById('ctaBar'), btn = doc.getElementById('ctaBtn');
const ctaT = () => { const sp = btn.querySelector('.cta-t'); return sp ? sp.textContent : (btn.textContent || ''); };
ok(!!bar && !!btn, '沙盒抓得到 #ctaBar／#ctaBtn');
ok(typeof P.updateCta === 'function' && typeof P.ctaTargets === 'function' && typeof P.initCta === 'function',
   '匯出 updateCta / ctaTargets / initCta');

// 對戰設定頁 → 顯示「開戰！」（沙盒假 DOM 不解析 HTML → 先手動填主按鈕文字）
P.Screen.show('battle');
doc.getElementById('btnStartBattle').textContent = '開戰！';
P.updateCta();
ok(bar.classList.contains('hide') === false, '對戰設定頁 → 快捷鈕顯示');
ok(ctaT().indexOf('開戰') >= 0, '文字＝「開戰！」（同步主按鈕）');

// 點快捷鈕 → 等於按主按鈕（假 DOM 的 click 是 no-op → 用 stub 驗證真的有轉發）
const realGo = doc.getElementById('btnStartBattle');
let goClicked = 0;
realGo.click = function () { goClicked++; };
(btn._on.click || []).forEach(function (fn) { fn({ stopPropagation: function () {} }); });
ok(goClicked === 1, '點快捷鈕 → 轉發點擊到主按鈕 btnStartBattle');
ok((btn._on.click || []).length >= 1, '#ctaBtn 有掛 click handler（真瀏覽器點擊即轉發）');
ok(bar.classList.contains('hide') === false, '還在設定頁 → 快捷鈕保持顯示');

// 單人關卡頁 → 顯示「開始遊戲 · 第 n 關」
P.Screen.show('solo');
P.Solo.renderGo();   // renderGo 會填 soloGoTxt／soloGoSub，並透過 v3.1 wrapper 同步快捷鈕
ok(bar.classList.contains('hide') === false, '單人關卡頁 → 快捷鈕顯示（renderGo 自動同步）');
ok(ctaT().indexOf('開始遊戲') >= 0, '文字＝「▶ 開始遊戲 · 第 n 關」（同步 soloGoTxt）');
ok(btn.querySelector('small') != null && btn.querySelector('small').textContent.length > 0, '副行（關卡名）也同步');

// 首頁 → 隱藏
P.Screen.show('title');
P.updateCta();
ok(bar.classList.contains('hide') === true, '首頁 → 快捷鈕隱藏');

// 設定頁 → 隱藏
P.Screen.show('settings');
P.updateCta();
ok(bar.classList.contains('hide') === true, '設定頁 → 快捷鈕隱藏');

// 線上大廳 → 顯示「快速配對」
P.Screen.show('online');
doc.getElementById('btnNetQuick').textContent = '⚡ 快速配對';
P.updateCta();
ok(bar.classList.contains('hide') === false && ctaT().indexOf('快速配對') >= 0,
   '線上大廳 → 文字＝「⚡ 快速配對」');
// 進入等待室（房主）→ 變「開始遊戲」
const netRoom = doc.getElementById('netRoom');
netRoom.style.display = 'grid';
const netStart = doc.getElementById('btnNetStart');
netStart.style.display = '';
netStart.textContent = '開始遊戲';
P.updateCta();
ok(bar.classList.contains('hide') === false && ctaT().indexOf('開始遊戲') >= 0,
   '線上等待室（房主）→ 文字＝「開始遊戲」');
// 訪客（開始鈕被藏起來）→ 隱藏
netStart.style.display = 'none';
P.updateCta();
ok(bar.classList.contains('hide') === true, '線上等待室（訪客）→ 快捷鈕隱藏');
netRoom.style.display = 'none';
P.updateCta();
ok(ctaT().indexOf('快速配對') >= 0, '回到大廳 → 恢復「快速配對」');

console.log('\n========================================');
console.log('通過 ' + pass + ' / 失敗 ' + fail);
process.exit(fail ? 1 : 0);
