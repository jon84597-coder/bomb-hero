# -*- coding: utf-8 -*-
# v4.53 patch A：16:28 五點中的 1／3／4／5
#   1. 重生點不再死寫 (1,1) —— 大圖出生格是隨機的，硬回 (1,1) 會卡在石頭裡
#   3. 拳擊改成「跨一道牆就落地」，落地還是牆才繼續彈（原本一路飛到最遠空地）
#   4. 推車集氣改成階梯式（輕點 1 格 / 按住 .35s 2 格 / .70s 3 格並鎖定）
#   5. 選角卡片放大：◀▶ 與 🤖 從 20×17 → 44×44，頭像 54px，AI 鍵顯示 👤／🤖 狀態
#   順便做 CSS 縮排壓縮，騰出空間（不刪註解）
import io, sys, re

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
before = len(s)

def must(c, m):
    if not c:
        print('FAIL ' + m); sys.exit(1)

def rep(old, new, tag):
    global s
    if old not in s:
        must(new in s, 'MISS ' + tag)
        print('  skip ' + tag); return
    must(s.count(old) == 1, 'DUP(%d) %s' % (s.count(old), tag))
    s = s.replace(old, new)
    print('  ok   ' + tag)

# ---------------- 1. 重生點 ----------------
SAFE_FN = '''// v4.53：重生點不再死寫 (1,1)。
//   大圖（bigGrid）的出生格是隨機的，硬回 (1,1) 常常直接卡在石頭裡 —— 這就是「重生點有問題」。
//   優先在出生格找 3×3 全是空地的位置；找不到就撿「離出生格最近、而且 3×3 沒牆／沒炸彈／沒火焰／沒怪」的空地。
function safeRespawnCell(p) {
  const cols = Game.cols, rows = Game.rows;
  const sc = Game.spawnCell || { x: 1, y: 1 };
  const T = Game.T || 1;
  const clean = function (x, y) {
    if (x < 1 || y < 1 || x > cols - 2 || y > rows - 2) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return false;
      if (cellAt(nx, ny) !== 0) return false;          // 3×3 內有牆就不算乾淨
    }
    if (bombAt(x, y) || enemyAtCell(x, y)) return false;
    for (let i = 0; i < (Game.flames || []).length; i++) {
      if (flameCovers(Game.flames[i], (x + .5) * T, (y + .5) * T, T)) return false;
    }
    return true;
  };
  if (clean(sc.x, sc.y)) return { x: sc.x, y: sc.y };
  let best = null, bd = Infinity;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (!clean(x, y)) continue;
    const d = Math.abs(x - sc.x) + Math.abs(y - sc.y);
    if (d < bd) { bd = d; best = { x: x, y: y }; }
  }
  return best || { x: sc.x, y: sc.y };
}
'''
rep("// 出生點保護：切比雪夫距離 d 以內不算怪區\nfunction nearSpawn(x, y, d) {",
    SAFE_FN + "// 出生點保護：切比雪夫距離 d 以內不算怪區\nfunction nearSpawn(x, y, d) {",
    'safeRespawnCell fn')

rep("""        resetPlayerStats(p);
        p.x = 1 * Game.T + Game.T / 2; p.y = 1 * Game.T + Game.T / 2;
        p.alive = true; p.invuln = 2; p.dead = false; p.slide = null; p.warpLock = '';""",
    """        resetPlayerStats(p);
        const rs = safeRespawnCell(p);          // v4.53：回到本場出生格附近的安全空地
        p.x = (rs.x + .5) * Game.T; p.y = (rs.y + .5) * Game.T;
        p.alive = true; p.invuln = 2.2; p.dead = false; p.slide = null; p.warpLock = '';
        p.camSnap = true;                       // 鏡頭直接跳過去，不要慢慢捲""",
    'respawn pos')

