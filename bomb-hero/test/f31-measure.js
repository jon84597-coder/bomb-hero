// v4.31：量測 12 隻小怪（貼圖）在 T=40 的實際繪製像素尺寸
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9518, w: 700, h: 500 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 2600);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.FoeArt&&window.__BH.FoeArt.readyCount()>=12)')) break; await sleep(300); }
    const out = await p.eval(`(function(){
      var BH=window.__BH, T=40; BH.Game.T=T;
      var R0=BH.enemyArtR({r:14});
      var ids=['slime','bunny','frog','cater','mush','beetle','crab','mummy','eye','sandworm','dune','scorp'], res=[];
      ids.forEach(function(id){
        var sp=BH.speciesOf(id), R=BH.enemyArtR({r:sp.r});
        var c=document.createElement('canvas'); c.width=240; c.height=240;
        var g=c.getContext('2d');
        var e={walkT:0,x:0,y:0,dirName:'right',_fx:0,_fy:0,bobP:0};
        BH.drawFoeSprite({save:function(){},restore:function(){},translate:function(){},scale:function(){},rotate:function(){},drawImage:function(){}}, id, e, 0,0,R,false);
        e._fx=null;
        BH.drawFoeSprite(g, id, e, 120, 200, R, false);
        var d=g.getImageData(0,0,240,240).data;
        var x0=240,y0=240,x1=-1,y1=-1;
        for(var y=0;y<240;y++)for(var x=0;x<240;x++){ if(d[(y*240+x)*4+3]>8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
        res.push({id:id,r:sp.r,R:+R.toFixed(1),w:x1-x0+1,h:y1-y0+1});
      });
      return JSON.stringify(res);
    })()`);
    console.log(out.replace(/},{/g, '},\n{'));
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
