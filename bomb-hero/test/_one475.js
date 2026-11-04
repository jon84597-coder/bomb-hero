const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v475');
(async () => {
  const b = await launch({ w: 420, h: 820 });
  const p = await b.newPage();
  await p.goto(URL, 2000);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  const stage = process.argv[2] || '5', zoom = process.argv[3] || '0.7';
  await p.eval(`(function(){ __BH.startSolo(${stage}); var G=__BH.Game;
    var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
    var o2=document.getElementById('brOv'); if(o2) o2.classList.add('hide');
    G.state='play'; G.countdown=0; G.zoom=G.zoomTarget=${zoom}; G.camSnap=true;
    for (var i=0;i<120;i++){ try{__BH.updateWorld(1/60);}catch(e){} }
    return 1; })()`);
  await sleep(800);
  const r = await p.eval(`(function(){ var G=__BH.Game;
    ['banner','toast','hint','doorHint','zoomHint','rotHint','hzHint'].forEach(function(id){var e=document.getElementById(id); if(e) e.remove();});
    G.camSnap = true; try{__BH.updateCamera(1);}catch(e){}
    try{__BH.render();}catch(e){}
    return JSON.stringify({bg:!!G.bgPhoto, T:+G.T.toFixed(1)}); })()`);
  console.log(r);
  await sleep(250);
  await p.shot(path.join(OUT, 'one.png'));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
