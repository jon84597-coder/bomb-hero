// verify-v529.js — v5.29 專屬驗證：單人「簡單模式」加容錯
//   ① 難度表：簡單 5 格／普通・困難 3 格，重生無敵簡單更久
//   ② soloLives / soloGuardInvuln：每日挑戰與 BOSS 連戰固定 3 格（排行榜公平）
//   ③ 預設難度＝簡單（設定、normalize 壞值、diffLabel 三處）
//   ④ 起始生命走 soloLives、❤️ 上限跟著初始生命（以前寫死 3）
//   ⑤ HUD 一格一顆心；對戰／大逃殺不會殘留單人的 5 格
//   ⑥ 文案：難度說明寫出生命格數（五語）、說明頁寫出 5／3 格
//   ⑦ 版本 5.29
const fs = require('fs');
const path = require('path');
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game, S = P.settings;
const src = html.replace(/\r/g, '');
const i18 = fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n-src.js'), 'utf8').replace(/\r/g, '');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
function withDiff(id, fn) {
  const old = S.soloDiff, d = G.daily, b = G.bossRush, r = G.rpg;
  S.soloDiff = id; G.daily = null; G.bossRush = false; G.rpg = false;
  try { fn(); } finally { S.soloDiff = old; G.daily = d; G.bossRush = b; G.rpg = r; }
}

// ================================================================
head('1. 難度表：生命格數與重生無敵');
{
  ok(P.SOLO_DIFF.easy.lives === 5, '簡單模式 5 格生命');
  ok(P.SOLO_DIFF.normal.lives === 3, '普通模式維持 3 格');
  ok(P.SOLO_DIFF.hard.lives === 3, '困難模式維持 3 格');
  ok(P.SOLO_DIFF.easy.invuln > P.SOLO_DIFF.normal.invuln, '簡單模式的無敵時間比普通久');
  ok(P.SOLO_DIFF.normal.invuln === 2.2 && P.SOLO_DIFF.hard.invuln === 2.2,
     '普通／困難的重生無敵維持 2.2 秒（沒有被改動）');
  ok(P.SOLO_DIFF.easy.enemy === .62 && P.SOLO_DIFF.easy.speed === .80 && P.SOLO_DIFF.easy.eggs === 3,
     '簡單模式原本的敵人／速度／恐龍蛋沒有被動到');
  ok(P.SOLO_DIFF.normal.enemy === 1 && P.SOLO_DIFF.hard.enemy === 1.45,
     '普通／困難的敵人倍率原封不動');
}

// ================================================================
head('2. soloLives / soloGuardInvuln');
{
  withDiff('easy', function () {
    ok(P.soloLives() === 5, '簡單 → 5 格');
    ok(P.soloGuardInvuln() === P.SOLO_DIFF.easy.invuln, '簡單 → 用簡單的無敵時間');
  });
  withDiff('normal', function () {
    ok(P.soloLives() === 3, '普通 → 3 格');
    ok(P.soloGuardInvuln() === 2.2, '普通 → 2.2 秒');
  });
  withDiff('hard', function () {
    ok(P.soloLives() === 3, '困難 → 3 格');
    ok(P.soloGuardInvuln() === 2.2, '困難 → 2.2 秒');
  });
  // 每日挑戰：固定 3 格（比秒數，不能靠調簡單多兩格）
  S.soloDiff = 'easy'; G.daily = { seed: 1, stage: 1 }; G.bossRush = false; G.rpg = false;
  ok(P.soloLives() === 3, '每日挑戰固定 3 格（即使設定是簡單）');
  ok(P.soloGuardInvuln() === 2.2, '每日挑戰無敵固定 2.2 秒');
  G.daily = null;
  // 首頁 BOSS 連戰：也固定 3 格
  G.bossRush = true;
  ok(P.soloLives() === 3, 'BOSS 連戰固定 3 格');
  G.bossRush = false;
  // 壞值／缺欄位要退回 3，不能回 NaN 或 0
  const old = P.SOLO_DIFF.easy.lives;
  P.SOLO_DIFF.easy.lives = 0;
  S.soloDiff = 'easy';
  ok(P.soloLives() === 3, '生命欄位是 0 時退回 3（不會給 0 格直接死）');
  P.SOLO_DIFF.easy.lives = old;
  S.soloDiff = 'easy';
}

