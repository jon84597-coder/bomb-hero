const { launch, sleep } = require('./cdp');
const path = require('path');
(async () => {
  const b = await launch({ port: 9903, w: 430, h: 932 });
  try {
    const p = await b.newPage();
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?auto=1', 9000);
    for (let i = 0; i < 100; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(800);
    const r = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      BH.BR.opt = { n: 8, team: 1, dur: 10 };
      BH.settings.ctrl = 'kb'; BH.startBR(); G.state='play';
      window.__DASH = 0; window.__ARC2 = 0;
      var proto = CanvasRenderingContext2D.prototype;
      var o1 = proto.setLineDash;
      proto.setLineDash = function(a){ if (a && a.length) window.__DASH++; return o1.call(this, a); };
      var o2 = proto.arc;
      proto.arc = function(){ window.__ARC2++; return o2.apply(this, arguments); };
      G.brZone.nx = G.brZone.cx + 2; G.brZone.ny = G.brZone.cy - 1; G.brZone.nr = 2.6;
      G.brZone.done = false;
      return JSON.stringify({done:G.brZone.done,nx:G.brZone.nx,nr:G.brZone.nr,r:G.brZone.r,mode:G.brZone.mode});
    })()`);
    console.log('zone', r);
    await sleep(1200);
    console.log('dash calls', await p.eval('window.__DASH'), 'arc calls', await p.eval('window.__ARC2'));
    console.log('zoom', await p.eval('window.__BH.Game.zoom'), 'T', await p.eval('window.__BH.Game.T'));
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
