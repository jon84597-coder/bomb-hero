# -*- coding: utf-8 -*-
# v4.11 補充修補（第二輪）：修掉第一輪 patch 後仍存在的落差
#   F1b：單人怪的「血量數字」要跟 RPG 一致（共用 RPG_FOE 的血量表），並補血條
#   F2b：.tact / .tdet / .tfire 仍帶深色面盤 → 一併去掉黑底
#   F3b：drawFlame 既有「上方暖光暈」也要跟新火球雲一致（避免舊燭火殘影）
#   F4b：drawCart 的「我」徽章位置要對齊推車上的角色（不能浮太高）
#   F5b：遙控鍵初始要 hide（拿到才顯示）
#   F6b：吐火鈕冷卻中 → 灰色；冷卻完 → 發亮（CSS class 驅動）
#   F7b：手套撿彈要能在「走進炸彈格」時成立（放寬 solidOrBomb）+ 線上模式也要能撿
#   F8b：findLanding 遇到敵人時要停在「敵人前一格」（不可穿過）；b.flying 也要停
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ===================== F1b：單人怪血量與 RPG 對齊 =====================
# 單人闖關的小怪血量改用 RPG_FOE 表（原本硬寫 hp:2，導致單人跟 RPG 計算不一樣）
R(
"function makeEnemy(x, y, type, stage, spdMul) {\n  const M = spdMul || 1;\n  const sp = speciesOf(type);\n  const e = {",
"function makeEnemy(x, y, type, stage, spdMul) {\n  const M = spdMul || 1;\n  const sp = speciesOf(type);\n  // v4.11：單人闖關與 RPG 模式共用同一張血量表（RPG_FOE），\n  //   不再硬寫 hp:2 → 兩個模式「要炸幾下」完全一致，頭上血條也才有意義\n  const foe = RPG_FOE[sp.id];\n  const hpBase = foe ? foe.hp : 2;\n  const e = {"
)
R(
"    kind: sp.kind, r: sp.r, hp: 2, maxHp: 2,   // v4.8：小怪血量上調（原本 1）",
"    kind: sp.kind, r: sp.r, hp: hpBase, maxHp: hpBase,   // v4.11：血量改用 RPG_FOE（單人／RPG 一致）"
)
# 原本「鐵甲蟲／骷髏兵 3 下」的特例已被 RPG_FOE 取代（beetle/skull 都是 4）
R(
"  if (sp.id === 'beetle' || sp.id === 'skull') { e.hp = 3; e.maxHp = 3; }    // 有甲／硬骨頭：要炸三次\n",
""
)

# ===================== F2b：三顆功能鍵的面盤也去掉（真正透明） =====================
R(
"    --tb-face: rgba(74,34,14,.64);\n    --tb-ring: rgba(255,186,120,.62);",
"    --tb-face: rgba(0,0,0,0);          // v4.11：透明（只留金屬圓框）\n    --tb-ring: rgba(255,186,120,.62);"
)
R(
"    --tb-face: rgba(8,38,50,.64);\n    --tb-ring: rgba(150,235,255,.60);",
"    --tb-face: rgba(0,0,0,0);          // v4.11：透明（只留金屬圓框）\n    --tb-ring: rgba(150,235,255,.60);"
)
R(
"    --tb-face: rgba(62,16,8,.64);\n    --tb-ring: rgba(255,168,130,.62);",
"    --tb-face: rgba(0,0,0,0);          // v4.11：透明（只留金屬圓框）\n    --tb-ring: rgba(255,168,130,.62);"
)
# 圓框本體：面盤透明後，內圈不要再留深色；外圈金屬環保留
R(
"    background:\n      radial-gradient(circle at 50% 50%,\n        var(--tb-face) 0%, var(--tb-face) 63%,\n        var(--tb-ring) 64%, var(--tb-ring) 100%);",
"    /* v4.11：面盤完全透明 → 只剩外圈金屬環（原本深藍底盤造成「黑底」） */\n    background:\n      radial-gradient(circle at 50% 50%,\n        var(--tb-face) 0%, var(--tb-face) 63%,\n        var(--tb-ring) 64%, var(--tb-ring) 100%);"
)

