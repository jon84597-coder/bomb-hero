// v2.1 目檢截圖：美術 LOGO 標題（桌面／手機直放）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

(async () => {
  const br = await launch({ w: 1000, h: 700, port: 9402 });
  const page = await br.newPage();
  await page.goto(URL, 1800);
  const info = await page.eval(`(function(){
    var img = document.getElementById('titleLogo');
    var r = img.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), src: img.src.slice(0, 30), alt: img.alt };
  })()`);
  console.log('LOGO', JSON.stringify(info));
  await sleep(400);
  await page.shot(OUT + 'v21-1-title.png');

  await page.resize(390, 844, true);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, 1500);
  const n = await page.eval(`(function(){
    var img = document.getElementById('titleLogo');
    var r = img.getBoundingClientRect();
    return { w: Math.round(r.width), right: Math.round(r.right), vw: innerWidth };
  })()`);
  console.log('手機LOGO', JSON.stringify(n));
  await sleep(300);
  await page.shot(OUT + 'v21-2-title-phone.png');
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
