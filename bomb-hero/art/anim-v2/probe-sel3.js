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
  await p.eval("__BH.Screen.show('solo')");
  await sleep(900);
  console.log(await p.eval("(function(){try{var P=__BH.CharPreview;return {items:P.items().length, screen:__BH.Screen.current, sprites:Object.keys(__BH.Sprites.imgs||{}).length, parts:__BH.Parts.readyCount?__BH.Parts.readyCount():null, errs:(window.__BHB&&window.__BHB.errs||[]).slice(0,4)};}catch(e){return 'ERR '+e.message;}})()"));
  console.log(await p.eval("(function(){var c=document.querySelectorAll('canvas.chpv');var o=[];for(var i=0;i<c.length;i++){var g=c[i].getContext('2d');var d=g.getImageData(0,0,c[i].width,c[i].height).data;var n=0;for(var j=3;j<d.length;j+=4) if(d[j]>8) n++; o.push([c[i].width,c[i].height,n]);}return o;})()"));
  b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
