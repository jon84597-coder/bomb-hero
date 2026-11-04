const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
(async function () {
  const b = await launch({ port: 9624, w: 390, h: 844 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');localStorage.setItem('bombhero-br-ticket','9');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  const out = await p.eval(`(function(){
    var G = __BH.Game;
    __BH.startBR();
    G.state = 'play';
    var log = [], t = 0, prev = G.players.filter(function(q){return q.alive;}).length;
    for (var i = 0; i < 60 * 600; i++) {
      try { __BH.updateBR(1/60); } catch (e) { return 'ERR ' + e.message + ' @' + t; }
      t += 1/60;
      if (i % (60*30) === 0) {
        var al = G.players.filter(function(q){return q.alive;}).length;
        log.push(Math.round(t) + 's:' + al + '(z' + G.brZone.r.toFixed(0) + ',p' + G.brZone.phase + ')');
      }
      var al2 = G.players.filter(function(q){return q.alive;}).length;
      if (al2 <= 1) { log.push('END@' + Math.round(t) + 's'); break; }
    }
    return JSON.stringify({ T: G.T, log: log.join(' ') });
  })()`);
  console.log(out);
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
