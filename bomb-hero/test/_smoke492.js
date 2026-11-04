// test/_smoke492.js — v4.92：三種入口的實機截圖（桌機點版本號／手機點版本號）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp.js');

(async () => {
  const b = await launch({ w: 1280, h: 900 });
  const url = 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/');

  // ---- 桌機 ----
  const d = await b.newPage();
  await d.goto(url + '?cb=' + Date.now(), 1600);
  for (let i = 0; i < 80; i++) { if (await d.eval('typeof __BH') === 'object') break; await sleep(250); }
  await sleep(700);
  await d.eval(`(function(){ const v=document.getElementById('verTxt').parentNode; v.click(); v.click(); v.click(); return 1; })()`);
  await sleep(900);
  await d.shot(path.join(__dirname, '_smoke492-desktop-tap3.png'));

  // ---- 手機 ----
  const m = await b.newPage();
  await m.resize(390, 844, true);
  await m.goto(url + '?cb=' + Date.now(), 1600);
  for (let i = 0; i < 80; i++) { if (await m.eval('typeof __BH') === 'object') break; await sleep(250); }
  await sleep(700);
  await m.shot(path.join(__dirname, '_smoke492-mobile-before.png'));
  await m.eval(`(function(){ const v=document.getElementById('verTxt').parentNode; v.click(); v.click(); v.click(); return 1; })()`);
  await sleep(1100);
  await m.shot(path.join(__dirname, '_smoke492-mobile-admin.png'));

  const size = await m.eval(`JSON.stringify({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })`);
  console.log('手機寬度檢查', size);

  // ---- 模擬「沒登入」（401 NO_SESSION）→ 應顯示登入說明，而不是一片空白 ----
  const notice = await m.eval(`(function(){
    const real = window.fetch;
    window.fetch = function(u, o){
      const s = String(u && u.url ? u.url : u);
      if (s.indexOf('/api/admin/') >= 0) {
        return Promise.resolve(new Response(JSON.stringify({ok:false,err:'NO_SESSION'}), {status:401, headers:{'Content-Type':'application/json'}}));
      }
      return Promise.resolve(new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}}));
    };
    return __BH.Admin.refresh().then(function(){
      window.fetch = real;
      return {
        loginBox: !!document.querySelector('.adlogin'),
        btn: (document.querySelector('.adlogin button')||{}).textContent || '',
        warn: (document.getElementById('adWarn')||{}).textContent || ''
      };
    });
  })()`);
  console.log('登入提示', JSON.stringify(notice));
  await sleep(400);
  await m.shot(path.join(__dirname, '_smoke492-need-login.png'));

  b.close();
  console.log('done');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
