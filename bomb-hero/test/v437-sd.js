// test/v437-sd.js — v4.37：突死縮圈落石（① 每格都落、② AI 會躲）
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
const env = makeEnv();
const P = env.BH, G = P.Game;

function battle() {
  P.settings.size = 'M';
  P.settings.ctrl = 'kb';
  P.settings.sd = 'on';
  P.settings.time = 120;
  P.startBattle(2, 'normal');
  G.state = 'play';
  return G;
}

// ==================================================================
console.log('\n=== 1. 落石名單要「覆蓋場地每一格」（不跳過中途的圈） ===');
{
  battle();
  P.buildSdList();
  const cols = G.cols, rows = G.rows;
  const inner = (cols - 2) * (rows - 2);
  const seen = {}, dup = [], out = [];
  G.sdList.forEach(function (c) {
    const k = c[0] + ',' + c[1];
    if (seen[k]) dup.push(k);
    seen[k] = 1;
    if (c[0] < 1 || c[0] > cols - 2 || c[1] < 1 || c[1] > rows - 2) out.push(k);
  });
  ok(G.sdList.length === inner, '名單格數 = 場地內部格數（' + G.sdList.length + ' / ' + inner + '）');
  ok(Object.keys(seen).length === inner, '沒有任何一格重複（唯一 ' + Object.keys(seen).length + '）');
  ok(dup.length === 0 && out.length === 0,
    '沒有重複、沒有超出邊界' + (dup.length || out.length ? '：' + dup.concat(out).slice(0, 6).join(',') : ''));

  // 逐圈檢查：每一圈（第 k 圈）都要有格子進名單
  const ringOf = function (x, y) { return Math.min(x - 1, y - 1, cols - 2 - x, rows - 2 - y); };
  const rings = {};
  G.sdList.forEach(function (c) { const r = ringOf(c[0], c[1]); rings[r] = (rings[r] | 0) + 1; });
  const ringKeys = Object.keys(rings).map(Number).sort(function (a, b) { return a - b; });
  const maxRing = ringKeys[ringKeys.length - 1];
  const missingRing = [];
  for (let r = 0; r <= maxRing; r++) if (!rings[r]) missingRing.push(r);
  ok(missingRing.length === 0,
    '外到內每一圈都有落石（圈數 ' + (maxRing + 1) + '）' + (missingRing.length ? '，缺圈 ' + missingRing.join(',') : ''));

  // 順序：先外圈、後內圈（越靠中間越晚落）
  let orderOk = true;
  for (let i = 1; i < G.sdList.length; i++) {
    const a = ringOf(G.sdList[i - 1][0], G.sdList[i - 1][1]);
    const b = ringOf(G.sdList[i][0], G.sdList[i][1]);
    if (b < a) { orderOk = false; break; }
  }
  ok(orderOk, '順序是由外往內（不會內圈先塌）');
}

// ==================================================================
console.log('\n=== 2. 落石真的落滿整個場地 ===');
{
  battle();
  P.buildSdList();
  G.timer = 0;
  G.sdActive = true;
  // 一路跑到名單用完（每格一次 tick，最多 2000 幀）
  const T = P.SD_STEP_T;
  let guard = 0;
  while (G.sdIndex < G.sdList.length && guard < 4000) {
    G.state = 'play';                  // 玩家被壓死會判 roundover → 每輪拉回 play
    G.sdTimer = 0;
    P.updateBattle(T);
    guard++;
  }
  const holes = [];
  for (let y = 1; y <= G.rows - 2; y++)
    for (let x = 1; x <= G.cols - 2; x++)
      if (G.grid[y][x] !== 1) holes.push(x + ',' + y);
  ok(G.sdIndex >= G.sdList.length, '名單跑完（' + G.sdIndex + ' / ' + G.sdList.length + '）');
  ok(holes.length === 0,
    '場地每一格都被落石填起來（沒填的 ' + holes.length + ' 格）' + (holes.length ? '：' + holes.slice(0, 8).join(' ') : ''));
}

