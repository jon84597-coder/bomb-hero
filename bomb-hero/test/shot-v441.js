// v4.41：藏人物件（淺色矮胖）/ 推車投擲 3 格上限（實際畫面）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v441');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ port: 9552, w: 1180, h: 780 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 780, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2600);
    for (let i = 0; i < 90; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.HideArt && window.__BH.HideArt.readyCount() >= 5)')) break;
      await sleep(300);
    }
    console.log('HideArt', await p.eval('window.__BH.HideArt.readyCount()'),
      'ver', await p.eval('window.__BH.VERSION'));

    await p.eval('window.__BH.startSolo(1)');
    await sleep(500);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(300);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
    await sleep(700);

    // ---- 1. 五種藏人物件排一排（真的第 1 關草地）----
    const hid = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T;
      var me = G.players[0];
      G.items = []; G.enemies.length = 0; G.bombs.length = 0; G.bolts = [];
      var cx = Math.floor(G.cols / 2), cy = Math.floor(G.rows / 2);
      for (var y = cy - 1; y <= cy + 2; y++) for (var x = cx - 3; x <= cx + 4; x++) {
        if (x < 1 || y < 1 || x > G.cols - 2 || y > G.rows - 2) continue;
        G.grid[y][x] = 0;
        if (G.hazards[y]) G.hazards[y][x] = null;
      }
      var kinds = ['bush', 'hut', 'rock', 'jar', 'crate'];
      for (var i = 0; i < kinds.length; i++) {
        G.hazards[cy][cx - 3 + i] = { type: 'hide', kind: kinds[i], seed: 11 + i * 37 };
      }
      me.invuln = 0;
      me.x = cx * T + T / 2; me.y = (cy + 2) * T + T / 2;
      var a = document.getElementById('doorHint'); if (a) a.style.display = 'none';
      var b3 = document.getElementById('annBox'); if (b3) b3.style.display = 'none';
      G.zoom = 1.55; G.zoomTarget = 1.55; G.camSnap = true;
      return kinds.join(',');
    })()`);
    console.log('藏人物件', hid);
    await sleep(900);
    await p.shot(path.join(OUT, 'hides-row.png'));

    // ---- 2. 躲進陶甕（自己降到 34%）----
    await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T, me = G.players[0];
      var jar = null;
      for (var y = 0; y < G.rows && !jar; y++) for (var x = 0; x < G.cols; x++) {
        var hz = G.hazards[y] && G.hazards[y][x];
        if (hz && hz.type === 'hide' && hz.kind === 'jar') { jar = { x: x, y: y }; break; }
      }
      me.invuln = 0;
      if (jar) { me.x = jar.x * T + T / 2; me.y = jar.y * T + T / 2; }
      G.zoom = 2.7; G.zoomTarget = 2.7; G.camSnap = true;
      return jar ? (jar.x + ',' + jar.y) : 'none';
    })()`);
    await sleep(800);
    await p.shot(path.join(OUT, 'hides-inside.png'));

    // ---- 3. 推車投擲：集滿只有 3 格 ----
    await p.eval('window.__BH.Battle.resetSlots(); window.__BH.startBattle();');
    await sleep(600);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(300);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
    await sleep(600);

    // 假裝「按住動作鍵」→ 讓集氣真的跑到滿（真的集氣，不是硬塞數值）
    const cartInfo = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T;
      var me = G.players[0];
      if (!me.cart) BH.putOnCart(me);
      // 固定在「上邊中間」那一格，下面 3 格清空 → 落點一定看得清楚
      var mx = Math.floor(G.cols / 2);
      me.x = mx * T + T / 2; me.y = 0 * T + T / 2;
      for (var k = 1; k <= 3; k++) {
        G.grid[k][mx] = 0;
        if (G.hazards[k]) G.hazards[k][mx] = null;
      }
      G.bombs.length = 0; G.bolts = []; G.flames = [];
      me.cartCd = 0; me.cartCharge = 0; me.cartWantThrow = false;
      me.scheme.actionHeld = function () { return true; };
      var a = document.getElementById('doorHint'); if (a) a.style.display = 'none';
      var b3 = document.getElementById('annBox'); if (b3) b3.style.display = 'none';
      G.zoom = 1.75; G.zoomTarget = 1.75; G.camSnap = true;
      return Math.round(me.x / T - .5) + ',' + Math.round(me.y / T - .5) + ' 車在 ' +
        BH.CART_CHARGE_MAX + 's 集滿';
    })()`);
    console.log('推車在', cartInfo);
    await sleep(1400);                      // 集氣到滿（CART_CHARGE_MAX 秒內）
    await p.eval("(function(){ var me=window.__BH.Game.players[0]; me.cartCharge=window.__BH.CART_CHARGE_MAX; })()");
    await p.shot(path.join(OUT, 'cart-aim3.png'));
    console.log('集氣時', await p.eval(`(function(){
      var BH=window.__BH,G=BH.Game,T=G.T,me=G.players[0];
      var lv=BH.cartChargeLevel(me.cartCharge), land=BH.cartPickLanding(me,lv);
      return BH.CART_LV[lv].name + ' / 落點 ' + (land? land.x+','+land.y+' dist='+land.dist : 'null');
    })()`));

    // ---- 4. 放開 → 真的丟出去（炸彈停在 3 格內）----
    const threw = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T, me = G.players[0];
      me.scheme.actionHeld = function () { return false; };
      return 'released';
    })()`);
    await sleep(500);
    console.log('放開 →', threw, await p.eval(`(function(){
      var G=window.__BH.Game; var b=G.bombs[G.bombs.length-1];
      return b? ('炸彈 '+b.cx+','+b.cy) : 'none';
    })()`));
    await p.shot(path.join(OUT, 'cart-thrown.png'));

    // ---- 5. 放大看：落點只在 3 格內 ----
    await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, me = G.players[0];
      G.bombs.length = 0; me.cartCd = 0;
      me.scheme.actionHeld = function () { return true; };
      G.zoom = 2.4; G.zoomTarget = 2.4; G.camSnap = true;
    })()`);
    await sleep(1500);
    await p.shot(path.join(OUT, 'cart-zoom.png'));
  } finally {
    await b.close();
  }
  console.log('done →', OUT);
})().catch(e => { console.error(e); process.exit(1); });
