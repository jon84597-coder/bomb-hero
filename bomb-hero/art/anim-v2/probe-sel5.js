const path = require('path');
const { launch, sleep } = require(path.join(__dirname, '..', '..', 'test', 'cdp.js'));
(async () => {
  const b = await launch({ w: 1400, h: 1000 });
  const p = await b.newPage();
  await p.send('Network.enable');
  await p.send('Network.setCacheDisabled', { cacheDisabled: true });
  await p.goto('http://localhost:3122/', 9000);
  await p.eval("(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}return 1})()");
  await p.goto('http://localhost:3122/', 12000);
  await sleep(2200);
  await p.eval("document.getElementById('btnSolo').click()");
  await sleep(1200);
  console.log(await p.eval(`(function(){
    var c=document.querySelectorAll('canvas.chpv'),out=[];
    for(var i=0;i<8;i++){
      var g=c[i].getContext('2d'),w=c[i].width,h=c[i].height;
      var d=g.getImageData(0,0,w,h).data;
      var y0=1e9,y1=-1,x0=1e9,x1=-1;
      for(var y=0;y<h;y++)for(var x=0;x<w;x++){ if(d[(y*w+x)*4+3]>40){ if(y<y0)y0=y; if(y>y1)y1=y; if(x<x0)x0=x; if(x>x1)x1=x; } }
      out.push({i:i,h:y1-y0+1,w:x1-x0+1,top:y0,bot:y1});
    }
    return out;})()`));
  b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
