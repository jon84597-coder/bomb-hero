const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
(async function () {
  const b = await launch({ port: 9628, w: 390, h: 844 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');localStorage.setItem('bombhero-br-ticket','9');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  const out = await p.eval(`(function(){
    var G = __BH.Game, T;
    __BH.startBR(); T = G.T;
    G.state = 'play';
    var cause = { zone: 0, other: 0 }, per = {}, t = 0;
    function outside(q) {
      var z = G.brZone, dx = q.x / T - (z.cx + .5), dy = q.y / T - (z.cy + .5);
      return dx*dx + dy*dy > z.r * z.r;
    }
    var before = G.players.map(function(q){ return q.alive; });
    for (var i = 0; i < 60 * 600; i++) {
      var outFlag = G.players.map(function(q){ return q.alive && outside(q); });
      __BH.updateBR(1/60); t += 1/60;
      for (var k = 0; k < G.players.length; k++) {
        if (before[k] && !G.players[k].alive) {
          if (outFlag[k]) { cause.zone++; } else { cause.other++; }
          var bucket = Math.floor(t / 60) * 60;
          per[bucket] = per[bucket] || { zone: 0, other: 0 };
          if (outFlag[k]) per[bucket].zone++; else per[bucket].other++;
          before[k] = false;
        }
      }
      if (G.players.filter(function(q){return q.alive;}).length <= 1) break;
    }
    return JSON.stringify({ end: Math.round(t), cause: cause, perMin: per });
  })()`);
  console.log(out);
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
