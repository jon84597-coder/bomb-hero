// v4.87 驗證：鴕鳥神獸（紫蛋／跳躍／落地震波）＋ 🐾 按鈕底色
// 跑法：node test/verify-v487.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
// v5.20：字典已外移 → 用邏輯全文（外部字典 + 主檔）
const SRC = require('./_sandbox').html;

console.log('=== ① 常數與美術 ===');
const env = makeEnv();
const B = env.BH, G = env.G;

ok(B.OSTRICH_SPD > 1.2 && B.OSTRICH_SPD < 2, '鴕鳥有明顯加速（' + B.OSTRICH_SPD + '×）');
ok(B.OSTRICH_JUMP_CELLS === 2, '跳躍距離 2 格（跨 1 格牆）');
ok(B.OSTRICH_JUMP_T > .2 && B.OSTRICH_JUMP_T < .9, '滯空時間合理（' + B.OSTRICH_JUMP_T + 's）');
ok(B.EGG_OSTRICH_P > .1 && B.EGG_OSTRICH_P < .6, '紫蛋機率 ' + Math.round(B.EGG_OSTRICH_P * 100) + '%（與恐龍蛋並存）');
ok(!!B.MOUNT_ART.ostrich, 'MOUNT_ART 有 ostrich 條目');
ok(fs.existsSync(path.join(__dirname, '..', 'spr', 'mount-art-ostrich.webp')), '坐騎圖 spr/mount-art-ostrich.webp 存在');
ok(fs.existsSync(path.join(__dirname, '..', 'spr', 'egg-art-purple.webp')), '紫蛋圖 spr/egg-art-purple.webp 存在');
ok(!!B.EGG_ART.purple, 'EGG_ART 有 purple 條目');

// 兩種蛋都要真的會出（1000 次抽樣）
let nO = 0;
for (let i = 0; i < 1000; i++) if (B.rollEggKind() === 'ostrich') nO++;
ok(nO > 250 && nO < 430, '1000 次抽樣紫蛋 ' + nO + ' 顆（期望 ~340）');

console.log('=== ② 上坐騎／換坐騎 ===');
function mkP(x, y) {
  return {
    x: x, y: y, alive: true, facing: 'right', dino: false, redDragon: false, ostrich: false,
    air: 0, jumpLift: 0, fireCd: 0, invuln: 0, speedLv: 0, rpgSpd: 1, team: -1, moving: false,
    walkT: 0, dinoT: 0, score: 0, ai: null, chIdx: 0,
    ch: { color: '#ffffff', color2: '#334455', name: 'test' }
  };
}
G.cols = 9; G.rows = 9; G.T = 40; G.spdK = 1; G.mode = 'solo';
G.door = null; G.hidden = {};
G.grid = [];
for (let y = 0; y < 9; y++) {
  const row = [];
  for (let x = 0; x < 9; x++) row.push((x === 0 || y === 0 || x === 8 || y === 8) ? 1 : 0);
  G.grid.push(row);
}
G.bombs = []; G.flames = []; G.particles = []; G.enemies = []; G.rings = []; G.items = [];
G.eggs = []; G.eggsHidden = []; G.pets = [];
const p = mkP(4 * 40 + 20, 4 * 40 + 20);
G.players = [p];

B.rideOstrich(p);
ok(p.dino && p.ostrich && !p.redDragon, 'rideOstrich：騎上鴕鳥（不是龍）');
ok(Math.abs(B.playerSpeed(p) - 146 * B.OSTRICH_SPD) < .01, '鴕鳥移動速度 = 基礎 × ' + B.OSTRICH_SPD);
p.ostrich = false;
ok(Math.abs(B.playerSpeed(p) - 146) < .01, '沒騎鴕鳥時速度回到 146');

B.rideOstrich(p);
ok(B.fireBreath(p) === false, '鴕鳥不會吐火（同一顆鍵改叫跳躍）');

console.log('=== ③ 跳躍規則（v5.98：隔二格 > 隔一格 > 前方無牆往前跳 > 原地）===');
/* v5.98：玩家定案 —— 前方「全無牆」也要往前跳（舊規格是原地起跳原地落地，常常原地發呆）。
   現在的優先序：先試跨二格 → 再試跨一格 → 再試往前跳（落點要空）→ 都不行才原地跳。 */
