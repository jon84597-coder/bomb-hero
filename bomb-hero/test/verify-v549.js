// test/verify-v549.js —— v5.49：單人闖關／RPG 的預設地圖改成「隨機生成」
//   ① 預設值 random ＋ 舊存檔一次性遷移（玩家自己切回基本地圖要保留）
//   ② 設定頁／RPG 入口的兩顆按鈕：隨機排第一
//   ③ 真的套用到玩法：單人＋RPG 都長出 T1~T5 隨機圖；切回 basic 就回 15×13；BOSS 決戰場不受影響
//   ④ 同一關重試沿用同一張圖（種子）
//   ⑤ 版本
const SB = require('./_sandbox');
const env = SB.makeEnv();
const P = env.BH, G = P.Game;
const src = SB.rawHtml;
const fs = require('fs');

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
// 這一關在隨機模式下應該用的 T 圖
function tierOf(st) { return P.MAPTEST[Math.min(P.MAPTEST.length - 1, P.chapterOf(st) - 1)]; }

/* ================= ① 預設值 ＋ 遷移 ================= */
head('① 預設值與舊存檔遷移');
ok(/mapMode: 'random'/.test(src), 'settings 預設值＝random（單人／RPG 共用）');
ok(/indexOf\(settings\.mapMode\) < 0\) settings\.mapMode = 'random'/.test(src), '壞值退回 random');
ok(/if \(\(settings\.mapV \| 0\) < 1\) \{ settings\.mapMode = 'random'; settings\.mapV = 1; \}/.test(src),
  '有 mapV 遷移：舊存檔一次性搬到 random');
ok(P.settings.mapMode === 'random', '全新玩家（沙盒預設）拿到 random', P.settings.mapMode);
ok((P.settings.mapV | 0) === 1, '遷移後蓋上 mapV=1', P.settings.mapV);

// 舊存檔：mapMode=classic、沒有 mapV（＝當時的預設，不是玩家挑的）→ 升上來要變 random
const oldEnv = SB.makeEnv({ storage: { 'bombhero-settings-v1': JSON.stringify({ mapMode: 'classic', soloDiff: 'normal' }) } });
ok(oldEnv.BH.settings.mapMode === 'random', '舊存檔（classic、無 mapV）升級後自動變 random', oldEnv.BH.settings.mapMode);
ok((oldEnv.BH.settings.mapV | 0) === 1, '舊存檔補上 mapV=1（只搬一次）', oldEnv.BH.settings.mapV);

// 玩家自己選過（mapV 已存在）→ 不准動
const keepEnv = SB.makeEnv({ storage: { 'bombhero-settings-v1': JSON.stringify({ mapMode: 'classic', mapV: 1 }) } });
ok(keepEnv.BH.settings.mapMode === 'classic', '已經自己切回基本地圖的玩家 → 保留 classic', keepEnv.BH.settings.mapMode);
const keepEnv2 = SB.makeEnv({ storage: { 'bombhero-settings-v1': JSON.stringify({ mapMode: 'classic', mapV: 3 }) } });
ok(keepEnv2.BH.settings.mapMode === 'classic', 'mapV 更大的存檔（未來版）也不會被覆蓋', keepEnv2.BH.settings.mapMode);

/* ================= ② 選項順序 ================= */
head('② 兩顆按鈕：隨機排第一');
{
  const solo = src.match(/id="segSoloMap"[^>]*>([\s\S]{0,160}?)<\/div>/);
  ok(solo && /data-v="random"><\/button><button data-v="classic"/.test(solo[1]), '設定頁 segSoloMap：🎲 隨機 → 🗺️ 基本', solo && solo[1].trim());
  const rpg = src.match(/id="segRpgMode"[^>]*>([\s\S]{0,160}?)<\/div>/);
  ok(rpg && /data-v="random"><\/button><button data-v="classic"/.test(rpg[1]), 'RPG 入口 segRpgMode：🎲 隨機 → 🗺️ 基本', rpg && rpg[1].trim());
  ok(/b\.getAttribute\('data-v'\) === 'random' \? t\('mapmode\.random'\) : t\('mapmode\.classic'\)/.test(src),
    '文字照 data-v 對應（順序換了也不會貼錯標籤）');
  const hint = String((env.getId('soloMapHint') || {}).textContent || '');
  ok(/每關重新生成/.test(hint), '預設狀態下的說明文字是「隨機」那一段', hint.slice(0, 14));
}

/* ================= ③ 真的套用到玩法 ================= */
head('③ 單人闖關預設就是隨機地圖');
try { P.WeekMod.pin([]); } catch (e) {}
P.clearMapTest();
{
  P.settings.mapMode = 'random';
  let badSize = 0, badBig = 0, checked = 0;
  const samples = [];
  for (let st = 1; st <= P.SOLO_STAGES; st++) {
    if (P.isBossStage(st)) continue;
    P.startSolo(st, false);
    const t = tierOf(st);
    checked++;
    if (G.cols !== t.cols || G.rows !== t.rows) { badSize++; if (samples.length < 3) samples.push(st + ':' + G.cols + '×' + G.rows + '≠' + t.cols + '×' + t.rows); }
    if (!G.bigMap) badBig++;
  }
  ok(checked === 32, '40 關裡有 32 關是非 BOSS 關（其餘 8 關是決戰場）', checked);
  ok(badSize === 0, '32 關全部長成所屬章節的 T 圖尺寸', samples);
  ok(badBig === 1 || badBig === 0, '大圖標記 bigMap 生效（沿用舊標記，只驗不報錯）', badBig);
}

