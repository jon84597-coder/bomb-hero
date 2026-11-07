const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async () => {
  const cdp = await launch({ port: 9458, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);

  // 單人
  await p.eval(`__BH.startSolo(3)`); await sleep(600);
  await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b)b.click();})()`);
  await sleep(3000);
  console.log('單人 updateHud ×300:', await p.eval(`(function(){
    var t0=performance.now(); for(var i=0;i<300;i++) __BH.updateHud(); return Math.round(performance.now()-t0)+'ms';
  })()`));
  console.log('單人 render ×60:', await p.eval(`(function(){
    var t0=performance.now(); for(var i=0;i<60;i++) __BH.Game.state='play';
    return 'skip';
  })()`));

  // 大逃殺 100 人
  await p.eval(`(function(){ try{__BH.Screen.show('home');__BH.ovHide();}catch(e){} })()`);
  await sleep(300);
  await p.eval(`__BH.startBR()`); await sleep(700);
  await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b)b.click();})()`);
  await sleep(3200);
  console.log('BR 人數:', await p.eval(`(__BH.Game.players||[]).length`));
  console.log('BR updateHud ×300:', await p.eval(`(function(){
    var t0=performance.now(); for(var i=0;i<300;i++) __BH.updateHud(); return Math.round(performance.now()-t0)+'ms';
  })()`));
  // 每幀總時間
  const frame = await p.eval(`(function(){
    return new Promise(function(res){
      var n=0, gaps=[], t0=performance.now();
      function tick(ts){ gaps.push(ts);
        if(++n>=120) {
          var d=[]; for(var i=1;i<gaps.length;i++) d.push(gaps[i]-gaps[i-1]);
          res(JSON.stringify({ avg: +(d.reduce(function(a,b){return a+b},0)/d.length).toFixed(2), max: +Math.max.apply(null,d).toFixed(2) }));
          return;
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  })()`);
  console.log('BR 幀時間:', frame);
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
