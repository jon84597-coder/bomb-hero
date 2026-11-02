const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9428 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1500);
  await cdp.sleep(700);
  const r = await p.eval(`(() => {
    const C = window.__BH.Cloud;
    const a = JSON.parse(JSON.stringify(C.acc()));
    a.kind = 'member'; a.name = 'Jon 隊長'; a.email = 'jon84597@gmail.com';
    a.provider = 'google'; a.avatar = ''; a.rpg.cleared = 12; a.rpg.gold = 640;
    a.points = 11; a.left = 2; a.unlocked = 13;
    C.state.acc = a; C.state.guest = false; C.paint(); C.open();
    return { chip: document.getElementById('acctChip').className,
             txt: document.getElementById('acctBody').textContent.replace(/\\s+/g,' ').trim() };
  })()`);
  console.log(JSON.stringify(r));
  await cdp.sleep(300);
  await p.shot('test/v41-7-member.png');
  b.close(); process.exit(0);
})();