B.rideOstrich(p);
G.grid[4][3] = 0; G.grid[4][4] = 0;
p.x = 2 * 40 + 20; p.y = 4 * 40 + 20; p.facing = 'right';
p.air = 0; p.fireCd = 0;
ok(B.mountJump(p) === true, '前方空地：跳得起來（不會像舊版直接沒反應）');
ok(p.air > 0 && p.jumpTo && Math.floor(p.jumpTo.x / 40) === 4, '前方全空 → 往前跳 2 格（落點 x=4）');
ok(p.jumpOver === false, 'jumpOver = false（沒有跨過障礙）');
ok(p.invuln >= B.OSTRICH_JUMP_T, '滯空期間有無敵罩');
let guard = 0;
while (p.air > 0 && guard++ < 200) B.jumpTick(p, 1 / 60);
ok(Math.floor(p.x / 40) === 4 && Math.floor(p.y / 40) === 4, '往前跳 2 格後落地');

// 中間一格是牆 → 跨 1 格，落在牆的另一側
G.grid[4][3] = 1;
p.x = 2 * 40 + 20; p.y = 4 * 40 + 20; p.air = 0; p.fireCd = 0;
ok(B.mountJump(p) === true, '中間那格是硬牆：跨得過去');
ok(Math.floor(p.jumpTo.x / 40) === 4, '落點在往前第 2 格（x=4）');
ok(p.jumpOver === true, 'jumpOver = true（真的跨過障礙）');
guard = 0; while (p.air > 0 && guard++ < 200) B.jumpTick(p, 1 / 60);
ok(Math.floor(p.x / 40) === 4, '確實落在牆的另一側');

// 連續兩格牆 → 沒地方落腳 → 原地跳（不再「按了沒反應」）
G.grid[4][5] = 1;
p.x = 3 * 40 + 20; p.y = 4 * 40 + 20; p.air = 0; p.fireCd = 0;
ok(B.mountJump(p) === true, '連兩格牆：還是跳得起來（原地跳）');
/* 站在牆上（退化情況：傳送門／重生點在磚上）＋前面 (5) 也是牆 → 只跨得過一格到 x=4。
   v5.98 以前會原地跳，現在會找「最近的空落地」往前挪一格。 */
ok(Math.floor(p.jumpTo.x / 40) === 4, '兩格牆擋死 → 往前挪一格到空地（x=4），不會硬塞進牆裡');
guard = 0; while (p.air > 0 && guard++ < 200) B.jumpTick(p, 1 / 60);
ok(Math.floor(p.x / 40) === 4, '落地在往前一格的空地');

// 落點是軟磚 → 也不能跨過去 → 原地跳
G.grid[4][5] = 0; G.grid[4][6] = 2;
p.x = 4 * 40 + 20; p.air = 0; p.fireCd = 0;
ok(B.mountJump(p) === true, '落點是軟磚：跳過去 → 原地跳');
ok(Math.floor(p.jumpTo.x / 40) === 5, '落點是軟磚 → 退回往前一格（x=5），不站上軟磚');

// 冷卻中不能連跳
G.grid[4][6] = 0;
p.x = 2 * 40 + 20; p.air = 0; p.fireCd = 1;
ok(B.mountJump(p) === false, '冷卻中不能再跳（不能無限滯空）');

// 沒騎鴕鳥不能跳
p.fireCd = 0; p.ostrich = false;
ok(B.mountJump(p) === false, '沒騎鴕鳥的人不能跳');
B.rideOstrich(p);

console.log('=== ④ 落地震波 ===');
G.grid[4][3] = 1;   // 中間一格牆 → 跨 1 格，落在 x=4（震波中心＝落點）
G.enemies = [
  { x: 4 * 40 + 20, y: 4 * 40 + 20, hp: 1, maxHp: 1, hitT: 0, r: 10, color: '#fff' },     // 落點那格（雜兵）
  { x: 5 * 40 + 20, y: 4 * 40 + 20, hp: 20, maxHp: 20, hitT: 0, r: 10, color: '#fff' },   // 隔壁 1 格（有血條的大怪）
  { x: 7 * 40 + 20, y: 4 * 40 + 20, hp: 20, maxHp: 20, hitT: 0, r: 10, color: '#fff' }    // 距離 2 格（不該被打）
];
const before = G.grid.map(function (r) { return r.slice(); });
p.x = 2 * 40 + 20; p.y = 4 * 40 + 20; p.air = 0; p.fireCd = 0; p.invuln = 0;
G.rings = [];
B.mountJump(p);
guard = 0; while (p.air > 0 && guard++ < 200) B.jumpTick(p, 1 / 60);
ok(G.enemies[0].dead === true || G.enemies[0].hp <= 0, '雜兵落點那格 → 一擊踩扁');
ok(G.enemies[1].hp > 0 && G.enemies[1].hp < 20, '有血條的大怪吃 35% 但沒被秒殺（hp ' + G.enemies[1].hp + '/20）');
ok((G.enemies[1].dizzy || 0) > 0, '大怪被震暈 → 玩家有時間跑');
ok(G.enemies[2].hp === 20, '距離 2 格的怪沒被打到');
ok((p.slamGuard || 0) > 0, '落地有震攝保護（不是 invuln，不會一直閃）');
ok(G.rings.length >= 3, '有畫出震波環（核心＋多圈）');
let wallSame = true;
for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) if (G.grid[y][x] !== before[y][x]) wallSame = false;
ok(wallSame, '震波一根牆都沒破壞（硬牆／軟磚原封不動）');

