// v1.8 推車集氣截圖（探針版）：手動建 3 台推車，關掉遊戲主循環後截圖
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

(async () => {
  const br = await launch({ w: 900, h: 640, port: 9386 });
  const page = await br.newPage();
  await page.goto(URL, 1600);
  const r = await page.eval(`(function(){
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
    cartAt(0,0,3,0.05);
    cartAt(1,3,7,P.CART_CHARGE_MAX*0.55);
    cartAt(2,5,11,P.CART_CHARGE_MAX);
    var err=null;
    try { P.updateCamera(); P.render(); } catch(e){ err=e.message; }
    // 停掉主循環（避免 rAF 再跑 updateSolo 把場景改掉）
    try { G.state='paused'; } catch(e) {}
    return { n:G.players.length, err:err, pos:G.players.map(function(p){return (p.x/T).toFixed(1)+','+(p.y/T).toFixed(1);}) };
  })()`);
  console.log(JSON.stringify(r));
  await sleep(250);
  await page.shot(OUT + 'v18-5-cart-charge.png');
  console.log('shot saved');
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
