// test/_play-diag.js — 逐步診斷為什麼 startSolo 後又回到標題
const { launch, sleep } = require('./cdp');
const path = require('path');
const FILE = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ w: 1280, h: 900, port: 9343 });
  const pg = await b.newPage();
  try {
    await pg.goto(FILE, 2500);
    await pg.eval(`(function(){
      window.__errs = [];
      window.addEventListener('error', function(e){ window.__errs.push(String(e.message)); });
      const BH = window.__BH;
      window.__r1 = (function(){ try { BH.startSolo(1); return 'ok'; } catch(e){ return 'ERR:'+e.message; } })();
      window.__r2 = (function(){ try { BH.beginCountdown('battle'); return 'ok'; } catch(e){ return 'ERR:'+e.message; } })();
    })()`);
    const st1 = await pg.eval(`({r1:window.__r1, r2:window.__r2, screen:window.__BH.Screen.current, state:window.__BH.Game.state, errs:window.__errs})`);
    console.log('T0', JSON.stringify(st1));
    await sleep(2200);
    const st2 = await pg.eval(`({screen:window.__BH.Screen.current, state:window.__BH.Game.state, hasP:!!window.__BH.Game.players[0], errs:window.__errs})`);
    console.log('T2', JSON.stringify(st2));
    await sleep(3000);
    const st3 = await pg.eval(`({screen:window.__BH.Screen.current, state:window.__BH.Game.state, hasP:!!window.__BH.Game.players[0], errs:window.__errs})`);
    console.log('T5', JSON.stringify(st3));
  } catch (e) {
    console.log('ERR', e.message);
  } finally { b.close(); }
})();
