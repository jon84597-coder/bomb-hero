// v4.52 目檢：商店 5000 金幣 + 遊戲畫面
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v452');
(async () => {
  const b = await launch({ port: 9651, w: 1280, h: 900 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 3000);
    for (let i = 0; i < 40; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    // 商店
    await p.eval("(function(){window.__BH.Shop.open();})()");
    await sleep(500);
    const txt = await p.eval("(function(){return (document.getElementById('shopGrid')||{}).textContent||'';})()");
    console.log('SHOP:', txt.replace(/\s+/g, ' ').slice(0, 200));
    await p.shot(path.join(OUT, 'shop-5000.png'));
    // 遊戲畫面
    await p.eval("(function(){var BH=window.__BH;BH.Screen.show('title');BH.startSolo(1);})()");
    await sleep(4200);
    await p.shot(path.join(OUT, 'play-v452.png'));
    console.log('OK');
  } finally { b.close(); }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
