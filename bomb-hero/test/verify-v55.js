// test/verify-v55.js —— v4.12 四項問題的驗證
//   1. 敵人暈眩時被炸彈炸到 → 會扣血、會死
//   2. 手機 WebView：旋轉後版面正確（--vvh）、全螢幕按鈕可開（原生／偽全螢幕）
//   3. 單人闖關的小怪一擊必殺（hp=1、不畫血條）；RPG 模式才有血量與血條
//   4. 手機功能鍵黑底徹底移除（.ticon 畫布透明 + 圓形）
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, html = env.html;
try { P.WeekMod.pin([]); } catch (e) {}   // v5.66：這支驗「基礎數值」，先釘住每週變異

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
P.settings.ctrl = 'kb'; P.settings.soloDiff = 'normal'; P.settings.soloTime = 300;

// ================================================================
head('1. 敵人暈眩時被炸到 → 扣血 + 會死');
ok(typeof P.enemyFlameDamage === 'function', 'enemyFlameDamage 已抽出（可單獨測試）');
ok(/const stunned = e\.dizzy > 0;/.test(html), 'updateEnemy 會記錄「是否暈眩」而不是直接跳過傷害');
ok(/if \(stunned\) \{ e\.dizzy -= dt; enemyFlameDamage\(e, dt\); return; \}/.test(html),
  '暈眩時仍呼叫 enemyFlameDamage（只是不移動）');
// 實測：暈眩中的怪被火焰燒到會扣血
{
  P.startSolo(1, false);
  G.state = 'play';
  G.bombs.length = 0; G.flames.length = 0;
  const e = P.makeEnemy(3, 3, 'slime', 1, 1);
  e.speed = 0; e.dirT = 999;                 // 站定
  const T = G.T;
  e.x = 3 * T + T / 2; e.y = 3 * T + T / 2;
  G.grid[3][3] = 0;
  e.dizzy = 1.0;                              // 讓它處於暈眩狀態
  const hp0 = e.hp;
  // 在它腳下放一個火焰
  P.addFlame ? null : null;
  G.flames.push({ cx: 3, cy: 3, type: 'center', dir: null, t: .46, owner: G.players[0], src: null });
  P.updateEnemy(e, 1 / 60);
  ok(e.hp < hp0, '暈眩中的怪被火焰燒到有扣血（' + hp0 + ' → ' + e.hp + '）');
  // 補滿血再測致死
  e.hp = 1; e.maxHp = 1; e.dead = false; e.hitT = 0; e.dizzy = 1.0;
  G.flames.length = 0;
  G.flames.push({ cx: 3, cy: 3, type: 'center', dir: null, t: .46, owner: G.players[0], src: null });
  P.updateEnemy(e, 1 / 60);
  ok(e.dead === true, '暈眩中的怪被火焰燒到會死');
  // 不暈眩時也要能扣（回歸檢查）
  const e2 = P.makeEnemy(3, 3, 'slime', 1, 1);
  e2.speed = 0; e2.dirT = 999;
  e2.x = 3 * T + T / 2; e2.y = 3 * T + T / 2;
  e2.dizzy = 0;
  G.flames.length = 0;
  G.flames.push({ cx: 3, cy: 3, type: 'center', dir: null, t: .46, owner: G.players[0], src: null });
  const h2 = e2.hp;
  P.updateEnemy(e2, 1 / 60);
  ok(e2.hp < h2, '一般狀態（沒暈眩）也照樣扣血（回歸）');
}

// ================================================================
head('2. WebView 旋轉 / 全螢幕');
ok(/maximum-scale=1/.test(html) && /user-scalable=no/.test(html),
  'viewport meta 鎖住縮放（避免 WebView 裡整頁被縮成「一張圖」）');
