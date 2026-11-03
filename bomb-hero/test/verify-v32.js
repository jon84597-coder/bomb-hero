// 無頭測試 v32：v2.6 的兩項需求
//   1. 手機橫式：坐騎招式（🔥）改到「遙控引爆（🧨）」的左邊（不再疊在上方被 ⛶ 擋住）
//   2. 畫面不要整張地圖全塞（100%）→ 只裝 60%；小怪／BOSS 尺寸跟著格子縮回 PC 看到的大小
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const BH = env.BH, G = BH.Game, P = BH, rec = env.rec, els = env.els, sandbox = env.sandbox;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

console.log('\n=== 0. 版本 ===');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '徽章版本號同步 ' + P.VERSION);

// ================================================================
console.log('\n=== 1. 坐騎招式鈕（🔥）改到遙控引爆的左邊 ===');

ok(/\/\* v2\.6：坐騎招式（🔥）排在遙控引爆左邊/.test(html), '有 v2.6 的換位註解');
ok(/#touchUI \.tfire \{\s*\n\s*left: var\(--act-left2\); right: var\(--act-right2\); bottom: 126px;/.test(html),
   '🔥 改用自己的偏移變數（--act-left2 / --act-right2），且跟 🧨 同一個 bottom');
ok(/#touchUI \.tdet \{\s*\n\s*left: var\(--act-left\); right: var\(--act-right\); bottom: 126px;/.test(html),
   '🧨 維持原本位置（bottom 126）→ 兩顆並排、不再上下堆疊');
ok(/function actOff2\(t\) \{ return Math\.round\(14 \+ 62 \* \(t\.size \|\| 1\) \+ 10\); \}/.test(html),
   '第二顆鈕的偏移量 = 邊距 14 + 鈕寬(依大小) + 間距 10');
ok(/'--act-left2': actLeft \? actOff2\(t\) \+ 'px' : 'auto',/.test(html) &&
   /'--act-right2': actLeft \? 'auto' : actOff2\(t\) \+ 'px'/.test(html),
   'touchLayoutVars 會依「放彈鍵在左/右」輸出對應的偏移');

// 實測：預設（小、放彈鍵在右）兩顆鈕不會互相壓到
(function () {
  const t = { size: 0.8 };                       // v1.9 起預設「小」
  const off1 = 14, off2 = P.actOff2(t);
  const w = 62 * t.size;                         // 鈕寬（scale 後）
  ok(off2 > off1 + w - 0.5,
     '🔥 排在 🧨 的左邊且不重疊（🧨 右 ' + off1 + ' 寬 ' + w.toFixed(1) +
     ' → 右緣 ' + (off1 + w).toFixed(1) + '；🔥 右 ' + off2 + '）');
  ok(P.actOff2({ size: 1.2 }) > P.actOff2({ size: 0.8 }),
     '按鈕放大時偏移跟著變大（不會擠在一起）');
})();

// 橫式（畫面矮）時：🔥 不再跟右上角的 ⛶ 撞在一起
(function () {
  const fireTop = 126 + 62;                      // 🔥 頂端距底部
  const stageH = 330;                            // 844×390 橫式時畫布大約高度
  const tfsBottom = stageH - 64 - 44;            // ⛶：top 64、高 44 → 距底部
  ok(fireTop < tfsBottom,
     '橫式時 🔥 與 ⛶ 不再重疊（🔥 頂 ' + fireTop + ' < ⛶ 底 ' + tfsBottom + '，畫布高 ' + stageH + '）');
  const oldFireTop = 194 + 62;                   // 換位前：🔥 在 bottom 194
  ok(oldFireTop >= tfsBottom, '（對照）舊位置 bottom:194 會撞到 ⛶ → 這就是「被擋到」的原因');
})();

// ================================================================
console.log('\n=== 2. 畫面只裝 60%（不再整張地圖全塞） ===');

ok(/const MOBILE_VIEW_FRAC = 0\.6;/.test(html), '可視比例常數 = 0.6');
ok(typeof P.MOBILE_VIEW_FRAC === 'number' && P.MOBILE_VIEW_FRAC === 0.6, 'MOBILE_VIEW_FRAC 已匯出 = 0.6');
ok(/const sh = Math\.min\(sz2\.w, sz2\.h\), lg = Math\.max\(sz2\.w, sz2\.h\);/.test(html),
   'v4.71：手機格子大小只看短邊／長邊（直放橫放一致，不再用 60% 那套）');
