const { launch } = require('./cdp');
const path = require('path');
const URL0 = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await launch({ w: 430, h: 860, port: 9399 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(430, 860, true);
  await p.goto(URL0, 1000);
  await p.eval(`(function(){ try{ localStorage.setItem('bombhero-rotskip','1'); }catch(e){} return 1; })()`);
  await p.goto(URL0, 3600);
  for (let i = 0; i < 25; i++) { if (await p.eval('!!window.__BH')) break; await wait(300); }
  await p.eval(`(function(){ var P=window.__BH; P.Solo.unlocked=40; P.startSolo ? P.startSolo(1,false,false) : 0; return 1; })()`);
  await wait(1500);
  const r = await p.eval(`(function(){
    var gt = document.getElementById('gameTop');
    var b = gt ? gt.getBoundingClientRect() : null;
    var out = { vw: innerWidth, vh: innerHeight, top: b ? [Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)] : null,
      scrollW: gt ? gt.scrollWidth : -1, clientW: gt ? gt.clientWidth : -1,
      kids: [] };
    if (gt) {
      Array.prototype.forEach.call(gt.children, function (c) {
        var q = c.getBoundingClientRect();
        out.kids.push({ id: c.id || c.className, x: Math.round(q.left), r: Math.round(q.right), y: Math.round(q.top), b: Math.round(q.bottom), w: Math.round(q.width) });
      });
    }
    var cvs = document.getElementById('cv') || document.querySelector('canvas');
    out.cv = cvs ? [Math.round(cvs.getBoundingClientRect().top), Math.round(cvs.getBoundingClientRect().height)] : null;
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 1));
  await p.shot(path.join(__dirname, '_v573', 'dbg-portrait.png'));
  await br.close();
})();
