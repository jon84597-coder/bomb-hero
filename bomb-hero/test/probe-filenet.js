const path = require('path');
const { launch, sleep } = require('./cdp');
const LOCAL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
(async () => {
  const br2 = await launch({ w: 1280, h: 800, port: 9494 });
  const p2 = await br2.newPage();
  await p2.goto(LOCAL, 4000);
  await sleep(800);
  const b = await p2.eval(`(function(){
    return new Promise(function(res){
      var P = window.__BH;
      if (!P) { res({ err: 'no __BH', proto: location.protocol }); return; }
      P.Net.api('/api/relay/create', { name: 'probe', count: 4 }, function (err, j) {
        res({ err: err && (err.message || String(err)), proto: location.protocol });
      });
    });
  })()`);
  console.log('B. file:// create：', JSON.stringify(b));
  await br2.close();
})().catch(e => { console.error(e); process.exit(1); });
