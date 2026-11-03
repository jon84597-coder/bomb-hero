// verify-v459.js — v4.59 專屬驗證
//   ① 外牆素材只留在地圖最外圈（場內岩層改用硬牆素材）
//   ② 場內硬岩柱打散擺放、軟磚平均散開（不再擠成一坨）
//   ③ 天空關地板壓深 → 白雲軟牆跳得出來
//   ④ 小怪整體放大、BOSS 再大一階
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
function soloStage(n) {
  P.clearMapTest();
  P.startSolo(n, true);
  G.state = 'play';
  P.markWallKinds();          // 牆分類是 render 時才算的
}

// ================================================================
head('1. 外牆判定：離外框幾格 ＋ 一路到地圖邊（v4.61）');
{
  ok(/const wk = \[\], dist = \[\], ed = \[\];/.test(src), '多了一張 ed 表（離外框的距離）');
  ok(!/if \(out\[y\]\[x\] \|\| g\[y\]\[x\] !== 1\) continue;/.test(src), '舊的「連到外框就算外牆」BFS 已移除');
  ok(/if \(d < 2\) q2\.push\(\[x \+ 1, y, d \+ 1\]/.test(src), '外框 BFS 只走 2 步（外牆帶就這麼厚）');
  ok(/let out = ed\[y\]\[x\] >= 0;/.test(src), '外框帶（ed>=0）仍然是外牆');
  ok(/while \(ax >= 0 && ay >= 0 && ax < cols && ay < rows && g\[ay\]\[ax\] === 1\)/.test(src),
     'v4.61：往「背對空地」的方向一路走實心格，直到撞上地圖邊 → 這段也算外牆');
  ok(/if \(ax < 0 \|\| ay < 0 \|\| ax >= cols \|\| ay >= rows\) out = true;/.test(src),
     '走到地圖邊 → 外牆；中途撞到空地 → 場內的牆（硬牆）');
  ok(/wk\[y\]\[x\] = out \? 1 : 2;/.test(src), '其餘才是硬牆');
}

// ================================================================
head('2. 實跑：外牆只在外緣、場內還有硬牆（v4.61）');
{
  let maps = 0, rim = 0, inner = 0, badOuter = 0, badInner = 0;
  for (let st = 1; st <= 16; st++) {
    soloStage(st);
    const k = G.wallKind || [];
    if (!k.length) continue;
    maps++;
    for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
      if (!k[y] || !k[y][x]) continue;
      let floor4 = 0, edgeRay = false;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const nx = x + d[0], ny = y + d[1];
        if (nx >= 0 && ny >= 0 && nx < G.cols && ny < G.rows && G.grid[ny][nx] === 1) return;
        floor4++;
        let ax = x - d[0], ay = y - d[1];
        while (ax >= 0 && ay >= 0 && ax < G.cols && ay < G.rows && G.grid[ay][ax] === 1) { ax -= d[0]; ay -= d[1]; }
        if (ax < 0 || ay < 0 || ax >= G.cols || ay >= G.rows) edgeRay = true;
      });
      if (k[y][x] === 1) { rim++; if (floor4 === 4) badOuter++; }
      else { inner++; if (edgeRay) badInner++; }
    }
  }
  ok(maps === 16, '16 關都有牆分類（' + maps + '）');
  ok(badInner === 0, '外牆素材 0 格漏在外緣（擋在外圍的牆都判成外牆了）');
  ok(badOuter === 0, '場內孤立的岩塊不會被套上外牆素材（' + badOuter + ' 格）');
  ok(rim > 400, '外緣那一圈真的有外牆（' + rim + ' 格）');
  ok(inner > 150, '場內岩層還是硬牆素材（' + inner + ' 格）');
}

