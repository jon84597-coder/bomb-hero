// 首頁 🎁 按鈕與面板的實機截圖（桌機＋手機）
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || 'file:///C:/Users/jon84/WorkBuddy/2026-10-30-12-58-54/bomb-hero/index.html';
(async () => {
  const b = await launch({ w: 900, h: 700 });
  const p = await b.newPage();
  await p.goto(URL, 1500);
  for (let i = 0; i < 60; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(250); }
  await sleep(500);
  // 捲到底 → 看最後一排卡片跟 🎁 的關係
  await p.eval("window.scrollTo(0, document.body.scrollHeight);1");
  await sleep(500);
  await p.shot('test/_shot-gift-desktop.png');
  // 手機直式
  await p.resize(390, 844, true);
  await p.eval("document.body.classList.add('touch');1");
  await sleep(700);
  await p.eval("window.scrollTo(0, document.body.scrollHeight);1");
  await sleep(500);
  await p.shot('test/_shot-gift-phone.png');
  await p.eval("document.getElementById('giftBtn').click();1");
  await sleep(600);
  await p.shot('test/_shot-gift-panel-phone.png');
  b.close();
  console.log('shots ok');
})().catch(e => { console.error(e); process.exit(1); });
