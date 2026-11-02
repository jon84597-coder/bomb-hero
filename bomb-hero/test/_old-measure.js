// 量測舊版（程式繪圖）小怪在 T=40 時的實際像素大小
const path = require('path');
const { launch, sleep } = require('./cdp');
const FILE = process.argv[2] || path.resolve(__dirname, '_v430/_old.html');
const URL = 'file:///' + path.resolve(FILE).replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9492, w: 900, h: 600 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 600, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2500);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.drawEnemyArt)')) break; await sleep(300); }
    const out = await p.eval(`(function(){
      var BH=window.__BH, R=BH.enemyArtR({r:14});
      var cv=document.getElementById('cv');
      var g=cv.getContext('2d');
      g.setTransform(1,0,0,1,0,0);
      var ids=['slime','bunny','frog','cater','mush','beetle'], res=[];
      ids.forEach(function(id){
        g.save(); g.setTransform(1,0,0,1,0,0);
        g.clearRect(0,0,300,300);
        var e={spec:id,type:id,color:'#7fd06a',color2:'#3f8f46',kind:'wander',r:14,walkT:0,x:0,y:0,dirName:'right',vx:0,vy:0};
        BH.drawEnemyArt(e, 150, 150, false, 0);
        var d=g.getImageData(0,0,300,300).data;
        var x0=300,y0=300,x1=-1,y1=-1;
        for(var y=0;y<300;y++)for(var x=0;x<300;x++){ if(d[(y*300+x)*4+3]>8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
        res.push({id:id,w:x1-x0+1,h:y1-y0+1,top:y0-150,bot:y1-150});
        g.restore();
      });
      return JSON.stringify(res);
    })()`);
    console.log(out.replace(/},{/g, '},\n{'));
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
