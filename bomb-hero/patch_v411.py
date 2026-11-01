# -*- coding: utf-8 -*-
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ===================== F1：單人怪也要有血量條 =====================
# 1) makeEnemy：補上 maxHp（原本只有 hp、沒有 maxHp，導致血條畫不出來）
R(
"hp: 2,   // v4.8：小怪血量上調（原本 1）",
"hp: 2, maxHp: 2,   // v4.8：小怪血量上調（原本 1）"
)
R(
"  if (sp.id === 'beetle' || sp.id === 'skull') e.hp = 3;    // 有甲／硬骨頭：要炸三次",
"  if (sp.id === 'beetle' || sp.id === 'skull') { e.hp = 3; e.maxHp = 3; }    // 有甲／硬骨頭：要炸三次"
)
# 2) drawRpgHud：敵人血條移到 RPG 判斷之前 → 單人／RPG／BOSS 全部都畫
R(
"function drawRpgHud(T) {\n  if (!Game.rpg) return;\n  // 敵人頭上的血量條（RPG 小怪常駐顯示，一眼看出要炸幾次）\n  for (let i = 0; i < Game.enemies.length; i++) {\n    const e = Game.enemies[i];\n    if (!e.maxHp || e.maxHp <= 1) continue;\n    // v4.10：RPG 小怪血條常駐（含滿血），方便判斷強度\n    const w = Math.max(16, T * .58), h = Math.max(3, T * .07);\n    const x = e.x - w / 2, y = e.y - enemyArtR(e) - h - 5;\n    ctx.fillStyle = 'rgba(0,0,0,.6)';\n    ctx.fillRect(x - 1.2, y - 1.2, w + 2.4, h + 2.4);\n    ctx.fillStyle = e.type === 'boss' ? '#ffd166' : '#7fe08a';\n    ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), h);\n  }\n  const p = Game.players[0];",
"function drawRpgHud(T) {\n  // v4.11：敵人頭上的血量條（單人／RPG／BOSS 全部顯示，一眼看出要炸幾次）\n  for (let i = 0; i < Game.enemies.length; i++) {\n    const e = Game.enemies[i];\n    if (!e.maxHp || e.maxHp <= 1) continue;\n    const w = Math.max(16, T * .58), h = Math.max(3, T * .07);\n    const x = e.x - w / 2, y = e.y - enemyArtR(e) - h - 5;\n    ctx.fillStyle = 'rgba(0,0,0,.6)';\n    ctx.fillRect(x - 1.2, y - 1.2, w + 2.4, h + 2.4);\n    ctx.fillStyle = e.type === 'boss' ? '#ffd166' : '#7fe08a';\n    ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), h);\n  }\n  if (!Game.rpg) return;\n  const p = Game.players[0];"
)

# ===================== F2：功能鍵去掉黑底（變透明，只留金屬圓框） =====================
# 3) 把 .tbtn 的深色面盤設成完全透明
R(
"    --tb-face: rgba(22,32,56,.62);",
"    --tb-face: rgba(0,0,0,0);"
)
# 4) 移除會造成「黑底感」的內凹黑色陰影
R(
"      0 12px 22px -10px rgba(0,0,0,.92),\n      inset 0 -8px 16px rgba(0,0,0,.46),\n      inset 0 6px 12px rgba(255,255,255,.16);",
"      0 12px 22px -10px rgba(0,0,0,.55),\n      inset 0 6px 12px rgba(255,255,255,.16);"
)
# 5) 按下時的回饋改用亮圈（原本改 --tb-face，現在面盤已透明，要另寫）
R(
"  #touchUI .tbtn.on { --tb-face: var(--tb-hi, rgba(110,170,255,.72)); filter: brightness(1.12); }",
"  #touchUI .tbtn.on {\n    filter: brightness(1.18);\n    box-shadow:\n      0 0 0 1.5px rgba(255,255,255,.62),\n      0 0 0 4.5px var(--tb-edge),\n      0 0 26px 2px var(--tb-glow),\n      0 12px 22px -10px rgba(0,0,0,.55),\n      inset 0 6px 12px rgba(255,255,255,.30);\n  }"
)

