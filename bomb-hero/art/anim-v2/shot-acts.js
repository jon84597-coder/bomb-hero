// 遊戲內六種動作截圖（v5.90）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require(path.join(__dirname, '..', '..', 'test', 'cdp.js'));
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await launch({ w: 1000, h: 820 });
  const p = await b.newPage();
  await p.send('Network.enable');
  await p.send('Network.setCacheDisabled', { cacheDisabled: true });
  await p.goto('http://localhost:3122/', 9000);
  await p.eval("(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}return 1})()");
  await p.goto('http://localhost:3122/', 12000);
  await sleep(2500);
  console.log('ready', await p.eval("__BH.HeroAnim.readyCount()"));

  const r1 = await p.eval("(function(){try{__BH.settings.soloChar=0;__BH.Solo.sel=1;__BH.startSolo(1,false,false);__BH.beginCountdown();for(var i=0;i<300;i++)__BH.updateWorld(1/60);return 'state='+__BH.Game.state+' t='+Math.round(__BH.Game.gameT*100)/100;}catch(e){return 'ERR '+e.message;}})()");
  console.log('boot game', r1);
  await sleep(1500);
  console.log('state now', await p.eval("__BH.Game.state"));

  async function shot(name, setup, wait) {
    if (setup) await p.eval(setup);
    await sleep(wait || 700);
    await p.shot(path.join(OUT, name + '.png'));
    const st = await p.eval("(function(){var q=__BH.Game.players[0];return {state:__BH.Game.state, moving:q.moving, carry:!!q.carry, crying:q.cry>0, gloat:q.gloat>0, x:q.x, y:q.y};})()");
    console.log(name, JSON.stringify(st));
  }

  await shot('a_idle', null, 900);

  // 走路：按住 D
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 68, code: 'KeyD', key: 'd', text: 'd' });
  await shot('b_walk', null, 600);
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 68, code: 'KeyD', key: 'd' });
  await sleep(400);

  // 舉彈：carry
  await shot('c_hold', "(__BH.Game.players[0].carry={px:0,py:0,t:0,owner:0},1)", 800);
  await shot('c_hold2', null, 700);

  // 受傷
  await shot('d_hurt', "(__BH.Game.players[0].carry=null,__BH.Game.players[0].cry=1.5,1)", 500);

  // 勝利歡呼
  await shot('e_win', "(__BH.Game.players[0].cry=0,__BH.Game.players[0].gloat=2.5,1)", 600);
  await shot('e_win2', null, 600);

  b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
