// 量測：每隻小怪用遊戲程式畫在透明畫布上，回報實際像素尺寸（驗大小是否符合預期）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9490, w: 600, h: 400 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 2500);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.FoeArt&&window.__BH.FoeArt.readyCount()===6)')) break; await sleep(300); }
    const out = await p.eval(`(function(){
      var BH=window.__BH, R=BH.enemyArtR({r:14}), T=40;
      var ids=['slime','bunny','frog','cater','mush','beetle'], res=[];
      ids.forEach(function(id){
        var c=document.createElement('canvas'); c.width=200; c.height=200;
        var g=c.getContext('2d');
        var e={walkT:0,x:0,y:0,dirName:'right',_fx:null,_fy:null};
        BH.drawFoeSprite(g, id, e, 100, 170, R, false);
        var d=g.getImageData(0,0,200,200).data;
        var x0=200,y0=200,x1=-1,y1=-1;
        for(var y=0;y<200;y++)for(var x=0;x<200;x++){ if(d[(y*200+x)*4+3]>8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
        res.push({ id:id, w:x1-x0+1, h:y1-y0+1, bottom:y1, footY:170, tile:T, R:+R.toFixed(2),
                   hs:+(BH.FOE_ART[id].hs).toFixed(2), expH:+((R*BH.FOE_ART[id].hs)).toFixed(1) });
      });
      return JSON.stringify(res);
    })()`);
    console.log(out.replace(/},{/g, '},\n{'));
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
