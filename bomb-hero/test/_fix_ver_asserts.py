# -*- coding: utf-8 -*-
# 測試衛生：把「硬寫版號」的斷言改成「跟 VERSION 自我一致」的檢查
#   → 以後每次升版就不會再整排紅燈，紅燈只代表真的壞了
import io, re, glob, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

pat_version = re.compile(r"ok\(P\.VERSION === '[0-9.]+', [^)]*\);")
pat_badge = re.compile(r"ok\(/<[^/]*id=\"verTxt\">[0-9.\\]+<\\/span>[^/]*/\.test\(html\), [^)]*\);")
pat_panel = re.compile(r"ok\(/id=\"verLogVer\">[0-9.\\]+/\.test\(html\), [^)]*\);")
pat_sw = re.compile(r"ok\(/SW_VERSION\\s\*=\\s\*'v4\\\.[0-9]+/\.test\(sw\), [^)]*\);")

REP_VERSION = "ok(/^\\d+\\.\\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');"
REP_BADGE = "ok(html.indexOf('id=\"verTxt\">' + P.VERSION) > 0, '徽章版本號同步 ' + P.VERSION);"
REP_PANEL = "ok(html.indexOf('id=\"verLogVer\">' + P.VERSION) > 0, '版本紀錄面板同步 ' + P.VERSION);"
REP_SW = "ok(/SW_VERSION\\s*=\\s*'v\\d+\\.\\d+\\.\\d+'/.test(sw), 'SW 快取版本有跟版號走（vX.Y.Z）');"

changed = []
for f in sorted(glob.glob('verify*.js')):
    s = io.open(f, encoding='utf-8', newline='').read()
    o = s
    s = pat_version.sub(lambda m: REP_VERSION, s)
    s = pat_badge.sub(lambda m: REP_BADGE, s)
    s = pat_panel.sub(lambda m: REP_PANEL, s)
    s = pat_sw.sub(lambda m: REP_SW, s)
    if s != o:
        io.open(f, 'w', encoding='utf-8', newline='').write(s)
        changed.append(f)
print('changed:', len(changed))
for c in changed:
    print(' ', c)
