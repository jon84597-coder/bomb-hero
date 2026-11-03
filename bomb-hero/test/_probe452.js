// v4.52 驗證：拳擊越牆 / 推車軟磚彈跳 / 輸送帶馬上帶走 / 火焰燒骷髏
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));

(async () => {
  const b = await launch({ port: 9642, w: 1280, h: 900 });
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
      function clearAll(){
        for(var y=0;y<G.rows;y++) for(var x=0;x<G.cols;x++){
          if(x===0||y===0||x===G.cols-1||y===G.rows-1){ G.grid[y][x]=1; continue; }
          G.grid[y][x]=0; G.hazards[y][x]=null;
        }
        G.bombs.length=0; G.items.length=0; G.enemies.length=0; G.flames.length=0;
      }
      function step(n){ for(var i=0;i<n;i++) BH.updateWorld(1/60); }
      var pl=G.players[0]; pl.alive=true; pl.dizzy=0; pl.skull=null; pl.invuln=999; pl.carry=null;

      // ---- 6. 拳擊：牆要跳過去，落到最遠空地 ----
      clearAll();
      G.grid[5][7]=1; G.grid[5][10]=2;               // 石牆 + 軟磚擋路
      pl.punch=true; pl.kick=false;
      pl.x=(4.5)*T; pl.y=(5.5)*T; BH.placeBomb(pl);
      var b1=G.bombs[G.bombs.length-1];
      pl.x=(3.5)*T;
      var ok=BH.punchBomb(pl,'right');
      out.punch={ok:ok, land:{x:b1.cx,y:b1.cy}, expect:{x:G.cols-2,y:5},
        pathLen:b1.flying?b1.flying.path.length:0,
        hops:(b1.flying?b1.flying.path.filter(function(q){return q.w;}).length:0)};

      // ---- 7. 推車丟到軟磚：要再彈一格 ----
      clearAll();
      G.grid[3][7]=2;   // lv2 的 reach 是 3 → 落點 (7,3) 是軟磚，應該再彈到 (7,4)
      pl.x=(7.5)*T; pl.y=(0.5)*T;
      var land=BH.cartPickLanding(pl,2);
      out.cartSoft={x:land&&land.x, y:land&&land.y, bounce:land&&land.bounce,
        onSoft:land&&land.onSoft, onWall:land&&land.onWall, expectY:4};
      // 對照：石牆也一樣要彈
      clearAll(); G.grid[3][7]=1;
      pl.x=(7.5)*T; pl.y=(0.5)*T;
      var l2=BH.cartPickLanding(pl,2);
      out.cartHard={y:l2&&l2.y, bounce:l2&&l2.bounce};

      // ---- 9. 輸送帶：落地立刻被帶走 ----
      clearAll();
      for(var yy=1;yy<=10;yy++) G.hazards[yy][7]={type:'convey',dir:'down'};
      pl.x=(7.5)*T; pl.y=(0.5)*T;
      BH.cartThrowBomb(pl,2);
      var b3=G.bombs[G.bombs.length-1];
      var before3={cx:b3.cx,cy:b3.cy,flying:!!b3.flying};
      step(40);   // 0.67s（飛行 dur 約 0.43s）
      out.belt={throwAt:before3, after067s:{cx:b3.cx,cy:b3.cy,flying:!!b3.flying,acc:Math.round(b3.beltAcc||0)}};

      // ---- 8. 火焰燒骷髏頭 ----
      clearAll();
      BH.spawnItem(5,4,'skull');
      BH.spawnItem(5,6,'fire');        // 對照組：普通道具不該被燒
      pl.x=(5.5)*T; pl.y=(5.5)*T; BH.placeBomb(pl);
      var b4=G.bombs[G.bombs.length-1];
      b4.timer=0; step(2);
      var left=G.items.map(function(it){return it.type+'@'+it.cx+','+it.cy;});
      out.skull={items:left, skullGone:left.filter(function(z){return z.indexOf('skull')===0;}).length===0,
        fireKept:left.filter(function(z){return z.indexOf('fire')===0;}).length===1};
      return out;
    })()`);
    console.log(JSON.stringify(R, null, 1));
  } finally { b.close(); }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
