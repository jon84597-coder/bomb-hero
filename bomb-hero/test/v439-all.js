// v4.39 四項需求：
//   1. 輸送帶「橫向離開」要快（舊版會被皮帶吸回格子中心 → 幾乎走不出去）
//   2. 道具圖示接近一格大、圓形亮金外框不壓圖
//   3. 恐龍蛋換新貼圖、藏在軟磚裡、左右搖晃＋蛋緣閃光
//   4. 推車投擲：只有飛越牆壁才彈跳，一般地面平順滑過去
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec;
let pass = 0, fail = 0;
function ok(c, msg, extra) {
  if (c) { pass++; console.log('  ✓ ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
}

P.settings.size = 'M'; P.settings.hazards = 'on'; P.settings.ctrl = 'kb';
P.startSolo(1, false); G.state = 'play';
const T = G.T, me = G.players[0];

// ==================================================================
console.log('=== 1. 輸送帶：橫向離開要「快」，不能被吸回格子中心 ===');
{
  const Y = 5;
  for (let x = 2; x <= 14; x++) { G.grid[Y][x] = 0; G.grid[Y + 1][x] = 0; G.hazards[Y][x] = null; }
  // 直的輸送帶要走「一整條」才量得準（只鋪一格的話走一步就離開帶子了）
  for (let y = 1; y < G.rows - 1; y++) { G.grid[y][6] = 0; G.hazards[y][6] = null; }
  G.bombs.length = 0; G.enemies.length = 0;
  let belt = { type: 'convey', dir: 'down' };

  function run(dirKey, secs, useBelt) {
    for (let y = 1; y < G.rows - 1; y++) G.hazards[y][6] = useBelt ? belt : null;
    me.x = 6 * T + T / 2; me.y = Y * T + T / 2;
    me.invuln = 0; me.alive = true; me.dizzy = 0; me.dino = false; me.beltMul = 1;
    me.scheme = { dirs: function () { return [dirKey]; }, action: function () { return false; }, actionHeld: function () { return false; } };
    const x0 = me.x, y0 = me.y;
    for (let i = 0; i < Math.round(secs * 60); i++) { P.controlHuman(me, 1 / 60); }
    return { dx: me.x - x0, dy: me.y - y0 };
  }
  const clearBelt = function () { for (let y = 1; y < G.rows - 1; y++) G.hazards[y][6] = null; };

  const flat = run('right', 1, false);
  const perp = run('right', 1, true);
  const withB = run('down', 1, true);
  const agst = run('up', 1, true);
  clearBelt();

  ok(perp.dx > flat.dx * .95, '橫向離開輸送帶不比平地慢（' + Math.round(perp.dx) + ' vs ' + Math.round(flat.dx) + ' px/s）');
  ok(perp.dx > 100, '橫向真的走得出去（1 秒 ' + Math.round(perp.dx) + ' px）');
  ok(Math.abs(perp.dy) < T, '橫向走時不會被皮帶沿著帶子拖走（dy ' + Math.round(perp.dy) + '）');
  ok(withB.dy > flat.dx * 1.3, '順著皮帶走明顯變快（' + Math.round(withB.dy) + ' px/s）');
  ok(Math.abs(agst.dy) < flat.dx * .5, '逆著皮帶走明顯變慢（' + Math.round(agst.dy) + ' px/s）');
  ok(P.BELT_CROSS > 1.15, '橫向倍率設成「甩出去」（BELT_CROSS=' + P.BELT_CROSS + '）');

  // 舊病根：皮帶推力走 tryMove 的一般分支，會把玩家吸回格子中心
  const src = require('fs').readFileSync(__dirname + '/../index.html', 'utf8');
  ok(/tryMove\(p, d\.x, d\.y, dt, BELT_SPEED, true\)/.test(src), '皮帶推力用 noAlign=true（不自動對齊格心）');
  ok(/function tryMove\(p, dx, dy, dt, spd, noAlign\)/.test(src), 'tryMove 支援 noAlign 參數');
}

// ==================================================================
console.log('\n=== 2. 道具圖示：接近一格大、圓形金框不壓圖 ===');
{
  const T2 = 46;
  const fake = env.fakeImg(160, 160);
  rec.calls.length = 0; rec.sets.length = 0;
  P.drawItemBadge(200, 200, T2, 'fire', fake, .5);
  const di = rec.calls.filter(function (c) { return c[0] === 'drawImage'; });
  const isz = di.length ? di[di.length - 1][4] : 0;
  ok(di.length === 1, '只畫一張圖（沒有重複疊圖）', di.length);
  ok(isz >= T2 * .78, '圖示接近一格大（' + (isz / T2).toFixed(2) + ' 格）');
  ok(isz >= T2 * .46 * 1.7, '比 v4.38 的舊尺寸明顯放大');

  const arcs = rec.calls.filter(function (c) { return c[0] === 'arc'; });
  // ctx.arc(x, y, r, a0, a1) → 記錄成 [name, x, y, r, a0, a1]
  const ring = arcs.filter(function (a) { return a[3] >= T2 * .40 && a[3] <= T2 * .50; });
  const rMax = ring.reduce(function (m, a) { return Math.max(m, a[3]); }, 0);
  ok(ring.length >= 1, '有金環（半徑在 0.40~0.50 格之間）', ring.length);
  ok(rMax * 2 <= T2 * 1.0, '金環直徑不超過一格（' + (rMax * 2 / T2).toFixed(2) + ' 格）');
  ok(isz / 2 + T2 * .03 <= rMax, '圖示整個在金環內側（圖半徑 ' + (isz / 2).toFixed(1) +
    ' + 間隙 < 環半徑 ' + rMax.toFixed(1) + '）');
  const fullCircles = arcs.filter(function (a) {
    return Math.abs(a[4]) < 1e-6 && Math.abs(a[5] - 6.283) < .01;
  }).length;
  ok(fullCircles >= 3, '金環是完整圓（外框／內亮線／外暗線都畫滿一圈）', fullCircles);
  ok(rec.calls.some(function (c) { return c[0] === 'stroke'; }), '有描邊（金環＋星芒）');

  const src = require('fs').readFileSync(__dirname + '/../index.html', 'utf8');
  ok(/const isz = Math\.min\(T \* \.80, R1 \* 2 - T \* \.04\)/.test(src), '圖示尺寸夾在金環內緣之內（不可能被壓到）');
  ok(/mg\.addColorStop\(\.26, '#ffd766'\)/.test(src), '金環用金屬漸層（#ffd766 亮金）');
  ok(/const a0 = gt \* 1\.35;/.test(src), '金環上有沿圈跑動的星芒');
}

// ==================================================================
console.log('\n=== 3. 恐龍蛋：新貼圖 ＋ 藏在軟磚裡 ＋ 搖晃閃光 ===');
{
  ok(typeof P.EGG_ART === 'object' && !!P.EGG_ART.egg, '有 EGG_ART 貼圖資料');
  ok(/^data:image\/webp;base64,/.test(P.EGG_ART.egg.u), '貼圖是 webp data URI（前綴沒漏）');
  ok(P.EGG_ART.egg.u.length > 2000, '貼圖資料有內容（' + Math.round(P.EGG_ART.egg.u.length / 1024) + ' KB base64）');

  // 重新開一張圖，檢查蛋全部藏在軟磚
  P.startSolo(1, false); G.state = 'play';
  const eggsOnFloor = G.eggs.length;
  const hidden = (G.eggsHidden || []).slice();
  ok(eggsOnFloor === 0, '一開始場上「看不到」任何恐龍蛋', eggsOnFloor);
  ok(hidden.length >= 1, '蛋被登記成「藏在軟磚裡」', hidden.length + ' 顆');
  ok(hidden.every(function (e) { return G.grid[e.y][e.x] === 2; }), '每一顆都真的在某塊軟磚裡');
  ok(hidden.every(function (e) {
    const k = e.y + ',' + e.x;
    return G.hidden[k] === P.EGG_HIDDEN;
  }), '軟磚的隱藏內容標成 EGG_HIDDEN');

  // 打掉那塊磚 → 蛋冒出來
  const e0 = hidden[0];
  G.grid[e0.y][e0.x] = 2;
  P.destroySoft(e0.x, e0.y);
  ok(G.eggs.length === 1, '軟磚被打掉 → 恐龍蛋冒出來', G.eggs.length);
  ok(G.eggsHidden.length === hidden.length - 1, '藏在磚裡的名單同步扣掉');
  const eg = G.eggs[0];
  ok(eg.born > 0, '有出生放大動畫（born=' + (eg.born || 0).toFixed(2) + '）');

  // 剛冒出來的 0.8 秒不能被同一發爆炸燒掉
  ok(eg.safeT > 0, '有出生保護（safeT=' + (eg.safeT || 0).toFixed(2) + 's）');
  G.flames.length = 0;
  P.addFlame(e0.x, e0.y, 'fire', 'down', null, 'bomb');
  for (let i = 0; i < 24; i++) { P.addFlame(e0.x, e0.y, 'fire', 'down', null, 'bomb'); P.updateWorld(1 / 60); }
  ok(G.eggs.length === 1, '爆炸當下不會馬上把剛冒出來的蛋燒掉', G.eggs.length);

  // 保護結束後，火焰照樣能燒掉（蛋不是無敵）
  G.eggs[0].safeT = 0;
  for (let i = 0; i < 8 && G.eggs.length; i++) { P.addFlame(e0.x, e0.y, 'fire', 'down', null, 'bomb'); P.updateWorld(1 / 60); }
  ok(G.eggs.length === 0, '保護結束後火焰照樣燒得掉蛋');

  const src = require('fs').readFileSync(__dirname + '/../index.html', 'utf8');
  ok(/ctx\.rotate\(sway\)/.test(src), '蛋會左右搖晃');
  ok(/Math\.sin\(eg\.bob \* 1\.35\) \* \.105/.test(src), '搖晃幅度 ±6 度左右');
  ok(/ctx\.ellipse\(0, 0, T \* \.338, T \* \.418, 0, a0, a0 \+ 1\.15\)/.test(src), '蛋緣有一道跑動的亮光');
  ok(/spark4\(ctx, spx, spy, T \* \.105\)/.test(src), '蛋緣有星芒閃光');
  ok(/const es = T \* \.88;/.test(src), '蛋的貼圖高度 0.88 格（比舊向量蛋飽滿）');
}

// ==================================================================
console.log('\n=== 4. 推車投擲：只有飛越牆壁才彈跳 ===');
{
  P.settings.count = 4;
  P.Battle.resetSlots(); P.startBattle(); G.state = 'play';
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) G.grid[y][x] = 0;

  function flyPeaks(path, dur) {
    G.bombs.length = 0;
    G.enemies.length = 0;
    const last = path[path.length - 1];
    G.bombs.push({
      cx: last.x, cy: last.y, px: 0, py: 0, timer: 99, power: 1, owner: G.players[0],
      passers: [], remoteArmed: false, mine: false, moving: null, held: false,
      ownerLeft: false, seed: 0, armT: 40,
      flying: { fx: path[0].x, fy: path[0].y, tx: last.x, ty: last.y, t: 0, dur: dur, path: path }
    });
    const ys = [];
    const frames = Math.ceil(dur * 60) + 2;
    for (let i = 0; i < frames; i++) {
      G.state = 'play';
      P.updateWorld(1 / 60);
      if (G.bombs[0]) ys.push(G.bombs[0].py);
    }
    // 「有沒有上下跳」＝ py（越小越高）有沒有反覆往回走。
    //   整段飛行是一條單調往下的拋物線 → 往回走的總量應該幾乎是 0；
    //   飛越牆壁時每一次彈跳都會讓 py 往回走一小段，累積起來就看得出來。
    let back = 0;
    for (let i = 1; i < ys.length; i++) {
      const d = ys[i] - ys[i - 1];
      if (d < 0) back += -d;
    }
    return { peaks: back, ys: ys };
  }

  function mkPath(n, wallIdx) {
    const p = [{ x: 3, y: 0 }];
    for (let i = 1; i <= n; i++) p.push({ x: 3, y: i, w: wallIdx.indexOf(i) >= 0 ? 1 : 0 });
    return p;
  }

  const open = flyPeaks(mkPath(8, []), .8);
  ok(open.ys.length > 20, '飛行有真的在跑（採樣 ' + open.ys.length + ' 幀）');
  ok(open.peaks < 1, '整段都飛在空地上 → 平順滑過去，完全不會上下跳（回彈 ' + open.peaks.toFixed(1) + ' px）');

  const walls = flyPeaks(mkPath(8, [2, 3]), .8);
  ok(walls.peaks > 2, '飛越那兩格牆時才多彈（回彈 ' + walls.peaks.toFixed(1) + ' px）');
  ok(walls.peaks > open.peaks + 2, '有牆比沒牆明顯更彈（' + walls.peaks.toFixed(1) + ' vs ' + open.peaks.toFixed(1) + ' px）');

  // path 節點要帶 w 旗標
  const cart = G.players[1];
  cart.cart = true; cart.alive = true;
  cart.x = 6 * T + T / 2; cart.y = 0 * T + T / 2;
  G.grid[2][6] = 1; G.grid[3][6] = 1;
  const land = P.cartPickLanding(cart, 0);
  ok(!!land, '集氣最短也能算落點');
  ok(land.path.some(function (n) { return n.w === 1; }), '路徑有標記「牆的那一格」');
  ok(land.path.filter(function (n) { return n.w === 1; }).length === 2, '兩格牆都標到了',
    land.path.filter(function (n) { return n.w === 1; }).length);

  const src = require('fs').readFileSync(__dirname + '/../index.html', 'utf8');
  ok(/const fhop = c\.w \? Math\.sin\(k \* Math\.PI\) \* T \* \.46 : 0;/.test(src), '只有 w=1 的段落才加彈跳');
  ok(/const farc = Math\.sin\(fprog \* Math\.PI\) \* T \* \.52;/.test(src), '整段飛行只走一次拋物線');
}

console.log('\n========================================');
console.log((fail === 0 ? '✅ ' : '❌ ') + 'v4.39：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
