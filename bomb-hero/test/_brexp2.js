const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
(async function () {
  const b = await launch({ port: 9626, w: 390, h: 844 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotstip','1');localStorage.setItem('bombhero-br-ticket','9');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  const sim = (killFoes, noDamage) => `(function(){
    var G = __BH.Game;
    __BH.startBR();
    if (${killFoes}) G.enemies = [];
    G.state = 'play';
    var log = [], t = 0;
    for (var i = 0; i < 60 * 600; i++) {
      __BH.updateBR(1/60); t += 1/60;
      if (${noDamage}) G.players.forEach(function(q){ if (q.alive) q.brHp = 99; });
      if (i % (60*60) === 0) log.push(Math.round(t)+'s:'+G.players.filter(function(q){return q.alive;}).length);
      if (G.players.filter(function(q){return q.alive;}).length <= 1) { log.push('END@'+Math.round(t)+'s'); break; }
    }
    return log.join(' ');
  })()`;
  console.log('A 有怪、正常  ', await p.eval(sim(false, false)));
  console.log('B 沒有怪      ', await p.eval(sim(true, false)));
  console.log('C 沒有怪、不死血', await p.eval(sim(true, true)));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
