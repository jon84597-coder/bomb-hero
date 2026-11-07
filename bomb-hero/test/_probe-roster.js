// test/_probe-roster.js — v5.48：大逃殺／對戰頂部人物清單量測（直放＋橫放）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v548');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const MEASURE = `(function(){
  function r(sel){ var e = document.querySelector(sel); if(!e) return null;
    var b = e.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; }
  var ro = document.getElementById('pkRoster');
  var cards = ro ? ro.querySelectorAll('.pcard') : [];
  var c0 = cards.length ? cards[0].getBoundingClientRect() : null;
  return {
    vw: innerWidth, vh: innerHeight,
    mode: window.__BH && __BH.Game ? __BH.Game.mode : '?',
    nPlayers: window.__BH && __BH.Game && __BH.Game.players ? __BH.Game.players.length : 0,
    roster: r('#pkRoster'), nCards: cards.length,
    card0: c0 ? { x: Math.round(c0.x), y: Math.round(c0.y), w: Math.round(c0.width), h: Math.round(c0.height) } : null,
    top: r('#gameTop'), pause: r('#pauseBtn')
  };
})()`;

const SIZES = [
  { w: 844, h: 390, tag: 'br-land' },
  { w: 430, h: 932, tag: 'br-port' },
  { w: 844, h: 390, tag: 'vs-land' },
  { w: 430, h: 932, tag: 'vs-port' }
];

(async () => {
  const b = await launch({ w: 900, h: 500, port: 9371 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  for (const s of SIZES) {
    const vs = s.tag.indexOf('vs') === 0;
    await p.resize(s.w, s.h, true);
    await p.goto('http://127.0.0.1:3111/', 1500);
    await sleep(400);
    await p.eval(`(function(){
      var P = window.__BH;
      document.body.classList.add('touch', 'in-game');
      try { P.Cloud && P.Cloud.online && (P.Cloud.online = function(){ return false; }); } catch(e){}
      ${vs ? "P.Game.mode='battle'; P.Game.ffa=true; P.startBattle();" : "P.startBR();"}
      try { localStorage.setItem('bombhero-rotskip','1'); } catch(e){}
      P.Game.state = 'play';
      try { P.ovHide(); } catch(e){}
      var bk = document.querySelector('.ovback'); if (bk) bk.style.display='none';
      var rh = document.getElementById('rotHint'); if (rh) rh.remove();
    })()`);
    await sleep(1200);
    const m = await p.eval(MEASURE);
    console.log('\n--- ' + s.tag + ' ' + s.w + 'x' + s.h + ' ---');
    console.log('  mode', m.mode, 'players', m.nPlayers, 'cards', m.nCards);
    console.log('  roster', JSON.stringify(m.roster), 'card0', JSON.stringify(m.card0));
    console.log('  top', JSON.stringify(m.top), 'pause', JSON.stringify(m.pause));
    await p.shot(path.join(OUT, s.tag + '.png'));
  }
  b.close();
})().catch(e => { console.error('PROBE FAIL', e && e.stack || e); process.exit(1); });
