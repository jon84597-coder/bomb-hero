// 無頭測試 v28：v2.0 的八項需求
//   1. 音樂開關旁邊多一個「全視窗 ON/OFF」圖示
//   2. 飛行怪物移動速度比玩家慢
//   3. 過關的門要靠炸壞磚塊才會出現
//   4. 標題的大紅光暈拿掉 → 改成標題字型外凸出去的紅底形狀
//   5. 丟炸彈的人自己不會頭暈（只有被丟到的才會）
//   6. 紅龍坐騎身體邊緣紅光閃爍（不外擴）
//   7. 玩家角色預設隨機
//   8. 全視窗旁邊多一個信箱圖示 jon84597@gmail.com
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
function openField() {
  for (let y = 1; y < G.rows - 1; y++)
    for (let x = 1; x < G.cols - 1; x++) G.grid[y][x] = 0;
  G.bombs.length = 0; G.flames.length = 0; G.items.length = 0;
  G.enemies.length = 0; G.particles.length = 0; G.bubbles.length = 0;
  if (G.eggs) G.eggs.length = 0;
}

// ================================================================
console.log('=== 1. 全視窗開關（在音樂／音效旁邊） ===');

ok(/id="btnFull"/.test(html), '工具列多了 #btnFull（全視窗開關）');
ok(/class="navbtn tg" id="btnFull"[^>]*>⛶ <b>全視窗<\/b>/.test(html), '圖示是 ⛶，文字是「全視窗」');
ok(/id="btnSfx"[\s\S]{0,300}id="btnFull"/.test(html), '全視窗就在「音效」旁邊（HTML 順序上緊接著）');
ok(/title="全視窗 開.關"/.test(html), '有「全視窗 開／關」的提示');
ok(/if \(fs\) fs\.addEventListener\('click', function \(\) \{[\s\S]{0,200}toggleFullscreen\(\);/.test(html),
  '按下去真的呼叫 toggleFullscreen()');
ok(/typeof updateFullBtn === 'undefined'/.test(html) === false && typeof P.updateFullBtn === 'function',
  '有 updateFullBtn() 會把按鈕切成 ON／OFF 狀態');
ok(/#btnFull\.on \{[^}]*background: rgba\(60,42,20,\.86\)/.test(html), 'ON 的時候按鈕會亮起來（看得出狀態）');
ok(/document\.addEventListener\('fullscreenchange', updateFullBtn\)/.test(html),
  '系統列的全螢幕狀態改變（F11／Esc）也會同步圖示');
ok(/#navBar\.inGame #btnBack \{ display: inline-flex/.test(html) && !/#navBar\.inGame #btnFull/.test(html),
  'v2.3：遊戲中「←」也留著（可退回），全視窗開關依然在');
(function () {
  const btn = els.btnFull;
  ok(!!btn, '沙盒裡也拿得到 #btnFull');
  let threw = null;
  try { P.updateFullBtn(); } catch (e) { threw = e; }
  ok(!threw, 'updateFullBtn() 不會噴錯' + (threw ? '：' + threw.message : ''));
})();

// ================================================================
console.log('\n=== 8. 信箱圖示（jon84597@gmail.com） ===');

ok(/id="btnMail"/.test(html), '工具列多了 #btnMail（信箱）');
ok(/id="btnFull"[\s\S]{0,400}id="btnMail"/.test(html), '信箱就在全視窗開關旁邊');
ok(/✉️/.test(html), '圖示是 ✉️ 信封');
ok(html.indexOf('jon84597@gmail.com') > 0, '畫面上真的有 jon84597@gmail.com');
ok(/const MAIL_ADDR = 'jon84597@gmail\.com'/.test(html), 'MAIL_ADDR 常數就是這個信箱');
ok(/href="mailto:jon84597@gmail\.com/.test(html), '按下去會開邮件軟體（mailto:）');
ok(/copyMail\(MAIL_ADDR\);/.test(html) && /toast\(t\('mail\.toast', \{ addr: MAIL_ADDR \}\)/.test(html),
  '同時複製地址並跳出提示，裝置上沒邮件軟體也拿得到信箱');
ok(typeof P.copyMail === 'function', 'copyMail() 存在');
(function () {
  let threw = null;
  try { P.copyMail('jon84597@gmail.com'); } catch (e) { threw = e; }
  ok(!threw, 'copyMail() 在沒有剪貼簿的環境也不會噴錯' + (threw ? '：' + threw.message : ''));
})();
ok(/\.navbtn\.mail \{ text-decoration: none; \}/.test(html), '它是 <a> 但長得跟按鈕一樣（沒有底線）');
ok(/@media \(max-width: 520px\)[\s\S]{0,200}#btnFull b, #btnMail b \{ display: none; \}/.test(html),
  '窄螢幕（手機）只留圖示，工具列不會被擠爆');

// ================================================================
console.log('\n=== 2. 飛行怪物比玩家慢 ===');

ok(P.FLY_SPEED_CAP === 118, '飛行怪速度上限 FLY_SPEED_CAP = 118');
ok(/if \(sp\.kind === 'fly'\) e\.speed = Math\.min\(e\.speed, FLY_SPEED_CAP \* M\);/.test(html),
  '飛行怪一律封頂（不會隨關卡越飛越快追著你跑）');
const PLAYER_BASE = 146;                      // playerSpeed() 的基礎值
ok(P.FLY_SPEED_CAP < PLAYER_BASE, '上限 118 < 玩家基礎 146 → 一定比玩家慢');
(function () {
  const flying = P.ENEMY_SPECIES.filter(function (s) { return s.kind === 'fly'; });
  ok(flying.length === 4, '飛行怪有 4 種（' + flying.map(function (s) { return s.name; }).join('／') + '）');
  ok(flying.every(function (s) { return s.spd <= 56; }),
    '四種飛行怪基本速度都 ≤ 56（原本 54~78 → 剩最慢的毒蜂 56）');
  let worst = 0, worstName = '';
  for (let st = 1; st <= 8; st++) {
    flying.forEach(function (s) {
      const e = P.makeEnemy(2, 2, s.id, st, 1);
      if (e.speed > worst) { worst = e.speed; worstName = s.name + '@第' + st + '關'; }
    });
  }
  ok(worst <= P.FLY_SPEED_CAP, '連第 8 關最快的飛行怪也沒超速（峰值 ' + worst.toFixed(1) + '：' + worstName + '）');
  ok(worst < PLAYER_BASE, '峰值 ' + worst.toFixed(1) + ' < 玩家 ' + PLAYER_BASE + ' → 玩家跑得掉');
  const bee1 = P.makeEnemy(2, 2, 'bee', 1, 1);
  ok(bee1.speed === 56 + 2.6, '毒蜂第 1 關 = ' + bee1.speed.toFixed(1));
})();
// 地面怪不受影響
(function () {
  const ground = P.ENEMY_SPECIES.filter(function (s) { return s.kind !== 'fly'; });
  let changed = 0;
  ground.forEach(function (s) {
    const e = P.makeEnemy(2, 2, s.id, 1, 1);
    if (e.speed !== s.spd + 2.6) changed++;
  });
  ok(changed === 0, '地面怪的速度公式完全沒被動到（只調飛行怪）');
})();

// ================================================================
console.log('\n=== 3. 過關的門要靠炸開磚塊才出現 ===');

ok(!/if \(Game\.enemies\.length === 0 && p\.alive\) \{\s*\n\s*openDoorForce\(\);/.test(html),
  '不再「敵人清光就自動掀門」');
ok(/if \(dr && dr\.revealed && !dr\.open\) \{ dr\.open = true; doorOpenFx\(dr\); \}/.test(html),
  '門要「revealed（被炸開）」之後才會真的開啟');
(function () {
  const p = freshSolo(1);
  const dr = G.door || P.ensureDoor(null);
  ok(!!dr, '地圖一開始就有門的資料');
  ok(dr.revealed === false, '門一開始是藏起來的（revealed=false）');
  ok(G.grid[dr.y][dr.x] === 2, '門被壓在一塊軟磚底下（要炸掉才看得到）');
  // 敵人清光 → 門還不能開
  G.enemies.length = 0;
  for (let i = 0; i < 30; i++) P.updateSolo(1 / 60);
  ok(!G.door.open, '敵人清光了，門還沒開（因為還沒炸到那塊磚）');
  ok(G.doorHinted === true, '但會跳出「去炸磚找門」的提示，玩家不會卡住');
  // 真的把那一格炸掉
  P.destroySoft(dr.x, dr.y);
  ok(G.door.revealed === true, '炸開那一格 → 門現身');
  // 走到門上 → 過關
  p.x = dr.x * G.T + G.T / 2; p.y = dr.y * G.T + G.T / 2; p.invuln = 999;
  for (let i = 0; i < 30; i++) P.updateSolo(1 / 60);
  ok(G.state === 'roundover' || G.stage !== 1, '走進門 → 真的過關');
})();
// 沒軟磚可炸時不會卡死
(function () {
  freshSolo(1);
  openField();
  const dr = G.door || P.ensureDoor(null);
  if (dr) { dr.revealed = false; G.grid[dr.y][dr.x] = 0; }
  let soft = 0;
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) if (G.grid[y][x] === 2) soft++;
  G.enemies.length = 0;
  for (let i = 0; i < 20; i++) P.updateSolo(1 / 60);
  ok(soft === 0 ? G.door.revealed === true : true,
    '場上沒軟磚可炸了（' + soft + ' 塊）→ 還是會自動露門，不會卡死');
})();
ok(/Game\.doorHinted = false;/.test(html), '每張新地圖會重置提示旗標');

// ================================================================
console.log('\n=== 4. 標題：拿掉大光暈，改成字型外凸的紅底形狀 ===');

ok(!/repeating-conic-gradient/.test(html), '一整圈的放射狀光芒已完全移除');
ok(!/@keyframes bh-rays/.test(html), '旋轉光芒的動畫也移除');
ok(!/content: attr\(data-t\)/.test(html) && !/paint-order: stroke fill/.test(html), 'v2.1：紅底外凸層（data-t 複本）已整個移除');
ok(/<img class="title-logo" id="titleLogo"[^>]*src="data:image\/png;base64,/.test(html), 'v2.1：標題換成美術 LOGO 圖（data URI 內嵌）');
ok(/\.title-logo \{[^}]*width: clamp\(250px, 64vw, 560px\)/.test(html), 'v2.1：LOGO 桌面寬度 clamp(250px, 64vw, 560px)');
ok(html.indexOf('width: clamp(220px, 95vw, 500px); max-width: none;') > 0, 'v2.8：手機直放 LOGO 放大到 95vw（快貼齊左右邊）');
ok(!/title-en/.test(html) && !/title-zh/.test(html), 'v2.1：舊文字標題的 class 全部清除');

// ================================================================
console.log('\n=== 5. 丟炸彈的人自己不會頭暈 ===');

ok(/function dizzyImmune\(who, b\) \{\s*\n\s*return !!\(!b && b\.owner/.test(html) ||
  /function dizzyImmune\(who, b\) \{[\s\S]{0,120}b\.owner && who === b\.owner/.test(html),
  '有 dizzyImmune()：炸彈主人免疫自己丟的那顆');
ok(/if \(dizzyImmune\(p, b\)\) continue;/.test(html), '玩家：自己丟的砸到自己不算');
ok(/if \(dizzyImmune\(e, b\)\) continue;/.test(html), '小怪／BOSS：自己丟的砸到自己也不算');
(function () {
  const ps = freshBattle();
  openField();
  const T = G.T;
  const thrower = ps[0], victim = ps[1];
  thrower.x = 4 * T + T / 2; thrower.y = 4 * T + T / 2;
  victim.x = 7 * T + T / 2; victim.y = 4 * T + T / 2;
  thrower.dizzy = 0; victim.dizzy = 0; thrower.invuln = 0; victim.invuln = 0;
  // 丟的人自己站在彈道上
  const b = { cx: 4, cy: 4, px: thrower.x, py: thrower.y, timer: 2, power: 2, owner: thrower,
    flying: { fx: 4, fy: 4, tx: 7, ty: 4, t: 0, dur: .5 }, passers: [], held: false, moving: null };
  P.flyingDizzyCheck(b, T);
  ok(!thrower.dizzy, '丟炸彈的人自己不會頭暈（dizzy=' + (thrower.dizzy || 0) + '）');
  // 被丟到的那個人
  b.px = victim.x; b.py = victim.y;
  P.flyingDizzyCheck(b, T);
  ok(victim.dizzy > 0, '被丟到的人才會頭暈（dizzy=' + victim.dizzy + '）');
})();
// BOSS 丟的彈砸到自己也不暈
(function () {
  freshSolo(8);
  openField();
  const T = G.T;
  const boss = P.makeBoss(5, 5, 10);
  G.enemies.push(boss); boss.dizzy = 0;
  const b = { cx: 5, cy: 5, px: boss.x, py: boss.y, timer: 2, power: 3, owner: null,
    flying: { fx: 5, fy: 5, tx: 8, ty: 5, t: 0, dur: .5 }, passers: [], held: false, moving: null };
  // BOSS 的彈 owner=null → 直接檢查 function 不會把「自己」標成暈
  ok(P.setDizzy(boss, T) === true || boss.dizzy > 0, 'setDizzy 本身仍可用（給玩家丟中 BOSS 時）');
  boss.dizzy = 0;
  const b2 = { cx: 5, cy: 5, px: boss.x, py: boss.y, timer: 2, power: 3, owner: boss,
    flying: { fx: 5, fy: 5, tx: 8, ty: 5, t: 0, dur: .5 }, passers: [], held: false, moving: null };
  P.flyingDizzyCheck(b2, T);
  ok(!boss.dizzy, 'BOSS 自己丟的彈砸到自己不會暈');
})();

// ================================================================
console.log('\n=== 6. 紅龍：紅光只在身體邊緣閃 ===');

ok(/const gr = ctx\.createRadialGradient\(x, y \+ T \* \.06, T \* \.30, x, y \+ T \* \.06, T \* \.74\);/.test(html),
  '光暈內圈從 0.30T 才開始（中心不發光）');
ok(/gr\.addColorStop\(0, 'rgba\(255,90,50,0\)'\);/.test(html), '中心完全透明 → 不會整團往外擴');
ok(/ctx\.ellipse\(x, y \+ T \* \.06, T \* \.74, T \* \.62/.test(html), '範圍縮到 0.74T（原本是 1.0T，太大了）');
ok(/rgba\(255,64,48,' \+ \(a \* \.72\)/.test(html), '最亮的那一層在 0.84 → 就是身體邊緣');
ok(/ctx\.strokeStyle = 'rgba\(255,92,56,'/.test(html) && /ctx\.lineWidth = Math\.max\(1\.2, T \* \.045\)/.test(html),
  '邊緣再畫一圈會閃的細紅線');
ok(/Math\.sin\(Game\.gameT \* 6\.6\) \* \.30 \+ Math\.sin\(Game\.gameT \* 3\.1\) \* \.15/.test(html),
  '紅光會閃（兩個頻率疊出不規則的火光感）');
(function () {
  const p = freshSolo(1);
  openField();
  p.dino = true; p.redDragon = true; p.fireCd = 0;
  const g = mk();
  clearRec();
  P.drawDino(p, G.T);
  const ellipses = rec.calls.filter(function (c) { return c[0] === 'ellipse'; });
  ok(ellipses.length > 0, '紅龍有畫氣場');
  const big = ellipses.filter(function (c) { return c[3] > G.T * .9; });
  ok(big.length === 0, '不再有大於 0.9 格的超大光暈（原本 1.0T）');
  const strokes = rec.sets.filter(function (c) { return c[0] === 'strokeStyle' && String(c[1]).indexOf('rgba(255,92,56') === 0; });
  ok(strokes.length > 0, '有畫出會閃的邊緣紅線');
})();

// ================================================================
console.log('\n=== 7. 玩家角色預設隨機 ===');

ok(/function randomChar\(\) \{ return Math\.floor\(Math\.random\(\) \* \(CHARACTERS\.length \|\| 1\)\); \}/.test(html),
  '有 randomChar()');
ok(/let charPickedByUser = false;/.test(html), '會記住「玩家有沒有自己挑過」');
ok(/try \{ if \(!localStorage\.getItem\('bombhero-char-picked'\)\) settings\.soloChar = randomChar\(\); \} catch \(e\) \{\}/.test(html),
  '沒挑過 → 每次進遊戲都給一隻隨機角色');
ok(/if \(!charPickedByUser\) \{ settings\.soloChar = randomChar\(\); saveSettings\(\); \}/.test(html),
  '進「單人闖關」時再隨機一次');
ok(/charPickedByUser = true;/.test(html) && /localStorage\.setItem\('bombhero-char-picked', '1'\)/.test(html),
  '玩家自己點過角色 → 之後就照玩家那隻（不會又跳掉）');
ok(/ch: \(pv && typeof pv\.ch === 'number'\) \? pv\.ch : randomChar\(\)/.test(html), '對戰槽位的角色也隨機');
(function () {
  // 隨機性：連抽 40 次應該出現 2 種以上
  const seen = {};
  for (let i = 0; i < 40; i++) seen[P.randomChar()] = true;
  ok(Object.keys(seen).length >= 2, 'randomChar() 真的會隨機（40 次出現 ' + Object.keys(seen).length + ' 種）');
  ok(Object.keys(seen).every(function (k) { return +k >= 0 && +k < P.CHARACTERS.length; }),
    '只會落在 0~' + (P.CHARACTERS.length - 1) + ' 之間，不會選到不存在的角色');
})();

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
