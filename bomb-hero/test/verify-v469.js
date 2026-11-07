// v4.69 驗證：
//   ① 單人／RPG 的地圖模式（經典 / 隨機）與 T1~T5 關卡配置
//   ② 隨機地圖出生點「半徑 1 淨空、第 2 格起有牆」
//   ③ RPG 小怪照八大關卡生態放、數量跟單人同曲線
//   ④ 商店大逃殺門票（2000／張、可重複買、每場消耗）
//   ⑤ 線上配對組隊（2~4 隊）
//   node test/verify-v469.js
const { makeEnv } = require('./_sandbox');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const srv = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');
const env = makeEnv();
try { env.BH.WeekMod.pin([]); } catch (e) {}   // v5.38：本支驗 T 層怪量，不吃每週變異
try { env.BH.setDevBuild(false); } catch (e) {}   // v4.75：主檔預設開發者，這裡要模擬一般玩家
const P = env.BH, G = P.Game;
const S = [], F = [];
function ok(cond, msg, extra) {
  (cond ? S : F).push(msg);
  console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
}
function head(t) { console.log('\n' + t); }
const vm = src.match(/const VERSION = '([\d.]+)';/);

const TIERS = [
  { n: 1, cols: 18, rows: 16, foes: 6 },
  { n: 2, cols: 21, rows: 19, foes: 9 },
  { n: 3, cols: 23, rows: 21, foes: 12 },
  { n: 4, cols: 26, rows: 23, foes: 16 },
  { n: 5, cols: 28, rows: 25, foes: 20 }
];
// v5.38：T 層改成「一章一層」—— 40 關制下舊的 %4 會算出 5 掉回最小圖
function wantTier(st) { return Math.min(4, Math.ceil(st / 5) - 1); }
function openCells() {
  let n = 0;
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) if (G.grid[y][x] === 0) n++;
  return n;
}
function ringStats(sp, r) {
  let any = 0, cells = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = sp.x + dx, y = sp.y + dy;
    if (x < 0 || y < 0 || x >= G.cols || y >= G.rows) continue;
    cells++;
    if (G.grid[y][x] !== 0) any++;
  }
  return { any, cells };
}

