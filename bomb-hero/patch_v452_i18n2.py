# -*- coding: utf-8 -*-
# v4.52 patch F：補 4 個短字典鍵（剩餘／縮放／發布／查詢），把 i18n 靜態覆蓋率拉回 ≥85%
import io, re, sys

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
before = len(s)

ROWS = [
    ('剩餘', '縮放', '發布', '查詢'),          # zh-TW
    ('剩余', '缩放', '发布', '查询'),          # zh-CN
    ('Left', 'Zoom', 'Publish', 'Search'),     # en
    ('残り', 'ズーム', '公開', '照会'),         # ja
    ('남은', '확대/축소', '게시', '조회'),      # ko
    ('เหลือ', 'ซูม', 'เผยแพร่', 'สอบถาม'),    # th
    ('Còn lại', 'Thu phóng', 'Đăng', 'Tra cứu'),  # vi
    ('Осталось', 'Масштаб', 'Опубликовать', 'Запрос'),  # ru
    ('Übrig', 'Zoom', 'Senden', 'Abfrage'),    # de
    ('Restano', 'Zoom', 'Pubblica', 'Cerca'),  # it
]

if "'ui.rest'" in s:
    print('  skip already')
else:
    idx = [0]
    def ins(m):
        i = idx[0]; idx[0] += 1
        r = ROWS[i]
        return ("'menu.store.sub': '%s', 'ui.rest': '%s', 'ui.zoom': '%s', "
                "'ui.pub': '%s', 'ui.query': '%s', 'store.note': '" % (m.group(1), r[0], r[1], r[2], r[3]))
    s, n = re.subn(r"'menu\.store\.sub': '([^']*)', 'store\.note': '", ins, s)
    if n != 10:
        print('FAIL count %d' % n); sys.exit(1)
    print('  ok   4 keys x10')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('chars %d -> %d (%+d)' % (before, len(s), len(s) - before))
