// test/_probe-v471-frame.js — 直屏取景為何只畫上半？印出 render 實際用的尺寸
const { launch, sleep } = require('./cdp');
const path = require('path');

const OUT = path.join(__dirname, '_v471');
const PROBE = `(function(){
  var G = __BH.Game, v = __BH.viewInfo();
  var cv = document.getElementById('cv');
  var r = cv.getBoundingClientRect();
  return JSON.stringify({
    T: G.T, cols: G.cols, rows: G.rows, ox: G.ox, oy: G.oy,
    camX: Math.round(G.camX), camY: Math.round(G.camY), zoom: G.zoom,
    view: [v.w, v.h], rect: [Math.round(r.width), Math.round(r.height)],
    cssH: cv.clientHeight, cssW: cv.clientWidth,
    mapBottomOnScreen: Math.round(G.oy + G.rows * G.T - G.camY),
    mapRightOnScreen: Math.round(G.ox + G.cols * G.T - G.camX),
    inGame: document.body.className
  });
})()`;

(async function () {
  const br = await launch({ port: 9614, w: 390, h: 844 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto('file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/'), 3200);
  for (let i = 0; i < 40; i++) {
    if (await p.eval('typeof __BH') === 'object') break;
    await sleep(300);
  }
  await p.eval("try{localStorage.setItem('bombhero-rotstip','1')}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  console.log('before start ', await p.eval(PROBE));
  await p.eval('(function(){__BH.settings.mapMode="classic"; __BH.startSolo(3,false); __BH.Game.state="play"; return 1;})()');
  console.log('right after  ', await p.eval(PROBE));
  await sleep(1000);
  console.log('after 1s     ', await p.eval(PROBE));
  await p.eval('try{__BH.render()}catch(e){}');
  await p.shot(path.join(OUT, 'probe-frame.png'));
  await sleep(100);
  console.log('after render ', await p.eval(PROBE));
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
