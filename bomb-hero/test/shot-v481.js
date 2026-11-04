// test/shot-v481.js —— v4.81 首頁分層截圖（手機／桌機／抽屜／多人選擇器／外語）
const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = 'test/_v481/';
(async () => {
  const rows = [];
  async function page(w, h) {
    const b = await launch({ w, h });
    const p = await b.newPage();
    await p.send('Runtime.enable');
    await p.goto(F, 2500);
    for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(250); }
    await sleep(800);
    return { b, p };
  }
  // 手機
  let { b, p } = await page(390, 844);
  await p.fullShot(OUT + 'home-390.png');
  rows.push(['home-390', await p.eval('Math.round(document.documentElement.scrollHeight)')]);
  await p.eval("document.getElementById('btnMoreMenu').click();1");
  await sleep(350);
  await p.fullShot(OUT + 'drawer-390.png');
  await p.eval("document.getElementById('btnMoreMenu').click();document.getElementById('btnMulti').click();1");
  await sleep(350);
  await p.shot(OUT + 'multipick-390.png');
  await p.eval("__BH.showMultiPick(false);__BH.Screen.show('solo');__BH.Solo.renderGrid();__BH.Solo.renderChar();1");
  await sleep(500);
  await p.fullShot(OUT + 'solo-boss.png');
  try { await b.close(); } catch (e) {}
  // 桌機
  ({ b, p } = await page(1280, 900));
  await p.fullShot(OUT + 'home-1280.png');
  rows.push(['home-1280(900h)', await p.eval('Math.round(document.documentElement.scrollHeight)')]);
  try { await b.close(); } catch (e) {}
  // 外語
  ({ b, p } = await page(390, 844));
  for (const lg of ['en', 'de', 'ja']) {
    await p.eval(`__BH.setLang('${lg}');__BH.homeFill();1`);
    await sleep(400);
    await p.fullShot(OUT + 'home-' + lg + '.png');
  }
  try { await b.close(); } catch (e) {}
  rows.forEach(r => console.log(r[0] + ' 頁面高度 ' + r[1] + 'px'));
  console.log('done');
})();