# ---------------- 3. 拳擊逐道牆彈跳 ----------------
OLD_PUNCH = """// v4.52：拳擊專用落點 —— 直線飛出去，牆（石牆／軟磚）與炸彈一律跳過，
//   停在那個方向上「最遠的空地」；撞到敵人就停在牠前面一格；撞到外框就停。
//   舊版直接借 findLanding，遇到第一格空地就停 → 只飛 1 格，看起來像沒越牆。
function punchLanding(bx, by, dx, dy) {
  const cols = Game.cols, rows = Game.rows;
  const path = [{ x: bx, y: by }];
  let best = null, x = bx, y = by;
  for (let k = 1; k <= cols + rows; k++) {
    const nx = x + dx, ny = y + dy;
    if (nx < 1 || nx > cols - 2 || ny < 1 || ny > rows - 2) break;     // 撞到最外框
    const solid = cellAt(nx, ny) !== 0;
    path.push({ x: nx, y: ny, w: solid ? 1 : 0 });
    if (enemyAtCell(nx, ny)) break;                                    // 有敵人 → 停在前面
    if (!solid && !bombAt(nx, ny)) best = { x: nx, y: ny, dist: k, path: path.slice() };
    x = nx; y = ny;
  }
  return best;
}"""
NEW_PUNCH = """// v4.53：拳擊＝「跨過一道牆就落地」。落地那格如果還是牆，才繼續彈第二道。
//   v4.52 取的是「這個方向最遠的空地」→ 隔好幾格直接一路飛到底，手感太強、也看不懂在飛什麼。
function punchLanding(bx, by, dx, dy) {
  const cols = Game.cols, rows = Game.rows;
  const path = [{ x: bx, y: by }];
  let x = bx, y = by;
  for (let k = 1; k <= cols + rows; k++) {
    const nx = x + dx, ny = y + dy;
    if (nx < 1 || nx > cols - 2 || ny < 1 || ny > rows - 2) break;     // 撞到最外框
    const solid = cellAt(nx, ny) !== 0;
    path.push({ x: nx, y: ny, w: solid ? 1 : 0 });
    if (enemyAtCell(nx, ny)) break;                                    // 有敵人 → 停在前面
    if (solid || bombAt(nx, ny)) { x = nx; y = ny; continue; }         // 牆／別人的炸彈 → 跳過，繼續彈
    return { x: nx, y: ny, dist: k, path: path.slice() };              // 第一格空地就落地
  }
  return null;
}"""
rep(OLD_PUNCH, NEW_PUNCH, 'punchLanding step')

# ---------------- 4. 推車階梯式選格 ----------------
rep("""// v1.8：場外推車「按住集氣」——沒集氣丟第 1 格、集一半丟第 2 格、集滿丟第 3 格
const CART_CHARGE_MAX = .6;                    // 集氣到滿所需秒數""",
    """// v1.8：場外推車「按住集氣」——沒集氣丟第 1 格、集一半丟第 2 格、集滿丟第 3 格
// v4.53：改成階梯式、而且「到頂鎖定」——輕點＝1 格、按住 .35 秒＝2 格、.70 秒＝3 格（再久也不會亂跳）。
//   舊版是連續比例（.25~.60 秒之間才是 2 格），那個窗口只有 0.35 秒，實戰根本按不準。
const CART_STEP1 = .35, CART_STEP2 = .70;
const CART_CHARGE_MAX = CART_STEP2;            // 集氣條滿格＝鎖定在第 3 格""",
    'cart const')

rep("""function cartChargeLevel(t) {
  const q = (t || 0) / CART_CHARGE_MAX;
  return q >= 1 ? 2 : (q >= .42 ? 1 : 0);
}""",
    """function cartChargeLevel(t) {
  t = t || 0;
  return t >= CART_STEP2 ? 2 : (t >= CART_STEP1 ? 1 : 0);
}""",
    'cartChargeLevel')

rep("  const qChg = Math.min(1, chg / CART_CHARGE_MAX);",
    "  const qChg = (cartChargeLevel(chg) + 1) / 3;          // v4.53：三階顯示（1／2／3 格）",
    'cart gauge')

rep("'bt.charge': '💪 按住放彈鍵集氣：綠＝第 1 格、黃＝第 2 格、紅＝第 3 格'",
    "'bt.charge': '💪 按住放彈鍵：輕點＝第 1 格、按住一下＝第 2 格、按久一點＝第 3 格（到頂就鎖住）'",
    'bt.charge text')

