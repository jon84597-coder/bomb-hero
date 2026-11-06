// 無頭測試 v523：三個面板（成就／排名／線上玩家）的分類頁籤改成「全部攤開」
// 重點不是「有沒有 grid 這個字」，而是：
//   ① 頁籤真的在內文上方、而且沒有任何全域樣式把它擠到面板底部（order）
//   ② 每一格都夠大、全部看得見，不需要左右拖
//   ③ 後台的深色頁籤樣式不再外漏到玩家的面板
const fs = require('fs');
const path = require('path');
const { makeEnv, rawHtml } = require('./_sandbox');

const env0 = makeEnv();
const P = env0.BH;
const html = rawHtml;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t2) { console.log('\n=== ' + t2 + ' ==='); }

/* 把 CSS 註解剝掉再比對（注意字串裡的 /* 會把後面整段吃掉 → 用前置否定） */
const css = (function () {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  return (m ? m[1] : '').replace(/(?<![\w\/])\/\*[\s\S]*?\*\//g, '');
})();

/* ================================================================ ⓪ */
head('⓪ 版本');
const VN = P.VERSION.split('.').map(Number);
ok(VN[0] === 5 && VN[1] >= 23, '版本是 5.23 以上（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '首頁徽章與 VERSION 同步');
ok(html.indexOf('id="verLogVer">' + P.VERSION) > 0, '版本紀錄標題與 VERSION 同步');
ok(P.VERSION_LOG[0].now === true, '版本紀錄最上面是 now:true');
const v22 = P.VERSION_LOG.filter(function (x) { return x.v === '5.22'; })[0];
ok(!!v22 && v22.now === false, '5.22 已經轉成舊版');
ok(P.VERSION_LOG[0].items.length >= 4, '5.23 至少 4 條更新（' + P.VERSION_LOG[0].items.length + ' 條）');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (rel) {
  const v = (/SW_VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, rel), 'utf8')) || [])[1] || '';
  ok(Number(v.replace(/^v/, '').split('.')[1]) >= 23, rel + ' SW_VERSION = ' + v);
});
{
  const pk = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
  ok(Number(pk.version.split('.')[1]) >= 23, 'package.json = ' + pk.version);
}
ok(html.length < 1950000, '主檔 ' + html.length + ' 字元（預算 1,950,000）');
ok((html.match(/\r/g) || []).length === 0, '整檔 LF（0 個 \\r）');

