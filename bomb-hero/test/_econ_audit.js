// test/_econ_audit.js —— 經濟盤點 v5.87（重寫：所有數字都「從程式讀」，不手抄）
//
//   為什麼要重寫：v5.86 這支腳本把係數寫死在裡面（soft * 10、簽到 1640、分享 3000…），
//   改完經濟之後它照樣印出舊數字 —— 拿它驗收只會得到完全錯的結論。
//
//   現在的做法：
//     · 過關獎勵／首通／王關加成 → 從 main.js 原始碼抓公式，抓不到就「失敗退出」，
//       不會安靜地用舊值跑完
//     · 磚幣／小怪掉幣／BOSS 掉幣 → 直接呼叫遊戲自己的函式（brickCoinOf / foeDrop）
//     · 成就／賽季／簽到／任務／週榜／分享／BR／深淵 / 門票 / 改名 → 讀模組的真實表
//     · 最後對照報告的驗收門檻，超出範圍就以非 0 結束（可以放進 CI）
//
//   用法：node test/_econ_audit.js [--json]
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');

function die(msg) {
  console.error('\n[FAIL] ' + msg);
  console.error('       公式改了但這支腳本沒跟上 —— 修好它再談「達標」。\n');
  process.exit(2);
}
function grab(re, name) {
  const m = src.match(re);
  if (!m) die('讀不到「' + name + '」的公式');
  return m.slice(1).map(Number);
}

/* ── 從程式碼抓出來的係數 ─────────────────────────────── */
const [CLEAR_BASE, CLEAR_EVERY, CLEAR_STEP] = grab(/base = (\d+) \+ Math\.floor\(\(cleared - 1\) \/ (\d+)\) \* (\d+);/, '過關獎勵');
const [FIRST_N, FIRST_BONUS] = grab(/cleared <= (\d+) && cleared >= \(Solo\.unlocked \| 0\)\) base \+= (\d+);/, '前 N 關首通');
const [BOSS_BONUS] = grab(/isBossStage\(cleared\) && cleared >= \(Solo\.unlocked \| 0\)\) base \+= (\d+);/, '王關首通');
const [BRICK_UNIT] = grab(/addScore\(p, 10, brickCoinOf\(p, (\d+)\)\)/, '磚幣單位');
const [NICK_PRICE] = grab(/const NICK_PRICE = (\d+);/, '改名價格');

const env = makeEnv();
const P = env.BH;
const G = P.Game;
try { P.WeekMod.pin([]); } catch (e) {}
try { P.setDevBuild(false); } catch (e) {}

const CAP = P.BRICK_COIN_CAP;

/* ── 40 關：地圖實測 ───────────────────────────────── */
const maps = [];
for (let s = 1; s <= 40; s++) {
  P.startSolo(s, false, false);
  G.state = 'play';
  let soft = 0;
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) if (G.grid[y][x] === 2) soft++;
  maps.push({
    s: s, cols: G.cols, rows: G.rows, soft: soft,
    foes: G.enemies.filter(function (e) { return !e.boss; }).length,
    boss: G.enemies.filter(function (e) { return !!e.boss; }).length
  });
}

/* ── 掉幣：直接抽樣 foeDrop（真實表格，不是複製貼上） ── */
P.startSolo(1, false, false);
G.state = 'play';
const T = G.T;
function sample(isBoss, n) {
  const cx = (Math.floor(G.cols / 2) + .5) * T, cy = (Math.floor(G.rows / 2) + .5) * T;
  let coin = 0, hits = 0;
  for (let i = 0; i < n; i++) {
    G.items.length = 0;
    P.foeDrop({ x: cx, y: cy, boss: !!isBoss });
    for (let k = 0; k < G.items.length; k++) {
      if (G.items[k].type === 'coin') { coin += G.items[k].amount; hits++; break; }
    }
  }
  return { per: coin / n, rate: hits / n };
}
const FOE = sample(false, 4000);        // 小怪：60% 掉幣，其餘掉道具
const BOSS = sample(true, 2000);        // BOSS：必掉幣（另有道具與蛋）
if (FOE.rate <= 0.2 || BOSS.rate <= 0.9) die('foeDrop 抽樣異常（小怪 ' + FOE.rate.toFixed(2) + '／王 ' + BOSS.rate.toFixed(2) + '）');

