const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9414 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1200);
  await cdp.sleep(400);
  for (const s of ['title','solo','battle','online','settings','help','rpg']) {
    const r = await p.eval(`(() => {
      try { window.__BH.Rpg && null; } catch(e){}
      window.__BH.Screen.show('${s}');
      const c = document.querySelector('#scr-${s} .card, #scr-${s} .title-card');
      if (!c) return { s: '${s}', none: true };
      const r = c.getBoundingClientRect();
      return { s: '${s}', y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom), vh: innerHeight };
    })()`);
    console.log(JSON.stringify(r));
    await cdp.sleep(120);
  }
  b.close(); process.exit(0);
})();
