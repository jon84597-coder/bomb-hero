// test/shot63-v46.js — 瀏覽器端到端：PWA「加入桌面捷徑」（v4.6 功能，版本號跟著主程式走）
//   · 自己起一台乾淨伺服器（temp data dir）
//   · 真的用 Chrome 開頁面，量測：
//       ① manifest / 圖示 / sw.js 都真的抓得到（HTTP 200 + 正確 MIME）
//       ② Service Worker 真的註冊成功、接管頁面、cache 有建起來
//       ③ 首頁右上角按鈕「看得到、在右上角、不擠爆工具列」
//       ④ 進設定頁自動消失、回到首頁回來、standalone 一律隱藏
//       ⑤ 攔到 beforeinstallprompt → 按鈕亮呼吸光 → 點下去真的呼叫 prompt()
//       ⑥ iOS 走圖文引導（截圖目檢）
//   · 桌機 1280×860、手機橫放 844×390、手機直放 390×844 都跑
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cdp = require('./cdp');

const ROOT_SRV = (function () {
  const a = path.join(__dirname, '..');
  const b = path.join(__dirname, '..', '..', 'bomberman-online');
  if (fs.existsSync(path.join(a, 'server.js'))) return a;
  return b;
})();
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-v46-'));
const PORT = 3231;
const BASE = 'http://127.0.0.1:' + PORT;

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
const sleep = cdp.sleep;

function startServer() {
  const env = Object.assign({}, process.env, {
    PORT: String(PORT), BH_DATA_DIR: DATA, BH_AUTH_SECRET: 'v46-shot-secret', BH_FORCE_HTTPS: '0'
  });
  const p = spawn(process.execPath, ['server.js'], { cwd: ROOT_SRV, env, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.on('data', function () {});
  p.stderr.on('data', function (d) { const s = String(d); if (/Error/.test(s)) console.error('[srv]', s.trim()); });
  return p;
}
async function waitUp() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(400) });
      if (r.ok) return true;
    } catch (e) {}
    await sleep(120);
  }
  return false;
}

const BTN_INFO = `(function(){
  const b = document.getElementById('btnInstall');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const cs = getComputedStyle(b);
  const lb = b.querySelector('b');
  return {
    disp: cs.display, vis: cs.visibility, op: parseFloat(cs.opacity),
    left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top),
    w: Math.round(r.width), h: Math.round(r.height),
    vw: window.innerWidth, vh: window.innerHeight,
    labelDisp: lb ? getComputedStyle(lb).display : 'none',
    title: b.title, ready: b.classList.contains('ready'),
    bodyOn: document.body.classList.contains('pwa-on'),
    navW: document.getElementById('navBar').scrollWidth,
    navVW: document.getElementById('navBar').clientWidth
  };
})()`;

