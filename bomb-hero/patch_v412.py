# -*- coding: utf-8 -*-
# v4.12 修補：使用者回報的四個問題
#   ① 敵人暈眩時被炸到不會扣血／不會死（updateEnemy 在暈眩時直接 return，連火焰傷害都跳過）
#   ② LINE／FB 等 WebView：轉正後畫面變巨大、不能拖曳；全螢幕點不開
#   ③ 單人闖關的小怪要「打一下就死」（沒有血量）；RPG 模式的怪才有血量 → 兩個模式分離
#   ④ 手機功能鍵還是有黑底 → 真正來源是「全域 canvas 規則」的 background:#0a0f1c
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ================================================================
# ① 敵人暈眩時仍要吃火焰傷害
# ================================================================
# 原本：暈眩就直接 return → 整段「火焰傷害」檢查被跳過 → 炸到不扣血也不會死
# 修法：暈眩時只跳過「移動／行為」，火焰傷害照跑（把傷害檢查搬到 function 最前面）
R(
"""function updateEnemy(e, dt) {
  if (e.boss) { updateBoss(e, dt); return; }
  if (e.dizzy > 0) { e.dizzy -= dt; return; }      // v1.9：被炸彈砸到 → 暈 1 秒不動
  if (e.hitT > 0) e.hitT -= dt;""",
"""function updateEnemy(e, dt) {
  if (e.boss) { updateBoss(e, dt); return; }
  // v4.12：暈眩只代表「不能移動」，不代表免疫傷害。
  //   原本這裡直接 return → 連下面的「火焰傷害」檢查都被跳過 → 暈眩中的怪炸到不扣血也不會死。
  //   改成：暈眩時仍然收火焰傷害，只是不能移動。
  const stunned = e.dizzy > 0;
  if (stunned) { e.dizzy -= dt; enemyFlameDamage(e, dt); return; }   // v1.9：被炸彈砸到 → 暈 1 秒不動
  if (e.hitT > 0) e.hitT -= dt;"""
)
# 把「火焰傷害」那段抽成獨立函式 enemyFlameDamage，兩處共用
R(
"""  // 火焰傷害（飛行怪照樣怕火）
  for (let i = 0; i < Game.flames.length; i++) {
    const f = Game.flames[i];
    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T)) {
      if (e.hitT <= 0) {
        e.hp = (e.hp || 1) - flameHitDamage(e);
        if (e.hp > 0) {
          e.hitT = .55;
          burst(e.x, e.y, '#ffffff', 8, 150);
          AudioSys.sfx('hurt');
          break;
        }
        e.dead = true;
        Game.players.forEach(function (p) { p.score += 100; });
        burst(e.x, e.y, e.color, 14, 180);
        bubbleDeathPair(e, f.owner, e.r * 2 + 14, Game.T * 1.98);
        AudioSys.sfx('hurt');
        break;
      }
      break;
    }
  }
}""",
"""  // 火焰傷害（飛行怪照樣怕火）
  enemyFlameDamage(e, dt);
}

// v4.12：敵人的火焰傷害檢查（獨立出來 → 暈眩時也能吃到傷害）
function enemyFlameDamage(e, dt) {
  const T = Game.T;
  if (e.dead) return;
  if (e.hitT > 0) e.hitT = Math.max(0, e.hitT - dt);
  for (let i = 0; i < Game.flames.length; i++) {
    const f = Game.flames[i];
    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T)) {
      if (e.hitT <= 0) {
        e.hp = (e.hp || 1) - flameHitDamage(e);
        if (e.hp > 0) {
          e.hitT = .55;
          burst(e.x, e.y, '#ffffff', 8, 150);
          AudioSys.sfx('hurt');
          break;
        }
        e.dead = true;
        Game.players.forEach(function (p) { p.score += 100; });
        burst(e.x, e.y, e.color, 14, 180);
        bubbleDeathPair(e, f.owner, e.r * 2 + 14, Game.T * 1.98);
        AudioSys.sfx('hurt');
        break;
      }
      break;
    }
  }
}"""
)

