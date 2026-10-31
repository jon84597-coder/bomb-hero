// 快速探針：RPG 創角畫面的角色預覽為什麼是空的
const path = require('path');
const { launch, sleep } = require('./cdp');
(async function () {
  const br = await launch({ w: 1180, h: 860, port: 9553 });
  const page = await br.newPage();
  const errs = [];
  await page.goto('file:///' + path.resolve(__dirname, '..').replace(/\\/g, '/') + '/index.html', 2600);
  await sleep(600);
  await page.eval(`window.__err=[]; window.addEventListener('error', function(e){ window.__err.push(String(e.message)); });`);
  await page.eval(`document.getElementById('btnRpg').click()`);
  await sleep(900);
  const r = await page.eval(`JSON.stringify((function(){
    var cv = document.querySelector('#rpgCharRow canvas');
    var g = cv && cv.getContext ? cv.getContext('2d') : null;
    var n = 0;
    if (g) { var d = g.getImageData(0,0,cv.width,cv.height).data;
      for (var i=3;i<d.length;i+=4) if (d[i]>10) n++; }
    return { has: !!cv, w: cv && cv.width, h: cv && cv.height,
             ink: n, err: window.__err, screen: window.__BH.Screen.current,
             items: (function(){ try { return 'n/a'; } catch(e){ return 'x'; } })() };
  })())`);
  console.log(r);
  // 對照：單人畫面的預覽
  await page.eval(`document.querySelector('[data-back]').click()`);
  await sleep(300);
  await page.eval(`document.getElementById('btnSolo').click()`);
  await sleep(900);
  console.log(await page.eval(`JSON.stringify((function(){
    var cv = document.querySelector('#soloCharRow canvas');
    var g = cv.getContext('2d');
    var d = g.getImageData(0,0,cv.width,cv.height).data, n=0;
    for (var i=3;i<d.length;i+=4) if (d[i]>10) n++;
    return { ink: n, w: cv.width, h: cv.height };
  })())`));
  await br.close();
})().catch(e => { console.error(e.message); process.exit(1); });
