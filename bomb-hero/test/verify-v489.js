// v4.89 驗證：落地重擊特效／平衡（有血條的怪）／風暴鴕鳥二段
// 跑法：node test/verify-v489.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
// v5.20：字典已外移 → 接在後面，讓「^key|」的逐列搜尋一樣有效
const SRC = require('./_sandbox').rawHtml +
  '\n' + (function () { try { return fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n-src.js'), 'utf8'); } catch (e) { return ''; } })();

console.log('=== ① 常數 ===');
const env = makeEnv();
const B = env.BH, G = env.G;

ok(B.OSTRICH_SPD2 > B.OSTRICH_SPD && B.OSTRICH_SPD2 < 2, '風暴鴕鳥更快（' + B.OSTRICH_SPD2 + '× > ' + B.OSTRICH_SPD + '×）');
ok(B.OSTRICH_JUMP_CELLS2 === 3, '風暴鴕鳥跳 3 格');
ok(B.OSTRICH_LAND_R2 === 2, '風暴震波半徑 2 格（5×5）');
ok(B.OSTRICH_LAND_DMG2 > B.OSTRICH_LAND_DMG, '風暴震波傷害更高（' + B.OSTRICH_LAND_DMG2 + ' > ' + B.OSTRICH_LAND_DMG + '）');
ok(B.OSTRICH_DIVE_MUL > 1.2 && B.OSTRICH_DIVE_MUL < 2.5, '俯衝傷害倍率 ' + B.OSTRICH_DIVE_MUL + '×');
ok(B.OSTRICH_SLAM_GUARD > 0 && B.OSTRICH_SLAM_GUARD < 1, '落地震攝保護 ' + B.OSTRICH_SLAM_GUARD + 's（不能超過跳躍冷卻）');
ok(B.OSTRICH_JUMP_T + B.OSTRICH_SLAM_GUARD < B.OSTRICH_JUMP_CD, '滯空＋震攝 < 跳躍冷卻 → 不能無限無敵');
ok(B.OSTRICH_STUN >= 1, '震波暈眩 ' + B.OSTRICH_STUN + 's');
ok(B.OSTRICH_BOSS_PCT > 0 && B.OSTRICH_BOSS_PCT < .2, '對 BOSS 的 % 傷害 ' + Math.round(B.OSTRICH_BOSS_PCT * 100) + '%（不會變秒王技）');

console.log('=== ② 場地 ===');
function mkP(x, y) {
  return {
    x: x, y: y, alive: true, facing: 'right', dino: false, redDragon: false, ostrich: false,
    storm: false, dived: false, slamGuard: 0,
    air: 0, jumpLift: 0, fireCd: 0, invuln: 0, speedLv: 0, rpgSpd: 1, team: -1, moving: false,
    walkT: 0, dinoT: 0, score: 0, ai: null, chIdx: 0,
    ch: { color: '#ffffff', color2: '#334455', name: 'test' }
  };
}
G.cols = 11; G.rows = 11; G.T = 40; G.spdK = 1; G.mode = 'solo';
G.door = null; G.hidden = {}; G.gameT = 1;
G.grid = [];
for (let y = 0; y < 11; y++) {
  const row = [];
  for (let x = 0; x < 11; x++) row.push((x === 0 || y === 0 || x === 10 || y === 10) ? 1 : 0);
  G.grid.push(row);
}
G.bombs = []; G.flames = []; G.particles = []; G.enemies = []; G.rings = []; G.items = [];
G.eggs = []; G.eggsHidden = []; G.pets = []; G.teamsOn = 0;
const p = mkP(1 * 40 + 20, 5 * 40 + 20);
G.players = [p];

console.log('=== ③ 二段進化 ===');
B.rideOstrich(p, false);
ok(p.ostrich && !p.storm, '第一顆紫蛋 → 普通鴕鳥');
B.rideOstrich(p, true);
ok(p.ostrich && p.storm, '第二顆紫蛋 → 風暴鴕鳥（storm）');
ok(Math.abs(B.playerSpeed(p) - 146 * B.OSTRICH_SPD2) < .01, '風暴鴕鳥速度 = 146 × ' + B.OSTRICH_SPD2);
p.storm = false;
ok(Math.abs(B.playerSpeed(p) - 146 * B.OSTRICH_SPD) < .01, '退回普通鴕鳥速度');
p.storm = true;

console.log('=== ④ 跳 3 格（v5.92：跨 2 格障礙 → 落在第 3 格）===');
// v5.92：一定要「跨過障礙」才算跨 —— 所以中間兩格擺牆，落點（第 3 格）才是空地
G.grid[5][2] = 1; G.grid[5][3] = 1;
p.x = 1 * 40 + 20; p.y = 5 * 40 + 20; p.facing = 'right'; p.air = 0; p.fireCd = 0;
ok(B.mountJump(p) === true, '風暴鴕鳥跨兩格牆：跳得過去');
ok(Math.floor(p.jumpTo.x / 40) === 4, '落點在往前第 3 格（x=4）');
let guard = 0; while (p.air > 0 && guard++ < 200) B.jumpTick(p, 1 / 60);
ok(Math.floor(p.x / 40) === 4, '實際落在 x=4');

console.log('=== ⑤ 震波半徑與破磚 ===');
// 普通鴕鳥：2 格外的怪打不到
G.enemies = [
  { x: 6 * 40 + 20, y: 5 * 40 + 20, hp: 1, maxHp: 1, hitT: 0, r: 10, color: '#fff' },   // 距離 2
  { x: 7 * 40 + 20, y: 5 * 40 + 20, hp: 1, maxHp: 1, hitT: 0, r: 10, color: '#fff' }    // 距離 3
];
p.storm = false; p.x = 4 * 40 + 20; p.y = 5 * 40 + 20; p.air = 0; p.fireCd = 0;
B.ostrichLand(p);
ok(G.enemies[0].hp > 0, '普通鴕鳥：2 格外的怪打不到');
ok(G.enemies[1].hp > 0, '普通鴕鳥：3 格外的怪更打不到');

// 風暴鴕鳥：2 格內全吃
G.enemies = [
  { x: 6 * 40 + 20, y: 5 * 40 + 20, hp: 1, maxHp: 1, hitT: 0, r: 10, color: '#fff' },
  { x: 7 * 40 + 20, y: 5 * 40 + 20, hp: 1, maxHp: 1, hitT: 0, r: 10, color: '#fff' }
];
p.storm = true; p.dived = false; p.x = 4 * 40 + 20; p.y = 5 * 40 + 20;
B.ostrichLand(p);
ok(G.enemies[0].dead === true || G.enemies[0].hp <= 0, '風暴鴕鳥：距離 2 格的怪也踩得到');
ok(G.enemies[1].hp > 0, '風暴鴕鳥：距離 3 格仍然打不到');

// 破軟磚（硬牆不動）
G.grid[4][4] = 2; G.grid[4][6] = 2; G.grid[3][5] = 2;
G.enemies = [];
G.items = []; G.eggs = []; G.eggsHidden = [];
p.x = 5 * 40 + 20; p.y = 5 * 40 + 20;
B.ostrichLand(p);
ok(G.grid[4][4] === 0 && G.grid[4][6] === 0 && G.grid[3][5] === 0, '風暴震波把 5×5 內的軟磚都震碎');
ok(G.grid[0][0] === 1 && G.grid[10][10] === 1, '硬牆完全沒被破壞');
p.storm = false;
G.grid[4][4] = 2; G.grid[4][6] = 2;
B.ostrichLand(p);
ok(G.grid[4][4] === 2 && G.grid[4][6] === 2, '普通鴕鳥不會震碎軟磚（維持原設計）');
G.grid[4][4] = 0; G.grid[4][6] = 0;

console.log('=== ⑥ 有血條的怪：平衡 ===');
G.enemies = [{ x: 6 * 40 + 20, y: 5 * 40 + 20, hp: 20, maxHp: 20, hitT: 0, r: 10, color: '#fff' }];
p.storm = false; p.x = 5 * 40 + 20; p.y = 5 * 40 + 20; p.dived = false;
B.ostrichLand(p);
ok(G.enemies[0].hp === 20 - Math.ceil(20 * .35), 'RPG 級大怪吃 35% 最大生命（hp ' + G.enemies[0].hp + '/20）');
ok((G.enemies[0].dizzy || 0) > 0, '大怪被震暈 → 跳進去不會立刻被反咬');
const kb = Math.floor(G.enemies[0].x / 40);
ok(kb !== 6, '大怪被撞退一格（現在在 x=' + kb + '）');

// BOSS：固定小傷、不暈、不擊退
G.enemies = [{ x: 6 * 40 + 20, y: 5 * 40 + 20, hp: 40, maxHp: 40, hitT: 0, r: 24, color: '#fff', boss: true }];
p.x = 5 * 40 + 20; p.y = 5 * 40 + 20;
B.ostrichLand(p);
ok(G.enemies[0].hp === 40 - Math.max(B.OSTRICH_LAND_DMG, Math.round(40 * B.OSTRICH_BOSS_PCT)), 'BOSS 只吃固定比例小傷（hp ' + G.enemies[0].hp + '/40）');
ok(!(G.enemies[0].dizzy > 0), 'BOSS 不會被震暈（不然可以永久暈王）');
ok(Math.floor(G.enemies[0].x / 40) === 6, 'BOSS 不會被擊退');

console.log('=== ⑦ 落地震攝保護 ===');
G.enemies = [];
p.x = 5 * 40 + 20; p.y = 5 * 40 + 20; p.air = 0; p.invuln = 0; p.alive = true;
p.dino = true; p.ostrich = true; p.storm = false; p.slamGuard = 0;
B.ostrichLand(p);
ok((p.slamGuard || 0) > 0, '落地後進入震攝狀態');
ok((p.invuln || 0) === 0, '震攝不是 invuln（角色不會一直閃）');
B.killBattlePlayer(p);
ok(p.alive === true && p.dino === true, '震攝期間被咬 → 不會掉坐騎');
p.slamGuard = 0; p.invuln = 0;
B.killBattlePlayer(p);
ok(p.dino === false, '震攝結束後被咬 → 坐騎照正常規則消失');

console.log('=== ⑧ 俯衝 ===');
p.alive = true; p.dino = true; p.ostrich = true; p.storm = true; p.dived = false;
p.x = 1 * 40 + 20; p.y = 5 * 40 + 20; p.facing = 'right'; p.air = 0; p.fireCd = 0; p.invuln = 0; p.slamGuard = 0;
B.mountJump(p);
ok(p.dived === false, '起跳時俯衝可用');
for (let i = 0; i < 8; i++) B.jumpTick(p, 1 / 60);
const midTile = Math.floor(p.x / 40);
ok(midTile > 1 && midTile < 4, '滯空中（目前在 x=' + midTile + '）');
ok(B.ostrichDive(p) === true, '滯空中再按一次 → 俯衝');
ok(p.air <= .01, '俯衝立刻結束滯空');
B.jumpTick(p, 1 / 60);
ok(Math.floor(p.x / 40) === midTile, '砸在腳下那一格（不是飛到預定落點）');
ok(p.dived === false, '落地後 dived 清掉，下一次跳躍可以再俯衝');

// 俯衝範圍 +1 圈（距離 3 格也打得到）
G.enemies = [{ x: (midTile + 3) * 40 + 20, y: 5 * 40 + 20, hp: 1, maxHp: 1, hitT: 0, r: 10, color: '#fff' }];
p.dived = true; p.x = midTile * 40 + 20; p.y = 5 * 40 + 20; p.storm = true;
B.ostrichLand(p);
ok(G.enemies[0].dead === true || G.enemies[0].hp <= 0, '俯衝震波半徑 3 格（打得到 3 格外的怪）');

// 俯衝對 BOSS 的傷害比落地高
G.enemies = [{ x: (midTile + 1) * 40 + 20, y: 5 * 40 + 20, hp: 40, maxHp: 40, hitT: 0, r: 24, color: '#fff', boss: true }];
p.dived = false; p.x = midTile * 40 + 20; p.y = 5 * 40 + 20;
B.ostrichLand(p);
const normalBossDmg = 40 - G.enemies[0].hp;
G.enemies[0].hp = 40; p.dived = true;
B.ostrichLand(p);
const diveBossDmg = 40 - G.enemies[0].hp;
ok(diveBossDmg > normalBossDmg, '俯衝對 BOSS 傷害更高（' + diveBossDmg + ' > ' + normalBossDmg + '）');

console.log('=== ⑨ 特效與音效 ===');
ok(/case 'slam':/.test(SRC), '有 slam 音效（低頻重擊）');
ok(/case 'dive':/.test(SRC), '有 dive 音效');
ok(/case 'storm':/.test(SRC), '有 storm 升級音效');
ok(/kind: 'core'/.test(SRC) && /kind === 'core'/.test(SRC), '震波有「核心白閃」特效');
ok(/kind: 'dust'/.test(SRC), '震波有揚塵特效');
ok(/ctx\.shadowBlur = T \* \.30/.test(SRC), '衝擊環帶發光（shadowBlur）');
ok(/Game\.flash/.test(SRC) && /Game\.flash - dt/.test(SRC), '落地白閃有衰減（不會卡在畫面上）');
ok(/rg\.bolt/.test(SRC), '風暴鴕鳥的紫色閃電');
G.rings = [];
G.particles = [];
p.storm = true; p.dived = false; p.x = 5 * 40 + 20; p.y = 5 * 40 + 20;
B.ostrichLand(p);
ok(G.rings.length === 5, '一次落地產生 5 層特效（核心／3 環／揚塵）');
ok(G.particles.length > 20, '一次落地噴出 ' + G.particles.length + ' 顆塵土＋火花');

console.log('=== ⑩ 換騎爆散 ===');
const q = mkP(5 * 40 + 20, 5 * 40 + 20);
G.players = [q];
G.enemies = [{ x: 6 * 40 + 20, y: 5 * 40 + 20, hp: 4, maxHp: 4, hitT: 0, r: 10, color: '#fff' }];
q.dino = true; q.ostrich = true; q.storm = false;
B.takeEgg(q);      // 沒有蛋 → 不會有反應
B.swapMountBurst(q);
ok(G.enemies[0].hp === 2, '換騎爆散對周圍怪造成 2 點傷害（hp ' + G.enemies[0].hp + '/4）');

console.log('=== ⑪ 十語系 ===');
function cols(key) {
  const m = SRC.match(new RegExp('^' + key.replace(/\./g, '\\.') + '\\|(.*)$', 'm'));
  return m ? m[1].split('|').length + 1 : 0;
}
['toast.storm', 'toast.stormBanner', 'mount.dive'].forEach(function (k) {
  ok(cols(k) === 6, k + ' 有 5 種語言（實際 ' + cols(k) + ' 欄）');
});

console.log('\n========================================');
console.log('v4.89 落地重擊／平衡／風暴鴕鳥：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
