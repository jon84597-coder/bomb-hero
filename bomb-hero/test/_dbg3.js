const { launch } = require('./cdp');
const path = require('path');
const OUT = path.join(__dirname, '_v573');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async()=>{
  const br = await launch({w:900,h:430,port:9397});
  const p = await br.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(900,430,true);
  await p.goto('https://bomb-hero-game.onrender.com/?unlock=all', 1500);
  await p.eval(`(function(){ try{ localStorage.setItem('bombhero-rotskip','1'); }catch(e){} return 1; })()`);
  await p.goto('https://bomb-hero-game.onrender.com/?unlock=all', 3800);
  for (let i=0;i<25;i++){ if (await p.eval('!!window.__BH')) break; await wait(400); }
  await p.eval(`(function(){ var P=window.__BH; P.Solo.unlocked=40; document.getElementById('btnAdventure').click(); document.getElementById('btnAbyss').click(); return 1; })()`);
  await wait(1500);
  await p.eval(`(function(){ var b=document.querySelector('#ovBox button'); if(b) b.click(); return 1; })()`);
  await wait(4200);
  const r = await p.eval(`(function(){
    var P=window.__BH, bd=document.getElementById('abyssBadge'), gt=document.getElementById('gameTop');
    var a=bd?bd.getBoundingClientRect():null, b=gt?gt.getBoundingClientRect():null;
    return { state:P.Game.state, w:window.innerWidth, h:window.innerHeight,
      bar: b?[Math.round(b.top),Math.round(b.bottom),Math.round(b.left),Math.round(b.right)]:null,
      badge: a?[Math.round(a.top),Math.round(a.bottom),Math.round(a.left),Math.round(a.right)]:null };
  })()`);
  console.log(JSON.stringify(r));
  await p.shot(path.join(OUT,'p56-land.png'));
  await br.close();
})();
