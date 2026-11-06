// 無頭測試 v17：手機選單排版 / 線上大廳 / AI 推車瞄準 / AI 難度 / 怪物多樣化
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('no script'); process.exit(1); }
const code = m[1];

// ----- 模擬瀏覽環境 -----
function mkCtx2D() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return { width: 720, height: 540 };
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (typeof t[k] !== 'undefined') return t[k];
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
function mkEl(id) {
  const el = {
    id, style: {}, dataset: {}, children: [],
    _cls: new Set(),
    classList: {
      add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); },
      toggle(c) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); },
      contains(c) { return el._cls.has(c); }
    },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; },
    getContext: () => mkCtx2D(),
    querySelectorAll: () => [],
    querySelector: () => mkEl(id + '-q'),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 540 }),
    focus() {}, click() {},
    width: 720, height: 540, textContent: '', value: ''
  };
  let _inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return _inner; },
    set(v) { _inner = v; el.children = []; }
  });
  return el;
}
const els = {};
function getId(id) { if (!els[id]) els[id] = mkEl(id); return els[id]; }

const listeners = {};
const storage = {};
const sandbox = {
  console, Math, JSON, Object, Array, Date, parseInt, parseFloat, isNaN, isFinite,
  Uint8ClampedArray, Infinity, NaN, undefined,
  setTimeout: () => 0,
  clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0,
  performance: { now: () => Date.now() },
  localStorage: {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; }
  },
  navigator: { getGamepads: () => [] },
  document: {
    getElementById: getId,
    querySelectorAll: () => [],
    querySelector: () => mkEl('q'),
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener() {},
    createElement: t => mkEl(t),
    body: mkEl('body'),
    documentElement: mkEl('html')
  }
};
sandbox.window = sandbox;
sandbox.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
sandbox.removeEventListener = () => {};
sandbox.globalThis = sandbox;
sandbox.window.window = sandbox;
vm.createContext(sandbox);

vm.runInContext(code, sandbox, { filename: 'index.html' });

const BH = sandbox.window.__BH;
if (!BH) { console.error('no __BH'); process.exit(1); }
const G = BH.Game;
const N = BH.Net;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

// ================================================================
console.log('=== 1. 手機直放選單排版（CSS） ===');
ok(/body\.touch \.wrap:not\(\.game\)\s*\{[^}]*touch-action: pan-y/.test(html),
  '選單畫面允許滑動（pan-y），不會再被裁切看不到');
ok(!/body\.touch\s*\{[^}]*touch-action: none/.test(html),
  'body 不再設 touch-action:none（否則子層的 pan-y 會一起被鎖死）');
