// v4.40 三項需求：
//   1. 道具底圖改「淺色半透明」（原本近黑底，暗底吃掉圖示辨識度）
//   2. 五種藏人場景物件（灌木叢／破木屋／石堆／陶甕／木箱堆），比一格大一點
//   3. 小怪吐彈：先集氣（全身抖動＋聚氣球＋大落點預告）再射，飛行速度砍半
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec;
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let pass = 0, fail = 0;
function ok(c, msg, extra) {
  if (c) { pass++; console.log('  ✓ ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
}
function rgbaOf(v) {
  const m = String(v).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const a = m[1].split(',').map(function (x) { return parseFloat(x); });
  return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 };
}

P.settings.size = 'M'; P.settings.hazards = 'on'; P.settings.ctrl = 'kb';
P.startSolo(1, false); G.state = 'play';
const T = G.T, me = G.players[0];

// ==================================================================
console.log('=== 1. 道具底圖：淺色半透明，不要黑底 ===');
{
  const T2 = 46;
  const fake = env.fakeImg(160, 160);
  rec.calls.length = 0; rec.sets.length = 0;
  P.drawItemBadge(200, 200, T2, 'fire', fake, .5);

  // 底色在原始碼裡是漸層（rec 抓不到顏色）→ 直接抓出 drawItemBadge 的本體來驗
  const i0 = src.indexOf('function drawItemBadge(');
  const body = src.slice(i0, src.indexOf('const FoeArt = (function', i0));
  ok(body.length > 400, '抓得到 drawItemBadge 本體', body.length + ' 字元');

  // 只看「不透明的深色」—— rgba(0,0,0,0) 是外光暈的透明端點，不算
  const darkTones = ['rgba(46,60,92', 'rgba(18,26,44', 'rgba(7,11,20', '#0b0f18', '#121a2c'];
  const codeOnly = body.split('\n').filter(function (ln) { return !/^\s*\/\//.test(ln); }).join('\n');
  ok(darkTones.every(function (t) { return codeOnly.indexOf(t) < 0; }),
    '沒有任何近黑底色（舊版 rgba(7,11,20,.98) 已移除）');

  const stopLines = body.split('\n').filter(function (ln) { return /rg\.addColorStop/.test(ln); });
  const fillStops = stopLines.slice(0, 3).map(function (ln) {
    const m = ln.match(/rgba?\(([^)]*)\)/);
    if (!m) return null;
    const a = m[1].split(',').map(function (x) { return parseFloat(x); });
    return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 };
  }).filter(Boolean);
  ok(fillStops.length === 3, '底色是漸層（三段）', fillStops.length);
  ok(fillStops.every(function (c) { return c.a > 0 && c.a <= .6; }),
    '底色三段 alpha 都 ≤ .60（半透明，透得過去）',
    fillStops.map(function (c) { return c.a; }).join(' / '));
  ok(fillStops.every(function (c) { return (c.r + c.g + c.b) / 3 > 200; }),
    '底色三段都是淺色（RGB 平均 > 200 / 255）',
    fillStops.map(function (c) { return Math.round((c.r + c.g + c.b) / 3); }).join(' / '));

  // 淺底 + 淺色圖示 → 靠投影托出輪廓
  const shadow = rec.sets.filter(function (s2) { return s2[0] === 'shadowColor'; });
  const sc = shadow.length ? rgbaOf(shadow[shadow.length - 1][1]) : null;
  ok(!!sc && sc.a > .2 && (sc.r + sc.g + sc.b) < 200, '圖示有深色柔和投影（淺色 ICON 才不會糊在淺底上）',
    sc ? 'rgba(' + sc.r + ',' + sc.g + ',' + sc.b + ',' + sc.a + ')' : 'none');
  ok(rec.calls.some(function (c) { return c[0] === 'drawImage'; }), '圖示照樣畫出來');
}

// ==================================================================
console.log('\n=== 2. 五種藏人場景物件 ===');
{
  const keys = Object.keys(P.HIDE_ART || {});
  ok(keys.length === 5, '有五組貼圖', keys.join(','));
  ['bush', 'hut', 'rock', 'jar', 'crate'].forEach(function (k) {
    const m = P.HIDE_ART[k];
    ok(!!m && /^data:image\/webp;base64,/.test(m.u), k + ' 是 webp data URI');
    ok(!!m && m.w > 0 && m.h > 0 && m.asp > 0, k + ' 記了尺寸與長寬比（' + (m ? m.w + 'x' + m.h : '-') + '）');
  });
  ok(typeof P.HideArt === 'object' && typeof P.HideArt.get === 'function', '有 HideArt 載入器');
  ok(P.HIDE_KINDS.length === 5, 'HIDE_KINDS 五種');

  // 每一種都要真的出現在至少一個主題裡
  const used = {};
  P.HIDE_THEME_POOL.forEach(function (pool) { pool.forEach(function (k) { used[k] = 1; }); });
  ok(P.HIDE_THEME_POOL.length === 8, '八大關卡都有自己的組合');
  ok(P.HIDE_KINDS.every(function (k) { return used[k]; }), '五種都至少出現在一個關卡（不會有廢圖）',
    Object.keys(used).join(','));
  ok(P.HIDE_THEME_POOL.every(function (pool) {
    return pool.every(function (k) { return P.HIDE_KINDS.indexOf(k) >= 0; });
  }), '主題組合裡沒有亂寫的類型');

  // 躲點類型真的照主題挑（不是永遠 bush）
  const kindsSeen = {};
  for (let th = 0; th < 8; th++) {
    G.theme = P.THEMES[th];
    const pool = P.hidePool();
    ok(pool.length >= 3, '第 ' + (th + 1) + ' 關的躲避點組合有 ' + pool.length + ' 種（' + pool.join('/') + '）');
  }
  for (let th = 0; th < 8; th++) {
    G.theme = P.THEMES[th];
    for (let i = 0; i < 6; i++) {
      P.startSolo(th * 4 + 1, false);
      G.state = 'play';
      for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) {
        const hz = G.hazards[y] && G.hazards[y][x];
        if (hz && hz.type === 'hide') kindsSeen[hz.kind] = 1;
      }
    }
  }
  G.theme = P.THEMES[0];
  ok(Object.keys(kindsSeen).length >= 4, '實際生成時會出現多種物件（' + Object.keys(kindsSeen).join(',') + '）');

  // 畫出來的尺寸：比一格大一點、比較高的往「上」長（底部對齊格子下緣）
  const realGet = P.HideArt.get;
  const T2 = 46;
  P.HideArt.get = function (k) { return k === 'jar' ? env.fakeImg(161, 176) : null; };
  rec.calls.length = 0; rec.sets.length = 0;
  P.drawHideTile(100, 100, T2, 1, 'jar', 7);
  const di = rec.calls.filter(function (c) { return c[0] === 'drawImage'; });
  ok(di.length === 1, '有貼圖就畫貼圖', di.length);
  if (di.length) {
    const w = di[0][4], h = di[0][5], dy = di[0][3];   // drawImage(img, dx, dy, dw, dh)
    ok(w <= T2 * 1.141 && w >= T2 * 1.05, '寬只比一格多一點點（1.05～1.14 格）', (w / T2).toFixed(2) + ' 格');
    ok(h <= T2 * 1.10 + .01, '高不超過 1.10 格（不會蓋掉上面那一格）', (h / T2).toFixed(2) + ' 格');
    ok(Math.abs(dy + h - (100 + T2 * .93)) < .01, '底部對齊格子下緣（站在地上，不是浮空）',
      (dy + h).toFixed(1) + ' vs ' + (100 + T2 * .93).toFixed(1));
  }
  ok(src.indexOf('const HIDE_ART_SCALE = 1.14;') >= 0, '尺寸是常數（1.14 格）');

  // 沒圖時要退回向量畫法（不會開天窗）
  P.HideArt.get = function () { return null; };
  let err = null;
  try {
    rec.calls.length = 0;
    P.drawHideTile(100, 100, T2, 1, 'bush', 3);
    P.drawHideTile(100, 100, T2, 1, 'hut', 3);
    P.drawHideTile(100, 100, T2, 1, 'rock', 3);   // 沒圖也不是舊兩種 → 用灌木代替
  } catch (e) { err = e; }
  ok(!err, '貼圖沒載入時退回原本的向量畫法', err && err.message);
  ok(rec.calls.some(function (c) { return c[0] === 'arc' || c[0] === 'fillRect'; }), '退回時真的畫了東西');
  P.HideArt.get = realGet;
}

