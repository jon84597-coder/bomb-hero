// test/verify-v66.js —— v4.22
//   ① 第一次觸控不再讓整頁位移（body.touch 不再把 padding 改成 0）→ 按鈕點得到
//   ② 手機工具列重排：👤 帳號 ＋ ⋮ 更多，每顆都 ≥44px
//   ③ 主選單「帳號登入」大按鈕
//   ④ 橫向提示點過一次就不再擋（記在 localStorage）
//   ⑤ 新版上線自動套用（SW ETag 比對 → NEW_VERSION → applyUpdate）
//   ⑥ 10 語言 menu.acct
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, html = env.html, sandbox = env.sandbox;
const fs = require('fs');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

const src = html.replace(/\r/g, '');
const noCmt = src.replace(/(?<![\w\/])\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const swjs = fs.readFileSync(__dirname + '/../sw.js', 'utf8').replace(/\r/g, '');

/* ------------------------------------------------------------------ 1 */
head('1. 第一次觸控不再讓整頁位移（商店點不動的真兇）');
{
  // 取 body.touch { ... } 這一條（不含 .slidepad 等複合選擇器）
  const m = noCmt.match(/(?:^|\n)\s*body\.touch\s*\{([\s\S]*?)\}/);
  ok(!!m, '找得到 body.touch 規則');
  const block = m ? m[1] : '';
  ok(!/padding\s*:\s*0/.test(block), 'body.touch 不再把 padding 設成 0（會讓整頁往上跳 14px）');
  ok(!/padding\s*:/.test(block), 'body.touch 完全不動 padding');
  ok(/align-items\s*:\s*flex-start/.test(block), 'body.touch 仍然靠上對齊（不會裁掉頂端）');
  // body 本體的 padding 還在
  const bodyM = noCmt.match(/(?:^|\n)\s*body\s*\{([\s\S]*?)\}/);
  ok(!!bodyM && /padding\s*:\s*14px/.test(bodyM[1]), 'body 的 14px padding 還在（兩邊一致就不會跳）');
  // v4.43：只檢查「body.touch 這條規則本身」，子元素（如 .wrap.game）不在限制內
  // v4.47：唯一允許的例外是 `body.touch.in-game` —— 它只在「進遊戲」這個明確的畫面切換時
  // 加上，不是第一次觸控（加 .touch）那一刻，所以不會出現「按鈕在手指底下位移」的老問題。
  ok(!/body\.touch(?!\.in-game)(?:\.[a-z-]+)*\s*\{[^}]*padding\s*:\s*0/.test(noCmt),
    '除了 in-game（進遊戲才套用）以外，沒有 body.touch 變體把 padding 歸零');
  ok(noCmt.indexOf('body.touch.in-game { padding: 0; }') >= 0,
    'v4.47：遊戲中 body padding 歸零（畫面左右貼邊）');
}

/* ------------------------------------------------------------------ 2 */
head('2. 手機工具列重排（帳號變大＋⋮ 更多）');
{
  ok(/id="btnMore"/.test(src), '有「⋮ 更多」按鈕 #btnMore');
  ok(/id="navMore"[^>]*class="navmore"|class="navmore"[^>]*id="navMore"/.test(src), '有 #navMore 選單容器');
  ok(/\.navmore\s*\{\s*display:\s*contents/.test(noCmt), '桌機時 .navmore 是 display:contents（排版照舊）');
  ok(/@media \(max-width: 560px\)\s*\{[\s\S]*?\.navmore\.on\s*\{\s*display:\s*flex/.test(noCmt),
    '手機時 .navmore.on 才展開成選單');

  // 帳號鈕在手機要有 44px
  const acct = noCmt.match(/#acctChip\s*\{([^}]*)\}/g) || [];
  ok(acct.some(b => /min-height\s*:\s*44px/.test(b)), '#acctChip 在手機有 min-height:44px');
  const moreBlocks = noCmt.match(/#btnMore\s*\{[^}]*\}/g) || [];
  ok(moreBlocks.some(b => /min-width:\s*44px/.test(b) && /min-height:\s*44px/.test(b)),
    '#btnMore 至少 44x44（手機才顯示的那一條）');
  ok(/\.navmore \.navbtn\s*\{([\s\S]*?)\}/.test(noCmt) &&
     /min-height:\s*44px/.test((noCmt.match(/\.navmore \.navbtn\s*\{([\s\S]*?)\}/) || [, ''])[1]),
    '選單裡的每一顆都 44px 高');

  // 六顆工具都要收進 .navmore（用原始碼順序判斷）
  const iMore = src.indexOf('id="navMore"');
  const iEnd = src.indexOf('</div>', src.indexOf('id="btnInstall"'));
  ['btnMusic', 'btnLang', 'btnSfx', 'btnFull', 'btnMail', 'btnInstall'].forEach(function (id) {
    const at = src.indexOf('id="' + id + '"');
    ok(at > iMore && at < iEnd, '#' + id + ' 收在 #navMore 裡面');
  });
  // 語言選單要留在外面，否則絕對定位會算錯
  const iLang = src.indexOf('id="langMenu"');
  ok(iLang > iEnd, '#langMenu 留在 #navMore 外面（定位基準不變）');
  // 帳號鈕在更多按鈕前面
  ok(src.indexOf('id="acctChip"') < src.indexOf('id="btnMore"'), '帳號鈕排在 ⋮ 前面');
}

/* ------------------------------------------------------------------ 3 */
head('3. 首頁不再重複一顆「帳號登入」大按鈕');
{
  // v4.81：右上角 acctChip 一直是常駐入口，首頁那顆等於第二個門，已移除
  ok(src.indexOf('id="btnAcctBig"') < 0, '首頁的大顆「帳號登入」已移除（不會有兩個入口）');
  ok(src.indexOf('id="acctChip"') > 0, '右上角帳號膠囊仍在（唯一入口）');
  ok(/const chip = \$id\('acctChip'\);\s*\n\s*if \(chip\) chip\.addEventListener\('click'/.test(src), '膠囊有綁 click（點下去開綁定視窗）');
  const seg = src.slice(src.indexOf('id="homeMenu"'), src.indexOf('id="btnStore"'));
  ok(seg.indexOf('帳號') < 0, '首頁選單區塊裡沒有帳號字樣');
}

/* ------------------------------------------------------------------ 4 */
head('4. ⋮ 選單開合');
{
  const more = env.getId('btnMore'), box = env.getId('navMore');
  ok(!!more && !!box, '#btnMore 與 #navMore 都拿得到');
  const hs = (more._on && more._on.click) || [];
  ok(hs.length > 0, '⋮ 有綁 click');
  if (hs.length) {
    hs[0]({ preventDefault() {}, cancelable: true });
    ok(box.classList.contains('on'), '點一下 → 選單展開（.on）');
    hs[0]({ preventDefault() {}, cancelable: true });
    ok(!box.classList.contains('on'), '再點一下 → 選單收起');
  }
  ok(typeof sandbox.hideMoreMenu === 'function', '有 hideMoreMenu()（切畫面時可以收掉）');
  if (typeof sandbox.hideMoreMenu === 'function') {
    box.classList.add('on');
    sandbox.hideMoreMenu();
    ok(!box.classList.contains('on'), 'hideMoreMenu() 真的收得掉');
  }
  ok(/aria-expanded/.test(src), '⋮ 有 aria-expanded（無障礙）');
}

/* ------------------------------------------------------------------ 5 */
head('5. 「橫著玩」提示點過一次就不再擋');
{
  ok(/bombhero-rotskip/.test(src), '有存一個 bombhero-rotskip 記號');
  ok(/function rotSkipped\(\)/.test(src), '有 rotSkipped()');
  ok(/function setRotSkip\(v\)/.test(src), '有 setRotSkip()');
  // showRotateHint 內要先問 rotSkipped
  const f = src.slice(src.indexOf('function showRotateHint()'));
  const body = f.slice(0, 420);
  ok(body.indexOf('rotSkipped()') > 0, 'showRotateHint 一開頭就檢查 rotSkipped');
  ok(body.indexOf('rotSkipped()') < body.indexOf('phonePortrait()'),
    '先檢查「玩家說過不要再問」才判斷是不是直式');
  // 點按鈕要記住
  const okBtn = src.slice(src.indexOf("const ok = $id('rhOk');"));
  ok(okBtn.slice(0, 400).indexOf('setRotSkip(true)') > 0, '按「直式繼續玩」會記住選擇');
  ok(/if \(e\.target !== el\) return;/.test(okBtn.slice(0, 900)), '點卡片外的黑底也能關');

  // 動態：已經記住 → 就算在遊戲中也不會長出提示卡
  sandbox.localStorage.setItem('bombhero-rotskip', '1');
  ok(sandbox.localStorage.getItem('bombhero-rotskip') === '1', '記號寫得進 localStorage');
  sandbox.localStorage.removeItem('bombhero-rotskip');
}

/* ------------------------------------------------------------------ 6 */
head('6. 新版上線會自己套用');
{
  ok(/NAV_TIMEOUT = 2200/.test(swjs), 'sw.js 導覽逾時縮到 2.2 秒（Render 冷啟動一定超過）');
  ok(/function watchForNewer/.test(swjs), 'sw.js 有背景比對新版的 watchForNewer');
  ok(/cache: 'no-store'/.test(swjs), '背景查詢用 no-store（不吃瀏覽器快取）');
  ok(/type: 'NEW_VERSION'/.test(swjs), 'SW 會 postMessage NEW_VERSION');
  ok(/etag/i.test(swjs), '用 ETag 判斷有沒有換版');
  ok(/watchForNewer\(c, req\)/.test(swjs), '逾時回快取後會啟動背景比對');
  ok(/P\.applyUpdate\s*=/.test(src), 'index.html 有 P.applyUpdate');
  ok(/serviceWorker\.addEventListener\('message'/.test(src), '頁面會收 SW 的訊息');
  ok(/bh-auto-reload/.test(src), '有防止無限重新載入的記號');
  ok(/Screen\.current !== 'title'/.test(src), '遊戲中不打斷（只提示，回主選單再換）');
}

/* ------------------------------------------------------------------ 7 */
head('7. 卡在舊版時的「強制更新」後路');
{
  const fu = env.getId('btnForceUpd');
  ok(!!fu, '#btnForceUpd 存在');
  const iFu = src.indexOf('id="btnForceUpd"');
  const iMore = src.indexOf('id="navMore"');
  const iEnd = src.indexOf('</div>', src.indexOf('id="btnInstall"'));
  ok(iFu > iMore && iFu < iEnd, '放在 ⋮ 選單裡（桌機也點得到）');
  const hs = (fu._on && fu._on.click) || [];
  ok(hs.length > 0, '有綁 click');
  const code = hs.length ? hs[0].toString() : '';
  ok(code.indexOf('unregister') >= 0, '會註銷舊的 Service Worker');
  ok(code.indexOf('caches.delete') >= 0 || code.indexOf('caches.keys') >= 0, '會清掉舊快取');
  ok(code.indexOf('reload') >= 0, '清完會重新載入');
  ok(/catch[^]*done|catch\(done\)/.test(code), '出錯也會照樣重新載入（不會卡死）');
}

/* ------------------------------------------------------------------ 8 */
head('8. 每個語言都有 menu.acct（v5.0 起壓縮成「key|5 語言」一行）');
{
  const nLang = (src.match(/const LANGS = \[([\s\S]*?)\];/) || [null, ''])[1].split(/\{ id: /).length - 1;
  ok(nLang === 5, '目前 ' + nLang + ' 種語言（v5.0 從 10 種精簡）');
  function row(k) {
    const m = new RegExp('^' + k.replace(/\./g, '\\.') + '\\|([^\\n]*)', 'm').exec(src);
    return m ? m[1].split('|') : null;
  }
  const a = row('menu.acct'), b2 = row('menu.acct.sub');
  ok(a && a.length === nLang, "'menu.acct' 有 " + (a ? a.length : 0) + ' 欄（要 ' + nLang + '）');
  ok(b2 && b2.length === nLang, "'menu.acct.sub' 有 " + (b2 ? b2.length : 0) + ' 欄（要 ' + nLang + '）');
  ok(a && a.every(function (v) { return v.trim().length > 2; }), '每個語言都有實際文字（不是空字串）');
  ok(b2 && b2.every(function (v) { return v.trim().length > 10; }), '每個語言的副標都有內容');
}

/* ------------------------------------------------------------------ 8 */
head('8. 版本與快取');
{
  ok(/^\d+\.\d+$/.test(P.VERSION), '版號格式 = ' + P.VERSION);
  ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = ' + P.VERSION);
  const v422log = P.VERSION_LOG.filter(function (e) { return e.v === '4.22'; })[0] || { items: [] };
ok(v422log.items.join(' ').indexOf('14px') > 0, '4.22 更新內容有寫「整頁往上跳」這件事');
  ok(P.VERSION_LOG.filter(e => e.v === '4.21').every(e => e.now === false), '4.21 已不是 now');
  ok(src.indexOf('id="verLogVer">' + P.VERSION + '<') > 0, '版本紀錄標題同步');
  const sws = ['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'];
  const want = new RegExp("SW_VERSION = 'v" + P.VERSION.replace(/\./g, '\\.') + "\\.\\d+'");
  sws.forEach(function (p) {
    const fp = __dirname + '/' + p;
    if (!fs.existsSync(fp)) { ok(true, p + ' 不存在（跳過）'); return; }
    ok(want.test(fs.readFileSync(fp, 'utf8')), p.replace('../', '') + ' = v' + P.VERSION + '.0');
  });
}

console.log('\n通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
process.exit(fail ? 1 : 0);
