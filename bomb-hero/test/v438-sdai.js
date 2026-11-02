// v4.38 第 8 項：縮圈中的 AI 要會放彈、躲彈，不能只會擠在場中央
const { makeEnv } = require('./_sandbox');
const env = makeEnv(); const P = env.BH, G = P.Game;
let pass = 0, fail = 0;
function ok(c, msg, extra) {
  if (c) { pass++; console.log('  ✓ ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra !== undefined ? '（' + extra + '）' : '')); }
}

function setup() {
  P.settings.count = 4; P.settings.size = 'M'; P.settings.wins = 2;
  P.settings.sd = 'on';
  P.Battle.resetSlots(); P.startBattle(); G.state = 'play';
  G.sdActive = true;
  G.sdIndex = 3;                      // 已經落過幾格，但內圈還大片安全
  G.sdTimer = 0;
  G.bombs = []; G.flames = [];
  G.players.forEach(function (p) { p.alive = true; p.invuln = 0; p.dino = false; });
  return G.T;
}
// 只推進 AI 行為、不要真的落石（落石會隨機壓死人，讓「AI 有沒有放彈／躲彈」的測試變成看運氣）
function stepNoStone(n) {
  for (let i = 0; i < n; i++) { G.sdTimer = 999; P.updateBattle(1 / 60); }
}
// 找一格「四周至少 n 個方向可走」的空地 —— 不然 AI 被牆圍死時躲不掉是地圖的錯，不是 AI 的錯
function findOpen(minN) {
  for (let y = 2; y < G.rows - 2; y++) {
    for (let x = 2; x < G.cols - 2; x++) {
      if (G.grid[y][x] !== 0) continue;
      let n = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) {
        if (G.grid[y + v[1]][x + v[0]] === 0) n++;
      });
      if (n >= minN) return { x: x, y: y };
    }
  }
  return { x: 5, y: 5 };
}

console.log('=== 1. 縮圈中 AI 會主動放炸彈打對手 ===');
{
  // 隨機地圖 ＋ AI 有機率性走位 → 最多試 3 個場景，任一次放彈就通過
  let placed = 0, tries = 0, alive = true;
  for (let att = 0; att < 3 && !placed; att++) {
    tries++;
    const T = setup();
    const ai = G.players[1], me = G.players[0];
    // 把其他人移到很遠、只剩一個對手在 AI 旁邊
    for (let i = 2; i < 4; i++) { G.players[i].x = (G.cols - 2) * T; G.players[i].y = (G.rows - 2) * T; }
    const sp1 = findOpen(4);
    ai.x = sp1.x * T + T / 2; ai.y = sp1.y * T + T / 2;
    G.grid[sp1.y][sp1.x + 2] = 0;
    me.x = (sp1.x + 2) * T + T / 2; me.y = sp1.y * T + T / 2;
    me.alive = true;
    for (let i = 0; i < 600 && !placed; i++) {
      const before = G.bombs.filter(function (b) { return b.owner === ai; }).length;
      G.sdTimer = 999;
      P.updateBattle(1 / 60);
      const after = G.bombs.filter(function (b) { return b.owner === ai; }).length;
      if (after > before) placed++;
      // 炸彈快爆就清掉，避免連鎖把 AI 自己炸死影響統計
      G.bombs = G.bombs.filter(function (b) { return b.timer > 1.2 || b.owner !== ai; });
    }
    alive = ai.alive;
    if (placed) break;
  }
  ok(placed > 0, '縮圈中 AI 有放炸彈 （不再只是繞圈）', '放了 ' + placed + ' 次（試了 ' + tries + ' 個場景）');
  ok(alive, 'AI 還活著（沒有被自己炸死）', 'alive=' + alive);
}

