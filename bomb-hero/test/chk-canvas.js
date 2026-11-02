const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9557, w: 900, h: 900 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.goto(URL, 2600);
    await sleep(1500);
    await p.eval("(function(){var BH=window.__BH;BH.settings.ctrl='touch';if(BH.applyCtrl)BH.applyCtrl();document.body.classList.add('touch');})()");
    await p.eval('window.__BH.startSolo(1)');
    await sleep(1500);
    const info = await p.eval(`(function(){
      var G=window.__BH.Game;
      function r(id){var e=document.getElementById(id);var b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)];}
      return {sw:r('stageWrap'),cv:r('cv'),T:G.T,cols:G.cols,rows:G.rows,
              mapW:Math.round(G.cols*G.T),mapH:Math.round(G.rows*G.T),
              z:G.zoom, cam:G.cam?[Math.round(G.cam.x),Math.round(G.cam.y)]:null,
              bg:getComputedStyle(document.getElementById('stageWrap')).backgroundColor};
    })()`);
    console.log(JSON.stringify(info, null, 1));
  } finally { await b.close(); }
})();