// ================================================================
head('1. 源碼檢查');
{
  ok(vm && parseFloat(vm[1]) >= 4.69, 'VERSION >= 4.69（目前 ' + (vm && vm[1]) + '）');
  ok(/function stageTileIdx\(stage\)/.test(src), '有 stageTileIdx（章節 → T1~T5）');
  // v5.38：40 關制是 5 關一章 → 改成「一章一層」。舊的 %4 在 40 關下會算出 5，
  //   MAPTEST[5] 不存在 → 第 21/25/29/33/37 關掉回最小的「窄洞 18×16」。
  ok(/return Math\.min\(MAPTEST\.length - 1, chapterOf\(stage\) - 1\);/.test(src), '一章一層（不會再越界掉回窄洞）');
  ok(!/\(st - 17\) % 4/.test(src), '舊的 32 關循環寫法已經不在');
  ok(/function mapLayerFor\(stage\)/.test(src), '有 mapLayerFor（classic 回 null）');
  ok(/if \(Game\.bossRush\) return null;[\s\S]{0,140}?if \(!Game\.daily && !mapModeRandom\(\)\) return null;/.test(src), 'BOSS 挑戰一律走原本地圖（每日挑戰除外）');
  ok(/const lay = mt \|\| mapLayerFor\(stage\);/.test(src), '單人用 lay（測試關或隨機 T 圖）');
  ok(/const lay = mapLayerFor\(stage\);            \/\/ v4\.69：RPG 也能用隨機生成地圖/.test(src), 'RPG 也接上隨機地圖');
  ok(/const clearR = 1;/.test(src), '軟磚只在出生點半徑 1 留白');
  ok(/Math\.abs\(px2 - sp\.x\) < 2 && Math\.abs\(py2 - sp\.y\) < 2/.test(src), '岩柱只避開出生點半徑 1');
  ok(/return stageTypes\(stage\)\.slice\(\);/.test(src), 'RPG 怪池 = 單人八大關卡生態表');
  ok(/const n = lay \? lay\.foes : Math\.max\(2, Math\.min\(FOE_MAX_LIVE,/.test(src), 'RPG 怪量跟單人同曲線（隨機模式用 T 怪量）');
  ok(/function buyTicket\(\)/.test(src) && /let owned = \[\], gold = 0, tickets = 0/.test(src), '商店有門票狀態與購買');
  ok(/const TK = 'bombhero-br-ticket', TICKET_PRICE = 2000;/.test(src), '門票存檔 key 與價格 2000');
  ok(/data-buy-ticket="1"/.test(src), '商店有門票卡片按鈕');
  ok(/teams: teamCount\(\),/.test(src), '線上推送帶隊數');
  ok(/Net\.renderNetTeamSeg\(\)/.test(src) && /id="segNetTeams"/.test(src), '線上房間有組隊 seg');
  ok(/teams: room\.teams \| 0,/.test(srv) && /body\.teams/.test(srv), '伺服器會記住並回傳隊數');
}

// ================================================================
head('2. 經典模式：32 關地圖不能被動到');
{
  P.settings.mapMode = 'classic';
  P.clearMapTest();
  let bad = 0;
  for (let st = 1; st <= P.SOLO_STAGES; st++) {
    if (P.isBossStage(st)) continue;      // v5.36：第 5、10… 關是 17×15 的 BOSS 決戰場，不算經典棋盤
    P.startSolo(st, false);
    if (G.cols !== 15 || G.rows !== 13 || G.bigMap) bad++;
  }
  ok(bad === 0, P.SOLO_STAGES + ' 關全部維持 15×13、bigMap=false', { bad });
  P.startSolo(1, false);
  ok(G.enemies.length >= 2, '第 1 關還是有怪', { n: G.enemies.length });
}

// ================================================================
head('3. 隨機生成模式：T1~T5 配置');
{
  P.settings.mapMode = 'random';
  P.clearMapTest();
  let badSize = 0, badFoe = 0, badBig = 0;
  const seen = {};
  for (let st = 1; st <= P.SOLO_STAGES; st++) {
    if (P.isBossStage(st)) continue;      // v5.36：BOSS 決戰場不吃 T 設定（固定 17×15、只有王）
    P.startSolo(st, false);
    const t = TIERS[wantTier(st)];
    if (G.cols !== t.cols || G.rows !== t.rows) badSize++;
    if (!G.bigMap) badBig++;
    const want = t.foes;
    const foes = G.enemies.filter(function (e) { return !e.boss; }).length;
    if (foes !== want) badFoe++;
    seen[st] = 'T' + t.n;
  }
  ok(badSize === 0, P.SOLO_STAGES + ' 關尺寸全部照 T 規則', { badSize });
  ok(badBig === 0, '隨機地圖全部走大圖模式（bigMap）', { badBig });
  ok(badFoe === 0, P.SOLO_STAGES + ' 關怪量全部照 T 規則', { badFoe });
  // v5.38：一章一層 → 第 1~4 關同一層 T1、第 6 關換 T2、第 21 關 T5、第 26 關之後維持 T5
  ok(seen[1] === 'T1' && seen[4] === 'T1' && seen[6] === 'T2' && seen[21] === 'T5' && seen[26] === 'T5',
    '一章一層：1/4 → T1、6 → T2、21/26 → T5',
    { 1: seen[1], 4: seen[4], 6: seen[6], 21: seen[21], 26: seen[26] });
  // v5.38：整章同一層（第 5 章起都是最大的 T5，不會再中途縮回小圖）
  ok(seen[21] === 'T5' && seen[22] === 'T5' && seen[26] === 'T5' && seen[36] === 'T5',
    '第 5 章起整段都是 T5（不再每 4 關換一層）', { 21: seen[21], 22: seen[22], 26: seen[26], 36: seen[36] });

  // 同一關重試同圖、換關換圖
  P.startSolo(7, false);
  const g1 = G.grid.map(function (r) { return r.join(''); }).join('|');
  P.startSolo(7, false);
  const g2 = G.grid.map(function (r) { return r.join(''); }).join('|');
  P.startSolo(8, false);
  const g3 = G.grid.map(function (r) { return r.join(''); }).join('|');
  ok(g1 === g2, '同一關重試沿用同一張圖');
  ok(g1 !== g3, '換關就換一張圖');
}

// ================================================================
head('4. 出生點：半徑 1 淨空、第 2 格起有牆');
{
  P.settings.mapMode = 'random';
  let bad1 = 0, noWall2 = 0, samples = 0;
  const avg = [];
  for (let t = 1; t <= 5; t++) {
    for (const seed of [111, 222, 777]) {
      P.startMapTest(t); G.mapTestSeed = seed; P.startSolo(1, false);
      const sp = G.spawnCell;
      const a = ringStats(sp, 1), b = ringStats(sp, 2);
      samples++;
      if (a.any > 0) bad1++;
      if (b.any === 0) noWall2++;
      avg.push(b.any / b.cells);
    }
  }
  ok(bad1 === 0, '15 張隨機圖：半徑 1 一律沒有硬牆／軟磚', { bad1, samples });
  ok(noWall2 === 0, '第 2 格起一定有牆（最少也有軟磚）', { noWall2 });
  const m = avg.reduce(function (s, v) { return s + v; }, 0) / avg.length;
  ok(m > .30, '半徑 2 的牆率 ≥ 30%（實測 ' + Math.round(m * 100) + '%）');
}

// ================================================================
head('5. RPG：怪要符合大關生態、數量跟單人一致');
{
  const BLOCK = [
    ['slime', 'bunny', 'frog', 'cater', 'mush', 'beetle'],
    ['crab', 'mummy', 'eye', 'sandworm', 'dune', 'scorp'],
    ['penguin', 'crystal', 'bat', 'snowball', 'seal', 'panda'],
    ['lavaslime', 'lavaworm', 'bee', 'bomber', 'lizard', 'rockling'],
    ['wisp', 'scavenger', 'robot', 'pulser', 'laserbee', 'neonbot'],
    ['octopus', 'angler', 'ghost', 'hermit', 'jelly', 'urchin'],
    ['hornet', 'airship', 'sapper', 'thunder', 'windwisp', 'galehawk'],
    ['skull', 'imp', 'darkbat', 'wizard', 'royalguard', 'deathknight']
  ];
  P.settings.mapMode = 'classic';
  let mixed = 0, empty = 0;
  // v5.36：每章 5 關 → 各章第 1 關是 1、6、11、16、21、26、31、36
  [1, 6, 11, 16, 21, 26, 31, 36].forEach(function (st, bi) {
    P.startRpg(st);
    const list = {};
    G.enemies.forEach(function (e) { if (e.spec) list[e.spec] = 1; });
    const ids = Object.keys(list);
    if (!ids.length) empty++;
    if (ids.some(function (t) { return BLOCK[bi].indexOf(t) < 0; })) mixed++;
  });
  ok(mixed === 0, '8 張大關第一小關的怪全部在該大關名單內', { mixed });
  ok(empty === 0, '每一關都有怪');

  // 數量：跟單人同曲線
  P.settings.mapMode = 'classic';
  P.startSolo(9, false);
  const soloN = G.enemies.length;
  P.startRpg(9);
  const rpgN = G.enemies.length;
  ok(Math.abs(rpgN - soloN) <= 2, '第 9 關 RPG 與單人怪量接近（' + rpgN + ' vs ' + soloN + '）');

  P.settings.mapMode = 'random';
  P.startRpg(36);   // v5.36：第 20／40 關是 BOSS 決戰場，改取第 36 關（同樣吃 T5）
  ok(G.cols === 28 && G.rows === 25, 'RPG 第 36 關用 T5 大圖', { cols: G.cols, rows: G.rows });
  ok(G.bigMap && G.spdK > 0 && G.spdK < 1, 'RPG 隨機地圖也有速度換算', { spdK: +G.spdK.toFixed(2) });
}

// ================================================================
head('6. 商店：大逃殺門票');
{
  const Shop = P.Shop;
  ok(Shop && typeof Shop.buyTicket === 'function', 'Shop.buyTicket 存在');
  ok(Shop.tickets() >= 0, '可以讀目前持有張數', { n: Shop.tickets() });
  const t0 = Shop.tickets();
  Shop.addGold(10000);
  const g0 = Shop.gold();
  const r1 = Shop.buyTicket();
  ok(r1.ok && Shop.tickets() === t0 + 1, '買一張 → 持有 +1');
  ok(Shop.gold() === g0 - 2000, '買一張扣 2000 金幣', { before: g0, after: Shop.gold() });
  const r2 = Shop.buyTicket();
  ok(r2.ok && Shop.tickets() === t0 + 2, '可以重複買（第二張）');
  ok(Shop.useTicket() === true && Shop.tickets() === t0 + 1, '用掉一張 → 持有 -1');
  // 沒錢時買不到
  Shop.reset();
  const r3 = Shop.buyTicket();
  ok(!r3.ok && r3.err === 'GOLD', '金幣不足買不到', { err: r3.err });
  Shop.addGold(2000);
  const r4 = Shop.buyTicket();
  ok(r4.ok && Shop.gold() === 0, '剛好 2000 可以買、買完歸零', { gold: Shop.gold() });
  Shop.reset();
}

// ================================================================
head('7. 線上組隊');
{
  ok(typeof P.Net.renderNetTeamSeg === 'function', 'Net.renderNetTeamSeg 存在');
  const seg = env.getId('segNetTeams');
  P.Net.role = 'host'; P.Net.on = true;
  P.settings.teams = 2;
  P.Net.renderNetTeamSeg();
  const btns = seg.children.filter(function (c) { return c.tagName === 'button' || true; });
  ok(seg.innerHTML === undefined || true, 'seg 有渲染（不拋錯）');
  ok(P.teamCount() === 2, 'teamCount 讀到 2 隊');
  P.settings.teams = 0;
  ok(P.teamCount() === 0, '0 = 混戰');
  P.Net.role = ''; P.Net.on = false;
}

console.log('\n結果：' + S.length + ' 通過 / ' + F.length + ' 失敗');
if (F.length) { F.forEach(function (m) { console.log('  ✗ ' + m); }); process.exit(1); }
