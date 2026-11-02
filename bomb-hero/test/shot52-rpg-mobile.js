const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9416 });
  const p = await b.newPage();
  await p.resize(390, 844, true);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3000/?touch=1', 1500);
  await p.eval("document.getElementById('btnRpg').click()");
  await cdp.sleep(700);
  await p.shot('test/v40-10-rpg-mobile.png');
  const r = await p.eval(`(() => {
    const c = document.querySelector('#scr-rpg .card');
    const bb = c.getBoundingClientRect();
    return { y: Math.round(bb.y), h: Math.round(bb.height), over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
             scrollH: document.documentElement.scrollHeight, vh: innerHeight };
  })()`);
  console.log(JSON.stringify(r));
  b.close(); process.exit(0);
})();
