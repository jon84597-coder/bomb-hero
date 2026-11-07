// v5.3 驗證：換模式／換地圖的「逐格狀態」要清乾淨（大逃殺 → 單人不再混素材）＋ 落石要畫出來
// 跑法：node test/verify-v503.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }

const SRC = require('./_sandbox').rawHtml;
const env = makeEnv();
const B = env.BH, G = env.G;

// ---------------------------------------------------------------
head('① 統一的逐格清理入口 resetMapCellState()');
ok(/function resetMapCellState\(\)/.test(SRC), '函式存在');
const rsBody = (SRC.match(/function resetMapCellState\(\)[\s\S]*?\n\}\n/) || [''])[0];
ok(rsBody.length > 200, '函式本體有內容（' + rsBody.length + ' 字元）');
[
  ['Game.themeAt = null', '逐格主題'],
  ['Game.brIsl = null', '大逃殺島嶼編號'],
  ['Game.wallKind = null', '牆分類'],
  ['Game.wallSize = null', '牆分類的尺寸戳記'],
  ['Game.sdRock = null', '縮圈落石'],
  ['Game.sdActive = false', '縮圈旗標'],
  ['Game.artK = 1', '怪物比例'],
  ['BR_AI.on = false', '大逃殺 AI 節奏'],
  ['Game.mapSeq', '地圖序號（烘焙快取）']
].forEach(function (p) {
  ok(rsBody.indexOf(p[0]) >= 0, '清掉 ' + p[1] + '（' + p[0] + '）');
});
// 三個地圖產生器都要走同一支（buildBRMap 自己維護，其餘兩個必經 reset）
ok((SRC.match(/resetMapCellState\(\)/g) || []).length >= 3, '至少三處引用（定義 + buildMap + buildOrganicMap）');

// ---------------------------------------------------------------
head('② 行為：玩完大逃殺 → 進單人／隨機圖，不會混到別張關卡的素材');
try {
  B.buildBRMap();                       // 先弄一張 44×56 的八區大陸圖
  const brThemeAt = G.themeAt;
  ok(brThemeAt && brThemeAt.length > 20, '大逃殺地圖有逐格主題（' + (brThemeAt ? brThemeAt.length : 0) + ' 列）');
  ok(G.artK !== 1, '大逃殺把怪物比例調成 ' + G.artK);
  const seq0 = G.mapSeq | 0;

  const theme = G.theme;                // 隨便一個主題物件
  B.buildOrganicMap(15, 13, theme, { shape: 'open' }, B.rngFrom(12345), { seed: 12345 });

  ok(G.cols === 15 && G.rows === 13, '單人地圖尺寸 15×13（' + G.cols + '×' + G.rows + '）');
  ok(G.themeAt === null, '進單人後 themeAt 已清空（不是大逃殺那張 44×56）', G.themeAt && G.themeAt.length);
  ok(G.brIsl === null, 'brIsl 已清空');
  ok(G.artK === 1, '怪物比例回到 1（實際 ' + G.artK + '）');
  ok(G.sdActive === false && !G.sdRock, '縮圈落石狀態沒有被帶進來');
  ok((G.mapSeq | 0) > seq0, 'mapSeq 有遞增（地板烘焙快取會重烘）');
} catch (e) {
  ok(false, 'buildBRMap → buildOrganicMap 執行失敗', e && e.message);
}

// buildMap（對戰／經典棋盤）同樣要清
try {
  B.buildBRMap();
  B.buildMap(15, 13, G.theme, { spawns: [{ x: 1, y: 1 }], items: 0 });
  ok(G.themeAt === null, 'buildMap 之後 themeAt 也是 null');
  ok(G.artK === 1, 'buildMap 之後 artK 回到 1');
  ok(G.cols === 15, 'buildMap 尺寸正確');
} catch (e) {
  ok(false, 'buildBRMap → buildMap 執行失敗', e && e.message);
}

// ---------------------------------------------------------------
head('③ 牆分類一變，烘好的地板分塊一定要重烘（落石才畫得出來）');
ok(/function markWallKinds\(\)/.test(SRC), 'markWallKinds 存在');
const mkBody = (SRC.match(/function markWallKinds\(\)[\s\S]*?\n\}\n/) || [''])[0];
ok(mkBody.indexOf('floorChunkDirty(null)') > 0, 'markWallKinds 會丟掉地板烘焙快取（整張重算時）');
ok(mkBody.indexOf('floorChunkDirty(x, y)') > 0, '只丟「真的變了」的格子所屬分塊（不會每顆石頭整張重烘）');
ok(/Game\.wallSize = cols \+ 'x' \+ rows;/.test(mkBody), '仍然會記下牆分類的尺寸');
ok(mkBody.indexOf('const prev = Game.wallKind') > 0, '有拿舊分類來比對');
// 突死縮圈：落石改 grid 之後要當場重算牆（並清掉對應分塊）
ok(/markWallKinds\(\);/.test(SRC.slice(SRC.indexOf('Game.sdRock[c[1] * Game.cols + c[0]] = 1'), SRC.indexOf('Game.sdRock[c[1] * Game.cols + c[0]] = 1') + 400)),
  '落石落下時會當場 markWallKinds()');
ok(/Game\.sdRock\[c\[1\] \* Game\.cols \+ c\[0\]\] = 1/.test(SRC), '落石仍會記錄在 sdRock（要整片畫出來）');

// ---------------------------------------------------------------
head('④ 其他模式：重置後不會留下大逃殺的殘留');
try {
  B.buildBRMap();
  const brCols = G.cols;
  B.buildOrganicMap(15, 13, G.theme, { shape: 'open' }, B.rngFrom(999), { seed: 999 });
  ok(G.cols !== brCols && G.cols === 15, '地圖尺寸換回單人的（' + G.cols + '）');
  ok(!G.themeAt, '沒有 themeAt 陣列跟著跑進新地圖');
  // themeAtCell 在沒有 themeAt 時要回傳全場主題（不能爆）
  ok(typeof B.buildSoloStageInner === 'function', 'buildSoloStageInner 仍可用');
} catch (e) {
  ok(false, '重置流程執行失敗', e && e.message);
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.3：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
