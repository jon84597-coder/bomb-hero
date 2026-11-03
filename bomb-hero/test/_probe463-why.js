// 診斷：為什麼「四周全是實心」的格子還會被畫成外牆
const { launch } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const ST = parseInt(process.argv[2] || '1', 10);

(async () => {
  const b = await launch({ port: 9795, w: 900, h: 700 });
  const p = await b.newPage();
  await p.goto(URL, 3600);
  const r = await p.eval(`(function(){
    var BH = window.__BH, G = BH.Game;
    BH.startSolo(${ST}, true);
    var ov = document.getElementById('ovIn'); if (ov) ov.style.setProperty('display','none','important');
    G.state='play'; G.countdown=0;
    BH.markWallKinds();
    var cols=G.cols, rows=G.rows, g=G.grid, wk=G.wallKind;
    // 重算 dist（跟 markWallKinds 完全一樣）
    var dist=[], q=[];
    for (var y=0;y<rows;y++){ dist.push(new Array(cols).fill(-1)); }
    for (var y=0;y<rows;y++) for (var x=0;x<cols;x++){ if (g[y][x]!==1){ dist[y][x]=0; q.push([x,y]); } }
    for (var i=0;i<q.length;i++){
      var x=q[i][0], y=q[i][1];
      if (dist[y][x]>=3) continue;
      for (var dy=-1;dy<=1;dy++) for (var dx=-1;dx<=1;dx++){
        var nx=x+dx, ny=y+dy;
        if (nx<0||ny<0||nx>=cols||ny>=rows) continue;
        if (dist[ny][nx]>=0) continue;
        dist[ny][nx]=dist[y][x]+1; q.push([nx,ny]);
      }
    }
    var bad=[];
    for (var y=0;y<rows;y++) for (var x=0;x<cols;x++){
      var k=wk[y][x]; if (!k) continue;
      var openN=0;
      for (var dy=-1;dy<=1;dy++) for (var dx=-1;dx<=1;dx++){
        var nx=x+dx, ny=y+dy;
        if (nx<0||ny<0||nx>=cols||ny>=rows) continue;
        if (g[ny][nx]!==1) openN++;
      }
      if (!openN) bad.push('('+x+','+y+') wk='+k+' dist='+dist[y][x]+' g='+g[y][x]);
    }
    return { n:bad.length, bad:bad.slice(0,10).join(' | '),
             g14: JSON.stringify([g[0][14],g[1][14],g[0][13],g[1][13]]),
             wk14: JSON.stringify([wk[0][14],wk[1][14],wk[0][13],wk[1][13]]),
             d14: JSON.stringify([dist[0][14],dist[1][14],dist[0][13],dist[1][13]]) };
  })()`);
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
