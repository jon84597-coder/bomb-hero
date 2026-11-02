# -*- coding: utf-8 -*-
"""
v3.8 補丁 B：台詞更新 ＋ 對戰勝利過場延長 ＋ 獲勝音樂

1. 被殺台詞（DEAD_LINES）換成使用者指定的三句
2. 殺人台詞（KILL_LINES）換成使用者指定的三句
3. 對戰每回合分出勝負後的過場：1.8 秒 → 4.2 秒（使用者要至少 3~5 秒）
4. 「XX 獲勝！」橫幅跟著停 3.4 秒（原本預設 1 秒就消失）
5. 新增 'victory' 音效：完整的 8-bit 勝利小旋律（約 2.6 秒），每回合贏了都放一段
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'index.html')

s = io.open(HTML, encoding='utf-8').read()
orig = s


def rep(old, new, tag):
    global s
    if s.count(old) != 1:
        sys.exit('[FAIL] 找不到唯一目標（%d 處）：%s' % (s.count(old), tag))
    s = s.replace(old, new, 1)
    print('  OK  ' + tag)


# ---- 1 & 2：台詞（使用者指定，標點統一用全角跟遊戲其他文案一致）----
rep("""const DEAD_LINES = ['哎呀！該死！', '可惡..我會回來報仇...！', '媽的！幹！'];
const KILL_LINES = ['哈哈！傻B！', '還是我厲害！', '我的炸彈好吃嗎？'];""",
    """// v3.8：台詞換使用者指定的版本
const DEAD_LINES = ['哎呀！糟糕糟糕！！', '可惡..我下次一定會贏...！', '天啊！不～！'];
const KILL_LINES = ['哈哈！你還得加把勁！', '還是我厲害！', '我的炸彈好吃嗎？'];""",
    'DEAD_LINES / KILL_LINES 更新')

# ---- 3 & 4：過場 1.8 秒 → 4.2 秒，橫幅停 3.4 秒 ----
rep("""      if (winner) { winner.wins += 1; winner.score += 500; winner.cheerT = 1.8; }
      banner(winner ? t('bt.win', { n: pname(winner) }) : t('bt.draw'));
      // 每場戰鬥結束的專屬特效音 + 彩帶
      battleEndFx(!!winner, winner ? winner.x : null, winner ? winner.y - Game.T * .6 : null);
      if (!winner) Game.players.forEach(function (p) { confetti(p.x, p.y - Game.T * .6, 14); });
      setTimeout(function () { nextBattleRound(winner); }, 1800);""",
    """      if (winner) { winner.wins += 1; winner.score += 500; winner.cheerT = 1.8; }
      // v3.8：過場拉長到 4.2 秒（原本 1.8 秒根本來不及看），橫幅跟著停 3.4 秒
      banner(winner ? t('bt.win', { n: pname(winner) }) : t('bt.draw'), 3.4);
      // 每場戰鬥結束的專屬特效音 + 彩帶；分出勝負再加一段完整的獲勝小旋律
      battleEndFx(!!winner, winner ? winner.x : null, winner ? winner.y - Game.T * .6 : null);
      if (winner) AudioSys.sfx('victory');
      if (!winner) Game.players.forEach(function (p) { confetti(p.x, p.y - Game.T * .6, 14); });
      setTimeout(function () { nextBattleRound(winner); }, 4200);""",
    '過場延長 + victory 音效')

# ---- 5：'victory' 音效（8-bit 勝利旋律，接在 finish 之後會很熱鬧）----
rep("""      case 'finishLose':
        boom(.32, .28);
        [392, 330, 262].forEach(function (f, i) { tone(f, .22, 'triangle', .2, null, i * .15); });
        tone(196, .55, 'sawtooth', .12, 140, .46);
        break;""",
    """      case 'finishLose':
        boom(.32, .28);
        [392, 330, 262].forEach(function (f, i) { tone(f, .22, 'triangle', .2, null, i * .15); });
        tone(196, .55, 'sawtooth', .12, 140, .46);
        break;
      case 'victory': // v3.8：完整的獲勝小旋律（約 2.6 秒）：上行號角 → 轉調 → 收尾長音
        [523, 523, 523, 659].forEach(function (f, i) { tone(f, .12, 'square', .22, null, i * .13); });
        [784, 659, 784, 1047].forEach(function (f, i) { tone(f, .13, 'square', .22, null, .62 + i * .13); });
        tone(784, .16, 'square', .2, null, 1.20);
        tone(880, .16, 'square', .2, null, 1.38);
        tone(988, .16, 'square', .2, null, 1.56);
        tone(1047, .5, 'square', .24, null, 1.78);
        tone(1319, .42, 'triangle', .18, null, 1.82);
        tone(1568, .5, 'sine', .13, 2093, 1.95);
        boom(.2, .18); boom(.14, .30);
        break;""",
    "'victory' 音效")

if s != orig:
    io.open(HTML, 'w', encoding='utf-8').write(s)
    print('[OK] index.html 已更新')
else:
    print('[SKIP] 沒有變動')
