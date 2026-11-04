const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ w: 844, h: 390 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2500);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(200); }
  await p.eval("document.body.classList.add('touch');1");
  await sleep(400);
  await p.eval("__BH.Screen.show('help');1");
  await sleep(600);
  console.log('maptest 存在 =', await p.eval("!!document.getElementById('mapTestRow')"));
  console.log('help 頁含 T1 =', await p.eval("/T1/.test(document.body.innerText)"));
  // 滾到底截圖
  await p.eval("(function(){var w=document.querySelector('.wrap'); w.scrollTop=99999; window.scrollTo(0,99999);})()");
  await sleep(600);
  await p.shot('test/_v484/ls-help-bottom.png');
  console.log('到底 hint =', await p.eval("document.getElementById('scrollHint').className"));
  try { await b.close(); } catch (e) {}
})().catch(e=>{console.error(e);process.exit(1);});
