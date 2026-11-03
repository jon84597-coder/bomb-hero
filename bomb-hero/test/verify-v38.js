// 無頭測試 v38：v3.2 對戰／線上玩家卡移到最上面工具列左側（紅框處）
//   1. .pkrow 改 position:fixed 釘在 navBar 同一條左側 → 原本橫排不占空間，遊戲畫面往上延伸
//   2. PC 放大（頭像 46px）、手機貼左上縮小（頭像 22px）
//   3. 沙盒實測：updateHud 對戰顯示／單人隱藏的行為不變
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
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '徽章版本號同步 ' + P.VERSION);

console.log('\n=== 1. pkrow 改釘工具列左側 ===');
ok(/\/\* v3\.2：玩家卡改釘在最上面工具列（navBar）同一條的左側空位[\s\S]*?\.pkrow \{\s*\n\s*position: fixed; top: calc\(5px \+ env\(safe-area-inset-top, 0px\)\); left: 10px;\s*\n\s*z-index: 1100;/.test(html),
   '.pkrow position:fixed，top 對齊 navBar（5px＋safe-area）、left:10px');
ok(/max-width: calc\(100vw - 340px\);/.test(html), 'max-width 讓開右上工具列按鈕');
ok(/overflow-x: auto; scrollbar-width: none;\s*\n\s*\}\s*\n\s*\.pkrow::-(webkit-scrollbar) \{ display: none; \}/.test(html) ||
   html.indexOf('.pkrow::-webkit-scrollbar { display: none; }') > 0,
   '超出寬度時列內可橫向捲動且不顯示捲軸');
ok(/z-index: 1100;/.test(html) && /#navBar \{\s*\n\s*position: fixed; left: 0; right: 0; top: 0; z-index: 1200;/.test(html),
   'pkrow(1100) 在 navBar(1200) 之下，不擋工具列點擊');
ok(/justify-content: flex-start;/.test(html), '卡片靠左排（從左上角開始）');

console.log('\n=== 2. 響應式尺寸 ===');
ok(/@media \(min-width: 900px\) \{\s*\n\s*\.pkrow \.pcard canvas \{ width: 46px; height: 46px; \}\s*\n\s*\.pkrow \.pcard \{ padding: 5px 14px 5px 6px; gap: 7px; \}\s*\n\s*\.pkrow \.plabel \{ font-size: 15px; max-width: 160px; \}/.test(html),
   'PC（≥900px）：頭像 46px、暱稱 15px（放大）');
ok(/@media \(max-width: 899px\) \{\s*\n\s*\.pkrow \{ gap: 4px; left: 8px; padding: 2px; max-width: calc\(100vw - 300px\); \}/.test(html),
   '手機：貼左上（left:8px）、寬度上限讓開工具列');
ok(/\.pkrow \.pcard canvas \{ width: 22px; height: 22px; \}/.test(html) &&
   /\.pkrow \.plabel \{ font-size: 10px; max-width: 66px; \}/.test(html),
   '手機：頭像 22px、暱稱 10px');
ok(html.indexOf('<div class="pkrow hide" id="pkRoster"></div>') > 0, '#pkRoster 容器仍在（fixed 定位不影響 DOM）');
ok(/\.pkrow\.hide \{ display: none; \}/.test(html), '.hide 時完全隱藏');

console.log('\n=== 3. 沙盒實測（行為不變） ===');
G.mode = 'battle';
G.players = [
  { ai: true, chIdx: 0, ch: { color: '#e2574c' }, wins: 1, alive: true, ai: true },
  { ai: false, chIdx: 1, ch: { color: '#3f7fd6' }, wins: 0, alive: true },
];
// 觸發 updateHud 的對戰分支
try { P.updateHud(); } catch (e) { console.log('  (updateHud 例外：' + e.message + '）'); }
const pk = doc.getElementById('pkRoster');
ok(pk.className.indexOf('hide') < 0, '對戰時 pkRoster 顯示');
ok((pk.innerHTML.match(/pcard/g) || []).length === 2, '玩家卡 2 張');
ok(pk.innerHTML.indexOf('pstars') > 0, '卡片含星星勝場');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
if (fail > 0) process.exit(1);
