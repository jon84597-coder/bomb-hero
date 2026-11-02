// v4.26 手機版確認：第 5 關（沙漠遺跡）與第 13 關（熔岩洞窟）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_SHOT_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, process.env.BH_SHOT_OUT || '_v426');
(async () => {
  const b = await launch({ port: 9476, w: 390, h: 844 });
  try {
    for (const stage of [5, 13]) {
      const p = await b.newPage();
      await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await p.goto(URL, 2600);
      await p.eval(`window.__BH.startSolo(${stage})`);
      await sleep(500);
      await p.eval(`(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); return !!b2; })()`);
      await sleep(700);
      // 直式提示（「橫著玩更過癮」）只在進遊戲後才出現 → 這時再按「直式繼續玩」
      const rh = await p.eval(`(function(){ var ok=document.getElementById('rhOk'); if(!ok) return 'none'; ok.click(); return 'clicked'; })()`);
      console.log('rotHint', rh);
      await sleep(700);
      await p.eval(`(function(){ var P=window.__BH; P.Game.gameT=1.5; P.Game.camSnap=true; if(P.updateCamera)P.updateCamera(); try{P.hideDoorHint&&P.hideDoorHint();}catch(e){} if(P.render)P.render(); })()`);
      await sleep(350);
      const f = path.join(OUT, 'mobile-stage' + stage + '.png');
      await p.shot(f);
      console.log('shot', f);
      await p.send('Target.closeTarget', { targetId: p.targetId });
    }
  } finally { b.close(); }
})();
