# -*- coding: utf-8 -*-
# 把 lobby / solo / multi 三個頁面合併成單頁應用（SPA）index.html
# 原因：部分預覽代理只轉發根路徑，子頁面 multi.html / solo.html 會 404
import re, sys

PUB = 'C:/Users/jon84/WorkBuddy/2026-10-30-12-58-54/bomberman-online/public'

def read(p):
    return open(PUB + '/' + p, encoding='utf-8').read()

lobby_html = '''<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  .home { width: 100%; max-width: 440px; }
  header { text-align: center; margin-bottom: 26px; }
  .logo {
    width: 76px; height: 76px; margin: 0 auto 16px;
    border-radius: 24px;
    background: linear-gradient(160deg, #4d8bf5, #2a5fd4);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 16px 34px -12px rgba(48,104,224,.85), inset 0 2px 0 rgba(255,255,255,.35);
  }
  header h1 { font-size: 30px; font-weight: 900; letter-spacing: .04em; }
  header p { font-size: 13px; color: #8fa2b8; margin-top: 7px; letter-spacing: .1em; font-weight: 600; }
  .modes { display: flex; flex-direction: column; gap: 12px; }
  .mode {
    display: block; position: relative;
    background: #fff; border-radius: 18px; padding: 18px 20px;
    text-decoration: none; color: inherit;
    box-shadow: 0 12px 30px -16px rgba(35,60,90,.45), 0 1px 3px rgba(35,60,90,.06);
    transition: transform .16s ease, box-shadow .16s ease;
    overflow: hidden; cursor: pointer;
  }
  .mode::after {
    content: ''; position: absolute; right: -34px; top: -34px;
    width: 108px; height: 108px; border-radius: 50%;
    background: currentColor; opacity: .05;
  }
  .mode:hover { transform: translateY(-2px); box-shadow: 0 20px 40px -18px rgba(35,60,90,.55), 0 1px 3px rgba(35,60,90,.06); }
  .mode:active { transform: translateY(0) scale(.995); }
  .mode h2 { font-size: 18px; font-weight: 800; margin-bottom: 5px; }
  .mode p { font-size: 12.5px; color: #8fa2b8; line-height: 1.6; }
  .badge {
    display: inline-block; font-size: 10px; font-weight: 900; letter-spacing: .1em;
    padding: 3px 8px; border-radius: 7px; margin-bottom: 10px;
  }
  .mode.solo { color: #3068e0; }
  .mode.solo .badge { background: #e8f1ff; color: #3068e0; }
  .mode.multi { color: #e0553f; }
  .mode.multi .badge { background: #ffece8; color: #e0553f; }
  .mode .title { color: #22303f; }
  footer { text-align: center; margin-top: 24px; font-size: 11.5px; color: #a8b8ca; line-height: 1.9; }
  footer kbd {
    background: #eef3f9; border-radius: 4px; padding: 1px 5px;
    font-family: inherit; font-weight: 700; color: #6d8098; font-size: 11px;
  }
</style>
</head>
<body>
<div class="home">
  <header>
    <div class="logo">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="18" cy="24" r="12" fill="#1b2430"/>
        <circle cx="13.5" cy="19.5" r="3.6" fill="#4a5764" opacity=".9"/>
        <ellipse cx="13" cy="19" rx="1.7" ry="1.1" fill="#9fb0c2" transform="rotate(-30 13 19)"/>
        <path d="M23 14c5-1 6-5 4-7" stroke="#8a6a3d" stroke-width="2.6" stroke-linecap="round"/>
        <circle cx="27" cy="6.5" r="3.2" fill="#ffb347"/>
        <circle cx="27" cy="6.5" r="1.5" fill="#fff3c4"/>
      </svg>
    </div>
    <h1>炸彈超人</h1>
    <p>BOMBERMAN · 網頁版</p>
  </header>

  <div class="modes">
    <a class="mode solo" href="#solo">
      <span class="badge">1P 單人</span>
      <h2 class="title">單人闖關</h2>
      <p>5 個關卡 · 炸開軟磚 · 消滅所有敵人後走進出口</p>
    </a>

    <a class="mode multi" href="#multi">
      <span class="badge">2–4P 連線</span>
      <h2 class="title">多人對戰</h2>
      <p>即時連線 · 開一間房把房號給朋友 · 互相轟炸活到最後</p>
    </a>
  </div>

  <footer>
    <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> 移動 · <kbd>空白鍵</kbd> 放彈／撿彈／投擲<br>
    🛼溜冰鞋加速 · 🧤手套撿彈投擲 · 🥾踢鞋踢彈撞牆 · 手機自動顯示虛擬按鍵
  </footer>
</div>
</body>
</html>'''
solo_html = read('solo.html')
multi_html = read('multi.html')