// ================================================================
head('3. 預設難度＝簡單');
{
  ok(P.settings && P.settings.soloDiff === 'easy', '預設設定就是 easy（沙盒載入後）');
  ok(/soloDiff: 'easy'/.test(src), 'settings 宣告預設 easy');
  ok(/indexOf\(settings\.soloDiff\) < 0\) settings\.soloDiff = 'easy'/.test(src),
     'normalizeSettings 的壞值退回 easy');
  ok(/const k = settings\.soloDiff \|\| 'easy'/.test(src), 'diffLabel 的 fallback 也是 easy');
  ok(!/const k = settings\.soloDiff \|\| 'normal'/.test(src), '沒有殘留舊的 normal fallback');
  ok(/return SOLO_DIFF\[settings\.soloDiff\] \|\| SOLO_DIFF\.easy;/.test(src),
     'soloDiffCfg 查不到時退回 easy');
}

// ================================================================
head('4. 起始生命與 ❤️ 上限');
{
  ok(/p\.lives = soloLives\(\);/.test(src), 'startSolo 用 soloLives() 決定生命');
  ok(!/p\.lives = Game\.bossRush \? 3 : 3;/.test(src), '舊的寫死 3 已移除');
  ok(/Game\.startLives = p\.lives;/.test(src), '每場把初始生命記進 Game.startLives');
  ok(/const cap = Math\.max\(3, \(Game\.startLives \|\| 3\)\);/.test(src),
     '❤️ 的補血上限吃 startLives（不再永遠卡在 3）');
  ok(/p\.invuln = soloGuardInvuln\(\);/.test(src), '重生無敵走 soloGuardInvuln()');
}

// ================================================================
head('5. HUD 心格與其他模式');
{
  ok(/hpicks/.test(src), 'HUD 有心格容器 class');
  ok(/i < n \? '❤️' : '🤍'/.test(src), '還剩幾格就畫幾顆實心，其餘畫空心');
  ok(/if \(cap <= 5\)/.test(src), '5 格以內才畫心（超過退回數字，避免擠爆頂部）');
  ok(/title="生命 ' \+ n/.test(src), '滑鼠移上去看得到「生命 n／cap 格」');
  ok(/\.chip \.hpicks \{/.test(src), '心格有專屬樣式（縮字距）');
  ok(/body\.touch\.in-game \.chip \.hpicks/.test(src), '手機遊戲中再縮小一級');
  ok(/function startBattle\(\) \{\n  Game\.startLives = 1;/.test(src),
     '對戰開場把 startLives 歸 1（不會殘留單人的 5 格）');
  ok(/function startBR\(\) \{\n  Game\.startLives = 1;/.test(src), '大逃殺同上');
}

// ================================================================
head('6. 文案：難度說明與遊戲說明');
{
  const rows = i18.split('\n');
  function line(k) { for (let i = 0; i < rows.length; i++) if (rows[i].indexOf(k + '|') === 0) return rows[i]; return ''; }
  const e = line('hint.diff.easy'), n = line('hint.diff.normal'), h = line('hint.diff.hard');
  ok(e.split('|').length === 6, '簡單說明五語欄位齊全');
  ok(/5 格/.test(e) && /5 lives/.test(e) && /5 個/.test(e) && /5칸/.test(e),
     '簡單說明四語都寫出「5 格生命」');
  ok(/3 格/.test(n) && /3 lives/.test(n), '普通說明寫出 3 格');
  ok(/3 格/.test(h) && /3 lives/.test(h), '困難說明寫出 3 格');
  ok(/生命/.test(src.match(/lives: \{ tw: '([^']*)'/)[1]), '說明頁的生命條目已更新（不是舊的「初始 3 條命」）');
  ok(/簡單 5 格/.test(src) && /5 lives on Easy/.test(src), '說明頁中英都寫出簡單 5 格');
  ok(!/初始 <b>3 條命<\/b>/.test(src), '舊的「初始 3 條命」已移除');
}

// ================================================================
head('7. 版本');
{
  const vm = src.match(/const VERSION = '([\d.]+)'/);
  ok(!!vm, '找得到 VERSION');
  const v = vm ? vm[1].split('.').map(Number) : [0, 0];
  ok(v[0] > 5 || (v[0] === 5 && v[1] >= 29), '主檔版號 ≥ 5.29（目前 ' + (vm && vm[1]) + '）');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  ok(/var SW_VERSION = 'v5\.(29|3\d|4\d|5\d)\.\d+'/.test(sw), 'sw.js 版本 ≥ 5.29');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.29：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
