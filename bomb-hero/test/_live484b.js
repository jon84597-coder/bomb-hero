const { launch, sleep } = require('./cdp');
const URL = 'https://jon84597-coder.github.io/bomb-hero/index.html';
(async () => {
  const b = await launch({ w: 844, h: 390 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(URL + '?cb=' + Date.now(), 6000);
  for (let i = 0; i < 60; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("document.body.classList.add('touch');1");
  await sleep(2500);
  console.log(await p.eval(`(function(){
    var i=document.getElementById('titleLogo'); var tw=document.querySelector('.titlewrap');
    var fb=document.getElementById('titleFallback');
    var br=i.getBoundingClientRect(), tr=tw.getBoundingClientRect();
    return JSON.stringify({
      logo:{src:i.getAttribute('src'), complete:i.complete, nw:i.naturalWidth, nh:i.naturalHeight,
        disp:getComputedStyle(i).display, w:Math.round(br.width), h:Math.round(br.height), y:Math.round(br.y)},
      tw:{h:Math.round(tr.height), y:Math.round(tr.y)},
      fb:fb.className, fbDisp:getComputedStyle(fb).display,
      errs:(window.__BHB&&window.__BHB.errs||[]).slice(0,4),
      docGap:document.documentElement.scrollHeight-window.innerHeight
    },null,1);})()`));
  await p.shot('test/_v484/live-ls2.png');
  try { await b.close(); } catch (e) {}
})().catch(e => { console.error(e); process.exit(1); });
