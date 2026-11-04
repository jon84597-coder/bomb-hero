const { launch, sleep } = require('./cdp');
const path = require('path');
const URL = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
// 實驗：改參數看生存曲線（bombMul/foeR/hp）
async function run(p, bombMul, foeMul, hp) {
  const out = await p.eval(`(function(){
    var G = __BH.Game;
    __BH.startBR();
    G.players.forEach(function(q){ q.brHp = ${hp}; });
    // 直接改參數（AI_LEVELS 是共用物件，先備份）
    var L = __BH.AI_LEVELS || null;
    G.state = 'play';
    var log = [], t = 0;
    for (var i = 0; i < 60 * 600; i++) {
      __BH.updateBR(1/60); t += 1/60;
      if (i % (60*60) === 0) log.push(Math.round(t)+'s:'+G.players.filter(function(q){return q.alive;}).length);
      if (G.players.filter(function(q){return q.alive;}).length <= 1) { log.push('END@'+Math.round(t)+'s'); break; }
    }
    return log.join(' ');
  })()`);
  return out;
}
(async function () {
  const b = await launch({ port: 9625, w: 390, h: 844 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.resize(390, 844, true);
  await p.goto(URL, 3200);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  await p.eval("try{localStorage.setItem('bombhero-rotstip','1');localStorage.setItem('bombhero-br-ticket','9');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  for (const hp of [4, 8]) {
    console.log('hp=' + hp, await run(p, 1, 1, hp));
  }
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