# ---------------- 5. 選角卡片 ----------------
rep("""        '<button data-ai="' + i + '" title="切換人類／AI">🤖</button></div>' +""",
    """        '<button data-ai="' + i + '" class="aibtn' + (ai ? ' on' : '') + '" title="切換人類／AI">' +
          (ai ? '🤖' : '👤') + '</button></div>' +""",
    'ai btn state')

SLOT_CSS = """/* v4.53：選角卡片放大 —— 原本 ◀▶🤖 只有 20x17px，手機根本點不到，8 格擠成一團也不好看 */
#scr-battle #pSlots{grid-template-columns:repeat(auto-fit,minmax(164px,1fr));gap:10px;justify-content:stretch}
#scr-battle #pSlots .pbox{padding:10px 10px 9px;border-width:2px;border-radius:14px;
 background:linear-gradient(180deg,#18223c,#101728);
 box-shadow:0 3px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.07)}
#scr-battle #pSlots .pbox.ai{background:linear-gradient(180deg,#1d1636,#120e22)}
#scr-battle #pSlots .pbox.joined{box-shadow:0 3px 0 rgba(0,0,0,.35),0 0 0 2px rgba(70,214,140,.5),inset 0 1px 0 rgba(255,255,255,.08)}
#scr-battle #pSlots .pbox .pj{font-size:12.5px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#scr-battle #pSlots .pbox canvas.pav{width:54px;height:54px;margin:4px auto 2px;border-radius:50%;
 background:radial-gradient(circle at 50% 36%,#2b3b62,#141b2d);box-shadow:inset 0 0 0 2px rgba(120,160,255,.16)}
#scr-battle #pSlots .pbox.joined canvas.pav{box-shadow:inset 0 0 0 2px rgba(70,214,140,.45)}
#scr-battle #pSlots .crow{gap:6px;margin-top:9px;align-items:center}
#scr-battle #pSlots .crow button{width:44px;height:44px;font-size:17px;border-radius:11px;
 background:#1d2842;color:#dbe8ff;border:1px solid #374a74;cursor:pointer;
 display:flex;align-items:center;justify-content:center;transition:filter .1s,transform .08s}
#scr-battle #pSlots .crow button:active{transform:translateY(2px);filter:brightness(1.25)}
#scr-battle #pSlots .crow button.aibtn{background:#251c40;border-color:#4c3b7d;color:#c9a8ff}
#scr-battle #pSlots .crow button.aibtn.on{background:#3d2d69;border-color:#8a5cf0;box-shadow:0 0 0 2px rgba(138,92,240,.35)}
#scr-battle #pSlots .pbox .pname{margin-top:8px;height:32px;font-size:12px;border-radius:9px}
#scr-battle #pSlots .pw{margin-top:5px;font-size:10.5px;line-height:1.3}
#scr-battle #pSlots .ptm{height:30px;font-size:11px;border-radius:9px}
@media (max-width:520px){
 #scr-battle #pSlots{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
 #scr-battle #pSlots .pbox{padding:8px 8px 7px;border-radius:12px}
 #scr-battle #pSlots .crow button{width:40px;height:40px;font-size:15px}
 #scr-battle #pSlots .pbox canvas.pav{width:46px;height:46px}
}
"""
rep('</style>', SLOT_CSS + '</style>', 'slot css')

# ---------------- 空間：CSS 縮排壓縮（保留註解） ----------------
a = s.index('<style>'); b = s.index('</style>')
css = s[a:b]
lines = css.split('\n')
out = []
for ln in lines:
    if ln.strip():
        out.append(ln.lstrip(' ').rstrip())
    else:
        out.append('')
new_css = '\n'.join(out)
s = s[:a] + new_css + s[b:]

io.open(P, 'w', encoding='utf-8', newline='').write(s)
after = len(s)
print('chars %d -> %d (%+d)' % (before, after, after - before))
print('bytes %d -> %d' % (len(before.encode('utf-8')), len(after.encode('utf-8'))))
