const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
(async function () {
  const b = await launch({ port: 9641, w: 390, h: 844 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');localStorage.setItem('bombhero-br-ticket','9');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  console.log('start', await p.eval('(function(){try{return String(__BH.startBR())}catch(e){return "THROW "+e.message+" | "+e.stack.split("\\n")[1]}})()'));
  console.log('screen', await p.eval('__BH.Screen.current + " state=" + __BH.Game.state + " cols=" + __BH.Game.cols + " T=" + __BH.Game.T'));
  console.log('render', await p.eval('(function(){try{__BH.render(); return "ok"}catch(e){return "THROW "+e.message+" | "+(e.stack||"").split("\\n").slice(0,3).join(" >> ")}})()'));
  console.log('errs', await p.eval('JSON.stringify((window.__BHB&&window.__BHB.errs||[]).slice(0,3))'));
  await p.shot(path.join(__dirname, '_v474', 'dbg.png'));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
