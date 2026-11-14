// v5.10 驗證：手把選單導航（每個選項都選得到 / 彈窗也進得去 / 右蘑菇頭捲動 / 遊戲中不誤觸）
//   ① pickBest()：2 欄網格「往下走同一欄」、走到邊會繞回、水平只換同排
//   ② 圖層：掃描範圍含彈窗（[role="dialog"]／.overlay-in）
//   ③ 手把索引：走槽映射 padPhys(0)，沒有就退回第一支連線的手把
//   ④ LB／RB 逐項（保證每個都選得到）＋ 焦點位置記憶（DOM 重繪不會跳回第一項）
//   ⑤ 右蘑菇頭捲動（上下左右、死區、找最近可捲動容器）
//   ⑥ A／B／Start：B 在遊戲中是暫停
//   ⑦ 只有真的在用手把才顯示光環（滑鼠一動就收掉）
//   ⑧ PAD_MAP 單一來源 ＋ 說明頁
//   ⑨ .padfocus 在深色與淺色都看得清楚
// 跑法：node test/verify-v510.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }

const SRC = require('./_sandbox').rawHtml;
const env = makeEnv();
const B = env.BH;

// ---------------------------------------------------------------
head('① pickBest()：2 欄選單的移動規則');

const PB = (B.PadUI && B.PadUI.pickBest) || function () { return -2; };
const R = function (x, y, w, h) { return { x: x, y: y, w: w, h: h }; };
// 0,1 第一排｜2,3 第二排｜4 第三排只有左邊
const GRID = [
  R(0, 0, 100, 40), R(120, 0, 100, 40),
  R(0, 60, 100, 40), R(120, 60, 100, 40),
  R(0, 120, 100, 40)
];

ok(PB(GRID, 0, 'down', false) === 2, '左欄往下 → 同一欄的下一排（不是旁邊那顆）', PB(GRID, 0, 'down', false));
ok(PB(GRID, 1, 'down', false) === 3, '右欄往下 → 右欄下一排', PB(GRID, 1, 'down', false));
ok(PB(GRID, 0, 'right', false) === 1, '往右 → 同一排右邊那顆', PB(GRID, 0, 'right', false));
ok(PB(GRID, 2, 'right', false) === 3, '第二排往右 → 同一排右邊', PB(GRID, 2, 'right', false));
ok(PB(GRID, 3, 'left', false) === 2, '往左 → 同一排左邊那顆', PB(GRID, 3, 'left', false));
ok(PB(GRID, 2, 'up', false) === 0, '往上 → 同一欄上一排', PB(GRID, 2, 'up', false));

// 走到邊：不繞回時回 -1，繞回時跳到另一頭
ok(PB(GRID, 4, 'down', false) === -1, '最後一顆再往下 → 回 -1（已到邊）', PB(GRID, 4, 'down', false));
ok(PB(GRID, 4, 'down', true) === 0, '繞回 → 最上面同一欄那顆', PB(GRID, 4, 'down', true));
ok(PB(GRID, 0, 'up', true) === 4, '最上面再往上 → 繞到最下面', PB(GRID, 0, 'up', true));
ok(PB(GRID, 1, 'right', true) === 0, '最右邊再往右 → 繞回同排最左邊', PB(GRID, 1, 'right', true));

// 全寬按鈕下面接兩欄 → 選左邊（同分取前面）
const MIX = [R(0, 0, 400, 30), R(0, 100, 180, 90), R(220, 100, 180, 90), R(0, 210, 180, 90)];
const d1 = PB(MIX, 0, 'down', false);
ok(d1 === 1 || d1 === 2, '全寬鈕往下 → 進到下一排（不是跳到更遠的第三排）', d1);
ok(PB(MIX, 1, 'down', false) === 3, '左下再往下 → 第三排', PB(MIX, 1, 'down', false));

ok(PB([], 0, 'down', false) === -1, '空清單回 -1');
ok(PB([R(0, 0, 10, 10)], 0, 'down', false) === -1, '只有一項回 -1');
ok(PB(GRID, 9, 'down', false) === -1, '索引超出範圍回 -1');
ok(PB(GRID, 0, 'down', false) !== 0, '永遠不會回傳自己');

// ---------------------------------------------------------------
head('② 圖層：彈窗也要能用手把操作');

