// v4.33：說明書「坐騎招式」分頁 —— 新坐騎圖在小畫布裡有沒有爆框
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v433');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9560, w: 1000, h: 900 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 900, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 3000);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.MountArt)')) break; await sleep(300); }
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.MountArt.readyCount()>=2")) break; await sleep(250); }
    await p.eval("window.__BH.Screen.show('help')");
    await sleep(600);
    const r = await p.eval(`(function(){
      var btns=[].slice.call(document.querySelectorAll('#helpTabs button, .helptabs button, [data-tab]'));
      var hit=null;
      btns.forEach(function(b){ if(/坐騎/.test(b.textContent)) hit=b; });
      if(hit){ hit.click(); return hit.textContent.trim(); }
      return 'nohit:'+btns.map(function(b){return b.textContent.trim();}).slice(0,10).join('/');
    })()`);
    console.log('tab', r);
    await sleep(900);
    await p.shot(path.join(OUT, 'help-mount.png'));
    console.log('saved');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
