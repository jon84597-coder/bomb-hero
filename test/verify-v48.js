// 無頭測試 v48（v4.2）：手機移動操作雙軌
//   模式 A「全域隱形大空間滑動」／模式 B「虛擬搖桿 + 自訂位置」
//   · 版面換算、死區、預設值、老玩家升級相容
//   · 設定頁新元件、位置編輯器
//   · 雲端存檔的觸控版面（後端清洗）
const path = require('path');
const fs = require('fs');
const { makeEnv, html } = require('./_sandbox');

const C = require(fs.existsSync(path.join(__dirname, '..', 'cloud.js'))
  ? path.join(__dirname, '..', 'cloud.js')
  : path.join(__dirname, '..', '..', 'bomberman-online', 'cloud.js'));

const env = makeEnv();
const P = env.BH;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function src(re) { return re.test(html); }

console.log('\n=== 0. 版本 ===');
ok(P.VERSION === '4.4', '版本 = 4.3');
ok(/<span id="verTxt">4\.4<\/span>/.test(html), '徽章版本號同步 4.3');
ok(P.VERSION_LOG[0].v === '4.4' && P.VERSION_LOG[0].now === true, '版本紀錄最新一筆是 4.3');
ok(P.VERSION_LOG[1].v === '4.3' && !P.VERSION_LOG[1].now, '上一筆 4.3 已不是「當前」');
const v42 = P.VERSION_LOG[2].items.join('|');
['隱形滑動', '虛擬搖桿', '死區', '自訂搖桿位置', '雲端'].forEach(function (k) {
  ok(v42.indexOf(k) >= 0, 'v4.2 條列提到「' + k + '」');
});

console.log('\n=== 1. 兩種模式的設定值 ===');
ok(P.DEF_TPAD && P.DEF_TPAD.mode === 'slide', '預設模式 = slide（全新玩家直接拿到隱形滑動區）');
ok(P.DEF_TPAD.pad === null, '預設沒有自訂搖桿位置');
ok(P.DEF_TPAD.side === 'left', '預設操作區在左半邊');
ok(P.settings.tpad.mode === 'slide', 'settings.tpad.mode 被正規化');
ok(P.padMode() === 'slide', 'padMode() = slide');
P.settings.tpad.mode = 'stick';
ok(P.padMode() === 'stick', '切到 stick → padMode() = stick');
delete P.settings.tpad.mode;
ok(P.padMode() === 'slide', 'mode 壞掉／不見 → 安全退回 slide');
P.settings.tpad.mode = 'slide';

console.log('\n=== 2. HTML：隱形滑動區 ===');
ok(/<div class="tslide" id="slideZone">/.test(html), '有 #slideZone 隱形滑動區');
const iUI = html.indexOf('id="touchUI"');
const iZone = html.indexOf('id="slideZone"');
const iPad = html.indexOf('id="tpad"');
ok(iUI > 0 && iZone > iUI && iZone < iPad, '#slideZone 在 #touchUI 裡、且排在搖桿之前（圖層在下）');
ok(!/>[^<]*<\/div>/.test(html.slice(iZone, html.indexOf('>', iZone) + 1)), '滑動區內沒有任何文字／圖示');

