// test/verify-v52.js — v4.6：PWA「加入桌面捷徑」
//   無頭（vm）驗證：manifest / Service Worker / 圖示 / <head> 註冊 / 按鈕顯示邏輯 / iOS 引導
//   不需要瀏覽器；真正的安裝彈窗（chrome 的 beforeinstallprompt）只能靠手動目檢
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const htmlPath = path.join(ROOT, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const rd = (p) => fs.readFileSync(path.join(ROOT, p));

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
const src = (re) => re.test(html);

// ------------------------------------------------------------------
// 迷你沙盒：只跑 <head> 的 PWA 前置程式（真實遊戲主程式另外用 _sandbox 跑）
// ------------------------------------------------------------------
const BOOT = (html.match(/<script id="pwaBoot">([\s\S]*?)<\/script>/) || [])[1] || '';

function bootPwa(o) {
  o = o || {};
  const listeners = {};
  const attrs = {};
  const ctx = {
    console,
    setTimeout, clearTimeout, Promise,
    navigator: {
      userAgent: o.ua === undefined ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' : o.ua,
      platform: o.platform || 'Win32',
      maxTouchPoints: o.maxTouchPoints || 0,
      standalone: o.navStandalone
    },
    location: o.location === undefined
      ? { protocol: 'https:', hostname: 'bomb-hero-game.onrender.com', pathname: '/' }
      : o.location,
    document: {
      referrer: o.referrer || '',
      documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] || null }
    },
    matchMedia: o.matchMedia,
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener: () => {}
  };
  if (o.serviceWorker) ctx.navigator.serviceWorker = o.serviceWorker;
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(BOOT, ctx, { filename: 'pwaBoot' });
  return {
    P: ctx.BHPWA,
    attrs,
    listeners,
    fire(type, ev) { (listeners[type] || []).forEach((fn) => fn(ev)); }
  };
}

const MQ = (matches) => (q) => ({
  matches: q === '(display-mode: standalone)' ? !!matches : false,
  addEventListener() {}, addListener() {}
});

// ==================================================================
console.log('\n=== 0. 版本 ===');
const env = makeEnv();
const P = env.BH;
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(src(new RegExp('<span id="verTxt">' + P.VERSION.replace('.', '\\.') + '<\\/span>')), '首頁徽章同步 ' + P.VERSION);

// ==================================================================
console.log('\n=== 1. manifest.json（規格第三節）===');
let mf = null;
try { mf = JSON.parse(rd('manifest.json').toString('utf8')); } catch (e) {}
ok(!!mf, 'manifest.json 存在且是合法 JSON');
ok(mf && mf.name === '爆爆英雄', 'name = 爆爆英雄', mf && mf.name);
ok(mf && mf.short_name === '爆爆英雄', 'short_name = 爆爆英雄', mf && mf.short_name);
ok(mf && mf.start_url === './index.html', 'start_url = ./index.html', mf && mf.start_url);
ok(mf && mf.display === 'standalone', 'display = standalone（獨立視窗、隱藏網址列）', mf && mf.display);
ok(mf && mf.background_color === '#ffffff', 'background_color = #ffffff', mf && mf.background_color);
ok(mf && mf.theme_color === '#ff4500', 'theme_color = #ff4500', mf && mf.theme_color);
ok(mf && mf.scope === './', 'scope = ./（整個網站都在 PWA 範圍內）', mf && mf.scope);

const icons = (mf && mf.icons) || [];
const bySize = (s, p) => icons.filter((i) => i.sizes === s && (i.purpose || 'any') === p)[0];
ok(icons.length >= 4, 'icons 至少 4 筆（192／512 × any／maskable）', icons.length);
ok(!!bySize('192x192', 'any'), '有 192x192 一般圖示');
ok(!!bySize('512x512', 'any'), '有 512x512 一般圖示');
ok(!!bySize('192x192', 'maskable'), '有 192x192 maskable 圖示');
ok(!!bySize('512x512', 'maskable'), '有 512x512 maskable 圖示');
ok(icons.every((i) => /^\.\/icons\/icon-.*\.png$/.test(i.src) && i.type === 'image/png'),
  '所有圖示都是本專案 ./icons 底下的 PNG');

