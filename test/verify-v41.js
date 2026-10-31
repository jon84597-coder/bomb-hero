// 無頭測試 v41：v3.6 首頁「📖 遊戲說明」頁
//   6 個分頁（基本操作／道具／坐騎／場景／怪物／訣竅）＋ 道具・怪物・坐騎小圖（用遊戲自己的畫法畫）
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function cnt(s, re) { const m = s.match(re); return m ? m.length : 0; }
function tabHtml(id) { P.Help.setTab(id); P.Help.render(); return env.getId('helpBody').innerHTML; }

console.log('\n=== 0. 版本 ===');
ok(P.VERSION === '4.0', '版本 = 4.0');
ok(/<span id="verTxt">4\.0<\/span>/.test(html), '徽章版本號同步 4.0');

console.log('\n=== 1. 畫布 ctx 可切換（說明頁要拿遊戲畫法畫小圖）===');
ok(/let ctx = cv\.getContext\('2d'\);/.test(html), 'ctx 改成 let（可暫時指向說明頁小畫布）');
ok(/v3\.5：改成 let/.test(html), '有 v3.5 註解說明為什麼改');

console.log('\n=== 2. 頁面骨架 ===');
ok(/<div class="screen" id="scr-help">/.test(html), '有 #scr-help 畫面');
ok(/id="helpTabs"/.test(html) && /id="helpBody"/.test(html), '有分頁列與內容區');
ok(/<button class="mbtn helpbtn" id="btnHelp">/.test(html), '首頁有「📖 遊戲說明」按鈕');
ok(cnt(html, /data-ht="/g) === 6, '6 個分頁按鈕（basic/item/ride/stage/foe/tip）');
ok(/id="scr-help"[\s\S]{0,900}data-back="1"/.test(html), '說明頁有「← 回主選單」');

console.log('\n=== 3. 樣式 ===');
['.mbtn.helpbtn', '.helptabs', '.helpbody', '.hgrid', '.hcard', '.htable', '.hbadge', '.hsw']
  .forEach(function (c) { ok(html.indexOf(c) > 0, '樣式含 ' + c); });
ok(/max-height: min\(60vh, 540px\)/.test(html), '內容區可上下捲（不會爆版）');
ok(/@media \(max-width: 560px\)[\s\S]{0,400}\.hgrid, \.hride \{ grid-template-columns: 1fr; \}/.test(html), '窄螢幕改單欄');

console.log('\n=== 4. 多語選單文案 ===');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it'];
ok(LANGS.every(function (l) { return html.indexOf("I18N['" + l + "'] = {") > 0; }), '10 種語言區塊都在');
let allHelp = true;
LANGS.forEach(function (l) {
  const i = html.indexOf("I18N['" + l + "'] = {");
  const seg = html.slice(i, i + 40000);
  if (seg.indexOf("'menu.help':") < 0 || seg.indexOf("'menu.help.sub':") < 0) allHelp = false;
});
ok(allHelp, '每種語言都有 menu.help / menu.help.sub');

console.log('\n=== 5. 資料完整性：道具 ===');
const ITEM_IDS = Object.keys(P.ITEMS);
ok(P.HELP_ITEMS && P.HELP_ITEMS.length === ITEM_IDS.length, '道具筆數 = ' + ITEM_IDS.length + '（實測 ' + (P.HELP_ITEMS || []).length + '）');
ok(ITEM_IDS.every(function (id) {
  return P.HELP_ITEMS.some(function (it) { return it.id === id && it.d && it.u && it.k; });
}), '每一種道具都有「效果／用法／訣竅」');
ok(P.ITEM_POOL.every(function (id) {
  return P.HELP_ITEMS.some(function (it) { return it.id === id; });
}), '道具池裡每一種都寫進說明');

console.log('\n=== 6. 資料完整性：怪物 ===');
ok(P.HELP_FOES && P.HELP_FOES.length === 10, '10 種小怪');
ok(P.HELP_FOES.filter(function (f) { return f.k === 'ground'; }).length === 6, '地面怪 6 種');
ok(P.HELP_FOES.filter(function (f) { return f.k === 'fly'; }).length === 4, '飛行怪 4 種');
ok(P.HELP_FOES.filter(function (f) { return f.hp === 2; }).map(function (f) { return f.id; }).join(',') === 'beetle,skull',
  '需要炸 2 次的只有鐵甲蟲與骷髏兵（與程式一致）');
ok(/id === 'boss'[\s\S]{0,400}makeBoss\(0, 0, 5\)/.test(html), 'BOSS 圖用遊戲的 makeBoss 畫（血量 5）');

console.log('\n=== 7. 各分頁內容 ===');
const hBasic = tabHtml('basic');
ok(/移動/.test(hBasic) && /放彈／動作/.test(hBasic), '基本操作：移動／放彈');
ok(/遙控引爆/.test(hBasic) && /恐龍吐火/.test(hBasic), '基本操作：遙控引爆／恐龍吐火');
ok(/搖桿/.test(hBasic), '基本操作：手機搖桿');
ok(/軟磚/.test(hBasic) && /硬牆/.test(hBasic) && /過關傳送門/.test(hBasic), '基本操作：地圖元素說明');
ok(/3 條命/.test(hBasic), '基本操作：生命說明');

const hItem = tabHtml('item');
ok(cnt(hItem, /data-sp="item:/g) === ITEM_IDS.length, '道具頁 ' + ITEM_IDS.length + ' 張小圖');
ok(/遙控器/.test(hItem) && /按 <b>E<\/b>/.test(hItem), '道具頁：遙控器＋E 鍵用法');
ok(/穿透軟磚/.test(hItem), '道具頁：穿透彈說明');
ok(/傳給他/.test(hItem) && /hbadge bad/.test(hItem), '道具頁：骷髏詛咒標負面');

const hRide = tabHtml('ride');
ok(/data-sp="ride:green"/.test(hRide) && /data-sp="ride:red"/.test(hRide), '坐騎頁：小龍與紅龍各一張圖');
ok(/小龍/.test(hRide) && /紅龍/.test(hRide), '坐騎頁：兩種變化都介紹');
ok(/4 個方向|四個方向/.test(hRide), '坐騎頁：紅龍四方向差異');
ok(/3 秒/.test(hRide), '坐騎頁：吐火冷卻 3 秒');
ok(/<table class="htable">/.test(hRide) && cnt(hRide, /<tr>/g) >= 6, '坐騎頁：小龍 vs 紅龍比較表');
ok(/火焰會把蛋炸掉/.test(hRide), '坐騎頁：提醒火焰會炸掉恐龍蛋（與程式一致）');
ok(/只能擋一次傷害/.test(hRide), '坐騎頁：坐騎只擋一次傷害');

const hStage = tabHtml('stage');
ok(cnt(hStage, /class="hsw"/g) === 8, '場景頁：8 關配色方塊');
ok(/綠野草原/.test(hStage) && /暗黑魔王城/.test(hStage), '場景頁：第 1 關與第 8 關');
ok(/輸送帶/.test(hStage) && /冰面滑行/.test(hStage) && /傳送門/.test(hStage), '場景頁：三種地形機關');
ok(/突死縮圈/.test(hStage) && /復仇推車/.test(hStage), '場景頁：突死縮圈與復仇推車');

const hFoe = tabHtml('foe');
ok(cnt(hFoe, /data-sp="foe:/g) === 11, '怪物頁：10 小怪 ＋ 1 BOSS 共 11 張圖');
ok(/地面怪（會被牆擋住）/.test(hFoe) && /飛行怪（有翅膀/.test(hFoe), '怪物頁：地面／飛行分類');
ok(/穿牆/.test(hFoe), '怪物頁：飛行怪穿牆提示');
ok(/暗黑魔王/.test(hFoe) && /40%/.test(hFoe), '怪物頁：BOSS 與爆走機制');

const hTip = tabHtml('tip');
ok(cnt(hTip, /class="hcard"/g) === 10, '訣竅頁：10 則實戰技巧');

console.log('\n=== 8. 接線 ===');
ok(/\$id\('btnHelp'\)\.addEventListener\('click'[\s\S]{0,200}Help\.show\(\)/.test(html), '首頁按鈕 → Help.show()');
ok(/tb\.addEventListener\('click'[\s\S]{0,300}Help\.setTab\(/.test(html), '分頁列可點選切換');
ok(/refreshers\.push\(function \(\) \{ if \(Screen\.current === 'help'\) Help\.render\(\); \}\)/.test(html), '進說明頁會重畫（語言／設定同步）');
ok(/typeof Help !== 'undefined' && Help && Help\.render\) Help\.render\(\)/.test(html.replace(/\s+/g, ' ')) ||
   /if \(typeof Help !== 'undefined' && Help && Help\.render\) Help\.render\(\);/.test(html),
  '切語言時重畫說明頁（refreshI18NUI）');
ok(/Help: \(typeof Help !== 'undefined' \? Help : null\)/.test(html), '__BH 匯出 Help（給測試與除錯用）');

console.log('\n=== 9. 小圖實際繪製（用遊戲自己的畫法）===');
ok(/if \(kind === 'item'\) drawHelpItem\(/.test(html) &&
   /kind === 'foe'\) drawHelpFoe\(/.test(html) &&
   /kind === 'ride'\) drawHelpRide\(/.test(html), '三種小圖各自有繪製函式');
ok(/drawEnemyArt\(e, e\.x, e\.y, false, 0\)/.test(html), '怪物圖直接呼叫遊戲的 drawEnemyArt');
ok(/drawDino\(p, 62\)/.test(html), '坐騎圖直接呼叫遊戲的 drawDino');
ok(/drawSkateIcon\(cx, cy \+ 1, T \* \.40\)/.test(html), '滑冰鞋用遊戲內建的圖示畫法');
ok(/const oldCtx = ctx;[\s\S]{0,80}ctx = g;/.test(html), '繪製時暫時把 ctx 指向小畫布');
ok(/ctx = oldCtx;/.test(html) && /Game\.T = oldT;/.test(html), '畫完立刻換回來（不影響遊戲畫面）');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
if (fail > 0) process.exit(1);
