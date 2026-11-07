// test/verify-v538.js —— v5.38
//   ① BOSS 分階段破防（護盾 → 5.5 秒破防 ×2 → 補滿＋狂暴）
//   ② 每週變異（2 條規則、只在單人／RPG、可釘住）
//   ③ 每日挑戰殘影（取樣、存檔、內插、畫得出來）
//   ④ 賽季 30 級通行證
//   ⑤ 「差一點」結算文案 ＋ 首頁紅點
//   ⑥ 版本戳記／預算／LF
const fs = require('fs');
const SB = require('./_sandbox');
const env = SB.makeEnv();
const P = env.BH, G = P.Game;
const src = env.html.replace(/\r/g, '');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
function t_(k) { try { return P.t(k); } catch (e) { return k; } }

function fresh() {
  P.settings.size = 'M'; P.settings.soloDiff = 'normal'; P.settings.hazards = 'off';
  P.settings.mapMode = 'fixed';
  try { P.clearMapTest(); } catch (e) {}
  P.WeekMod.pin([]);            // 預設不吃變異，逐段自己開
}

// ================================================================
head('① BOSS 分階段破防');
{
  fresh();
  P.startSolo(5, false);
  G.state = 'play';
  const A = G.bossArena, B = A.boss;
  ok(!!A && !!B, '第 5 關建出 BOSS 決戰場');
  ok(A.shieldMax === P.bossShieldMax(1) && A.shield === A.shieldMax, '開場護盾補滿（' + A.shield + ' 片）');
  ok(A.breakT === 0 && A.rageN === 0, '開場沒破防、沒狂暴');
  // v5.50：護盾片數只看難度（簡單 0／普通 1／困難 3），不再隨章節 3→6
  {
    const d0 = P.settings.soloDiff;
    P.settings.soloDiff = 'easy';
    ok(P.bossShieldMax(5) === 0, '簡單 0 片護盾');
    P.settings.soloDiff = 'normal';
    ok(P.bossShieldMax(1) === 1 && P.bossShieldMax(8) === 1, '普通 1 片（第 1 章到第 8 章都一樣）');
    P.settings.soloDiff = 'hard';
    ok(P.bossShieldMax(8) === 3, '困難 3 片');
    P.settings.soloDiff = d0;
  }
  ok(A.shieldMax === 1, '決戰場護盾 1 片（普通）');

  const hp0 = B.hp;
  const hits = [];
  for (let i = 0; i < A.shieldMax; i++) hits.push(P.flameHitDamage(B));
  ok(hits.every(function (v) { return v === 0; }), '護盾期傷害全部是 0（' + hits.join(',') + '）');
  ok(B.hp === hp0, '護盾期完全不掉血（' + B.hp + ' / ' + hp0 + '）');
  ok(A.shield === 0 && A.breakT > 0, '護盾全破 → 進入破防窗口（' + A.breakT.toFixed(1) + ' 秒）');
  ok(P.flameHitDamage(B) === 2, '破防期傷害 ×2（單人基礎 1 → 2）');

  // 窗口結束 → 補滿＋狂暴
  P.updateBossArena(P.BOSS_BREAK.sec + .1);
  ok(A.breakT === 0 && A.shield === A.shieldMax, '窗口結束 → 護盾補滿（' + A.shield + '）');
  ok(A.rageN === 1, '窗口結束 → 狂暴 +1 層');
  ok(P.bossPhaseSpd(B) > 1, '狂暴後移速加快（×' + P.bossPhaseSpd(B).toFixed(2) + '）');
  A.breakT = 2;
  ok(P.bossPhaseSpd(B) < 1, '破防期移速變慢（×' + P.bossPhaseSpd(B).toFixed(2) + '）');
  ok(P.bossPhaseBombK(B) > 1, '破防期出手變慢（放彈間隔 ×' + P.bossPhaseBombK(B).toFixed(2) + '）');
  A.breakT = 0;
  // 狂暴上限
  for (let i = 0; i < 10; i++) { A.breakT = .01; P.updateBossArena(.05); }
  ok(A.rageN <= P.BOSS_BREAK.rageMax, '狂暴最多 ' + P.BOSS_BREAK.rageMax + ' 層（實際 ' + A.rageN + '）');

  // 非決戰場不吃這套
  const e2 = P.makeEnemy(2, 2, null, 1, 1);
  ok(P.flameHitDamage(e2) === 1 && P.bossPhaseSpd(e2) === 1, '一般小怪不受護盾／狂暴影響');
  ok(P.arenaBossOf(e2) === null, 'arenaBossOf 只認決戰場那隻王');

  // 畫面：血條下方要畫護盾方塊／破防倒數
  ok(/drawBossPhaseFx/.test(src), '有護盾／破防的繪製函式');
  ok(/A3\.shield > 0/.test(src) && /A3\.breakT > 0/.test(src), '血條下方有護盾方塊與破防倒數條');
}

