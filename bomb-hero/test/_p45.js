// v5.68 本地探針：魔王在真頁面裡自走時還會不會左右抖
//   ① 版本 = 5.68、防抖動機制都在
//   ② 進第 5 關（決戰場），把玩家丟到王旁邊讓牠追，量 8 秒的水平翻面次數
//   ③ 讓牠自己在場上走 20 秒（無仇恨），量巡邏翻面次數
//   ④ 截圖：決戰場真的正常
const path = require('path');
const CDP = require('./cdp');
(async function () {
  const br = await CDP.launch({ port: 9445, w: 980, h: 900 });
  const p = await br.newPage();
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
  try {
    await p.goto('http://localhost:8099/?unlock=all', 15000);
    await wait(3500);
    const st = JSON.parse(await p.eval(`JSON.stringify({
      ver: (typeof __BH !== 'undefined') ? __BH.VERSION : null,
      mem: typeof (__BH && __BH.bossCellMemory),
      hold: typeof (__BH && __BH.bossStepHold),
      cost: typeof (__BH && __BH.bossBackCost),
      noise: typeof (__BH && __BH.aiCellNoise),
      brboss: typeof (__BH && __BH.updateBRBoss)
    })`) || '{}');
    console.log('  state:', JSON.stringify(st));
    ok(st.ver === '5.68', 'VERSION = ' + st.ver);
    ok(st.mem === 'function' && st.hold === 'function' && st.cost === 'function', '防抖動三件套都在');
    ok(st.noise === 'function', '座標雜湊噪聲在');
    ok(st.brboss === 'function', '亂入王更新可測');

    // ② 進第 5 關（決戰場）：讓玩家貼近王，量牠的左右翻面
    const chase = JSON.parse(await p.eval(`(function(){
      __BH.startSolo(5);
      __BH.Game.state = 'play'; __BH.Game.timer = 9999;
      if (__BH.ovHide) __BH.ovHide();
      var _ov = document.getElementById('ov');
      if (_ov) { _ov.style.display = 'none'; _ov.classList.remove('on'); }
      var G = __BH.Game, T = G.T;
      var A = G.bossArena;
      var boss = A && A.boss;
      if (!boss) return JSON.stringify({ err: 'no boss' });
      var pl = G.players[0];
      // 玩家站到王正下方 2 格（會觸發仇恨）
      pl.invuln = 99999; pl.alive = true; pl.dead = false;
      pl.x = boss.x; pl.y = boss.y + T * 2;
      var flips = 0, lastVx = 0, moved = 0;
      for (var i = 0; i < 60 * 8; i++) {
        var ox = boss.x;
        __BH.updateSolo(1 / 60);
        var vx = boss.x - ox;
        if (Math.abs(vx) > 0.01) {
          moved += Math.abs(vx);
          if (lastVx !== 0 && Math.sign(vx) !== Math.sign(lastVx)) flips++;
          lastVx = vx;
        }
        // 玩家跟著王跑，維持 2 格距離（模擬「玩家在王旁邊繞」）
        pl.x = boss.x + Math.sin(i * 0.03) * T * 0.6;
        pl.y = boss.y + T * 2;
        pl.invuln = 99999;
      }
      return JSON.stringify({ flips: flips, moved: Math.round(moved), x: Math.round(boss.x), y: Math.round(boss.y) });
    })()`));
    console.log('  chase:', JSON.stringify(chase));
    ok(!chase.err, '決戰場真的有王');
    ok(chase.flips <= 8, '追人 8 秒左右翻面 ≤ 8 次（' + chase.flips + '）');
    ok(chase.moved > 40, '牠仍然真的在走（位移 ' + chase.moved + 'px）');

    // ③ 無仇恨：讓牠自己在場上晃 20 秒
    const patrol = JSON.parse(await p.eval(`(function(){
      var G = __BH.Game;
      var A = G.bossArena, boss = A && A.boss;
      if (!boss) return JSON.stringify({ err: 'no boss' });
      var pl = G.players[0];
      pl.x = 40; pl.y = 40; pl.invuln = 99999;      // 玩家躲到角落 → 沒仇恨
      boss.aggro = false; boss.angerT = 0;
      var flips = 0, lastVx = 0, moved = 0;
      for (var i = 0; i < 60 * 20; i++) {
        var ox = boss.x;
        __BH.updateSolo(1 / 60);
        var vx = boss.x - ox;
        if (Math.abs(vx) > 0.01) {
          moved += Math.abs(vx);
          if (lastVx !== 0 && Math.sign(vx) !== Math.sign(lastVx)) flips++;
          lastVx = vx;
        }
        pl.invuln = 99999; pl.alive = true; pl.dead = false;
      }
      return JSON.stringify({ flips: flips, moved: Math.round(moved) });
    })()`));
    console.log('  patrol:', JSON.stringify(patrol));
    ok(!patrol.err, '巡邏測試有王');
    ok(patrol.flips <= 8, '無仇恨巡邏 20 秒左右翻面 ≤ 8 次（' + patrol.flips + '）');

    // ④ 截圖（先關掉「出發！」準備面板，畫面才看得到場上）
    await p.eval(`(function(){
      var G = __BH.Game, A = G.bossArena, boss = A && A.boss;
      var pl = G.players[0];
      if (boss) { pl.x = boss.x; pl.y = boss.y + G.T * 2.4; pl.invuln = 99999; }
      G.state = 'play';
      if (__BH.ovHide) __BH.ovHide();
      var ov = document.getElementById('ov');
      if (ov) { ov.style.display = 'none'; ov.classList.remove('on'); }
      G.camSnap = true;
      if (__BH.updateCamera) __BH.updateCamera(1/60);
    })()`);
    await wait(1200);
    await p.shot(path.join(__dirname, '_v564', 'p45-boss.png'));
    ok(true, '截圖 p45-boss.png');
  } catch (e) {
    fail++;
    console.log('  ✗ 例外：' + (e && e.message));
  } finally {
    console.log('\n通過 ' + pass + ' / ' + (pass + fail));
    try { await br.close(); } catch (e) {}
    if (fail) process.exitCode = 1;
  }
})();
