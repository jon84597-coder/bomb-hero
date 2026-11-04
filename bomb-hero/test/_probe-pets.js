const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ w: 900, h: 800 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2600);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(200); }
  console.log('shop.state =', await p.eval('JSON.stringify(window.__BH.Shop.state())'));
  console.log('setState =', await p.eval(`(function(){try{ window.__BH.Shop.setState({gold:1234,tickets:5,pets:[{kind:'blade',ch:2}]}); return JSON.stringify(window.__BH.Shop.state()); }catch(e){return 'ERR:'+e.message}})()`));
  console.log('snapshot =', await p.eval('JSON.stringify(window.Save.snapshot())'));
  console.log('decode =', await p.eval(`(function(){
    var c=window.Save.encodeDoc({stage:3,gold:50,tickets:2,pets:[{kind:'blade',ch:1}],tut:{},daily:{}});
    var d=window.Save.decodeDoc(c);
    return JSON.stringify({code:c,decoded:d});
  })()`));
  try { await b.close(); } catch (e) {}
})().catch(e => { console.error(e); process.exit(1); });
