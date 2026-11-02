// test/verify-v54.js —— v4.11 八項需求的完整驗證
//   1. 單人闖關的怪跟 RPG 血量一致 + 頭上有血條
//   2. 功能鍵去掉黑底（透明面盤，炸彈圖案不動）
//   3. 爆炸火焰是爆炸雲（不是燭火）
//   4. 「我」是頭上圖示徽章（推車也套用，名牌沒有「⭐我」文字）
//   5. 遙控鍵只在拿到遙控器時出現
//   6. 吐火鈕：冷卻 2 秒、灰態倒數、冷卻完發亮
//   7. 手套抓炸彈
//   8. 踢／拳擊的炸彈碰到敵人停在前方（不穿過）
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, html = env.html;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
P.settings.ctrl = 'kb'; P.settings.soloDiff = 'normal'; P.settings.soloTime = 300;

// ================================================================
head('1. 單人闖關的小怪：一擊必殺（v4.12：血量規則兩模式分離）');
P.startSolo(1, false);
G.state = 'play';
const soloEnemies = G.enemies.filter(function (e) { return !e.boss; });
ok(soloEnemies.length > 0, '單人關有生成小怪（' + soloEnemies.length + ' 隻）');
// v4.12：單人闖關的怪一律 hp=1（一擊必殺）→ 不再跟 RPG_FOE 比
let hpOk = true, maxOk = true;
soloEnemies.forEach(function (e) {
  if (e.hp !== 1) hpOk = false;
  if (e.maxHp !== 1) maxOk = false;
});
ok(hpOk, '單人怪的 hp 全部 = 1（一擊必殺，v4.12 規格）');
ok(maxOk, '單人怪的 maxHp 也 = 1（沒有血量概念 → 不畫血條）');
ok(P.RPG_FOE.slime.hp === 3 && P.RPG_FOE.beetle.hp === 4 && P.RPG_FOE.lizard.hp === 5,
  'RPG 模式仍有自己的血量表（v4.17 調回：史萊姆 3／鐵甲蟲 4／疾風蜥 5）');
const hudFn = html.slice(html.indexOf('function drawRpgHud(T) {'), html.indexOf('function drawRpgHud(T) {') + 900);
ok(hudFn.indexOf('if (!e.maxHp || e.maxHp <= 1) continue;') >= 0 &&
   hudFn.indexOf('if (!Game.rpg) return;') >= 0 &&
   hudFn.indexOf('if (!e.maxHp || e.maxHp <= 1) continue;') < hudFn.indexOf('if (!Game.rpg) return;'),
  'drawRpgHud 的敵人血條在 RPG 判斷之前（v4.12：只有 RPG 模式畫）');
// 血條實際畫出來（用 fillRect 呼叫次數驗證）
{
  const e0 = soloEnemies[0];
  const T = G.T;
  e0.x = 3 * T + T / 2; e0.y = 3 * T + T / 2;
  env.rec.calls.length = 0;
  P.drawRpgHud(T);
  const rects = env.rec.calls.filter(function (c) { return c[0] === 'fillRect'; });
  ok(rects.length === 0, '單人模式下不畫血條（v4.12：血量規則兩模式分離）');
}

// 炸 3 下史萊姆才死（不再是炸一下就死）
{
  const slime = P.makeEnemy(3, 3, 'slime', 1, 1);
  const T = G.T;
  slime.x = 3 * T + T / 2; slime.y = 3 * T + T / 2;
  slime.speed = 0; slime.dirT = 999;    // 站定不動（否則會亂走離開火焰 → 測試不穩）
  ok(slime.hp === 1, '史萊姆 1 點血（單人闖關一擊必殺）');
  let bombs = 0;
  while (!slime.dead && bombs < 6) {
    bombs++;
    G.bombs.length = 0; G.flames.length = 0;
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) G.grid[3 + dy][3 + dx] = 0;
    G.bombs.push({ cx: 3, cy: 3, px: slime.x, py: slime.y, timer: 0.01, power: 2,
      owner: G.players[0], passers: [G.players[0]], remoteArmed: false, mine: false,
      mineLife: 10, moving: null, flying: null, held: false, seed: bombs, armT: 40 });
    for (let i = 0; i < 60; i++) { P.updateWorld(1 / 60); if (!slime.dead) P.updateEnemy(slime, 1 / 60); }
  }
  ok(slime.dead && bombs === 1, '史萊姆炸 1 下就死（實測 ' + bombs + ' 下）');
}

