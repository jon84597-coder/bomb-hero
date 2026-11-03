// v4.52 診斷④：對戰模式（startBattle）推車炸彈 × 輸送帶
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));

(async () => {
  const b = await launch({ port: 9636, w: 1280, h: 900 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 3200);
    for (let i = 0; i < 60; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
      await sleep(300);
    }
    await p.eval('window.__BH.startBattle()');
    await sleep(700);
    const R = await p.eval(`(function(){
      var BH=window.__BH,G=BH.Game,T=G.T,out={mode:G.mode,T:T,cols:G.cols,rows:G.rows,players:G.players.length};
      out.hasCart = G.players.map(function(p){return !!p.onCart;});
      // 場上有沒有輸送帶
      var belts=0;
      for(var y=0;y<G.rows;y++){ var row=G.hazards[y]||[]; for(var x=0;x<G.cols;x++){ var h=row[x]; if(h&&h.type==='convey') belts++; } }
      out.belts=belts;
      function step(n){ for(var i=0;i<n;i++) BH.updateWorld(1/60); }
      var pl=G.players[0]; pl.alive=true; pl.dizzy=0; pl.skull=null; pl.invuln=999;
      // 強制造一條往下帶，從上邊框丟到 (7,3)
      for(var x=0;x<G.cols;x++) for(var y=0;y<G.rows;y++){ if(x&&y&&x<G.cols-1&&y<G.rows-1){ G.grid[y][x]=0; G.hazards[y][x]=null; } }
      G.bombs.length=0;
      for(var y=1;y<=10;y++) G.hazards[y][7]={type:'convey',dir:'down'};
      pl.x=(7.5)*T; pl.y=(0.5)*T;
      var ok=BH.cartThrowBomb(pl,2);
      var bm=G.bombs[G.bombs.length-1];
      out.throw={ok:ok,cx:bm&&bm.cx,cy:bm&&bm.cy,flying:!!(bm&&bm.flying)};
      var tr=[];
      for(var k=0;k<16;k++){ step(15); tr.push((bm.cx)+','+(bm.cy)+(bm.flying?'F':'')+' acc'+Math.round(bm.beltAcc||0)+' tl'+bm.timer.toFixed(1)); if(G.bombs.indexOf(bm)<0){tr.push('EXPLODED');break;} }
      out.trace=tr;
      // 帶子方向指向外框（左邊界）的情況
      G.bombs.length=0;
      for(var i=0;i<G.cols;i++) G.hazards[6][i]={type:'convey',dir:'left'};
      pl.x=(0.5)*T; pl.y=(6.5)*T;
      pl.x=(3.5)*T;
      BH.placeBomb(pl);
      var b3=G.bombs[G.bombs.length-1];
      var t3=[];
      for(var k2=0;k2<10;k2++){ step(20); t3.push(b3.cx+','+b3.cy+' acc'+Math.round(b3.beltAcc||0)); if(G.bombs.indexOf(b3)<0)break; }
      out.edge=t3;
      return out;
    })()`);
    console.log(JSON.stringify(R, null, 1));
  } finally { b.close(); }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
