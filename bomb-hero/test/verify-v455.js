// verify-v455.js — v4.55 專屬驗證（19:07 八點裡可自動驗的部分）
//   ① 外牆顏色：每個大關自己一組（th.out），八組都不一樣
//   ② freeRimRocks：黏在外牆上的硬牆島會被挖開，但大塊岩層留著
//   ③ 軟磚變多：可走格裡軟磚的比例 ≥ 42%
//   ④ 格檔隨從搶仇恨：她比主角更靠近怪 → 回傳她；主角貼上去 → 不搶
//   ⑤ 怪物仇恨判定有接上 guardTaunt（兩個更新迴圈都要）
//   ⑥ 腳下有炸彈 → 畫面上真的會出現 💣 提醒
//   ⑦ 首頁大逃殺鈕（未開放）存在、文案是 JS 注入、點了有說明
const fs = require('fs');
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game, rec = env.rec;
const src = html.replace(/\r/g, '');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

function soloStage(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.startSolo(stage || 1, false);
  G.state = 'play';
  P.markWallKinds();
  return G.players[0];
}

// ================================================================
head('1. 外牆顏色：八個大關各一組（th.out）');
{
  const outs = P.THEMES.map(function (t) { return t.out; });
  ok(outs.length === 8 && outs.every(function (c) { return /^#[0-9a-f]{6}$/i.test(c || ''); }),
    '八個主題都有 out 色：' + outs.join(' '));
  ok(outs.filter(function (c, i) { return outs.indexOf(c) === i; }).length === 8, '八組顏色互不相同');
  // 外牆色要和「該關硬牆」同一色系（色相接近）但明度不同（不是同一個色）
  const hue = function (c) {
    const r = parseInt(c.slice(1, 3), 16) / 255, g = parseInt(c.slice(3, 5), 16) / 255, b = parseInt(c.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return 0;
    let h = mx === r ? ((g - b) / d) % 6 : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
    h *= 60; return (h + 360) % 360;
  };
  const lum = function (c) {
    return .2126 * parseInt(c.slice(1, 3), 16) + .7152 * parseInt(c.slice(3, 5), 16) + .0722 * parseInt(c.slice(5, 7), 16);
  };
  let sameHue = 0, diffLum = 0;
  P.THEMES.forEach(function (t) {
    let dh = Math.abs(hue(t.hard) - hue(t.out));
    if (dh > 180) dh = 360 - dh;
    if (dh <= 30) sameHue++;
    if (Math.abs(lum(t.hard) - lum(t.out)) >= 12) diffLum++;
  });
  ok(sameHue === 8, '八組外牆色都跟該關硬牆同色系（色相差 ≤30°）：' + sameHue + '/8');
  ok(diffLum === 8, '但明度都跟硬牆拉開（≥12 階）→ 看得出來是兩種牆：' + diffLum + '/8');
  ok(/const base = \(th && \(th\.out \|\| th\.hard\)\)/.test(src), 'drawOuterWall 用 th.out');
  ok(/artSet\(artStyle\(\)\)\.outer/.test(src), '外牆走自己的 outer 圖組（不是硬牆調色）');
  ok(/function paintOuterTile\(/.test(src), '有 paintOuterTile（外牆專屬貼圖烘焙）');
  ok(!/const e = T \* \.10;/.test(src) && !/T \+ e \* 2/.test(src), '外牆尺寸回到與硬牆同一個 T×T（v4.55 的往外擴已取消）');
  ok(/if \(!isOut\(gx, gy - 1\)\) ctx\.fillRect/.test(src), '外牆外緣會壓暗邊（看起來更厚）');
}

// ================================================================
head('2. 外牆只在外緣：場內岩層用硬牆素材（v4.59 幾何判定 → v4.61 一路到地圖邊）');
{
  let rimCells = 0, islandCells = 0, badInner = 0, badOuter = 0, worst = '';
  for (let st = 1; st <= 16; st++) {
    soloStage(st);
    const k = G.wallKind || [];
    for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
      if (!k[y] || !k[y][x]) continue;
      let floor4 = 0, backEdge = false;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const nx = x + d[0], ny = y + d[1];
        if (nx >= 0 && ny >= 0 && nx < G.cols && ny < G.rows && G.grid[ny][nx] === 1) return;
        floor4++;
        // 背對空地那側：一路都是實心、直到撞上地圖邊 → 它擋在場地外圍
        let ax = x - d[0], ay = y - d[1];
        while (ax >= 0 && ay >= 0 && ax < G.cols && ay < G.rows && G.grid[ay][ax] === 1) { ax -= d[0]; ay -= d[1]; }
        if (ax < 0 || ay < 0 || ax >= G.cols || ay >= G.rows) backEdge = true;
      });
      if (k[y][x] === 1) {
        rimCells++;
        if (floor4 === 4) { badOuter++; worst = 'st' + st + ' (' + x + ',' + y + ')'; }
      } else {
        islandCells++;
        if (backEdge) { badInner++; worst = 'st' + st + ' (' + x + ',' + y + ')'; }
      }
    }
  }
  ok(badInner === 0, '沒有任何硬牆頂在外緣（擋在場地外圍的一律算外牆）' + (worst ? '：' + worst : ''));
  ok(badOuter === 0, '四面都是空地的孤立岩塊不會被當成外牆（' + badOuter + ' 格）');
  ok(rimCells > 400, '外牆那一圈真的有外牆（16 關共 ' + rimCells + ' 格）');
  ok(islandCells > 150, '場內岩層還是硬牆素材（16 關共 ' + islandCells + ' 格）');
  ok(typeof P.freeRimRocks === 'function', '有 freeRimRocks()');
  soloStage(3);
  const before = JSON.stringify(G.grid);
  const n = P.freeRimRocks(G.grid);
  ok(typeof n === 'number', 'freeRimRocks 回傳挖掉的格數（' + n + '）');
  let nn = 1, rounds = 0;
  while (nn > 0 && rounds < 8) { nn = P.freeRimRocks(G.grid); rounds++; }
  ok(nn === 0 && rounds <= 8, '重複跑到沒有為止（' + rounds + ' 輪就收斂）');
}

// ================================================================
head('3. 軟磚變多：可走格裡 42% 以上是軟磚');
{
  let soft = 0, walk = 0;
  for (let st = 1; st <= 6; st++) {
    soloStage(st);
    for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
      if (G.grid[y][x] === 1) continue;
      walk++;
      if (G.grid[y][x] === 2) soft++;
    }
  }
  const pct = Math.round(soft / walk * 100);
  ok(pct >= 36, '軟磚佔可走格 ' + pct + '%（' + soft + '/' + walk + '）');
  ok(/const softRate = opts\.softRate == null \? \.52 : opts\.softRate;/.test(src),
    '軟磚率 .52（v4.66：隨機大圖從 .40 提到 .52，跟 32 關一致）');
}

