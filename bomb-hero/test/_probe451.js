const path = require('path');
const { launch } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9611, w: 1280, h: 800 });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await p.goto(URL + '?maptest=1', 3200);
  const r = await p.eval([
    '(function(){',
    '  var B=window.__BH, cv=document.getElementById("cv"), w=document.querySelector("#stageWrap");',
    '  var r=cv.getBoundingClientRect();',
    '  return JSON.stringify({ rect:[r.width,r.height], client:[cv.clientWidth,cv.clientHeight],',
    '    wrap:[w.clientWidth,w.clientHeight], T:B.Game.T, rows:B.Game.rows, cols:B.Game.cols,',
    '    sz:B.canvasSize?B.canvasSize():null, view:B.viewInfo() });',
    '})()'
  ].join('\n'));
  console.log(r);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
