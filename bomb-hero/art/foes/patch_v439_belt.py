# -*- coding: utf-8 -*-
# v4.39 補丁 1：輸送帶橫向脫離不再被「吸回格子中心」
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'index.html')
s = io.open(P, encoding='utf-8', newline='').read()
CRLF = '\r\n' in s


def rep(old, new, tag):
    global s
    o, n = old, new
    if CRLF:
        o = o.replace('\n', '\r\n')
        n = n.replace('\n', '\r\n')
    assert s.count(o) == 1, '[%s] 對不上（找到 %d 次）' % (tag, s.count(o))
    s = s.replace(o, n)
    print('ok [%s]' % tag)


# ---------- 1) 常數：新增「橫向甩出」倍率 ----------
rep("""const BELT_SLOW = 0.82;         // 逆行速度倍率（v1.7：逆著走不再慢到像黏住）""",
    """const BELT_SLOW = 0.82;         // 逆行速度倍率（v1.7：逆著走不再慢到像黏住）
// v4.39：橫向離開輸送帶 → 順著皮帶的側向滑動「甩出去」，比平常走路更快（原本 .95 太黏）
const BELT_CROSS = 1.28;""", 'const')

# ---------- 2) beltMulFor：垂直穿越改成加速 ----------
rep("""  if (dot > 0) return BELT_FAST;
  if (dot < 0) return BELT_SLOW;
  return .95;                    // 垂直穿越：速度略減""",
    """  if (dot > 0) return BELT_FAST;
  if (dot < 0) return BELT_SLOW;
  return BELT_CROSS;             // 橫向穿越／離開：甩出去（快），不要卡在帶子上""", 'beltMul')

# ---------- 3) tryMove 加 noAlign：只推軸向、不要把人吸回格心 ----------
rep("""function tryMove(p, dx, dy, dt, spd) {""",
    """// v4.39：第 6 個參數 noAlign=true → 只沿指定軸移動，不做「另一軸自動對齊格心」。
//   輸送帶推力一定要用這個：舊版推力走 tryMove 的一般分支，每帧把玩家吸回格子中心，
//   玩家橫著走（2.3px/帧）被吸回 1.8px/帧 → 幾乎走不出去（實測 dx≈0，卡在帶子上）。
function tryMove(p, dx, dy, dt, spd, noAlign) {""", 'tryMove sig')

rep("""      p.x += clamp((cx + dir) * T + T / 2 - p.x, -sp, sp);
      // v1.9：轉向立刻對齊列中心（1.9 倍速修正），手指一撥就轉過去
      p.y += clamp(cyT - p.y, -sp * 1.9, sp * 1.9);
      return;
    }
    // 前方被擋 → 自動滑到「那一格才走得到」的相鄰列（兩格中間也能轉，不再卡一半）
    const offY = p.y - cyT;
    if (Math.abs(offY) > T * .10) {""",
    """      p.x += clamp((cx + dir) * T + T / 2 - p.x, -sp, sp);
      // v1.9：轉向立刻對齊列中心（1.9 倍速修正），手指一撥就轉過去
      if (!noAlign) p.y += clamp(cyT - p.y, -sp * 1.9, sp * 1.9);
      return;
    }
    // 前方被擋 → 自動滑到「那一格才走得到」的相鄰列（兩格中間也能轉，不再卡一半）
    const offY = p.y - cyT;
    if (!noAlign && Math.abs(offY) > T * .10) {""", 'tryMove dx')

rep("""      p.y += clamp((cy + dir) * T + T / 2 - p.y, -sp, sp);
      // v1.9：轉向立刻對齊行中心（1.9 倍速修正）
      p.x += clamp(cxT - p.x, -sp * 1.9, sp * 1.9);
      return;
    }
    const offX = p.x - cxT;
    if (Math.abs(offX) > T * .10) {""",
    """      p.y += clamp((cy + dir) * T + T / 2 - p.y, -sp, sp);
      // v1.9：轉向立刻對齊行中心（1.9 倍速修正）
      if (!noAlign) p.x += clamp(cxT - p.x, -sp * 1.9, sp * 1.9);
      return;
    }
    const offX = p.x - cxT;
    if (!noAlign && Math.abs(offX) > T * .10) {""", 'tryMove dy')

# ---------- 4) hazardTick 的皮帶推力：關掉自動對齊 ----------
rep("""  // 輸送帶：不管有沒有走，都會被帶往輸送方向
  if (hz && hz.type === 'convey') {
    const d = DIRS[hz.dir];
    tryMove(p, d.x, d.y, dt, BELT_SPEED);
  }""",
    """  // 輸送帶：不管有沒有走，都會被帶往輸送方向
  //   v4.39：noAlign=true —— 只沿皮帶方向推，不要順手把玩家吸回格子中心
  //   （舊版吸回的力量比玩家橫向走的速度還強 → 站在輸送帶上根本走不出去）
  if (hz && hz.type === 'convey') {
    const d = DIRS[hz.dir];
    tryMove(p, d.x, d.y, dt, BELT_SPEED, true);
  }""", 'hazardTick')

# ---------- 5) 說明頁文案 ----------
rep("""  convey: { tw: '順著箭頭方向<b>加速</b>、逆向會<b>變慢</b>，橫著穿越則略減速。', cn: '顺着箭头方向<b>加速</b>、逆向会<b>变慢</b>，横着穿越则略减速。', en: 'Moving with the arrow <b>speeds you up</b>, against it <b>slows you down</b>.' },""",
    """  convey: { tw: '順著箭頭方向<b>加速</b>、逆向會<b>變慢</b>；橫著走出去會被皮帶<b>甩得很快</b>，不會黏在上面。', cn: '顺着箭头方向<b>加速</b>、逆向会<b>变慢</b>；横着走出去会被皮带<b>甩得很快</b>，不会黏在上面。', en: 'Moving with the arrow <b>speeds you up</b>, against it <b>slows you down</b>; stepping off sideways <b>flings you out fast</b>.' },""", 'i18n')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('bytes', len(s.encode('utf-8')))
