const { launch, sleep } = require('./cdp');
const path = require('path');
const file = process.argv[2] || '_tmp_red.html';
const st = parseInt(process.argv[3] || '25', 10);
const URL = 'file:///' + path.resolve(__dirname, '..', file).replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9801, w: 1000, h: 800 });
  const p = await b.newPage();
  await p.goto(URL, 3600);
  for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(250); }
  const r = await p.eval(`(function(){
    var BH=window.__BH, G=BH.Game;
    BH.startSolo(${st}, true);
    var ov=document.getElementById('ovIn'); if(ov) ov.style.display='none';
    G.state='play'; G.countdown=0;
    for (var i=0;i<40;i++) BH.updateWorld(1/60);
    BH.render();
    var cv=document.getElementById('cv'), g=cv.getContext('2d');
    var out=[];
    for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++){
      if (G.grid[y][x]!==0) continue;
      var sx=(x*G.T+G.T*0.5+G.camX+ (G.ox||0)), sy=(y*G.T+G.T*0.5+G.camY+(G.oy||0));
      if (sx<5||sy<5||sx>cv.width-5||sy>cv.height-5) continue;
      var d=g.getImageData(Math.floor(sx),Math.floor(sy),1,1).data;
      out.push([d[0],d[1],d[2]]);
    }
    out.sort(function(a,b){return (b[0]+b[1]+b[2])-(a[0]+a[1]+a[2]);});
    return { n: out.length, dark: out[out.length-1], mid: out[Math.floor(out.length/2)], light: out[0],
             floor: BH.THEMES[6].floor, style: G.theme.style };
  })()`);
  console.log(JSON.stringify(r));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
