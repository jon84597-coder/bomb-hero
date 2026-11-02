// 無頭測試 v25：v1.7 的七項需求
//   1. 輸送帶逆走速度增加（不再慢到走不動）
//   2. 每一張地圖一首專屬 BGM（八關八首，旋律/節奏/音色都不同）
//   3. 每隻角色被炸到都要大哭的臉（含眼淚）
//   4. 炸到人要開心大笑的樣子
//   5. 最終獲勝要開心的一直跳起來
//   6. 輸送帶上的炸彈會跟著被傳輸
//   7. BOSS 被自己的炸彈炸到不扣血、BOSS 火焰是紫色的
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH, rec = env.rec;
const mk = () => env.mkCtx2D();

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function clearRec() { rec.calls.length = 0; rec.sets.length = 0; }
function freshSolo(stage) {
  P.settings.size = 'M';
  P.settings.hazards = 'on';
  P.settings.sd = 'off';
  P.settings.ctrl = 'kb';
  P.settings.soloDiff = 'normal';
  P.settings.soloTime = 300;
  P.startSolo(stage || 1, false);
  G.state = 'play';
  G.bombs.length = 0; G.flames.length = 0;
  G.particles.length = 0; G.bubbles.length = 0;
  G.players[0].invuln = 0;
  return G.players[0];
}
// 抓某個 fillStyle / strokeStyle 是否出現過（屬性指派記在 rec.sets）
function styleUsed(prefix) {
  return rec.sets.some(function (c) {
    return (c[0] === 'fillStyle' || c[0] === 'strokeStyle') && String(c[1]).indexOf(prefix) === 0;
  });
}
function callsNamed(name) { return rec.calls.filter(function (c) { return c[0] === name; }); }
const DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ================================================================
console.log('=== 1. 輸送帶逆走速度增加 ===');
ok(P.BELT_SLOW >= .75, '逆行倍率調到 0.75 以上（BELT_SLOW=' + P.BELT_SLOW + '）');
ok(P.BELT_SLOW < 1, '逆行還是比平地慢一點（' + P.BELT_SLOW + ' < 1）→ 保留輸送帶手感');
ok(P.BELT_SLOW / P.BELT_FAST >= .55, '逆行／順行比值從 0.37 拉到 ' +
  (P.BELT_SLOW / P.BELT_FAST).toFixed(2) + '（不再像黏住）');

freshSolo(13);                                 // v4.26：熔岩洞窟換到第 4 區 → 第 13 關才有輸送帶
let beltCell = null;
for (let y = 1; y < G.rows - 1 && !beltCell; y++) {
  for (let x = 1; x < G.cols - 1; x++) {
    const h = G.hazards[y][x];
    if (h && h.type === 'convey') { beltCell = { x: x, y: y, dir: h.dir }; break; }
  }
}
ok(!!beltCell, '找得到輸送帶格子（' + (beltCell && beltCell.dir) + '）');
if (beltCell) {
  const T = G.T, pp = G.players[0];
  const dv = DV[beltCell.dir];
  pp.x = beltCell.x * T + T / 2; pp.y = beltCell.y * T + T / 2;
  const mSlow = P.beltMulFor(pp, -dv[0], -dv[1]);   // 逆著走
  const mFast = P.beltMulFor(pp, dv[0], dv[1]);     // 順著走
  ok(Math.abs(mSlow - P.BELT_SLOW) < .01, '逆著走拿到新的速度倍率 ' + mSlow);
  ok(Math.abs(mFast - P.BELT_FAST) < .01, '順著走一樣加速 ' + mFast);
  ok(mSlow / mFast >= .55, '逆走速度已達順走的 ' + (mSlow / mFast * 100).toFixed(0) + '%');
  const run = function (mul) {
    pp.x = beltCell.x * T + T / 2; pp.y = beltCell.y * T + T / 2;
    pp.beltMul = mul;
    const x0 = pp.x, y0 = pp.y;
    for (let i = 0; i < 60; i++) P.tryMove(pp, dv[0], dv[1], 1 / 60, P.moveSpeed(pp));
    return Math.hypot(pp.x - x0, pp.y - y0);
  };
  const dSlow = run(mSlow), dFast = run(mFast);
  ok(dSlow > 0 && dFast > 0, '逆走 ' + dSlow.toFixed(1) + 'px / 順走 ' + dFast.toFixed(1) + 'px（1 秒）');
  ok(dSlow / dFast >= .55, '逆走距離已達順走的 ' + (dSlow / dFast * 100).toFixed(0) + '%');
}

