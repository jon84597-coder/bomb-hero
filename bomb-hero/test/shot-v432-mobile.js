// v4.32 手機：第 3 關小怪在手機尺寸下是否看得清楚（含主角縮小後的比例）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v432');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9542, w: 390, h: 844 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.goto(URL, 2800);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await p.eval('window.__BH.startSolo(9)');
    await sleep(600);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(600);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(1000);
    const info = await p.eval(`JSON.stringify({ T: window.__BH.Game.T, R: +window.__BH.enemyArtR({r:14}).toFixed(2), grow: window.__BH.ENEMY_ART_GROW })`);
    console.log('MOBILE', info);
    await p.shot(path.join(OUT, 'm-s2.png'));
    console.log('DONE');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
