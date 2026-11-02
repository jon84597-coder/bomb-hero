# -*- coding: utf-8 -*-
"""v4.38-8：縮圈中的 AI —— 會躲炸彈、會放炸彈打人，不再只會擠在場中央繞圈"""
import io

PAGE = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\index.html'
s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')


def sub1(old, new, tag):
    global s
    assert s.count(old) == 1, '%s: count=%d' % (tag, s.count(old))
    s = s.replace(old, new)
    print('ok [%s]' % tag)


# ---------- ① aiSdFlee 的 BFS 不再走進別人的火線 ----------
sub1('''      if (seen[key(nx, ny)]) continue;
      if (cellAt(nx, ny) !== 0 || bombAt(nx, ny)) continue;
      seen[key(nx, ny)] = 1;''',
     '''      if (seen[key(nx, ny)]) continue;
      if (cellAt(nx, ny) !== 0 || bombAt(nx, ny)) continue;
      // v4.38：躲石頭不等於往火裡鑽 —— 別人的炸彈／火焰格不列入 BFS 可走格
      if (dangerAt(nx, ny, p)) continue;
      seen[key(nx, ny)] = 1;''', 'sdflee-danger')

# ---------- ② 縮圈分支：先躲炸彈，再談逃落石；同時會放彈打人 ----------
sub1('''    } else if (Game.sdActive) {
      // v4.37：縮圈中 → 用 BFS 找一條通往中心安全區的路（不管牆怎麼擋都走得出去）
      const flee = aiSdFlee(p, cx, cy);
      p.aiDir = flee || (safeOpts.length ? safeOpts[0] : (opts.length ? pick(opts) : null));''',
     '''    } else if (Game.sdActive) {
      // v4.37：縮圈中 → 用 BFS 找一條通往中心安全區的路（不管牆怎麼擋都走得出去）
      // v4.38：不再「只會往中間擠」——
      //   ① 站在別人的炸彈／火焰上時先躲（躲的方向也要避開落石）
      //   ② 自己有活路時會主動放炸彈打對手，邊躲石頭邊打
      const bombDanger = dangerAt(cx, cy, p);
      const flee = aiSdFlee(p, cx, cy);
      if (bombDanger) {
        const esc = safeOpts.filter(function (dn) {
          return !sdSoon(cx + DIRS[dn].x, cy + DIRS[dn].y, 14);
        });
        p.aiDir = esc.length ? pick(esc)
          : (flee || (safeOpts.length ? pick(safeOpts) : (opts.length ? pick(opts) : null)));
      } else {
        p.aiDir = flee || (safeOpts.length ? safeOpts[0] : (opts.length ? pick(opts) : null));
      }
      // 進攻：自己不在火線上、而且確認有逃命路線，才放彈（不然會自己把退路封死）
      if (!bombDanger && flee && !p.carry && !bombAt(cx, cy)) {
        let foe = null, fd = Infinity;
        Game.players.forEach(function (q) {
          if (q === p || !q.alive || q.cart) return;
          const dd = dist2(q.x, q.y, p.x, p.y);
          if (dd < fd) { fd = dd; foe = q; }
        });
        const mineN2 = Game.bombs.filter(function (b) { return b.owner === p && !b.held; }).length;
        if (foe && fd < (T * lv.foeR) * (T * lv.foeR) && mineN2 < p.maxBombs &&
            Math.random() < lv.bomb * .5) placeBomb(p);
      }''', 'sd-attack')

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('寫回 index.html')
