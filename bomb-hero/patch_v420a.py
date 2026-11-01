# -*- coding: utf-8 -*-
"""v4.20：BOSS 的仇恨範圍獨立成 3 格（小怪仍是 2 格）

使用者：「BOSS 改成距離3格就會觸發生命（生氣）」
做法：常數拆成 AGGRO_TILES（小怪 2）＋ BOSS_AGGRO_TILES（BOSS 3），
      foeInRange 依 e.boss 取半徑；說明書、版本紀錄、版號一起更新。
"""
import io, sys

PATH = 'index.html'

RULES = []

# ① 常數與註解
RULES.append((
    "//   · BOSS 也一樣：只有 2 格內才會追人／放炸彈，平常只在自己的地盤踱步\n"
    "// ================================================================\n"
    "const AGGRO_TILES = 2;         // 幾格內才會發現玩家（直線距離）",

    "//   · BOSS 塊頭大、看得遠：v4.20 起踏進 3 格就會發火（小怪仍是 2 格）\n"
    "// ================================================================\n"
    "const AGGRO_TILES = 2;         // 小怪：幾格內才會發現玩家（直線距離）\n"
    "const BOSS_AGGRO_TILES = 3;    // v4.20：BOSS 的仇恨範圍（使用者要求 3 格）",
))

# ② foeInRange 依 e.boss 取半徑
RULES.append((
    "function foeInRange(e, p) {\n"
    "  if (!e || !p || !p.alive) return false;\n"
    "  const R = AGGRO_TILES * (Game.T || 40) * 1.02;  // ×1.02：剛好站在 2 格邊界也算\n"
    "  return dist2(e.x, e.y, p.x, p.y) <= R * R;\n"
    "}",

    "function aggroTiles(e) { return (e && e.boss) ? BOSS_AGGRO_TILES : AGGRO_TILES; }\n"
    "function foeInRange(e, p) {\n"
    "  if (!e || !p || !p.alive) return false;\n"
    "  const R = aggroTiles(e) * (Game.T || 40) * 1.02;  // ×1.02：剛好站在邊界也算\n"
    "  return dist2(e.x, e.y, p.x, p.y) <= R * R;\n"
    "}",
))

# ③ enemyAggro 註解
RULES.append((
    "// 回傳「被惹到」的那個玩家；沒人在 2 格內就回 null",
    "// 回傳「被惹到」的那個玩家；沒人進到仇恨範圍（小怪 2 格／BOSS 3 格）就回 null",
))

# ④ updateBoss 註解
RULES.append((
    "  // v4.19：BOSS 也一樣 —— 玩家沒進到 2 格內，牠只在自己家附近踱步，不追人也不放炸彈",
    "  // v4.20：BOSS 的仇恨是 3 格 —— 玩家沒進到 3 格內，牠只在自己家附近踱步，不追人也不放炸彈",
))

# ⑤ 說明書：BOSS 條目改成 3 格（tw / cn / en 三個語系字串同一行）
RULES.append((
    "{ tw: '<b>你踏進 2 格內</b>牠才會發火：頭上冒出 😡 生氣泡泡，開始追你、在你附近放炸彈（遠處才丟過牆）。<b>跑出 2 格外牠就回去踱步</b>。', "
    "cn: '<b>你踏进 2 格内</b>它才会发火：头上冒出 😡 生气泡泡，开始追你、在你附近放炸弹（远处才丢过墙）。<b>跑出 2 格外它就回去踱步</b>。', "
    "en: 'Step <b>within 2 tiles</b> and it enrages: an 😡 balloon pops up, it chases you and bombs you (lobbing over walls only from range). <b>Leave the 2-tile ring and it goes back to patrolling</b>.' },",

    "{ tw: '<b>你踏進 3 格內</b>牠才會發火（BOSS 塊頭大、看得比小怪遠，小怪是 2 格）：頭上冒出 😡 生氣泡泡，開始追你、在你附近放炸彈（遠處才丟過牆）。<b>跑出 3 格外牠就回去踱步</b>。', "
    "cn: '<b>你踏进 3 格内</b>它才会发火（BOSS 块头大、看得比小怪远，小怪是 2 格）：头上冒出 😡 生气泡泡，开始追你、在你附近放炸弹（远处才丢过墙）。<b>跑出 3 格外它就回去踱步</b>。', "
    "en: 'Step <b>within 3 tiles</b> and it enrages (the boss is big and sees farther than minions, which use 2 tiles): an 😡 balloon pops up, it chases you and bombs you (lobbing over walls only from range). <b>Leave the 3-tile ring and it goes back to patrolling</b>.' },",
))

# ⑥ 說明書小怪頁的 hlead：補一句 BOSS 例外
RULES.append((
    "先原地蓄力再加速撲上來 —— 看到泡泡就準備好炸彈。</div>';",
    "先原地蓄力再加速撲上來 —— 看到泡泡就準備好炸彈。<br>"
    "<b>BOSS 例外</b>：牠塊頭大、看得比小怪遠，<b>3 格內</b>就會發火（小怪是 2 格）。</div>';",
))

# ⑦ 版號三處
RULES.append(("const VERSION = '4.19';", "const VERSION = '4.20';"))
RULES.append(('<span id="verTxt">4.19</span>', '<span id="verTxt">4.20</span>'))
RULES.append(('<span id="verLogVer">4.19</span>', '<span id="verLogVer">4.20</span>'))

# ⑧ VERSION_LOG：插入 4.20，4.19 的 now 關掉
RULES.append((
    "  { v: '4.19', date: '2026-11-02', now: true, items: [",

    "  { v: '4.20', date: '2026-11-02', now: true, items: [\n"
    "    '<b>👑 BOSS 更早就會發火</b>：牠塊頭大、看得遠 —— 你踏進 <b>3 格內</b>牠就開始冒 😡、追你、丟炸彈（小怪仍維持 2 格）。跑出 3 格外牠就回去踱步',\n"
    "    '<b>🎯 為什麼要改</b>：BOSS 走比較慢，以前要貼到 2 格才發火，常常還沒反應就被炸到；改成 3 格讓你有時間繞開牠的地盤'\n"
    "  ] },\n"
    "  { v: '4.19', date: '2026-11-02', now: false, items: [",
))

# ⑨ __BH 匯出
RULES.append((
    "  AGGRO_TILES: AGGRO_TILES, ANGER_WINDUP: ANGER_WINDUP, ANGER_DASH_T: ANGER_DASH_T,",
    "  AGGRO_TILES: AGGRO_TILES, BOSS_AGGRO_TILES: BOSS_AGGRO_TILES, aggroTiles: aggroTiles,\n"
    "  ANGER_WINDUP: ANGER_WINDUP, ANGER_DASH_T: ANGER_DASH_T,",
))

if __name__ == '__main__':
    raw = io.open(PATH, 'rb').read().decode('utf-8')
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    for i, (old, new) in enumerate(RULES, 1):
        n = s.count(old)
        if n != 1:
            print('  ! rule %d -> hits %d' % (i, n))
            print('    ' + old.split('\n')[0][:80])
            sys.exit(1)
        s = s.replace(old, new)
        print('  ok rule %d' % i)
    if crlf:
        s = s.replace('\n', '\r\n')
    io.open(PATH, 'wb').write(s.encode('utf-8'))
    print('saved', PATH)