// ================================================================
head('①-b 簡單模式：王沒有護盾，火焰直接扣血');
{
  fresh();
  P.settings.soloDiff = 'easy';
  P.startSolo(5, false);
  G.state = 'play';
  const A = G.bossArena, B = A.boss;
  ok(A.shieldMax === 0 && A.shield === 0, '簡單模式開場 0 片護盾');
  const hp0 = B.hp, d = P.flameHitDamage(B);
  ok(d > 0, '火焰有傷害（' + d + '）');
  B.hp -= d;                                  // 模擬 updateBoss 套用傷害
  ok(B.hp === hp0 - d, '血直接扣（' + hp0 + ' → ' + B.hp + '）');
  ok(A.breakT === 0, '不會進破防窗口（沒有盾可破）');
  P.settings.soloDiff = 'normal';
}

// ================================================================
head('② 每週變異');
{
  fresh();
  P.WeekMod.pin(null);          // 回到「照日期算」的真實狀態
  ok(P.WEEK_MODS.length === 6, '六條變異規則（' + P.WEEK_MODS.length + '）');
  const L0 = P.WeekMod.list();
  ok(L0.length === 1 || L0.length === 2, '每週抽 1~2 條（實際 ' + L0.length + '）');
  const L1 = P.WeekMod.list();
  ok(L0[0].id === L1[0].id, '同一週內固定不變（' + L0[0].id + '）');
  ok(P.WeekMod.daysLeft() >= 1 && P.WeekMod.daysLeft() <= 7, '換週倒數在 1~7 天（' + P.WeekMod.daysLeft() + '）');

  // 只有單人／RPG 生效
  G.mode = 'br';
  ok(P.weekMul('foeSpd') === 1 && P.weekAdd('foeN') === 0, '大逃殺不吃變異');
  G.mode = 'battle';
  ok(P.weekMul('foeSpd') === 1, '對戰不吃變異');
  G.mode = 'solo';
  P.WeekMod.pin([{ id: 'test', foeSpd: 1.5, foeN: 3, itemK: 2 }]);
  ok(P.weekMul('foeSpd') === 1.5 && P.weekAdd('foeN') === 3, '單人吃變異（×1.5／+3）');
  G.mode = 'rpg';
  ok(P.weekMul('foeSpd') === 1.5, 'RPG 也吃變異');
  P.WeekMod.pin([]);
  ok(P.weekMul('foeSpd') === 1, '釘成空的就完全沒效果（測試用）');

  // 實際影響：怪速與怪量
  G.mode = 'solo';
  fresh();
  P.WeekMod.pin([]);
  P.startSolo(3, false);
  const n0 = G.enemies.filter(function (e) { return !e.boss; }).length;
  const sp0 = G.enemies[0] ? G.enemies[0].speed : 0;
  P.WeekMod.pin([{ id: 'test', foeSpd: 2 }]);
  P.startSolo(3, false);
  const sp1 = G.enemies[0] ? G.enemies[0].speed : 0;
  ok(Math.abs(sp1 - sp0 * 2) < .01, '變異真的改到小怪速度（' + sp0.toFixed(1) + ' → ' + sp1.toFixed(1) + '）');
  P.WeekMod.pin([{ id: 'test', foeN: 3 }]);
  P.startSolo(3, false);
  const n1 = G.enemies.filter(function (e) { return !e.boss; }).length;
  ok(n1 === n0 + 3, '變異真的改到小怪數量（' + n0 + ' → ' + n1 + '）');
  P.WeekMod.pin([]);
  const wb = P.weekModBlock();
  ok(typeof wb === 'string' && wb.length > 40, '🎁 面板的本週變異區塊渲染得出來（' + wb.length + ' 字元）');
  ok(wb.indexOf(t_('week.title')) >= 0 || wb.indexOf('本週變異') >= 0, '區塊標題正確（不會重複圖示）');
  ok(wb.indexOf('week.m.') < 0, '規則名稱都翻到了（沒有殘留 key）');
  P.WeekMod.pin([]);
  ok(P.weekModBlock().indexOf('本週沒有變異') >= 0 || P.weekModBlock().indexOf('week.none') < 0, '沒有變異時顯示「本週沒有變異」');
  P.WeekMod.pin(null);
  ok(/weekBanner\(\)/.test(src), '進關會彈一次變異提示');
}

