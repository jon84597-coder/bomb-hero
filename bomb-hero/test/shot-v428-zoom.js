// v4.28 交付用截圖：58% 全場 / 100% / 185% 放大（投擲已移除，不再拍投擲）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v428');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9474, w: 1000, h: 780 });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 780, deviceScaleFactor: 2, mobile: false });
  await p.goto(URL, 2600);
  for (let i = 0; i < 40; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
  await p.eval('window.__BH.startSolo(1)');
  await sleep(500);
  await p.eval("(function(){var b=document.querySelector('#ovBox button'); if(b)b.click();})()");
  for (let i = 0; i < 60; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(250); }
  await sleep(1500);   // 等 GO! 與提示卡淡出

  async function shot(name, zoom) {
    const r = await p.eval(`(function(){
      var P=window.__BH,G=P.Game;
      P.Zoom.set(${zoom});
      for(var i=0;i<240;i++) P.Zoom.tick(1/60);
      try{P.hideDoorHint&&P.hideDoorHint();}catch(e){}
      G.players[0].invuln=0; G.camSnap=true; P.updateCamera(0.016); P.render();
      return JSON.stringify({z:G.zoom});
    })()`);
    console.log(name, r);
    await sleep(320);
    await p.shot(path.join(OUT, name + '.png'));
  }

  await shot('zoom58', 'P.Zoom.min');
  await shot('zoom100', '1');
  await shot('zoom185', 'P.Zoom.max');

  // 確認角色身上沒有多出來的投擲相關 UI
  const ui = await p.eval(`JSON.stringify({
    tthrow: !!document.querySelector('#touchUI .tthrow'),
    zoomPill: !!document.querySelector('#zoomPill'),
    ver: window.__BH.VERSION
  })`);
  console.log('UI', ui);
  await b.close();
})();
