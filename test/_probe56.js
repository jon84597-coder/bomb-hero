const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9421 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1500);
  await cdp.sleep(800);
  const step = s => p.eval(`(() => {
    const m = document.getElementById('acctModal');
    return { step: '${s}', on: m.classList.contains('on'), screen: (document.querySelector('.screen.on')||{}).id };
  })()`);
  console.log(JSON.stringify(await step('load')));
  await p.eval("document.getElementById('acctChip').click()"); await cdp.sleep(200);
  console.log(JSON.stringify(await step('open')));
  await p.eval("document.getElementById('acctClose').click()"); await cdp.sleep(200);
  console.log(JSON.stringify(await step('close')));
  await p.eval("document.getElementById('btnRpg').click()"); await cdp.sleep(400);
  console.log(JSON.stringify(await step('rpg')));
  b.close(); process.exit(0);
})();
