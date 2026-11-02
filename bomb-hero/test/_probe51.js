const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9413 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1200);
  await cdp.sleep(400);
  await p.eval("document.getElementById('btnRpg').click()");
  await cdp.sleep(600);
  const r = await p.eval(`(() => {
    const card = document.querySelector('#scr-rpg .card');
    const h2 = document.querySelector('#scr-rpg h2');
    const desc = document.querySelector('#scr-rpg .desc');
    const lbl = document.querySelector('#scr-rpg .field label');
    const bb = e => e ? { t: e.tagName, y: Math.round(e.getBoundingClientRect().y), h: Math.round(e.getBoundingClientRect().height), txt: (e.textContent||'').slice(0,20) } : null;
    const el = document.elementFromPoint(80, 20);
    return { card: bb(card), h2: bb(h2), desc: bb(desc), lbl: bb(lbl),
             cardScrollTop: card ? card.scrollTop : null,
             top: el ? { tag: el.tagName, id: el.id, cls: el.className, txt: (el.textContent||'').slice(0,20) } : null,
             winScroll: window.scrollY, docH: document.documentElement.scrollHeight };
  })()`);
  console.log(JSON.stringify(r, null, 1));
  b.close(); process.exit(0);
})();
