const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ w: 390, h: 844 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2400);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(200); }
  await p.eval("document.body.classList.add('touch');1");
  await sleep(600);
  console.log(await p.eval(`(function(){
    function r(sel){var e=document.querySelector(sel);if(!e)return null;var st=getComputedStyle(e);
      var b=e.getBoundingClientRect();
      return {y:Math.round(b.y),h:Math.round(b.height),sh:e.scrollHeight,ch:e.clientHeight,
        oy:st.overflowY, disp:st.display, pos:st.position};}
    return JSON.stringify({
      body:{sh:document.body.scrollHeight,ch:document.body.clientHeight,oy:getComputedStyle(document.body).overflowY},
      html:{sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight,oy:getComputedStyle(document.documentElement).overflowY},
      win:{ih:window.innerHeight,sy:window.pageYOffset},
      wrap:r('.wrap'), scr:r('#scr-title'), card:r('#scr-title .title-card'), menu:r('#homeMenu')
    },null,1);
  })()`));
  // 試著滑
  await p.eval("window.scrollTo(0,999);1"); await sleep(300);
  console.log('scrollTo 後 pageYOffset =', await p.eval('window.pageYOffset'));
  await p.eval("document.querySelector('.wrap').scrollTop=999;1"); await sleep(300);
  console.log('wrap.scrollTop =', await p.eval("document.querySelector('.wrap').scrollTop"));
  try { await b.close(); } catch (e) {}
})().catch(e=>{console.error(e);process.exit(1);});
