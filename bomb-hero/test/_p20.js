const path = require('path');
const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const OUT = path.join(__dirname, '_audit') + '/';
(async () => {
  const cdp = await launch({ port: 9494, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2200);
  for (const lang of ['en', 'ja', 'ko']) {
    await p.eval(`(function(){ try{ localStorage.setItem('bombhero-lang','${lang}'); }catch(e){} })()`);
    await p.goto('http://127.0.0.1:3111/index.html', 2400);
    await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);})()`);
    const cur = await p.eval('document.documentElement.lang');
    for (const s of ['shop', 'settings']) {
      await p.eval(`(function(){ try{ __BH.Screen.show('${s}'); }catch(e){} })()`);
      await sleep(600);
      const f = OUT + s + '-' + lang + '.png';
      await p.shot(f);
      console.log('shot', f);
    }
    console.log(lang, 'ok lang=' + cur);
  }
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
