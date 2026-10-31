// v1.9 實機驗證：手機搖桿靈敏度（輕推就有反應、轉彎不卡一半）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const br = await launch({ w: 390, h: 844, port: 9398 });
  const page = await br.newPage();
  await page.resize(390, 844, true);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, 1600);

  const setup = await page.eval(`(function(){
    var P = window.__BH, G = P.Game;
    P.settings.hazards='off'; P.settings.ctrl='touch';
    P.startSolo(1, false);
    P.Screen.show('game');
    document.getElementById('ovIn').classList.add('hide');
    document.body.classList.add('touch');
    G.state='play';
    for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++) G.grid[y][x]=0;
    G.enemies.length=0; G.bombs.length=0; G.flames.length=0; G.items.length=0;
    if (G.eggs) G.eggs.length=0;
    var me=G.players[0];
    me.invuln=999; me.alive=true;
    me.x=2.5*G.T; me.y=7.5*G.T;
    return { pad: (function(r){ return { x: r.left+r.width/2, y: r.top+r.height/2, w: r.width }; })(document.getElementById('tpad').getBoundingClientRect()) };
  })()`);
  console.log('場景', JSON.stringify(setup));
  const pad = setup.pad;
  const R = pad.w / 2;

  // 用 CDP 派真實觸控事件到搖桿上
  async function stick(dx, dy, ms) {
    await page.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: pad.x, y: pad.y, id: 1 }]
    });
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      await page.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: pad.x + dx * i / steps, y: pad.y + dy * i / steps, id: 1 }]
      });
    }
    await sleep(ms);
    const st = await page.eval(`(function(){
      var P = window.__BH, G = P.Game, me = G.players[0];
      return { ax: +P.Input.touchState.ax.toFixed(2), ay: +P.Input.touchState.ay.toFixed(2),
               x: +(me.x/G.T).toFixed(2), y: +(me.y/G.T).toFixed(2), face: me.facing };
    })()`);
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(120);
    return st;
  }

  // 1) 輕推一点点（超出死區一點）→ 立刻有方向
  const light = await stick(R * 0.22, 0, 260);
  console.log('輕推 22%：', JSON.stringify(light), '→ 應該 ax≈1 且 face=right');

  // 2) 往右走 → 突然轉上（前兩格上面都有牆、第三格才有缺口 → 考驗轉彎補位）
  await page.eval(`(function(){
    var G = window.__BH.Game, T = G.T;
    for (var x=1;x<G.cols-1;x++) G.grid[6][x]=1;   // 第 6 列整排硬牆
    G.grid[6][5]=0;                                 // 只有 x=5 有缺口
    var me=G.players[0]; me.x=3.5*T; me.y=7.5*T;    // 站第 3 格
    return 1;
  })()`);
  const r1 = await stick(R * 0.9, 0, 420);            // 往右走
  console.log('往右走：', JSON.stringify(r1));
  const r2 = await stick(0, -R * 0.9, 700);           // 轉上（要從 x=5 的缺口上去）
  console.log('轉上 0.7 秒：', JSON.stringify(r2), '→ 應該 y < 7 且 x≈5');

  // 3) 快速交替轉向（左↔右），確認不會卡死
  await page.eval(`(function(){
    var G = window.__BH.Game, T = G.T;
    for (var y=1;y<G.rows-1;y++) for (var x=1;x<G.cols-1;x++) G.grid[y][x]=0;
    var me=G.players[0]; me.x=4.5*T; me.y=4.5*T;
    return 1;
  })()`);
  let stuck = 0, lastX = null;
  for (let k = 0; k < 8; k++) {
    const d = k % 2 === 0 ? 1 : -1;
    const s = await stick(d * R, 0, 180);
    if (lastX !== null && Math.abs(s.x - lastX) < 0.02) stuck++;
    lastX = s.x;
  }
  console.log('左右交替 8 次：卡住次數 =', stuck, '最後 x =', lastX);

  // 4) 頭暈實測（真實更新迴圈裡丟一顆炸彈出去）
  const dz = await page.eval(`(function(){
    var P = window.__BH, G = P.Game, T = G.T;
    var me=G.players[0], e=P.makeEnemy(6,4,'slime',1,1);
    G.enemies.push(e);
    var b={cx:6,cy:4,px:6*T+T/2,py:4*T+T/2,timer:2,power:2,owner:me,passers:[],
           flying:{fx:6,fy:4,tx:6,ty:4,t:0,dur:.4},held:false,moving:null};
    G.bombs.push(b);
    for (var i=0;i<20;i++) P.updateWorld(1/60);
    var d1=(e.dizzy||0)>0;
    for (var i=0;i<70;i++) P.updateWorld(1/60);
    return { hit: d1, after: +(e.dizzy||0).toFixed(2) };
  })()`);
  console.log('飛彈砸中小怪：', JSON.stringify(dz));

  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
