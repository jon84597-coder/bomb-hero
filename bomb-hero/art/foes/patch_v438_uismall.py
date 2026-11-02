# -*- coding: utf-8 -*-
"""v4.38-5：對戰模式的角色名牌不再擋住手機畫面"""
import io

PAGE = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\index.html'
s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')


def sub1(old, new, tag):
    global s
    assert s.count(old) == 1, '%s: count=%d' % (tag, s.count(old))
    s = s.replace(old, new)
    print('ok [%s]' % tag)


# ---------- ① 場內角色名牌 ----------
sub1('''  // 名牌
  if (Game.mode === 'battle') {
    ctx.font = '700 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,15,28,.75)';
    const label = (tmD ? tmD.dot : '') + pname(p) + (p.ai ? '🤖' : '');
    const tw = ctx.measureText(label).width;
    ctx.fillRect(x - tw / 2 - 4, y - R * 2.3 - 13, tw + 8, 13);
    ctx.fillStyle = tmD ? tmD.hex : c.color;
    ctx.fillText(label, x, y - R * 2.3 - 3);
    ctx.textAlign = 'start';
  }''',
     '''  // 名牌
  // v4.38：手機的小格子（T < 52）名牌不再掛在頭頂。
  //   頭頂本來還有「我」徽章，名牌＋徽章疊起來接近 1.7 格高，
  //   會把角色「正上方那一格」整個蓋住 —— 手機玩家看不到自己前面有沒有炸彈。
  //   小屏改成：自己只留「我」徽章（名字省略）；對手的名字改成腳下一行小字。
  if (Game.mode === 'battle') {
    const meBadge = isMyPlayer(p);
    const small = T < 52;
    if (!(small && meBadge)) {
      ctx.font = '700 ' + (small ? 9 : 10) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10,15,28,.72)';
      const label = (tmD ? tmD.dot : '') + pname(p) + (p.ai && !small ? '🤖' : '');
      const tw = ctx.measureText(label).width;
      const ly = small ? (y + T * .44) : (y - R * 2.3 - 13);
      const lh = small ? 11 : 13;
      ctx.fillRect(x - tw / 2 - 4, ly, tw + 8, lh);
      ctx.fillStyle = tmD ? tmD.hex : c.color;
      ctx.fillText(label, x, ly + lh - 3);
      ctx.textAlign = 'start';
    }
  }''', 'name-small')

# ---------- ② 「我」徽章：小屏縮小並貼近頭頂 ----------
sub1('''  const t = Game.gameT;
  const w = Math.max(24, T * .68), h = Math.max(19, T * .52);
  const bob = Math.sin(t * 5.2) * Math.max(1.2, T * .035);
  // 對戰時頭上還有名字名牌（高 13），「我」再往上疊
  const top = y - R * 2.3 - 17 - h + bob;''',
     '''  const t = Game.gameT;
  // v4.38：小屏（T < 52）縮小並貼著頭頂 —— 原本名牌＋徽章一起疊到 1.7 格高，
  //   把手機玩家上方那一格完全遮住。
  const small = T < 52;
  const w = small ? Math.max(20, T * .56) : Math.max(24, T * .68);
  const h = small ? Math.max(15, T * .42) : Math.max(19, T * .52);
  const bob = Math.sin(t * 5.2) * Math.max(1.2, T * .035);
  const top = small ? (y - R * 1.30 - h + bob)
    : (y - R * 2.3 - 17 - h + bob);''', 'me-badge')

# ---------- ③ 推車上的名牌同樣小屏處理 ----------
sub1('''  // 名牌
  if (Game.mode === 'battle') {
    ctx.font = '700 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,15,28,.75)';
    const me = isMyPlayer(p);
    const label = pname(p) + '🛒' + (p.ai ? '🤖' : '');
    const tw = ctx.measureText(label).width;
    ctx.fillRect(x - tw / 2 - 4, y - R * 2.75 - 13, tw + 8, 13);
    ctx.fillStyle = me ? '#7ee0ff' : '#ffd166';
    ctx.fillText(label, x, y - R * 2.75 - 3);
    ctx.textAlign = 'start';
  }''',
     '''  // 名牌（推車）
  if (Game.mode === 'battle') {
    const me = isMyPlayer(p);
    const small = T < 52;
    if (!(small && me)) {
      ctx.font = '700 ' + (small ? 9 : 10) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10,15,28,.72)';
      const label = (small ? '' : pname(p) + '🛒') + (p.ai && !small ? '🤖' : '') || '🛒';
      const tw = ctx.measureText(label).width;
      const ly = small ? (y + T * .40) : (y - R * 2.75 - 13);
      const lh = small ? 11 : 13;
      ctx.fillRect(x - tw / 2 - 4, ly, tw + 8, lh);
      ctx.fillStyle = me ? '#7ee0ff' : '#ffd166';
      ctx.fillText(label, x, ly + lh - 3);
      ctx.textAlign = 'start';
    }
  }''', 'cart-name')

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('寫回 index.html')
