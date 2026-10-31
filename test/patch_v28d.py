# -*- coding: utf-8 -*-
# v2.8d：PC 矮視窗（<700px 高）微縮 LOGO／按鈕上下留白 → 整頁一屏放得下（仍比舊版大很多）
import io, sys
PATH = 'index.html'
src = io.open(PATH, encoding='utf-8').read()
old = """  /* v2.8c：PC 矮視窗 → 內容改成向上對齊可捲動；說明卡收起來，選單一屏看得到 */
  @media (max-height: 700px) {
    body { align-items: flex-start; padding-top: 10px; }
    body:not(.touch) .title-card .hint { display: none; }
  }"""
new = """  /* v2.8c：PC 矮視窗 → 內容改成向上對齊可捲動；說明卡收起來，選單一屏看得到 */
  @media (max-height: 700px) {
    body { align-items: flex-start; padding-top: 10px; }
    body:not(.touch) .title-card .hint { display: none; }
    /* v2.8d：矮視窗把 LOGO 上下留白微縮（仍遠大於舊版的 230px 上限） */
    body:not(.touch) .title-card .title-logo { width: clamp(300px, min(52vw, 62vh), 640px); }
    body:not(.touch) .menu .mbtn { padding: 12px 18px; }
    body:not(.touch) .menu { gap: 10px; }
  }"""
if src.count(old) != 1:
    print('FAIL: 目標找不到或重複（%d）' % src.count(old)); sys.exit(1)
src = src.replace(old, new, 1)
io.open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('v2.8d OK')
