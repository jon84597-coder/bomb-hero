// 對照：同一個關卡，關掉／打開後處理各拍一張（人眼比對用）
const { launch } = require('./cdp');
const path = require('path');
const URL0 = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v574');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await launch({ w: 430, h: 900, port: 9417 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(430, 760, true);
  await p.goto(URL0, 900);
  await p.eval("(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}return 1;})()");
  await p.goto(URL0, 3600);
  for (let i = 0; i < 30; i++) { if (await p.eval('!!window.__BH')) break; await wait(300); }
  await p.eval("(function(){var P=window.__BH;P.Solo.unlocked=40;P.startSolo(2);return 1;})()");
  await wait(1000);
  await p.eval("(function(){var b=document.querySelector('#ovBox button');if(b)b.click();return 1;})()");
  await wait(3200);
  await p.shot(path.join(OUT, 'grade-on.png'));
  await p.eval("(function(){window.__BH.GRADE_OFF=1; var B=window.__BH; try{B.drawGrade=function(){};}catch(e){} return 1;})()");
  await wait(600);
  await p.shot(path.join(OUT, 'grade-off.png'));
  console.log('ok');
  await br.close();
})();
