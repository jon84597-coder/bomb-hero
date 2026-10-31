# -*- coding: utf-8 -*-
# v3.5-c：說明頁視覺修正
#   1) 道具小圖改用奶油色圓牌（原本繼承全域 canvas 深色底 → 深色道具看不清）
#   2) 坐騎卡改成 2 欄（原本 3 欄文字被擠到直書）
#   3) drawDino 支援 p.noLabel（說明頁不要畫「吐火 OK」標籤，會被畫布邊緣裁掉）
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, label):
    global s
    if s.count(old) != 1:
        print('MISS: ' + label); sys.exit(1)
    s = s.replace(old, new)
    print('ok: ' + label)

# 1) 小圖底色：道具＝奶油圓牌；怪物／坐騎＝深色相框（圖鑑感）
rep("""  .hcard .hico { flex: 0 0 auto; }""",
    """  .hcard .hico { flex: 0 0 auto; }
  /* v3.5c：全域 canvas 有深色底 —— 道具改奶油圓牌（深色道具才看得清），怪物／坐騎維持深色相框 */
  .hcard canvas.hico[data-sp^="item:"] {
    background: radial-gradient(circle at 50% 42%, #fffaf0, #ffe9c2);
    border-radius: 16px; box-shadow: inset 0 0 0 2px rgba(214, 172, 124, .55);
  }
  .hcard canvas.hico[data-sp^="foe:"], .hcard canvas.hico[data-sp^="ride:"] {
    background: linear-gradient(180deg, #17203a, #0a0f1c);
    border-radius: 16px; box-shadow: 0 6px 14px -8px rgba(10, 16, 30, .7);
  }""", '小圖底色')

# 2) 坐騎卡 2 欄
rep("""  .hride { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }""",
    """  .hride { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 10px; }""",
    '坐騎卡欄數')

# 3) drawDino：p.noLabel → 不畫頭頂的「吐火 OK／冷卻」標籤（遊戲中不受影響）
rep("""  // 冷卻／可用提示（頭上方；用文字不用 emoji，任何裝置都看得到）
  const cd = p.fireCd || 0;""",
    """  // 冷卻／可用提示（頭上方；用文字不用 emoji，任何裝置都看得到）
  // v3.5c：p.noLabel = 說明頁畫小圖時不要這行字（會被小畫布邊緣裁掉）
  if (p.noLabel) return;
  const cd = p.fireCd || 0;""", 'drawDino noLabel')

# 4) 說明頁的坐騎小圖：不要標籤、尺寸微調（130×164，龍頭不會被切）
rep("""      x: w / 2, y: h * .66, facing: 'right', dino: true, redDragon: !!red,
      dinoT: 1.2, walkT: .3, moving: false, fireCd: 0, chIdx: 0""",
    """      x: w / 2, y: h * .68, facing: 'right', dino: true, redDragon: !!red, noLabel: true,
      dinoT: 1.2, walkT: .3, moving: false, fireCd: 0, chIdx: 0""", 'drawHelpRide noLabel')
rep("""        h += '<canvas class="hico" data-sp="' + r.sp + '" data-w="120" data-h="170"></canvas>';""",
    """        h += '<canvas class="hico" data-sp="' + r.sp + '" data-w="130" data-h="164"></canvas>';""",
    '坐騎小圖尺寸')

io.open(P, 'w', encoding='utf-8').write(s)
print('patch_v35c OK')
