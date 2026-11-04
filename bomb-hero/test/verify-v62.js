// test/verify-v62.js —— v4.17
//   ① 商店開放：三種隨從各 5000 金幣（v4.52 調漲）（金幣、購買、已擁有、餘額不足）
//   ② 隨從：跟隨 / 怪物 2 格才動手 / 三種行為 / 單人一擊倒（格檔三下）/ RPG 有 HP
//   ③ 隨從倒地 → 哭臉＋Help → 主角靠近 5 秒救回
//   ④ 隨從只出現在單人／RPG，對戰不會有
//   ⑤ 小怪變多、RPG 血量回升、AI 更聰明
//   ⑥ 對戰 AI 會丟炸彈（隔牆拋）
//   ⑦ 推車：手上拿著一模一樣的炸彈＋超明顯集氣條與落點
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
try { env.BH.setDevBuild(false); } catch (e) {}   // v4.75：主檔預設開發者，這裡要模擬一般玩家
const P = env.BH, G = P.Game, S = P.settings, html = env.html, els = env.els;
const fs = require('fs');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
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
  T = G.T;                       // 格子大小依裝置而變，量到再用
  return G.players[0];
}
function petOf(kind) {
  for (let i = 0; i < G.pets.length; i++) if (G.pets[i].kind === kind) return G.pets[i];
  return null;
}
function clearEnemies() { G.enemies.length = 0; }
function addFoe(x, y, type) {
  const e = P.makeEnemy(x, y, type || 'slime', 1, 1);
  G.enemies.push(e);
  return e;
}

// ================================================================
head('1. 商店：三種隨從各 5000');
ok(Array.isArray(P.PET_KINDS) && P.PET_KINDS.length === 3, '三種隨從（實測 ' + P.PET_KINDS.length + '）');
ok(P.PET_KINDS.every(function (k) { return k.price === 5000; }), '每一隻都是 5000 金幣（v4.52 調漲）');
ok(P.PET_KINDS.map(function (k) { return k.key; }).join(',') === 'blade,bomber,guard',
  '順序：刀客 / 投彈 / 格檔（' + P.PET_KINDS.map(function (k) { return k.key; }).join(',') + '）');
ok(css.indexOf('id="scr-shop"') > 0, '有商店畫面 #scr-shop');
ok(css.indexOf('id="shopGrid"') > 0 && css.indexOf('id="shopWallet"') > 0, '有隨從卡片容器與金幣顯示');
ok(css.indexOf('商店正在準備中') < 0 && /Shop\.open\(\)/.test(css), '首頁商店鈕改成開啟商店');
ok(css.indexOf('\.shopcard') > 0, '有商店卡片樣式');

head('2. 金幣與購買流程');
P.Shop.reset();
ok(P.Shop.gold() === 0, '重置後金幣 0');
{
  const r0 = P.Shop.buy('blade');
  ok(r0.ok === false && r0.err === 'GOLD', '沒錢不能買（' + r0.err + '）');
  P.Shop.addGold(12000);
  ok(P.Shop.gold() === 12000, '加金幣 → 12000');
  const r1 = P.Shop.buy('blade');
  ok(r1.ok === true, '買刀客成功');
  ok(P.Shop.gold() === 7000, '扣 5000 → 7000（' + P.Shop.gold() + '）');
  const r2 = P.Shop.buy('blade');
  ok(r2.ok === false && r2.err === 'OWNED', '同一種不能買第二次（' + r2.err + '）');
  const r3 = P.Shop.buy('bomber');
  ok(r3.ok === true && P.Shop.gold() === 2000, '買投彈 → 剩 2000');
  const r4 = P.Shop.buy('guard');
  ok(r4.ok === false && r4.err === 'GOLD' && r4.need === 3000, '錢不夠時告訴你還差多少（' + r4.need + '）');
  ok(P.Shop.active().length === 2, '目前擁有 2 隻隨從');
  ok(P.Shop.active().every(function (o) { return typeof o.ch === 'number' && o.ch >= 0 && o.ch < 8; }),
    '每隻都有隨機動物外觀（0~7）');
  P.Shop.addGold(3000);
  ok(P.Shop.buy('guard').ok === true && P.Shop.active().length === 3, '補錢之後買滿三隻');
}

