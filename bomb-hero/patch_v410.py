# -*- coding: utf-8 -*-
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ---- 1. 修掉「打不死怪」的 BUG：makeEnemy 沒初始化 hitT（undefined <= 0 永遠 false）----
R(
"    dirT: 0, dirName: pick(['up', 'down', 'left', 'right']), dead: false, walkT: 0\n  };",
"    dirT: 0, dirName: pick(['up', 'down', 'left', 'right']), dead: false, walkT: 0, hitT: 0\n  };"
)

# ---- 2. RPG 小怪血條常駐顯示（一眼看出要炸幾次）----
R(
"  // 敵人頭上的血量條（受過傷才顯示）\n  for (let i = 0; i < Game.enemies.length; i++) {\n    const e = Game.enemies[i];\n    if (!e.maxHp || e.maxHp <= 1) continue;\n    if (e.hp >= e.maxHp && e.type !== 'boss') continue;",
"  // 敵人頭上的血量條（RPG 小怪常駐顯示，一眼看出要炸幾次）\n  for (let i = 0; i < Game.enemies.length; i++) {\n    const e = Game.enemies[i];\n    if (!e.maxHp || e.maxHp <= 1) continue;\n    // v4.10：RPG 小怪血條常駐（含滿血），方便判斷強度"
)

# ---- 3. drawBombArt 增加 danger 參數 ----
R(
"function drawBombArt(r, seed, hot, armed, remote) {",
"function drawBombArt(r, seed, hot, armed, remote, danger) {"
)

# ---- 4. 炸彈本體改黑色 ＋ 準備爆炸外圈紅光脈衝 ----
R(
"  // ---- 球體：左上打光的黑曜球 ----\n  const g = ctx.createRadialGradient(-r * .40, -r * .44, r * .10, 0, 0, r * 1.18);\n  g.addColorStop(0, '#ff9a9a');\n  g.addColorStop(.20, '#ef4b4b');\n  g.addColorStop(.60, '#c62f2f');\n  g.addColorStop(1, '#7c1b1b');\n  ctx.fillStyle = g;\n  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();\n  // 快引爆 → 球體由內透出紅光（保留原本的警示感，但不再是整顆變色）\n  if (hot) {\n    const hg = ctx.createRadialGradient(0, r * .25, 0, 0, 0, r);\n    hg.addColorStop(0, 'rgba(255,92,60,.58)');\n    hg.addColorStop(1, 'rgba(255,60,40,0)');\n    ctx.fillStyle = hg;\n    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();\n  }",
"  // ---- 球體：黑曜質感（原色黑），準備爆炸時由內外透出紅光 ----\n  const g = ctx.createRadialGradient(-r * .40, -r * .44, r * .10, 0, 0, r * 1.18);\n  g.addColorStop(0, '#5b6172');\n  g.addColorStop(.22, '#34384a');\n  g.addColorStop(.60, '#15171f');\n  g.addColorStop(1, '#050609');\n  ctx.fillStyle = g;\n  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();\n  // 準備爆炸 → 外圈紅光脈衝（越接近引爆越強、閃得越快）\n  const dg = danger > 0 ? danger : 0;\n  if (dg > 0) {\n    const pulse = .5 + .5 * Math.sin(Game.gameT * (16 + dg * 16) + seed * 5);\n    const rr = r * (1.5 + dg * .85);\n    const a = (0.30 + 0.55 * dg) * (0.45 + 0.55 * pulse);\n    const aura = ctx.createRadialGradient(0, 0, r * .5, 0, 0, rr);\n    aura.addColorStop(0, 'rgba(255,70,50,' + a.toFixed(3) + ')');\n    aura.addColorStop(.55, 'rgba(255,40,30,' + (a * .5).toFixed(3) + ')');\n    aura.addColorStop(1, 'rgba(255,30,20,0)');\n    ctx.fillStyle = aura;\n    ctx.beginPath(); ctx.arc(0, 0, rr, 0, 6.283); ctx.fill();\n  }\n  // 快引爆 → 球體由內透出紅光（保留原本的警示感）\n  if (hot) {\n    const hg = ctx.createRadialGradient(0, r * .25, 0, 0, 0, r);\n    hg.addColorStop(0, 'rgba(255,92,60,.58)');\n    hg.addColorStop(1, 'rgba(255,60,40,0)');\n    ctx.fillStyle = hg;\n    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();\n  }"
)

