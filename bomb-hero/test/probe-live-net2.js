const path = require('path');
const { launch, sleep } = require('./cdp');
const LIVE = 'https://bomberman-online-87576.app.workbuddy.host/?sharecode=TI2OMANY5G';
const LOCAL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
(async () => {
  // A. 線上版 POST create
  const br = await launch({ w: 1280, h: 800, port: 9492 });
  const p = await br.newPage();
  await p.goto(LIVE, 6000);
  await sleep(800);
  const a = await p.eval(`(function(){
    return new Promise(function(res){
      window.__BH.Net.api('/api/relay/create', { name: 'probe', count: 4 }, function (err, j) {
        res({ err: err && (err.message || String(err)), ok: j && j.ok, code: j && j.code });
      });
    });
  })()`);
  console.log('A. 線上版 create：', JSON.stringify(a));
  await br.close();

  // B. 本機 file:// 直接打開 index.html
  const br2 = await launch({ w: 1280, h: 800, port: 9493 });
  const p2 = await br2.newPage();
  await p2.goto(LOCAL, 4000);
  await sleep(600);
  const b = await p2.eval(`(function(){
    return new Promise(function(res){
      window.__BH.Net.api('/api/relay/create', { name: 'probe', count: 4 }, function (err, j) {
        res({ err: err && (err.message || String(err)), proto: location.protocol });
      });
    });
  })()`);
  console.log('B. file:// create：', JSON.stringify(b));
  await br2.close();
})().catch(e => { console.error(e); process.exit(1); });
