// test/shot-v471.js — v4.71 目檢：直放／橫放的格子大小要一樣 ＋ 小地圖在左上不被按鈕擋住
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v471');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const CLEAN = `(function(){
  ['rotHint','zoomHint'].forEach(function(id){var e=document.getElementById(id); if(e) e.remove();});
  ['zoomPill','banner','toast'].forEach(function(id){var e=document.getElementById(id); if(e) e.style.display='none';});
  var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
  return 1;
})()`;

function scene(stage, mapMode) {
  return `(function(){
    var G = __BH.Game;
    __BH.settings.mapMode = ${mapMode ? "'random'" : "'classic'"};
    __BH.startSolo(${stage}, false);
    G.state = 'play';
    G.zoom = G.zoomTarget = 1; G.camSnap = true;
    var me = G.players[0]; me.invuln = 0;
    try { __BH.updateCamera(1); __BH.render(); } catch (e) {}
    var mm = __BH.miniMapBox ? __BH.miniMapBox() : null;
    return JSON.stringify({ T: G.T, cols: G.cols, rows: G.rows, vw: __BH.viewInfo().w, vh: __BH.viewInfo().h,
      mini: __BH.miniMapOn(), mm: mm });
  })()`;
}

(async function () {
  const br = await launch({ port: 9612, w: 390, h: 844 });
  async function page(w, h) {
    const p = await br.newPage();
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.resize(w, h, true);
    await p.goto(URL, 3200);
    for (let i = 0; i < 40; i++) {
      const a = await p.eval('typeof __BH').catch(() => 'x');
      if (a === 'object') break;
      await sleep(300);
    }
    await p.eval("try{localStorage.setItem('bombhero-rotstip','1');localStorage.setItem('bombhero-rotskip','1')}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
    await p.eval(CLEAN);
    return p;
  }
  async function shot(p, name) {
    await sleep(800);                    // 讓遊戲迴圈把版面量好（resizeView 每 0.4s 一次）
    await p.eval(CLEAN);
    await p.eval('try{__BH.render()}catch(e){}');
    await sleep(260);
    await p.shot(path.join(OUT, name));
    console.log('  state', await p.eval('(function(){var G=__BH.Game;var v=__BH.viewInfo();return JSON.stringify({T:G.T,vw:v.w,vh:v.h,ox:G.ox,oy:G.oy,cam:[Math.round(G.camX),Math.round(G.camY)],zoom:G.zoom});})()'));
  }

  // 直放 390×844
  let p = await page(390, 844);
  console.log('portrait/classic ', await p.eval(scene(3, false)));
  await shot(p, 'portrait-classic.png');
  console.log('portrait/random  ', await p.eval(scene(20, true)));
  await shot(p, 'portrait-random.png');

  // 橫放 844×390
  let l = await page(844, 390);
  console.log('landscape/classic', await l.eval(scene(3, false)));
  await shot(l, 'landscape-classic.png');
  console.log('landscape/random ', await l.eval(scene(20, true)));
  await shot(l, 'landscape-random.png');

  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