ok(/viewport-fit=cover/.test(html), 'viewport meta 加上 viewport-fit=cover（iPhone 瀏海）');
ok(/height: var\(--vvh, 100svh\)/.test(html), 'in-game 高度改用 --vvh（visualViewport 量測，旋轉後最準）');
ok((html.match(/var\(--vvh, 100svh\)/g) || []).length >= 4, '直放 + 橫放的高度都換成 --vvh');
ok(/function fixOrientationLayout\(\)/.test(html), '有 fixOrientationLayout（旋轉後連續量測）');
ok(/var waits = \[0, 120, 300, 600, 1000, 1600\];/.test(html),
  '旋轉後連續量測 6 次（WebView 回報尺寸常落後幾百毫秒）');
ok(/screen\.orientation\.addEventListener\('change'/.test(html),
  '監聽 screen.orientation 的 change（部分 WebView 只有這個事件）');
// 全螢幕
ok(/function tryNativeFullscreen\(el\)/.test(html), 'tryNativeFullscreen（原生 → webkit 逐級嘗試）');
ok(!/requestFullscreen\(\{ navigationUI: 'hide' \}\)/.test(html),
  '不再帶 { navigationUI: "hide" } 參數（iOS Safari／WebView 會直接 TypeError）');
ok(/webkitRequestFullscreen/.test(html), '支援 webkitRequestFullscreen（iOS Safari）');
ok(/function setPseudoFull\(on\)/.test(html), '偽全螢幕 CSS 後援（WebView 把原生 API 擋掉時）');
ok(/body\.pseudo-full/.test(html), '偽全螢幕有對應 CSS（藏工具列、畫面撐滿）');
ok(/function hasUserGesture\(\)/.test(html), '追蹤使用者手勢（2 秒內有效）');
ok(/el\.requestFullscreen\(\);/.test(html), 'requestFullscreen 不帶參數呼叫');
ok(/document\.webkitFullscreenElement/.test(html), '退出全螢幕時也認 webkitFullscreenElement');
// 實測：偽全螢幕可切換
{
  ok(P.isFullscreenNow() === false, '初始不是全螢幕');
  P.setPseudoFull(true);
  ok(P.isFullscreenNow() === true, '偽全螢幕開啟後 isFullscreenNow 為 true');
  P.setPseudoFull(false);
  ok(P.isFullscreenNow() === false, '偽全螢幕關閉後為 false');
}

// ================================================================
head('3. 單人闖關一擊必殺；RPG 才有血量');
P.startSolo(1, false);
G.state = 'play';
const solo = G.enemies.filter(function (e) { return !e.boss; });
ok(solo.length > 0, '單人關有怪（' + solo.length + ' 隻）');
let allOne = true, allMaxOne = true;
solo.forEach(function (e) { if (e.hp !== 1) allOne = false; if (e.maxHp !== 1) allMaxOne = false; });
ok(allOne, '單人闖關的所有小怪 hp = 1（炸一下就死）');
ok(allMaxOne, '單人闖關的小怪 maxHp = 1（沒有血量概念）');
// 實測：炸一下就死
{
  const e = solo[0];
  const T = G.T;
  e.speed = 0; e.dirT = 999;
  e.x = 3 * T + T / 2; e.y = 3 * T + T / 2;
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) G.grid[3 + dy][3 + dx] = 0;
  G.bombs.length = 0; G.flames.length = 0;
  G.bombs.push({ cx: 3, cy: 3, px: e.x, py: e.y, timer: 0.01, power: 2, owner: G.players[0],
    passers: [G.players[0]], remoteArmed: false, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 1, armT: 40 });
  for (let i = 0; i < 60; i++) { P.updateWorld(1 / 60); if (!e.dead) P.updateEnemy(e, 1 / 60); }
  ok(e.dead === true, '單人闖關的怪炸一下就死');
}
// 血條只有 RPG 才畫
{
  const hudFn = html.slice(html.indexOf('function drawRpgHud(T) {'),
    html.indexOf('function drawRpgHud(T) {') + 1200);
  ok(hudFn.indexOf('if (Game.rpg) {') >= 0 &&
     hudFn.indexOf('if (Game.rpg) {') < hudFn.indexOf('if (!Game.rpg) return;'),
    '敵人血條包在 if (Game.rpg) 裡 → 單人模式不畫血條');
  // 實測：單人模式下不應該有血條的 fillRect
  const T = G.T;
  const e0 = solo[0] || P.makeEnemy(3, 3, 'slime', 1, 1);
  e0.x = 3 * T + T / 2; e0.y = 3 * T + T / 2;
  env.rec.calls.length = 0;
  P.drawRpgHud(T);
  const rects = env.rec.calls.filter(function (c) { return c[0] === 'fillRect'; });
  ok(rects.length === 0, '單人模式畫 HUD 時沒有血條的 fillRect（實測 ' + rects.length + ' 個）');
}
// RPG 模式仍有血量
{
  ok(P.RPG_FOE.slime.hp === 4 && P.RPG_FOE.beetle.hp === 5 && P.RPG_FOE.lizard.hp === 6,
    'RPG 模式的怪仍有血量（v5.19 起：史萊姆 4／鐵甲蟲 5／疾風蜥 6）');
  ok(typeof P.FOE_HP === 'object', 'FOE_HP 仍存在（RPG 模式共用）');
}

