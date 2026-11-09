// v5.67 線上探針：大逃殺 AI 真的變嗜血了（不是只改參數）
//   ① 線上版本 = 5.67、SW 版號同步
//   ② 在真頁面跑一場 20 人 120 秒 → 炸彈數要明顯高於舊版（舊版同條件約 90 顆以下）
//   ③ 追擊半徑／冷卻／開炸倍率都在線上生效
//   ④ 截圖：大逃殺真的打起來
const path = require('path');
const CDP = require('./cdp');
(async function () {
  const br = await CDP.launch({ port: 9444, w: 980, h: 900 });
  const p = await br.newPage();
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
  try {
    await p.goto('https://bomb-hero-game.onrender.com/?unlock=all', 15000);
    await wait(3800);
    const st = JSON.parse(await p.eval(`JSON.stringify({
      ver: (typeof __BH !== 'undefined') ? __BH.VERSION : null,
      sw: (navigator.serviceWorker && navigator.serviceWorker.controller) ? 1 : 0,
      cd0: __BH && __BH.BR_AI ? __BH.BR_AI.CD[0] : null,
      cd9: __BH && __BH.BR_AI ? __BH.BR_AI.CD[9] : null,
      bk0: __BH && __BH.BR_AI ? __BH.BR_AI.BK[0] : null,
      eng0: __BH && __BH.brEngageR ? __BH.brEngageR(0) : null,
      eng9: __BH && __BH.brEngageR ? __BH.brEngageR(9) : null,
      standoff: __BH ? __BH.BR_STANDOFF : null
    })`) || '{}');
    console.log('  state:', JSON.stringify(st));
    ok(st.ver === '5.67', '線上 VERSION = ' + st.ver);
    ok(st.cd0 === 10 && st.cd9 === 3, '放彈冷卻 10→3 秒（' + st.cd0 + '→' + st.cd9 + '）');
    ok(st.bk0 === 0.34, '開場開炸倍率 34%（' + st.bk0 + '）');
    ok(st.eng0 === 11 && st.eng9 === 16, '追擊半徑 11→16 格（' + st.eng0 + '→' + st.eng9 + '）');
    ok(st.standoff === 2.0, '交戰距離 2.0 格（' + st.standoff + '）');

    // 真的跑一場：20 人 120 秒（模擬時鐘，不等真實時間）
    const sim = JSON.parse(await p.eval(`(function(){
      var P = __BH, G = P.Game;
      P.settings.aiLevel = 'normal';
      P.BR.opt.n = 20; P.BR.opt.map = 1; P.BR.opt.team = 1;
      P.startBR();
      G.state = 'play';
      var seen = new Set(), bombs = 0, moved = 0;
      var last = new Map();
      G.players.forEach(function(q){ if (q.ai) last.set(q, {x: q.x, y: q.y}); });
      for (var i = 0; i < 3600; i++) {
        P.updateBR(1/30);
        for (var k = 0; k < G.bombs.length; k++) { var b = G.bombs[k]; if (!seen.has(b)) { seen.add(b); bombs++; } }
        G.players.forEach(function(q){
          var o = last.get(q); if (!o) return;
          moved += Math.abs(q.x - o.x) + Math.abs(q.y - o.y);
          o.x = q.x; o.y = q.y;
        });
      }
      var alive = G.players.filter(function(q){ return q.alive; }).length;
      return JSON.stringify({ bombs: bombs, alive: alive, moved: Math.round(moved), state: G.state,
        aiBombCd: (G.players[1] || {}).brBombCd || 0 });
    })()`));
    console.log('  sim:', JSON.stringify(sim));
    ok(sim.bombs >= 120, '★ 120 秒內 AI 放了 ' + sim.bombs + ' 顆炸彈（舊版同條件 < 100）');
    ok(sim.alive < 20, '★ 真的打到有人死（20 → ' + sim.alive + '）');
    ok(sim.moved > 10000, 'AI 真的在場上跑動（位移 ' + sim.moved + ' px）');
    // 收掉出發卡，再跑一小段，讓畫面真的停在「打起來」的瞬間
    await p.eval(`(function(){
      var ov = document.getElementById('ovIn'); if (ov) ov.classList.add('hide');
      document.body.classList.remove('ovopen');
      __BH.Game.state = 'play';
      for (var i = 0; i < 120; i++) __BH.updateBR(1/30);
      return 1;
    })()`);
    await wait(900);
    await p.shot(path.join(__dirname, '_v564', 'p44-br-ai.png'));
  } catch (e) { console.log('EX', e && e.message); fail++; }
  console.log('\n' + (fail === 0 ? '通過 ' + pass + ' / ' + (pass + fail) : '✗ ' + fail + ' 項失敗（通過 ' + pass + '）'));
  try { await br.close(); } catch (e) {}
  process.exit(fail ? 1 : 0);
})();
