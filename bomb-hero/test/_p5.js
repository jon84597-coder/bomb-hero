const { launch, sleep } = require('./cdp');
const path = require('path');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

(async () => {
  const cdp = await launch({ port: 9451, w: 844, h: 390 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(844, 390, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2600);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
  await p.eval(`__BH.startSolo(3)`);
  await sleep(800);
  await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b) b.click();})()`);
  await sleep(4000);

  const dump = await p.eval(`(function(){
    function d(e, depth){
      var r = e.getBoundingClientRect();
      var s = getComputedStyle(e);
      return {
        tag: e.tagName.toLowerCase(), id: e.id || '', cls: (typeof e.className==='string'? e.className : ''),
        x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
        txt: (e.textContent||'').replace(/\\s+/g,' ').trim().slice(0, 18),
        ov: s.overflow, disp: s.display, z: s.zIndex,
        sw: e.scrollWidth, cw: e.clientWidth
      };
    }
    var out = { top: [], touch: [], topBox: null, touchBox: null, win: [innerWidth, innerHeight] };
    var t = document.getElementById('gameTop');
    if (t) { out.topBox = d(t); Array.prototype.forEach.call(t.children, function(c){ out.top.push(d(c)); }); }
    var u = document.getElementById('touchUI');
    if (u) { out.touchBox = d(u); Array.prototype.forEach.call(u.querySelectorAll('*'), function(c){ if (c.children.length===0 || c.tagName==='BUTTON') out.touch.push(d(c)); }); }
    return JSON.stringify(out);
  })()`);
  const o = JSON.parse(dump);
  console.log('視窗', o.win);
  console.log('\n#gameTop', JSON.stringify(o.topBox));
  o.top.forEach(c => console.log('  chip', c.x, c.y, c.w + 'x' + c.h, '|', c.cls.slice(0, 26), '|', c.txt));
  console.log('\n#touchUI', JSON.stringify(o.touchBox));
  const seen = new Set();
  o.touch.forEach(c => {
    const k = c.cls + c.x + c.y;
    if (seen.has(k)) return; seen.add(k);
    console.log('  btn', c.x, c.y, c.w + 'x' + c.h, '|', c.tag, c.cls.slice(0, 30), '|', c.txt);
  });
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
