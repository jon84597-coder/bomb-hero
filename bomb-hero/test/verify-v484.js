// test/verify-v484.js —— v4.84：手機橫屏首頁重排 ＋ 全站下滑提示 ＋ 說明頁移除 T1~T5
//   ① 使用者回報（手機橫屏）：① 首頁一開只看到 LOGO，不知道下面還有選項
//                              ② 說明頁最下面那排 T1~T5 測試地圖要拿掉
//   ③ 真正破的版面：橫屏選單還是舊的「3 欄 grid 裝 11 顆按鈕」規則，
//      #btnLearn 只分到 1 欄又被 stretched → 變成 251×319 的綠色大方塊
//   ④ 修法：menu 改 flex 直排（教學條吃整列、高度由內容決定）＋ .mgrid 自己排 3 欄
//   ⑤ 下滑提示要全站通用：只在「這一頁還能往下捲」時出現，滑到底消失，2.2 秒後淡化不擋按鈕
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path');

const env = makeEnv();
const src = env.html;
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ─────────────────────────────────────────────────────────────
head('① 下滑提示的 DOM');
ok(/<div id="scrollHint" role="status" aria-live="polite">/.test(src), '#scrollHint 存在且有 role=status');
ok(/id="scrollHintTxt"/.test(src), '有文字節點 #scrollHintTxt（換語言要重注入）');
ok(/id="scrollHintTxt"[^>]*>往下滑，下面還有更多</.test(src), '預設文案是「往下滑，下面還有更多」');
ok(/<i class="sh-a" aria-hidden="true"><\/i>/.test(src), '有向下箭頭 .sh-a（裝飾用，aria-hidden）');

