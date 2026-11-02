# -*- coding: utf-8 -*-
# v3.5-d：首頁多了一顆「📖 遊戲說明」→ PC 寬螢幕把提示卡與間距壓緊，選單維持一屏看得到
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read()

old = """  @media (min-width: 900px) {
    .menu .mbtn { font-size: clamp(22px, 2vw, 30px); padding: clamp(16px, 1.8vw, 24px) 20px; }
    .menu .mbtn small { font-size: clamp(13px, 1.05vw, 16px); }
    .title-card .sub { font-size: clamp(14.5px, 1.3vw, 18px); }
  }"""
if s.count(old) != 1:
    print('MISS: PC media query'); sys.exit(1)
new = """  @media (min-width: 900px) {
    .menu .mbtn { font-size: clamp(22px, 2vw, 30px); padding: clamp(16px, 1.8vw, 24px) 20px; }
    .menu .mbtn small { font-size: clamp(13px, 1.05vw, 16px); }
    .title-card .sub { font-size: clamp(14.5px, 1.3vw, 18px); }
    /* v3.5d：選單多了「📖 遊戲說明」→ 提示卡與間距壓緊，7 顆按鈕一樣一屏看得到 */
    .title-card .hint { padding: 9px 14px; line-height: 1.85; margin-top: 14px; }
    .title-card .gap24 { height: 12px !important; }
  }"""
s = s.replace(old, new)
io.open(P, 'w', encoding='utf-8').write(s)
print('patch_v35d OK')
