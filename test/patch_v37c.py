# -*- coding: utf-8 -*-
"""
v3.7 前端補丁 C：重試狀態改用獨立旗標

原本用 `if (Stats._rt)` 判斷「是不是正在重試」—— 依賴 setInterval 回傳的 timer id。
瀏覽器裡 id 從 1 起跳所以沒事，但只要環境回傳 0（某些嵌入式 WebView、測試環境），
「防重複啟動」跟「停止重試」就會雙雙失靈 → 可能開出一堆定時器一直打後端。
改用 _busy 旗標判斷，跟 timer id 是什麼值無關。
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


rep("""  _rn: 0, _rt: null,
  retryStop: function () {
    Stats._rn = 0;
    if (Stats._rt) { clearInterval(Stats._rt); Stats._rt = null; }
  },
  retryStart: function (needView) {
    if (Stats._rt) return;
    Stats._rn = 0;""",
    """  // _busy 是「正在重試」的旗標：不能靠 _rt 判斷，因為 setInterval 回傳的 id
  // 有可能是 0（某些 WebView／測試環境），那樣防重複啟動就會失靈
  _rn: 0, _rt: null, _busy: false,
  retryStop: function () {
    Stats._rn = 0;
    Stats._busy = false;
    if (Stats._rt) { clearInterval(Stats._rt); }
    Stats._rt = null;
  },
  retryStart: function (needView) {
    if (Stats._busy) return;
    Stats._busy = true;
    Stats._rn = 0;""",
    '重試改用 _busy 旗標')

if s != orig:
    io.open(HTML, 'w', encoding='utf-8').write(s)
    print('[OK] index.html 已更新')
else:
    print('[SKIP] 沒有變動')