# ===================== F3：爆炸火焰重製成翻滾火球雲 =====================
# 6) 新增單顆火球繪製函式（插在 drawFlame 之前）
R(
"function drawFlame(f, T) {",
"// v4.11：單顆翻滾火球（白熱核心 → 黃 → 橘 → 深紅邊），組成爆炸雲\nfunction drawFlameBlob(cx, cy, r, cols, a) {\n  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);\n  g.addColorStop(0,    cols[0].replace('A', (0.98 * a).toFixed(3)));\n  g.addColorStop(0.28, cols[1].replace('A', (0.95 * a).toFixed(3)));\n  g.addColorStop(0.58, cols[2].replace('A', (0.92 * a).toFixed(3)));\n  g.addColorStop(0.82, cols[3].replace('A', (0.85 * a).toFixed(3)));\n  g.addColorStop(1,    cols[4]);\n  ctx.fillStyle = g;\n  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();\n}\nfunction drawFlame(f, T) {"
)
# 7) 把「五層燭火」替換成爆炸火球雲（保留上方暖光暈與下方火星）
R(
"  // --- 五層火苗（外深內白熱，精緻又強烈）---\n  if (bossFire) {\n    flameDrop(cx, cy + s * .02, hw, hh, 'rgba(150,40,230,' + (.95 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .08, hw * .78, hh * .80, 'rgba(186,80,255,' + (.95 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .14, hw * .52, hh * .56, 'rgba(226,170,255,' + (.95 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .18, hw * .30, hh * .34, 'rgba(248,224,255,' + (.95 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .20, hw * .14, hh * .18, 'rgba(255,255,255,' + (.96 * k).toFixed(3) + ')');\n  } else {\n    flameDrop(cx, cy + s * .02, hw, hh, 'rgba(255,70,16,' + (.96 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .08, hw * .78, hh * .80, 'rgba(255,150,34,' + (.97 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .14, hw * .52, hh * .56, 'rgba(255,214,110,' + (.97 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .18, hw * .30, hh * .34, 'rgba(255,244,200,' + (.97 * k + .06).toFixed(3) + ')');\n    flameDrop(cx, cy + s * .20, hw * .14, hh * .18, 'rgba(255,255,255,' + (.98 * k).toFixed(3) + ')');\n  }\n  // --- 往 d 方向多補一段拖尾（爆炸往外噴的感覺）---\n  if (d) {\n    const tx = cx + d.x * s * .52, ty = cy + d.y * s * .52;\n    flameDrop(tx, ty, hw * .62, hh * .60, bossFire\n      ? 'rgba(180,80,250,' + (.62 * k).toFixed(3) + ')'\n      : 'rgba(255,120,30,' + (.62 * k).toFixed(3) + ')');\n  }",
"  // v4.11：爆炸火球雲（不再是燭火，像 SBR 那種翻滾的爆破火團）\n  const cols = bossFire\n    ? [ 'rgba(255,255,255,A)', 'rgba(244,200,255,A)', 'rgba(198,92,255,A)', 'rgba(150,40,230,A)', 'rgba(120,24,190,0)' ]\n    : [ 'rgba(255,255,255,A)', 'rgba(255,236,160,A)', 'rgba(255,168,40,A)', 'rgba(255,80,20,A)', 'rgba(200,30,10,0)' ];\n  drawFlameBlob(cx, cy, s * .92, cols, k);\n  const N = 6;\n  for (let i = 0; i < N; i++) {\n    const a = (i / N) * 6.283 + f.cx * 1.7 + f.cy * 0.9 + Game.gameT * 1.5;\n    const rr = s * (0.40 + 0.14 * Math.sin(f.cy * 2 + i + Game.gameT * 3));\n    const bx = cx + Math.cos(a) * s * 0.52;\n    const by = cy + Math.sin(a) * s * 0.52;\n    drawFlameBlob(bx, by, Math.max(s * 0.18, rr), cols, k * 0.92);\n  }\n  // 往 d 方向多噴一團（爆炸往外竄）\n  if (d) {\n    const tx = cx + d.x * s * .55, ty = cy + d.y * s * .55;\n    drawFlameBlob(tx, ty, s * .6, cols, k * 0.85);\n  }"
)

