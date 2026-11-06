// verify-v530.js — v5.30 專屬驗證：單人簡單模式的「2 格血」真的扣得住
//   ① 第一下只扣一格、人還活著（不進死亡／重生流程）
//   ② 無敵期間同一團火不會再扣一格
//   ③ 第二下才倒下（命數 -1）
//   ④ 普通・困難・每日挑戰都是一擊倒（沒有被格血影響）
//   ⑤ 恐龍先擋一次，血格不動
//   ⑥ ❤️ 愛心在格血模式補一格血（封頂），其他模式仍補命
//   ⑦ RPG 不走這條路
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

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

// ================================================================
head('1. 簡單模式：第一下只掉一格血');
{
  const p = setup('easy');
  ok(p.sHpMax === 2 && p.sHp === 2 && p.lives === 1, '開場 2 格血、1 條命');
  P.killPlayer(p, false, null);
  ok(p.alive === true, '被炸到還活著（沒有進入死亡流程）');
  ok(p.dead === false, '沒有標記 dead（不會觸發重生倒數）');
  ok(p.sHp === 1, '血格 2 → 1');
  ok(p.lives === 1, '命數沒有被扣');
  ok(p.respawnT === 0, '沒有排重生');
  ok(p.invuln >= 1.7 && p.invuln <= 1.9, '給 1.8 秒短無敵（實際 ' + (p.invuln || 0).toFixed(2) + '）');
  ok(G.hurtCount === 1, '三星判定記到「被打到」');
}

// ================================================================
head('2. 無敵期間不會連扣兩格');
{
  const p = setup('easy');
  P.killPlayer(p, false, null);
  ok(p.sHp === 1, '第一下扣到 1 格');
  const inv = p.invuln;
  P.killPlayer(p, false, null);          // 同一幀／同一團火
  P.killPlayer(p, false, null);
  ok(p.sHp === 1, '無敵期間再碰兩次也不會扣血');
  ok(p.alive === true && p.invuln === inv, '狀態沒有被改動');
}

// ================================================================
head('3. 第二下才倒下');
{
  const p = setup('easy');
  P.killPlayer(p, false, null);
  p.invuln = 0;                          // 無敵結束
  P.killPlayer(p, false, null);
  ok(p.alive === false && p.dead === true, '第二下才倒下');
  ok(p.sHp === 0, '血格歸零');
  ok(p.lives === 0, '命數 -1（簡單模式 1 條命 → 0）');
  ok(p.respawnT > 0, '進重生／結算倒數');
}

// ================================================================
head('4. 普通・困難・每日／BOSS 仍然一擊倒');
{
  ['normal', 'hard'].forEach(function (d) {
    const p = setup(d);
    ok(p.sHpMax === 1, d + '：每條命 1 格血（沒有格血）');
    P.killPlayer(p, false, null);
    ok(p.alive === false, d + '：被打到直接倒下');
    ok(p.lives === 2, d + '：命數 3 → 2');
  });
  // 每日挑戰：即使設定是簡單，也只給 1 格（排行榜公平）
  const p = setup('easy');
  G.daily = { seed: 7, stage: 1 };
  p.sHpMax = P.soloHpMax(); p.sHp = p.sHpMax; p.invuln = 0;
  ok(p.sHpMax === 1, '每日挑戰固定 1 格血');
  P.killPlayer(p, false, null);
  ok(p.alive === false, '每日挑戰被打到直接倒下（不影響比秒數）');
  G.daily = null;
  // BOSS 連戰
  const q = setup('easy');
  G.bossRush = true;
  q.sHpMax = P.soloHpMax(); q.sHp = q.sHpMax; q.invuln = 0;
  ok(q.sHpMax === 1, 'BOSS 連戰固定 1 格血');
  G.bossRush = false;
}

// ================================================================
head('5. 恐龍先擋一次，血格不動');
{
  const p = setup('easy');
  p.dino = true;
  P.killPlayer(p, false, null);
  ok(p.dino === false, '恐龍被炸掉');
  ok(p.sHp === 2 && p.alive === true, '血格沒動（恐龍擋的是那一下）');
  p.invuln = 0;
  P.killPlayer(p, false, null);
  ok(p.sHp === 1 && p.alive === true, '下一次命中才開始扣血');
}

// ================================================================
head('6. ❤️ 愛心：格血模式補一格、封頂');
{
  const p = setup('easy');
  p.sHp = 1;
  p.invuln = 0;
  P.applyItem(p, 'heart');
  ok(p.sHp === 2, '掉一格後吃到愛心 → 補回 2 格');
  P.applyItem(p, 'heart');
  ok(p.sHp === 2, '滿血再吃不會超過上限');
  ok(p.sHpMax === 2, '上限沒有被撐大');
  // 其他難度：愛心仍然補命（封頂 3）
  const q = setup('normal');
  q.lives = 1;
  P.applyItem(q, 'heart');
  ok(q.lives === 2, '普通模式吃愛心補一條命');
  q.lives = 3;
  P.applyItem(q, 'heart');
  ok(q.lives === 3, '普通模式命數封頂在 3');
}

// ================================================================
head('7. RPG 不走這條路');
{
  const p = setup('easy');
  G.rpg = true;
  G.mode = 'rpg';
  ok(P.soloHurt(p, false, null) === false, 'RPG 模式 soloHurt 直接回 false');
  G.rpg = false; G.mode = 'solo';
  // 對戰／大逃殺也不套用
  G.mode = 'battle';
  ok(P.soloHurt(p, false, null) === false, '對戰模式不套用格血');
  G.mode = 'solo';
}

// ================================================================
head('8. 版本');
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const vm = src.match(/const VERSION = '([\d.]+)'/);
  const v = vm ? vm[1].split('.').map(Number) : [0, 0];
  ok(v[0] > 5 || (v[0] === 5 && v[1] >= 30), '主檔版號 ≥ 5.30（目前 ' + (vm && vm[1]) + '）');
  ok(/v: '5\.30'/.test(src), 'VERSION_LOG 有 5.30 條目');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  ok(/var SW_VERSION = 'v5\.30\.\d+'/.test(sw), 'sw.js 版本是 v5.30.x');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.30：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
