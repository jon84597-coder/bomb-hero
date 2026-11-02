// v4.30 線上確認：小怪貼圖在正式站也載入成功、會依方向翻面
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v430');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = process.argv[2] || 'https://bomb-hero-game.onrender.com/';

(async () => {
  const b = await launch({ port: 9502, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 4000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.FoeArt)')) break; await sleep(400); }
    const boot = await p.eval(`JSON.stringify({ ver: window.__BH.VERSION, ready: window.__BH.FoeArt.readyCount(),
      keys: window.__BH.FoeArt.keys(), errs: (window.__BHB&&window.__BHB.errs||[]).length })`);
    console.log('LIVE BOOT', boot);

    await p.eval('window.__BH.startSolo(4)');
    await sleep(900);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(600);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(300); }
    await sleep(1200);
    await p.eval(`(function(){ var G=window.__BH.Game,T=G.T,p=G.players[0]; var i=0;
      G.enemies.forEach(function(e){ e.x=p.x+((i%3)-1)*T*1.5; e.y=p.y-T*(1.3+Math.floor(i/3)*1.4);
        e.dirName=(i%2)?'left':'right'; e.dirT=99; e.aggro=false; i++; });
      G.zoom=1.9; G.zoomTarget=1.9; G.camSnap=true; })()`);
    await sleep(900);
    await p.shot(path.join(OUT, 'live-foes.png'));
    const faces = await p.eval(`JSON.stringify(window.__BH.Game.enemies.map(function(e){ return e.type+':'+(e._faceS||0); }))`);
    console.log('LIVE FACES', faces);
    console.log('DONE');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