# ===================== F4b：推車徽章位置 =====================
R(
"  // v4.11：推車上的「我」也用頭上圖示徽章（跟場內活著時一致），不再用名牌文字\n  if (Game.mode === 'battle' && isMyPlayer(p)) drawMeBadge(x, y - T * .18 + wob * .4, R, T);",
"  // v4.11：推車上的「我」也用頭上圖示徽章（跟場內活著時一致），不再用名牌文字\n  if (Game.mode === 'battle' && isMyPlayer(p)) drawMeBadge(x, y - T * .30 + wob * .4, R * .9, T);"
)

# ===================== F5b：遙控鍵初始隱藏 =====================
R(
'          <div class="tbtn tdet" data-t="det" title="遙控引爆"><canvas class="ticon" data-icon="remote"></canvas></div>',
'          <div class="tbtn tdet hide" data-t="det" title="遙控引爆"><canvas class="ticon" data-icon="remote"></canvas></div>'
)

# ===================== F6b：吐火鈕冷卻灰態／可用發亮（CSS class） =====================
R(
"  body.touch #touchUI .tdet.hide, body.touch #touchUI .tfire.hide { display: none; }",
"  body.touch #touchUI .tdet.hide, body.touch #touchUI .tfire.hide { display: none; }\n  /* v4.11：吐火冷卻中 → 整顆按鈕變灰；冷卻完 → 發亮（可用） */\n  body.touch #touchUI .tfire.cool { filter: grayscale(.85) brightness(.62); opacity: .72; }\n  body.touch #touchUI .tfire.ready { box-shadow:\n      0 0 0 1.5px rgba(255,255,255,.72),\n      0 0 0 4.5px var(--tb-edge),\n      0 0 26px 4px var(--tb-glow),\n      inset 0 6px 12px rgba(255,255,255,.30);\n    filter: brightness(1.22); }"
)
# updateHud 同步吐火鈕的冷卻 / 可用 class
R(
"  // v4.11：遙控引爆鍵只在拿到遙控器（計時炸彈）時出現\n  const detBtn = document.querySelector('#touchUI .tdet');\n  if (detBtn) {\n    const me = Game.players.filter(function (q) { return !q.ai; })[0] || Game.players[0];\n    detBtn.classList.toggle('hide', !(me && me.remote));\n  }",
"  // v4.11：遙控引爆鍵只在拿到遙控器（計時炸彈）時出現\n  const detBtn = document.querySelector('#touchUI .tdet');\n  if (detBtn) {\n    const me = Game.players.filter(function (q) { return !q.ai; })[0] || Game.players[0];\n    detBtn.classList.toggle('hide', !(me && me.remote));\n  }\n  // v4.11：吐火鈕的冷卻灰態／冷卻完發亮\n  if (fireBtn) {\n    const me = Game.players.filter(function (q) { return !q.ai; })[0] || Game.players[0];\n    if (me && me.dino) {\n      fireBtn.classList.toggle('cool', me.fireCd > 0);\n      fireBtn.classList.toggle('ready', me.fireCd <= 0);\n    } else {\n      fireBtn.classList.remove('cool');\n      fireBtn.classList.remove('ready');\n    }\n  }"
)

