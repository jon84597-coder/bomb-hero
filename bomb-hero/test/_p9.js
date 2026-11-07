const { launch, sleep } = require('./cdp');
(async () => {
  const cdp = await launch({ port: 9456, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.resize(900, 430, false);   // 不模擬手機
  await p.goto('http://127.0.0.1:3111/index.html', 2200);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
  await p.eval(`__BH.startSolo(3)`);
  await sleep(900);
  console.log(await p.eval(`(function(){
    var box=document.getElementById('ovBox'), inEl=document.getElementById('ovIn'), sw=document.getElementById('stageWrap');
    var cs=getComputedStyle(box);
    return JSON.stringify({
      stageWrap:[sw.clientWidth, sw.clientHeight],
      ovIn:[Math.round(inEl.getBoundingClientRect().height)],
      box:[Math.round(box.getBoundingClientRect().height)], maxH: cs.maxHeight, overflow: cs.overflowY,
      tips: (function(){ var u=document.querySelector('#ovBox .mtips'); return u? [Math.round(u.getBoundingClientRect().height), u.scrollHeight] : null; })(),
      h3: getComputedStyle(document.querySelector('#ovBox h3')).fontSize,
      btnBottom: Math.round(document.querySelector('#ovBox button').getBoundingClientRect().bottom)
    });
  })()`));
  await p.shot(__dirname + '/_audit/desk-900x430-intro.png');
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
