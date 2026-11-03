import io, hashlib, difflib, sys

def norm(p):
    return io.open(p, encoding='utf-8', newline='').read().replace('\r\n', '\n')

a = norm('cloud.js')
b = norm('bomberman-online/cloud.js')
print('root len=%d  dev len=%d' % (len(a), len(b)))
print('identical:', a == b)
if a != b:
    d = list(difflib.unified_diff(a.split('\n'), b.split('\n'), lineterm='', n=1))
    print('diff lines:', len(d))
    shown = 0
    for l in d:
        if l.startswith('---') or l.startswith('+++'):
            continue
        print('  ' + l[:130])
        shown += 1
        if shown > 40:
            print('  ... (truncated)')
            break
