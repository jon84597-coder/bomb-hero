# -*- coding: utf-8 -*-
# v2.8b：手機直式 LOGO 左右對稱貼邊（margin:0 auto 在「LOGO 比容器寬」時會失效 → 用 calc 手動置中）
import io, sys
PATH = 'index.html'
src = io.open(PATH, encoding='utf-8').read()
old = "    body.touch .title-card .title-logo { width: clamp(220px, 94vw, 480px); }  /* v2.8：左右快貼齊螢幕邊 */"
new = """    /* v2.8b：LOGO 比容器寬時 margin:0 auto 會失效（偏一邊）→ 用 calc 手動置中，左右對稱貼邊 */
    body.touch .title-card .title-logo {
      width: clamp(220px, 95vw, 500px); max-width: none;
      margin-left: calc((100% - clamp(220px, 95vw, 500px)) / 2);
    }"""
if src.count(old) != 1:
    print('FAIL: 目標找不到或重複（%d）' % src.count(old)); sys.exit(1)
src = src.replace(old, new, 1)
io.open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('v2.8b OK')
