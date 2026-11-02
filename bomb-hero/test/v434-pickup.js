// test/v434-pickup.js — v4.34：撿彈／放彈不再互相搶（一路連放炸彈不會變成一路撿炸彈）
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
const src = (re) => re.test(html);

const env = makeEnv();
const P = env.BH, G = P.Game;

function freshSolo(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'off';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.settings.soloTime = 300;
  P.startSolo(stage || 1, false);
  G.state = 'play';
  const p = G.players[0];
  if (p) { p.invuln = 0; p.alive = true; }
  return p;
}
function openCell() {
  for (let y = 2; y < G.rows - 2; y++) {
    for (let x = 3; x < G.cols - 3; x++) {
      if (G.grid[y][x] === 0 && G.grid[y][x + 1] === 0 && G.grid[y][x - 1] === 0 &&
        G.grid[y][x + 2] === 0) return [x, y];
    }
  }
  return [2, 2];
}
function put(p, cx, cy) { p.x = cx * G.T + G.T / 2; p.y = cy * G.T + G.T / 2; }
function step(dt) { try { P.updateWorld(dt || .016); } catch (e) { } }

// ==================================================================
console.log('\n=== 0. 原始碼：分派順序 ===');
ok(!/if \(tryGlovePickup\(p\)\) return;\s+\/\/ 手套/.test(html), 'placeBomb 不再順手撿彈');
ok(/function placeBomb\(p\) \{[\s\S]{0,400}?return false;/.test(html), 'placeBomb 會回傳布林值');
ok(src(/else if \(tryGlovePickup\(p\)\) \{ \/\* 已撿起 \*\/ \}/), '動作鍵仍然「先看腳下能不能撿」');
ok(!/const dirs4 = \[\[1, 0\], \[-1, 0\], \[0, 1\], \[0, -1\]\][\s\S]{0,200}bombAt/.test(html),
  '四個方向亂找的邏輯已移除');
ok(src(/if \(b\.owner === p && b\.cx === cx && b\.cy === cy && !b\.ownerLeft\) return false;/), '站在自己的炸彈上（沒離開過）不撿');
ok(src(/if \(b\.owner === p && \(b\.age \|\| 0\) < \.35\) return false;/), '剛放下 0.35 秒內的炸彈不撿（連放保護）');
ok(src(/b = bombAt\(cx \+ fd\.x, cy \+ fd\.y\);/), '面前那一格不論誰的炸彈都能撿（v4.36）');

// ==================================================================
console.log('\n=== 1. 站在自己剛放的炸彈上連按 → 不會被撿走 ===');
let p = freshSolo(1);
const [cx, cy] = openCell();
put(p, cx, cy);
p.glove = true; p.carry = null; p.maxBombs = 3; p.power = 1;
G.bombs.length = 0;
ok(P.placeBomb(p) === true, '第一顆放得下去');
ok(G.bombs.length === 1, '場上 1 顆炸彈');
ok(G.bombs[0].ownerLeft === false, '剛放下的炸彈 ownerLeft = false');
ok(P.tryGlovePickup(p) === false, '站在上面按動作鍵 → 不會撿起來');
ok(P.placeBomb(p) === false, '同一格放不了第二顆');
ok(p.carry === null, '手上還是空的（沒有被誤撿）');
// 連按 5 次（模擬玩家連點）→ 一顆都不會被撿
let picked = 0;
for (let i = 0; i < 5; i++) { if (P.tryGlovePickup(p)) picked++; step(); }
ok(picked === 0, '連按 5 次都不會撿走自己的炸彈', picked);

// ==================================================================
console.log('\n=== 2. 一路走一路放：連放 3 顆都不會被撿 ===');
put(p, cx + 1, cy); step(.05);           // 離開第一顆那一格
ok(G.bombs[0].ownerLeft === true, '主人離開後 ownerLeft 變 true');
ok(P.placeBomb(p) === true, '走一格後放得下第二顆');
put(p, cx + 2, cy); step(.05);
ok(P.placeBomb(p) === true, '再走一格放得下第三顆');
ok(G.bombs.length === 3, '場上 3 顆（一路連放成功）', G.bombs.length);
ok(p.carry === null, '連放過程中都沒有被撿走');
// 面向右邊、左後方有第一顆 → 按動作鍵不能撿到它
put(p, cx + 2, cy);
p.facing = 'right';
ok(P.tryGlovePickup(p) === false, '背後的炸彈不會被撿（舊版會）');

// ==================================================================
console.log('\n=== 3. 想撿回來：走回炸彈上面按 → 撿得起來 ===');
put(p, cx, cy);
for (let i = 0; i < 30; i++) step(.016);     // v4.36：剛放下有 0.35 秒保護期，先讓它長大
ok(P.tryGlovePickup(p) === true, '站回第一顆上面 → 撿得起來');
ok(p.carry === G.bombs[0] && G.bombs[0].held === true, 'carry 指向那顆、held = true');
P.throwCarried(p);
ok(p.carry === null, '丟出去後手上清空');

// ==================================================================
console.log('\n=== 4. 面前那一格：只撿別人的炸彈 ===');
const p2 = freshSolo(1);
const [ax, ay] = openCell();
put(p2, ax, ay);
p2.glove = true; p2.carry = null; p2.facing = 'right'; p2.maxBombs = 1; p2.power = 1;
G.bombs.length = 0;
// 面前放一顆「別人的」（沒有 owner — 模擬隨從／別人的）
G.bombs.push({
  cx: ax + 1, cy: ay, px: (ax + 1) * G.T + G.T / 2, py: ay * G.T + G.T / 2,
  timer: 2.4, power: 1, owner: null, passers: [], remoteArmed: false, mine: false,
  moving: null, flying: null, held: false, ownerLeft: true, seed: 0, armT: 40
});
ok(P.tryGlovePickup(p2) === true, '面前那顆不是自己的 → 撿得起來');
ok(p2.carry === G.bombs[0], 'carry 指向面前那顆');
P.throwCarried(p2);

// ==================================================================
console.log('\n=== 5. 自己的炸彈在面前（腳下是空地）→ v4.36 起可以撿 ===');
const p3 = freshSolo(1);
const [bx, by] = openCell();
put(p3, bx, by);
p3.glove = true; p3.carry = null; p3.facing = 'right'; p3.maxBombs = 3; p3.power = 1;
G.bombs.length = 0;
G.bombs.push({
  cx: bx + 1, cy: by, px: (bx + 1) * G.T + G.T / 2, py: by * G.T + G.T / 2,
  timer: 2.4, power: 1, owner: p3, passers: [p3], remoteArmed: false, mine: false,
  moving: null, flying: null, held: false, ownerLeft: true, seed: 0, armT: 40
});
// v4.36：面前那一格不論誰的都能撿（手套本來就該這樣用）；但 0.35 秒內剛放下的不算
ok(P.tryGlovePickup(p3) === false, '剛放下（<0.35 秒）→ 還不能撿');
G.bombs[0].age = 1;
ok(P.tryGlovePickup(p3) === true, '面前自己的舊炸彈 → 撿得起來（v4.36 修正）');
ok(p3.carry === G.bombs[0], 'carry 指向那顆');
P.throwCarried(p3);
ok(P.placeBomb(p3) === true, '丟出去之後 → 腳下照樣放得下去');

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v4.34 撿彈分派：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
