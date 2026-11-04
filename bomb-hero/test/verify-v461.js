// test/verify-v461.js —— v4.61
//   ① 鑽地／瞬移的小怪出手前要集氣（原地抖＋聚氣球），落點先亮警示圈 → 玩家有時間閃
//   ② 消失中的小怪碰不到人（以前站在隱形怪身上會直接死）
//   ③ 落點在消失那一刻鎖定；被牆／炸彈佔住就不跳，玩家可以用炸彈封門
//   ④ 外牆判定補「背對岩層」→ 淺色硬牆不再頂在地圖外緣；場內岩柱變多、打散
//   ⑤ 兩張大圖換成 WebP，替容量上限騰出空間
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec, html = env.html, src = html;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

function soloStage(st) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.settings.soloTime = 300;
  P.startSolo(st || 1, false);
  G.state = 'play';
  G.countdown = 0;
  if (G.players[0]) { G.players[0].invuln = 0; G.players[0].alive = true; }
  return G.players[0];
}
function openField() {
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
  G.bombs.length = 0; G.flames.length = 0; G.items.length = 0;
  G.enemies.length = 0; G.wallKind = null;
}
function onlyFoe(spec, cx, cy) {
  const e = P.makeEnemy(cx, cy, spec || 'imp', 1, 1);
  e.aggro = true; e.skCd = 0;
  G.enemies.push(e);
  return e;
}
// 直接推進「這一隻怪」（updateEnemy 已匯出，不必靠主迴圈）
function tickFoe(e, n) {
  for (let i = 0; i < n; i++) P.updateEnemy(e, 1 / 60);
}