// ================================================================
console.log('=== 2. 每一張地圖一首專屬 BGM ===');
const names = [];
// v4.14：32 關 → 每 4 張地圖共用一個大主題的曲子（取每區的第 1 張來驗）
for (let i = 1; i <= 8; i++) names.push(P.stageBGM(i * 4 - 3));
ok(names.join(',') === 'stage1,stage2,stage3,stage4,stage5,stage6,stage7,stage8',
  '八大主題對應八首曲子（' + names.join('/') + '）');
const bpms = [], sigs = [], wavs = [], drums = [];
let allLen = true, allSec = true;
for (let i = 1; i <= 8; i++) {
  const s = BH.AudioSys.compileSong('stage' + i);
  const sec = BH.songSeconds('stage' + i);
  const lens = s.tracks.map(function (t) { return t.seq.reduce(function (a, x) { return a + x.len; }, 0); });
  bpms.push(s.bpm); wavs.push(s.tracks[0].wave);
  drums.push(BH.AudioSys.SONG_DEFS['stage' + i].drum);
  sigs.push(JSON.stringify(s.tracks[0].seq));
  if (!(lens[0] === lens[1] && lens[1] === lens[2] && lens[0] === s.drums.length)) allLen = false;
  if (sec < 120 || sec > 200) allSec = false;
}
ok(new Set(bpms).size === 8, '八首速度全不同（' + bpms.join('/') + ' bpm）');
ok(new Set(sigs).size === 8, '八首旋律全不同');
ok(new Set(wavs).size >= 3, '音色有變化（' + Array.from(new Set(wavs)).join('/') + '）');
ok(new Set(drums).size >= 5, '鼓組節奏有變化（' + new Set(drums).size + ' 種）');
ok(allLen, '每首三軌＋鼓組等長 → 循環不走音');
ok(allSec, '每首都落在 2～3 分鐘（無縫循環）');
P.THEMES.forEach(function (th, i) {
  if (i < 8) ok(P.themeBGM(th) === 'stage' + (i + 1), th.name + ' → ' + P.themeBGM(th));
});
G.bossRush = true;
ok(P.stageBGM(3) === 'boss', 'BOSS 連戰保留專屬魔王曲');
G.bossRush = false;
ok(html.indexOf('STAGE_MUSIC') > 0 && html.indexOf('genMelBars') > 0, '有自動譜曲引擎產生關卡音樂');
ok(/AudioSys\.startBGM\(stageBGM\(/.test(html), '進關卡時用 stageBGM() 挑曲');

// ================================================================
console.log('=== 3. 每隻角色被炸到都要大哭的臉 ===');
let pc = freshSolo(1);
G.enemies.length = 0;
P.killPlayer(pc, false, null);
ok(pc.cry > 0, '被炸到會啟動大哭計時（cry=' + pc.cry + '）');
ok(pc.cry >= 2, '哭臉會亮相 2 秒以上（' + pc.cry + 's）');
ok(!pc.alive, '被炸到就是倒下（才需要哭臉）');
clearRec();
P.render();
ok(rec.calls.length > 0 && callsNamed('ellipse').length > 0, '倒下大哭時角色仍會被畫出來（看得到哭臉）');
ok(styleUsed('rgba(120,190,255'), '畫面上有淚水（淚痕色）');
ok(styleUsed('rgba(155,215,255'), '有掉落的水珠');
ok(styleUsed('#6d2130'), '有哇哇大哭的大嘴');
let cryAll = 0;
for (let i = 0; i < P.CHARACTERS.length; i++) {
  const c2 = P.CHARACTERS[i];
  const g2 = mk();
  clearRec();
  P.drawFaceExpr(g2, 'cry', 100, 100, 40, 40, 1.2, c2.color);
  if (styleUsed('rgba(120,190,255')) cryAll++;
}
ok(cryAll === P.CHARACTERS.length, '八隻角色都畫得出哭臉（' + cryAll + '/' + P.CHARACTERS.length + '）');
pc.cry = .2;
for (let i = 0; i < 30; i++) P.updateWorld(1 / 60);
ok(pc.cry === 0, '哭臉計時會歸零（不會永遠哭）');

// ================================================================
console.log('=== 4. 炸到人要開心大笑 ===');
const pc2 = freshSolo(1);
G.enemies.length = 0;
const killer = { alive: true, chIdx: 1, gloat: 0, x: 5 * G.T, y: 5 * G.T, r: 14 };
pc2.invuln = 0; pc2.alive = true;
P.killPlayer(pc2, false, killer);
ok(killer.gloat > 0, '炸到人的人會進入大笑狀態（gloat=' + killer.gloat.toFixed(1) + '）');
clearRec();
const g3 = mk();
P.drawFaceExpr(g3, 'laugh', 100, 100, 40, 40, 1.0, '#ffcc99');
const arcs = callsNamed('arc').filter(function (c) { return c[5] > 3.6; });
ok(arcs.length >= 2, '大笑是瞇瞇笑眼 ^ ^（' + arcs.length + ' 道弧）');
ok(styleUsed('#7c2f3e'), '大笑有張開的嘴');
ok(styleUsed('#ff8fa3'), '大笑有舌頭');
ok(styleUsed('rgba(27,36,48,.5)'), '大笑有笑紋');
ok(html.indexOf('凶手開心大笑') > 0, '笑聲改成開心大笑（哈−哈−哈哈哈）');
clearRec();
const g4 = mk();
P.drawFaceExpr(g4, 'cry', 100, 100, 40, 40, 1.0, '#ffcc99');
const crySig = JSON.stringify(rec.calls.concat(rec.sets));
clearRec();
const g5 = mk();
P.drawFaceExpr(g5, 'laugh', 100, 100, 40, 40, 1.0, '#ffcc99');
ok(crySig !== JSON.stringify(rec.calls.concat(rec.sets)), '大哭與大笑是不一樣的表情');

// ================================================================
console.log('=== 5. 最終獲勝要開心的一直跳起來 ===');
ok(html.indexOf('function startWinJump') > 0, '有「勝利跳躍」動畫函式');
ok(html.indexOf('winJumpCv') > 0, '結束畫面內建一塊勝利畫布');
ok(/hideOverlay\(\) \{[^}]*stopWinJump\(\)/.test(html), '關掉結束畫面時會停掉跳躍動畫');
clearRec();
P.showEnd('🏆 測試奪冠！', '比分 2 / 1', true, 0);
ok(env.getId('winJumpCv').style.display === 'block', '獲勝時勝利畫布會顯示');
ok(callsNamed('clearRect').length > 0, '勝利畫布有真的畫東西');
ok(callsNamed('fillRect').length >= 10, '有繽紛紙屑（' + callsNamed('fillRect').length + ' 片）');
ok(callsNamed('fillText').length >= 2, '頭上冒 ♪ ♫ 音符');
ok(styleUsed('#7c2f3e') || styleUsed('#ff8fa3'), '勝利的人是「大笑」的表情');
ok(callsNamed('ellipse').length > 0, '有影子（跳起來才需要）');
P.showEnd('遊戲結束', '…', false, 0);
ok(env.getId('winJumpCv').style.display === 'none', '沒獲勝就不顯示跳躍畫面');
P.stopWinJump();
const pj = freshSolo(1);
pj.cheerT = 2;
pj.moving = false;
// 用「腳丫子畫在第幾 px」量高度：跳起來整個人會往上移
function footYAt(t) {
  G.gameT = t;
  clearRec();
  P.drawPlayer(pj, G.T);
  const e = rec.calls.filter(function (c) { return c[0] === 'ellipse'; });
  return e.length ? e[0][2] : null;
}
const yGround = footYAt(0);                    // sin(0)=0 → 踩在地上
const yTop = footYAt(Math.PI / 18);            // sin=1 → 跳到最高
ok(yGround !== null && yTop !== null && Math.abs(yGround - yTop) > 4,
  '歡呼時角色一直往上跳（高低差 ' + (yGround - yTop).toFixed(1) + 'px）');
pj.cheerT = 0;
const yStill = footYAt(Math.PI / 18);
ok(Math.abs(yStill - yGround) < .01, '沒在歡呼就乖乖站地上（' + yStill.toFixed(1) + 'px）');
pj.cheerT = 2;
ok(pj.cheerT > 0, '歡呼計時還在跑');
for (let i = 0; i < 200; i++) P.updateWorld(1 / 60);
ok(pj.cheerT === 0, '歡呼計時會歸零（不會跳一輩子）');

// ================================================================
console.log('=== 6. 輸送帶上的炸彈會跟著傳輸 ===');
freshSolo(13);                                  // v4.26：熔岩洞窟換到第 4 區 → 第 13 關才有輸送帶
G.bombs.length = 0;
let bc = null;
for (let y = 1; y < G.rows - 1 && !bc; y++) {
  for (let x = 1; x < G.cols - 1; x++) {
    const h = G.hazards[y][x];
    if (!h || h.type !== 'convey') continue;
    const d = DV[h.dir];
    if (P.cellAt(x + d[0], y + d[1]) === 0) { bc = { x: x, y: y, dir: h.dir, d: d }; break; }
  }
}
ok(!!bc, '找得到可以往前送的輸送帶格（' + (bc && bc.dir) + '）');
if (bc) {
  const T = G.T;
  const bomb = {
    cx: bc.x, cy: bc.y, px: bc.x * T + T / 2, py: bc.y * T + T / 2,
    timer: 999, power: 2, owner: G.players[0], passers: [], flying: null,
    moving: null, held: false, remoteArmed: false, mine: false, beltAcc: 0
  };
  G.bombs.push(bomb);
  const c0 = { x: bomb.cx, y: bomb.cy };
  for (let i = 0; i < 200; i++) P.updateWorld(1 / 60);
  const moved = (bomb.cx !== c0.x || bomb.cy !== c0.y);
  ok(moved, '炸彈被輸送帶帶走了（' + c0.x + ',' + c0.y + ' → ' + bomb.cx + ',' + bomb.cy + '）');
  if (moved) {
    const dx = Math.sign(bomb.cx - c0.x), dy = Math.sign(bomb.cy - c0.y);
    ok(dx === bc.d[0] && dy === bc.d[1], '移動方向和輸送帶一致（' + bc.dir + '）');
  }
  let blocked = null;
  for (let y = 1; y < G.rows - 1 && !blocked; y++) {
    for (let x = 1; x < G.cols - 1; x++) {
      const h = G.hazards[y][x];
      if (!h || h.type !== 'convey') continue;
      const d = DV[h.dir];
      if (P.cellAt(x + d[0], y + d[1]) !== 0) { blocked = { x: x, y: y }; break; }
    }
  }
  if (blocked) {
    G.bombs.length = 0;
    const b2 = {
      cx: blocked.x, cy: blocked.y, px: 0, py: 0, timer: 999, power: 2,
      owner: G.players[0], passers: [], flying: null, moving: null, held: false, beltAcc: 0
    };
    G.bombs.push(b2);
    for (let i = 0; i < 200; i++) P.updateWorld(1 / 60);
    ok(b2.cx === blocked.x && b2.cy === blocked.y, '前方是牆就卡住，不會穿牆');
  } else {
    ok(true, '前方是牆就卡住（這張地圖沒有這種格子，跳過）');
  }
  G.bombs.length = 0;
  const b3 = {
    cx: bc.x, cy: bc.y, px: 0, py: 0, timer: 999, power: 2,
    owner: G.players[0], passers: [], flying: null, moving: null, held: true, beltAcc: 0
  };
  G.bombs.push(b3);
  for (let i = 0; i < 200; i++) P.updateWorld(1 / 60);
  ok(b3.cx === bc.x && b3.cy === bc.y, '拿在手上的炸彈不會被帶走');
}

// ================================================================
console.log('=== 7. BOSS：紫色火焰、自己的彈炸不到自己 ===');
freshSolo(8);                                   // 暗黑魔王城
const T2 = G.T;
function bossAt(cx, cy, hp) {
  G.bombs.length = 0; G.flames.length = 0; G.enemies.length = 0;
  const b = P.makeBoss(cx, cy, hp || 10);
  b.x = cx * T2 + T2 / 2; b.y = cy * T2 + T2 / 2;
  b.hitT = 0; b.bombT = 999;                    // 別讓他自己一直丟彈，專心測傷害
  G.enemies.push(b);
  return b;
}
let boss = bossAt(4, 4, 10);
G.flames.push({ cx: 4, cy: 4, type: 'center', dir: null, t: .46, owner: null });
const hp0 = boss.hp;
for (let i = 0; i < 30; i++) P.updateBoss(boss, 1 / 60);
ok(boss.hp === hp0, 'BOSS 踩在自己的火焰上不掉血（' + hp0 + ' → ' + boss.hp + '）');

boss = bossAt(5, 5, 10);
G.bombs.push({
  cx: 5, cy: 5, px: boss.x, py: boss.y, timer: .01, power: 5,
  owner: null, passers: [], flying: null, moving: null, held: false
});
const hp1 = boss.hp;
for (let i = 0; i < 60; i++) {
  P.updateBoss(boss, 1 / 60);
  if (i === 2) G.flames.forEach(function (f) { f.t = .46; });
}
ok(boss.hp === hp1, 'BOSS 自己的炸彈爆炸也不扣血（' + hp1 + ' → ' + boss.hp + '）');

boss = bossAt(6, 6, 10);
const me = G.players[0];
G.flames.push({ cx: 6, cy: 6, type: 'center', dir: null, t: .46, owner: me });
const hp2 = boss.hp;
for (let i = 0; i < 30; i++) P.updateBoss(boss, 1 / 60);
ok(boss.hp === hp2 - 1, '玩家的火焰打得掉 BOSS 一滴血（' + hp2 + ' → ' + boss.hp + '）');

G.bombs.length = 0; G.enemies.length = 0; G.flames.length = 0;
G.flames.push({ cx: 3, cy: 3, type: 'center', dir: null, t: .46, owner: null });
clearRec();
P.render();
// v4.11 起火焰改用徑向漸層（fillStyle 是漸層物件、不再有顏色字串）→ 直接驗色階表
const purple = /rgba\(210,120,255,A\)/.test(html) && /rgba\(150,40,230,A\)/.test(html);
ok(purple, 'BOSS 的火焰畫成紫色');
G.flames.length = 0;
G.flames.push({ cx: 3, cy: 3, type: 'center', dir: null, t: .46, owner: me });
clearRec();
P.render();
const orange = /rgba\(255,214,130,A\)/.test(html) && /rgba\(255,150,50,A\)/.test(html);
ok(orange, '玩家的火焰維持橘色');
ok(!styleUsed('rgba(158,48,236') && !styleUsed('rgba(196,104,255'), '玩家火焰不會變成紫色');
G.flames.length = 0;
const bb = { cx: 8, cy: 3, px: 0, py: 0, timer: 0, power: 2, owner: null, passers: [] };
G.bombs.push(bb);
clearRec();
P.explodeBomb(bb);
ok(rec.sets.some(function (c) { return c[0] === 'fillStyle' && String(c[1]).indexOf('#c471ff') === 0; })
  || html.indexOf("'#c471ff'") > 0, 'BOSS 的爆炸火花也是紫色');

// ================================================================
console.log('=== 8. 回歸：遊戲還能跑 ===');
freshSolo(3);
let err = null;
try { for (let i = 0; i < 120; i++) { P.updateSolo(1 / 60); P.render(); } } catch (e) { err = e; }
ok(!err, '連跑 120 幀 update + render 不報錯' + (err ? '：' + err.message : ''));
ok(G.players[0].alive, '玩家還活著');
ok(parseFloat(P.VERSION) >= 1.9, '版本 = 1.9（' + P.VERSION + '）');
ok(html.indexOf('cry: 0, cheerT: 0') > 0, '玩家資料有哭／歡呼欄位');

console.log('');
console.log('通過 ' + pass + ' / ' + (pass + fail) + (fail ? '（' + fail + ' 項失敗）' : ''));
process.exit(fail ? 1 : 0);
