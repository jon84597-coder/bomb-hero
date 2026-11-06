// v5.33 探針：核彈（通報 / 落下 / 爆炸 / 燒地）＋ 隊友白色炸彈（藍色爆炸）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '_v533');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await launch({ port: 9896, w: 430, h: 932 });
  try {
    const p = await b.newPage();
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?auto=1', 9000);
    for (let i = 0; i < 100; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(900);

    await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      BH.BR.opt = { n: 20, team: 2, dur: 10 };
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
      for (var y = 8; y < G.rows - 8 && bx < 0; y++) {
        for (var x = 8; x < G.cols - 8; x++) {
          if (G.brIsl[y][x] < 0) continue;
          var okk = true;
          for (var dy = -3; dy <= 3 && okk; dy++) for (var dx = -3; dx <= 3; dx++) {
            if (G.grid[y + dy][x + dx] !== 0) { okk = false; break; }
          }
          if (okk) { bx = x; by = y; break; }
        }
      }
      if (bx < 0) { bx = Math.round(G.cols / 2); by = Math.round(G.rows / 2); }
      window.__ST = { bx: bx, by: by };
      var me = G.players[0];
      me.invuln = 99; me.alive = true; me.dead = false; me.brHp = 10;
      me.x = (bx + .5) * T; me.y = (by + 3.5) * T;
      G.camSnap = true;
      G.brNuke = { cx: bx, cy: by, phase: 'warn', t: 3.2, fall: 0, dur: 0 };
      G.brNukeCd = 40;
      return 1;
    })()`);
    await sleep(700);

    // 把「遊戲座標」換成「整頁 CSS 座標」，這樣截圖才對得準
    async function clipGame(name, gx, gy, gw, gh, scale) {
      const r = await p.eval(`JSON.stringify((function(){
        var BH = window.__BH, G = BH.Game;
        var cv = document.getElementById('cv');
        var rc = cv.getBoundingClientRect();
        var me = G.players[0];
        var sp = BH.playerScreenPos(me);
        var T = G.T, z = G.zoom || 1;
        return { cx: rc.x + sp.x, cy: rc.y + sp.y, T: T * z, z: z, w: rc.width, h: rc.height, cw: rc.x, ch: rc.y };
      })())`);
      const o = JSON.parse(r);
      const px = o.cx + gx * o.T, py = o.cy + gy * o.T;
      const w = gw * o.T, h = gh * o.T;
      const clip = {
        x: Math.max(0, px - w / 2), y: Math.max(0, py - h / 2),
        width: Math.min(w, o.w - Math.max(0, px - w / 2)),
        height: Math.min(h, o.h - Math.max(0, py - h / 2)),
        scale: scale || 3
      };
      const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: clip });
      fs.writeFileSync(path.join(OUT, name), Buffer.from(shot.data, 'base64'));
      console.log('截圖', name, Math.round(clip.width) + 'x' + Math.round(clip.height));
    }

    // A：通報（玩家在爆心下方 3.5 格）
    await clipGame('nuke-warn.png', 0, -3.5, 13, 13, 2.6);

    // B：落下中（凍結在落下 50% 的畫面）
    await p.eval(`(function(){ var G=window.__BH.Game; G.state='roundover'; G.brNuke.phase='fall'; G.brNuke.t=1.0; G.brNuke.fall=0.5; return 1; })()`);
    await sleep(320);
    await clipGame('nuke-fall.png', 0, -5.2, 12, 14, 2.6);

    // C：落地爆炸（先真的引爆，再把動畫凍結在 k≈0.18 與 k≈0.45）
    await p.eval(`(function(){ var G=window.__BH.Game; G.state='play'; G.brNuke.phase='fall'; G.brNuke.t=0.02; G.brNuke.fall=0.99; G.brNukeCd=40; return 1; })()`);
    await sleep(260);
    await p.eval(`(function(){ var G=window.__BH.Game; G.state='roundover'; if (G.brNuke) { G.brNuke.phase='done'; G.brNuke.dur=1.45; G.brNuke.t=1.45*0.82; } return 1; })()`);
    await sleep(320);
    await clipGame('nuke-boom.png', 0, -3.5, 15, 15, 2.2);
    await p.eval(`(function(){ var G=window.__BH.Game; if (G.brNuke) G.brNuke.t=1.45*0.55; return 1; })()`);
    await sleep(320);
    await clipGame('nuke-boom2.png', 0, -3.5, 15, 15, 2.2);

    // D：燒地（把核彈收掉，只留燒地）
    await p.eval(`(function(){ var G=window.__BH.Game; G.brNuke=null; if (G.brBurn[0]) G.brBurn[0].t=7; return 1; })()`);
    await sleep(420);
    await clipGame('nuke-burn.png', 0, -3.5, 15, 15, 2.2);

    // E：隊友白色炸彈 vs 自己的黑色炸彈
    await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, S = window.__ST, T = G.T;
      var me = G.players[0], mate = G.players[1];
      G.brTeam = 2; G.teamsOn = 2; me.team = 0;
      if (mate) { mate.team = 0; mate.alive = true; }
      G.brBurn = []; G.brNuke = null; G.flames = []; G.bombs = [];
      function mk(cx, cy, owner) {
        return { cx: cx, cy: cy, px: (cx + .5) * T, py: (cy + .5) * T, timer: 1.4, power: 2,
          owner: owner, passers: [], remoteArmed: false, mine: false, moving: null, held: false,
          ownerLeft: true, seed: 1.2, flying: null };
      }
      G.bombs.push(mk(S.bx - 2, S.by, me));
      G.bombs.push(mk(S.bx + 2, S.by, mate));
      return 1;
    })()`);
    await sleep(350);
    await clipGame('bomb-white.png', 0, -3.5, 9, 6, 3.4);

    // F：藍色爆炸
    await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      for (var i = 0; i < G.bombs.length; i++) {
        if (G.bombs[i].cx > window.__ST.bx) { BH.explodeBomb(G.bombs[i]); break; }
      }
      return 1;
    })()`);
    await sleep(150);
    await clipGame('bomb-blue.png', 0, -3.5, 10, 7, 3.2);

    console.log('done');
  } finally {
    b.close();
  }
})();
