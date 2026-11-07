const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async () => {
  const cdp = await launch({ port: 9492, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  for (const [w, h] of [[844, 390], [900, 430], [1024, 600], [740, 360]]) {
    await p.resize(w, h, true);
    await p.goto('http://127.0.0.1:3111/index.html', 2200);
    await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
    await p.eval(`(function(){ try{ __BH.startSolo(1); }catch(e){} })()`);
    await sleep(1200);
    const r = await p.eval(`(function(){
      var top = document.getElementById('gameTop');
      var bar = document.getElementById('navBar');
      var cells = top ? top.querySelectorAll('*') : [];
      var maxR = 0, who = '';
      for (var i=0;i<cells.length;i++){
        var b = cells[i].getBoundingClientRect();
        if (b.width < 2) continue;
        if (b.right > maxR) { maxR = b.right; who = (cells[i].id||cells[i].className||cells[i].tagName); }
      }
      var btns = bar ? bar.querySelectorAll('button, a') : [];
      var minL = 1e9;
      for (var i = 0; i < btns.length; i++) { var b2 = btns[i].getBoundingClientRect(); if (b2.width<2||b2.height<2) continue; if (b2.left<minL) minL=b2.left; }
      return JSON.stringify({
        nr: document.documentElement.style.getPropertyValue('--navreserve'),
        hudRight: Math.round(maxR), hudWho: who,
        minBtnLeft: minL===1e9?null:Math.round(minL),
        gap: minL===1e9?null:Math.round(minL - maxR),
        topH: top?Math.round(top.getBoundingClientRect().height):null
      });
    })()`);
    console.log(w + 'x' + h + ' → ' + r);
  }
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