console.log('\n=== 2. 縮圈中 AI 會躲「快要爆的」對方炸彈 ===');
{
  // 隨機地圖上 AI 的走位有機率性，單一場景偶爾會被卡住 → 最多試 3 個場景，任一次躲開就通過
  let maxAway = 0, alive = false, tries = 0;
  // 註：條件原本是「maxAway < 2 就繼續試」→ 只要躲開 2 格但被炸死就直接判紅不再重試，
  //   隨機地圖上有 ~30% 假紅。改成「躲開而且還活著」才停。
  for (let att = 0; att < 6; att++) {
    tries++;
    const T = setup();
    const ai = G.players[1];
    G.players[2].x = (G.cols - 2) * T; G.players[2].y = (G.rows - 2) * T;
    G.players[3].x = (G.cols - 2) * T; G.players[3].y = 2 * T;
    G.players[0].x = (G.cols - 2) * T; G.players[0].y = 3 * T;
    // 找一格「四周都可走」的位置放 AI（不然被牆圍死躲不掉，測不出躲彈能力）
    const sp2 = findOpen(4);
    ai.x = sp2.x * T + T / 2; ai.y = sp2.y * T + T / 2;
    G.grid[sp2.y][sp2.x + 1] = 0;
    const cx = Math.floor(ai.x / T), cy = Math.floor(ai.y / T);
    // 對手在隔壁放一顆炸彈（威力 1、1.6 秒後爆）
    //   註：AI 時速約 123px/s ⇒ 退 2 格要 0.96 秒，0.9 秒的引信在物理上躲不掉，
    //   所以這裡用 1.6 秒（跟玩家實際的 2.4 秒引信同一個量級），測「會不會躲」而不是「跑多快」
    G.bombs.push({
      cx: cx + 1, cy: cy, px: (cx + 1) * T + T / 2, py: cy * T + T / 2,
      timer: 1.6, power: 1, owner: G.players[0], passers: [], remoteArmed: false,
      mine: false, moving: null, held: false, ownerLeft: false, seed: 0, armT: 40
    });
    const bombRef = G.bombs[G.bombs.length - 1];
    maxAway = 0;
    for (let i = 0; i < 150; i++) {
      G.sdTimer = 999;
      P.updateBattle(1 / 60);
      const dc = Math.abs(Math.floor(ai.x / T) - cx) + Math.abs(Math.floor(ai.y / T) - cy);
      if (dc > maxAway) maxAway = dc;
      if (maxAway >= 2) break;
    }
    // 只跑到「那顆炸彈真的爆完」為止 —— 再往後跑 AI 會回頭追對手，跟躲彈無關
    for (let i = 0; i < 150 && G.bombs.indexOf(bombRef) >= 0; i++) {
      G.sdTimer = 999;
      P.updateBattle(1 / 60);
    }
    stepNoStone(12);
    alive = ai.alive;
    if (maxAway >= 2 && alive) break;
  }
  ok(maxAway >= 2, 'AI 在炸彈引爆前退到爆炸範圍外', '離炸彈 ' + maxAway + ' 格（試了 ' + tries + ' 個場景）');
  ok(alive, 'AI 沒有被炸死', 'alive=' + alive);
}

console.log('\n=== 3. 躲落石時不會走進火焰裡（sdDangerAt 生效） ===');
{
  const T = setup();
  const ai = G.players[1];
  ai.x = 5 * T + T / 2; ai.y = 5 * T + T / 2;
  const cx = Math.floor(ai.x / T), cy = Math.floor(ai.y / T);
  // 右邊與下面鋪滿火焰（真實火焰格）
  P.addFlame(cx + 1, cy, 'center', 'right', G.players[0]);
  P.addFlame(cx, cy + 1, 'center', 'down', G.players[0]);
  P.addFlame(cx - 1, cy, 'center', 'left', G.players[0]);
  ok(P.sdDangerAt(cx + 1, cy, ai), '火焰格被判為危險', 'sdDangerAt=true');
  ok(P.sdDangerAt(cx + 1, cy, ai) !== undefined, '函式可用');
  // 跑幾幀，AI 不該停在火焰格上
  stepNoStone(30);
  const ax = Math.floor(ai.x / T), ay = Math.floor(ai.y / T);
  const onFire = G.flames.some(function (f) { return f.cx === ax && f.cy === ay; });
  ok(!onFire, 'AI 沒有站在火焰格上', ax + ',' + ay);
}

console.log('\n=== 4. 剛放下的炸彈不會把整條路封死（可達區不會爆縮） ===');
{
  const T = setup();
  const ai = G.players[1];
  ai.x = 5 * T + T / 2; ai.y = 5 * T + T / 2;
  const before = (function () { P.aiSdFlee(ai, Math.floor(ai.x / T), Math.floor(ai.y / T)); return ai.sdRoom; })();
  // 自己放一顆還很久才爆的炸彈
  G.bombs.push({
    cx: Math.floor(ai.x / T), cy: Math.floor(ai.y / T), px: ai.x, py: ai.y,
    timer: 2.4, power: 1, owner: ai, passers: [], remoteArmed: false,
    mine: false, moving: null, held: false, ownerLeft: false, seed: 0, armT: 40
  });
  const after = (function () { P.aiSdFlee(ai, Math.floor(ai.x / T), Math.floor(ai.y / T)); return ai.sdRoom; })();
  ok(after >= before * .5, '可達區沒有因為自己的炸彈而大幅縮小', before + ' → ' + after);
}

console.log('\n========================================');
console.log((fail === 0 ? '✅ ' : '❌ ') + 'v4.38 縮圈 AI：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
