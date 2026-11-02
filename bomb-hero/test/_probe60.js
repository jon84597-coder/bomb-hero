const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9426 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1500);
  await cdp.sleep(700);
  await p.eval("window.__BH.Cloud.open()");
  await cdp.sleep(300);
  const r = await p.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('#acctBody .acctbtn'));
    return { n: btns.length, html: btns.map(b => b.outerHTML).join('\\n').slice(0, 600) };
  })()`);
  console.log(JSON.stringify(r));
  b.close(); process.exit(0);
})();
