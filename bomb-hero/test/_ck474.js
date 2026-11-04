const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
(async function () {
  const b = await launch({ port: 9623, w: 390, h: 844 });
  const p = await b.newPage();
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  const out = await p.eval(`(function(){
    var G = __BH.Game, o = {};
    o.ticket0 = __BH.Shop.tickets();
    o.start = __BH.startBR();
    o.ticket1 = __BH.Shop.tickets();
    o.players = G.players.length; o.ai = G.players.filter(function(q){return q.ai;}).length;
    o.alive = G.brAlive; o.foes = G.enemies.length; o.T = G.T; o.artK = G.artK;
    o.zone = { r: G.brZone.r, t: G.brZone.t, phase: G.brZone.phase, cx: G.brZone.cx, cy: G.brZone.cy };
    o.map = G.cols + 'x' + G.rows;
    // 30 個出生點彼此距離
    var mind = 99;
    for (var i=0;i<G.players.length;i++) for (var j=i+1;j<G.players.length;j++){
      var a=G.players[i], c=G.players[j];
      var d=Math.abs(a.x-c.x)/G.T + Math.abs(a.y-c.y)/G.T;
      if (d<mind) mind=d;
    }
    o.minSpawnDist = +mind.toFixed(1);
    // 推進 61 秒 → 應該進入 phase 1
    G.state='play';
    for (var k=0;k<61*60;k++){ try{ __BH.updateBR(1/60); }catch(e){ return 'ERR '+e.message; } }
    o.zone61 = { r:+G.brZone.r.toFixed(1), phase: G.brZone.phase, alive: G.players.filter(function(q){return q.alive;}).length };
    return JSON.stringify(o);
  })()`);
  console.log(out);
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
