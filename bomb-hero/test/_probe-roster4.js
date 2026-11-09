// test/_probe-roster4.js — v5.70：窄手機（360）與桌機回歸
const { launch, sleep } = require('./cdp');
const M = `(function(){
  var ro=document.getElementById('pkRoster');
  var cards=ro?ro.querySelectorAll('.pcard'):[];
  var more=ro?ro.querySelector('.pmore'):null;
  var b=ro?ro.getBoundingClientRect():null, tm=document.getElementById('hudTimer');
  var tmb=tm?tm.getBoundingClientRect():null;
  return { vw:innerWidth, cards:cards.length, more: more? more.textContent:'', cls: ro?ro.className:'',
    row: b?{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}:null,
    timer: tmb?{x:Math.round(tmb.x),w:Math.round(tmb.width)}:null,
    card0: cards.length? (function(){var q=cards[0].getBoundingClientRect();return {w:Math.round(q.width),h:Math.round(q.height)};})():null };
})()`;
(async () => {
  const b = await launch({ w: 1300, h: 900, port: 9374 });
  const p = await b.newPage();
  const cases = [
    { w: 360, h: 780, touch: true, tag: 'narrow-port' },
    { w: 1280, h: 800, touch: false, tag: 'desktop' }
  ];
  for (const c of cases) {
    await p.resize(c.w, c.h, true);
    await p.send('Emulation.setTouchEmulationEnabled', c.touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
    await p.goto('http://127.0.0.1:3111/', 1500);
    await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');localStorage.setItem('bombhero-zoomtip','1');}catch(e){}})`);
    await sleep(300);
    await p.eval(`(function(){
      var P=window.__BH;
      if (${c.touch}) document.body.classList.add('touch');
      document.body.classList.add('in-game');
      try { P.Cloud && (P.Cloud.online = function(){ return false; }); } catch(e){}
      P.settings.count=8; P.Game.mode='battle'; P.startBattle();
      P.Game.state='play'; try{ P.ovHide(); }catch(e){}
      var bk=document.querySelector('.ovback'); if(bk) bk.style.display='none';
      var rh=document.getElementById('rotHint'); if(rh) rh.remove();
    })()`);
    await sleep(800);
    console.log('\n--- ' + c.tag + ' ---');
    console.log(JSON.stringify(await p.eval(M)));
    await p.shot('test/_v548/vs-' + c.tag + '.png');
  }
  b.close();
})().catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });
