# -*- coding: utf-8 -*-
"""v4.42
1) 藏人場景物件：換成中高飽和／明暗拉開的新貼圖、高度上限放寬、地面影子加深。
2) 推車投擲：落點＝集氣距離那一格 —— 石牆／軟磚／空地都能丟（可以丟到 1/2/3 格的牆上）。
"""
import io
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(ROOT, 'index.html')
HIDES = os.path.join(ROOT, 'art', 'hides', '_hides_game.js')


def load():
    raw = io.open(HTML, encoding='utf-8', newline='').read()
    return raw.replace('\r\n', '\n')          # v4.41 起整檔是 LF


def save(s):
    io.open(HTML, 'w', encoding='utf-8', newline='').write(s)


def rep(s, old, new, cnt=1):
    assert s.count(old) == cnt, '找到 %d 次（預期 %d）：%r' % (s.count(old), cnt, old[:70])
    return s.replace(old, new)


s = load()
n0 = len(s)

# ---------------------------------------------------------------- 1. 藏人貼圖
new_block = io.open(HIDES, encoding='utf-8').read()
m = re.search(r'const HIDE_ART = \{.*?\n\};', new_block, re.S)
assert m, '_hides_game.js 格式不對'
new_hide = m.group(0)

i0 = s.index('// ---------- 藏人場景物件貼圖（自動生成，勿手改')
i1 = s.index('const HIDE_ART = {', i0)
i2 = s.index('};', i1) + 2
new_head = ('// ---------- 藏人場景物件貼圖（自動生成，勿手改；來源 art/hides/pack_hides3.py）----------\n'
            '// v4.42：五種可躲人的場景物件（灌木叢／破木屋／石堆／陶甕／木箱堆）\n'
            '//   中高飽和＋拉開明暗（自體陰影），矮胖（寬 > 高）→ 場上寬 1.14 格、高不超過 1.26 格')
s = s[:i0] + new_head + '\n' + new_hide + s[i2:]

# 高度上限：陶甕這種細高物件在 1.10 格會被壓成 0.86 格寬，放寬到 1.26
s = rep(s,
        "const HIDE_ART_MAXH = 1.10;      // v4.41：高度硬上限 1.10 格 —— 疊箱也不會蓋掉上面一整格",
        "const HIDE_ART_MAXH = 1.26;      // v4.42：高度上限 1.26 格（細高的陶甕才不會被壓成小不點）")

# 地面影子：淺色物件配太淡的影子會「浮」在草地上
s = rep(s,
        """  // 地面影子（比物件窄 → 有站在地上的感覺）
  // v4.41：影子再淡一階（.24 → .115），淺色物件才不會被自己的黑影拖暗
  ctx.fillStyle = 'rgba(18,28,20,.115)';
  ctx.beginPath();
  ctx.ellipse(cx2, base - T * .03, w * .30, T * .075, 0, 0, 6.283);""",
        """  // 地面影子（比物件窄 → 有站在地上的感覺）
  // v4.42：v4.41 的 .115 太淡，物件像浮在草地上 → 回到 .21 並加寬一點
  ctx.fillStyle = 'rgba(16,26,18,.21)';
  ctx.beginPath();
  ctx.ellipse(cx2, base - T * .03, w * .33, T * .085, 0, 0, 6.283);""")

# ---------------------------------------------------------------- 2. 推車落點
old_land = """  const reach = (CART_LV[level] || CART_LV[1]).reach;         // v4.41：1／2／3 格，硬上限
  const cols = Game.cols, rows = Game.rows;
  // v4.41 改寫：以前是「reach + 16 格」，撞到牆還一格一格彈過去 → 實際飛了 5～16 格。
  //   現在只在 reach 以內找落點，撞到「硬牆」就當場停住（炸彈翻不過石牆，也不再彈跳）。
  const cells = [];
  let x = cx, y = cy;
  for (let k = 1; k <= reach; k++) {
    const nx = x + dir.d.x, ny = y + dir.d.y;
    if (nx < 1 || nx > cols - 2 || ny < 1 || ny > rows - 2) break;   // 最外圈 → 停
    x = nx; y = ny;
    const c = cellAt(nx, ny);
    cells.push({ x: nx, y: ny, kind: c, bomb: !!bombAt(nx, ny), hard: c === 1 });
    if (c === 1) break;                                            // 石牆擋住 → 後面的格子不算
  }
  if (!cells.length) return null;
  let pick = -1, onSoft = false;
  // 首選：reach 以內「最遠的一格空地」（從遠處往回找 → 集氣越滿丟越遠）
  for (let i = cells.length - 1; i >= 0; i--) {
    if (!cells[i].hard && !cells[i].bomb && cells[i].kind === 0) { pick = i; break; }
  }
  if (pick < 0) {          // 只有軟磚 → 砸在磚上（炸彈引爆時順便把那一塊磚炸掉）
    for (let i = cells.length - 1; i >= 0; i--) {
      if (!cells[i].hard && !cells[i].bomb && cells[i].kind === 2) { pick = i; onSoft = true; break; }
    }
  }
  if (pick < 0) return null;
  const path = [{ x: cx, y: cy }];
  for (let j = 0; j <= pick; j++) path.push({ x: cells[j].x, y: cells[j].y, w: cells[j].kind === 1 ? 1 : 0 });
  return { x: cells[pick].x, y: cells[pick].y, path: path, dir: dir.dn, dist: pick + 1, onSoft: onSoft };"""

new_land = """  const reach = (CART_LV[level] || CART_LV[1]).reach;         // 1／2／3 格，硬上限
  const cols = Game.cols, rows = Game.rows;
  // v4.42：落點＝「集氣距離的那一格」，石牆／軟磚／空地都算。
  //   v4.41 撞到石牆就 break（只能停在牆前），結果「明明只有 1～3 格卻丟不上牆」。
  //   現在 1／2／3 格內的牆照樣丟得上去（炸彈坐在牆頂），只是不會翻過牆再往前飛。
  const cells = [];
  let x = cx, y = cy;
  for (let k = 1; k <= reach; k++) {
    const nx = x + dir.d.x, ny = y + dir.d.y;
    if (nx < 1 || nx > cols - 2 || ny < 1 || ny > rows - 2) break;   // 最外圈 → 停
    x = nx; y = ny;
    const c = cellAt(nx, ny);
    cells.push({ x: nx, y: ny, kind: c, bomb: !!bombAt(nx, ny) });
  }
  if (!cells.length) return null;
  let pick = -1;
  // 集氣越滿丟越遠：先取 reach 那一格；那一格已經有炸彈才往回退一格
  for (let i = cells.length - 1; i >= 0; i--) {
    if (!cells[i].bomb) { pick = i; break; }
  }
  if (pick < 0) return null;
  const onWall = cells[pick].kind === 1;    // 落在石牆上 → 炸彈坐在牆頂
  const onSoft = cells[pick].kind === 2;    // 落在軟磚上 → 引爆時順便把磚砸碎
  const path = [{ x: cx, y: cy }];
  for (let j = 0; j <= pick; j++) path.push({ x: cells[j].x, y: cells[j].y, w: cells[j].kind === 1 ? 1 : 0 });
  return { x: cells[pick].x, y: cells[pick].y, path: path, dir: dir.dn, dist: pick + 1,
           onSoft: onSoft, onWall: onWall };"""
s = rep(s, old_land, new_land)

s = rep(s,
        """      toast('🚫 前面 3 格內沒有落點，沿著外圈換個位置', 1.6, 'cartNoLand');""",
        """      toast('🚫 這個方向丟不出去（那格已經有炸彈），沿著外圈換個位置', 1.6, 'cartNoLand');""")

s = rep(s,
        """    moving: null, held: false, ownerLeft: false, onSoft: !!land.onSoft,
    seed: Math.random() * 6.28,""",
        """    moving: null, held: false, ownerLeft: false, onSoft: !!land.onSoft, onWall: !!land.onWall,
    seed: Math.random() * 6.28,""")

# ---------------------------------------------------------------- 3. 炸彈畫在牆頂
s = rep(s,
        """  const r = T * .32;
  const scale = b.flying ? 1 + Math.sin(Math.min(1, b.flying.t / b.flying.dur) * Math.PI) * .12 : 1;
  // 影子（飛在空中時變小變淡）
  softShadow(x, y + r * .9, r * (b.flying ? .62 : .88), r * (b.flying ? .2 : .3), b.flying ? .2 : .32);""",
        """  const r = T * .32;
  const scale = b.flying ? 1 + Math.sin(Math.min(1, b.flying.t / b.flying.dur) * Math.PI) * .12 : 1;
  // v4.42：丟到石牆上的炸彈要「坐在牆頂」，不然會陷在方塊正面裡看不出來
  const lift = (b.onWall && !b.flying) ? T * .22 : 0;
  // 影子（飛在空中時變小變淡）
  softShadow(x, y + r * .9 - lift, r * (b.flying ? .62 : .88), r * (b.flying ? .2 : .3), b.flying ? .2 : .32);""")

s = rep(s,
        """  ctx.save();
  ctx.translate(x + sx, y + sy);
  ctx.scale(scale, scale);
  drawBombArt(r, b.seed, hot, armed, !!b.remoteArmed, danger);""",
        """  ctx.save();
  ctx.translate(x + sx, y + sy - lift);
  ctx.scale(scale, scale);
  drawBombArt(r, b.seed, hot, armed, !!b.remoteArmed, danger);""")

# 落點預告：落在牆上時準心往上抬，跟實際炸彈位置一致
s = rep(s,
        """      // 中央準心 ＋ 第幾格數字
      ctx.globalAlpha = Math.min(1, bright + .35);""",
        """      // 中央準心 ＋ 第幾格數字（丟在牆上 → 準心抬到牆頂）
      const cypv = land.onWall ? cyp - T * .22 : cyp;
      ctx.globalAlpha = Math.min(1, bright + .35);""")
s = rep(s,
        """      ctx.beginPath(); ctx.arc(cxp, cyp, T * .20, 0, 6.283); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cxp - T * .13, cyp); ctx.lineTo(cxp + T * .13, cyp);
      ctx.moveTo(cxp, cyp - T * .13); ctx.lineTo(cxp, cyp + T * .13);
      ctx.stroke();""",
        """      ctx.beginPath(); ctx.arc(cxp, cypv, T * .20, 0, 6.283); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cxp - T * .13, cypv); ctx.lineTo(cxp + T * .13, cypv);
      ctx.moveTo(cxp, cypv - T * .13); ctx.lineTo(cxp, cypv + T * .13);
      ctx.stroke();""")
s = rep(s,
        """      ctx.fillStyle = '#0a1020';
      ctx.fillText(String(land.dist), cxp, cyp + T * .03);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(land.dist), cxp, cyp);""",
        """      ctx.fillStyle = '#0a1020';
      ctx.fillText(String(land.dist), cxp, cypv + T * .03);
      ctx.fillStyle = land.onWall ? '#ffe08a' : '#ffffff';
      ctx.fillText(String(land.dist), cxp, cypv);""")

save(s)
print('OK  %d → %d 字元（%+.0f KB）' % (n0, len(s), (len(s) - n0) / 1024.0))
