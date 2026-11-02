// v4.38：手機尺寸下的對戰模式截圖（看有什麼提示擋住畫面）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v438');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9535, w: 430, h: 932 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', {
      width: 430, height: 932, deviceScaleFactor: 2, mobile: true
    });
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.goto(URL, 2800);
    for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(250); }

    await p.eval(`(function(){
      var P = window.__BH;
      P.settings.count = 4; P.settings.size = 'M'; P.settings.wins = 2;
      P.settings.sd = 'on';
      P.Battle.resetSlots(); P.startBattle();
    })()`);
    await sleep(600);
    await p.shot(path.join(OUT, 'battle-m1-overlay.png'));

    // 先點掉「橫著玩更過癮」提示，再按開始
    await p.eval("(function(){ var bs=document.querySelectorAll('button'); for(var i=0;i<bs.length;i++){ var tx=bs[i].textContent||''; if(tx.indexOf('直式')>=0) bs[i].click(); } })()");
    await sleep(500);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    for (let i = 0; i < 50; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
    await sleep(1500);
    // 把玩家和對手拉近一點，讓提示都出現
    await p.eval(`(function(){
      var G = window.__BH.Game, T = G.T;
      var me = G.players[0];
      me.x = 6*T+T/2; me.y = 6*T+T/2;
      G.players[1].x = 9*T+T/2; G.players[1].y = 6*T+T/2;
      G.players[2].x = 6*T+T/2; G.players[2].y = 9*T+T/2;
      G.players[3].x = 9*T+T/2; G.players[3].y = 9*T+T/2;
      G.camSnap = true;
    })()`);
    await sleep(900);
    await p.shot(path.join(OUT, 'battle-m2-play.png'));

    // 讓玩家坐推車（看推車提示）
    await p.eval(`(function(){
      var G = window.__BH.Game, P = window.__BH, T = G.T;
      var me = G.players[0];
      me.alive = false;
      P.putOnCart(me);
      me.x = 6*T+T/2; me.y = 0.5*T; me.cartCd = 0; me.cartCharge = .5;
      G.camSnap = true;
    })()`);
    await sleep(800);
    await p.shot(path.join(OUT, 'battle-m3-cart.png'));
    console.log('shots ok');
  } finally {
    await b.close();
  }
})();
