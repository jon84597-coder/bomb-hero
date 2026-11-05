// v5.4 驗證：
//   ① 電腦玩家也會用衝刺（躲火線／趕路）
//   ② 飛行怪只能在「外牆以內」活動，不會再飛到場外讓玩家乾等
// 跑法：node test/verify-v504.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const env = makeEnv();
const B = env.BH, G = env.G;

function newMap(cols, rows, seed, targetFloor) {
  B.buildOrganicMap(cols, rows, B.THEMES[3], { shape: 'island' }, B.rngFrom(seed),
    { seed: seed, targetFloor: targetFloor || 0 });
  B.markWallKinds();
}
// 找一格空地（可站立）＋指定方向的連續兩格空地
function findOpenLine() {
  const D = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (let y = 1; y < G.rows - 2; y++) for (let x = 1; x < G.cols - 2; x++) {
    if (B.cellAt(x, y) !== 0) continue;
    for (let i = 0; i < D.length; i++) {
      const d = D[i];
      if (B.cellAt(x + d[0], y + d[1]) === 0 && B.cellAt(x + d[0] * 2, y + d[1] * 2) === 0) {
        return { x: x, y: y, dx: d[0], dy: d[1] };
      }
    }
  }
  // v5.5：經典圖是「隨機鋪軟磚」，實測約 1/3 的機率整張找不到三格連續空地，
  //   測試就間歇性變紅（跟程式碼無關）。這裡改成：找不到就自己清一條三格走廊，
  //   要驗的是「有連續空地時 AI 會不會衝」，不是「地圖剛好長怎樣」。
  for (let y = 1; y < G.rows - 1; y++) {
    for (let x = 3; x < G.cols - 1; x++) {
      if (B.cellAt(x, y) === 0 && B.cellAt(x - 1, y) === 0) {
        G.grid[y][x - 2] = 0;
        B.markWallKinds();
        return { x: x - 2, y: y, dx: 1, dy: 0 };
      }
    }
  }
  return null;
}
function mkAI(cx, cy) {
  const T = G.T;
  const p = B.makePlayer(0, 0, null, { x: cx, y: cy, px: (cx + .5) * T, py: (cy + .5) * T });
  p.ai = true; p.alive = true; p.hp = 3; p.dashCd = 0; p.dashT = 0;
  G.players = [p];
  return p;
}

// ---------------------------------------------------------------
head('① 飛行怪的可飛範圍（外牆以內）');
ok(typeof B.flyZoneReady === 'function' && typeof B.flyOk === 'function' && typeof B.flyerMove === 'function',
  'flyZoneReady / flyOk / flyerMove 都存在');

try {
  B.buildMap(15, 13, B.THEMES[0], {});
  B.markWallKinds();
  ok(B.flyOk(0, 0) === false && B.flyOk(0, 6) === false, '外框四邊不是可飛格');
  let floorOk = 0, floorN = 0;
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) {
    if (B.cellAt(x, y) !== 0) continue;
    floorN++;
    if (B.flyOk(x, y)) floorOk++;
  }
  ok(floorN > 20 && floorOk === floorN, '場內每一格空地都可飛（' + floorOk + '/' + floorN + '）');
} catch (e) {
  ok(false, '經典地圖可飛範圍計算失敗', e && e.message);
}

try {
  newMap(31, 27, 4242, 420);
  // 找出「離空地超過 2 格」的岩體 → 一定不可飛
  let deep = null;
  for (let y = 3; y < G.rows - 3 && !deep; y++) for (let x = 3; x < G.cols - 3; x++) {
    if (G.grid[y][x] !== 1) continue;
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= G.cols || ny >= G.rows) continue;
      if (G.grid[ny][nx] !== 1) { near = true; break; }
    }
    if (!near) { deep = { x: x, y: y }; break; }
  }
  ok(!!deep, '隨機大圖裡找得到「離空地超過 2 格」的岩體深處', deep);
  if (deep) ok(B.flyOk(deep.x, deep.y) === false, '岩體深處不可飛（' + deep.x + ',' + deep.y + '）');

  // 外牆帶（wallKind 1）一律不可飛
  let outerBad = 0, outerN = 0;
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    if (G.wallKind[y][x] !== 1) continue;
    outerN++;
    if (!B.flyOk(x, y)) outerBad++;
  }
  ok(outerN > 100 && outerBad === outerN, '外牆帶（wallKind 1）全部不可飛（' + outerBad + '/' + outerN + '）');
} catch (e) {
  ok(false, '隨機大圖可飛範圍計算失敗', e && e.message);
}

