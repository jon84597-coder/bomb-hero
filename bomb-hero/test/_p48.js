// v5.69 線上探針：外觀只套在自己身上（炸彈外殼／爆風顏色）
//   ① 版本 = 5.69、外觀模組就緒
//   ② 套一組很明顯的自訂色（爆風綠、彈殼紅），在真 canvas 上量像素：
//      自己的彈 → 紅；AI 的彈 → 黑曜（紅通道很低）
//      自己的火 → 綠；AI 的火 → 橙（綠通道遠低於紅）
//   ③ 產一張 A/B 對照圖（左：玩家；右：AI）存檔，人工目檢
//   ④ 真的進第 1 關跑 1.5 秒，確認畫面沒壞、爆炸照常渲染
const path = require('path');
const fs = require('fs');
const CDP = require('./cdp');
(async function () {
  const br = await CDP.launch({ port: 9448, w: 980, h: 900 });
  const p = await br.newPage();
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  let pass = 0, fail = 0;
  const ok = (c, m, extra) => {
    if (c) { pass++; console.log('  ✓ ' + m + (extra === undefined ? '' : ' → ' + extra)); }
    else { fail++; console.log('  ✗ ' + m + (extra === undefined ? '' : ' → ' + extra)); }
  };
  try {
    await p.goto('https://bomb-hero-game.onrender.com/?unlock=all', 15000);
    await wait(3500);

    const st = JSON.parse(await p.eval(`JSON.stringify({
      ver: (typeof __BH !== 'undefined') ? __BH.VERSION : null,
      skins: typeof (window.__BHSkins && __BHSkins.applyCustom),
      drawBombOn: typeof (__BH && __BH.drawBombOn),
      drawFlameOn: typeof (__BH && __BH.drawFlameOn)
    })`) || '{}');
    console.log('  state:', JSON.stringify(st));
    ok(st.ver === '5.69', 'VERSION = ' + st.ver);
    ok(st.skins === 'function' && st.drawBombOn === 'function' && st.drawFlameOn === 'function', '外觀與繪製介面都在');

    /* ② 套上自訂色，量像素 */
    const R = JSON.parse(await p.eval(`(function(){
      __BHSkins.applyCustom('flame', '#00ff88');
      __BHSkins.applyCustom('bomb', '#ff0000');
      var C = window.__BHSKIN.cache;

      function px(g, x, y) { return g.getImageData(x, y, 1, 1).data; }
      function scan(g, w, h, fn) {
        var d = g.getImageData(0, 0, w, h).data, n = 0;
        for (var i = 0; i < d.length; i += 4) if (fn(d[i], d[i+1], d[i+2], d[i+3])) n++;
        return n;
      }

      // --- 炸彈：畫在 96×96 的正中央，取球體中心附近最亮的一點 ---
      var cv = document.createElement('canvas'); cv.width = cv.height = 96;
      var g = cv.getContext('2d');
      function bomb(center) {
        g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,96,96);
        g.save(); g.translate(48, 54);
        __BH.drawBombOn(g, 34, 3, false, true, false, center ? undefined : false);
        g.restore();
        // 取「最紅」的那一點（r-g 最大）—— 球體有白色高光，用 max(r) 會挑到高光
        var best = [0,0,0], bestD = -9999;
        for (var y = 32; y <= 74; y += 2) for (var x = 18; x <= 78; x += 2) {
          var q = px(g, x, y);
          if (q[3] < 200) continue;
          if (q[0] - q[1] > bestD) { bestD = q[0] - q[1]; best = [q[0], q[1], q[2]]; }
        }
        return best;
      }
      var bMine = bomb(true), bAi = bomb(false);

      // --- 爆風：T=64 → 火心在 (32,32)，掃整張找「綠」與「橙」的像素數 ---
      var fv = document.createElement('canvas'); fv.width = fv.height = 96;
      var fg = fv.getContext('2d');
      function flame(mine, owner) {
        fg.setTransform(1,0,0,1,0,0); fg.clearRect(0,0,96,96);
        __BH.drawFlameOn(fg, { cx: 0, cy: 0, type: 'center', dir: null, t: .30,
          owner: owner, mine: mine }, 64);
        return {
          green: scan(fg, 96, 96, function(r,g,b,a){ return a > 60 && g > r + 40 && g > 110; }),
          orange: scan(fg, 96, 96, function(r,g,b,a){ return a > 60 && r > 200 && g > 90 && g < 210 && b < 110; })
        };
      }
      var fMine = flame(true, { ai: false });
      var fAi = flame(false, { ai: true });

      // --- ③ A/B 對照圖（左：玩家 / 右：AI）---
      var AB = document.createElement('canvas'); AB.width = 560; AB.height = 300;
      var a = AB.getContext('2d');
      a.fillStyle = '#1a2030'; a.fillRect(0, 0, 560, 300);
      a.strokeStyle = 'rgba(255,255,255,.16)'; a.lineWidth = 2;
      a.beginPath(); a.moveTo(280, 0); a.lineTo(280, 300); a.stroke();
      a.fillStyle = '#dfe7f5'; a.font = '700 18px sans-serif'; a.textAlign = 'center';
      a.fillText('YOU', 140, 34); a.fillText('AI / MONSTER', 420, 34);
      [['#00ff88', '#ff0000', 140], ['#ff6914', '#5b6172', 420]].forEach(function (cfg, idx) {
        // 炸彈
        a.save(); a.translate(cfg[2], 110);
        if (idx === 0) __BH.drawBombOn(a, 40, 3, false, true, false);
        else __BH.drawBombOn(a, 40, 3, false, true, false, false);
        a.restore();
        // 爆風
        __BH.drawFlameOn(a, { cx: (cfg[2] - 32) / 64, cy: 2.55, type: 'center', dir: null,
          t: .30, owner: idx === 0 ? { ai: false } : { ai: true }, mine: idx === 0 }, 64);
      });
      a.textAlign = 'start';

      return JSON.stringify({
        bombStops0: C.bombStops ? C.bombStops[0] : null,
        flameMid: C.flame ? C.flame[3] : null,
        bMine: bMine, bAi: bAi, fMine: fMine, fAi: fAi,
        png: AB.toDataURL('image/png')
      });
    })()`) || '{}');

    console.log('  cache:', R.bombStops0, R.flameMid);
    ok(/^#[0-9a-f]{6}$/i.test(R.bombStops0 || '') &&
      parseInt(String(R.bombStops0).slice(1, 3), 16) > parseInt(String(R.bombStops0).slice(3, 5), 16) + 50,
      '自訂彈殼色真的進了熱路徑快取（偏紅）', R.bombStops0);
    ok(/0,255,136/.test(R.flameMid || ''), '自訂爆風色進了熱路徑快取');

    ok(R.bMine[0] - R.bMine[1] > 60, '自己的彈殼是紅色', JSON.stringify(R.bMine));
    ok(R.bAi[0] - R.bAi[1] < 25, 'AI 的彈殼是原本的黑曜（不偏紅）', JSON.stringify(R.bAi));
    ok(R.fMine.green > 200, '自己的爆風是綠色', JSON.stringify(R.fMine));
    ok(R.fAi.orange > 200 && R.fAi.green < 60, 'AI 的爆風是原本的橙火', JSON.stringify(R.fAi));

    const dir = path.join(__dirname, '_v564');
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    const png = String(R.png || '').replace(/^data:image\/png;base64,/, '');
    if (png) { fs.writeFileSync(path.join(dir, 'p48-skin-ab.png'), Buffer.from(png, 'base64')); console.log('  ⤓ A/B 對照圖已存'); }

    /* ④ 真的進第 1 關，確認畫面沒壞 */
    const game = JSON.parse(await p.eval(`(function(){
      __BH.startSolo(1);
      __BH.Game.state = 'play'; __BH.Game.timer = 9999;
      if (__BH.ovHide) __BH.ovHide();
      var _ov = document.getElementById('ov');
      if (_ov) { _ov.style.display = 'none'; _ov.classList.remove('on'); }
      var G = __BH.Game, me = G.players[0];
      // 同一畫面放一團「自己的火」與一團「AI 的火」—— t 設 3 秒，撐得到截圖
      var cx = Math.floor(me.x / G.T), cy = Math.floor(me.y / G.T);
      G.flames.push({ cx: cx + 2, cy: cy, type: 'center', dir: null, t: 3, owner: me, src: null, ally: false, mine: true });
      G.flames.push({ cx: cx + 4, cy: cy, type: 'center', dir: null, t: 3, owner: { ai: true }, src: null, ally: false, mine: false });
      for (var i = 0; i < 30; i++) __BH.updateSolo(1 / 60);
      return JSON.stringify({ stage: G.stage, mode: G.mode, flames: G.flames.length,
        alive: G.players.filter(function (q) { return q.alive; }).length });
    })()`) || '{}');
    console.log('  game:', JSON.stringify(game));
    ok(game.stage === 1 && game.mode === 'solo', '第 1 關正常進入');
    await p.shot(path.join(dir, 'p48-ingame.png'));

    console.log('\n========================================');
    console.log('v5.69 外觀只給自己：' + pass + ' 通過 / ' + fail + ' 失敗');
    if (fail) process.exitCode = 1;
  } finally {
    await br.close();
  }
})();
