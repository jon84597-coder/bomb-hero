// test/diag-v413-admin.js — 重現「電腦版登入後開發者後台空白」
//   起一台乾淨伺服器（temp data dir）→ 註冊開發者帳號 → 登入 → 開後台 → 看畫面
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cdp = require('./cdp');

const ROOT_SRV = path.join(__dirname, '..', '..', 'bomberman-online');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-admin-'));
const PORT = 3355;
const DEV_EMAIL = 'jon84597@gmail.com';
const DEV_PW = 'AdminTest123!';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}

const srv = spawn(process.execPath, ['server.js'], {
  cwd: ROOT_SRV,
  env: Object.assign({}, process.env, {
    PORT: String(PORT), BH_DATA_DIR: DATA, BH_AUTH_SECRET: 'admin-diag-secret', BH_FORCE_HTTPS: '0'
  }),
  stdio: ['ignore', 'pipe', 'pipe']
});
srv.stdout.on('data', () => {});
srv.stderr.on('data', d => { const s = String(d); if (/Error/.test(s)) console.error('[srv]', s.trim()); });

(async () => {
  // 等伺服器起來
  let up = false;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/api/health', { signal: AbortSignal.timeout(500) });
      if (r.ok) { up = true; break; }
    } catch (e) {}
    await sleep(150);
  }
  if (!up) { console.error('server not up'); srv.kill(); process.exit(1); }
  console.log('server up\n');

  // 註冊開發者帳號
  const reg = await fetch('http://127.0.0.1:' + PORT + '/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: DEV_EMAIL, pw: DEV_PW, name: 'Dev' })
  }).then(r => r.json());
  console.log('register →', JSON.stringify(reg).slice(0, 160));
  ok(reg.ok === true, '開發者帳號註冊成功');

  // 登入
  const login = await fetch('http://127.0.0.1:' + PORT + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: DEV_EMAIL, pw: DEV_PW })
  }).then(r => r.json());
  ok(login.ok === true, '登入成功');
  ok(login.account && login.account.dev === true, '帳號帶有 dev 標記', login.account && login.account.dev);

  // 後台 API
  const ov = await fetch('http://127.0.0.1:' + PORT + '/api/admin/overview', {
    headers: { Cookie: login._setCookie || '' }
  });
  console.log('admin overview (no cookie) →', ov.status);

  // ── 用瀏覽器實際走一遍 ──
  const br = await cdp.launch({ w: 1280, h: 900, port: 9361 });
  const page = await br.newPage();
  await page.goto('http://127.0.0.1:' + PORT + '/', 1500);

  // 在頁面裡註冊＋登入（用 fetch，會帶 cookie）
  const inPage = await page.eval(`(function(){
    return fetch('/api/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id:'${DEV_EMAIL}', pw:'${DEV_PW}'}), credentials:'same-origin'
    }).then(function(r){ return r.json(); });
  })()`);
  ok(inPage && inPage.ok === true, '瀏覽器內登入成功', inPage && inPage.ok);
  ok(inPage && inPage.account && inPage.account.dev === true, '瀏覽器內帳號 isDev=true');

  // 重新載入 → 讓前端拿到登入狀態
  await page.goto('http://127.0.0.1:' + PORT + '/', 1500);

  const state = await page.eval(`(function(){
    return {
      acc: (window.__BH && window.__BH.Cloud) ? !!window.__BH.Cloud.acc() : 'no Cloud.acc',
      isDev: (window.__BH && window.__BH.Cloud) ? window.__BH.Cloud.isDev() : 'no isDev',
      hasModal: !!document.getElementById('bhModal'),
      modalCls: (document.getElementById('bhModal')||{}).className
    };
  })()`);
  console.log('  前端狀態：' + JSON.stringify(state));
  ok(state.isDev === true, '前端 Cloud.isDev() 為 true');

  // 直接呼叫 Admin.open()
  const opened = await page.eval(`(function(){
    try {
      var r = window.__BH.Admin.open();
      return { ok: r, err: null };
    } catch(e) { return { ok: false, err: String(e && e.message || e) }; }
  })()`);
  console.log('  Admin.open() → ' + JSON.stringify(opened));
  ok(opened.ok === true, 'Admin.open() 回傳 true', opened.err);

  await sleep(1400);

  const dom = await page.eval(`(function(){
    var m = document.getElementById('bhModal');
    var card = m ? m.querySelector('.bhcard') : null;
    var stats = document.getElementById('bhStats');
    var list = document.getElementById('bhList');
    function vis(el){ if(!el) return 'MISSING';
      var r = el.getBoundingClientRect(); var cs = getComputedStyle(el);
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top),
               left: Math.round(r.left), display: cs.display, visibility: cs.visibility,
               opacity: cs.opacity, overflow: cs.overflow, children: el.children.length };
    }
    return {
      modal: vis(m), card: vis(card), stats: vis(stats), list: vis(list),
      statsHTML: stats ? stats.innerHTML.slice(0,120) : '-',
      listHTML: list ? list.innerHTML.slice(0,120) : '-',
      winW: window.innerWidth, winH: window.innerHeight,
      bodyCls: document.body.className
    };
  })()`);
  console.log('  DOM：' + JSON.stringify(dom, null, 1).replace(/\n\s*/g, ' '));
  ok(dom.modal && dom.modal.display !== 'none', '後台 modal 有顯示');
  ok(dom.card && dom.card.w > 100 && dom.card.h > 100, '後台卡片有尺寸', dom.card && (dom.card.w + 'x' + dom.card.h));
  ok(dom.stats && dom.stats.children > 0, '統計區有內容', dom.stats && dom.stats.children);
  ok(dom.list && dom.list.children > 0, '列表區有內容', dom.list && dom.list.children);

  await page.shot(path.join(__dirname, '_v413-admin.png'));
  console.log('  saved _v413-admin.png');

  await br.close();
  srv.kill();
  console.log('\n' + (fail === 0 ? '全部通過：' + pass : '✗ ' + fail + ' 項失敗（通過 ' + pass + '）'));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FAILED', e); srv.kill(); process.exit(1); });
