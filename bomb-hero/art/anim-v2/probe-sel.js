const path = require('path');
const fs = require('fs');
const { launch, sleep } = require(path.join(__dirname, '..', '..', 'test', 'cdp.js'));
const OUT = path.join(__dirname, 'shots');
(async () => {
  const b = await launch({ w: 1400, h: 1000 });
  const p = await b.newPage();
  await p.send('Network.enable');
  await p.send('Network.setCacheDisabled', { cacheDisabled: true });
  await p.goto('http://localhost:3122/', 9000);
  await p.eval("(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}return 1})()");
  await p.goto('http://localhost:3122/', 12000);
  await sleep(2200);
  console.log('show', await p.eval("(function(){try{__BH.Screen.show('solo');return __BH.Screen.current;}catch(e){return 'ERR '+e.message;}})()"));
  await sleep(700);
  await p.shot(path.join(OUT, 'sel_a.png'));
  await sleep(115);
  await p.shot(path.join(OUT, 'sel_b.png'));
  // 量：選角卡裡的兔兔兩張截圖差多少（有在動就會有差）
  const dim = await p.eval("(function(){var c=document.querySelectorAll('canvas.chpv');var a=[];for(var i=0;i<c.length;i++){var r=c[i].getBoundingClientRect();a.push([c[i].getAttribute('data-ch'),Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]);}return a;})()");
  console.log(JSON.stringify(dim));
  b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
