// v5.2 驗證：教學道具回原位／八王地區元素特效／大逃殺亂入王抽新王／大逃殺地板分區
// 跑法：node test/verify-v502.js
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

// ---------------------------------------------------------------
head('① 教學「實戰演練」撿道具：道具回到原本的軟磚 (4,1)');
ok(SRC.indexOf('tutFixHidden') < 0, '舊的「搬到最遠軟磚」邏輯已移除');
ok(/Game\.hidden\['1,4'\] = 'fire'/.test(SRC), '教學地圖仍把火力藏在 (x=4,y=1) 的軟磚底下');
const softStep = (SRC.match(/\{ key: 'soft'[^\n]*/) || [''])[0];
const itemStep = (SRC.match(/\{ key: 'item'[^\n]*/) || [''])[0];
ok(/mark: \[4, 1\]/.test(softStep), '④ 炸軟磚 標記在 [4,1]', softStep.slice(0, 60));
ok(/mark: \[4, 1\]/.test(itemStep), '⑤ 撿道具 標記在 [4,1]（和炸磚同一格）', itemStep.slice(0, 60));
ok(/Game\.hidden\['8,10'\] = 'door'/.test(SRC), '出口門的藏法沒被動到');

// ---------------------------------------------------------------
head('② 八位 BOSS 的地區屬性元素特效');
const E = B.BOSS_ELEM;
ok(E && Object.keys(E).length === 8, 'BOSS_ELEM 八筆（' + (E ? Object.keys(E).length : 0) + '）');
const kinds = {}, rgbz = {};
let dupK = 0, dupC = 0, thin = 0;
Object.keys(E || {}).forEach(function (n) {
  if (kinds[E[n].k]) dupK++; kinds[E[n].k] = 1;
  if (rgbz[E[n].rgb]) dupC++; rgbz[E[n].rgb] = 1;
  if (!E[n].rgb || !E[n].rgb2 || !(E[n].n >= 8) || !E[n].dot) thin++;
});
ok(dupK === 0, '八種元素造型互不重複（' + Object.keys(kinds).join(' ') + '）');
ok(dupC === 0, '八種元素主色互不重複');
ok(thin === 0, '每筆都有 rgb／rgb2／dot 且粒子數 >= 8');
const k1 = B.bossElemOf({ brBlock: 4 }).k, k2 = B.bossElemOf({ brBlock: 8 }).k;
ok(k1 === 'ember', '第 4 區（熔岩）是火星（' + k1 + '）');
ok(k2 === 'flame', '第 8 區（魔界）是紫焰（' + k2 + '）');
G.stage = 13;                                   // 第 4 區的關卡
ok(B.bossElemOf({}).k === 'ember', '沒有 brBlock 時看當前關卡（大逃殺以外的王）');
ok(typeof B.drawBossElemFx === 'function', 'drawBossElemFx 存在');
// 八隻都要真的畫出東西，而且不能丟錯
let drew = 0, threw = [];
for (let blk = 1; blk <= 8; blk++) {
  env.rec.calls.length = 0;
  try {
    B.drawBossElemFx({ x: 120 + blk, y: 90, brBlock: blk }, 120, 210, 90, 32, 0);
    B.drawBossElemFx({ x: 120 + blk, y: 90, brBlock: blk }, 120, 210, 90, 32, 1);
    if (env.rec.calls.length > 20) drew++;
  } catch (e) { threw.push(blk + ':' + e.message); }
}
ok(threw.length === 0, '八隻都不會丟錯', threw);
ok(drew === 8, '八隻都真的畫出粒子／光環（' + drew + '/8）');
// 前後兩層都要掛在 drawEnemy 的 BOSS 分支裡
ok(SRC.indexOf('drawBossElemFx(e, x, bFoot, BH, T, 0)') > 0, '下層特效（光暈＋光環）在角色後面');
ok(SRC.indexOf('drawBossElemFx(e, x, bFoot, BH, T, 1)') > 0, '上層特效（粒子）在角色前面');
ok(SRC.indexOf('drawBossElemFx') > 0 && SRC.indexOf('function drawBossElemFx') > 0, '繪製函式本體存在');
ok(/const BOSS_ELEM = \{/.test(SRC), 'BOSS_ELEM 常數存在');
// 不能用 Math.random 畫粒子（會每幀亂跳）
const fxBody = (SRC.match(/function drawBossElemFx[\s\S]*?\n\}\n/) || [''])[0];
ok(fxBody.length > 500 && fxBody.indexOf('Math.random') < 0, '粒子位置是確定性的（沒有 Math.random）');

// ---------------------------------------------------------------
head('③ 大逃殺的亂入 BOSS：八隻新王、每場重新洗牌');
ok(/e\.artKey = 'b' \+ blk/.test(SRC), '亂入王會記下自己的美術');
ok(/const key = \(e && e\.artKey\) \|\| bossArtKey\(\)/.test(SRC), 'drawBossSprite 優先用 e.artKey');
ok(/Game\.brBossPool = \[\]/.test(SRC) && /Game\.brBossPoolAt = 0/.test(SRC), 'startBR 會重洗一副 1~8 的牌');
// 行為：給定 pool，生出來的就是那幾隻
try {
  const cols = 40, rows = 30;
  G.cols = cols; G.rows = rows; G.T = 32;
  G.grid = []; G.brIsl = []; G.hazards = [];
  for (let y = 0; y < rows; y++) {
    const gy = [], ir = [];
    for (let x = 0; x < cols; x++) { gy.push(0); ir.push(0); }
    G.grid.push(gy); G.brIsl.push(ir); G.hazards.push(new Array(cols).fill(null));
  }
  G.players = [{ x: 0, y: 0, alive: true, ai: true }];   // 玩家在角落，王不會被擠掉
  G.enemies = [];
  G.brBossPool = [6, 2]; G.brBossPoolAt = 0;
  const n1 = B.spawnBRBosses();
  const got = G.enemies.filter(function (e) { return e.brBoss; });
  ok(n1 >= 1 && got.length === n1, '呼叫 spawnBRBosses 生出 ' + n1 + ' 隻王');
  ok(got.length && got[0].artKey === 'b6' && got[0].brBlock === 6, '第 1 隻是牌堆第 1 張（b6）', got[0] && got[0].artKey);
  if (got.length > 1) ok(got[1].artKey === 'b2', '第 2 隻是牌堆第 2 張（b2）', got[1] && got[1].artKey);
  ok(got.every(function (e) { return e.brStage % 4 === 0; }), 'brStage 落在魔王關（4 的倍數）');
  // 再抽一次要換牌 → 不同場不同王
  G.enemies = []; G.brBossPool = [5, 1]; G.brBossPoolAt = 0;
  B.spawnBRBosses();
  const got2 = G.enemies.filter(function (e) { return e.brBoss; });
  ok(got2.length && got2[0].artKey !== got[0].artKey, '換一副牌就換王（每場不同）', got2[0] && got2[0].artKey);
} catch (e) {
  ok(false, 'spawnBRBosses 執行失敗', e && e.message);
}

// ---------------------------------------------------------------
head('④ 大逃殺地板／外牆：八塊大陸各有自己的地形');
ok(/draw: function \(k, seed, px, py, T, style\)/.test(SRC), 'TileArt.draw 可以指定這一格的風格');
ok(/TileArt\.draw\('floor', x \* 31 \+ y \* 17, px, py, T, st\)/.test(SRC), 'paintFloorStyle 把每格風格傳進去');
ok(SRC.indexOf("const st = style || (Game.theme && Game.theme.style) || '';") > 0, '沒指定風格才退回全場主題（其他模式不變）');
// 行為：整張 BR 地圖每一格都有主題（含外牆／海水）
try {
  G.themeAt = null;
  B.buildBRMap();
  let nul = 0, tot = 0;
  const seen = {};
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    tot++;
    const t2 = G.themeAt[y] && G.themeAt[y][x];
    if (!t2) nul++; else seen[t2.style] = 1;
  }
  ok(nul === 0, '每一格都有主題（外牆也有分區風格）', { nul: nul, tot: tot });
  ok(Object.keys(seen).length >= 6, '至少六種地形同時出現在場上（' + Object.keys(seen).join(' ') + '）');
} catch (e) {
  ok(false, 'buildBRMap 執行失敗', e && e.message);
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.2：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
