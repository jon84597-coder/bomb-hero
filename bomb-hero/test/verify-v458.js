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
head('3. 三種剪影型軟牆（沙／天空／水）—— v5.25 起改用滿版立體塊');
{
  // 舊版是把小物件（陶罐／雲朵／珊瑚）用 g.scale(K[0], K[0]*K[1]) 硬拉大到滿版：
  //   1.25~1.6 倍的放大讓邊緣糊掉，而且四角一定還留著一圈地板 —— 那一圈就是
  //   「軟牆腳下沒有陰影」的來源。v5.25 改成跟硬牆同一套 aBlock（接縫＋厚度面＋
  //   頂面亮邊＋底部 AO），剪影畫在方塊裡面：形狀一樣認得出來，但腳下不再有地板。
  ok(!/const K = st === 'sand'/.test(src), '舊的放大參數 K 已經移除（不再硬拉小物件）');
  const i0 = src.indexOf('function paintSoftTile');
  const softFn = i0 < 0 ? '' : src.slice(i0, src.indexOf('function paintFloorTile', i0));
  ok(softFn.length > 4000, '找得到新版 paintSoftTile（' + softFn.length + ' 字元）');
  ok(/g\.fillRect\(0, 0, S, S\)/.test(softFn), '三種都是滿版：先鋪滿整格底色（腳下沒有地板）');
  ['sand', 'sky', 'sea'].forEach(function (st) {
    ok(new RegExp("else if \\(st === '" + st + "'\\) \\{").test(softFn), st + ' 仍有專屬剪影（不是換顏色而已）');
  });
  ok(/aBlock\(g, m, m, S - m \* 2, S - m \* 2, r0, c, \.[\d]+\)/.test(softFn), '三種都走 aBlock（立體感與硬牆一致）');
}

// ================================================================
head('4. 實跑：三種軟牆都是滿版，而且 save/restore 對稱');
{
  ['sand', 'sky', 'sea'].forEach(function (st) {
    rec.calls.length = 0;
    const g = env.mkCtx2D();               // 沙盒的 canvas mock
    P.paintSoftTile(g, st, 128, 7, false, 0);
    const names = rec.calls.map(function (c) { return c[0]; });
    const fr = rec.calls.filter(function (c) { return c[0] === 'fillRect'; })[0];
    ok(!!fr && fr[1] === 0 && fr[2] === 0 && fr[3] === 128 && fr[4] === 128,
      st + '：鋪滿整格（fillRect 0 0 128 128）—— 腳下沒有地板');
    ok(names.indexOf('clearRect') >= 0, st + '：開頭有擦乾淨');
    const saves = names.filter(function (n) { return n === 'save'; }).length;
    const rests = names.filter(function (n) { return n === 'restore'; }).length;
    ok(saves === rests, st + '：save/restore 對稱（' + saves + '/' + rests + '，多一個就會污染後面的繪製）');
  });
}

// ================================================================
head('5. 八個主題都是同一套結構（滿版 + 不再硬拉放大）');
{
  ['forest', 'sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark'].forEach(function (st) {
    rec.calls.length = 0;
    const g = env.mkCtx2D();
    P.paintSoftTile(g, st, 128, 7, false, 0);
    const scs = rec.calls.filter(function (c) { return c[0] === 'scale'; }).length;
    const fr = rec.calls.filter(function (c) { return c[0] === 'fillRect'; })[0];
    ok(scs === 0, st + '：沒有用 scale 硬拉（放大會讓邊緣糊掉）');
    ok(!!fr && fr[1] === 0 && fr[2] === 0, st + '：滿版（從 0,0 開始鋪）');
  });
}

console.log('\n----------------------------------------');
console.log('v4.58：' + pass + ' 項通過、' + fail + ' 項失敗');
process.exit(fail ? 1 : 0);