// ─────────────────────────────────────────────────────────────
head('② 下滑提示的樣式');
const shCss = (src.match(/#scrollHint \{[\s\S]*?\n\}/) || [''])[0];
ok(shCss.length > 120, '#scrollHint 有樣式規則');
ok(/position: fixed/.test(shCss), '固定定位（不隨內容捲動）');
ok(/z-index: 58/.test(shCss), 'z-index 58（在教學遮罩／彈窗 60 之下，不會蓋掉視窗）');
ok(/pointer-events: none/.test(shCss), '預設不攔截點擊');
ok(/opacity: 0/.test(shCss), '預設透明（靠 .on 才淡入）');
ok(/#scrollHint\.on \{[^}]*opacity: 1/.test(src), '.on 才顯示');
ok(/#scrollHint\.on \{[^}]*pointer-events: auto/.test(src), '.on 時可點（點一下往下翻）');
const dimCss = (src.match(/#scrollHint\.on\.dim \{[^}]*\}/) || [''])[0];
ok(/opacity: \.82/.test(dimCss), '收起後 opacity .82（還看得見）');
ok(/width: 30px; height: 30px/.test(dimCss), '收成 30×30 小圓點（不再壓住卡片文字）');
ok(/#scrollHint\.on\.dim \.sh-t \{ display: none; \}/.test(src), 'dim 時收起文字、只留箭頭');
ok(/pointer-events: none/.test(dimCss), '淡化後完全不攔點擊（底下的按鈕照樣點得到）');
ok(/@media \(hover: hover\) and \(pointer: fine\) \{ body:not\(\.touch\) #scrollHint \{ display: none; \} \}/.test(src),
  '桌機（有滑鼠）不顯示');
ok(/@keyframes shBob/.test(src), '箭頭有上下跳動動畫');
ok(/prefers-reduced-motion: reduce\) \{ #scrollHint \.sh-a \{ animation: none/.test(src),
  '尊重 prefers-reduced-motion');

// ─────────────────────────────────────────────────────────────
head('③ 下滑提示的判斷邏輯');
const SH = (src.match(/var ScrollHint = \(function \(\) \{[\s\S]*?\n\}\)\(\);/) || [''])[0];
ok(SH.length > 800, 'ScrollHint 模組存在');
ok(/function findTarget\(\)/.test(SH), '有 findTarget（找這頁真正在滾的容器）');
ok(/docGap > MIN_GAP/.test(SH), '先判断整頁可不可滾');
ok(/overflowY !== 'auto' && st\.overflowY !== 'scroll'/.test(SH), '頁內容器只認 overflow:auto/scroll');
ok(/e\.clientHeight < 80/.test(SH), '跳過 display:none 的頁面（clientHeight 0）');
ok(/Screen\.current === 'game'/.test(SH), '遊戲中不出現（避免擋操作）');
ok(/document\.addEventListener\('scroll', check, true\)/.test(SH), 'scroll 用捕獲階段一次接住所有容器');
ok(/addEventListener\('resize'/.test(SH) && /orientationchange/.test(SH), '轉向／縮放後重算');
ok(/addEventListener\('click', function \(\) \{ later\(240\)/.test(SH), '點按鈕（展開抽屜／切分頁）後重算');
ok(/gap - top > MIN_GAP/.test(SH), '還有剩餘可滾距離才顯示');
ok(/dimT = setTimeout\(function \(\) \{ if \(on && el\) el\.classList\.add\('dim'\); \}, 2200\)/.test(SH),
  '顯示 2.2 秒後自動淡化');
ok(/clearTimeout\(dimT\)/.test(SH), '隱藏時清掉淡化計時器');
ok(/try \{ window\.ScrollHint = ScrollHint; \} catch \(e\) \{\}/.test(src), '掛到 window（Screen.apply 叫得到）');
ok(/try \{ if \(window\.ScrollHint\) setTimeout\(function \(\) \{ window\.ScrollHint\.sync\(\); \}, 60\); \} catch \(e\) \{\}/.test(src),
  'Screen.apply 換頁後重新判斷');
ok(/classList\.remove\('on'\); el\.classList\.remove\('dim'\)/.test(SH), '隱藏時把 .on 與 .dim 一起清掉');

// ─────────────────────────────────────────────────────────────
head('④ 橫屏首頁：教學條不再被拉成方塊');
const LS = src.slice(src.indexOf('@media (orientation: landscape) {'));   // 橫屏段（到檔尾）
const menuRule = (src.match(/body\.touch #scr-title \.menu \{\n([\s\S]*?)\n\}/) || ['', ''])[1];
ok(/display: flex; flex-direction: column/.test(menuRule), '橫屏 .menu 改 flex 直排（不再是 3 欄 grid）');
ok(!/grid-template-columns: repeat\(3/.test(menuRule), '橫屏 .menu 本身不再自己排 3 欄');
const gridRule = (src.match(/body\.touch #scr-title \.menu \.mgrid \{[^}]*\}/) || [''])[0];
ok(/grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/.test(gridRule), '.mgrid 才是 3 欄');
ok(/margin-top: 0/.test(gridRule), '.mgrid 在 flex 下不重複留 margin');
ok(/body\.touch #scr-title \.menu > \.mbtn#btnLearn \{ padding: 8px 12px 8px 46px/.test(src),
  '#btnLearn 橫屏是緊湊橫條（有自己的 padding，不吃 flex 的伸展）');
// 舊規則 grid-column:1/-1 只在豎屏，橫屏沒有 → 這正是 bug 來源，確認沒被寫回去
ok(!/body\.touch #scr-title \.menu \.mbtn#btnLearn \{ grid-column/.test(src), '沒有殘留 grid-column 規則');

head('⑤ 橫屏首頁：把空間還給選單');
ok(/body\.touch #scr-title \.toprow \{\nposition: absolute; top: 0; right: 4px/.test(src),
  '頂部「版本更新／作者公告」改成浮在右上角（省下 59px 一整列）');
ok(/body\.touch #scr-title \{ position: relative; \}/.test(src), '#scr-title 有 position:relative 當定位父層');
const logoRule = (src.match(/body\.touch #scr-title \.title-card \.title-logo \{[^}]*\}/) || [''])[0];
ok(/clamp\(150px, min\(58vw, 72vh\), 340px\)/.test(logoRule), '橫屏 LOGO 上限 340px／72vh');
ok(/body\.touch #scr-title \.nickwrap \{ flex-direction: row/.test(src), '暱稱標籤與輸入框在橫屏並排');
ok(!/class="nickwrap" style=/.test(src), '暱稱列的行內 style 已抽成 class（否則蓋不動）');
ok(/#scr-title \.nickwrap \{ display: flex; flex-direction: column/.test(src), '桌機／豎屏仍維持直排');

// ─────────────────────────────────────────────────────────────
head('⑥ 說明頁移除 T1~T5 測試地圖');
ok(!/id="mapTestRow"/.test(src), '說明頁沒有 #mapTestRow 容器了');
ok(!/buildMapTestRow/.test(src), 'buildMapTestRow 函式與呼叫全部移除');
ok(!/help\.maptest/.test(src), '字典裡的 help.maptest／help.maptestBtn 一起清掉');
ok(/const MAPTEST = \[/.test(src), 'MAPTEST 尺寸表保留（隨機地圖模式仍要用）');
ok(/return MAPTEST\[stageTileIdx\(stage\)\] \|\| MAPTEST\[0\]/.test(src), 'mapLayerFor 仍取用 MAPTEST');
ok(/function startMapTest\(n\)/.test(src), '?maptest=N 的開發入口函式保留（沒有 UI 就看不到）');

// ─────────────────────────────────────────────────────────────
head('⑦ 10 國譯文');
function row(key) {
  const m = src.match(new RegExp('^' + key.replace(/\./g, '\\.') + '\\|.*$', 'm'));
  return m ? m[0] : '';
}
function cols(line) { return line ? line.split('|').length : 0; }
const sh = row('scrollHint');
ok(cols(sh) === 6, 'scrollHint 剛好 6 欄（實際 ' + cols(sh) + '）');
ok(/往下滑/.test(sh.split('|')[1]) && /往下滑/.test(sh.split('|')[2]), '中文兩欄都有「往下滑」');
[3, 4, 5].forEach(function (i) {
  const v = (sh.split('|')[i] || '').trim();
  ok(v.length > 5, 'scrollHint 第 ' + i + ' 欄有內容（' + v.slice(0, 18) + '）');
});
ok(!/[\u4e00-\u9fff]/.test(sh.split('|')[3]), '英文欄沒有漏中文');
[1, 2, 3, 4].forEach(function (n) {
  const r = row('ver.4.84.' + n);
  ok(cols(r) === 6, 'ver.4.84.' + n + ' 剛好 6 欄（實際 ' + cols(r) + '）');
  const parts = r.split('|');
  ok(parts.slice(3).every(function (x) { return x.trim().length > 8; }), 'ver.4.84.' + n + ' 9 種語言都填了');
});

// ─────────────────────────────────────────────────────────────
head('⑧ 版本與容量');
const P = env.BH;
ok((parseFloat(P.VERSION) >= 4.84), 'v4.84 的改動仍在（目前 ' + P.VERSION + '）');
ok(new RegExp('<span id="verTxt">' + P.VERSION + '</span>').test(src), '#verTxt 跟著 VERSION');
ok(new RegExp('<span id="verLogVer">' + P.VERSION + '</span>').test(src), '#verLogVer 跟著 VERSION');
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 首位＝當前版本且 now:true');
ok(P.VERSION_LOG[1].now === false, '上一版（4.83）已設 now:false');
ok(P.VERSION_LOG[0].items.length >= 3, '本版至少 3 條更新（實際 ' + P.VERSION_LOG[0].items.length + '）');
ok(fs.readFileSync(ROOT + '/sw.js', 'utf8').indexOf("'v" + P.VERSION + ".0'") >= 0, 'sw.js 跟著升版');
ok(fs.readFileSync(ROOT + '/../public/sw.js', 'utf8').indexOf("'v" + P.VERSION + ".0'") >= 0, 'public/sw.js 跟著升版');
ok(fs.readFileSync(ROOT + '/../bomberman-online/public/sw.js', 'utf8').indexOf("'v" + P.VERSION + ".0'") >= 0, 'bomberman-online/public/sw.js 跟著升版');
// v5.20 起 src = 字典（外部檔）＋主檔，這裡量的是「整頁」；主檔自己的預算線在 verify-v479
ok(src.length < 1960000, '字元 ' + src.length + ' < 1.96M');
ok(src.indexOf('\r') === -1, '整檔 LF（CR 0）');

console.log('\n========================================');
console.log('v4.84 下滑提示／橫屏首頁：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