def parts(html):
    style = re.search(r'<style>([\s\S]*?)</style>', html).group(1)
    bm = re.search(r'<body>([\s\S]*?)(?:<script>|</body>)', html)
    body = bm.group(1)
    sm = re.search(r'<script>([\s\S]*?)</script>', html)
    script = sm.group(1) if sm else ''
    return style, body, script

# ---------- CSS 作用域化 ----------
def scope_css(css, sec, drop_body):
    """把每條規則選擇器加上 #sec 前綴；body 規則轉成 #sec 本身"""
    out = []
    i = 0
    n = len(css)
    def find_block_end(start):  # 配對 {} 返回 '}' 位置
        depth = 0
        for j in range(start, n):
            if css[j] == '{': depth += 1
            elif css[j] == '}':
                depth -= 1
                if depth == 0: return j
        return n - 1

    def prefix_selectors(sel):
        parts_ = [s.strip() for s in sel.split(',') if s.strip()]
        res = []
        for s in parts_:
            if s == 'body':
                res.append('#' + sec)
            elif s.startswith('@'):
                res.append(s)
            else:
                res.append('#' + sec + ' ' + s)
        return ', '.join(res)

    while i < n:
        # 跳過空白/註解
        m = re.match(r'\s+', css[i:])
        if m:
            out.append(m.group(0)); i += m.end(); continue
        if css.startswith('/*', i):
            e = css.index('*/', i) + 2
            out.append(css[i:e]); i = e; continue
        brace = css.index('{', i)
        sel = css[i:brace].strip()
        end = find_block_end(brace)
        block = css[brace + 1:end]
        if sel.startswith('@media'):
            out.append(sel + ' {' + scope_css(block, sec, False) + '}')
        elif sel.startswith('@keyframes') or sel.startswith('@-webkit-keyframes'):
            out.append(css[i:end + 1])
        elif sel == '*' or sel == 'html, body':
            if not drop_body:
                out.append('#' + sec + ' * { ' + block.strip() + ' }')
            # drop_body 時整條丟棄（全域 reset 只保留一份）
        elif sel == 'body':
            out.append('#' + sec + ' { ' + block.strip() + ' }')
        else:
            out.append(prefix_selectors(sel) + ' {' + block + '}')
        i = end + 1
    return ''.join(out)

# ---------- ID 前綴化 ----------
def prefix_ids_html(html, prefix):
    return re.sub(r'id="([^"]+)"', lambda m: 'id="' + prefix + m.group(1) + '"', html)

def prefix_ids_js(js, ids, prefix):
    for i in ids:
        js = js.replace("'" + i + "'", "'" + prefix + i + "'")
    return js

# ---------- 輸入閘（頁面隱藏時不響應鍵盤、不跑循環） ----------
def add_guard(js, setter_name, input_guard=False):
    # 宣告
    js = js.replace("'use strict';", "'use strict';\n\n  let __on = false;", 1)
    # 鍵盤
    guard = "if (!__on) return;"
    if input_guard:
        guard = "if (!__on || (e.target && e.target.tagName === 'INPUT')) return;"
    js = re.sub(r"window\.addEventListener\('keydown', function \(e\) \{",
                "window.addEventListener('keydown', function (e) {\n    " + guard, js, count=1)
    js = re.sub(r"window\.addEventListener\('keyup', function \(e\) \{",
                "window.addEventListener('keyup', function (e) {\n    if (!__on) return;", js, count=1)
    # 主循環
    js = re.sub(r"function loop\(ts\) \{",
                "function loop(ts) {\n    if (!__on) { requestAnimationFrame(loop); return; }", js, count=1)
    # 開關
    js = js.replace("})();",
        "  window." + setter_name + " = function (v) { __on = v; };\n})();", 1)
    return js

# ---------- SOLO ----------
s_style, s_body, s_script = parts(solo_html)
s_ids = ['cv', 'overlay', 'hud-level', 'hud-score', 'hud-lives', 'hud-bombs',
         'hud-power', 'hud-gear', 'fireBtn']
