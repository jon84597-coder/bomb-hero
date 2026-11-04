const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
(async function () {
  const b = await launch({ port: 9642, w: 390, h: 844 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');localStorage.setItem('bombhero-br-ticket','9');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  console.log(await p.eval(`(function(){
    var G=__BH.Game; __BH.startBR();
    var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
    G.state='play'; G.camSnap=true; G.zoom=G.zoomTarget=1;
    for(var i=0;i<60*3;i++) __BH.updateBR(1/60);
    __BH.updateCamera(1); __BH.render();
    var me=G.players[0];
    return JSON.stringify({ alive: me.alive, ai: !!me.ai, x:+me.x.toFixed(1), y:+me.y.toFixed(1),
      cam: [+G.camX.toFixed(1), +G.camY.toFixed(1)], T:G.T, VIEW:[__BH.VIEW_W||0,__BH.VIEW_H||0],
      mode: G.mode, isMine: (function(){ try { return __BH.isMyPlayer ? __BH.isMyPlayer(me) : 'n/a'; } catch(e){ return 'err'; } })() });
  })()`));
  await p.shot(path.join(__dirname, '_v474', 'dbg2.png'));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
