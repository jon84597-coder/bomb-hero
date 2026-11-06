// verify-v529.js — 難度表（v5.31 版）：三檔都 3 條命，差在每條命幾格血
//   ① 難度表：easy 3 格／normal 2 格／hard 1 格；恐龍蛋統一 2 顆
//   ② soloLives / soloHpMax / 無敵秒數；每日・BOSS 固定 1 格血
//   ③ 預設難度＝普通（設定、normalize 壞值、diffLabel、soloDiffCfg 四處）＋舊存檔一次性搬移
//   ④ 血格初始化：startSolo、每關開頭補滿、重生補滿、教學固定 1 格
//   ⑤ HUD 一顆心＝一格血
//   ⑥ 文案：三檔說明寫出「3／2／1 格血」，說明頁寫出「三檔都 3 條命」
//   ⑦ 版本 ≥ 5.31
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
head('1. 難度表：命數／血格／恐龍蛋');
{
  ok(P.SOLO_DIFF.easy.lives === 3 && P.SOLO_DIFF.normal.lives === 3 && P.SOLO_DIFF.hard.lives === 3,
     '三檔都是 3 條命');
  ok(P.SOLO_DIFF.easy.hp === 3, '簡單：每條命 3 格血');
  ok(P.SOLO_DIFF.normal.hp === 2, '普通：每條命 2 格血');
  ok(P.SOLO_DIFF.hard.hp === 1, '困難：每條命 1 格血（碰到就倒）');
  ok(P.SOLO_DIFF.easy.eggs === 2 && P.SOLO_DIFF.normal.eggs === 2 && P.SOLO_DIFF.hard.eggs === 2,
     '恐龍蛋統一 2 顆');
  ok(P.SOLO_DIFF.easy.invuln > P.SOLO_DIFF.normal.invuln, '簡單模式重生的無敵時間比普通久');
  ok(P.SOLO_DIFF.easy.hpInvuln === 1.8 && P.SOLO_DIFF.normal.hpInvuln === 1.8 && P.SOLO_DIFF.hard.hpInvuln === 1.8,
     '掉一格血的無敵三檔都是 1.8 秒');
  ok(P.SOLO_DIFF.easy.enemy === .62 && P.SOLO_DIFF.easy.speed === .80, '簡單模式的敵人／速度沒有被動到');
  ok(P.SOLO_DIFF.normal.enemy === 1 && P.SOLO_DIFF.hard.enemy === 1.45, '普通／困難的敵人倍率原封不動');
}

// ================================================================
head('2. soloLives / soloHpMax / 無敵秒數');
{
  withDiff('easy', function () {
    ok(P.soloLives() === 3, '簡單 → 3 條命');
    ok(P.soloHpMax() === 3, '簡單 → 每條命 3 格血');
    ok(P.soloHpInvuln() === 1.8, '簡單 → 掉血無敵 1.8 秒');
    ok(P.soloGuardInvuln() === P.SOLO_DIFF.easy.invuln, '簡單 → 重生無敵用簡單的秒數');
  });
  withDiff('normal', function () {
    ok(P.soloLives() === 3, '普通 → 3 條命');
    ok(P.soloHpMax() === 2, '普通 → 每條命 2 格血');
  });
  withDiff('hard', function () {
    ok(P.soloLives() === 3, '困難 → 3 條命');
    ok(P.soloHpMax() === 1, '困難 → 1 格血（一擊倒）');
  });
  // 每日挑戰：比秒數 → 不能靠難度多血格
  S.soloDiff = 'easy'; G.daily = { seed: 1, stage: 1 }; G.bossRush = false; G.rpg = false;
  ok(P.soloLives() === 3, '每日挑戰固定 3 條命（即使設定是簡單）');
  ok(P.soloHpMax() === 1, '每日挑戰固定 1 格血（一擊倒）');
  G.daily = null;
  G.bossRush = true;
  ok(P.soloLives() === 3, 'BOSS 連戰固定 3 條命');
  ok(P.soloHpMax() === 1, 'BOSS 連戰固定 1 格血');
  G.bossRush = false;
  // 壞值／缺欄位要退回，不能回 NaN 或 0
  const oldHp = P.SOLO_DIFF.easy.hp, oldLives = P.SOLO_DIFF.easy.lives;
  P.SOLO_DIFF.easy.hp = 0; P.SOLO_DIFF.easy.lives = 0;
  S.soloDiff = 'easy';
  ok(P.soloHpMax() === 1, '血格欄位是 0 時退回 1（不會給 0 格直接倒）');
  ok(P.soloLives() === 3, '命數欄位是 0 時退回 3');
  P.SOLO_DIFF.easy.hp = oldHp; P.SOLO_DIFF.easy.lives = oldLives;
  S.soloDiff = 'normal';
}