// ================================================================
head('3. 隨從出場：單人 / RPG 有，對戰沒有');
{
  soloStage(1);
  ok(G.pets.length === 3, '單人第 1 關帶進 3 隻隨從（' + G.pets.length + '）');
  ok(G.pets.every(function (pt) { return Math.hypot(pt.x - G.players[0].x, pt.y - G.players[0].y) < T * 2.5; }),
    '一開場就在主角旁邊');
  ok(G.pets.filter(function (pt) { return pt.kind === 'blade'; }).length === 1 &&
     G.pets.filter(function (pt) { return pt.kind === 'bomber'; }).length === 1 &&
     G.pets.filter(function (pt) { return pt.kind === 'guard'; }).length === 1,
    '三種各一隻');
  ok(petOf('blade').maxHp === 1 && petOf('bomber').maxHp === 1, '單人：刀客／投彈 1 下就倒');
  ok(petOf('guard').maxHp === 3, '單人：格檔可以擋三下');
  P.startBattle();
  ok(G.pets.length === 0, '對戰模式沒有隨從');
  P.startRpg(1);
  ok(G.pets.length === 3, 'RPG 模式也帶進 3 隻');
  ok(G.pets.every(function (pt) { return pt.maxHp > 1; }), 'RPG：隨從有 HP（' +
    G.pets.map(function (pt) { return pt.maxHp; }).join('/') + '）');
  ok(petOf('guard').maxHp > petOf('blade').maxHp, 'RPG：格檔比刀客更耐打');
}

// ================================================================
head('4. 刀客：怪物 2 格才動手、1 格揮刀、冷卻 2 秒');
{
  const p = soloStage(1);
  const pet = petOf('blade');
  clearEnemies();
  G.pets = [pet];
  // 沒有怪 → 不會攻擊，只會跟
  p.x = 3 * T + T / 2; p.y = 3 * T + T / 2;
  // 找一格「主角附近、而且真的能站」的空地（地圖是隨機的，不能寫死座標）
  let px2 = 3, py2 = 3;
  for (let dy = 0; dy <= 3 && py2 === 3; dy++) {
    for (let dx = 2; dx <= 4; dx++) {
      if (P.cellAt(3 + dx, 3 + dy) === 0) { px2 = 3 + dx; py2 = 3 + dy; break; }
    }
  }
  pet.x = px2 * T + T / 2; pet.y = py2 * T + T / 2;
  const x0 = pet.x, y0 = pet.y;
  for (let i = 0; i < 30; i++) P.updatePets(1 / 60);
  ok(Math.hypot(pet.x - x0, pet.y - y0) > 1, '沒有怪 → 往主角靠過去（跟隨）');
  ok(pet.atkCd <= .7, '沒有怪時不會攻擊');
  // 怪物在 3 格外 → 還不動手
  clearEnemies();
  let e = addFoe(Math.floor(pet.x / T) + 3, Math.floor(pet.y / T));
  pet.atkCd = 0;
  for (let i = 0; i < 10; i++) P.updatePets(1 / 60);
  ok(!e.dead && pet.atkCd === 0, '3 格外的怪不會動手（感應範圍 2 格）');
  // 怪物貼到 1 格 → 揮刀（可能要先走半步，最多等 1 秒）
  clearEnemies();
  e = addFoe(Math.floor(pet.x / T) + 1, Math.floor(pet.y / T));
  pet.atkCd = 0;
  for (let i = 0; i < 60 && !e.dead; i++) P.updatePets(1 / 60);
  ok(e.dead === true, '單人：一刀就把小怪砍死');
  ok(pet.slashT > 0, '有揮刀特效（slashT）');
  ok(Math.abs(pet.atkCd - 2) < .08, '攻擊後冷卻 2 秒（' + pet.atkCd.toFixed(2) + '）');
  // 冷卻中再一隻 → 不會馬上打
  clearEnemies();
  const e2 = addFoe(Math.floor(pet.x / T) + 1, Math.floor(pet.y / T));
  for (let i = 0; i < 30; i++) P.updatePets(1 / 60);
  ok(!e2.dead, '冷卻中不會連續揮刀');
  // 冷卻結束後可以再打
  pet.atkCd = 0;
  for (let i = 0; i < 60 && !e2.dead; i++) P.updatePets(1 / 60);
  ok(e2.dead === true, '冷卻結束後再砍一隻');
}

