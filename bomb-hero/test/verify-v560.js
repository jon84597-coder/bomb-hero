// test/verify-v560.js —— v5.60：解鎖門檻降到 3／6／9 ＋ 自訂顏色（色票／取色盤）
//   ① 門檻：3／6／9，而且沒有殘留 5／10／15
//   ② 色票：51 格（15 色相 × 3 明度 ＋ 6 階灰），全是合法的 #rrggbb
//   ③ 爆風五段色停：自己挑的顏色要變成「白熱核心 → 主色 → 暗邊透明」
//   ④ 真的套用：applyCustom 之後 __BHSKIN.cache 立刻換掉（主檔零改動就吃得到）
//   ⑤ 存檔：選過的顏色記得住；壞掉的色碼不會讓面板整片壞掉
//   ⑥ 面板：節點、事件、文案都在（重畫後還能用）
//   ⑦ i18n：7 條 × 5 語言
//   ⑧ 版本
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const unlockSrc = fs.readFileSync(path.join(ROOT, 'js/unlock.js'), 'utf8');
const skinsSrc = fs.readFileSync(path.join(ROOT, 'js/skins.js'), 'utf8');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const i18nSrc = fs.readFileSync(path.join(ROOT, 'js/i18n-src.js'), 'utf8');
const vlogSrc = fs.readFileSync(path.join(ROOT, 'js/version-log.js'), 'utf8');
const htmlSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(n) { console.log('\n=== ' + n + ' ==='); }

/* ============================================================
   ① 門檻 3／6／9
   ============================================================ */
sec('① 測試期門檻 3／6／9');
ok(/need: 3,/.test(unlockSrc), 'RPG 第 3 關解鎖');
ok(/need: 6,/.test(unlockSrc), '大逃殺第 6 關解鎖');
ok(/need: 9,/.test(unlockSrc), '多人對戰第 9 關解鎖');
ok(!/need: 5,/.test(unlockSrc) && !/need: 10,/.test(unlockSrc) && !/need: 15,/.test(unlockSrc),
  '沒有殘留舊門檻 5／10／15');
ok(/cleared\(\) >= \(last \? last\.need : 9\)/.test(unlockSrc),
  '老玩家判定跟著最後一階浮動（不是寫死 15）');
ok(/v5\.60/.test(unlockSrc), '檔案裡有 v5.60 註記（說明為什麼壓低）');

/* ============================================================
   ②～⑥ 真的 require 起來跑 skins.js
   ============================================================ */
function stubEl() {
  const el = {
    style: {}, id: '', className: '', textContent: '', innerHTML: '', value: '',
    children: [], dataset: {},
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    appendChild(c) { el.children.push(c); return c; }, removeChild() {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, focus() {}, click() {}
  };
  return el;
}

function withSkins(store, fn) {
  const saved = { win: global.window, doc: global.document, ls: global.localStorage };
  global.localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; }
  };
  global.document = {
    getElementById() { return null; },
    createElement() { return stubEl(); },
    head: stubEl(), body: stubEl(),
    addEventListener() {}, documentElement: stubEl()
  };
  global.window = { document: global.document, localStorage: global.localStorage, __BH: {} };
  const file = require.resolve(path.join(ROOT, 'js/skins.js'));
  delete require.cache[file];
  try {
    return fn(require(path.join(ROOT, 'js/skins.js')));
  } finally {
    delete require.cache[file];
    global.window = saved.win; global.document = saved.doc; global.localStorage = saved.ls;
  }
}

