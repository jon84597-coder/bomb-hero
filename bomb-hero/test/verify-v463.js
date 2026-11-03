// test/verify-v463.js —— v4.63（使用者回報：1-1 有小怪卡在硬牆裡打不到／外牆位置出現淺色硬牆／
//   地圖外面一堆外牆碎片漂在背景上）
//   ① 地圖外圍不再冒出「漂在背景上的牆」—— 外圍岩體的深處（dist=-1）也要算內層、不畫
//   ② 凹角裡那種「只靠斜角碰到場地」的小石子一律算外牆 → 不會變成淺色補丁黏在外牆帶上
//   ③ 地圖生成最後做可達性檢核 → 不會再有「四面是牆、走不到、炸不到」的死格
//   ④ 章節最終關的王不再硬挖一格（以前會挖出死格，小怪生在裡面永遠打不到）
//   ⑤ 電腦撿到遙控器真的會引爆了（以前只在對手貼著炸彈 2 格時才按）
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, html = env.html, src = html;

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
function solid(x, y) {
  return x >= 0 && y >= 0 && x < G.cols && y < G.rows && G.grid[y][x] === 1;
}
// 連到地圖外框的岩體（＝外圍岩層）
function connMap() {
  const cols = G.cols, rows = G.rows;
  const c = [];
  for (let y = 0; y < rows; y++) c.push(new Array(cols).fill(false));
  const q = [];
  for (let x = 0; x < cols; x++) { q.push([x, 0]); q.push([x, rows - 1]); }
  for (let y = 0; y < rows; y++) { q.push([0, y]); q.push([cols - 1, y]); }
  for (let i = 0; i < q.length; i++) {
    const x = q[i][0], y = q[i][1];
    if (!solid(x, y) || c[y][x]) continue;
    c[y][x] = true;
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return c;
}
function reachMap() {
  const cols = G.cols, rows = G.rows;
  const sp = G.spawnCell || { x: 1, y: 1 };
  const r = [];
  for (let y = 0; y < rows; y++) r.push(new Array(cols).fill(false));
  const q = [];
  if (!solid(sp.x, sp.y)) { r[sp.y][sp.x] = true; q.push([sp.x, sp.y]); }
  for (let i = 0; i < q.length; i++) {
    const x = q[i][0], y = q[i][1];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      const nx = x + d[0], ny = y + d[1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
      if (r[ny][nx] || G.grid[ny][nx] === 1) return;
      r[ny][nx] = true; q.push([nx, ny]);
    });
  }
  return r;
}

// ----------------------------------------------------------------
head('1. 源碼：外牆三遍分類（v4.63）');
{
  ok(/const wk = \[\], dist = \[\], ed = \[\], conn = \[\];/.test(src), 'dist／ed／conn 三張表都在');
  ok(/const isOut = \[\];/.test(src), '多了 isOut 表（先分類、再決定畫不畫）');
  ok(/const near = dist\[y\]\[x\] >= 0 && dist\[y\]\[x\] <= 1;/.test(src),
     'dist=-1（岩體深處）也算「內層」，不會被當成表層畫出來');
  ok(/if \(!near && conn\[y\]\[x\] && !rock\) continue;/.test(src), '連到外框的岩體內層才跳過（縮圈落石除外）');
  ok(/if \(g\[ny\]\[nx\] === 1 && conn\[ny\]\[nx\]\) \{ isOut\[y\]\[x\] = true; break; \}/.test(src),
     '四鄰貼著外圍岩體 → 一律算外牆（凹角小石子不會變淺色補丁）');
  ok(/wk\[y\]\[x\] = \(isOut\[y\]\[x\] \|\| rock\) \? 1 : 2;/.test(src), '最後才決定是外牆還是硬牆（縮圈落石算外牆）');
}

