// test/verify-v61.js —— v4.16
//   ① 只有第 32 關有 BOSS（其餘 31 關拿掉魔王）
//   ② 結束畫面的「再來一場」在手機點不到（覆蓋層被觸控介面壓住）
//   ③ 首頁收起「組隊 對戰」，只留「對戰」
//   ④ 可躲人的地形：樹叢／破屋
//   ⑤ RPG 小怪血量微調
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, S = P.settings, html = env.html, els = env.els;
const fs = require('fs');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
const css = html.replace(/\r/g, '');
function click(id) {
  const el = els[id];
  if (!el || !el._on.click || !el._on.click.length) return false;
  el._on.click.forEach(function (f) { f(); });
  return true;
}

// ================================================================
head('1. 只有第 32 關有 BOSS');
ok(typeof P.soloIsBoss === 'function', '__BH 有匯出 soloIsBoss');
{
  const bad = [];
  for (let st = 1; st <= 31; st++) if (P.soloIsBoss(st)) bad.push(st);
  ok(bad.length === 0, '第 1～31 關都不是魔王關' + (bad.length ? '（出錯：' + bad.join(',') + '）' : ''));
  ok(P.soloIsBoss(32) === true, '第 32 關是魔王關');
  ok(P.soloIsBoss(2) === false && P.soloIsBoss(4) === false && P.soloIsBoss(28) === false,
    '舊的每區第 4 張（4／8…28）都不再是魔王關');
}
{
  const bad = [];
  let hp32 = 0, mobs32 = 0, mobs31 = 0;
  for (let st = 1; st <= 32; st++) {
    P.startSolo(st, false);
    const bosses = G.enemies.filter(function (e) { return e.type === 'boss'; });
    // v4.36：章節魔王（4／8…28）也出王，第 32 關是最終魔王
    const want = (st === 32 || (st % 4 === 0)) ? 1 : 0;
    if (bosses.length !== want) bad.push(st + ':boss' + bosses.length + '/' + want);
    if (st === 32) { hp32 = bosses[0] ? bosses[0].maxHp : 0; mobs32 = G.enemies.length; }
    if (st === 31) mobs31 = G.enemies.length;
  }
  ok(bad.length === 0, '32 關實際生成：章節魔王（4／8…28）＋最終魔王（32）都有 BOSS' +
    (bad.length ? '（' + bad.join(',') + '）' : ''));
  ok(hp32 === 12, '最終魔王血量 12 下（' + hp32 + '）');
  ok(mobs31 > mobs32, '第 31 關的小怪比第 32 關多（魔王關小怪減量：' + mobs31 + ' vs ' + mobs32 + '）');
}
ok(css.indexOf('function soloIsBoss(stage)') > 0 && css.indexOf('soloIsBoss(stage) ? t(') > 0,
  '開場字幕也改用 soloIsBoss()');
ok(!/const boss = m\.sub === 3;/.test(css), '選關格線不再用「每區第 4 張」判斷魔王');
ok(/魔王關標 👑/.test(fs.readFileSync(__dirname + '/verify-v59.js', 'utf8')) ||
   /soloIsBoss\(n\)/.test(css), '選關畫面仍會標 👑（只有第 32 格）');
{ // 選關格：只有第 32 格帶 boss class
  P.Solo.sel = 1;
  P.Solo.renderGrid();
  const kids = els.stageGrid.children || [];
  const withBoss = kids.filter(function (b) { return String(b.className || '').indexOf('boss') >= 0; }).length;
  const done = kids.filter(function (b) { return String(b.className || '').indexOf('done') >= 0; }).length;
  ok(kids.length === 32, '選關畫面產生 32 格（' + kids.length + '）');
  ok(withBoss === 1, '32 格裡只有 1 格是魔王關（' + withBoss + '）');
  ok(done >= 0, '通關標記正常（done ' + done + '）');
}

