# -*- coding: utf-8 -*-
"""
v4.32 第二段：第三大關（冰雪原）小怪美術接進遊戲（可重複執行）
  1. 換掉整塊 FOE_ART（18 隻）
  2. drawFoeSprite 增加 5 種動作：waddle（企鵝搖擺）／spin（冰晶緩轉）／
     flap（蝙蝠拍翅）／roll（雪球滾動）／slide（海豹貼地滑）
  3. VERSION_LOG 4.32 補上第三關條目
"""
import io
import os
import re

ROOT = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
PAGE = os.path.join(ROOT, 'index.html')
FOES = os.path.join(ROOT, 'art', 'foes', '_foes_game_parts.js')

s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')
orig = len(s)
foe_js = io.open(FOES, encoding='utf-8', newline='').read().replace('\r\n', '\n')

# ================= 1) FOE_ART 區塊 =================
pat = re.compile(r'// -+ 小怪美術.*?\n\};\n', re.S)
assert len(pat.findall(s)) == 1, 'FOE_ART 區塊找不到（或太多）'
s = pat.sub(lambda m: foe_js + '\n', s, count=1)
assert "panda: { dir: 1, hs: 2.25" in s, 'FOE_ART 沒換成功'

# ================= 2) 新增 5 種動作 =================
old = ("    lift = Math.abs(j) * H * .018 * (moving ? 1 : .2);\n"
       "  } else {\n")
new = ("    lift = Math.abs(j) * H * .018 * (moving ? 1 : .2);\n"
       "  } else if (anim === 'waddle') {\n"
       "    // 企鵝：左右大幅度搖擺，一步一步往前走（像穿著大鞋）\n"
       "    const j = Math.sin(w * 6.4);\n"
       "    tilt = (moving ? .14 : .05) * j;\n"
       "    lift = moving ? Math.abs(j) * H * .045 : Math.sin(t * 2) * H * .01;\n"
       "    sx = 1 + Math.sin(t * 2.4) * .012;\n"
       "    sy = 1 - Math.sin(t * 2.4) * .012;\n"
       "    fwd = moving ? -j * H * .02 : 0;\n"
       "  } else if (anim === 'spin') {\n"
       "    // 冰晶怪：整隻浮在空中緩慢轉向（不是轉圈，是陀螺式左右擺轉）\n"
       "    const b = Math.sin(t * 1.7 + (e.bobP || 0));\n"
       "    const b2 = Math.sin(t * 2.9 + (e.bobP || 0) * .6);\n"
       "    lift = b * H * .06 + H * .03;\n"
       "    tilt = b2 * .09;\n"
       "    sx = 1 + b2 * .025;\n"
       "    sy = 1 - b2 * .02;\n"
       "    fwd = moving ? Math.sin(w * 3.1) * H * .02 : 0;\n"
       "  } else if (anim === 'flap') {\n"
       "    // 冰蝙蝠：拍翅（用橫向擠壓模擬翅膀收合）＋ 身體上下浮\n"
       "    const f = Math.sin(t * 13 + (e.bobP || 0));\n"
       "    const b = Math.sin(t * 2.2 + (e.bobP || 0));\n"
       "    lift = b * H * .07 + H * .02 + (moving ? Math.abs(f) * H * .02 : 0);\n"
       "    sx = 1 + f * .05 * (moving ? 1 : .55);\n"
       "    sy = 1 - f * .03 * (moving ? 1 : .55);\n"
       "    tilt = Math.sin(t * 2.6) * .05;\n"
       "  } else if (anim === 'roll') {\n"
       "    // 雪球怪：重心前後滾（只擺不轉整張圖，眼睛才不會轉到頭上）\n"
       "    const j = Math.sin(w * 4.6);\n"
       "    tilt = (moving ? .10 : .03) * j;\n"
       "    lift = moving ? Math.abs(j) * H * .045 : Math.sin(t * 2.2) * H * .012;\n"
       "    sx = 1 + Math.abs(j) * .02 * (moving ? 1 : .4);\n"
       "    sy = 1 - Math.abs(j) * .035 * (moving ? 1 : .4);\n"
       "    fwd = moving ? j * H * .02 : 0;\n"
       "  } else if (anim === 'slide') {\n"
       "    // 小海豹：貼著地滑（身體前後拉長收縮，抬很低）\n"
       "    const j = Math.sin(w * 4);\n"
       "    lift = moving ? Math.abs(j) * H * .02 : Math.sin(t * 1.9) * H * .008;\n"
       "    sx = 1 + (moving ? j * .035 : 0);\n"
       "    sy = 1 - (moving ? j * .03 : 0);\n"
       "    tilt = moving ? j * .022 : Math.sin(t * 1.5) * .012;\n"
       "    fwd = moving ? j * H * .03 : 0;\n"
       "  } else {\n")
if "anim === 'waddle'" not in s:
    assert s.count(old) == 1, 'drawFoeSprite 的 pinch 收尾找不到'
    s = s.replace(old, new, 1)

# ================= 3) 版本紀錄補第三關 =================
old = ("    '木乃伊與沙丘獸體型再加大一級，沙漠那兩隻不再顯得扁小'\n  ] },")
new = ("    '木乃伊與沙丘獸體型再加大一級，沙漠那兩隻不再顯得扁小',\n"
       "    '第三大關（冰雪原）6 隻小怪換成手繪美術圖：冰晶企鵝／冰晶怪／冰蝙蝠／雪球怪／小海豹／貓熊',\n"
       "    '第三關的怪有自己的走法：搖擺、飄轉、拍翅、滾動、貼地滑行'\n"
       "  ] },")
if "'第三大關（冰雪原）6 隻小怪" not in s:
    assert s.count(old) == 1, 'VERSION_LOG 4.32 找不到'
    s = s.replace(old, new, 1)

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('index.html %d -> %d bytes (%+.1f KB)' % (orig, len(s), (len(s) - orig) / 1024.0))
