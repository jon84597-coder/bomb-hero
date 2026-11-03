import io, re, os

HERE = os.path.dirname(os.path.abspath(__file__))

def load(p):
    d = {}
    if not os.path.exists(p):
        return d
    for l in io.open(p, encoding='utf-8'):
        if ' :: ' not in l:
            continue
        f, rest = l.split(' :: ', 1)
        items = [re.sub(r'^\s*\u2717\s*FAIL:\s*', '', x.strip()) for x in rest.split('|') if x.strip()]
        d[f.strip()] = set(items)
    return d

b = load(os.path.join(HERE, '_base411', '_base411_fail.txt'))
c = load(os.path.join(HERE, '_final_v413.txt'))
print('baseline(v4.11) failing files: %d' % len(b))
print('current (v4.13) failing files: %d' % len(c))
print()

ver_kw = ('版本', '徽章', 'verTxt', 'verLogVer', 'VERSION',
          '4.1', '4.2', '4.3', '4.4', '4.5', '4.7', '4.11', '4.12', '4.13')

print('=== 非版本字串的新增失敗（真正的回歸）===')
reg = []
for f in sorted(set(b) | set(c)):
    for a in sorted(c.get(f, set()) - b.get(f, set())):
        if not any(k in a for k in ver_kw):
            reg.append((f, a))
for f, a in reg:
    print('  %s :: %s' % (f, a))
if not reg:
    print('  (none) ✅')
print()

print('=== 基準全綠但現在紅的檔案 ===')
bad = [f for f in sorted(set(c) - set(b))]
print('  (none) ✅' if not bad else '\n'.join('  ' + f for f in bad))
for f in bad:
    for a in sorted(c[f]):
        print('      %s' % a)
print()

print('=== v4.13 修好的檔案 ===')
for f in sorted(set(b) - set(c)):
    print('  %s  (%d -> 0)' % (f, len(b[f])))
