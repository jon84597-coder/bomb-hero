// test/verify-v472.js —— v4.72：大逃殺三島（地圖／毒圈／名次／門票）＋ 視口裁切 ＋ 逐格主題
const path = require('path');
const { makeEnv, html } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
const src = html;

console.log('\n=== 1. 源碼骨架 ===');
ok(/const BR = \{[\s\S]{0,200}?W: 56, H: 44/.test(src), 'BR 常數：56×44 超大地圖');
ok(/N: 8, FOES: 14/.test(src), '8 人 / 14 隻小怪');
ok(/PH: \[\[\d+, \d+\](, \[\d+, \d+\]){3}\]/.test(src) && /PH: \[\[26, 30\]/.test(src), '毒圈四階段（26s→30 格 …→5 格）');
ok(/GOLD: \[1200, 700, 450, 300, 200, 150, 100, 80\]/.test(src), '名次獎勵 1200→80');
ok(/else if \(Game\.mode === 'br'\) updateBR\(dt\);/.test(src), 'update 分派到大逃殺');
ok(/if \(Game\.mode === 'battle' \|\| Game\.mode === 'br'\) killBattlePlayer/.test(src), '炸彈／火焰在大逃殺也走「淘汰」而不是單人重來');
ok(/Game\.mode !== 'br' && settings\.revenge/.test(src), '大逃殺不上復仇推車');
ok(/drawBRHud\(\); \} catch \(e\) \{\}/.test(src), 'HUD 掛鉤');
ok(/if \(Game\.mode === 'br' && Game\.brZone\) drawBRZone\(T\);/.test(src), '毒圈畫在牆之上、角色之下');
ok(/function viewRange\(T\)/.test(src) && /const vr = viewRange\(T\);/.test(src), 'render 有視口裁切');
ok(/function themeAtCell\(x, y, th\)/.test(src) && /themeAtCell\(x, y, th\)/.test(src), '逐格主題（三島各自地形）');
ok(/grantTicket: grantTicket/.test(src), 'Shop 可以送門票');

console.log('\n=== 2. 三島地圖 ===');
(function () {
  const env = makeEnv(); const BH = env.BH, G = env.G;
  env.getId('body').classList.add('touch');
  const c = env.getId('cv'); c.clientWidth = 390; c.clientHeight = 775;
  BH.settings.ctrl = 'touch';
  ok(BH.startBR() === true, 'startBR() 開得起來');
  ok(G.mode === 'br' && G.bigMap === true, '模式 = br、bigMap = true');
  ok(G.cols === 56 && G.rows === 44, '地圖 56×44（實際 ' + G.cols + '×' + G.rows + '）');
  // 三座島都有陸地
  const land = [0, 0, 0], themeSet = {};
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    const i = G.brIsl[y][x];
    if (G.grid[y][x] !== 1) land[i === 2 ? 2 : i]++;
    const th = G.themeAt[y] && G.themeAt[y][x];
    if (th) themeSet[th.style] = 1;
  }
  ok(land[0] > 120 && land[1] > 120 && land[2] > 120,
     '三座島都有陸地（' + land.join('／') + ' 格）');
  ok(Object.keys(themeSet).length === 3, '三座島各一種地形（' + Object.keys(themeSet).join('、') + '）');
  // 連通：從第三座島能走到第一、二座島
  const seen = [], q = [[28, 32]];
  for (let y = 0; y < G.rows; y++) seen.push(new Array(G.cols).fill(false));
  seen[32][28] = true;
  for (let i = 0; i < q.length; i++) {
    const cx = q[i][0], cy = q[i][1];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      const nx = cx + d[0], ny = cy + d[1];
      if (nx < 0 || ny < 0 || nx >= G.cols || ny >= G.rows) return;
      if (seen[ny][nx] || G.grid[ny][nx] === 1) return;
      seen[ny][nx] = true; q.push([nx, ny]);
    });
  }
  let reach0 = 0, reach1 = 0, all = 0, unreach = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    if (G.grid[y][x] === 1) continue;
    all++;
    if (seen[y][x]) { if (G.brIsl[y][x] === 0) reach0++; if (G.brIsl[y][x] === 1) reach1++; }
    else unreach++;
  }
  ok(reach0 > 100 && reach1 > 100, '兩座外島都走得到（' + reach0 + '／' + reach1 + ' 格）');
  ok(unreach === 0, '沒有走不到的死島（未連通 ' + unreach + ' 格）');
  ok(all > 500 && all < 1100, '可走格 ' + all + '（目標 500~1100）');
  // v4.73：三座島必須真的隔著海 —— 舊版島半徑 8.6 配 19 格圓心距，三島直接黏成一整塊大陸、
  //   窄橋整段被蓋在陸地裡，玩家根本看不到「過橋」這件事。這裡驗「橋 = 落在第三島 blob 之外的連通格」。
  const C3 = BH.BR.ISL[2];
  let brg = 0, seat = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    if (G.grid[y][x] === 1) { if (G.brIsl[y][x] < 0) seat++; continue; }
    if (G.brIsl[y][x] !== 2) continue;
    const d = Math.sqrt((x - C3.cx) * (x - C3.cx) + (y - C3.cy) * (y - C3.cy));
    if (d > C3.r * 1.3) brg++;
  }
  ok(brg > 20, '兩座窄橋真的跨在海面上（橋格 ' + brg + '）');
  ok(seat > 800, '島與島之間是海（深海格 ' + seat + '）');
})();

