// v4.26 八大地圖美術截圖：每個主題各一張（PC 高解析），並額外輸出「牆面局部放大」
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const OUT = path.join(__dirname, process.env.BH_SHOT_OUT || '_v426');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = process.env.BH_SHOT_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const NAMES = ['forest', 'sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark'];

(async () => {
  const b = await launch({ port: 9474, w: 900, h: 640 });
  try {
    for (let ti = 0; ti < 8; ti++) {
      const p = await b.newPage();
      await p.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 640, deviceScaleFactor: 2, mobile: false });
      await p.goto(URL, 2400);
      const stage = await p.eval(`(function(){
        var P = window.__BH;
        for (var s = 1; s <= 32; s++) { try { if (P.soloInfo(s).theme === ${ti}) return s; } catch (e) {} }
        return 0;
      })()`);
      if (!stage) { console.log('no stage for theme', ti); await p.send('Target.closeTarget', { targetId: p.targetId }); continue; }
      await p.eval(`window.__BH.startSolo(${stage})`);
      await sleep(450);
      await p.eval(`(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); return !!b2; })()`);
      await sleep(800);
      await p.eval(`(function(){
        var P = window.__BH;
        P.Game.gameT = 1.5;
        P.Game.camSnap = true;
        if (P.updateCamera) P.updateCamera();
        try { P.hideDoorHint && P.hideDoorHint(); } catch (e) {}
        if (P.render) P.render();
      })()`);
      await sleep(350);
      const f = path.join(OUT, 'theme' + ti + '-' + NAMES[ti] + '.png');
      await p.shot(f);
      const info = await p.eval(`JSON.stringify({ theme: window.__BH.Game.theme.name, style: window.__BH.Game.theme.style, stage: window.__BH.Game.stage, T: window.__BH.Game.T, cols: window.__BH.Game.cols, rows: window.__BH.Game.rows })`);
      console.log('theme' + ti, info);
      await p.send('Target.closeTarget', { targetId: p.targetId });
    }
  } finally { b.close(); }
  console.log('done -> ' + OUT);
})();
