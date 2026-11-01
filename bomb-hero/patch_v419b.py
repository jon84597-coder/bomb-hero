# -*- coding: utf-8 -*-
"""v4.19 patch B：版號、更新紀錄、說明書（2 格規則 / 中高階怪 / BOSS 地盤）"""
import io, sys

def apply(path, rules):
    raw = io.open(path, 'rb').read().decode('utf-8')
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    for i, (name, old, new) in enumerate(rules, 1):
        n = s.count(old)
        if n != 1:
            print('  ! [%02d] %s -> hits %d' % (i, name, n)); sys.exit(1)
        s = s.replace(old, new)
        print('  ok [%02d] %s' % (i, name))
    if crlf:
        s = s.replace('\n', '\r\n')
    io.open(path, 'wb').write(s.encode('utf-8'))
    print('saved', path)

RULES = [
    ("VERSION",
     "const VERSION = '4.18';",
     "const VERSION = '4.19';"),
    ("verTxt",
     '<div class="ver beta">測試版 v<span id="verTxt">4.18</span></div>',
     '<div class="ver beta">測試版 v<span id="verTxt">4.19</span></div>'),
    ("verLogVer",
     '📜 <b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.18</span></span>',
     '📜 <b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.19</span></span>'),
    ("VERSION_LOG 4.19",
     """const VERSION_LOG = [
  { v: '4.18', date: '2026-11-02', now: true, items: [""",
     """const VERSION_LOG = [
  { v: '4.19', date: '2026-11-02', now: true, items: [
    '<b>👀 怪物只在 <span style="color:#ffd166">2 格內</span>才會理你</b>：所有小怪（<b>包含會飛的</b>）都一樣 —— 你沒踏進牠 2 格範圍內，牠就只是自己亂走，<b>絕對不會主動靠過來</b>；想清光怪物就得上門去找牠們',
    '<b>😡 中階／高階小怪會生氣</b>：一被發現頭上就<b>一直冒出 😡 生氣泡泡</b>（泡泡會越冒越大、還有一顆顆怒氣往上飄），接著<b>先原地蓄力、再加速撲上來</b>。中階＝鐵甲蟲／骷髏兵／眼球怪／撿彈怪／拆彈怪／鬼火；高階＝疾風蜥／機器人／放彈怪／小巫師／大黃蜂',
    '<b>👑 BOSS 改成守地盤</b>：平常只在出生點附近<b>走來走去</b>，不追人也不放炸彈；你踏進 <b>2 格內</b>牠才會追你、丟炸彈，跑遠了牠就自己回去踱步',
    '<b>🤫 躲起來牠們看不到</b>：躲在樹叢／破屋裡，就算在 2 格內也不會被發現',
    '<b>🔊 新音效</b>：中階／高階怪發現你的時候會先低吼一聲，聽到就知道被盯上了',
    '<b>🏷️ 怪物圖鑑升級</b>：說明書的小怪卡片多了 <b>中階／高階</b> 標籤，一眼看出哪幾隻會生氣'
  ] },
  { v: '4.18', date: '2026-11-02', now: false, items: ["""),
    # ---- 說明書：小怪總覽 ----
    ("help hlead",
     """    let h = '<div class="hlead">小怪分兩大類：<b>地面怪</b>（會被牆擋住，可以躲）與 <b>飛行怪</b>（有翅膀，<b>可以越過牆壁</b>）。碰到任何一隻就扣一條命。</div>';""",
     """    let h = '<div class="hlead">小怪分兩大類：<b>地面怪</b>（會被牆擋住，可以躲）與 <b>飛行怪</b>（有翅膀，<b>可以越過牆壁</b>）。碰到任何一隻就扣一條命。<br>' +
      '👀 重點：所有小怪（含飛行怪）都只在你踏進 <b>2 格內</b>才會發現你。沒被發現時牠只會自己亂走、<b>不會主動靠過來</b>；被發現的<b>中階／高階</b>小怪頭上會一直冒出 <b>😡 生氣泡泡</b>，先原地蓄力再加速撲上來 —— 看到泡泡就準備好炸彈。</div>';
    function tb(id) {
      const tr = foeTier(id);
      if (tr === 'low') return '';
      return '<span class="hbadge hot">' + (tr === 'high' ? '🔥 高階' : '⚡ 中階') + '</span>';
    }"""),
    ("help 地面怪 badge",
     """        '<div><span class="hbadge hot">❤️ ' + f.hp + '</span><span class="hbadge info">速度 ' + hesc(hp(f.spd)) + '</span></div>' +""",
     """        '<div><span class="hbadge hot">❤️ ' + f.hp + '</span><span class="hbadge info">速度 ' + hesc(hp(f.spd)) + '</span>' + tb(f.id) + '</div>' +"""),
    ("help 飛行怪 badge",
     """        '<div><span class="hbadge hot">❤️ ' + f.hp + '</span><span class="hbadge info">速度 ' + hesc(hp(f.spd)) + '</span>' +
        '<span class="hbadge bad">'""",
     """        '<div><span class="hbadge hot">❤️ ' + f.hp + '</span><span class="hbadge info">速度 ' + hesc(hp(f.spd)) + '</span>' + tb(f.id) +
        '<span class="hbadge bad">'"""),
    # ---- 說明書：BOSS ----
    ("help BOSS 追人那條",
     """    { tw: '會<b>追著你</b>放炸彈；你在遠處時牠會把炸彈<b>丟過來越過牆壁</b>。', cn: '会<b>追着你</b>放炸弹；你在远处时它会把炸弹<b>丢过来越过墙壁</b>。', en: '<b>Chases you</b> and drops bombs; from range it <b>throws bombs over walls</b>.' },""",
     """    { tw: '👑 <b>平常只在自己的地盤走來走去</b>（出生點附近 4 格），<b>不會主動追你、也不放炸彈</b>。', cn: '👑 <b>平常只在自己的地盘走来走去</b>（出生点附近 4 格），<b>不会主动追你、也不放炸弹</b>。', en: '👑 Normally it just <b>patrols its own turf</b> (~4 tiles around its spawn) — no chasing, no bombs.' },
    { tw: '<b>你踏進 2 格內</b>牠才會發火：頭上冒出 😡 生氣泡泡，開始追你、在你附近放炸彈（遠處才丟過牆）。<b>跑出 2 格外牠就回去踱步</b>。', cn: '<b>你踏进 2 格内</b>它才会发火：头上冒出 😡 生气泡泡，开始追你、在你附近放炸弹（远处才丢过墙）。<b>跑出 2 格外它就回去踱步</b>。', en: 'Step <b>within 2 tiles</b> and it enrages: an 😡 balloon pops up, it chases you and bombs you (lobbing over walls only from range). <b>Leave the 2-tile ring and it goes back to patrolling</b>.' },"""),
]

if __name__ == '__main__':
    apply('index.html', RULES)

    # sw.js 三份一起升版號
    for p in ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']:
        raw = io.open(p, 'rb').read().decode('utf-8')
        n = raw.count("'v4.18.0'")
        if n != 1:
            print('  ! %s SW_VERSION hits %d' % (p, n)); sys.exit(1)
        io.open(p, 'wb').write(raw.replace("'v4.18.0'", "'v4.19.0'").encode('utf-8'))
        print('  ok sw.js ->v4.19.0', p)