# ===================== F4：「我」改頭上徽章，推車也套用，名牌去掉「⭐我」文字 =====================
# 8) 推車名牌去掉「⭐我」文字（圖示徽章另外畫）
R(
"    const label = pname(p) + '🛒' + (p.ai ? '🤖' : '') + (me ? ' ⭐我' : '');",
"    const label = pname(p) + '🛒' + (p.ai ? '🤖' : '');"
)
# 9) 推車上的玩家也畫「我」徽章（場內活著時已經會畫，這裡補推車）
R(
"  const savedY = p.y;\n  p.y = y - T * .18 + wob * .4;\n  drawPlayer(p, T);\n  p.y = savedY;",
"  const savedY = p.y;\n  p.y = y - T * .18 + wob * .4;\n  drawPlayer(p, T);\n  p.y = savedY;\n  // v4.11：推車上的「我」也用頭上圖示徽章（跟場內活著時一致），不再用名牌文字\n  if (Game.mode === 'battle' && isMyPlayer(p)) drawMeBadge(x, y - T * .18 + wob * .4, R, T);"
)

# ===================== F5：遙控引爆鍵只在拿到遙控器時出現 =====================
# 10) updateHud 加 det 鈕依 me.remote 顯隱
R(
"  const fireBtn = document.querySelector('#touchUI .tfire');\n  if (fireBtn) {\n    const me = Game.players.filter(function (q) { return !q.ai; })[0] || Game.players[0];\n    fireBtn.classList.toggle('hide', !(me && me.dino));\n  }",
"  const fireBtn = document.querySelector('#touchUI .tfire');\n  if (fireBtn) {\n    const me = Game.players.filter(function (q) { return !q.ai; })[0] || Game.players[0];\n    fireBtn.classList.toggle('hide', !(me && me.dino));\n  }\n  // v4.11：遙控引爆鍵只在拿到遙控器（計時炸彈）時出現\n  const detBtn = document.querySelector('#touchUI .tdet');\n  if (detBtn) {\n    const me = Game.players.filter(function (q) { return !q.ai; })[0] || Game.players[0];\n    detBtn.classList.toggle('hide', !(me && me.remote));\n  }"
)

# ===================== F6：吐火冷卻 2 秒 ＋ 按鈕冷卻視覺 =====================
# 11) 冷卻時間 3 → 2 秒
R(
"const DINO_FIRE_CD = 3;",
"const DINO_FIRE_CD = 2;"
)
# 12) 吐火鈕冷卻遮罩＋倒數，冷卻完發亮
R(
"      if (it.kind === 'flame') {\n        // 火焰：把「一格」縮到鈕面大小，再把格心搬到畫布正中央\n        const T = cssW * .76;\n        g.translate(cssW / 2 - T / 2, cssW / 2 - T / 2 + T * .05);\n        drawFlameOn(g, { cx: 0, cy: 0, t: .30, dir: null, owner: 0 }, T);\n        return;\n      }",
"      if (it.kind === 'flame') {\n        // 火焰：把「一格」縮到鈕面大小，再把格心搬到畫布正中央\n        const T = cssW * .76;\n        g.save();\n        g.translate(cssW / 2 - T / 2, cssW / 2 - T / 2 + T * .05);\n        drawFlameOn(g, { cx: 0, cy: 0, t: .30, dir: null, owner: 0 }, T);\n        g.restore();\n        // v4.11：吐火冷卻倒數（灰罩 ＋ 秒數）；冷卻完發亮提示可用\n        const me = (Game.players.filter(function (q) { return !q.ai; })[0]) || Game.players[0];\n        if (me && me.dino) {\n          if (me.fireCd > 0) {\n            g.globalAlpha = .55; g.fillStyle = '#0b0e16';\n            g.beginPath(); g.arc(cssW / 2, cssW / 2, cssW * 0.46, 0, 6.283); g.fill();\n            g.globalAlpha = 1; g.fillStyle = '#ffd166';\n            g.font = '900 ' + Math.round(cssW * 0.42) + 'px system-ui, \"Microsoft JhengHei\", sans-serif';\n            g.textAlign = 'center'; g.textBaseline = 'middle';\n            g.fillText(String(Math.ceil(me.fireCd)), cssW / 2, cssW / 2 + 1);\n            g.textAlign = 'start'; g.textBaseline = 'alphabetic';\n          } else {\n            g.strokeStyle = 'rgba(255,170,80,.9)'; g.lineWidth = Math.max(2, cssW * 0.06);\n            g.beginPath(); g.arc(cssW / 2, cssW / 2, cssW * 0.44, 0, 6.283); g.stroke();\n          }\n        }\n        return;\n      }"
)

