// verify-v458.js — v4.58 專屬驗證
//   ① 飛行小怪不會飛出外牆那一圈（否則火焰燒不到，玩家只能乾等）
//   ② 沙漠陶罐／天空雲朵／水中珊瑚三種剪影型軟牆放大到滿版一格
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec;
const src = html.replace(/\r/g, '');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ================================================================
head('1. 飛行小怪：不能飛到外牆那一圈');
{
  ok(/const m = T \* 1\.02 \+ \(e\.r \|\| T \* \.4\);/.test(src), '邊界改成「外牆內縮一格 ＋ 自身半徑」');
  ok(!/const m = T \* \.6;/.test(src), '舊的 0.6 格邊界已移除（那個值剛好落在外牆格中心）');
  ok(/if \(\(e\.x < m && e\.vx < 0\) \|\| \(e\.x > maxX && e\.vx > 0\)\) e\.vx = -e\.vx;/.test(src),
    '撞到邊界會反彈（不會貼著牆一直磨）');
}

// ================================================================
head('2. 實跑：飛行小怪始終留在可燃燒的格子上');
{
  P.startSolo(1, true);
  G.state = 'play';
  for (let i = 0; i < 40; i++) P.updateWorld(1 / 60);
  const T = G.T;
  const e = P.makeEnemy(T * 3.5, T * 3.5, 'bat', 1, 1);
  e.spdBoost = 1;
  let minGX = 99, maxGX = -1, minGY = 99, maxGY = -1, crossed = 0;
  // 往四個角猛飛，逼它撞邊界
  const dirs = [[-1, -.3], [1, .3], [-.3, -1], [.3, 1]];
  for (let d = 0; d < dirs.length; d++) {
    e.vx = dirs[d][0] * 240; e.vy = dirs[d][1] * 240;
    for (let i = 0; i < 400; i++) {
      e.turnT = 99;                       // 不讓它自己轉向，專心撞牆
      P.updateFlyer(e, 1 / 60);
      const gx = Math.floor(e.x / T), gy = Math.floor(e.y / T);
      if (gx < minGX) minGX = gx; if (gx > maxGX) maxGX = gx;
      if (gy < minGY) minGY = gy; if (gy > maxGY) maxGY = gy;
      if (gx < 1 || gx > G.cols - 2 || gy < 1 || gy > G.rows - 2) crossed++;
    }
  }
  ok(crossed === 0, '1600 幀內一次都沒跑進外牆那一圈（越界 ' + crossed + ' 次）');
  ok(minGX >= 1 && minGY >= 1, '左上界都在第 1 列之後（min 格 ' + minGX + ',' + minGY + '）');
  ok(maxGX <= G.cols - 2 && maxGY <= G.rows - 2,
    '右下界都在倒數第 2 列之前（max 格 ' + maxGX + ',' + maxGY + '，地圖 ' + G.cols + '×' + G.rows + '）');
}

// ================================================================
head('3. 三種剪影型軟牆：每關一組滿版參數');
{
  const K = (src.match(/const K = st === 'sand' \? (\[[^\]]+\]) : st === 'sky' \? (\[[^\]]+\]) : (\[[^\]]+\]);/) || []);
  ok(K.length === 4, '沙／天空／水各自一組參數');
  const num = function (s) { return (s.match(/[\d.]+/g) || []).map(Number); };
  const sand = num(K[1] || ''), sky = num(K[2] || ''), sea = num(K[3] || '');
  ok(sand[0] >= 1.4 && sky[0] >= 1.25 && sea[0] >= 1.25,
    '橫向放大倍率都 ≥1.25（沙 ' + sand[0] + '／空 ' + sky[0] + '／水 ' + sea[0] + '）');
  ok(sand[1] >= 1 && sky[1] >= 1 && sea[1] >= 1, '縱向額外拉伸都 ≥1（把上下留白吃掉）');
  ok(/g\.scale\(K\[0\], K\[0\] \* K\[1\]\)/.test(src), '橫向與縱向分開縮放（不是等比硬拉變形）');
  ok(/g\.translate\(-S \* \.5, -S \* K\[2\]\)/.test(src), '縮放錨點可調（內容偏下的珊瑚／雲才推得上去）');
}

// ================================================================
head('4. 實跑：三種軟牆都真的走了縮放，而且 save/restore 對稱');
{
  ['sand', 'sky', 'sea'].forEach(function (st) {
    rec.calls.length = 0;
    const g = env.mkCtx2D();               // 沙盒的 canvas mock
    P.paintSoftTile(g, st, 128, 7, false, 0);
    const names = rec.calls.map(function (c) { return c[0]; });
    const sc = rec.calls.filter(function (c) { return c[0] === 'scale'; });
    ok(sc.length >= 1, st + '：有放大（scale 呼叫 ' + sc.length + ' 次）');
    const kv = sc.length ? sc[0].slice(1) : [];
    ok(kv[0] >= 1.25, st + '：橫向倍率 ' + (kv[0] || 0).toFixed(2) + ' ≥ 1.25');
    const saves = names.filter(function (n) { return n === 'save'; }).length;
    const rests = names.filter(function (n) { return n === 'restore'; }).length;
    ok(saves === rests, st + '：save/restore 對稱（' + saves + '/' + rests + '，多一個就會污染後面的繪製）');
  });
}

// ================================================================
head('5. 沒有波及其他主題');
{
  ok(/if \(st === 'sand' \|\| st === 'sky' \|\| st === 'sea'\)/.test(src), '縮放只包住這三種（其餘方箱型維持原尺寸）');
  ['forest', 'ice', 'lava', 'neon', 'dark'].forEach(function (st) {
    rec.calls.length = 0;
    const g = env.mkCtx2D();
    P.paintSoftTile(g, st, 128, 7, false, 0);
    const scs = rec.calls.filter(function (c) { return c[0] === 'scale'; }).length;
    ok(scs === 0, st + ' 沒有被放大（scale 呼叫 ' + scs + ' 次）');
  });
}

console.log('\n----------------------------------------');
console.log('v4.58：' + pass + ' 項通過、' + fail + ' 項失敗');
process.exit(fail ? 1 : 0);
