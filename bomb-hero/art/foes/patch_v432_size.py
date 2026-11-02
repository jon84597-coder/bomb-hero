# -*- coding: utf-8 -*-
"""
v4.32 尺寸平衡（可重複執行）：
  1. 主角縮小 10%（只縮顯示，判定半徑 R 不動）
  2. 所有小怪再放大 10%（ENEMY_ART_GROW 1.15 → 1.265）
  3. 第 2 大關的木乃伊／沙丘獸在這之上再 +10%（hs × 1.1）
  4. 版號 4.31 → 4.32
"""
import io
import os
import re

ROOT = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
PAGE = os.path.join(ROOT, 'index.html')

s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')
orig = len(s)

# ================= 1) 主角縮小 10% =================
old = ("function drawSpriteChar(g, c, x, y, R, a) {\n"
       "  // 先用「部位骨架」畫（頭／手／腳各自動）；沒有部位圖才退回整張圖\n"
       "  const rigH = R * 3.75;")
new = ("// v4.32：主角縮小 10% —— 只縮「畫出來的高度」，判定半徑 R 與腳底位置完全不動，\n"
       "//   所以躲炸彈的難度不變，只是畫面上人小一號、小怪看起來更有魄力。\n"
       "const HERO_ART_SCALE = .90;\n"
       "function drawSpriteChar(g, c, x, y, R, a) {\n"
       "  // 先用「部位骨架」畫（頭／手／腳各自動）；沒有部位圖才退回整張圖\n"
       "  const rigH = R * 3.75 * HERO_ART_SCALE;")
assert s.count(old) == 1, 'drawSpriteChar rigH 找不到'
s = s.replace(old, new, 1)

old = "  const H = R * 3.75;                                 // 角色高（含耳朵／尾巴）"
new = "  const H = R * 3.75 * HERO_ART_SCALE;                // 角色高（含耳朵／尾巴；v4.32 縮 10%）"
assert s.count(old) == 1, 'drawSpriteChar H 找不到'
s = s.replace(old, new, 1)

# ================= 2) 小怪再放大 10% =================
old = ("// v4.31：外型再放大 15%。乘在「最後結果」而不是乘進 ENEMY_ART_MUL ——\n"
       "//   因為下面有一個 base*1.05 的保底（小格子時會壓過 MUL），乘進去的話手機上幾乎沒感覺。\n"
       "const ENEMY_ART_GROW = 1.15;")
new = ("// v4.31：外型再放大 15%；v4.32：再 +10% → 1.15 × 1.10 = 1.2650。\n"
       "//   乘在「最後結果」而不是乘進 ENEMY_ART_MUL ——\n"
       "//   因為 Math.max(base*MUL*tileArtK(), base*1.05) 的 1.05 保底在小格子會把 MUL 吃掉。\n"
       "//   一樣只放大外型，判定半徑 e.r 不動 → 不會變難躲。\n"
       "const ENEMY_ART_GROW = 1.2650;")
assert s.count(old) == 1, 'ENEMY_ART_GROW 找不到'
s = s.replace(old, new, 1)

# ================= 3) 木乃伊 / 沙丘獸 額外 +10% =================
for key, old_hs, new_hs in (('mummy', '1.86', '2.05'), ('dune', '1.92', '2.11')):
    old = "%s: { dir: %s, hs: %s," % (key, ('1' if key == 'mummy' else '-1'), old_hs)
    new = "%s: { dir: %s, hs: %s," % (key, ('1' if key == 'mummy' else '-1'), new_hs)
    assert s.count(old) == 1, '%s hs 找不到' % key
    s = s.replace(old, new, 1)

# ================= 4) 版號 =================
if "const VERSION = '4.31';" in s:
    s = s.replace("const VERSION = '4.31';", "const VERSION = '4.32';")
    s = s.replace('<span id="verLogVer">4.31</span>', '<span id="verLogVer">4.32</span>')
    s = s.replace('<span id="verTxt">4.31</span>', '<span id="verTxt">4.32</span>')
    old_log = "  { v: '4.31', date: '2026-11-02', now: true, items: ["
    assert s.count(old_log) == 1
    s = s.replace(old_log, "  { v: '4.32', date: '2026-11-02', now: true, items: [\n"
                           "    '主角縮小 10%、小怪再放大 10%：看起來更平衡，怪的魄力出來了（難度不變）',\n"
                           "    '木乃伊與沙丘獸體型再加大一級，沙漠那兩隻不再顯得扁小'\n"
                           "  ] },\n"
                           "  { v: '4.31', date: '2026-11-02', now: false, items: [", 1)

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('index.html %d -> %d bytes (%+.1f KB)' % (orig, len(s), (len(s) - orig) / 1024.0))
