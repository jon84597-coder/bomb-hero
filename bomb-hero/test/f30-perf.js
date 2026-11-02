// 比較新舊版在手機尺寸下的平均帧時間（小怪貼圖 vs 程式繪圖）
const path = require('path');
const { launch, sleep } = require('./cdp');
const FILE = process.argv[2] || path.resolve(__dirname, '../index.html');
const URL = 'file:///' + path.resolve(FILE).replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9500, w: 390, h: 844 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await p.goto(URL, 2600);
    for (let i = 0; i < 40; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await p.eval('window.__BH.startSolo(4)');
    await sleep(500);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(600);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(800);
    const r = await p.eval(`new Promise(function(res){
      var n=0, t0=0, t1=0;
      function tick(t){ if(!t0){t0=t;} n++; t1=t;
        if(t-t0 < 3000) requestAnimationFrame(tick);
        else res(JSON.stringify({ frames:n, ms:Math.round(t1-t0), avg:+( (t1-t0)/n ).toFixed(2), enemies:window.__BH.Game.enemies.length }));
      }
      requestAnimationFrame(tick);
    })`, true);
    console.log(path.basename(FILE), r);
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
