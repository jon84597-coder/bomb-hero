// v4.30 手機版：新小怪在手機尺寸下是否看得清楚（含縮放 1x / 2x）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v430');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9498, w: 390, h: 844 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.goto(URL, 2600);
    for (let i = 0; i < 40; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await p.eval('window.__BH.startSolo(4)');
    await sleep(500);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(700);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(1000);
    const info = await p.eval(`JSON.stringify({ T: window.__BH.Game.T, R: +window.__BH.enemyArtR({r:14}).toFixed(2),
      pts: +(window.__BH.enemyArtR({r:14})*2.3).toFixed(1) })`);
    console.log('MOBILE', info);
    // 把小怪集中到玩家旁邊，方便看
    await p.eval(`(function(){ var G=window.__BH.Game,T=G.T,p=G.players[0]; var i=0;
      G.enemies.forEach(function(e){ e.x=p.x+((i%3)-1)*T*1.5; e.y=p.y-T*(1.2+Math.floor(i/3)*1.5);
      e.dirName=(i%2)?'left':'right'; e.dirT=99; e.aggro=false; i++; }); })()`);
    await sleep(700);
    await p.shot(path.join(OUT, 'm-phone.png'));
    await p.eval("(function(){ var G=window.__BH.Game; G.zoom=2; G.zoomTarget=2; G.camSnap=true; })()");
    await sleep(800);
    await p.shot(path.join(OUT, 'm-phone-zoom.png'));
    console.log('DONE');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
