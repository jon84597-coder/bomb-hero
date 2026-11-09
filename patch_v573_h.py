# -*- coding: utf-8 -*-
"""v5.73 patch H: 招式 combo（3 組）"""
import io, os

P = os.path.join(os.path.dirname(__file__), 'bomb-hero', 'js', 'main.js')
s = io.open(P, 'r', encoding='utf-8', newline='').read()
o = len(s)

# ---- 1. combo 狀態與判定 ----
A1 = """  let charCd = 0;

  function charIdx() {"""
B1 = """  let charCd = 0;

  /* ===== v5.73：招式連動（combo）==========================================
     原本 4 個主動招各自獨立 —— 玩家只會挑「最強那一招」一直按。這裡讓兩招
     在 4 秒內接續施放時產生第三種效果：先放的招「留下狀態」，後放的招「引爆它」。
       · 冰霜 → 震地：冰層被震碎 → 範圍更大、暈更久（碎冰）
       · 護盾 → 遙控引爆：把護盾的能量炸出去 → 震退身邊所有怪
       · 遙控引爆 → 震地：炸彈殘留的氣浪被二次震開 → 全場炸點暈眩
     ====================================================================== */
  const COMBO_WIN = 4.0;
  let lastSk = '', lastAt = -999;
  function nowSec() {
    try { return (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000; }
    catch (e) { return Date.now() / 1000; }
  }
  function comboTry(p, id) {
    const t = nowSec();
    const a = lastSk, dt = t - lastAt;
    lastSk = id; lastAt = t;
    if (!p || dt > COMBO_WIN) return false;
    const T = Game.T || 40;
    let hit = false;
    if (a === 'frost' && id === 'quake') {
      /* 碎冰：範圍 5 格、暈 2.8 秒、冰藍爆發 */
      const r = 5 * T, r2 = r * r;
      (Game.enemies || []).forEach(function (e) {
        if (!e || e.dead || e.boss) return;
        if (dist2(e.x, e.y, p.x, p.y) > r2) return;
        e.dizzy = Math.max(e.dizzy || 0, 2.8);
        burst(e.x, e.y, '#bde9ff', 14, 190);
        hit = true;
      });
      for (let k = 0; k < 3; k++) burst(p.x + (Math.random() - .5) * T, p.y + (Math.random() - .5) * T, '#e8f8ff', 18, 300);
      try { Game.rings.push({ x: p.x, y: p.y, r: 0, max: 5 * T, t: 0, life: .5, col: '#bfe9ff' }); } catch (e) {}
      Game.flash = Math.max(Game.flash || 0, .35);
      Game.shake = Math.max(Game.shake || 0, .45);
      try { AudioSys.sfx('explode'); } catch (e) {}
      try { if (typeof comboToast === 'function') comboToast('碎冰'); } catch (e) {}
    } else if (a === 'shield' && id === 'det') {
      /* 盾炸：把身邊 2 格怪往外震 2 格，並補回 1 秒無敵 */
      const r = 2.5 * T, r2 = r * r;
      (Game.enemies || []).forEach(function (e) {
        if (!e || e.dead || e.boss) return;
        const dx = e.x - p.x, dy = e.y - p.y;
        if (dx * dx + dy * dy > r2) return;
        const cn = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        const d = DIRS[cn];
        const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);
        for (let k = 0; k < 2; k++) {
          const nx = cx + d.x, ny = cy + d.y;
          if (cellAt(nx, ny) === 0 && !bombAt(nx, ny)) { e.x = (nx + .5) * T; e.y = (ny + .5) * T; }
        }
        e.dizzy = Math.max(e.dizzy || 0, 1.2);
        hit = true;
      });
      p.invuln = Math.max(p.invuln || 0, 1);
      try { Game.rings.push({ x: p.x, y: p.y, r: 0, max: 2.5 * T, t: 0, life: .45, col: '#9fd8ff' }); } catch (e) {}
      for (let k = 0; k < 26; k++) burst(p.x, p.y, '#bfe4ff', 6, 320);
      Game.shake = Math.max(Game.shake || 0, .4);
      try { AudioSys.sfx('explode'); } catch (e) {}
      try { if (typeof comboToast === 'function') comboToast('盾炸'); } catch (e) {}
    } else if (a === 'det' && id === 'quake') {
      /* 氣浪：每一個炸點都變成一個小暈眩圈 */
      const list = (Game.flames || []).slice(0, 24);
      list.forEach(function (f) {
        const r = 1.6 * T, r2 = r * r;
        (Game.enemies || []).forEach(function (e) {
          if (!e || e.dead || e.boss) return;
          if (dist2(e.x, e.y, f.x, f.y) > r2) return;
          e.dizzy = Math.max(e.dizzy || 0, 1.4);
          hit = true;
        });
        burst(f.x, f.y, '#ffd9a0', 8, 160);
      });
      try { Game.rings.push({ x: p.x, y: p.y, r: 0, max: 4 * T, t: 0, life: .5, col: '#ffcf8a' }); } catch (e) {}
      Game.shake = Math.max(Game.shake || 0, .35);
      try { if (typeof comboToast === 'function') comboToast('氣浪'); } catch (e) {}
    }
    return hit;
  }

  function charIdx() {"""
assert s.count(A1) == 1, 'A1 %d' % s.count(A1)
s = s.replace(A1, B1)

# ---- 2. castById 末尾接 combo ----
A2 = """    if (!ok) return false;
    LEFT[id] = cdOf(id);
    paint();
    return true;
  }"""
B2 = """    if (!ok) return false;
    try { comboTry(p, id); } catch (e) {}
    LEFT[id] = cdOf(id);
    paint();
    return true;
  }"""
assert s.count(A2) == 1, 'A2 %d' % s.count(A2)
s = s.replace(A2, B2)

# ---- 3. reset 清 combo ----
A3 = """  function reset() { for (const k in LEFT) delete LEFT[k]; charCd = 0; }"""
B3 = """  function reset() { for (const k in LEFT) delete LEFT[k]; charCd = 0; lastSk = ''; lastAt = -999; }"""
assert s.count(A3) == 1, 'A3 %d' % s.count(A3)
s = s.replace(A3, B3)

# ---- 4. 匯出 ----
A4 = """    charCast: charCast, charDef: charDef, charCdLeft: charCdLeft, CHAR_SKILLS: CHAR_SKILLS,"""
B4 = """    charCast: charCast, charDef: charDef, charCdLeft: charCdLeft, CHAR_SKILLS: CHAR_SKILLS,
    comboTry: comboTry, lastCombo: function () { return lastSk; },"""
assert s.count(A4) == 1, 'A4 %d' % s.count(A4)
s = s.replace(A4, B4)

# ---- 5. comboToast（借用 brTip 樣式，不新增 DOM）----
A5 = """/* 出發時把背包裡的補給換成這一場的加成（買了才會有） */"""
B5 = """/* v5.73：combo 提示 —— 用既有的浮動提示，不另外長一個元件 */
function comboToast(name) {
  try { brTip('\\u2728', 'COMBO！' + name, 'good', 1.6); } catch (e) {}
}

/* 出發時把背包裡的補給換成這一場的加成（買了才會有） */"""
assert s.count(A5) == 1, 'A5 %d' % s.count(A5)
s = s.replace(A5, B5)

assert s.count('\r\n') == 0, 'CRLF!'
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(s)
os.replace(tmp, P)
print('OK', o, '->', len(s))