console.log('=== ⑤ 滯空免疫 ===');
p.air = .2; p.invuln = 0; p.alive = true;
B.killBattlePlayer(p);
ok(p.alive === true, '跳躍中不吃傷害（生存）');
p.air = 0; p.invuln = 0; p.dino = false; p.ostrich = false; p.slamGuard = 0;
B.killBattlePlayer(p);
ok(p.alive === false, '沒坐騎、腳踏實地 → 照正常規則會死');

console.log('=== ⑥ 蛋與大逃殺 ===');
const pe = mkP(0, 0);
B.rideOstrich(pe);
ok(pe.ostrich === true, '紫蛋（ostrich）→ 鴕鳥');
G.eggs = [];
const e1 = { x: 1, y: 1, kind: 'ostrich' };
G.eggs.push(e1);
pe.x = 40 + 20; pe.y = 40 + 20; pe.ostrich = false; pe.dino = false; pe.redDragon = false;
B.takeEgg(pe);
ok(pe.ostrich === true && G.eggs.length === 0, '走到紫蛋格 → 孵鴕鳥並吃掉蛋');
pe.x = 40 + 20;
G.eggs.push({ x: 1, y: 1, kind: 'dino' });
B.takeEgg(pe);
// v4.89：異種蛋＝換騎（鴕鳥 → 恐龍，舊坐騎爆散），不再一律變紅龍
ok(pe.ostrich === false && pe.dino === true && pe.redDragon === false, '騎鴕鳥吃到恐龍蛋 → 換成一般恐龍（不再變紅龍）');

ok(/if \(up\) rideDino\(k, true\);\s*\n\s*else rideOstrich\(k\);/.test(SRC), '大逃殺：第一次打倒 BOSS 直接給鴕鳥');
ok(/br\.bossGetOstrich\|/.test(SRC), '大逃殺提示有自己的字串（不是拿恐龍那句）');

console.log('=== ⑦ 按鍵與圖示 ===');
ok(/data-t="fire"/.test(SRC) && /kind: \(meNow && meNow\.ostrich\) \? 'claw' : 'flame'/.test(SRC),
  '跳躍鍵沿用 🔥 那一顆的位置，只換圖示（爪子）');
ok(/function drawClawOn\(/.test(SRC), '有爪子圖示的繪製函式');
ok(/if \(p\.ostrich\) mountJump\(p\);\s*\n\s*else fireBreath\(p\);/.test(SRC), '電腦／手把同一個鍵依坐騎分流');
const C2 = env.mkCtx2D();
let drew = true;
try { B.drawClawOn(C2, 62); } catch (e) { drew = false; }
ok(drew, '爪子圖示畫得出來（不會拋錯）');
let drew2 = true;
try { B.drawOstrich(Object.assign(mkP(100, 100), { dino: true, ostrich: true, jumpLift: 6 }), 40); } catch (e) { drew2 = false; console.log('   ', e.message); }
ok(drew2, '鴕鳥繪製不會拋錯（含跳躍抬升）');

console.log('=== ⑧ 十語系 ===');
['toast.ostrich', 'toast.ostrichBanner', 'mount.jump', 'mount.cd', 'mount.jumpFire', 'br.mountOstrich', 'br.bossGetOstrich']
  .forEach(function (k) {
    const line = (SRC.match(new RegExp('^' + k.replace('.', '\\.') + '\\|.*$', 'm')) || [''])[0];
    const cols = line.split('|').length;
    ok(cols === 6, k + ' 有 5 種語言（實際 ' + cols + ' 欄）');
  });

console.log('\n========================================');
console.log('v4.87 鴕鳥神獸＋🐾 底色：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
