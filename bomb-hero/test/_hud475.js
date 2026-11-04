const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ w: 390, h: 800 });
  const p = await b.newPage();
  await p.goto(URL, 2000);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  await p.eval("__BH.BR.opt={n:50,team:4,dur:5}; __BH.startBR(); __BH.Game.state='play'; 1");
  console.log(await p.eval(`(function(){ var G=__BH.Game;
    var tm={}; G.players.forEach(function(q){ if(q.alive) tm[q.team|0]=1; });
    return JSON.stringify({brTeam:G.brTeam, total:G.players.length, teams:Math.ceil(G.players.length/(G.brTeam|1)), aliveTeams:Object.keys(tm).length});
  })()`));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
