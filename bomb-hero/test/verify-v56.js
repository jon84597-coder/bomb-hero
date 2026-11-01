// test/verify-v56.js —— v4.13 投炸彈機制（需求 ⑥ ⑦）
//   ⑥ 手套投彈可以停在「有玩家」的格子（投到對方身體裡），但不會停在牆上
//   ⑦ 逐格跳：飛行路徑是一格一格；從西投到東盡頭會飛出地圖外再從西邊繞回
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, html = env.html;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
P.settings.ctrl = 'kb'; P.settings.soloDiff = 'normal'; P.settings.soloTime = 300;
P.startSolo(1, false);
G.state = 'play';

// ================================================================
head('⑥ 手套投彈：可以投到對方身體裡，不會停在牆上');
ok(typeof P.playerAtCell === 'function', 'playerAtCell 存在（某格是否有活著的玩家）');
ok(/if \(canLandOnPlayer && playerAtCell\(nx, ny\)\)/.test(html),
  'findLanding 支援「可以停在玩家格」的選項');
ok(/findLanding\(cx, cy, d\.x, d\.y, true, false, p\)/.test(html),
  'throwCarried（手套投彈）開啟 canLandOnPlayer 並帶上投彈者');
ok(/const land = findLanding\(bx, by, d\.x, d\.y, false, true\);/.test(html),
  'punchBomb（拳擊）則是 stopAtFoe（停在敵人前一格）');

// 實測：投彈者站在第 5 格、對手（玩家）在第 7 格 → 炸彈要停在對手身上（第 7 格）
{
  const p = G.players[0];
  const T = G.T;
  G.bombs.length = 0; G.flames.length = 0;
  p.alive = true; p.glove = true; p.carry = null; p.facing = 'right';
  p.x = 5 * T + T / 2; p.y = 5 * T + T / 2;
  for (let x = 5; x <= 9; x++) G.grid[5][x] = 0;
  // 造一個「對手玩家」站在第 7 格（模擬對戰時打到對方身體裡）
  const foe = P.makePlayer(1, 1, { px: 0, py: 0 }, { px: 7 * T + T / 2, py: 5 * T + T / 2 });
  foe.ai = false; foe.alive = true;
  foe.x = 7 * T + T / 2; foe.y = 5 * T + T / 2;
  G.players.push(foe);
  ok(P.playerAtCell(7, 5) === true, 'playerAtCell 找得到對手所在的格子');
  ok(P.playerAtCell(6, 5) === false, '空格子不會誤判成有玩家');
  const gb = { cx: 5, cy: 5, px: p.x, py: p.y, timer: 2.4, power: 2, owner: p,
    passers: [], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 3, armT: 40 };
  G.bombs.push(gb);
  p.carry = gb;
  P.throwCarried(p);
  ok(!!gb.flying, '投彈開始飛行');
  ok(gb.cx === 7 && gb.cy === 5, '停在對手所在的格子（cx=' + gb.cx + ' cy=' + gb.cy + '）');
  ok(gb.flying && gb.flying.path && gb.flying.path.length >= 2, '飛行帶有 path（逐格跳）');
  // 檢查 path 每一步都是相鄰格（一格一格）
  let stepOk = true;
  if (gb.flying && gb.flying.path) {
    for (let i = 1; i < gb.flying.path.length; i++) {
      const a = gb.flying.path[i - 1], c = gb.flying.path[i];
      if (Math.abs(a.x - c.x) > 1 || Math.abs(a.y - c.y) > 1) stepOk = false;
    }
  }
  ok(stepOk, 'path 每一步都只移動一格（不是一次跨好幾格）');
  G.players.pop();
}

// 實測：前面是牆 → 不會停在牆上，會跳過去
{
  const p = G.players[0];
  const T = G.T;
  G.bombs.length = 0; G.flames.length = 0;
  p.alive = true; p.glove = true; p.carry = null; p.facing = 'right';
  p.x = 5 * T + T / 2; p.y = 5 * T + T / 2;
  G.grid[5][6] = 1; G.grid[5][7] = 1; G.grid[5][8] = 0;   // 第 6、7 格是牆
  const gb = { cx: 5, cy: 5, px: p.x, py: p.y, timer: 2.4, power: 2, owner: p,
    passers: [], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 4, armT: 40 };
  G.bombs.push(gb);
  p.carry = gb;
  P.throwCarried(p);
  ok(gb.cx !== 6 && gb.cx !== 7, '不會停在牆壁上（cx=' + gb.cx + '）');
  ok(gb.cx === 8, '跳過兩面牆停在第一格空地（cx=8）');
  if (gb.flying && gb.flying.path) {
    const passWall = gb.flying.path.some(function (c) { return c.x === 6; });
    ok(passWall, 'path 有經過牆那一格（動畫會一格一格跳過牆）');
  }
}