// 真的一張一張讀 PNG 標頭確認寬高（不靠 PIL）
function pngSize(buf) {
  if (buf.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
let allOk = true, sizes = [];
icons.forEach((ic) => {
  let buf = null;
  try { buf = rd(ic.src.replace('./', '')); } catch (e) { allOk = false; return; }
  const s = pngSize(buf);
  const want = parseInt(ic.sizes, 10);
  if (!s || s.w !== want || s.h !== want) { allOk = false; return; }
  sizes.push(ic.sizes);
});
ok(allOk, '每個圖示檔案都存在、是 PNG、而且尺寸真的對得上', sizes.join(' / '));

['icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png',
 'apple-touch-icon.png', 'favicon-32.png', 'pwa-logo.png'].forEach((n) => {
  let b = null;
  try { b = rd('icons/' + n); } catch (e) {}
  ok(!!b && !!pngSize(b), 'icons/' + n + ' 存在且是有效 PNG');
});
const at = pngSize(rd('icons/apple-touch-icon.png'));
ok(at && at.w === 180 && at.h === 180, 'apple-touch-icon 是 180x180（iOS 建議尺寸）', at && (at.w + 'x' + at.h));

// ==================================================================
console.log('\n=== 2. Service Worker（規格第三節）===');
const sw = rd('sw.js').toString('utf8');
ok(/addEventListener\('install'/.test(sw), '有 install 事件（ precache 本體）');
ok(/addEventListener\('activate'/.test(sw), '有 activate 事件（清掉舊版快取）');
ok(/addEventListener\('fetch'/.test(sw), '有 fetch 事件（離線可用）');
ok(/self\.skipWaiting\(\)/.test(sw), 'install 後 skipWaiting（改版不用關光分頁）');
ok(/clients\.claim\(\)/.test(sw), 'activate 後 clients.claim（立刻接手）');
ok(/caches\.keys\(\)/.test(sw) && /caches\.delete\(/.test(sw), 'activate 會刪掉不認識的舊快取');
ok(/SW_VERSION\s*=\s*'v\d+\.\d+\.\d+'/.test(sw), 'SW 快取版本有跟版號走（vX.Y.Z）');
ok(/index\.html/.test(sw) && /manifest\.json/.test(sw), 'precache 清單含 index.html 與 manifest.json');
ok(/NAV_TIMEOUT\s*=\s*(\d+)/.test(sw) && Number(RegExp.$1) <= 3000,
  '導覽請求有逾時保護（' + (RegExp.$1 || '?') + 'ms，弱網不會一直轉圈）');
ok(/watchForNewer/.test(sw), 'v4.22：退回快取後會背景比對新版並通知頁面');
ok(/indexOf\('\/api\/'\)\s*===?\s*0/.test(sw) && /return;/.test(sw), '/api/ 一律跳過不快取（帳號／存檔／配對要即時）');
ok(/origin !== self\.location\.origin/.test(sw), '跨網域請求不攔（OAuth 授權不會被搞壞）');
ok(/req\.method !== 'GET'/.test(sw), '非 GET 請求不攔');
ok(/function navFetch/.test(sw) && /fetch\(req\)[\s\S]{0,700}caches\.match/.test(sw),
  '導覽：先網路、失敗才用快取（改版後就是新版）');
ok(/function assetFetch/.test(sw), '靜態資源：快取優先＋背景更新');

// ==================================================================
console.log('\n=== 3. <head>：瀏覽器才認得這是可安裝的 App ===');
ok(/<link rel="manifest" href="\.\/manifest\.json">/.test(html), '有 link rel=manifest');
ok(/<meta name="theme-color" content="#ff4500">/.test(html), '有 theme-color（手機狀態列橘色）');
ok(/<meta name="apple-mobile-web-app-capable" content="yes">/.test(html), '有 apple-mobile-web-app-capable（iOS 全螢幕）');
ok(/<link rel="apple-touch-icon" href="\.\/icons\/apple-touch-icon\.png">/.test(html), '有 apple-touch-icon');
ok(/<meta name="apple-mobile-web-app-title" content="爆爆英雄">/.test(html), 'iOS 桌面名稱 = 爆爆英雄');
ok(/<link rel="icon"/.test(html), '有 favicon（分頁小圖）');
ok(/<script id="pwaBoot">/.test(html), '<head> 有 PWA 前置程式（帶 id，不會被抽段規則誤抓）');
ok(/navigator\.serviceWorker\.register\('\.\/sw\.js', \{ scope: '\.\/' \}\)/.test(html),
  '在 <head> 就註冊 sw.js（scope ./）');

// ==================================================================
console.log('\n=== 4. 攔 beforeinstallprompt 並暫存 ===');
const desktop = bootPwa({ matchMedia: MQ(false) });
ok(!!desktop.P, 'window.BHPWA 有建起來');
ok(desktop.P.canPrompt === false, '一開始 canPrompt = false（還沒收到事件）');
let prompted = 0;
const fakeEv = { preventDefault() { prompted++; }, prompt() {}, userChoice: Promise.resolve({ outcome: 'accepted' }) };
desktop.fire('beforeinstallprompt', fakeEv);
ok(prompted === 1, '收到事件時呼叫 preventDefault（攔掉瀏覽器自己跳的安裝條）');
ok(desktop.P.canPrompt === true, 'canPrompt 變 true');
ok(desktop.P.deferred === fakeEv, '事件被暫存進 deferred，等玩家按按鈕才用');
ok(desktop.attrs['data-pwa'] === 'ready', 'html[data-pwa] = ready');

desktop.fire('appinstalled', {});
ok(desktop.P.installed === true && desktop.P.canPrompt === false && desktop.P.deferred === null,
  'appinstalled 後清掉 deferred（避免重複安裝）');
ok(desktop.attrs['data-pwa'] === 'installed', 'html[data-pwa] = installed');

// ==================================================================
console.log('\n=== 5. 智慧顯示：已經是捷徑開啟就隱藏 ===');
const sa = bootPwa({ matchMedia: MQ(true) });
ok(sa.P.standalone === true, 'display-mode: standalone → standalone = true');

const iosSA = bootPwa({
  ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
  platform: 'iPhone', maxTouchPoints: 5, navStandalone: true, matchMedia: MQ(false)
});
ok(iosSA.P.standalone === true, 'iOS 的 navigator.standalone = true 也算（Safari 不會回 display-mode）');

const normaliOS = bootPwa({
  ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
  platform: 'iPhone', maxTouchPoints: 5, matchMedia: MQ(false)
});
ok(normaliOS.P.standalone === false, '一般 iPhone Safari 開啟 → standalone = false（要顯示按鈕）');
ok(normaliOS.P.ios === true, 'iPhone UA 判斷成 ios');
ok(normaliOS.P.safari === true && normaliOS.P.firefox === false, 'iPhone Safari 判斷成 safari');

const ipad = bootPwa({
  ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  platform: 'MacIntel', maxTouchPoints: 5, matchMedia: MQ(false)
});
ok(ipad.P.ios === true, 'iPadOS 13+（UA 假裝 Mac）也認得出是 iOS');

const andr = bootPwa({
  ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
  matchMedia: MQ(false)
});
ok(andr.P.android === true && andr.P.ios === false, 'Android 判斷成 android');

const ff = bootPwa({ ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0', matchMedia: MQ(false) });
ok(ff.P.firefox === true && ff.P.safari === false, 'Firefox 判斷成 firefox（沒有安裝提示，走手動引導）');

// ==================================================================
console.log('\n=== 6. 註冊 Service Worker 的防呆 ===');
const noSW = bootPwa({ matchMedia: MQ(false) });
noSW.P.register();
ok(noSW.P.swError === 'unsupported', '瀏覽器不支援 serviceWorker → 記 unsupported，不會丟錯');
const insecure = bootPwa({ matchMedia: MQ(false), location: { protocol: 'http:', hostname: 'example.com' },
  serviceWorker: { register() { return Promise.resolve(); } } });
insecure.P.register();
ok(insecure.P.secure === false && insecure.P.swError === 'insecure',
  'http（非本機）→ 記 insecure 不註冊（瀏覽器本來就不給）');
const fileProto = bootPwa({ matchMedia: MQ(false), location: { protocol: 'file:', hostname: '' } });
ok(fileProto.P.secure === false, 'file:// 直接玩也活得好好的（只是沒有 PWA）');

// ==================================================================
console.log('\n=== 7. 首頁右上角按鈕（規格第一節）===');
ok(/<button class="navbtn pwa" id="btnInstall" type="button" title="加入桌面捷徑">/.test(html),
  '按鈕 id=btnInstall、class="navbtn pwa"');
ok(/id="btnInstall"[\s\S]{0,160}<span class="pwico"[\s\S]{0,80}<b>下載 App<\/b>/.test(html),
  '按鈕內是炸彈 LOGO 小圖 ＋「下載 App」');
const navIdx = html.indexOf('id="navBar"');
const btnIdx = html.indexOf('id="btnInstall"');
const navEnd = html.indexOf('id="ctaBar"');
ok(navIdx > 0 && btnIdx > navIdx && btnIdx < navEnd, '按鈕在工具列 #navBar 裡（右上角，跟音量／全視窗同一排）');
const mailIdx = html.indexOf('id="btnMail"');
ok(btnIdx > mailIdx, '按鈕排在信箱右邊（最角落、最顯眼）');
ok(/\.navbtn\.pwa \{[^}]*display: none;/.test(html), '預設 display:none（不是首頁就不佔位）');
ok(/body\.pwa-on \.navbtn\.pwa \{ display: inline-flex; \}/.test(html),
  'body.pwa-on 才顯示（換畫面就收回）');
ok(/\.navbtn\.pwa \.pwico \{[^}]*url\("\.\/icons\/pwa-logo\.png"\)/.test(html),
  '小圖用的是同一顆炸彈 LOGO（pwa-logo.png）');
ok(/#btnInstall b \{ display: none; \}/.test(html) || /#btnSfx b, #btnInstall b \{ display: none; \}/.test(html),
  '窄螢幕只留圖示（不會把工具列擠爆）');

// ==================================================================
console.log('\n=== 8. pwaSync：什麼時候顯示／隱藏 ===');
function runBootInEnv(e) {
  vm.runInContext(BOOT, e.sandbox, { filename: 'pwaBoot' });
  return e.sandbox.BHPWA;
}
const bodyEl = env.getId('body');
const installEl = env.getId('btnInstall');

runBootInEnv(env);
const PW = env.sandbox.BHPWA;
ok(!!PW, '主程式沙盒裡也拿得到 window.BHPWA');
ok(P.pwaCore() === PW, 'pwaCore() 拿到的就是同一個 live 物件');
P.pwaSync();
ok(bodyEl.classList.contains('pwa-on'), '在首頁 → body 有 pwa-on（按鈕出現）');

PW.standalone = true;
P.pwaSync();
ok(!bodyEl.classList.contains('pwa-on'), 'standalone（用捷徑開的）→ 立刻隱藏按鈕');
PW.standalone = false;

env.BH.Screen.show('settings');
P.pwaSync();
ok(!bodyEl.classList.contains('pwa-on'), '離開首頁（例如設定頁）→ 按鈕消失');
env.BH.Screen.show('title');
P.pwaSync();
ok(bodyEl.classList.contains('pwa-on'), '回到首頁 → 按鈕回來');

// 呼吸動畫只在「真的抓到安裝提示」時才亮
P.pwaSync();
ok(!installEl.classList.contains('ready'), '還沒拿到安裝提示 → 不顯示 .ready（不亂閃）');
PW.canPrompt = true;
P.pwaSync();
ok(installEl.classList.contains('ready'), '拿到安裝提示 → 加上 .ready 呼吸光');
PW.canPrompt = false;
P.pwaSync();
ok(!installEl.classList.contains('ready'), '提示用完 → .ready 收回');
ok(installEl.title === '加入桌面捷徑', '按鈕 tooltip 走多語言字串', installEl.title);

// ==================================================================
console.log('\n=== 9. 點按鈕的兩種路徑（規格第四節）===');
// (a) 有官方提示 → 直接叫出來
let called = 0, prevent = 0;
const ev2 = {
  preventDefault() { prevent++; },
  prompt() { called++; },
  userChoice: Promise.resolve({ outcome: 'accepted' })
};
PW.deferred = ev2;
PW.canPrompt = true;
P.pwaInstall();
ok(called === 1, '有 beforeinstallprompt → 呼叫 ev.prompt()（瀏覽器自己彈安裝框）');
ok(PW.deferred === null && PW.canPrompt === false, '提示只能用一次 → 用完清掉');

// (b) iOS → 圖文引導
PW.deferred = null;
PW.ios = true;
P.pwaHintClose();
P.pwaInstall();
const sheet = env.getId('pwaSheet');
const pwaBody = env.getId('pwaBody');
ok(!sheet.classList.contains('hide'), 'iOS 沒得攔 → 打開圖文引導小卡');
ok(/pwasteps/.test(pwaBody.innerHTML), '引導卡裡有編號步驟');
ok(pwaBody.innerHTML.indexOf('Safari') >= 0, '第一步就是 Safari 的分享按鈕', 'Safari');
ok(pwaBody.innerHTML.indexOf('加入主畫面') >= 0, '第二步是「加入主畫面」');
ok(pwaBody.innerHTML.indexOf('全螢幕') >= 0, '附註說明用捷徑開就是全螢幕');
P.pwaHintClose();
ok(sheet.classList.contains('hide'), '按「知道了」/✕ 可以關掉');

// (c) 桌面沒有提示 → 指引網址列
PW.ios = false; PW.android = false; PW.firefox = false; PW.safari = false; PW.secure = true;
P.pwaInstall();
ok(!sheet.classList.contains('hide') && pwaBody.innerHTML.indexOf('網址列') >= 0,
  '桌面瀏覽器沒有提示 → 改指引「網址列右側的安裝圖示」');
P.pwaHintClose();

// (d) 已經是捷徑 → 只跳提示，不重複安裝
PW.standalone = true;
const toastEl = env.getId('toast');
P.pwaInstall();
ok(toastEl._cls.has('show') || /已經/.test(toastEl.textContent || ''), '已是捷徑 → 提示「已經是捷徑開啟了」');
PW.standalone = false;

// ==================================================================
console.log('\n=== 10. 引導小卡的存在與樣式 ===');
ok(/<div class="pwasheet hide" id="pwaSheet">/.test(html), '有 #pwaSheet 覆蓋層');
ok(/id="pwaTitle"/.test(html) && /id="pwaBody"/.test(html) && /id="pwaOk"/.test(html),
  '有標題／內容／確認鈕');
ok(/id="pwaClose"/.test(html), '有 ✕ 關閉鈕');
ok(/\.pwasheet \{[^}]*z-index: 1500/.test(html), 'z-index 1500（蓋在版本紀錄之上）');
ok(/\.pwasteps li::before \{[^}]*counter\(pwastep\)/.test(html), '步驟用 CSS 自動編號（換語言也不用改）');
ok(/\.pwacard \{[^}]*max-height: min\(86vh, 640px\)[^}]*overflow-y: auto/.test(html),
  '卡片內容太長會自己捲（小手機不會被切掉）');

// ==================================================================
console.log('\n=== 11. 10 語都補齊（換語言不會變中文）===');
const KEYS = ['pwa.btn', 'pwa.tip', 'pwa.title', 'pwa.iosA', 'pwa.iosB', 'pwa.desktop',
  'pwa.manual', 'pwa.note', 'pwa.ok', 'pwa.done', 'pwa.cancel', 'pwa.already'];
KEYS.forEach((k) => {
  const n = P.LANGS.filter((L) => P.I18N[L.id] && P.I18N[L.id][k]).length;
  ok(n === P.LANGS.length, k + ' 在 ' + P.LANGS.length + ' 種語言都有', n + '/' + P.LANGS.length);
});
ok(P.t('pwa.tip') === '加入桌面捷徑', 't("pwa.tip") 取得中文');
ok(P.t('pwa.title').indexOf('📱') === 0, 't("pwa.title") 帶手機圖示', P.t('pwa.title'));

// ==================================================================
console.log('\n=== 12. 伺服器：sw.js / manifest 不能被瀏覽器快取住 ===');
const srv = fs.readFileSync(path.join(ROOT, '..', 'bomberman-online', 'server.js'), 'utf8');
ok(/sw\\\.js\$/.test(srv) || /sw\.js/.test(srv), 'server.js 認得 sw.js');
ok(/const noCache = ext === '\.html' \|\|/.test(srv), '有 noCache 判斷（原本只有 .html）');
ok(/'Cache-Control': noCache \? 'no-cache'/.test(srv), 'sw.js／manifest.json 送 no-cache（改版一定吃得到）');
ok(/'\.json': 'application\/json; charset=utf-8'/.test(srv), 'manifest.json 的 MIME 是 application/json');
ok(/'\.js': 'text\/javascript; charset=utf-8'/.test(srv), 'sw.js 的 MIME 是 text/javascript（瀏覽器才肯註冊）');
ok(/'\.png': 'image\/png'/.test(srv), '圖示 MIME 是 image/png');

// ==================================================================
console.log('\n=== 13. 不破壞既有功能 ===');
// v5.20：字典外移，唯一的外部 js 只能是它（純資料，壞了只是沒翻譯）
const extJs52 = html.match(/<script[^>]+src="([^"]+)"/g) || [];
ok((html.match(/<script(?![^>]*src=)/g) || []).length === 2, '2 個 inline script（PWA 前置＋主程式）');
// v5.38：多了 js/version-log.js（純資料檔）
ok(extJs52.length === 2 && extJs52.some(function (x) { return x.indexOf('js/i18n-src.js') > 0; }) &&
  extJs52.some(function (x) { return x.indexOf('js/version-log.js') > 0; }), '外部 js 只有字典與版本紀錄兩個');
ok(!/src="http/.test(html), '沒有外部圖片網址（離線也能開）');
ok(html.indexOf("const VERSION = '" + P.VERSION + "';") > 0, '版本常數 = ' + P.VERSION);
const L46 = (P.VERSION_LOG.filter(function (x) { return x.v === '4.6'; })[0] || { items: [] });
ok(!!L46.items.length && !L46.now, 'v4.6（PWA）已轉為舊版但條列還在');
ok(L46.items.join('|').indexOf('桌面') >= 0, 'v4.6 條列提到「桌面」');
ok(L46.items.join('|').indexOf('離線') >= 0, 'v4.6 條列提到「離線」');
ok(typeof P.toast === 'function' && typeof P.Screen === 'object', '原有 toast／Screen 都還在');

// ==================================================================
console.log('\n----------------------------------------');
console.log((fail === 0 ? '全部通過' : '有失敗') + '：' + pass + ' 項通過、' + fail + ' 項失敗');
process.exit(fail === 0 ? 0 : 1);
