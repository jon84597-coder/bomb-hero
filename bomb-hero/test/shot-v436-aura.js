// test/shot-v436-aura.js — v4.36：元素特效近距離檢查（把 8 隻不同元素的小怪排一排）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v436aura');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9585, w: 1000, h: 640 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 640, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 3000);
    for (let i = 0; i < 70; i++) { if (await p.eval('!!(window.__BH&&window.__BH.FoeArt)')) break; await sleep(250); }
    for (let i = 0; i < 40; i++) { if (await p.eval('window.__BH.FoeArt.readyCount()>=48')) break; await sleep(250); }
    await p.eval('window.__BH.startSolo(5, false)');
    await sleep(400);
    await p.eval("(function(){var ov=document.getElementById('ovBox');var b2=ov&&ov.querySelector('button');if(b2)b2.click();})()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
    const info = await p.eval(`(function(){
      var P=window.__BH, G=P.Game, T=G.T, h=G.players[0];
      h.invuln=9999; h.hurtT=0; h.expr=null;
      G.enemies.length=0;
      // 找一塊空地：玩家站 (cx,cy)，八隻排在周圍
      var cx=Math.max(3,Math.min(G.cols-6,Math.floor(h.x/T)));
      var cy=Math.max(3,Math.min(G.rows-4,Math.floor(h.y/T)));
      h.x=cx*T+T/2; h.y=cy*T+T/2;
      var list=['frog','crystal','jelly','imp','seal','rockling','thunder','lavaslime'];
      list.forEach(function(id,i){
        var e=P.makeEnemy(cx+i, cy-1, id, 1, 1);
        e.aggro=false; e.dirName='down'; e.x=cx*T+T/2+i*T; e.y=cy*T+T/2;
        e.speed=0;
        G.enemies.push(e);
      });
      G.zoom=1.9; G.zoomTarget=1.9; G.camSnap=true;
      return JSON.stringify({cx:cx,cy:cy,T:T,foes:G.enemies.length});
    })()`);
    console.log('setup', info);
    // 凍結敵人移動，讓特效清楚
    await p.eval("window.__BH.Game.enemies.forEach(function(e){e.speed=0;e.hp=99;e.maxHp=99;});");
    await sleep(900);
    await p.shot(path.join(OUT, 'aura.png'));
    console.log('shot ok');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
