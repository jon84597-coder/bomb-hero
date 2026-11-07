// verify-v530.js — 格血（HP）機制：被打到只掉一格，格數見底才倒下
//   （v5.31 難度表：簡單 3 格／普通 2 格／困難 1 格；測試一律用 soloHpMax() 取值，不寫死）
//   ① 每扣一格都還活著（不進死亡／重生流程）
//   ② 無敵期間同一團火不會再扣一格
//   ③ 血格見底才倒下（命數 -1）
//   ④ 困難・每日挑戰・BOSS 連戰都是一擊倒
//   ⑤ 恐龍先擋一次，血格不動
//   ⑥ ❤️ 愛心在格血模式補一格血（封頂），其他模式仍補命
//   ⑦ RPG／對戰不走這條路
const fs = require('fs');
const path = require('path');
const { makeEnv, vlog } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game, S = P.settings;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

function setup(diff) {
  S.soloDiff = diff;
  G.mode = 'solo'; G.rpg = false; G.daily = null; G.bossRush = false;
  G.state = 'play'; G.hurtCount = 0; G.enemies = []; G.bubbles = []; G.T = 40;
  const p = P.makePlayer(0, 0, null, { px: 120, py: 120 });
  p.sHpMax = P.soloHpMax();
  p.sHp = p.sHpMax;
  p.lives = P.soloLives();
  p.invuln = 0; p.alive = true; p.dead = false; p.air = 0; p.slamGuard = 0;
  p.dino = false; p.carry = null; p.slide = null; p.respawnT = 0;
  G.players = [p];
  return p;
}
// 打一下（先清無敵，模擬「無敵結束後又被打到」）
function hit(p) { p.invuln = 0; P.killPlayer(p, false, null); }

// ================================================================
head('1. 每扣一格都還活著');
['easy', 'normal'].forEach(function (d) {
  const p = setup(d);
  const max = p.sHpMax;
  ok(max === P.SOLO_DIFF[d].hp, d + '：開場血格 = 難度表的 hp（' + max + '）');
  ok(p.lives === 3, d + '：3 條命');
  P.killPlayer(p, false, null);
  ok(p.alive === true && p.dead === false, d + '：被打到還活著（沒有進入死亡流程）');
  ok(p.sHp === max - 1, d + '：血格 ' + max + ' → ' + (max - 1));
  ok(p.lives === 3, d + '：命數沒有被扣');
  ok(p.respawnT === 0, d + '：沒有排重生');
  ok(p.invuln >= 1.7 && p.invuln <= 1.9, d + '：給 1.8 秒短無敵（實際 ' + (p.invuln || 0).toFixed(2) + '）');
  ok(G.hurtCount === 1, d + '：三星判定記到「被打到」');
});

// ================================================================
head('2. 無敵期間不會連扣兩格');
{
  const p = setup('easy');
  P.killPlayer(p, false, null);
  const before = p.sHp, inv = p.invuln;
  P.killPlayer(p, false, null);          // 同一幀／同一團火
  P.killPlayer(p, false, null);
  ok(p.sHp === before, '無敵期間再碰兩次也不會扣血');
  ok(p.alive === true && p.invuln === inv, '狀態沒有被改動');
}

// ================================================================
head('3. 血格見底才倒下');
['easy', 'normal'].forEach(function (d) {
  const p = setup(d);
  const max = p.sHpMax;
  // 前 max-1 次都只掉血
  let aliveGood = true;
  for (let i = 0; i < max - 1; i++) { hit(p); if (!p.alive) aliveGood = false; }
  ok(aliveGood && p.sHp === 1 && p.lives === 3,
     d + '：前 ' + (max - 1) + ' 下都還站著（剩 1 格、命數沒動）');
  hit(p);
  ok(p.alive === false && p.dead === true, d + '：第 ' + max + ' 下才倒下');
  ok(p.sHp === 0, d + '：血格歸零');
  ok(p.lives === 2, d + '：命數 3 → 2');
  ok(p.respawnT > 0, d + '：進重生／結算倒數');
});

