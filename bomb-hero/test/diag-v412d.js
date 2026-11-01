// test/diag-v412d.js — 實機驗證：暈眩中的怪被炸到會不會死 + 單人怪一擊必殺
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v412');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9353 });
  const page = await br.newPage();
  await page.goto(URL, 1200);

  // ---- ① 暈眩中的怪被炸到 ----
  const dizzy = await page.eval(`(function(){
    var G = __BH.Game;
    __BH.startSolo(1, false);
    G.state = 'play';
    G.bombs.length = 0; G.flames.length = 0;
    var e = __BH.makeEnemy(3, 3, 'slime', 1, 1);
    e.speed = 0; e.dirT = 999;
    var T = G.T;
    e.x = 3*T + T/2; e.y = 3*T + T/2;
    G.enemies.push(e);
    e.dizzy = 1.0;                       // 進入暈眩
    var hp0 = e.hp;
    // 在它腳下點火
    G.flames.push({ cx:3, cy:3, type:'center', dir:null, t:.46, owner:G.players[0], src:null });
    __BH.updateEnemy(e, 1/60);
    var afterHit = { hp: e.hp, dead: !!e.dead, dizzy: e.dizzy };
    // 再補一刀 → 應該死
    e.hp = 1; e.maxHp = 1; e.dead = false; e.hitT = 0; e.dizzy = 1.0;
    G.flames.length = 0;
    G.flames.push({ cx:3, cy:3, type:'center', dir:null, t:.46, owner:G.players[0], src:null });
    __BH.updateEnemy(e, 1/60);
    return { hp0: hp0, afterHit: afterHit, deadAfterSecond: !!e.dead };
  })()`);
  console.log('=== ① 暈眩中的怪 ===');
  console.log('  ' + JSON.stringify(dizzy));

  // ---- ② 單人闖關的小怪：一擊必殺 ----
  const solo = await page.eval(`(function(){
    var G = __BH.Game;
    __BH.startSolo(1, false);
    G.state = 'play';
    var es = G.enemies.filter(function(e){ return !e.boss; });
    var hp = es.map(function(e){ return e.type+':'+e.hp+'/'+e.maxHp; });
    // 真的炸一次看看死不死
    var T = G.T, e0 = es[0];
    e0.speed = 0; e0.dirT = 999;
    e0.x = 3*T + T/2; e0.y = 3*T + T/2;
    for (var dx=-2; dx<=2; dx++) for (var dy=-2; dy<=2; dy++) G.grid[3+dy][3+dx]=0;
    G.bombs.length = 0; G.flames.length = 0;
    G.bombs.push({ cx:3, cy:3, px:e0.x, py:e0.y, timer:0.01, power:2, owner:G.players[0],
      passers:[G.players[0]], remoteArmed:false, mine:false, mineLife:10,
      moving:null, flying:null, held:false, seed:1, armT:40 });
    for (var i=0; i<60; i++) { __BH.updateWorld(1/60); if(!e0.dead) __BH.updateEnemy(e0, 1/60); }
    return { count: es.length, hpList: hp, deadAfterOneBomb: !!e0.dead };
  })()`);
  console.log('\n=== ② 單人闖關的小怪 ===');
  console.log('  ' + JSON.stringify(solo));

  // ---- ③ 單人模式不畫血條 / RPG 模式有血條 ----
  const bars = await page.eval(`(function(){
    var G = __BH.Game;
    __BH.startSolo(1, false);
    G.state = 'play';
    var T = G.T, e0 = G.enemies[0];
    e0.x = 3*T + T/2; e0.y = 3*T + T/2;
    var calls = [];
    var orig = __BH.Game.enemies;
    // 直接量 drawRpgHud 產生的 fillRect 次數
    var realFill = ctx.fillRect;
    var n = 0;
    ctx.fillRect = function(){ n++; return realFill.apply(ctx, arguments); };
    __BH.drawRpgHud(T);
    var soloBars = n;
    n = 0;
    G.rpg = true;                       // 假裝 RPG 模式
    var e1 = __BH.makeEnemy(3,3,'beetle',1,1); e1.x=3*T+T/2; e1.y=3*T+T/2; e1.hp=4; e1.maxHp=4;
    G.enemies.push(e1);
    __BH.drawRpgHud(T);
    var rpgBars = n;
    G.rpg = false;
    ctx.fillRect = realFill;
    return { soloBars: soloBars, rpgBars: rpgBars };
  })()`);
  console.log('\n=== ③ 血條 ===');
  console.log('  單人模式血條 fillRect 次數=' + bars.soloBars + '（應為 0）');
  console.log('  RPG 模式血條 fillRect 次數=' + bars.rpgBars + '（應為 2：底框+血條）');

  await br.close();
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
