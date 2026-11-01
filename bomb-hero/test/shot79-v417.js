// shot79-v417.js —— v4.17 截圖：商店 / 隨從 / Help / 推車集氣
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, '_v417');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

async function newPage(br, w, h, touch) {
  const p = await br.newPage();
  if (touch) {
    await p.resize(w, h, true);
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame=function(){return 0;};'
  });
  await p.goto(URL, 1800);
  await sleep(700);
  return p;
}

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9441 });
  const p = await newPage(br, 1280, 900, false);
  const ev = e => p.eval(e);

  // ---------- 1. 商店 ----------
  await ev(`(function(){
    var P=window.__BH; P.Shop.reset(); P.Shop.addGold(1800);
    P.Shop.buy('blade'); P.Shop.buy('guard');
    document.getElementById('btnStore').click(); return 1;
  })()`);
  await sleep(600);
  console.log('shop screen:', await ev(`(function(){
    return JSON.stringify({ scr:(document.querySelector('.screen.on')||{}).id,
      cards: document.querySelectorAll('#shopGrid .shopcard').length,
      wallet: document.getElementById('shopWallet').textContent,
      btns: Array.from(document.querySelectorAll('#shopGrid .shbuy')).map(function(b){return b.textContent;}),
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth });
  })()`));
  await p.shot(OUT + '/v417-shop.png');

  // ---------- 2. 單人 + 三隻隨從 ----------
  await ev(`(function(){
    var P=window.__BH, G=P.Game;
    P.Shop.addGold(3000); P.Shop.buy('bomber');
    P.Shop.render();
    P.screen && 0;
    P.Screen.show('title');
    P.settings.size='M'; P.settings.soloDiff='normal'; P.settings.ctrl='kb';
    P.startSolo(3, false);
    for (var i=0;i<40 && G.state!=='play';i++) P.updateSolo(0.02);
    G.state='play';
    var me=G.players[0]; me.invuln=0;
    // 把三隻隨從排到主角旁邊（方便截圖）
    var T=G.T, spots=[[-1.1,0.2],[1.1,0.2],[0,1.15]];
    G.pets.forEach(function(pt,i){ pt.x=me.x+spots[i][0]*T; pt.y=me.y+spots[i][1]*T; pt.hitT=0; });
    document.getElementById('ovIn').classList.add('hide');
    P.updateCamera(1/60); P.updateHud(); P.render(); return 1;
  })()`);
  await sleep(500);
  await p.shot(OUT + '/v417-pets-solo.png');

  // ---------- 3. 倒地 Help ----------
  await ev(`(function(){
    var P=window.__BH, G=P.Game, me=G.players[0], T=G.T;
    var pt=G.pets[0];
    pt.x=me.x+T*1.1; pt.y=me.y; pt.hp=1; pt.hitT=0;
    P.petHurt(pt, 1);
    pt.rescueT = 2.2;
    P.render(); return 1;
  })()`);
  await sleep(300);
  await p.shot(OUT + '/v417-pet-help.png');

  // ---------- 4. 刀客揮刀瞬間 ----------
  await ev(`(function(){
    var P=window.__BH, G=P.Game, me=G.players[0], T=G.T;
    var pet=G.pets.filter(function(q){return q.kind==='blade';})[0];
    pet.down=false; pet.hp=1; pet.rescueT=0;
    G.enemies.length=0;
    var e=P.makeEnemy(Math.floor(pet.x/T)+1, Math.floor(pet.y/T), 'slime', 3, 1);
    e.hp=5; G.enemies.push(e);
    pet.atkCd=0; pet.facing='right';
    P.updatePets(1/60);
    pet.slashT=0.26;                     // 定格在刀光上
    P.render(); return 1;
  })()`);
  await sleep(300);
  await p.shot(OUT + '/v417-pet-slash.png');

  // ---------- 5. 推車：手上拿炸彈 + 集氣條 + 落點 ----------
  await ev(`(function(){
    var P=window.__BH, G=P.Game;
    P.settings.count=4; P.Battle.resetSlots();
    P.startBattle();
    for (var i=0;i<80 && G.state!=='play';i++) P.updateBattle(0.02);
    G.state='play';
    var me=G.players[0];
    P.putOnCart(me);
    me.cartCd=0; me.cartCharge=0.42;    // 集到第 3 段附近
    document.getElementById('ovIn').classList.add('hide');
    P.updateCamera(1/60); P.updateHud(); P.render(); return 1;
  })()`);
  await sleep(400);
  await p.shot(OUT + '/v417-cart-charge.png');
  console.log('cart state:', await ev(`(function(){
    var P=window.__BH,G=P.Game,me=G.players[0];
    return JSON.stringify({cart:me.cart, charge:me.cartCharge, lv:P.cartChargeLevel(me.cartCharge),
      land:P.cartPickLanding(me, P.cartChargeLevel(me.cartCharge))});
  })()`));

  await br.close();

  // ---------- 6. 手機商店 ----------
  const br2 = await launch({ w: 844, h: 390, port: 9443 });
  const m = await newPage(br2, 390, 844, true);
  await m.eval(`(function(){
    var P=window.__BH; P.Shop.reset(); P.Shop.addGold(2600); P.Shop.buy('blade');
    document.getElementById('btnStore').click(); return 1;
  })()`);
  await sleep(600);
  console.log('mobile shop:', await m.eval(`(function(){
    return JSON.stringify({ scr:(document.querySelector('.screen.on')||{}).id,
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      pageH: document.documentElement.scrollHeight, viewH: window.innerHeight });
  })()`));
  await m.shot(OUT + '/v417-shop-phone.png');
  await br2.close();
  console.log('shots done →', OUT);
})().catch(e => { console.error(e); process.exit(1); });
