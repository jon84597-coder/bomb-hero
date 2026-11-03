# -*- coding: utf-8 -*-
# v4.68：小怪遠程索敵距離縮短（6.5 格 → 3.2 格）＋ 集氣後半鎖死落點 ＋ 追丟就收手
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    n = s.count(old)
    if n != 1:
        sys.stderr.write('[FAIL] %s count=%d\n' % (tag, n))
        if n:
            i = s.find(old)
            sys.stderr.write(repr(s[max(0, i - 120):i + 200]) + '\n')
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok] ' + tag)


# ---- 1. 新常量 ----
rep("""const FOE_BLINK_T = .5;          // v4.61：鑽地／隱形的消失時間（= 落點警示圈亮多久）""",
    """const FOE_BLINK_T = .5;          // v4.61：鑽地／隱形的消失時間（= 落點警示圈亮多久）
// v4.68：小怪「看得到你」的距離（格）。以前吐彈是 6.5 格、集氣中還一路追到 8 格，
//   玩家在五格外的空地都會被點名 → 現在一律 3.2 格，跟仇恨範圍（2 格）接得起來。
const FOE_SIGHT_TILES = 3.2;
const FOE_CAST_LOCK_K = .55;     // v4.68：集氣到 55% 就鎖死落點（看得見、走得掉）""",
    'const sight')

# ---- 2. 集氣中：追蹤距離縮短、追丟收手、後半段鎖死落點 ----
rep("""    if (e.castT > 0) {
      e.castT -= dt;
      const tgt2 = nearestPlayerTo(e, T * 8);
      if (tgt2) { e.castX = Math.floor(tgt2.x / T); e.castY = Math.floor(tgt2.y / T); }
      if (e.castT > 0) return;""",
    """    if (e.castT > 0) {
      e.castT -= dt;
      // v4.68：① 追丟（跑出射程 +1.2 格／躲進樹叢）就收手，不再隔著半張地圖狙你
      //        ② 集氣前 55% 落點還跟著你，之後鎖死 —— 圈圈就定在那格，走開就不會被砸到
      const tgt2 = nearestPlayerTo(e, T * (FOE_SIGHT_TILES + 1.2));
      if (!tgt2) { e.castT = 0; e.skCd = 1.5; return; }
      if (1 - e.castT / FOE_CAST_WINDUP < FOE_CAST_LOCK_K) {
        e.castX = Math.floor(tgt2.x / T); e.castY = Math.floor(tgt2.y / T);
      }
      if (e.castT > 0) return;""",
    'cast-track')

# ---- 3. 吐彈起手距離 ----
rep("""    const tgt = nearestPlayerTo(e, T * 6.5);
    if (!tgt) return;
    // 先集氣（不再「看到你就直接射」）""",
    """    // v4.68：索敵從 6.5 格縮到 3.2 格（原本站在五格外都會被點名）
    const tgt = nearestPlayerTo(e, T * FOE_SIGHT_TILES);
    if (!tgt) return;
    // 先集氣（不再「看到你就直接射」）""",
    'spit-range')

# ---- 4. 衝撞：6 格 → 3.6 格 ----
rep("""    const tgt = nearestPlayerTo(e, T * 6);
    if (!tgt) return;
    const dx = tgt.x - e.x, dy = tgt.y - e.y;""",
    """    // v4.68：衝撞只認 3.6 格（原本 6 格，一蓄力就從畫面外撞進來）
    const tgt = nearestPlayerTo(e, T * 3.6);
    if (!tgt) return;
    const dx = tgt.x - e.x, dy = tgt.y - e.y;""",
    'charge-range')

# ---- 5. 版本號 ----
rep("const VERSION = '4.67';", "const VERSION = '4.68';", 'VERSION')
rep('<span id="verTxt">4.67</span>', '<span id="verTxt">4.68</span>', 'verTxt')
rep('<span id="verLogVer">4.67</span>', '<span id="verLogVer">4.68</span>', 'verLogVer')

# ---- 6. 更新紀錄 ----
rep("""  { v: '4.67', date: '2026-11-04', now: true, items: [""",
    """  { v: '4.68', date: '2026-11-04', now: true, items: [
    '會吐彈的小怪不再隔著五格就點名你：索敵距離 6.5 格 → 3.2 格（跟 2 格的仇恨範圍接得起來），你跑出 4 格牠就放棄',
    '集氣中的落點以前一路追著你跑到 8 格，等於「圈圈永遠在腳下」；現在集氣過半就鎖死，看到圈圈走開就不會被砸到',
    '直線衝撞的小怪也一樣：起手距離 6 格 → 3.6 格，不會再從畫面外突然撞進來',
    '附註：被隨從引到的怪（仇恨 3.4 格）也不會因此對五格外的你開火，只會走過來' ] },
  { v: '4.67', date: '2026-11-04', now: false, items: [""",
    'VERSION_LOG')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('bytes:', len(s.encode('utf-8')), 'chars:', len(s))
