// v2.2：BOSS 火焰長度實測（應為 2 格）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

(async () => {
  const br = await launch({ w: 1000, h: 700, port: 9403 });
  const page = await br.newPage();
  await page.goto(URL, 1800);

  const res = await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.hazards = 'off';
    P.startSolo(8, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.getElementById('touchUI').style.display = 'none';
    G.state = 'play';
    var T = G.T;
    for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++) G.grid[y][x] = 0;
    G.enemies.length = 0; G.bombs.length = 0; G.flames.length = 0; G.items.length = 0;
    if (G.eggs) G.eggs.length = 0;
    var cx = Math.floor(G.cols/2), cy = Math.floor(G.rows/2);
    var me = G.players[0]; me.invuln = 999; me.x = T*1.5; me.y = T*1.5;
    var boss = P.makeBoss(cx, cy, 10);
    G.enemies.push(boss);
    boss.bombT = 0;
    // 讓 BOSS 放一顆彈
    for (var i=0;i<40;i++) P.updateBoss(boss, 1/60);
    var b = G.bombs.filter(function(b){ return !b.owner; })[0];
    if (!b) return { err: 'BOSS 沒放彈' };
    var power = b.power, bcx = b.cx, bcy = b.cy;
    G.bombs.length = 0; G.bombs.push(b);   // 只留這一顆，量測才準
    b.fuse = 0.02;
    // 引爆（用主迴圈的 updateSolo 推進）
    for (var i=0;i<120 && G.flames.length===0;i++) P.updateSolo(1/60);
    // 量測四方向最遠火焰距離
    var dirs = {};
    G.flames.forEach(function(f){
      var dx = f.cx - bcx, dy = f.cy - bcy;
      if (dx === 0 && dy === 0) return;
      var d = Math.max(Math.abs(dx), Math.abs(dy));
      var k = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
      dirs[k] = Math.max(dirs[k] || 0, d);
    });
    P.updateCamera(); P.render();
    G.state = 'paused';
    return { power: power, BOSS_POWER: P.BOSS_POWER, flames: G.flames.length, dirs: dirs };
  })()`);
  console.log('BOSS 火焰', JSON.stringify(res));
  await sleep(300);
  await page.shot(OUT + 'v22-1-boss-flame.png');
  console.log('v22-1-boss-flame.png');
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
