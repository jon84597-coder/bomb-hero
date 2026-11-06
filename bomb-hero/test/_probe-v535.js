// v5.35 探針：隨機縮圈（虛線預告＋小地圖）、金幣掉落、硬牆岩脊/圍籬
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '_v535');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await launch({ port: 9899, w: 430, h: 932 });
  try {
    const p = await b.newPage();
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?auto=1', 9000);
    for (let i = 0; i < 100; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(900);

    await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      BH.BR.opt = { n: 20, team: 1, dur: 10 };
      BH.settings.ctrl = 'kb';
      BH.startBR();
      G.state = 'play'; G.bannerT = 0; G.enemies.length = 0;
      setInterval(function () {
        ['ovBox','tutMask','tutCard','tutMini','banner'].forEach(function (id) {
          var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        G.bannerT = 0;
      }, 50);
      var T = G.T, bx = -1, by = -1;
      for (var y = 10; y < G.rows - 10 && bx < 0; y++) {
        for (var x = 10; x < G.cols - 10; x++) {
          if (G.brIsl[y][x] < 0) continue;
          var okk = true;
          for (var dy = -4; dy <= 4 && okk; dy++) for (var dx = -4; dx <= 4; dx++) {
            if (G.grid[y + dy][x + dx] !== 0) { okk = false; break; }
          }
          if (okk) { bx = x; by = y; break; }
        }
      }
      if (bx < 0) { bx = Math.round(G.cols / 2); by = Math.round(G.rows / 2); }
      window.__ST = { bx: bx, by: by };
      var me = G.players[0];
      me.invuln = 99; me.alive = true; me.dead = false; me.brHp = 10;
      me.x = (bx + .5) * T; me.y = (by + 4.5) * T;
      G.camSnap = true;
      G.brNukeCd = 1e9;
      // 目前圈：半徑 5、圈心在玩家上方 4 格；下一圈半徑 2.6、再往右上偏 1.6 格
      var z = G.brZone;
      z.cx = bx + .5; z.cy = by + .5; z.r = 5; z.tr = 2.6;
      z.nx = bx + 2.1; z.ny = by - 1.1; z.nr = 2.6;
      z.mode = 'wait'; z.t = 24;
      // 地上放金幣 + 幾樣道具（就在玩家左右兩側）
      G.items.length = 0;
      var kinds = ['fire','bomb','speed','remote','pierce','line','heart'];
      for (var i = 0; i < 9; i++) {
        G.items.push({ cx: bx - 4 + (i % 5) * 2, cy: by + 2 + (i >= 5 ? 1 : 0),
          type: i < 6 ? 'coin' : kinds[i - 6], bob: i * .9, amount: 6 + i * 3 });
      }
      G.zoom = 1.25;
      return 1;
    })()`);
    await sleep(600);

    // 遊戲座標 → 整頁 CSS 座標（playerScreenPos 已含 zoom，不可再乘一次）
    async function clipGame(name, gx, gy, gw, gh, scale) {
      const r = await p.eval(`JSON.stringify((function(){
        var BH = window.__BH, G = BH.Game;
        var cv = document.getElementById('cv');
        var rc = cv.getBoundingClientRect();
        var me = G.players[0];
        var sp = BH.playerScreenPos(me);
        var T = G.T, z = G.zoom || 1;
        return { cx: rc.x + sp.x, cy: rc.y + sp.y, T: T * z, w: rc.width, h: rc.height };
      })())`);
      const o = JSON.parse(r);
      const px = o.cx + gx * o.T, py = o.cy + gy * o.T;
      const w = gw * o.T, h = gh * o.T;
      let x = Math.max(0, px - w / 2), y = Math.max(0, py - h / 2);
      const clip = { x: x, y: y, width: Math.min(w, o.w - x), height: Math.min(h, o.h - y), scale: scale || 2 };
      const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: clip });
      fs.writeFileSync(path.join(OUT, name), Buffer.from(shot.data, 'base64'));
      console.log('截圖', name, Math.round(clip.width) + 'x' + Math.round(clip.height));
    }

    // ① 縮圈虛線：玩家在圈心下方 4 格 → 往上看得到當前的粉紅圈與白色的下一圈
    await clipGame('zone-dash.png', 0, -4, 13, 13, 2.8);
    // ② 金幣（在玩家上方 1 格那排）
    await clipGame('coin.png', 0, -2.4, 11, 6, 3.2);
    // ③ 小地圖（左上角固定）
    {
      const r = await p.eval(`JSON.stringify((function(){var rc=document.getElementById('cv').getBoundingClientRect();return {x:rc.x,y:rc.y,w:rc.width,h:rc.height};})())`);
      const o = JSON.parse(r);
      const shot = await p.send('Page.captureScreenshot', { format: 'png',
        clip: { x: o.x + 6, y: o.y + 6, width: 150, height: 128, scale: 3 } });
      fs.writeFileSync(path.join(OUT, 'minimap.png'), Buffer.from(shot.data, 'base64'));
      console.log('截圖 minimap.png');
    }
    // ④ 硬牆：整張地圖縮到 42%（看岩脊／圍籬的形狀）
    await p.eval(`(function(){ var G = window.__BH.Game; G.zoom = .42;
      G.camX = 0; G.camY = 0; G.camSnap = true; return 1; })()`);
    await sleep(500);
    {
      const r = await p.eval(`JSON.stringify((function(){var rc=document.getElementById('cv').getBoundingClientRect();return {x:rc.x,y:rc.y,w:rc.width,h:rc.height};})())`);
      const o = JSON.parse(r);
      const shot = await p.send('Page.captureScreenshot', { format: 'png',
        clip: { x: o.x, y: o.y, width: o.w, height: o.h, scale: 2 } });
      fs.writeFileSync(path.join(OUT, 'hardwall.png'), Buffer.from(shot.data, 'base64'));
      console.log('截圖 hardwall.png');
    }
  } finally {
    await b.close();
  }
})().catch(function (e) { console.error(e); process.exit(1); });