// ================================================================
head('5. 投彈隨從：冷卻 3 秒、一次一顆、不炸主人');
{
  const p = soloStage(1);
  const pet = petOf('bomber');
  clearEnemies();
  G.pets = [pet];
  G.bombs.length = 0;
  // v4.51：這幾格必須是空地，否則落點會被牆擋住（地圖一改這條就紅）
  [5, 6, 7].forEach(function (x) { G.grid[5][x] = 0; });
  pet.x = 5 * T + T / 2; pet.y = 5 * T + T / 2;
  p.x = 3 * T + T / 2; p.y = 3 * T + T / 2;
  const foe = addFoe(7, 5);
  pet.atkCd = 0;
  P.updatePets(1 / 60);
  const mine = G.bombs.filter(function (b) { return b.petOwner === pet; });
  ok(mine.length === 1, '朝怪物丟出一顆炸彈（' + mine.length + '）');
  ok(mine[0] && mine[0].flying && mine[0].cx === 7 && mine[0].cy === 5, '炸彈飛向怪物那一格');
  ok(Math.abs(pet.atkCd - 3) < .05, '投彈後冷卻 3 秒（' + pet.atkCd.toFixed(2) + '）');
  P.updatePets(1 / 60);
  ok(G.bombs.filter(function (b) { return b.petOwner === pet; }).length === 1, '一次只丟一顆');
  // 主人站在火焰裡也不會被隨從的炸彈燒到
  G.bombs.length = 0;
  G.flames.length = 0;
  const fake = { cx: Math.floor(p.x / T), cy: Math.floor(p.y / T), type: 'center', dir: 1, t: .4, owner: pet, src: null };
  G.flames.push(fake);
  const lives = p.lives;
  P.updateSolo(1 / 60);
  ok(p.lives === lives && p.alive, '隨從的火焰不會燒到主人');
  // 怪物自己踩到就會死
  const foe2 = addFoe(9, 9);
  G.flames.length = 0;
  G.flames.push({ cx: 9, cy: 9, type: 'center', dir: 1, t: .4, owner: pet, src: null });
  P.updateEnemy(foe2, 1 / 60);
  ok(foe2.dead === true, '隨從的火焰照樣燒得死怪物');
}

// ================================================================
head('6. 格檔隨從：擋一次休息 3 秒、不攻擊');
{
  soloStage(1);
  const pet = petOf('guard');
  clearEnemies();
  G.pets = [pet];
  const p = G.players[0];
  pet.x = 6 * T + T / 2; pet.y = 6 * T + T / 2;
  p.x = 8 * T + T / 2; p.y = 6 * T + T / 2;
  pet.restT = 0; pet.hitT = 0; pet.atkCd = 0;
  const e = addFoe(6, 6);
  e.hp = 3;
  P.updatePets(1 / 60);
  ok(e.dizzy > 0, '擋住怪物 → 怪物被震暈');
  ok(!e.dead && e.hp === 3, '格檔不攻擊（怪物沒受傷）');
  ok(pet.restT > 2.9, '擋完原地休息 3 秒（' + pet.restT.toFixed(2) + '）');
  ok(pet.hp === 2, '單人：格檔擋一次掉 1 點（剩 ' + pet.hp + ' / 3）');
  // 休息中不會再擋
  pet.hitT = 0;
  const hp0 = pet.hp;
  P.updatePets(1 / 60);
  ok(pet.hp === hp0, '休息中不會連續硬碰');
}

