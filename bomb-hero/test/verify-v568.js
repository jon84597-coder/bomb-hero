// test/verify-v568.js —— v5.67：大逃殺 AI 從「被動繞路」翻成「有機會就開打」
//   ① 節奏參數：放彈冷卻大幅縮短、主動開炸倍率提高
//   ② 追擊半徑：8 格固定 → 11~16 格隨毒圈放大
//   ③ 難度打折：追人／視野不再砍半
//   ④ 行為：4.2 格外的對手也會放彈（舊版窗口只到 3.2 格）
//   ⑤ 一視同仁：AI 對 AI 與對玩家同一套判斷（只排除同隊）
//   ⑥ 開場緩衝：落地不會立刻互炸
//   ⑦ 版本戳記
const fs = require('fs');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const SRC = fs.readFileSync(__dirname + '/../js/main.js', 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function sec(t) { console.log('\n=== ' + t + ' ==='); }

/* ---------------------------------------------------------------- ① */
sec('① 放彈節奏：不再「有機會也憋著」');
const CD = P.BR_AI.CD, BK = P.BR_AI.BK;
ok(Array.isArray(CD) && CD.length >= 10, '冷卻表 10 段都在', CD.length);
ok(CD[0] <= 12, '開場放彈冷卻 ≤ 12 秒（v5.66 是 26 秒）', CD[0]);
ok(CD[CD.length - 1] <= 4, '最後一圈冷卻 ≤ 4 秒（v5.66 是 13 秒）', CD[CD.length - 1]);
let mono = true;
for (let i = 1; i < CD.length; i++) if (CD[i] > CD[i - 1]) mono = false;
ok(mono, '冷卻只會越後期越短（不會倒退）');
ok(BK[0] >= .3, '開場主動開炸倍率 ≥ 30%（v5.66 是 3%）', BK[0]);
ok(BK[BK.length - 1] >= .95, '最後一圈倍率 ≥ 95%', BK[BK.length - 1]);
let bkUp = true;
for (let i = 1; i < BK.length; i++) if (BK[i] < BK[i - 1]) bkUp = false;
ok(bkUp, '開炸欲望只會越後期越高');

/* ---------------------------------------------------------------- ② */
sec('② 追擊半徑：8 格 → 11~16 格');
ok(P.BR_STANDOFF === 2.0, '交戰距離 2.0 格（敢貼身）', P.BR_STANDOFF);
ok(typeof P.brEngageR === 'function', 'brEngageR() 已匯出');
ok(P.brEngageR(0) === 11, '開場追擊半徑 11 格', P.brEngageR(0));
ok(P.brEngageR(4) === 16 && P.brEngageR(9) === 16, '第 4 圈後放大到 16 格', [P.brEngageR(4), P.brEngageR(9)]);
ok(P.brEngageR(-3) === 11 && P.brEngageR(99) === 16, '階段值超界會被夾住', [P.brEngageR(-3), P.brEngageR(99)]);
ok(/const eng = brEngageR\(/.test(SRC), 'aiBrChoose 真的改用動態追擊半徑');
ok(/foeD > eng \? \.55 : 1\.2/.test(SRC), '追擊權重跟著動態半徑走（超出才降權）');

/* ---------------------------------------------------------------- ③ */
sec('③ 難度打折：追人／視野不再砍半');
P.settings.aiLevel = 'normal';
const lvN = P.aiLevelCfg();
const c0 = P.BR_AI.cfg(lvN, 0), c9 = P.BR_AI.cfg(lvN, 9);
ok(Math.abs(c0.chase - lvN.chase * .95) < 1e-9, 'chase 只打 .95（v5.66 是 .55）', c0.chase);
ok(Math.abs(c0.foeR - lvN.foeR * .95) < 1e-9, 'foeR 只打 .95（v5.66 是 .55）', c0.foeR);
ok(c9.bomb > c0.bomb, '後期放彈欲望高於前期', [c0.bomb, c9.bomb]);
ok(c0.lob > (lvN.lob || 0) * .45, '隔牆丟彈機率也提高（.45 → .78）', c0.lob);

/* ---------------------------------------------------------------- ④ */
sec('④ 行為：4.2 格外的對手也會放彈');
G.cols = 13; G.rows = 13; G.T = 40; G.spdK = 1;
G.bombs = []; G.flames = []; G.particles = []; G.enemies = []; G.items = [];
G.brZone = null; G.brTeam = 1;
G.grid = [];
for (let y = 0; y < G.rows; y++) {
  const row = [];
  for (let x = 0; x < G.cols; x++) row.push((x === 0 || y === 0 || x === G.cols - 1 || y === G.rows - 1) ? 1 : 0);
  G.grid.push(row);
}
function mkP(cx, cy) {
  return { x: cx * G.T + G.T / 2, y: cy * G.T + G.T / 2, alive: true, maxBombs: 3,
    carry: false, team: -1, ai: true, lives: 3, loves: 0 };
}
const me = mkP(6, 6);
const DIRS4 = ['up', 'down', 'left', 'right'];

function sampleBomb(foeCell, n) {
  const foe = mkP(foeCell[0], foeCell[1]);
  G.players = [me, foe];
  const tgt = { x: foe.x, y: foe.y, foe: true, p: foe };
  const d2 = Math.pow((foeCell[0] - 6) * G.T, 2) + Math.pow((foeCell[1] - 6) * G.T, 2);
  let hit = 0;
  for (let i = 0; i < n; i++) {
    const c = P.aiBrChoose(me, DIRS4, 6, 6, tgt, d2);
    if (c && c.bomb) hit++;
  }
  return hit;
}
const near4 = sampleBomb([6, 10], 250);          // 4 格：舊版窗口 3.2 → 永遠 0
ok(near4 > 40, '4 格外的對手會被放彈（250 次中 ' + near4 + ' 次）', near4);
ok(near4 < 180, '不是無條件每幀都放（仍受難度機率限制）', near4);
const far7 = sampleBomb([6, 13], 250);           // 7 格：超出 4.4 窗口 → 不該放
ok(far7 === 0, '7 格外超過火焰射程就不亂放（' + far7 + ' 次）');
const tooClose = sampleBomb([6, 7], 250);        // 1 格：貼臉一定打
ok(tooClose > 40, '貼身 1 格照樣開炸（' + tooClose + ' 次）');

/* ---------------------------------------------------------------- ⑤ */
sec('⑤ 一視同仁：AI 對 AI 與對玩家同一套');
ok(/function sameTeam\(a, b\) \{\s*return !!\(\(Game\.brTeam \| 0\) >= 2/.test(SRC),
  'sameTeam 只在組隊賽且真的同隊時才成立');
ok(/if \(q !== p && q\.alive && !playerHiding\(q\) && !sameTeam\(p, q\)\)/.test(SRC),
  '選目標時不分「玩家」或「AI」，只排除同隊');
ok(!/q\.ai && q !== p/.test(SRC) && !/targetHuman/.test(SRC), '沒有「優先打玩家／只打玩家」的特例');
ok(/if \(isFoe && foeD >= 1 && foeD <= 4\.4/.test(SRC), '放彈窗口 1.0~4.4 格（v5.66 是 1.2~3.2）');
ok(/Math\.random\(\) < \(lv\.bomb \|\| \.6\)/.test(SRC), '放彈機率真的接上難度×毒圈倍率（不再硬寫 .6）');
ok(/const lv = BR_AI\.cfg\(aiLevelCfg\(\), Game\.brZone \? Game\.brZone\.phase : 0\);/.test(SRC),
  'aiBrChoose 自己取得當期 AI 參數');

/* ---------------------------------------------------------------- ⑥ */
sec('⑥ 開場緩衝：落地不會立刻互炸');
ok(/p\.brBombCd = 3 \+ Math\.random\(\) \* 4/.test(SRC), 'AI 出生時帶 3~7 秒放彈冷卻');
ok(/p\.brBombCd = BR_AI\.CD\[ph\]/.test(SRC), '放完一顆就蓋上該階段的冷卻');

/* ---------------------------------------------------------------- ⑦ */
sec('⑦ 版本戳記');
const verEl = fs.readFileSync(__dirname + '/../index.html', 'utf8').match(/id="verTxt">([\d.]+)</);
const cur = verEl ? parseFloat(verEl[1]) : 0;
ok(cur >= 5.67, '版本至少 5.67', cur);
const logSrc = fs.readFileSync(__dirname + '/../js/version-log.js', 'utf8');
ok(/v: '5\.67'/.test(logSrc), '更新紀錄有 5.67 條目');
ok(/v: '5\.66'[^]*?now: false/.test(logSrc), '上一版 5.66 已標成 now:false');

console.log('\n========================================');
console.log('v5.67 大逃殺 AI 侵略性：' + pass + ' 通過 / ' + fail + ' 失敗');
if (fail) process.exitCode = 1;
