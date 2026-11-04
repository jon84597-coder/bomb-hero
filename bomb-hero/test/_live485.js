const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || 'https://jon84597-coder.github.io/bomb-hero/index.html';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
(async () => {
  console.log('目標：' + URL);
  const b = await launch({ w: 900, h: 800 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(URL + '?cb=' + Date.now(), 6000);
  for (let i = 0; i < 60; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }

  ok(await p.eval('__BH.VERSION') === '4.85', '線上版本 4.85');
  ok(await p.eval('typeof window.Save') === 'object', 'Save 模組在線上載入');
  ok((await p.eval('(window.__BHB&&window.__BHB.errs||[]).length')) === 0, '沒有載入錯誤');

  await p.eval("__BH.Screen.show('settings');1");
  await sleep(400);
  ok(await p.eval("!!document.getElementById('btnSaveExport')"), '設定頁有匯出按鈕');
  ok(await p.eval("!!document.getElementById('btnSaveImport')"), '設定頁有還原按鈕');
  ok(await p.eval("(document.getElementById('saveBakLab')||{}).textContent") === '存檔備份', '標題已注入');

  const code = await p.eval(`(function(){
    try{
      window.__BH.Solo.unlocked = 9;
      return window.Save.encodeDoc(window.Save.snapshot());
    }catch(e){ return 'ERR:'+e.message }
  })()`);
  ok(/^BH1\.[0-9a-z]+\./.test(code), '線上可產生存檔碼（' + String(code).length + ' 字元）');
  const back = await p.eval(`(function(){
    try{
      var o = window.Save.decodeDoc(${JSON.stringify(code)});
      return o ? o.stage : 'FAIL';
    }catch(e){ return 'ERR:'+e.message }
  })()`);
  ok(back === 9, '線上可解回同一份進度（stage=' + back + '）');

  await p.eval("(function(){var e=document.getElementById('saveBakLab'); if(e&&e.scrollIntoView) e.scrollIntoView({block:'center'});})()");
  await sleep(500);
  await p.shot('test/_v485/live-pages.png');
  try { await b.close(); } catch (e) {}
  console.log('\n線上（Pages）：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
