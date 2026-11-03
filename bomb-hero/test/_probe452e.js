// v4.52 診斷⑤：真對戰地圖（有輸送帶的主題）→ 把炸彈放到帶子上看會不會動
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));

(async () => {
  const b = await launch({ port: 9637, w: 1280, h: 900 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 3200);
    for (let i = 0; i < 60; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
      await sleep(300);
    }
    const R = await p.eval(`(function(){
      var BH=window.__BH,G=BH.Game,T=G.T,out={rounds:[]};
      function countBelt(){
        var n=0;
        for(var y=0;y<G.rows;y++){ var row=G.hazards[y]||[]; for(var x=0;x<G.cols;x++){ var h=row[x]; if(h&&h.type==='convey') n++; } }
        return n;
      }
      function step(n){ for(var i=0;i<n;i++) BH.updateWorld(1/60); }
      // 一直換場直到抽到有輸送帶的主題
      var found=null;
      for(var r=0;r<12;r++){
        BH.startBattle();
        var nb=countBelt();
        out.rounds.push({stage:G.stage, theme:G.theme.name, belts:nb});
        if(nb>=3){ found=true; break; }
      }
      if(!found) return out;
      out.stage=G.stage; out.theme=G.theme.name;
      // 找一格「帶子方向下一格是空地」的帶子
      var pick=null;
      for(var y=1;y<G.rows-1&&!pick;y++) for(var x=1;x<G.cols-1;x++){
        var h=G.hazards[y][x];
        if(!h||h.type!=='convey') continue;
        var d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[h.dir];
        var nx=x+d[0], ny=y+d[1];
        if(G.grid[ny][nx]===0 && !(G.hazards[ny][nx]&&G.hazards[ny][nx].type!=='convey')){
          pick={x:x,y:y,dir:h.dir,nx:nx,ny:ny}; break;
        }
      }
      out.pick=pick;
      if(!pick) return out;
      var pl=G.players[0]; pl.alive=true; pl.dizzy=0; pl.skull=null;
      G.bombs.length=0;
      pl.x=(pick.x+.5)*T; pl.y=(pick.y+.5)*T;
      BH.placeBomb(pl);
      var bm=G.bombs[G.bombs.length-1];
      var tr=[];
      for(var k=0;k<10;k++){ step(20); tr.push(bm.cx+','+bm.cy+' acc'+Math.round(bm.beltAcc||0)); if(G.bombs.indexOf(bm)<0)break; }
      out.placeTrace=tr;

      // 推車丟上來（從外圈往場內丟到那一格）
      G.bombs.length=0;
      var cx=pick.x, cy=pick.y;
      // 找投擲方向：把玩家放到離該格最近的外圈位置
      var dirs=[['up',cy],['down',G.rows-1-cy],['left',cx],['right',G.cols-1-cx]];
      dirs.sort(function(a,b){return a[1]-b[1];});
      var dn=dirs[0][0], dd={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dn];
      // 玩家站在外圈反方向，距離 = 到目標格的步數
      var steps = dn==='down'? cy : dn==='up'? (G.rows-1-cy) : dn==='right'? cx : (G.cols-1-cx);
      pl.x=(cx-dd[0]*steps+.5)*T; pl.y=(cy-dd[1]*steps+.5)*T;
      // 用 lv 對應到剛好抵達該格
      var lv = Math.max(0, Math.min(2, steps-1));
      var ok=BH.cartThrowBomb(pl, lv);
      var bm2=G.bombs[G.bombs.length-1];
      out.cart={dir:dn, steps:steps, lv:lv, ok:ok, cx:bm2&&bm2.cx, cy:bm2&&bm2.cy};
      if(!bm2) return out;
      var tr2=[];
      for(var k2=0;k2<12;k2++){ step(20); tr2.push(bm2.cx+','+bm2.cy+(bm2.flying?'F':'')+' acc'+Math.round(bm2.beltAcc||0)); if(G.bombs.indexOf(bm2)<0)break; }
      out.cartTrace=tr2;
      return out;
    })()`);
    console.log(JSON.stringify(R, null, 1));
  } finally { b.close(); }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
