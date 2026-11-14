// 驗收探針：① 選角畫面（兔兔的動作節奏）② 遊戲內「拿著炸彈」時炸彈的位置
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require(path.join(__dirname, '..', '..', 'test', 'cdp.js'));
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await launch({ w: 1600, h: 1200 });
  const p = await b.newPage();
  await p.send('Network.enable');
  await p.send('Network.setCacheDisabled', { cacheDisabled: true });
  await p.goto('http://localhost:3122/', 9000);
  await p.eval("(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}return 1})()");
  await p.goto('http://localhost:3122/', 12000);
  await sleep(2200);
  console.log('anim ready', await p.eval("__BH.HeroAnim.readyCount()"));

  // ① 選角
  const sc = await p.eval("(function(){try{__BH.Screen.go('solo');return __BH.Screen.current;}catch(e){return 'ERR '+e.message;}})()");
  console.log('screen', sc);
  await sleep(600);
  await p.shot(path.join(OUT, 'sel1.png'));
  await sleep(420);
  await p.shot(path.join(OUT, 'sel2.png'));

  // 高解析度（devicePixelRatio 3）—— 角色只有幾十 px，放大才看得出炸彈位置
  await sleep(500);

  // ② 開局
  const r1 = await p.eval("(function(){try{__BH.settings.soloChar=0;__BH.Solo.sel=1;__BH.startSolo(1,false,false);__BH.beginCountdown();for(var i=0;i<300;i++)__BH.updateWorld(1/60);return 'state='+__BH.Game.state;}catch(e){return 'ERR '+e.message;}})()");
  console.log('boot', r1);
  await sleep(1400);

  // ③ 直接掛一顆 held 炸彈（等於「拿起來」的狀態）
  const r2 = await p.eval(`(function(){try{
    var G=__BH.Game,q=G.players[0],T=G.T||64;
    var bb={cx:Math.floor(q.x/T),cy:Math.floor(q.y/T),px:q.x,py:q.y,timer:30,seed:1.7,
             owner:q,held:true,remoteArmed:false,mine:false,moving:null,flying:null,
             passers:[],power:2,onWall:false,age:0};
    G.bombs.push(bb); q.carry=bb;
    return 'carry ok hold='+(bb.held);
  }catch(e){return 'ERR '+e.message;}})()`);
  console.log(r2);
  await sleep(900);
  await p.shot(path.join(OUT, 'carry_stand.png'));

  // 走動（按住 D）
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 68, code: 'KeyD', key: 'd', text: 'd' });
  await sleep(700);
  await p.shot(path.join(OUT, 'carry_walk.png'));
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 68, code: 'KeyD', key: 'd' });

  const st = await p.eval("(function(){var q=__BH.Game.players[0];return {state:__BH.Game.state,carry:!!q.carry,x:Math.round(q.x),y:Math.round(q.y)};})()");
  console.log(st);
  // 角色在畫布上的實際位置（畫布 CSS 座標 ×3 才是截圖像素）
  const box = await p.eval("(function(){try{var cv=document.getElementById('game')||document.querySelector('canvas');var r=cv.getBoundingClientRect();return {l:r.left,t:r.top,w:r.width,h:r.height,dpr:window.devicePixelRatio};}catch(e){return {err:e.message}};})()");
  console.log(JSON.stringify(box));
  b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
