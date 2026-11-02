// 無頭測試 v33：v2.7 多語言（10 語）
//   1. 工具列有語言切換圖示（在音樂開關旁邊）＋ 10 種語言選單
//   2. 所有語言都有完整字典（缺字比例 0）
//   3. 靜態介面會被翻譯、動態介面（JS 產生）也跟著翻
//   4. 遊戲內對話框台詞（死亡／擊殺）跟著語言變
//   5. 關卡名／道具名／角色名跟著語言變
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

console.log('\n=== 0. 版本 ===');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '徽章版本號同步 ' + P.VERSION);

console.log('\n=== 1. 語言列表（10 種） ===');
const ids = P.LANGS.map(function (l) { return l.id; });
ok(P.LANGS.length === 10, '一共 10 種語言（實測 ' + P.LANGS.length + '）');
['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it'].forEach(function (id) {
  ok(ids.indexOf(id) >= 0, '有 ' + id);
});
ok(P.LANGS[0].id === 'zh-TW', '預設語言是繁體中文');

console.log('\n=== 2. 字典完整性（每個語言都要有全部 key） ===');
const base = P.I18N['zh-TW'];
const keys = Object.keys(base);
ok(keys.length > 180, '字典 key 數量 ' + keys.length + '（>180）');
let worst = { id: '', miss: 0 };
P.LANGS.forEach(function (L) {
  const d = P.I18N[L.id];
  let miss = 0;
  keys.forEach(function (k) { if (!d || typeof d[k] !== 'string' || !d[k]) miss++; });
  if (miss > worst.miss) worst = { id: L.id, miss: miss };
  ok(miss === 0, L.id + ' 完整（缺 ' + miss + ' 條）');
});
ok(worst.miss === 0, '沒有任何語言缺字');

console.log('\n=== 3. 工具列語言鈕 ===');
ok(/id="btnLang"/.test(html), '有 #btnLang 語言按鈕');
ok(/id="langMenu"/.test(html) && /id="langList"/.test(html), '有語言選單容器 #langMenu / #langList');
const iMusic = html.indexOf('id="btnMusic"');
const iLang = html.indexOf('id="btnLang"');
ok(iMusic > 0 && iLang > iMusic && (iLang - iMusic) < 260,
   '語言鈕就在音樂開關旁邊（相距 ' + (iLang - iMusic) + ' 字元）');
ok(/#navBar \.navright \{ display: flex; gap: 7px; position: relative; \}/.test(html),
   'navright 設成 relative（選單才能定位在按鈕下方）');
