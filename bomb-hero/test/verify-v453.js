// verify-v453.js — v4.53 專屬驗證（16:28 五點中的 1／3／4／5）
//   ① 重生點：回到本場出生格附近的安全空地（不再死寫 1,1 卡在石頭裡）
//   ② 拳擊：跨一道牆就落地、連牆才繼續彈（詳細在 verify-v452 第 5 段）
//   ③ 推車：階梯式選格（輕點 1／按住 2／按久 3，到頂鎖定）
//   ④ 選角卡片：◀▶🤖 放大到 44px、AI 鍵顯示 👤／🤖 狀態
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

function soloStage(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.startSolo(stage || 1, false);
  G.state = 'play';
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

// ================================================================
head('1. 重生點：safeRespawnCell 存在且找得到乾淨的 3×3');
{
  ok(typeof P.safeRespawnCell === 'function', '有匯出 safeRespawnCell');
  const pl = soloStage(1);
  clearAll();
  G.spawnCell = { x: 7, y: 6 };
  const c = P.safeRespawnCell(pl);
  eq(c.x, 7, '出生格本身是空地就原地重生 x');
  eq(c.y, 6, '出生格本身是空地就原地重生 y');
}
{
  const pl = G.players[0];
  clearAll();
  G.spawnCell = { x: 7, y: 6 };
  // 出生格自己變成石頭（大圖很容易發生）→ 不能重生在石頭裡
  G.grid[6][7] = 1;
  const c = P.safeRespawnCell(pl);
  ok(G.grid[c.y][c.x] === 0, '出生格是石頭時改找空地（' + c.x + ',' + c.y + '）');
  let clean = true;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (G.grid[c.y + dy][c.x + dx] !== 0) clean = false;
  }
  ok(clean, '重生點周圍 3×3 全是空地');
  ok(Math.abs(c.x - 7) + Math.abs(c.y - 6) <= 2, '而且離出生格很近（曼哈頓 ' + (Math.abs(c.x - 7) + Math.abs(c.y - 6)) + '）');
}
{
  const pl = G.players[0];
  clearAll();
  G.spawnCell = { x: 7, y: 6 };
  G.grid[6][7] = 1;
  pl.x = 2.5 * G.T; pl.y = 2.5 * G.T;
  pl.alive = false; pl.dead = true; pl.lives = 3; pl.respawnT = .01;
  const T = G.T;
  P.updateSolo(1 / 60); P.updateSolo(1 / 60);
  const cx = Math.floor(pl.x / T), cy = Math.floor(pl.y / T);
  ok(pl.alive === true && pl.dead === false, '死亡後真的復活了');
  eq(cx, pl.x === 0 ? -1 : cx, '座標可讀（x=' + cx + '）');
  ok(G.grid[cy][cx] === 0, '復活後站的那一格是空地');
  ok(!(cx === 1 && cy === 1), '不再死寫回 (1,1)（實際 ' + cx + ',' + cy + '）');
  ok(pl.invuln > 0, '復活後有短暫無敵（' + pl.invuln.toFixed(2) + '）');
}

// ================================================================
head('2. 拳擊：跨一道牆落地（行為在 verify-v452 第 5 段完整驗）');
{
  const pl = G.players[0];
  clearAll();
  pl.punch = true; pl.alive = true; pl.dizzy = 0; pl.skull = null;
  pl.x = 4.5 * G.T; pl.y = 8.5 * G.T;
  P.placeBomb(pl);
  const b = G.bombs[G.bombs.length - 1];
  pl.x = 3.5 * G.T;
  G.grid[8][5] = 1;
  P.punchBomb(pl, 'right');
  eq(b.cx, 6, '一道牆後面就是落點');
  const path = b.flying ? b.flying.path : [];
  eq(path.filter(function (q) { return q.w; }).length, 1, '路徑只標一格牆');
}

// ================================================================
head('3. 推車：階梯式選格（1／2／3 格，到頂鎖定）');
{
  eq(P.CART_CHARGE_MAX, .7, '集氣上限＝0.70 秒（原本 0.6 連續）');
  const f = P.cartChargeLevel;
  ok(typeof f === 'function', '有匯出 cartChargeLevel');
  eq(P.CART_STEP1, .35, '第 2 格門檻 0.35 秒');
  eq(P.CART_STEP2, .70, '第 3 格門檻 0.70 秒');
  eq(f(0), 0, '沒按＝第 1 格');
  eq(f(.10), 0, '輕點（0.10 秒）還是第 1 格');
  eq(f(.34), 0, '0.34 秒仍是第 1 格');
  eq(f(.36), 1, '0.36 秒跳到第 2 格');
  eq(f(.60), 1, '0.60 秒還是第 2 格（窗口 0.35 秒，比舊版寬一倍）');
  eq(f(.70), 2, '0.70 秒到第 3 格');
  eq(f(9), 2, '按再久也鎖在第 3 格（不會亂跳）');
  eq(P.CART_LV[0].reach, 1, '第 1 階射程 1 格');
  eq(P.CART_LV[1].reach, 2, '第 2 階射程 2 格');
  eq(P.CART_LV[2].reach, 3, '第 3 階射程 3 格');
}

// ================================================================
head('4. 選角卡片：觸控目標變大、AI 鍵有狀態');
{
  ok(/#scr-battle #pSlots \.crow button\{width:44px;height:44px/.test(css), '◀▶ 按鈕 44×44（原本 20×17）');
  ok(/minmax\(164px,1fr\)/.test(css), '卡片最小寬度 164px（原本 104~132）');
  ok(/canvas\.pav\{width:54px/.test(css), '頭像 54px（原本 34）');
  ok(/@media \(max-width:520px\)\{[\s\S]{0,400}repeat\(2,minmax\(0,1fr\)\)/.test(css), '手機兩欄');
  ok(/\.aibtn\.on\{/.test(css), 'AI 開啟時有高亮樣式');
  ok(/'<button data-ai="' \+ i \+ '" class="aibtn' \+ \(ai \? ' on' : ''\)/.test(html), 'AI 鍵會依狀態加 class');
  ok(/\(ai \? '🤖' : '👤'\)/.test(html), 'AI 鍵顯示 🤖／👤');
  ok(/'bt\.charge': '[^']*輕點＝第 1 格/.test(html), '集氣提示改成階梯式說明');
}

console.log('\n通過 ' + pass + ' / ' + (pass + fail) + '　失敗 ' + fail);
process.exit(fail ? 1 : 0);
