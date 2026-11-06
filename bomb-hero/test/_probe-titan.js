// _probe-titan.js — 大逃殺鈦合金外牆截圖（貼牆近拍）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '_v536');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await launch({ port: 9896, w: 900, h: 700 });
  try {
    const p = await b.newPage();
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?auto=1', 12000);
    for (let i = 0; i < 120; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(900);

    const info = await p.eval(`(function(){
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
      for (var y = 2; y < 16 && bx < 0; y++) {
        for (var x = 8; x < G.cols - 8; x++) {
          if (G.grid[y][x] === 0 && G.grid[y - 1][x] === 1 && G.grid[y - 2][x] === 1) { bx = x; by = y; break; }
        }
      }
      if (bx < 0) { bx = 20; by = 5; }
      var me = G.players[0];
      me.invuln = 99; me.alive = true; me.dead = false; me.brHp = 10;
      me.x = (bx + .5) * T; me.y = (by + 1.6) * T;
      G.camSnap = true; G.brNukeCd = 1e9; G.zoom = 2.2; G.zoomTarget = 2.2;
      var z = G.brZone; z.r = 80; z.cx = G.cols / 2; z.cy = G.rows / 2;
      return JSON.stringify({ bx: bx, by: by, T: T, wk: G.wallKind[by - 1][bx], zoom: G.zoom });
    })()`);
    console.log('位置', info);
    await sleep(700);

    async function clipGame(name, gx, gy, gw, gh, scale) {
      const r = await p.eval(`JSON.stringify((function(){
        var BH = window.__BH, G = BH.Game;
        var cv = document.getElementById('cv');
        var rc = cv.getBoundingClientRect();
        var sp = BH.playerScreenPos(G.players[0]);
        return { cx: rc.x + sp.x, cy: rc.y + sp.y, T: G.T * (G.zoom || 1), w: rc.width, h: rc.height };
      })())`);
      const o = JSON.parse(r);
      const px = o.cx + gx * o.T, py = o.cy + gy * o.T;
      const w = gw * o.T, h = gh * o.T;
      const x = Math.max(0, px - w / 2), y = Math.max(0, py - h / 2);
      const clip = { x: x, y: y, width: Math.min(w, o.w - x), height: Math.min(h, o.h - y), scale: scale || 3 };
      const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: clip });
      fs.writeFileSync(path.join(OUT, name), Buffer.from(shot.data, 'base64'));
      console.log('截圖', name, Math.round(clip.width) + 'x' + Math.round(clip.height), 'T=' + o.T.toFixed(1));
    }

    // 玩家上方就是牆 → 往上 1.2 格看牆面
    await clipGame('titan.png', 0, -0.6, 9, 6, 4);
    // 拉遠一點看接縫節奏
    await clipGame('titan-far.png', 0, -1.0, 15, 8, 2.4);
  } finally {
    await b.close();
  }
})().catch(function (e) { console.log('ERR', e && e.message); process.exit(1); });
