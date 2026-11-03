// v4.58 量測：三種剪影型軟牆貼圖的內容外接框（占整格的比例）
const path = require('path');
const { launch, sleep } = require('./cdp');
const U = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9731, w: 1000, h: 800 });
  const p = await b.newPage();
  await p.goto(U, 3000);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH)')) break; await sleep(250); }
  const r = await p.eval(`(function(){
    var BH = window.__BH, out = {};
    ['sand','sky','sea','forest'].forEach(function(st){
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var g = c.getContext('2d');
      BH.paintSoftTile(g, st, 128, 7, false, 0);
      var d = g.getImageData(0,0,128,128).data;
      var x0=999,y0=999,x1=-1,y1=-1;
      for (var y=0;y<128;y++) for (var x=0;x<128;x++){
        if (d[(y*128+x)*4+3] > 12) { if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
      }
      out[st] = { x0:x0, x1:x1, y0:y0, y1:y1,
                  wPct: Math.round((x1-x0+1)/128*100), hPct: Math.round((y1-y0+1)/128*100) };
    });
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
