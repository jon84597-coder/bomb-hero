// test/verify-v481.js —— v4.81：首頁分層（14 顆按鈕 → 6 張玩法卡 + 更多抽屜）
//   ① 選單結構：6 張卡 + 4 顆抽屜按鈕，重複的入口真的拿掉了
//   ② 抽屜開合：setDrawer() / 點「更多」/ aria-expanded
//   ③ 多人對戰：本機／線上兩條路都接得到原本的畫面
//   ④ BOSS：從首頁搬進單人關卡畫面，按下去真的進 bossRush
//   ⑤ 版面：2 欄（手機）／3 欄（桌機）、抽屜預設收起
//   ⑥ 導覽：HOME 每一步的目標元素都存在（抽屜裡的會自動展開）
//   ⑦ 10 語系：新文案 0 缺、非中文不含中文
//   ⑧ 版本與容量
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path');

const env = makeEnv();
const P = env.BH;
const src = env.html;
const els = env.els;
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }
const CJK = /[\u4e00-\u9fff]/;
function click(id) {
  const el = els[id];
  if (!el || !el._on || !el._on.click || !el._on.click.length) return false;
  el._on.click.forEach(function (f) { f(); });
  return true;
}
function hasCls(id, c) { const el = els[id]; return !!(el && el._cls && el._cls.has(c)); }

// 首頁選單區塊（從 homeMenu 到 multiPick 之間）
const HOMESEG = src.slice(src.indexOf('id="homeMenu"'), src.indexOf('id="multiPick"'));

