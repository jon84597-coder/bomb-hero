// test/shot-v482.js —— 水晶高光按鈕套用後的首頁實測截圖
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = 'test/_v482/';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  async function page(w, h) {
    const b = await launch({ w, h });
    const p = await b.newPage();
    await p.send('Runtime.enable');
    await p.goto(F, 2500);
    for (let i = 0; i < 40; i++) {
      if (await p.eval('typeof __BH') === 'object') break;
      await sleep(250);
    }
    await sleep(800);
    return { b, p };
  }

  // 手機
  let { b, p } = await page(390, 844);
  await p.fullShot(OUT + 'home-390.png');
  console.log('手機頁高 =', await p.eval('Math.round(document.documentElement.scrollHeight)'));
  await p.eval("document.getElementById('btnMoreMenu').click();1");
  await sleep(350);
  await p.fullShot(OUT + 'drawer-390.png');
  await p.eval("document.getElementById('btnMulti').click();1");
  await sleep(400);
  await p.shot(OUT + 'multipick-390.png');
  await p.eval("__BH.showMultiPick(false);__BH.Screen.show('solo');__BH.Solo.renderGrid();__BH.Solo.renderChar();1");
  await sleep(500);
  await p.fullShot(OUT + 'solo-boss.png');
  // 2 倍放大看水晶細節（回到首頁再量）
  await p.eval("__BH.Screen.show('title');1");
  await sleep(300);
  const rc = JSON.parse(await p.eval(`(function(){
    var el=document.querySelector('#homeMenu .mgrid'); var b=el.getBoundingClientRect();
    return JSON.stringify({x:b.x,y:b.y,w:b.width,h:b.height});
  })()`));
  const res = await p.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: rc.x - 2, y: rc.y - 2, width: rc.w + 4, height: rc.h + 4, scale: 2 }
  });
  fs.writeFileSync(OUT + 'zoom-cards.png', Buffer.from(res.data, 'base64'));
  console.log('zoom-cards 已存');
  try { await b.close(); } catch (e) {}

  // 桌機
  ({ b, p } = await page(1280, 900));
  await p.fullShot(OUT + 'home-1280.png');
  console.log('桌機頁高 =', await p.eval('Math.round(document.documentElement.scrollHeight)'));
  try { await b.close(); } catch (e) {}

  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });
