# -*- coding: utf-8 -*-
# v4.55 瘦身第二輪：CSS 多行註解「只留第一句」——純註解，不動任何選擇器與數值
import io, re

P = 'index.html'
s = io.open(P, encoding='utf-8').read()
before = len(s.encode())

m = re.search(r'<style[^>]*>', s)
m2 = s.find('</style>')
head, css, tail = s[:m.end()], s[m.end():m2], s[m2:]

KEEP = ['v4.52：首頁 11 顆大按鈕', 'v4.55', '不可把 touch-action']
out = []
pos = 0
cutn = save = 0
for cm in re.finditer(r'/\*.*?\*/', css, re.S):
    body = cm.group(0)
    out.append(css[pos:cm.start()])
    pos = cm.end()
    txt = body[2:-2]
    lines = [l.strip() for l in txt.split('\n') if l.strip()]
    if len(body.encode()) <= 150 or len(lines) < 2 or any(k in txt for k in KEEP):
        out.append(body); continue
    # 找第一行有實質內容的（不是純 ==== 分隔）
    core = ''
    for l in lines:
        t2 = l.strip('/ =*').strip()
        if len(t2) >= 10: core = t2; break
    if not core:
        out.append(body); continue
    # 第一行若太短（只有標題），再接第二行
    if len(core) < 26 and len(lines) > 1:
        for l in lines[lines.index(core) + 1:]:
            t2 = l.strip('/ =*').strip()
            if len(t2) >= 10:
                core = (core.rstrip('：: ') + '：' + t2) if core[-1:] in '：:' else (core + ' ' + t2)
                break
    if len(core) > 120: core = core[:118] + '…'
    new = '/* ' + core + ' */'
    if len(new.encode()) >= len(body.encode()):
        out.append(body); continue
    save += len(body.encode()) - len(new.encode()); cutn += 1
    out.append(new)
out.append(css[pos:])
css2 = ''.join(out)
s = head + css2 + tail
io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('cut %d comments, -%d bytes; now %d bytes / %d chars' % (cutn, before - len(s.encode()), len(s.encode()), len(s)))
