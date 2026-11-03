// test/verify-v452.js —— v4.52：首頁按鈕統一 ＋ 四項玩法修正
//   ① 隨從 5000 金幣（含 10 國語系）  ② 對戰／線上配對標測試版
//   ③ 首頁大按鈕統一外型＋四態（一般／滑過／按下／發亮）  ④ 首頁移除操作提示白框
//   ⑤ 拳擊打彈跨過一道牆就落地（v4.53）  ⑥ 推車丟軟磚也繼續彈  ⑦ 輸送帶馬上帶走推車炸彈
//   ⑧ 火焰／隨從都會破壞骷髏頭（其他道具不破壞）
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, html = env.html;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function eq(a, b, name) { ok(a === b, name + '（' + a + '）'); }
function head(t) { console.log('\n=== ' + t + ' ==='); }
const css = html.replace(/\r/g, '');
let T = 40;

function soloStage(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.startSolo(stage || 1, false);
  G.state = 'play';
  T = G.T;
  return G.players[0];
}
function clearAll() {
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    if (x === 0 || y === 0 || x === G.cols - 1 || y === G.rows - 1) { G.grid[y][x] = 1; continue; }
    G.grid[y][x] = 0;
    if (G.hazards[y]) G.hazards[y][x] = null;
  }
  G.bombs.length = 0; G.items.length = 0; G.enemies.length = 0;
  if (G.flames) G.flames.length = 0;
  G.pets = [];
}
function step(n) { for (let i = 0; i < n; i++) P.updateWorld(1 / 60); }

// ================================================================
head('0. 版本與匯出');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '徽章版本同步 ' + P.VERSION);
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG[0] 就是當前版本');
eq(typeof P.punchLanding, 'function', 'punchLanding 已匯出');
eq(typeof P.beltGrab, 'function', 'beltGrab 已匯出');
eq(typeof P.updatePets, 'function', 'updatePets 已匯出');
eq(typeof P.makePet, 'function', 'makePet 已匯出');

head('1. 隨從 5000 金幣');
eq(P.PET_KINDS.length, 3, '三種隨從');
ok(P.PET_KINDS.every(function (k) { return k.price === 5000; }), '每一隻都是 5000 金幣');
ok(html.indexOf('price: 1000') < 0, '沒有殘留 1000 的售價');
ok(html.indexOf('<small>隨從 5000 金幣</small>') > 0, '首頁商店鈕副標寫 5000');
ok(html.indexOf('隨從三種各 <b>5000</b> 金幣') > 0, '說明頁也寫 5000');
const notes = html.match(/'store\.note': '[^']*'/g) || [];
eq(notes.length, 10, '10 國語系的商店副標');
ok(notes.every(function (z) { return z.indexOf('5000') >= 0 || z.indexOf('5,000') >= 0 || z.indexOf('5.000') >= 0; }),
  '十國語系全部改成 5000');
ok(notes.every(function (z) { return z.indexOf('1000') < 0 && z.indexOf('1,000') < 0 && z.indexOf('1.000') < 0; }),
  '十國語系沒有殘留 1000');

head('2. 對戰／線上配對標「測試版」');
ok(/id="btnBattle"[^>]*>對戰模式<span class="betaTag">測試版 Beta<\/span>/.test(html), '對戰鈕標測試版 Beta');
ok(/id="btnOnline"[^>]*>線上配對<span class="betaTag">測試版 Beta<\/span>/.test(html), '線上配對鈕標測試版 Beta');
ok(/id="btnRpg"[^>]*>RPG 模式<span class="betaTag">測試版 Beta<\/span>/.test(html), 'RPG 鈕原本就有標');
eq((html.match(/class="betaTag"/g) || []).length, 3, '總共 3 顆測試版標籤');

head('3. 首頁大按鈕：統一外型与四種狀態');
['btnLearn', 'btnSolo', 'btnRpg', 'btnBoss', 'btnStore', 'btnAcctBig', 'btnBattle', 'btnOnline', 'btnHelp', 'btnSettings', 'btnQuit']
  .forEach(function (id) {
    const re = new RegExp('<button class="mbtn (c-[a-z]+)[^"]*" id="' + id + '" data-ico="[^"]+"');
    ok(re.test(html), id + ' 有統一 class ＋ data-ico');
  });
