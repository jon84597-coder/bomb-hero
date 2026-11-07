const { launch, sleep } = require('./cdp');
(async () => {
  const cdp = await launch({ port: 9471, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.resize(900, 430, false);
  await p.goto('http://127.0.0.1:3111/index.html', 2200);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
  await p.eval(`__BH.startSolo(3)`);
  await sleep(1000);
  console.log(await p.eval(`(function(){
    var i=document.getElementById('ovIn').getBoundingClientRect();
    var b=document.querySelector('#ovBox button').getBoundingClientRect();
    return JSON.stringify({ov:[Math.round(i.top),Math.round(i.bottom)], btn:[Math.round(b.top),Math.round(b.bottom)], inside: b.top>=i.top-1 && b.bottom<=i.bottom+1});
  })()`));
  await p.shot(__dirname + '/_audit/desk-intro-fixed.png');
  cdp.close();
})().catch(e=>{console.error(e);process.exit(2)});
