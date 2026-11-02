# -*- coding: utf-8 -*-
"""v1.7-a：輸送帶逆走加速 / 炸彈跟著輸送帶走 / BOSS 紫色火焰"""
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()
n = 0


def rep(old, new, tag):
    global s, n
    assert old in s, 'MISS: ' + tag
    assert s.count(old) == 1, 'DUP(%d): %s' % (s.count(old), tag)
    s = s.replace(old, new)
    n += 1
    print('OK', tag)


# ---------- 1) 輸送帶逆走不再慢到走不動 ----------
rep("""const BELT_SLOW = 0.52;         // 逆行速度倍率""",
    """const BELT_SLOW = 0.82;         // 逆行速度倍率（v1.7：逆著走不再慢到像黏住）""",
    'belt slow 0.52 -> 0.82')

# ---------- 6) 輸送帶上的炸彈會跟著被帶走 ----------
rep("""      if (hitWall && passedCenter) {
        b.px = ncx * T + T / 2; b.py = ncy * T + T / 2;
        b.moving = null;
      } else {
        b.cx = ncx; b.cy = ncy;
      }
    }
    // passers 更新（離開後不得再穿）""",
    """      if (hitWall && passedCenter) {
        b.px = ncx * T + T / 2; b.py = ncy * T + T / 2;
        b.moving = null;
      } else {
        b.cx = ncx; b.cy = ncy;
      }
    }
    // 輸送帶：放在帶子上的炸彈跟著被帶走（玩家的、BOSS 的都一樣）
    if (!b.held && !b.flying && !b.moving) {
      const bh = (Game.hazards[b.cy] && Game.hazards[b.cy][b.cx]) || null;
      if (bh && bh.type === 'convey') {
        const bd = DIRS[bh.dir] || DIRS.right;
        b.beltAcc = (b.beltAcc || 0) + dt * BELT_SPEED;
        let bstep = 0;
        while (b.beltAcc >= T) {
          const nx = b.cx + bd.x * (bstep + 1), ny = b.cy + bd.y * (bstep + 1);
          if (cellAt(nx, ny) !== 0 || bombAt(nx, ny)) { b.beltAcc = 0; break; }
          bstep++; b.beltAcc -= T;
        }
        if (bstep > 0) { b.cx += bd.x * bstep; b.cy += bd.y * bstep; b.passers = []; }
        const bk = Math.max(0, Math.min(1, b.beltAcc / T));
        b.px = b.cx * T + T / 2 + bd.x * bk * T;
        b.py = b.cy * T + T / 2 + bd.y * bk * T;
      } else {
        b.beltAcc = 0;
      }
    }
    // passers 更新（離開後不得再穿）""",
    'bomb rides conveyor')

# ---------- 7) BOSS 的火焰是紫色的 ----------
rep("""function drawFlame(f, T) {
  const x = f.cx * T + T / 2, y = f.cy * T + T / 2;
  const k = clamp(f.t / .46, 0, 1);
  const flick = 1 + Math.sin(Game.gameT * 34 + f.cx * 3 + f.cy * 7) * .07;
  const s = T * .5 * (0.6 + 0.4 * Math.sin(k * Math.PI)) * flick;
  const d = f.dir ? DIRS[f.dir] : null;
  function blob(r, dx, dy, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 6.283); ctx.fill();
    if (d) { ctx.beginPath(); ctx.arc(x + dx + d.x * s * .55, y + dy + d.y * s * .55, r * .82, 0, 6.283); ctx.fill(); }
  }
  blob(s * .92, 0, 0, 'rgba(255,80,30,' + (.92 * k + .08) + ')');          // 外焰
  blob(s * .62, 0, -s * .06, 'rgba(255,170,40,' + (.95 * k + .05) + ')');  // 中焰
  blob(s * .30, 0, -s * .10, 'rgba(255,250,210,' + (.9 * k + .1) + ')');   // 白心
}""",
    """function drawFlame(f, T) {
  const x = f.cx * T + T / 2, y = f.cy * T + T / 2;
  const k = clamp(f.t / .46, 0, 1);
  const flick = 1 + Math.sin(Game.gameT * 34 + f.cx * 3 + f.cy * 7) * .07;
  const s = T * .5 * (0.6 + 0.4 * Math.sin(k * Math.PI)) * flick;
  const d = f.dir ? DIRS[f.dir] : null;
  // BOSS 自己放的炸彈 → 紫色魔焰（owner 為 null 就是 BOSS）
  const bossFire = f.owner == null;
  function blob(r, dx, dy, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 6.283); ctx.fill();
    if (d) { ctx.beginPath(); ctx.arc(x + dx + d.x * s * .55, y + dy + d.y * s * .55, r * .82, 0, 6.283); ctx.fill(); }
  }
  if (bossFire) {
    blob(s * 1.06, 0, 0, 'rgba(118,24,190,' + (.42 * k + .10) + ')');          // 紫色魔光暈
    blob(s * .92, 0, 0, 'rgba(158,48,236,' + (.92 * k + .08) + ')');           // 紫外焰
    blob(s * .60, 0, -s * .06, 'rgba(206,118,255,' + (.95 * k + .05) + ')');   // 亮紫中焰
    blob(s * .30, 0, -s * .10, 'rgba(246,224,255,' + (.9 * k + .1) + ')');     // 白心
  } else {
    blob(s * .92, 0, 0, 'rgba(255,80,30,' + (.92 * k + .08) + ')');            // 外焰
    blob(s * .62, 0, -s * .06, 'rgba(255,170,40,' + (.95 * k + .05) + ')');    // 中焰
    blob(s * .30, 0, -s * .10, 'rgba(255,250,210,' + (.9 * k + .1) + ')');     // 白心
  }
}""",
    'boss purple flame')

# 爆炸火花也改成紫色，讓 BOSS 的彈一眼看得出來
rep("""  Game.shake = Math.min(1, Game.shake + .55);
  AudioSys.sfx('explode');
  burst(cx * T + T / 2, cy * T + T / 2, '#ffb347', 16, 200);""",
    """  Game.shake = Math.min(1, Game.shake + .55);
  AudioSys.sfx('explode');
  // BOSS 的彈（owner 為 null）噴紫色火花，跟玩家的橘色火花區別
  burst(cx * T + T / 2, cy * T + T / 2, b.owner ? '#ffb347' : '#c471ff', 16, 200);""",
    'boss burst purple')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('patched', n, 'bytes', len(s.encode('utf-8')))
