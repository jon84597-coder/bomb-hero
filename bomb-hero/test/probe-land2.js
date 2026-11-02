// v2.5 診斷 2：橫放時「真的用手指拖」能不能捲動
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const br = await launch({ w: 844, h: 390, port: 9408 });
  const page = await br.newPage();
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, 1800);
  await sleep(400);

  async function drag(x0, y0, x1, y1) {
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const x = x0 + (x1 - x0) * i / steps, y = y0 + (y1 - y0) * i / steps;
      await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await sleep(16);
    }
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  const r0 = await page.eval(`(function(){
    var se = document.scrollingElement || document.documentElement;
    return { top: se.scrollTop, scrollH: se.scrollHeight, clientH: se.clientHeight };
  })()`);
  console.log('拖曳前', JSON.stringify(r0));

  // 從選單按鈕上開始往上拖（= 內容向下捲）
  await drag(420, 300, 420, 80);
  await sleep(300);
  const r1 = await page.eval(`(function(){
    var se = document.scrollingElement || document.documentElement;
    return { top: se.scrollTop };
  })()`);
  console.log('按鈕上拖曳後', JSON.stringify(r1));

  // 從空白處拖
  const r2 = await page.eval(`window.scrollTo(0,0); (document.scrollingElement||document.documentElement).scrollTop;`);
  await drag(60, 200, 60, 40);
  await sleep(300);
  const r3 = await page.eval(`(document.scrollingElement||document.documentElement).scrollTop;`);
  console.log('空白處拖曳後 scrollTop =', JSON.stringify([r2, r3]));

  await br.close();
})().catch(function (e) { console.error('ERR', e); process.exit(1); });
