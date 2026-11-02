const path = require('path');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v428');
const URL = 'file:///' + path.resolve(__dirname, '../art/foes/stage1-playground.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9486, w: 1440, h: 980 });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });
  await p.goto(URL, 2600);
  await sleep(600);
  await p.eval("document.getElementById('btnAll').click()");
  await sleep(1800);
  // 把玩家移到中間，讓 beetle 進仇恨圈
  await p.eval("document.getElementById('btnAtk').click()");
  await sleep(800);                        // WINDUP .55s 之後 → DASH
  console.log('t.8s', await p.eval('JSON.stringify(window.__foes())'));
  await p.shot(path.join(OUT, 'pg-5-dash.png'));
  console.log('states', await p.eval('JSON.stringify(window.__foes())'));
  await sleep(1600);
  await p.eval("document.getElementById('btnDie').click()");
  await sleep(220);
  await p.shot(path.join(OUT, 'pg-6-die.png'));
  console.log('ERR', await p.eval('JSON.stringify(window.__e)'));
  await b.close();
})();