// ----------------------------------------------------------------
head('2. 32 關實掃：漂在背景上的牆／淺色補丁／封閉破洞');
{
  let orphanConn = 0, creamInRim = 0, closedHole = 0, drawn = 0;
  let worst = '';
  for (let st = 1; st <= 32; st++) {
    soloStage(st);
    P.markWallKinds();
    const wk = G.wallKind;
    if (!wk) continue;
    const conn = connMap();
    for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
      if (!wk[y][x]) continue;
      drawn++;
      const openN = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(function (d) {
        const nx = x + d[0], ny = y + d[1];
        return nx >= 0 && ny >= 0 && nx < G.cols && ny < G.rows && G.grid[ny][nx] !== 1;
      });
      // 「漂在背景上」＝被畫出來、四周卻全是固體，而且它屬於外圍岩層
      if (!openN && conn[y][x]) { orphanConn++; worst = 'st' + st + ' (' + x + ',' + y + ')'; }
      if (wk[y][x] === 2) {
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          if (solid(x + d[0], y + d[1]) && conn[y + d[1]][x + d[0]]) creamInRim++;
        });
      }
    }
    // 封閉破洞：不畫的牆格，從陣列外圍 flood fill 走不到
    const seen = [], q2 = [];
    for (let y = 0; y < G.rows; y++) {
      seen.push([]);
      for (let x = 0; x < G.cols; x++) seen[y].push(G.grid[y][x] !== 1 || wk[y][x] !== 0);
    }
    for (let x = 0; x < G.cols; x++) { q2.push([x, 0]); q2.push([x, G.rows - 1]); }
    for (let y = 0; y < G.rows; y++) { q2.push([0, y]); q2.push([G.cols - 1, y]); }
    for (let i = 0; i < q2.length; i++) {
      const x = q2[i][0], y = q2[i][1];
      if (x < 0 || y < 0 || x >= G.cols || y >= G.rows || seen[y][x]) continue;
      seen[y][x] = true; q2.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
      if (G.grid[y][x] === 1 && wk[y][x] === 0 && !seen[y][x]) closedHole++;
    }
  }
  ok(drawn > 1500, '32 關總共畫了 ' + drawn + ' 格牆');
  ok(orphanConn === 0, '沒有任何牆漂在地圖外面（' + orphanConn + ' 格）' + (worst ? '：' + worst : ''));
  ok(creamInRim === 0, '外牆帶裡沒有淺色硬牆補丁（' + creamInRim + ' 格）');
  ok(closedHole === 0, '牆中間沒有封閉破洞（' + closedHole + ' 格）');
}

// ----------------------------------------------------------------
head('3. 32 關實掃：小怪不會生在走不到的地方');
{
  let onWall = 0, sealed = 0, unreach = 0, sealedFloor = 0, unreachFloor = 0, foes = 0;
  let sealedLeft = 0;
  for (let st = 1; st <= 32; st++) {
    soloStage(st);
    sealedLeft += (G.sealedCells || 0);
    const reach = reachMap();
    for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
      if (G.grid[y][x] === 1) continue;
      if (!reach[y][x]) unreachFloor++;
      const solidN = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (d) {
        const nx = x + d[0], ny = y + d[1];
        return nx < 0 || ny < 0 || nx >= G.cols || ny >= G.rows || G.grid[ny][nx] === 1;
      }).length;
      if (solidN === 4) sealedFloor++;
    }
    (G.enemies || []).forEach(function (e) {
      foes++;
      const cx = Math.floor(e.x / G.T), cy = Math.floor(e.y / G.T);
      if (cx < 0 || cy < 0 || cx >= G.cols || cy >= G.rows || G.grid[cy][cx] === 1) { onWall++; return; }
      const solidN = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (d) {
        const nx = cx + d[0], ny = cy + d[1];
        return nx < 0 || ny < 0 || nx >= G.cols || ny >= G.rows || G.grid[ny][nx] === 1;
      }).length;
      if (solidN === 4) sealed++;
      if (!reach[cy][cx]) unreach++;
    });
  }
  ok(foes > 100, '32 關共 ' + foes + ' 隻小怪');
  ok(unreachFloor === 0, '沒有「走不到的地板格」（' + unreachFloor + ' 格）');
  ok(sealedFloor === 0, '沒有「四面都是牆的密封地板格」（' + sealedFloor + ' 格）');
  ok(onWall === 0, '沒有小怪生在牆上（' + onWall + ' 隻）');
  ok(sealed === 0, '沒有小怪被困在密封格裡（' + sealed + ' 隻）← 使用者回報的「卡在牆裡打不到」');
  ok(unreach === 0, '沒有小怪生在走不到的地方（' + unreach + ' 隻）');
  ok(sealedLeft === 0, '地圖生成階段不需要補封任何死格（' + sealedLeft + ' 格）');
}