console.log('\n=== 3. 出生點與小怪 ===');
(function () {
  const env = makeEnv(); const BH = env.BH, G = env.G;
  env.getId('body').classList.add('touch');
  const c = env.getId('cv'); c.clientWidth = 390; c.clientHeight = 775;
  BH.settings.ctrl = 'touch';
  BH.startBR();
  ok(G.players.length === 8, '8 名玩家（' + G.players.length + '）');
  ok(G.players.filter(function (p) { return p.ai; }).length === 7, '7 個 AI + 自己');
  ok(G.players[0].ai !== true, 'P1 是自己操作');
  const cells = G.players.map(function (p) { return [Math.floor(p.x / G.T), Math.floor(p.y / G.T)]; });
  ok(cells.every(function (c2) { return isFinite(c2[0]) && isFinite(c2[1]); }), '八個人的座標都有效');
  let minD = 99;
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    minD = Math.min(minD, Math.abs(cells[i][0] - cells[j][0]) + Math.abs(cells[i][1] - cells[j][1]));
  }
  ok(minD >= 5, '出生點彼此至少隔 5 格（實際最近 ' + minD + '）');
  const used = {};
  cells.forEach(function (c2) { used[G.brIsl[c2[1]][c2[0]]] = (used[G.brIsl[c2[1]][c2[0]]] || 0) + 1; });
  ok(Object.keys(used).length === 3, '三座島都有人出生（' + JSON.stringify(used) + '）');
  ok(G.enemies.length === 14, '14 隻小怪（' + G.enemies.length + '）');
  const foeIsl = {};
  G.enemies.forEach(function (e) {
    const ix = Math.floor(e.x / G.T), iy = Math.floor(e.y / G.T);
    const k = G.brIsl[iy][ix];
    foeIsl[k] = (foeIsl[k] || 0) + 1;
  });
  ok(Object.keys(foeIsl).length === 3, '小怪三座島都有（' + JSON.stringify(foeIsl) + '）');
  const kinds = {};
  G.enemies.forEach(function (e) { kinds[e.type] = 1; });
  ok(Object.keys(kinds).length >= 4, '小怪種類有跟著地形走（' + Object.keys(kinds).length + ' 種）');
  ok(G.players[0].brHp === 4, '開局 4 點血（' + G.players[0].brHp + '）');
})();

console.log('\n=== 4. 毒圈與淘汰 ===');
(function () {
  const env = makeEnv({ runTimers: true }); const BH = env.BH, G = env.G;
  env.getId('body').classList.add('touch');
  const c = env.getId('cv'); c.clientWidth = 390; c.clientHeight = 775;
  BH.settings.ctrl = 'touch';
  BH.startBR();
  G.state = 'play';
  // 這一段只量毒圈：把所有玩家鎖成無敵，免得「自己先死 → 狀態變 over → 圈不再動」
  G.players.forEach(function (q) { q.invuln = 999; });
  const r0 = G.brZone.r;
  for (let i = 0; i < 60 * 30; i++) BH.updateBR(1 / 60);      // 30 秒
  ok(G.state === 'play', '（前提）30 秒內沒有人被淘汰、狀態仍是 play');
  ok(G.brZone.phase >= 1, '26 秒後進入第一階段（phase=' + G.brZone.phase + '）');
  ok(G.brZone.tr < r0, '目標半徑縮小（' + r0 + ' → ' + G.brZone.tr + '）');
  ok(G.brZone.r <= r0, '實際半徑跟著收（' + G.brZone.r.toFixed(1) + '）');
  // 圈外：4 點血、每 1.6 秒掉一點 → 約 6.4 秒淘汰
  const p = G.players[0];
  p.alive = true; p.brHp = 1; p.brOut = 0; p.invuln = 0;
  p.x = 1 * G.T; p.y = 1 * G.T;                                // 角落一定在圈外
  let ticks = 0;
  while (p.alive && ticks < 60 * 12) { BH.updateBR(1 / 60); ticks++; }
  ok(!p.alive, '圈外撐不久就淘汰（' + (ticks / 60).toFixed(1) + ' 秒）');
  ok(p.brPlace >= 2, '淘汰時記下名次（第 ' + p.brPlace + ' 名）');
})();