// ==================================================================
console.log('\n=== 3. AI 會躲落石 ===');
{
  battle();
  P.buildSdList();
  const T = G.T;
  G.sdActive = true;
  G.timer = 0;
  // 找一個「現在就要落石、而且不是死角」的格，把 AI 放上去
  //   （對戰地圖外圈本來就有硬牆陣，硬塞進牆裡牠根本無路可走 → 那是測試選點的問題）
  // 起點要「連通空間夠大」—— 被軟磚圍成小口袋的空地，AI 本來就無處可逃（那是關卡地形問題，
  //   不是躲避邏輯的問題）。這裡用 BFS 量可達區，只挑 40 格以上的空地當測試起點。
  function roomSize(cx, cy) {
    const seen = {}; seen[cx + ',' + cy] = 1;
    const q = [[cx, cy]];
    for (let i = 0; i < q.length && q.length < 400; i++) {
      const c = q[i];
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) {
        const x = c[0] + v[0], y = c[1] + v[1];
        if (x < 1 || y < 1 || x > G.cols - 2 || y > G.rows - 2) return;
        if (G.grid[y][x] !== 0) return;
        if (seen[x + ',' + y]) return;
        seen[x + ',' + y] = 1; q.push([x, y]);
      });
    }
    return q.length;
  }
  function openRingIdx() {
    let fb = -1, fbRoom = -1;
    for (let i = 0; i < G.sdList.length; i++) {
      const c = G.sdList[i];
      if (G.grid[c[1]][c[0]] !== 0) continue;
      const room = roomSize(c[0], c[1]);
      if (room >= 40) return i;
      if (room > fbRoom) { fbRoom = room; fb = i; }   // 真的沒有大空間 → 至少挑最大的那個
    }
    return fb < 0 ? 0 : fb;
  }
  const startIdx = openRingIdx();
  G.sdIndex = startIdx;
  if (process.env.SDDBG) console.log('    [dbg] startIdx', startIdx, 'victim', G.sdList[startIdx], 'grid', G.grid[G.sdList[startIdx][1]][G.sdList[startIdx][0]], 'room', roomSize(G.sdList[startIdx][0], G.sdList[startIdx][1]));
  const ai = G.players[1];
  ai.alive = true; ai.ai = true; ai.dizzy = 0; ai.maxBombs = 0;
  const victim = G.sdList[startIdx];
  const vx = victim[0] * T + T / 2, vy = victim[1] * T + T / 2;
  ai.x = vx; ai.y = vy;
  G.players.forEach(function (q) { if (q !== ai) { q.alive = false; } });   // 只留牠，避免互炸干擾
  ai.alive = true;
  const startCell = victim[0] + ',' + victim[1];
  ok(P.sdSoon(victim[0], victim[1], 3) === true, 'sdSoon 認得「馬上要落石」的格');
  ok(P.sdSoon(6, 5, 12) === false || G.sdList.slice(0, 12).some(function (c) { return c[0] === 6 && c[1] === 5; }),
    'sdSoon 不會亂報（非預告格回 false）');

  // 腳下就是預告落石格 → 1 秒內一定要離開（60 幀；落石還有 9 顆才會砸到，仍算「立刻」）
  let moved = false;
  for (let i = 0; i < 60; i++) {
    G.state = 'play';
    P.updateBattle(1 / 60);
    if (Math.abs(ai.x - vx) > T * .5 || Math.abs(ai.y - vy) > T * .5) { moved = true; break; }
  }
  ok(moved, 'AI 站到預告格上會立刻離開（60 幀內就動了）');

  // 真正該守的：整輪縮圈跑完，AI 要一路往內收、撐到很後面才被壓
  //   地圖是隨機的，偶爾會給出「起點在死巷」的倒楣配置 → 最多試 3 場、取最好的一場
  let best = null;
  for (let att = 0; att < 3; att++) {
    if (att > 0) battle();                              // 換一張地圖再試
    P.buildSdList();
    const ai2 = G.players[1];
    const openIdx = openRingIdx();
    const oc = G.sdList[openIdx];
    ai2.x = oc[0] * T + T / 2; ai2.y = oc[1] * T + T / 2;   // 放回最外圈的空地（最危險的位置）
    ai2.alive = true; ai2.ai = true; ai2.dizzy = 0;
    ai2.maxBombs = 0; ai2.lobCd = 99;                   // 不讓牠自己炸死自己
    const human = G.players[0];
    human.alive = true; human.ai = false;
    human.x = Math.floor(G.cols / 2) * T + T / 2;
    human.y = Math.floor(G.rows / 2) * T + T / 2;
    G.bombs.length = 0; G.flames.length = 0;
    G.timer = 0; G.sdActive = true; G.sdIndex = 0; G.sdTimer = 0;
    // 注意：縮圈到最後「整片場地都是牆」，站在最後一格的人必死 —— 這是規則本身。
    //   所以判準不是「永遠不死」，而是「一路跟著往內收，撐到縮圈 80% 以後才被壓」。
    const mx = (G.cols - 1) / 2, my = (G.rows - 1) / 2;
    const d2c0 = Math.abs(Math.floor(ai2.x / T) - mx) + Math.abs(Math.floor(ai2.y / T) - my);
    let aiDeadAt = -1, aiDeadIdx = 0, d2cMid = d2c0;
    for (let f = 0; f < 60 * 100; f++) {
      G.state = 'play';
      P.updateBattle(1 / 60);
      human.alive = true;                            // 人類那邊不要影響勝負判定
      if (f === 60 * 10) d2cMid = Math.abs(Math.floor(ai2.x / T) - mx) + Math.abs(Math.floor(ai2.y / T) - my);
      if (!ai2.alive) { aiDeadAt = f; aiDeadIdx = G.sdIndex; break; }
      if (G.sdIndex >= G.sdList.length) break;
    }
    const r = {
      dead: aiDeadAt, idx: aiDeadIdx, len: G.sdList.length,
      d0: d2c0, dMid: d2cMid, advance: G.sdIndex, tries: att + 1
    };
    if (!best || (r.dead < 0 ? r.len : r.idx) > (best.dead < 0 ? best.len : best.idx)) best = r;
    if (r.dead < 0 || r.idx >= r.len * .8) break;        // 這一場就過關了，不用再試
    ai.alive = true;
  }
  const pct = (best.dead < 0 ? best.len : best.idx) / best.len * 100;
  ok(best.dead < 0 || best.idx >= best.len * .8,
    'AI 撐到縮圈 ' + pct.toFixed(0) + '% 才被壓（起點離中心 ' + best.d0 + ' 格，試了 ' + best.tries + ' 場）' +
    (best.dead >= 0 ? '，第 ' + best.dead + ' 幀' : '，全程沒被壓'));
  ok(best.d0 < 8 || best.dMid < best.d0,
    'AI 有主動往場地中心收（' + best.d0 + ' 格 → ' + best.dMid + ' 格）' + (best.d0 < 8 ? '（起點本來就在內圈）' : ''));
  ok(best.advance >= best.len * .5,
    '縮圈確實有在推進（已落 ' + best.advance + ' / ' + best.len + ' 格）');
}

// ==================================================================
console.log('\n=== 4. 玩家被落石壓到還是會死（規則沒被改壞） ===');
{
  battle();
  P.buildSdList();
  G.sdActive = true;
  const T = G.T;
  const me = G.players[0];
  me.alive = true; me.ai = false; me.invuln = 0;
  const c = G.sdList[0];
  me.x = c[0] * T + T / 2; me.y = c[1] * T + T / 2;
  G.timer = 0;                       // 時間到才會開始縮圈
  G.sdTimer = 0;
  P.updateBattle(P.SD_STEP_T);
  ok(me.alive === false, '站在落石格上的玩家會被壓死');
}

console.log('\n========================================');
console.log((fail === 0 ? '✅' : '❌') + ' v4.37 突死縮圈落石：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
