# -*- coding: utf-8 -*-
# v4.11 第三輪修補：修正 TDZ（暫時性死區）風險
#   makeEnemy 現在引用 RPG_FOE，但 RPG_FOE 宣告在檔案後段（const），
#   而 ?stage=N / ?boss=1 的網址參數處理器是在「腳本執行當下」同步呼叫 startSolo()
#   → 會在 RPG_FOE 還沒初始化前就取值 → ReferenceError。
#   解法：把血量表抽成 FOE_HP，宣告在 ENEMY_SPECIES 旁邊（makeEnemy 之前），
#         讓 makeEnemy 與 RPG_FOE 共用同一份資料（單人／RPG 血量真正一致）。
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# 1) 在 ENEMY_SPECIES 之後新增 FOE_HP（單人／RPG 共用的小怪血量表）
R(
"function speciesOf(id) {\n  for (let i = 0; i < ENEMY_SPECIES.length; i++) { if (ENEMY_SPECIES[i].id === id) return ENEMY_SPECIES[i]; }\n  return ENEMY_SPECIES[0];\n}",
"function speciesOf(id) {\n  for (let i = 0; i < ENEMY_SPECIES.length; i++) { if (ENEMY_SPECIES[i].id === id) return ENEMY_SPECIES[i]; }\n  return ENEMY_SPECIES[0];\n}\n// v4.11：小怪血量表（單人闖關與 RPG 模式共用同一份 → 兩個模式「要炸幾下」完全一致）\n//   宣告在 makeEnemy 之前：?stage=N 會在腳本執行當下就呼叫 startSolo()，\n//   若這裡才取 RPG_FOE（宣告在檔案後段的 const）會撞上暫時性死區。\nconst FOE_HP = {\n  slime: 3, mush: 2, crab: 3, beetle: 4, skull: 4, lizard: 5,\n  bat: 2, ghost: 3, bee: 2, eye: 4\n};"
)

# 2) makeEnemy 改用 FOE_HP
R(
"  // v4.11：單人闖關與 RPG 模式共用同一張血量表（RPG_FOE），\n  //   不再硬寫 hp:2 → 兩個模式「要炸幾下」完全一致，頭上血條也才有意義\n  const foe = RPG_FOE[sp.id];\n  const hpBase = foe ? foe.hp : 2;",
"  // v4.11：單人闖關與 RPG 模式共用同一張血量表（FOE_HP），\n  //   不再硬寫 hp:2 → 兩個模式「要炸幾下」完全一致，頭上血條也才有意義\n  const hpBase = FOE_HP[sp.id] || 2;"
)

# 3) RPG_FOE 的 hp 改引用 FOE_HP → 真正「同一份資料」（不會再各寫各的而漂移）
R(
"const RPG_FOE = {\n  slime:  { hp: 3, def: 0, spd: .82 },   // 基礎小怪\n  mush:   { hp: 2, def: 0, spd: .88 },\n  crab:   { hp: 3, def: 0, spd: .94 },\n  beetle: { hp: 4, def: 1, spd: 1.00 },  // 中階：硬殼，防禦 1\n  skull:  { hp: 4, def: 1, spd: 1.06 },\n  lizard: { hp: 5, def: 0, spd: 1.28 },  // 疾風蜥：血多又快\n  bat:    { hp: 2, def: 0, spd: .82 },   // v4.7 飛行：穿牆，降速\n  ghost:  { hp: 3, def: 0, spd: .80 },   // v4.7\n  bee:    { hp: 2, def: 0, spd: .90 },   // v4.7\n  eye:    { hp: 4, def: 0, spd: .84 }    // v4.7\n};",
"const RPG_FOE = {\n  // v4.11：hp 全部引用 FOE_HP → 單人闖關與 RPG 模式永遠是同一份血量資料\n  slime:  { hp: FOE_HP.slime,  def: 0, spd: .82 },   // 基礎小怪\n  mush:   { hp: FOE_HP.mush,   def: 0, spd: .88 },\n  crab:   { hp: FOE_HP.crab,   def: 0, spd: .94 },\n  beetle: { hp: FOE_HP.beetle, def: 1, spd: 1.00 },  // 中階：硬殼，防禦 1\n  skull:  { hp: FOE_HP.skull,  def: 1, spd: 1.06 },\n  lizard: { hp: FOE_HP.lizard, def: 0, spd: 1.28 },  // 疾風蜥：血多又快\n  bat:    { hp: FOE_HP.bat,    def: 0, spd: .82 },   // v4.7 飛行：穿牆，降速\n  ghost:  { hp: FOE_HP.ghost,  def: 0, spd: .80 },   // v4.7\n  bee:    { hp: FOE_HP.bee,    def: 0, spd: .90 },   // v4.7\n  eye:    { hp: FOE_HP.eye,    def: 0, spd: .84 }    // v4.7\n};"
)

# 4) __BH 匯出 FOE_HP（測試用）
R(
"  RPG: RPG, RPG_ATTRS: RPG_ATTRS, RPG_POINTS: RPG_POINTS, RPG_CAP: RPG_CAP, RPG_FOE: RPG_FOE,",
"  RPG: RPG, RPG_ATTRS: RPG_ATTRS, RPG_POINTS: RPG_POINTS, RPG_CAP: RPG_CAP, RPG_FOE: RPG_FOE, FOE_HP: FOE_HP,"
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