eq((html.match(/data-ico="/g) || []).length, 11, '11 顆按鈕都有 icon');
eq((html.match(/ has-beta"/g) || []).length, 3, '3 顆測試版按鈕預留標籤空間');
ok(css.indexOf('content: attr(data-ico)') > 0, 'icon 由 ::before 統一產生');
ok(css.indexOf('#scr-title .menu .mbtn:hover {') > 0, '有滑過狀態');
ok(css.indexOf('#scr-title .menu .mbtn:active {') > 0, '有按下狀態');
ok(css.indexOf('#scr-title .menu .mbtn.newbie {') > 0, '有發亮提示狀態');
ok(/@keyframes mbtnGlow \{/.test(css), '發亮是 mbtnGlow 脈衝動畫');
ok(css.indexOf('min-width: 0; overflow: hidden') > 0, '按鈕可縮（手機兩欄不會被撐破）');
ok(css.indexOf('text-overflow: ellipsis') > 0, '副標太長會省略而不是亂換行');
ok(/body\.touch #scr-title \.menu \.mbtn \{ padding: 11px 10px 11px 40px/.test(css), '手機有專屬尺寸');
ok(css.indexOf('--g1: rgba(120,230,170,.6)') > 0 && css.indexOf('--c1: #ffa161') > 0, '顏色用 CSS 變數分層');
['c-learn', 'c-solo', 'c-rpg', 'c-boss', 'c-battle', 'c-online', 'c-store', 'c-acct', 'c-help', 'c-set', 'c-quit']
  .forEach(function (c) { ok(css.indexOf('#scr-title .menu .' + c) > 0, '配色 ' + c + ' 已定義'); });
ok(html.indexOf('>單人闖關<small>') > 0 && html.indexOf('>挑戰 BOSS<small>') > 0, '標題不再夾行內 emoji');
ok(html.indexOf('新手教學<span id="learnTag">') > 0, '新手教學標題由 JS 注入（不含 emoji）');

head('4. 首頁移除「操作提示」白框');
const titleBlock = html.slice(html.indexOf('id="scr-title"'), html.indexOf('id="scr-shop"'));
ok(titleBlock.indexOf('class="hint"') < 0, '首頁沒有操作提示白框');
ok(titleBlock.indexOf('<kbd>WASD</kbd>') < 0, '連按鍵說明也一起移除了（不是只藏起來）');
ok(titleBlock.indexOf('class="menu"') > 0, '選單還在');

ok(css.indexOf('.title-card .hint { display: none; }') > 0, '舊的矮螢幕隱藏規則保留（v22 基線）');

head('5. 拳擊打彈：跨過一道牆就落地（v4.53 改手感）');
{
  const pl = soloStage(1);
  clearAll();
  pl.punch = true; pl.kick = false; pl.alive = true; pl.dizzy = 0; pl.skull = null;
  G.grid[5][5] = 1;                                    // 炸彈右邊第一格是石牆
  pl.x = 4.5 * T; pl.y = 5.5 * T;
  P.placeBomb(pl);
  const bomb = G.bombs[G.bombs.length - 1];
  pl.x = 3.5 * T;
  const okp = P.punchBomb(pl, 'right');
  ok(okp === true, '拳擊有打出去');
  eq(bomb.cx, 6, '跨過一道石牆就落在牆後那一格');
  eq(bomb.cy, 5, '同一列');
  const path = bomb.flying ? bomb.flying.path : [];
  ok(path.filter(function (q) { return q.w; }).length === 1, '只有這一格障礙標記為「要跳過去」');
}
{
  const pl = G.players[0];
  clearAll();
  G.grid[5][5] = 1; G.grid[5][6] = 2; G.grid[5][7] = 1;   // 連三道牆
  pl.x = 4.5 * T; pl.y = 5.5 * T;
  P.placeBomb(pl);
  const bomb = G.bombs[G.bombs.length - 1];
  pl.x = 3.5 * T;
  P.punchBomb(pl, 'right');
  eq(bomb.cx, 8, '三連牆一路彈過去，落在第 8 格');
}
{
  const pl = G.players[0];
  clearAll();
  pl.x = 3.5 * T; pl.y = 6.5 * T;
  P.placeBomb(pl);
  const bomb = G.bombs[G.bombs.length - 1];
  pl.x = 2.5 * T;
  P.punchBomb(pl, 'right');
  eq(bomb.cx, 4, '前面沒牆就只飛一格（不再一路滑到底）');
}
head('6. 推車：丟到軟磚也要再彈一格');
{
  const pl = G.players[0];
  clearAll();
  G.grid[3][7] = 2;                                   // lv2 的 reach 是 3 → 落點剛好是軟磚
  pl.x = 7.5 * T; pl.y = 0.5 * T;
  const land = P.cartPickLanding(pl, 2);
  ok(land && land.y === 4, '落點越過軟磚到下一格（y=' + (land && land.y) + '）');
  eq(land.bounce, 1, '標記彈跳 1 格');
  eq(land.onSoft, false, '最後不是停在軟磚上');
}
{
  const pl = G.players[0];
  clearAll();
  G.grid[3][7] = 1;                                   // 石牆照舊要彈
  pl.x = 7.5 * T; pl.y = 0.5 * T;
  const land = P.cartPickLanding(pl, 2);
  ok(land && land.y === 4 && land.bounce === 1, '石牆還是會彈');
}
{
  const pl = G.players[0];
  clearAll();
  for (let y = 2; y <= 6; y++) G.grid[y][7] = 1;       // 一整排牆
  pl.x = 7.5 * T; pl.y = 0.5 * T;
  const land = P.cartPickLanding(pl, 2);
  ok(land.bounce <= P.CART_BOUNCE_MAX, '連續牆最多彈 ' + P.CART_BOUNCE_MAX + ' 格');
}
{
  const pl = G.players[0];
  clearAll();
  G.grid[1][7] = 1; G.grid[2][7] = 1; G.grid[3][7] = 1;
  pl.x = 7.5 * T; pl.y = 0.5 * T;
  const land = P.cartPickLanding(pl, 2);
  ok(!land || !land.onWall || land.y <= 4, '撞到底就停在牆頂，不會穿出地圖');
}

head('7. 輸送帶：推車炸彈一落地就被帶走');
{
  const pl = G.players[0];
  clearAll();
  for (let y = 1; y <= 10; y++) G.hazards[y][7] = { type: 'convey', dir: 'down' };
  pl.x = 7.5 * T; pl.y = 0.5 * T;
  P.cartThrowBomb(pl, 2);
  const bomb = G.bombs[G.bombs.length - 1];
  const y0 = bomb.cy;
  ok(!!bomb.flying, '投出去是飛行狀態');
  step(45);                                            // 0.75s：飛行 + 一落地就被推
  ok(bomb.cy > y0, '0.75 秒內至少被帶走一格（' + y0 + ' → ' + bomb.cy + '）');
  ok(!!G.hazards[bomb.cy] && G.hazards[bomb.cy][bomb.cx].type === 'convey', '還站在帶子上');
}
{
  const pl = G.players[0];
  clearAll();
  for (let x = 3; x <= 6; x++) G.hazards[6][x] = { type: 'convey', dir: 'right' };
  pl.x = 3.5 * T; pl.y = 6.5 * T;
  P.placeBomb(pl);
  const bomb = G.bombs[G.bombs.length - 1];
  const x0 = bomb.cx;
  step(80);
  ok(bomb.cx > x0, '普通放彈在帶子上也會被帶走（' + x0 + ' → ' + bomb.cx + '）');
}
eq(typeof P.beltGrab, 'function', 'beltGrab 存在');
{
  clearAll();
  G.hazards[4][5] = { type: 'convey', dir: 'left' };
  const fake = { cx: 5, cy: 4, beltAcc: 0 };
  P.beltGrab(fake, T);
  ok(Math.abs(fake.beltAcc - T * .92) < .01, '落在帶子上會先把推力灌到 0.92 格');
  const fake2 = { cx: 6, cy: 4, beltAcc: 0 };
  P.beltGrab(fake2, T);
  eq(fake2.beltAcc, 0, '落在空地上不會有推力');
}

head('8. 骷髏頭：火焰燒得掉、隨從踩得碎');
{
  const pl = soloStage(1);
  clearAll();
  pl.x = 5.5 * T; pl.y = 5.5 * T; pl.alive = true;
  P.spawnItem(5, 4, 'skull');
  P.spawnItem(5, 6, 'fire');
  P.placeBomb(pl);
  const bomb = G.bombs[G.bombs.length - 1];
  bomb.timer = 0;
  step(2);
  const left = G.items.map(function (it) { return it.type; });
  ok(left.indexOf('skull') < 0, '爆炸把骷髏頭燒掉了');
  ok(left.indexOf('fire') >= 0, '其他道具炸到不會被破壞（火力還在）');
}
{
  const pl = soloStage(1);
  clearAll();
  pl.x = 5.5 * T; pl.y = 8.5 * T;
  P.spawnItem(5, 3, 'skull');
  const pet = P.makePet('blade', 'bear', 0);
  pet.x = 5.5 * T; pet.y = 3.5 * T;
  G.pets = [pet];
  P.updatePets(1 / 60);
  ok(G.items.filter(function (it) { return it.type === 'skull'; }).length === 0, '隨從經過就把骷髏頭踩碎');
  ok(G.pets.length === 1, '隨從自己還在場上');
}
{
  const pl = soloStage(1);
  clearAll();
  pl.x = 5.5 * T; pl.y = 8.5 * T;
  P.spawnItem(5, 3, 'skull');
  const pet = P.makePet('blade', 'bear', 0);
  pet.x = 5.5 * T; pet.y = 4.6 * T;                    // 差一格：不該踩到
  G.pets = [pet];
  P.updatePets(1 / 60);
  ok(G.items.filter(function (it) { return it.type === 'skull'; }).length === 1, '距離不夠不會踩碎');
}

console.log('\n通過 ' + pass + ' / ' + (pass + fail) + '　失敗 ' + fail);
process.exit(fail ? 1 : 0);