// ==================================================================
console.log('\n=== 3. 小怪吐彈：先集氣再射、飛行速度砍半 ===');
{
  ok(Math.abs(P.BOLT_TRAVEL - 1.1) < 1e-6, '飛行時間 = ' + P.BOLT_TRAVEL + 's（原本 .55 → 慢一半）');
  ok(Math.abs(P.BOLT_TRAVEL - .55 * 2) < 1e-6, '剛好是原本的兩倍時間');
  ok(P.FOE_CAST_WINDUP >= .7, '集氣時間 ' + P.FOE_CAST_WINDUP + 's（玩家有時間反應）');

  P.startSolo(1, false); G.state = 'play';
  G.enemies.length = 0; G.bolts = []; G.bombs.length = 0;
  // 找一格空地放怪，玩家站 2 格遠
  let sx = 3, sy = 3;
  for (let y = 2; y < G.rows - 2 && sx === 3; y++) for (let x = 2; x < G.cols - 3; x++) {
    if (G.grid[y][x] === 0 && G.grid[y][x + 1] === 0 && G.grid[y][x + 2] === 0) { sx = x; sy = y; break; }
  }
  const fr = P.makeEnemy(sx, sy, 'frog', 1, 1);
  fr.aggro = true; fr.skCd = 0;
  G.enemies.push(fr);
  // startSolo 會重建 players 陣列 → 一定要重新取，不然會操作到上一場的舊物件
  const me2 = G.players[0];
  me2.x = (sx + 2) * T + T / 2; me2.y = sy * T + T / 2; me2.alive = true; me2.invuln = 0;

  P.enemySkillTick(fr, 1 / 60);
  ok(G.bolts.length === 0 && fr.castT > 0, '第一帧只是「開始集氣」，沒有馬上射出', G.bolts.length);
  ok(fr.castX === sx + 2 && fr.castY === sy, '集氣一開始就鎖定玩家那一格（' + fr.castX + ',' + fr.castY + '）');

  // 集氣全程：釘在原地、不能走
  const px0 = fr.x, py0 = fr.y;
  let moved = 0;
  for (let i = 0; i < 40; i++) {
    P.updateEnemy(fr, 1 / 60);
    moved = Math.max(moved, Math.abs(fr.x - px0) + Math.abs(fr.y - py0));
  }
  ok(fr.castT > 0, '0.67 秒時還在集氣（castT=' + fr.castT.toFixed(2) + '）');
  ok(moved < .01, '集氣中釘在原地（不會邊跑邊集氣，玩家看得懂）', moved.toFixed(2) + 'px');
  ok(G.bolts.length === 0, '這段時間一顆彈都沒射出來', G.bolts.length);

  // 集氣完 → 射出去
  for (let i = 0; i < 80 && G.bolts.length === 0; i++) P.updateEnemy(fr, 1 / 60);
  ok(G.bolts.length === 1, '集氣結束才射出', G.bolts.length);
  const b = G.bolts[0];
  ok(b && Math.abs(b.dur - P.BOLT_TRAVEL) < 1e-6, '彈體飛行 ' + (b ? b.dur : '-') + 's');
  ok(b && b.cx === Math.floor(me2.x / T) && b.cy === Math.floor(me2.y / T), '打的是玩家站的那一格');
  ok(fr.castT === 0, '射完集氣計時歸零');
  ok(fr.skCd > 0, '射完進入冷卻（' + fr.skCd.toFixed(1) + 's）');

  // 飛行速度：慢到玩家走得出落點
  const T2 = G.T;
  const walk = Math.round(P.playerSpeed(me2) * P.BOLT_TRAVEL);
  ok(walk > T2 * 2, BOLT_MSG(walk, T2));
  function BOLT_MSG(w, t) { return '彈體飛 ' + P.BOLT_TRAVEL + ' 秒期間玩家能走 ' + w + 'px（' + (w / t).toFixed(1) + ' 格）→ 躲得掉'; }

  // 落點預告要「很大、很明顯」
  G.bolts.length = 0;
  fr.castT = P.FOE_CAST_WINDUP * .9;   // k ≈ .1
  fr.castX = Math.floor(me.x / T); fr.castY = Math.floor(me.y / T);
  rec.calls.length = 0; rec.sets.length = 0;
  let err = null;
  try { P.drawFoeCastGround(T2); P.drawFoeCastFx(T2); } catch (e) { err = e; }
  ok(!err, '集氣特效繪製不拋錯', err && err.message);
  const arcs = rec.calls.filter(function (c) { return c[0] === 'arc'; });
  const big = arcs.reduce(function (m, a) { return Math.max(m, a[3]); }, 0);
  ok(big >= T2 * 1.2, '地面預告圈半徑 ≥ 1.2 格（很大，一眼看到）', (big / T2).toFixed(2) + ' 格');
  ok(rec.calls.some(function (c) { return c[0] === 'setLineDash'; }), '有從怪物連到落點的瞄準虛線');
  const di = rec.calls.filter(function (c) { return c[0] === 'arc'; }).length;
  ok(di >= 4, '聚氣球＋粒子都畫出來了', di + ' 個圓');

  // 全身抖動：固定在同一個 gameT 下，集氣 vs 不集氣 畫出來的位置要不一樣
  function firstArcX() {
    rec.calls.length = 0;
    P.drawEnemy(fr, T2);
    const a = rec.calls.filter(function (c) { return c[0] === 'arc'; })[0];
    return a ? a[1] : 0;
  }
  const castT0 = fr.castT;
  let dMax = 0;
  for (let i = 0; i < 24; i++) {
    G.gameT = i * .37;
    fr.castT = 0;
    const xIdle = firstArcX();
    fr.castT = P.FOE_CAST_WINDUP * .2;         // k = .8 → 抖最大
    const xShake = firstArcX();
    dMax = Math.max(dMax, Math.abs(xShake - xIdle));
  }
  ok(dMax > T2 * .02, '集氣中身體會抖（最大位移差 ' + dMax.toFixed(2) + 'px）');
  ok(dMax >= T2 * .03, '抖動幅度看得出來（' + (dMax / T2).toFixed(3) + ' 格 ≈ ' +
    (dMax * 2).toFixed(1) + 'px 的左右抖）');
  fr.castT = castT0;

  // 整體渲染不爆
  err = null;
  try { P.render(); } catch (e) { err = e; }
  ok(!err, '整場渲染不拋錯', err && err.message);

  // 飛行途中也要有大落點預告（射出去之後才看不到，等於沒有預告）
  ok(/const rr = T \* \(\.92 - k \* \.40\)/.test(src), '飛行途中落點圈半徑 ≈ 1.0 → 0.5 格（不會一射出就消失）');
  ok(/const R2 = T \* \(\.175/.test(src), '彈體放大到 0.175 格（原本 0.105）');
  ok(/for \(let j = 1; j <= 3; j\+\+\)/.test(src), '彈體有三段尾跡');
  ok(/\.95 \+ k \* \.42/.test(src), '集氣球不會大到把整隻小怪蓋住');

  // 常數有導出（給測試／除錯用）
  ok(typeof P.foeCastBolt === 'function' && typeof P.drawFoeCastFx === 'function', '新函式都有導出');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v4.40：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
