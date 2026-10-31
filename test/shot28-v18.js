// v1.8 目檢截圖：新首頁標題 / 組隊對戰 / 遊戲中的音樂音效 / BOSS 下方登場＋變大 /
//                 紅龍 / 推車集氣三色
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

(async () => {
  const br = await launch({ w: 900, h: 640, port: 9381 });
  const page = await br.newPage();
  await page.goto(URL, 1800);

  // 1) 新首頁（桌機寬）：BOMB HERO 大字 / 爆爆英雄中字 / 測試版小字 / 組隊對戰
  await page.eval(`(function(){ window.__BH.Screen.show('title'); return 1; })()`);
  await sleep(300);
  await page.shot(OUT + 'v18-1-title.png');
  console.log('v18-1-title.png');

  // 2) 手機直放：確認大字不爆掉、工具列還在
  await page.resize(390, 844, true);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, 1500);
  await page.eval(`(function(){ window.__BH.Screen.show('title'); return 1; })()`);
  await sleep(300);
  await page.shot(OUT + 'v18-2-title-phone.png');
  console.log('v18-2-title-phone.png');

  // 回到桌機視窗再拍遊戲畫面（整張地圖看得到，BOSS 與玩家同框）
  await page.resize(900, 640, false);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await page.goto(URL, 1500);

  // 3) 遊戲中：音樂／音效開關在右上角 + BOSS 從下方登場（體型變大）
  await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.size='M'; P.settings.hazards='off'; P.settings.sd='off';
    P.startSolo(8, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.getElementById('touchUI').style.display='none';
    G.state='play';
    G.bombs.length=0; G.flames.length=0;
    var T=G.T, me=G.players[0];
    me.x=2.5*T; me.y=9.5*T; me.invuln=99;   // 站偏低一點 → 鏡頭往下，BOSS 完整入鏡
    var boss=G.enemies.filter(function(e){return e.boss;})[0];
    if (boss) { boss.x=Math.floor(G.cols/2)*T+T/2; boss.y=(G.rows-2)*T+T/2; boss.dirName='up'; }
    G.gameT=1.4;
    P.updateCamera(); P.render();
    return { T:T, bossCellY: boss?Math.floor(boss.y/T):-1, rows:G.rows,
             sizeMul: boss?boss.sizeMul:-1, playerCellY: Math.floor(me.y/T),
             navBarInGame: document.getElementById('navBar').className };
  })()`).then(r => console.log('BOSS 登場', JSON.stringify(r)));
  await sleep(300);
  await page.shot(OUT + 'v18-3-boss-bottom.png');
  console.log('v18-3-boss-bottom.png');

  // 4) 紅龍：四方向火焰
  await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.startSolo(1, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.getElementById('touchUI').style.display='none';
    G.state='play';
    for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++) G.grid[y][x]=0;
    G.enemies.length=0; G.bombs.length=0; G.flames.length=0; G.eggs.length=0;
    var T=G.T, cx=Math.floor(G.cols/2), cy=Math.floor(G.rows/2);
    var me=G.players[0]; me.invuln=99; me.alive=true;
    me.x=cx*T+T/2; me.y=cy*T+T/2;
    me.dino=true; me.redDragon=false; me.fireCd=0;
    G.eggs.push({x:cx,y:cy,bob:0,wob:0});
    P.takeEgg(me);                      // 第二顆蛋 → 紅龍
    me.fireCd=0;
    P.fireBreath(me);
    G.gameT=2.0; P.updateCamera(); P.render();
    var dirs={};
    G.flames.forEach(function(f){ dirs[(f.cx-cx)+','+(f.cy-cy)]=1; });
    return { red: me.redDragon, flames: G.flames.length, cells: Object.keys(dirs).join(' ') };
  })()`).then(r => console.log('紅龍吐火', JSON.stringify(r)));
  await sleep(250);
  await page.shot(OUT + 'v18-4-reddragon.png');
  console.log('v18-4-reddragon.png');

  // 5) 推車集氣三色（三台推車並排：第 1／2／3 格）—— 建好場景後先停主循環再拍
  await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.hazards='off';
    P.startSolo(5, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.getElementById('touchUI').style.display='none';
    G.state='play';
    for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++) G.grid[y][x]=0;
    G.bombs.length=0; G.flames.length=0; G.items.length=0; G.enemies.length=0;
    if (G.eggs) G.eggs.length=0;
    var T=G.T;
    var scheme={dirs:function(){return [];},action:function(){return false;},actionHeld:function(){return false;}};
    function cartAt(slot,ch,col,chg){
      var q=(slot===0)?G.players[0]:P.makePlayer(slot,ch,scheme,{px:0,py:0});
      if (slot!==0) G.players.push(q);
      q.cart=true; q.alive=false; q.cry=0; q.invuln=0; q.facing='right';
      q.x=col*T+T/2; q.y=6*T+T/2;
      q.cartCd=0; q.cartCharge=chg; q.cartDir={x:1,y:0};
      return q;
    }
    G.players.length=Math.min(G.players.length,1);
    cartAt(0,0,3,0.05);                       // 第 1 格（綠）
    cartAt(1,3,7,P.CART_CHARGE_MAX*0.55);     // 第 2 格（黃）
    cartAt(2,5,11,P.CART_CHARGE_MAX);         // 第 3 格（紅）
    var err=null;
    try { P.updateCamera(); P.render(); } catch(e){ err=e.message; }
    G.state='paused';                          // 停主循環，凍結畫面
    return { n:G.players.length, err:err };
  })()`).then(r => console.log('推車集氣', JSON.stringify(r)));
  await sleep(250);
  await page.shot(OUT + 'v18-5-cart-charge.png');
  console.log('v18-5-cart-charge.png');

  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