# ===================== F7b：戴手套可以走進炸彈格（才能撿起來） =====================
# solidOrBomb：戴手套的玩家可以穿過炸彈格（這樣才走得到炸彈旁邊撿它）
R(
"function solidOrBomb(cx, cy, p) {\n  if (cellAt(cx, cy) !== 0) return true;\n  const b = bombAt(cx, cy);\n  if (b && !(b.passers && b.passers.indexOf(p) >= 0)) return true;\n  return false;\n}",
"function solidOrBomb(cx, cy, p) {\n  if (cellAt(cx, cy) !== 0) return true;\n  const b = bombAt(cx, cy);\n  // v4.11：戴手套時可以走進炸彈格 —— 否則永遠走不到炸彈旁邊撿不起來\n  if (b && p && p.glove) return false;\n  if (b && !(b.passers && b.passers.indexOf(p) >= 0)) return true;\n  return false;\n}"
)
# placeBomb：撿彈時「面前」判定要更寬（左右也找），並允許撿自己剛放的炸彈
R(
"  // 撿炸彈（手套）：腳下或面前的炸彈都能撿\n  if (p.glove && !p.carry) {\n    let b = bombAt(cx, cy);\n    if (!b) {\n      const fd = DIRS[p.facing];\n      b = bombAt(cx + fd.x, cy + fd.y);\n    }",
"  // 撿炸彈（手套）：腳下或四個方向的炸彈都能撿（戴手套可以踩進炸彈格）\n  if (p.glove && !p.carry) {\n    let b = bombAt(cx, cy);\n    if (!b) {\n      const fd = DIRS[p.facing] || DIRS.right;\n      b = bombAt(cx + fd.x, cy + fd.y);\n    }\n    if (!b) {\n      const dirs4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];\n      for (let i = 0; i < dirs4.length; i++) {\n        const cand = bombAt(cx + dirs4[i][0], cy + dirs4[i][1]);\n        if (cand) { b = cand; break; }\n      }\n    }"
)

# ===================== F8b：飛行的炸彈也要停在敵人前方 =====================
R(
"      if (k >= 1) {\n        b.flying = null;\n        b.px = f.tx * T + T / 2; b.py = f.ty * T + T / 2;\n        b.cx = f.tx; b.cy = f.ty;\n        b.passers = [];\n      }",
"      // v4.11：飛行途中前方有敵人 → 提前停在敵人前一格（不要穿過敵人）\n      if (k < 1) {\n        const stepX = (f.tx > f.fx) ? 1 : (f.tx < f.fx ? -1 : 0);\n        const stepY = (f.ty > f.fy) ? 1 : (f.ty < f.fy ? -1 : 0);\n        const ncx = Math.floor(b.px / T), ncy = Math.floor(b.py / T);\n        if ((stepX || stepY) && enemyAtCell(ncx + stepX, ncy + stepY)) {\n          b.flying = null;\n          b.px = ncx * T + T / 2; b.py = ncy * T + T / 2;\n          b.cx = ncx; b.cy = ncy;\n          b.passers = [];\n          continue;\n        }\n      }\n      if (k >= 1) {\n        b.flying = null;\n        b.px = f.tx * T + T / 2; b.py = f.ty * T + T / 2;\n        b.cx = f.tx; b.cy = f.ty;\n        b.passers = [];\n      }"
)