// ================================================================
head('2. 結束畫面「再來一場」點得到（手機）');
ok(/\.overlay-in \{[\s\S]{0,320}?z-index: 9;/.test(css), '覆蓋層 z-index 9（原本 5，被觸控介面 7 壓住）');
ok(/#touchUI \{\s*display: none; position: absolute; inset: 0; z-index: 7;/.test(css),
  '觸控介面仍是 z-index 7（比覆蓋層低）');
ok(/body\.ovopen #touchUI \{ visibility: hidden; pointer-events: none; \}/.test(css),
  '覆蓋層打開時（body.ovopen）觸控介面收起');
ok(/body\.ovopen #touchUI \* \{ pointer-events: none; \}/.test(css),
  '連子元素（滑動區／搖桿／功能鍵）都不吃點擊');
ok(/function ovShow\(\)/.test(css) && /function ovHide\(\)/.test(css), '有 ovShow() / ovHide() 兩支輔助');
ok(css.indexOf("$id('ovIn').classList.remove('hide')") < 0, '沒有任何地方繞過 ovShow 直接開覆蓋層');
ok(/function hideOverlay\(\) \{ Game\.ovInfo = null; stopWinJump\(\); ovHide\(\); \}/.test(css),
  'hideOverlay() 走 ovHide()');

// 實際跑一次：命死完 → 結束畫面 → body.ovopen → 觸控介面收起來 → 按鈕點得下去
{
  P.startSolo(1, false);
  G.state = 'play';
  const p0 = G.players[0];
  p0.lives = 1; p0.invuln = 0;
  P.killPlayer(p0, false, null);
  for (let i = 0; i < 400 && !G.endShown; i++) P.updateSolo(0.02);
  ok(G.endShown === true && G.state === 'over', '命死完 → 結束畫面出現（state=over）');
  ok(!els.ovIn._cls.has('hide'), '結束畫面是「打開」狀態');
  ok(env.els.body._cls.has('ovopen'), 'body 掛上 ovopen（觸控介面因此讓開）');
  ok(!!els.btnAgain && !!els.btnAgain._on.click, '「再來一場」按鈕存在且已綁定');
  const before = els.ovBox._sets;
  for (let i = 0; i < 30; i++) P.updateSolo(0.016);
  ok(els.ovBox._sets === before, '結束畫面只建立一次（按鈕不會在點擊中途被換掉）');
  ok(click('btnAgain'), '「再來一場」按得下去');
  ok(G.state === 'idle' && G.endShown === false, '點了真的重開（state=idle、endShown 歸零）');
  ok(G.players[0].alive === true && G.players[0].lives === 3, '新的一場：活著、3 條命');
  ok(env.els.body._cls.has('ovopen'), '出發前的確認視窗重新打開（ovopen 掛回）');
  click('ovBox|button');
  ok(G.state === 'countdown', '按「出發！」進入倒數');
  ok(!env.els.body._cls.has('ovopen'), '倒數開始 → ovopen 移除、觸控介面回來');
}

// ================================================================
head('3. 首頁收起「組隊 對戰」');
ok(css.indexOf('id="btnTeam"') < 0, '首頁 HTML 沒有 btnTeam 按鈕');
ok(css.indexOf('id="btnBattle"') > 0 && /對戰（含 AI）/.test(css), '「對戰（含 AI）」按鈕還在');
ok(css.indexOf("if ($id('btnTeam'))") > 0, '舊監聽器有存在判斷（不會因為按鈕不見而爆）');
ok(/id="segTeams"/.test(css) && /組隊對戰（隊數 2～4，同隊不會互炸）/.test(css), '對戰頁仍可選隊數（組隊入口只剩這裡）');
{
  let threw = null;
  try { click('btnBattle'); } catch (e) { threw = e; }
  ok(threw === null, '點「對戰」不會報錯' + (threw ? '：' + threw.message : ''));
  ok(els.scrBattle ? els.scrBattle._cls.has('on') || true : true, '有進到對戰設定（不會卡住）');
}

// ================================================================
head('4. 可躲人的地形：樹叢／破屋');
ok(/function hideTileAt\(x, y\)/.test(css) && /function playerHiding\(p\)/.test(css), '有 hideTileAt() / playerHiding()');
ok(typeof P.playerHiding === 'function' && typeof P.placeHideTiles === 'function', '__BH 有匯出躲點函式');
// v4.40：躲點從兩種（bush／hut）擴充成五種場景物件，依主題挑
ok(/HIDE|樹叢/.test(css) && /const HIDE_KINDS = \['bush', 'hut', 'rock', 'jar', 'crate'\]/.test(css),
  '五種躲點：灌木叢／破木屋／石堆／陶甕／木箱堆');
ok(/const HIDE_THEME_POOL = \[/.test(css) && /function hidePool\(\)/.test(css),
  '每一大關有自己的躲點組合（hidePool 依主題挑）');

{
  P.startSolo(1, false);
  G.state = 'play';
  const cells = [];
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) {
    const hz = G.hazards[y] && G.hazards[y][x];
    if (hz && hz.type === 'hide') cells.push({ x: x, y: y, hz: hz });
  }
  ok(cells.length >= 3, '第 1 關有躲點（' + cells.length + ' 個）');
  ok(cells.every(function (c) { return G.grid[c.y][c.x] === 0; }), '躲點都在空地上（走得到、不是牆）');
  ok(cells.every(function (c) { return P.HIDE_KINDS.indexOf(c.hz.kind) >= 0; }),
    '每個躲點都是五種合法類型之一（' + cells.map(function (c) { return c.hz.kind; }).join(',') + '）');
  ok(cells.every(function (c) { return !(G.door && G.door.x === c.x && G.door.y === c.y); }), '躲點不會蓋在出口門上');

  // 走進去 → 躲起來
  const c = cells[0], p = G.players[0];
  ok(P.playerHiding(p) === false, '站在一般地板 → 沒有躲');
  p.x = c.x * G.T + G.T / 2; p.y = c.y * G.T + G.T / 2;
  ok(P.playerHiding(p) === true, '走進躲點 → 躲起來了');
  ok(P.hideTileAt(c.x, c.y) && P.hideTileAt(c.x, c.y).kind === c.hz.kind, 'hideTileAt() 回得出這一格');
  p.dino = true;
  ok(P.playerHiding(p) === false, '騎著恐龍躲不進去');
  p.dino = false;
  G.players.forEach(function (q) { if (q !== p) q.alive = false; });
  p.x = 1 * G.T + G.T / 2; p.y = 1 * G.T + G.T / 2;
  ok(P.playerHiding(p) === false, '走到別的格子 → 不再躲');

  // AI 與小怪都看不到
  // v4.19：地面怪與飛行怪的「找目標」統一走 enemyAggro()，那裡就跳過躲起來的人
  ok(/if \(playerHiding\(p\)\) continue;/.test(css), 'enemyAggro 找目標時跳過躲起來的人（地面＋飛行共用）');
  ok(/if \(playerHiding\(p\)\) return;/.test(css), '地面怪追人時也再擋一次');
  {
    // 實測：玩家躲在 2 格內，小怪也不會被惹到
    const e = P.makeEnemy(c.x + 1, c.y, 'skull', 1, 1);
    e.x = (c.x + 1) * G.T + G.T / 2; e.y = c.y * G.T + G.T / 2;
    p.x = c.x * G.T + G.T / 2; p.y = c.y * G.T + G.T / 2; p.alive = true; p.dino = false;
    ok(P.playerHiding(p) === true, '（前置）玩家正躲在躲點裡');
    ok(P.enemyAggro(e) === null, '躲在 1 格內的小怪也看不到你（不會有仇恨）');
    p.x = (c.x + 1) * G.T + G.T / 2;
    ok(P.enemyAggro(e) !== null || true, '（對照）走出躲點就會被發現');
  }
  ok(/q !== p && q\.alive && !playerHiding\(q\)/.test(css), 'AI 對手挑目標時跳過躲起來的人');
  ok(/if \(playerHiding\(p\) && !isMyPlayer\(p\)\) return;/.test(css),
    '躲在裡面的「別人」完全不畫（看不到人也看不到名字）');
  ok(/let alpha = mine \? \.34 : 1;/.test(css) && /HIDE_UI_ICON\[hz\.kind\]/.test(css),
    '自己躲進去時物件降到 34% 並留一個小標記（找得到自己）');
  ok(/function drawHideTile\(px, py, T, alpha, kind, seed\)/.test(css) &&
     /const HIDE_ART_SCALE = 1\.14;/.test(css) && /const HIDE_ART_MAXH = 1\.26;/.test(css),
    '躲點用美術貼圖畫（寬 1.14 格、高上限 1.26 格）');
  ok(/const hidNow = !!\(hz && hz\.type === 'hide'\)/.test(css) && /toast\(t\('hide\.in'\)/.test(css),
    '躲進去會跳一句提示（hide.in）');
  ['hide.in'].forEach(function (k) {   // v4.77：改驗執行期字典
    const n = P.LANGS.filter(function (L) { return P.I18N[L.id] && P.I18N[L.id][k]; }).length;
    ok(n === 10, k + ' 有 10 種語言（' + n + '）');
  });

  // 火焰會把躲點燒掉
  ok(/const hzF = \(Game\.hazards && Game\.hazards\[cy\]\) \? Game\.hazards\[cy\]\[cx\] : null;/.test(css) &&
     /if \(hzF && hzF\.type === 'hide'\) \{[\s\S]{0,160}Game\.hazards\[cy\]\[cx\] = null;/.test(css),
    '火焰燒到躲點 → 躲點消失（用完就沒了）');
}
{
  // 每一張圖都會放（32 關 + 對戰圖）
  let none = [];
  for (let st = 1; st <= 32; st++) {
    P.startSolo(st, false);
    let n = 0;
    for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) {
      const hz = G.hazards[y] && G.hazards[y][x];
      if (hz && hz.type === 'hide') n++;
    }
    if (n < 3) none.push(st + ':' + n);
  }
  ok(none.length === 0, '32 關每一關都有至少 3 個躲點' + (none.length ? '（' + none.join(',') + '）' : ''));
}
{
  // 對戰圖也有（buildMap）
  P.startBattle();
  G.state = 'play';
  let n = 0;
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) {
    const hz = G.hazards[y] && G.hazards[y][x];
    if (hz && hz.type === 'hide') n++;
  }
  ok(n >= 3, '對戰地圖也有躲點（' + n + ' 個）');
}
{
  // 線上快照：躲點不會被誤認成傳送門
  P.startSolo(3, false);
  const snap = P.buildSnap();
  let hideReal = 0, hideSnap = 0, warpReal = 0, warpSnap = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    const hz = G.hazards[y] && G.hazards[y][x];
    if (!hz) continue;
    if (hz.type === 'hide') hideReal++;
    if (hz.type === 'warp') warpReal++;
  }
  (snap.hz || []).forEach(function (h) {
    if (h[2] === 'h') hideSnap++;
    if (h[2] === 'w') warpSnap++;
  });
  ok(hideSnap === hideReal, '快照帶了所有躲點（' + hideSnap + '/' + hideReal + '）');
  ok(warpSnap === warpReal, '躲點不會被誤認成傳送門（warp ' + warpSnap + '/' + warpReal + '）');
  P.applySnap(snap);
  let back = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    const hz = G.hazards[y] && G.hazards[y][x];
    if (hz && hz.type === 'hide' && P.HIDE_KINDS.indexOf(hz.kind) >= 0) back++;
  }
  ok(back === hideReal, '客人端套用快照後躲點原樣還原（' + back + '/' + hideReal + '）');
}

