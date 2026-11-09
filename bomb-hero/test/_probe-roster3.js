// test/_probe-roster2.js — v5.70：對戰清單細節（自己/隊色/勝場/死亡）
const { launch, sleep } = require('./cdp');
const M = `(function(){
  var ro = document.getElementById('pkRoster');
  if (!ro) return { err: 'no roster' };
  var cs = ro.querySelectorAll('.pcard');
  var out = [];
  for (var i = 0; i < cs.length; i++) {
    var c = cs[i], cv2 = c.querySelector('canvas');
    out.push({ cls: c.className, ring: c.style.getPropertyValue('--ring'),
      w: Math.round(c.getBoundingClientRect().width),
      cvw: cv2 ? Math.round(cv2.getBoundingClientRect().width) : 0,
      win: (c.querySelector('.pwin') || {}).textContent || '',
      border: cv2 ? getComputedStyle(cv2).borderColor : '' });
  }
  return { n: cs.length, cards: out, rosterCls: ro.className,
    roster: (function(){ var b=ro.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}; })(),
    timer: (function(){ var e=document.getElementById('hudTimer'); if(!e) return null; var b=e.getBoundingClientRect(); return {x:Math.round(b.x),w:Math.round(b.width)}; })() };
})()`;
(async () => {
  const b = await launch({ w: 900, h: 500, port: 9373 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  for (const s of [[430,932,'port'],[844,390,'land']]) {
    await p.resize(s[0], s[1], true);
    await p.goto('http://127.0.0.1:3111/', 1500);
    await p.eval("try{localStorage.setItem('bombhero-rotskip','1');localStorage.setItem('bombhero-zoomtip','1');}catch(e){}");
    await sleep(350);
    await p.eval(`(function(){
      var P = window.__BH; document.body.classList.add('touch','in-game');
      try { P.Cloud && (P.Cloud.online = function(){ return false; }); } catch(e){}
      P.settings.count = 8; P.Game.mode='battle'; P.startBattle();
      P.Game.state='play'; try{ P.ovHide(); }catch(e){}
      var bk=document.querySelector('.ovback'); if(bk) bk.style.display='none';
      var rh=document.getElementById('rotHint'); if(rh) rh.remove();
      // 造出「有勝場／有死人」的情境
      P.Game.players[0].wins = 2; P.Game.players[1].wins = 1;
      P.Game.players[2].alive = false;
    })()`);
    await sleep(700);
    const m = await p.eval(M);
    console.log('\n--- ' + s[2] + ' ---');
    console.log(JSON.stringify(m, null, 1));
    await p.shot('test/_v548/vs8-' + s[2] + '.png');
  }
  b.close();
})().catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });
