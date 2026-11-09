const { launch } = require('./cdp');
const path = require('path');
const URL0 = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await launch({ w: 430, h: 860, port: 9403 });
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(430, 860, true);
  await p.goto(URL0, 1000);
  await p.eval(`(function(){ try{ localStorage.setItem('bombhero-rotskip','1'); }catch(e){} return 1; })()`);
  await p.goto(URL0, 3600);
  for (let i = 0; i < 25; i++) { if (await p.eval('!!window.__BH')) break; await wait(300); }
  await p.eval(`(function(){ var P=window.__BH; P.Solo.unlocked=40; P.Abyss.start(1); return 1; })()`);
  await wait(1400);
  // 點「出發」
  await p.eval(`(function(){ var b=document.querySelector('#ovBox button'); if(b) b.click(); return 1; })()`);
  await wait(4200);
  const r = await p.eval(`(function(){
    var P=window.__BH, gt=document.getElementById('gameTop');
    var b=gt?gt.getBoundingClientRect():null;
    var cv=document.getElementById('cv');
    var q=cv?cv.getBoundingClientRect():null;
    return { state: P.Game.state, vw:innerWidth, vh:innerHeight,
      bar: b?[Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)]:null,
      cv: q?[Math.round(q.top),Math.round(q.height),Math.round(q.width)]:null,
      cols: P.Game.cols, rows: P.Game.rows, T: Math.round(P.Game.T||0) };
  })()`);
  console.log(JSON.stringify(r));
  await p.shot(path.join(__dirname, '_v573', 'dbg-portrait-play.png'));
  await br.close();
})();