# ---- 5. drawBomb：倒數最後一秒本體晃動 ＋ 傳 danger 給 drawBombArt ----
R(
"  const r = T * .32;\n  const scale = b.flying ? 1 + Math.sin(Math.min(1, b.flying.t / b.flying.dur) * Math.PI) * .12 : 1;\n  // 影子（飛在空中時變小變淡）\n  softShadow(x, y + r * .9, r * (b.flying ? .62 : .88), r * (b.flying ? .2 : .3), b.flying ? .2 : .32);\n  ctx.save();\n  ctx.translate(x, y);\n  ctx.scale(scale, scale);\n  const blinkRate = b.timer < .7 ? 12 : 5;\n  // v3.8：只有「正在倒數燃燒」的炸彈會閃紅光；遙控彈（等著按 E）不會\n  const armed = !b.remoteArmed && !b.mine;\n  const hot = armed && Math.sin(Game.gameT * blinkRate + b.seed) > 0;\n  drawBombArt(r, b.seed, hot, armed, !!b.remoteArmed);\n  ctx.restore();",
"  const r = T * .32;\n  const scale = b.flying ? 1 + Math.sin(Math.min(1, b.flying.t / b.flying.dur) * Math.PI) * .12 : 1;\n  // 影子（飛在空中時變小變淡）\n  softShadow(x, y + r * .9, r * (b.flying ? .62 : .88), r * (b.flying ? .2 : .3), b.flying ? .2 : .32);\n  // 準備爆炸 → 本體晃動（越接近引爆晃得越凶）\n  const armed = !b.remoteArmed && !b.mine;\n  const danger = armed ? clamp(1 - b.timer / 1.0, 0, 1) : 0;\n  let sx = 0, sy = 0;\n  if (danger > 0) {\n    const amp = danger * danger * T * .055;\n    sx = Math.sin(Game.gameT * 40 + b.seed) * amp;\n    sy = Math.cos(Game.gameT * 34 + b.seed * 1.7) * amp;\n  }\n  const blinkRate = b.timer < .7 ? 12 : 5;\n  // v3.8：只有「正在倒數燃燒」的炸彈會閃紅光；遙控彈（等著按 E）不會\n  const hot = armed && Math.sin(Game.gameT * blinkRate + b.seed) > 0;\n  ctx.save();\n  ctx.translate(x + sx, y + sy);\n  ctx.scale(scale, scale);\n  drawBombArt(r, b.seed, hot, armed, !!b.remoteArmed, danger);\n  ctx.restore();"
)

# ---- 6. 引線火花更明顯（更多更亮）----
R(
"  // 濺散火星（往上飛、越飛越小越淡）\n  for (let i = 0; i < 3; i++) {\n    const ph = t * 4.4 + i * 2.1 + seed;\n    const sp = .5 + .5 * Math.sin(ph);\n    const mx = x + Math.cos(ph * 1.7) * r * (1.4 + sp * 1.5);\n    const my = y - r * (.5 + sp * 2.5);\n    const mr = Math.max(.7, r * .17 * (1 - sp * .5));",
"  // 濺散火星（往上飛、越飛越小越淡）— v4.10：火花更明顯\n  for (let i = 0; i < 4; i++) {\n    const ph = t * 5.2 + i * 1.7 + seed;\n    const sp = .5 + .5 * Math.sin(ph);\n    const mx = x + Math.cos(ph * 1.7) * r * (1.5 + sp * 1.7);\n    const my = y - r * (.5 + sp * 2.8);\n    const mr = Math.max(.9, r * .22 * (1 - sp * .5));"
)

# ---- 7~9. 版本號 ----
R("const VERSION = '4.9';", "const VERSION = '4.10';")
R('id="verTxt">4.9', 'id="verTxt">4.10')
R('id="verLogVer">4.9', 'id="verLogVer">4.10')

# ---- 10. VERSION_LOG：4.9 改 now:false，插入 4.10 ----
R(
"  { v: '4.9', date: '2026-11-01', now: true, items: [",
"  { v: '4.10', date: '2026-11-01', now: true, items: [\n    '<b>修掉打不死怪的 BUG</b>：發現小怪（含 RPG 怪物）其實一直扣不到血、炸彈炸不死 —— 原因是受擊計時器 hitT 沒初始化（undefined 讓「受擊後短暫無敵」判斷永遠不成立）。已補上 hitT:0，現在炸彈終於能炸死怪了',\n    '<b>RPG 小怪血條常駐</b>：RPG 模式所有多血量小怪頭上都顯示血條（含滿血），一眼看出每隻要炸幾次',\n    '<b>炸彈改回黑色本體</b>：放置的炸彈本體改為黑曜質感（原色黑），不再是大紅球',\n    '<b>準備爆炸會紅光＋晃動</b>：炸彈倒數最後一秒由內到外透出脈衝紅光、本體左右輕微晃動，越接近引爆越強，提醒快閃',\n    '<b>引線火花更明顯</b>：燃燒中的引線頂端火花更多更亮，點燃感更強'\n  ] },\n  { v: '4.9', date: '2026-11-01', now: false, items: ["
)

# ---- 套用並斷言 ----
failed = []
for i, (old, new) in enumerate(rules, 1):
    c = text.count(old)
    if c != 1:
        failed.append((i, c, old[:60]))
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
