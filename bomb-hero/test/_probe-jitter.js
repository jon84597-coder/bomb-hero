// test/_probe-jitter.js —— v5.68 探針：量化「BOSS／AI 左右抖動」
//   抖動 = 位移方向（或決策方向）在相鄰幀之間反覆翻面。
//   正常追人應該「往前走」，只有在閃炸彈／繞牆時才會改變方向。
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

function flat(cols, rows) {
  G.cols = cols; G.rows = rows; G.T = 40;
  G.grid = [];
  for (let y = 0; y < rows; y++) {
    const r = [];
    for (let x = 0; x < cols; x++) r.push(0);
    G.grid.push(r);
  }
  for (let x = 0; x < cols; x++) { G.grid[0][x] = 1; G.grid[rows - 1][x] = 1; }
  for (let y = 0; y < rows; y++) { G.grid[y][0] = 1; G.grid[y][cols - 1] = 1; }
  G.bombs = []; G.flames = []; G.items = []; G.foes = []; G.pets = [];
  G.mode = 'solo'; G.state = 'play'; G.paused = false;
  G.teamsOn = 0; G.daily = false; G.bossRush = false; G.rpg = false;
  G.sdActive = false; G.brZone = null; G.bossArena = null; G.cart = null;
}
function mkPlayer(cx, cy) {
  return {
    x: (cx + .5) * G.T, y: (cy + .5) * G.T, alive: true, dead: false, ai: false,
    lives: 9, hp: 9, hpMax: 9, sHp: 9, sHpMax: 9, r: 14, facing: 'down', invuln: 9999,
    score: 0, maxBombs: 1, power: 1, speed: 1, team: 0, moving: false, walkT: 0,
    dirName: 'down', air: 0, dashT: 0, dashCd: 0, dizzy: 0, lobCd: 0, carry: 0, cart: null,
    buffs: {}, skullT: 0, beltMul: 1
  };
}

/* ---------------- BOSS：固定玩家位置，看牠走多久會翻面 ---------------- */
function bossRun(label, ddx, ddy) {
  flat(23, 23);
  G.players = [mkPlayer(11, 12)];
  G.players[0].x += ddx;             // 讓玩家稍微偏一點（模擬玩家在旁邊晃）
  G.players[0].y += ddy;
  const boss = P.makeBoss(11, 9, 99999);
  boss.skillCd = 1e9; boss.bombT = 1e9;
  let flips = 0, lastVx = 0, moved = 0, minX = 1e9, maxX = -1e9;
  const N = 60 * 8;
  for (let i = 0; i < N; i++) {
    const ox = boss.x;
    try { P.updateBoss(boss, 1 / 60); } catch (e) { console.log('  updateBoss 例外:', e.message); break; }
    G.bombs.length = 0; G.flames.length = 0;
    boss.bombT = 1e9; boss.skillCd = 1e9;
    const vx = boss.x - ox;
    if (Math.abs(vx) > .01) {
      moved += Math.abs(vx);
      if (lastVx !== 0 && Math.sign(vx) !== Math.sign(lastVx)) flips++;
      lastVx = vx;
    }
    if (boss.x < minX) minX = boss.x;
    if (boss.x > maxX) maxX = boss.x;
  }
  console.log('  ' + label + '｜左右翻面 ' + flips + ' 次／8 秒，位移 ' + Math.round(moved) +
    'px，橫向振幅 ' + Math.round(maxX - minX) + 'px，終點 (' +
    Math.round(boss.x) + ',' + Math.round(boss.y) + ')');
  return { flips: flips, span: Math.round(maxX - minX) };
}

console.log('=== BOSS 追人（玩家在下方） ===');
const b1 = bossRun('玩家正下方 3 格', 6, 3 * 40);
const b2 = bossRun('玩家斜下方 2.2 格', 2 * 40 + 10, 2 * 40);
const b3 = bossRun('玩家貼身 1.4 格', 1 * 40 + 10, 1 * 40);

/* ---------------- BOSS 巡邏（沒有仇恨） ---------------- */
function patrolRun() {
  flat(23, 23);
  G.players = [mkPlayer(2, 2)];              // 玩家遠遠的 → 沒有仇恨
  const boss = P.makeBoss(11, 11, 99999);
  boss.skillCd = 1e9; boss.bombT = 1e9;
  let flips = 0, lastVx = 0, moved = 0;
  for (let i = 0; i < 60 * 20; i++) {
    const ox = boss.x;
    try { P.updateBoss(boss, 1 / 60); } catch (e) { console.log('  例外:', e.message); break; }
    G.bombs.length = 0; G.flames.length = 0;
    boss.bombT = 1e9; boss.skillCd = 1e9;
    const vx = boss.x - ox;
    if (Math.abs(vx) > .01) {
      moved += Math.abs(vx);
      if (lastVx !== 0 && Math.sign(vx) !== Math.sign(lastVx)) flips++;
      lastVx = vx;
    }
  }
  console.log('  巡邏 20 秒｜左右翻面 ' + flips + ' 次，位移 ' + Math.round(moved) + 'px');
  return flips;
}
console.log('\n=== BOSS 巡邏（無仇恨） ===');
const b4 = patrolRun();

/* ---------------- AI 玩家：互相追 ---------------- */
function aiRun() {
  flat(27, 21);
  G.players = [];
  for (let i = 0; i < 5; i++) {
    const p = mkPlayer(3 + i * 5, 6 + (i % 2) * 8);
    p.ai = true; p.buffs = {}; p.tick = 0;
    G.players.push(p);
  }
  const flips = new Array(G.players.length).fill(0);
  const last = new Array(G.players.length).fill(null);
  const moved = new Array(G.players.length).fill(0);
  const OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
  for (let i = 0; i < 60 * 12; i++) {
    for (let k = 0; k < G.players.length; k++) {
      const p = G.players[k];
      if (!p.alive) continue;
      const ox = p.x, oy = p.y;
      try { P.controlAI(p, 1 / 60); } catch (e) { if (i === 0) console.log('  controlAI 例外:', e.message); break; }
      if (p.aiDir && last[k] && OPP[last[k]] === p.aiDir) flips[k]++;
      if (p.aiDir) last[k] = p.aiDir;
      moved[k] += Math.abs(p.x - ox) + Math.abs(p.y - oy);
    }
  }
  const total = flips.reduce(function (a, b) { return a + b; }, 0);
  const mv = moved.reduce(function (a, b) { return a + b; }, 0);
  console.log('  5 個 AI／12 秒｜「左右（上下）立刻反向」合計 ' + total + ' 次，分佈 ' + JSON.stringify(flips));
  console.log('  　　　　　　　　　 位移合計 ' + Math.round(mv) + 'px，分佈 ' +
    JSON.stringify(moved.map(function (v) { return Math.round(v); })));
  return total;
}
console.log('\n=== AI 角色互相追（大逃殺參數） ===');
G.brZone = null;
P.BR_AI.on = false;
const a1 = aiRun();
P.BR_AI.on = true;
const a2 = aiRun();

console.log('\n=== 判定 ===');
function verdict(name, v, limit) {
  console.log('  ' + (v <= limit ? '✓' : '✗') + ' ' + name + '：' + v + '（上限 ' + limit + '）');
}
verdict('BOSS 追人翻面', b1.flips + b2.flips + b3.flips, 6);
verdict('BOSS 巡邏翻面', b4, 4);
verdict('AI 反向', a1, 10);
verdict('AI 反向（大逃殺）', a2, 10);
