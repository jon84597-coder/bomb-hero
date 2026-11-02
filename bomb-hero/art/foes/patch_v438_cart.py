# -*- coding: utf-8 -*-
"""v4.38-2/3：推車投擲 —— 垂直射線＋遇牆彈跳／提示只自己可見"""
import io, re

PAGE = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\index.html'
s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')


def sub1(old, new, tag):
    global s
    assert s.count(old) == 1, '%s: count=%d' % (tag, s.count(old))
    s = s.replace(old, new)
    print('ok [%s]' % tag)


def cut_func(name):
    """切出整個 function（含大括號），回傳 (start, end)"""
    i = s.index('function ' + name + '(')
    j = s.index('{', i)
    d = 0
    k = j
    while k < len(s):
        if s[k] == '{':
            d += 1
        elif s[k] == '}':
            d -= 1
            if d == 0:
                return i, k + 1
        k += 1
    raise SystemExit('括號不匹配: ' + name)


# ---------- ① CART_LV 加「射程」 ----------
sub1('''const CART_LV = [
  { edge: 1, color: '#7ee08a', name: '第 1 格' },
  { edge: 2, color: '#ffd166', name: '第 2 格' },
  { edge: 3, color: '#ff5e7e', name: '第 3 格' }
];''',
     '''// v4.38：改成「射程」——推車只能垂直往場內丟，集氣愈久飛愈遠（牆一律彈跳過去）
const CART_LV = [
  { edge: 1, reach: 3,  color: '#7ee08a', name: '近 3 格' },
  { edge: 2, reach: 6,  color: '#ffd166', name: '中 6 格' },
  { edge: 3, reach: 10, color: '#ff5e7e', name: '遠 10 格' }
];''', 'cart-lv')

# ---------- ② cartPickLanding 改寫 ----------
a, b = cut_func('cartPickLanding')
NEW_PICK = '''// v4.38：推車只能「垂直於所在那一邊」往場內丟 —— 站在上邊就只能往下，不能斜 45 度。
function cartThrowDir(p) {
  const T = Game.T;
  const cx = clamp(Math.round(p.x / T - .5), 0, Game.cols - 1);
  const cy = clamp(Math.round(p.y / T - .5), 0, Game.rows - 1);
  const dT = cy, dB = Game.rows - 1 - cy, dL = cx, dR = Game.cols - 1 - cx;
  const m = Math.min(dT, dB, dL, dR);
  if (m === dT) return { dn: 'down', d: DIRS.down };
  if (m === dB) return { dn: 'up', d: DIRS.up };
  if (m === dL) return { dn: 'right', d: DIRS.right };
  return { dn: 'left', d: DIRS.left };
}
// 落點：沿垂直方向直線飛出去，遇到牆／炸彈一律「跳過那一格」繼續飛，
//   第一格「空地」才落地（所以可以越過一整排牆丟進場內，不會卡在牆上）。
function cartPickLanding(p, lv) {
  const T = Game.T;
  const level = (lv == null ? 1 : lv);
  const cx = clamp(Math.round(p.x / T - .5), 0, Game.cols - 1);
  const cy = clamp(Math.round(p.y / T - .5), 0, Game.rows - 1);
  const dir = cartThrowDir(p);
  const reach = (CART_LV[level] || CART_LV[1]).reach;
  const land = findThrowLanding(cx, cy, dir.d.x, dir.d.y, reach);
  if (!land) return null;
  return { x: land.x, y: land.y, path: land.path, dir: dir.dn, dist: land.dist };
}
// 相容舊呼叫：方向字串
function cartLandingDir(p) { return cartThrowDir(p).dn; }'''
s = s[:a] + NEW_PICK + s[b:]
print('ok [cart-pick]')

# ---------- ③ cartThrowBomb 改寫 ----------
a, b = cut_func('cartThrowBomb')
NEW_THROW = '''function cartThrowBomb(p, lv) {
  const T = Game.T;
  const land = cartPickLanding(p, lv);
  if (!land) return false;                       // 這條射線上沒有任何空地 → 丟不出去
  const cx = clamp(Math.round(p.x / T - .5), 0, Game.cols - 1);
  const cy = clamp(Math.round(p.y / T - .5), 0, Game.rows - 1);
  // 逐格拋物線：path 會讓動畫「一格一格跳過牆」，最後一格才是落點
  Game.bombs.push({
    cx: land.x, cy: land.y, px: p.x, py: p.y,
    timer: 2.4, power: 1, owner: p, passers: [], remoteArmed: false, mine: false,
    moving: null, held: false, ownerLeft: false, seed: Math.random() * 6.28,
    flying: {
      fx: cx, fy: cy, tx: land.x, ty: land.y, t: 0,
      dur: Math.min(1.15, .14 + land.dist * .095),
      path: land.path
    }
  });
  p.cartCd = 1.6;
  AudioSys.sfx('throw');
  return true;
}'''
s = s[:a] + NEW_THROW + s[b:]
print('ok [cart-throw]')

# ---------- ④ 提示只自己可見 ----------
sub1('''  const chg = p.cartCharge || 0;
  const qChg = Math.min(1, chg / CART_CHARGE_MAX);
  {''',
     '''  const chg = p.cartCharge || 0;
  const qChg = Math.min(1, chg / CART_CHARGE_MAX);
  // v4.38：投擲相關提示（手持炸彈高亮／集氣條／落點預告／瞄準線）只畫給「自己」看，
  //   多人或連線時看不到別人的集氣狀態與瞄準格，避免資訊外洩也避免畫面太亂。
  const showThrowUi = isMyPlayer(p);
  if (showThrowUi) {''', 'cart-ui-1')

sub1('''  // v4.17：集氣條「永遠顯示」而且做大做亮（沒按也看得懂可以集氣）
  {''',
     '''  // v4.17：集氣條「永遠顯示」而且做大做亮（沒按也看得懂可以集氣）
  if (showThrowUi) {''', 'cart-ui-2')

# 落點數字改成「幾格」＋ 瞄準線改成沿路徑折線
sub1('''      ctx.fillStyle = '#0a1020';
      ctx.fillText(String(CART_LV[lvNow].edge), cxp, cyp + T * .03);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(CART_LV[lvNow].edge), cxp, cyp);''',
     '''      ctx.fillStyle = '#0a1020';
      ctx.fillText(String(land.dist), cxp, cyp + T * .03);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(land.dist), cxp, cyp);''', 'cart-dist')

sub1('''      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cxp, cyp); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    }
  }
  // 名牌''',
     '''      // v4.38：沿實際飛行路徑畫折線（會跨過牆格，一眼看出「這顆會跳過哪幾格」）
      ctx.beginPath();
      ctx.moveTo(x, y);
      const fp = land.path || [];
      for (let k = 1; k < fp.length; k++) ctx.lineTo(fp[k].x * T + T / 2, fp[k].y * T + T / 2);
      ctx.stroke();
      // 被跳過的牆格畫一個小小的「越過」標記
      for (let k = 1; k < fp.length - 1; k++) {
        if (Game.grid[fp[k].y][fp[k].x] === 0) continue;
        ctx.globalAlpha = Math.min(.7, bright + .25);
        ctx.beginPath();
        ctx.arc(fp[k].x * T + T / 2, fp[k].y * T + T / 2, T * .13, 0, 6.283);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    }
  }
  // 名牌''', 'cart-line')

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('寫回 index.html')