# ===================== HELP_FOES：血量數字同步（單人／RPG 統一後的實際數值） =====================
R(
"  { id: 'slime', k: 'ground', hp: 1, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Slime',\n    d: { tw: '最基礎的小怪，隨機亂走。<b>炸一下就解決</b>，常一次來好幾隻。', cn: '最基础的小怪，随机乱走。<b>炸一下就解决</b>，常一次来好几只。', en: 'Basic wanderer. <b>One blast</b> kills it; they often come in groups.' } },",
"  { id: 'slime', k: 'ground', hp: 3, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Slime',\n    d: { tw: '最基礎的小怪，隨機亂走。<b>要炸 3 下</b>才會倒，常一次來好幾隻。頭上會顯示血條。', cn: '最基础的小怪，随机乱走。<b>要炸 3 下</b>才会倒，常一次来好几只。头上会显示血条。', en: 'Basic wanderer. <b>3 hits</b> to kill; they often come in groups. HP bar overhead.' } },"
)
R(
"  { id: 'beetle', k: 'ground', hp: 2, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Iron Beetle',\n    d: { tw: '會<b>主動追人</b>。有硬甲，<b>要炸 2 次</b>才會倒。', cn: '会<b>主动追人</b>。有硬甲，<b>要炸 2 次</b>才会倒。', en: '<b>Chases you</b>. Armoured — <b>takes 2 hits</b>.' } },",
"  { id: 'beetle', k: 'ground', hp: 4, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Iron Beetle',\n    d: { tw: '會<b>主動追人</b>。有硬甲，<b>要炸 4 次</b>才會倒。', cn: '会<b>主动追人</b>。有硬甲，<b>要炸 4 次</b>才会倒。', en: '<b>Chases you</b>. Armoured — <b>takes 4 hits</b>.' } },"
)
R(
"  { id: 'crab', k: 'ground', hp: 1, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Crab',\n    d: { tw: '橫著亂走，路線很難抓。<b>一發就爆</b>，但常堵在窄路上。', cn: '横着乱走，路线很难抓。<b>一发就爆</b>，但常堵在窄路上。', en: 'Sidesteps unpredictably. <b>One hit</b>, but loves to block narrow paths.' } },",
"  { id: 'crab', k: 'ground', hp: 3, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Crab',\n    d: { tw: '橫著亂走，路線很難抓。<b>要炸 3 下</b>，但常堵在窄路上。', cn: '横着乱走，路线很难抓。<b>要炸 3 下</b>，但常堵在窄路上。', en: 'Sidesteps unpredictably. <b>3 hits</b>, but loves to block narrow paths.' } },"
)
R(
"  { id: 'skull', k: 'ground', hp: 2, spd: { tw: '偏快', cn: '偏快', en: 'Fast' }, en: 'Skeleton',\n    d: { tw: '骷髏兵會<b>追人</b>、速度偏快，<b>要炸 2 次</b>。被盯上時最危險。', cn: '骷髅兵会<b>追人</b>、速度偏快，<b>要炸 2 次</b>。被盯上时最危险。', en: '<b>Chases you</b> and is fast. <b>2 hits</b> to kill. Deadly when it locks on.' } },",
"  { id: 'skull', k: 'ground', hp: 4, spd: { tw: '偏快', cn: '偏快', en: 'Fast' }, en: 'Skeleton',\n    d: { tw: '骷髏兵會<b>追人</b>、速度偏快，<b>要炸 4 次</b>。被盯上時最危險。', cn: '骷髅兵会<b>追人</b>、速度偏快，<b>要炸 4 次</b>。被盯上时最危险。', en: '<b>Chases you</b> and is fast. <b>4 hits</b> to kill. Deadly when it locks on.' } },"
)
R(
"  { id: 'mush', k: 'ground', hp: 1, spd: { tw: '最慢', cn: '最慢', en: 'Slowest' }, en: 'Poison Shroom',",
"  { id: 'mush', k: 'ground', hp: 2, spd: { tw: '最慢', cn: '最慢', en: 'Slowest' }, en: 'Poison Shroom',"
)
R(
"  { id: 'lizard', k: 'ground', hp: 1, spd: { tw: '最快', cn: '最快', en: 'Fastest' }, en: 'Wind Lizard',",
"  { id: 'lizard', k: 'ground', hp: 5, spd: { tw: '最快', cn: '最快', en: 'Fastest' }, en: 'Wind Lizard',"
)
R(
"  { id: 'bat', k: 'fly', hp: 1, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Bat',",
"  { id: 'bat', k: 'fly', hp: 2, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Bat',"
)
R(
"  { id: 'ghost', k: 'fly', hp: 1, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Ghost',",
"  { id: 'ghost', k: 'fly', hp: 3, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Ghost',"
)
R(
"  { id: 'bee', k: 'fly', hp: 1, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Poison Bee',",
"  { id: 'bee', k: 'fly', hp: 2, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Poison Bee',"
)
R(
"  { id: 'eye', k: 'fly', hp: 1, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Evil Eye',",
"  { id: 'eye', k: 'fly', hp: 4, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Evil Eye',"
)

# ---- 套用並斷言 ----
failed = []
for i, (old, new) in enumerate(rules, 1):
    c = text.count(old)
    if c != 1:
        failed.append((i, c, old[:90]))
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
