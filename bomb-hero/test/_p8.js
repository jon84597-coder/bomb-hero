const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

(async () => {
  const cdp = await launch({ port: 9454, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });

  for (const [w, h] of [[900, 430], [844, 390], [800, 360], [740, 320], [1024, 480], [1180, 820], [820, 1180]]) {
    await p.resize(w, h, true);
    await p.goto('http://127.0.0.1:3111/index.html', 2000);
    await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
    await p.eval(`__BH.startSolo(3)`);
    await sleep(900);
    const d = JSON.parse(await p.eval(`(function(){
      var b=document.querySelector('#ovBox button'); if(!b) return JSON.stringify({none:1});
      var br=b.getBoundingClientRect(), box=document.getElementById('ovBox'), bx=box.getBoundingClientRect();
      var inEl=document.getElementById('ovIn').getBoundingClientRect();
      return JSON.stringify({
        btnY:[Math.round(br.top),Math.round(br.bottom)], btnVisible: br.top>=-1 && br.bottom<=innerHeight+1,
        boxH:Math.round(bx.height), boxScrollH: box.scrollHeight, boxOverflowY: box.scrollHeight > box.clientHeight + 2,
        inH:Math.round(inEl.height), win:[innerWidth,innerHeight], btnW: Math.round(br.width)
      });
    })()`));
    console.log(w + 'x' + h, JSON.stringify(d), d.btnVisible ? '' : '  ⚠ 出發鈕看不到');
    if (w === 800) await p.shot(__dirname + '/_audit/ov-800x360.png');
    if (w === 740) await p.shot(__dirname + '/_audit/ov-740x320.png');
  }
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
