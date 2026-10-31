const { launch, sleep } = require('./cdp');
const URL = 'https://bomberman-online-87576.app.workbuddy.host/?sharecode=TI2OMANY5G';
(async () => {
  const br = await launch({ w: 1280, h: 800, port: 9491 });
  const p = await br.newPage();
  await p.goto(URL, 6000);
  await sleep(800);
  const r = await p.eval(`(function(){
    return new Promise(function(res){
      var P = window.__BH;
      P.Net.api('/api/relay/list', null, function (err, j) {
        res({ err: err && (err.message || String(err)), j: j, origin: location.origin, href: location.href });
      });
    });
  })()`);
  console.log(JSON.stringify(r, null, 1));
  console.log('responses:', errs);
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
