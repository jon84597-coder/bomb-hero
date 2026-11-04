const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ w: 900, h: 800 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2600);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(200); }
  await p.eval("__BH.Screen.show('settings');1");
  await sleep(500);
  await p.eval("(function(){var e=document.getElementById('saveBakLab'); if(e&&e.scrollIntoView) e.scrollIntoView({block:'center'});})()");
  await sleep(600);
  await p.shot('test/_v485/settings-save.png');
  await p.eval("document.getElementById('btnSaveExport').click();1");
  await sleep(400);
  console.log('code len =', await p.eval("document.getElementById('saveCode').value.length"));
  console.log('state =', await p.eval("document.getElementById('saveState').textContent"));
  await p.shot('test/_v485/settings-export.png');
  try { await b.close(); } catch (e) {}
})().catch(e => { console.error(e); process.exit(1); });
