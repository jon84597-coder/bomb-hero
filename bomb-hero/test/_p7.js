const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

(async () => {
  const cdp = await launch({ port: 9453, w: 844, h: 390 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(844, 390, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
  await p.eval(`__BH.startSolo(3)`);
  await sleep(700);
  await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b) b.click();})()`);
  await sleep(2800);
  console.log(await p.eval(`(function(){
    var t=document.getElementById('gameTop'), s=document.getElementById('scr-game'), n=document.getElementById('navBar');
    var cs=getComputedStyle(t);
    return JSON.stringify({
      body: document.body.className,
      scr: s.className,
      nav: n.className,
      portrait: matchMedia('(orientation: portrait)').matches,
      landscape: matchMedia('(orientation: landscape)').matches,
      gameTopPadding: [cs.paddingTop, cs.paddingRight, cs.paddingLeft, cs.paddingBottom],
      gameTopOverflow: cs.overflow,
      chipFont: getComputedStyle(t.querySelector('.chip')).fontSize,
      pauseDisplay: getComputedStyle(document.getElementById('pauseBtn')).display,
      backDisplay: getComputedStyle(document.getElementById('btnBack')).display,
      rotHint: (function(){ var r=document.getElementById('rotHint'); return r? getComputedStyle(r).display : 'removed'; })()
    });
  })()`));
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
