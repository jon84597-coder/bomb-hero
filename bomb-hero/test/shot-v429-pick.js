// v4.29：首頁選角預覽（小畫布）會不會被頭頂圖示擠爆
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v429');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9481, w: 1000, h: 900 });
  try {
    const p = await b.newPage();
    await p.goto(URL, 2600);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
    await sleep(2000);
    await p.shot(path.join(OUT, 'g-home.png'));

    // 進選角（首頁「單人」會先開角色選擇）
    await p.eval("(function(){var e=document.getElementById('btnSolo'); if(e) e.click();})()");
    await sleep(1400);
    await p.shot(path.join(OUT, 'h-pick.png'));
    console.log('DONE');
  } finally {
    await b.close();
  }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
