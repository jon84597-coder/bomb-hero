// 無頭測試 v34：v2.8 PC/手機尺寸各自獨立 + LOGO 放大 + 怪物量增加 + 道具微量增加
//   1. IS_TOUCH 收嚴：只有「主要輸入是手指／沒有滑鼠」才算手機（觸控 PC 不再變手機版）
//   2. PC 矮視窗不再套手機緊湊排版；PC UI 隨視窗自然放大（LOGO 最大 820px）
//   3. 手機直式 LOGO 94vw 快貼齊左右邊；橫式也放大且不爆屏
//   4. 單人怪物量 base [6,8,9,11,12,14,15]（難度倍率照舊）
//   5. 道具：單人 13+round(stage*1.5)、對戰 18
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

console.log('\n=== 0. 版本 ===');
ok(P.VERSION === '4.4', '版本 = 4.2');
ok(/<span id="verTxt">4\.4<\/span>/.test(html), '徽章版本號同步 4.3');

console.log('\n=== 1. IS_TOUCH 收嚴（v2.8 核心：觸控 PC 不再誤判） ===');
ok(html.indexOf("const coarse = !!(mm && mm('(pointer: coarse)').matches);") > 0, '有檢查 pointer: coarse');
ok(html.indexOf("const noHover = !!(mm && mm('(hover: none)').matches);") > 0, '有檢查 hover: none');
ok(/return !!\(canTouch && \(coarse \|\| noHover\)\);/.test(html), '必須「能觸控 且（手指主要輸入 或 沒滑鼠）」才算手機');
ok(typeof P.IS_TOUCH === 'boolean', 'IS_TOUCH 仍是 boolean（無頭環境 = ' + P.IS_TOUCH + '）');
ok(P.IS_TOUCH === false, '無頭環境（有假 DOM、無 matchMedia）→ IS_TOUCH = false，PC 版 UI');

console.log('\n=== 2. PC 尺寸獨立：矮螢幕緊湊排版只給觸控 ===');
ok(html.indexOf('body.touch .title-card .title-logo { width: clamp(150px, 30vw, 230px); }') > 0,
   '矮螢幕縮 LOGO 規則已加上 body.touch 前綴（PC 不再被縮）');
ok(/@media \(max-height: 620px\) \{\s*\n\s*body\.touch \.title-card \{ padding/.test(html),
   'max-height: 620px 區塊內全部規則都限定 body.touch');
const shortBlock = html.match(/@media \(max-height: 620px\) \{[\s\S]*?\n  \}/);
ok(!!shortBlock && !/\n {4}(?!body\.touch )\S/.test(shortBlock[0]),
   '矮螢幕區塊內沒有漏網的非觸控規則');
ok(/@media \(min-width: 900px\) \{\s*\n\s*\.menu \.mbtn \{ font-size: clamp\(22px, 2vw, 30px\)/.test(html),
   'PC ≥900px：選單按鈕隨視窗放大 clamp(22px, 2vw, 30px)');
ok(/\.title-card \.title-logo \{ width: clamp\(300px, min\(58vw, 88vh\), 820px\); \}/.test(html),
   'PC LOGO：clamp(300px, min(58vw, 88vh), 820px) —— 大螢幕氣派、矮視窗不爆');
ok(/@media \(max-height: 700px\) \{\s*\n\s*body \{ align-items: flex-start; padding-top: 10px; \}/.test(html),
   'PC 矮視窗：改成向上對齊可捲動，UI 一樣不縮');

console.log('\n=== 3. 手機 LOGO 放大 ===');
ok(html.indexOf('width: clamp(220px, 95vw, 500px); max-width: none;') > 0 &&
   html.indexOf('margin-left: calc((100% - clamp(220px, 95vw, 500px)) / 2);') > 0,
   '直式：95vw + calc 手動置中（LOGO 比容器寬時也左右對稱貼邊）');
ok(/body\.touch #scr-title \.title-card \.title-logo \{ width: clamp\(160px, min\(86vw, 108vh\), 480px\); \}/.test(html),
   '橫式：clamp(160px, min(86vw, 108vh), 480px)（ID 選擇器提高優先序，蓋過矮螢幕規則）');
ok(/<div class="titlewrap">\s*<img class="title-logo"/.test(html), 'LOGO 圖還包在 .titlewrap 裡');

console.log('\n=== 4. 單人怪物量增加 ===');
ok(/\[6, 8, 9, 11, 12, 14, 15, 0\]\[stage - 1\]/.test(html), '怪物 base 表 = [6,8,9,11,12,14,15,0]');
function freshSolo(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.startSolo(stage, false);
  P.Game.state = 'play';
}
P.settings.soloDiff = 'normal';
freshSolo(1);
ok(G.enemies.length === 6, '普通・第 1 關 = 6 隻小怪（原本 4，實測 ' + G.enemies.length + '）');
freshSolo(3);
ok(G.enemies.length === 9, '普通・第 3 關 = 9 隻（實測 ' + G.enemies.length + '）');
freshSolo(7);
ok(G.enemies.length === 15, '普通・第 7 關 = 15 隻（實測 ' + G.enemies.length + '）');
let eEasy = 0, eHard = 0;
P.settings.soloDiff = 'easy'; for (let k = 0; k < 5; k++) { freshSolo(4); eEasy += G.enemies.length; }
P.settings.soloDiff = 'hard'; for (let k = 0; k < 5; k++) { freshSolo(4); eHard += G.enemies.length; }
ok(eHard > eEasy, '難度倍率照舊：困難(' + (eHard / 5) + ') > 簡單(' + (eEasy / 5) + ')');
P.settings.soloDiff = 'normal';
P.startSolo(8, true);
ok(G.enemies.length === 1 && G.enemies[0].boss, '挑戰 BOSS：仍然只有魔王、沒有小怪');

console.log('\n=== 5. 道具微量增加 ===');
ok(/items: 13 \+ Math\.round\(stage \* 1\.5\)/.test(html), '單人道具：13 + round(stage × 1.5)');
ok(/items: 18, emptyRate: \.35/.test(html), '對戰道具：14 → 18');
ok(/ITEM_POOL = \[/.test(html), '道具池仍在（種類不變，只是數量變多）');

console.log('\n=== 6. 體積 sanity ===');
ok(html.length > 900000 && html.length < 2000000, '單檔體積正常（' + (html.length / 1024).toFixed(0) + ' KB）');

console.log('\n========================================');
console.log('通過 ' + pass + ' / 失敗 ' + fail);
process.exit(fail ? 1 : 0);
