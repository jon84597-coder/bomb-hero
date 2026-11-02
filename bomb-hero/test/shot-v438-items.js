// v4.38：道具圖示在場上的實際樣子（近拍）
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v438');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const KEYS = ['fire', 'bomb', 'speed', 'kick', 'glove', 'punch', 'remote', 'pierce', 'heart', 'line', 'skull'];

(async () => {
  const b = await launch({ port: 9537, w: 1180, h: 780 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 780, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 2600);
    for (let i = 0; i < 80; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.ItemArt && window.__BH.ItemArt.readyCount() >= 11)')) break;
      await sleep(300);
    }
    console.log('ItemArt ready', await p.eval('window.__BH.ItemArt.readyCount()'));
    await p.eval('window.__BH.startSolo(1)');
    await sleep(500);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(300);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
    await sleep(600);

    const info = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, T = G.T;
      var me = G.players[0];
      var keys = ${JSON.stringify(KEYS)};
      G.items = [];
      // 在玩家附近找空地擺一圈
      var cx = Math.floor(me.x / T), cy = Math.floor(me.y / T);
      var placed = [];
      var slots = [];
      for (var dy = -2; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) slots.push([cx + dx, cy + dy]);
      var k = 0;
      for (var i = 0; i < slots.length && k < keys.length; i++) {
        var x = slots[i][0], y = slots[i][1];
        if (x < 1 || y < 1 || x > G.cols - 2 || y > G.rows - 2) continue;
        if (G.grid[y][x] !== 0) continue;
        G.items.push({ cx: x, cy: y, type: keys[k], bob: k * .7, glint: 0 });
        placed.push(keys[k] + '@' + x + ',' + y);
        k++;
      }
      G.zoom = 1.9; G.zoomTarget = 1.9; G.camSnap = true;
      me.invuln = 999;
      return { n: placed.length, list: placed };
    })()`);
    console.log('放了', info.n, '個道具');
    await sleep(700);
    await p.shot(path.join(OUT, 'items-ingame.png'));

    // 再拍一張 1:1（看實際大小）
    await p.eval('window.__BH.Game.zoom = 1; window.__BH.Game.zoomTarget = 1; window.__BH.Game.camSnap = true;');
    await sleep(600);
    await p.shot(path.join(OUT, 'items-ingame-1x.png'));
    console.log('ok');
  } finally {
    await b.close();
  }
})();