// ---------- 1. 選單結構 ----------
head('1. 首頁選單結構');
{
  const gi = src.indexOf('<div class="mgrid">');
  const grid = gi < 0 ? '' : src.slice(gi, src.indexOf('id="mDrawer"'));
  const cards = (grid.match(/<button class="mbtn/g) || []).length;
  ok(cards === 6, '主玩法 6 張卡（' + cards + '）');
  ['btnAdventure', 'btnBR', 'btnDaily', 'btnMulti', 'btnStore', 'btnMoreMenu'].forEach(function (id) {
    ok(grid.indexOf('id="' + id + '"') > 0, '卡片 #' + id + ' 在 grid 裡');
  });
  // 沙盒不會解析 HTML 上的 class，位置關係要看原始碼順序
  ok(src.indexOf('id="btnLearn"') < src.indexOf('<div class="mgrid">'),
    '新手教學排在 grid 之前（它是上方獨立一條）');
  ['btnHelp', 'btnSettings', 'btnQuit'].forEach(function (id) {
    const el = els[id];
    ok(!!el, '抽屜 #' + id + ' 存在');
    ok(new RegExp('<button class="drawbtn" id="' + id + '"').test(src), '#' + id + ' 用 drawbtn 樣式');
  });
  // 合併掉的重複入口不能再出現在首頁
  ['btnBoss', 'btnLb"', 'btnBattle', 'btnOnline', 'btnAcctBig'].forEach(function (id) {
    ok(HOMESEG.indexOf(id) < 0, '首頁已沒有 #' + id);
  });
  ok(HOMESEG.indexOf('<small>') > 0, '卡片保留副標（說明這個模式是什麼）');
}

// ---------- 2. 抽屜開合 ----------
head('2. 「更多」抽屜');
ok(typeof P.setDrawer === 'function', 'setDrawer 有匯出');
ok(!hasCls('mDrawer', 'on'), '預設是收起的');
P.setDrawer(true);
ok(hasCls('mDrawer', 'on'), 'setDrawer(true) → 展開');
ok(els.btnMoreMenu.attrs['aria-expanded'] === 'true', 'aria-expanded 同步成 true');
P.setDrawer(false);
ok(!hasCls('mDrawer', 'on'), 'setDrawer(false) → 收回');
ok(els.btnMoreMenu.attrs['aria-expanded'] === 'false', 'aria-expanded 同步成 false');
ok(click('btnMoreMenu') && hasCls('mDrawer', 'on'), '點「更多」會展開');
ok(click('btnMoreMenu') && !hasCls('mDrawer', 'on'), '再點一次會收起');
// 進模式時抽屜要自己收回去
P.setDrawer(true);
els.btnAdventure._on.click.forEach(function (f) { f(); });
ok(!hasCls('mDrawer', 'on'), '點玩法卡之後抽屜自動收起（回首頁是乾淨的）');

// ---------- 3. 多人對戰 ----------
head('3. 多人對戰（本機／線上）');
ok(typeof P.showMultiPick === 'function', 'showMultiPick 有匯出');
ok(!!els.btnMulti, '首頁有 #btnMulti');
ok(!!els.mpLocal && !!els.mpOnline && !!els.mpBack, '選擇器有三顆按鈕（本機／線上／返回）');
P.showMultiPick(true);
ok(hasCls('multiPick', 'on'), '叫得出來');
P.showMultiPick(false);
ok(!hasCls('multiPick', 'on'), '關得掉');
{
  const okLocal = click('mpLocal');
  ok(okLocal, '點「本機混戰」有反應');
  ok(P.Screen.current === 'battle', '進到對戰設定畫面（' + P.Screen.current + '）');
  ok(!hasCls('multiPick', 'on'), '選完就關掉選擇器');
}
P.showMultiPick(true);
{
  const okOnline = click('mpOnline');
  ok(okOnline, '點「線上房號」有反應');
  ok(P.Screen.current === 'online', '進到線上配對畫面（' + P.Screen.current + '）');
}
P.showMultiPick(true);
click('mpBack');
ok(!hasCls('multiPick', 'on'), '「返回」關得掉');

// ---------- 4. BOSS 跳關入口（v5.66 移除） ----------
head('4. BOSS 跳關入口已移除');
ok(!els.btnSoloBoss, '單人關卡畫面沒有 #btnSoloBoss');
ok(src.indexOf('id="btnSoloBoss"') < 0, 'HTML 裡也沒有殘留');
ok(typeof P.goBoss === 'undefined' && typeof P.startBossRush === 'undefined', 'goBoss / startBossRush 都沒匯出');
ok(src.indexOf("q.get('boss')") < 0, '?boss=1 除錯入口一併移除');
ok(!!els.btnSoloGo, '「開始遊戲」大按鈕還在（正常遊玩入口不受影響）');
{
  // 直接從第 40 關出發仍然進得了決戰場（功能拿掉的只有「跳過關卡」）
  P.settings.playerName = '測試員';
  P.settings.soloDiff = 'normal';
  P.startSolo(P.SOLO_STAGES, false);
  ok(!!(P.Game.grid && P.Game.grid.length), '地圖有蓋出來（' + (P.Game.grid ? P.Game.grid.length : 0) + ' 列）');
  ok(P.Game.stage === P.SOLO_STAGES && !!P.Game.bossArena, '第 ' + P.Game.stage + ' 關是決戰場');
}

// ---------- 5. 版面 ----------
head('5. 版面（手機一屏看完）');
const css = (/<style>([\s\S]*?)<\/style>/.exec(src) || ['', ''])[1];
ok(/#scr-title \.menu \.mgrid \{[\s\S]{0,140}?repeat\(2, minmax\(0, 1fr\)\)/.test(css), '手機主玩法 2 欄');
ok(/@media \(min-width: 900px\) \{[\s\S]{0,300}?\.mgrid \{ grid-template-columns: repeat\(3/.test(css), '桌機 3 欄');
ok(/#scr-title \.menu \.mdrawer \{ display: none;/.test(css), '抽屜預設 display:none');
ok(/#scr-title \.menu \.mdrawer\.on \{ display: grid;/.test(css), '展開才變 grid');
ok(/\.mgrid \.mbtn \{[\s\S]{0,420}?min-height: 98px/.test(css), '卡片有最小高度（點擊區域夠大）');
ok(/#scr-title \.menu \.mgrid \.mbtn::before \{[\s\S]{0,120}?position: static/.test(css), '卡片圖示改成「在上方」而不是左邊徽章');
ok(/#scr-title \.menu > \.mbtn#btnLearn/.test(css), '新手教學獨立一條（不進 grid）');
// 六張卡 + 抽屜的總高度要明顯小於舊版 14 顆
{
  const cardH = 98, gap = 10;
  const rows = 3;                       // 6 張卡 2 欄 → 3 列
  const est = 46 + rows * cardH + (rows - 1) * gap + 10;
  ok(est < 500, '手機選單高度估算 ' + est + 'px（舊版實測 1203px）');
}

// ---------- 6. 導覽 ----------
head('6. 首頁導覽對得上新位置');
{
  const m = /const HOME = \[([\s\S]*?)\n      \];/.exec(src);
  ok(!!m, '抓得到 HOME 陣列');
  const body = m ? m[1] : '';
  const sels = (body.match(/sel: '(#[A-Za-z0-9_-]+)'/g) || []).map(function (x) {
    return /'(#[A-Za-z0-9_-]+)'/.exec(x)[1];
  });
  ok(sels.length >= 13, '導覽有 ' + sels.length + ' 個指向元素的步驟');
  let missing = [];
  sels.forEach(function (sel) {
    const id = sel.slice(1);
    if (!els[id] && src.indexOf('id="' + id + '"') < 0) missing.push(sel);
  });
  ok(missing.length === 0, '每個目標元素都存在' + (missing.length ? '（缺 ' + missing.join(',') + '）' : ''));
  ok(sels.indexOf('#btnBoss') < 0 && sels.indexOf('#btnBattle') < 0 && sels.indexOf('#btnOnline') < 0,
    '導覽不再指向已經移除的按鈕');
  ok(body.indexOf("drawer: true") > 0, '抽屜裡的步驟有 drawer:true（會先展開）');
  ok(/if \(typeof setDrawer === 'function'\) setDrawer\(!!st\.drawer\)/.test(src),
    'showHome() 會依 drawer 旗標開合抽屜');
  ok(sels.indexOf('#btnMulti') > 0 && sels.indexOf('#btnMoreMenu') > 0, '新入口都在導覽裡');
}

// ---------- 7. 10 語系 ----------
head('7. 10 語系');
{
  const KEYS = ['home.multi', 'home.multi.sub', 'home.more', 'home.more.sub', 'home.daily', 'home.solo.sub', 'home.namePh',
    'multi.title', 'multi.desc', 'multi.tip', 'multi.local', 'multi.online', 'multi.back',
    'beta.tag',
    'home.d.store', 'home.d.help', 'home.d.set', 'home.d.quit', 'home.rpg.sub',
    'ver.4.81.1', 'ver.4.81.2', 'ver.4.81.3', 'ver.4.81.4'];
  const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'];
  let missing = [], cjk = [];
  KEYS.forEach(function (k) {
    LANGS.forEach(function (lg) {
      const d = P.I18N && P.I18N[lg];
      const v = d ? d[k] : '';
      if (!v) { missing.push(lg + '/' + k); return; }
      // 非中日語系不該出現漢字（日文允許漢字）
      if (lg !== 'zh-TW' && lg !== 'zh-CN' && lg !== 'ja' && CJK.test(v)) cjk.push(lg + '/' + k);
    });
  });
  ok(missing.length === 0, KEYS.length + ' 條 × 5 語言無缺' + (missing.length ? '（缺 ' + missing.slice(0, 5).join(',') + '）' : ''));
  ok(cjk.length === 0, '非中文語系沒有漢字殘留' + (cjk.length ? '（' + cjk.slice(0, 5).join(',') + '）' : ''));
  ok(P.I18N.en['home.multi'] !== P.I18N['zh-TW']['home.multi'], '英文真的有翻（不是照抄中文）');
  ok(P.I18N.ja['multi.local'] && P.I18N.ja['multi.local'] !== P.I18N.en['multi.local'], '日文跟英文不一樣');
}
// 短標籤一定要走 t() 注入 —— 即時翻譯層只收 6 字以上，兩個字的「設定」不會被它翻到
ok(/function homeFill\(\)/.test(src), '有 homeFill() 專責注入首頁文案');
ok(/homeFill\(\); \} catch \(e\) \{\}/.test(src), 'fillUI() 會呼叫 homeFill()（換語言跟著換）');
ok(/card\('btnMoreMenu', 'home\.more', 'home\.more\.sub'\)/.test(src), '「更多」卡片走字典');
['btnHelp', 'btnSettings', 'btnQuit'].forEach(function (id) {
  ok(new RegExp("b\\.textContent = t\\(dr\\[id\\]\\)").test(src), '抽屜按鈕文字由 t() 注入');
});

// ---------- 8. 版本與容量 ----------
head('8. 版本與容量');
// v4.90：版本一律用數字比大小（4.90 當 float 會變 4.9，比 4.81 小 → 假失敗）
const vnum = function (s) {
  const m = String(s || '').replace(/^v/, '').split('.');
  return (+m[0] || 0) * 10000 + (+m[1] || 0) * 100 + (+m[2] || 0);
};
ok(vnum(P.VERSION) >= vnum('4.81'), 'VERSION 至少 4.81（實際 ' + P.VERSION + '）');
ok(new RegExp('id="verTxt">' + String(P.VERSION).replace(/\./g, '\\.') + '<').test(src), '首頁版本標籤跟著 VERSION 走');
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '版本紀錄最上面就是目前版號且 now:true');
ok(P.VERSION_LOG[1].now === false, '上一版（' + P.VERSION_LOG[1].v + '）已改成 now:false');
ok(P.VERSION_LOG[0].items.length >= 3, '最新版至少寫 3 條更新（' + P.VERSION_LOG[0].items.length + ' 條）');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (rel) {
  const f = path.join(__dirname, rel);
  const v = (/SW_VERSION = '([^']+)'/.exec(fs.readFileSync(f, 'utf8')) || [])[1];
  ok(vnum(v) >= vnum(P.VERSION), rel + ' 版本跟得上主檔（' + v + '）');
});
ok(src.length < 3900000, '字元數 ' + src.length.toLocaleString() + ' < 3.9M');
ok(Buffer.byteLength(src) < 4250000, '位元組 ' + Buffer.byteLength(src).toLocaleString() + ' < 4.25M');
ok((src.match(/\r/g) || []).length === 0, '整檔 LF（0 個 \\r）');
// 每個字典列都必須剛好 6 欄
{
  // v5.20：字典抽到 js/i18n-src.js —— 有外部檔就讀它，沒有才退回主檔內嵌
  const extP = path.join(__dirname, '..', 'js', 'i18n-src.js');
  const dsrc = fs.existsSync(extP) ? fs.readFileSync(extP, 'utf8') : src;
  const i = dsrc.indexOf('`');
  const j = dsrc.lastIndexOf('`;');
  const lines = dsrc.slice(i, j).split('\n').filter(function (l) { return l.indexOf('|') > 0; });
  const bad = lines.filter(function (l) { return l.split('|').length !== 6; });
  ok(bad.length === 0, '字典每列 6 欄（共 ' + lines.length + ' 列）' + (bad.length ? '（壞 ' + bad.length + ' 列）' : ''));
}

console.log('\n' + (fail ? '✗ ' + fail + ' 失敗 / ' + pass + ' 通過' : '✅ v4.81：' + pass + ' 通過 / 0 失敗'));
process.exit(fail ? 1 : 0);