// ================================================================
head('2. 功能鍵去掉黑底（透明面盤，炸彈圖案不動）');
ok(/--tb-face: rgba\(0,0,0,0\)/.test(html), '.tbtn 的 --tb-face 改成完全透明');
ok(!/--tb-face: rgba\(74,34,14/.test(html) && !/--tb-face: rgba\(8,38,50/.test(html) &&
   !/--tb-face: rgba\(62,16,8/.test(html) && !/--tb-face: rgba\(22,32,56/.test(html),
  '三顆功能鍵（放彈／遙控／吐火）都沒有深色面盤了');
ok(!/inset 0 -8px 16px rgba\(0,0,0,\.46\)/.test(html) &&
   !/inset 0 12px 22px -10px rgba\(0,0,0,\.92\)/.test(html),
  '會造成黑底感的內凹黑色陰影已移除');
ok(/--tb-ring: rgba\(255,186,120/.test(html) && /--tb-ring: rgba\(150,235,255/.test(html) &&
   /--tb-ring: rgba\(255,168,130/.test(html),
  '金屬圓框（橘／青／紅）保留 → 不是把按鈕弄不見');
ok(/<div class="tbtn tact"[^>]*><canvas class="ticon" data-icon="bomb">/.test(html),
  '放彈鈕仍是原本的內嵌炸彈畫布（炸彈圖案沒被動）');
ok(/drawBombOn\(g, r, it\.kind === 'bomb' \? 3 : 7/.test(html),
  '炸彈圖示仍走原本的 drawBombOn（畫法沒變）');

// ================================================================
head('3. 爆炸火焰：翻滾火球雲（不是燭火）');
ok(/function drawFlameBlob/.test(html), '新增 drawFlameBlob（單顆翻滾火球）');
ok(html.indexOf('const cols = bossFire') >= 0, '火焰用多層色階（白熱→黃→橘→深紅）');
// v4.11 第四輪：改成參考圖那種「翻滾白熱火雲柱」（白／米白核心 → 奶油黃 → 橘 → 橘紅邊）
ok(html.indexOf("'rgba(255,255,255,A)', 'rgba(255,246,214,A)'") >= 0,
  '玩家火焰是白熱／米白核心（跟參考圖一樣幾乎整團是白色）');
ok(html.indexOf("'rgba(255,214,130,A)', 'rgba(255,150,50,A)'") >= 0,
  '玩家火焰外緣是橘 → 橘紅（焦邊）');
ok(html.indexOf("'rgba(246,214,255,A)', 'rgba(210,120,255,A)'") >= 0,
  'BOSS 火焰是紫色系（保留原本的魔焰特色）');
ok(html.indexOf('drawFlameBlob(cx, cy, s * .82, cols, k);') >= 0,
  '火焰主體是塞滿整格的大火團（不是尖尖的燭火）');
ok(html.indexOf('const N = 8;') >= 0, '周圍有 8 顆翻滾的雲團（煙火感）');
// 火焰要沿著十字臂伸長 → 四臂連成一條粗管（這是參考圖的關鍵）
ok(html.indexOf("const isMid = f.type === 'mid', isEnd = f.type === 'end';") >= 0,
  '依火焰 type（爆心／中段／末端）決定伸長量 → 十字臂會連成一條');
ok(html.indexOf('const s = T * .82 * grow * flick;') >= 0,
  '火焰體積放大到整格（原本只有 T*.56）');
ok(html.indexOf('底部的白熱內芯') >= 0, '中央有白熱內芯（看起來真的在燃燒）');
// 燭火專用函式已不再被 drawFlame 呼叫
const flameFn = html.slice(html.indexOf('function drawFlame(f, T) {'),
  html.indexOf('function drawEnemy(e, T) {'));
ok(flameFn.indexOf('flameDrop(') < 0, 'drawFlame 已經不再呼叫 flameDrop（燭火已移除）');
ok(/function flameDrop/.test(html), 'flameDrop 函式本身還在（其他地方仍可用）');
// 火焰圖示仍能畫（paintTouchIcons 走 drawFlameOn）
{
  let threw = null;
  try { P.paintTouchIcons(0); } catch (e) { threw = e; }
  ok(threw === null, 'paintTouchIcons(0) 在新火焰下不報錯（' + (threw ? threw.message : 'OK') + '）');
}

// ================================================================
head('4. 「我」＝ 頭上圖示徽章（推車也套用，名牌沒有文字）');
ok(/const ME_BADGE_TXT = '我'/.test(html), '「我」徽章是圖示（ME_BADGE_TXT）');
ok(/function drawMeBadge/.test(html), 'drawMeBadge 存在');
const codeNoLog = html.slice(0, html.indexOf('const VERSION_LOG = ['));
ok(codeNoLog.indexOf('⭐我') < 0, '程式碼裡沒有「⭐我」文字（只剩版本紀錄敘述）');ok(/const label = \(small \? '' : pname\(p\) \+ '🛒'\) \+ \(p\.ai && !small \? '🤖' : ''\) \|\| '🛒';/.test(html),
  '推車名牌只有名字＋🛒＋🤖（小螢幕省略文字），沒有「⭐我」文字');
ok(/if \(Game\.mode === 'battle' && p\.alive && isMyPlayer\(p\)\) drawMeBadge/.test(html),
  '場內活著時頭上畫「我」徽章');
ok(/if \(Game\.mode === 'battle' && isMyPlayer\(p\)\) drawMeBadge\(x, y - T \* \.30/.test(html),
  '推車上的「我」也畫頭上徽章（不要求 alive，推車上 alive=false）');
// 實測：推車上會畫出徽章
{
  const p = G.players[0];
  p.ai = false; p.alive = false; p.dead = false; p.cart = true;
  p.x = 5 * G.T + G.T / 2; p.y = 5 * G.T + G.T / 2;
  const before = env.rec.calls.length;
  P.drawCart(p, G.T);
  const drew = env.rec.calls.slice(before).some(function (c) { return c[0] === 'fillText' || c[0] === 'fill'; });
  ok(drew, 'drawCart 真的畫出東西（含徽章）');
  p.cart = false;
}

// ================================================================
head('5. 遙控鍵只在拿到遙控器時出現');
ok(/class="tbtn tdet hide"/.test(html), '遙控鍵初始就是 hide（沒有遙控器時不出現）');
ok(/detBtn\.classList\.toggle\('hide', !\(me && me\.remote\)\)/.test(html),
  'updateHud 依 me.remote 切換遙控鍵顯隱');
ok(/fireBtn\.classList\.toggle\('hide', !\(me && me\.dino\)\)/.test(html),
  '吐火鍵依 me.dino 切換顯隱（騎龍才有）');
// 實測 updateHud 的切換
{
  const p = G.players[0];
  p.remote = false; p.dino = false;
  P.updateHud();
  const detEl = env.sandbox.document.querySelector('#touchUI .tdet');
  const fireEl = env.sandbox.document.querySelector('#touchUI .tfire');
  ok(detEl.classList.contains('hide'), '沒有遙控器 → 遙控鍵隱藏');
  ok(fireEl.classList.contains('hide'), '沒有騎龍 → 吐火鍵隱藏');
  p.remote = true; p.dino = true;
  P.updateHud();
  ok(!detEl.classList.contains('hide'), '拿到遙控器 → 遙控鍵顯示');
  ok(!fireEl.classList.contains('hide'), '騎上恐龍 → 吐火鍵顯示');
}

// ================================================================
head('6. 吐火冷卻 2 秒 + 灰態倒數 + 冷卻完發亮');
ok(P.DINO_FIRE_CD === 2, 'DINO_FIRE_CD = 2 秒（原本 3 秒）');
ok(/body\.touch #touchUI \.tfire\.cool/.test(html), '冷卻中有 .cool 灰態樣式');
ok(/body\.touch #touchUI \.tfire\.ready/.test(html), '冷卻完有 .ready 發亮樣式');
ok(/fireBtn\.classList\.toggle\('cool', me\.fireCd > 0\)/.test(html) &&
   /fireBtn\.classList\.toggle\('ready', me\.fireCd <= 0\)/.test(html),
  'updateHud 依 fireCd 切換 cool / ready');
ok(/String\(Math\.ceil\(me\.fireCd\)\)/.test(html), '圖示上會顯示冷卻倒數秒數');
// 實測冷卻流程
{
  const p = G.players[0];
  p.dino = true; p.fireCd = 0; p.alive = true;
  const T = G.T;
  // 找個空地吐火
  for (let x = 1; x < G.cols - 1; x++) for (let y = 1; y < G.rows - 1; y++) G.grid[y][x] = 0;
  p.x = 3 * T + T / 2; p.y = 3 * T + T / 2;
  const fired = P.fireBreath(p);
  ok(fired === true, '恐龍可以吐火');
  ok(p.fireCd === 2, '吐火後進入 2 秒冷卻（fireCd=' + p.fireCd + '）');
  ok(P.fireBreath(p) === false, '冷卻中不能再次吐火');
  P.updateHud();
  const fireEl = env.sandbox.document.querySelector('#touchUI .tfire');
  ok(fireEl.classList.contains('cool'), '冷卻中 → 按鈕是 .cool（灰）');
  ok(!fireEl.classList.contains('ready'), '冷卻中 → 不是 .ready');
  for (let i = 0; i < 130; i++) P.updateWorld(1 / 60);
  ok(p.fireCd === 0, '2 秒後冷卻結束');
  P.updateHud();
  ok(fireEl.classList.contains('ready'), '冷卻完 → 按鈕是 .ready（發亮）');
  ok(!fireEl.classList.contains('cool'), '冷卻完 → 不再是 .cool');
}

// ================================================================
head('7. 手套抓炸彈');
// v4.14：撿彈抽成 tryGlovePickup()，動作鍵「撿彈優先」；炸彈恢復實體、踢／打不再看手套
ok(/function tryGlovePickup\(p\)/.test(html), 'v4.14：撿彈是獨立的 tryGlovePickup()');
ok(!/if \(tryGlovePickup\(p\)\) return;/.test(html), 'v4.34：placeBomb 不再順手撿彈（改由動作鍵分派）');
ok(/else if \(tryGlovePickup\(p\)\) \{ \/\* 已撿起 \*\/ \}/.test(html),
  'v4.14：動作鍵撿彈優先（線圈炸彈搶不走）');
ok(!/if \(b && p && p\.glove\) return false;/.test(html),
  'v4.14：炸彈對戴手套的人也是實體（不會再走過炸彈格）');
ok(!/const dirs4 = \[\[1, 0\], \[-1, 0\], \[0, 1\], \[0, -1\]\];/.test(html),
  'v4.34：撿彈不再往四個方向亂找（只認腳下；面前只撿別人的）');
ok(/if \(bombAt\(nx, ny\) && !p\.carry\) \{/.test(html),
  'v4.14：踢／打不再被手套擋掉（只有手上拿著炸彈時不觸發）');
// 實測撿彈 → 投擲
{
  const p = G.players[0];
  p.glove = true; p.carry = null; p.alive = true; p.kick = false; p.punch = false;
  const T = G.T;
  p.x = 5 * T + T / 2; p.y = 5 * T + T / 2; p.facing = 'right';
  G.grid[5][5] = 0; G.grid[5][6] = 0;
  G.bombs.length = 0; G.flames.length = 0;
  const gb = { cx: 5, cy: 5, px: p.x, py: p.y, timer: 2.4, power: 2, owner: null,
    passers: [], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, ownerLeft: true, seed: 3, armT: 40 };
  G.bombs.push(gb);
  ok(P.tryGlovePickup(p) === true, 'v4.34：站在炸彈上按動作鍵 → 撿起來');
  ok(p.carry === gb && gb.held === true, '按動作鍵 → 撿起炸彈（carry + held）');
  const t0 = gb.timer;
  for (let i = 0; i < 30; i++) P.updateWorld(1 / 60);
  ok(gb.timer === t0, '拿著時引線暫停（' + t0 + ' → ' + gb.timer + '）');
  if (p.carry) {
    G.bombs.length = 0; G.bombs.push(gb);
    P.throwCarried(p);
    ok(p.carry === null && !!gb.flying, '再按一次 → 丟出去（flying）');
  }
  p.glove = false;
}

// ================================================================
head('8. 踢／拳擊的炸彈碰到敵人停在前方（不穿過）');
ok(/function enemyAtCell/.test(html), '新增 enemyAtCell（某格是否有活著的敵人）');
ok(/if \(stopAtFoe !== false && enemyAtCell\(nx, ny\)\)/.test(html),
  'findLanding：前方有敵人 → 停在敵人前一格（v4.13 仍保留此規則）');
ok(/enemyAtCell\(ncx \+ m\.dx, ncy \+ m\.dy\)/.test(html),
  '被踢飛的炸彈：前方有敵人 → 停下');
ok(/const land = findLanding\(bx, by, d\.x, d\.y, false, true\);/.test(html),
  '被打飛的炸彈：沿著路徑逐格跳 → 前方有敵人會停在敵人前一格（v4.13）');
// 實測踢彈
{
  const p = G.players[0];
  p.glove = false; p.kick = true; p.punch = false; p.alive = true;
  const T = G.T;
  p.x = 5 * T + T / 2; p.y = 5 * T + T / 2; p.facing = 'right';
  for (let x = 5; x <= 10; x++) G.grid[5][x] = 0;
  G.bombs.length = 0; G.flames.length = 0;
  G.enemies.length = 0;
  const kb = { cx: 6, cy: 5, px: 6 * T + T / 2, py: p.y, timer: 2.4, power: 2, owner: p,
    passers: [], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 4, armT: 40 };
  G.bombs.push(kb);
  const foe = P.makeEnemy(9, 5, 'slime', 1, 1);
  foe.x = 9 * T + T / 2; foe.y = 5 * T + T / 2; foe.speed = 0;
  G.enemies.push(foe);
  const kicked = P.kickBomb(p, 'right');
  ok(kicked === true, '踢彈成功');
  if (kicked) {
    for (let i = 0; i < 180 && kb.moving; i++) P.updateWorld(1 / 60);
    ok(kb.cx < 9, '被踢的炸彈停在敵人前方（cx=' + kb.cx + '，敵人 cx=9）');
    ok(kb.cx === 8, '剛好停在敵人前一格（cx=8）');
  }
  // 實測拳擊
  G.bombs.length = 0; G.flames.length = 0;
  G.enemies.length = 0;
  for (let x = 5; x <= 12; x++) G.grid[5][x] = 0;
  const pb = { cx: 6, cy: 5, px: 6 * T + T / 2, py: p.y, timer: 2.4, power: 2, owner: p,
    passers: [], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 5, armT: 40 };
  G.bombs.push(pb);
  const foe2 = P.makeEnemy(11, 5, 'slime', 1, 1);
  foe2.x = 11 * T + T / 2; foe2.y = 5 * T + T / 2; foe2.speed = 0;
  G.enemies.push(foe2);
  const punched = P.punchBomb(p, 'right');
  ok(punched === true, '拳擊成功');
  if (punched) {
    for (let i = 0; i < 180 && pb.flying; i++) P.updateWorld(1 / 60);
    ok(pb.cx < 11, '被打的炸彈停在敵人前方（cx=' + pb.cx + '，敵人 cx=11）');
  }
  p.kick = false;
}

// ================================================================
head('9. 版本與整體回歸');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
const VRE = new RegExp('id="verTxt">' + P.VERSION.replace(/\./g, '\\.'));
const VRE2 = new RegExp('id="verLogVer">' + P.VERSION.replace(/\./g, '\\.'));
ok(VRE.test(html), '畫面版本號同步 ' + P.VERSION);
ok(VRE2.test(html), '版本紀錄面板同步 ' + P.VERSION);
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 最新一筆是 v' + P.VERSION);
// v4.20：小改版只有 2 條（BOSS 3 格）→ 門檻降到 2，只驗「有寫內容」
ok(P.VERSION_LOG[0].items.length >= 2, '最新版記錄了 ' + P.VERSION_LOG[0].items.length + ' 項更新');
ok(P.VERSION_LOG[1] && P.VERSION_LOG[1].now === false, '上一筆（v' + P.VERSION_LOG[1].v + '）已不是「當前」');
// 完整跑一場不報錯
{
  let threw = null;
  try {
    P.startSolo(1, false);
    G.state = 'play';
    for (let i = 0; i < 200; i++) { P.updateWorld(1 / 60); P.updateSolo(1 / 60); }
  } catch (e) { threw = e; }
  ok(threw === null, '單人闖關跑 200 幀不報錯（' + (threw ? threw.message : 'OK') + '）');
}
{
  let threw = null;
  try {
    P.startRpg ? P.startRpg(1) : null;
    for (let i = 0; i < 120; i++) { P.updateWorld(1 / 60); if (P.updateSolo) P.updateSolo(1 / 60); }
  } catch (e) { threw = e; }
  ok(threw === null, 'RPG 模式跑 120 幀不報錯（' + (threw ? threw.message : 'OK') + '）');
}

console.log('');
console.log(fail === 0 ? ('通過 ' + pass + ' / ' + (pass + fail)) : ('✗ ' + fail + ' 項失敗（通過 ' + pass + '）'));
process.exit(fail === 0 ? 0 : 1);
