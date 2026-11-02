// v4.31：真正的第 2 關混戰畫面（不搬動小怪），1x 與 2x 各一張
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v431');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const STAGE = parseInt(process.argv[2] || '5', 10);
const TAG = process.argv[3] || 's2';

(async () => {
  const b = await launch({ port: 9524, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2800);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await p.eval('window.__BH.startSolo(' + STAGE + ')');
    await sleep(700);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(400);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    // 等小怪自己走過來
    for (let i = 0; i < 12; i++) {
      const n = await p.eval("(function(){var G=window.__BH.Game,T=G.T,pl=G.players[0];return G.enemies.filter(function(e){return Math.hypot(e.x-pl.x,e.y-pl.y)<T*4;}).length;})()");
      if (n >= 3) break;
      await sleep(500);
    }
    await p.shot(path.join(OUT, TAG + '-real1x.png'));
    await p.eval("(function(){var G=window.__BH.Game; G.zoom=2; G.zoomTarget=2; G.camSnap=true;})()");
    await sleep(700);
    await p.shot(path.join(OUT, TAG + '-real2x.png'));
    console.log('DONE');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
