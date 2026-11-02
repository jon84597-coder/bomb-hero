const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9425 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1500);
  await cdp.sleep(700);
  await p.eval("window.__BH.Cloud.open()");
  await cdp.sleep(300);
  const r = await p.eval(`(() => {
    const g = document.querySelector('.acctbtn.g .gi');
    if (!g) return { none: true, html: document.querySelector('.acctbtn.g').outerHTML.slice(0,160) };
    const cs = getComputedStyle(g); const bb = g.getBoundingClientRect();
    return { w: bb.width, h: bb.height, bg: cs.backgroundColor, color: cs.color, disp: cs.display, txt: g.textContent };
  })()`);
  console.log(JSON.stringify(r));
  b.close(); process.exit(0);
})();
