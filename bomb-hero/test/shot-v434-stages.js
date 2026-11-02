// v4.34：第 5~8 大關實戰截圖（每關一張 2x），最後拼成一張對照圖
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v434');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const STAGES = [17, 21, 25, 29];

(async () => {
  const b = await launch({ port: 9572, w: 1100, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 3000);
    for (let i = 0; i < 70; i++) { if (await p.eval('!!(window.__BH&&window.__BH.FoeArt)')) break; await sleep(300); }
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.FoeArt.readyCount()>=48")) break; await sleep(250); }
    console.log('ready', await p.eval('window.__BH.FoeArt.readyCount()'));
    for (const st of STAGES) {
      await p.eval('window.__BH.startSolo(' + st + ')');
      await sleep(500);
      await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
      await sleep(300);
      await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
      for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
      await sleep(700);
      const info = await p.eval(`(function(){
        var G=window.__BH.Game, h=G.players[0];
        h.invuln=0; h.hurtT=0; h.expr=null;
        G.zoom=2.0; G.zoomTarget=2.0; G.camSnap=true;
        return JSON.stringify({st:G.stage, theme:G.theme&&G.theme.name, foes:G.enemies.map(function(e){return e.spec;})});
      })()`);
      console.log(st, info);
      await sleep(700);
      await p.shot(path.join(OUT, 's' + st + '.png'));
    }
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
