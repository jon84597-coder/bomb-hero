const { launch, sleep } = require('./cdp');
const path = require('path'); const fs = require('fs');
const OUT = path.resolve(__dirname, '_v535');
(async () => {
  const b = await launch({ port: 9905, w: 430, h: 932 });
  try {
    const p = await b.newPage();
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?auto=1', 9000);
    for (let i = 0; i < 100; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(800);
    await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      BH.BR.opt = { n: 8, team: 1, dur: 10 }; BH.settings.ctrl='kb';
      BH.startBR(); G.state='play';
      setInterval(function(){ ['ovBox','tutMask','tutCard','tutMini','banner'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';}); G.bannerT=0; },50);
      G.brNukeCd=1e9; G.enemies.length=0;
      G.brZone.r=14; G.brZone.tr=9; G.brZone.nx=G.brZone.cx+5; G.brZone.ny=G.brZone.cy-3; G.brZone.nr=9;
      G.brZone.done=false; G.brZone.t=30;
      G.zoom=.62; G.camSnap=true;
      return 1;
    })()`);
    await sleep(900);
    const r = await p.eval(`JSON.stringify((function(){var rc=document.getElementById('cv').getBoundingClientRect();return {x:rc.x,y:rc.y,w:rc.width,h:rc.height};})())`);
    const o = JSON.parse(r);
    const shot = await p.send('Page.captureScreenshot', { format:'png',
      clip:{ x:o.x, y:o.y+180, width:o.w, height:o.h-320, scale:2 } });
    fs.writeFileSync(path.join(OUT, 'zone-full.png'), Buffer.from(shot.data,'base64'));
    console.log('ok', o.w, o.h);
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
