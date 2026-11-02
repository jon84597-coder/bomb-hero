const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9427 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1500);
  await cdp.sleep(700);
  await p.eval("window.__BH.Cloud.open()");
  await cdp.sleep(300);
  const r = await p.eval(`(() => {
    const g = document.querySelector('.acctbtn.google .gi');
    const cs = getComputedStyle(g), bb = g.getBoundingClientRect();
    return { w: bb.width, h: bb.height, bg: cs.backgroundColor, color: cs.color, disp: cs.display, radius: cs.borderRadius, fs: cs.fontSize, txt: g.textContent };
  })()`);
  console.log(JSON.stringify(r));
  b.close(); process.exit(0);
})();
