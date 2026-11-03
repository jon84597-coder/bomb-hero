// 量氛圍層對每幀的實際成本（同一個場景，關掉 / 打開氛圍各渲染 120 次）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const STAGES = [1, 13, 17, 21];
(async () => {
  const b = await launch({ port: 9681, w: 1280, h: 900 });
  try {
    for (const st of STAGES) {
      const p = await b.newPage();
      await p.goto(URL, 3200);
      for (let i = 0; i < 60; i++) {
        if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
        await sleep(250);
      }
      const r = await p.eval(`(function(){
        var BH=window.__BH,G=BH.Game;
        document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('on');});
        BH.startSolo(${st}, true); G.state='play';
        try{BH.beginCountdown('battle');}catch(e){}
        for(var i=0;i<40;i++){try{BH.updateWorld(1/60);}catch(e){}}
        G.camSnap=true; try{BH.updateCamera();}catch(e){}
        function bench(){ var t0=performance.now(); for(var k=0;k<120;k++){G.gameT+=1/60;BH.render();} return (performance.now()-t0)/120; }
        BH.render();
        var on=bench();
        var keep=BH.AMB[(G.theme||{}).style];
        delete BH.AMB[(G.theme||{}).style];
        var off=bench();
        BH.AMB[(G.theme||{}).style]=keep;
        return {style:(G.theme||{}).style, on:+on.toFixed(2), off:+off.toFixed(2), d:+(on-off).toFixed(2)};
      })()`);
      console.log(st, JSON.stringify(r));
      try { await p.close(); } catch (e) { }
    }
  } finally { try { await b.close(); } catch (e) { } }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
