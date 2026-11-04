// test/_probe-admin2.js — 追 Admin 為什麼變成空殼
const path = require('path');
const { launch, sleep } = require('./cdp.js');

(async () => {
  const b = await launch({ w: 1280, h: 900 });
  const url = 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?cb=' + Date.now();
  const p = await b.newPage();
  await p.goto(url, 3000);
  for (let i = 0; i < 80; i++) { if (await p.eval('typeof window.__BH === "object" && !!window.__BH')) break; await sleep(300); }
  await sleep(1200);

  const out = await p.eval(`(function(){
    const R = {};
    R.hasBH = typeof window.__BH;
    R.adm = window.__BH ? Object.keys(window.__BH).slice(0,40) : null;
    const A = window.__BH && window.__BH.Admin;
    R.adminType = typeof A;
    R.adminKeys = A ? Object.keys(A) : null;
    R.openSrc = A && A.open ? String(A.open).slice(0,180) : null;
    R.isDev = A && A.isDev ? (function(){try{return A.isDev()}catch(e){return 'ERR '+e.message}})() : null;
    // 直接試 open()，看有沒有丟錯
    try { R.openRet = A && A.open ? A.open() : 'no open'; } catch(e){ R.openErr = e.message + ' :: ' + (e.stack||'').split('\\n').slice(0,4).join(' | '); }
    const m = document.getElementById('bhModal');
    R.modal = !!m; R.cls = m ? m.className : null;
    R.verTxt = !!document.getElementById('verTxt');
    return JSON.stringify(R, null, 1);
  })()`);
  console.log(out);
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
