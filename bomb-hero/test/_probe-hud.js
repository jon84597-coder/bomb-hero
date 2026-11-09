// test/_probe-hud.js — v5.70：量「畫布位移／頂列／計時器／小地圖」相對關係
const { launch, sleep } = require('./cdp');
const MEASURE = `(function(){
  function r(sel){ var e=document.querySelector(sel); if(!e) return null; var b=e.getBoundingClientRect();
    return { x:Math.round(b.x), y:Math.round(b.y), w:Math.round(b.width), h:Math.round(b.height) }; }
  var G = window.__BH && window.__BH.Game;
  var mm = null;
  try { if (window.__BH.miniMapOn && window.__BH.miniMapOn()) mm = window.__BH.miniMapBox(); } catch(e){}
  return { vw: innerWidth, vh: innerHeight, mode: G && G.mode, cols: G && G.cols, rows: G && G.rows,
    cv: r('#cv'), stage: r('#stageWrap'), top: r('#gameTop'), timer: r('#hudTimer'),
    roster: r('#pkRoster'), mm: mm, touch: document.body.classList.contains('touch') };
})()`;
(async () => {
  const b = await launch({ w: 900, h: 500, port: 9372 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  for (const s of [[844,390,'land'],[430,932,'port']]) {
    for (const mode of ['br','battle']) {
      await p.resize(s[0], s[1], true);
      await p.goto('http://127.0.0.1:3111/', 1500);
      await sleep(350);
      await p.eval(`(function(){
        var P = window.__BH; document.body.classList.add('touch','in-game');
        try { P.Cloud && (P.Cloud.online = function(){ return false; }); } catch(e){}
        ${mode==='br' ? 'P.startBR();' : "P.Game.mode='battle'; P.startBattle();"}
        try { localStorage.setItem('bombhero-rotskip','1'); } catch(e){}
        P.Game.state='play'; try{ P.ovHide(); }catch(e){}
        var bk=document.querySelector('.ovback'); if(bk) bk.style.display='none';
        var rh=document.getElementById('rotHint'); if(rh) rh.remove();
      })()`);
      await sleep(900);
      const m = await p.eval(MEASURE);
      console.log('\n--- ' + s[2] + ' / ' + mode + ' ---');
      console.log('  ' + JSON.stringify(m));
    }
  }
  b.close();
})().catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });
