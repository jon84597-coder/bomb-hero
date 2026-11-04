// test/shot-crystal-zoom.js —— 三版水晶按鈕的 2 倍放大局部對照
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const F = 'file:///' + path.resolve(__dirname, '_crystal/demo.html').replace(/\\/g, '/');
const OUT = 'test/_crystal/';
(async () => {
  const b = await launch({ w: 1280, h: 1200 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 1200);
  await sleep(700);
  // 三欄各自的「單人闖關＋大逃殺」那一列，2 倍放大
  for (const v of ['v1', 'v2', 'v3']) {
    const r = JSON.parse(await p.eval(`
      (function(){
        var el = document.querySelector('.${v} .grid');
        var b = el.getBoundingClientRect();
        return JSON.stringify({x: b.x, y: b.y, w: b.width, h: b.height});
      })()
    `));
    const res = await p.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: r.x - 2, y: r.y - 2, width: r.w + 4, height: r.h + 4, scale: 2 }
    });
    fs.writeFileSync(OUT + 'zoom-' + v + '.png', Buffer.from(res.data, 'base64'));
    console.log(v, Math.round(r.w) + 'x' + Math.round(r.h), '-> zoom-' + v + '.png');
  }
  try { await b.close(); } catch (e) {}
  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
