// 無頭測試 v29：v2.3 的四項需求
//   1. 手機方向鍵轉不過去 → 斜推被擋時要能轉向（不再整個人卡住）
//   2. 討伐 BOSS 進去後要有退回鍵（遊戲畫面也要看得到 ←）
//   3. 手機子畫面捲動一致（內容過長時一定拉得到）
//   4. 直式可玩：不再強制旋轉 90 度 + 開始遊戲給「建議橫式」提示
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH, rec = env.rec, els = env.els;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function freshSolo(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.settings.soloTime = 300;
  P.startSolo(stage || 1, false);
  G.state = 'play';
  if (G.players[0]) G.players[0].invuln = 0;
  return G.players[0];
}
function openField() {
  for (let y = 1; y < G.rows - 1; y++)
    for (let x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
  G.bombs.length = 0; G.flames.length = 0; G.items.length = 0;
  G.enemies.length = 0; G.particles.length = 0; G.bubbles.length = 0;
  if (G.eggs) G.eggs.length = 0;
}

// ================================================================
console.log('\n=== 1. 斜推被擋時要能轉向（手機「轉不過去」的主因） ===');

// 造一條橫向走廊：y=3 那列可走，上方 y=2 只有 x=5 是開口，斜角 (x+1,y-1) 是牆
function corridor() {
  freshSolo(1);
  openField();
  for (let x = 1; x < G.cols - 1; x++) { G.grid[2][x] = 1; G.grid[4][x] = 1; }  // 上下都是牆
  G.grid[2][5] = 0;                                                             // 只有 x=5 有向上開口
  for (let y = 1; y < G.rows - 1; y++) { G.grid[y][0] = 1; G.grid[y][G.cols - 1] = 1; }
  return G.players[0];
}
// (a) 主力是 y（往上推）→ 應該往上轉
(function () {
  const p = corridor(); const T = G.T;
  p.x = 5 * T + T / 2; p.y = 3 * T + T / 2;
  const y0 = p.y;
  for (let i = 0; i < 20; i++) P.tryMoveDiag(p, 1, -1, 1 / 60, undefined, 'y');
  ok(p.y < y0 - T * .5, '斜推右上、主力往上 → 真的往上轉（y ' + y0.toFixed(0) + ' → ' + p.y.toFixed(0) + '）');
})();
// (b) 主力是 x → 繼續往右
(function () {
  const p = corridor(); const T = G.T;
  p.x = 5 * T + T / 2; p.y = 3 * T + T / 2;
  const x0 = p.x;
  for (let i = 0; i < 20; i++) P.tryMoveDiag(p, 1, -1, 1 / 60, undefined, 'x');
  ok(p.x > x0 + T * .5, '斜推右上、主力往右 → 繼續往右走（x ' + x0.toFixed(0) + ' → ' + p.x.toFixed(0) + '）');
})();
// (c) 舊版會整個人卡住的位置：斜角是牆、兩軸都通 —— 現在必須有位移
(function () {
  const p = corridor(); const T = G.T;
  p.x = 4 * T + T / 2; p.y = 3 * T + T / 2;
  const d0 = Math.hypot(p.x, p.y);
  P.tryMoveDiag(p, 1, -1, 1 / 60, undefined, 'y');
  const moved = Math.abs(Math.hypot(p.x, p.y) - d0) > 0.01 ||
    Math.abs(p.y - (3 * T + T / 2)) > 0.01;
  ok(moved, '斜角是牆但兩軸都通 → 不再整個人卡死不動（v2.3 修正點）');
})();
// (d) 兩軸全堵：不會亂飛（仍貼著牆）
(function () {
  const p = corridor(); const T = G.T;
  p.x = 3 * T + T / 2; p.y = 3 * T + T / 2;
  G.grid[2][3] = 1; G.grid[3][4] = 1;
  for (let i = 0; i < 30; i++) P.tryMoveDiag(p, 1, -1, 1 / 60, undefined, 'y');
  ok(Math.abs(p.y - (3 * T + T / 2)) < T * .8 && Math.abs(p.x - (3 * T + T / 2)) < T * .8,
    '兩軸都堵時不會暴衝（仍停在附近）');
})();
// (e) 手指稍微歪的「真實斜推」：一路往右走，中途往上轉進開口
(function () {
  const p = corridor(); const T = G.T;
  p.x = 2 * T + T / 2; p.y = 3 * T + T / 2;
  // 先往右推（帶一點上：ax .96 / ay -.28 → 主力 x）
  for (let i = 0; i < 40; i++) P.tryMoveDiag(p, 1, -1, 1 / 60, undefined, 'x');
  const xMid = p.x;
  ok(xMid > 3 * T, '帶斜度的右推可以正常往右走（x=' + xMid.toFixed(0) + '）');
  // 到開口後改成往右上、主力往上 → 應該轉上去
  p.x = 5 * T + T / 2; p.y = 3 * T + T / 2;
  for (let i = 0; i < 40; i++) P.tryMoveDiag(p, 1, -1, 1 / 60, undefined, 'y');
  ok(p.y < 2.6 * T, '到開口後主力往上 → 轉得進去（y=' + p.y.toFixed(0) + '）');
})();
// (f) 觸控主力軸判定：手指往上偏多 → pref = 'y'
ok(/Math\.abs\(ts\.ax\) >= Math\.abs\(ts\.ay\) \? 'x' : 'y'/.test(html),
  'controlHuman 用手指推得比較多的那一軸當主力（不是固定先走水平）');
ok(/function tryMoveDiag\(p, mx, my, dt, spd, pref\)/.test(html), 'tryMoveDiag 收得到主力軸參數 pref');

// ================================================================
console.log('\n=== 2. 討伐 BOSS 進去後有退回鍵 ===');

ok(!/#navBar\.inGame #btnBack \{ display: none/.test(html), 'v2.3：遊戲中不再把「←」藏起來');
ok(/#navBar\.inGame #btnBack \{ display: inline-flex/.test(html), '遊戲中「←」改成顯示（inline-flex）');
ok(html.indexOf('id="btnBack"') > 0, 'navBar 裡有「上一頁」按鈕');
ok(/if \(cur === 'game'\) \{ try \{ togglePause\(\); \} catch \(e\) \{\} return; \}/.test(html),
  '遊戲中按「←」會先暫停（再選回首頁／重新開始）');
// 暫停選單裡要有回首頁
ok(/id="pmHome"/.test(html) && /🏠 回首頁/.test(html), '暫停選單有「🏠 回首頁」');
ok(/id="pmRestart"/.test(html) && /🔄 重新開始/.test(html), '暫停選單有「🔄 重新開始」');
// BOSS 討伐一樣進得到暫停
ok(typeof P.togglePause === 'function', 'togglePause 可用（BOSS 討伐也走同一條）');
ok(/if \(Screen\.current !== 'game' \|\| Game\.state === 'over'\) return;/.test(html),
  '只有遊戲中才能暫停（結束畫面不受影響）');

// ================================================================
console.log('\n=== 3. 手機子畫面捲動一致 ===');

ok(/body\.touch \{ overscroll-behavior: none; padding: 0; align-items: flex-start; \}/.test(html),
  'v2.3：手機一律「靠上對齊」（內容超高時上半部才不會被裁掉、拉不出來）');
ok(!/@media \(orientation: portrait\) \{[\s\S]{0,200}body\.touch \{ align-items: flex-start; \}/.test(html),
  '靠上對齊不再只寫在直式 media query 裡（橫式也吃得到）');
ok(/body\.touch \.wrap:not\(\.game\) \{[\s\S]{0,200}overflow-y: auto; min-height: 0;/.test(html),
  '非遊戲畫面可上下捲');
ok(/body\.touch \.screen, body\.touch \.screen\.on \{ touch-action: pan-y; \}/.test(html),
  'v2.3：每個子畫面自己也允許上下滑（之前某些頁滑不動）');
ok(/body\.touch \.wrap:not\(\.game\) \.card \{ max-height: none; \}/.test(html),
  '內容卡不再被 max-height 截斷');
ok(/body\.touch \.wrap\.game, body\.touch \.wrap\.game \* \{ touch-action: none/.test(html),
  '只有遊戲畫面鎖手勢（避免玩到一半誤觸滑動）');
ok(!/body\.touch\s*\{[^}]*touch-action: none/.test(html), '沒有把 touch-action:none 放在 body 上');

// ================================================================
console.log('\n=== 4. 直式可玩：不強制旋轉 + 建議橫式提示 ===');

ok(!/transform: translate\(-50%, -50%\) rotate\(90deg\)/.test(html), 'v2.3：不再把遊戲畫面旋轉 90 度');
ok(!/width: var\(--vvh, 100vh\); height: var\(--vvw, 100vw\)/.test(html), '不再用「高寬互換」的旋轉尺寸');
ok(/body\.touch #stageWrap \{ padding-bottom: 162px; \}/.test(html), '直式：地圖下方留一列給搖桿／放彈鍵');
ok(/body\.touch #touchUI \.tpad \{ bottom: 12px; \}/.test(html), '直式：搖桿排在下面那一列');
ok(/const cw = cv \? cv\.clientWidth : 0, ch = cv \? cv\.clientHeight : 0;/.test(html),
  '畫布尺寸改用 canvas 自己的 CSS 尺寸（不會把搖桿列算進去）');
ok(!/lockLandscape\(\);\s*\n\s*setTimeout\(resizeView, 260\)/.test(html), '不再強制鎖橫向');
ok(/setTimeout\(showRotateHint, 140\)/.test(html), '進遊戲時會嘗試顯示「建議橫式」提示');
// 提示畫面
ok(/function phonePortrait\(\)/.test(html), '有 phonePortrait() 判斷（觸控 + 高度 > 寬度）');
ok(/window\.innerHeight > window\.innerWidth \+ 40/.test(html), '直式判定：高度比寬度大一段才算');
ok(/function showRotateHint\(\)/.test(html), '有 showRotateHint()');
ok(/function hideRotateHint\(\)/.test(html), '有 hideRotateHint()');
ok(/className = 'rothint'/.test(html) && /\.rothint \{[\s\S]{0,200}position: fixed/.test(html), '提示畫面是滿版浮層（position: fixed 蓋住整個遊戲）');
ok(/橫著玩更過癮/.test(html), '提示標題「橫著玩更過癮」');
ok(/t\('rot\.body1'\) \+ '<b>' \+ t\('rot\.body2'\)/.test(html), '提示內容：「把手機轉成橫式 …」（v2.7：走 t()）');
ok(/直式繼續玩/.test(html), '有「直式繼續玩」按鈕（不強迫一定要轉）');
ok(/paused = true;[\s\S]{0,60}提示期間先凍住/.test(html), '提示出現時先凍住遊戲（不會一開始就挨打）');
ok(/paused = false;[\s\S]{0,40}解除凍結/.test(html), '關掉提示後解除凍結');
ok(/window\.addEventListener\('orientationchange'/.test(html), '轉向時會自動處理（轉橫就關掉提示）');
ok(/if \(rotHintEl && !phonePortrait\(\)\) hideRotateHint\(\);/.test(html), '轉成橫式 → 提示自動消失');
ok(/@keyframes rh-rot/.test(html), '提示裡的手機圖示有旋轉動畫（示意轉橫）');
ok(/@media \(prefers-reduced-motion: reduce\) \{ \.rothint \.rhico \{ animation: none; \} \}/.test(html),
  '系統設定「減少動態效果」時不動');
ok(typeof P.showRotateHint === 'function' && typeof P.hideRotateHint === 'function' &&
  typeof P.phonePortrait === 'function' && typeof P.hasRotateHint === 'function',
  '四個提示相關函式都有匯出（可供測試／除錯）');
ok(P.hasRotateHint() === false, '沙盒環境（非直式手機）不會跳出提示');

// ================================================================
console.log('\n=== 9. 版本與整體 ===');
ok(P.VERSION === '4.5', '版本 = 3.9（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">4.5</span>') > 0, '畫面上的版本號同步 4.3');
// 回歸：遊戲還能跑
let runErr = null;
try {
  freshSolo(1);
  openField();
  const p = G.players[0];
  p.invuln = 999;
  for (let i = 0; i < 180; i++) { P.updateSolo(1 / 60); }
  P.render();
} catch (e) { runErr = e; }
ok(!runErr, '連跑 180 幀 update + render 不報錯' + (runErr ? '：' + runErr.message : ''));
ok(G.players[0].alive, '玩家還活著');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
