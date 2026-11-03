// v4.57 目檢：八大關的環境氛圍（1/5/9/13/17/21/25/29 = 八個主題）
// 用法：node shot-v457-amb.js [tag] [t1,t2,...] [stage...]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v458');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const TAG = process.argv[2] || 'a';
const TIMES = (process.argv[3] || '6.0,9.5').split(',').map(Number);
const STAGES = (process.argv.slice(4).map(Number)).filter(Boolean);
const list = STAGES.length ? STAGES : [1, 5, 9, 13, 17, 21, 25, 29];

(async () => {
  const b = await launch({ port: 9741, w: 1280, h: 900 });
  try {
    for (const st of list) {
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
      await p.eval(`(function(){var BH=window.__BH;BH.startSolo(${st}, true);BH.Game.state='play';
        try{BH.beginCountdown('battle');}catch(e){}
        for(var i=0;i<30;i++){try{BH.updateWorld(1/60);}catch(e){}}
        BH.Game.camSnap=true;
        try{BH.updateCamera();}catch(e){}
      })()`);
      const info = await p.eval(`(function(){
        var G=window.__BH.Game;
        return {stage:G.stage,style:(G.theme||{}).style,name:(G.theme||{}).name,
                amb:(window.__BH.AMB[(G.theme||{}).style]||{}).k,
                n:(window.__BH.AMB[(G.theme||{}).style]||{}).n};
      })()`);
      for (const tt of TIMES) {
        await p.eval(`(function(){var BH=window.__BH;BH.Game.gameT=${tt};try{BH.render();}catch(e){} })()`);
        await sleep(260);
        await p.shot(path.join(OUT, 'amb-' + info.style + '-s' + st + '-t' + String(tt).replace('.', 'p') + '-' + TAG + '.png'));
      }
      console.log(st, JSON.stringify(info));
      try { await p.close(); } catch (e) { }
    }
    console.log('OK');
  } finally {
    try { await b.close(); } catch (e) { }
  }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