// ----------------------------------------------------------------
head('4. 章節最終關：王站在走得到的空地');
{
  ok(/const bc = pickBossCell\(clamp\(Math\.floor\(cols \/ 2\), 1, cols - 2\), Math\.max\(1, rows - 2\), cols, rows\);/.test(src),
     '章節最終關的王改用 pickBossCell 挑位');
  ok(/const bc2 = pickBossCell\(/.test(src), 'BOSS／BOSS RUSH 的王也一樣');
  ok(!/Game\.grid\[by\]\[bx\] = 0;\s*\/\/ 登場那一格先清空/.test(src), '舊的「硬挖一格給王站」已移除');
  ok(/return \{ x: xx, y: yy \};/.test(src), 'pickBossCell 會回傳現成空地');

  let bad = 0, checked = 0;
  [4, 8, 12, 16, 20, 24, 28, 32].forEach(function (st) {
    soloStage(st);
    const reach = reachMap();
    (G.enemies || []).forEach(function (e) {
      if (!e.chapterBoss) return;
      checked++;
      const cx = Math.floor(e.x / G.T), cy = Math.floor(e.y / G.T);
      if (!reach[cy] || !reach[cy][cx]) bad++;
    });
  });
  ok(checked >= 6, '檢查了 ' + checked + ' 隻章節王');
  ok(bad === 0, '所有章節王都站在走得到的格子上（' + bad + ' 隻例外）');
}

// ----------------------------------------------------------------
head('5. 電腦（AI）會用遙控炸彈');
{
  ok(/function aiRemoteTick\(p\) \{/.test(src), '有 aiRemoteTick()');
  ok(/if \(\(b\.age \|\| 0\) > 2\.6\) ready = true;/.test(src), '放超過 2.6 秒就引爆（開路／清磚）');
  ok(/if \(onCross\(b, Math\.floor\(q\.x \/ T\), Math\.floor\(q\.y \/ T\)\)\) hitFoe = true;/.test(src),
     '對手在自己的火焰十字線上 → 引爆');
  ok(/if \(onCross\(mine\[i\], pcx, pcy\)\) return;/.test(src), '會炸到自己就不按');
  ok(/aiRemoteTick\(p\);/.test(src), 'controlAI 每幀都會呼叫');
  ok(!/if \(p\.remote && Math\.random\(\) < \.35\)/.test(src), '舊的 35% 亂按版本已移除');

  // 實跑：AI 拿遙控器 → 放彈 → 走到安全處 → 2.6 秒後應該被引爆
  const p = soloStage(1);
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
  G.bombs.length = 0; G.flames.length = 0; G.enemies.length = 0; G.wallKind = null;
  p.ai = true; p.remote = true; p.alive = true; p.invuln = 0;
  p.x = 3 * G.T + G.T / 2; p.y = 3 * G.T + G.T / 2;
  const nb = P.placeBomb(p);
  ok(nb > 0 && G.bombs.length === 1, 'AI 放下一顆遙控彈');
  ok(G.bombs[0] && G.bombs[0].remoteArmed === true, '這顆是遙控彈（不會自己爆）');
  // 站在炸彈上（會被炸到）→ 不該按
  P.aiRemoteTick(p);
  ok(G.bombs[0] && G.bombs[0].remoteArmed === true, '站在自己的炸彈上時不會按下引爆');
  // 走到遠處 + 放超過 2.6 秒 → 該引爆
  p.x = 8 * G.T + G.T / 2; p.y = 8 * G.T + G.T / 2;
  G.bombs[0].age = 3.2;
  P.aiRemoteTick(p);
  ok(G.bombs[0] && G.bombs[0].remoteArmed === false, '離開爆炸範圍、放超過 2.6 秒 → 引爆');
}

console.log('\n' + (fail === 0 ? '✅ ' : '❌ ') + 'v4.63：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
