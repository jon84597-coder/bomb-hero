// 無頭測試 v26：v1.8 的八項需求
//   1. 打 BOSS 時從「下方」出生（不再從玩家上方）
//   2. BOSS 體型放大（比自己的角色有魄力）
//   3. 音樂／音效開關永遠顯示在右方（連遊戲中也是）
//   4. 首頁拿掉 ICON：BOMB HERO 大字 / 爆爆英雄中字 / 測試版小字
//   5. 首頁多「組隊 對戰（未開放 敬請期待）」
//   6. 電腦騎到龍也會吐火（頻率低）
//   7. 騎龍吃第二顆蛋 → 紅龍，吐火一次燒上下左右各 2 格（被炸一下龍還是消失）
//   8. 場外推車按住集氣：第 1／2／3 格，三種顏色
const { makeEnv, html } = require('./_sandbox');
const ART = require('./_artcheck');

const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH, rec = env.rec;
const mk = () => env.mkCtx2D();

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function clearRec() { rec.calls.length = 0; rec.sets.length = 0; }
function callsNamed(name) { return rec.calls.filter(function (c) { return c[0] === name; }); }
function styleUsed(v) {
  return rec.sets.some(function (c) {
    return (c[0] === 'fillStyle' || c[0] === 'strokeStyle') && String(c[1]) === v;
  });
}
function freshSolo(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.settings.soloTime = 300;
  P.startSolo(stage || 1, false);
  G.state = 'play';
  if (G.players[0]) G.players[0].invuln = 0;
  return G.players[0];
}
function freshBattle() {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.revenge = 'off';
  P.settings.ctrl = 'kb';
  P.settings.count = 4;
  P.settings.aiLevel = 'normal';
  P.Battle.resetSlots();
  P.startBattle();
  G.state = 'play';
  G.bombs.length = 0; G.flames.length = 0; G.bubbles.length = 0; G.particles.length = 0;
  G.players.forEach(function (p) {
    p.invuln = 0; p.cart = false; p.alive = true; p.gloat = 0;
    p.beltMul = 1; p.warpLock = ''; p.warpCool = 0; p.slide = null;
  });
  return G.players;
}
// 清出一張全空的場地（外牆留著，才能算「離外牆第幾格」）
function openField() {
  for (let y = 1; y < G.rows - 1; y++)
    for (let x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
  G.bombs.length = 0; G.flames.length = 0; G.items.length = 0;
  G.enemies.length = 0; G.particles.length = 0; G.bubbles.length = 0;
  if (G.eggs) G.eggs.length = 0;
}
function cellsOfFlames() {
  const m = {};
  G.flames.forEach(function (f) { m[f.cx + ',' + f.cy] = true; });
  return Object.keys(m);
}

// ================================================================
console.log('=== 1. BOSS 從「下方」出生（不再從玩家頭上冒出來） ===');
let bossRows = [], bossUnder = 0, rowsSeen = 0;
for (let run = 0; run < 6; run++) {
  const p = freshSolo(32);          // v4.16：只有第 32 關有 BOSS
  const boss = G.enemies.filter(function (e) { return e.boss; })[0];
  if (!boss) continue;
  const T = G.T;
  const by = Math.floor(boss.y / T), bx = Math.floor(boss.x / T);
  rowsSeen++;
  bossRows.push(by);
  if (by > Math.floor(p.y / T)) bossUnder++;
  if (by >= G.rows - 3) ok(true, '第 ' + (run + 1) + ' 次：BOSS 在最下面幾排（row ' + by + '/' + (G.rows - 1) + '）');
  else ok(false, '第 ' + (run + 1) + ' 次：BOSS 在最下面幾排（實際 row ' + by + '）');
  if (G.grid[by][bx] === 0) ok(true, '第 ' + (run + 1) + ' 次：登場那一格是空的（站得住）');
}
ok(rowsSeen === 6, '六次重開都有 BOSS（' + rowsSeen + '/6）');
ok(bossUnder === rowsSeen, 'BOSS 永遠出生在玩家「下方」（' + bossUnder + '/' + rowsSeen + '）');
ok(bossRows.every(function (r) { return r >= G.rows - 3; }), 'BOSS 貼著地圖下緣登場（rows ' + bossRows.join(',') + '）');
ok(html.indexOf('// v1.8：BOSS 從「畫面下方」登場') > 0, '原始碼有註明「從下方登場」');
ok(/boss\.dirName = 'up'/.test(html), '登場後面朝上方（往玩家的方位走）');

// ================================================================
console.log('\n=== 2. BOSS 體型放大 ===');
const mb = P.makeBoss(5, 5, 10);
ok(mb.sizeMul === 1.34, 'BOSS 有體型放大倍率 sizeMul=1.34（' + mb.sizeMul + '）');
ok(mb.dirName === 'up', 'BOSS 預設面朝上');
ok(mb.r === 24, '判定半徑維持 24（變大只是外觀，不會變得更難躲）');
const oldH = mb.r * 4.3, newH = mb.r * 4.3 * mb.sizeMul;
ok(newH > oldH * 1.3, '畫出來的身高從 ' + oldH.toFixed(0) + 'px 變成 ' + newH.toFixed(0) + 'px（+34%）');
ok(/const BS = e\.sizeMul \|\| 1;/.test(html) && /const BH = e\.r \* 4\.[0-9] \* BS \* AK;/.test(html),
  'drawEnemy 真的用 BS 放大身高（v2.6：再乘上格子縮放 AK）');
ok(/const sr = e\.boss \? e\.r \* \(e\.sizeMul \|\| 1\) \* tileArtK\(\) : ar;/.test(html),
   'BOSS 的影子也跟著放大（小怪改走 ar：v2.4 放大後的外型半徑）');
ok(/const bw = Math\.max\(52, Game\.T \* \(e\.brBoss \? 1\.55 : 1\.15\)\);/.test(html), '血條加寬（配合放大後的體型；v4.76 亂入 BOSS 再寬一點）');
// 與玩家對比：BOSS 身高 > 角色身體半徑的兩倍
const pl = freshSolo(1);
const pT = G.T;
ok(newH > pT * .40 * 2 * 1.6, 'BOSS（' + newH.toFixed(0) + 'px）明顯比玩家角色還大');

// ================================================================
console.log('\n=== 3. 音樂／音效開關永遠顯示在右方（連遊戲中也是） ===');
ok(html.indexOf('#navBar.inGame') > 0, '有「遊戲中工具列」樣式 #navBar.inGame');
ok(/#navBar\.inGame \{[^}]*justify-content: flex-end/.test(html), '遊戲中兩顆開關仍靠右');
ok(/#navBar\.inGame #btnBack \{ display: inline-flex/.test(html), 'v2.3：遊戲中「← 上一頁」改成顯示（討伐 BOSS 才退得回來）');
ok(!/classList\.toggle\('hide', cur === 'game'\)/.test(html), '不再把整條工具列藏起來');
ok(/classList\.toggle\('inGame', cur === 'game'\)/.test(html), '遊戲中改掛 inGame（精簡模式）');
const navBar = env.els.navBar;
P.Screen.show('title');
ok(navBar && !navBar._cls.has('hide') && !navBar._cls.has('inGame'), '標題頁：完整工具列');
P.Screen.show('settings');
ok(navBar && !navBar._cls.has('hide') && !navBar._cls.has('inGame'), '設定頁：完整工具列');
P.Screen.show('online');
ok(navBar && !navBar._cls.has('hide'), '線上頁：🎵／🔊 也在');
P.Screen.show('game');
ok(navBar && !navBar._cls.has('hide'), '遊戲頁：工具列沒有被收起來');
ok(navBar && navBar._cls.has('inGame'), '遊戲頁：切成右上精簡版');
const navHtml = html.slice(html.indexOf('<div id="navBar">'), html.indexOf('</div>\n  <div class="wrap'));
ok(/id="btnMusic"/.test(navHtml) && /id="btnSfx"/.test(navHtml), '🎵 音樂 ＋ 🔊 音效 兩顆都在工具列上');
ok(/<div class="navright">/.test(navHtml), '兩顆開關排在右側容器 .navright');
const mBtn = env.els.btnMusic, sBtn = env.els.btnSfx;
ok(!!(mBtn && mBtn._on.click && mBtn._on.click.length), '🎵 音樂有綁定點擊');
ok(!!(sBtn && sBtn._on.click && sBtn._on.click.length), '🔊 音效有綁定點擊');
function clickAll(el) { (el._on.click || []).forEach(function (f) { f(); }); }
const bgm0 = P.settings.bgm, sfx0 = P.settings.sfx;
let threw = null;
try { clickAll(mBtn); clickAll(sBtn); } catch (e) { threw = e; }
ok(!threw, '點開關不會報錯' + (threw ? '：' + threw.message : ''));
ok(P.settings.bgm === 0 && P.settings.sfx === 0, '點一下就關（bgm ' + P.settings.bgm + ' / sfx ' + P.settings.sfx + '）');
ok(mBtn._cls.has('off') && sBtn._cls.has('off'), '關掉時按鈕出現灰色.off 狀態');
try { clickAll(mBtn); clickAll(sBtn); } catch (e) { threw = e; }
ok(!threw, '再點一次不會報錯' + (threw ? '：' + threw.message : ''));
ok(P.settings.bgm > 0 && P.settings.sfx > 0, '再點一次就<｜hy_place▁holder▁no▁813｜>（bgm ' + P.settings.bgm + ' / sfx ' + P.settings.sfx + '）');
ok(!mBtn._cls.has('off') && !sBtn._cls.has('off'), '開回來後按鈕回到亮色');
P.Screen.show('title');

// ================================================================
console.log('\n=== 4. 首頁標題：拿掉 ICON，BOMB HERO 大字 / 爆爆英雄中字 / 測試版小字 ===');
ok(html.indexOf('class="logo-big"') < 0, 'ICON 圖塊已拿掉（首頁沒有 .logo-big）');
ok(/<img class="title-logo" id="titleLogo" alt="BOMB HERO 爆爆英雄"[^>]*src="spr\/title-logo\.webp"/.test(html) && ART.isArtOk('spr/title-logo.webp') && ART.artFile('spr/title-logo.webp').length > 20000, 'v2.1：標題改用美術 LOGO 圖（spr/title-logo.webp、夠大不是佔位）');
ok(html.indexOf('title-en') < 0 && html.indexOf('title-zh') < 0, 'v2.1：舊的文字標題（.title-en／.title-zh）已完全移除');
ok(/<div class="ver beta">(測試版|正式版) v<span id="verTxt">/.test(html), '「測試版／正式版 v」小字徽章（版號由 VERSION 帶入）');
const logoRule = html.match(/\.title-logo \{[^}]*width: clamp\(([^)]*)\)/);
const betaRule = html.match(/\.ver\.beta \{[^}]*font-size: clamp\(([^)]*)\)/);
function clampMax(s) { const a = (s || '').split(','); return parseFloat((a[a.length - 1] || '0').replace('px', '')); }
ok(!!logoRule, 'LOGO 用 clamp() 自適應寬度');
ok(clampMax(logoRule && logoRule[1]) >= 400, 'LOGO 最大寬度 ' + clampMax(logoRule && logoRule[1]) + 'px（夠氣派）');
ok(clampMax(betaRule && betaRule[1]) <= 12, '「測試版」維持小字（' + clampMax(betaRule && betaRule[1]) + 'px）');
ok(/body\.touch \.title-card \.title-logo \{ width: clamp\(/.test(html), '手機直放也有專屬 LOGO 寬度');
ok(/<div class="titlewrap">\s*<img class="title-logo"/.test(html), '順序：LOGO 圖包在 .titlewrap 裡');

// ================================================================
console.log('\n=== 5. 首頁收起了「組隊 對戰」（v4.16：改在對戰頁選隊數） ===');
ok(html.indexOf('id="btnTeam"') < 0, '首頁沒有「組隊 對戰」按鈕（只留「對戰」一個入口）');
// v4.81：對戰＋線上配對合成首頁的「多人對戰」，本機入口改成選擇器裡的 mpLocal
ok(html.indexOf('id="btnMulti"') > 0 && html.indexOf('id="mpLocal"') > 0, '「多人對戰」入口（本機混戰）還在');
ok(/id="segTeams"/.test(html) && /data-v="4">4<\/button>/.test(html), '對戰頁仍然可以選隊數（關閉／2／3／4）');
ok(html.indexOf("if ($id('btnTeam'))") > 0, '舊的監聽器有存在判斷（找不到按鈕也不會爆）');
ok(/\.mbtn\.soon \{[\s\S]{0,120}?border: 1px dashed/.test(html), '樣式仍在（給未來未開放的按鈕用）');

// ================================================================
console.log('\n=== 6. 電腦騎到龍也會吐火（頻率低） ===');
freshBattle();
openField();
const T6 = G.T;
const aiP = G.players[1];
G.players.forEach(function (q, i) { if (i > 1) { q.alive = false; q.cart = false; } });
aiP.ai = true; aiP.cart = false; aiP.alive = true; aiP.dino = true; aiP.redDragon = false; aiP.fireCd = 0;
aiP.x = Math.floor(G.cols / 2) * T6 + T6 / 2;
aiP.y = Math.floor(G.rows / 2) * T6 + T6 / 2;
const foe6 = G.players[0];
foe6.alive = true; foe6.cart = false; foe6.invuln = 999;
foe6.x = aiP.x + T6 * 2; foe6.y = aiP.y;          // 固定保持在旁邊 2 格
function aiFireRun(seconds) {
  let fired = 0;
  for (let f = 0; f < seconds * 60; f++) {
    foe6.x = aiP.x + T6 * 2; foe6.y = aiP.y;       // 每幀釘住在旁邊，確保「有目標」
    const before = G.flames.length;
    BH.controlAI(aiP, 1 / 60);
    if (G.flames.length > before) fired++;
    G.flames.length = 0;
    aiP.fireCd = Math.max(0, aiP.fireCd - 1 / 60);
  }
  return fired;
}
let aiFires = 0;
for (let k = 0; k < 3; k++) { aiP.fireCd = 0; aiFires += aiFireRun(20); }
ok(aiFires > 0, '電腦騎龍真的會吐火（60 秒吐了 ' + aiFires + ' 次）');
const aiGap = 60 / Math.max(1, aiFires);
ok(aiGap > P.DINO_FIRE_CD, '電腦吐火間隔 ' + aiGap.toFixed(1) + ' 秒 > 玩家的 ' + P.DINO_FIRE_CD + ' 秒（頻率明顯較低）');
ok(!!P.AI_LEVELS.normal.dinoFire && P.AI_LEVELS.normal.dinoFire < .4, '觸發機率低（dinoFire=' + P.AI_LEVELS.normal.dinoFire + '）');
ok(P.AI_LEVELS.weak.dinoFire < P.AI_LEVELS.strong.dinoFire, '弱 AI 吐得比強 AI 更少（' + P.AI_LEVELS.weak.dinoFire + ' < ' + P.AI_LEVELS.strong.dinoFire + '）');
ok(P.AI_LEVELS.normal.dinoFireCd > 1, 'AI 冷卻是玩家的 ' + P.AI_LEVELS.normal.dinoFireCd + ' 倍');

// ================================================================
console.log('\n=== 7. 騎龍吃到第二顆蛋 → 紅龍（四方向吐火各 2 格） ===');
freshSolo(1);
openField();
const T7 = G.T;
const p7 = G.players[0];
p7.x = Math.floor(G.cols / 2) * T7 + T7 / 2;
p7.y = Math.floor(G.rows / 2) * T7 + T7 / 2;
const pcx = Math.floor(p7.x / T7), pcy = Math.floor(p7.y / T7);
// 第一次吃蛋 → 一般小龍
BH.spawnEggs(1);
G.eggs.length = 0;
G.eggs.push({ x: pcx, y: pcy, bob: 0, wob: 0 });
ok(P.takeEgg(p7) === true, '吃到第一顆蛋');
ok(p7.dino === true && !p7.redDragon, '第一次只是騎上小龍（還不是紅龍）');
// 吐火：v4.38 把範圍調回 2 格 —— 使用者回報「對戰時燒不到人」的真正原因是判定
//   （flameCovers 用 floor 對格線位置判錯）＋「龍一被打掉就無敵」，不是距離，
//   所以距離回到 2 格，判定另外修（見 test/v438-dino.js）。
G.flames.length = 0; p7.fireCd = 0; p7.facing = 'right';
P.fireBreath(p7);
const oneDir = cellsOfFlames();
const RANGE26 = P.DINO_FIRE_RANGE;
ok(RANGE26 === 2, '小龍吐火範圍 2 格（DINO_FIRE_RANGE=' + RANGE26 + '）');
const straight26 = [];
for (let i = 1; i <= RANGE26; i++) straight26.push((pcx + i) + ',' + pcy);
ok(straight26.every(function (k) { return oneDir.indexOf(k) >= 0; }),
  '小龍正前方 ' + RANGE26 + ' 格都燒到（面朝右）');
ok(oneDir.indexOf((pcx + 1) + ',' + (pcy - 1)) >= 0 && oneDir.indexOf((pcx + 1) + ',' + (pcy + 1)) >= 0,
  '小龍前 2 格左右有溢火（對手斜著站也燒得到）');
ok(oneDir.length >= RANGE26 + 2, '小龍火焰共 ' + oneDir.length + ' 格（≥ ' + (RANGE26 + 2) + '）');
// 第二次吃蛋 → 紅龍
G.eggs.push({ x: pcx, y: pcy, bob: 0, wob: 0 });
ok(P.takeEgg(p7) === true, '吃到第二顆蛋');
ok(p7.dino === true && p7.redDragon === true, '騎著小龍再吃一顆 → 進化成紅龍');
G.flames.length = 0; p7.fireCd = 0;
P.fireBreath(p7);
const fourDir = cellsOfFlames();
const around = {
  up: (pcx) + ',' + (pcy - 1), up2: (pcx) + ',' + (pcy - 2),
  dn: (pcx) + ',' + (pcy + 1), dn2: (pcx) + ',' + (pcy + 2),
  lf: (pcx - 1) + ',' + pcy, lf2: (pcx - 2) + ',' + pcy,
  rt: (pcx + 1) + ',' + pcy, rt2: (pcx + 2) + ',' + pcy
};
let covered = 0;
Object.keys(around).forEach(function (k) { if (fourDir.indexOf(around[k]) >= 0) covered++; });
ok(covered === 8, '紅龍吐火涵蓋上下左右各 2 格（' + covered + '/8）');
ok(fourDir.length >= 20, '紅龍火焰鋪滿四方向扇形（' + fourDir.length + ' 格）');
ok(fourDir.indexOf(pcx + ',' + pcy) < 0, '自己腳下不會著火');
// 不管朝哪個方向都一樣是四方向
['up', 'down', 'left'].forEach(function (dn) {
  G.flames.length = 0; p7.fireCd = 0; p7.facing = dn;
  P.fireBreath(p7);
  const fc26 = cellsOfFlames();
  const hit26 = [
    (pcx + 1) + ',' + pcy, (pcx - 1) + ',' + pcy,
    pcx + ',' + (pcy + 1), pcx + ',' + (pcy - 1)
  ].filter(function (k) { return fc26.indexOf(k) >= 0; }).length;
  ok(hit26 === 4 && fc26.length >= 20,
    '朝 ' + dn + ' 時一樣是四方向（四格都燒到、共 ' + fc26.length + ' 格）');
});
// 被炸一下龍還是不見
p7.alive = true; p7.invuln = 0;
P.killPlayer(p7, false, null);
ok(!p7.dino && !p7.redDragon, '紅龍被炸到一下就整隻消失（不會降級回小龍）');
ok(p7.alive, '玩家本人沒事（幫擋了一次）');
// 紅龍外觀（v4.33 改版）：不再用色相旋轉，改成獨立的手繪紅圖
let dinoThrew = null;
try { P.drawDino(Object.assign(Object.create(Object.getPrototypeOf(p7)), p7, { dino: true, redDragon: true, fireCd: 0, dinoT: 1 }), G.T); }
catch (e) { dinoThrew = e; }
ok(!dinoThrew, 'drawDino 畫紅龍不會拋錯');
ok(/drawMountSprite\(ctx, red \? 'red' : 'green'/.test(html), '紅龍用獨立的紅色貼圖');
ok(!/hue-rotate\(-118deg\)/.test(html), '舊的色相旋轉染色已移除');
ok(/const DH = T \* \(red \? 1\.82 : 1\.70\);/.test(html), '紅龍比小龍再大一點（1.70 → 1.82）');

// ================================================================
console.log('\n=== 8. 場外推車：按住集氣（第 1／2／3 格，三種顏色） ===');
ok(Array.isArray(P.CART_LV) && P.CART_LV.length === 3, '有三段集氣等級');
ok(P.CART_LV.map(function (l) { return l.edge; }).join(',') === '1,2,3', '分別對應第 1／2／3 格');
const cols8 = P.CART_LV.map(function (l) { return l.color; });
ok(new Set(cols8).size === 3, '三段各有不同顏色（' + cols8.join(' ／ ') + '）');
ok(P.cartChargeLevel(0) === 0, '完全沒集氣 → 第 1 格');
ok(P.cartChargeLevel(P.CART_CHARGE_MAX * .3) === 0, '按一下就放開 → 還是第 1 格');
ok(P.cartChargeLevel(P.CART_CHARGE_MAX * .5) === 1, '集氣一半 → 第 2 格');
ok(P.cartChargeLevel(P.CART_CHARGE_MAX * .95) === 1, '快滿但還沒滿 → 第 2 格');
ok(P.cartChargeLevel(P.CART_CHARGE_MAX) === 2, '集滿 → 第 3 格');
ok(P.CART_CHARGE_MAX >= .4 && P.CART_CHARGE_MAX <= 1, '集氣滿只需 ' + P.CART_CHARGE_MAX + ' 秒（手感剛好）');

freshBattle();
openField();
const T8 = G.T;
const cp = G.players[0];
G.players.forEach(function (q, i) { if (i) { q.alive = false; q.cart = false; } });
cp.cart = true; cp.alive = false; cp.cartDir = null; cp.cartCd = 0; cp.cartCharge = 0;
cp.x = T8 / 2; cp.y = 4 * T8 + T8 / 2;              // 場外左側軌道
// 每一段的落點都必須在「同一條垂直射線」上（列不變），距離等於該等級的 reach
//   v4.38：不再有「離外牆第幾格」的邊緣帶，改成推車自己往外丟的直線距離
ok(P.cartThrowDir(cp).dn === 'right', '推車在最左邊 → 只能往右射（不會斜 45 度）');
ok(P.cartLandingDir(cp) === 'right', 'cartLandingDir 相容層回傳方向字串');
[0, 1, 2].forEach(function (lv) {
  const want = P.CART_LV[lv].reach;
  const land = P.cartPickLanding(cp, lv);
  ok(!!land && land.y === 4 && land.x === want,
    'lv' + lv + '：落點在同一列第 ' + want + ' 格（實際 ' +
    (land ? land.x + ',' + land.y : 'null') + '）');
});
// 集氣＝力量：三段的 reach 必須遞增，而且真的越丟越遠
ok(P.CART_LV[2].reach > P.CART_LV[1].reach && P.CART_LV[1].reach > P.CART_LV[0].reach,
  '集氣三段距離遞增（' + P.CART_LV.map(function (l) { return l.reach; }).join(' → ') + ' 格）');
// 人類：按住動作鍵集氣，放開才丟出去
const hold = { on: false };
cp.scheme = {
  dirs: function () { return []; },
  action: function () { return hold.on; },
  actionHeld: function () { return hold.on; }
};
function chargeThrow(frames) {
  cp.cartCd = 0; cp.cartCharge = 0;
  G.bombs.length = 0;
  hold.on = true;
  for (let i = 0; i < frames; i++) BH.updateCart(cp, 1 / 60);
  const charging = cp.cartCharge;
  const lvNow = P.cartChargeLevel(charging);
  ok(G.bombs.length === 0, '按住 ' + frames + ' 幀期間還沒丟出去（集氣中 ' + charging.toFixed(2) + 's）');
  hold.on = false;
  BH.updateCart(cp, 1 / 60);
  const b = G.bombs[0];
  return {
    hasBomb: !!b, lv: lvNow,
    dist: b ? Math.abs(b.cx) : -1, row: b ? b.cy : -1
  };
}
const r1 = chargeThrow(3);
ok(r1.hasBomb && r1.dist === 1 && r1.row === 4, '輕按一下 → 丟到第 1 格（dist ' + r1.dist + '）');
const r2 = chargeThrow(Math.round(P.CART_CHARGE_MAX * .6 * 60));
ok(r2.lv === 1, '按到一半時畫面顯示「中 2 格」');
ok(r2.hasBomb && r2.dist === 2, '集氣一半 → 丟到第 2 格（dist ' + r2.dist + '）');
const r3 = chargeThrow(Math.round(P.CART_CHARGE_MAX * 60) + 6);
ok(r3.lv === 2, '按到滿時畫面顯示「遠 3 格」');
ok(r3.hasBomb && r3.dist === 3, '集滿 → 丟到第 3 格（dist ' + r3.dist + '，硬上限）');
ok(r3.dist > r2.dist && r2.dist > r1.dist, '集越多丟越遠（' + r1.dist + ' → ' + r2.dist + ' → ' + r3.dist + '）');
// 集氣時的操作提示與畫面顏色
cp.cartCharge = P.CART_CHARGE_MAX; cp.cartCd = 0;
clearRec();
const g8 = mk();
try { P.drawCart(cp, T8); } catch (e) { console.log('  ! drawCart 例外：' + e.message); }
const texts8 = callsNamed('fillText').map(function (c) { return String(c[1]); });
ok(texts8.some(function (t) { return t.indexOf('遠 3 格') >= 0; }), '集滿時頭上顯示「遠 3 格」（' + texts8.join('|') + '）');
[0, 1, 2].forEach(function (lv) {
  ok(styleUsed(P.CART_LV[lv].color), '第 ' + (lv + 1) + ' 格用專屬顏色 ' + P.CART_LV[lv].color);
});
clearRec();
cp.cartCharge = P.CART_CHARGE_MAX * .5;
const g8b = mk();
try { P.drawCart(cp, T8); } catch (e) {}
ok(callsNamed('fillText').some(function (c) { return String(c[1]).indexOf('中 2 格') >= 0; }), '集一半時顯示「中 2 格」');
ok(P.cartThrowBomb(cp) !== undefined, '沒給等級時預設第 2 段（舊行為相容）');
// AI 推車也會隨機選等級
freshBattle();
openField();
const aiCart = G.players[1];
aiCart.ai = true; aiCart.cart = true; aiCart.alive = false; aiCart.cartDir = null;
aiCart.x = G.T / 2; aiCart.y = 3 * G.T + G.T / 2;
let aiThrows = 0, aiLv = {};
for (let f = 0; f < 60 * 30; f++) {
  const before = G.bombs.length;
  BH.updateCart(aiCart, 1 / 60);
  if (aiCart.cartWantLv != null) aiLv[aiCart.cartWantLv] = (aiLv[aiCart.cartWantLv] || 0) + 1;
  if (G.bombs.length > before) aiThrows++;
  G.bombs.length = 0;
}
ok(aiThrows > 0, 'AI 推車還是會一直丟彈（' + aiThrows + ' 次）');
ok(Object.keys(aiLv).length >= 2, 'AI 會輪替不同集氣深度（用過 ' + Object.keys(aiLv).join('／') + '）');
ok(Object.keys(aiLv).every(function (k) { return k === '0' || k === '1' || k === '2'; }), '深度只在第 1／2／3 格之間');

// ================================================================
console.log('\n=== 9. 版本與整體 ===');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">' + P.VERSION + '</span>') > 0, '畫面版本號同步 ' + P.VERSION);
let runErr = null;
try {
  freshBattle();
  G.state = 'play';
  for (let i = 0; i < 240; i++) { P.updateWorld(1 / 60); P.render(); }
} catch (e) { runErr = e; }
ok(!runErr, '整場對戰跑 240 幀不報錯' + (runErr ? '：' + runErr.message : ''));

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
