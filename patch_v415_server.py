# -*- coding: utf-8 -*-
"""patch_v415_server.py —— v4.15：線上配對人數 2～8（原本只收 4／8）"""
import io

P = 'server.js'
with io.open(P, 'r', encoding='utf-8', newline='') as f:
    s = f.read()
crlf = '\r\n' in s
s = s.replace('\r\n', '\n')

R = [
    ("  const count = parseInt(body.count, 10) === 8 ? 8 : 4;\n",
     "  // v4.15：房主可以設 2～8 人（原本只收 4／8）\n"
     "  const count = clampCount(body.count);\n"),

    ("  if (typeof body.count === 'number') room.count = body.count === 8 ? 8 : 4;\n",
     "  if (typeof body.count === 'number') room.count = clampCount(body.count);\n"),

    ("  if (room.roster.length >= RELAY_MAX) return sendJSON(res, 409, { ok: false, err: '這間房已經滿了' });\n",
     "  // v4.15：滿不滿要看房主設的人數（2～8），不是固定 8\n"
     "  if (room.roster.length >= Math.min(RELAY_MAX, room.count || RELAY_MAX)) {\n"
     "    return sendJSON(res, 409, { ok: false, err: '這間房已經滿了' });\n"
     "  }\n"),

    ("function relayRoom(code) { return relayRooms.get(String(code || '')); }\n",
     "function relayRoom(code) { return relayRooms.get(String(code || '')); }\n"
     "\n"
     "// v4.15：人數一律夾在 2～8 之間（前端送什麼都擋得住）\n"
     "function clampCount(v) {\n"
     "  const n = parseInt(v, 10);\n"
     "  if (!isFinite(n)) return 4;\n"
     "  return Math.max(2, Math.min(RELAY_MAX, n));\n"
     "}\n"),
]

for old, new in R:
    c = s.count(old)
    assert c == 1, '規則命中 %d 次（應為 1）：%r' % (c, old[:60])
    s = s.replace(old, new)

with io.open(P, 'w', encoding='utf-8', newline='') as f:
    f.write(s.replace('\n', '\r\n') if crlf else s)
print('patch_v415_server OK：%d 條規則' % len(R))
