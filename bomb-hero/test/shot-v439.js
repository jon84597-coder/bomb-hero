// v4.39：道具金環外框 / 恐龍蛋的近拍（場上實際大小）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v439');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const KEYS = ['fire', 'bomb', 'speed', 'kick', 'glove', 'punch', 'remote', 'pierce', 'heart', 'line', 'skull'];

(async () => {
  const b = await launch({ port: 9547, w: 1180, h: 780 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 780, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2600);
    for (let i = 0; i < 90; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.ItemArt && window.__BH.ItemArt.readyCount() >= 11 && window.__BH.EggArt && window.__BH.EggArt.readyCount() >= 1)')) break;
      await sleep(300);
    }
    console.log('ItemArt', await p.eval('window.__BH.ItemArt.readyCount()'),
      'EggArt', await p.eval('window.__BH.EggArt.readyCount()'));

    await p.eval('window.__BH.startSolo(1)');
    await sleep(500);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(300);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
    await sleep(700);

    const info = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T;
      var me = G.players[0];
      var keys = ${JSON.stringify(KEYS)};
      G.items = [];
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
      G.zoom = 1.9; G.zoomTarget = 1.9; G.camSnap = true;
      me.invuln = 999;
      return { n: k };
    })()`);
    console.log('放了', info.n, '個道具');
    await sleep(800);
    await p.shot(path.join(OUT, 'items-ring.png'));

    // 恐龍蛋：找兩格空地直接孵出來
    const eg = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T;
      var me = G.players[0];
      var cx = Math.floor(me.x / T), cy = Math.floor(me.y / T);
      var put = [];
      var mcx = Math.floor(me.x / T), mcy = Math.floor(me.y / T);
      G.items = [];
      for (var dy = -2; dy <= 2 && put.length < 3; dy++) for (var dx = -2; dx <= 2 && put.length < 3; dx++) {
        var x = mcx + dx, y = mcy + dy;
        if (x < 1 || y < 1 || x > G.cols - 2 || y > G.rows - 2) continue;
        if (G.grid[y][x] !== 0) continue;
        if (Math.abs(dx) + Math.abs(dy) < 2) continue;   // 不要放在腳邊（會馬上被撿走）
        BH.revealEgg(x, y);
        put.push(x + ',' + y);
      }
      G.zoom = 2.4; G.zoomTarget = 2.4; G.camSnap = true;
      return put;
    })()`);
    console.log('蛋放在', JSON.stringify(eg));
    await sleep(900);
    await p.shot(path.join(OUT, 'egg-ingame.png'));

    // 蛋的出生動畫（剛冒出來那一刻）
    await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T;
      G.eggs.forEach(function(e){ e.born = .34; e.safeT = .8; });
    })()`);
    await sleep(120);
    await p.shot(path.join(OUT, 'egg-born.png'));

    // 圖鑑：道具總覽（同一套金環）
    await p.eval("window.__BH.Game.state='menu'; window.__BH.Help.show(); window.__BH.Help.setTab('item');");
    await sleep(900);
    await p.shot(path.join(OUT, 'help-items.png'));
    console.log('ok');
  } finally {
    await b.close();
  }
})();
