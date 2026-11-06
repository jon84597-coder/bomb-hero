// 版本紀錄面板（手機）：確認 5.23 條目正常顯示、不擠爆
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_tabs');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  const b = await launch({ port: 9824, w: 430, h: 932 });
  const p = await b.newPage();
  await p.resize(430, 932, true);
  await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 5000);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(900);
  await p.eval(`(function(){ var b=document.getElementById('verLogBtn'); if(b) b.click(); return 1; })()`);
  await sleep(700);
  const r = await p.eval(`(function(){
    var m=document.querySelector('.vermodal.on')||document.querySelector('#verModal.on')||document.querySelector('#verLog.on');
    var items=document.querySelectorAll('.veritem, .vlogitem, .vlrow');
    var first=document.querySelector('.vlogitem, .veritem, .vlrow');
    return {modal: m?m.id||m.className:'none', items: items.length, h: first?Math.round(first.getBoundingClientRect().height):0,
      txt: (document.body.innerText.indexOf('分類列改版了')>=0)};
  })()`);
  console.log(JSON.stringify(r));
  await p.shot(path.join(OUT, 'verlog.png'));
  b.close();
})();
