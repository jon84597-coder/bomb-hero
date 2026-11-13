// probe-ball.js —— 驗證「遊戲炸彈蓋住素材球」：?stage=1&auto=1 → 塞一顆炸彈到手上 → 匯出畫布
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
  await p.goto('http://localhost:3122/?stage=1&auto=1&t=' + Date.now(), 12000);
  await sleep(3200);
  console.log('ready', await p.eval('__BH.HeroAnim.readyCount()'));
  for (let i = 0; i < 16; i++) {
    const has = await p.eval("(function(){var s=document.querySelector('#bpSkip');return !!(s&&s.offsetParent!==null);})()");
    if (!has) break;
    await p.eval("document.querySelector('#bpSkip').click()");
    await sleep(550);
  }
  for (let i = 0; i < 20; i++) {
    const st = await p.eval('(function(){try{return __BH.Game.state;}catch(e){return "err";}})()');
    if (st === 'play') break;
    await sleep(700);
  }
  console.log('state', await p.eval('__BH.Game.state'));
  const r = await p.eval(`(function(){
    var G=__BH.Game, me=G.players[0];
    if(!me) return 'no me';
    me.invuln = 999;
    var T=G.T;
    var bmb={cx:Math.floor(me.x/T),cy:Math.floor(me.y/T),px:me.x,py:me.y,
             timer:9999,power:3,owner:me,passers:[me],remoteArmed:false,mine:false,
             mineLife:10,moving:null,flying:null,held:true,ownerLeft:true,seed:1,armT:40,age:1};
    me.carry=bmb;
    if(!G.bombs) G.bombs=[];
    G.bombs.push(bmb);
    return {T:T, x:me.x, y:me.y, camX:G.camX, camY:G.camY, canvas:document.querySelector('#cv').width};
  })()`);
  console.log('carry', JSON.stringify(r));
  await sleep(800);
  // 連拍 6 張（不同動作幀）
  for (let k = 0; k < 6; k++) {
    const o = await p.eval("(function(){var c=document.querySelector('#cv');return c.toDataURL('image/png');})()");
    fs.writeFileSync(path.join(OUT, 'carry' + k + '.png'),
      Buffer.from(o.replace(/^data:image\/png;base64,/, ''), 'base64'));
    await sleep(150);
  }
  console.log('saved carry0..5.png', JSON.stringify(r));
  b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