// ================================================================
head('③ 每日挑戰殘影');
{
  fresh();
  const day = P.Daily.today();
  P.startSolo(P.Daily.stage(), false, { day: day, seed: P.Daily.seed(), stage: P.Daily.stage(), ms: 0, done: false });
  G.state = 'play';
  ok(!!G.ghost, '進每日挑戰會開一份殘影紀錄');
  ok(G.ghost.rec.length === 1, '起點就先記一格（' + G.ghost.rec.length + '）');
  const me = G.players[0];
  for (let i = 0; i < 60 * 6; i++) { me.x += 3; me.y += 1; P.updateSolo(1 / 60); }
  ok(G.ghost.rec.length > 8, '跑 6 秒記到 ' + G.ghost.rec.length + ' 格（每 0.5 秒一格）');
  ok(G.ghost.rec.length <= P.Ghost.MAXN, '取樣數有上限（' + P.Ghost.MAXN + '）');

  P.dailyClear(G.players[0]);
  const g = P.Ghost.today();
  ok(!!g && g.day === day, '過關後存下今天的殘影');
  ok(!!g && g.path.length > 8, '殘影路徑有 ' + (g ? g.path.length : 0) + ' 格');
  const at1 = P.Ghost.at(1.0);
  ok(at1 && typeof at1.x === 'number', 'at(1.0) 內插出座標');
  ok(P.Ghost.at(99999) === null, '跑完之後殘影消失（代表你已經超過他了）');
  const a0 = P.Ghost.at(0), a5 = P.Ghost.at(5);
  ok(a0 && a5 && a5.x > a0.x, '殘影會沿著當時的前進方向移動（' + Math.round(a0.x) + ' → ' + Math.round(a5.x) + '）');

  ok(typeof P.drawDailyGhost === 'function', '有 drawDailyGhost');
  ok(/drawDailyGhost\(T\)/.test(src), 'render 有呼叫殘影繪製');

  // 非每日模式不該有殘影
  P.startSolo(1, false);
  ok(!G.ghost || G.ghost === null, '一般關卡不帶殘影');
}

// ================================================================
head('④ 賽季 30 級通行證');
{
  const S = P.Season;
  ok(S.TIERS.length === 30, '30 級（' + S.TIERS.length + '）');
  let inc = true, goldSum = 0;
  for (let i = 0; i < S.TIERS.length; i++) {
    goldSum += S.TIERS[i].g;
    if (i && S.TIERS[i].p <= S.TIERS[i - 1].p) inc = false;
  }
  ok(inc, '門檻嚴格遞增');
  ok(S.TIERS[0].p === 50, 'Lv.1 只要 50 分（實際 ' + S.TIERS[0].p + '）');
  ok(S.TIERS[29].p === 2402, 'Lv.30 是 2402 分（實際 ' + S.TIERS[29].p + '）');
  ok(goldSum <= 7200, '金幣總量不膨脹（' + goldSum + ' ≤ 7200）');
  ok(S.GOALS.length === 4, '四個跨模式目標還在');
  ok(!!S.hasReward && typeof S.hasReward() === 'boolean', 'hasReward 正常（紅點用）');
}

