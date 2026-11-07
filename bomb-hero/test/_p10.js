const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async () => {
  const cdp = await launch({ port: 9457, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2200);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
  await p.eval(`__BH.startSolo(3)`);
  await sleep(700);
  await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b) b.click();})()`);
  await sleep(3600);
  // 開暫停
  await p.eval(`(function(){ var b=document.querySelector('#touchUI .tpause'); if(b) b.click(); })()`);
  await sleep(900);
  await p.shot(__dirname + '/_audit/pause-900x430.png');
  console.log(await p.eval(`(function(){
    var b=document.getElementById('ovBox'); if(!b) return 'no ovBox';
    var r=b.getBoundingClientRect();
    var btns=[].map.call(b.querySelectorAll('button'), function(x){ var q=x.getBoundingClientRect(); return [Math.round(q.top),Math.round(q.bottom),(x.textContent||'').trim().slice(0,10)]; });
    return JSON.stringify({ box:[Math.round(r.top),Math.round(r.bottom)], maxH:getComputedStyle(b).maxHeight, scrollH:b.scrollHeight, clientH:b.clientHeight, btns:btns, win:[innerWidth,innerHeight] });
  })()`));
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