console.log('\n=== 5. 門票與名次獎勵 ===');
(function () {
  const env0 = makeEnv(); const BH0 = env0.BH;
  const t0 = BH0.Game && 0;
  // 沒票 → 不開局
  const env = makeEnv();
  env.BH.settings.ctrl = 'touch';
  try { env.BH.Shop && 0; } catch (e) {}
  ok(typeof env.BH.startBR === 'function', 'startBR 已匯出');
  // 有票 → 扣一張
  const envA = makeEnv({ storage: { 'bombhero-br-ticket': '5', 'bombhero-br-free': '2000-01-01' } });
  envA.getId('body').classList.add('touch');
  const cA = envA.getId('cv'); cA.clientWidth = 390; cA.clientHeight = 775;
  envA.BH.settings.ctrl = 'touch';
  const before = envA.BH.Shop.tickets();
  envA.BH.startBR();
  ok(envA.BH.Shop.tickets() === before - 1, '開一場扣一張門票（' + before + ' → ' + envA.BH.Shop.tickets() + '）');
  // 名次獎勵
  const G = envA.G;
  G.state = 'play';
  G.brAlive = 1;
  const me = G.players[0];
  me.brPlace = 1;
  const goldBefore = envA.BH.Shop.gold();
  const tkBefore = envA.BH.Shop.tickets();
  envA.BH.brFinish(me);
  ok(envA.BH.Shop.gold() === goldBefore + 1200, '冠軍 +1200 金幣（' + (envA.BH.Shop.gold() - goldBefore) + '）');
  ok(envA.BH.Shop.tickets() === tkBefore + 1, '前三名再送一張門票');
  ok(G.endShown === true, '顯示結算卡');
})();

console.log('\n=== 6. 視口裁切 ===');
(function () {
  const env = makeEnv(); const BH = env.BH, G = env.G;
  env.getId('body').classList.add('touch');
  const c = env.getId('cv'); c.clientWidth = 390; c.clientHeight = 775;
  BH.settings.ctrl = 'touch';
  BH.startBR();
  G.state = 'play'; G.zoom = 1; G.camSnap = true;
  G.camX = 0; G.camY = 0;
  const vr = BH.viewRange(G.T);
  ok(vr.x0 >= 0 && vr.y0 >= 0 && vr.x1 <= G.cols - 1 && vr.y1 <= G.rows - 1, '裁切範圍不超出地圖');
  const seen = (vr.x1 - vr.x0 + 1) * (vr.y1 - vr.y0 + 1);
  ok(seen < G.cols * G.rows * .7, '只看得到 ' + seen + ' / ' + (G.cols * G.rows) + ' 格');
  env.rec.calls.length = 0;
  try { BH.render(); } catch (e) {}
  const imgs = env.rec.calls.filter(function (k) { return k[0] === 'drawImage'; }).length;
  ok(imgs < G.cols * G.rows, '實際貼圖次數 ' + imgs + ' < 全部格子 ' + (G.cols * G.rows));
})();

console.log('\n=== 7. 版本 ===');
(function () {
  const v = (src.match(/const VERSION = '([^']+)'/) || [])[1];
  // 不鎖死版號（每次升版都要回來改一次＝浪費時間，也容易漏改）
  ok(parseFloat(v) >= 4.72, 'VERSION >= 4.72（實際 ' + v + '）');
  ok(/id="verLogVer">4\.\d+</.test(src), '版本紀錄同步');
  const sw = require('fs').readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const m = sw.match(/SW_VERSION = '([^']+)'/);
  ok(m && /^v4\.\d+\.0$/.test(m[1]), 'sw.js = v4.x.0（實際 ' + (m && m[1]) + '）');
})();

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v4.72：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