// ================================================================
head('4. 格檔隨從搶仇恨');
{
  const hero = soloStage(1);
  const T = G.T;
  G.enemies.length = 0;
  G.pets.length = 0;
  // 找一段「連續 4 格都是空地」的橫排 —— 玩家站在牆裡會被當成躲藏，判定就不準了
  let ry = 5, rx = 5;
  for (let y = 1; y < G.rows - 1 && !(G.grid[y][5] === 0 || G.grid[y][5] === 2) ; y++) {}
  outer: for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 4; x++) {
    let all = true;
    for (let k = 0; k < 4; k++) if (G.grid[y][x + k] !== 0) { all = false; break; }
    if (all) { ry = y; rx = x; break outer; }
  }
  const foe = P.makeEnemy(rx, ry, 'beetle', 1, 1);
  foe.aggro = true;
  G.enemies.push(foe);
  const pet = { kind: 'guard', down: false, restT: 0, x: (rx + 2) * T + T / 2, y: ry * T + T / 2 };
  G.pets.push(pet);
  hero.x = (rx + 3) * T + T / 2; hero.y = ry * T + T / 2; hero.alive = true;
  ok(P.guardTaunt(foe) === pet, '隨從離怪更近 → 怪被她搶走（回傳她）');
  hero.x = (rx + 1) * T + T / 2; hero.y = ry * T + T / 2;
  ok(P.guardTaunt(foe) === null, '主角自己貼在怪前面 → 不搶（還是打主角）');
  hero.x = (rx + 3) * T + T / 2;
  pet.restT = 2;
  ok(P.guardTaunt(foe) === null, '擋完在休息的隨從不搶仇恨');
  pet.restT = 0; pet.down = true;
  ok(P.guardTaunt(foe) === null, '倒地哭的隨從不搶仇恨');
  pet.down = false;
  // 主動攔：怪正在追主角、而且在 5 格內 → petHeroThreat 找得到
  hero.x = (rx + 2) * T + T / 2; hero.y = ry * T + T / 2;
  ok(P.petHeroThreat(hero, T * 5) === foe, 'petHeroThreat 找得到「正在追主角」的怪');
  foe.aggro = false;
  ok(P.petHeroThreat(hero, T * 5) === null, '怪沒被惹到就不出動（不會滿場追怪）');
  G.enemies.length = 0; G.pets.length = 0;
}