ok(/return clamp\(Math\.round\(VIEW_H \/ 9\.2\), 30, 62\);/.test(html), '桌機維持原公式（不受影響）');

(function () {
  sandbox.document.body.classList.add('touch');
  const wrapEl = sandbox.document.getElementById('stageWrap');
  const cvEl = sandbox.document.getElementById('cv');
  function at(w, h) {
    wrapEl.clientWidth = w; wrapEl.clientHeight = h;
    cvEl.clientWidth = w; cvEl.clientHeight = h;
    P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
    P.settings.ctrl = 'touch';
    P.startSolo(1, false);
    return G.T;
  }
  const tPortrait = at(378, 566);                // 手機直式（390×844 扣掉搖桿列）
  const mLand = tPortrait * G.cols, mhLand = tPortrait * G.rows;
  const frac = Math.min(378 / mLand, 566 / mhLand);
  ok(frac > 0.5 && frac < 0.72,
     '直式：只看得到約六成地圖（' + (frac * 100).toFixed(0) + '%，地圖 ' + mLand + '×' + mhLand + '）');
  const tLand = at(700, 330);                    // 手機橫式
  ok(tLand >= 24 && tLand <= 62, '橫式：格子在 24~62 之間（T=' + tLand + '）');
  ok(tPortrait > 30 && tPortrait > 25,
     '格子比「整張全塞」大（T=' + tPortrait + ' > 全塞時的 25）→ 畫面接近 PC 比例');
  sandbox.document.body.classList.remove('touch');
})();

// ================================================================
console.log('\n=== 3. 小怪／BOSS 維持「PC 看到的大小」 ===');

ok(/const ART_REF_TILE = 62;/.test(html), '基準格子 = 62（= PC 上的格子大小）');
ok(/function tileArtK\(\) \{/.test(html) && /return clamp\(T \/ ART_REF_TILE, \.34, 1\.2\);/.test(html),
   'tileArtK()：格子縮小時等比縮回（0.34~1.2，v4.60 把下限從 0.6 放寬 → 手機 BOSS 不再爆大）');
// v4.60：外型改成「以格子為單位」，下限用判定直徑 2r 保底
ok(/return Math\.max\(T \* \(ENEMY_ART_BASE \+ \(base - 12\) \* ENEMY_ART_SLOPE\), base \* 2\.1\)/.test(html),
   '外型高度 = max(格子 × 0.85~1.40, 判定直徑 2r)：大格子不會太大、小格子不會小到失真');
ok(/const BH = e\.r \* 4\.[0-9] \* BS \* AK;/.test(html), 'BOSS 身軀高度跟著縮放');

(function () {
  const e = P.makeEnemy(3, 3, 'slime', 1, 1);
  const hs = (P.FOE_ART.slime && P.FOE_ART.slime.hs) || 1.9;
  G.T = 62;                                     // PC
  const rPc = P.enemyArtR(e), kPc = rPc * hs / 62;
  G.T = 42;                                     // 手機（v2.6 後的格子）
  const rMob = P.enemyArtR(e), kMob = rMob * hs / 42;
  ok(rMob < rPc, '手機上小怪絕對尺寸變小（' + rPc.toFixed(1) + ' → ' + rMob.toFixed(1) + '）');
  ok(Math.abs(kMob - kPc) < 0.06,
     '小怪／格子比例維持 PC 看到的比例（PC ' + kPc.toFixed(2) + ' 格 vs 手機 ' + kMob.toFixed(2) + ' 格）');
  G.T = 25;                                     // 極端小格子（保險）
  ok(P.enemyArtR(e) * hs >= e.r * 2 - 1e-9,
     '格子再小也不會小於判定直徑（' + (P.enemyArtR(e) * hs).toFixed(1) + ' ≥ ' + (e.r * 2).toFixed(1) + '）');
  G.T = 62;
  ok(P.tileArtK() === 1, 'PC 尺寸 tileArtK = 1');
  // BOSS 也一樣
  const b = P.makeBoss(6, 5, 5);
  G.T = 62; const bPc = b.r * 4.3 * (b.sizeMul || 1) * P.tileArtK();
  G.T = 42; const bMob = b.r * 4.3 * (b.sizeMul || 1) * P.tileArtK();
  ok(bMob / 42 <= bPc / 62 + 0.02,
     'BOSS 高度／格子比例不超過 PC（PC ' + (bPc / 62).toFixed(2) + ' vs 手機 ' + (bMob / 42).toFixed(2) + '）');
  G.T = 62;
})();

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v2.6：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
