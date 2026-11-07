// test/verify-v50.js — v4.4：道具／坐騎提示改為「輕量 Toast 橫幅」＋ 頂部狀態列聯動
//   無頭沙盒（vm）＋ 原始碼斷言，不需要瀏覽器
const path = require('path');
const fs = require('fs');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const HTML_PATH = (function () {
  const a = path.join(ROOT, 'index.html');
  const b = path.join(ROOT, 'public', 'index.html');
  return fs.existsSync(a) ? a : b;
})();
const html = require('./_sandbox').rawHtml;

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
const src = (re) => re.test(html);

const env = makeEnv();
const P = env.BH;

console.log('\n=== 0. 版本 ===');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(src(new RegExp('<span id="verTxt">' + P.VERSION.replace('.', '\\.') + '<\\/span>')), '首頁徽章同步 ' + P.VERSION);
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '版本紀錄最新一筆是 4.5');
ok(P.VERSION_LOG[1].v !== P.VERSION && !P.VERSION_LOG[1].now, '上一筆 4.4 已不是「當前」');
const v44 = (P.VERSION_LOG.filter(function (x) { return x.v === '4.4'; })[0] || { items: [] }).items.join('|');
['道具提示', '淡出', '狀態列', 'pointer-events'].forEach(function (k) {
  ok(v44.indexOf(k) >= 0, 'v4.4 條列提到「' + k + '」');
});

