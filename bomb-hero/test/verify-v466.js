// test/verify-v466.js — v4.66：①連線客人嘟嘟嘟＋卡頓 ②隨機地圖牆量 ③小怪碰撞判定
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

// 固定種子 → 地圖每次長得一樣，牆量才可以斷言
const FILE = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/') + '?seed=12345';
const SRC = require('./_sandbox').rawHtml;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

(async function () {
  console.log('=== v4.66 驗證 ===');

  // ================= 1. 版本 / 靜態 =================
  console.log('[1] 版本與關鍵程式碼');
  const vv = SRC.match(/const VERSION = '([\d.]+)';/);
  ok(vv && parseFloat(vv[1]) >= 4.66, 'VERSION >= 4.66（目前 ' + (vv && vv[1]) + '，不寫死版號）');
  ok(SRC.includes('const NET_SNAP_DT = .1;'), '快照間隔常數 NET_SNAP_DT');
  ok(/function humanMoveDirs\(p, dirs, dt\)/.test(SRC), '走路邏輯抽成 humanMoveDirs（單機／客人共用）');
  ok(/humanMoveDirs\(p, dirs, dt\);\n  if \(dirs\.length\) \{/.test(SRC), 'controlHuman 改用 humanMoveDirs');
  ok(SRC.includes('if (Net.mySlot >= 0 && Game.state === \'play\' && !Game.frozen)'), '客人會在本機預測自己的角色');
  ok(SRC.includes('Game.frozen = (s.st === \'countdown\');'), '客人的「倒數中」只是 frozen 旗標');
  ok(SRC.includes("if (s.st === 'countdown') Game.state = 'play';"), '客人不進入 countdown 狀態（否則 GO! 會連發）');
  ok(SRC.includes('!(Net.on && Net.role === \'guest\')) updateCountdown(dt)'), '客人不跑本地倒數');
  ok(SRC.includes('setInterval(function () { Net.poll(); }, 100);'), '輪詢 100ms（原 140ms）');
  ok(SRC.includes('if (Net.it >= .07)'), '輸入 70ms 送一次（原 100ms）');
  ok(/function foeTouchR\(e\)/.test(SRC), '新增 foeTouchR()（判定跟著身體大小）');
  ok((SRC.match(/foeTouchR\(e\)/g) || []).length >= 4, '三處碰撞（單人／RPG／隨從）都改用 foeTouchR');
  ok(!SRC.includes('(e.r + 12) * (e.r + 12)') && !SRC.includes('(e.r + 10) * (e.r + 10)'),
    '舊的固定 +10／+12 判定已移除');
  ok(SRC.includes('const softRate = opts.softRate == null ? .52 : opts.softRate;'), '軟磚率 .52（隨機地圖也一樣）');
  ok(SRC.includes('Math.max(4, Math.min(16, Math.round(opn * .18)))'), '隨機大圖岩柱 18%、上限 16 根');
  ok(SRC.includes('const openCount = function () { return bfsReach(g, cols, rows, sp.x, sp.y).count; };'),
    '岩柱放置改用 BFS 檢查連通');

  const br = await launch({ port: 9486, w: 390, h: 844 });
  const page = await br.newPage();
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.resize(390, 844, true);
  await page.goto(FILE, 3500);
  ok(await page.eval('typeof __BH') === 'object', '頁面載入且 __BH 就緒');
  await page.eval("__BH.settings.ctrl='touch'; __BH.applyCtrl(); __BH.Screen.show('game'); __BH.resizeView(); 1");
  await sleep(500);
  const localT = await page.eval('__BH.tileSize()');

  // ================= 2. 倒數不再嘟嘟嘟 =================
  console.log('[2] 客人收到「倒數中」快照不會狂播 GO!');
  const cd = await page.eval(`(function(){
    var G = __BH.Game, Net = __BH.Net;
    Net.pid = 'g1'; Net.on = true; Net.role = 'guest'; Net.mySlot = 0;
    window.__sfx = [];
    var o = __BH.AudioSys.sfx;
    __BH.AudioSys.sfx = function(n){ window.__sfx.push(n); return o.apply(__BH.AudioSys, arguments); };
    var rows = [];
    for (var y = 0; y < 13; y++) {
      var r = '';
      for (var x = 0; x < 15; x++) r += (x === 0 || y === 0 || x === 14 || y === 12) ? '1' : '0';
      rows.push(r);
    }
    function mk(st){ return { T: ${localT}, c: 15, r: 13, th: 0, g: rows, hz: [], tm: 60, st: st, sd: 0,
      pl: [['g1', 0]], tt: 0,
      p: [[3*${localT}+${localT}/2, 3*${localT}+${localT}/2, 0, 1, 0, 0, 0, 0, 0, 'G', 0, -1]],
      b: [], f: [], it: [], bb: [], ov: null, bn: '' }; }
    var out = { st: [], frozen: [] };
    for (var i = 0; i < 20; i++) {
      __BH.applySnap(mk('countdown'));
      out.st.push(G.state); out.frozen.push(!!G.frozen);
    }
    out.sfx = window.__sfx.slice();
    __BH.applySnap(mk('play'));
    out.afterSt = G.state; out.afterFrozen = !!G.frozen;
    return out;
  })()`);
  ok(cd.st.every(s => s === 'play'), '20 張「倒數中」快照後客人 state 一直是 play', cd.st.slice(0, 3));
  ok(cd.frozen.every(v => v === true), '倒數期間 frozen = true（不能走）');
  ok(cd.sfx.filter(n => n === 'go' || n === 'count').length === 0,
    '倒數期間沒有 go／count 音效（嘟嘟嘟消失）', cd.sfx.slice(0, 6));
  ok(cd.afterSt === 'play' && cd.afterFrozen === false, '開打後 frozen 解除');

  // ================= 3. 自己的角色：本機預測 =================
  console.log('[3] 客人自己的角色 60fps 預測（不再 300~500ms 才動）');
  const pred = await page.eval(`(function(){
    var G = __BH.Game, Net = __BH.Net;
    var T = G.T;
    Net.mySlot = 0;
    Net.myScheme = function(){ return { dirs: function(){ return ['right']; }, action: function(){ return false; } }; };
    G.state = 'play'; G.frozen = false;
    var p = G.players[0];
    var x0 = p.x, arr = [];
    for (var i = 0; i < 60; i++) { __BH.Net.guestTick(1/60); arr.push(p.x); }
    var d = [];
    for (var j = 1; j < arr.length; j++) d.push(arr[j] - arr[j-1]);
    var moved = p.x - x0;
    var stalls = d.filter(function(v){ return Math.abs(v) < .3; }).length;
    var jumps = d.filter(function(v){ return Math.abs(v) > 6; }).length;
    return { T: T, moved: +moved.toFixed(1), perFrame: +(moved / 60).toFixed(2),
      stalls: stalls, jumps: jumps, expect: +(146/60).toFixed(2) };
  })()`);
  ok(pred.perFrame > 2.2 && pred.perFrame < 2.7, '每幀前進 ≈ 2.43px（146px/s）', pred);
  ok(pred.stalls === 0, '沒有任何一幀停住（60 幀全部有位移）', pred);
  ok(pred.jumps === 0, '沒有跳格（10Hz 大步位移消失）', pred);

  // 小誤差只記 erX；大誤差才硬拉
  const corr = await page.eval(`(function(){
    var G = __BH.Game, Net = __BH.Net, T = G.T;
    Net.mySlot = 0;
    var rows = [];
    for (var y = 0; y < 13; y++) {
      var r = '';
      for (var x = 0; x < 15; x++) r += (x === 0 || y === 0 || x === 14 || y === 12) ? '1' : '0';
      rows.push(r);
    }
    function snap(px, py){ return { T: T, c: 15, r: 13, th: 0, g: rows, hz: [], tm: 60, st: 'play', sd: 0,
      pl: [['g1', 0]], tt: 0, p: [[px, py, 0, 1, 0, 0, 0, 0, 0, 'G', 0, -1]],
      b: [], f: [], it: [], bb: [], ov: null, bn: '' }; }
    var p = G.players[0];
    p.x = 5*T; p.y = 5*T;
    var small = snap(5*T + T*.3, 5*T);      // 差 0.3 格 → 不該硬拉
    __BH.applySnap(small);
    var afterSmall = p.x, errSmall = p.erX;
    var big = snap(5*T + T*3, 5*T);         // 差 3 格 → 直接對齊
    __BH.applySnap(big);
    return { afterSmall: +afterSmall.toFixed(1), base: 5*T, errSmall: +(errSmall||0).toFixed(1),
      afterBig: +p.x.toFixed(1), bigWant: 5*T + 3*T };
  })()`);
  ok(Math.abs(corr.afterSmall - corr.base) < 1, '小誤差（0.3 格）不會把角色硬拉走', corr);
  ok(corr.errSmall > 5, '小誤差記成 erX 慢慢吸收', corr);
  ok(Math.abs(corr.afterBig - corr.bigWant) < 1, '大誤差（3 格，被炸飛／重生）直接對齊', corr);

  // ================= 4. 別人的角色：10Hz → 連續 =================
  console.log('[4] 別人的角色用快照插值（不再一格一格跳）');
  const lerp = await page.eval(`(function(){
    var G = __BH.Game, Net = __BH.Net, T = G.T;
    Net.mySlot = 0;
    var rows = [];
    for (var y = 0; y < 13; y++) {
      var r = '';
      for (var x = 0; x < 15; x++) r += (x === 0 || y === 0 || x === 14 || y === 12) ? '1' : '0';
      rows.push(r);
    }
    function snap(x1){ return { T: T, c: 15, r: 13, th: 0, g: rows, hz: [], tm: 60, st: 'play', sd: 0,
      pl: [['g1', 0]], tt: 0,
      p: [[3*T, 3*T, 0, 1, 0, 0, 0, 0, 0, 'G', 0, -1], [x1, 6*T, 0, 1, 0, 0, 0, 0, 0, 'B', 0, -1]],
      b: [], f: [], it: [], bb: [], ov: null, bn: '' }; }
    __BH.applySnap(snap(6*T));
    var other = G.players[1];
    var xs = [other.x];
    for (var i = 0; i < 6; i++) { __BH.Net.guestTick(1/60); xs.push(other.x); }
    __BH.applySnap(snap(6*T + 14.6));       // 下一張快照（10Hz 前進 14.6px）
    for (var k = 0; k < 6; k++) { __BH.Net.guestTick(1/60); xs.push(other.x); }
    var d = [];
    for (var j = 1; j < xs.length; j++) d.push(+(xs[j] - xs[j-1]).toFixed(2));
    return d;
  })()`);
  const noJump = lerp.every(v => Math.abs(v) < 6);
  const total = lerp.reduce((a, b) => a + b, 0);
  ok(noJump, '別人的位移沒有單幀大跳（< 6px）', lerp);
  ok(Math.abs(total - 14.6) < 1.5, '兩張快照之間總共走了 14.6px（跟房主一致）', +total.toFixed(1));

  // ================= 5. 小怪碰撞判定跟著身體 =================
  console.log('[5] 小怪碰到人的判定 = 身體大小');
  const hit = await page.eval(`(function(){
    var G = __BH.Game, out = {};
    [62, 54, 35].forEach(function(T){
      G.T = T;
      var e = { r: 14, spec: 'slime' };
      out[T] = { art: +__BH.enemyArtR(e).toFixed(1), hit: +__BH.foeTouchR(e).toFixed(1),
                 old: 14 + 12 };
    });
    return out;
  })()`);
  ok(Math.abs(hit['62'].hit - 26) <= 3, '電腦（T=62）判定跟舊版幾乎一樣（≈26px）', hit['62']);
  ok(hit['35'].hit <= 17 && hit['35'].hit >= 10, '手機（T=35）判定跟著縮到 ≈14px（舊版 26px）', hit['35']);
  ok(hit['62'].hit < hit['62'].art && hit['35'].hit < hit['35'].art, '判定半徑小於身體半徑（不會沒碰到就死）', hit);
  const scale = hit['35'].hit / hit['62'].hit;
  ok(scale < .65, '判定隨格子等比例縮小（35/62 時只剩一半多）', +scale.toFixed(2));

  // ================= 6. 隨機地圖牆量 =================
  console.log('[6] 隨機地圖：硬牆／軟牆一起變多');
  const dens = await page.eval(`(function(){
    var out = [];
    for (var n = 1; n <= 5; n++) {
      __BH.startMapTest(n);
      var G = __BH.Game, hard = 0, soft = 0, floor = 0, total = 0;
      for (var y = 1; y < G.rows - 1; y++) for (var x = 1; x < G.cols - 1; x++) {
        total++;
        var v = G.grid[y][x];
        if (v === 1) hard++; else if (v === 2) soft++; else floor++;
      }
      // 走不到的格子（用出生點 flood fill）
      var reach = __BH.bfsReach(G.grid, G.cols, G.rows, G.spawnCell.x, G.spawnCell.y);
      var dead = 0;
      for (var y2 = 1; y2 < G.rows - 1; y2++) for (var x2 = 1; x2 < G.cols - 1; x2++) {
        if (G.grid[y2][x2] !== 1 && !reach[y2][x2]) dead++;
      }
      var walk = soft + floor;
      out.push({ n: n, cols: G.cols, rows: G.rows, hardPct: +(hard/total*100).toFixed(1),
        softPct: +(soft/total*100).toFixed(1), softOfWalk: +(soft/walk*100).toFixed(1), dead: dead });
    }
    return out;
  })()`);
  dens.forEach(function (d) {
    ok(d.softOfWalk >= 34, d.n + ' 號圖：軟磚佔可走格 ' + d.softOfWalk + '%（舊版 27~38%，平均 +7 個百分點）', d);
    ok(d.hardPct >= 51, d.n + ' 號圖：硬牆 ' + d.hardPct + '%（舊版 51% 起）', d);
    ok(d.dead === 0, d.n + ' 號圖：沒有走不到的死格', d);
  });

  await page.shot(path.join(__dirname, '_v466/final.png'));
  console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  br.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