// ================================================================
head('5. 仇恨判定接上 guardTaunt');
{
  const hits = (src.match(/!!enemyAggro\(e\) \|\| !!guardTaunt\(e\)/g) || []).length;
  ok(hits === 2, '地面怪＋飛行怪兩個迴圈都接了（' + hits + ' 處）');
  ok(/const gp = guardTaunt\(e\);/.test(src) && /if \(gd < bestD\)/.test(src), '追擊時會把隨從當目標（真的會轉頭去打她）');
  ok(/petHeroThreat\(hero, T \* 5\)/.test(src), '格檔隨從用 5 格的主動攔截範圍（原本只感應自己周圍 2 格）');
}

// ================================================================
head('6. 腳下有炸彈 → 頭上冒 💣');
{
  const p = soloStage(2);
  p.invuln = 0; p.alive = true;
  G.state = 'play';
  G.bombs.length = 0;
  const cx = Math.floor(p.x / G.T), cy = Math.floor(p.y / G.T);
  G.bombs.push({
    cx: cx, cy: cy, px: (cx + .5) * G.T, py: (cy + .5) * G.T, timer: 2, power: 1,
    owner: p, seed: 1, passers: [], moving: null, flying: null, held: false,
    remoteArmed: false, mine: false, ownerLeft: false, petOwner: null
  });
  ok(P.bombUnderFoot(p) === G.bombs[0], 'bombUnderFoot 判斷得出「腳下有炸彈」');
  rec.calls.length = 0;
  let err = null;
  try { P.render(); } catch (e) { err = e; }
  ok(!err, 'render() 不會爆' + (err ? '：' + err.message : ''));
  // 有炸彈 → 頭上那顆小炸彈（drawBombArt 的球體 arc）＋腳邊紅圈（ellipse + 紅 strokeStyle）
  const red = rec.sets.filter(function (s2) { return s2[0] === 'strokeStyle' && s2[1] === '#ff5a5a'; });
  ok(red.length > 0, '腳邊畫出紅色警示圈（' + red.length + ' 次）');
  ok(/drawBombArt\(T \* \.17, 3\.1, true, true, false, \.55\)/.test(src), '頭頂那顆用場上同一套 drawBombArt（不靠 emoji 字型）');
  G.bombs.length = 0;
  ok(P.bombUnderFoot(p) === null, '腳下沒炸彈就回 null');
}

// ================================================================
head('7. 首頁大逃殺（未開放）');
{
  ok(/id="btnBR"[^>]*data-ico="🏝️"/.test(src), '首頁有 btnBR 按鈕');
  ok(/class="mbtn c-br has-beta" id="btnBR"/.test(src), 'v4.76：按鈕不再標 locked（大逃殺已開放）');
  ok(/\.hotTag \{/.test(src) && /<span class="hotTag">HOT<\/span>/.test(src), '改標 HOT（推薦測試遊玩）');
  ok(/br\.innerHTML = t\('br\.btnTop'\)/.test(src), '文案由 JS 注入（靜態 HTML 只留空殼，i18n 覆蓋率才不會掉）');
  ok(/\$id\('btnBR'\)\.addEventListener/.test(src), '點下去有事件');
  ok(P.t('br.btnTop') === '大逃殺' && P.t('br.btnTopSub').indexOf('推薦測試遊玩') >= 0, 'v4.76：改成「推薦測試遊玩」＋HOT');
  ok(P.VERSION_LOG.some(function (e) { return e.items.join(' ').indexOf('大逃殺') >= 0; }), '版本紀錄有提到大逃殺');
}

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