head('② 行為：飛一整分鐘都不會離開可飛範圍');
try {
  newMap(31, 27, 4242, 420);
  const T = G.T;
  let spawn = null;
  for (let y = 1; y < G.rows - 1 && !spawn; y++) for (let x = 1; x < G.cols - 1; x++) {
    if (B.cellAt(x, y) === 0 && B.flyOk(x, y)) { spawn = { x: x, y: y }; break; }
  }
  const e = B.makeEnemy(spawn.x, spawn.y, 'bat', 1, 1);
  e.spdBoost = 1;
  G.enemies = [e]; G.flames = []; G.players = [];
  let outside = 0, farOut = 0;
  for (let i = 0; i < 7200; i++) {                 // 60 秒 × 60fps
    B.updateFlyer(e, 1 / 60);
    const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);
    if (!B.flyOk(cx, cy)) outside++;
    if (cx <= 0 || cy <= 0 || cx >= G.cols - 1 || cy >= G.rows - 1) farOut++;
  }
  ok(outside === 0, '60 秒模擬：0 幀飛出可飛範圍（實際 ' + outside + '）');
  ok(farOut === 0, '60 秒模擬：0 幀貼到地圖最外圈（實際 ' + farOut + '）');
} catch (e) {
  ok(false, '飛行模擬失敗', e && e.message);
}

head('③ 已經在界外的飛行怪會自己飛回來');
try {
  const T = G.T;
  const e = B.makeEnemy(6, 8, 'bat', 1, 1);
  e.spdBoost = 1; G.flames = []; G.players = [];
  let drop = null;
  for (let y = 6; y < G.rows - 2 && !drop; y++) for (let x = 6; x < G.cols - 2; x++) {
    if (!B.flyOk(x, y)) { drop = { x: x, y: y }; break; }
  }
  ok(!!drop, '找得到一格界外格', drop);
  if (drop) {
    e.x = (drop.x + .5) * T; e.y = (drop.y + .5) * T;
    let frames = -1;
    for (let i = 0; i < 600; i++) {
      B.updateFlyer(e, 1 / 60);
      if (B.flyOk(Math.floor(e.x / T), Math.floor(e.y / T))) { frames = i; break; }
    }
    ok(frames >= 0 && frames < 300, '界外的怪 5 秒內飛回可飛範圍（' + (frames < 0 ? '沒回來' : (frames / 60).toFixed(1) + ' 秒') + '）');
  }
} catch (e) {
  ok(false, '界外回歸測試失敗', e && e.message);
}

