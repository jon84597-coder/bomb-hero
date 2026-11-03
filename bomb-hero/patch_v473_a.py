# -*- coding: utf-8 -*-
"""patch_v473_a.py — v4.73：三島拉開距離（原本島與島黏成一塊、窄橋看不出來）＋地圖放大到 56x44"""
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, tag, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print('FAIL[%s] count=%d want=%d' % (tag, n, cnt)); sys.exit(1)
    s = s.replace(old, new)
    print('ok[%s]' % tag)

# 1) BR 常數：地圖 56x44（T5 的 3.5 倍）、三島各自縮小並拉開（原本島與島直接重疊）
rep("""const BR = {
  W: 48, H: 38, N: 8, FOES: 14,
  // [等待秒數, 目標半徑（格）]
  PH: [[26, 24], [22, 16], [16, 9], [12, 4.5]],
  // 名次 1~8 的金幣獎勵
  GOLD: [1200, 700, 450, 300, 200, 150, 100, 80],
  ISL: [
    { cx: 12, cy: 12, r: 8.6 },
    { cx: 35, cy: 12, r: 8.6 },
    { cx: 24, cy: 27, r: 9.2 }
  ],
  on: function () { return Game.mode === 'br'; }
};""",
"""const BR = {
  W: 56, H: 44, N: 8, FOES: 14,
  // [等待秒數, 目標半徑（格）]
  PH: [[26, 30], [20, 20], [14, 12], [10, 5]],
  // 名次 1~8 的金幣獎勵
  GOLD: [1200, 700, 450, 300, 200, 150, 100, 80],
  // v4.73：三島半徑縮小、圓心拉開 → 島與島之間真的隔著海，只剩兩條窄橋相連
  //   （舊版 r8.6 配上 19 格的圓心距，三座島直接黏成一整塊大陸，窄橋被蓋在陸地裡看不出來）
  ISL: [
    { cx: 13, cy: 13, r: 7.6 },
    { cx: 43, cy: 13, r: 7.6 },
    { cx: 28, cy: 32, r: 8.0 }
  ],
  on: function () { return Game.mode === 'br'; }
};""", 'BR-const')

# 2) 毒圈起始半徑要蓋得住整張新地圖（C 到最遠角 29.2 格）
rep("Game.brZone = { cx: BR.ISL[2].cx, cy: BR.ISL[2].cy, r: 34, tr: 34, phase: 0, t: BR.PH[0][0] };",
    "Game.brZone = { cx: BR.ISL[2].cx, cy: BR.ISL[2].cy, r: 40, tr: 40, phase: 0, t: BR.PH[0][0] };",
    'zone-r')

# 3) 開場橫幅不要寫死尺寸
rep("    sub: '48×38 的超大地圖 · ' + BR.N + ' 人同場 · ' + Game.enemies.length + ' 隻小怪\\n' +",
    "    sub: BR.W + '×' + BR.H + ' 的超大地圖 · ' + BR.N + ' 人同場 · ' + Game.enemies.length + ' 隻小怪\\n' +",
    'banner-size')

# 4) 入口卡文案
rep("    '<p>48×38 的超大地圖切成 <b>三座島</b>，中間只有兩條 3 格寬的窄橋。' +",
    "    '<p>' + BR.W + '×' + BR.H + ' 的超大地圖切成 <b>三座島</b>，中間只有兩條 3 格寬的窄橋 —— 過橋就是別人的地盤。' +",
    'card-size')

# 5) 註解與歷史紀錄裡的尺寸
rep("//   · 48×38＝1,824 格（T5 的 2.6 倍）：三座島 + 兩條 3 格寬的窄橋",
    "//   · 56×44＝2,464 格（T5 的 3.5 倍）：三座島 + 兩條 3 格寬的窄橋", 'comment-size')
rep("//   48×38＝1,824 格整張畫一次要 10ms 以上（手機再翻倍），且大部分根本在畫面外。",
    "//   56×44＝2,464 格整張畫一次要 10ms 以上（手機再翻倍），且大部分根本在畫面外。", 'comment-size2')
rep("// v4.72：加上「這張地圖的流水號」。大逃殺每一場都是 48×38、sdList 也都是空的，",
    "// v4.72：加上「這張地圖的流水號」。大逃殺每一場都是同一種尺寸、sdList 也都是空的，", 'comment-seq')
rep("    '🏝️ 大逃殺（三島）真的開放了：48×38 的超大地圖（隨機地圖 T5 的 2.6 倍）切成三座島，中間只有兩條 3 格寬的窄橋',",
    "    '🏝️ 大逃殺（三島）真的開放了：超大地圖（隨機地圖 T5 的 2.6 倍）切成三座島，中間只有兩條 3 格寬的窄橋',",
    'log-472')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done', len(s))