ok(/const LAYER_SEL = '\.screen\.on, \[role="dialog"\], \.overlay-in, \.modal\.on';/.test(SRC),
  '掃描範圍＝.screen.on ＋ 彈窗（role=dialog／overlay-in／modal.on）');
ok(/if \(inGame && el\.id === 'scr-game'\) continue;/.test(SRC), '遊戲中不會把 HUD 按鈕當成選單焦點');
ok(/const SKIP_ID = \{ tutCard: 1/.test(SRC), '教學提示卡不搶焦點');
ok(/function zOf\(el\)/.test(SRC) && /out\.sort\(function \(a, b\) \{ return \(a\.z - b\.z\) \|\| \(a\.i - b\.i\); \}\)/.test(SRC),
  '多層同時存在時取 z-index 最高的那一層');
ok(/\$\{role="dialog"\}|\['role="dialog"'\]|\.roomitem, \.pbox/.test('') || /\[tabindex\]:not\(\[tabindex="-1"\]\), \.roomitem, \.pbox/.test(SRC),
  '可操作元素包含 [tabindex]、.roomitem、.pbox（不只是 button）');
ok(/input:not\(\[type="hidden"\]\), select, textarea/.test(SRC), '也認得 select／textarea／input');
ok(/if \(el\.closest && el\.closest\('\.hide'\)\) continue;/.test(SRC), '藏起來的容器裡的按鈕不算');
ok(/if \(cs\.display === 'none' \|\| cs\.visibility === 'hidden'\) return false;/.test(SRC), 'display:none／visibility:hidden 一律排除');
ok(/parseFloat\(cs\.opacity\) < \.05/.test(SRC), '透明度 0 的也排除');

// ---------------------------------------------------------------
head('③ 手把索引：不再死讀瀏覽器索引 0');

ok(/pi = Input\.padPhys\(0\);/.test(SRC), '先用 1P 槽位對應的實體索引');
ok(/if \(pi >= 0\) return pi;/.test(SRC) && /if \(gp && gp\.connected !== false\) return i;/.test(SRC),
  '1P 槽沒手把時退回「第一支連線的手把」（插拔留洞不會整個沒反應）');
ok(/function padIndex\(\)/.test(SRC) && /padIndex: padIndex/.test(SRC), 'padIndex() 有匯出（可測）');

// ---------------------------------------------------------------
head('④ 逐項走訪與焦點記憶');

ok(/function step\(d\)/.test(SRC) && /const i = \(base \+ d \+ list\.length\) % list\.length;/.test(SRC),
  'LB／RB 用環狀索引走訪（保證每個都到得了）');
ok(/focusPos/.test(SRC), '記住焦點在清單裡的位置');
ok(/if \(!pick && focusPos >= 0 && focusPos < list\.length\) pick = list\[focusPos\];/.test(SRC),
  'DOM 重繪後（沒有 id 的元素）用位置接回去，不會跳回第一項');
ok(/focusPos = -1;/.test(SRC), '換畫面／refocus 會清掉位置記憶');
ok(/if \(focusEl && \(focusEl\.isConnected === false \|\| cacheItems\.indexOf\(focusEl\) < 0\)\)/.test(SRC),
  '元素被移除時會放掉焦點');

// ---------------------------------------------------------------
head('⑤ 右蘑菇頭：上下左右捲動');

ok(/function scrollBy\(dt, rx, ry\)/.test(SRC) && /scrollBy\(dt, a\.rx, a\.ry\);/.test(SRC), '每幀把右蘑菇頭接到 scrollBy()');
ok(/t\.scrollTop \+= ay \* SCROLL_SP/.test(SRC) && /t\.scrollLeft \+= ax \* SCROLL_SP/.test(SRC), '上下與左右都會捲');
ok(/const SCROLL_SP = 980;/.test(SRC), '捲動速度 980 px/秒（滿舵）');
ok(/const dz = \.18;/.test(SRC), '有死區，手把漂移不會自己捲');
ok(/function scrollTarget\(el\)/.test(SRC) && /cur\.scrollHeight > cur\.clientHeight \+ 4/.test(SRC),
  '會找「最近的可捲動容器」，不是無腦捲整頁');
ok(/const isScreen = !cacheScope \|\| \(cacheScope\.classList && cacheScope\.classList\.contains\('screen'\)\)/.test(SRC),
  '彈窗內不捲背後的頁面');

// ---------------------------------------------------------------
head('⑥ 按鍵：A 確認／B 返回（只在選單）／Start');

ok(/if \(!inGame && Input\.padEdge\(pi, 0\)\) activate\(\);/.test(SRC), 'A 確認');
ok(/if \(!inGame && Input\.padEdge\(pi, 1\)\) back\(\);/.test(SRC), 'B 返回');
/* v6.01：使用者回報「B 有遙控引爆，卻順便暫停」→ 手把的選單導航整段在遊戲畫面停手。
   back() 裡那條 togglePause 分支只留給 ESC／瀏覽器返回，手把走不到。 */
ok(/const inGame = \(typeof Screen !== 'undefined' && Screen\.current === 'game'\);/.test(SRC)
  && /if \(!inGame && Input\.padEdge\(pi, 1\)\) back\(\);/.test(SRC),
  '遊戲中手把 B 不會暫停（選單導航停手，B 只留給遙控引爆）');
ok(/if \(Input\.padEdge\(pi, 4\)\) step\(-1\);/.test(SRC) && /if \(Input\.padEdge\(pi, 5\)\) step\(1\);/.test(SRC),
  'LB／RB 逐項');
ok(/if \(cacheScope\) \{\s*if \(Input\.padEdge\(pi, 4\)\)/.test(SRC),
  '沒有選單時（遊戲中）不會亂跑逐項');
ok(/const REPEAT_FIRST = 340;/.test(SRC) && /const REPEAT_GAP = 130;/.test(SRC), '按住會連續移動（340ms 後每 130ms 一格）');
ok(/if \(edge \|\| dir !== lastDir\) \{ move\(dir\); repAt = now \+ REPEAT_FIRST; lastDir = dir; \}/.test(SRC),
  '換方向立刻反應，不用放開再推');

// ---------------------------------------------------------------
head('⑦ 光環只在「有人用手把」時出現');

ok(/let armed = false;/.test(SRC), '有 armed 旗標');
ok(/if \(!armed\) \{ if \(!padActive\(pi\)\) return; armed = true; \}/.test(SRC), '第一次手把輸入才點亮');
ok(/function padActive\(pi\)/.test(SRC) && /Math\.abs\(a\.x\) > \.32/.test(SRC), '按鍵或蘑菇頭都算「在用」');
ok(/document\.addEventListener\('pointerdown', function \(\) \{\s*armed = false;/.test(SRC),
  '改用滑鼠／觸控就收掉光環並交還主控權');

// ---------------------------------------------------------------
head('⑧ PAD_MAP：說明頁與程式共用一份');

/* v6.00：A／B／X／Y 四顆改成「逐槽可設定」後說明表多了一列（至少 9 條） */
ok(Array.isArray(B.PAD_MAP) && B.PAD_MAP.length >= 9, 'PAD_MAP 至少 9 條（' + (B.PAD_MAP ? B.PAD_MAP.length : '?') + '）');
const keys = (B.PAD_MAP || []).map(function (r) { return r[0]; }).join('|');
ok(/左蘑菇頭/.test(keys) && /右蘑菇頭/.test(keys), '有左右蘑菇頭');
ok(/LB／RB/.test(keys), '有 LB／RB（逐項）');
ok(/^A$/.test((B.PAD_MAP || [])[0][0]) || (B.PAD_MAP || []).some(function (r) { return r[0] === 'A'; }), '有 A');
ok(/PAD_MAP\.forEach\(function \(row\)/.test(SRC), '說明頁直接吃 PAD_MAP（不是另外手寫一份）');

// ---------------------------------------------------------------
head('⑨ 光環樣式與可及性');

const cssCount = (SRC.match(/^\.padfocus \{/gm) || []).length;
ok(cssCount === 2, '兩處 .padfocus 定義（深色／淺色）都在（' + cssCount + '）');
ok(/box-shadow: 0 0 0 7px rgba\(12,8,2,\.62\)/.test(SRC), '外圈墊深色 → 淺色卡片上也看得見');
ok(/scroll-margin: 12px;/.test(SRC), '捲進畫面時留邊，不會貼著邊緣');

// ---------------------------------------------------------------
console.log('\n' + (fail ? '✗ ' : '') + '通過 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