# ===================== F7：手套抓彈優先（不被踢／打搶走） =====================
# 13) 走路撞炸彈時，若戴手套且沒在搬彈，先跳过自動踢/打，讓放彈鍵能撿起
R(
"    // 踢炸彈 / 打炸彈：朝著炸彈的方向按就觸發（即使被炸彈擋住貼著不動也有效）\n    if (dirs.length === 1) {\n      const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);\n      const dn = dirs[0];\n      const nx = cx + DIRS[dn].x, ny = cy + DIRS[dn].y;\n      if (bombAt(nx, ny)) {\n        if (p.kick) kickBomb(p, dn);\n        else if (p.punch) punchBomb(p, dn);\n      }\n    }",
"    // 踢炸彈 / 打炸彈：朝著炸彈的方向按就觸發（即使被炸彈擋住貼著不動也有效）\n    if (dirs.length === 1) {\n      const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);\n      const dn = dirs[0];\n      const nx = cx + DIRS[dn].x, ny = cy + DIRS[dn].y;\n      // v4.11：戴手套時優先「抓彈」，不會被踢／打搶走（走進炸彈即可用放彈鍵撿起）\n      if (bombAt(nx, ny) && !(p.glove && !p.carry)) {\n        if (p.kick) kickBomb(p, dn);\n        else if (p.punch) punchBomb(p, dn);\n      }\n    }"
)

# ===================== F8：踢／拳擊炸彈撞到敵人停在前方（不穿過） =====================
# 14) 新增 enemyAtCell 輔助，並讓 findLanding 在敵人前一格停下
R(
"function findLanding(cx, cy, dx, dy) {\n  const cols = Game.cols - 2, rows = Game.rows - 2;\n  let x = cx, y = cy;\n  const cap = cols * rows;\n  for (let i = 0; i < cap; i++) {\n    x = ((x - 1 + dx + cols) % cols) + 1;\n    y = ((y - 1 + dy + rows) % rows) + 1;\n    if (x === cx && y === cy) return null;   // 繞了一整圈回到原點\n    if (cellAt(x, y) === 0 && !bombAt(x, y)) return { x: x, y: y, dist: i + 1 };\n  }\n  return null;\n}",
"// v4.11：某格是否有活著的敵人（讓踢／打的炸彈停在敵人前方，不穿過去）\nfunction enemyAtCell(cx, cy) {\n  for (let i = 0; i < Game.enemies.length; i++) {\n    const e = Game.enemies[i];\n    if (e.dead) continue;\n    if (Math.floor(e.x / Game.T) === cx && Math.floor(e.y / Game.T) === cy) return true;\n  }\n  return false;\n}\nfunction findLanding(cx, cy, dx, dy) {\n  const cols = Game.cols - 2, rows = Game.rows - 2;\n  let x = cx, y = cy;\n  const cap = cols * rows;\n  for (let i = 0; i < cap; i++) {\n    const nx = ((x - 1 + dx + cols) % cols) + 1;\n    const ny = ((y - 1 + dy + rows) % rows) + 1;\n    if (nx === cx && ny === cy) return null;   // 繞了一整圈回到原點\n    // v4.11：前方有敵人 → 落在敵人前一格（不要把敵人穿過去）\n    if (enemyAtCell(nx, ny)) return { x: x, y: y, dist: i + 1 };\n    if (cellAt(nx, ny) === 0 && !bombAt(nx, ny)) return { x: nx, y: ny, dist: i + 1 };\n    x = nx; y = ny;\n  }\n  return null;\n}"
)
# 15) 被踢飛的炸彈（b.moving）也要在敵人前一格停下
R(
"      const ncx = Math.floor(b.px / T), ncy = Math.floor(b.py / T);\n      const hitWall = cellAt(ncx + m.dx, ncy + m.dy) !== 0 ||\n        (bombAt(ncx + m.dx, ncy + m.dy) && bombAt(ncx + m.dx, ncy + m.dy) !== b);",
"      const ncx = Math.floor(b.px / T), ncy = Math.floor(b.py / T);\n      // v4.11：前方有敵人 → 停在敵人前一格（不會穿過去）\n      const hitWall = cellAt(ncx + m.dx, ncy + m.dy) !== 0 ||\n        (bombAt(ncx + m.dx, ncy + m.dy) && bombAt(ncx + m.dx, ncy + m.dy) !== b) ||\n        enemyAtCell(ncx + m.dx, ncy + m.dy);"
)

