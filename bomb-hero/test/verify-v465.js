// test/verify-v465.js — v4.65：客人畫面抖動／手機大地圖格子大小／縮放範圍
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const FILE = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const SRC = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

(async function () {
  console.log('=== v4.65 驗證 ===');

  // ---- 靜態：版本與關鍵程式碼 ----
  console.log('[1] 版本 / 程式碼');
  const vm = SRC.match(/const VERSION = '([\d.]+)';/);
  ok(vm && parseFloat(vm[1]) >= 4.65, 'VERSION >= 4.65（目前 ' + (vm && vm[1]) + '，不寫死版號）');
  ok(SRC.includes('const gk = hostT > 0 ? Game.T / hostT : 1;'), '快照座標有換算係數 gk');
  ok(SRC.includes('Game.T = clamp(Math.round(tileSize() || hostT), 12, 62);'), '客人的格子大小由自己螢幕決定');
  ok(/const ZOOM_MIN = \.42, ZOOM_MAX = 3\.00/.test(SRC), '縮放範圍 42%~300%（v4.86 上限放寬）');
  ok(SRC.includes('if (p.tx != null) { p.tx *= k; p.ty *= k; }'), '轉向時插值目標一起換算');

  const br = await launch({ port: 9481, w: 390, h: 844 });
  const page = await br.newPage();
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.resize(390, 844, true);
  await page.goto(FILE, 3500);
  ok(await page.eval('typeof __BH') === 'object', '頁面載入且 __BH 就緒');
  // 強制觸控模式（body.touch 才會被加上，手機上的真實狀態）
  await page.eval("__BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
  await page.eval("__BH.Screen.show('game'); __BH.resizeView(); 1");   // 讓畫布真的排版，量到 390x775
  await sleep(400);
  ok(await page.eval("document.body.classList.contains('touch')"), '進入觸控模式（body.touch）');

  // ---- [2] 模擬客人：房主 T=62、本地 390x844，反覆套快照 + resizeView ----
  console.log('[2] 線上客人不再抖動');
  const jit = await page.eval(`(function(){
    var G = __BH.Game, Net = __BH.Net;
    Net.pid = 'guest-1'; Net.on = true; Net.role = 'guest'; Net.mySlot = 0;
    // 造一張「房主端」快照：15x13、T=62、玩家站在第 5 欄第 5 列中央
    var rows = [];
    for (var y = 0; y < 13; y++) {
      var r = '';
      for (var x = 0; x < 15; x++) r += (x === 0 || y === 0 || x === 14 || y === 12) ? '1' : '0';
      rows.push(r);
    }
    var px = 5 * 62 + 31, py = 5 * 62 + 31;
    var snap = { T: 62, c: 15, r: 13, th: 0, g: rows, hz: [], tm: 60, st: 'play', sd: 0,
      pl: [['guest-1', 0]], tt: 0,
      p: [[px, py, 0, 1, 0, 0, 0, 0, 0, 'G', 0, -1]], b: [], f: [], it: [], bb: [], ov: null, bn: '' };
    G.state = 'play';
    __BH.applySnap(snap);
    var samples = [];
    for (var i = 0; i < 12; i++) {
      __BH.applySnap(snap);          // 每 100ms 一張快照
      __BH.resizeView();             // 每 400ms 一次尺寸重算（實機每 0.4 秒跑）
      var p = G.players[0];
      samples.push([G.T, Math.round(p.x), Math.round(p.tx), G.cols, G.rows]);
    }
    var Ts = samples.map(function(s){ return s[0]; });
    var pxs = samples.map(function(s){ return s[1]; });
    var txs = samples.map(function(s){ return s[2]; });
    function spread(a){ return Math.max.apply(null, a) - Math.min.apply(null, a); }
    return { T: Ts[0], Tspread: spread(Ts), xspread: spread(pxs), txspread: spread(txs),
      localT: G.T, expectX: Math.round(px * G.T / 62), actualX: pxs[0], samples: samples.slice(0, 4) };
  })()`);
  ok(jit.Tspread === 0, '格子大小不再每 0.4 秒被改來改去', jit);
  ok(jit.xspread <= 1, '玩家畫面座標不再來回彈（舊版會一路縮到 0）', jit);
  ok(jit.txspread <= 1, '插值目標穩定', jit);
  console.log('    [debug]', JSON.stringify(await page.eval(`(function(){
    var v=__BH.viewInfo(); return { w:v.w, h:v.h, portrait: v.h>v.w, tile: __BH.tileSize(),
      rows: __BH.Game.rows, cols: __BH.Game.cols, touch: document.body.classList.contains('touch'),
      bigMap: !!__BH.Game.bigMap }; })()`)));
  ok(jit.localT !== 62 && jit.localT >= 40, '客人的格子大小用自己的螢幕（不是房主的 62）', { T: jit.localT });
  ok(jit.localT === Math.round(Math.min(775 / 13, 390 / 7.2)), '客人格子 = 自己螢幕算出來的值', { T: jit.localT });
  ok(Math.abs(jit.actualX - jit.expectX) <= 1, '房主座標按比例正確換算', jit);

  // ---- [3] resizeView 反覆跑，T 不變 ----
  console.log('[3] 尺寸重算不再縮放世界');
  const rs = await page.eval(`(function(){
    var G = __BH.Game, p = G.players[0];
    var beforeT = G.T, beforeX = p.x, out = [];
    for (var i = 0; i < 8; i++) { __BH.resizeView(); out.push([G.T, Math.round(p.x)]); }
    return { beforeT: beforeT, beforeX: Math.round(beforeX), out: out };
  })()`);
  ok(rs.out.every(r => r[0] === rs.beforeT), '連跑 8 次 resizeView 不動 T', rs);
  ok(rs.out.every(r => Math.abs(r[1] - rs.beforeX) <= 1), '連跑 8 次 resizeView 不動座標', rs);

  br.close();

  // ---- [4] 手機直放大地圖 ----
  console.log('[4] 手機直放隨機地圖（390x844）');
  const br2 = await launch({ port: 9482, w: 390, h: 844 });
  const pg = await br2.newPage();
  await pg.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await pg.resize(390, 844, true);
  await pg.goto(FILE, 3500);
  const sizes = [];
  for (const n of [1, 3, 5]) {
    await pg.eval(`__BH.startMapTest(${n}); 1`);
    await sleep(2200);
    const r = await pg.eval(`(function(){
      var G = __BH.Game, v = __BH.viewInfo();
      return { n: ${n}, T: G.T, cols: G.cols, rows: G.rows,
        fillH: +(G.rows * G.T / v.h).toFixed(2), fillW: +(G.cols * G.T / v.w).toFixed(2),
        tilesW: +(v.w / G.T).toFixed(1) };
    })()`);
    sizes.push(r);
    console.log('    map' + n + ':', JSON.stringify(r));
  }
  ok(sizes[0].T >= 32, '18×16 地圖格子 ≥32px（舊版 21px）', sizes[0]);
  ok(sizes[0].fillH >= 0.68, '18×16 地圖直向填滿 ≥68% 高度（舊版 43%）', sizes[0]);
  ok(sizes[2].fillH >= 0.85, '28×25 地圖直向幾乎填滿', sizes[2]);
  ok(sizes.every(s => s.T * 0.85 >= 25), '格子夠大 → 小怪美術不再被最小像素下限撐大', sizes.map(s => s.T));

  // 縮放極限
  const z = await pg.eval(`(function(){
    var o = [];
    for (var i = 0; i < 40; i++) __BH.Zoom.by(-0.14);
    o.push(__BH.Game.zoomTarget);
    for (var j = 0; j < 60; j++) __BH.Zoom.by(0.14);
    o.push(__BH.Game.zoomTarget);
    return o;
  })()`);
  ok(Math.abs(z[0] - 0.42) < 0.001, '可縮到 42%', z);
  ok(Math.abs(z[1] - 3.00) < 0.001, '可放到 300%', z);

  // 截圖
  await pg.eval('__BH.startMapTest(1); 1');
  await sleep(2200);
  await pg.eval('(function(){ var e=document.getElementById("rotHint"); if(e) e.remove(); __BH.Game.state="play"; __BH.Game.zoom=__BH.Game.zoomTarget=1; __BH.Game.camSnap=true; __BH.render(); return 1; })()');
  await pg.shot(path.join(__dirname, '_v465/phone-big-default.png'));
  await pg.eval('(function(){ var e=document.getElementById("rotHint"); if(e) e.remove(); var G=__BH.Game; G.zoom=G.zoomTarget=0.42; G.camSnap=true; __BH.render(); return 1; })()');
  await sleep(200);
  await pg.shot(path.join(__dirname, '_v465/phone-big-zoomout.png'));
  br2.close();

  console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