ok(/#langMenu \.lmbtn\.on/.test(html), '選單有「目前語言」高亮樣式');
ok(/@media \(max-width: 520px\) \{ #btnLang b \{ display: none; \}/.test(html),
   '窄螢幕只留 🌐 圖示（不擠爆工具列）');

console.log('\n=== 4. t() / tr() 行為 ===');
P.setLang('zh-TW', true);
ok(P.t('menu.solo') === '單人闖關', '繁中：menu.solo = 單人闖關');
P.setLang('en', true);
ok(P.t('menu.solo') === 'Solo Quest', '英文：menu.solo = Solo Quest');
ok(P.t('solo.stage', { n: 3, name: 'Lava Cavern' }) === 'Stage 3 · Lava Cavern',
   '插值：solo.stage {n}/{name} → ' + P.t('solo.stage', { n: 3, name: 'Lava Cavern' }));
ok(P.tr('單人闖關') === 'Solo Quest', 'tr() 能把「中文原文」翻成現在的語言');
P.setLang('ja', true);
ok(P.t('menu.solo') === '一人で挑戦', '日文：menu.solo = 一人で挑戦');
P.setLang('zh-TW', true);
ok(P.tr('單人闖關') === '單人闖關', '繁中模式 tr() 原樣回傳');

console.log('\n=== 5. 靜態 HTML 文案的翻譯覆蓋率 ===');
const sbx = env.sandbox, doc = sbx.document;
const navBtn = doc.getElementById('btnLang');
ok(!!navBtn, '沙盒裡找得到 #btnLang');
// 沙盒是假 DOM（沒有 createTreeWalker）→ applyI18N 要自動跳過而不是噴錯
let domErr = null;
try { P.applyI18N(); } catch (e) { domErr = e; }
ok(!domErr, '假 DOM 環境下 applyI18N() 不噴錯（真瀏覽器才會真的翻譯）' + (domErr ? '：' + domErr.message : ''));
// 把靜態 HTML 裡看得到的文字抓出來，檢查有沒有進字典
(function () {
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const found = [];
  (body.match(/>([^<>]{1,160})</g) || []).forEach(function (m) {
    const t = m.slice(1, -1).trim();
    if (!t) return;
    if (!/[一-鿿]/.test(t)) return;      // 只看中文文案
    if (found.indexOf(t) < 0) found.push(t);
  });
  const vals = keys.map(function (k) { return base[k]; });
  let covered = 0; const miss = [];
  found.forEach(function (t) { if (vals.indexOf(t) >= 0) covered++; else miss.push(t); });
  const pct = Math.round(covered / found.length * 100);
  ok(pct >= 85, '靜態中文文案進字典的比例 ' + pct + '%（' + covered + '/' + found.length + '）');
  if (miss.length) console.log('    （未進字典，多半是純圖示／數字：' + miss.slice(0, 8).join(' / ') + '）');
})();

console.log('\n=== 6. 遊戲內台詞（死亡／擊殺）跟著語言 ===');
P.setLang('en', true);
let deadSaid = null;
(function () {
  P.startSolo ? P.startSolo(1, false) : null;
  G.state = 'play';
  const p = G.players[0];
  G.bubbles.length = 0;
  P.bubbleDead(p);
  deadSaid = G.bubbles.length ? G.bubbles[0].text : null;
})();
ok(deadSaid && /[A-Za-z]/.test(deadSaid) && !/[一-鿿]/.test(deadSaid),
   '死亡台詞變成英文（v3.8 新台詞）：' + JSON.stringify(deadSaid));
let killSaid = null;
(function () {
  G.bubbles.length = 0;
  P.bubbleKill(G.players[0]);
  killSaid = G.bubbles.length ? G.bubbles[0].text : null;
})();
ok(killSaid && /[A-Za-z]/.test(killSaid) && !/[一-鿿]/.test(killSaid),
   '擊殺台詞變成英文（v3.8 新台詞）：' + JSON.stringify(killSaid));
P.setLang('zh-TW', true);
(function () {
  G.bubbles.length = 0;
  P.bubbleDead(G.players[0]);
  deadSaid = G.bubbles.length ? G.bubbles[0].text : null;
})();
ok(deadSaid && /[一-鿿]/.test(deadSaid), '切回繁中台詞是中文：' + JSON.stringify(deadSaid));

console.log('\n=== 7. 名稱類（關卡／道具／角色） ===');
P.setLang('en', true);
ok(P.themeName(0) === 'Green Plains', '關卡 1 → ' + P.themeName(0));
ok(P.themeName(7) === 'Dark Demon Castle', '關卡 8 → ' + P.themeName(7));
ok(P.itemName('fire') === 'Fire', '道具 fire → ' + P.itemName('fire'));
ok(P.itemHint('heart') === 'Life +1', '道具 heart 說明 → ' + P.itemHint('heart'));
const ch0 = P.CHARACTERS ? P.CHARACTERS[0] : null;
if (ch0) {
  ok(P.charName(ch0) === 'BIBI the Rabbit', '角色 1 → ' + P.charName(ch0));
  ok(P.charTag(ch0) === 'the gorgeous', '角色 1 形容 → ' + P.charTag(ch0));
}
P.setLang('ko', true);
ok(P.themeName(7) === '암흑 마왕성', '韓文關卡 8 → ' + P.themeName(7));
P.setLang('th', true);
ok(P.itemName('bomb') === 'ระเบิด', '泰文道具 bomb → ' + P.itemName('bomb'));
P.setLang('zh-TW', true);
ok(P.themeName(0) === '綠野草原', '切回繁中關卡 1 → ' + P.themeName(0));

console.log('\n=== 8. 提示／浮層也翻譯（banner / toast / overlay） ===');
P.setLang('vi', true);
(function () {
  P.startSolo ? P.startSolo(1, false) : null;
  G.state = 'play';
  const box = doc.getElementById('ovBox');
  P.showOverlay({ title: '單人闖關', sub: '設定', btn: '繼續' });
  const h3 = box.querySelector ? box.querySelector('h3') : null;
  ok(h3 && h3.textContent === 'Chơi đơn', '浮層標題翻成越文：' + (h3 && h3.textContent));
})();
(function () {
  P.toast('單人闖關');
  const el = doc.getElementById('toast');
  ok(el && el.textContent === 'Chơi đơn', 'toast 自動翻譯：' + (el && el.textContent));
  P.banner('設定');
  const bn = doc.getElementById('bannerTxt');
  ok(bn && bn.textContent === 'Cài đặt', 'banner 自動翻譯：' + (bn && bn.textContent));
})();
P.setLang('zh-TW', true);

console.log('\n=== 9. 語言會被記住（localStorage） ===');
P.setLang('de', true);
let saved = null;
try { saved = sbx.localStorage.getItem('bombhero-lang'); } catch (e) {}
ok(saved === 'de', '切到德文後存進 localStorage：' + saved);
ok(P.langLabel('de').indexOf('Deutsch') >= 0, 'langLabel(de) = ' + P.langLabel('de'));
P.setLang('zh-TW', true);
ok(P.t('nav.music') === '音樂', '還原成繁中');

console.log('\n=== 10. 沒翻到的字串要安全退回繁中（不噴錯） ===');
P.setLang('it', true);
ok(P.t('this.key.does.not.exist') === 'this.key.does.not.exist', '未知 key 回傳 key 本身（不 undefined）');
ok(typeof P.t('menu.solo') === 'string' && P.t('menu.solo').length > 0, '已知 key 有值');
P.setLang('zh-TW', true);

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
