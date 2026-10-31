# -*- coding: utf-8 -*-
"""v2.6 測試同步：
   - verify-v31 第 2 節（整張地圖塞得下 → 改成只看 60%）
   - verify-v30 小怪尺寸：沙盒裡先把畫面設成 PC 尺寸（T=62）才量，否則會被格子縮放影響
   - 各檔版本號 2.5 → 2.6
"""
import io, sys

def rd(p): return io.open(p, encoding='utf-8').read()
def wr(p, s): io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

def rep(p, old, new, label, cnt=1):
    s = rd(p)
    if old not in s:
        print('!! 找不到 [%s]：%s' % (p, label)); sys.exit(1)
    if s.count(old) != cnt:
        print('!! %s 出現 %d 次：%s' % (p, s.count(old), label)); sys.exit(1)
    wr(p, s.replace(old, new, cnt))
    print('ok  %s：%s' % (p, label))

# ---------- verify-v31：第 2 節改為 v2.6 的 60% 行為 ----------
p = 'test/verify-v31.js'
s = rd(p)
s = s.replace("ok(P.VERSION === '2.5', '版本 = 2.5');", "ok(P.VERSION === '2.6', '版本 = 2.6');")
s = s.replace("ok(/<span id=\"verTxt\">2\\.5<\\/span>/.test(html), '徽章版本號同步 2.5');",
              "ok(/<span id=\"verTxt\">2\\.6<\\/span>/.test(html), '徽章版本號同步 2.6');")
old2 = s[s.index("console.log('\\n=== 2. 遊戲畫面"):s.index("console.log('\\n' + (fail === 0")]
new2 = """console.log('\\n=== 2. 遊戲畫面：手機只裝 60%（v2.6） ===');

ok(/const MOBILE_VIEW_FRAC = 0\\.6;/.test(html), '有「手機可視比例」常數 0.6');
ok(/const fit = Math\\.floor\\(Math\\.min\\(VIEW_W \\/ Game\\.cols, VIEW_H \\/ Game\\.rows\\)\\);/.test(html),
   '先算「整張塞進去」的基準格子');
ok(/return clamp\\(Math\\.round\\(fit \\/ MOBILE_VIEW_FRAC\\), 24, 62\\);/.test(html),
   '再放大到只裝 60%（clamp 24~62）');
ok(/if \\(document\\.body && document\\.body\\.classList\\.contains\\('touch'\\)\\) \\{/.test(html),
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
  const fit = Math.floor(Math.min(378 / G.cols, 566 / G.rows));
  ok(T === Math.min(62, Math.max(24, Math.round(fit / 0.6))),
     'T = 基準格子 / 0.6（' + T + '，基準 ' + fit + '）');
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
  wrapEl.clientWidth = 700; wrapEl.clientHeight = 330;
  cv.clientWidth = 700; cv.clientHeight = 330;
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

"""
s = s.replace(old2, new2, 1)
s = s.replace("// 無頭測試 v31：v2.5 的兩項需求", "// 無頭測試 v31：v2.5 的兩項需求（第 2 節已同步為 v2.6 的 60% 視野）")
s = s.replace("' ✅' : '❌') + ' v2.5：'", "' ✅' : '❌') + ' v2.5：'")
wr(p, s)
print('ok  verify-v31 第 2 節改為 60%')

# ---------- verify-v30：量小怪尺寸前先把畫面設成 PC 尺寸 ----------
p = 'test/verify-v30.js'
s = rd(p)
if 'v2.6：量測前先把畫面設成 PC 尺寸' not in s:
    old = "// 真的畫出來"
    idx = s.index(old) if old in s else -1
    if idx < 0:
        print('!! v30 找不到插入點'); sys.exit(1)
    ins = """// v2.6：小怪美術尺寸會跟著格子縮放 → 量測前先把畫面設成 PC 尺寸（T=62）
(function () {
  const wrapEl = sandbox.document.getElementById('stageWrap');
  const cvEl = sandbox.document.getElementById('cv');
  wrapEl.clientWidth = 1280; wrapEl.clientHeight = 600;
  cvEl.clientWidth = 1280; cvEl.clientHeight = 600;
  P.resizeView();
})();
ok(G.T === 62, '量測基準：格子 = PC 的 62（實測 T=' + G.T + '）');
ok(P.tileArtK() === 1, 'PC 尺寸下 tileArtK = 1（不縮放）');

// 真的畫出來"""
    s = s[:idx] + ins + s[idx + len(old):]
    wr(p, s)
    print('ok  verify-v30 量測前固定 PC 尺寸')
else:
    print('--  verify-v30 已處理')

# ---------- 版本號 2.5 → 2.6 ----------
for p in ('test/verify-v26.js', 'test/verify-v27.js', 'test/verify-v28.js',
          'test/verify-v29.js', 'test/verify-v30.js', 'test/verify-v31.js'):
    s = rd(p)
    n = s
    n = n.replace("P.VERSION === '2.5'", "P.VERSION === '2.6'")
    n = n.replace('版本 = 2.5（', '版本 = 2.6（')
    n = n.replace('id="verTxt">2.5<', 'id="verTxt">2.6<')
    n = n.replace('id=\\"verTxt\\">2\\.5<', 'id=\\"verTxt\\">2\\.6<')
    n = n.replace('測試版 v2.5', '測試版 v2.6').replace('版本號同步 2.5', '版本號同步 2.6')
    if n != s:
        wr(p, n)
        print('ok  %s 版本號 2.6' % p)
