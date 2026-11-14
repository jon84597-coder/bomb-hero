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
  await p.eval("document.getElementById('btnSolo').click()");
  await sleep(1200);
  // 掛鉤：記錄兔兔走路圖每一次被貼上去用的來源 x（= 第幾格）
  await p.eval(`(function(){window.__fr=[];var o=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(im){
      try{ if(im&&im.src&&String(im.src).indexOf('hero-anim-rabbit-walk')>=0) window.__fr.push([Math.round(performance.now()),arguments[1]]); }catch(e){}
      return o.apply(this,arguments);
    };return 1;})()`);
  await sleep(2000);
  const fr = await p.eval("window.__fr.slice(-90)");
  const img = await p.eval("(function(){var c=document.querySelector('canvas.chpv');var r=c.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)];})()");
  console.log('card box', JSON.stringify(img));
  await p.shot(path.join(OUT, 'sel_a.png'));
  fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(fr));
  b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