# ===================== 版本號 v4.10 → v4.11 =====================
R("const VERSION = '4.10';", "const VERSION = '4.11';")
R('id="verTxt">4.10', 'id="verTxt">4.11')
R('id="verLogVer">4.10', 'id="verLogVer">4.11')
# 16) VERSION_LOG：4.10 改 now:false，插入 4.11
R(
"  { v: '4.10', date: '2026-11-01', now: true, items: [",
"  { v: '4.11', date: '2026-11-01', now: true, items: [\n    '<b>單人怪也有血量條</b>：單人闖關的怪物跟 RPG 一樣有血量（史萊姆 2 下、鐵甲蟲／骷髏兵 3 下），頭上現在也會顯示血條，一眼看出要炸幾次',\n    '<b>功能鍵去掉黑底</b>：炸彈／遙控／吐火按鈕改成完全透明，只留金屬圓框，去掉原本的黑底（炸彈圖案不變）',\n    '<b>爆炸火焰重製</b>：炸彈爆炸改成 SBR 那種翻滾的爆炸火球雲（白熱核心＋橘紅翻騰），不再是小小燭火',\n    '<b>「我」改頭上徽章</b>：對戰時自己頭上（含復仇推車）改顯示「我」圖示徽章，名牌不再加「⭐我」文字',\n    '<b>遙控鍵隨功能出現</b>：沒拿到遙控器（計時炸彈）時不顯示遙控引爆鍵，拿到才出現',\n    '<b>吐火冷卻倒數</b>：騎龍時吐火鍵才出現，吐完進入 2 秒冷卻（灰色遮罩＋倒數秒數），冷卻完按鈕發亮表示可用',\n    '<b>手套抓彈修好</b>：戴手套時走進炸彈不會被自動踢／打搶走，可用放彈鍵撿起炸彈',\n    '<b>炸彈撞敵人會停</b>：踢／拳擊出去的炸彈碰到敵人會停在敵人前方，不再穿過敵人'\n  ] },\n  { v: '4.10', date: '2026-11-01', now: false, items: ["
)

# ---- 套用並斷言 ----
failed = []
for i, (old, new) in enumerate(rules, 1):
    c = text.count(old)
    if c != 1:
        failed.append((i, c, old[:70]))
        continue
    text = text.replace(old, new)

if failed:
    print("FAILED rules:")
    for i, c, ctx in failed:
        print("  #%d count=%d ctx=%r" % (i, c, ctx))
    print("No file written.")
else:
    out = text.replace('\n', '\r\n')
    io.open(PATH, 'w', encoding='utf-8', newline='').write(out)
    print("OK: all %d rules applied" % len(rules))