// ================================================================
head('3. 預設難度＝普通');
{
  ok(P.settings && P.settings.soloDiff === 'normal', '預設設定就是 normal（沙盒載入後）');
  ok(/soloDiff: 'normal'/.test(src), 'settings 宣告預設 normal');
  ok(/indexOf\(settings\.soloDiff\) < 0\) settings\.soloDiff = 'normal'/.test(src),
     'normalizeSettings 的壞值退回 normal');
  ok(/const k = settings\.soloDiff \|\| 'normal'/.test(src), 'diffLabel 的 fallback 也是 normal');
  ok(!/const k = settings\.soloDiff \|\| 'easy'/.test(src), '沒有殘留舊的 easy fallback');
  ok(/return SOLO_DIFF\[settings\.soloDiff\] \|\| SOLO_DIFF\.normal;/.test(src),
     'soloDiffCfg 查不到時退回 normal');
  ok(/if \(\(settings\.diffV \| 0\) < 2\)/.test(src), '有一次性搬移（舊存檔的 easy 預設 → normal）');
  ok(/settings\.diffV = 2;/.test(src), '搬完蓋上版本戳記，之後自己選的 easy 不會再被改');
}

// ================================================================
head('4. 血格初始化與補滿');
{
  ok(/p\.lives = soloLives\(\);/.test(src), 'startSolo 用 soloLives() 決定命數');
  ok(/p\.sHpMax = soloHpMax\(\);/.test(src), 'startSolo 用 soloHpMax() 決定每條命的血格');
  ok(/p\.sHp = p\.sHpMax;/.test(src), '開場血格是滿的');
  ok(/p\.sHpMax = soloHpMax\(\); p\.sHp = p\.sHpMax;/.test(src),
     'buildSoloStage 每關開頭重算並補滿（過關不會帶著殘血進下一關）');
  ok(/p\.sHp = Math\.max\(1, p\.sHpMax \| 0\);/.test(src), '重生一條命時血格補滿');
  ok(/p\.sHpMax = 1; p\.sHp = 1;/.test(src), '教學固定 1 格血（不要套用單人難度）');
  ok(/if \(\(p\.sHpMax \| 0\) < 2\) return false;/.test(src), 'hp 1（困難・每日・BOSS）直接走原本的一擊倒');
  ok(/if \(p\.sHp <= 0\) return false;/.test(src), '血格見底就交回死亡流程');
}

// ================================================================
head('5. HUD：一顆心＝一格血');
{
  ok(/hpicks/.test(src), 'HUD 有心格容器 class');
  ok(/const hmx = Math\.max\(1, p\.sHpMax \| 0\);/.test(src), 'HUD 讀 sHpMax 判斷是不是格血模式');
  ok(/if \(hmx > 1\) \{/.test(src), '格血模式走獨立分支');
  ok(/i < sh && p\.alive \? '❤️' : '🤍'/.test(src), '還剩幾格就畫幾顆實心，其餘空心（倒下時全空心）');
  ok(/title="生命 ' \+ sh \+ '／' \+ hmx \+ ' 格'/.test(src), '滑鼠移上去看得到「生命 n／cap 格」');
  ok(/i < n \? '❤️' : '🤍'/.test(src), '1 格血（困難）仍是一條命一顆心');
  ok(/\.chip \.hpicks \{/.test(src), '心格有專屬樣式（縮字距）');
  ok(/body\.touch\.in-game \.chip \.hpicks/.test(src), '手機遊戲中再縮小一級');
}

// ================================================================
head('6. 文案：三檔說明與遊戲說明');
{
  const rows = i18.split('\n');
  function line(k) { for (let i = 0; i < rows.length; i++) if (rows[i].indexOf(k + '|') === 0) return rows[i]; return ''; }
  const e = line('hint.diff.easy'), n = line('hint.diff.normal'), h = line('hint.diff.hard');
  ok(e.split('|').length === 6 && n.split('|').length === 6 && h.split('|').length === 6,
     '三檔說明五語欄位齊全');
  ok(/3 格血/.test(e) && /3 HP/.test(e) && /HP3 格/.test(e) && /HP 3칸/.test(e),
     '簡單說明四語都寫出「3 格血」');
  ok(/2 格血/.test(n) && /2 HP/.test(n) && /HP 2칸/.test(n), '普通說明寫出「2 格血」＋預設');
  ok(/1 格血/.test(h) && /1 HP/.test(h) && /HP1 格/.test(h), '困難說明寫出「1 格血」');
  ok(/3 條命/.test(e) && /3 條命/.test(n) && /3 條命/.test(h), '三檔都寫出 3 條命');
  ok(/恐龍蛋 2 顆/.test(e) && /恐龍蛋 2 顆/.test(h), '恐龍蛋改成 2 顆');
  ok(/三檔都是 3 條命/.test(src) && /3 lives in every difficulty/.test(src), '說明頁中英都寫出「三檔都 3 條命」');
  ok(!/簡單 5 格/.test(src) && !/簡單 2 格血、普通／困難 3 條命/.test(src), '舊的生命說明已移除');
}

// ================================================================
head('7. 版本');
{
  const vm = src.match(/const VERSION = '([\d.]+)'/);
  ok(!!vm, '找得到 VERSION');
  const v = vm ? vm[1].split('.').map(Number) : [0, 0];
  ok(v[0] > 5 || (v[0] === 5 && v[1] >= 31), '主檔版號 ≥ 5.31（目前 ' + (vm && vm[1]) + '）');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  ok(/var SW_VERSION = 'v5\.(3[1-9]|[4-9]\d)\.\d+'/.test(sw), 'sw.js 版本 ≥ 5.31');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.29/5.31：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