head('④ 程式面：飛行怪的移動只剩一個入口');
const flyerBody = (SRC.match(/function updateFlyer\(e, dt\)[\s\S]*?\n\}\n/) || [''])[0];
ok(flyerBody.length > 500, 'updateFlyer 本體有抓到（' + flyerBody.length + ' 字元）');
ok((flyerBody.match(/flyerMove\(e, dt, /g) || []).length >= 2, '一般飛行與俯衝都走 flyerMove（' + (flyerBody.match(/flyerMove\(e, dt, /g) || []).length + ' 處）');
ok(flyerBody.indexOf('e.x += e.vx * dt * 1.9') < 0, '俯衝不再自己加座標（舊版會衝出外牆）');
ok(/function flyZoneReady\(\)[\s\S]*?wallKind/.test(SRC), '可飛範圍有吃牆分類');
ok(/FLY_MARGIN/.test(SRC), '有「離空地幾格」的邊界參數');
ok(SRC.indexOf('Game.flyZ = null;') > 0, '換地圖會丟掉可飛範圍快取（resetMapCellState）');

// ---------------------------------------------------------------
head('⑤ 電腦玩家會用衝刺');
ok(typeof B.aiTryDash === 'function' && typeof B.aiDashOk === 'function', 'aiTryDash / aiDashOk 存在');
['weak', 'normal', 'strong'].forEach(function (k) {
  ok(B.AI_LEVELS[k] && typeof B.AI_LEVELS[k].dash === 'number' && B.AI_LEVELS[k].dash > 0, k + ' 有 dash 機率');
});
const aiBody = (SRC.match(/function controlAI\(p, dt\)[\s\S]*?\n\/\/ v4\.63/) || [''])[0];
ok(aiBody.indexOf('dashStep(p, dt)') > 0, 'controlAI 會跑 dashStep');
ok(aiBody.indexOf('aiTryDash(p, lv, cx, cy)') > 0, 'controlAI 會嘗試衝刺');
ok(/dash: lv\.dash \|\| \.\d+/.test(SRC), '大逃殺 AI 設定也帶 dash');

head('⑥ 行為：命危一定衝、有牆不衝、搬著炸彈不衝');
try {
  B.buildMap(15, 13, B.THEMES[0], {});
  B.markWallKinds();
  const spot = findOpenLine();
  ok(!!spot, '找得到三格連續空地', spot);
  if (spot) {
    const p = mkAI(spot.x, spot.y);
    B.placeBomb(p, false, 1);
    const dashed = B.aiTryDash(p, B.AI_LEVELS.normal, spot.x, spot.y);
    ok(dashed === true, '腳下有炸彈 → 立刻衝出去');
    ok(p.dashCd > 0, '衝完進冷卻（dashCd=' + (p.dashCd || 0).toFixed(2) + '）');
    ok(B.aiTryDash(p, B.AI_LEVELS.normal, spot.x, spot.y) === false, '冷卻中不會再衝一次');
  }
} catch (e) {
  ok(false, 'AI 閃避衝刺測試失敗', e && e.message);
}

try {
  B.buildMap(15, 13, B.THEMES[0], {});
  B.markWallKinds();
  // 找一個三面是牆的角落（往哪邊都撞牆）
  let corner = null;
  for (let y = 1; y < G.rows - 1 && !corner; y++) for (let x = 1; x < G.cols - 1; x++) {
    if (B.cellAt(x, y) !== 0) continue;
    const opens = ['up', 'down', 'left', 'right'].filter(function (dn) {
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dn];
      return B.cellAt(x + d[0], y + d[1]) === 0 && B.cellAt(x + d[0] * 2, y + d[1] * 2) === 0;
    });
    if (!opens.length) { corner = { x: x, y: y }; break; }
  }
  if (corner) {
    const p = mkAI(corner.x, corner.y);
    p.aiDir = 'up';
    const r = ['up', 'down', 'left', 'right'].some(function (dn) { return B.aiDashOk(p, corner.x, corner.y, dn); });
    ok(r === false, '四面都撞牆（或只有一格走道）→ 不衝');
  } else {
    ok(true, '這張圖沒有三面封死的角落，跳過（不影響其他斷言）');
  }
} catch (e) {
  ok(false, 'AI 撞牆判斷測試失敗', e && e.message);
}

try {
  B.buildMap(15, 13, B.THEMES[0], {});
  const spot = findOpenLine();
  const p = mkAI(spot.x, spot.y);
  B.placeBomb(p, false, 1);
  const held = G.bombs[0];
  p.carry = held && held.cx === spot.x && held.cy === spot.y ? held : { cx: spot.x, cy: spot.y };
  ok(B.aiTryDash(p, B.AI_LEVELS.normal, spot.x, spot.y) === false, '手上搬著炸彈 → 不衝（避免丟在半路）');
} catch (e) {
  ok(false, '搬彈不衝測試失敗', e && e.message);
}

head('⑦ 行為：controlAI 真的會把衝刺跑完');
try {
  B.buildMap(15, 13, B.THEMES[0], {});
  const spot = findOpenLine();
  const p = mkAI(spot.x, spot.y);
  B.placeBomb(p, false, 1);
  const T = G.T, x0 = p.x, y0 = p.y;
  let sawDash = 0;
  for (let i = 0; i < 40; i++) { B.controlAI(p, 1 / 60); if (p.dashT > 0) sawDash++; }
  const moved = Math.hypot(p.x - x0, p.y - y0) / T;
  ok(sawDash > 0, 'controlAI 有進入衝刺狀態（' + sawDash + ' 幀）');
  ok(moved > 1.0, 'AI 真的被沖刺帶開（' + moved.toFixed(2) + ' 格）');
  ok(!isNaN(p.x) && !isNaN(p.y), '座標沒有變成 NaN');
} catch (e) {
  ok(false, 'controlAI 衝刺測試失敗', e && e.message);
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.4：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
