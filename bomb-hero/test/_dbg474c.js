const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
(async function () {
  const b = await launch({ port: 9643, w: 390, h: 844 });
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
    for(var i=0;i<60*8;i++) __BH.updateBR(1/60);
    ['rotHint','zoomHint'].forEach(function(id){var e=document.getElementById(id); if(e) e.remove();});
    __BH.updateCamera(1); __BH.render();
    var me=G.players[0], cv=document.getElementById('cv'), g=cv.getContext('2d');
    var sx=me.x+G.camX, sy=me.y+G.camY;
    var dpr=cv.width/cv.clientWidth;
    var d=g.getImageData(Math.max(0,(sx-40)*dpr), Math.max(0,(sy-90)*dpr), 80*dpr, 100*dpr).data;
    var gold=0, any=0;
    for(var i2=0;i2<d.length;i2+=4){ if(d[i2+3]<10) continue; any++; if(d[i2]>235&&d[i2+1]>180&&d[i2+2]<130) gold++; }
    return JSON.stringify({ sx:+sx.toFixed(0), sy:+sy.toFixed(0), goldPx: gold, anyPx: any,
      hid: (function(){ try { return !!__BH.hideTileAt && !!__BH.hideTileAt(Math.floor(me.x/G.T), Math.floor(me.y/G.T)); } catch(e){ return 'e'; } })() });
  })()`));
  await p.shot(path.join(__dirname, '_v474', 'dbg3.png'));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
