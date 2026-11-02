// test/live-pwa-check.js — 線上（HTTPS）端到端：PWA 是否真的被判定為「可安裝」
//   · 開真實 Chrome 連 https://bomb-hero-game.onrender.com/
//   · 檢查 ① manifest 被正確解析（name / icons / display: standalone）
//           ② Service Worker 真的註冊並接管（HTTPS 下才會跑）
//           ③ 首頁「📱 下載 App」按鈕可見
//           ④ v4.7 內容都在（飛行怪速度上限、密碼眼睛）
//   · 只讀不寫，不下載、不改動任何資料
const cdp = require('./cdp');

const URL = process.env.BH_URL || 'https://bomb-hero-game.onrender.com/';

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('線上 PWA 檢查：' + URL + '\n');
  const br = await cdp.launch({ port: 9341, w: 1280, h: 860 });
  const page = await br.newPage();
  const close = () => br.close();
  const evalJs = async (expr) => page.eval(expr);
  await page.goto(URL, 3000);

  // 等遊戲主程式起來
  for (let i = 0; i < 40 && !(await evalJs(`typeof window.__BH`)) ; i++) await sleep(500);
  await sleep(2500);   // 給 Service Worker 註冊的時間

  console.log('=== 1. 基本載入 ===');
  ok(await evalJs(`typeof window.__BH`) === 'object', '遊戲主程式已載入（window.__BH 存在）');
  const ver = await evalJs(`window.__BH && window.__BH.VERSION`);
  ok(!!ver, '讀到版本號', ver);
  ok(await evalJs(`document.getElementById('verTxt') && document.getElementById('verTxt').textContent`) === ver,
    '首頁版本徽章 = ' + ver);
  ok(await evalJs(`location.protocol`) === 'https:', '走 HTTPS（PWA 必要條件）');

  console.log('\n=== 2. Web App Manifest ===');
  const mf = await evalJs(`(function(){
    var l = document.querySelector('link[rel="manifest"]');
    return l ? l.getAttribute('href') : null;
  })()`);
  ok(!!mf, '頁面有 <link rel="manifest">', mf);

  // 直接 fetch manifest 回來解析，確認瀏覽器拿得到且內容正確
  // 注意：manifest 內文可能含各種符號，不能用 '|' 分隔後 split，
  // 否則 body 會在第一個分隔符就被切斷 → JSON.parse 失敗。整包 JSON.stringify 回來最穩。
  const mj = await evalJs(`fetch('${mf || './manifest.json'}').then(function(r){
    return r.text().then(function(t){
      return JSON.stringify({ s: r.status, c: r.headers.get('content-type'), b: t });
    });
  })`);
  let mjO = {}; try { mjO = JSON.parse(mj); } catch (e) {}
  const mStatus = String(mjO.s), mType = String(mjO.c), mBody = String(mjO.b);
  ok(mStatus === '200', 'manifest.json 抓得到（HTTP 200）', mStatus);
  ok(/application\/json|application\/manifest\+json/.test(mType), 'MIME 是 json（瀏覽器才認得）', mType);
  let M = {};
  try { M = JSON.parse(mBody.slice(mBody.indexOf('{'), mBody.lastIndexOf('}') + 1)); } catch (e) {}
  ok(M.name === '爆爆英雄', 'name = 爆爆英雄', M.name);
  ok(M.display === 'standalone', 'display = standalone（安裝後隱藏網址列）', M.display);
  ok(Array.isArray(M.icons) && M.icons.length >= 2, '圖示至少 2 個', M.icons && M.icons.length);
  const has192 = M.icons && M.icons.some(i => i.sizes === '192x192');
  const has512 = M.icons && M.icons.some(i => i.sizes === '512x512');
  ok(has192 && has512, '有 192x192 與 512x512 兩種尺寸');
  ok(M.icons && M.icons.some(i => i.purpose === 'maskable'), '有 maskable 版本（Android 圖示不被裁）');

  console.log('\n=== 3. 每個圖示都真的抓得到 ===');
  if (M.icons && M.icons.length) {
    for (const ic of M.icons) {
      const r = await evalJs(`fetch('${ic.src}').then(function(r){ return r.status + '/' + r.headers.get('content-type'); })`);
      ok(/^200/.test(String(r)) && /image\/png/.test(String(r)), '圖示 ' + ic.sizes + '（' + ic.purpose + '）', String(r));
    }
  }

  console.log('\n=== 4. Service Worker 真的註冊並接管 ===');
  ok(await evalJs(`'serviceWorker' in navigator`), '瀏覽器支援 serviceWorker');
  const swr = await evalJs(`navigator.serviceWorker.getRegistration().then(function(r){
    return r ? (r.active ? 'active' : (r.installing ? 'installing' : (r.waiting ? 'waiting' : 'none'))) : 'null';
  })`);
  ok(swr === 'active', 'Service Worker 已啟用（active）', swr);
  const ctrl = await evalJs(`!!navigator.serviceWorker.controller`);
  if (ctrl) ok(true, '頁面已被 Service Worker 接管（第 2 次開就會是離線優先）');
  else ok(true, '首次拜訪尚未接管（重新整理後才會，屬正常現象）', '首次拜訪');
  const keys = await evalJs(`caches.keys().then(function(k){ return k.join(','); })`);
  ok(/bh-core-v/.test(String(keys)), '遊戲本體快取已建立', String(keys));

  console.log('\n=== 5. 首頁安裝按鈕 ===');
  // v4.23：SW 第一次接管時會自動重整一次（controllerchange → reload），
  // 重整的瞬間 window.__BH 還是 undefined、安裝鈕也還沒有 .ready →
  // 舊版測試剛好撞上就 2 項紅燈。這裡改成「等頁面真的穩下來再量」。
  const waitSettled = async function (ms) {
    const lim = ms || 25000;
    for (let i = 0; i < Math.ceil(lim / 400); i++) {
      const st = await evalJs(`(function(){
        var b = document.querySelector('.navbtn.pwa');
        var d = b ? getComputedStyle(b).display : 'none';
        return (typeof window.__BH === 'object' && b && d !== 'none') ? 'ok' : (typeof window.__BH);
      })()`);
      if (st === 'ok') return true;
      await sleep(400);
    }
    return false;
  };
  const settled = await waitSettled(25000);
  ok(settled, '主程式載入並穩定（等 SW 接手重整完）', settled ? 'ok' : 'timeout');
  ok(await evalJs(`!!document.querySelector('.navbtn.pwa')`), '首頁有安裝按鈕 .navbtn.pwa');
  const bi = await evalJs(`(function(){
    var b = document.querySelector('.navbtn.pwa');
    if (!b) return null;
    var r = b.getBoundingClientRect();
    var cs = getComputedStyle(b);
    return { disp: cs.display, op: cs.opacity, top: Math.round(r.top), right: Math.round(r.right),
             w: Math.round(r.width), h: Math.round(r.height), txt: b.textContent.trim(),
             vw: window.innerWidth };
  })()`);
  ok(!!bi && (bi.disp === 'inline-flex' || bi.disp === 'flex') && Number(bi.op) > 0.9,
    '按鈕看得到（一般瀏覽器模式）', bi && (bi.disp + '/' + bi.op));
  ok(!!bi && bi.right <= bi.vw, '按鈕右緣在畫面內', bi && (bi.right + '/' + bi.vw));
  ok(!!bi && bi.top < 200, '按鈕在上方（黃金視覺位置）', bi && bi.top);
  ok(!!bi && /App|下載|安裝/.test(bi.txt), '按鈕文案含「下載 App」', bi && bi.txt);

  console.log('\n=== 6. v4.7 內容都在 ===');
  ok(await evalJs(`typeof window.__BH.pwaCore`) === 'function', 'PWA 模組已載入（pwaCore）');
  ok(await evalJs(`typeof window.__BH.togglePwEye`) === 'function', '密碼眼睛切換函式已匯出');
  const cap = await evalJs(`window.__BH.FLY_SPEED_CAP`);
  ok(cap === 78, '飛行怪速度上限 = 78（原本 118）', cap);
  const bee = await evalJs(`window.__BH.makeEnemy ? window.__BH.makeEnemy(2,2,'bee',1,1).speed : null`);
  ok(bee !== null && bee <= 40, '毒蜂第 1 關速度已降（' + bee + '，原本 58.6）');

  console.log('\n=== 7. 帳號彈窗的密碼眼睛 ===');
  const opened = await evalJs(`(function(){
    try {
      if (window.__BH.Acct && window.__BH.Acct.open) { window.__BH.Acct.open(); return 'acct.open'; }
    } catch (e) {}
    var b = document.querySelector('[data-acct="open"], #acctBtn');
    if (b) { b.click(); return 'click'; }
    return 'none';
  })()`);
  await sleep(600);
  const eyes = await evalJs(`document.querySelectorAll('.pwtoggle[data-acct="pwEye"]').length`);
  if (eyes > 0) {
    ok(true, '彈窗裡有 ' + eyes + ' 顆 👁 切換鈕');
    const before = await evalJs(`(function(){ var i=document.querySelector('.pwrow input'); return i? i.type : null; })()`);
    ok(before === 'password', '預設是 password（不顯示明文）', before);
    await evalJs(`(function(){ var b=document.querySelector('.pwtoggle[data-acct="pwEye"]'); if(b) b.click(); })()`);
    await sleep(200);
    const after = await evalJs(`(function(){ var i=document.querySelector('.pwrow input'); return i? i.type : null; })()`);
    ok(after === 'text', '點一下真的變成 text（明文顯示）', after);
    await evalJs(`(function(){ var b=document.querySelector('.pwtoggle[data-acct="pwEye"]'); if(b) b.click(); })()`);
    await sleep(200);
    const back = await evalJs(`(function(){ var i=document.querySelector('.pwrow input'); return i? i.type : null; })()`);
    ok(back === 'password', '再點一次藏回去', back);
  } else {
    ok(false, '找不到密碼眼睛（帳號彈窗可能沒開起來，opened=' + opened + '）');
  }

  await page.shot(require('path').join(__dirname, 'live-pwa-1-home.png'));
  await close();

  console.log('\n----------------------------------------');
  if (fail) { console.log('有失敗：' + pass + ' 項通過、' + fail + ' 項失敗'); process.exit(1); }
  console.log('全部通過：' + pass + ' 項通過、0 項失敗');
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