// ================================================================
head('7. 倒地 → 頭上 Help → 主角靠近 5 秒救回');
{
  const p = soloStage(1);
  const pet = petOf('blade');
  clearEnemies();
  G.pets = [pet];
  pet.hp = 1; pet.hitT = 0;
  P.petHurt(pet, 1);
  ok(pet.down === true && pet.hp === 0, '被打倒 → 進入倒地狀態（哭臉）');
  ok(css.indexOf("'Help'") > 0, '頭上的 Help 泡泡有畫出來（drawPet）');
  ok(css.indexOf('expr: \'cry\'') > 0, '倒地時表情是哭臉');
  ok(css.indexOf('PET_HELP_SEC') > 0 && P.PET_HELP_SEC === 5, '救援需要 5 秒');
  // 主角太遠 → 不會被救起
  p.x = pet.x + T * 4; p.y = pet.y;
  for (let i = 0; i < 200; i++) P.updatePets(1 / 60);
  ok(pet.down === true && pet.rescueT === 0, '主角太遠不會被救（rescueT=' + pet.rescueT.toFixed(2) + '）');
  // 靠近 3 秒 → 還沒好
  p.x = pet.x; p.y = pet.y;
  for (let i = 0; i < 180; i++) P.updatePets(1 / 60);
  ok(pet.down === true, '靠近 3 秒還不夠（' + pet.rescueT.toFixed(1) + ' / 5）');
  // 再 2.2 秒 → 救回
  for (let i = 0; i < 140; i++) P.updatePets(1 / 60);
  ok(pet.down === false, '靠近滿 5 秒 → 救回來');
  ok(pet.hp > 0, '救回來有血（' + pet.hp + '）');
}

// ================================================================
head('8. 隨從幫忙撿道具');
{
  const p = soloStage(1);
  const pet = petOf('blade');
  clearEnemies();
  G.pets = [pet];
  G.items.length = 0;
  pet.x = 5 * T + T / 2; pet.y = 5 * T + T / 2;
  p.x = 3 * T + T / 2; p.y = 3 * T + T / 2;
  const pw0 = p.power;
  G.items.push({ cx: 5, cy: 5, type: 'fire', bob: 0 });
  for (let i = 0; i < 10; i++) P.updatePets(1 / 60);
  ok(G.items.length === 0, '道具被撿走了');
  ok(p.power === pw0 + 1, '撿到的道具直接算主角的（火力 ' + pw0 + ' → ' + p.power + '）');
  // 骷髏頭：v4.52 起隨從踩上去會「踩碎」，不會交給主角
  const scx = Math.floor(pet.x / T), scy = Math.floor(pet.y / T);
  G.items.push({ cx: scx, cy: scy, type: 'skull', bob: 0 });
  for (let i = 0; i < 3; i++) P.updatePets(1 / 60);
  ok(G.items.length === 0, '隨從踩到骷髏頭直接踩碎（不會交給主角）');
}