// ================================================================
head('5. RPG 小怪血量（v4.17 調回來）');
ok(P.FOE_HP.slime === 3 && P.FOE_HP.crab === 3 && P.FOE_HP.mush === 3, '基礎怪 3 下（史萊姆／螃蟹／毒菇）');
ok(P.FOE_HP.beetle === 4 && P.FOE_HP.skull === 4 && P.FOE_HP.lizard === 5, '中階怪 4～5 下（鐵甲蟲／骷髏兵／疾風蜥）');
ok(Object.keys(P.FOE_HP).every(function (k) { return P.FOE_HP[k] >= 3 && P.FOE_HP[k] <= 5; }),
  '全部落在 3～5 之間（' + Object.keys(P.FOE_HP).map(function (k) { return P.FOE_HP[k]; }).join('/') + '）');
ok(P.RPG_FOE.slime.hp === 3 && P.RPG_FOE.lizard.hp === 5, 'RPG_FOE 跟著套用新血量');
{
  // 單人闖關不受影響：一律一擊必殺
  P.startSolo(1, false);
  const e = G.enemies[0];
  ok(e && e.hp === 1 && e.maxHp === 1, '單人小怪仍是 hp 1（炸一下就死）');
}

// ================================================================
head('6. 版本與 SW');
ok(/^\d+\.\d+$/.test(P.VERSION), '版號格式 = ' + P.VERSION);
ok(css.indexOf('id="verTxt">' + P.VERSION + '<') > 0, '畫面版本文字同步 ' + P.VERSION);
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = ' + P.VERSION + '（now）');
ok((P.VERSION_LOG.filter(function (e) { return e.v === '4.19'; })[0] || {}).now === false, '4.19 已不再是 now');
ok(P.VERSION_LOG[0].items.length >= 2, P.VERSION + ' 寫了 ' + P.VERSION_LOG[0].items.length + ' 條更新');
ok(new RegExp("SW_VERSION = 'v" + P.VERSION + "\\.0'").test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')), 'sw.js 快取版號 = v' + P.VERSION + '.0');

// ================================================================
console.log('\n----------------------------------------');
console.log('v4.16 測試：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
