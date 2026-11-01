# -*- coding: utf-8 -*-
"""v4.20：把各測試檔的版號斷言從 4.19 推到 4.20，並修正 VERSION_LOG 索引位移。"""
import io, sys

def patch(path, rules):
    raw = io.open(path, 'rb').read().decode('utf-8')
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    for i, (old, new) in enumerate(rules, 1):
        n = s.count(old)
        if n != 1:
            print('  ! %s rule %d hits %d' % (path, i, n))
            sys.exit(1)
        s = s.replace(old, new)
    if crlf:
        s = s.replace('\n', '\r\n')
    io.open(path, 'wb').write(s.encode('utf-8'))
    print('  ok', path)


patch('test/verify-v60.js', [
    ("ok(P.VERSION === '4.19', '版號 = ' + P.VERSION);\n"
     "ok(P.VERSION_LOG[0].v === '4.19' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆是 4.19（now）');\n"
     "ok(P.VERSION_LOG[1].v === '4.18' && P.VERSION_LOG[1].now === false, '4.18 已不再是 now');\n"
     "ok(P.VERSION_LOG[1].items.join(' ').indexOf('隨從') >= 0, '版本紀錄有寫隨從系統');\n"
     "ok(/SW_VERSION = 'v4\\.19\\.0'/.test(require('fs').readFileSync(__dirname + '/../sw.js', 'utf8')),\n"
     "  'sw.js 快取版號升到 v4.19.0');",

     "ok(P.VERSION === '4.20', '版號 = ' + P.VERSION);\n"
     "ok(P.VERSION_LOG[0].v === '4.20' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆是 4.20（now）');\n"
     "ok(P.VERSION_LOG[1].v === '4.19' && P.VERSION_LOG[1].now === false, '4.19 已不再是 now');\n"
     "// v4.20：隨從是 4.17 的內容，版本紀錄一直往後長 → 用內容找人，不要綁死索引\n"
     "ok(P.VERSION_LOG.some(function (e) { return e.items.join(' ').indexOf('隨從') >= 0; }), '版本紀錄有寫隨從系統');\n"
     "ok(/SW_VERSION = 'v4\\.20\\.0'/.test(require('fs').readFileSync(__dirname + '/../sw.js', 'utf8')),\n"
     "  'sw.js 快取版號升到 v4.20.0');"),
])

patch('test/verify-v61.js', [
    ("ok(P.VERSION === '4.19', '版號 = ' + P.VERSION);\n"
     "ok(css.indexOf('id=\"verTxt\">' + P.VERSION + '<') > 0, '畫面版本文字同步 ' + P.VERSION);\n"
     "ok(P.VERSION_LOG[0].v === '4.19' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = 4.19（now）');\n"
     "ok(P.VERSION_LOG[1].v === '4.18' && P.VERSION_LOG[1].now === false, '4.18 已不再是 now');\n"
     "ok(P.VERSION_LOG[0].items.length >= 5, '4.19 寫了 ' + P.VERSION_LOG[0].items.length + ' 條更新');\n"
     "ok(/SW_VERSION = 'v4\\.19\\.0'/.test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')), 'sw.js 快取版號 = v4.19.0');",

     "ok(P.VERSION === '4.20', '版號 = ' + P.VERSION);\n"
     "ok(css.indexOf('id=\"verTxt\">' + P.VERSION + '<') > 0, '畫面版本文字同步 ' + P.VERSION);\n"
     "ok(P.VERSION_LOG[0].v === '4.20' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = 4.20（now）');\n"
     "ok(P.VERSION_LOG[1].v === '4.19' && P.VERSION_LOG[1].now === false, '4.19 已不再是 now');\n"
     "ok(P.VERSION_LOG[0].items.length >= 2, '4.20 寫了 ' + P.VERSION_LOG[0].items.length + ' 條更新');\n"
     "ok(/SW_VERSION = 'v4\\.20\\.0'/.test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')), 'sw.js 快取版號 = v4.20.0');"),
])

patch('test/verify-v62.js', [
    ("ok(P.VERSION === '4.19', '版號 = ' + P.VERSION);\n"
     "ok(css.indexOf('id=\"verTxt\">' + P.VERSION + '<') > 0, '畫面版本文字同步 ' + P.VERSION);\n"
     "ok(P.VERSION_LOG[0].v === '4.19' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = 4.19（now）');\n"
     "ok(P.VERSION_LOG[1].v === '4.18' && P.VERSION_LOG[1].now === false, '4.18 已不再是 now');\n"
     "ok(P.VERSION_LOG[2].items.join(' ').indexOf('隨從') >= 0, '4.17 版本紀錄有寫隨從');\n"
     "ok(/SW_VERSION = 'v4\\.19\\.0'/.test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')), 'sw.js = v4.19.0');",

     "ok(P.VERSION === '4.20', '版號 = ' + P.VERSION);\n"
     "ok(css.indexOf('id=\"verTxt\">' + P.VERSION + '<') > 0, '畫面版本文字同步 ' + P.VERSION);\n"
     "ok(P.VERSION_LOG[0].v === '4.20' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = 4.20（now）');\n"
     "ok(P.VERSION_LOG[1].v === '4.19' && P.VERSION_LOG[1].now === false, '4.19 已不再是 now');\n"
     "ok(P.VERSION_LOG.filter(function (e) { return e.v === '4.17'; })[0].items.join(' ').indexOf('隨從') >= 0, '4.17 版本紀錄有寫隨從');\n"
     "ok(/SW_VERSION = 'v4\\.20\\.0'/.test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')), 'sw.js = v4.20.0');"),
])

patch('test/verify-v63.js', [
    ("  ok(P.VERSION === '4.19', '版號 = ' + P.VERSION);",

     "  ok(P.VERSION === '4.20', '版號 = ' + P.VERSION);"),
    ("  ok(P.VERSION_LOG[0].v === '4.19' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 4.19（now）');\n"
     "  ok(P.VERSION_LOG[1].items.join(' ').indexOf('分享') >= 0, '4.18 條目寫了分享');\n"
     "  ok(P.VERSION_LOG[1].items.join(' ').indexOf('暱稱') >= 0, '4.18 條目寫了暱稱');\n"
     "  ok(P.VERSION_LOG[1].items.join(' ').indexOf('手套') >= 0, '4.18 條目寫了手套');\n"
     "  ok(/SW_VERSION = 'v4\\.19\\.0'/.test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')), 'sw.js = v4.19.0');",

     "  ok(P.VERSION_LOG[0].v === '4.20' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 4.20（now）');\n"
     "  // v4.20：4.18 條目被推到 [2] → 用版本號找，不要綁死索引\n"
     "  var v418 = P.VERSION_LOG.filter(function (e) { return e.v === '4.18'; })[0] || { items: [] };\n"
     "  ok(v418.items.join(' ').indexOf('分享') >= 0, '4.18 條目寫了分享');\n"
     "  ok(v418.items.join(' ').indexOf('暱稱') >= 0, '4.18 條目寫了暱稱');\n"
     "  ok(v418.items.join(' ').indexOf('手套') >= 0, '4.18 條目寫了手套');\n"
     "  ok(/SW_VERSION = 'v4\\.20\\.0'/.test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')), 'sw.js = v4.20.0');"),
])
print('done')
