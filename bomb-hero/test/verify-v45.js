// 無頭測試 v45（v4.0）：RPG 模式 / 32 張不規則地圖 / 版本更新面板 / 商店
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function cnt(s, re) { const m = s.match(re); return m ? m.length : 0; }

console.log('\n=== 0. 版本 ===');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '徽章版本號同步 ' + P.VERSION);

console.log('\n=== 1. 首頁：RPG 模式鈕（含 Beta 標籤）===');
ok(/<button class="qbtn" id="btnRpg"/.test(html), '冒險選單裡有「RPG 養成模式」鈕（v5.0 起收進冒險入口）');
ok(/class="betaTag">測試版 Beta</.test(html) || html.indexOf('測試版 Beta') > 0, '按鈕標示「測試版 Beta」');
ok(/\.mbtn\.rpgbtn \.betaTag \{/.test(html), 'Beta 標籤有樣式');

console.log('\n=== 2. 首頁：商店（v4.17 已開放）===');
ok(/id="btnStore"/.test(html), '有「商店」鈕');
ok(html.indexOf('商店正在準備中') < 0 && /Shop\.open\(\)/.test(html), '點了會開啟商店（不再是「準備中」提示）');
ok(/\.mbtn\.storebtn/.test(html), '商店鈕有獨立樣式');

console.log('\n=== 3. 首頁：版本更新內容面板 ===');
ok(/id="verLogBtn"/.test(html), '左上角有「版本更新內容」標籤');
ok(/id="verLog"/.test(html) && /id="verLogBody"/.test(html), '有可捲動的更新內容面板');
ok(typeof P.VersionLog === 'object' && typeof P.VersionLog.show === 'function', 'VersionLog 模組可用');
const log = P.VERSION_LOG;
ok(Array.isArray(log) && log.length >= 10, '版本紀錄 ' + log.length + ' 筆（v3.0 起）');
ok(log[0].v === P.VERSION && log[0].now === true, '最新一筆是當前版本 v' + P.VERSION);
ok(log[1].v !== P.VERSION && !log[1].now, '上一筆 v' + log[1].v + ' 已不是「當前版本」');
ok(log.slice(1).every(function (x) { return !x.now; }), '其餘每一筆舊版本都不是「當前版本」');
ok(log.filter(function (x) { return x.v === '4.5'; })[0].items.length >= 5, 'v4.5 條列還在');
ok(log.filter(function (x) { return x.v === '4.4'; })[0].items.length >= 4, 'v4.4 條列還在');
ok(log.filter(function (x) { return x.v === '4.3'; })[0].items.length >= 3, 'v4.3 條列還在（v4.91 起已移除開發者後台相關條目）');
ok(log.filter(function (x) { return x.v === '4.2'; })[0].items.length >= 5, 'v4.2 條列還在');
ok(log.filter(function (x) { return x.v === '4.1'; })[0].items.length >= 5, 'v4.1 條列還在');
ok(log.filter(function (x) { return x.v === '4.0'; })[0].items.length >= 4, 'v4.0 條列還在');
ok(log[log.length - 1].v === '3.0', '最舊一筆是 v3.0（符合「自 Ver 3.0 起」）');
ok(log.every(function (e) { return e.v && e.date && Array.isArray(e.items) && e.items.length; }),
  '每一筆都有版本號、日期與條列內容');
const v40 = (log.filter(function (x) { return x.v === '4.0'; })[0] || { items: [] }).items.join('|');
['RPG 模式', '四維屬性', '32 張', '商店'].forEach(function (k) {
  ok(v40.indexOf(k) >= 0, 'v4.0 條列提到「' + k + '」');
});

console.log('\n=== 4. RPG：四維屬性與配點規則 ===');
ok(Array.isArray(P.RPG_ATTRS) && P.RPG_ATTRS.length === 4, '四大屬性');
ok(P.RPG_ATTRS.map(function (a) { return a.k; }).join(',') === 'hp,def,spd,atk', '屬性為 HP／防禦／速度／攻擊');
ok(P.RPG_POINTS === 9, '只能自由配 9 點');
ok(P.RPG_CAP === 10, '每項上限 10 格');
ok(P.rpgSum({ hp: 3, def: 2, spd: 2, atk: 2 }) === 9, '預設配點剛好 9 點');
ok(P.rpgLeft() === 0, '預設剩餘 0 點');
// 隨機分配 200 次：每次都要剛好 9 點、每項 <= 10
let rndOk = true, rndMin = 99, rndMax = -1;
for (let i = 0; i < 200; i++) {
  const a = P.rpgRandomAlloc();
  const s = a.hp + a.def + a.spd + a.atk;
  if (s !== 9) rndOk = false;
  ['hp', 'def', 'spd', 'atk'].forEach(function (k) { if (a[k] > 10 || a[k] < 0) rndOk = false; });
  rndMin = Math.min(rndMin, s); rndMax = Math.max(rndMax, s);
}
ok(rndOk, '「電腦隨機分配」200 次都剛好 9 點、每項 0~10（實際 ' + rndMin + '~' + rndMax + '）');

console.log('\n=== 5. RPG：配點 → 實際能力換算 ===');
// v5.19：明確關掉天賦與永久強化，只驗「配點 → 數值」這一段
const dOpt = { talent: {}, lv: 1, bonus: { hp: 0, def: 0, fire: 0 } };
const d0 = P.rpgDerive({ hp: 0, def: 0, spd: 0, atk: 0 }, dOpt);
const d9 = P.rpgDerive({ hp: 9, def: 9, spd: 9, atk: 9 }, dOpt);
ok(d0.maxHp === 2, '生命 0 點 → 基礎 2 點生命');
ok(d9.maxHp === 11, '生命 9 點 → 11 點生命（'+d9.maxHp+'）');
ok(d0.armor === 0 && d9.armor === 9, '防禦點數 = 護甲點數');
ok(Math.abs(d9.spdMul - 1.45) < 1e-9, '速度 9 點 → +45%（'+Math.round((d9.spdMul-1)*100)+'%）');
// v5.19：攻擊改成「純傷害」。爆炸範圍改由等級（每 15 級 +1）、永久強化、場上道具提供
ok(d0.range === 2 && P.rpgDerive({ atk: 9 }, dOpt).range === 2, '爆炸範圍只看等級（Lv.1 = 2 格，'+d0.range+'）');
ok(P.rpgDerive({ atk: 0 }, dOpt).range === P.rpgDerive({ atk: 10 }, dOpt).range, '攻擊點數不再改變爆炸範圍');
ok(d0.dmg === 2 && P.rpgDerive({ atk: 9 }, dOpt).dmg === 13, '攻擊 9 點 → 火焰傷害 13（2 + 1.2×9）');
ok(P.rpgDerive({ atk: 10 }, dOpt).dmg === 14, '攻擊 10 點（上限）→ 傷害 14');

console.log('\n=== 6. RPG：怪物血量／防禦分級 ===');
const F = P.RPG_FOE;
['slime', 'beetle', 'crab', 'skull', 'mush', 'lizard', 'bat', 'ghost', 'bee', 'eye'].forEach(function (k) {
  ok(F[k] && F[k].hp >= 1, k + ' 有血量（' + (F[k] ? F[k].hp : '?') + '）');
});
const groundLow = ['slime', 'mush', 'crab'].map(function (k) { return F[k].hp; });
// v4.11 起血量表統一成 FOE_HP：基礎 2~3、中階 4~5、飛行 2~4
// v5.19：傷害變大（最多 14）→ 基礎血量上調到 4~6
ok(Math.min.apply(null, groundLow) >= 4 && Math.max.apply(null, groundLow) <= 6,
  '基礎小怪血量 4~6 格（' + groundLow.join('/') + '）');
const mid = ['beetle', 'skull', 'lizard'].map(function (k) { return F[k].hp; });
// v4.17：中階怪血量調回來（鐵甲蟲 4／骷髏兵 4／疾風蜥 5）
ok(Math.min.apply(null, mid) >= 5 && Math.max.apply(null, mid) <= 6, '中階怪血量 5~6 格（' + mid.join('/') + '）');
ok(F.beetle.def >= 1 && F.skull.def >= 1, '鐵甲蟲／骷髏兵有硬殼防禦');
const fly = ['bat', 'ghost', 'bee', 'eye'].map(function (k) { return F[k].hp; });
ok(Math.min.apply(null, fly) >= 4 && Math.max.apply(null, fly) <= 5, '飛行怪血量 4~5 格（' + fly.join('/') + '）');

console.log('\n=== 7. 32 張地圖架構 ===');
const M = P.MAP32;
ok(Array.isArray(M) && M.length === 32, '共 32 張地圖（實際 ' + (M ? M.length : 0) + '）');
const byTheme = {};
M.forEach(function (m) { byTheme[m.theme] = (byTheme[m.theme] || 0) + 1; });
ok(Object.keys(byTheme).length === 8, '8 大主題');
ok(Object.keys(byTheme).every(function (k) { return byTheme[k] === 4; }), '每個主題各 4 張小地圖');
ok(M.every(function (m) { return m.n && m.shape; }), '每張都有名稱與地形型態');
const shapes = {};
M.forEach(function (m) { shapes[m.shape] = true; });
ok(Object.keys(shapes).length >= 5, '地形型態至少 5 種（' + Object.keys(shapes).join('/') + '）');
ok(M[0].theme === 0 && M[31].theme === 7, '第 1 張屬第 1 主題、第 32 張屬第 8 主題');

console.log('\n=== 8. 不規則地形生成 + 連通檢核 ===');
// 4 種尺寸 × 8 種地形型態全部跑一遍：不得整張都是牆、起點必須走得到大部分地板
const SIZES = { S: [13, 11], M: [15, 13], L: [17, 15], XL: [21, 15] };
let genOk = true, worst = 1, genErr = '';
Object.keys(SIZES).forEach(function (sz) {
  const cols = SIZES[sz][0], rows = SIZES[sz][1];
  ['open', 'island', 'maze', 'bend', 'pillars', 'rings', 'caves', 'arena'].forEach(function (shape) {
    for (let seed = 1; seed <= 3; seed++) {
      let g;
      try { g = P.organicGrid(cols, rows, shape, P.rngFrom(seed * 977 + cols)); }
      catch (e) { genOk = false; genErr = shape + '/' + sz + ': ' + e.message; return; }
      const reach = P.bfsReach(g, cols, rows, 1, 1);
      const ratio = reach.count / (cols * rows);
      if (ratio < .25) { genOk = false; genErr = shape + '/' + sz + ' 可達率只有 ' + ratio.toFixed(2); }
      worst = Math.min(worst, ratio);
      // 邊界必須是牆（不可走出地圖）
      let border = true;
      for (let x = 0; x < cols; x++) if (g[0][x] !== 1 || g[rows - 1][x] !== 1) border = false;
      for (let y = 0; y < rows; y++) if (g[y][0] !== 1 || g[y][cols - 1] !== 1) border = false;
      if (!border) { genOk = false; genErr = shape + '/' + sz + ' 邊界沒封好'; }
      // 起點必須是空的
      if (g[1][1] !== 0) { genOk = false; genErr = shape + '/' + sz + ' 起點被堵住'; }
    }
  });
});
ok(genOk, '4 尺寸 × 8 型態 × 3 種子全部生成成功、邊界封閉、起點可走' + (genErr ? '（' + genErr + '）' : ''));
ok(worst >= .25, '最差的可達率仍有 ' + Math.round(worst * 100) + '%（不會出現只能走一小角的地圖）');

// 不規則：同一型態不同種子要長得不一樣（不是固定模板）
const a1 = JSON.stringify(P.organicGrid(15, 13, 'open', P.rngFrom(11)));
const a2 = JSON.stringify(P.organicGrid(15, 13, 'open', P.rngFrom(22)));
ok(a1 !== a2, '不同種子長出不同地形（不是死板模板）');
const same1 = JSON.stringify(P.organicGrid(15, 13, 'open', P.rngFrom(11)));
ok(a1 === same1, '同一張地圖固定種子 → 每次長一樣（可以記圖）');

// 不規則 ≠ 傳統棋盤：柱子不該全部落在「偶數×偶數」
(() => {
  const g = P.organicGrid(21, 15, 'open', P.rngFrom(77));
  let wall = 0, wallEven = 0;
  for (let y = 1; y < 14; y++) for (let x = 1; x < 20; x++) {
    if (g[y][x] === 1) { wall++; if (x % 2 === 0 && y % 2 === 0) wallEven++; }
  }
  ok(wall > 0 && wallEven / wall < .75, '牆壁不是全落在「偶數×偶數」（只占 ' +
    Math.round(wallEven / wall * 100) + '%，傳統棋盤會是 100%）');
})();

console.log('\n=== 9. RPG 傷害：玩家生命／護甲 ===');
// 造一個假的 RPG 玩家來打
const mkP = function (hp, armor) {
  return {
    alive: true, invuln: 0, dino: false, hpMax: hp, hpCur: hp, armorMax: armor, armorCur: armor,
    ch: { color: '#fff' }, x: 10, y: 10, cry: 0, rpg: { hp: 0, def: 0, spd: 0, atk: 0 }
  };
};
const G = P.Game;
G.rpg = true;
const pa = mkP(3, 2);
P.rpgHurt(pa, false, null);
ok(pa.armorCur === 1 && pa.hpCur === 3, '有護甲時先扣護甲（護甲 2→1，生命不動）');
pa.invuln = 0;
P.rpgHurt(pa, false, null);
ok(pa.armorCur === 0 && pa.hpCur === 3, '護甲扣完才輪到生命');
pa.invuln = 0;
P.rpgHurt(pa, false, null);
ok(pa.hpCur === 2, '護甲沒了 → 生命 -1（' + pa.hpCur + '）');
pa.invuln = 0;
P.rpgHurt(pa, false, { type: 'boss' });
ok(pa.hpCur === 0 && pa.alive === false, 'BOSS 一次 2 點傷害 → 生命歸零、冒險失敗');
const pb = mkP(5, 0);
pb.invuln = 1;
P.rpgHurt(pb, false, null);
ok(pb.hpCur === 5, '無敵時間內不會重複扣血');
// 非 RPG 模式必須完全不影響原本的「一炸就死」
G.rpg = false;
const pc = mkP(5, 0);
let called = false;
const origAlive = pc.alive;
P.rpgHurt(pc, false, null);
ok(pc.hpCur === 5, '非 RPG 模式呼叫 rpgHurt 不會扣血（向後相容）');
G.rpg = true;

console.log('\n=== 10. RPG 火焰傷害看「攻擊」點數 ===');
G.rpg = false;
ok(P.flameHitDamage({ def: 0 }) === 1, '一般模式：火焰傷害固定 1（原行為不變）');
G.rpg = true;
// v5.19：傷害在 startRpg() 就依配點算成 p.rpgDmg（2 + 1.2×atk），火焰只讀這個值
G.players = [{ rpg: { hp: 0, def: 0, spd: 0, atk: 0 }, rpgDmg: 2 }];
ok(P.flameHitDamage({ def: 0 }) === 2, 'RPG 攻擊 0 → 傷害 2');
G.players = [{ rpg: { hp: 0, def: 0, spd: 0, atk: 9 }, rpgDmg: 13 }];
ok(P.flameHitDamage({ def: 0 }) === 13, 'RPG 攻擊 9 → 傷害 13');
ok(P.flameHitDamage({ def: 1 }) === 12, '怪物防禦 1 → 傷害 13-1=12（硬殼有意義）');
ok(P.flameHitDamage({ def: 99 }) === 1, '防禦再高也至少打 1 點（不會完全打不動）');
G.rpg = false;

console.log('\n=== 11. RPG 畫面與接線 ===');
ok(/id="scr-rpg"/.test(html), '有 RPG 模式畫面');
ok(/id="rpgRows"/.test(html) && /id="rpgLeft"/.test(html), '有配點列與剩餘點數');
ok(/id="btnRpgRandom"/.test(html) && /id="btnRpgStart"/.test(html), '有「隨機分配」與「開始冒險」');
ok(/id="segRpgTheme"/.test(html) && /id="segRpgMap"/.test(html), '有主題／地區地圖選擇');
ok(typeof P.startRpg === 'function' && typeof P.buildRpgStage === 'function', 'startRpg／buildRpgStage 已導出');
ok(typeof P.drawRpgHud === 'function', 'RPG 血條 HUD 已導出');
ok(/drawRpgHud\(T\);/.test(html), '主繪製流程有呼叫 RPG 血條');
ok(/if \(Game\.rpg\) \{ rpgHurt\(p, silent, killer\); return; \}/.test(html),
  '所有致死傷害都改走 rpgHurt（單一入口，不會漏）');
ok(/Game\.mode === 'solo' \|\| Game\.mode === 'rpg'/.test(html), 'RPG 共用單人的更新流程');
ok(/const maxStage = SOLO_STAGES;/.test(html), 'v4.14：單人與 RPG 都是 32 關（SOLO_STAGES）');
ok(/p\.rpgSpd \|\| 1/.test(html), '速度點數真的會影響移動速度');

console.log('\n=== 12. 一般模式（非 RPG）不受影響 ===');
G.rpg = false;
G.players = [];
ok(P.rpgDerive && P.RPG_CAP === 10, 'RPG 常數獨立，不會污染一般模式');
ok(html.indexOf('const RPG_POINTS = 9;') > 0, '配點上限寫死在 RPG 專用常數');
ok(/settings\.soloDiff/.test(html) && /SOLO_DIFF/.test(html), '一般闖關的難易度系統仍在');

console.log('\n[v45] ' + pass + ' 通過、' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
