const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9424 });
  const p = await b.newPage();
  await p.resize(390, 844, true);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3000/?touch=1', 1600);
  await cdp.sleep(900);
  await p.shot('test/v41-4-mobile-home.png');
  const nav = await p.eval(`(() => {
    const nb = document.getElementById('navBar');
    const r = nb.getBoundingClientRect();
    const chip = document.getElementById('acctChip').getBoundingClientRect();
    return { nav: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
             chip: [Math.round(chip.x), Math.round(chip.width)],
             overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
             right: Math.round(nb.querySelector('.navright').getBoundingClientRect().right), vw: innerWidth };
  })()`);
  console.log('NAV ' + JSON.stringify(nav));
  await p.eval("document.getElementById('acctChip').click()");
  await cdp.sleep(500);
  await p.shot('test/v41-5-mobile-modal.png');
  const md = await p.eval(`(() => {
    const c = document.querySelector('.acctcard');
    const r = c.getBoundingClientRect();
    return { y: Math.round(r.y), h: Math.round(r.height), bottom: Math.round(r.bottom), vh: innerHeight, over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  })()`);
  console.log('MODAL ' + JSON.stringify(md));
  await p.eval("document.getElementById('acctClose').click(); document.getElementById('btnRpg').click()");
  await cdp.sleep(700);
  await p.shot('test/v41-6-mobile-rpg.png');
  const rg = await p.eval(`(() => {
    const c = document.querySelector('#scr-rpg .card');
    const r = c.getBoundingClientRect();
    return { y: Math.round(r.y), h: Math.round(r.height), over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
             bar: document.getElementById('rpgAcctBar').textContent.replace(/\\s+/g,' ').trim() };
  })()`);
  console.log('RPG ' + JSON.stringify(rg));
  b.close(); process.exit(0);
})();