(async () => {
  const srv = startServer();
  if (!await waitUp()) throw new Error('伺服器沒起來');
  const b = await cdp.launch({ w: 1280, h: 900, port: 9482 });
  const p = await b.newPage();
  await p.resize(1280, 860, false);
  await p.goto(BASE + '/', 2600);
  await sleep(1200);
  const evalJs = (js) => p.eval(js);
  const shot = (name) => p.shot(path.join(__dirname, name));

  // ================================================================
  console.log('\n=== 1. 靜態資源真的抓得到（HTTP 層）===');
  const mfRes = await fetch(BASE + '/manifest.json');
  ok(mfRes.status === 200, '/manifest.json → 200', mfRes.status);
  ok(/application\/json/.test(mfRes.headers.get('content-type') || ''),
    'manifest Content-Type = application/json', mfRes.headers.get('content-type'));
  ok(/no-cache/.test(mfRes.headers.get('cache-control') || ''),
    'manifest 是 no-cache（改版吃得到新版）', mfRes.headers.get('cache-control'));
  const mf = await mfRes.json();
  ok(mf.name === '爆爆英雄' && mf.display === 'standalone', 'manifest 內容正確（爆爆英雄／standalone）');

  let iconOk = 0, iconBad = [];
  for (const ic of mf.icons) {
    const r = await fetch(BASE + ic.src.replace('./', '/'));
    const buf = Buffer.from(await r.arrayBuffer());
    const isPng = buf.slice(1, 4).toString() === 'PNG';
    if (r.status === 200 && /image\/png/.test(r.headers.get('content-type') || '') && isPng) iconOk++;
    else iconBad.push(ic.src + '(' + r.status + ')');
  }
  ok(iconOk === mf.icons.length, 'manifest 裡的 ' + mf.icons.length + ' 張圖示全部 200 + image/png',
    iconBad.length ? iconBad.join(',') : '全通過');

  const swRes = await fetch(BASE + '/sw.js');
  const swTxt = await swRes.text();
  ok(swRes.status === 200, '/sw.js → 200', swRes.status);
  ok(/javascript/.test(swRes.headers.get('content-type') || ''), 'sw.js MIME 是 javascript（否則瀏覽器拒絕註冊）');
  ok(/no-cache/.test(swRes.headers.get('cache-control') || ''),
    'sw.js 是 no-cache（不然玩家會一直跑舊的）', swRes.headers.get('cache-control'));
  ok(/addEventListener\('fetch'/.test(swTxt), 'sw.js 內容正確（有 fetch 處理）');

  // ================================================================
  console.log('\n=== 2. Service Worker 真的註冊並接管 ===');
  let regs = '';
  for (let i = 0; i < 40; i++) {
    regs = await evalJs(`(async function(){ 
      if (!('serviceWorker' in navigator)) return 'nosw';
      const rs = await navigator.serviceWorker.getRegistrations();
      return rs.map(function(r){ return r.scope + '|' + (r.active ? 'active' : 'pending'); }).join(',');
    })()`);
    if (/active/.test(regs)) break;
    await sleep(150);
  }
  ok(regs !== 'nosw', '瀏覽器支援 serviceWorker');
  ok(/active/.test(regs), 'Service Worker 已啟用（active）', regs);

  let ctrl = '';
  for (let i = 0; i < 40; i++) {
    ctrl = await evalJs(`(!!navigator.serviceWorker.controller)`);
    if (ctrl) break;
    await sleep(150);
  }
  ok(ctrl === true, '目前這個頁面已被 Service Worker 接管（controller 存在）');

  const cacheKeys = await evalJs(`(async function(){ const k = await caches.keys(); return k.join(','); })()`);
  ok(/bh-core-v4\.\d+\.\d+/.test(cacheKeys), '遊戲本體快取已建立（版本跟著 sw.js 走）', cacheKeys);
  const cached = await evalJs(`(async function(){
    const c = await caches.open((await caches.keys()).filter(k => /^bh-core-/.test(k))[0]);
    const ks = await c.keys();
    return ks.map(function (r) { return new URL(r.url).pathname; }).join(',');
  })()`);
  ok(cached.indexOf('/index.html') >= 0, '離線快取裡有 index.html');
  ok(cached.indexOf('/manifest.json') >= 0, '離線快取裡有 manifest.json');
  ok(cached.indexOf('/icons/icon-512.png') >= 0, '離線快取裡有 512 圖示');

  // ================================================================
  console.log('\n=== 3. 首頁右上角按鈕（桌機 1280×860）===');
  ok((await evalJs('window.BHPWA && window.BHPWA.standalone === false')),
    '桌機瀏覽器不算 standalone');
  let bi = await evalJs(BTN_INFO);
  ok(!!bi, '#btnInstall 存在');
  ok((bi.disp === 'inline-flex' || bi.disp === 'flex') && bi.op > 0.9, '首頁上真的看得到（display/opacity）', bi.disp + '/' + bi.op);
  ok(bi.bodyOn === true, 'body 有 pwa-on');
  ok(bi.labelDisp !== 'none' && bi.title === '加入桌面捷徑', '桌機顯示文字與提示', bi.title);
  ok(bi.right <= bi.vw && bi.right > bi.vw * 0.85, '在畫面右上角（右緣貼齊）', bi.left + '~' + bi.right + ' / ' + bi.vw);
  ok(bi.top < 80, '在最上面那一排工具列（不擋開始遊戲）', bi.top + 'px');
  ok(bi.h >= 26 && bi.h <= 44, '高度適中（點得到但不巨大）', bi.h + 'px');
  ok(bi.navW <= bi.navVW + 1, '工具列沒被擠爆（不溢出畫面）', bi.navW + '/' + bi.navVW);
  ok((await evalJs(`getComputedStyle(document.getElementById('btnInstall').querySelector('.pwico')).backgroundImage`))
    .indexOf('pwa-logo.png') >= 0, '按鈕小圖＝炸彈 LOGO');
  await shot('v46-1-install-btn.png');

  console.log('\n=== 4. 進別的畫面自動收起來 ===');
  await evalJs(`__BH.Screen.show('settings')`);
  await sleep(220);
  bi = await evalJs(BTN_INFO);
  ok(bi.disp === 'none' && bi.bodyOn === false, '設定頁 → 按鈕收起來（不干擾其他畫面）', bi.disp);
  await evalJs(`__BH.Screen.show('title')`);
  await sleep(220);
  bi = await evalJs(BTN_INFO);
  ok(bi.disp === 'inline-flex' || bi.disp === 'flex', '回到首頁 → 按鈕回來', bi.disp);

  console.log('\n=== 5. 抓到 beforeinstallprompt → 呼吸光 → 點下去真的 prompt() ===');
  await evalJs(`(function(){
    window.__fakePrompt = 0;
    var e = new Event('beforeinstallprompt');
    e.prompt = function () { window.__fakePrompt++; };
    e.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
    window.__evt = e;
    window.dispatchEvent(e);
    return true;
  })()`);
  await sleep(160);
  const st = await evalJs(`({ can: BHPWA.canPrompt, hasDeferred: !!BHPWA.deferred,
    ready: document.getElementById('btnInstall').classList.contains('ready') })`);
  ok(st.can === true && st.hasDeferred === true, '事件被攔下來並暫存');
  ok(st.ready === true, '按鈕亮起 .ready 呼吸光（提示玩家可以按）');
  ok((await evalJs(`getComputedStyle(document.getElementById('btnInstall')).animationName`)) === 'pwaBreath',
    'CSS 動畫真的套上去（pwaBreath）');
  // 真的用滑鼠點（走事件流程，不是直接呼叫函式）
  const c = await evalJs(`(function(){ const r = document.getElementById('btnInstall').getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) }; })()`);
  await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x, y: c.y, button: 'none', clickCount: 0 });
  await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: c.x, y: c.y, button: 'left', clickCount: 1 });
  await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: c.x, y: c.y, button: 'left', clickCount: 1 });
  await sleep(300);
  ok((await evalJs('window.__fakePrompt')) === 1, '點按鈕 → 呼叫 ev.prompt()（叫出瀏覽器自己的安裝框）');
  ok((await evalJs('BHPWA.canPrompt')) === false, '用完就清掉（不會重複彈）');
  ok((await shot('v46-2-installed-toast.png')) && true, '安裝後出現「已加入桌面捷徑」提示（截圖）');

  console.log('\n=== 6. iOS Safari：圖文引導 ===');
  await evalJs(`(function(){ BHPWA.deferred = null; BHPWA.canPrompt = false; BHPWA.ios = true; __BH.pwaSync(); })()`);
  await evalJs(`document.getElementById('btnInstall').click()`);
  await sleep(280);
  const sheet = await evalJs(`(function(){
    const s = document.getElementById('pwaSheet');
    const card = s.querySelector('.pwacard');
    const r = card.getBoundingClientRect();
    return {
      open: !s.classList.contains('hide'),
      z: getComputedStyle(s).zIndex,
      body: document.getElementById('pwaBody').innerHTML,
      steps: s.querySelectorAll('.pwasteps li').length,
      inView: r.top >= 0 && r.bottom <= window.innerHeight + 1 && r.left >= 0 && r.right <= window.innerWidth + 1,
      h: Math.round(r.height)
    };
  })()`);
  ok(sheet.open === true, '點下去 → 打開引導小卡（不會傻在那裡）');
  ok(sheet.z === '1500', 'z-index 1500（蓋在所有畫面之上）');
  ok(sheet.steps === 2, 'iOS 是兩步：分享 → 加入主畫面', sheet.steps);
  ok(sheet.body.indexOf('Safari') >= 0, '第一步提到 Safari 分享鈕');
  ok(sheet.body.indexOf('加入主畫面') >= 0, '第二步是「加入主畫面」');
  ok(sheet.body.indexOf('全螢幕') >= 0, '附註說明「從捷徑開是全螢幕」');
  ok(sheet.inView === true, '卡片完整落在畫面內（不被切掉）', sheet.h + 'px');
  await shot('v46-3-ios-hint.png');
  // 點卡片外面關掉
  await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 8, y: 8, button: 'left', clickCount: 1 });
  await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 8, y: 8, button: 'left', clickCount: 1 });
  await sleep(200);
  ok((await evalJs(`document.getElementById('pwaSheet').classList.contains('hide')`)) === true,
    '點卡片外面可以關掉');

  console.log('\n=== 7. 已經用捷徑開啟 → 一律隱藏 ===');
  await evalJs(`(function(){ BHPWA.ios = false; BHPWA.standalone = true; __BH.pwaSync(); })()`);
  await sleep(150);
  bi = await evalJs(BTN_INFO);
  ok(bi.disp === 'none' && bi.bodyOn === false, 'standalone（捷徑開啟）→ 按鈕完全隱藏', bi.disp);
  await evalJs(`(function(){ BHPWA.standalone = false; __BH.pwaSync(); })()`);
  await sleep(150);
  { const d = (await evalJs(BTN_INFO)).disp; ok(d === 'inline-flex' || d === 'flex', '恢復一般瀏覽器 → 按鈕回來', d); }

  // ================================================================
  console.log('\n=== 8. 手機橫放 844×390 ===');
  await p.resize(844, 390, true);
  await sleep(400);
  bi = await evalJs(BTN_INFO);
  ok(bi.disp === 'inline-flex' || bi.disp === 'flex', '手機橫放也看得到按鈕', bi.disp);
  ok(bi.labelDisp !== 'none', '844 寬還有空間 → 保留「下載 App」文字', bi.labelDisp);
  ok(bi.navW <= bi.navVW + 1, '工具列不溢出（844 寬）', bi.navW + '/' + bi.navVW);
  ok(bi.right <= bi.vw + 1, '按鈕右緣不出界', bi.right + '/' + bi.vw);
  ok(bi.h >= 24 && bi.h <= 40, '圖示鈕夠大可以點', bi.h + 'px');
  await shot('v46-4-mobile-land.png');

  console.log('\n=== 9. 手機直放 390×844 ===');
  await p.resize(390, 844, true);
  await sleep(400);
  bi = await evalJs(BTN_INFO);
  ok(bi.disp === 'inline-flex' || bi.disp === 'flex', '手機直放也有按鈕', bi.disp);
  ok(bi.labelDisp === 'none', '390 窄螢幕只留炸彈圖示（不擠爆工具列）', bi.labelDisp);
  ok(bi.navW <= bi.navVW + 1, '工具列不溢出（390 寬）', bi.navW + '/' + bi.navVW);
  ok(bi.right <= bi.vw + 1, '按鈕右緣不出界', bi.right + '/' + bi.vw);
  const noHScroll = await evalJs(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
  ok(noHScroll === true, '整頁沒有橫向溢出（多一顆鈕也沒撐破）');
  // 直放點下去 → iOS 引導在小螢幕上也要完整可見
  await evalJs(`(function(){ BHPWA.ios = true; BHPWA.deferred = null; })()`);
  await evalJs(`document.getElementById('btnInstall').click()`);
  await sleep(260);
  const m = await evalJs(`(function(){ const r = document.querySelector('.pwacard').getBoundingClientRect();
    return { inView: r.top >= 0 && r.bottom <= window.innerHeight + 1 && r.left >= 0 && r.right <= window.innerWidth + 1,
             w: Math.round(r.width), vw: window.innerWidth }; })()`);
  ok(m.inView === true, '小螢幕（390 寬）引導卡片也完整可見', m.w + '/' + m.vw);
  await shot('v46-5-mobile-portrait.png');
  await evalJs(`__BH.pwaHintClose(); BHPWA.ios = false;`);

  // ================================================================
  console.log('\n=== 10. 沒有把遊戲玩壞 ===');
  await p.resize(1280, 860, false);
  await sleep(300);
  // v4.7 之後版本會一直往上跳，這裡改成「讀 sw.js 的版本主號」來比對，不要再寫死
  const ver = await evalJs(`__BH.VERSION`);
  const swSrc = fs.readFileSync(path.join(ROOT_SRV, 'public', 'sw.js'), 'utf8');
  const swVer = (swSrc.match(/SW_VERSION\s*=\s*'v(\d+\.\d+)/) || [])[1];
  ok(ver === swVer, 'sw.js 快取版本的主號跟遊戲版本一致', ver + ' / ' + swVer);
  ok((await evalJs(`document.getElementById('verTxt').textContent`)) === ver, '首頁版本徽章顯示 ' + ver);
  ok(/^\d+\.\d+$/.test(ver), '__BH.VERSION 格式正確 = ' + ver);
  const boot = await evalJs(`(function(){
    const ids = ['btnSolo','btnRpg','btnBoss','btnBattle','btnOnline','btnHelp','btnSettings','btnMusic','btnSfx','btnFull'];
    return ids.filter(function (i) { return !document.getElementById(i); }).join(',');
  })()`);
  ok(boot === '', '首頁所有選單鈕都還在', boot || '全部都在');
  await evalJs(`__BH.Screen.show('solo')`);
  await sleep(300);
  ok((await evalJs(`document.getElementById('scr-solo').classList.contains('on')`)) === true,
    '還是可以正常切到「單人闖關」');
  await evalJs(`__BH.Screen.show('title')`);
  await sleep(250);
  // Service Worker 不能攔掉 API
  const apiRes = await fetch(BASE + '/api/health');
  ok(apiRes.ok && /json/.test(apiRes.headers.get('content-type') || ''),
    'API（/api/health）不受 Service Worker 影響');

  console.log('\n----------------------------------------');
  console.log((fail === 0 ? '全部通過' : '有失敗') + '：' + pass + ' 項通過、' + fail + ' 項失敗');
  try { b.close(); } catch (e) {}
  try { srv.kill(); } catch (e) {}
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
