// test/shot-v467-cmp.js — 縮圈時的牆素材：舊版（4.66）場內硬牆被染成外牆 vs 新版（4.67）保持石材
//   兩邊用「同一張固定棋盤地圖」→ 可以逐格對照
const { launch, sleep } = require('./cdp');
const path = require('path');
const NEW = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OLD = 'file:///' + path.join(__dirname, '_v467/old466.html').replace(/\\/g, '/');

(async function () {
  const br = await launch({ port: 9593, w: 390, h: 844 });
  const np = await br.newPage();
  const op = await br.newPage();
  for (const p of [np, op]) {
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.resize(390, 844, true);
  }
  await np.goto(NEW, 3200);
  await op.goto(OLD, 3200);
  for (let i = 0; i < 40; i++) {
    const a = await np.eval('typeof __BH').catch(() => 'x');
    const b = await op.eval('typeof __BH').catch(() => 'x');
    if (a === 'object' && b === 'object') break;
    await sleep(300);
  }
  for (const [p, tag] of [[np, 'new'], [op, 'old']]) {
    await p.eval("try{localStorage.setItem('bombhero-rotskip','1')}catch(e){}; " +
      "__BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
    await p.eval("__BH.settings.count=4; __BH.settings.size='M'; __BH.settings.sd='on'; __BH.startBattle(); 1");
    await sleep(900);
    await p.eval("window.__err=[]; window.addEventListener('error', function(e){ window.__err.push(String(e.message||e)); }); 1");
    const r = await p.eval(`(function(){
      var G = __BH.Game, cols = G.cols, rows = G.rows;
      // 固定棋盤地圖（跟 buildMap 一樣）—— 兩版可以逐格對照
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        G.grid[y][x] = (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) ? 1
          : ((x % 2 === 0 && y % 2 === 0) ? 1 : 0);
      }
      G.wallKind = null; G.sdRock = null; G.sdIndex = 0; G.sdActive = true;
      var n = Math.round(G.sdList.length / 12);          // 落一圈
      for (var i = 0; i < n; i++) {
        var c = G.sdList[G.sdIndex++];
        if (G.grid[c[1]][c[0]] !== 1) {
          G.grid[c[1]][c[0]] = 1;
          if (!G.sdRock) G.sdRock = {};
          G.sdRock[c[1] * G.cols + c[0]] = 1;
        }
      }
      G.wallKind = null;
      G.state = 'play'; G.zoom = G.zoomTarget = 1; G.camSnap = true;
      var me = G.players[0];
      me.x = (cols / 2) * G.T; me.y = (rows / 2) * G.T;
      ['rotHint', 'zoomHint'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.remove();
      });
      ['zoomPill', 'banner', 'toast'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.style.display = 'none';
      });
      var ov = document.getElementById('ovIn'); if (ov) ov.classList.add('hide');
      var err = '';
      try { __BH.updateCamera(1); __BH.render(); } catch (e) { err = e.message; }
      return JSON.stringify({ cols: cols, rows: rows, T: G.T, ring: n, err: err,
        screen: __BH.Screen.current, state: G.state });
    })()`);
    console.log(tag, r);
    await sleep(250);
    await p.eval("['rotHint','zoomHint'].forEach(function(id){var e=document.getElementById(id); if(e) e.remove();}); " +
      "['zoomPill','banner'].forEach(function(id){var e=document.getElementById(id); if(e) e.style.display='none';}); __BH.render(); 1");
    await p.shot(path.join(__dirname, `_v467/cmp-${tag}.png`));
    console.log(tag, 'errors:', await p.eval("JSON.stringify(window.__err.slice(0,3))"));
  }
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
