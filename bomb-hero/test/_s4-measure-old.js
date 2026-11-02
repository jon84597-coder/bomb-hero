// 量測「舊版（程式繪圖）」第二關 6 隻小怪在 T=40 的實際像素尺寸
const path = require('path');
const { launch, sleep } = require('./cdp');
const FILE = process.argv[2] || path.resolve(__dirname, '../index.html');
const URL = 'file:///' + path.resolve(FILE).replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9546, w: 900, h: 600 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 600, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2500);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.drawEnemyArt)')) break; await sleep(300); }
    const out = await p.eval(`(function(){
      var BH=window.__BH, T=40; window.__BH.Game.T = T;
      var cv=document.getElementById('cv'), g=cv.getContext('2d');
      var ids=['lavaslime','lavaworm','bee','bomber','lizard','rockling'], res=[];
      ids.forEach(function(id){
        var sp=BH.speciesOf(id);
        var e={spec:id,type:id,color:sp.color,color2:sp.color2,kind:sp.kind,r:sp.r,walkT:0,x:0,y:0,
               dirName:'right',vx:0,vy:0,aggro:false};
        var R=BH.enemyArtR(e);
        g.save(); g.setTransform(1,0,0,1,0,0);
        g.clearRect(0,0,cv.width,cv.height);
        g.translate(300,300);
        BH.drawEnemyArt(e, 0, 0, false, 0);
        var d=g.getImageData(0,0,cv.width,cv.height).data;
        var x0=9e9,y0=9e9,x1=-1,y1=-1;
        for(var y=0;y<cv.height;y++)for(var x=0;x<cv.width;x++){ if(d[(y*cv.width+x)*4+3]>8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
        res.push({id:id,r:sp.r,R:+R.toFixed(2),w:x1-x0+1,h:y1-y0+1,
                  top:+(y0-300).toFixed(0),bot:+(y1-300).toFixed(0)});
        g.restore();
      });
      return JSON.stringify(res);
    })()`);
    console.log(out.replace(/},{/g, '},\n{'));
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