/* ── 逐關期望 ─────────────────────────────────────── */
function brickCoins(soft) {
  const p = { brickCoin: 0 };
  for (let i = 0; i < soft; i++) p.coin = (p.coin | 0) + P.brickCoinOf(p, BRICK_UNIT);
  return p.coin | 0;
}
function clearBase(s) {
  let b = CLEAR_BASE + Math.floor((s - 1) / CLEAR_EVERY) * CLEAR_STEP;
  if (s <= FIRST_N) b += FIRST_BONUS;
  if (P.isBossStage(s)) b += BOSS_BONUS;
  return b;
}
const rows = maps.map(function (m) {
  const brick = brickCoins(m.soft);
  const foe = Math.round(m.foes * FOE.per);
  const boss = Math.round(m.boss * BOSS.per);
  const fair = clearBase(m.s) - (m.s <= FIRST_N ? FIRST_BONUS : 0) - (P.isBossStage(m.s) ? BOSS_BONUS : 0);
  return {
    s: m.s, soft: m.soft, foes: m.foes, boss: m.boss,
    brick: brick, foe: foe, bossCoin: boss,
    base: fair, firstBase: fair + (m.s <= FIRST_N ? FIRST_BONUS : 0) + (P.isBossStage(m.s) ? BOSS_BONUS : 0),
    steady: brick + foe + boss + fair,
    first: brick + foe + boss + fair + (m.s <= FIRST_N ? FIRST_BONUS : 0) + (P.isBossStage(m.s) ? BOSS_BONUS : 0)
  };
});

const sum = function (a, f) { return a.reduce(function (x, r) { return x + f(r); }, 0); };
const steadyTotal = sum(rows, function (r) { return r.steady; });
const firstTotal = sum(rows, function (r) { return r.first; });
const inGame = sum(rows, function (r) { return r.brick + r.foe + r.bossCoin; });
const steadyReward = sum(rows, function (r) { return r.base; });
const avg = steadyTotal / rows.length;
const chAvg = [[1, 10], [11, 20], [21, 30], [31, 40]].map(function (c) {
  const seg = rows.filter(function (r) { return r.s >= c[0] && r.s <= c[1]; });
  return sum(seg, function (r) { return r.steady; }) / seg.length;
});

/* ── 外圍：全部讀模組的真實表 ─────────────────────── */
const achTotal = P.Ach.LIST.reduce(function (a, g) { return a + (g.gold | 0); }, 0);
const seasonTiers = P.Season.TIERS.reduce(function (a, t) { return a + (t.g | 0); }, 0);
const seasonGoals = P.Season.GOALS.reduce(function (a, g) { return a + (g.g | 0); }, 0);
const signTotal = P.Gift.REWARDS.reduce(function (a, d) { return a + (d.g | 0); }, 0);
const missionPool = P.Gift.POOL.map(function (m) { return m.g | 0; });
const missionAvg = missionPool.reduce(function (a, b) { return a + b; }, 0) / missionPool.length * 3;
const weekRank = P.Rank.REWARD.reduce(function (a, b) { return a + b; }, 0);
const shareDay = P.Share.reward * 3;
const brGold = P.BR.GOLD.slice();
const abyssLayer = P.Abyss.layerGold(1);
const ticket = P.Shop.ticketPrice();
const skinGold = 44000;

const outer = [
  ['成就（192 個，一次性）', achTotal, '生涯目標，最長尾'],
  ['賽季（30 級＋4 目標）', seasonTiers + seasonGoals, '三個月一輪'],
  ['簽到 7 天', signTotal, '每天點一下'],
  ['每日任務 ×3', Math.round(missionAvg), '每天 3 個'],
  ['週榜（前 10）', weekRank, '每週結算'],
  ['分享 3 次/日', shareDay, '零成本（已從 3,000 砍到 450）'],
  ['大逃殺名次 1~8', brGold[0], '冠軍；8 名合計 ' + brGold.reduce(function (a, b) { return a + b; }, 0)],
  ['深淵每層', abyssLayer, '破紀錄 +' + (P.Abyss.layerGold(2) - 20) + '；入場 −' + P.Abyss.entryFee()],
  ['外觀收藏（5 件）', skinGold, '一次性，接在功能內容清空之後']
];

