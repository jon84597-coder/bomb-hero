// test/_p74hud.js —— v5.74 頂欄驗收（430 與 360 直放，深淵三行 HUD）
const { launch } = require('./cdp');
const path = require('path');
const fs = require('fs');
const URL0 = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v574');
const wait = ms => new Promise(r => setTimeout(r, ms));

async function run(br, w, h, tag) {
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(w, h, true);
  await p.goto(URL0, 900);
  await p.eval("(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}return 1;})()");
  await p.goto(URL0, 3800);
  for (let i = 0; i < 30; i++) { if (await p.eval('!!window.__BH')) break; await wait(300); }
  await p.eval("(function(){var P=window.__BH;P.Solo.unlocked=40;P.Abyss.start(12);return 1;})()");
  await wait(1200);
  await p.eval("(function(){var b=document.querySelector('#ovBox button');if(b)b.click();return 1;})()");
  await wait(3600);
  const m = await p.eval(`(function(){
    var P=window.__BH, gt=document.getElementById('gameTop'), cv=document.getElementById('cv');
    var b=gt?gt.getBoundingClientRect():null, q=cv?cv.getBoundingClientRect():null;
    var over=[];
    if (gt) { var kids=gt.children; for (var i=0;i<kids.length;i++){
      var r=kids[i].getBoundingClientRect();
      if (r.right > gt.getBoundingClientRect().right + 0.6 || r.bottom > gt.getBoundingClientRect().bottom + 0.6)
        over.push((kids[i].id||kids[i].className||'?')+' '+Math.round(r.right)); } }
    return { state:P.Game.state, vw:innerWidth, vh:innerHeight,
      bar:b?[Math.round(b.top),Math.round(b.height)]:null,
      scrollW:gt?gt.scrollWidth:0, clientW:gt?gt.clientWidth:0,
      cvTop:q?Math.round(q.top):-1,
      text:(gt?gt.textContent:'').replace(/\\s+/g,' ').trim().slice(0,90),
      over:over }; })()`);
  console.log(tag, JSON.stringify(m));
  await p.shot(path.join(OUT, 'hud-' + tag + '.png'));
  await p.eval('1');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const br = await launch({ w: 430, h: 900, port: 9413 });
  await run(br, 430, 900, '430');
  await run(br, 360, 640, '360');
  await br.close();
})();
