const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9423 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1500);
  await cdp.sleep(800);
  const r = await p.eval(`(() => {
    const log = [];
    const m = document.getElementById('acctModal');
    document.addEventListener('click', function (e) {
      log.push('cap:' + (e.target.id || e.target.className || e.target.tagName) + '|' + m.className);
    }, true);
    document.addEventListener('click', function (e) {
      log.push('bub:' + (e.target.id || e.target.className || e.target.tagName) + '|' + m.className);
    }, false);
    window.__BH.Cloud.open();
    log.push('afterOpen:' + m.className);
    document.getElementById('acctClose').click();
    log.push('afterClose:' + m.className);
    return log;
  })()`);
  console.log(JSON.stringify(r, null, 1));
  b.close(); process.exit(0);
})();