const STORE = {};
const R = withSkins(STORE, function (S) {
  const out = {};
  try {
    out.hasApi = !!(S && typeof S.applyCustom === 'function' && typeof S.swatches === 'function');
    const sw = S.swatches();
    out.n = sw.length;
    out.bad = sw.filter(function (h) { return !/^#[0-9a-f]{6}$/.test(h); }).length;
    out.uniq = Object.keys(sw.reduce(function (m, h) { m[h] = 1; return m; }, {})).length;
    /* 真的要「豐富」：紅／綠／藍三系都要在裡面，不能整排同色系 */
    const rgb = function (h) {
      return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    };
    out.redish = sw.filter(function (h) { var c = rgb(h); return c[0] > 150 && c[0] > c[1] + 40 && c[0] > c[2] + 40; }).length;
    out.greenish = sw.filter(function (h) { var c = rgb(h); return c[1] > 150 && c[1] > c[0] + 40 && c[1] > c[2] + 40; }).length;
    out.bluish = sw.filter(function (h) { var c = rgb(h); return c[2] > 150 && c[2] > c[0] + 40 && c[2] > c[1] + 40; }).length;

    /* ③ 爆風五段 */
    const pal = S.flamePal('#ff0000');
    out.palLen = pal.length;
    out.pal0 = pal[0];
    out.pal3 = pal[3];
    out.pal4 = pal[4];
    out.palA = pal.slice(0, 4).every(function (s) { return s.indexOf(',A)') > 0; });

    /* ④ 套用 → 主檔讀的快取 */
    S.applyCustom('flame', '#00ff88');
    out.eqFlame = S.state().eq.flame;
    out.flameIsArr = !!(S.color('flame') && S.color('flame').length === 5);
    out.flameMid = S.color('flame') ? S.color('flame')[3] : '';
    S.applyCustom('aura', '#123456');
    S.applyCustom('bomb', '#abcdef');
    out.aura = S.color('aura');
    out.bomb = S.color('bomb');
    out.bombStops = (function () {
      const c = global.window.__BHSKIN && global.window.__BHSKIN.cache;
      return c && c.bombStops ? c.bombStops.length : 0;
    })();
    /* 大寫也要收（玩家從系統取色盤回來常常是大寫） */
    S.applyCustom('aura', '#AABBCC');
    out.upper = S.color('aura');
    /* 亂傳的要被擋掉，不能把 cache 弄成垃圾 */
    S.applyCustom('aura', 'javascript:alert(1)');
    S.applyCustom('aura', '#12');
    out.badKeep = S.color('aura');
    /* ⑥ 面板節點（render 會因為 getElementById 回 null 而提早結束，這裡只看原始碼） */
    /* localStorage 存的是字串（JSON.stringify 會把引號轉義），要解析後再看 */
    var raw = STORE['bombhero-skins-v1'] || '';
    var obj = {};
    try { obj = JSON.parse(raw); } catch (e2) { obj = {}; }
    out.storeHasCustom = !!(obj.custom && obj.custom.flame === '#00ff88' && obj.eq && obj.eq.flame === 'custom');
    out.storeRaw = raw.slice(0, 40);
  } catch (e) {
    out.err = String(e && e.message);
  }
  return out;
});

sec('② 色票');
ok(R.hasApi === true, 'Skins 導出 applyCustom／swatches（面板與測試共用同一條路）');
ok(!R.err, 'require 起來沒有丟錯' + (R.err ? '（' + R.err + '）' : ''));
ok(R.n === 51, '色票 51 格（實際 ' + R.n + '）');
ok(R.bad === 0, '每一格都是合法的 #rrggbb（壞的 ' + R.bad + ' 格）');
ok(R.uniq >= 48, '幾乎沒有重複（' + R.uniq + ' 種顏色）');
ok(R.redish >= 3 && R.greenish >= 3 && R.bluish >= 3,
  '紅／綠／藍三系都有（' + R.redish + '／' + R.greenish + '／' + R.bluish + '），不是整排同色系');

sec('③ 爆風五段色停');
ok(R.palLen === 5, '剛好 5 段（主檔 drawFlame 只認長度 5）');
ok(R.pal0 === 'rgba(255,255,255,A)', '第 1 段是白熱核心');
ok(/^rgba\(255,0,0,/.test(R.pal3 || ''), '第 4 段就是玩家挑的主色（實際 ' + R.pal3 + '）');
ok(/^rgba\(\d+,\d+,\d+,0\)$/.test(R.pal4 || ''), '第 5 段是 alpha 0 的暗邊（不會留硬邊）');
ok(R.palA === true, '前 4 段都留 A 佔位符（主檔每幀代換 alpha）');

sec('④ 套用後主檔立刻吃得到');
ok(R.eqFlame === 'custom', 'eq 記成 custom');
ok(R.flameIsArr === true, 'CACHE.flame 變成 5 段（主檔 skinFlamePal 直接可用）');
ok(/^rgba\(0,255,136,/.test(R.flameMid || ''), '中間段是剛選的 #00ff88（實際 ' + R.flameMid + '）');
ok(R.aura === '#123456', '光環顏色套用成功（' + R.aura + '）');
ok(R.bomb === '#abcdef', '炸彈顏色套用成功（' + R.bomb + '）');
ok(R.bombStops === 4, '炸彈四段漸層跟著重算（' + R.bombStops + ' 段）');
ok(R.upper === '#aabbcc', '大寫色碼會正規化成小寫');
ok(R.badKeep === '#aabbcc', '亂傳的字串被擋掉、不會污染快取（' + R.badKeep + '）');

sec('⑤ 存檔');
ok(R.storeHasCustom === true, '自訂色碼有寫進本機存檔（' + R.storeRaw + '…）');
ok(/custom/.test(skinsSrc) && /custom\[slot\]/.test(skinsSrc), 'load 會把 custom 讀回來');
ok(/if \(String\(o\.eq\[s\]\) === 'custom'\)/.test(skinsSrc), "eq 是 'custom' 時不會被當成「沒擁有這項外觀」而重置");
ok(/if \(!ST\.custom\[sk\]\) ST\.eq\[sk\] = defaultOf\(sk\)/.test(skinsSrc),
  '色碼不見了才退回預設（不是一讀檔就清掉）');
ok(/_hexOk/.test(skinsSrc), '讀檔時驗色碼形狀（舊版存檔／手改 localStorage 都不會壞）');

/* 重新 require 一次 —— 模擬「下次再開面板」，選過的顏色要還在 */
const R2 = withSkins(STORE, function (S) {
  const st = S.state();
  return { eq: st.eq.flame, hex: st.custom.flame, pal: (S.color('flame') || []).length };
});
ok(R2.eq === 'custom' && R2.hex === '#00ff88', '重開之後自訂顏色還在（eq=' + R2.eq + ' ' + R2.hex + '）');
ok(R2.pal === 5, '讀回來也立刻算出五段色停（' + R2.pal + '）');

/* ⑥ 面板節點與事件 */
sec('⑥ 面板');
ok(/data-cust="/.test(skinsSrc), '色票是 button + data-cust（不是靠 JS 陣列索引，重畫也不會錯位）');
ok(/data-custuse/.test(skinsSrc) && /data-custclear/.test(skinsSrc), '有「套用」與「取消」');
ok(/type="color"/.test(skinsSrc), '有系統取色盤 input[type=color]');
ok(/\.skcuin'\)/.test(skinsSrc) && /onchange = function/.test(skinsSrc),
  '取色盤只在 change（放開）套用 —— 拖動中就重畫會把拖曳打斷');
ok(/#skinPanel \.skcusw\{display:grid/.test(skinsSrc), '色票是 grid 排的（手機才會自動換行）');
ok(/#skinPanel \.skcud\.on\{/.test(skinsSrc), '選中的那格有色框');
ok(/v5\.60/.test(skinsSrc), '檔案裡有 v5.60 註記');

/* ⑦ i18n */
sec('⑦ i18n');
const KEYS = ['sk.custTitle', 'sk.custSub', 'sk.custPick', 'sk.custUse', 'sk.custClear', 'sk.custOn', 'sk.custNone'];
KEYS.forEach(function (k) {
  const re = new RegExp('^' + k.replace(/\./g, '\\.') + '\\|', 'm');
  const line = i18nSrc.split('\n').filter(function (l) { return re.test(l); })[0] || '';
  const col = line.split('|');
  ok(col.length === 6 && col.slice(1).every(function (x) { return x.trim().length > 0; }),
    k + ' 五個語言都填了' + (col.length !== 6 ? '（實際 ' + col.length + ' 欄）' : ''));
});
const dup = {};
i18nSrc.split('\n').forEach(function (l) {
  const k = l.split('|')[0];
  if (k && l.indexOf('|') > 0) dup[k] = (dup[k] || 0) + 1;
});
ok(Object.keys(dup).filter(function (k) { return dup[k] > 1; }).length === 0, '沒有重複的 key');

/* ⑧ 版本 */
sec('⑧ 版本');
const m1 = /const VERSION = '([\d.]+)'/.exec(mainSrc);
const ver = m1 ? m1[1] : '';
ok(!!ver && parseFloat(ver) >= 5.6, '版本 ≥ 5.6（實際 ' + ver + '）');
const m2 = /v: '([\d.]+)', date: '[^']*', now: true/.exec(vlogSrc);
ok(!!m2 && parseFloat(m2[1]) >= 5.6, 'VERSION_LOG 最新一條是 5.6 以上且 now:true（實際 ' + (m2 ? m2[1] : '') + '）');
ok(/now: false/.test(vlogSrc), '上一版有改成 now:false');
ok(/v5\.60|v5\.6/.test(vlogSrc), 'VERSION_LOG 裡有這一版');
ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').indexOf('v' + ver + '.') >= 0,
  'SW_VERSION 跟著版本（實際 ' + (function () {
    const mm = /SW_VERSION = '(v[\d.]+)'/.exec(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'));
    return mm ? mm[1] : '';
  })() + '）');
const nEntries = i18nSrc.split('\n').filter(function (l) { return l.indexOf('|') > 0; }).length;
ok(nEntries >= 1995, '字典 ≥ 1995 條（實際 ' + nEntries + '）');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.60：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
