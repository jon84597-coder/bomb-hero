// v4.31：第 2 大關（沙漠遺跡）實戰截圖 —— 新小怪在場景裡的大小與可讀性
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v431');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const STAGE = parseInt(process.argv[2] || '5', 10);

(async () => {
  const b = await launch({ port: 9520, w: 1000, h: 700 });
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
    await sleep(900);
    await p.shot(path.join(OUT, 's2-play1x.png'));

    await p.eval(`(function(){ var G=window.__BH.Game,T=G.T,p=G.players[0]; var i=0;
      G.enemies.forEach(function(e){ e.x=p.x+((i%3)-1)*T*1.7; e.y=p.y-T*(1.5+Math.floor(i/3)*1.7);
        e.dirName=(i%2)?'left':'right'; e.dirT=99; e.aggro=false; i++; });
      G.zoom=2; G.zoomTarget=2; G.camSnap=true; })()`);
    await sleep(900);
    await p.shot(path.join(OUT, 's2-play2x.png'));
    const list = await p.eval("JSON.stringify(window.__BH.Game.enemies.map(function(e){return e.spec+':'+e._faceS;}))");
    console.log('FACES', list);
    console.log('DONE');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
