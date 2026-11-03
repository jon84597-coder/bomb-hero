// 對戰模式整圖截圖：連續跑 N 回合，每一回合都截一張
//   node test/shot-v464-battle.js [回合數]
//   舊版要驗證的話先把舊檔放到 _oldbh/index.html，再設環境變數 OLD=1
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OLD = process.env.OLD === '1';
const URL = 'file:///' + path.resolve(__dirname, OLD ? '../_oldbh/index.html' : '../index.html').replace(/\\/g, '/');
const ROUNDS = parseInt(process.argv[2] || '4', 10);
const TAG = OLD ? 'old' : 'new';
const OUT = path.join(__dirname, '_v464');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

(async () => {
  const b = await launch({ port: 9797, w: 1300, h: 1150 });
  const p = await b.newPage();
  await p.goto(URL, 6000);
  for (let i = 0; i < 100; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game&&window.__BH.Game.grid)')) break; await sleep(250); }
  await sleep(600);

  // 進入對戰（4 人，AI 補位）
  const info = await p.eval(`(function(){
    var BH = window.__BH, G = BH.Game;
    BH.settings.count = 4; BH.settings.size = 'M'; BH.settings.hazards = 'on'; BH.settings.sd = 'off';
    BH.Battle.resetSlots();
    BH.startBattle();
    var ov = document.getElementById('ovIn'); if (ov) { ov.classList.add('hide'); ov.style.setProperty('display','none','important'); }
    G.state = 'play'; G.countdown = 0;
    return { mode: G.mode, cols: G.cols, rows: G.rows, players: G.players.length };
  })()`);
  console.log('mode=' + info.mode + ' ' + info.cols + 'x' + info.rows + ' players=' + info.players);

  for (let r = 1; r <= ROUNDS; r++) {
    const st = await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      if (${r} > 1) { G.round = ${r}; BH.buildBattleRound(); }
      var ov = document.getElementById('ovIn'); if (ov) { ov.classList.add('hide'); ov.style.setProperty('display','none','important'); }
      G.state = 'play'; G.countdown = 0;
      // 走幾幀讓 hint/popup 消失
      for (var i = 0; i < 30; i++) BH.updateBattle(1/60);
      var cv = document.getElementById('cv');
      var zz = Math.min(cv.width / ((G.cols + 2.4) * G.T), cv.height / ((G.rows + 2.4) * G.T));
      G.zoom = (isFinite(zz) && zz > .05) ? zz : .84;      // 畫布還沒佈局時別給 0（會讓氛圍層算出 NaN）
      if (BH.updateCamera) BH.updateCamera();
      BH.render();
      // 統計：實心但不畫（= 露底色）的格子，以及其中「不連到外框」的真黑洞
      var cols = G.cols, rows = G.rows, g = G.grid, wk = G.wallKind;
      var conn = [], q = [];
      for (var y = 0; y < rows; y++) { conn.push(new Array(cols).fill(false)); }
      for (var x = 0; x < cols; x++) { q.push([x,0]); q.push([x,rows-1]); }
      for (var y = 0; y < rows; y++) { q.push([0,y]); q.push([cols-1,y]); }
      for (var i2 = 0; i2 < q.length; i2++) {
        var cx = q[i2][0], cy = q[i2][1];
        if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
        if (conn[cy][cx] || g[cy][cx] !== 1) continue;
        conn[cy][cx] = true;
        q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
      }
      var solid = 0, notDrawn = 0, hole = 0, art = [];
      for (var y2 = 0; y2 < rows; y2++) {
        var row = '';
        for (var x2 = 0; x2 < cols; x2++) {
          var gg = g[y2][x2], kk = (wk && wk[y2]) ? wk[y2][x2] : -1;
          row += (gg !== 1) ? (gg === 0 ? '.' : 's') : (kk === 1 ? 'B' : kk === 2 ? 'H' : kk === 0 ? '-' : '?');
          if (gg === 1) { solid++; if (kk === 0) { notDrawn++; if (!conn[y2][x2]) hole++; } }
        }
        art.push(row);
      }
      return { round: G.round, stage: G.stage, theme: (G.theme && G.theme.name) || '?',
               solid: solid, notDrawn: notDrawn, hole: hole, art: art.join(String.fromCharCode(10)) };
    })()`);

    console.log('回合' + st.round + '  主題=' + st.theme + '  牆=' + st.solid +
      '  不畫=' + st.notDrawn + '  真黑洞=' + st.hole + (st.hole ? '  <<< 掉圖' : ''));
    fs.writeFileSync(path.join(OUT, 'battle-' + TAG + r + '.txt'), st.art);
    const rr = await p.eval(`(function(){var cv=document.getElementById('cv');var q=cv.getBoundingClientRect();return {l:q.left,t:q.top,w:q.width,h:q.height};})()`);
    const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: rr.l, y: rr.t, width: rr.w, height: rr.h, scale: 1 } });
    fs.writeFileSync(path.join(OUT, 'battle-' + TAG + r + '.png'), Buffer.from(shot.data, 'base64'));
    await sleep(250);
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