/* ================================================================ ① */
head('① 分類頁籤是全展開網格（不再是一條橫向拖曳列）');
{
  const gridRule = (css.match(/\.bhtabs\.grid\s*\{[^}]*\}/) || [''])[0];
  ok(gridRule.length > 0, '.bhtabs.grid 有樣式');
  ok(/display:\s*grid/.test(gridRule), '用 grid 排版');
  ok(/grid-template-columns:\s*repeat\(auto-fill/.test(gridRule), '自動填滿欄位（auto-fill）');
  ok(/overflow:\s*visible/.test(gridRule), '不再自己變成橫向捲動容器');
  ok(!/overflow-x:\s*auto/.test(gridRule), '沒有 overflow-x: auto');

  const chipRule = (css.match(/\.bhtabs\.grid\s+\.bhtab\s*\{[^}]*\}/) || [''])[0];
  ok(chipRule.length > 0, '.bhtabs.grid .bhtab 有樣式');
  ok(/display:\s*flex/.test(chipRule), '每格用 flex 讓圖示與文字置中對齊');
  const mh = Number((/min-height:\s*(\d+)px/.exec(chipRule) || [])[1] || 0);
  ok(mh >= 40, '每格至少 40px 高（實測 ' + mh + 'px）');
  ok(/font-size:\s*1[12](\.5)?px/.test(chipRule), '字級 11.5~12.5px（看得清楚又不換行）');

  const onRule = (css.match(/\.bhtabs\.grid\s+\.bhtab\.on\s*\{[^}]*\}/) || [''])[0];
  ok(/inset 0 1px 0/.test(onRule), '選中那格有上緣高光');
  ok(/0 2px 0 #b9741c/.test(onRule), '選中那格有金色立體底邊');

  ok(/@media \(max-width: 380px\)[\s\S]{0,240}\.bhtabs\.grid\s+\.bhtab/.test(css), '窄螢幕（≤380px）會縮字，不會擠爆');
  ok(/@media \(min-width: 620px\)[\s\S]{0,240}minmax\(104px/.test(css), '大螢幕（≥620px）格子放寬');
}

/* ================================================================ ② */
head('② 頁籤一定在內文上方（沒有任何全域 order 把它推到面板底部）');
{
  // 舊版是後台的 `@media (max-width:880px) { .bhtabs { order: 4 } }` 漏出來
  ok(!/\n\.bhtabs\s*\{[^}]*order\s*:/.test(css), '全域 .bhtabs 規則裡沒有 order');
  ok(!/\.bhtabs\s*\{[^}]*order\s*:/.test(css.replace(/#bhModal\s+\.bhtabs/g, '')), '非 #bhModal 的 .bhtabs 都不設 order');
  const orderHits = (css.match(/order:\s*4/g) || []).length;
  const scopedHits = (css.match(/#bhModal\s+\.bhtabs\s*\{[^}]*order:\s*4/g) || []).length;
  ok(orderHits === scopedHits, 'order:4 只出現在 #bhModal 底下的規則（' + scopedHits + '/' + orderHits + '）');

  ['ach', 'rk', 'on'].forEach(function (k) {
    const tb = html.indexOf('id="' + k + 'Tabs"');
    const bd = html.indexOf('id="' + k + 'Body"');
    ok(tb > 0 && bd > tb, k + '：頁籤在內文之前（' + tb + ' < ' + bd + '）');
  });
  ok(html.indexOf('class="bhtabs grid" id="achTabs"') > 0, '#achTabs 掛上 grid');
  ok(html.indexOf('class="bhtabs grid" id="rkTabs"') > 0, '#rkTabs 掛上 grid');
  ok(html.indexOf('class="bhtabs grid" id="onTabs"') > 0, '#onTabs 掛上 grid');
  ok(/role="tablist"/.test(html), '容器有 role="tablist"');
}

/* ================================================================ ③ */
head('③ 後台樣式不外漏，其他面板頁籤不再是無樣式的裸按鈕');
{
  ok(/#bhModal \.bhtabs\s*\{[^}]*background:\s*#141b27/.test(css), '後台深色頁籤限定 #bhModal');
  ok(/#bhModal \.bhtabs button\s*\{/.test(css), '後台按鈕樣式限定 #bhModal');
  ok(!/(?<!#bhModal )\.bhtabs button\s*\{[^}]*#8ea3c6/.test(css), '不會再有全域 .bhtabs button');
  const plainRule = (css.match(/\.bhtabs\s*>\s*button\s*\{[^}]*\}/) || [''])[0];
  ok(plainRule.length > 0, '雜貨商人／招式師那兩顆裸按鈕有自己的樣式');
  ok(/border-radius:\s*999px/.test(plainRule), '裸按鈕是膠囊形');
  ok(/font-family:\s*inherit/.test(plainRule), '裸按鈕會繼承字體（不會跳回瀏覽器預設）');
}

/* ================================================================ ④ */
head('④ 面板標題列與內文之間的分隔');
{
  ok(/\.bhtabs\.grid\s*\{[^}]*border-bottom:\s*2px solid #ecd0a6/.test(css), '頁籤列下方有分隔線');
  ok(/\.bhtabs\.grid\s*\{[^}]*background:\s*linear-gradient/.test(css), '頁籤列有底色（與內文分層）');
}

/* ================================================================ ⑤ */
head('⑤ 成就頁籤：9 個分類、選中只有一個、可以切換');
{
  const e = makeEnv();
  const B = e.BH;
  if (!((e.getId('btnAch')._on && e.getId('btnAch')._on.click) || []).length) B.AchUI.init();
  B.AchUI.open();
  const h = String(e.getId('achTabs').innerHTML || '');
  ok((h.match(/data-acht=/g) || []).length === B.Ach.CATS.length, '渲染 ' + B.Ach.CATS.length + ' 個分類（實測 ' + (h.match(/data-acht=/g) || []).length + '）');
  ok((h.match(/role="tab"/g) || []).length === B.Ach.CATS.length, '每個都是 role="tab"');
  ok((h.match(/aria-selected="true"/g) || []).length === 1, '只有一個 aria-selected="true"');
  ok(h.indexOf('class="bhtab on"') > 0, '選中的那格有 .on');
  ok(h.indexOf('<i class="bi">') > 0, '圖示獨立成 <i class="bi">（網格間距才一致）');
  ok(h.indexOf('🏆') > 0 && h.indexOf('稱號') > 0, '第一個是「全部」、最後是「稱號」');

  const clickTab = function (key) {
    (e.getId('achTabs')._on.click || []).forEach(function (f) {
      f({ target: { closest: function () { return { getAttribute: function () { return key; } }; } } });
    });
  };
  clickTab('rpg');
  const h2 = String(e.getId('achTabs').innerHTML || '');
  ok(/class="bhtab on" data-acht="rpg"/.test(h2), '點「RPG」後那一格變成選中');
  ok((h2.match(/aria-selected="true"/g) || []).length === 1, '切換後仍然只有一個選中');
  ok(String(e.getId('achBody').innerHTML || '').indexOf('RPG') > 0, '內文跟著換成 RPG 系列');
}

/* ================================================================ ⑥ */
head('⑥ 排名頁籤：10 個榜');
{
  const e = makeEnv();
  const B = e.BH;
  try { B.RankUI.init(); } catch (er) {}
  B.RankUI.open();
  const h = String(e.getId('rkTabs').innerHTML || '');
  ok((h.match(/data-rkcat=/g) || []).length === B.Rank.CATS.length, '渲染 ' + B.Rank.CATS.length + ' 個榜（實測 ' + (h.match(/data-rkcat=/g) || []).length + '）');
  ok((h.match(/role="tab"/g) || []).length === B.Rank.CATS.length, '每個都是 role="tab"');
  ok((h.match(/aria-selected="true"/g) || []).length === 1, '只有一個選中');
  ok(h.indexOf('單人殺怪') > 0 && h.indexOf('線上冠軍') > 0, '第一個與最後一個榜都在同一份清單裡');
}

/* ================================================================ ⑦ */
head('⑦ 線上玩家頁籤：4 個');
{
  const e = makeEnv();
  const B = e.BH;
  try { B.Social.init(); } catch (er) {}
  B.Social.open();
  const h = String(e.getId('onTabs').innerHTML || '');
  ok((h.match(/data-ontab=/g) || []).length === 4, '4 個分頁（實測 ' + (h.match(/data-ontab=/g) || []).length + '）');
  ok((h.match(/role="tab"/g) || []).length === 4, '每個都是 role="tab"');
  ok(h.indexOf('黑名單') > 0 && h.indexOf('我的資料') > 0, '分類文字正確');
  ok(h.indexOf('🟢') > 0 && h.indexOf('<i class="bi">') > 0, '圖示也拆出來了');
  ok((h.match(/aria-selected="true"/g) || []).length === 1, '只有一個選中');
}

/* ================================================================ ⑧ */
head('⑧ 標籤文字都不長到會擠爆格子');
{
  // 手機 430px：面板 406 - 左右各 10 padding - 3 個 6px 間距 = 368 / 4 欄 ≈ 92px
  // 一格內可用的文字寬度 ≈ 92 - 10(padding) - 4(border) = 78px
  const W = 78;
  const est = function (s) {
    // CJK 以字級 12px 計、ASCII 以 6.6px 計、emoji 以 13px 計
    let w = 0;
    for (const ch of s.replace(/\uFE0F/g, '')) {
      const c = ch.codePointAt(0);
      if (c < 0x2000) w += 6.6;
      else if (c >= 0x1F000) w += 13;
      else w += 12;
    }
    return w;
  };
  const bad = [];
  P.Ach.CATS.forEach(function (c) { if (est(c.lab) > W) bad.push(c.lab); });
  P.Rank.CATS.forEach(function (c) { if (est(c.lab) > W) bad.push(c.lab); });
  ['線上', '好友 (99)', '黑名單', '我的資料'].forEach(function (s) { if (est(s) > W) bad.push(s); });
  ok(bad.length === 0, '所有分類標籤在 92px 格子裡放得下' + (bad.length ? '（超出：' + bad.join('、') + '）' : ''));
}

console.log('\n' + (fail ? '✗' : '✅') + ' v5.23：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
