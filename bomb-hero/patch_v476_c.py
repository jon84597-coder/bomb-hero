# -*- coding: utf-8 -*-
# v4.76 C：首頁大逃殺按鈕（拿掉未開放 → 推薦測試遊玩 HOT）／入口卡文案／版號
import io, sys

p = 'index.html'
s = io.open(p, encoding='utf-8').read()


def rep(old, new, tag, cnt=1):
    global s
    if s.count(old) != cnt:
        print('!! %s count=%d' % (tag, s.count(old)))
        sys.exit(1)
    s = s.replace(old, new)
    print('ok', tag)


# ---------------- 1) 首頁按鈕：不再是「未開放」 ----------------
rep('<button class="mbtn c-br has-beta locked" id="btnBR" data-ico="🏝️"></button>',
    '<button class="mbtn c-br has-beta" id="btnBR" data-ico="🏝️"></button>',
    'btnBR html')

rep("        if (br) br.innerHTML = '大逃殺<small>30～50 人 · 超大地圖</small><span class=\"betaTag\">未開放</span>';",
    "        if (br) br.innerHTML = '大逃殺<span class=\"hotTag\">HOT</span><small>推薦測試遊玩 · 30～50 人 · 可組隊</small>';",
    'btnBR fillUI')

# ---------------- 2) HOT 標籤樣式 ----------------
rep(""".mbtn.rpgbtn .betaTag, #scr-title .menu .mbtn .betaTag {
position: absolute; right: 9px; top: 9px; padding: 2px 7px; border-radius: 999px;
font-size: 9.5px; font-weight: 900; letter-spacing: .06em; color: #3a2200;
background: linear-gradient(180deg, #ffe6a3, #ffb347); box-shadow: 0 2px 6px -2px rgba(0,0,0,.45);
}""",
    """.mbtn.rpgbtn .betaTag, #scr-title .menu .mbtn .betaTag {
position: absolute; right: 9px; top: 9px; padding: 2px 7px; border-radius: 999px;
font-size: 9.5px; font-weight: 900; letter-spacing: .06em; color: #3a2200;
background: linear-gradient(180deg, #ffe6a3, #ffb347); box-shadow: 0 2px 6px -2px rgba(0,0,0,.45);
}
/* v4.76：大逃殺正式推薦（原本是灰灰的「未開放」）→ 紅橘 HOT 標籤＋呼吸光 */
#scr-title .menu .mbtn .hotTag {
position: absolute; right: 8px; top: 8px; padding: 2px 7px 2px 6px; border-radius: 999px;
font-size: 9.5px; font-weight: 900; letter-spacing: .08em; color: #fff;
background: linear-gradient(180deg, #ff7a59, #e0242b);
box-shadow: 0 2px 8px -2px rgba(255,70,60,.9), inset 0 1px 0 rgba(255,255,255,.35);
animation: hotPulse 1.6s ease-in-out infinite;
}
@keyframes hotPulse {
0%, 100% { box-shadow: 0 2px 8px -2px rgba(255,70,60,.9), inset 0 1px 0 rgba(255,255,255,.35); }
50%      { box-shadow: 0 2px 14px -1px rgba(255,110,80,1), inset 0 1px 0 rgba(255,255,255,.35); }
}
body.touch #scr-title .menu .mbtn .hotTag { right: 6px; top: 5px; font-size: 8px; padding: 1px 5px; }""",
    'hotTag css')

# ---------------- 3) 入口卡文案：把 BOSS 講出來 ----------------
rep("""    : ('<b>' + n + ' 人</b>同場 · 最後活著的奪冠 · ' + du + ' 分鐘 ' + (du === 5 ? 5 : 10) + ' 圈（每分鐘一縮）');""",
    """    : ('<b>' + n + ' 人</b>同場 · 最後活著的奪冠 · ' + du + ' 分鐘 ' + (du === 5 ? 5 : 10) + ' 圈 · 🦖' + BR.BOSS_N + ' BOSS');""",
    'sum text')

rep("'　·　14 隻小怪　·　八種地形各佔一區</div></div>'",
    "'　·　14 小怪＋' + BR.BOSS_N + ' 隻亂入 BOSS（打倒可騎恐龍）</div></div>'",
    'card foot')

# ---------------- 4) 版號 ----------------
rep("const VERSION = '4.75';", "const VERSION = '4.76';", 'VERSION')
rep('<div class="ver beta">測試版 v<span id="verTxt">4.75</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">4.76</span></div>', 'verTxt')
rep('<span class="vlnum">v<span id="verLogVer">4.75</span></span>',
    '<span class="vlnum">v<span id="verLogVer">4.76</span></span>', 'verLogVer')

rep("""const VERSION_LOG = [
  { v: '4.75', date: '2026-11-04', now: true, items: [""",
    """const VERSION_LOG = [
  { v: '4.76', date: '2026-11-04', now: true, items: [
    '🦖 大逃殺亂入 BOSS：開局從 32 關隨機抽 2 關的 BOSS 丟進場，沒有地盤、全場亂走，4 格內看到人就開打（會放彈也會丟彈）；20 點血，打倒牠的人直接獲得恐龍坐騎（多擋一次傷害、可按 F／🔥 吐火）',
    '💚 隊友辨識加強：頭上綠色三角＋名字＋血條、腳下綠環，左上角 HUD 下方再列出每個隊友的名字與血量（出局會打叉）',
    '🔕 大逃殺只回報「關於你自己」的訊息：別人扣血不再跳提示，只有玩家被淘汰時才會講一句（隊友出局會特別標示）',
    '🏝️ 首頁的大逃殺不再是「未開放」灰按鈕：換成「推薦測試遊玩」＋HOT 標籤，直接點就能進場',
    '🌿 草原關的底圖調亮、飽和度拉高（其餘七個關卡照舊）' ] },
  { v: '4.75', date: '2026-11-04', now: false, items: [""",
    'VERSION_LOG')

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('done', len(s))
