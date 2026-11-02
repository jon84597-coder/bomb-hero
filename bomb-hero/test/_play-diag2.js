// test/_play-diag2.js — 診斷：載入 bot 後是否會被打回標題
const { launch, sleep } = require('./cdp');
const path = require('path');
const FILE = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const BOT_SRC = require('./_bot-src.js');

(async () => {
  const b = await launch({ w: 1280, h: 900, port: 9344 });
  const pg = await b.newPage();
  try {
    await pg.goto(FILE, 2500);
    await pg.eval(`(function(){
      window.__errs = [];
      window.addEventListener('error', function(e){ window.__errs.push(String(e.message)); });
    })()`);
    const r0 = await pg.eval(`(function(){ try { eval(${JSON.stringify(BOT_SRC)}); return 'bot-ok:' + !!window.__bot; } catch(e){ return 'BOT_ERR:'+e.message; } })()`);
    console.log('BOTLOAD', r0);
    const r1 = await pg.eval(`(function(){
      const BH = window.__BH;
      try { BH.startSolo(1); } catch(e){ return 'solo_ERR:'+e.message; }
      try { BH.beginCountdown('battle'); } catch(e){ return 'cd_ERR:'+e.message; }
      try { window.__bot.attach(); } catch(e){ return 'att_ERR:'+e.message; }
      return 'ok';
    })()`);
    console.log('START', r1);
    await sleep(2200);
    const st2 = await pg.eval(`({screen:window.__BH.Screen.current, state:window.__BH.Game.state, hasP:!!window.__BH.Game.players[0], hasBot:!!window.__bot, errs:window.__errs})`);
    console.log('T2', JSON.stringify(st2));
    await sleep(4000);
    const st3 = await pg.eval(`({screen:window.__BH.Screen.current, state:window.__BH.Game.state, hasP:!!window.__BH.Game.players[0], bombs:window.__bot?window.__bot.st.bombsPlaced:-1, dirs:window.__bot?window.__bot.st.lastDirs:[], errs:window.__errs})`);
    console.log('T6', JSON.stringify(st3));
  } catch (e) {
    console.log('ERR', e.message);
  } finally { b.close(); }
})();
