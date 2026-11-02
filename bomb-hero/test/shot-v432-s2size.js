// v4.31：把 6 隻新小怪擺在玩家周圍的空地上，看清楚大小與面向（遊戲內實際繪製）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v432');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const STAGE = parseInt(process.argv[2] || '5', 10);
const ZOOM = parseFloat(process.argv[3] || '1.6');
const PNG = process.argv[4] || 'showcase.png';

(async () => {
  const b = await launch({ port: 9538, w: 1000, h: 700 });
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
      var cols=G.cols, rows=G.rows, hx=Math.floor(h.x/T), hy=Math.floor(h.y/T);
      // 從玩家 BFS 找最近的空地，依序擺 6 隻（左右各一排）
      var seen={}, q=[[hx,hy]], order=[];
      seen[hx+','+hy]=1;
      while(q.length){
        var c=q.shift(), cx=c[0], cy=c[1];
        if (G.grid[cy][cx]===0 && !(cx===hx&&cy===hy)) order.push([cx,cy]);
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(m){
          var nx=cx+m[0], ny=cy+m[1], k=nx+','+ny;
          if(nx<1||ny<1||nx>=cols-1||ny>=rows-1) return;
          if(seen[k]) return; if(G.grid[ny][nx]!==0) return;
          seen[k]=1; q.push([nx,ny]);
        });
      }
      // 只留「玩家附近 3 格內」的，排成 3 欄
      var near=order.filter(function(c){ return Math.abs(c[0]-hx)<=2 && Math.abs(c[1]-hy)<=2; });
      var want=['mummy','dune','crab','scorp','mummy','dune'];
      G.enemies.length=0;
      want.forEach(function(id,i){
        var pos=near[i] || near[near.length-1];
        if(!pos) return;
        var e=BH.makeEnemy(pos[0], pos[1], id, ${STAGE}, 1);   // makeEnemy 吃的是格子座標
        e.dirName = (i%2)?'left':'right'; e.dirT=99; e.aggro=false; e.hp=999;
        G.enemies.push(e);
      });
      G.zoom=${ZOOM}; G.zoomTarget=${ZOOM}; G.camSnap=true;
      return JSON.stringify({ n:G.enemies.length, T:T, near:near.length });
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
