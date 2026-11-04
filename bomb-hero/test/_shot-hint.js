const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ w: 844, h: 390 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2400);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(200); }
  await p.eval("document.body.classList.add('touch');1");
  await sleep(300);
  await p.eval("try{window.ScrollHint.sync();}catch(e){}1");
  await sleep(600);
  await p.shot('test/_v484/hint-bright.png');
  await sleep(2600);
  await p.shot('test/_v484/hint-dim.png');
  // 設定頁淡化後
  await p.eval("__BH.Screen.show('settings');1"); await sleep(2800);
  await p.shot('test/_v484/hint-dim-set.png');
  try { await b.close(); } catch (e) {}
  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
