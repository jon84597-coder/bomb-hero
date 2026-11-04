// test/shot-crystal.js —— 水晶按鈕三版對照截圖
const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '_crystal/demo.html').replace(/\\/g, '/');
const OUT = 'test/_crystal/';
(async () => {
  const b = await launch({ w: 1280, h: 1200 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 1200);
  await sleep(600);
  await p.fullShot(OUT + 'compare.png');
  const h = await p.eval('Math.round(document.documentElement.scrollHeight)');
  console.log('full height =', h);
  // 手機寬度單獨一張（V1／V2 疊起來看實際密度）
  const b2 = await launch({ w: 390, h: 900 });
  const p2 = await b2.newPage();
  await p2.send('Runtime.enable');
  await p2.goto(F, 1200);
  await sleep(500);
  await p2.fullShot(OUT + 'mobile.png');
  console.log('mobile height =', await p2.eval('Math.round(document.documentElement.scrollHeight)'));
  try { await b.close(); } catch (e) {}
  try { await b2.close(); } catch (e) {}
  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
