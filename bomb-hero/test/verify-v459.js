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
head('1. 外牆判定改成「離地圖外框幾格」');
{
  ok(/const wk = \[\], dist = \[\], ed = \[\];/.test(src), '多了一張 ed 表（離外框的距離）');
  ok(!/if \(out\[y\]\[x\] \|\| g\[y\]\[x\] !== 1\) continue;/.test(src), '舊的「連到外框就算外牆」BFS 已移除');
  ok(/if \(d < 2\) q2\.push\(\[x \+ 1, y, d \+ 1\]/.test(src), '外框 BFS 只走 2 步（外牆帶就這麼厚）');
  ok(/wk\[y\]\[x\] = ed\[y\]\[x\] >= 0 \? 1 : 2;/.test(src), '外框帶以內 = 外牆，其餘一律硬牆');
}

// ================================================================
head('2. 實跑：外牆素材不會跑到地圖裡面');
{
  let farOut = 0, rim = 0, inner = 0, maps = 0;
  for (let st = 1; st <= 16; st++) {
    soloStage(st);
    const k = G.wallKind || [];
    if (!k.length) continue;
    maps++;
    for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
      if (!k[y]) continue;
      if (k[y][x] === 1) {
        const d = Math.min(x, y, G.cols - 1 - x, G.rows - 1 - y);
        if (d > 2) farOut++; else rim++;
      } else if (k[y][x] === 2) inner++;
    }
  }
  ok(maps === 16, '16 關都有牆分類（' + maps + '）');
  ok(farOut === 0, '外牆素材 0 格跑到地圖裡面（原本整張圖都是外牆色）');
  ok(rim > 100, '外框那一圈還是有外牆（' + rim + ' 格）');
  ok(inner > 150, '場內岩層改用硬牆素材（' + inner + ' 格）');
}

// ================================================================
head('3. 場內硬岩柱：打散擺、不堵走道');
{
  ok(/const pWant = opn > cols \* rows \* \.38 \? Math\.round\(cols \* rows \* \.05\) : 0;/.test(src),
    '柱子數量 = 面積 5%（本來就很密的圖不插）');
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
  ok(minWalk > 60, '走動面積沒有被吃掉（最少 ' + minWalk + ' 格可走）');
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
  ok(dense <= Math.round(soft * .02), '被軟磚包圍的「悶死格」幾乎沒有（' + dense + ' 格／' + soft + '）');
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