// ================================================================
head('4. 功能鍵黑底徹底移除');
// 真正的來源：全域 canvas 規則
ok(/canvas \{ display: block; width: 100%; height: auto; border-radius: 14px; background: #0a0f1c; \}/.test(html),
  '全域 canvas 規則（背景 #0a0f1c + 圓角 14px）仍在 → 這正是黑底的來源');
ok(/#touchUI \.ticon \{[\s\S]*?background: transparent !important;[\s\S]*?border-radius: 50% !important;/.test(html),
  '#touchUI .ticon 用 !important 蓋掉全域 canvas 的黑底與圓角');
ok(/--tb-face: rgba\(0,0,0,0\)/.test(html), '功能鍵面盤仍是透明的');
ok(!/--tb-face: rgba\(22,32,56/.test(html) && !/--tb-face: rgba\(74,34,14/.test(html) &&
   !/--tb-face: rgba\(8,38,50/.test(html) && !/--tb-face: rgba\(62,16,8/.test(html),
  '三顆功能鍵都沒有深色面盤');
ok(/drawBombOn\(g, r, it\.kind === 'bomb' \? 3 : 7/.test(html), '炸彈圖示畫法沒變（圖案保留）');

// ================================================================
head('5. 版本與 Service Worker');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
const VRE = new RegExp('id="verTxt">' + P.VERSION.replace(/\./g, '\\.'));
const VRE2 = new RegExp('id="verLogVer">' + P.VERSION.replace(/\./g, '\\.'));
ok(VRE.test(html), '畫面版本號同步 ' + P.VERSION);
ok(VRE2.test(html), '版本紀錄面板同步 ' + P.VERSION);
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 最新一筆是 v' + P.VERSION);
// v4.20：小改版只有 2 條（BOSS 3 格）→ 門檻降到 2，只驗「有寫內容」
ok(P.VERSION_LOG[0].items.length >= 2, '最新版記錄了 ' + P.VERSION_LOG[0].items.length + ' 項更新');
ok(P.VERSION_LOG[1] && P.VERSION_LOG[1].now === false, 'v' + P.VERSION_LOG[1].v + ' 已改成 now:false');
// 完整跑一場不報錯
{
  let threw = null;
  try {
    P.startSolo(1, false); G.state = 'play';
    for (let i = 0; i < 200; i++) { P.updateWorld(1 / 60); P.updateSolo(1 / 60); }
  } catch (e) { threw = e; }
  ok(threw === null, '單人闖關跑 200 幀不報錯（' + (threw ? threw.message : 'OK') + '）');
}
{
  let threw = null;
  try {
    if (P.startRpg) P.startRpg(1);
    for (let i = 0; i < 120; i++) { P.updateWorld(1 / 60); if (P.updateSolo) P.updateSolo(1 / 60); }
  } catch (e) { threw = e; }
  ok(threw === null, 'RPG 模式跑 120 幀不報錯（' + (threw ? threw.message : 'OK') + '）');
}

console.log('');
console.log(fail === 0 ? ('通過 ' + pass + ' / ' + (pass + fail)) : ('✗ ' + fail + ' 項失敗（通過 ' + pass + '）'));
process.exit(fail === 0 ? 0 : 1);
