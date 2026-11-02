// v4.31：隨從尋路 / 不重疊 / 炸彈不暈主人 三項驗證（可指定 html）
// 用法：node test/v431-pets.js [html]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v431');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const FILE = process.argv[2] || path.resolve(__dirname, '../index.html');
const URL = 'file:///' + path.resolve(FILE).replace(/\\/g, '/');

function hex(d) { return (d / 40).toFixed(2); }

(async () => {
  const b = await launch({ port: 9510, w: 1000, h: 700 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2800);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    const ver = await p.eval('window.__BH.VERSION');
    console.log('VERSION', ver);

    await p.eval('window.__BH.startSolo(1)');
    await sleep(700);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(350);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
    await sleep(500);

    // ---- 準備：清空怪物、塞三隻隨從 ----
    const spawn = await p.eval(`(function(){
      var BH=window.__BH, G=BH.Game, T=G.T, h=G.players[0];
      G.enemies.length = 0;
      G.pets = [BH.makePet('blade',0,0), BH.makePet('bomber',1,1), BH.makePet('guard',2,2)];
      G.pets.forEach(function(pt){ pt.x=h.x; pt.y=h.y; });      // 三隻全部疊在主人身上
      G.zoom=2; G.zoomTarget=2; G.camSnap=true;
      return JSON.stringify({ pets:G.pets.length, T:T, hx:h.x, hy:h.y });
    })()`);
    console.log('SPAWN', spawn);

    // ---- 測試 1：疊在一起 → 2 秒後應該自動散開 ----
    await sleep(2100);
    const t1 = await p.eval(`(function(){
      var BH=window.__BH,G=BH.Game,T=G.T,h=G.players[0],ps=G.pets,out=[];
      for(var i=0;i<ps.length;i++)for(var j=i+1;j<ps.length;j++){
        out.push(+((Math.hypot(ps[i].x-ps[j].x,ps[i].y-ps[j].y)/T).toFixed(2)));
      }
      var hd=ps.map(function(pt){ return +((Math.hypot(pt.x-h.x,pt.y-h.y)/T).toFixed(2)); });
      return JSON.stringify({ pair:out, hero:hd });
    })()`);
    console.log('T1 分散後距離(格)', t1);
    await p.shot(path.join(OUT, 'a-spread.png'));

    // ---- 測試 2：把隨從丟到遠處（不同走廊）→ 應該自己繞路回來 ----
    const far = await p.eval(`(function(){
      var BH=window.__BH,G=BH.Game,T=G.T,h=G.players[0];
      var cols=G.cols, rows=G.rows;
      var hx=Math.floor(h.x/T), hy=Math.floor(h.y/T);
      // 從主人 BFS 算每格步數
      var dist={}, q=[[hx,hy]]; dist[hx+','+hy]=0;
      while(q.length){
        var c=q.shift(), cx=c[0], cy=c[1], d=dist[cx+','+cy];
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(m){
          var nx=cx+m[0], ny=cy+m[1], k=nx+','+ny;
          if(nx<0||ny<0||nx>=cols||ny>=rows) return;
          if(dist[k]!==undefined) return;
          if(G.grid[ny][nx]!==0) return;
          dist[k]=d+1; q.push([nx,ny]);
        });
      }
      var cands=Object.keys(dist).filter(function(k){ return dist[k]>=7; });
      if(!cands.length) return JSON.stringify({ ok:false });
      // 挑三格，彼此盡量遠
      G.pets.forEach(function(pt,i){
        var k=cands[(i*7+3)%cands.length].split(',').map(Number);
        pt.x=k[0]*T+T/2; pt.y=k[1]*T+T/2; pt._path=null; pt._pathKey='';
      });
      return JSON.stringify({ ok:true, spec:G.pets.map(function(pt){ return [Math.floor(pt.x/T),Math.floor(pt.y/T)]; }),
        d0:G.pets.map(function(pt){ return +((Math.hypot(pt.x-h.x,pt.y-h.y)/T).toFixed(1)); }) });
    })()`);
    console.log('T2 起點', far);

    // 走 8 秒，每帧記「有沒有踩進牆裡」
    const walk = await p.eval(`new Promise(function(done){
      var BH=window.__BH,G=BH.Game,T=G.T;
      var bad=0, frames=0, t0=performance.now();
      function tick(){
        frames++;
        G.pets.forEach(function(pt){
          if(pt.down) return;
          var cx=Math.floor(pt.x/T), cy=Math.floor(pt.y/T);
          if(!(G.grid[cy]&&G.grid[cy][cx]===0)) bad++;
        });
        if(performance.now()-t0 < 8000) requestAnimationFrame(tick);
        else {
          var h=G.players[0];
          done(JSON.stringify({ frames:frames, wallHits:bad, T:T,
            d:G.pets.map(function(pt){ return +((Math.hypot(pt.x-h.x,pt.y-h.y)/T).toFixed(2)); }) }));
        }
      }
      requestAnimationFrame(tick);
    })`, true, 20000);
    console.log('T2 跟隨結果', walk);
    await p.shot(path.join(OUT, 'b-follow.png'));

    // ---- 測試 3：隨從丟的炸彈飛過主人頭上 → 主人不該頭暈 ----
    const dizzy = await p.eval(`new Promise(function(done){
      var BH=window.__BH,G=BH.Game,T=G.T,h=G.players[0];
      var cx=Math.floor(h.x/T), cy=Math.floor(h.y/T);
      h.invuln=0; h.dizzy=0;
      // 從左邊 2 格飛到右邊 2 格，會剛好飛過主人頭上
      G.bombs.push({ cx:cx+2, cy:cy, px:(cx-2+.5)*T, py:(cy+.5)*T, timer:2.2, power:1,
        owner:G.pets[1], petOwner:G.pets[1], passers:[], remoteArmed:false, mine:false,
        moving:null, held:false, seed:0,
        flying:{ fx:cx-2, fy:cy, tx:cx+2, ty:cy, t:0, dur:.7,
                 path:[{x:cx-2,y:cy},{x:cx-1,y:cy},{x:cx,y:cy},{x:cx+1,y:cy},{x:cx+2,y:cy}] } });
      setTimeout(function(){ done(JSON.stringify({ dizzy:+(h.dizzy||0).toFixed(2), alive:h.alive })); }, 1500);
    })`, true, 6000);
    console.log('T3 隨從彈飛過主人 → dizzy', dizzy);

    // 對照：自己的炸彈（owner=主人）也不該暈（本來就這樣）
    const dizzy2 = await p.eval(`new Promise(function(done){
      var BH=window.__BH,G=BH.Game,T=G.T,h=G.players[0];
      var cx=Math.floor(h.x/T), cy=Math.floor(h.y/T);
      h.dizzy=0;
      G.bombs.push({ cx:cx+2, cy:cy, px:(cx-2+.5)*T, py:(cy+.5)*T, timer:2.2, power:1,
        owner:h, passers:[], remoteArmed:false, mine:false, moving:null, held:false, seed:0,
        flying:{ fx:cx-2, fy:cy, tx:cx+2, ty:cy, t:0, dur:.7,
                 path:[{x:cx-2,y:cy},{x:cx-1,y:cy},{x:cx,y:cy},{x:cx+1,y:cy},{x:cx+2,y:cy}] } });
      setTimeout(function(){ done(JSON.stringify({ dizzy:+(h.dizzy||0).toFixed(2) })); }, 1500);
    })`, true, 6000);
    console.log('T3b 自己的彈飛過自己 → dizzy', dizzy2);

    // ---- 測試 4：小怪尺寸（+15%）----
    const size = await p.eval(`(function(){
      var BH=window.__BH, R=BH.enemyArtR({r:14}), T=BH.Game.T;
      return JSON.stringify({ MUL:BH.ENEMY_ART_MUL, T:T, R:+R.toFixed(2), px:+(R*2).toFixed(1) });
    })()`);
    console.log('T4 小怪半徑', size);
    console.log('DONE');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
