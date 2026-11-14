// 遊戲內角色截圖（v5.90 精靈動作驗證）
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
  // 註銷 SW、清快取，避免拿到舊版
  await p.eval("(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}return 1})()");
  await p.goto('http://localhost:3122/', 12000);
  await sleep(2500);

  const info = await p.eval("(function(){var H=__BH.HeroAnim;return {bh:typeof __BH, anim:!!H, ready:H&&H.readyCount?H.readyCount():null, errs:(window.__BHB&&window.__BHB.errs||[]).slice(0,3)};})()");
  console.log('boot', JSON.stringify(info));

  const st0 = await p.eval("(function(){try{__BH.startSolo(1,false,false);return 'solo ok';}catch(e){return 'ERR '+e.message;}})()");
  console.log('startSolo', st0);
  await sleep(3000);
  await p.shot(path.join(OUT, 'g0.png'));
  console.log('shot g0');

  // 播幾秒讓角色動起來
  await sleep(1200);
  await p.shot(path.join(OUT, 'g1.png'));

  const st = await p.eval("(function(){try{var G=__BH.Game;return {state:G.state, players:G.players?G.players.length:0, animReady:__BH.HeroAnim.readyCount(), mine:!!(G.players&&G.players[0])};}catch(e){return {err:e.message}};})()");
  console.log('game', JSON.stringify(st));
  b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
