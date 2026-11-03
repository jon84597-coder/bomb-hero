// 無頭測試 v31：v2.5 的兩項需求（第 2 節已同步為 v2.6 的 60% 視野）
//   1. 手機橫放：首頁／單人／對戰／線上／設定重排＋一定可以拖曳捲動
//   2. 遊戲畫面：整張地圖都要看得到（手機），轉直轉橫當下也要重算
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
console.log('\n=== 1. 手機橫放：選單重排＋拖曳捲動 ===');

ok(/@media \(orientation: landscape\) \{/.test(html), '有橫式 media query');
ok(/\/\* v2\.5：手機橫放/.test(html), '橫式版面區塊存在（v2.5 註解）');
ok(/body\.touch #scr-title \.menu \{\s*\n\s*display: grid; grid-template-columns: repeat\(3, 1fr\);/.test(html),
   '首頁選單改 3 欄（6 個項目兩排放得下）');
ok(/body\.touch #scr-title \.title-card \.title-logo \{ width: clamp\(160px, min\(86vw, 108vh\), 480px\); \}/.test(html),
   '橫式時 LOGO 依高度縮小（不會把選單擠出畫面）');
ok(/body\.touch #scr-title \.menu \.mbtn \{ font-size: 14\.5px; padding: 9px 8px/.test(html),
   '橫式時選單按鈕緊湊化');
ok(/body\.touch #scr-solo \.card, body\.touch #scr-battle \.card,\s*\n\s*body\.touch #scr-settings \.card, body\.touch #scr-online \.card \{/.test(html),
   '單人／對戰／設定／線上四頁卡片改兩欄排版');
ok(/body\.touch #scr-solo \.chargrid \{ grid-template-columns: repeat\(8, 1fr\);/.test(html),
   '單人選角 8 隻一行排好');
ok(/body\.touch #scr-solo \.stagegrid \{ grid-template-columns: repeat\(8, (?:minmax\(0, )?1fr\)/.test(html),
   '關卡選擇 8 關一行排好');
ok(/max-height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch;/.test(html),
   '橫式外框允許上下捲動（overflow-y: auto）');
// 內容超過一屏時一定要拖得動：dsFind 要能兜底到整頁
ok(/v2\.5：頁面本身比視窗高時，拖曳直接捲整頁/.test(html), '拖曳捲動有「捲整頁」兜底');
ok(/const se = document\.scrollingElement \|\| document\.documentElement;\s*\n\s*if \(se && se\.scrollHeight > se\.clientHeight \+ 2\) return se;/.test(html),
   '找不到內部可捲容器 → 回傳 scrollingElement（保證拖曳有效）');

// ================================================================
console.log('\n=== 2. 遊戲畫面：手機只裝 60%（v2.6） ===');

ok(/const MOBILE_VIEW_FRAC = 0\.6;/.test(html), '有「手機可視比例」常數 0.6');
ok(/const fw = VIEW_W \/ Game\.cols, fh = VIEW_H \/ Game\.rows;/.test(html),
   '先算寬／高各自的基準格子（v4.47：兩個方向要分開算）');
ok(/return clamp\(Math\.round\(Math\.floor\(Math\.min\(fw, fh\)\) \/ MOBILE_VIEW_FRAC\), 24, 62\);/.test(html),
   '橫放：再放大到只裝 60%（clamp 24~62）');
ok(/if \(VIEW_H > VIEW_W\) \{[\s\S]*?return clamp\(Math\.round\(Math\.min\(fh, VIEW_W \/ 7\.2\)\), 24, 62\);/.test(html),
   '直放：高度優先 ＋ 至少留 7.2 格寬（v4.47 滿版，不能出現上下深色空帶）');
ok(/if \(document\.body && document\.body\.classList\.contains\('touch'\)\) \{/.test(html),
   '只影響手機（touch），桌機維持原本手感');

// 沙盒實測：手機尺寸下，畫面只看到約六成地圖（不再整張塞進去）
(function () {
  sandbox.document.body.classList.add('touch');
  const wrapEl = sandbox.document.getElementById('stageWrap');
  const cv = sandbox.document.getElementById('cv');
  wrapEl.clientWidth = 378; wrapEl.clientHeight = 566;
  cv.clientWidth = 378; cv.clientHeight = 566;
  P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
  P.settings.ctrl = 'touch';
  P.startSolo(1, false);
  const T = G.T, mw = T * G.cols, mh = T * G.rows;
  // v4.47：378×566 是「直放」→ 走新公式（高度優先、至少 7.2 格寬），不再用整張的 60%
  const wantP = Math.min(62, Math.max(24, Math.round(Math.min(566 / G.rows, 378 / 7.2))));
  ok(T === wantP, '直放 T = min(高度基準, 寬/7.2)（' + T + '，預期 ' + wantP + '）');
  ok(mw > 378 || mh > 566, '地圖不再整張塞進畫面（' + mw + '×' + mh + ' vs 378×566）');
  const frac = Math.min(378 / mw, 566 / mh);
  ok(frac > 0.5 && frac < 0.72, '畫面看得到約六成地圖（實測 ' + (frac * 100).toFixed(0) + '%）');

  // 桌機（非 touch）維持原本公式
  sandbox.document.body.classList.remove('touch');
  wrapEl.clientWidth = 1280; wrapEl.clientHeight = 600;
  cv.clientWidth = 1280; cv.clientHeight = 600;
  P.resizeView();
  const tPc = P.tileSize();
  ok(tPc === Math.min(62, Math.max(30, Math.round(600 / 9.2))),
     '桌機維持原公式（T=' + tPc + '，不受 60% 影響）');
  sandbox.document.body.classList.add('touch');
})();

// 轉直轉橫當下：resizeView 要重算 T 並把世界座標等比搬走
(function () {
  const wrapEl = sandbox.document.getElementById('stageWrap');
  const cv = sandbox.document.getElementById('cv');
  wrapEl.clientWidth = 640; wrapEl.clientHeight = 480;
  cv.clientWidth = 640; cv.clientHeight = 480;
  const p = G.players[0];
  G.state = 'play';                     // 遊戲中才會觸發重算（idle 不動）
  p.x = 5 * G.T + G.T / 2; p.y = 3 * G.T + G.T / 2;
  const xBefore = p.x, yBefore = p.y, TBefore = G.T;
  const vi = P.resizeView();
  const TAfter = G.T, k = TAfter / TBefore;
  const fit = Math.floor(Math.min(vi.w / G.cols, vi.h / G.rows));
  ok(TAfter !== TBefore && TAfter === Math.min(62, Math.max(24, Math.round(fit / 0.6))),
     'resizeView 後 T 重算（' + TBefore + ' → ' + TAfter + '）');
  ok(Math.abs(p.x - xBefore * k) < 0.01 && Math.abs(p.y - yBefore * k) < 0.01,
     '玩家世界座標等比重貼（' + Math.round(xBefore) + '→' + Math.round(p.x) + '）');
  ok(G.camSnap === true, '相機直接歸位（不會從舊位置滑過來）');
})();

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v2.5：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
