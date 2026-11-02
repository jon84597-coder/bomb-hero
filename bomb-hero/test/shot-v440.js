// v4.40：道具淺色底 / 五種藏人物件 / 小怪集氣吐彈（實際畫面）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v440');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const KEYS = ['fire', 'bomb', 'speed', 'kick', 'glove', 'punch', 'remote', 'pierce', 'heart', 'line', 'skull'];

(async () => {
  const b = await launch({ port: 9550, w: 1180, h: 780 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 780, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2600);
    for (let i = 0; i < 90; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.ItemArt && window.__BH.ItemArt.readyCount() >= 11 && window.__BH.HideArt && window.__BH.HideArt.readyCount() >= 5)')) break;
      await sleep(300);
    }
    console.log('ItemArt', await p.eval('window.__BH.ItemArt.readyCount()'),
      'HideArt', await p.eval('window.__BH.HideArt.readyCount()'));

    await p.eval('window.__BH.startSolo(1)');
    await sleep(500);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(300);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
    await sleep(700);

    // ---- 1. 道具（新的淺色半透明底）----
    const info = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T;
      var me = G.players[0];
      var keys = ${JSON.stringify(KEYS)};
      G.items = []; G.enemies.length = 0;
      var cx = Math.floor(me.x / T), cy = Math.floor(me.y / T);
      var slots = [];
      for (var dy = -2; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) slots.push([cx + dx, cy + dy]);
      var k = 0;
      for (var i = 0; i < slots.length && k < keys.length; i++) {
        var x = slots[i][0], y = slots[i][1];
        if (x < 1 || y < 1 || x > G.cols - 2 || y > G.rows - 2) continue;
        if (G.grid[y][x] !== 0) continue;
        G.items.push({ cx: x, cy: y, type: keys[k], bob: k * .7, glint: 0 });
        k++;
      }
      G.zoom = 2.0; G.zoomTarget = 2.0; G.camSnap = true;
      me.invuln = 999;
      return { n: k };
    })()`);
    console.log('放了', info.n, '個道具');
    await sleep(800);
    await p.shot(path.join(OUT, 'items-light.png'));

    // ---- 2. 五種藏人物件排一排 ----
    const hid = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T;
      var me = G.players[0];
      G.items = []; G.enemies.length = 0; G.bombs.length = 0;
      me.x = Math.floor(G.cols / 2) * T + T / 2;
      me.y = Math.floor(G.rows / 2) * T + T / 2;
      var cx = Math.floor(me.x / T), cy = Math.floor(me.y / T);
      // 先清出一塊 5x3 的空地
      for (var y = cy - 1; y <= cy + 2; y++) for (var x = cx - 2; x <= cx + 4; x++) {
        if (x < 1 || y < 1 || x > G.cols - 2 || y > G.rows - 2) continue;
        G.grid[y][x] = 0;
        if (G.hazards[y]) G.hazards[y][x] = null;
      }
      var kinds = ['bush', 'hut', 'rock', 'jar', 'crate'];
      for (var i = 0; i < kinds.length; i++) {
        var x = cx - 2 + i, y = cy;
        G.hazards[y][x] = { type: 'hide', kind: kinds[i], seed: 11 + i * 37 };
      }
      // 玩家站在中間那格的下方（不要疊在物件上，才看得到五個物件）
      me.invuln = 0;        // 無敵會讓角色一閃一閃（截圖會剛好拍到隱形）
      me.x = cx * T + T / 2; me.y = (cy + 2) * T + T / 2;
      var a = document.getElementById('doorHint'); if (a) a.style.display = 'none';
      var b3 = document.getElementById('annBox'); if (b3) b3.style.display = 'none';
      G.zoom = 1.55; G.zoomTarget = 1.55; G.camSnap = true;
      return kinds.join(',');
    })()`);
    console.log('藏人物件', hid);
    await sleep(900);
    await p.shot(path.join(OUT, 'hides-row.png'));

    // 躲進陶甕裡（自己會變半透明）
    await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T, me = G.players[0];
      // 找出「陶甕」那一格，站進去（躲起來時物件會降到 34%，看得到自己）
      var jar = null;
      for (var y = 0; y < G.rows && !jar; y++) for (var x = 0; x < G.cols; x++) {
        var hz = G.hazards[y] && G.hazards[y][x];
        if (hz && hz.type === 'hide' && hz.kind === 'jar') { jar = { x: x, y: y }; break; }
      }
      me.invuln = 0;
      if (jar) { me.x = jar.x * T + T / 2; me.y = jar.y * T + T / 2; }
      G.zoom = 2.6; G.zoomTarget = 2.6; G.camSnap = true;
      return jar ? (jar.x + ',' + jar.y) : 'none';
    })()`);
    await sleep(800);
    await p.shot(path.join(OUT, 'hides-inside.png'));

    // ---- 3. 小怪集氣吐彈 ----
    const cast = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T;
      var me = G.players[0];
      // 先把人放到地圖中間，四周清出一塊空地（相機也比較好取景）
      var cx = Math.floor(G.cols / 2), cy = Math.floor(G.rows / 2);
      for (var y = Math.max(1, cy - 3); y <= Math.min(G.rows - 2, cy + 3); y++) {
        for (var x = Math.max(1, cx - 4); x <= Math.min(G.cols - 2, cx + 4); x++) {
          G.grid[y][x] = 0;
          if (G.hazards[y] && G.hazards[y][x] && G.hazards[y][x].type === 'hide') G.hazards[y][x] = null;
        }
      }
      G.items = []; G.bombs.length = 0; G.bolts = []; G.enemies.length = 0;
      me.invuln = 0; me.alive = true;   // 無敵會讓角色一閃一閃（截圖會剛好拍到隱形）
      me.x = cx * T + T / 2; me.y = cy * T + T / 2;
      var a = document.getElementById('doorHint'); if (a) a.style.display = 'none';
      var e = BH.makeEnemy(cx - 2, cy - 1, 'frog', 3, 1);
      e.aggro = true; e.skCd = 0; e.hp = 99; e.maxHp = 99;
      G.enemies.push(e);
      G.zoom = 1.85; G.zoomTarget = 1.85; G.camSnap = true;
      BH.enemySkillTick(e, 1 / 60);
      // 釘在「快要射出去」那一刻，方便截圖
      window.__holdCast = setInterval(function(){
        var en = G.enemies[0];
        if (en && en.castT > 0) en.castT = BH.FOE_CAST_WINDUP * .14;
      }, 16);
      return { cast: e.castX + ',' + e.castY, castT: e.castT,
               hiding: BH.playerHiding(me), alive: me.alive,
               cell: Math.floor(me.x / T) + ',' + Math.floor(me.y / T),
               ecell: Math.floor(e.x / T) + ',' + Math.floor(e.y / T),
               grid: G.grid[Math.floor(e.y / T)][Math.floor(e.x / T)] };
    })()`);
    console.log('集氣落點', cast);
    await sleep(900);
    await p.shot(path.join(OUT, 'cast-windup.png'));

    // 放開 → 射出去，拍飛行中的彈體
    await p.eval("clearInterval(window.__holdCast)");
    await sleep(560);
    const bol = await p.eval("(window.__BH.Game.bolts||[]).length");
    console.log('飛行中彈體', bol);
    await p.shot(path.join(OUT, 'cast-bolt.png'));

    console.log('ok');
  } finally {
    await b.close();
  }
})();
