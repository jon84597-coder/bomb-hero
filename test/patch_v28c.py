# -*- coding: utf-8 -*-
# v2.8c：PC 矮視窗把說明卡收起來 → 選單按鈕完整在一屏內
import io, sys
PATH = 'index.html'
src = io.open(PATH, encoding='utf-8').read()
old = """  /* v2.8：PC 矮視窗 → 內容改成向上對齊可捲動，UI 大小一樣不縮 */
  @media (max-height: 700px) {
    body { align-items: flex-start; padding-top: 10px; }
  }"""
new = """  /* v2.8c：PC 矮視窗 → 內容改成向上對齊可捲動；說明卡收起來，選單一屏看得到 */
  @media (max-height: 700px) {
    body { align-items: flex-start; padding-top: 10px; }
    body:not(.touch) .title-card .hint { display: none; }
  }"""
if src.count(old) != 1:
    print('FAIL: 目標找不到或重複（%d）' % src.count(old)); sys.exit(1)
src = src.replace(old, new, 1)
io.open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('v2.8c OK')
