const { launch } = require('./cdp');
(async () => {
  const b = await launch({ w: 430, h: 900, port: 9401 });
  const p = await b.newPage();
  await p.resize(430, 900, true);
  await p.goto('http://127.0.0.1:3122/?unlock=all', 4200);
  await p.eval(`(function(){ try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}
    window.__BH.Solo.unlocked=40; window.__BH.Game.abyss={layer:7,perks:[]}; return 1; })()`);
  await p.eval(`(function(){ var l=document.getElementById('btnLearn'); if(l) l.click(); var g=document.getElementById('btnTourAll'); if(g) g.click(); return 1; })()`);
  for (let i = 0; i < 24; i++) {
    const st = await p.eval(`(function(){
      var P = window.__BH;
      var nx = document.getElementById('tutNext');
      var card = document.getElementById('tutCard');
      var vis = card ? (window.getComputedStyle(card).display !== 'none' && !card.classList.contains('hide')) : null;
      var r = { i: 0, screen: P.Screen.current, state: P.Game.state, bgm: P.AudioSys.lastBGM(),
                abyss: !!P.Game.abyss, cardVis: vis, cls: card ? card.className : '',
                title: (document.getElementById('tutTitle')||{}).textContent };
      if (nx) nx.click();
      return r;
    })()`);
    console.log(JSON.stringify(st));
    await new Promise(r => setTimeout(r, 800));
  }
  await b.close();
})();
