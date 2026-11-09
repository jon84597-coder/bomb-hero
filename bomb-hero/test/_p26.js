const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async () => {
  const cdp = await launch({ port: 9510, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2600);
  console.log('錯誤:', await p.eval(`(function(){ return JSON.stringify(window.__bootErrs||[]); })()`));
  console.log('狀態:', await p.eval(`(function(){
    return JSON.stringify({
      ver: (document.getElementById('verTxt')||{}).textContent,
      title: !!document.getElementById('scr-title'),
      on: (document.querySelector('.screen.on')||{}).id,
      bh: typeof window.__BH,
      startSolo: typeof (window.__BH&&window.__BH.startSolo),
      jsLen: (document.querySelector('script[src*="main.js"]')||{}).src
    });
  })()`));
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
  await p.eval(`(function(){ try{ __BH.startSolo(1); }catch(e){ window.__e1=e.message; } })()`);
  await sleep(1500);
  console.log('進遊戲:', await p.eval(`(function(){ return JSON.stringify({ scr:(document.querySelector('.screen.on')||{}).id, err: window.__e1||null, foes: (window.__BH&&__BH.Game&&__BH.Game.enemies)?__BH.Game.enemies.length:null }); })()`));
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
