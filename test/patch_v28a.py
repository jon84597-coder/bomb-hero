# -*- coding: utf-8 -*-
# v2.8a：PC / 手機尺寸各自獨立 + LOGO 放大 + 怪物量增加 + 道具微量增加
# 1. IS_TOUCH 收嚴：觸控筆電／桌機（主要輸入是滑鼠）不再被當成手機 → PC 用回 PC 版大 UI
# 2. PC 矮視窗不再套手機的緊湊排版；PC UI 隨視窗自然放大（大螢幕更大）
# 3. 手機直式 LOGO 放大到快貼齊左右邊（94vw）；橫式也放大（不超過一屏）
# 4. 單人怪物量 base [4,5,6,7,8,9,10] → [6,8,9,11,12,14,15]
# 5. 道具：單人 10+stage → 13+round(stage*1.5)；對戰 14 → 18
import io, re, sys

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8').read()
orig = src
fails = []

def rep(old, new, tag, count=1):
    global src
    n = src.count(old)
    if n < count:
        fails.append('%s: 找不到目標（出現 %d 次，需要 %d）\n---\n%s\n---' % (tag, n, count, old[:200]))
        return
    src = src.replace(old, new, count)
    print('OK  ' + tag)

# ---------- 1. 版本號 ----------
rep("const VERSION = '2.7';", "const VERSION = '2.8';", 'VERSION 常數')
rep('<span id="verTxt">2.7</span>', '<span id="verTxt">2.8</span>', 'HTML 版本徽章')

# ---------- 2. IS_TOUCH 收嚴（觸控 PC 不再誤判成手機） ----------
old_is_touch = """const IS_TOUCH = (function () {
  try {
    return !!(
      ('ontouchstart' in window) ||
      ((navigator.maxTouchPoints || 0) > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    );
  } catch (e) { return false; }
})();"""
new_is_touch = """const IS_TOUCH = (function () {
  try {
    // v2.8：觸控筆電／觸控桌機也有 maxTouchPoints，但不能因此整個變成手機版。
    // 只有「主要輸入是手指（pointer: coarse）或根本沒有滑鼠（hover: none）」才算是手機／平板。
    const mm = window.matchMedia || null;
    const coarse = !!(mm && mm('(pointer: coarse)').matches);
    const noHover = !!(mm && mm('(hover: none)').matches);
    const canTouch = ('ontouchstart' in window) || ((navigator.maxTouchPoints || 0) > 0);
    return !!(canTouch && (coarse || noHover));
  } catch (e) { return false; }
})();"""
rep(old_is_touch, new_is_touch, 'IS_TOUCH 收嚴')

# ---------- 3. PC LOGO：v1.4 淺色主題那條 override 改成「隨視窗自然放大」 ----------
rep("""  /* v2.1：淺色主題下 LOGO 稍微放大一點（圖自帶白描邊，淺底也清楚） */
  .title-card .title-logo { width: clamp(255px, 62vw, 545px); }""",
"""  /* v2.8：PC LOGO 隨視窗自然放大（58vw，同時不超過視窗高的 88%，大螢幕最大 820px） */
  .title-card .title-logo { width: clamp(300px, min(58vw, 88vh), 820px); }""",
'PC LOGO clamp')

# ---------- 4. 矮螢幕緊湊排版改成只給觸控裝置 + PC 矮視窗可捲動不縮 ----------
old_short = """  /* 矮螢幕（手機橫放）：縮小標題區、隱藏說明，讓按鈕一定看得到 */
  @media (max-height: 620px) {
    .title-card { padding: 8px 10px 6px; }
    .title-card .title-logo { width: clamp(150px, 30vw, 230px); }
    .title-card .sub { font-size: 11px; margin-top: 2px; }
    .title-card .hint { display: none; }
    .menu { gap: 9px; margin-top: 10px; }
    .mbtn { padding: 10px 12px; font-size: 18px; border-radius: 15px; }
    .mbtn small { display: none; }
    .gap24 { height: 8px !important; }
  }"""
new_short = """  /* v2.8：矮螢幕緊湊排版只給「觸控裝置」（PC 矮視窗維持大 UI、改成可捲動） */
  @media (max-height: 620px) {
    body.touch .title-card { padding: 8px 10px 6px; }
    body.touch .title-card .title-logo { width: clamp(150px, 30vw, 230px); }
    body.touch .title-card .sub { font-size: 11px; margin-top: 2px; }
    body.touch .title-card .hint { display: none; }
    body.touch .menu { gap: 9px; margin-top: 10px; }
    body.touch .mbtn { padding: 10px 12px; font-size: 18px; border-radius: 15px; }
    body.touch .mbtn small { display: none; }
    body.touch .gap24 { height: 8px !important; }
  }
  /* v2.8：PC（滑鼠／鍵盤）有自己的尺寸 —— UI 隨視窗自然放大，不遷就手機 */
  @media (min-width: 900px) {
    .menu .mbtn { font-size: clamp(22px, 2vw, 30px); padding: clamp(16px, 1.8vw, 24px) 20px; }
    .menu .mbtn small { font-size: clamp(13px, 1.05vw, 16px); }
    .title-card .sub { font-size: clamp(14.5px, 1.3vw, 18px); }
  }
  /* v2.8：PC 矮視窗 → 內容改成向上對齊可捲動，UI 大小一樣不縮 */
  @media (max-height: 700px) {
    body { align-items: flex-start; padding-top: 10px; }
  }"""
rep(old_short, new_short, '矮螢幕規則改觸控限定 + PC 自然縮放')

# ---------- 5. 手機直式 LOGO：放大到快貼齊左右邊 ----------
rep("    body.touch .title-card .title-logo { width: clamp(190px, 62vw, 300px); }",
    "    body.touch .title-card .title-logo { width: clamp(220px, 94vw, 480px); }  /* v2.8：左右快貼齊螢幕邊 */",
    '直式 LOGO 放大')

# ---------- 6. 手機橫式 LOGO：也放大（不超過一屏），並提高優先序蓋過矮螢幕規則 ----------
rep("    body.touch .title-card .title-logo { width: clamp(100px, 34vh, 185px); }",
    "    body.touch #scr-title .title-card .title-logo { width: clamp(160px, min(86vw, 108vh), 480px); }  /* v2.8：橫放也放大，高度不爆屏 */",
    '橫式 LOGO 放大')

# ---------- 7. 單人怪物量增加 ----------
rep("    const base = [4, 5, 6, 7, 8, 9, 10, 0][stage - 1];",
    "    const base = [6, 8, 9, 11, 12, 14, 15, 0][stage - 1];  // v2.8：怪物量增加（難度倍率照舊）",
    '怪物量 base')

# ---------- 8. 道具微量增加 ----------
rep("""    spawns: [{ x: 1, y: 1, fx: 1, fy: 1 }],
    items: 10 + stage,""",
"""    spawns: [{ x: 1, y: 1, fx: 1, fy: 1 }],
    items: 13 + Math.round(stage * 1.5),   // v2.8：道具微量增加""",
    '單人道具數')
rep("""    spawns: spawns,
    items: 14, emptyRate: .35""",
"""    spawns: spawns,
    items: 18, emptyRate: .35   // v2.8：對戰道具微量增加""",
    '對戰道具數')

if fails:
    print('\n FAIL:')
    for f in fails: print(f)
    sys.exit(1)

io.open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('\nv2.8a 套完，%d -> %d bytes' % (len(orig.encode('utf-8')), len(src.encode('utf-8'))))