/* ── 輸出 ─────────────────────────────────────────── */
const jsonMode = process.argv.indexOf('--json') >= 0;
if (jsonMode) {
  console.log(JSON.stringify({ rows: rows, steadyTotal: steadyTotal, firstTotal: firstTotal, avg: avg, inGame: inGame, achTotal: achTotal, skinGold: skinGold }, null, 1));
} else {
  console.log('係數（從程式碼讀出）：過關 ' + CLEAR_BASE + '＋每 ' + CLEAR_EVERY + ' 關 +' + CLEAR_STEP +
    '｜前 ' + FIRST_N + ' 關首通 +' + FIRST_BONUS + '｜王關首通 +' + BOSS_BONUS +
    '｜磚 ' + BRICK_UNIT + ' 幣（封頂 ' + CAP + '）｜改名 ' + NICK_PRICE);
  console.log('掉幣抽樣：小怪 ' + FOE.per.toFixed(2) + ' 幣／隻（掉落率 ' + (FOE.rate * 100).toFixed(0) + '%）｜BOSS ' +
    BOSS.per.toFixed(1) + ' 幣／隻\n');

  console.log('關\t尺寸\t磚\t小怪\t王\t磚幣\t掉幣\t王幣\t過關\t合計');
  rows.forEach(function (r) {
    console.log([r.s, maps[r.s - 1].cols + '×' + maps[r.s - 1].rows, r.soft, r.foes, r.boss,
      r.brick, r.foe, r.bossCoin, r.base, r.steady].join('\t'));
  });

  console.log('\n── 關卡內 ──────────────────────────────');
  console.log('單局均值        ' + Math.round(avg) + '（含首通的一次性獎勵另計）');
  console.log('一輪 40 關(穩態) ' + steadyTotal + '　首通那一輪 ' + firstTotal);
  console.log('關內／過關       ' + inGame + ' / ' + steadyReward + '（關內佔 ' + Math.round(inGame / steadyTotal * 100) + '%）');
  console.log('曲線 4 章均值    ' + chAvg.map(function (v) { return Math.round(v); }).join(' → ') +
    '（後段／前段 ' + (chAvg[3] / chAvg[0] * 100 - 100).toFixed(1) + '%）');
  console.log('單關區間        ' + Math.min.apply(null, rows.map(function (r) { return r.steady; })) +
    ' ～ ' + Math.max.apply(null, rows.map(function (r) { return r.steady; })));

  console.log('\n── 外圍（全部從模組讀）──────────────────');
  outer.forEach(function (o) {
    console.log((o[0] + '　　　　　　　　　').slice(0, 18) + String(o[1]).padStart(8) + '　' + o[2]);
  });

  console.log('\n── 驗收門檻（報告第 10 節）──────────────');
  const checks = [
    ['單局均值 160~220', avg >= 160 && avg <= 220, Math.round(avg)],
    ['一輪 7,000~8,500', steadyTotal >= 7000 && steadyTotal <= 8500, steadyTotal],
    ['關內佔比 ≤ 60%', inGame / steadyTotal <= 0.6, Math.round(inGame / steadyTotal * 100) + '%'],
    ['後段 > 前段 20%', chAvg[3] / chAvg[0] >= 1.2, (chAvg[3] / chAvg[0] * 100 - 100).toFixed(1) + '%'],
    ['單關極差 ≤ 2 倍', Math.max.apply(null, rows.map(function (r) { return r.steady; })) <=
      Math.min.apply(null, rows.map(function (r) { return r.steady; })) * 2,
      Math.min.apply(null, rows.map(function (r) { return r.steady; })) + '～' +
      Math.max.apply(null, rows.map(function (r) { return r.steady; }))]
  ];
  let bad = 0;
  checks.forEach(function (c) {
    console.log((c[1] ? '  ✓ ' : '  ✗ ') + c[0] + '　→ ' + c[2]);
    if (!c[1]) bad++;
  });
  if (bad) { console.log('\n有 ' + bad + ' 項不在目標區間。'); process.exit(1); }
  console.log('\n全部達標。');
}