// ================================================================
head('4. 困難・每日挑戰・BOSS 仍然一擊倒');
{
  const p = setup('hard');
  ok(p.sHpMax === 1, '困難：每條命 1 格血（沒有格血）');
  P.killPlayer(p, false, null);
  ok(p.alive === false, '困難：被打到直接倒下');
  ok(p.lives === 2, '困難：命數 3 → 2');
  // 每日挑戰：即使設定是簡單，也只給 1 格（排行榜公平）
  const q = setup('easy');
  G.daily = { seed: 7, stage: 1 };
  q.sHpMax = P.soloHpMax(); q.sHp = q.sHpMax; q.invuln = 0;
  ok(q.sHpMax === 1, '每日挑戰固定 1 格血');
  P.killPlayer(q, false, null);
  ok(q.alive === false, '每日挑戰被打到直接倒下（不影響比秒數）');
  G.daily = null;
  // BOSS 連戰
  const r = setup('easy');
  G.bossRush = true;
  r.sHpMax = P.soloHpMax(); r.sHp = r.sHpMax; r.invuln = 0;
  ok(r.sHpMax === 1, 'BOSS 連戰固定 1 格血');
  G.bossRush = false;
}

// ================================================================
head('5. 恐龍先擋一次，血格不動');
{
  const p = setup('easy');
  const max = p.sHpMax;
  p.dino = true;
  P.killPlayer(p, false, null);
  ok(p.dino === false, '恐龍被炸掉');
  ok(p.sHp === max && p.alive === true, '血格沒動（恐龍擋的是那一下）');
  p.invuln = 0;
  P.killPlayer(p, false, null);
  ok(p.sHp === max - 1 && p.alive === true, '下一次命中才開始扣血');
}

// ================================================================
head('6. ❤️ 愛心：格血模式補一格、封頂');
{
  const p = setup('easy');
  const max = p.sHpMax;
  p.sHp = 1;
  p.invuln = 0;
  P.applyItem(p, 'heart');
  ok(p.sHp === 2, '掉血後吃到愛心 → 補回一格（' + max + ' 格上限）');
  for (let i = 0; i < max + 2; i++) P.applyItem(p, 'heart');
  ok(p.sHp === max, '吃再多也不會超過上限（' + p.sHp + '/' + max + '）');
  ok(p.sHpMax === max, '上限沒有被撐大');
  // 一擊倒的模式：愛心仍然補命（封頂 3）
  const q = setup('hard');
  q.lives = 1;
  P.applyItem(q, 'heart');
  ok(q.lives === 2, '困難模式吃愛心補一條命');
  q.lives = 3;
  P.applyItem(q, 'heart');
  ok(q.lives === 3, '命數封頂在 3');
}

// ================================================================
head('7. RPG／對戰不走這條路');
{
  const p = setup('easy');
  G.rpg = true;
  G.mode = 'rpg';
  ok(P.soloHurt(p, false, null) === false, 'RPG 模式 soloHurt 直接回 false');
  G.rpg = false; G.mode = 'solo';
  G.mode = 'battle';
  ok(P.soloHurt(p, false, null) === false, '對戰模式不套用格血');
  G.mode = 'solo';
}

// ================================================================
head('8. 版本');
{
  const src = require('./_sandbox').rawHtml;
  const vm = src.match(/const VERSION = '([\d.]+)'/);
  const v = vm ? vm[1].split('.').map(Number) : [0, 0];
  ok(v[0] > 5 || (v[0] === 5 && v[1] >= 31), '主檔版號 ≥ 5.31（目前 ' + (vm && vm[1]) + '）');
  // v5.38：紀錄搬到 js/version-log.js
  ok(/v: '5\.30'/.test(vlog) && /v: '5\.31'/.test(vlog), 'VERSION_LOG 有 5.30 與 5.31 條目');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  ok(/var SW_VERSION = 'v5\.(3[1-9]|[4-9]\d)\.\d+'/.test(sw), 'sw.js 版本 ≥ 5.31');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.30/5.31：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