// ================================================================
head('9. 小怪變多、血量回升、AI 更聰明');
{
  soloStage(1);
  ok(G.enemies.length >= 2 && G.enemies.length <= P.FOE_MAX_LIVE,
    '單人第 1 關 2～' + P.FOE_MAX_LIVE + ' 隻（實測 ' + G.enemies.length + '）');
  ok(/const base0 = Math\.round\(4 \+ stage \* \.25\);/.test(css),
    'v4.36：小怪量改成隨關卡平滑成長（4 + stage × .25）');
  ok(/Math\.min\(FOE_MAX_LIVE, Math\.round\(base \* diff\.enemy/.test(css),
    '每場都夾在 FOE_MAX_LIVE（12 隻）以內');
  ok(/Math\.round\(Math\.round\(4 \+ stage \* \.25\)/.test(css),
    'v4.69：RPG 小怪量改成跟單人同一條曲線（4 + stage×.25；隨機地圖模式用 T 圖的怪量）');
  ok(P.FOE_HP.slime === 3 && P.FOE_HP.beetle === 4 && P.FOE_HP.lizard === 5, 'RPG 血量回升（3／4／5）');
  ok(P.FOE_HP.bat === 3 && P.FOE_HP.eye === 4, '飛行怪血量也回升');
  const liz = P.ENEMY_SPECIES.filter(function (s) { return s.id === 'lizard'; })[0];
  const pe = P.makeEnemy(3, 3, 'lizard', 1, 1);
  ok(pe.smart === true, '疾風蜥也會躲炸彈了（smart）');
  ok(!!liz, '疾風蜥還在怪物表裡');
  ok(/cand\.sort\(function \(a, b\) \{ return a\.d - b\.d; \}\);/.test(css), '追人的怪改成挑最近的一格走');
  ok(/if \(dangerAt\(nx, ny, null\)\) return;/.test(css), '追人的怪不會踩進火線');
  ok(/\(isAngryFoe\(e\) \? \.78 : \.48\)/.test(css), 'v4.19：飛行怪追人機率掛在 2 格仇恨上（.48／.78）');
}

// ================================================================
head('10. 對戰 AI 隔牆丟炸彈（v4.18：要手套、不砸人）');
{
  ok(typeof P.aiLobBomb === 'function', '__BH 有匯出 aiLobBomb');
  ok(/aiLobBomb\(p, lv\)/.test(css), 'controlAI 會呼叫 aiLobBomb');
  ok(/if \(!p\.glove\) return false;/.test(css), '★ 沒撿到搬彈手套就不能丟');
  ok(/function aiGrabOwnBomb/.test(css), '會把腳下的炸彈舉起來（aiGrabOwnBomb）');
  ok(/function aiThrowLanding/.test(css), '落點交給 aiThrowLanding 算（不鎖定人）');
  ok(/if \(playerAtCell\(land\.x, land\.y\)\) return null;/.test(css), '★ 落點上有玩家就不丟（絕不直接命中）');
  ok(/throwCarried\(p, \{ land: land \}\)/.test(css), '真的走玩家的投擲流程（throwCarried）');
  ok(!/lobbed: true/.test(css), 'v4.17 的「直接飛到對手格」已移除');
  const lv = P.AI_LEVELS;
  ok(lv.weak.lob > 0 && lv.normal.lob > lv.weak.lob && lv.strong.lob > lv.normal.lob,
    '難度越高越愛丟（' + [lv.weak.lob, lv.normal.lob, lv.strong.lob].join('/') + '）');

  // 實測：造一條「A → 牆 → 空地 → 空地 → B」的走廊
  P.startBattle();
  G.state = 'play';
  T = G.T;
  const a = G.players[0], b = G.players[1];
  G.players.forEach(function (q) { if (q !== a && q !== b) q.alive = false; });
  let spot = null;
  for (let y = 2; y < G.rows - 2 && !spot; y++) {
    for (let x = 2; x < G.cols - 5 && !spot; x++) {
      if (G.grid[y][x] !== 0 || G.grid[y][x + 1] === 0) continue;   // 腳下空地、正前方不是空地（牆或軟磚）
      if (G.grid[y][x + 2] !== 0 || G.grid[y][x + 3] !== 0) continue; // 牆後有連續兩格空地
      spot = { ax: x, ay: y, bx: x + 3, by: y, wx: x + 1 };
    }
  }
  if (!spot) {
    // 隨機地圖不一定有這種排列 → 自己造一條「空地／牆／空地／空地」
    const yy = Math.floor(G.rows / 2), xx = 3;
    G.grid[yy][xx] = 0; G.grid[yy][xx + 1] = 1; G.grid[yy][xx + 2] = 0; G.grid[yy][xx + 3] = 0;
    G.grid[yy + 1][xx] = 1; G.grid[yy + 1][xx + 2] = 1; G.grid[yy + 1][xx + 3] = 1;
    G.grid[yy - 1][xx] = 1; G.grid[yy - 1][xx + 2] = 1; G.grid[yy - 1][xx + 3] = 1;
    spot = { ax: xx, ay: yy, bx: xx + 3, by: yy, wx: xx + 1 };
  }
  ok(!!spot, '找到「前面是牆」的測試地形');
  if (spot) {
    G.bombs.length = 0; G.items.length = 0;
    a.x = spot.ax * T + T / 2; a.y = spot.ay * T + T / 2; a.alive = true;
    a.facing = 'right'; a.aiDir = 'right'; a.lobCd = 0; a.glove = false; a.carry = null;
    b.x = spot.bx * T + T / 2; b.y = spot.by * T + T / 2; b.alive = true;

    ok(P.aiLobBomb(a, P.AI_LEVELS.normal) === false, '沒有手套 → 一顆都不丟');

    a.glove = true;
    ok(P.aiLobBomb(a, P.AI_LEVELS.normal) === false, '有手套但腳下沒炸彈 → 也不丟');

    P.placeBomb(a);
    ok(G.bombs.length === 1, 'AI 先在腳下放了一顆炸彈');
    const r = P.aiLobBomb(a, P.AI_LEVELS.normal);
    ok(r === true, '有手套＋有炸彈 → 舉起來丟出去');
    const bomb = G.bombs[0];
    ok(bomb && bomb.owner === a, '炸彈主人是 AI');
    ok(bomb.cx > spot.wx, '★ 飛過牆了（落點 x=' + bomb.cx + '，牆在 x=' + spot.wx + '）');
    ok(P.playerAtCell(bomb.cx, bomb.cy) === false, '★ 落點沒有任何玩家（不會直接砸人）');
    ok(!(bomb.cx === spot.bx && bomb.cy === spot.by), '★ 落點不是對手那一格');
    ok(a.carry === null, '丟完手上是空的');
    ok(a.lobCd > 0, '丟完進入冷卻（' + a.lobCd.toFixed(1) + 's）');

    // 對照組：把對手移到「牆後第一格」→ 那個落點會砸到人 → 這個方向不能丟
    a.lobCd = 0;
    b.x = (spot.wx + 1) * T + T / 2; b.y = spot.by * T + T / 2;
    ok(P.aiThrowLanding(a, 'right') === null, '★ 落點上有人 → 這個方向直接放棄');
  }
}

// ================================================================
head('11. 推車：手上拿一顆炸彈＋超明顯的集氣條與落點');
ok(/function drawCart\(p, T\)/.test(css), '有 drawCart');
{
  const start = css.indexOf('function drawCart(p, T)');
  const end = css.indexOf('// 回傳 { topY', start);
  const body = css.slice(start, end > start ? end : start + 9000);
  ok(/drawBombArt\(holdR, 2\.4, hotHold, true, false/.test(body), '車上的人手上拿著炸彈（沿用地上那顆的畫法）');
  ok(/const holdR = T \* \.23/.test(body), '手上炸彈大小固定');
  ok(/集氣 ' \+ Math\.round\(q \* 100\)/.test(body), '集氣條顯示百分比');
  ok(/ctx\.setLineDash\(\[T \* \.26, T \* \.14\]\)/.test(body), '落點用跑動的粗虛線框');
  ok(/lineDashOffset = -Game\.gameT \* T \* 1\.1/.test(body), '虛線會跑（很明顯）');
  // v4.38：瞄準線改成「沿實際飛行路徑」的折線（會跨過被跳過的牆格）
  ok(/const fp = land\.path \|\| \[\]/.test(body), '瞄準線沿飛行路徑畫（不是直線兩點）');
  ok(/for \(let k = 1; k < fp\.length; k\+\+\) ctx\.lineTo\(fp\[k\]\.x \* T \+ T \/ 2/.test(body),
    '有一條從推車到落點的瞄準折線');
  ok(/ctx\.fillText\(String\(land\.dist\), cxp, cypv?\)/.test(body), '落點中央標「第幾格」（實際距離）');
  ok(/冷卻 ' \+ Math\.max\(0, p\.cartCd\)\.toFixed\(1\)/.test(body), '冷卻時顯示剩餘秒數');
}

// ================================================================
head('12. 迴歸：玩過 RPG 再回單人，不會卡在 RPG 扣血邏輯');
{
  P.startRpg(1);
  ok(G.rpg === true, 'RPG 模式 Game.rpg = true');
  P.startSolo(1, false);
  ok(G.rpg === false, '回到單人 Game.rpg = false（修掉舊 bug）');
  const p = G.players[0];
  p.invuln = 0;
  P.killPlayer(p, false, null);
  ok(p.alive === false && p.lives === 2, '單人被炸到正常扣命（原本會永遠不死）');
}

// ================================================================
head('13. 版本與 SW');
ok(/^\d+\.\d+$/.test(P.VERSION), '版號格式 = ' + P.VERSION);
ok(css.indexOf('id="verTxt">' + P.VERSION + '<') > 0, '畫面版本文字同步 ' + P.VERSION);
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = ' + P.VERSION + '（now）');
ok((P.VERSION_LOG.filter(function (e) { return e.v === '4.19'; })[0] || {}).now === false, '4.19 已不再是 now');
ok(P.VERSION_LOG.filter(function (e) { return e.v === '4.17'; })[0].items.join(' ').indexOf('隨從') >= 0, '4.17 版本紀錄有寫隨從');
ok(new RegExp("SW_VERSION = 'v" + P.VERSION + "\\.0'").test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')), 'sw.js = v' + P.VERSION + '.0');

// ================================================================
console.log('\n----------------------------------------');
console.log('v4.17 測試：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
