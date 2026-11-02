// v4.27 交付用截圖：投擲越牆落地 / 58% 全場 / 185% 放大
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v427');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9471, w: 1000, h: 780 });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 780, deviceScaleFactor: 2, mobile: false });
  await p.goto(URL, 2600);
  for (let i = 0; i < 40; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
  await p.eval('window.__BH.startSolo(1)');
  await sleep(500);
  await p.eval("(function(){var b=document.querySelector('#ovBox button'); if(b)b.click();})()");
  for (let i = 0; i < 60; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }

  // ---- 1) 投擲越牆：右邊兩格硬牆，炸彈落在牆後 ----
  const r1 = await p.eval(`(function(){
    var P=window.__BH,G=P.Game,pl=G.players[0];
    var spot=null;
    for (var y=1;y<G.rows-1 && !spot;y++)
      for (var x=1;x<G.cols-6;x++){
        var free=true;
        for (var k=1;k<=5;k++) if (P.cellAt(x+k,y)!==0) free=false;
        if (free) { spot={x:x,y:y}; break; }
      }
    if (!spot) return 'none';
    G.enemies.length=0; G.bombs.length=0;
    G.grid[spot.y][spot.x+1]=1;      // 兩格硬牆
    G.grid[spot.y][spot.x+2]=1;
    pl.x=spot.x*G.T+G.T/2; pl.y=spot.y*G.T+G.T/2; pl.facing='right';
    pl.throwCd=0; pl.invuln=0;
    var okk=P.throwBomb(pl);
    G.doorT=0; try{P.hideDoorHint&&P.hideDoorHint();}catch(e){}
    G.gameT=2.2; G.camSnap=true; P.updateCamera(0.016);
    try{P.render();}catch(e){}
    return JSON.stringify({spot:spot, threw:okk, land:G.bombs[0]?{x:G.bombs[0].cx,y:G.bombs[0].cy}:null});
  })()`);
  console.log('THROW', r1);
  await sleep(1400);          // 等「GO!」與提示卡淡出
  await p.eval(`(function(){
    var P=window.__BH,G=P.Game;
    try{P.hideDoorHint&&P.hideDoorHint();}catch(e){}
    G.players[0].invuln=0; G.gameT=3.4; G.camSnap=true; P.updateCamera(0.016); P.render();
  })()`);
  await sleep(350);
  await p.shot(path.join(OUT, 'v427-throw.png'));

  // ---- 2) 58%：整個場地一次看完 ----
  const r2 = await p.eval(`(function(){
    var P=window.__BH,G=P.Game;
    P.Zoom.set(P.Zoom.min);
    for(var i=0;i<240;i++) P.Zoom.tick(1/60);
    G.players[0].invuln=0; G.camSnap=true; P.updateCamera(0.016); P.render();
    return JSON.stringify({z:G.zoom});
  })()`);
  console.log('ZOOM58', r2);
  await sleep(300);
  await p.shot(path.join(OUT, 'v427-zoom58.png'));

  // ---- 3) 185%：放大看細節 ----
  const r3 = await p.eval(`(function(){
    var P=window.__BH,G=P.Game;
    P.Zoom.set(P.Zoom.max);
    for(var i=0;i<240;i++) P.Zoom.tick(1/60);
    G.players[0].invuln=0; G.camSnap=true; P.updateCamera(0.016); P.render();
    return JSON.stringify({z:G.zoom});
  })()`);
  console.log('ZOOM185', r3);
  await sleep(300);
  await p.shot(path.join(OUT, 'v427-zoom185.png'));
  await b.close();
})();
