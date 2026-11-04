// test/diag-v413b.js — 走「真的點擊」路徑：登入 → 開帳號視窗 → 點後台鈕 → 看結果
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cdp = require('./cdp');

const ROOT_SRV = path.join(__dirname, '..', '..', 'bomberman-online');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-admin2-'));
const PORT = 3366;
const DEV_EMAIL = 'jon84597@gmail.com';
const DEV_PW = 'AdminTest123!';
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const srv = spawn(process.execPath, ['server.js'], {
  cwd: ROOT_SRV,
  env: Object.assign({}, process.env, {
    PORT: String(PORT), BH_DATA_DIR: DATA, BH_AUTH_SECRET: 'admin2-secret', BH_FORCE_HTTPS: '0'
  }),
  stdio: ['ignore', 'pipe', 'pipe']
});
srv.stdout.on('data', () => {});
srv.stderr.on('data', d => { const s = String(d); if (/Error/.test(s)) console.error('[srv]', s.trim()); });

(async () => {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/api/health', { signal: AbortSignal.timeout(500) }); if (r.ok) break; } catch (e) {}
    await sleep(150);
  }
  await fetch('http://127.0.0.1:' + PORT + '/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: DEV_EMAIL, pw: DEV_PW, name: 'Dev' })
  });

  const br = await cdp.launch({ w: 1280, h: 900, port: 9363 });
  const page = await br.newPage();
  // 攔截 console 錯誤
  await page.send('Runtime.enable');
  await page.goto('http://127.0.0.1:' + PORT + '/', 1600);

  // 登入
  await page.eval(`(function(){
    return fetch('/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id:'${DEV_EMAIL}',pw:'${DEV_PW}'}),credentials:'same-origin'}).then(r=>r.json());
  })()`);
  await page.goto('http://127.0.0.1:' + PORT + '/', 1600);

  // 開帳號視窗（模擬使用者點工具列的帳號鈕）
  const opened = await page.eval(`(function(){
    var btn = document.querySelector('[data-acct-open], #btnAcct, .navbtn[data-go="acct"]');
    if (btn) { btn.click(); return 'clicked ' + btn.id; }
    // 找 Cloud.open
    try { window.__BH.Cloud.open(); return 'Cloud.open()'; } catch(e){ return 'ERR '+e.message; }
  })()`);
  console.log('開帳號視窗：' + opened);
  await sleep(700);

  const modalState = await page.eval(`(function(){
    var m = document.getElementById('acctModal');
    var body = document.getElementById('acctBody');
    var adminBtn = document.querySelector('[data-acct="admin"]');
    return {
      modalCls: m ? m.className : 'MISSING',
      modalDisplay: m ? getComputedStyle(m).display : '-',
      bodyLen: body ? body.innerHTML.length : -1,
      bodyHasAdminBtn: !!(body && body.innerHTML.indexOf('data-acct="admin"') >= 0),
      adminBtnExists: !!adminBtn,
      adminBtnText: adminBtn ? adminBtn.textContent.trim() : '-',
      isDev: window.__BH.Cloud.isDev(),
      tab: window.__BH.Cloud.acc() ? 'logged' : 'guest'
    };
  })()`);
  console.log('帳號視窗狀態：' + JSON.stringify(modalState));
  await page.shot(path.join(__dirname, '_v413-acct.png'));

  if (!modalState.adminBtnExists) {
    console.log('\n→ 沒有後台鈕！檢查 info 分頁是否被 render 出來');
  } else {
    // 真的點下去
    const before = await page.eval(`(function(){
      return { modal: document.getElementById('bhModal').className,
               acctModal: document.getElementById('acctModal').className };
    })()`);
    console.log('點擊前：' + JSON.stringify(before));

    const clickRes = await page.eval(`(function(){
      try {
        var b = document.querySelector('[data-acct="admin"]');
        b.click();
        return 'clicked';
      } catch(e) { return 'ERR ' + (e && e.message || e); }
    })()`);
    console.log('點擊結果：' + clickRes);
    await sleep(1500);

    const after = await page.eval(`(function(){
      var m = document.getElementById('bhModal');
      var card = m ? m.querySelector('.bhcard') : null;
      var r = card ? card.getBoundingClientRect() : null;
      return {
        adminModalCls: m ? m.className : 'MISSING',
        adminModalDisplay: m ? getComputedStyle(m).display : '-',
        acctModalCls: document.getElementById('acctModal').className,
        cardRect: r ? (Math.round(r.width)+'x'+Math.round(r.height)+' @'+Math.round(r.left)+','+Math.round(r.top)) : '-',
        statsChildren: (document.getElementById('bhStats')||{children:[]}).children.length,
        listChildren: (document.getElementById('bhList')||{children:[]}).children.length,
        bodyCls: document.body.className
      };
    })()`);
    console.log('點擊後：' + JSON.stringify(after));
    await page.shot(path.join(__dirname, '_v413-admin-click.png'));
  }

  await br.close();
  srv.kill();
})().catch(e => { console.error('FAILED', e); srv.kill(); process.exit(1); });
