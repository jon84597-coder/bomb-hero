# -*- coding: utf-8 -*-
# v2.2：BOSS 火焰 3 格 → 2 格
import io, sys

base = r"C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero"
fails = []

def rep(path, pairs):
    p = base + '\\' + path
    src = io.open(p, 'r', encoding='utf-8').read()
    for old, new, name in pairs:
        if old not in src:
            fails.append(path + ':' + name); print('FAIL', path, name); continue
        src = src.replace(old, new, 1)
        print('ok  ', path, name)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(src)

# ---- 主程式 ----
rep('index.html', [
("const BOSS_POWER = 3;                             // v1.9：BOSS 火焰固定 3 格",
 "const BOSS_POWER = 2;                             // v2.2：BOSS 火焰 2 格（v1.9 是 3 格）", 'BOSS_POWER 常數'),
("  const power = BOSS_POWER;                       // v1.9：BOSS 火焰統一 3 格",
 "  const power = BOSS_POWER;                       // v2.2：BOSS 火焰統一 2 格", 'BOSS 火力註解'),
("const VERSION = '2.1';", "const VERSION = '2.2';", 'VERSION'),
('<span id="verTxt">2.1</span>', '<span id="verTxt">2.2</span>', 'verTxt')])

# ---- 測試同步 ----
rep('test\\verify-v24.js', [
("""ok(bossBombs.concat([{ power: 3 }]).every(b => b.power === P.BOSS_POWER) && P.BOSS_POWER === 3,
  'v1.9：BOSS 火力固定 3 格（' + (bossBombs[0] ? bossBombs[0].power : '-') + '）');""",
 """ok(bossBombs.concat([{ power: 2 }]).every(b => b.power === P.BOSS_POWER) && P.BOSS_POWER === 2,
  'v2.2：BOSS 火力改成 2 格（' + (bossBombs[0] ? bossBombs[0].power : '-') + '）');"""),
("ok(ragePower === 3, 'v1.9：連暴走也是 3 格（' + ragePower + '）');",
 "ok(ragePower === 2, 'v2.2：連暴走也是 2 格（' + ragePower + '）');")])

rep('test\\verify-v27.js', [
("""console.log('\\n=== 8. BOSS 火焰改為 3 格 ===');

ok(P.BOSS_POWER === 3, 'BOSS_POWER = 3');""",
 """console.log('\\n=== 8. BOSS 火焰改為 2 格 ===');

ok(P.BOSS_POWER === 2, 'BOSS_POWER = 2');"""),
("""  ok(mine.every(function (b) { return b.power === 3; }), '普通狀態火力 3 格（' + mine.map(function (b) { return b.power; }).join('/') + '）');""",
 """  ok(mine.every(function (b) { return b.power === 2; }), '普通狀態火力 2 格（' + mine.map(function (b) { return b.power; }).join('/') + '）');"""),
("""  ok(rage.every(function (b) { return b.power === 3; }), '暴走狀態也是 3 格（' + rage.map(function (b) { return b.power; }).join('/') + '）');""",
 """  ok(rage.every(function (b) { return b.power === 2; }), '暴走狀態也是 2 格（' + rage.map(function (b) { return b.power; }).join('/') + '）');"""),
("""// 玩家起始火力通常只有 1 格，BOSS 的 3 格依舊比較長""",
 """// 玩家起始火力通常只有 1 格，BOSS 的 2 格依舊比較長"""),
("""ok(P.VERSION === '2.1', '版本 = 2.1（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.1</span>') > 0, '畫面上的版本號同步 2.1');""",
 """ok(P.VERSION === '2.2', '版本 = 2.2（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.2</span>') > 0, '畫面上的版本號同步 2.2');""")])

rep('test\\verify-v26.js', [
("""ok(/<div class="ver beta">測試版 v<span id="verTxt">2\\.1<\\/span><\\/div>/.test(html), '「測試版 v2.1」小字徽章');""",
 """ok(/<div class="ver beta">測試版 v<span id="verTxt">2\\.2<\\/span><\\/div>/.test(html), '「測試版 v2.2」小字徽章');"""),
("""ok(P.VERSION === '2.1', '版本 = 2.1（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.1</span>') > 0, '畫面上的版本號同步 2.1');""",
 """ok(P.VERSION === '2.2', '版本 = 2.2（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.2</span>') > 0, '畫面上的版本號同步 2.2');""")])

rep('test\\verify-v28.js', [
("""ok(P.VERSION === '2.1', '版本 = 2.1（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.1</span>') > 0, '畫面上的版本號同步 2.1');""",
 """ok(P.VERSION === '2.2', '版本 = 2.2（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.2</span>') > 0, '畫面上的版本號同步 2.2');""")])

if fails:
    print('共 %d 處失敗' % len(fails)); sys.exit(1)
print('ALL OK')
