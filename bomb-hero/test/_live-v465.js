const { launch, sleep } = require('./cdp');
(async function () {
  const br = await launch({ port: 9531, w: 390, h: 844 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto('https://bomb-hero-game.onrender.com/index.html', 9000);
  for (let i = 0; i < 30; i++) {
    if (await p.eval('typeof __BH').catch(() => 'x') === 'object') break;
    await sleep(500);
  }
  console.log('線上版本 =', await p.eval('__BH.VERSION'));
  await p.eval("__BH.settings.ctrl='touch'; __BH.applyCtrl(); __BH.startMapTest(1); 1");
  await sleep(3000);
  console.log(await p.eval(`(function(){
    var G=__BH.Game, v=__BH.viewInfo();
    return JSON.stringify({ T:G.T, cols:G.cols, rows:G.rows,
      fillH:+(G.rows*G.T/v.h).toFixed(2), tilesW:+(v.w/G.T).toFixed(1),
      zoomMin: (function(){ for(var i=0;i<40;i++) __BH.Zoom.by(-0.14); var z=__BH.Game.zoomTarget; __BH.Zoom.reset(); return z; })() });
  })()`));
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
