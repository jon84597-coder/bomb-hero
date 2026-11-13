// test/_probe-freemove.js —— v5.93 真瀏覽器驗證：自由走位（拿掉格子吸附）
//   為什麼要手動驅動 controlHuman：無頭頁面的 rAF 會被瀏覽器節流（實測 40 次取樣有 36 次沒動），
//   量不到連續位移。這裡改成在真 DOM／真 canvas 的環境裡直接跑固定幀數，數學與沙盒一致。
//   驗：① 45 度等量 ② 停在非格心 ③ 貼牆時被擋軸停住、另一軸照走 ④ 不穿牆 ⑤ 無 JS 錯誤
const { launch, sleep } = require('./cdp');
const URL = 'http://127.0.0.1:3122/';

const BOOT = `(function(){
  try { localStorage.setItem('bombhero-rotskip','1'); } catch(e){}
  var r = document.getElementById('rotHint'); if (r && r.parentNode) r.parentNode.removeChild(r);
  var B = window.__BH;
  B.settings.ctrl = 'kb'; B.settings.mapMode = 'classic'; B.settings.hazards = 'off';
  B.startSolo(1, false);
  var G = B.Game; G.state = 'play'; G.countdown = 0;
  var me = G.players[0];
  me.ch = me.ch || {}; me.ch.animal = 'rabbit';
  me.invuln = 0; me.alive = true;
  return { T: G.T, cols: G.cols, rows: G.rows };
})()`;

// 找一格「上、右、右上都是空地」的格 → 測斜走
const TRACE = `(function(){
  var B = window.__BH, G = B.Game, T = G.T, me = G.players[0];
  var fx = 1, fy = 2;
  outer: for (var y = 1; y < G.rows - 1; y++) {
    for (var x = 1; x < G.cols - 2; x++) {
      if (G.grid[y][x] === 0 && G.grid[y][x+1] === 0 && G.grid[y-1][x] === 0 && G.grid[y-1][x+1] === 0) {
        fx = x; fy = y; break outer;
      }
    }
  }
  me.x = fx * T + T / 2; me.y = fy * T + T / 2; me.invuln = 0; me.alive = true;
  me.scheme = { dirs: function(){ return ['right','up']; }, action: function(){ return false; }, actionHeld: function(){ return false; } };
  var out = [], err = null;
  var x0 = me.x, y0 = me.y;
  for (var i = 0; i < 60; i++) {
    try { B.controlHuman(me, 1/60); } catch (e) { err = e.message; break; }
    if (i % 6 === 5) {
      var cx = Math.floor(me.x / T), cy = Math.floor(me.y / T);
      out.push({ x: +me.x.toFixed(1), y: +me.y.toFixed(1), cell: (G.grid[cy] || [])[cx] });
    }
  }
  return { start: { x: +x0.toFixed(1), y: +y0.toFixed(1), fx: fx, fy: fy }, T: T,
           dx: +(me.x - x0).toFixed(2), dy: +(me.y - y0).toFixed(2), trace: out, err: err,
           offX: +(((me.x / T) % 1)).toFixed(3), offY: +(((me.y / T) % 1)).toFixed(3),
           errs: (window.__BHB && window.__BHB.errs && window.__BHB.errs.length) || 0 };
})()`;

// 貼牆：找一格「正上方是牆、右邊是空地」，往右上推 → y 停住、x 繼續
const WALL = `(function(){
  var B = window.__BH, G = B.Game, T = G.T, me = G.players[0];
  var fx = -1, fy = -1;
  outer: for (var y = 2; y < G.rows - 2; y++) {
    for (var x = 1; x < G.cols - 4; x++) {
      if (G.grid[y][x] === 0 && G.grid[y-1][x] === 1 && G.grid[y][x+1] === 0 && G.grid[y][x+2] === 0) {
        fx = x; fy = y; break outer;
      }
    }
  }
  if (fx < 0) return { skip: true };
  me.x = fx * T + T / 2; me.y = fy * T + T / 2; me.invuln = 0; me.alive = true;
  me.scheme = { dirs: function(){ return ['right','up']; }, action: function(){ return false; }, actionHeld: function(){ return false; } };
  var x0 = me.x, y0 = me.y, xs = [], ys = [];
  for (var i = 0; i < 60; i++) {
    B.controlHuman(me, 1/60);
    if (i % 12 === 11) { xs.push(+me.x.toFixed(1)); ys.push(+me.y.toFixed(1)); }
  }
  var cx = Math.floor(me.x / T), cy = Math.floor(me.y / T);
  return { at: [fx, fy], dx: +(me.x - x0).toFixed(2), dy: +(me.y - y0).toFixed(2),
           xs: xs, ys: ys, cell: (G.grid[cy] || [])[cx],
           gapToWall: +((fy * T - me.y) / T).toFixed(3) };
})()`;

(async () => {
  const br = await launch({ w: 900, h: 1000, port: 9401 });
  const page = await br.newPage();
  await page.resize(430, 900, true);
  await page.goto(URL + '?t=' + Date.now(), 2600);
  await page.eval(`(async function(){
    try {
      if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); for (const r of rs) await r.unregister(); }
      if (window.caches) { const ks = await caches.keys(); for (const k of ks) await caches.delete(k); }
    } catch(e){}
    return 1;
  })()`);
  await page.goto(URL + '?t=' + Date.now(), 2600);

  console.log('boot', JSON.stringify(await page.eval(BOOT)));
  await sleep(500);

  const t = await page.eval(TRACE);
  console.log('\n--- 斜走 60 幀（右上）---');
  console.log('start', JSON.stringify(t.start), 'T=' + t.T);
  console.log('dx/dy', t.dx, '/', t.dy, ' errs', t.errs, t.err ? ' ERR ' + t.err : '');
  console.log('停在格內位置 x%', t.offX, ' y%', t.offY);
  console.log('trace cell', JSON.stringify(t.trace.map(s => s.cell)));
  console.log('trace x', JSON.stringify(t.trace.map(s => s.x)));
  console.log('trace y', JSON.stringify(t.trace.map(s => s.y)));

  const w = await page.eval(WALL);
  console.log('\n--- 貼牆斜走（上方是牆）---');
  if (w.skip) console.log('（這張圖找不到條件，略過）');
  else {
    console.log('at', JSON.stringify(w.at), 'dx/dy', w.dx, '/', w.dy, ' cell', w.cell);
    console.log('xs', JSON.stringify(w.xs));
    console.log('ys', JSON.stringify(w.ys));
    console.log('離牆面', w.gapToWall, '格');
  }

  // 把開場遮罩收掉、讓角色停在「貼著牆」的位置，拍一張實戰畫面確認不會陷進牆裡
  const vis = await page.eval(`(function(){
    var B = window.__BH, G = B.Game, T = G.T, me = G.players[0];
    try { B.hideOverlay && B.hideOverlay(); } catch(e){}
    var ov = document.getElementById('ovIn'); if (ov) { ov.classList.add('hide'); ov.style.display = 'none'; }
    ['ovl','overlay','startCard'].forEach(function(id){ var e = document.getElementById(id); if (e) e.style.display = 'none'; });
    // 站在貼牆位置（上面 WALL 測試結束的地方）
    return { x: +me.x.toFixed(1), y: +me.y.toFixed(1), T: T, scr: (B.Screen && B.Screen.current) };
  })()`);
  console.log('vis', JSON.stringify(vis));
  await sleep(600);
  await page.shot(__dirname + '/_probe-freemove.png');
  console.log('\nshot ok');
  await br.close();
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
