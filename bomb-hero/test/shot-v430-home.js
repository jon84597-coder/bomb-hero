// v4.30：首頁版號目檢
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v430');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = process.argv[2] || 'https://bomb-hero-game.onrender.com/';
(async () => {
  const b = await launch({ port: 9504, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 4200);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(400); }
    await sleep(1500);
    await p.shot(path.join(OUT, 'home.png'));
    const t = await p.eval("document.getElementById('verTxt') ? document.getElementById('verTxt').textContent : '?'");
    console.log('verTxt =', t);
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
