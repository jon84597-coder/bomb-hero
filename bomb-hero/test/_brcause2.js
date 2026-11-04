const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
(async function () {
  const b = await launch({ port: 9629, w: 390, h: 844 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotstip','1');localStorage.setItem('bombhero-br-ticket','9');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  const sim = (o) => `(function(){
    var G = __BH.Game;
    __BH.startBR();
    ${o.noFoe ? 'G.enemies = [];' : ''}
    ${o.noBomb ? 'G.players.forEach(function(q){ q.maxBombs = 0; });' : ''}
    G.state = 'play';
    var log = [], t = 0;
    for (var i = 0; i < 60 * 600; i++) {
      __BH.updateBR(1/60); t += 1/60;
      if (i % (60*60) === 0) log.push(Math.round(t)+'s:'+G.players.filter(function(q){return q.alive;}).length);
      if (G.players.filter(function(q){return q.alive;}).length <= 1) { log.push('END@'+Math.round(t)+'s'); break; }
    }
    return log.join(' ');
  })()`;
  console.log('F 現況            ', await p.eval(sim({})));
  console.log('G 沒怪            ', await p.eval(sim({ noFoe: true })));
  console.log('H 沒怪、AI不放彈  ', await p.eval(sim({ noFoe: true, noBomb: true })));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
