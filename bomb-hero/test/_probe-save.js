const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ w: 900, h: 800 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2600);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(200); }
  console.log('VERSION =', await p.eval('__BH.VERSION'));
  console.log('window.Save =', await p.eval('typeof window.Save'));
  console.log('errors =', JSON.stringify(await p.eval('(window.__BHB&&window.__BHB.errs||[]).slice(0,5)')));
  console.log('snapshot =', await p.eval('JSON.stringify(window.Save.snapshot())'));
  console.log('encode len =', await p.eval('(function(){try{return window.Save.encodeDoc(window.Save.snapshot()).length}catch(e){return "ERR:"+e.message}})()'));
  console.log('roundtrip =', await p.eval(`(function(){
    try{
      var a=window.Save.snapshot(); var c=window.Save.encodeDoc(a); var d=window.Save.decodeDoc(c);
      return JSON.stringify({ok:!!d, stage:d&&d.stage, gold:d&&d.gold, same:JSON.stringify(d.daily)===JSON.stringify(a.daily)});
    }catch(e){return 'ERR:'+e.message}
  })()`));
  console.log('bad code =', await p.eval(`(function(){try{return String(window.Save.decodeDoc('BH1.zz.broken'))}catch(e){return 'ERR:'+e.message}})()`));
  console.log('UI =', await p.eval(`JSON.stringify({
    exportBtn: !!document.getElementById('btnSaveExport'),
    importBtn: !!document.getElementById('btnSaveImport'),
    box: !!document.getElementById('saveCode'),
    lab: (document.getElementById('saveBakLab')||{}).textContent
  })`));
  await p.eval("__BH.Screen.show('settings');1");
  await sleep(500);
  await p.shot('test/_v485/settings.png');
  try { await b.close(); } catch (e) {}
})().catch(e => { console.error(e); process.exit(1); });