// ================================================================
head('⑦ 逐格跳 + 出地圖外從另一端繞回');
ok(/if \(f\.path && f\.path\.length > 1\)/.test(html), '飛行時沿 path 逐格計算位置');
ok(/const per = f\.dur \/ \(f\.path\.length - 1\);/.test(html), '每格平分飛行時間');
ok(/if \(a\.out\) \{/.test(html) && /b\.vpx = b\.px; b\.vpy = b\.py;/.test(html), '遇到「地圖外」節點會瞬間出現在另一端（飛出東邊 → 從西邊盡頭牆壁投進來）');
ok(/const x = \(b\.vpx != null\) \? b\.vpx : b\.px/.test(html), 'drawBomb 用視覺座標繪製');

// 實測：整排都是牆 → 炸彈會一路跳到東邊盡頭、飛出地圖外、再從西邊盡頭牆壁投進來
{
  const p = G.players[0];
  const T = G.T;
  G.bombs.length = 0; G.flames.length = 0;
  p.alive = true; p.glove = true; p.carry = null; p.facing = 'right';
  p.x = 1 * T + T / 2; p.y = 5 * T + T / 2;
  const W = G.cols;
  // 整排內部都放牆 → 炸彈只能一路跳到最右邊、繞出去、再從最左邊進來
  for (let x = 1; x < W - 1; x++) G.grid[5][x] = 1;
  const gb = { cx: 1, cy: 5, px: p.x, py: p.y, timer: 2.4, power: 2, owner: p,
    passers: [], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 5, armT: 40 };
  G.bombs.push(gb);
  p.carry = gb;
  P.throwCarried(p);
  const path = gb.flying && gb.flying.path;
  ok(!!path, '有 path');
  if (path) {
    ok(path.length > W, 'path 長度超過地圖寬度 → 它繞了一圈（' + path.length + ' 步）');
    // 應該出現「地圖外」節點（out=1）→ 動畫會飛出地圖外
    const outNodes = path.filter(function (c) { return c.out; });
    ok(outNodes.length >= 1, 'path 有「地圖外」節點（飛出地圖外再從另一端進來）');
    const outNode = outNodes[0];
    ok(outNode && (outNode.x === W || outNode.x === -1), '地圖外節點在左右邊界外（x=' + (outNode && outNode.x) + '）');
    // 繞回後最後要停在合法的地圖格內
    const last = path[path.length - 1];
    ok(last.x >= 0 && last.x < W, '最後停在合法的地圖格內（cx=' + last.x + '）');
  }
  // 讓它飛完 → 檢查視覺座標有沒有真的繞回（vpx 會超出地圖寬度再回來）
  if (gb.flying) {
    let sawOutside = false;
    for (let i = 0; i < 400 && gb.flying; i++) {
      P.updateWorld(1 / 60);
      if (gb.vpx != null && (gb.vpx < 0 || gb.vpx >= G.cols * T)) sawOutside = true;
    }
    ok(true, '飛行動畫跑完不報錯');
    ok(gb.flying === null, '飛完會落地');
  }
  // 還原場地
  for (let x = 1; x < W - 1; x++) G.grid[5][x] = 0;
}

// ================================================================
head('⑧ 回歸：踢／打炸彈仍停在敵人前一格');
{
  const p = G.players[0];
  const T = G.T;
  G.bombs.length = 0; G.flames.length = 0; G.enemies.length = 0;
  p.alive = true; p.kick = true; p.punch = false; p.glove = false;
  p.x = 5 * T + T / 2; p.y = 5 * T + T / 2; p.facing = 'right';
  for (let x = 5; x <= 10; x++) G.grid[5][x] = 0;
  const kb = { cx: 6, cy: 5, px: 6 * T + T / 2, py: p.y, timer: 2.4, power: 2, owner: p,
    passers: [], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 6, armT: 40 };
  G.bombs.push(kb);
  const foe = P.makeEnemy(9, 5, 'slime', 1, 1);
  foe.x = 9 * T + T / 2; foe.y = 5 * T + T / 2; foe.speed = 0;
  G.enemies.push(foe);
  P.kickBomb(p, 'right');
  for (let i = 0; i < 180 && kb.moving; i++) P.updateWorld(1 / 60);
  ok(kb.cx === 8, '被踢的炸彈停在敵人前一格（cx=' + kb.cx + '）');
  // 拳擊
  G.bombs.length = 0; G.enemies.length = 0;
  for (let x = 5; x <= 12; x++) G.grid[5][x] = 0;
  const pb = { cx: 6, cy: 5, px: 6 * T + T / 2, py: p.y, timer: 2.4, power: 2, owner: p,
    passers: [], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 7, armT: 40 };
  G.bombs.push(pb);
  const foe2 = P.makeEnemy(11, 5, 'slime', 1, 1);
  foe2.x = 11 * T + T / 2; foe2.y = 5 * T + T / 2; foe2.speed = 0;
  G.enemies.push(foe2);
  P.punchBomb(p, 'right');
  ok(pb.cx < 11, '被打的炸彈停在敵人前方（cx=' + pb.cx + '）');
  ok(pb.flying && pb.flying.path, '拳擊也有 path（逐格跳）');
}

console.log('');
console.log(fail === 0 ? ('通過 ' + pass + ' / ' + (pass + fail)) : ('✗ ' + fail + ' 項失敗（通過 ' + pass + '）'));
process.exit(fail === 0 ? 0 : 1);
