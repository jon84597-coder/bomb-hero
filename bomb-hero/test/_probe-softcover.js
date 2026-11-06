// 量八個主題「軟牆貼圖」的透明邊界：決定軟磚腳下露出的地板有多少
const { launch, sleep } = require('./cdp');
const path = require('path');

(async () => {
  const b = await launch({ port: 9832, w: 430, h: 932 });
  const p = await b.newPage();
  await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 5000);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(600);
  const r = await p.eval(`(function(){
    var BH=window.__BH, out={}, S0=128;
    ['forest','sand','ice','lava','neon','sea','sky','dark'].forEach(function(st){
      var cv=document.createElement('canvas'); cv.width=S0; cv.height=S0;
      var g=cv.getContext('2d');
      BH.paintSoftTile(g, st, S0, 101+71, false, 0);
      var d=g.getImageData(0,0,S0,S0).data, minx=S0,maxx=0,miny=S0,maxy=0,op=0;
      for(var y=0;y<S0;y++)for(var x=0;x<S0;x++){var a=d[(y*S0+x)*4+3];
        if(a>16){op++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y;}}
      out[st]={cover:+(op/(S0*S0)*100).toFixed(1),
        L:+(minx/S0*100).toFixed(1), R:+((S0-1-maxx)/S0*100).toFixed(1),
        T:+(miny/S0*100).toFixed(1), B:+((S0-1-maxy)/S0*100).toFixed(1)};
    });
    return out;
  })()`);
  for (const k in r) {
    const o = r[k];
    console.log(k.padEnd(7) + ' 覆蓋 ' + String(o.cover).padStart(5) + '%  邊距 L' + o.L + ' R' + o.R + ' T' + o.T + ' B' + o.B);
  }
  b.close();
})();