// ================================================================
head('1. 鑽地／瞬移怪：出手前先集氣');
{
  ok(/if \(e\.skill === 'blink'\) \{[\s\S]{0,420}e\.castT = FOE_CAST_WINDUP;/.test(src),
     'blink 技能改成先集氣（castT = FOE_CAST_WINDUP）再出手');
  ok(!/e\.blinkT = \.5;/.test(src), '不再「看到人就 0.5 秒直接消失」');
  ok(/const FOE_BLINK_T = \.5;/.test(src), '消失時間抽成 FOE_BLINK_T 常數（= 警示圈亮多久）');
  ok(/drawBlinkMarks\(T\);\s*\n\s*drawFoeCastGround\(T\);/.test(src), 'render 有呼叫落點警示圈（畫在敵人之前 → 貼在地上）');
  ok(/if \(!\(e\.castT > 0\) \|\| e\.skill === 'blink'\) continue;/.test(src),
     '鑽地怪不會誤畫吐彈的落點準心');

  const p = soloStage(1); openField();
  const T = G.T;
  p.x = 7 * T + T / 2; p.y = 5 * T + T / 2;
  const e = onlyFoe('imp', 5, 5);
  let sawCast = 0, vanishedTooEarly = false;
  for (let i = 0; i < 70; i++) {
    P.updateEnemy(e, 1 / 60);
    if (e.castT > 0 && e.blinkT === 0) sawCast++;
    if (e.blinkT > 0 && e.castT > 0) vanishedTooEarly = true;
  }
  ok(sawCast > 0, '有先集氣（' + sawCast + ' 幀看得到 castT > 0）');
  ok(!vanishedTooEarly, '集氣期間牠還站在場上（同時消失 = 玩家看不到預告）');
}

// ================================================================
head('2. 消失那一刻鎖定落點，玩家跑開就跟不上');
{
  const p = soloStage(1); openField();
  const T = G.T;
  p.x = 7 * T + T / 2; p.y = 5 * T + T / 2;
  const e = onlyFoe('imp', 5, 5);
  let n = 0;
  while (n < 200 && e.blinkT <= 0) { P.updateEnemy(e, 1 / 60); n++; }
  ok(e.blinkT > 0, '集氣 ' + (n / 60).toFixed(2) + ' 秒後才消失');
  ok(e.bx != null && e.by != null, '落點（bx/by）已鎖定：' + e.bx + ',' + e.by);
  const pcx = Math.floor(p.x / T), pcy = Math.floor(p.y / T);
  const d = Math.max(Math.abs(e.bx - pcx), Math.abs(e.by - pcy));
  ok(d >= 1 && d <= 3, '落點在玩家旁邊 ' + d + ' 格（不會直接疊在身上）');

  const bx = e.bx, by = e.by;
  p.x = 1 * T + T / 2; p.y = (G.rows - 2) * T + T / 2;    // 跑到地圖另一頭
  tickFoe(e, 6);
  ok(e.bx === bx && e.by === by, '玩家跑開也不會把落點改到新位置');
}

// ================================================================
head('3. 消失中碰不到人（以前站在隱形怪身上就直接死）');
{
  const p = soloStage(1); openField();
  const T = G.T;
  const e = onlyFoe('imp', 5, 5);
  e.blinkT = P.FOE_BLINK_T; e.bx = 8; e.by = 8;
  p.invuln = 0; p.alive = true;
  p.x = e.x; p.y = e.y;                    // 就站在牠原本的位置上
  P.updateSolo(1 / 60);
  ok(p.alive === true, '隱形／鑽地中站在牠身上也不會死');
  ok(/if \(e\.blinkT > 0 \|\| e\.emergeT > 0\) continue;/.test(src),
    '碰撞判定有跳過消失中（v4.67 再加上「剛冒出」）的小怪');

  const p2 = soloStage(1); openField();
  const e2 = onlyFoe('imp', 5, 5);
  p2.invuln = 0; p2.alive = true;
  e2.x = p2.x; e2.y = p2.y;
  P.updateSolo(1 / 60);
  ok(p2.alive === false, '沒消失的時候照樣會撞死人（規則沒被拿掉）');
}

// ================================================================
head('4. 落點被牆或炸彈佔住 → 留在原地（玩家可以封門）');
{
  const p = soloStage(1); openField();
  const T = G.T;
  p.x = 7 * T + T / 2; p.y = 7 * T + T / 2;
  const e = onlyFoe('imp', 5, 5);
  const ox = e.x, oy = e.y;
  e.bx = 2; e.by = 2;
  G.grid[2][2] = 1;                        // 落點是牆
  e.blinkT = .01;
  P.updateEnemy(e, 1 / 60);
  ok(Math.abs(e.x - ox) < 1 && Math.abs(e.y - oy) < 1, '落點是牆 → 原地冒出來，不會穿進牆裡');
  ok(e.bx == null, '落點用完就清掉（不會殘留上一輪的座標）');
  ok(/bombAt\(tx, ty\)/.test(src), '炸彈放在落點也能擋住牠（封門）');
}

// ================================================================
head('5. 落點警示圈的繪製');
{
  const p = soloStage(1); openField();
  const T = G.T;
  p.x = 7 * T + T / 2; p.y = 5 * T + T / 2;
  const e = onlyFoe('imp', 5, 5);
  e.blinkT = P.FOE_BLINK_T; e.bx = 6; e.by = 5;
  rec.calls.length = 0;
  P.drawBlinkMarks(T);
  const strokes = rec.calls.filter(function (c) { return c[0] === 'stroke'; }).length;
  const fills = rec.calls.filter(function (c) { return c[0] === 'fill'; }).length;
  ok(strokes >= 1, '地面有畫出警示圈（stroke ×' + strokes + '）');
  ok(fills >= 2, '圈內有淡色填底＋中心亮點（fill ×' + fills + '）');
  e.blinkT = 0; e.bx = null;
  rec.calls.length = 0;
  P.drawBlinkMarks(T);
  ok(rec.calls.length === 0, '沒在消失時不畫（不會滿地圓圈）');
}

// ================================================================
head('6. 場內硬岩柱：變多、還是打散擺');
{
  ok(/Math\.max\(2, Math\.min\(10, Math\.round\(opn \* \.11\)\)\)/.test(src),
     '柱子數量跟著空地走（關卡圖 11%，2~10 根；v4.66 隨機大圖另給 18%）');
  let total = 0, withP = 0, maxP = 0, sumP = 0;
  for (let st = 1; st <= 8; st++) {
    soloStage(st);
    let pil = 0;
    for (let y = 2; y < G.rows - 2; y++) for (let x = 2; x < G.cols - 2; x++) {
      if (G.grid[y][x] !== 1) continue;
      let floor = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { if (G.grid[y + d[1]][x + d[0]] !== 1) floor++; });
      if (floor === 4) pil++;
    }
    total++; sumP += pil;
    if (pil > 0) withP++;
    if (pil > maxP) maxP = pil;
  }
  ok(withP === total, '每一張圖都有場內岩柱（' + withP + '/' + total + '）');
  ok(sumP / total >= 3, '平均每張圖 ' + (sumP / total).toFixed(1) + ' 根（以前 0~1 根）');
}

// ================================================================
head('7. 大圖換成 WebP，容量上限還有餘裕');
{
  ok(/^data:image\/webp;base64,/.test(P.IMG_TITLEBG), '首頁底圖 JPEG → WebP（169KB → 94KB）');
  ok(/src="data:image\/webp;base64,[A-Za-z0-9+/=]{1000,}"/.test(html), '標題 LOGO PNG → WebP（無損、像素完全相同）');
  const chars = html.length, bytes = Buffer.byteLength(html, 'utf8');
  ok(chars < 3350000 && bytes < 3580000, '體積 ' + chars + ' 字元 / ' + bytes + ' 位元組（上限 3,350,000 / 3,580,000）');
  ok(bytes < 3580000 - 8000, '還有 ' + (3580000 - bytes) + ' 位元組 / ' + (3350000 - chars) + ' 字元的空間（檔案已接近上限，新功能要考慮拆檔）');
}

console.log('\n' + (fail ? '❌' : '✅') + ' v4.61：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
