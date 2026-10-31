# -*- coding: utf-8 -*-
# v3.2：對戰／線上玩家卡（#pkRoster）從「game-top 下方一橫排」改釘到「最上面工具列左側的空位」
#       → 玩家卡自己那一排消失，遊戲畫面往上延伸、可視範圍更大
import io, sys
PATH = 'index.html'
src = io.open(PATH, encoding='utf-8').read()

# 1) .pkrow 主樣式：改成 fixed 釘在 navBar 那一條的左側
old1 = """  .pkrow {
    display: flex; justify-content: flex-end; align-items: stretch; gap: 7px;
    flex-wrap: nowrap; margin: 0 0 6px; padding: 0 2px; min-height: 0;
  }"""
new1 = """  /* v3.2：玩家卡改釘在最上面工具列（navBar）同一條的左側空位 → 原本那排不占空間，畫面往上延伸 */
  .pkrow {
    position: fixed; top: calc(5px + env(safe-area-inset-top, 0px)); left: 10px;
    z-index: 1100; display: flex; justify-content: flex-start; align-items: center; gap: 7px;
    flex-wrap: nowrap; margin: 0; padding: 2px; min-height: 0;
    max-width: calc(100vw - 340px);   /* 讓開右上的工具列按鈕 */
    overflow-x: auto; scrollbar-width: none;
  }
  .pkrow::-webkit-scrollbar { display: none; }"""
if src.count(old1) != 1:
    print('FAIL old1', src.count(old1)); sys.exit(1)
src = src.replace(old1, new1, 1)

# 2) PC 放大
old2 = """    .pkrow .pcard canvas { width: 42px; height: 42px; }
    .pkrow .pcard { padding: 4px 12px 4px 5px; }
    .pkrow .plabel { font-size: 14px; max-width: 150px; }
    .pkrow .pstars { font-size: 13.5px; }"""
new2 = """    .pkrow .pcard canvas { width: 46px; height: 46px; }
    .pkrow .pcard { padding: 5px 14px 5px 6px; gap: 7px; }
    .pkrow .plabel { font-size: 15px; max-width: 160px; }
    .pkrow .pstars { font-size: 14.5px; }"""
if src.count(old2) != 1:
    print('FAIL old2', src.count(old2)); sys.exit(1)
src = src.replace(old2, new2, 1)

# 3) 手機：貼左上、再縮一點
old3 = "    .pkrow { gap: 4px; margin: 0 0 4px; }"
new3 = "    .pkrow { gap: 4px; left: 8px; padding: 2px; max-width: calc(100vw - 300px); }"
if src.count(old3) != 1:
    print('FAIL old3', src.count(old3)); sys.exit(1)
src = src.replace(old3, new3, 1)

# 4) 版本號
old4 = "const VERSION = '3.1';"
new4 = "const VERSION = '3.2';"
if src.count(old4) != 1:
    print('FAIL ver', src.count(old4)); sys.exit(1)
src = src.replace(old4, new4, 1)

old5 = '<div class="ver beta">測試版 v<span id="verTxt">3.1</span></div>'
new5 = '<div class="ver beta">測試版 v<span id="verTxt">3.2</span></div>'
if src.count(old5) != 1:
    print('FAIL verTxt', src.count(old5)); sys.exit(1)
src = src.replace(old5, new5, 1)

io.open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('v3.2a OK')
