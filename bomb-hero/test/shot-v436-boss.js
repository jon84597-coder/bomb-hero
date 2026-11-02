// test/shot-v436-boss.js — v4.36：八大關卡 BOSS 實機截圖
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v436boss');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const STAGES = [4, 8, 12, 16, 20, 24, 28, 32];

(async () => {
  const b = await launch({ port: 9583, w: 900, h: 620 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 620, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 3000);
    for (let i = 0; i < 70; i++) { if (await p.eval('!!(window.__BH&&window.__BH.BossArt)')) break; await sleep(250); }
    for (let i = 0; i < 60; i++) { if (await p.eval('window.__BH.BossArt.readyCount()>=8')) break; await sleep(250); }
    console.log('boss art ready', await p.eval('window.__BH.BossArt.readyCount()'));
    for (const st of STAGES) {
      await p.eval('window.__BH.startSolo(' + st + ', false)');
      await sleep(400);
      await p.eval("(function(){var ov=document.getElementById('ovBox');var b2=ov&&ov.querySelector('button');if(b2)b2.click();})()");
      for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
      const info = await p.eval(`(function(){
        var G=window.__BH.Game, T=G.T, h=G.players[0];
        h.invuln=0; h.hurtT=0; h.expr=null;
        var boss=G.enemies.filter(function(e){return e.boss;})[0];
        if(boss){
          var cx=Math.floor(h.x/T), cy=Math.floor(h.y/T);
          boss.x=(cx+2)*T+T/2; boss.y=cy*T+T/2; boss.dirName='left'; boss.hitT=0;
          boss.patrol=null; boss.aggro=false;
        }
        G.zoom=2.1; G.zoomTarget=2.1; G.camSnap=true;
        return JSON.stringify({st:G.stage, boss:!!boss, ch:window.__BH.bossArtKey(),
          foes:G.enemies.length, ready:window.__BH.BossArt.readyCount()});
      })()`);
      console.log(st, info);
      await sleep(600);
      await p.shot(path.join(OUT, 's' + st + '.png'));
    }
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
