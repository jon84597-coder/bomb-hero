// test/_probe-state.js — 檢查遊戲時鐘是否真的在前進
const path = require('path');
const { launch, sleep } = require('./cdp');
const PORT = process.env.PORT || 3111;
const URL = 'http://127.0.0.1:' + PORT + '/index.html';

(async () => {
  const cdp = await launch({ port: 9446, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.resize(900, 430, true);
  await p.goto(URL, 2400);
  await p.eval(`(function(){ try{localStorage.setItem('bombhero-rotskip','1');}catch(e){} var r=document.getElementById('rotHint'); if(r&&r.parentNode) r.parentNode.removeChild(r); __BH.settings.mapMode='classic'; })()`);

  console.log('Game keys:', await p.eval('Object.keys(__BH.Game).join(",")'));

  await p.eval(`__BH.startSolo(3)`);
  await sleep(800);
  console.log('ovBox btn:', await p.eval(`(function(){var b=document.querySelector('#ovBox button'); return b? b.textContent : 'none';})()`));
  await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b) b.click();})()`);

  for (let i = 0; i < 5; i++) {
    await sleep(1000);
    console.log(i + 's', await p.eval(`JSON.stringify({ state: __BH.Game.state, running: __BH.Game.running, paused: __BH.Game.paused, cd: __BH.Game.countdown, time: Math.round(__BH.Game.time*10)/10, gt: Math.round((__BH.Game.gameT||0)*10)/10, vis: document.visibilityState, hidden: document.hidden })`));
  }

  console.log('--- BR ---');
  await p.eval(`(function(){ __BH.startBR(); })()`);
  await sleep(900);
  await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b) b.click();})()`);
  for (let i = 0; i < 5; i++) {
    await sleep(1200);
    console.log(i, await p.eval(`JSON.stringify({ state:__BH.Game.state, cd:__BH.Game.countdown, brT: Math.round((__BH.Game.brT||0)*10)/10, left: typeof __BH.brTimeLeft==='function'? Math.round(__BH.brTimeLeft()) : 'n/a', zone: __BH.Game.brZone && __BH.Game.brZone.mode, r: __BH.Game.brZone && Math.round(__BH.Game.brZone.r||0) })`));
  }
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
