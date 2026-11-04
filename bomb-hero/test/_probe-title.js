// test/_probe-title.js —— 追首頁垂直空間被誰吃掉
const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ w: 844, h: 390 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2200);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(200); }
  await p.eval("document.body.classList.add('touch');1");
  await sleep(400);
  const dump = `(function(){
    function r(sel){var e=document.querySelector(sel);if(!e)return null;var b=e.getBoundingClientRect();
      var st=getComputedStyle(e);
      return {y:Math.round(b.y),h:Math.round(b.height),pad:st.paddingTop+'/'+st.paddingBottom,
        jc:st.justifyContent, ai:st.alignItems, disp:st.display, mh:st.minHeight};}
    return {wrap:r('.wrap'), scr:r('#scr-title'), card:r('#scr-title .title-card'),
      tw:r('.titlewrap'), logo:r('#titleLogo'), menu:r('#homeMenu'),
      bodyH:document.body.getBoundingClientRect().height,
      bodyDisp:getComputedStyle(document.body).display,
      bodyAI:getComputedStyle(document.body).alignItems,
      scrollHint: (function(){var e=document.getElementById('scrollHint');
        return e?{cls:e.className, op:getComputedStyle(e).opacity, txt:(document.getElementById('scrollHintTxt')||{}).textContent}:null;})()};
  })()`;
  console.log('--- 原始 ---');
  console.log(JSON.stringify(await p.eval(dump), null, 1));

  await p.eval("document.getElementById('scr-title').style.justifyContent='flex-start';1");
  await sleep(200);
  console.log('--- justify flex-start ---');
  console.log(JSON.stringify(await p.eval(`(function(){
    function r(sel){var e=document.querySelector(sel);var b=e.getBoundingClientRect();return {y:Math.round(b.y),h:Math.round(b.height)};}
    return {card:r('#scr-title .title-card'), logo:r('#titleLogo'), menu:r('#homeMenu'), learn:r('#btnLearn')};
  })()`), null, 1));

  await p.eval("document.getElementById('scr-title').style.justifyContent='';document.querySelector('.wrap').style.paddingTop='8px';1");
  await sleep(200);
  console.log('--- wrap padding-top 8 ---');
  console.log(JSON.stringify(await p.eval(`(function(){
    function r(sel){var e=document.querySelector(sel);var b=e.getBoundingClientRect();return {y:Math.round(b.y),h:Math.round(b.height)};}
    return {card:r('#scr-title .title-card'), logo:r('#titleLogo'), menu:r('#homeMenu'), learn:r('#btnLearn')};
  })()`), null, 1));

  try { await b.close(); } catch (e) {}
})().catch(e => { console.error(e); process.exit(1); });