s_body = prefix_ids_html(s_body, 's-')
s_script = prefix_ids_js(s_script, s_ids, 's-')
s_script = s_script.replace(
    "document.querySelectorAll('[data-dir]')",
    "document.querySelectorAll('#sec-solo [data-dir]')")
s_script = s_script.replace(
    "document.querySelectorAll('a[href]')",
    "document.querySelectorAll('#sec-solo a[href]')")
s_script = add_guard(s_script, '__setSoloOn')

# ---------- MULTI ----------
m_style, m_body, m_script = parts(multi_html)
m_ids = ['lobby', 'nick', 'code', 'joinBtn', 'backBtn', 'err', 'game',
         'roomCode', 'chips', 'cv', 'ov', 'fireBtn']
m_body = prefix_ids_html(m_body, 'm-')
m_script = prefix_ids_js(m_script, m_ids, 'm-')
m_script = m_script.replace(
    "document.querySelectorAll('[data-dir]')",
    "document.querySelectorAll('#sec-multi [data-dir]')")
m_script = add_guard(m_script, '__setMultiOn', input_guard=True)

# ---------- 大廳 ----------
l_style, l_body, _ = parts(lobby_html)
# 大廳按鈕掛上 SPA 切換用的 ID（href 已是 #solo / #multi）
l_body = l_body.replace('<a class="mode solo" href="#solo">',
                        '<a class="mode solo" href="#solo" id="btn-solo">')
l_body = l_body.replace('<a class="mode multi" href="#multi">',
                        '<a class="mode multi" href="#multi" id="btn-multi">')

# ---------- 合併 ----------
spa = '''<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>炸彈超人 · 網頁版</title>
<style>
  /* ===== 全域 ===== */
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body { height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
    background: radial-gradient(circle at 25% -10%, #f2f7fd 0%, #dfe9f5 42%, #c9d8ea 100%);
    min-height: 100%;
    color: #22303f;
    user-select: none; -webkit-user-select: none;
    overflow-x: hidden;
  }
  section.app { width: 100%; min-height: 100%; }

  /* ===== 大廳 ===== */
__LOBBY_CSS__

  /* ===== 單人 ===== */
__SOLO_CSS__

  /* ===== 多人 ===== */
__MULTI_CSS__
</style>
</head>
<body>
<section class="app" id="sec-lobby">
__LOBBY_BODY__
</section>
<section class="app" id="sec-solo" style="display:none">
__SOLO_BODY__
</section>
<section class="app" id="sec-multi" style="display:none">
__MULTI_BODY__
</section>
<script>
__SOLO_JS__
</script>
<script>
__MULTI_JS__
</script>
<script>
(function () {
  'use strict';
  var secs = {
    lobby: document.getElementById('sec-lobby'),
    solo: document.getElementById('sec-solo'),
    multi: document.getElementById('sec-multi')
  };
  function show(name) {
    for (var k in secs) secs[k].style.display = (k === name) ? '' : 'none';
    if (window.__setSoloOn) window.__setSoloOn(name === 'solo');
    if (window.__setMultiOn) window.__setMultiOn(name === 'multi');
    window.scrollTo(0, 0);
    try {
      history.replaceState(null, '', name === 'lobby'
        ? location.pathname + location.search
        : location.pathname + location.search + '#' + name);
    } catch (e) {}
  }
  document.getElementById('btn-solo').addEventListener('click', function (e) {
    e.preventDefault(); show('solo');
  });
  document.getElementById('btn-multi').addEventListener('click', function (e) {
    e.preventDefault(); show('multi');
  });
  if (location.hash === '#solo') show('solo');
  else if (location.hash === '#multi') show('multi');
  else show('lobby');
})();
</script>
</body>
</html>
'''

spa = spa.replace('__LOBBY_CSS__', scope_css(l_style, 'sec-lobby', True))
spa = spa.replace('__SOLO_CSS__', scope_css(s_style, 'sec-solo', True))
spa = spa.replace('__MULTI_CSS__', scope_css(m_style, 'sec-multi', True))
spa = spa.replace('__LOBBY_BODY__', l_body.strip())
spa = spa.replace('__SOLO_BODY__', s_body.strip())
spa = spa.replace('__MULTI_BODY__', m_body.strip())
spa = spa.replace('__SOLO_JS__', s_script.strip())
spa = spa.replace('__MULTI_JS__', m_script.strip())

open(PUB + '/index.html', 'w', encoding='utf-8').write(spa)
print('SPA written:', len(spa), 'chars,', spa.count('\n'), 'lines')
