// v4.33：主角（再縮 10%）與第 4 關小怪的體型對照
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v433');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9566, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 3000);
    for (let i = 0; i < 70; i++) { if (await p.eval('!!(window.__BH&&window.__BH.FoeArt)')) break; await sleep(300); }
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.FoeArt.readyCount()>=24")) break; await sleep(250); }
    await p.eval('window.__BH.startSolo(13)');
    await sleep(700);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(400);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(600);
    console.log(await p.eval(`(function(){
      var BH=window.__BH, G=BH.Game, T=G.T, h=G.players[0];
      G.enemies.length=0;
      h.invuln=0; h.cry=0; h.hurtT=0; h.alive=true; h.moving=false; h.facing='right';
      var cols=G.cols, rows=G.rows, best=null;
      for(var ry=2;ry<rows-2;ry++){ for(var rx=2;rx<cols-6;rx++){
        var ok=true;
        for(var k=0;k<5;k++){ if(G.grid[ry][rx+k]!==0 || G.grid[ry-1][rx+k]!==0) ok=false; }
        if(ok && !best) best=[rx,ry];
      }}
      if(!best){ best=[3,3]; }
      h.x=best[0]*T+T/2; h.y=best[1]*T+T/2;
      var ids=['lavaslime','rockling','bee','bomber'];
      var offs=[[1,0],[2.2,0],[3.6,-.55],[4.8,0]];
      ids.forEach(function(id,i){
        var e=BH.makeEnemy(best[0]+offs[i][0], best[1]+offs[i][1], id, 13, 1);
        e.dirName='left'; e.dirT=99; e.aggro=false; e.hp=999;
        G.enemies.push(e);
      });
      G.zoom=2.1; G.zoomTarget=2.1; G.camSnap=true;
      return JSON.stringify({T:T, ex:G.enemies.map(function(e){return e.type+' '+Math.round(e.x)+','+Math.round(e.y);})});
    })()`));
    await sleep(800);
    await p.shot(path.join(OUT, 'compare.png'));
    console.log('saved');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
