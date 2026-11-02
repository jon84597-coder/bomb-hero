// v4.33：第 4 關 6 隻小怪＋主角並排，檢查尺寸與面向（主角再縮 10%）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v433');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const STAGE = parseInt(process.argv[2] || '13', 10);
const ZOOM = parseFloat(process.argv[3] || '2');
const PNG = process.argv[4] || 'scale4.png';

(async () => {
  const b = await launch({ port: 9550, w: 1000, h: 700 });
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
    await sleep(600);

    const info = await p.eval(`(function(){
      var BH=window.__BH, G=BH.Game, T=G.T, h=G.players[0];
      var cols=G.cols, rows=G.rows;
      // 找「同一列連續最多空格」的那一段，把 6 隻排成一列
      var best=null;
      for(var ry=1;ry<rows-1;ry++){
        var run=[];
        for(var rx=1;rx<cols-1;rx++){
          if(G.grid[ry][rx]===0) run.push([rx,ry]);
          else { if(!best||run.length>best.length) best=run.slice(); run=[]; }
        }
        if(!best||run.length>best.length) best=run.slice();
      }
      best=(best||[]).slice(0, 6);
      var want=['lavaslime','lavaworm','bee','bomber','lizard','rockling'];
      G.enemies.length=0;
      var step=Math.max(1, Math.floor(best.length/6));
      var picks=[];
      for(var i=0;i<6 && best.length;i++){ picks.push(best[Math.min(best.length-1, i*step)]); }
      // 玩家放在這一列下方一格
      if(best.length){ h.x=best[0][0]*T+T/2; h.y=(best[0][1]-1)*T+T/2; }
      h.invuln=0;
      want.forEach(function(id,i){
        var pos=picks[i]; if(!pos) return;
        var e=BH.makeEnemy(pos[0], pos[1], id, ${STAGE}, 1);
        e.dirName = (i%2)?'left':'right'; e.dirT=99; e.aggro=false; e.hp=999;
        G.enemies.push(e);
      });
      G.zoom=${ZOOM}; G.zoomTarget=${ZOOM}; G.camSnap=true;
      var sizes=G.enemies.map(function(e){
        var M=(window.FOE_ART||{})[e.spec]||{}; var R=BH.enemyArtR(e); var H=R*(M.hs||1.9);
        return e.spec+' '+Math.round(H*M.asp)+'x'+Math.round(H);
      });
      return JSON.stringify({ n:G.enemies.length, T:T, picks:picks.length, sizes:sizes });
    })()`);
    console.log('PLACED', info);
    await sleep(300);
    console.log('DBG', await p.eval(`JSON.stringify({
      state: window.__BH.Game.state,
      alive: window.__BH.Game.players[0].alive,
      px: Math.round(window.__BH.Game.players[0].x), py: Math.round(window.__BH.Game.players[0].y),
      cam: [Math.round(window.__BH.Game.camX||0), Math.round(window.__BH.Game.camY||0)],
      en: window.__BH.Game.enemies.map(function(e){ return e.spec+'@'+Math.round(e.x)+','+Math.round(e.y)+(e.dead?'x':''); })
    })`));
    await sleep(600);
    await p.shot(path.join(OUT, PNG));
    console.log('saved', PNG);
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
