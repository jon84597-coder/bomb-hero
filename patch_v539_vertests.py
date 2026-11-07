# -*- coding: utf-8 -*-
"""把 v537 / v538 的版本斷言改成「查自己的那一版」，不要每次升版都要回頭修舊測試。"""
import io, os

def patch(p, pairs):
    s = io.open(p, encoding='utf-8').read()
    for a, b in pairs:
        c = s.count(a)
        assert c == 1, (p, c, a[:70])
        s = s.replace(a, b, 1)
    io.open(p + '.tmp', 'w', encoding='utf-8', newline='\n').write(s.replace('\r\n', '\n'))
    os.replace(p + '.tmp', p)
    print('ok', p)

patch('test/verify-v537.js', [
    ("ok(P.VERSION_LOG[0].items.length >= 8, '本版至少 8 條（實際 ' + P.VERSION_LOG[0].items.length + '）');",
     "// 別抓 VERSION_LOG[0]（那是「現在最新版」，每次升版都會變）→ 找 5.37 自己那一筆\n"
     "const v537 = P.VERSION_LOG.filter(function (x) { return x.v === '5.37'; })[0];\n"
     "ok(!!v537 && v537.items.length >= 8, '5.37 至少 8 條（實際 ' + (v537 ? v537.items.length : 0) + '）');"),
])

patch('test/verify-v538.js', [
    ("""  ok(P.VERSION === '5.38', 'VERSION = 5.38');
  const vl = SB.vlog || '';
  ok(/v: '5\\.38'/.test(vl), 'VERSION_LOG 有 5.38');
  ok(/v: '5\\.38'[\\s\\S]{0,80}now: true/.test(vl), '5.38 是 now:true');
  ok(/v: '5\\.37'[\\s\\S]{0,200}now: false/.test(vl), '5.37 已改成 now:false');
  ok(/v: '5\\.38'/.test(P.VERSION_LOG && P.VERSION_LOG[0] ? 'v: \\'' + P.VERSION_LOG[0].v + '\\'' : ''), '面板讀到 5.38');
  ok(P.VERSION_LOG[0].items.length >= 10, '本版至少 10 條更新（' + P.VERSION_LOG[0].items.length + '）');""",
     """  // v5.39：版本斷言不寫死 —— 只要求「不比 5.38 舊」＋「5.38 自己那一筆還在、已非 now」
  ok(parseFloat(P.VERSION) >= 5.38, 'VERSION ≥ 5.38（實際 ' + P.VERSION + '）');
  const vl = SB.vlog || '';
  ok(/v: '5\\.38'/.test(vl), 'VERSION_LOG 有 5.38');
  const v538 = (P.VERSION_LOG || []).filter(function (x) { return x.v === '5.38'; })[0];
  ok(!!v538 && v538.now === false, '5.38 已標成 now:false');
  ok(!!v538 && v538.items.length >= 10, '5.38 至少 10 條更新（' + (v538 ? v538.items.length : 0) + '）');
  ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '面板讀到最新版 ' + P.VERSION);"""),
])
