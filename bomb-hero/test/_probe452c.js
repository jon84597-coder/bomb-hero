// v4.52 診斷③：推車炸彈落在帶子上到底會不會被帶走（拉長到 5 秒）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));

(async () => {
  const b = await launch({ port: 9635, w: 1280, h: 900 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 3200);
    for (let i = 0; i < 60; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
      await sleep(300);
    }
    await p.eval('window.__BH.startSolo(1)');
    await sleep(600);

    const R = await p.eval(`(function(){
      var BH=window.__BH,G=BH.Game,T=G.T,out={T:T,cols:G.cols,rows:G.rows};
      function clear(){
        for(var x=0;x<G.cols;x++) for(var y=0;y<G.rows;y++){
          if(x===0||y===0||x===G.cols-1||y===G.rows-1){ G.grid[y][x]=1; continue; }
          G.grid[y][x]=0; G.hazards[y][x]=null;
        }
      }
      function step(n){ for(var i=0;i<n;i++) BH.updateWorld(1/60); }
      var pl=G.players[0]; pl.alive=true; pl.dizzy=0; pl.skull=null; pl.invuln=999;
      clear(); G.bombs.length=0; G.enemies.length=0;
      for(var y=1;y<=10;y++) G.hazards[y][7]={type:'convey',dir:'down'};
      pl.x=(7.5)*T; pl.y=(0.5)*T;
      BH.cartThrowBomb(pl,2);
      var b2=G.bombs[G.bombs.length-1];
      var tr=[];
      for(var k=0;k<20;k++){
        step(15);
        tr.push('t'+ (k*0.25+0.25).toFixed(2) +' '+(b2.cx)+','+(b2.cy)+(b2.flying?'F':'')+' acc'+Math.round(b2.beltAcc||0)+' hz'+((G.hazards[b2.cy]&&G.hazards[b2.cy][b2.cx]||{}).dir||'-')+' tl'+b2.timer.toFixed(1));
        if(G.bombs.indexOf(b2)<0){ tr.push('EXPLODED'); break; }
      }
      out.trace=tr;
      return out;
    })()`);
    console.log(JSON.stringify(R, null, 1));
  } finally { b.close(); }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
