# -*- coding: utf-8 -*-
# v4.55 瘦身第三輪：刪掉純歷史敘述的單行註解（內容已在 CHANGELOG／MEMORY）
import io

P = 'index.html'
lines = io.open(P, encoding='utf-8').read().split('\n')
before = len(('\n'.join(lines)).encode())

KILL = [
    '// ---- 角色配件：對應選角圖的 8 隻',
    '//   舊版只有一條直線 2 格',
    '// 先走主力軸、再走副軸（舊版在',
    '//   原本這裡直接 return → 連下面的「火焰傷害」',
    '//   大圖（bigGrid）的出生格是隨機的',
    '//   v4.52 取的是「這個方向最遠的空地」',
    '//      AI 會沿著最外圈繞去左邊',
    '// v4.21：保險 —— 有些 WebView 的分享流程',
    '// v2.6：第二顆小鈕（🔥）往內側偏一格寬',
    '// 房心只能落在「已經挖開的空地」',
    '// 風紋：短促的沙脊',
    '//   blob／worm／critter／humanoid',
    '//   八隻魔王各有自己的美術',
    '// v2.6：第二顆小鈕距離畫面邊緣的距離',
    '//   舊做法是貪心：想往右就只看右邊一格',
    '// ---------- 選角預覽：8 隻角色在卡片裡來回走動',
    '//   動畫因此看得到「從西邊投到東邊盡頭',
    '// v4.13：原本切到 \'reg\'（註冊頁）',
    '// v4.21：沒存過就一律先收合',
    '// v4.5：\'fx\'（金色，吃到好東西）= 1.38 倍',
    '// 以「最近有動作」的裝置為準',
    '// v4.19：只有「2 格內被發現」才會朝你飛',
]
out, hit = [], 0
for l in lines:
    st = l.strip()
    if any(st.startswith(k) for k in KILL):
        hit += 1
        continue
    out.append(l)
s = '\n'.join(out)
io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('deleted %d lines, -%d bytes / %d chars' % (hit, before - len(s.encode()), len(s)))
