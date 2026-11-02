// v4.30 收尾：真實瀏覽器 —— 開機錯誤、圖鑑新小怪、第一關實戰畫面
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v430');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9496, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2800);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await sleep(1200);
    const diag = await p.eval(`JSON.stringify({
      errs: (window.__BHB && window.__BHB.errs || []).length,
      first: (window.__BHB && window.__BHB.errs && window.__BHB.errs[0]) ? String(window.__BHB.errs[0]) : '',
      bootFail: !!document.querySelector('#bootDiag.show'),
      ver: window.__BH.VERSION,
      ready: window.__BH.FoeArt.readyCount()
    })`);
    console.log('DIAG', diag);

    // 圖鑑 → 怪物分頁
    await p.eval("(function(){ var b=document.getElementById('btnHelp'); if(b) b.click(); })()");
    await sleep(900);
    await p.eval("(function(){ var t=document.querySelector('[data-ht=foe]'); if(t) t.click(); })()");
    await sleep(1200);
    await p.shot(path.join(OUT, 'f-codex.png'));

    // 關掉說明，進第 4 小關實戰
    await p.eval("(function(){ var x=document.querySelector('#helpBox .x, #helpBox .close, #helpClose'); if(x) x.click(); })()");
    await sleep(500);
    await p.eval('window.__BH.startSolo(4)');
    await sleep(700);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(400);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(1200);
    await p.shot(path.join(OUT, 'g-play1x.png'));

    await p.eval("(function(){ var G=window.__BH.Game; G.zoom=1.8; G.zoomTarget=1.8; G.camSnap=true; })()");
    await sleep(900);
    await p.shot(path.join(OUT, 'h-play18.png'));
    console.log('DONE');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