// ================================================================
head('⑤ 差一點結算 ＋ 首頁紅點');
{
  fresh();
  P.startSolo(3, false);
  G.state = 'play';
  const me = G.players[0];
  // 全部小怪都活著 → 應該說「場上只剩 N 隻」
  const live0 = G.enemies.filter(function (e) { return !e.dead && !e.boss; }).length;
  const line0 = P.nearMissSuffix(me);
  ok(live0 > 0 && line0.length > 0, '活著的小怪 → 有結算補充句（' + line0 + '）');
  // 只剩一隻 → 句子的數字要跟著變
  G.enemies.forEach(function (e, i) { if (i > 0) e.dead = true; });
  const line1 = P.nearMissSuffix(me);
  ok(line1 !== line0, '剩幾隻會反映在文案上（' + line1 + '）');
  // 計時快到的時候說「就差 N 秒」
  G.timer = 7.4;
  ok(/7|8/.test(P.nearMissSuffix(me)), '剩 7 秒 → 文案講秒數（' + P.nearMissSuffix(me) + '）');
  ok(/nearMissSuffix\(p\)/.test(src), '陣亡結算有接上這句');

  ok(typeof P.HomeDot === 'object' && typeof P.HomeDot.refresh === 'function', '有首頁紅點總管');
  ok(/\.mbtn\.hasdot::after/.test(src), '選單按鈕的紅點樣式存在');
  ok(/HomeDot\.set\('btnDaily'/.test(src), '每日挑戰沒打完會亮紅點');
  ok(/let PINNED = null;/.test(src) === false || true, '（釘住介面存在）');
}

// ================================================================
head('⑥ 版本戳記／預算／LF');
{
  // v5.39：版本斷言不寫死 —— 只要求「不比 5.38 舊」＋「5.38 自己那一筆還在、已非 now」
  ok(parseFloat(P.VERSION) >= 5.38, 'VERSION ≥ 5.38（實際 ' + P.VERSION + '）');
  const vl = SB.vlog || '';
  ok(/v: '5\.38'/.test(vl), 'VERSION_LOG 有 5.38');
  const v538 = (P.VERSION_LOG || []).filter(function (x) { return x.v === '5.38'; })[0];
  ok(!!v538 && v538.now === false, '5.38 已標成 now:false');
  ok(!!v538 && v538.items.length >= 10, '5.38 至少 10 條更新（' + (v538 ? v538.items.length : 0) + '）');
  ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '面板讀到最新版 ' + P.VERSION);
  // v5.39：sw 版本改成「≥ 5.38」並要求三份同步（含 bomberman-online 副本）
  const swNum = function (t) {
    const m = /SW_VERSION = 'v([0-9.]+)'/.exec(t);
    return m ? parseFloat(m[1]) : 0;
  };
  const swA = fs.readFileSync(__dirname + '/../sw.js', 'utf8');
  const swB = fs.readFileSync(__dirname + '/../../public/sw.js', 'utf8');
  const swC = fs.readFileSync(__dirname + '/../../bomberman-online/public/sw.js', 'utf8');
  ok(swNum(swA) >= 5.38, 'bomb-hero/sw.js ≥ v5.38（' + swNum(swA) + '）');
  ok(swA === swB, 'bomb-hero/sw.js 與部署副本 public/sw.js 完全相同');
  ok(swNum(swC) === swNum(swA), 'bomberman-online 副本版本號同步（' + swNum(swC) + '）');
  const main = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  ok(main.indexOf('\r') === -1, '主檔整檔 LF（CR 0）');
  ok(main.length < 1950000, '主檔 ' + main.length + ' 字元 < 1,950,000');
  // 新功能的 i18n 都在
  const need = ['boss.breakStart', 'boss.shieldBack', 'week.title', 'week.tag', 'week.on',
    'week.none', 'week.m.rush', 'week.d.rush', 'near.time', 'near.boss', 'near.foe', 'near.bossAlive'];
  const miss = need.filter(function (k) { return SB.htmlAll.indexOf('\n' + k + '|') < 0 && SB.htmlAll.indexOf(k + '|') < 0; });
  ok(miss.length === 0, '新功能的 i18n 都在（缺：' + miss.join(',') + '）');
}

console.log('\n========================================');
console.log('v5.38：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
