# -*- coding: utf-8 -*-
"""v4.37：把 _hs_plan.json 的尺寸写回 pack_foes_game.py 的 SPECS"""
import io, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
plan = json.load(io.open(os.path.join(HERE, '_hs_plan.json'), encoding='utf-8'))
path = os.path.join(HERE, 'pack_foes_game.py')
src = io.open(path, encoding='utf-8', newline='').read()
crlf = '\r\n' in src
src = src.replace('\r\n', '\n')

pat = re.compile(r"(\('(\w+)',\s*'([\w\-]+)',\s*'(\w+)',\s*([+-]\d+),\s*)([\d.]+)(,\s*'\w+'\),)")
n = [0]
seen = set()


def rep(m):
    key = m.group(4)
    if key not in plan:
        raise SystemExit('plan 缺 ' + key)
    new = plan[key]
    seen.add(key)
    n[0] += 1
    return m.group(1) + ('%.3f' % new) + m.group(7)


out = pat.sub(rep, src)
assert n[0] == 48, n[0]
assert seen == set(plan.keys()), set(plan.keys()) - seen

if crlf:
    out = out.replace('\n', '\r\n')
io.open(path, 'w', encoding='utf-8', newline='').write(out)
print('ok [v437-size] 改寫 %d 隻尺寸' % n[0])