// ------------------------------------------------------------------
console.log('\n=== 1. 舊的「左上角大方塊」已完全移除 ===');
ok(!src(/max-width: 46%/), '沒有 max-width: 46% 的舊規則');
ok(!src(/position: absolute; top: 12px; left: 12px/), '沒有 top/left 12px 貼左上角的舊規則');
ok(!src(/#toast \{[^}]*position: absolute/), '#toast 不再是 absolute');
ok(src(/#toast \{[^}]*position: fixed/), '#toast 改成 fixed（貼視窗、不隨畫布捲動）');
ok(src(/\/\* v4\.4：道具／坐騎提示/), '有 v4.4 樣式註解');

// ------------------------------------------------------------------
console.log('\n=== 2. 橫幅外觀：半透明＋毛玻璃＋細長 ===');
ok(src(/#toast \{[^}]*pointer-events: none/), 'pointer-events: none（不擋點擊／走位）');
ok(src(/#toast \{[^}]*left: 50%/), '水平置中（left: 50%）');
ok(src(/#toast \{[^}]*transform: translate\(-50%/), '用 transform 置中（動畫不會抖）');
ok(src(/-webkit-backdrop-filter: blur\(7px\)/), '有毛玻璃 backdrop-filter');
ok(src(/#toast\.show \{ opacity: 1/), '有 .show 的淡入狀態');
ok(src(/transition: opacity \.2s ease/), '有 opacity 的淡出過場');
ok(src(/max-width: min\(92vw, 640px\)/), '最大寬度受控（不會滿版）');
ok(src(/border-radius: 14px/), '圓角 14px');
ok(/rgba\(14, 20, 36, \.58\)/.test(html), '主體是 alpha .58 的半透明深底');
ok(/rgba\(255, 250, 240, \.74\)/.test(html), '繪本主題是 alpha .74 的半透明米白');
ok(src(/@media \(prefers-reduced-motion: reduce\) \{\s*#gameTop \.chip\.fx/), '尊重系統「減少動態」設定');

// ------------------------------------------------------------------
console.log('\n=== 3. toast() 的行為 ===');
ok(typeof P.toast === 'function', 'toast() 有匯出');
ok(typeof P.toastHide === 'function', 'toastHide() 有匯出');
ok(typeof P.placeToast === 'function', 'placeToast() 有匯出');
ok(src(/function toast\(txt, dur, hudKey\)/), 'toast 多了第三個參數 hudKey');
ok(src(/Game\.toastT = dur \|\| 2;\s*\/\/ v4\.4：預設停留 2 秒/), '預設停留 2 秒');
ok(src(/Game\.toastOn = true;/), '有 toastOn 旗標（避免每幀查 DOM）');
ok(src(/if \(Game\.toastT <= 0 && Game\.toastOn\) toastHide\(\);/), '時間到改走 toastHide()（淡出）');
ok(!src(/if \(Game\.toastT <= 0\) \$id\('toast'\)\.style\.display = 'none'/), '不再直接 display:none（會硬切）');
ok(src(/if \(!tt\.classList\.contains\('show'\)\) \{\s*\r?\n?\s*void tt\.offsetWidth;/), '顯示中不重播上浮動畫（只重置停留時間）');
ok(src(/if \(seq !== toastSeq\) return;/), '淡出中被新提示打斷時不會誤關');
ok(src(/tt\.style\.display = 'none';\s*\r?\n\s*\}, 260\);/), '淡出 260ms 後才收起來');

// 沙盒裡真的叫一次，不能炸
let thrown = null;
try {
  P.toast('🔥 火力：火焰變大', 2, 'pow');
} catch (e) { thrown = e; }
ok(!thrown, '沙盒裡呼叫 toast() 不會拋錯', thrown && thrown.message);
const toastEl = env.getId('toast');
ok(toastEl.textContent === '🔥 火力：火焰變大', '文字寫進 #toast', toastEl.textContent);
ok(toastEl.classList.contains('show'), '加上 .show（觸發淡入）');
ok(P.Game.toastOn === true, 'Game.toastOn = true');
ok(P.Game.toastT === 2, 'Game.toastT = 2 秒', P.Game.toastT);
ok(typeof toastEl.style.top === 'string' && !/NaN/.test(toastEl.style.top), 'placeToast() 算出合法 top', toastEl.style.top);

// 用預設停留時間
P.toast('測試預設');
ok(P.Game.toastT === 2, '不給 dur 也是 2 秒', P.Game.toastT);

P.toastHide();
ok(toastEl.classList.contains('show') === false, 'toastHide() 移除 .show（開始淡出）');
ok(P.Game.toastOn === false, 'toastHide() 清掉 toastOn');

// ------------------------------------------------------------------
console.log('\n=== 4. 頂部狀態列高亮 ===');
ok(typeof P.hudFlash === 'function', 'hudFlash() 有匯出');
ok(typeof P.hudFxEls === 'function', 'hudFxEls() 有匯出');
ok(src(/const HUD_FX = \{\};/), '有 HUD_FX（key → 失效時間）');
ok(src(/function hudFxEls\(key\)/), '有 hudFxEls() 解析 key');
ok(src(/\.gi\[data-g="' \+ key\.slice\(2\) \+ '"\]/), "'g:xxx' 會去找背包那一個 <i class=\"gi\">");
ok(src(/function applyHudFx\(\)/), '有 applyHudFx() 把高亮補回重畫後的 DOM');
ok(src(/applyHudFx\(\);   \/\/ v4\.4：HUD 重畫後把還在時效內的高亮補回去/), 'updateHud() 重畫後會呼叫 applyHudFx()');
ok(src(/#gameTop \.chip\.fx \{ animation: hudPop/), '有 hudPop 彈跳動畫');
ok(src(/@keyframes hudPop/), '有 hudPop keyframes');
ok(src(/@keyframes hudRing/), '有 hudRing 光圈 keyframes');
ok(src(/#gameTop \.gi\.fx \{/), '背包單一圖示也有高亮樣式');

// 沙盒：沒有節點時登記時效但不拋錯
let thrown2 = null;
try { P.hudFlash('g:glove'); P.hudFlash('pow'); P.hudFlash(['g:dino', 'bomb']); } catch (e) { thrown2 = e; }
ok(!thrown2, '沒有對應節點時 hudFlash() 不拋錯', thrown2 && thrown2.message);

// ------------------------------------------------------------------
console.log('\n=== 5. HUD 有 data-k / data-g 掛鉤 ===');
['stage', 'score', 'hp', 'pow', 'bomb', 'spd', 'gear'].forEach(function (k) {
  ok(src(new RegExp('data-k="' + k + '"')), '有 data-k="' + k + '"');
});
['kick', 'glove', 'punch', 'remote', 'pierce', 'dino', 'line', 'skull'].forEach(function (k) {
  ok(src(new RegExp("\\['" + k + "', '[^']+'\\]")), '背包清單含 ' + k);
});
ok(src(/<i class="gi" data-g="' \+ g\[0\] \+ '">/), '背包每一格是獨立的 <i class="gi" data-g>');
ok(src(/const HUD_OF_ITEM = \{/), '有道具 → 圖示的對照表');
ok(src(/fire: 'pow', bomb: 'bomb', speed: 'spd', heart: 'hp'/), '火力／炸彈／速度／生命對應正確');
ok(src(/remote: \['g:remote', 'bomb'\]/), '遙控器同時亮背包與炸彈數');

// ------------------------------------------------------------------
console.log('\n=== 6. 各提示都帶上 hudKey ===');
ok(src(/toast\(info\.icon \+ ' ' \+ itemName\(type\) \+ '：' \+ itemHint\(type\), 2, HUD_OF_ITEM\[type\] \|\| 'gear'\)/),
  '吃到一般道具 → 帶對應 hudKey');
ok(src(/toast\(t\('toast\.glove'\), 2, 'g:glove'\)/), '撿起炸彈（手套）→ g:glove');
ok(src(/toast\(t\('toast\.skull', \{ s: t\('skull\.' \+ p\.skull\) \}\), 2, 'g:skull'\)/), '骷髏頭詛咒 → g:skull');
ok(src(/toast\(t\('toast\.dino'\), 2, 'g:dino'\)/), '騎上小龍 → g:dino');
ok(src(/toast\(t\('toast\.redDino'\), 2, 'g:dino'\)/), '進化成紅龍 → g:dino');
ok(src(/toast\(t\('solo\.doorOpen'\), 2\.4, 'stage'\)/), '出口開啟 → 高亮關卡圖示');
ok(!src(/toast\(t\('toast\.glove'\), 1\.6\)/), '舊的 1.6 秒停留已換掉');

// ------------------------------------------------------------------
console.log('\n=== 7. 不再遮擋：沒有任何「蓋在畫布上」的大方塊提示 ===');
ok(!src(/\.toastbox|#itemPop|#bigTip/), '沒有殘留的舊大型提示容器');
const toastCss = (html.match(/#toast \{[^}]*\}/) || [''])[0];
ok(/position: fixed/.test(toastCss), '橫幅 fixed 定位');
ok(/pointer-events: none/.test(toastCss), '橫幅不吃事件');
ok(!/inset: 0/.test(toastCss), '橫幅不是滿版覆蓋層');
// bubbleSay（角色頭上對話）要保留，那是另一個功能
ok(typeof P.bubbleSay === 'function', '角色頭上對話（bubbleSay）仍然保留，沒有被誤刪');

// ------------------------------------------------------------------
console.log('\n=== 8. 匯出與相容 ===');
const exp = ['toast', 'toastHide', 'placeToast', 'hudFlash', 'hudFxEls', 'applyItem'];
exp.forEach(function (k) {
  ok(typeof P[k] === 'function', '__BH 匯出 ' + k);
});
ok(src(/window\.__BH = \{/), '__BH 仍存在');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
