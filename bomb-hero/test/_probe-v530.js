// v5.30 探針：看單人簡單模式的 HUD 是不是「兩顆心」，被打一下變一顆
// 用法：node test/_probe-v530.js
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

(async () => {
  const b = await launch({ port: 9863, w: 430, h: 932 });
  try {
    const p = await b.newPage();
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 6000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(400);

    const r1 = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game, S = BH.settings;
      S.playerName = 'TEST';
      S.soloDiff = 'easy';
      BH.startSolo(1, false);
      G.state = 'play';
      try { BH.hideOverlay(); } catch (e) {}
      var ov = document.getElementById('ov'); if (ov) ov.classList.add('hide');
      var p0 = G.players[0];
      return { hp: p0.sHp, max: p0.sHpMax, lives: p0.lives, hud: document.querySelector('.chip[data-k="hp"]').textContent };
    })()`);
    console.log('開場：', JSON.stringify(r1));

    // 截 HUD（頂部那條）看清楚兩顆心
    const box = await p.eval(`(function(){
      var e = document.getElementById('gameTop') || document.querySelector('.chip[data-k="hp"]');
      if (!e) return null;
      var r = e.getBoundingClientRect();
      return { x: Math.max(0, r.x - 6), y: Math.max(0, r.y - 6), w: Math.min(430, r.width + 12), h: r.height + 12 };
    })()`);
    if (box) {
      const shot = await p.send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 3 },
        captureBeyondViewport: true
      });
      const f = path.resolve(__dirname, '_v530', 'hud-full.png');
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
      console.log('截圖：', f, box);
    }

    const r2 = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      var p0 = G.players[0];
      p0.invuln = 0;
      BH.killPlayer(p0, false, null);
      BH.updateHud();
      return { alive: p0.alive, hp: p0.sHp, lives: p0.lives, hud: document.querySelector('.chip[data-k="hp"]').textContent };
    })()`);
    console.log('被打一下：', JSON.stringify(r2));

    if (box) {
      const shot2 = await p.send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 3 },
        captureBeyondViewport: true
      });
      const f2 = path.resolve(__dirname, '_v530', 'hud-hit.png');
      fs.writeFileSync(f2, Buffer.from(shot2.data, 'base64'));
      console.log('截圖：', f2);
    }

    const r3 = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      var p0 = G.players[0];
      p0.invuln = 0;
      BH.killPlayer(p0, false, null);
      return { alive: p0.alive, hp: p0.sHp, lives: p0.lives, hud: document.querySelector('.chip[data-k="hp"]').textContent };
    })()`);
    console.log('第二下：', JSON.stringify(r3));
  } finally {
    b.close();
  }
})();
