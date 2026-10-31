# -*- coding: utf-8 -*-
"""v2.7：把舊的中文字串斷言改成 t() 版本"""
import io, os, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def edit(name, pairs):
    p = os.path.join(BASE, 'test', name)
    s = io.open(p, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s:
            print('MISS in %s: %r' % (name, old[:90])); sys.exit(1)
        s = s.replace(old, new, 1)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('ok', name)

edit('verify-v22.js', [
    ("""ok(html.indexOf("toast('✦ 出口出現了") > 0, '有「出口出現了」提示');""",
     """ok(html.indexOf("toast(t('solo.doorOpen')") > 0, '有「出口出現了」提示（v2.7：走 t()）');"""),
])

edit('verify-v27.js', [
    ("""ok(/if \\(n > Solo\\.unlocked\\) \\{ toast\\('🔒 第 '/.test(html), '未解鎖時有清楚的鎖頭提示');""",
     """ok(/if \\(n > Solo\\.unlocked\\) \\{ toast\\(t\\('solo\\.lockToast'/.test(html), '未解鎖時有清楚的鎖頭提示（v2.7：走 t()）');"""),
    ("""ok(/i === 1 \\? '鍵盤 2（方向鍵 \\+ Enter）· 預設 AI'/.test(html), 'P2 的副標註明「預設 AI」');""",
     """ok(/i === 1 \\? 'bt\\.kb2'/.test(html), 'P2 的副標註明「預設 AI」（v2.7：改成 bt.kb2 語系 key）');"""),
])

edit('verify-v28.js', [
    ("""ok(/copyMail\\(MAIL_ADDR\\);/.test(html) && /toast\\('✉️ ' \\+ MAIL_ADDR/.test(html),""",
     """ok(/copyMail\\(MAIL_ADDR\\);/.test(html) && /toast\\(t\\('mail\\.toast', \\{ addr: MAIL_ADDR \\}\\)/.test(html),"""),
])

edit('verify-v29.js', [
    ("""ok(/把手機轉成<b>橫式<\\/b>/.test(html), '提示內容：「把手機轉成橫式 …」');""",
     """ok(/t\\('rot\\.body1'\\) \\+ '<b>' \\+ t\\('rot\\.body2'\\)/.test(html), '提示內容：「把手機轉成橫式 …」（v2.7：走 t()）');"""),
])