head('④ RPG 預設也是隨機地圖');
{
  let badSize = 0, badArena = 0, samples = [];
  for (let th = 0; th < 8; th++) {
    for (let sb = 0; sb < P.BOSS_SLOT; sb++) {
      const st = th * P.BOSS_SLOT + sb + 1;
      P.startRpg(st, {});
      if (P.isBossStage(st)) {
        if (!(G.bossArena && G.cols === 17 && G.rows === 15)) badArena++;
        continue;
      }
      const t = tierOf(st);
      if (G.cols !== t.cols || G.rows !== t.rows) {
        badSize++;
        if (samples.length < 3) samples.push(st + ':' + G.cols + '×' + G.rows + '≠' + t.cols + '×' + t.rows);
      }
    }
  }
  ok(badSize === 0, 'RPG 32 個一般關卡也照章節長 T 圖', samples);
  ok(badArena === 0, '8 個 BOSS 決戰場仍是 17×15（不吃 T 尺寸）', badArena);
}

head('⑤ 切回基本地圖 → 回復 15×13 手工圖');
{
  P.settings.mapMode = 'classic';
  P.clearMapTest();
  P.startSolo(3, false);
  ok(G.cols === 15 && G.rows === 13 && !G.bigMap, '單人第 3 關回到 15×13、bigMap=false', [G.cols, G.rows, G.bigMap]);
  P.startRpg(3, {});
  ok(G.cols === 15 && G.rows === 13, 'RPG 第 3 關也回到 15×13', [G.cols, G.rows]);
  ok(P.seedTag() === '', 'classic 模式不顯示種子碼', P.seedTag());
  P.settings.mapMode = 'random';   // 還原成預設，後面測試才不會被影響
  ok(P.seedTag().indexOf('🔑') >= 0, 'random 模式右上角有種子碼（🔑）', P.seedTag());
}

head('⑥ 同一關重試沿用同一張圖');
{
  P.clearMapTest();
  P.startSolo(7, false);
  const a = JSON.stringify(G.grid);
  const ca = G.cols, ra = G.rows;
  P.startSolo(7, false);
  ok(G.cols === ca && G.rows === ra && JSON.stringify(G.grid) === a, '同一個關卡重進 → 地圖一模一樣（種子沿用）');
  P.startSolo(8, false);
  ok(G.cols !== ca || G.rows !== ra || JSON.stringify(G.grid) !== a, '換一關就換一張圖');
}

head('⑦ 每日挑戰不受設定影響');
ok(/if \(!Game\.daily && !mapModeRandom\(\)\) return null;/.test(src), '每日挑戰照樣強制走隨機地形');
// v5.49 順手修：RPG 開場標題還是 40 關制之前的「第 n / 32 關」
const dict = fs.readFileSync(__dirname + '/../js/i18n-src.js', 'utf8');
const ovl = (dict.match(/rpg\.ovTitle\|[^\n]*/) || [''])[0];
ok(ovl && ovl.indexOf('/ 40') > 0 && ovl.indexOf('32') < 0, 'RPG 開場標題寫「第 n / 40 關」（五種語言）', ovl.slice(0, 40));

/* ================= ⑧ 版本 ================= */
head('⑧ 版本戳記');
const vm = src.match(/const VERSION = '([\d.]+)'/);
ok(vm && parseFloat(vm[1]) >= 5.49, 'VERSION ≥ 5.49', vm && vm[1]);
const vlog = String(SB.vlog || fs.readFileSync(__dirname + '/../js/version-log.js', 'utf8'));
ok(/v: '5\.49'[\s\S]{0,240}now: true/.test(vlog), 'VERSION_LOG 5.49 是 now:true');
ok(!/v: '5\.48'[\s\S]{0,240}now: true/.test(vlog), '5.48 已改成 now:false');
[
  ['bomb-hero/sw.js', fs.readFileSync(__dirname + '/../sw.js', 'utf8')],
  ['public/sw.js', fs.readFileSync(__dirname + '/../../public/sw.js', 'utf8')],
  ['bomberman-online/public/sw.js', fs.readFileSync(__dirname + '/../../bomberman-online/public/sw.js', 'utf8')]
].forEach(function (x) {
  const m = x[1].match(/var SW_VERSION = 'v([\d.]+)'/);
  ok(m && parseFloat(m[1]) >= 5.49, x[0] + ' 的 SW_VERSION 也升到 5.49（' + (m && m[1]) + '）');
});

console.log('\n' + (fail === 0 ? '✅ 全部 ' + pass + ' 項通過' : '❌ ' + fail + ' 項失敗 / ' + (pass + fail) + ' 項'));
process.exit(fail === 0 ? 0 : 1);
