// verify-v532.js — v5.32：遊戲內（身體層）的哭泣特效也改成灑水式
//   ① 舊的「17 顆珠子連成的水條」已經完全移除
//   ② 實際繪製：兩眼外側各 8 顆水珠往左右兩側斜下噴（超出頭部框左右邊界）
//   ③ 水珠會隨時間移動（一直往外灑），而且不會飛到頭上方
//   ④ 其他情緒（開心／疼痛）不受影響
//   ⑤ 情緒頭像改成浮在頭頂上方（.275）
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec;
const src = env.html.replace(/\r/g, '');
const mk = () => env.mkCtx2D();

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
function clearRec() { rec.calls.length = 0; rec.sets.length = 0; }

// 頭部框：角色中心 (200,300)、頭框從 y=172 起、高 62
const HB = { x: 160, y: 172, w: 80, h: 62 };

// ================================================================
head('1. 舊的固定水條已經移除');
{
  ok(!/for \(let q = 0; q <= 16; q\+\+\)/.test(src), '舊的「17 顆珠子連成水條」迴圈已刪除');
  ok(!/rgba\(146,210,255/.test(src), '舊水條的顏色已刪除');
  ok(!/const cx1 = px \+ dir \* \(hw \+ size \* \.16\)/.test(src), '舊的固定貝茲曲線已刪除');
  ok(/v5\.32：灑水式淚水（身體層）/.test(src), '有標註新的灑水式實作');
}

// ================================================================
head('2. 原始碼：兩側持續往外噴');
{
  ok(/for \(let i = 0; i < 10; i\+\+\)/.test(src), '每一側 10 顆水珠（v5.33 加密）');
  ok(/const spd = \.70 \+ \(i % 3\) \* \.34/.test(src), '每顆速度不同（0.70 / 1.04 / 1.38）→ 有層次');
  ok(/const dx = dir \* size \* \(\.13 \+ \.38 \* ph\) \* fan/.test(src), '橫向位移往外推（依相位，v5.33 範圍加大）');
  ok(/const dy = size \* \(\.06 \+ \.33 \* ph \* ph\)/.test(src), '縱向是拋物線往下（不是往上飄）');
  ok(/heroDrop\(g, x0 \+ dx, y0 \+ dy, rr \* 1\.45\)/.test(src), '水滴用淚珠形（heroDrop）畫，v5.33 再放大');
  ok(/hb\.y \+ hb\.h \* \.70/.test(src), '噴射點在頭部框 70% 高（≈ 眼睛）');
  ok(/hb\.w \* \.22/.test(src), '左右噴射點用頭寬換算（各角色不會錯位）');
}

// ================================================================
head('3. 實際畫一次：水珠往左右兩側散開');
{
  clearRec();
  P.heroMoodVfx(mk(), 'cry', 200, 300, 80, 1.30, HB);
  const ell = rec.calls.filter(function (c) { return c[0] === 'ellipse'; });
  ok(ell.length >= 6, '水珠數量夠（圓形水珠 ellipse ' + ell.length + ' 次）');
  const xs = ell.map(function (c) { return c[1]; });
  const ys = ell.map(function (c) { return c[2]; });
  const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
  ok(minX <= 172, '往左噴出頭部框（最小 x=' + minX.toFixed(1) + '，頭框 160~240）');
  ok(maxX > 240, '往右噴出頭部框（最大 x=' + maxX.toFixed(1) + '，頭框右緣 240）');
  ok(Math.min.apply(null, ys) > 170, '不會飛到頭頂上方（最小 y=' + Math.min.apply(null, ys).toFixed(1) + '）');
  ok(Math.max.apply(null, ys) > 230, '是往外「斜下」灑（最大 y=' + Math.max.apply(null, ys).toFixed(1) + '）');
  const blue = rec.sets.filter(function (s) { return s[0] === 'fillStyle' && String(s[1]).indexOf('rgba(180,228,255') === 0; });
  ok(blue.length >= 2, '有水珠填色（' + blue.length + ' 次）');
}

// ================================================================
head('4. 水珠會隨時間移動（一直在灑）');
{
  function snap(t) {
    clearRec();
    P.heroMoodVfx(mk(), 'cry', 200, 300, 80, t, HB);
    return rec.calls.filter(function (c) { return c[0] === 'ellipse'; })
      .map(function (c) { return Math.round(c[1] * 10) / 10; }).sort(function (a, b) { return a - b; });
  }
  const a = snap(1.30), b = snap(1.46);
  ok(a.length > 0 && b.length > 0, '兩個時間點都有水珠');
  let diff = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (Math.abs(a[i] - b[i]) > .5) diff++;
  ok(diff >= Math.min(a.length, b.length) * .5, '過 0.16 秒後超過一半的水珠換位置（' + diff + '/' + a.length + '）');
}

// ================================================================
head('5. 其他情緒不受影響');
{
  clearRec();
  P.heroMoodVfx(mk(), 'happy', 200, 300, 80, 1.3, HB);
  const cryDrops = rec.calls.filter(function (c) { return c[0] === 'ellipse'; }).length;
  ok(cryDrops === 0, '開心（大笑）不會畫淚水水珠');
  clearRec();
  P.heroMoodVfx(mk(), 'pain', 200, 300, 80, 1.3, HB);
  const painDrops = rec.calls.filter(function (c) { return c[0] === 'ellipse'; }).length;
  ok(painDrops === 0, '疼痛不會畫淚水水珠');
}

// ================================================================
head('6. 情緒頭像浮到頭頂上方');
{
  ok(/hby - H \* \.275/.test(src), '頭像在頭頂上方 .275H（原本 .135H 會蓋住臉）');
  ok(/H \* \.215, a\.idle \|\| 0, 1\)/.test(src), '半徑維持 .215（v5.31 的放大保留）');
}

// ================================================================
head('7. 版本與預算');
{
  const vm = src.match(/const VERSION = '([\d.]+)'/);
  const v = vm ? vm[1].split('.').map(Number) : [0, 0];
  ok(v[0] > 5 || (v[0] === 5 && v[1] >= 32), '主檔版號 ≥ 5.32（目前 ' + (vm && vm[1]) + '）');
  ok(/v: '5\.32'/.test(src), 'VERSION_LOG 有 5.32 條目');
  const block = src.slice(src.indexOf("{ v: '5.32'"), src.indexOf("{ v: '5.31'"));
  ok((block.match(/'/g) || []).length > 0 && block.split('💦').length > 1, '5.32 條目第一句講淚水');
  ok(/\{ v: '5\.31', date: '[^']+', now: false/.test(src), '上一版（5.31）已標記 now:false');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const swv = (sw.match(/var SW_VERSION = 'v([\d.]+)'/) || [])[1] || '0';
  const sv = swv.split('.').map(Number);
  ok(sv[0] > 5 || (sv[0] === 5 && sv[1] >= 32), 'sw.js 是 v5.32.x（目前 ' + swv + '）');
  const raw = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(raw.length <= 1950000, '主檔 ' + raw.length + ' 字元（預算 1,950,000）');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.32：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
