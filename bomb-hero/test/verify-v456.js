// verify-v456.js — v4.56 專屬驗證：外牆是「每大關自己一套貼圖」，而且與場內硬牆同尺寸
//   ① OUTER_DECO：八個主題各一組，風化細節不重複
//   ② outerMat：顏色一定由該關 THEMES.out 推出來（不會跨關共用）
//   ③ artSet 有 outer 圖組（4 變體），_artBake 受理 'outer'
//   ④ 尺寸：外牆不再往外擴，跟硬牆一樣是 T×T
//   ⑤ 牆頂冠部：只有「上面不是外牆」的那一排才畫
//   ⑥ 硬牆仍然走 drawStone（兩套材質沒有互相污染）
const fs = require('fs');
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const src = html.replace(/\r/g, '');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

function soloStage(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.startSolo(stage || 1, false);
  G.state = 'play';
  P.markWallKinds();
  return G.players[0];
}

// ================================================================
head('1. OUTER_DECO：八個大關各一組風化細節，不重複');
{
  const block = (src.match(/const OUTER_DECO = \{[\s\S]*?\n\};/) || [''])[0];
  ok(!!block, '有 OUTER_DECO 表');
  const styles = P.THEMES.map(function (t) { return t.style; });
  const keys = (block.match(/^\s{2}(\w+):/gm) || []).map(function (s) { return s.trim().replace(':', ''); });
  ok(keys.length === 8, '八個主題都有外牆細節設定（' + keys.length + '）');
  ok(styles.every(function (s) { return keys.indexOf(s) >= 0; }), '八個 style 全部對得上：' + keys.join(','));
  ok(keys.every(function (k) {
    const row = (block.match(new RegExp('\\n\\s{2}' + k + ':[^\\n]*')) || [''])[0];
    return (row.match(/rgba?\(/g) || []).length >= 3;
  }), '每一組都有自己的帽子色 + 兩種斑點色');
  // 風化「手法」不能八關都一樣：把每個主題的旗標抓出來比對
  const sig = keys.map(function (k) {
    const row = (block.match(new RegExp('\\n\\s{2}' + k + ':[^\\n]*')) || [''])[0];
    return (row.match(/\b(moss|dust|icic|glow|strip|trim|spike)\b/g) || []).join('+') || 'plain';
  });
  ok(sig.filter(function (s, i) { return sig.indexOf(s) === i; }).length >= 7,
    '至少 7 種不同的風化手法：' + sig.join(' / '));
}

// ================================================================
head('2. outerMat：顏色一律由該關 THEMES.out 推出來（不跨關共用）');
{
  ok(/function outerMat\(/.test(src), '有 outerMat()');
  ok(/arr\[0\]\.out \|\| arr\[0\]\.hard/.test(src), 'outerMat 從 THEMES 找該 style 的 out 色（找不到才退回 hard）');
  ok(/face2: shadeHex\(b, lit\)/.test(src), '主面直接用該關外牆色（face2 = out，只調明度）');
  const outs = P.THEMES.map(function (t) { return t.out; });
  ok(outs.filter(function (c, i) { return outs.indexOf(c) === i; }).length === 8, '八關的外牆色互不相同（沒有共用色）');
  // 每個 style 都要能從 THEMES 找到自己那一筆，不能兩個 style 撞同一組色
  const byStyle = {};
  P.THEMES.forEach(function (t) { byStyle[t.style] = t.out; });
  ok(Object.keys(byStyle).length === 8, '八個 style 各自拿到自己的 out 色');
}

// ================================================================
head('3. 烘焙：artSet 有 outer 圖組，_artBake 受理 outer');
{
  ok(/outer: \[\]/.test(src), 'artSet 初始化有 outer: []');
  ok(/s\.outer\.push\(_artBake\('outer', st, i\)\)/.test(src), '每個主題都會烘 outer 的 4 個變體');
  ok(/kind === 'outer'\) paintOuterTile\(/.test(src), '_artBake 把 outer 交給 paintOuterTile');
  ok(/kind === 'outer' \? 53 : 13/.test(src), 'outer 有自己的亂數種子（不會跟地板同一組變體）');
  ok(/const ART_VARIANTS = 4;/.test(src), 'ART_VARIANTS = 4（跟硬牆同一組變體數）');
  ok(/function paintOuterTile\(/.test(src), '有 paintOuterTile()');
  ok(/const R = d\.rows \|\| 3, RW = 100 \/ \(d\.cols \|\| 2\.5\)/.test(src), '石塊列數/顆數吃每關參數（每關造型不同）');
  const shapes = (src.match(/rows: \d, cols: [\d.]+, rr: [\d.]+/g) || []);
  ok(shapes.length === 8, '八個大關都有自己的石塊造型（' + shapes.length + '）');
  ok(shapes.filter(function (v, i) { return shapes.indexOf(v) === i; }).length >= 6, '造型至少 6 種不同組合');
  ok(/\+ \.9 \* u/.test(src) && /rw - 1\.8 \* u/.test(src), '石縫與格子邊界等寬（不會出現磁磚接縫）');
}

// ================================================================
head('4. 尺寸：外牆不再往外擴，跟場內硬牆一樣是 T×T');
{
  ok(!/const e = T \* \.10;/.test(src), 'v4.55 的「往外擴 10%」已移除');
  ok(!/T \+ e \* 2/.test(src), '沒有把格子放大成 T+2e');
  ok(/artBlit\(artSet\(artStyle\(\)\)\.outer, seed, px, py, T\)/.test(src), '外牆貼圖就貼在 px,py 的 T×T 格子裡（與硬牆同尺寸）');
  ok(/if \(!artBlit\(/.test(src) && /ctx\.fillRect\(px, py, T, T\)/.test(src), '貼圖沒了就退回純色，仍是 T×T');
}

// ================================================================
head('5. 牆頂冠部：只畫在「上面不是外牆」的那一排');
{
  const n = (src.match(/if \(!isOut\(gx, gy - 1\)\)/g) || []).length;
  ok(n === 2, '上緣判斷出現 2 次（冠部 + 冠下暗線）：' + n);
  ok(/const b = Math\.max\(2, T \* \.07\), cap = T \* \.18;/.test(src), '冠部厚度 = 格子 18%');
  ok(/mixHex\(base, '#ffffff', \.46\)/.test(src), '冠部是該關外牆色打亮（不是固定的沙金）');
}

// ================================================================
head('6. 兩套材質沒有互相污染');
{
  ok(/wk === 1\) drawOuterWall/.test(src), '外牆格 → drawOuterWall');
  ok(/\) drawStone\(cxp, cyp, T, thc\.hard/.test(src), '硬牆島 → drawStone（吃 th.hard／thc.hard，沒被換掉）');
  ok(/paintHardTile\(g, st, ART_RES, seed, vi\)/.test(src), '硬牆貼圖照舊用 paintHardTile');
  // 執行時：每個大關都真的有外牆格，而且硬牆分類還在
  let bad = [];
  for (let st = 1; st <= 32; st += 4) {
    soloStage(st);
    const k = G.wallKind || [];
    let outer = 0;
    for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) if (k[y] && k[y][x] === 1) outer++;
    if (outer < 20) bad.push(st + ':' + outer);
  }
  ok(bad.length === 0, '八個大關的外牆格都還在（沒有因為改材質而消失）' + (bad.length ? '：' + bad.join(',') : ''));
}

console.log('\n========================================');
console.log('v4.56 外牆專屬素材：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
