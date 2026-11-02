const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9415 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1200);
  await cdp.sleep(400);
  const r = await p.eval(`(() => {
    window.__BH.Rpg.render(); window.__BH.Screen.show('rpg');
    const c = document.querySelector('#scr-rpg .card');
    const bb = c.getBoundingClientRect();
    return { y: Math.round(bb.y), h: Math.round(bb.height), bottom: Math.round(bb.bottom), vh: innerHeight, scrollH: c.scrollHeight, clientH: c.clientHeight, w: Math.round(bb.width) };
  })()`);
  console.log(JSON.stringify(r));
  await cdp.sleep(300);
  await p.shot('test/v40-8-rpg-top.png');
  b.close(); process.exit(0);
})();
