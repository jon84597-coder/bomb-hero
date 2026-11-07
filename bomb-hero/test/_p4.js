const { launch, sleep } = require('./cdp');
(async () => {
  const cdp = await launch({ port: 9448, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
  await p.eval(`__BH.startSolo(3)`); await sleep(600);
  await p.eval(`(function(){var b=document.querySelector('#ovBox button');if(b)b.click();})()`);
  await sleep(2500);
  console.log(await p.eval(`JSON.stringify({
    touch: document.body.classList.contains('touch'),
    VIEW: [__BH.viewInfo().w, __BH.viewInfo().h, __BH.viewInfo().dpr],
    T: __BH.Game.T, cols: __BH.Game.cols, rows: __BH.Game.rows,
    ox: __BH.Game.ox, oy: __BH.Game.oy, zoom: __BH.Game.zoom,
    cvCss: [document.getElementById('cv').clientWidth, document.getElementById('cv').clientHeight],
    cvPx: [document.getElementById('cv').width, document.getElementById('cv').height],
    boardW: __BH.Game.T * __BH.Game.cols, boardH: __BH.Game.T * __BH.Game.rows
  })`));
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
