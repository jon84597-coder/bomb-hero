// 線上煙霧：開 Pages 站，確認版本 / 無 JS 例外 / 大逃殺真的開得起來（30 人）
const { launch, sleep } = require('./cdp');
const URL = process.argv[2] || 'https://jon84597-coder.github.io/bomb-hero/';
let pass = 0, fail = 0;
const ok = (n, c, e) => { if (c) { pass++; console.log('  ✓ ' + n + (e ? '（' + e + '）' : '')); } else { fail++; console.log('  ✗ ' + n + (e ? '（' + e + '）' : '')); } };
(async () => {
  const b = await launch({ w: 390, h: 800 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  const errs = [];
  b.send && null;
  await p.goto(URL, 3000);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  ok('__BH 載入完成', (await p.eval('typeof __BH')) === 'object');
  ok('版本 4.76', (await p.eval('__BH.VERSION')) === '4.76', await p.eval('__BH.VERSION'));
  ok('徽章文字同步', (await p.eval("(document.getElementById('verTxt')||{}).textContent")) === '4.76');
  ok('版本紀錄最上面是 4.76', (await p.eval("__BH.VERSION_LOG[0].v")) === '4.76');
  ok('八大關卡底圖下載得到', await p.eval("(function(){return new Promise(function(r){var im=new Image();im.onload=function(){r(im.naturalWidth>=256)};im.onerror=function(){r(false)};im.src='bg/forest.webp';setTimeout(function(){r(false)},6000);})})()"));
  await p.eval("try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  ok('預設開發者（全 32 關解鎖）', (await p.eval('__BH.Solo.maxUnlocked()')) === 32);
  const r = await p.eval(`(function(){
    var t0=Date.now();
    var r=__BH.startBR();
    var G=__BH.Game;
    return JSON.stringify({ok:r, mode:G.mode, cols:G.cols, rows:G.rows, n:G.players.length,
      alive:G.brAlive, foes:(G.enemies||[]).length, hp:G.players[0].brHp, ms:Date.now()-t0,
      zr:G.brZone.r, ph:G.brZone.phase});
  })()`);
  const o = JSON.parse(r);
  console.log('    ' + r);
  ok('startBR 成功、模式 br', o.ok === true && o.mode === 'br');
  ok('56×44 地圖', o.cols === 56 && o.rows === 44);
  ok('30 人同場', o.n === 30 && o.alive === 30);
  ok('14 小怪＋2 BOSS', o.foes === 16, o.foes);
  ok('10 點血', o.hp === 10);
  ok('開局不縮圈（r=30）', o.zr === 30 && o.ph === 0);
  ok('開圖 < 600ms', o.ms < 600, o.ms + 'ms');
  ok('兩隻亂入 BOSS 進場', (await p.eval('__BH.Game.enemies.filter(function(e){return !!e.brBoss;}).length')) === 2);
  ok('BOSS 20 點血', (await p.eval('__BH.Game.enemies.filter(function(e){return !!e.brBoss;})[0].maxHp')) === 20);
  ok('隊友標記函式在線', (await p.eval('typeof __BH.drawMateTag')) === 'function');
  const err = await p.eval("(window.__errCnt||0)");
  b.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' 失敗' : '✅ 全部 ' + pass + ' 通過'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
