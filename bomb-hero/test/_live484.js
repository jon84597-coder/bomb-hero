// test/_live484.js —— 線上實機煙霧測試（v4.84）
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || 'https://jon84597-coder.github.io/bomb-hero/index.html';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
(async () => {
  console.log('目標：' + URL);
  const b = await launch({ w: 844, h: 390 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(URL + '?cb=' + Date.now(), 5000);
  for (let i = 0; i < 60; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("document.body.classList.add('touch');1");
  await sleep(400);
  await p.eval("try{window.ScrollHint.sync();}catch(e){}1");
  await sleep(600);

  ok(await p.eval("__BH.VERSION") === '4.84', '線上版本 4.84');
  ok(await p.eval("!!document.getElementById('scrollHint')"), '#scrollHint 在線上頁面存在');
  ok((await p.eval("document.getElementById('scrollHint').className")).indexOf('on') >= 0, '橫屏首頁出現下滑提示');
  const lb = JSON.parse(await p.eval(`(function(){var e=document.getElementById('btnLearn');
    var b=e.getBoundingClientRect();return JSON.stringify({w:Math.round(b.width),h:Math.round(b.height),y:Math.round(b.y)});})()`));
  ok(lb.h <= 64 && lb.w > 600, '新手教學條正常（' + lb.w + '×' + lb.h + '）');
  ok(lb.y + lb.h <= 390, '新手教學條在第一屏內（底 ' + (lb.y + lb.h) + '）');
  ok(!(await p.eval("/T1/.test((document.getElementById('helpBody')||{}).textContent||'')")), '說明頁沒有 T1 測試按鈕');
  const txt = await p.eval("document.getElementById('scrollHintTxt').textContent");
  ok(/往下滑/.test(txt), '文案正確（' + txt + '）');
  await p.shot('test/_v484/live-ls.png');
  try { await b.close(); } catch (e) {}
  console.log('\n線上煙霧：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