console.log('\n=== 3. CSS：滑動區與圖層 ===');
ok(src(/#touchUI \.tslide \{[^}]*width: 50%[^}]*\}/), '滑動區佔半個遊戲畫面（width:50%）');
ok(src(/#touchUI \.tslide\.right \{ left: auto; right: 0; \}/), '可以切到右半邊');
ok(src(/body\.touch\.slidepad #touchUI \.tslide \{ display: block; \}/), '只有手機觸控 + slide 模式才啟用');
ok(src(/body\.touch\.slidepad #touchUI \.tpad \{ visibility: hidden; pointer-events: none; \}/),
  'slide 模式時實體圓盤隱藏且不吃觸控');
ok(src(/#touchUI \.tbtn \{ z-index: 3; \}/) && src(/#touchUI \.tslide \{[^}]*z-index: 1/),
  '按鈕 z-index 3 > 滑動區 1（放彈鍵永遠優先）');
ok(src(/#touchUI \.tpad \{ z-index: 2; \}/), '圓盤在滑動區之上、按鈕之下');
ok(src(/body\.touch #touchUI \.tpad\.custom \{/), '有自訂位置的樣式');
ok(src(/--pad-x/) && src(/--pad-y/), '自訂位置用百分比變數');

console.log('\n=== 4. 死區與容錯（程式碼層面）===');
ok(/const SLIDE_DEAD = 9, SLIDE_MAX = 120;/.test(html), '死區 9px、最大半徑 120px');
ok(src(/const on = len >= SLIDE_DEAD;/), '小於死區 → 不產生移動');
ok(src(/ox \+= dx \* \(1 - SLIDE_MAX \/ len\);/), '超過最大半徑會把原點往前帶（滑多遠都不斷線）');
ok(src(/zone\.setPointerCapture\(sid\)/), '抓住 pointer，手指滑出區塊外仍持續收到事件');
ok(src(/if \(sid !== null\) return;/), '同一時間只認一根手指當搖桿');

console.log('\n=== 5. 多點觸控不打架 ===');
ok(src(/const ownAxis = padMode\(\) === 'stick' \? \(force \|\| !padHeld\) : force;/),
  '軸向歸零分模式處理（放開按鈕不會讓角色停下來）');
ok(!src(/window\.addEventListener\('pointerup', function \(\) \{ releaseAll\(false\); \}\);[\s\S]{0,40}Input\.setTouchAxis/),
  '放開任一手指不會無條件清掉軸向');

console.log('\n=== 6. 版面換算：自訂位置 ===');
P.settings.tpad.pad = null;
let v = P.touchLayoutVars();
ok(!('--pad-x' in v), '沒自訂位置 → 不輸出 --pad-x');
P.settings.tpad.pad = { x: .3, y: .7 };
v = P.touchLayoutVars();
ok(v['--pad-x'] === '30.00%' && v['--pad-y'] === '70.00%', '有自訂位置 → 30%／70%（' + v['--pad-x'] + ' / ' + v['--pad-y'] + '）');
ok(v['--tscale'] === '0.8', '大小設定仍然生效（--tscale）');
P.settings.tpad.pad = { x: .255, y: .5 };
v = P.touchLayoutVars();
ok(v['--pad-x'] === '25.50%', '小數位置也正確（' + v['--pad-x'] + '）');
P.settings.tpad.pad = null;
ok(P.padCustom() === null, 'padCustom() 沒設定時回 null');
P.settings.tpad.pad = { x: .4, y: .6 };
ok(P.padCustom() && P.padCustom().x === .4, 'padCustom() 有設定時回座標');
P.settings.tpad.pad = { x: 'oops', y: 1 };
ok(P.padCustom() === null, '壞值（字串）→ 當成沒設定，不會炸');
P.settings.tpad.pad = null;

console.log('\n=== 7. applyTouchLayout 會切 body class ===');
const body = env.sandbox.document.body;
P.settings.tpad.mode = 'slide';
P.applyTouchLayout();
ok(body.classList.contains('slidepad'), 'slide 模式 → body.slidepad');
P.settings.tpad.mode = 'stick';
P.applyTouchLayout();
ok(!body.classList.contains('slidepad'), 'stick 模式 → 移除 body.slidepad');
P.settings.tpad.pad = { x: .2, y: .8 };
P.applyTouchLayout();
ok(env.sandbox.document.getElementById('tpad').classList.contains('custom'), '有自訂位置 → #tpad.custom');
P.settings.tpad.pad = null;
P.applyTouchLayout();
ok(!env.sandbox.document.getElementById('tpad').classList.contains('custom'), '沒自訂位置 → 移除 .custom');

console.log('\n=== 8. 老玩家升級相容 ===');
(function () {
  const old = { ctrl: 'touch', tpad: { side: 'right', act: 'left', size: 1.2 } };
  const e2 = makeEnv({ storage: { 'bombhero-settings-v1': JSON.stringify(old) } });
  ok(e2.BH.padMode() === 'stick', '本來就有觸控設定的老玩家 → 維持實體搖桿');
  ok(e2.BH.settings.tpad.side === 'right' && e2.BH.settings.tpad.act === 'left',
    '老玩家的左右配置原封不動');
  ok(e2.BH.settings.tpad.size === 1.2, '老玩家的大小原封不動');
  const e3 = makeEnv();
  ok(e3.BH.padMode() === 'slide', '全新玩家 → 直接拿到推薦的隱形滑動區');
})();

console.log('\n=== 9. 設定頁新元件 ===');
['segTmode', 'segTpadSide', 'segTactSide', 'segTsize', 'btnPadPos', 'btnPadReset', 'tpadHint'].forEach(function (id) {
  ok(html.indexOf('id="' + id + '"') > 0, '設定頁有 #' + id);
});
ok(/>隱形滑動區</.test(html) && />虛擬搖桿</.test(html), '有「隱形滑動區 / 虛擬搖桿」兩顆切換鈕');
ok(/>操作區在左</.test(html) && />操作區在右</.test(html), '左右改叫「操作區」（兩種模式都適用）');
ok(/>✥ 拖曳調整搖桿位置</.test(html), '有「拖曳調整搖桿位置」按鈕');
ok(/>回復預設位置</.test(html), '有「回復預設位置」按鈕');

console.log('\n=== 10. 搖桿位置編輯器 ===');
['padEdit', 'peStage', 'pePad', 'peSave', 'peReset', 'peClose', 'peVal'].forEach(function (id) {
  ok(html.indexOf('id="' + id + '"') > 0, '編輯器有 #' + id);
});
ok(src(/#padEdit\.on \{ display: flex; \}/), '編輯器是覆蓋全螢幕的浮層');
ok(src(/#pePad \{[^}]*touch-action: none/), '圓盤可以拖（touch-action:none）');
ok(typeof P.PadEdit === 'object' && typeof P.PadEdit.open === 'function', 'PadEdit 模組可用');
ok(typeof P.PadEdit.save === 'function' && typeof P.PadEdit.reset === 'function', '有存檔／重置');
P.PadEdit.open();
ok(env.sandbox.document.getElementById('padEdit').classList.contains('on'), 'open() 會打開編輯器');
P.PadEdit.save();
ok(env.sandbox.document.getElementById('padEdit').classList.contains('on') === false, 'save() 會關閉編輯器');
const pp = P.settings.tpad.pad;
ok(pp && pp.x >= 0 && pp.x <= 1 && pp.y >= 0 && pp.y <= 1,
  '存下來的位置在 0~1 之間（' + (pp && pp.x) + ' / ' + (pp && pp.y) + '）');
P.PadEdit.reset();
ok(P.settings.tpad.pad === null, 'reset() 清掉自訂位置，回到預設角落');

console.log('\n=== 11. 後端：觸控版面清洗 ===');
ok(typeof C.sanitizeLayout === 'function', 'cloud.js 匯出 sanitizeLayout');
ok(JSON.stringify(C.sanitizeLayout(null)) === 'null', 'null → null（維持「沒設定」）');
let L = C.sanitizeLayout({});
ok(L.mode === 'slide' && L.side === 'left' && L.act === 'right' && L.size === 0.8 && L.pad === null,
  '空物件 → 全部給預設值');
L = C.sanitizeLayout({ mode: 'stick', side: 'right', act: 'left', size: 1.2, pad: { x: .25, y: .75 } });
ok(L.mode === 'stick' && L.side === 'right' && L.act === 'left', '合法值原樣保留');
ok(Math.abs(L.size - 1.2) < 1e-9 && L.pad.x === .25, '大小與座標保留');
L = C.sanitizeLayout({ size: 99, pad: { x: -3, y: 9 } });
ok(L.size === 1.6, 'size 99 被夾到上限 1.6');
ok(L.pad.x === 0 && L.pad.y === 1, '座標 -3 / 9 被夾到 0 / 1');
L = C.sanitizeLayout({ size: 'big', pad: 'nope' });
ok(L.size === 0.8 && L.pad === null, '字串／壞型別 → 退回預設');
L = C.sanitizeLayout({ mode: 'fly', side: 'up', act: 'down' });
ok(L.mode === 'slide' && L.side === 'left' && L.act === 'right', '非法列舉值 → 退回預設');
L = C.sanitizeLayout({ pad: { x: 0.12345, y: 0.98765 } });
ok(L.pad.x === 0.123 && L.pad.y === 0.988, '座標四捨五入到小數 3 位（' + L.pad.x + ' / ' + L.pad.y + '）');

console.log('\n=== 12. 前端 Cloud 也有 setLayout ===');
ok(typeof P.Cloud === 'object' && typeof P.Cloud.setLayout === 'function', 'Cloud.setLayout 存在（推版面到雲端）');
ok(typeof P.Cloud.applyRemoteLayout === 'function', 'Cloud.applyRemoteLayout 存在（吃雲端版面）');
ok(P.Cloud.applyRemoteLayout({ mode: 'stick', side: 'right', act: 'left', size: 1.2, pad: { x: .8, y: .2 } }) === true,
  'applyRemoteLayout() 套用成功');
ok(P.settings.tpad.mode === 'stick' && P.settings.tpad.side === 'right' && P.settings.tpad.size === 1.2,
  '本機設定被雲端版面更新');
ok(P.settings.tpad.pad && P.settings.tpad.pad.x === .8, '自訂位置也被套用');
ok(P.Cloud.applyRemoteLayout(null) === false, 'null 不會亂改設定');
ok(P.settings.tpad.pad && P.settings.tpad.pad.x === .8, '呼叫 null 之後設定still沒變');

console.log('\n=== 13. 版面會存進本機設定 ===');
P.settings.tpad.mode = 'stick';
P.settings.tpad.pad = { x: .22, y: .78 };
P.saveSettings();
let saved = null;
try { saved = JSON.parse(env.sandbox.localStorage.getItem('bombhero-settings-v1')); } catch (e) {}
ok(saved && saved.tpad && saved.tpad.mode === 'stick', 'mode 寫進 localStorage');
ok(saved && saved.tpad.pad && saved.tpad.pad.x === .22, '自訂位置寫進 localStorage');

console.log('\n=== 14. 10 種語言都有新文案 ===');
const base = P.I18N['zh-TW'];
const NEWK = ['set.tmode', 'set.tmode2', 'set.padL', 'set.padR', 'set.padPos', 'set.padReset', 'set.peTitle', 'set.peTip', 'set.peSave'];
NEWK.forEach(function (k) {
  ok(typeof base[k] === 'string' && base[k].length > 1, '繁中有 ' + k);
});
P.LANGS.forEach(function (L) {
  const miss = NEWK.filter(function (k) { return !P.I18N[L.id] || !P.I18N[L.id][k]; });
  ok(miss.length === 0, L.id + ' 沒有缺（' + miss.length + '）');
});
P.setLang('en');
ok(P.tr('隱形滑動區') === 'Invisible slide area', '英文：隱形滑動區 → ' + P.tr('隱形滑動區'));
ok(P.tr('虛擬搖桿') === 'Virtual joystick', '英文：虛擬搖桿 → ' + P.tr('虛擬搖桿'));
P.setLang('ja');
ok(/スライド/.test(P.tr('隱形滑動區')), '日文有翻：' + P.tr('隱形滑動區'));
P.setLang('zh-TW');
ok(P.tr('隱形滑動區') === '隱形滑動區', '繁中模式原樣回傳');

console.log('\n=== 15. 不影響原本的搖桿/按鈕 ===');
ok(/id="tpknob"/.test(html) && /class="tpring"/.test(html), '原本的圓盤與旋鈕還在（模式 B 用）');
ok(/data-t="action"/.test(html) && /data-t="det"/.test(html) && /data-t="fire"/.test(html),
  '放彈／引爆／吐火鍵都還在');
ok(typeof P.Input.setTouchAxis === 'function', 'Input.setTouchAxis 沒被改壞');
P.Input.setTouchAxis(-1, 0);
ok(P.Input.schemes.touch.dirs().join(',') === 'left', '軸向 → 方向仍然正常（left）');
P.Input.setTouchAxis(0, 0);
ok(P.Input.schemes.touch.dirs().length === 0, '歸零後沒有方向');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
