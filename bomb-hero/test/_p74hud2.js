const { launch } = require('./cdp');
const path = require('path');
const URL0 = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await launch({ w: 360, h: 640, port: 9415 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(360, 640, true);
  await p.goto(URL0, 900);
  await p.eval("(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}return 1;})()");
  await p.goto(URL0, 3800);
  for (let i = 0; i < 30; i++) { if (await p.eval('!!window.__BH')) break; await wait(300); }
  await p.eval("(function(){var P=window.__BH;P.Solo.unlocked=40;P.Abyss.start(12);return 1;})()");
  await wait(1200);
  await p.eval("(function(){var b=document.querySelector('#ovBox button');if(b)b.click();return 1;})()");
  await wait(3600);
  const m = await p.eval(`(function(){
    var gt=document.getElementById('gameTop'); var out=[];
    for (var i=0;i<gt.children.length;i++){
      var e=gt.children[i], r=e.getBoundingClientRect();
      out.push({ id:e.id||'', cls:(e.className||'').toString().slice(0,18),
        x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height),
        disp:getComputedStyle(e).display, txt:(e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,18) });
    }
    var b=gt.getBoundingClientRect();
    return { bar:[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)], kids:out };
  })()`);
  console.log(JSON.stringify(m, null, 1));
  await br.close();
})();
