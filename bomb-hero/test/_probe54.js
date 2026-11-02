const cdp = require('./cdp');
(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9417 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1200);
  await cdp.sleep(400);
  const r = await p.eval(`(() => {
    const B = window.__BH;
    B.settings.size = 'M';
    B.startRpg(20);            // 第 20 關 = 第 5 主題（夜光彩城）
    B.Game.players[0].hpCur = 3; B.Game.players[0].hpMax = 7;
    B.updateHud();
    const top = document.getElementById('gameTop');
    return { txt: top.textContent.replace(/\\s+/g,' ').trim(), hasUndef: /undefined/.test(top.textContent) };
  })()`);
  console.log(JSON.stringify(r));
  await cdp.sleep(400);
  await p.shot('test/v40-11-rpg-hud.png');
  b.close(); process.exit(0);
})();
