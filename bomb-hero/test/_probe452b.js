// v4.52 診斷②：輸送帶推不推「推車丟進來的炸彈」（手動推進 updateWorld，不依賴 rAF）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));

(async () => {
  const b = await launch({ port: 9634, w: 1280, h: 900 });
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
      var BH=window.__BH,G=BH.Game,T=G.T,out={};
      G.bombs.length=0; G.enemies.length=0;
      function clear(){
        for(var x=1;x<G.cols-1;x++) for(var y=1;y<G.rows-1;y++){ G.grid[y][x]=0; G.hazards[y][x]=null; }
      }
      function step(n){ for(var i=0;i<n;i++) BH.updateWorld(1/60); }
      var pl=G.players[0]; pl.alive=true; pl.dizzy=0; pl.skull=null; pl.invuln=99;

      // ① 對照組：普通炸彈放在帶子上
      clear();
      for(var i=4;i<=7;i++) G.hazards[6][i]={type:'convey',dir:'right'};
      pl.x=(4.5)*T; pl.y=(6.5)*T;
      BH.placeBomb(pl);
      var b1=G.bombs[G.bombs.length-1];
      var s1={cx:b1.cx,cy:b1.cy};
      step(90);   // 1.5s
      out.normal={from:s1, to:{cx:b1.cx,cy:b1.cy}, gone:G.bombs.indexOf(b1)<0};

      // ② 實驗組：推車丟進來的炸彈（從上邊框往下丟 3 格，落點在帶子上）
      clear(); G.bombs.length=0;
      for(var i=2;i<=8;i++) G.hazards[i][7]={type:'convey',dir:'down'};
      pl.x=(7.5)*T; pl.y=(0.5)*T;
      var ok=BH.cartThrowBomb(pl,2);
      var b2=G.bombs[G.bombs.length-1];
      var s2={ok:ok,cx:b2.cx,cy:b2.cy,flying:!!b2.flying,timer:+b2.timer.toFixed(2)};
      var trace=[];
      for(var k=0;k<6;k++){ step(15); trace.push(b2.cx+','+b2.cy+(b2.flying?'F':'')+'|t'+b2.timer.toFixed(1)+'|acc'+Math.round(b2.beltAcc||0)); }
      out.cart={from:s2, trace:trace, gone:G.bombs.indexOf(b2)<0};

      // ③ 推車丟到軟磚：看落點與 bounce
      clear(); G.bombs.length=0;
      G.grid[4][7]=2;              // 軟磚
      G.grid[5][7]=0;
      pl.x=(7.5)*T; pl.y=(0.5)*T;
      var land=BH.cartPickLanding(pl,2);
      out.soft={land:land?{x:land.x,y:land.y,bounce:land.bounce,onSoft:land.onSoft,onWall:land.onWall}:null};
      G.grid[4][7]=1;              // 石牆
      var land2=BH.cartPickLanding(pl,2);
      out.hard={land:land2?{x:land2.x,y:land2.y,bounce:land2.bounce,onSoft:land2.onSoft,onWall:land2.onWall}:null};
      return out;
    })()`);
    console.log(JSON.stringify(R, null, 1));
  } finally { b.close(); }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
