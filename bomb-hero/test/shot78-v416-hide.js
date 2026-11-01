// test/shot78-v416-hide.js — v4.16：樹叢／破屋躲人、只有第 32 關有魔王、手機結束畫面
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v416');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9395 });
  const p = await br.newPage();
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame = function(){ return 0; };'
  });
  await p.goto(URL, 1800);
  await sleep(700);

  // ---------- ① 遊戲內：選一棵樹叢，把玩家放進去 ----------
  const r1 = await p.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.playerName = '我';
    P.startSolo(1);
    G.state = 'play';
    var T = G.T, bush = null, hut = null, cells = [];
    for (var y = 1; y < G.rows - 1; y++) for (var x = 1; x < G.cols - 1; x++) {
      var hz = G.hazards[y] && G.hazards[y][x];
      if (hz && hz.type === 'hide') {
        cells.push({x:x,y:y,kind:hz.kind});
        if (!bush && hz.kind === 'bush') bush = {x:x,y:y};
        if (!hut && hz.kind === 'hut') hut = {x:x,y:y};
      }
    }
    window.__cells = cells;
    var me = G.players[0];
    var t = bush || cells[0];
    me.x = t.x * T + T / 2; me.y = t.y * T + T / 2;
    me.facing = 'down'; me.moving = false; me.invuln = 0;
    // 相機對準角色
    G.camSnap = true;
    for (var i = 0; i < 3; i++) P.updateCamera(1/60);
    P.updateHud();
    return JSON.stringify({ cells: cells.length, bush: bush, hut: hut, T: T, cols: G.cols, rows: G.rows,
      hiding: P.playerHiding(me) });
  })()`);
  console.log('躲點：' + r1);
  await sleep(200);
  await p.eval(`(function(){ window.__BH.render(); return 1; })()`);
  await sleep(300);
  const cvBush = await p.eval(`document.getElementById('cv').toDataURL('image/png')`);
  fs.writeFileSync(path.join(OUT, 'v416-hide-bush-self.png'), Buffer.from(cvBush.split(',')[1], 'base64'));

  // ---------- ② 破屋 ----------
  await p.eval(`(function(){
    var P = window.__BH, G = P.Game, T = G.T;
    var hut = null;
    for (var i = 0; i < window.__cells.length; i++) if (window.__cells[i].kind === 'hut') { hut = window.__cells[i]; break; }
    var t = hut || window.__cells[1] || window.__cells[0];
    var me = G.players[0];
    me.x = t.x * T + T / 2; me.y = t.y * T + T / 2;
    P.updateCamera(1/60); P.updateHud();
    return 1;
  })()`);
  await sleep(200);
  await p.eval(`(function(){ window.__BH.render(); return 1; })()`);
  await sleep(300);
  const cvHut = await p.eval(`document.getElementById('cv').toDataURL('image/png')`);
  fs.writeFileSync(path.join(OUT, 'v416-hide-hut-self.png'), Buffer.from(cvHut.split(',')[1], 'base64'));

  // ---------- ③ 別人躲在裡面（完全被蓋住） ----------
  const r3 = await p.eval(`(function(){
    var P = window.__BH, G = P.Game, T = G.T;
    // 對戰模式才有「別人」：改用兩個玩家
    P.startBattle();
    G.state = 'play';
    var cells = [];
    for (var y = 1; y < G.rows - 1; y++) for (var x = 1; x < G.cols - 1; x++) {
      var hz = G.hazards[y] && G.hazards[y][x];
      if (hz && hz.type === 'hide') cells.push({x:x,y:y});
    }
    var a = cells[0], b = cells[1] || cells[0];
    var p1 = G.players[0], p2 = G.players[1];
    p1.x = a.x * T + T / 2; p1.y = a.y * T + T / 2;
    if (p2) { p2.x = b.x * T + T / 2; p2.y = b.y * T + T / 2; p2.ai = true; p2.alive = true; }
    P.updateCamera(1/60); P.updateHud();
    return JSON.stringify({ cells: cells.length, p1hiding: P.playerHiding(p1), p2hiding: p2 ? P.playerHiding(p2) : null });
  })()`);
  console.log('對戰躲點：' + r3);
  await sleep(200);
  await p.eval(`(function(){ window.__BH.render(); return 1; })()`);
  await sleep(300);
  const cvBattle = await p.eval(`document.getElementById('cv').toDataURL('image/png')`);
  fs.writeFileSync(path.join(OUT, 'v416-hide-battle.png'), Buffer.from(cvBattle.split(',')[1], 'base64'));

  // ---------- ④ 選關畫面：只有第 32 關有 👑 ----------
  await p.eval(`(function(){
    var P = window.__BH;
    P.Solo.dev = true;
    P.Screen.show('solo');
    P.Solo.renderGrid();
    P.Solo.pick(32);
    return 1;
  })()`);
  await sleep(500);
  const grid = await p.eval(`(function(){
    var g = document.getElementById('stageGrid');
    var kids = [].slice.call(g.querySelectorAll('.stg'));
    var bosses = kids.filter(function(k){ return k.classList.contains('boss'); });
    return JSON.stringify({ total: kids.length, bosses: bosses.length,
      bossStage: bosses[0] ? bosses[0].getAttribute('data-stage') : null });
  })()`);
  console.log('選關：' + grid);
  await p.shot(path.join(OUT, 'v416-stage-select.png'));

  await br.close();

  // ---------- ⑤ 手機：結束畫面（再來一場） ----------
  const br2 = await launch({ w: 844, h: 390, port: 9396 });
  const p2 = await br2.newPage();
  await p2.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.requestAnimationFrame = function(){ return 0; };'
  });
  await p2.resize(844, 390, true);
  await p2.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p2.goto(URL, 1800);
  await sleep(800);
  const r5 = await p2.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.playerName = '我';
    P.startSolo(1);
    G.state = 'play';
    var me = G.players[0]; me.lives = 1; me.invuln = 0;
    P.killPlayer(me, false, null);
    for (var i = 0; i < 400 && !G.endShown; i++) P.updateSolo(0.02);
    var b = document.getElementById('btnAgain');
    var r = b ? b.getBoundingClientRect() : null;
    var hit = r ? document.elementFromPoint(r.left + r.width/2, r.top + r.height/2) : null;
    return JSON.stringify({ state: G.state, endShown: G.endShown,
      ovopen: document.body.classList.contains('ovopen'),
      btn: !!b, hit: hit ? (hit.id || hit.className) : null,
      inBtn: !!(hit && b && b.contains(hit)) });
  })()`);
  console.log('手機結束畫面：' + r5);
  await sleep(400);
  await p2.shot(path.join(OUT, 'v416-end-mobile.png'));
  await br2.close();
  console.log('截圖完成 → ' + OUT);
})().catch(e => { console.error('EXC', e); process.exit(1); });
