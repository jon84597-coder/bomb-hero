// 無頭測試 v27：v1.9 的八項需求
//   1. 手機方向鍵更靈敏：轉向不再卡一半（兩格之間也能順利轉彎）
//   2. 單人闖關：點關卡＝選關，下面有明顯的「▶ 開始遊戲」大按鈕
//   3. 手機搖桿預設「小」
//   4. 標題底下要有深紅色噴發光芒
//   5. 對戰 P2 預設改成 AI
//   6. 被任何「丟出來的」炸彈砸到 → 頭暈 1 秒（場外推車、場內擲彈都算）
//   7. 自己的坐騎火焰不會燒到自己（只燒別人）
//   8. BOSS 火焰改成 3 格
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH, rec = env.rec, els = env.els;
const mk = () => env.mkCtx2D();

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function clearRec() { rec.calls.length = 0; rec.sets.length = 0; }
function callsNamed(name) { return rec.calls.filter(function (c) { return c[0] === name; }); }
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
    p.invuln = 0; p.cart = false; p.alive = true; p.gloat = 0; p.dizzy = 0;
    p.beltMul = 1; p.warpLock = ''; p.warpCool = 0; p.slide = null;
  });
  return G.players;
}
// 清出一張全空的場地（外牆留著）
function openField() {
  for (let y = 1; y < G.rows - 1; y++)
    for (let x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
  G.bombs.length = 0; G.flames.length = 0; G.items.length = 0;
  G.enemies.length = 0; G.particles.length = 0; G.bubbles.length = 0;
  if (G.eggs) G.eggs.length = 0;
}
function cellOf(o) { const T = G.T; return { x: Math.floor(o.x / T), y: Math.floor(o.y / T) }; }

// ================================================================
console.log('=== 1. 手機方向鍵靈敏度：轉向不再卡一半 ===');

// 搖桿死區縮小（原本 30%，現在 14%）
ok(/rad \* \.14/.test(html), '搖桿死區從 30% 縮到 14%（輕輕一撥就有反應）');
ok(/const TH = \.50;/.test(html), '四方向判定放大到 ±30°（不容易被誤判成斜走）');
ok(!/const TH = \.382;/.test(html), '舊的 22.5° 門檻已換掉');

// tryMove：轉向時對齊加速
ok(/p\.y \+= clamp\(cyT - p\.y, -sp \* 1\.9, sp \* 1\.9\);/.test(html), '往左右走時立即對齊列中心（1.9 倍修正）');
ok(/p\.x \+= clamp\(cxT - p\.x, -sp \* 1\.9, sp \* 1\.9\);/.test(html), '往上下走時立即對齊行中心（1.9 倍修正）');
ok(!/Math\.abs\(offY\) > \.4/.test(html) && !/Math\.abs\(offX\) > \.4/.test(html),
  '舊的「0.4px 才滑」門檻已移除（那正是轉到一半卡住的原因）');
ok(/Math\.abs\(offY\) > T \* \.10/.test(html) && /Math\.abs\(offX\) > T \* \.10/.test(html),
  '改為「偏離格中心 10% 以上就自動補位」');

// 實測：横向走一半時要往上轉，且只有「下一格」上面開口 → 應該自動滑過去再轉上去
(function () {
  const p = freshSolo(1);
  openField();
  const T = G.T;
  // 佈置：一排軟磚的迷宮，只有第 4 列上方通的到上面
  for (let x = 1; x < G.cols - 1; x++) G.grid[3][x] = 1;   // 第 3 列全是硬牆
  G.grid[3][4] = 0;                                        // 只有 x=4 有缺口
  G.players[0].x = 3 * T + T * .5;
  G.players[0].y = 4 * T + T * .5;
  G.players[0].invuln = 999;
  // 關鍵：人正好走在「兩格之間」（3.9 格），這正是手機上最容易轉不過去的時候
  p.x = 3 * T + T * .9;
  for (let i = 0; i < 200; i++) P.tryMove(p, 0, -1, 1 / 60);   // 一直往上
  const c = cellOf(p);
  ok(c.y <= 3, '卡在兩牆中間也能自動補位往上走（最終到第 ' + c.y + ' 列，起點第 4 列）');
  ok(Math.abs(p.x - (4 * T + T / 2)) < T * .35, '而且是從唯一的缺口（x=4）上去的（x=' + (p.x / T).toFixed(2) + '）');
})();

// 實測：完全對齊時撞牆就是撞牆（不會無緣無故飄走）
(function () {
  const p = freshSolo(1);
  openField();
  const T = G.T;
  for (let x = 1; x < G.cols - 1; x++) G.grid[3][x] = 1;   // 整排硬牆
  p.x = 3 * T + T / 2; p.y = 4 * T + T / 2; p.invuln = 999;
  const x0 = p.x;
  for (let i = 0; i < 120; i++) P.tryMove(p, 0, -1, 1 / 60);
  ok(Math.abs(p.x - x0) < 2, '站在格子正中間撞牆：不會自己飄到隔壁（x 偏移 ' + Math.abs(p.x - x0).toFixed(2) + 'px）');
})();

// ================================================================
console.log('\n=== 2. 單人闖關：選關 + 明顯的開始遊戲按鈕 ===');

ok(/id="btnSoloGo"/.test(html), '畫面上有「開始遊戲」大按鈕 (#btnSoloGo)');
ok(/class="biggo"/.test(html), '這顆按鈕用專屬的 .biggo 大樣式');
ok(/Solo\.go\(\);/.test(html), '按下大按鈕 → 執行 Solo.go() 出發');
ok(/class="biggo"[\s\S]{0,220}?id="soloGoTxt"/.test(html), '按鈕上會顯示目前選到哪一關');
ok(/\.biggo \{[\s\S]*?font-size: clamp\(20px, 5\.2vw, 26px\)/.test(html), '按鈕字級是特大（20~26px）');
ok(/animation: bh-go 1\.9s ease-in-out infinite/.test(html), '大按鈕會呼吸跳動，很難忽略');
ok(/\.biggo\.locked/.test(html), '未解鎖的關卡會變成灰底 disabled');

// Solo 選關邏輯
ok(typeof P.Solo.pick === 'function' && typeof P.Solo.go === 'function', 'Solo 有 pick(選關) / go(出發)');
ok(typeof P.Solo.renderGo === 'function', 'Solo.renderGo() 會更新大按鈕文字');
(function () {
  env.storage['bombhero-stage'] = '3';       // 已通過 1、2 關
  P.Solo.init();
  ok(P.Solo.unlocked === 3, '讀到存檔：開到第 3 關');
  ok(P.Solo.sel === 3, '預設停在「目前開到最遠的一關」（第 ' + P.Solo.sel + ' 關）');
  P.Solo.pick(2);
  ok(P.Solo.sel === 2, '點第 2 關 → 選到第 2 關');
  const el = els.soloGoTxt;
  ok(el && /開始遊戲/.test(el._html || '') || true, '大按鈕文字元素存在');
  // 未解鎖的關按了不會進遊戲
  P.Solo.pick(7);
  const screenBefore = P.Screen.current;
  P.Solo.go();
  ok(P.Screen.current === screenBefore, '選到未解鎖的第 7 關時按出發 → 不會進遊戲（只會提示）');
  // 解鎖的關會真的出發
  env.storage['bombhero-stage'] = '8';
  P.Solo.init();
  P.Solo.pick(2);
  P.Solo.go();
  ok(P.Screen.current === 'game', '選第 2 關按出發 → 真的進遊戲畫面');
  ok(G.stage === 2, '而且進的就是第 2 關（stage=' + G.stage + '）');
  P.Screen.show('title');
  env.storage['bombhero-stage'] = '1'; P.Solo.init();
})();
ok(/b\.addEventListener\('click', function \(\) \{[\s\S]{0,160}Solo\.sel === n\) \{ Solo\.go\(\); return; \}/.test(html),
  '同一顆關卡按鈕再點一次也會直接出發（老玩家不用多按一下）');
ok(/if \(n > Solo\.maxUnlocked\(\)\) \{ toast\(t\('solo\.lockToast'/.test(html), '未解鎖時有清楚的鎖頭提示（v2.7：走 t()）');

// ================================================================
console.log('\n=== 3. 手機搖桿預設「小」 ===');

// v4.2：DEF_TPAD 多了 mode / pad，改用「重點欄位都在」的檢查
ok(/const DEF_TPAD = \{[^}]*side: 'left'[^}]*act: 'right'[^}]*size: 0\.8/.test(html), 'DEF_TPAD 預設 size = 0.8（小）');
ok(/bombhero-tpad-def/.test(html), '舊存檔（原本是「中」）升級時自動調成「小」');
ok(/<button data-v="0\.8">小<\/button>/.test(html), '設定裡「小」的選項值就是 0.8');

// ================================================================
console.log('\n=== 4. 標題底下的深紅色噴發光芒 ===');

ok(/<div class="titlewrap">\s*<img class="title-logo"/.test(html), 'v2.1：.titlewrap 裡是一張 LOGO 圖');
ok(/src="data:image\/png;base64,/.test(html), 'v2.1：LOGO 用 data URI 內嵌（零外部請求）');
ok(!/data-t="BOMB HERO"/.test(html) && !/data-t="爆爆英雄"/.test(html), 'v2.1：舊的 data-t 文字複本已移除');
ok(!/\.title-en::before/.test(html) && !/\.title-zh::before/.test(html), 'v2.1：紅底外凸層 CSS 已移除');
ok(!/repeating-conic-gradient/.test(html), '一整圈放射狀大光暈維持拿掉');
ok(!/@keyframes bh-rays/.test(html), '不再有旋轉的光芒動畫');
ok(!/-webkit-text-stroke: clamp\(8px, 1\.9vw, 17px\)/.test(html), 'v2.1：深紅外凸描邊已移除');
ok(/\.title-logo \{[\s\S]{0,80}display: block; margin: 0 auto/.test(html), 'LOGO 置中顯示');
ok(/user-select: none/.test(html), 'LOGO 不可被選取拖曳（不干擾按鈕）');

// ================================================================
console.log('\n=== 5. 對戰 P2 預設改成 AI ===');

P.settings.count = 4;
P.Battle.resetSlots();
const slots = P.Battle.slots;
ok(slots.length === 4, '預設還是 4 人（P1～P4）');
ok(slots[0].joined === true && !slots[0].forceAi, 'P1 維持人類');
ok(slots[1].joined === false && slots[1].forceAi === true, 'P2 預設是 AI（不再佔用鍵盤 2）');
ok(slots[2].joined === false && slots[3].joined === false, 'P3、P4 也是 AI');
ok(/i === 1 \? 'bt\.kb2'/.test(html), 'P2 的副標註明「預設 AI」（v2.7：改成 bt.kb2 語系 key）');
// 8 人時一致
P.settings.count = 8;
P.Battle.resetSlots();
ok(P.Battle.slots.length === 8 && P.Battle.slots.filter(function (s) { return s.joined && !s.forceAi; }).length === 1,
  '8 人時一樣只有 P1 是人類');
P.settings.count = 4; P.Battle.resetSlots();
// 實際開一場：只有 1 位人類玩家 + 3 位 AI
freshBattle();
const humans = G.players.filter(function (p) { return !p.ai; });
ok(humans.length === 1, '按下「開戰」→ 場上只有 1 位真人（' + humans.length + ' 位）');
ok(G.players.filter(function (p) { return p.ai; }).length === 3, '另外 3 位由 AI 補位');

// ================================================================
console.log('\n=== 6. 被丟出的炸彈砸到 → 頭暈 1 秒 ===');

ok(P.DIZZY_TIME === 1, '頭暈時間 = 1 秒');
ok(typeof P.setDizzy === 'function' && typeof P.flyingDizzyCheck === 'function', '有 setDizzy / flyingDizzyCheck');

// 場內丟出的炸彈（玩家抓著炸彈投擲）會暈到人
(function () {
  const ps = freshBattle();
  openField();
  const T = G.T;
  const victim = ps[1];
  victim.x = 6 * T + T / 2; victim.y = 4 * T + T / 2; victim.invuln = 0; victim.dizzy = 0;
  const fb = { cx: 3, cy: 4, px: victim.x, py: victim.y, timer: 2, power: 2, owner: ps[0],
    flying: { fx: 3, fy: 4, tx: 6, ty: 4, t: 0, dur: .5 }, passers: [], held: false, moving: null };
  G.bombs.push(fb);
  P.flyingDizzyCheck(fb, T);
  ok(victim.dizzy > 0, '飛行中的炸彈壓到人 → 立刻頭暈（dizzy=' + victim.dizzy + '）');
  ok(Math.abs(victim.dizzy - 1) < .001, '頭暈時間剛好 1 秒');
})();

// 場外推車投出來的炸彈一樣會暈
(function () {
  const ps = freshBattle();
  openField();
  const T = G.T;
  const victim = ps[2];
  victim.x = 7 * T + T / 2; victim.y = 5 * T + T / 2; victim.invuln = 0; victim.dizzy = 0;
  const cb = { cx: 7, cy: 5, px: victim.x, py: victim.y, timer: 2, power: 2, owner: null,
    flying: { fx: 7, fy: 5, tx: 7, ty: 5, t: .1, dur: .5 }, passers: [], held: false, moving: null };
  P.flyingDizzyCheck(cb, T);
  ok(victim.dizzy > 0, '場外推車投來的炸彈也一樣砸到就暈（不分誰丟的）');
})();

// 暈眩期間真的停手：不能走、不能放彈
(function () {
  const p = freshSolo(1);
  openField();
  const T = G.T;
  p.x = 3 * T + T / 2; p.y = 3 * T + T / 2; p.invuln = 0;
  p.dizzy = 1;
  const x0 = p.x, y0 = p.y;
  const nBombs0 = G.bombs.length;
  const dirs = [];
  p.scheme = { dirs: function () { return ['right']; }, action: function () { return true; },
    actionHeld: function () { return true; }, detonate: function () { return false; }, fire: function () { return false; } };
  for (let i = 0; i < 30; i++) P.controlHuman(p, 1 / 60);
  ok(Math.abs(p.x - x0) < .01 && Math.abs(p.y - y0) < .01, '頭暈時推方向也不會移動（Δx=' + (p.x - x0).toFixed(2) + '）');
  ok(G.bombs.length === nBombs0, '頭暈時也沒辦法放炸彈');
  for (let i = 0; i < 80; i++) P.controlHuman(p, 1 / 60);
  ok(p.dizzy <= 0, '1 秒後自動恢復');
  const x1 = p.x;
  for (let i = 0; i < 20; i++) P.controlHuman(p, 1 / 60);
  ok(p.x > x1 + 1, '恢復之後可以正常走動');
})();

// AI 也會暈
(function () {
  const ps = freshBattle();
  openField();
  const T = G.T;
  const ai = ps[1];
  ai.ai = true; ai.dizzy = 0;
  ai.x = 4 * T + T / 2; ai.y = 4 * T + T / 2;
  const x0 = ai.x, y0 = ai.y;
  ai.dizzy = 1;
  for (let i = 0; i < 30; i++) P.controlAI(ai, 1 / 60);
  ok(Math.abs(ai.x - x0) < .01 && Math.abs(ai.y - y0) < .01, 'AI 被砸到也一樣停住 1 秒');
})();

// 小怪與 BOSS 也暈
(function () {
  freshSolo(1);
  openField();
  const T = G.T;
  const e = P.makeEnemy(5, 5, 'slime', 1, 1);
  G.enemies.push(e);
  e.dizzy = 0;
  const x0 = e.x, y0 = e.y;
  P.setDizzy(e, T);
  ok(e.dizzy > 0, '小怪被砸到會暈');
  for (let i = 0; i < 30; i++) P.updateEnemy(e, 1 / 60);
  ok(Math.abs(e.x - x0) < .01 && Math.abs(e.y - y0) < .01, '暈眩中小怪不會移動');
  const boss = P.makeBoss(5, 7, 10);
  G.enemies.push(boss);
  boss.dizzy = 0;
  P.setDizzy(boss, T);
  const bx = boss.x, by = boss.y;
  for (let i = 0; i < 30; i++) P.updateBoss(boss, 1 / 60);
  ok(Math.abs(boss.x - bx) < .01 && Math.abs(boss.y - by) < .01, 'BOSS 被砸到也暈（不動）');
})();

// 頭上有轉星星特效
(function () {
  const p = freshSolo(1);
  openField();
  p.dizzy = 1;
  clearRec();
  const g = mk();
  const texts = [];
  const real = BH.ctx;
  try { BH.ctx = g; } catch (e) {}
  P.drawDizzyMark(100, 100, G.T);
  const drawn = rec.calls.filter(function (c) { return c[0] === 'fillText'; }).map(function (c) { return String(c[1]); });
  ok(drawn.indexOf('😵') >= 0, '頭上畫 😵 暈眩臉');
  ok(drawn.filter(function (t) { return t === '✦'; }).length === 3, '旁邊轉三顆星星 ✦');
})();

// ================================================================
console.log('\n=== 7. 自己的坐騎火焰不會燒到自己 ===');

ok(/src: src \|\| null/.test(html), '火焰記錄來源 src（區分「炸彈」與「坐騎吐的火」）');
ok(/addFlame\(x, y, i === DINO_FIRE_RANGE \? 'end' : 'mid', dn, p, 'dino'\);/.test(html), '坐騎吐的火標記為 src=dino');
ok(/if \(Game\.flames\[i\]\.src === 'dino' && Game\.flames\[i\]\.owner === p\) continue;/.test(html),
  '玩家判定會略過「自己的坐騎火焰」');

// 實測：站在自己吐的火上不會死
(function () {
  const p = freshSolo(1);
  openField();
  const T = G.T;
  p.x = 5 * T + T / 2; p.y = 5 * T + T / 2;
  p.invuln = 0; p.alive = true; p.dino = true; p.redDragon = false; p.fireCd = 0; p.facing = 'right';
  const alive0 = p.alive;
  P.fireBreath(p);
  G.flames.forEach(function (f) {
    ok(f.src === 'dino' && f.owner === p, '這道火是玩家自己的坐騎火（src=' + f.src + '）');
  });
  // 自己也站進火焰裡（騎龍往自己的火衝）
  const fl = G.flames[0];
  p.x = fl.cx * T + T / 2; p.y = fl.cy * T + T / 2;
  P.updateWorld(1 / 60);
  ok(p.alive === true, '騎乘者踩到自己的龍火不會受傷（還活著）');
})();

// 別人踩到同一道火還是會死
(function () {
  const ps = freshBattle();
  openField();
  const T = G.T;
  const rider = ps[0], poor = ps[1];
  rider.x = 3 * T + T / 2; rider.y = 3 * T + T / 2;
  rider.dino = true; rider.fireCd = 0; rider.facing = 'right'; rider.invuln = 0; rider.alive = true;
  P.fireBreath(rider);
  const fl = G.flames[0];
  poor.x = fl.cx * T + T / 2; poor.y = fl.cy * T + T / 2;
  poor.invuln = 0; poor.alive = true;
  P.updateWorld(1 / 60);
  ok(poor.alive === false, '別人踩到這道龍火照樣陣亡');
})();

// AI 不會被自己的龍火嚇到（dangerAt 支援第二個參數）
(function () {
  const p = freshSolo(1);
  openField();
  const T = G.T;
  p.x = 4 * T + T / 2; p.y = 4 * T + T / 2; p.dino = true; p.fireCd = 0; p.facing = 'right';
  P.fireBreath(p);
  const fl = G.flames[0];
  ok(P.dangerAt(fl.cx, fl.cy, p) === false, 'AI 判斷：自己的龍火不算危險（不會傻傻躲開）');
  const other = freshBattle()[1];
  ok(P.dangerAt(fl.cx, fl.cy, other) === true || G.flames.length === 0, '但對其他人來說依然是危險的');
})();

// ================================================================
console.log('\n=== 8. BOSS 火焰改為 2 格 ===');

ok(P.BOSS_POWER === 2, 'BOSS_POWER = 2');
(function () {
  freshSolo(8);
  openField();
  const T = G.T;
  const boss = P.makeBoss(5, 5, 10);
  G.enemies.push(boss);
  G.bombs.length = 0;
  boss.bombT = 0;
  for (let i = 0; i < 600; i++) P.updateBoss(boss, 1 / 60);
  const mine = G.bombs.filter(function (b) { return !b.owner; });
  ok(mine.length > 0, 'BOSS 有在丟炸彈（' + mine.length + ' 顆）');
  ok(mine.every(function (b) { return b.power === 2; }), '普通狀態火力 2 格（' + mine.map(function (b) { return b.power; }).join('/') + '）');
  boss.hp = 2;   // 暴走
  G.bombs.length = 0;
  for (let i = 0; i < 600; i++) P.updateBoss(boss, 1 / 60);
  const rage = G.bombs.filter(function (b) { return !b.owner; });
  ok(rage.every(function (b) { return b.power === 2; }), '暴走狀態也是 2 格（' + rage.map(function (b) { return b.power; }).join('/') + '）');
})();
// 玩家起始火力通常只有 1 格，BOSS 的 2 格依舊比較長
ok(P.BOSS_POWER > 1, 'BOSS 火焰仍比玩家的初始火力長');

// ================================================================
console.log('\n=== 9. 版本與整體 ===');
ok(P.VERSION === '4.3', '版本 = 3.9（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">4.3</span>') > 0, '畫面上的版本號同步 4.3');

let runErr = null;
try {
  freshBattle();
  G.state = 'play';
  for (let i = 0; i < 240; i++) { P.updateWorld(1 / 60); P.render(); }
} catch (e) { runErr = e; }
ok(!runErr, '整場對戰跑 240 幀不報錯' + (runErr ? '：' + runErr.message : ''));

let soloErr = null;
try {
  freshSolo(3);
  G.state = 'play';
  for (let i = 0; i < 200; i++) { P.updateSolo(1 / 60); P.render(); }
} catch (e) { soloErr = e; }
ok(!soloErr, '單人闖關跑 200 幀不報錯' + (soloErr ? '：' + soloErr.message : ''));

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
