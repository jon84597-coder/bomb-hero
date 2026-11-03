// test/_probe-v471-ab.js — 新版與 v4.70 舊版在「同一台手機、同一關」的取景對照
const { launch, sleep } = require('./cdp');
const path = require('path');

const OUT = path.join(__dirname, '_v471');
const PROBE = `(function(){
  var G = __BH.Game, v = __BH.viewInfo();
  return JSON.stringify({ T: G.T, ox: G.ox, oy: G.oy, cam: [Math.round(G.camX), Math.round(G.camY)],
    view: [v.w, v.h], zoom: G.zoom, cls: document.body.className });
})()`;

(async function () {
  const br = await launch({ port: 9615, w: 390, h: 844 });
  const files = [['old', '_bak_v471_pre.html'], ['new', 'index.html']];
  for (const f of files) {
    const p = await br.newPage();
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.resize(390, 844, true);
    const url = 'file:///' + path.join(__dirname, '..', f[1]).replace(/\\/g, '/');
    await p.goto(url, 3200);
    let ready = false;
    for (let i = 0; i < 50; i++) {
      const t = await p.eval('typeof __BH').catch(() => 'x');
      if (t === 'object') { ready = true; break; }
      await sleep(300);
    }
    if (!ready) { console.log(f[0], 'NOT READY'); continue; }
    await p.eval("try{localStorage.setItem('bombhero-rotstip','1');localStorage.setItem('bombhero-rotskip','1')}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
    await p.eval('(function(){__BH.settings.mapMode="classic"; __BH.startSolo(3,false); __BH.Game.state="play"; return 1;})()');
    await sleep(1200);
    await p.eval('(function(){var e=document.getElementById("rotHint"); if(e) e.remove(); __BH.render(); return 1;})()');
    await sleep(200);
    await p.shot(path.join(OUT, 'ab-' + f[0] + '.png'));
    console.log(f[0], await p.eval(PROBE));

  }
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