ok(/@media \(orientation: portrait\)[\s\S]*?body\.touch \.menu \{ display: grid; grid-template-columns: 1fr 1fr/.test(html),
  '直放旋轉時主選單改 2 欄（按得下、看得完）');
ok(/@media \(orientation: portrait\)[\s\S]*?body\.touch \.title-card \.hint \{ display: none/.test(html),
  '直放時隱藏標題說明文字（省空間）');
ok(/@media \(orientation: portrait\)[\s\S]*?body\.touch \.title-card \.title-logo \{ width: clamp\(/.test(html),
  '直放時標題 LOGO 縮小（v2.1 改用圖片、clamp 自適應寬度）');
ok(html.indexOf('class="logo-big"') < 0, 'v1.8：首頁不再有 ICON 圖塊（只剩文字標題）');
ok(html.indexOf('class="gap24"') >= 0, '間隔元素可被緊湊模式壓縮');

// ================================================================
console.log('=== 2. 線上大廳：房間列表 ＋ 快速配對 ===');
ok(html.indexOf('id="btnNetQuick"') >= 0, '有「⚡ 快速配對」按鈕');
ok(html.indexOf('id="netRoomList"') >= 0, '有房間列表容器');
ok(html.indexOf('/api/relay/list') >= 0, '前端會打房間列表 API');
ok(typeof N.joinCode === 'function', 'Net.joinCode() 可用（列表點房號直接加入）');
ok(typeof N.quick === 'function', 'Net.quick() 快速配對可用');
ok(typeof N.renderRooms === 'function', 'Net.renderRooms() 可用');
ok(typeof N.lobbyRefresh === 'function', '大廳列表自動刷新可用');
// renderRooms：有房 → 顯示房號；沒房 → 顯示提示
const listEl = sandbox.document.getElementById('netRoomList');
N.renderRooms([{ code: '1234', count: 4, players: 2, host: '阿房' }, { code: '5678', count: 8, players: 8, host: '滿房' }]);
ok(listEl.innerHTML.indexOf('1234') >= 0 && listEl.innerHTML.indexOf('阿房') >= 0, '列表顯示房號與房主');
ok(listEl.innerHTML.indexOf('已滿') >= 0 && listEl.innerHTML.indexOf('可加入') >= 0, '標示可加入／已滿');
N.renderRooms([]);
ok(listEl.innerHTML.indexOf('目前沒有') >= 0, '沒房時顯示引導文案');
// quick：沒有房間 → 走建立（在無 fetch 的沙盒裡 quick 會直接 return，改驗 joinCode 的 4 位數檢查）
N.joinCode('12');
ok(true, 'joinCode 錯誤房號不炸（防禦）');
N.joinCode('4321');

// ================================================================
console.log('=== 3. AI 推車丟彈瞄準場內活人（不丟推車人） ===');
BH.settings.size = 'M'; BH.settings.hazards = 'off'; BH.settings.sd = 'off'; BH.settings.revenge = 'off';
BH.settings.ctrl = 'kb'; BH.settings.count = 4;
BH.Battle.resetSlots();
BH.startBattle(); G.state = 'play';
const T = G.T;
const me = G.players[0], aiP = G.players[1];
// 我（人類）站場中間
me.cart = false; me.alive = true; me.invuln = 0;
me.x = Math.floor(G.cols / 2) * T + T / 2; me.y = Math.floor(G.rows / 2) * T + T / 2;
// AI 坐推車在外圈
aiP.cart = true; aiP.ai = true; aiP.alive = true;
aiP.x = T * 0 + T / 2; aiP.y = T * 2 + T / 2;   // 外圈左側 (0,2)
// 其他人都坐推車（不該被瞄準）
G.players[2].cart = true; G.players[2].alive = true;
G.players[3].cart = true; G.players[3].alive = true;
G.bombs.length = 0;
const threw = BH.cartThrowBomb(aiP);
ok(threw === true, 'AI 推車成功丟彈');
const b = G.bombs[G.bombs.length - 1];
ok(b && b.flying, '炸彈是拋物線飛行（不是直接出現在場內）');
// 舊的「離外牆 1～2 格邊緣帶」規則已取消（v4.38 改成推車垂直射線），見下方斷言
const preyCx = Math.floor(me.x / T), preyCy = Math.floor(me.y / T);
ok(Math.abs(b.cx - preyCx) + Math.abs(b.cy - preyCy) >= 3, '不會直接丟在目標旁邊（離人 ' +
  (Math.abs(b.cx - preyCx) + Math.abs(b.cy - preyCy)) + ' 格）');
// 新規則（v4.38）：只能「垂直於那一邊往場內」丟 —— 同一條射線、至少飛滿集氣距離
const cartCx = Math.round(aiP.x / T - .5), cartCy = Math.round(aiP.y / T - .5);
const dir17 = BH.cartThrowDir(aiP);
const dn17 = dir17.dn, vec17 = dir17.d;
const want17 = BH.CART_LV[1].reach;
const dist17 = Math.abs(b.cx - cartCx) + Math.abs(b.cy - cartCy);
const onRay17 = (b.cx - cartCx) === vec17.x * dist17 && (b.cy - cartCy) === vec17.y * dist17;
ok(onRay17 && dist17 >= 1 && dist17 <= want17 + BH.CART_BOUNCE_MAX,
  '落點在推車的垂直射線上（集氣距離 + 最多彈跳 ' + BH.CART_BOUNCE_MAX + ' 格）' +
  '（' + cartCx + ',' + cartCy + ' 往' + dn17 + ' → ' + b.cx + ',' + b.cy + '，' + dist17 + ' / ' + want17 + ' 格）');
// v4.41：撞到石牆就停 —— 落點前面不能有石牆，落點自己也不能是石牆
ok(b.onWall === (G.grid[b.cy][b.cx] === 1), '牆上的落點有標 onWall（畫在牆頂）',
  'cell=' + G.grid[b.cy][b.cx] + ' onWall=' + b.onWall);
// v4.52：軟磚也會彈跳 → 上限改成「集氣距離 + 彈跳上限」，不再是死板的 3 格
ok(dist17 <= want17 + BH.CART_BOUNCE_MAX, '距離不超過 集氣距離＋彈跳上限 ' +
  (want17 + BH.CART_BOUNCE_MAX) + ' 格', dist17);
// 推車人（aiP 自己在外圈）不會被瞄準：落點一定在內場
ok(b.cx >= 1 && b.cy >= 1 && b.cx <= G.cols - 2 && b.cy <= G.rows - 2, '落點在內場（不會丟在外圈推車區）');
// 人類玩家（非 AI）走舊規則：朝場內丟
aiP.cart = false; me.cart = true; me.ai = false;
me.x = T / 2; me.y = T * 2 + T / 2;
G.grid[2][1] = 0; G.grid[2][2] = 0;   // 保證內圈兩格是空的（不受隨機地圖影響）
G.bombs.length = 0;
const threw2 = BH.cartThrowBomb(me);
ok(threw2 === true && G.bombs.length === 1, '人類推車丟彈正常（朝內圈）');
me.cart = false;

// ================================================================
console.log('=== 4. AI 難度 弱／中／強 ===');
ok(html.indexOf('id="segAi"') >= 0, '對戰設定有 AI 難度選項');
ok(html.indexOf('data-v="weak"') >= 0 && html.indexOf('data-v="strong"') >= 0, '有 弱／中／強 三檔');
BH.settings.aiLevel = 'normal';
ok(BH.aiLevelCfg() === BH.AI_LEVELS.normal, '預設難度＝中');
const wk = BH.AI_LEVELS.weak, nm2 = BH.AI_LEVELS.normal, st = BH.AI_LEVELS.strong;
ok(wk.spd < nm2.spd && nm2.spd < st.spd, '移速：弱 < 中 < 強（' + wk.spd + ' / ' + nm2.spd + ' / ' + st.spd + '）');
ok(wk.think[0] > nm2.think[0] && nm2.think[0] > st.think[0], '反應：弱想很久、強想很快');
ok(wk.bomb < nm2.bomb && nm2.bomb < st.bomb, '放彈率：弱 < 中 < 強（' + wk.bomb + ' / ' + nm2.bomb + ' / ' + st.bomb + '）');
ok(wk.chase < nm2.chase, '弱 AI 常常不追人（chase=' + wk.chase + '）');
ok(wk.flee < nm2.flee, '弱 AI 常常不會躲火（flee=' + wk.flee + '）');
ok(st.foeR > nm2.foeR, '強 AI 追擊範圍更遠（' + st.foeR + ' > ' + nm2.foeR + '）');
BH.settings.aiLevel = 'banana';
ok(BH.aiLevelCfg() === BH.AI_LEVELS.normal, '壞存檔 → 回退「中」');
BH.settings.aiLevel = 'strong';
ok(BH.aiLevelCfg() === BH.AI_LEVELS.strong, '切「強」生效');
// 實際跑 AI：強的應該累積更多炸彈（統計測試，跑 60 秒模擬）
function bombCountRun(level) {
  BH.settings.aiLevel = level;
  BH.startBattle(); G.state = 'play';
  G.players.forEach(function (p, i) { if (i > 0) { p.ai = true; p.cart = false; } });
  G.bombs.length = 0; G.flames.length = 0; G.items.length = 0;
  const p0 = G.players[0]; p0.ai = true; p0.maxBombs = 8;   // 不設上限才看得出放彈率差異
  // 清出開闊場地＋把對手放在旁邊（確保「nearFoe」恆成立，只比放彈率）
  const T2 = G.T;
  const px = Math.floor(G.cols / 2), py = Math.floor(G.rows / 2);
  for (let y = py - 3; y <= py + 3; y++) {
    for (let x = px - 3; x <= px + 3; x++) {
      if (G.grid[y] && x >= 1 && y >= 1 && x < G.cols - 1 && y < G.rows - 1) G.grid[y][x] = 0;
    }
  }
  p0.x = px * T2 + T2 / 2; p0.y = py * T2 + T2 / 2;
  const foe = G.players[1];
  foe.cart = false; foe.alive = true;
  foe.x = (px + 2) * T2 + T2 / 2; foe.y = py * T2 + T2 / 2;
  let placed = 0;
  for (let i = 0; i < 3600; i++) {
    BH.controlAI(p0, 1 / 60);
    if (i % 60 === 59) {            // 模擬炸彈爆掉（清場才不會被舊炸彈的火線卡死）
      placed += G.bombs.length;
      G.bombs.length = 0;
    }
  }
  return placed;
}
// 每次都用亂數模擬 → 單輪樣本太小會抖，跑 3 輪加總再比（降低偶發性）
function bombCountTotal(level, rounds) {
  let t = 0;
  for (let i = 0; i < rounds; i++) t += bombCountRun(level);
  return t;
}
const bw = bombCountTotal('weak', 3), bs = bombCountTotal('strong', 3);
ok(bs > bw, '60 秒模擬 ×3：強 AI 放彈數 > 弱 AI（' + bs + ' > ' + bw + '）');
BH.settings.aiLevel = 'normal';

// ================================================================
console.log('=== 5. 單人怪物多樣化 ===');
ok(html.indexOf("id: 'slime'") >= 0 && html.indexOf("id: 'bat'") >= 0 && html.indexOf("id: 'eye'") >= 0,
  '10 種小怪都有定義（含會飛的四種）');
BH.startSolo(1);
ok(G.enemies.length > 0, '第 1 關有敵人');
ok(G.enemies.every(function (e) { return ['wander', 'chase'].indexOf(e.kind) >= 0; }), '第 1 關只有地面基本款');
BH.settings.soloDiff = 'normal';   // v5.29：預設改成簡單後，這支測試要固定普通才有原本的怪量
BH.buildSoloStage(4);   // v5.36：第 5 關改成 BOSS 決戰場（只有王），改驗第 4 關
const kinds5 = new Set(G.enemies.map(function (e) { return e.kind; }));
ok(kinds5.has('wander') && kinds5.has('chase'), '第 4 關有亂走＋追人怪（' + [...kinds5].join('/') + '）');
BH.buildSoloStage(7);
const kinds7 = new Set(G.enemies.map(function (e) { return e.kind; }));
ok(kinds7.has('fly'), '第 7 關有飛行穿牆怪（' + [...kinds7].join('/') + '）');
const types7 = new Set(G.enemies.map(function (e) { return e.type; }));
ok(types7.size >= 6, '第 7 關多種小怪一起登場（' + [...types7].join('/') + '）');
// 飛行怪穿牆：把它丟在硬牆上也能移動
const fl = BH.makeEnemy(1, 1, 'bat', 7);
ok(fl.kind === 'fly' && typeof fl.vx === 'number' && typeof fl.vy === 'number', '蝙蝠有速度向量（會飛）');
G.enemies = [fl];
fl.x = 3 * T + T / 2; fl.y = 3 * T + T / 2;
G.grid[3][2] = 1;                       // 左邊是硬牆
fl.vx = -40; fl.vy = 0;
const fx0 = fl.x;
for (let i = 0; i < 30; i++) BH.updateFlyer(fl, 1 / 60);
ok(fl.x < fx0, '飛行怪直接穿過硬牆（x ' + fx0.toFixed(1) + ' → ' + fl.x.toFixed(1) + '）');
ok(fl.x >= T * .6 - .01 && fl.x <= (G.cols * T - T * .6) + .01, '飛行怪不會飛出地圖外（邊界反彈）');
// 一般怪不能穿牆（對照組）
G.enemies = [];
BH.startSolo(1);
const walker = G.enemies[0];
G.grid[Math.floor(walker.y / T)][Math.floor(walker.x / T) - 1] = 1;
walker.dirName = 'left'; walker.dirT = 5;
const wx0 = walker.x;
for (let i = 0; i < 60; i++) BH.updateEnemy(walker, 1 / 60);
ok(Math.abs(walker.x - wx0) < T, '地面怪照樣被牆擋住（對照組）');
// 飛行怪怕火
G.enemies = [BH.makeEnemy(3, 3, 'bat', 7)];
G.flames.push({ cx: 3, cy: 3, t: .4, dir: 'up' });
BH.updateFlyer(G.enemies[0], 1 / 60);
ok(G.enemies[0].dead === true, '會飛的小怪被火焰燒死');

// ================================================================
console.log('');
console.log('通過 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
