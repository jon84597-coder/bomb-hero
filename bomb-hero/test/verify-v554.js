// test/verify-v554.js —— v5.54：說明頁全語言化 ＋ 換語言重畫 ＋ HUD 讓位量測
//   ① 字典完整性（每行六欄、無重複 key、新增文案六語言齊備）
//   ② 「一句話夾 <b>」的整塊比對機制（順序：先整塊、再逐節點；observer 要補父節點）
//   ③ 換語言會重畫：功能總覽／按鍵表／商店／RPG 配點／新手卡狀態
//   ④ 數字夾在句中 → 改走模板 key（cmd.hint / rpg.sum / rpg.leftRow）
//   ⑤ HUD 讓位改成量測值（--navreserve），縮放提示層級在覆蓋層之下
//   ⑥ 版本戳記
const fs = require('fs');
const path = require('path');
const SB = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const env = SB.makeEnv();
const P = env.BH;
const rawIndex = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const mainJs = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const dictSrc = fs.readFileSync(path.join(ROOT, 'js', 'i18n-src.js'), 'utf8');
const kxSrc = fs.readFileSync(path.join(ROOT, 'js', 'keys-ui.js'), 'utf8');
const vlog = fs.readFileSync(path.join(ROOT, 'js', 'version-log.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}

// ---------- 解析字典 ----------
const body = dictSrc.slice(dictSrc.indexOf('`') + 1, dictSrc.lastIndexOf('`'));
const rows = body.split('\n').filter(l => l.indexOf('|') >= 0);
const D = Object.create(null);          // key → [zh-TW, zh-CN, en, ja, ko]
let badCol = 0, dup = 0;
rows.forEach(function (l) {
  const c = l.split('|');
  if (c.length !== 6) { badCol++; return; }
  if (D[c[0]]) dup++;
  D[c[0]] = c.slice(1);
});

// ================================================================
console.log('\n=== ① 字典完整性 ===');
// ================================================================
ok(rows.length > 1800, '字典有 ' + rows.length + ' 條');
ok(badCol === 0, '每一行都是六欄（格式錯誤 ' + badCol + ' 行）');
ok(dup === 0, '沒有重複的 key（重複 ' + dup + ' 條）');

// 功能總覽的 105 條：doc.0 ~ doc.104
let docN = 0, docBad = 0, docBold = 0;
for (let i = 0; i < 105; i++) {
  const r = D['doc.' + i];
  if (!r) { docBad++; continue; }
  docN++;
  /* 欄位順序：0=zh-TW 1=zh-CN 2=en 3=ja 4=ko —— 只有 en 欄不該出現中文
     （日文本來就用漢字，拿 CJK 判斷會全部誤判）。 */
  if (/[\u4e00-\u9fff]/.test(r[2] || '')) docBad++;
}
ok(docN === 105, '說明頁文案 doc.0~doc.104 共 105 條（實際 ' + docN + '）');
ok(docBad === 0, '每條的英文欄都沒有中文（異常 ' + docBad + '）');

// <b> 數量要對得上（粗體不要翻丟）
(function () {
  rows.forEach(function (l) {
    const c = l.split('|');
    if (c.length !== 6 || c[0].indexOf('doc.') !== 0) return;
    const n0 = (c[1].match(/<b>/g) || []).length;
    [3, 4, 5].forEach(function (k) { if ((c[k].match(/<b>/g) || []).length !== n0) docBold++; });
  });
})();
ok(docBold === 0, '<b> 標籤在譯文中沒有增減（異常 ' + docBold + ' 個）');

// 新增／改寫的 key 六語言都要有值
const NEW_KEYS = ['cmd.hint', 'rpg.sum', 'rpg.leftRow', 'rpg.ptHint', 'rpg.lvhint', 'rpg.lvmax',
  'learn.undone', 'shop.hire', 'shop.hired', 'shop.ticket', 'shop.ticketDesc', 'shop.followerDesc',
  'shop.hold', 'pad.none', 'settings.padHint', 'share.copy', 'onb.title', 'kx.title'];
let missing = [];
NEW_KEYS.forEach(function (k) {
  const r = D[k];
  if (!r) { missing.push(k + '(缺)'); return; }
  for (let i = 0; i < 5; i++) if (!r[i]) { missing.push(k + '(欄' + i + ')'); break; }
});
ok(missing.length === 0, '新增文案六語言齊備（問題：' + (missing.join(',') || '無') + '）');

// ================================================================
console.log('\n=== ② 整塊比對機制 ===');
// ================================================================
ok(/const TRBLOCK_CLS = ' hd hlead/.test(mainJs), 'TRBLOCK_CLS 還在（原本那批說明區塊）');
ok(/TRBLOCK_CLS[\s\S]{0,400}?shname shdesc rpgname rpgdesc hint desc padnone/.test(mainJs),
  'TRBLOCK_CLS 收錄 shname／shdesc／rpgname／hint／desc／padnone');
ok(/TRBLOCK_CLS[\s\S]{0,400}?setCmdHint rpgSum rpgBuyHint/.test(mainJs), 'TRBLOCK_CLS 收錄 setCmdHint／rpgSum');
ok(/const TRSWEEP_SEL = /.test(mainJs) && /\.hint,\.desc,\.shname/.test(mainJs), '有主動掃描用的 TRSWEEP_SEL');
ok(/function trSweepBlocks\(\)[\s\S]{0,400}?trBlockInner\(els\[i\]\)/.test(mainJs),
  'trSweepBlocks() 逐個候選元素做整塊比對');
ok(/function trBlockInner\(el\)/.test(mainJs), 'trBlockInner 還在（整段 innerHTML 當一條字串查字典）');

// 順序：setLang 內先掃整塊、再 applyI18N
(function () {
  const a = mainJs.indexOf('function setLang(');
  const seg = mainJs.slice(a, a + 900);
  const iSweep = seg.indexOf('trSweepBlocks()');
  const iApply = seg.indexOf('applyI18N()');
  ok(iSweep > 0 && iApply > iSweep, 'setLang 先做整塊比對、再逐節點翻譯');
})();

// 順序：observer 內先 trBlockInner(target)、再走 addedNodes
(function () {
  const a = mainJs.indexOf('_i18nObs = new MutationObserver');
  const seg = mainJs.slice(a, a + 1200);
  const iBlk = seg.indexOf('trBlockInner(tg)');
  const iTree = seg.indexOf('trLiveTree(m.addedNodes[j])');
  ok(iBlk > 0, 'MutationObserver 會補做「父節點本身」的整塊比對');
  ok(iTree > iBlk, '而且排在逐節點之前（先翻譯子節點會讓父節點對不上原文）');
})();

// ================================================================
console.log('\n=== ③ 換語言會重畫 ===');
// ================================================================
ok(!/\(function renderCh\(\)/.test(mainJs), 'renderCh 已從 IIFE 改成具名函式（可以重複呼叫）');
ok(/function renderCh\(\)/.test(mainJs) && /renderCh\(\);\n/.test(mainJs), 'renderCh 有被立即呼叫一次');
(function () {
  const a = mainJs.indexOf('function fillUI()');
  const seg = mainJs.slice(a, mainJs.indexOf('try { homeFill();', a) + 40);
  ok(seg.indexOf('renderCh()') > 0, 'fillUI() 會重畫功能總覽');
  ok(seg.indexOf('syncTag()') > 0, 'fillUI() 會重畫新手卡的「未完成／已完成」');
})();
(function () {
  const a = mainJs.indexOf('function refreshI18NUI()');
  const seg = mainJs.slice(a, mainJs.indexOf('\n}', a));
  ok(seg.indexOf('renderKeyRow()') > 0, 'refreshI18NUI() 重鋪按鍵表');
  ok(seg.indexOf('refreshCmdHint()') > 0, 'refreshI18NUI() 重算按鍵摘要');
  ok(seg.indexOf('Shop.render()') > 0, 'refreshI18NUI() 重畫商店（隨從名／介紹／雇用鍵）');
  ok(seg.indexOf('Rpg.renderStats()') > 0, 'refreshI18NUI() 重畫 RPG 配點頁');
  ok(seg.indexOf('trSweepBlocks()') > 0, 'refreshI18NUI() 也會掃一遍整塊比對');
})();
ok(kxSrc.indexOf('document.addEventListener(\'bh:lang\'') > 0, 'keys-ui 收到 bh:lang 會自己重鋪');
ok(/sb\.querySelector\('span:not\(\.ki\)'\)/.test(kxSrc), 'keys-ui 重新貼「經典／現代 WASD」那顆設定鍵');

// ================================================================
console.log('\n=== ④ 提示改走模板 key ===');
// ================================================================
ok(/el\.innerHTML = t\('cmd\.hint', \{/.test(mainJs), '按鍵摘要走 t(\'cmd.hint\')');
ok(/return t\('rpg\.sum', \{/.test(mainJs), 'RPG 能力總結走 t(\'rpg.sum\')');
ok(/t\('rpg\.leftRow', \{ n: left \}\)/.test(mainJs), '剩餘配點走 t(\'rpg.leftRow\')');
ok(/t\('rpg\.ptHint'\)/.test(mainJs), '配點說明走 t(\'rpg.ptHint\')');
ok(/t\('rpg\.lvhint', \{ nx: nx/.test(mainJs), '升級提示走 t(\'rpg.lvhint\')');
ok(rawIndex.indexOf('id="rpgLeft"') > 0, 'index.html 仍有 #rpgLeft（舊測試與程式都靠它）');
ok(rawIndex.indexOf('id="rpgPtHint"') > 0, 'index.html 有 #rpgPtHint（後半句）');
ok(!/剩餘 <b id="rpgLeft"/.test(rawIndex), '不再是「剩餘 <b>N</b> 點」被數字切開的結構');
ok(/t\('learn\.done'\) : t\('learn\.undone'\)/.test(mainJs), '新手卡狀態走字典，不寫死中文');
ok(/t\('shop\.ticket'\)/.test(mainJs) && /t\('shop\.ticketDesc'\)/.test(mainJs), '大逃殺門票卡走字典');
/* v5.64：隨從卡片改版 —— 「已雇用」那顆按鈕換成「等級 ＋ 升級」，
   所以這裡改成驗「現在真的會出現在卡片上的那幾個字」都要走字典。
   （不是放寬：本來就不准在卡片裡硬寫中文。） */
ok(/t\('shop\.hire'\)/.test(mainJs) && /t\('shop\.upgrade'\)/.test(mainJs) &&
   /t\('pet\.lv', \{ n: lv \}\)/.test(mainJs), '隨從「雇用／升級／等級」走字典');
ok(/t\('pad\.none'\)/.test(mainJs), '手把未偵測提示走字典');
ok(/tr\(pl\.name\)/.test(mainJs), '分享平台名稱（複製連結）會翻譯');
ok(!/瀏覽器才會回報。同一支手把只能佔一個位置；\n/.test(rawIndex), '手把提示已收成單行（可整塊比對）');

// ================================================================
console.log('\n=== ⑤ HUD 讓位與縮放提示 ===');
// ================================================================
ok(/--navreserve, ?154px/.test(rawIndex), '橫放 HUD 的右側留白吃 --navreserve');
ok(/max\(50px,[ ]*var\(--navreserve/.test(rawIndex), '直放 HUD 的右側留白吃 --navreserve');
ok(/function syncNavReserve\(\)/.test(mainJs), '有 syncNavReserve() 量測函式');
(function () {
  const a = mainJs.indexOf('function syncNavReserve()');
  const seg = mainJs.slice(a, a + 1600);
  ok(/querySelectorAll\('button, a'\)/.test(seg), '量的是所有按鈕（含 .navright 的兄弟「←」）');
  ok(/setProperty\('--navreserve'/.test(seg), '把量到的值寫進 --navreserve');
})();
(function () {
  const a = mainJs.indexOf('function relayout(');
  const seg = mainJs.slice(a, a + 900);
  ok(/syncNavReserve\(\)/.test(seg), 'relayout() 會重算 HUD 讓位');
})();
ok(/function syncNavReserve[\s\S]{0,3000}?updateNavUI/.test(mainJs) ||
   /updateNavUI[\s\S]{0,900}?syncNavReserve\(\)/.test(mainJs), 'updateNavUI() 也會重算（暱稱／語言變了）');
(function () {
  const m = rawIndex.match(/#zoomHint\s*\{[^}]*z-index:\s*(\d+)/);
  ok(!!m && +m[1] < 9, '縮放提示層級降到 9 以下（' + (m ? m[1] : '?') + '）');
})();
ok(/function ovShow\(\)[\s\S]{0,400}?hideZoomHint\(\)/.test(mainJs), '開覆蓋層會主動收掉縮放提示');
ok(/@media \(max-height: 470px\)/.test(rawIndex), '矮視窗（≤470px）有專門的卡片排版');
ok(/\.ov-box \.mbtn \{ position: sticky/.test(rawIndex.replace(/\s+/g, ' ')), '矮視窗的卡片按鈕 sticky 在底部');

// ================================================================
console.log('\n=== ⑥ 版本戳記 ===');
// ================================================================
ok(parseFloat(P.VERSION) >= 5.54, 'VERSION ≥ 5.54（實際 ' + P.VERSION + '）');
ok(new RegExp("v: '" + P.VERSION.replace(/\./g, '\\.') + "'[^\\n]*now: true").test(vlog),
  'VERSION_LOG[0] 是本版且 now:true');
ok(/v: '5\.53'[\s\S]{0,80}?now: false/.test(vlog) || /now: false[\s\S]{0,900}?v: '5\.53'/.test(vlog),
  '上一版 5.53 已標成 now:false');
ok(rawIndex.indexOf('id="verTxt">' + P.VERSION) > 0, 'index.html 的 verTxt 是本版');
ok(rawIndex.indexOf('id="verLogVer">' + P.VERSION) > 0, 'index.html 的 verLogVer 是本版');
const swVers = ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js'].map(function (p) {
  const s = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const m = s.match(/SW_VERSION = 'v([\d.]+)'/);
  return m ? parseFloat(m[1]) : 0;
});
ok(swVers.every(function (v) { return v >= 5.54; }), '三份 sw.js 都 ≥ 5.54（' + swVers.join(' / ') + '）');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'package.json'), 'utf8'));
ok(parseFloat(pkg.version) >= 5.54, 'package.json ≥ 5.54（' + pkg.version + '）');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.54：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
