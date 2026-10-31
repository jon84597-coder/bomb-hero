# -*- coding: utf-8 -*-
"""
v3.8 補丁 D：前端完整移除「瀏覽人數 ＋ 按讚」功能（使用者要求撤掉）

刪除範圍：
  1. CSS：.statbox 整塊；公告欄 top 從 104px/92px 恢復成 56px/48px（上面沒東西了）
  2. HTML：#statBox 整塊
  3. JS：ST_* 常數、stGet 系、fmtNum、Stats 模組、initStats（4401~4615 那一整段）
  4. __BH 匯出：Stats / initStats / fmtNum / ST_*
  5. 檔案末尾的 initStats(); 呼叫
  6. 10 國語言字典裡的 st.* 鍵
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'index.html')

lines = io.open(HTML, encoding='utf-8').read().split('\n')


def find_line(pred, start=0):
    for i in range(start, len(lines)):
        if pred(lines[i]):
            return i
    return -1


def block_delete(start_mark, end_mark, tag, contain_start=True, contain_end=True):
    """刪 start_mark 那行（含）到 end_mark 那行（含）之間的所有行"""
    i1 = find_line(lambda l: start_mark in l)
    if i1 < 0:
        sys.exit('[FAIL] 找不到起始標記：%s' % tag)
    if not contain_start:
        i1 += 1
    i2 = find_line(lambda l: end_mark in l, i1)
    if i2 < 0:
        sys.exit('[FAIL] 找不到結束標記：%s' % tag)
    if not contain_end:
        i2 -= 1
    n = i2 - i1 + 1
    del lines[i1:i2 + 1]
    print('  OK  %s（刪了 %d 行）' % (tag, n))


# ---- 1. CSS .statbox 區塊（含 v3.6 註釋），一路刪到「統計列插在公告欄上面」那行註釋 ----
block_delete('v3.6：首頁左上角「實際瀏覽人數 ＋ 按讚」', 'v3.6：統計列插在公告欄上面 → 公告欄往下移', 'CSS .statbox 區塊')

# ---- 2. HTML #statBox 區塊 ----
block_delete('<!-- v3.6：首頁左上角「實際瀏覽人數 ＋ 按讚」 -->', '</div>', 'HTML #statBox')

# ---- 3. JS Stats 模組整段 ----
block_delete('v3.6：首頁左上角「實際瀏覽人數 ＋ 按讚」', 'function initStats() { Stats.init(); }', 'JS Stats 模組')

s = '\n'.join(lines)
orig = s


def rep(old, new, tag, count=1):
    global s
    if s.count(old) != count:
        sys.exit('[FAIL] 目標出現 %d 次（預期 %d）：%s' % (s.count(old), count, tag))
    s = s.replace(old, new, count)
    print('  OK  ' + tag)


# ---- 4. __BH 匯出 ----
rep("""  Net: Net, Stats: Stats, apiPath: apiPath, fmtNum: fmtNum, initStats: initStats,
  ST_VID: ST_VID, ST_LIKED: ST_LIKED, ST_LOCAL: ST_LOCAL, ST_SEEN: ST_SEEN,
""",
    """  Net: Net, apiPath: apiPath,
""", '__BH 匯出移除 Stats/initStats/fmtNum/ST_*')

# ---- 5. 檔案末尾 initStats(); ----
rep("""initStats();
""", "", 'initStats(); 呼叫移除')

# ---- 6. 10 語字典 st.* 鍵（每語一整行）----
import re
n = len(re.findall(r"^  'st\.viewTip'.*\n", s, re.M))
s = re.sub(r"^  'st\.viewTip'.*\n", '', s, flags=re.M)
print('  OK  10 語 st.* 字典（刪了 %d 行）' % n)
if n != 10:
    sys.exit('[FAIL] st.* 應該有 10 行，實際 %d' % n)

# ---- 7. 公告欄位置恢復（統計列沒了，不用再讓位）----
rep("""  .annbox {
    position: fixed; z-index: 900;
    left: 10px; top: calc(104px + env(safe-area-inset-top, 0px));""",
    """  .annbox {
    position: fixed; z-index: 900;
    left: 10px; top: calc(56px + env(safe-area-inset-top, 0px));""",
    '公告欄 top 104px → 56px')
rep("body.touch .annbox { left: 8px; top: calc(92px + env(safe-area-inset-top, 0px)); }",
    "body.touch .annbox { left: 8px; top: calc(48px + env(safe-area-inset-top, 0px)); }",
    '手機公告欄 top 92px → 48px')

# ---- 8. 版本註釋更新（VERSION 常數上方那段）----
rep("""// v3.7：統計數字在雲端平台上更耐用 —— 請求帶 12 秒逾時（後端冷啟動時不會一直卡在 --），
//       失敗先退回本機數字再背景重試；後端新增 STATS_PATH（持久磁碟）、結束訊號同步落盤、
//       STATS_RESTORE_URL（容器重建後自動還原）、/api/stats/snapshot（手動備份）""",
    """// v3.8：炸彈／遙控彈／火焰外型精緻化、台詞更新、對戰勝利過場延長＋獲勝音樂、
//       第二關配色改善；瀏覽人數／按讚功能依使用者要求整組移除（前端＋後端）""",
    '版本註釋更新')

if s != orig:
    io.open(HTML, 'w', encoding='utf-8').write(s)
    print('[OK] index.html 已更新')
else:
    print('[SKIP] 沒有變動')
