const path=require('path');
const { launch, sleep } = require('./cdp');
const UA='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async()=>{
  const cdp=await launch({port:9512,w:900,h:430});
  const p=await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await p.send('Emulation.setUserAgentOverride',{userAgent:UA,platform:'Android'});
  await p.resize(900,430,true);
  const t0=Date.now();
  await p.goto('https://bomb-hero-game.onrender.com/index.html', 7000);
  console.log('載入耗時', Date.now()-t0, 'ms');
  console.log('狀態:', await p.eval(`(function(){
    return JSON.stringify({
      title: document.title,
      ver: (document.getElementById('verTxt')||{}).textContent,
      on: (document.querySelector('.screen.on')||{}).id,
      bh: typeof window.__BH,
      sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller)
    });
  })()`));
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
  await p.eval(`(function(){ try{ __BH.startSolo(1); }catch(e){ window.__e1=e.message; } })()`);
  await sleep(1600);
  console.log('進遊戲:', await p.eval(`(function(){ return JSON.stringify({ scr:(document.querySelector('.screen.on')||{}).id, err: window.__e1||null }); })()`));
  await p.shot(path.join(__dirname,'_audit','online-title.png'));
  cdp.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(2);});
