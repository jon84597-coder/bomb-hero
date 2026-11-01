// 無頭測試 v35：v2.9 對戰／線上 HUD 改版
//   1. 玩家卡改右上一橫排（#pkRoster）：PC 大、手機小；左右側欄收掉、畫面左右延伸
//   2. 遊戲中鎖定畫面：body.in-game、dsFind 遊戲中不捲整頁（暫停覆蓋層除外）
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

console.log('\n=== 0. 版本 ===');
ok(P.VERSION === '4.5', '版本 = 4.2');
ok(/<span id="verTxt">4\.5<\/span>/.test(html), '徽章版本號同步 4.3');

console.log('\n=== 1. 玩家卡橫排（HTML／CSS 結構） ===');
ok(html.indexOf('<div class="pkrow hide" id="pkRoster"></div>') > 0, 'HTML 有 #pkRoster 容器（在 game-top 與 game-flex 之間）');
ok(/\.pkrow \{[\s\S]{0,200}?position: fixed; top: calc\(5px \+ env\(safe-area-inset-top, 0px\)\); left: 10px;/.test(html), 'v3.2：pkrow 釘在最上面工具列左側（不占遊戲畫面空間）');
ok(/\.pkrow \.pcard \{\s*\n\s*display: flex; align-items: center;/.test(html), '玩家卡改横向 pill（頭像＋暱稱＋星星）');
ok(/@media \(min-width: 900px\) \{\s*\n\s*\.pkrow \.pcard canvas \{ width: 46px; height: 46px; \}/.test(html),
   'PC（≥900px）玩家卡放大（v3.2：頭像 46px、暱稱 15px）');
ok(/@media \(max-width: 899px\) \{\s*\n\s*\.pkrow \{ gap: 4px;/.test(html) &&
   /\.pkrow \.pcard canvas \{ width: 22px; height: 22px; \}/.test(html),
   '手機（<900px）玩家卡自動縮小（頭像 22px、暱稱 10px）');
ok(/\.game-top\.battle \{ justify-content: flex-end; \}/.test(html), '對戰時頂欄靠右（計時器在右上）');
ok(/\.pkrow \.pcard \{ background: #fffaf0; border: 2px solid var\(--woodline\);/.test(html), '淺色主題也有對應外觀');

console.log('\n=== 2. 遊戲中鎖定畫面 ===');
ok(/body\.in-game \{ overflow: hidden; \}/.test(html), 'body.in-game → 整頁 overflow: hidden');
ok(/document\.body\.classList\.toggle\('in-game', name === 'game'\);/.test(html), '進遊戲加 body.in-game、離開移除');
ok(html.indexOf("node.closest && node.closest('#ovIn')") > 0 &&
   /v2\.9：遊戲進行中（對戰／線上）鎖定畫面[\s\S]{0,300}?return null;/.test(html),
   'dsFind：遊戲中拖曳不再捲整頁（暫停／結算覆蓋層 #ovIn 例外）');
ok(/const se = document\.scrollingElement \|\| document\.documentElement;/.test(html), '原本的捲動兜底（選單頁）保留');

console.log('\n=== 3. 沙盒實測：對戰 HUD ===');
function freshBattle(n) {
  P.settings.count = n;
  P.Battle.resetSlots();
  P.startBattle();
  G.state = 'play';
  P.updateHud();
}
freshBattle(4);
const pk = env.sandbox ? env.sandbox.document.getElementById('pkRoster')
                        : sandbox.document.getElementById('pkRoster');
const doc = env.sandbox ? env.sandbox.document : sandbox.document;
ok(pk.className.indexOf('hide') < 0, '對戰時 pkRoster 顯示');
ok((pk.innerHTML.match(/pcard/g) || []).length === 4, '4 人對戰 → 一橫排 4 張卡');
ok(pk.innerHTML.indexOf('pstars') > 0 && pk.innerHTML.indexOf('plabel') > 0, '卡片有暱稱＋星星');
ok(doc.getElementById('sideL').className === 'side' && doc.getElementById('sideR').className === 'side',
   '左右側欄收掉（不再佔遊戲畫面寬度）');
ok(doc.getElementById('gameTop').className.indexOf('battle') >= 0, '頂欄掛 battle class（計時器靠右）');
freshBattle(8);
ok((pk.innerHTML.match(/pcard/g) || []).length === 8, '8 人對戰 → 一橫排 8 張卡');
// 單人 → pkRoster 藏起來
P.startSolo(1, false); G.state = 'play'; P.updateHud();
ok(doc.getElementById('pkRoster').className.indexOf('hide') >= 0, '單人模式 pkRoster 隱藏');
ok((doc.getElementById('pkRoster').innerHTML.match(/pcard/g) || []).length === 0, '單人模式沒有玩家卡殘留');

console.log('\n========================================');
console.log('通過 ' + pass + ' / 失敗 ' + fail);
process.exit(fail ? 1 : 0);