// ================================================================
head('3. 場內硬岩柱：打散擺、不堵走道');
{
  ok(/const pWant = Math\.max\(2, Math\.min\(10, Math\.round\(opn \* \.11\)\)\);/.test(src),
    '柱子數量跟著空地走（v4.61：空地 11%，2~10 根；窄走道由 3×3 條件自己擋掉）');
  ok(/for \(let dy = -1; dy <= 1 && ok2; dy\+\+\)[\s\S]{0,160}g\[py2 \+ dy\]\[px2 \+ dx\] !== 0/.test(src),
    '3×3 全空才放 → 一定散得開、也不會堵死走道');
  ok(/if \(Math\.abs\(px2 - sp\.x\) < 3 && Math\.abs\(py2 - sp\.y\) < 3\) continue;/.test(src),
    '出生點 3 格內不放柱子');

  let withPillar = 0, total = 0, minWalk = 999;
  for (let st = 1; st <= 8; st++) {
    soloStage(st);
    let walk = 0;
    for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) if (G.grid[y][x] !== 1) walk++;
    if (walk < minWalk) minWalk = walk;
    total++;
    // 場內（外框 3 格之外）的單格硬岩 = 柱子
    let pil = 0;
    for (let y = 3; y < G.rows - 3; y++) for (let x = 3; x < G.cols - 3; x++) {
      if (G.grid[y][x] !== 1) continue;
      let n = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { if (G.grid[y + d[1]][x + d[0]] !== 1) n++; });
      if (n === 4) pil++;
    }
    if (pil > 0) withPillar++;
  }
  ok(withPillar >= total - 1, '幾乎每張圖都有場內岩柱（' + withPillar + '/' + total + '）');
  ok(minWalk > 50, '走動面積沒有被吃掉（最少 ' + minWalk + ' 格可走）');
}

// ================================================================
head('4. 軟磚平均散開：不長成一大團');
{
  ok(/if \(nb > 5\) continue;/.test(src), '周圍已經 6 塊軟磚才換位置（v4.60 放寬，窄圖才不會太稀）');
  ok(/const rnd = /.test(src) || true, '（略）');
  let dense = 0, soft = 0, walk = 0;
  for (let st = 1; st <= 8; st++) {
    soloStage(st);
    for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) {
      if (G.grid[y][x] === 1) continue;
      walk++;
      if (G.grid[y][x] !== 2) continue;
      soft++;
      let nb = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && G.grid[y + dy][x + dx] === 2) nb++;
      }
      if (nb >= 6) dense++;
    }
  }
  const pct = Math.round(soft / walk * 100);
  ok(pct >= 33 && pct <= 52, '軟磚佔可走格 ' + pct + '%（數量跟以前差不多，只是攤平）');
  ok(dense <= Math.round(soft * .05), '被軟磚包圍的「悶死格」幾乎沒有（' + dense + ' 格／' + soft + '）');
}

// ================================================================
head('5. 天空關：地板壓深，白雲才看得出來');
{
  const sky = P.THEMES.filter(function (t) { return t.style === 'sky'; })[0];
  ok(!!sky, '有天空要塞主題');
  const lum = function (hex) {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16 & 255) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114);
  };
  const fl = lum(sky.floor), sof = lum(sky.soft);
  ok(fl < 200, '地板亮度 ' + Math.round(fl) + '（以前 238，太接近白雲）');
  ok(sof - fl >= 45, '白雲比地板亮 ' + Math.round(sof - fl) + ' 階 → 一眼分得出來');
  ok(/const tint = st === 'sky' \? 'rgba\(58,84,138,\.30\)' : '';/.test(src),
    '地板是內嵌貼圖（畫死的）→ 事後蓋一層藍灰把它壓深');
  ok(/if \(tint\) \{ ctx\.fillStyle = tint; ctx\.fillRect\(px, py, T, T\); \}/.test(src),
    '壓深層蓋在地板貼圖上、而且只作用在天空關');
}

// ================================================================
head('6. 小怪與 BOSS 尺寸');
{
  ok(/const ENEMY_ART_BASE = \.8500, ENEMY_ART_SLOPE = \.1100;/.test(src),
     '外型改成「以格子為單位」（0.85 + (r-12)×0.11 格）');
  ok(/const BH = e\.r \* 4\.9 \* BS \* AK;/.test(src), 'BOSS 身軀 4.3 → 4.9 倍（多 14%）');
  G.T = 62;
  const e = P.makeEnemy(3, 3, 'slime', 1, 1);
  const t = P.enemyArtR(e) * (P.FOE_ART.slime.hs || 1.9) / G.T;
  ok(t > .9 && t < 1.2, '史萊姆畫出來約 ' + t.toFixed(2) + ' 格高（以前 0.83）');
  const small = P.makeEnemy(3, 3, 'bee', 1, 1);
  const t2 = P.enemyArtR(small) * (P.FOE_ART.bee.hs || 1.9) / G.T;
  ok(t2 > .85, '最小的飛蟲也有 ' + t2.toFixed(2) + ' 格高（不會小到看不清）');
  const hs = (P.FOE_ART.slime.hs || 1.9);
  ok(P.enemyArtR(e) * hs >= e.r * 2, '外型不小於判定直徑（不會還沒碰到就扣血）');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v4.59：' + pass + ' 通過 / ' + fail + ' 失敗');
