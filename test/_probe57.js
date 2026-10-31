const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9422 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1500);
  await cdp.sleep(800);
  await p.eval("document.getElementById('acctChip').click()");
  await cdp.sleep(150);
  const r1 = await p.eval(`(() => {
    const c = document.getElementById('acctClose');
    return { exists: !!c, tag: c && c.tagName, cls: c && c.className, same: c === document.querySelector('#acctModal .acctclose') };
  })()`);
  console.log('CLOSE EL ' + JSON.stringify(r1));
  const r2 = await p.eval(`(() => { window.__BH.Cloud.close(); return document.getElementById('acctModal').className; })()`);
  console.log('MANUAL close -> ' + JSON.stringify(r2));
  await p.eval("document.getElementById('acctChip').click()");
  await cdp.sleep(150);
  const r3 = await p.eval(`(() => {
    const c = document.getElementById('acctClose');
    c.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return document.getElementById('acctModal').className;
  })()`);
  console.log('DISPATCH -> ' + JSON.stringify(r3));
  b.close(); process.exit(0);
})();
