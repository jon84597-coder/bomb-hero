// v4.56 目檢：外牆材質放大（預設 3 倍），看石塊與接縫
// 用法：node zoom-v456.js [stage] [scale]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v458');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const ST = Number(process.argv[2] || 1);
const SC = Number(process.argv[3] || 3);

(async () => {
  const b = await launch({ port: 9651, w: 1280, h: 900 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 3200);
    for (let i = 0; i < 60; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
      await sleep(250);
    }
    await p.eval(`(function(){
      try{ localStorage.setItem('bombhero-tut2','999'); }catch(e){}
      document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('on'); });
    })()`);
    await p.eval(`(function(){var BH=window.__BH;BH.startSolo(${ST}, true);BH.Game.state='play';
      try{BH.beginCountdown('battle');}catch(e){}
      for(var i=0;i<60;i++){try{BH.updateWorld(1/60);}catch(e){}}
      try{BH.updateCamera();}catch(e){}
      try{BH.render();}catch(e){}
      BH.Game.camSnap=true;
    })()`);
    await sleep(600);
    const rect = await p.eval(`(function(){
      var cv=document.getElementById('cv'), r=cv.getBoundingClientRect();
      return {l:r.left,t:r.top,w:r.width,h:r.height};
    })()`);
    const cw = Math.min(300, rect.w), ch = Math.min(200, rect.h);
    const r2 = await p.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: rect.l + 4, y: rect.t + 4, width: cw, height: ch, scale: SC },
      captureBeyondViewport: false
    });
    const f = path.join(OUT, 'zoom-s' + ST + '-x' + SC + '.png');
    fs.writeFileSync(f, Buffer.from(r2.data, 'base64'));
    console.log(f);
  } finally { try { await b.close(); } catch (e) { } }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