# ================================================================
# ③ 單人闖關的小怪：一擊必殺（沒有血量）；RPG 才有血量
# ================================================================
# 撤銷 v4.11 的 FOE_HP 統一設計：
#   單人闖關 → hp 1（炸一下就死），不畫血條
#   RPG 模式 → 用 RPG_FOE 的血量，畫血條
R(
"""  // v4.11：單人闖關與 RPG 模式共用同一張血量表（FOE_HP），
  //   不再硬寫 hp:2 → 兩個模式「要炸幾下」完全一致，頭上血條也才有意義
  const hpBase = FOE_HP[sp.id] || 2;""",
"""  // v4.12：單人闖關的小怪「炸一下就死」（hp 1，沒有血量概念）；
  //   只有 RPG 模式的怪才有血量（由 buildRpgStage 另外覆寫成 RPG_FOE 的數值）。
  //   → 兩個模式的血量計算是分開的，不要共用同一張表。
  const hpBase = 1;"""
)
# 血條：只有 RPG 模式才畫（單人不畫）
R(
"""function drawRpgHud(T) {
  // v4.11：敵人頭上的血量條（單人／RPG／BOSS 全部顯示，一眼看出要炸幾次）
  for (let i = 0; i < Game.enemies.length; i++) {
    const e = Game.enemies[i];
    if (!e.maxHp || e.maxHp <= 1) continue;
    const w = Math.max(16, T * .58), h = Math.max(3, T * .07);
    const x = e.x - w / 2, y = e.y - enemyArtR(e) - h - 5;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(x - 1.2, y - 1.2, w + 2.4, h + 2.4);
    ctx.fillStyle = e.type === 'boss' ? '#ffd166' : '#7fe08a';
    ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), h);
  }
  if (!Game.rpg) return;""",
"""function drawRpgHud(T) {
  // v4.12：敵人血條「只有 RPG 模式」才畫。
  //   單人闖關的怪是一擊必殺（沒有血量概念）→ 不畫血條。
  //   RPG 模式的怪有多血量 → 頭上顯示血條，一眼看出要炸幾下。
  if (Game.rpg) {
    for (let i = 0; i < Game.enemies.length; i++) {
      const e = Game.enemies[i];
      if (!e.maxHp || e.maxHp <= 1) continue;
      const w = Math.max(16, T * .58), h = Math.max(3, T * .07);
      const x = e.x - w / 2, y = e.y - enemyArtR(e) - h - 5;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(x - 1.2, y - 1.2, w + 2.4, h + 2.4);
      ctx.fillStyle = e.type === 'boss' ? '#ffd166' : '#7fe08a';
      ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), h);
    }
  }
  if (!Game.rpg) return;"""
)

# ================================================================
# ④ 手機功能鍵的黑底：真正來源是「全域 canvas 規則」
# ================================================================
# 全域 `canvas { ... background: #0a0f1c; border-radius: 14px; }` 套用到每一個 canvas，
#   連觸控鈕內的 .ticon 圖示畫布也被畫成黑底圓角方塊 → 這才是使用者看到的「黑底」。
R(
"""  #touchUI .ticon {
    position: relative; z-index: 1; display: block;
    width: 100%; height: 100%; pointer-events: none;
  }""",
"""  #touchUI .ticon {
    position: relative; z-index: 1; display: block;
    width: 100%; height: 100%; pointer-events: none;
    /* v4.12：全域 canvas 規則有 background:#0a0f1c + border-radius:14px，
       會把觸控鈕的「圖示畫布」也畫成黑底圓角方塊 → 這才是真正的黑底來源。
       這裡明確蓋掉：畫布完全透明、圓形（配合圓形鈕框）。 */
    background: transparent !important;
    border-radius: 50% !important;
  }"""
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
