const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v475');
(async () => {
  const b = await launch({ w: 390, h: 800 });
  const p = await b.newPage();
  await p.goto(URL, 2000);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  await p.eval("__BH.BR.opt={n:30,team:1,dur:10}; __BH.startBR(); __BH.Game.state='play'; 1");
  await sleep(900);
  console.log(await p.eval(`(function(){ var G=__BH.Game;
    var o=document.getElementById('ovIn'); if(o) o.classList.add('hide');
    G.zoom=G.zoomTarget=0.42; G.camSnap=true;
    for (var i=0;i<120;i++){ try{__BH.updateBR(1/60);}catch(e){} }
    G.camSnap=true; try{__BH.updateCamera(1);}catch(e){}
    try{__BH.render();}catch(e){}
    return JSON.stringify({bg:!!(document.title), tips:document.querySelectorAll('#brTips .btip').length});
  })()`));
  await sleep(300);
  await p.shot(path.join(OUT, 'br-wide.png'));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
